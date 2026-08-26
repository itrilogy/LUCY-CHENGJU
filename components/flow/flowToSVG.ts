/**
 * IQS-Flow 自研 SVG 渲染器 —— 完整算法 v3（用户最终确认版）
 * ① 流程绘制格=3×3九小格(中心1W×1H节点+四周8格0.5连线区)
 * ② 泳道交叉格 X×Y 切分(1节点1×1/2节点横1×2/纵2×1/横纵X×Y)
 * ③ 行列统一切分：行高=该行最大纵向堆叠、列宽=该列最大横向并排
 * ④ W列最大宽/H行最大高
 * ⑤ 节点放中心格，连线从四周0.5连线区中线出发
 * ⑥ 确定性避障：同行下移→同列右移→都不行扩格(上限3单位)
 * ⑦ 全页面绘制区(fitView一页展现)
 */
import type { FlowData, FlowChartStyles } from '../../types';

export interface FlowSvgDims { width: number; height: number; }

export const FLOW_SVG = {
  head: 110,       // 左 header 区（行标签）
  colLabelH: 30,   // 顶部 header 区（列标签）
  titleH: 44,      // 流程图标题通栏高度
  half: 34,        // 0.5 单位 px（连线区宽/高）
};

/** 计算文字预估宽度（CJK 按 1em，ASCII 按 0.6em） */
function textW(text: string, fs: number): number {
  let w = 0;
  for (const ch of text) w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? fs : fs * 0.6;
  return w;
}

export interface NodeMetrics { halfW: number; halfH: number; shapeType: 'circle' | 'diamond' | 'rect'; }
/** 节点 W/H = 文字宽 + 边距（供计算中心格尺寸） */
/** 节点基础尺寸（供整体缩放基准 + 空行/空列中心格） */
export const NODE_BASE = {
  task: { w: 120, h: 44 },
  subprocess: { w: 140, h: 48 },
  gateway: { w: 80, h: 50 },
  startEnd: { w: 44, h: 44 },
  annotation: { w: 120, h: 36 },
  data: { w: 100, h: 36 },
};

export function nodeMetrics(n: FlowData['nodes'][0], fs: number): NodeMetrics {
  const label = n.label || n.labelRef || n.id;
  const tw = textW(label, fs);
  switch (n.type) {
    case 'start':
    case 'end': {
      const r = Math.max(NODE_BASE.startEnd.w / 2, NODE_BASE.startEnd.h / 2, 22);
      return { halfW: r, halfH: r, shapeType: 'circle' };
    }
    case 'exclusiveGateway':
    case 'parallelGateway': {
      const dw = Math.max(NODE_BASE.gateway.w, tw + 36);
      const dh = Math.max(NODE_BASE.gateway.h, fs + 22);
      return { halfW: dw / 2, halfH: dh / 2, shapeType: 'diamond' };
    }
    case 'annotation':
      return { halfW: Math.max(NODE_BASE.annotation.w / 2, tw / 2 + 12), halfH: NODE_BASE.annotation.h / 2, shapeType: 'rect' };
    case 'dataObject':
      return { halfW: Math.max(NODE_BASE.data.w / 2, tw / 2 + 12), halfH: NODE_BASE.data.h / 2, shapeType: 'rect' };
    case 'subprocess':
      return { halfW: Math.max(NODE_BASE.subprocess.w / 2, tw / 2 + 14), halfH: NODE_BASE.subprocess.h / 2, shapeType: 'rect' };
    case 'task':
    default:
      return { halfW: Math.max(NODE_BASE.task.w / 2, tw / 2 + 14), halfH: NODE_BASE.task.h / 2, shapeType: 'rect' };
  }
}

