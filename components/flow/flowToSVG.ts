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
  const tw = textW(label, fs);
  let shape = '';
  // 圆形节点（start/end）：字符超出圆形时加"字符底色"底板（与节点色、字体色均差异的灰色）
  if (n.type === 'start' || n.type === 'end') {
    const r = Math.min(W, H) / 2;
    const fill = n.type === 'start' ? st.startColor : st.endColor;
    const sw = n.type === 'start' ? 1.5 : 3;
    const labelPlate = tw > r * 1.6
      ? `<rect x="${cx - tw / 2 - 6}" y="${cy - fs / 2 - 4}" width="${tw + 12}" height="${fs + 8}" rx="4" fill="#64748b" stroke="none" opacity="0.9"/>`
      : '';
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>${labelPlate}<text x="${cx}" y="${cy + fs * 0.36}" text-anchor="middle" fill="${labelPlate ? '#f8fafc' : '#fff'}" font-size="${fs}" font-weight="500">${esc(label)}</text>`;
  }
  switch (n.type) {
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
  const tw2 = textW(label, fs);
  const overflow = tw2 > W - 8;
  // 矩形等其它节点：文字超宽时也给底色（与形状色差异），字体色差异
  const plate = overflow
    ? `<rect x="${cx - tw2 / 2 - 6}" y="${cy - fs / 2 - 4}" width="${tw2 + 12}" height="${fs + 8}" rx="4" fill="#475569" opacity="0.9"/>`
    : '';
  return shape + plate + `<text x="${cx}" y="${cy + fs * 0.36}" text-anchor="middle" fill="${overflow ? '#f8fafc' : '#fff'}" font-size="${fs}" font-weight="500">${esc(label)}</text>`;
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
  titleBandW: number;
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

  const bandLeft = (() => {
    // 左表头列宽：按轴标题文字宽度略宽（非 Y 泳道文字宽度）
    const axisTitles = [data.axes?.x?.title || '', data.axes?.y?.title || ''].filter(Boolean);
    const axisW = axisTitles.length
      ? Math.max(48, Math.max(...axisTitles.map((t) => textW(t, 12))) + 28)
      : 0;
    return axisTitles.length ? axisW : FLOW_SVG.head;
  })();
  // 整图标题 AxisY：左侧额外竖向标题带（不横排超宽），titleBandW = 字号 + 边距
  const titleBandW = data.axes?.page?.place === 'AxisY' ? st.titleFontSize + 32 : 0;
  const colX: number[] = []; let acc = bandLeft + titleBandW;
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
    width, height, half, bandLeft, bandTop, gridRight, gridBottom, titleBandW,
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
  const x0 = L.bandLeft + L.titleBandW, y0 = L.bandTop(0);
  const placeY = data.axes?.page?.place === 'AxisY';

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
  // 真实列/行边界：虚线-细线（避免与连线视觉重叠）
  for (let ci = 0; ci <= nC; ci++) {
    const gx = ci < nC ? L.colX[ci] : L.gridRight;
    parts.push(`<line x1="${gx}" y1="${y0}" x2="${gx}" y2="${L.gridBottom}" stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="4 4"/>`);
  }
  for (let ri = 0; ri <= nR; ri++) {
    const gy = ri < nR ? L.bandTop(ri) : L.gridBottom;
    parts.push(`<line x1="${x0}" y1="${gy}" x2="${L.gridRight}" y2="${gy}" stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="4 4"/>`);
  }

  // ===== 流程图标题：AxisX=顶部通栏 / AxisY=左侧竖向标题带（不横排超宽） =====
  const titleText = data.title || st.title || '流程图';
  if (placeY) {
    // AxisY：左侧竖向标题带，宽度 titleBandW，旋转 -90°（文字竖向，宽度合理不横排）
    // 高度从 y=0 到 gridBottom，与整个 X 轴泳道区齐平（含顶部表头，不留缺口）
    const tbw = L.titleBandW || (st.titleFontSize + 32);
    const bandMidY = L.gridBottom / 2;
    parts.push(`<rect x="0" y="0" width="${tbw}" height="${L.gridBottom}" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>`);
    parts.push(`<text x="${tbw / 2}" y="${bandMidY}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${tbw / 2} ${bandMidY})" fill="${st.textColor}" font-size="${st.titleFontSize}" font-weight="bold">${esc(titleText)}</text>`);
  } else {
    parts.push(`<rect x="0" y="0" width="${L.gridRight}" height="${FLOW_SVG.titleH}" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>`);
    parts.push(`<text x="${L.gridRight / 2}" y="${FLOW_SVG.titleH / 2}" text-anchor="middle" dominant-baseline="middle" fill="${st.textColor}" font-size="${st.titleFontSize}" font-weight="bold">${esc(titleText)}</text>`);
  }

  // ===== 轴坐标标题 + 泳道标签：左/上表头，格子化，默认居中 =====
  const axisXT = data.axes?.x?.title || '';
  const axisYT = data.axes?.y?.title || '';
  const cornerW = L.bandLeft, cornerH = FLOW_SVG.colLabelH;
  // 左上角格：axis-x（顶部表头，水平居中）+ axis-y（左上角格水平，与axis-x分两行）
  // 左表头整体向右偏移 titleBandW（AxisY 标题带在最左）
  const hx = L.titleBandW;
  if (axisXT || axisYT) {
    parts.push(`<rect x="${hx}" y="${FLOW_SVG.titleH}" width="${cornerW}" height="${cornerH}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>`);
    if (axisXT && axisYT) {
      parts.push(`<text x="${hx + cornerW / 2}" y="${FLOW_SVG.titleH + 11}" text-anchor="middle" dominant-baseline="middle" fill="${st.axisColor}" font-size="11" font-weight="bold">${esc(axisXT)}</text>`);
      parts.push(`<text x="${hx + cornerW / 2}" y="${FLOW_SVG.titleH + 24}" text-anchor="middle" dominant-baseline="middle" fill="${st.axisColor}" font-size="10">${esc(axisYT)}</text>`);
    } else {
      const axisLabel = axisXT || axisYT;
      parts.push(`<text x="${hx + cornerW / 2}" y="${FLOW_SVG.titleH + cornerH / 2}" text-anchor="middle" dominant-baseline="middle" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(axisLabel)}</text>`);
    }
  }
  // 列标签格（顶部表头，每列一格，居中）
  for (let ci = 0; ci < nC; ci++) {
    const cl = dictValue(data, L.cols[ci].dict, L.cols[ci].idx);
    const show = L.cols[ci].dict !== 'ROOT';
    parts.push(`<rect x="${L.colX[ci]}" y="${FLOW_SVG.titleH}" width="${L.colWpx[ci]}" height="${cornerH}" fill="${show ? '#e2e8f0' : 'none'}" stroke="#94a3b8" stroke-width="1"/>`);
    if (show) parts.push(`<text x="${L.colX[ci] + L.colWpx[ci] / 2}" y="${FLOW_SVG.titleH + cornerH / 2}" text-anchor="middle" dominant-baseline="middle" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(cl)}</text>`);
  }
  // 行标签格（左表头，每行一格）：Y 泳道标题旋转 -90°（竖向排列）
  for (let ri = 0; ri < nR; ri++) {
    const rl = dictValue(data, L.rows[ri].dict, L.rows[ri].idx);
    const show = L.rows[ri].dict !== 'ROOT';
    const rcx = hx + cornerW / 2, rcy = L.bandTop(ri) + L.rowHpx[ri] / 2;
    parts.push(`<rect x="${hx}" y="${L.bandTop(ri)}" width="${cornerW}" height="${L.rowHpx[ri]}" fill="${show ? '#e2e8f0' : 'none'}" stroke="#94a3b8" stroke-width="1"/>`);
    if (show) parts.push(`<text x="${rcx}" y="${rcy}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${rcx} ${rcy})" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(rl)}</text>`);
  }

  // 连线：最小最短原则 + 进出口端口不重复（最短距离优先）
  const nodeXY: Record<string, { x: number; y: number; W: number; H: number; usedIn: Set<string>; usedOut: Set<string> }> = {};
  for (const [id, p] of L.nodePos) nodeXY[id] = { x: p.x, y: p.y, W: p.W, H: p.H, usedIn: new Set(), usedOut: new Set() };

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
  // 进出分开记录：出口/入口各自独立可选，重复（与相反向共用一侧）可接受
  function pickPort(
    n: { x: number; y: number; W: number; H: number; usedIn: Set<string>; usedOut: Set<string> },
    cands: Port[], isOut: boolean,
  ): Port {
    const usedSet = isOut ? n.usedOut : n.usedIn;
    for (const c of cands) if (!usedSet.has(c)) return c;
    return cands[0]; // 该朝向全占用 → 复用最短朝向端口（允许重复）
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

  // ===== 两趟端口分配：先"入口"（几何指向约束强），后"出口"（避开已占入口） =====
  const edgeList = data.edges.filter((x) => !x.parent);
  const targetPortOf = new Map<string, Port>(); // edge id -> target port (入口)
  // 第一趟：入口端口
  for (const e of edgeList) {
    const a = nodeXY[e.from], b = nodeXY[e.to];
    if (!a || !b) continue;
    const tp = pickPort(b, targetCandidates(b, a), false);
    b.usedIn.add(tp);
    targetPortOf.set(e.id, tp);
  }
  // 第二趟：出口端口（避免与已占入口同侧；候选内优先未占）
  for (const e of edgeList) {
    const a = nodeXY[e.from], b = nodeXY[e.to];
    if (!a || !b) continue;
    const cands = sourceCandidates(a, b);
    // 优先选"未被出入口占"的端口；若朝向全被占，则退而求其次选"未出"（避开已占入口）
    let sp = cands[0];
    let found = false;
    for (const c of cands) { if (!a.usedOut.has(c) && !a.usedIn.has(c)) { sp = c; found = true; break; } }
    if (!found) for (const c of cands) { if (!a.usedOut.has(c)) { sp = c; found = true; break; } }
    a.usedOut.add(sp);

    const tp = targetPortOf.get(e.id) ?? 'T';
    const s = portXY(a, sp), t = portXY(b, tp);
    // 正交走线：首段垂直于源节点该边（R/L→先横，T/B→先竖），末段垂直于目标节点该边
    const horiz1 = (sp === 'R' || sp === 'L');
    const horiz2 = (tp === 'R' || tp === 'L');

    // 构建正交路径：应保持最简 L 型（1 次拐弯），不产生 U/n 形
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
      // 去除零长段与共线中间点（避免多余点造成重复/回折，也使得标签落于真正的最长段）
      const clean = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const a = clean[clean.length - 1], b = pts[i];
        if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5) continue; // 零长
        // 若与上一段共线（同向），用 b 替换 a（合并共线点）
        const prev = clean[clean.length - 2];
        if (prev) {
          const v1x = a.x - prev.x, v1y = a.y - prev.y;
          const v2x = b.x - a.x, v2y = b.y - a.y;
          const cross = v1x * v2y - v1y * v2x;
          const dot = v1x * v2x + v1y * v2y;
          if (Math.abs(cross) < 0.5 && dot >= 0) { clean[clean.length - 1] = b; continue; }
        }
        clean.push(b);
      }
      return clean;
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
    // ===== 标签：放在折线"最长线段"的中点（条件分支文本），非矩形中心 =====
    let label = '';
    if (e.label) {
      let li = 0, maxLen = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        if (len > maxLen) { maxLen = len; li = i; }
      }
      const lx = (pts[li].x + pts[li + 1].x) / 2;
      const ly = (pts[li].y + pts[li + 1].y) / 2;
      const horizontal = Math.abs(pts[li + 1].y - pts[li].y) < Math.abs(pts[li + 1].x - pts[li].x);
      // 水平段标签放线上方，垂直段放线右侧
      const dx = horizontal ? 0 : 10;
      const dy = horizontal ? -10 : 0;
      label = `<text x="${lx + dx}" y="${ly + dy}" text-anchor="middle" fill="${st.textColor}" font-size="11" paint-order="stroke" stroke="#fff" stroke-width="4">${esc(e.label)}</text>`;
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
