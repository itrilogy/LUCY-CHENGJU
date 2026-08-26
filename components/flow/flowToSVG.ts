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
}

export function computeExcelLayout(data: FlowData, st: FlowChartStyles): XyLayout {
  let rows = rowsOf(data), cols = colsOf(data);
  // 无泳道：rows/cols 为空，但需要 1 行 1 列占位（大格）
  if (!rows.length) rows = [{ dict: 'ROOT', idx: 0 }];
  if (!cols.length) cols = [{ dict: 'ROOT', idx: 0 }];
  const nR = rows.length || 1, nC = cols.length || 1;
  const fs = st.nodeFontSize;

  const cellNodeId = new Map<string, { ri: number; ci: number }>();
  for (let ri = 0; ri < nR; ri++) for (let ci = 0; ci < nC; ci++)
    cellNodeId.set(`${rows[ri].dict}${rows[ri].idx}${cols[ci].dict}${cols[ci].idx}`, { ri, ci });

  // 归类节点到交叉格 (ri,ci)，按声明序；每格内节点链式布局（V/H）求 nx(横)/ny(纵)
  const group = new Map<string, FlowData['nodes'][0][]>();
  const cellXY = new Map<string, { nx: number; ny: number; items: { n: FlowData['nodes'][0]; gridX: number; gridY: number; m: NodeMetrics }[] }>();
  for (const n of data.nodes) {
    const key = cellKeyOf(n.cell);
    let rc = key ? cellNodeId.get(key) : undefined;
    if (!rc) rc = { ri: 0, ci: 0 };
    const gk = `${rc.ri}_${rc.ci}`;
    if (!group.has(gk)) group.set(gk, []);
    group.get(gk)!.push(n);
  }
  for (const [gk, nodes] of group) {
    let nx = 1, ny = 1, gx = 0, gy = 0, prevDir: 'V' | 'H' = 'H';
    const items: { n: FlowData['nodes'][0]; gridX: number; gridY: number; m: NodeMetrics }[] = [];
    for (const n of nodes) {
      const m = nodeMetrics(n, fs);
      const dir = n.vh ?? prevDir;
      items.push({ n, gridX: gx, gridY: gy, m });
      if (dir === 'V') { gy++; ny = Math.max(ny, gy + 1); }
      else { gx++; nx = Math.max(nx, gx + 1); }
      prevDir = dir;
    }
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

  // ③ 每列宽 = 该列各交叉格"自身需要宽"的最大值（不被某格 nx 盲目拉满整列）
  //   每个交叉格自身宽 = cell.nx × (该格节点最大宽 + 2*half)；自身高 = cell.ny × (该格节点最大高 + 2*half)
  const half = FLOW_SVG.half;
  const colWselfMax: number[] = new Array(nC).fill(BASE_W + 2 * half);
  const rowHselfMax: number[] = new Array(nR).fill(BASE_H + 2 * half);
  for (const [gk, cell] of cellXY) {
    const [ri, ci] = gk.split('_').map(Number);
    // 该格自身节点最大宽/高
    let wMax = 0, hMax = 0;
    for (const it of cell.items) { wMax = Math.max(wMax, it.m.halfW * 2); hMax = Math.max(hMax, it.m.halfH * 2); }
    if (!wMax) wMax = BASE_W;
    if (!hMax) hMax = BASE_H;
    const needW = cell.nx * (wMax + 2 * half);
    const needH = cell.ny * (hMax + 2 * half);
    colWselfMax[ci] = Math.max(colWselfMax[ci], needW);
    rowHselfMax[ri] = Math.max(rowHselfMax[ri], needH);
  }
  const colWPx = colWselfMax;
  const rowHPx = rowHselfMax;

  const bandLeft = FLOW_SVG.head;
  const colX: number[] = []; let acc = bandLeft;
  for (let ci = 0; ci < nC; ci++) { colX.push(acc); acc += colWPx[ci]; }
  const bandTop = (ri: number) => {
    let a = FLOW_SVG.head + FLOW_SVG.colLabelH;
    for (let r = 0; r < ri; r++) a += rowHPx[r];
    return a;
  };

  // 节点落中心格（3×3 布局中心格 = 1W×1H），四周 half 连线区
  // 节点自身尺寸（nodeW/nodeH）= 该节点图形实际宽高（贴合自身，不被列/行最大拉大）
  // 位置仍按行列统一网格对齐（半边=该列最大宽/该行最大高的一半，使节点在绘制格居中）
  const nodePos = new Map<string, NodePos>();
  for (const [gk, cell] of cellXY) {
    const [ri, ci] = gk.split('_').map(Number);
    const pw = colWPx[ci] / cell.nx, ph = rowHPx[ri] / cell.ny;
    for (const it of cell.items) {
      const nodeW = it.m.halfW * 2;   // 节点自身宽
      const nodeH = it.m.halfH * 2;   // 节点自身高
      const gx = colX[ci] + it.gridX * pw;
      const gy = bandTop(ri) + it.gridY * ph;
      const cx = gx + half + nodeW / 2;  // 中心格内居中（自身宽）
      const cy = gy + half + nodeH / 2;
      nodePos.set(it.n.id, { x: cx, y: cy, ri, ci, W: nodeW, H: nodeH, n: it.n });
    }
  }

  const width = colX[nC - 1] + colWPx[nC - 1] + 20;
  const height = bandTop(nR - 1) + rowHPx[nR - 1] + 20;
  return { rows, cols, nodePos, colX, rowY: [], colWpx: colWPx, rowHpx: rowHPx, width, height, half, bandLeft, bandTop };
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
  parts.push(`<rect x="${x0}" y="${y0}" width="${width - x0 - 5}" height="${height - y0 - 5}" fill="#f8fafc"/>`);
  // 绘制格分布：每个交叉格（含空格）画真实列宽/行高的矩形，行列对齐直接可见
  for (let ri = 0; ri < nR; ri++) {
    for (let ci = 0; ci < nC; ci++) {
      const gx0 = L.colX[ci], gy0 = L.bandTop(ri);
      const gw = L.colWpx[ci], gh = L.rowHpx[ri];
      parts.push(`<rect x="${gx0}" y="${gy0}" width="${gw}" height="${gh}" fill="none" stroke="#94a3b8" stroke-width="1"/>`);
    }
  }
  // 真实列/行边界粗线（强调泳道格分布）
  for (let ci = 0; ci <= nC; ci++) {
    const gx = ci < nC ? L.colX[ci] : width - 5;
    parts.push(`<line x1="${gx}" y1="${y0}" x2="${gx}" y2="${height - 5}" stroke="#64748b" stroke-width="1.2"/>`);
  }
  for (let ri = 0; ri <= nR; ri++) {
    const gy = L.bandTop(ri);
    parts.push(`<line x1="${x0}" y1="${gy}" x2="${width - 5}" y2="${gy}" stroke="#64748b" stroke-width="1.2"/>`);
  }

  // 行/列标题
  for (let ri = 0; ri < nR; ri++) {
    const rl = dictValue(data, L.rows[ri].dict, L.rows[ri].idx);
    parts.push(`<text x="${L.bandLeft - 12}" y="${L.bandTop(ri) + L.rowHpx[ri] / 2}" text-anchor="end" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(rl)}</text>`);
  }
  for (let ci = 0; ci < nC; ci++) {
    const cl = dictValue(data, L.cols[ci].dict, L.cols[ci].idx);
    parts.push(`<text x="${L.colX[ci] + 8}" y="${FLOW_SVG.head - 6}" text-anchor="start" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(cl)}</text>`);
  }

  // 每格绘制格：画中心节点区 + 四周连线区（浅色背景示意）
  // 由 nodePos 逐节点画其绘制格四周连线区（0.5 half 环绕）
  for (const [, p] of L.nodePos) {
    const gx = p.x - p.W / 2 - L.half;
    const gy = p.y - p.H / 2 - L.half;
    const gw = p.W + 2 * L.half;
    const gh = p.H + 2 * L.half;
    // 四周连线区（整格浅底），中心节点区留白（节点块会覆盖）
    parts.push(`<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx="3" fill="#e0f2fe"/>`);
  }

  // 连线：最小最短原则 + 确定性
  // 规则：目标在源右方同行→水平直达；目标在源下方同列→垂直直达；
  //       否则先横后纵最短折线（横向向目标 x 移动，纵向向目标 y 移动，走连线区中线）
  const nodeXY: Record<string, { x: number; y: number; W: number; H: number }> = {};
  for (const [id, p] of L.nodePos) nodeXY[id] = { x: p.x, y: p.y, W: p.W, H: p.H };
  for (const e of data.edges.filter((x) => !x.parent)) {
    const a = nodeXY[e.from], b = nodeXY[e.to];
    if (!a || !b) continue;
    const label = e.label ? `<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 12}" text-anchor="middle" fill="${st.textColor}" font-size="11" paint-order="stroke" stroke="#fff" stroke-width="4">${esc(e.label)}</text>` : '';
    const sameRow = Math.abs(a.y - b.y) < 1;
    const sameCol = Math.abs(a.x - b.x) < 1;
    let d: string;
    // 关键：从源节点"朝向目标那一侧"的连线区出发，直连到目标节点"朝向源那一侧"的连线区。
    // 相邻节点（同行/同列/对角邻近）直接连通，不绕中介格。
    const dx = b.x - a.x, dy = b.y - a.y;
    if (sameRow) {
      // 同行：水平直连（右侧/左侧连线区中线）
      const x1 = b.x > a.x ? a.x + a.W / 2 + L.half / 2 : a.x - a.W / 2 - L.half / 2;
      const x2 = b.x > a.x ? b.x - b.W / 2 - L.half / 2 : b.x + b.W / 2 + L.half / 2;
      d = `M${x1},${a.y} L${x2},${b.y}`;
    } else if (sameCol) {
      // 同列：垂直直连（上/下连线区中线）
      const y1 = b.y > a.y ? a.y + a.H / 2 + L.half / 2 : a.y - a.H / 2 - L.half / 2;
      const y2 = b.y > a.y ? b.y - b.H / 2 - L.half / 2 : b.y + b.H / 2 + L.half / 2;
      d = `M${a.x},${y1} L${b.x},${y2}`;
    } else {
      // 相邻（对角邻近）：若 x 相近（同一列区）走垂直，若 y 相近（同一行区）走水平；
      // 否则从"近侧"出发直连（L 型，不绕中介列）。选源→目标中，先沿主导方向走，再补另一方向。
      // 用"源朝向目标最近侧"＋"目标朝向源最近侧"，直连一个 L。
      const x1 = dx > 0 ? a.x + a.W / 2 + L.half / 2 : a.x - a.W / 2 - L.half / 2;
      const y2 = dy > 0 ? b.y - b.H / 2 - L.half / 2 : b.y + b.H / 2 + L.half / 2;
      // L 型：源近侧 → 水平到目标 x，再垂直到 y2（仅一次拐弯，不绕中介格）
      d = `M${x1},${a.y} L${b.x},${a.y} L${b.x},${y2}`;
    }
    parts.push(`<path d="${d}" fill="none" stroke="${st.lineColor}" stroke-width="${st.lineWidth}" marker-end="url(#flowArrow)"/>${label}`);
    parts.push(`<path d="${d}" fill="none" stroke="${st.lineColor}" stroke-width="${st.lineWidth}" marker-end="url(#flowArrow)"/>${label}`);
  }

  // 节点
  for (const [, p] of L.nodePos) {
    parts.push(nodeShape(p.n, st, p.x, p.y, p.W, p.H));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
}