function rowsOf(data: FlowData): { dict: string; idx: number }[] {
  const out: { dict: string; idx: number }[] = [];
  for (const l of data.lanes.filter((x) => x.layout === 'H')) for (const idx of l.indices) out.push({ dict: l.dict, idx });
  return out;
}
function colsOf(data: FlowData): { dict: string; idx: number }[] {
  const out: { dict: string; idx: number }[] = [];
  for (const l of data.lanes.filter((x) => x.layout === 'V')) for (const idx of l.indices) out.push({ dict: l.dict, idx });
  return out;
}
function cellKeyOf(cell: FlowData['nodes'][0]['cell']): string | null {
  if (!cell) return null;
  const keys = Object.keys(cell);
  if (!keys.length) return null;
  const f = keys[0];
  const s = keys[1];
  if (s === undefined) return `${f}${cell[f]}`;
  return `${f}${cell[f]}${s}${cell[s]}`;
}
function dictValue(data: FlowData, dict: string, idx: number): string {
  const arr = data.dicts[dict];
  return arr && arr[idx] !== undefined ? arr[idx] : `${dict}[${idx}]`;
}
function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 节点形状（中心格内，1W×1H） */
function nodeShape(n: FlowData['nodes'][0], st: FlowChartStyles, cx: number, cy: number, W: number, H: number): string {
  const label = n.label || n.labelRef || n.id;
  const fs = st.nodeFontSize;
  const stroke = 'rgba(15,23,42,0.25)';
  let shape = '';
  switch (n.type) {
    case 'start':
      shape = `<circle cx="${cx}" cy="${cy}" r="${Math.min(W, H) / 2}" fill="${st.startColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    case 'end':
      shape = `<circle cx="${cx}" cy="${cy}" r="${Math.min(W, H) / 2}" fill="${st.endColor}" stroke="${stroke}" stroke-width="3"/>`;
      break;
    case 'exclusiveGateway':
    case 'parallelGateway': {
      const d = `M${cx},${cy - H / 2} L${cx + W / 2},${cy} L${cx},${cy + H / 2} L${cx - W / 2},${cy} Z`;
      shape = `<path d="${d}" fill="${n.type === 'parallelGateway' ? st.parallelColor : st.gatewayColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    }
    case 'annotation':
      shape = `<rect x="${cx - W / 2}" y="${cy - H / 2}" width="${W}" height="${H}" rx="3" fill="${st.annotationColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    case 'dataObject':
      shape = `<rect x="${cx - W / 2}" y="${cy - H / 2}" width="${W}" height="${H}" rx="5" fill="${st.dataColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    case 'subprocess':
      shape = `<rect x="${cx - W / 2}" y="${cy - H / 2}" width="${W}" height="${H}" rx="6" fill="${st.subprocessColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    default:
      shape = `<rect x="${cx - W / 2}" y="${cy - H / 2}" width="${W}" height="${H}" rx="6" fill="${st.taskColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
  }
  return shape + `<text x="${cx}" y="${cy + fs * 0.36}" text-anchor="middle" fill="#fff" font-size="${fs}" font-weight="500">${esc(label)}</text>`;
}

function arrowMarker(id: string, color: string): string {
  return `<defs><marker id="${id}" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L7,3 z" fill="${color}"/></marker></defs>`;
}

// ===== 布局计算结果 =====
interface NodePos { x: number; y: number; ri: number; ci: number; W: number; H: number; n: FlowData['nodes'][0]; }
interface XyLayout {
  rows: { dict: string; idx: number }[];
  cols: { dict: string; idx: number }[];
  nodePos: Map<string, NodePos>;
  colX: number[]; rowY: number[];
  colWpx: number[]; rowHpx: number[];
  width: number; height: number;
  half: number;      // 0.5 单位
  bandLeft: number;
  bandTop: (ri: number) => number;
  gridRight: number;
  gridBottom: number;
}

export function computeExcelLayout(data: FlowData, st: FlowChartStyles): XyLayout {
  let rows = rowsOf(data), cols = colsOf(data);
  // 无泳道：rows/cols 为空，但需要 1 行 1 列占位（大格）
  if (!rows.length) rows = [{ dict: 'ROOT', idx: 0 }];
  if (!cols.length) cols = [{ dict: 'ROOT', idx: 0 }];
  // 单维泳道：节点各自占一格里，需扩展虚拟网格
  //   仅 H 轴（横向泳道）：行数=泳道数，列数=节点数
  //   仅 V 轴（纵向泳道）：行数=节点数，列数=泳道数
  const realRows = rowsOf(data), realCols = colsOf(data);
  const nodeCount = data.nodes.length;
  if (realRows.length > 0 && realCols.length === 0) {
    // 仅 H 轴：cols 原为 ROOT 占位，扩展为 nodeCount 列
    cols = Array.from({ length: Math.max(1, nodeCount) }, (_, i) => ({ dict: 'ROOT', idx: i }));
  } else if (realCols.length > 0 && realRows.length === 0) {
    // 仅 V 轴：rows 原为 ROOT 占位，扩展为 nodeCount 行
    rows = Array.from({ length: Math.max(1, nodeCount) }, (_, i) => ({ dict: 'ROOT', idx: i }));
  }
  const nR = rows.length || 1, nC = cols.length || 1;
  const fs = st.nodeFontSize;

  const cellNodeId = new Map<string, { ri: number; ci: number }>();
  for (let ri = 0; ri < nR; ri++) for (let ci = 0; ci < nC; ci++) {
    const rowKey = `${rows[ri].dict}${rows[ri].idx}`;
    const colKey = `${cols[ci].dict}${cols[ci].idx}`;
    const rc = { ri, ci };
    cellNodeId.set(rowKey + colKey, rc);
    // 单维泳道兼容：节点 cell 只有一维时，缺失维度由 ROOT 侧匹配
    if (rows[ri].dict === 'ROOT') cellNodeId.set(colKey, rc);   // 单维纵向：cell 只写列键
    if (cols[ci].dict === 'ROOT') cellNodeId.set(rowKey, rc);   // 单维横向：cell 只写行键
  }

  // 归类节点到交叉格 (ri,ci)
  // 单维泳道：横向(行泳道)→每个节点独立一列(ci递增)；纵向(列泳道)→每个节点独立一行(ri递增)
  const isHSingle = realRows.length > 0 && realCols.length === 0; // 只有 H 轴（横向泳道）
  const isVSingle = realCols.length > 0 && realRows.length === 0; // 只有 V 轴（纵向泳道）
  const group = new Map<string, FlowData['nodes'][0][]>();
  const cellXY = new Map<string, { nx: number; ny: number; items: { n: FlowData['nodes'][0]; gridX: number; gridY: number; m: NodeMetrics }[] }>();
  // 单维时按声明顺序给每个节点分配独立格子坐标
  let singleSeq = 0;
  for (const n of data.nodes) {
    const key = cellKeyOf(n.cell);
    let rc = key ? cellNodeId.get(key) : undefined;
    if (isHSingle) {
      // 单维横向：每个节点独立一列（ci 递增，ri=0）
      rc = { ri: 0, ci: singleSeq };
      singleSeq++;
    } else if (isVSingle) {
      // 单维纵向：每个节点独立一行（ri 递增，ci=0）
      rc = { ri: singleSeq, ci: 0 };
      singleSeq++;
    } else if (!rc) {
      rc = { ri: 0, ci: 0 };
    }
    const gk = `${rc.ri}_${rc.ci}`;
    if (!group.has(gk)) group.set(gk, []);
    group.get(gk)!.push(n);
  }
  for (const [gk, nodes] of group) {
    let nx = 1, ny = 1, gx = 0, gy = 0;
    const items: { n: FlowData['nodes'][0]; gridX: number; gridY: number; m: NodeMetrics }[] = [];
    nodes.forEach((n, i) => {
      const m = nodeMetrics(n, fs);
      if (i === 0) {
        // 首节点定位格内原点 (0,0)
        gx = 0; gy = 0;
      } else {
        // 后续节点按其自身 vh 相对上一节点排布（默认 V 纵向）
        const dir = n.vh ?? 'V';
        if (dir === 'V') gy++;
        else gx++;
      }
      items.push({ n, gridX: gx, gridY: gy, m });
      nx = Math.max(nx, gx + 1);
      ny = Math.max(ny, gy + 1);
    });
    cellXY.set(gk, { nx, ny, items });
  }

  // ④ W列最大宽 / H行最大高（由该列/行中心节点最大宽/高确定）
  const cellWself: number[] = new Array(nC).fill(0);
  const cellHself: number[] = new Array(nR).fill(0);
  for (const [gk, cell] of cellXY) {
    const [ri, ci] = gk.split('_').map(Number);
    for (const it of cell.items) {
      cellWself[ci] = Math.max(cellWself[ci], it.m.halfW * 2);
      cellHself[ri] = Math.max(cellHself[ri], it.m.halfH * 2);
    }
  }
  // 空列/空行用基础中心格宽高（不盲目拉大）
  const BASE_W = 100, BASE_H = 60;
  for (let c = 0; c < nC; c++) if (!cellWself[c]) cellWself[c] = BASE_W;
  for (let r = 0; r < nR; r++) if (!cellHself[r]) cellHself[r] = BASE_H;

  // ③ 整行/整列统一扩展（对齐关键，XY 矩阵规范）
  //   - 列宽 = 该列"最大横向绘制格数 nx_max" × (该列节点最大宽 + 2*half)
  //     → 该列所有交叉格都按 nx_max 个绘制格等分（整列统一，不各列独立）
  //   - 行高 = 该行"最大纵向绘制格数 ny_max" × (该行节点最大高 + 2*half)
  //     → 该行所有交叉格都按 ny_max 个绘制格等分（整行统一）
  const half = FLOW_SVG.half;
  // 每列最大横向绘制格数 nx，该列节点最大宽 W
  const colNxMax: number[] = new Array(nC).fill(1);
  const rowNyMax: number[] = new Array(nR).fill(1);
  for (const [gk, cell] of cellXY) {
    const [ri, ci] = gk.split('_').map(Number);
    if (ci >= 0 && ci < nC) colNxMax[ci] = Math.max(colNxMax[ci], cell.nx);
    if (ri >= 0 && ri < nR) rowNyMax[ri] = Math.max(rowNyMax[ri], cell.ny);
  }
  const colWPx = colNxMax.map((nx, ci) => nx * (cellWself[ci] + 2 * half));
  const rowHPx = rowNyMax.map((ny, ri) => ny * (cellHself[ri] + 2 * half));

  const bandLeft = FLOW_SVG.head;
  const colX: number[] = []; let acc = bandLeft;
  for (let ci = 0; ci < nC; ci++) { colX.push(acc); acc += colWPx[ci]; }
  const bandTop = (ri: number) => {
    let a = FLOW_SVG.titleH + FLOW_SVG.colLabelH;
    for (let r = 0; r < ri; r++) a += rowHPx[r];
    return a;
  };

  // 节点落中心格（3×3 布局中心格 = 1W×1H），四周 half 连线区
  // 节点自身尺寸（nodeW/nodeH）= 该节点图形实际宽高（贴合自身，不被列/行最大拉大）
  // 位置仍按行列统一网格对齐（半边=该列最大宽/该行最大高的一半，使节点在绘制格居中）
  const nodePos = new Map<string, NodePos>();
  for (const [gk, cell] of cellXY) {
    const [ri, ci] = gk.split('_').map(Number);
    // 整列/整行统一：绘制格宽=列宽/该列最大nx；绘制格高=行高/该行最大ny
    const pw = colWPx[ci] / colNxMax[ci], ph = rowHPx[ri] / rowNyMax[ri];
    for (const it of cell.items) {
      const nodeW = it.m.halfW * 2;   // 节点自身宽
      const nodeH = it.m.halfH * 2;   // 节点自身高
      const gx = colX[ci] + it.gridX * pw;
      const gy = bandTop(ri) + it.gridY * ph;
      // 节点严格居中于其绘制格 [gx,gx+pw]×[gy,gy+ph]（两侧连线区等宽，消除空隙/扩展格）
      const cx = gx + pw / 2;
      const cy = gy + ph / 2;
      nodePos.set(it.n.id, { x: cx, y: cy, ri, ci, W: nodeW, H: nodeH, n: it.n });
    }
  }

  const width = colX[nC - 1] + colWPx[nC - 1] + 5;
  const height = bandTop(nR - 1) + rowHPx[nR - 1] + 5;
  // 网格右/下边界（与最末列/行格子完全对齐，无出血缺口）
  const gridRight = colX[nC - 1] + colWPx[nC - 1];
  const gridBottom = bandTop(nR - 1) + rowHPx[nR - 1];
  return {
    rows, cols, nodePos, colX, rowY: [], colWpx: colWPx, rowHpx: rowHPx,
    width, height, half, bandLeft, bandTop, gridRight, gridBottom,
  };
}

export function getSvgSize(data: FlowData, st?: FlowChartStyles): FlowSvgDims {
  const L = computeExcelLayout(data, st ?? ({ nodeFontSize: 13 } as FlowChartStyles));
  return { width: L.width, height: L.height };
}

export function flowToSVG(data: FlowData, styles: FlowChartStyles): string {
  const st = styles;
  const L = computeExcelLayout(data, st);
  const { width, height } = L;
  const parts: string[] = [];
  parts.push(arrowMarker('flowArrow', st.lineColor));
  const nR = L.rows.length, nC = L.cols.length;
  const x0 = L.bandLeft, y0 = L.bandTop(0);

  // 泳道区背景
  parts.push(`<rect x="${x0}" y="${y0}" width="${L.gridRight - x0}" height="${L.gridBottom - y0}" fill="#f8fafc"/>`);
  // 绘制格分布：每个交叉格（含空格）画真实列宽/行高的矩形，行列对齐直接可见
  for (let ri = 0; ri < nR; ri++) {
    for (let ci = 0; ci < nC; ci++) {
      const gx0 = L.colX[ci], gy0 = L.bandTop(ri);
      const gw = L.colWpx[ci], gh = L.rowHpx[ri];
      parts.push(`<rect x="${gx0}" y="${gy0}" width="${gw}" height="${gh}" fill="none" stroke="#94a3b8" stroke-width="1"/>`);
    }
  }
  // 真实列/行边界粗线：与最末列/行格子边界完全对齐（无出血缺口）
  for (let ci = 0; ci <= nC; ci++) {
    const gx = ci < nC ? L.colX[ci] : L.gridRight;
    parts.push(`<line x1="${gx}" y1="${y0}" x2="${gx}" y2="${L.gridBottom}" stroke="#64748b" stroke-width="1.2"/>`);
  }
  for (let ri = 0; ri <= nR; ri++) {
    const gy = ri < nR ? L.bandTop(ri) : L.gridBottom;
    parts.push(`<line x1="${x0}" y1="${gy}" x2="${L.gridRight}" y2="${gy}" stroke="#64748b" stroke-width="1.2"/>`);
  }

  // ===== 流程图标题：顶部通栏格子，默认居中 =====
  const titleText = data.title || st.title || '流程图';
  parts.push(`<rect x="0" y="0" width="${width}" height="${FLOW_SVG.titleH}" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>`);
  parts.push(`<text x="${width / 2}" y="${FLOW_SVG.titleH / 2}" text-anchor="middle" dominant-baseline="middle" fill="${st.textColor}" font-size="${st.titleFontSize}" font-weight="bold">${esc(titleText)}</text>`);

  // ===== 轴坐标标题 + 泳道标签：左/上表头，格子化，默认居中 =====
  const axisXT = data.axes?.x?.title || '';
  const axisYT = data.axes?.y?.title || '';
  const cornerW = L.bandLeft, cornerH = FLOW_SVG.colLabelH;
  // 左上角格：axis-x（顶部表头，水平居中）+ axis-y（左表头，纵向旋转 -90°）
  if (axisXT || axisYT) {
    parts.push(`<rect x="0" y="${FLOW_SVG.titleH}" width="${cornerW}" height="${cornerH}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>`);
    if (axisXT) {
      parts.push(`<text x="${cornerW / 2}" y="${FLOW_SVG.titleH + cornerH / 2}" text-anchor="middle" dominant-baseline="middle" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(axisXT)}</text>`);
    }
    if (axisYT) {
      // Y 侧轴标题：纵向（旋转 -90°），在左上角格内沿左边缘竖直排列
      parts.push(`<text x="${cornerW - 8}" y="${FLOW_SVG.titleH + cornerH / 2}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${cornerW - 8} ${FLOW_SVG.titleH + cornerH / 2})" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(axisYT)}</text>`);
    }
  }
  // 列标签格（顶部表头，每列一格，居中）
  for (let ci = 0; ci < nC; ci++) {
    const cl = dictValue(data, L.cols[ci].dict, L.cols[ci].idx);
    const show = L.cols[ci].dict !== 'ROOT';
    parts.push(`<rect x="${L.colX[ci]}" y="${FLOW_SVG.titleH}" width="${L.colWpx[ci]}" height="${cornerH}" fill="${show ? '#e2e8f0' : 'none'}" stroke="#94a3b8" stroke-width="1"/>`);
    if (show) parts.push(`<text x="${L.colX[ci] + L.colWpx[ci] / 2}" y="${FLOW_SVG.titleH + cornerH / 2}" text-anchor="middle" dominant-baseline="middle" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(cl)}</text>`);
  }
  // 行标签格（左表头，每行一格，居中）
  for (let ri = 0; ri < nR; ri++) {
    const rl = dictValue(data, L.rows[ri].dict, L.rows[ri].idx);
    const show = L.rows[ri].dict !== 'ROOT';
    parts.push(`<rect x="0" y="${L.bandTop(ri)}" width="${cornerW}" height="${L.rowHpx[ri]}" fill="${show ? '#e2e8f0' : 'none'}" stroke="#94a3b8" stroke-width="1"/>`);
    if (show) parts.push(`<text x="${cornerW / 2}" y="${L.bandTop(ri) + L.rowHpx[ri] / 2}" text-anchor="middle" dominant-baseline="middle" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(rl)}</text>`);
  }

  // 连线：最小最短原则 + 进出口端口不重复（最短距离优先）
  const nodeXY: Record<string, { x: number; y: number; W: number; H: number; used: Set<string> }> = {};
  for (const [id, p] of L.nodePos) nodeXY[id] = { x: p.x, y: p.y, W: p.W, H: p.H, used: new Set() };

  // 端口方向定义（从节点中心向外，走 0.5 连线区中线）
  type Port = 'R' | 'L' | 'T' | 'B';
  function portXY(n: { x: number; y: number; W: number; H: number }, dir: Port): { x: number; y: number } {
    switch (dir) {
      case 'R': return { x: n.x + n.W / 2 + L.half / 2, y: n.y };
      case 'L': return { x: n.x - n.W / 2 - L.half / 2, y: n.y };
      case 'T': return { x: n.x, y: n.y - n.H / 2 - L.half / 2 };
      case 'B': return { x: n.x, y: n.y + n.H / 2 + L.half / 2 };
    }
  }
  // 源端口候选：按朝向目标的方向优先（右>左>下>上 / 下>上>右>左）
  function sourceCandidates(a: { x: number; y: number }, b: { x: number; y: number }): Port[] {
    const dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? ['R', 'B', 'T', 'L'] : ['L', 'B', 'T', 'R'];
    }
    return dy >= 0 ? ['B', 'R', 'L', 'T'] : ['T', 'R', 'L', 'B'];
  }
  function targetCandidates(b: { x: number; y: number }, a: { x: number; y: number }): Port[] {
    // 目标端口朝向源（与源候选相反方向优先）
    return sourceCandidates(b, a);
  }
  function pickPort(n: { x: number; y: number; W: number; H: number; used: Set<string> }, cands: Port[]): Port {
    // 最短距离优先：始终取朝向目标的最短端口（候选已按距离排序）。
    // 若该端口已占用，允许重复（出口/入口重复是允许的），仅在多个朝向端口都可用时取未占用者。
    for (const c of cands) if (!n.used.has(c)) return c;
    return cands[0]; // 全部占用 → 复用最短端口（允许重复）
  }

  // ===== 避障数据结构：所有节点形状包围盒（本边进出节点除外） =====
  type Box = { x0: number; y0: number; x1: number; y1: number };
  const nodeBoxes: Record<string, Box> = {};
  for (const [id, p] of L.nodePos) {
    nodeBoxes[id] = { x0: p.x - p.W / 2, y0: p.y - p.H / 2, x1: p.x + p.W / 2, y1: p.y + p.H / 2 };
  }
  function segIntersectsBox(ax: number, ay: number, bx: number, by: number, r: Box): boolean {
    // 标准线段-矩形相交（含端点在内；端点恰好接触不算穿过——留给调用方跳过源/目标）
    const dx = bx - ax, dy = by - ay;
    // 用参数化裁剪（Liang-Barsky）
    let tmin = 0, tmax = 1;
    const p = [-dx, dx, -dy, dy];
    const q = [ax - r.x0, r.x1 - ax, ay - r.y0, r.y1 - ay];
    for (let k = 0; k < 4; k++) {
      if (p[k] === 0) {
        if (q[k] < 0) return false;
      } else {
        const rk = q[k] / p[k];
        if (p[k] < 0) { if (rk > tmin) tmin = rk; }
        else { if (rk < tmax) tmax = rk; }
      }
    }
    return tmin <= tmax;
  }
  function routeHits(pathPts: { x: number; y: number }[], skipA: string, skipB: string): boolean {
    for (const [id, bx] of Object.entries(nodeBoxes)) {
      if (id === skipA || id === skipB) continue;
      for (let i = 0; i < pathPts.length - 1; i++) {
        if (segIntersectsBox(pathPts[i].x, pathPts[i].y, pathPts[i + 1].x, pathPts[i + 1].y, bx)) return true;
      }
    }
    return false;
  }

  for (const e of data.edges.filter((x) => !x.parent)) {
    const a = nodeXY[e.from], b = nodeXY[e.to];
    if (!a || !b) continue;
    const label = e.label ? `<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 12}" text-anchor="middle" fill="${st.textColor}" font-size="11" paint-order="stroke" stroke="#fff" stroke-width="4">${esc(e.label)}</text>` : '';
    // 选端口：源朝向目标、目标朝向源，优先未占用（最短距离优先）
    const sp = pickPort(a, sourceCandidates(a, b));
    const tp = pickPort(b, targetCandidates(b, a));
    a.used.add(sp); b.used.add(tp);
    const s = portXY(a, sp), t = portXY(b, tp);
    // 正交走线：首段垂直于源节点该边（R/L→先横，T/B→先竖），末段垂直于目标节点该边
    const horiz1 = (sp === 'R' || sp === 'L');
    const horiz2 = (tp === 'R' || tp === 'L');

    // 构建正交路径。拐点"中线"可上下/左右挪动以避障。
    function buildRoute(midX: number | null, midY: number | null): { x: number; y: number }[] {
      let pts: { x: number; y: number }[] = [];
      if (Math.abs(s.x - t.x) < 1 && Math.abs(s.y - t.y) < 1) {
        pts = [{ x: s.x, y: s.y }, { x: t.x, y: t.y }];
      } else if (horiz1 && horiz2) {
        // 源水平出 + 目标水平入：横-竖-横（竖段在 midX）
        const mx = midX ?? (s.x + t.x) / 2;
        pts = [{ x: s.x, y: s.y }, { x: mx, y: s.y }, { x: mx, y: t.y }, { x: t.x, y: t.y }];
      } else if (!horiz1 && !horiz2) {
        // 源竖直出 + 目标竖直入：竖-横-竖（横段在 midY）
        const my = midY ?? (s.y + t.y) / 2;
        pts = [{ x: s.x, y: s.y }, { x: s.x, y: my }, { x: t.x, y: my }, { x: t.x, y: t.y }];
      } else {
        // 一横一竖：L 型一次拐弯
        const mx = horiz1 ? t.x : s.x;
        const my = horiz1 ? s.y : t.y;
        pts = [{ x: s.x, y: s.y }, { x: mx, y: my }, { x: t.x, y: t.y }];
      }
      return pts;
    }

    let pts = buildRoute(null, null);
    let round = 0;
    const MAX_ROUND = 3;
    const dw = L.half; // 走廊步长 = 0.5 连线区宽
    while (routeHits(pts, e.from, e.to) && round < MAX_ROUND) {
      round++;
      // 确定性避障：同行下移→同列右移→反向→扩格
      const tryOrder: { mX: number | null; mY: number | null }[] = [];
      if (horiz1 && horiz2) {
        const baseX = (s.x + t.x) / 2;
        // 竖段左右挪：先右移，再左移，再更远
        tryOrder.push({ mX: baseX + dw * round, mY: null }, { mX: baseX - dw * round, mY: null });
      } else if (!horiz1 && !horiz2) {
        const baseY = (s.y + t.y) / 2;
        // 横段下移/上移
        tryOrder.push({ mX: null, mY: baseY + dw * round }, { mX: null, mY: baseY - dw * round });
      } else {
        // L 型：拐点固定（无中间走廊可移），尝试整体下移/右移（扩格模拟）
        const my = horiz1 ? s.y : t.y;
        const mx = horiz1 ? t.x : s.x;
        tryOrder.push(
          { mX: mx + dw * round, mY: horiz1 ? my + dw * round : my },
          { mX: horiz1 ? mx : mx + dw * round, mY: my + dw * round },
        );
      }
      let found = false;
      for (const c of tryOrder) {
        const candidate = buildRoute(c.mX, c.mY);
        if (!routeHits(candidate, e.from, e.to)) { pts = candidate; found = true; break; }
      }
      if (!found) break;
    }
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    parts.push(`<path d="${d}" fill="none" stroke="${st.lineColor}" stroke-width="${st.lineWidth}" marker-end="url(#flowArrow)"/>${label}`);
  }

  // 节点
  for (const [, p] of L.nodePos) {
    parts.push(nodeShape(p.n, st, p.x, p.y, p.W, p.H));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
}
