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
import type { FlowData, FlowChartStyles, FlowEdge } from '../../types';
import {
  solveAlgebraicPorts,
  solveAlgebraicRoute,
  computeGridChannels,
  type NodeGeometry,
  type EdgeSpec,
  type Box,
  type Port,
  type Point,
} from './AlgebraicFlowRouter.ts';
import { computeCellOrder } from './CellOrder.ts';

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
  const lines = wrapLabel(label, wrapInnerWidth(n.type), fs);
  const maxLineW = Math.max(...lines.map((ln) => textW(ln, fs)), 0);
  const textH = Math.max(1, lines.length) * fs * 1.3;
  switch (n.type) {
    case 'start':
    case 'end': {
      const r = Math.max(NODE_BASE.startEnd.w / 2, NODE_BASE.startEnd.h / 2, 22);
      const effectiveHalfW = Math.max(r, maxLineW / 2 + 8);
      const effectiveHalfH = Math.max(r, textH / 2 + 6);
      return { halfW: effectiveHalfW, halfH: effectiveHalfH, shapeType: 'circle' };
    }
    case 'exclusiveGateway':
    case 'parallelGateway': {
      const dw = Math.max(NODE_BASE.gateway.w, maxLineW / 0.55 + 16, textH / 0.55);
      const dh = Math.max(NODE_BASE.gateway.h, textH + 20);
      return { halfW: dw / 2, halfH: dh / 2, shapeType: 'diamond' };
    }
    case 'annotation':
      return { halfW: Math.max(NODE_BASE.annotation.w / 2, maxLineW / 2 + 12), halfH: Math.max(NODE_BASE.annotation.h / 2, textH / 2 + 6), shapeType: 'rect' };
    case 'dataObject':
      return { halfW: Math.max(NODE_BASE.data.w / 2, maxLineW / 2 + 12), halfH: Math.max(NODE_BASE.data.h / 2, textH / 2 + 6), shapeType: 'rect' };
    case 'subprocess':
      return { halfW: Math.max(NODE_BASE.subprocess.w / 2, maxLineW / 2 + 14), halfH: Math.max(NODE_BASE.subprocess.h / 2, textH / 2 + 12), shapeType: 'rect' };
    case 'task':
    default:
      return { halfW: Math.max(NODE_BASE.task.w / 2, maxLineW / 2 + 14), halfH: Math.max(NODE_BASE.task.h / 2, textH / 2 + 8), shapeType: 'rect' };
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
/** 属性值若为 Dict[i] 则展开为字面量（图面不出现 R[0]） */
function expandRef(data: FlowData, raw: string): string {
  const m = String(raw).match(/^([A-Za-z_\u4e00-\u9fff][\w\u4e00-\u9fff]*)\[(\d+)\]$/);
  if (!m) return raw;
  const arr = data.dicts[m[1]];
  const idx = parseInt(m[2], 10);
  if (arr && arr[idx] !== undefined) return arr[idx];
  return raw;
}
/** 主网格节点：子流程内部与修饰类不占交叉格 */
function isLayoutNode(n: FlowData['nodes'][0]): boolean {
  if (n.parent) return false;
  if (n.type === 'annotation' || n.type === 'dataObject') return false;
  return true;
}
function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapInnerWidth(type: string): number {
  switch (type) {
    case 'start':
    case 'end': return 96;
    case 'exclusiveGateway':
    case 'parallelGateway': return 72;
    case 'annotation': return NODE_BASE.annotation.w - 20;
    case 'dataObject': return NODE_BASE.data.w - 20;
    case 'subprocess': return NODE_BASE.subprocess.w - 24;
    default: return NODE_BASE.task.w - 24;
  }
}

/** 按字宽折行；[0-9.]+ 视为原子，避免把 5000 切成 50/00 */
function wrapLabel(label: string, maxWidth: number, fs: number): string[] {
  const s = String(label);
  if (!s) return [''];
  if (textW(s, fs) <= maxWidth) return [s];
  const lines: string[] = [];
  let cur = '';
  let i = 0;
  while (i < s.length) {
    let j = i;
    if (/[0-9.]/.test(s[i])) {
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
    } else {
      j = i + 1;
    }
    const piece = s.slice(i, j);
    const trial = cur + piece;
    if (cur && textW(trial, fs) > maxWidth) {
      lines.push(cur);
      cur = '';
      continue;
    }
    cur = trial;
    i = j;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** 渲染多行文本：返回 <text> 内含 <tspan>，按行高 fs*1.3 递增 */
function multilineText(cx: number, cy: number, lines: string[], fs: number, fill: string): string {
  if (lines.length <= 1) {
    return `<text x="${cx}" y="${cy + fs * 0.36}" text-anchor="middle" fill="${fill}" font-size="${fs}" font-weight="500">${esc(lines[0] || '')}</text>`;
  }
  const lh = fs * 1.3;
  const firstY = cy - ((lines.length - 1) * lh) / 2 + fs * 0.36;
  const tspans = lines.map((ln, i) => `<tspan x="${cx}" y="${firstY + i * lh}">${esc(ln)}</tspan>`).join('');
  return `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${fill}" font-size="${fs}" font-weight="500">${tspans}</text>`;
}

/** 节点形状（中心格内，1W×1H） */
function nodeShape(n: FlowData['nodes'][0], st: FlowChartStyles, cx: number, cy: number, W: number, H: number, roleText?: string): string {
  const label = n.label || n.labelRef || n.id;
  const fs = st.nodeFontSize;
  const stroke = 'rgba(15,23,42,0.25)';
  const inner = (n.type === 'exclusiveGateway' || n.type === 'parallelGateway')
    ? W * 0.55
    : (n.type === 'start' || n.type === 'end') ? wrapInnerWidth(n.type) : W - 16;
  const lines = wrapLabel(label, inner, fs);
  const maxLineW = Math.max(...lines.map((ln) => textW(ln, fs)), 0);
  let shape = '';
  // 圆形节点（start/end）：仅当折行后仍超圆内宽才加底板
  if (n.type === 'start' || n.type === 'end') {
    const r = Math.min(W, H) / 2;
    const fill = n.type === 'start' ? st.startColor : st.endColor;
    const sw = n.type === 'start' ? 1.5 : 3;
    const overflow = maxLineW > r * 1.6;
    const labelPlate = overflow
      ? `<rect x="${cx - maxLineW / 2 - 6}" y="${cy - (lines.length * fs * 1.3) / 2 - 4}" width="${maxLineW + 12}" height="${lines.length * fs * 1.3 + 8}" rx="4" fill="#64748b" stroke="none" opacity="0.9"/>`
      : '';
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>${labelPlate}${multilineText(cx, cy, lines, fs, overflow ? '#f8fafc' : '#fff')}`;
  }
  switch (n.type) {
    case 'exclusiveGateway':
    case 'parallelGateway': {
      const d = `M${cx},${cy - H / 2} L${cx + W / 2},${cy} L${cx},${cy + H / 2} L${cx - W / 2},${cy} Z`;
      shape = `<path d="${d}" fill="${n.type === 'parallelGateway' ? st.parallelColor : st.gatewayColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      if (n.type === 'parallelGateway') {
        const py = lines.length ? cy - fs * 0.85 : cy;
        shape += `<line data-flow="parallel-plus" x1="${cx - 8}" y1="${py}" x2="${cx + 8}" y2="${py}" stroke="#fff" stroke-width="1.8"/>`
          + `<line data-flow="parallel-plus" x1="${cx}" y1="${py - 8}" x2="${cx}" y2="${py + 8}" stroke="#fff" stroke-width="1.8"/>`;
      }
      break;
    }
    case 'annotation': {
      const w = W, h = H, x0 = cx - w / 2, y0 = cy - h / 2, fold = 12;
      const pts = `${x0},${y0} ${x0 + w - fold},${y0} ${x0 + w},${y0 + fold} ${x0 + w},${y0 + h} ${x0},${y0 + h}`;
      shape = `<polygon points="${pts}" fill="${st.annotationColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    }
    case 'dataObject': {
      const w = W, h = H, x0 = cx - w / 2, y0 = cy - h / 2, fold = 14;
      const d = `M${x0},${y0} L${x0 + w - fold},${y0} L${x0 + w},${y0 + fold} L${x0 + w},${y0 + h} L${x0 + fold},${y0 + h} L${x0},${y0 + h - fold} Z`;
      shape = `<path d="${d}" fill="${st.dataColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    }
    case 'subprocess': {
      shape = `<rect x="${cx - W / 2}" y="${cy - H / 2}" width="${W}" height="${H}" rx="6" fill="${st.subprocessColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      const pw = 10, ph = 10, px = cx - pw / 2, py = cy + H / 2 - ph - 4;
      shape += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="#fff" stroke-width="1.2"/>`
        + `<line x1="${cx - 3}" y1="${py + ph / 2}" x2="${cx + 3}" y2="${py + ph / 2}" stroke="#fff" stroke-width="1.2"/>`
        + `<line x1="${cx}" y1="${py + 2}" x2="${cx}" y2="${py + ph - 2}" stroke="#fff" stroke-width="1.2"/>`;
      break;
    }
    default:
      shape = `<rect x="${cx - W / 2}" y="${cy - H / 2}" width="${W}" height="${H}" rx="6" fill="${st.taskColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
  }
  const overflow = maxLineW > inner + 0.5;
  const plate = overflow
    ? `<rect x="${cx - maxLineW / 2 - 6}" y="${cy - (lines.length * fs * 1.3) / 2 - 4}" width="${maxLineW + 12}" height="${lines.length * fs * 1.3 + 8}" rx="4" fill="#475569" opacity="0.9"/>`
    : '';
  const textCy = (n.type === 'parallelGateway' && lines.length) ? cy + fs * 0.55 : cy;
  let out: string;
  if (n.type === 'subprocess') {
    // 子流程标题放左下角（不遮挡框内内部小图）
    const titleY = cy + H / 2 - 16;
    out = shape + plate + `<text x="${cx - W / 2 + 10}" y="${titleY}" text-anchor="start" fill="${overflow ? '#f8fafc' : '#fff'}" font-size="${fs}" font-weight="600">${esc(lines[0] || '')}</text>`;
  } else {
    out = shape + plate + multilineText(cx, textCy, lines, fs, overflow ? '#f8fafc' : '#fff');
  }
  if (roleText) {
    out += `<text x="${cx + W / 2 - 2}" y="${cy + H / 2 + 11}" text-anchor="end" fill="#64748b" font-size="9">${esc(roleText)}</text>`;
  }
  return out;
}

/** 子流程框内内部小图：缩略节点按声明序横排/居中，迷你连线连接相邻内部节点 */
function renderSubprocessInner(
  data: FlowData,
  inner: FlowData['nodes'],
  innerEdges: FlowEdge[],
  st: FlowChartStyles,
  p: { x: number; y: number; W: number; H: number },
): string {
  const pad = 10, miniH = 20, fs = 8;
  const availW = p.W - pad * 2;
  const availH = p.H - pad * 2 - 6; // 预留底部＋盒位置
  if (availW < 40 || availH < 20 || !inner.length) return '';
  const n = inner.length;
  const gap = 8;
  // 内部列数 = √N（与布局 innerCols 同款），使子流程框内小图与 k×mm 整数倍框对齐
  const colMax = Math.max(1, Math.ceil(Math.sqrt(n)));
  const iw = Math.min(72, Math.max(40, Math.floor((availW - (colMax - 1) * gap) / colMax)));
  const x0 = p.x - availW / 2, y0 = p.y - availH / 2;
  const pos: Record<string, { x: number; y: number }> = {};
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const node = inner[i];
    const r = Math.floor(i / colMax), c = i % colMax;
    const cx = x0 + c * (iw + gap) + iw / 2;
    const cy = y0 + r * (miniH + gap) + miniH / 2;
    pos[node.id] = { x: cx, y: cy };
  }
  // 迷你连线（内部边：直角连接相邻节点中心）
  for (const e of innerEdges) {
    const s = pos[e.from], t = pos[e.to];
    if (!s || !t) continue;
    const midY = (s.y + t.y) / 2;
    const d = s.x === t.x
      ? `M${s.x},${s.y} L${t.x},${t.y}`
      : `M${s.x},${s.y} L${s.x},${midY} L${t.x},${midY} L${t.x},${t.y}`;
    parts.push(`<path d="${d}" fill="none" stroke="${st.lineColor}" stroke-width="1"/>`);
  }
  // 迷你节点（shape 按类型极小化）
  for (let i = 0; i < n; i++) {
    const node = inner[i];
    const cx = pos[node.id].x, cy = pos[node.id].y;
    const label = wrapLabel(node.label || node.labelRef || node.id, iw - 6, fs)[0] || '';
    let s = '';
    const fillNode = node.type === 'start' ? st.startColor
      : node.type === 'end' ? st.endColor
      : node.type === 'exclusiveGateway' || node.type === 'parallelGateway' ? st.gatewayColor
      : st.taskColor;
    if (node.type === 'start' || node.type === 'end') {
      const r = miniH / 2 - 2;
      s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillNode}" stroke="rgba(15,23,42,0.25)" stroke-width="1"/>`;
    } else if (node.type === 'exclusiveGateway' || node.type === 'parallelGateway') {
      s = `<path d="M${cx},${cy - miniH / 2 + 2} L${cx + iw / 2},${cy} L${cx},${cy + miniH / 2 - 2} L${cx - iw / 2},${cy} Z" fill="${fillNode}" stroke="rgba(15,23,42,0.25)" stroke-width="1"/>`;
    } else {
      s = `<rect x="${cx - iw / 2}" y="${cy - miniH / 2}" width="${iw}" height="${miniH}" rx="3" fill="${fillNode}" stroke="rgba(15,23,42,0.25)" stroke-width="1"/>`;
    }
    parts.push(s + `<text x="${cx}" y="${cy + fs * 0.35}" text-anchor="middle" fill="#fff" font-size="${fs}">${esc(label)}</text>`);
  }
  return parts.join('');
}

function arrowMarker(id: string, color: string): string {
  return `<defs><marker id="${id}" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L0,6 L7,3 z" fill="${color}"/></marker></defs>`;
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
  // 单维泳道：先按真实泳道占位，分类后再按「各泳道最大节点数」扩虚拟轴（ALIGN-1）
  const realRows = rowsOf(data), realCols = colsOf(data);
  const isHSingle = realRows.length > 0 && realCols.length === 0;
  const isVSingle = realCols.length > 0 && realRows.length === 0;
  // DOC 虚拟泳道：当出现顶层 N/DATA（annotation/dataObject）时，最右侧追加一列 DOC（文档信息泳道），
  // N/DATA 与其他主流程节点一起参与布局（落格、纵向避让、推动列宽/行高），与依附节点行对齐。
  const hasTopNData = data.nodes.some((n) => !n.parent && (n.type === 'annotation' || n.type === 'dataObject'));
  if (hasTopNData && !cols.some((c) => c.dict === 'DOC')) {
    cols = [...cols, { dict: 'DOC', idx: 0 }];
  }
  let nR = rows.length || 1, nC = cols.length || 1;
  const fs = st.nodeFontSize;

  const cellNodeId = new Map<string, { ri: number; ci: number }>();
  const rebuildCellIndex = () => {
    cellNodeId.clear();
    for (let ri = 0; ri < nR; ri++) for (let ci = 0; ci < nC; ci++) {
      const rowKey = `${rows[ri].dict}${rows[ri].idx}`;
      const colKey = `${cols[ci].dict}${cols[ci].idx}`;
      const rc = { ri, ci };
      cellNodeId.set(rowKey + colKey, rc);
      if (rows[ri].dict === 'ROOT') cellNodeId.set(colKey, rc);
      if (cols[ci].dict === 'ROOT') cellNodeId.set(rowKey, rc);
    }
  };
  rebuildCellIndex();

  // 归类节点到交叉格 (ri,ci)
  // 单维泳道：横向(H轴)=每行一条泳道，节点沿列依次排；纵向(V轴)=每列一条泳道，节点沿行依次排
  // P0-2 修复：泳道索引取节点 cell 在"泳道列表"中的位置（rows/cols 数组下标），
  //           而非字典原始下标——避免非连续索引（Lane from D[0,2]）越界（y:NaN）。
  // P0-3 修复：cell 为空（自动顺序落格）的节点，按声明序填入第一个未占用交叉格，
  //           避免全部堆叠到 (0,0)。
  const group = new Map<string, FlowData['nodes'][0][]>();
  const cellXY = new Map<string, { nx: number; ny: number; items: { n: FlowData['nodes'][0]; gridX: number; gridY: number; m: NodeMetrics }[] }>();
  const laneSeq = new Map<number, number>(); // 泳道行/列位置 -> 该泳道内已用序列
  const usedCell = new Set<string>();        // 已占用的 (ri_ci)，供自动落格避免重叠
  const artifacts: FlowData['nodes'][0][] = [];

  // 泳道列表 -> 位置映射：dict+idx -> 该泳道在 rows/cols 数组中的下标
  const lanePosOf = (dict: string, idx: number): number => {
    if (isHSingle) return rows.findIndex((r) => r.dict === dict && r.idx === idx);
    return cols.findIndex((c) => c.dict === dict && c.idx === idx);
  };

  // 计算 N/DATA 依附主节点所在的行（对齐优先）：attach 目标的主网格行，无则 -1
  const attachRowOf = (n: FlowData['nodes'][0]): number => {
    const tid = n.attach;
    if (!tid) return -1;
    const t = data.nodes.find((x) => x.id === tid);
    if (!t || !t.cell) return -1;
    for (let ri = 0; ri < rows.length; ri++) {
      const r = rows[ri];
      if (t.cell[r.dict] === r.idx) return ri;
    }
    return -1;
  };

  // 第一遍：显式 cell 的主网格节点归类（ALIGN-2/3：内部节点与 N/DATA 不进主网格）
  const autoSeq: FlowData['nodes'][0][] = [];
  for (const n of data.nodes) {
    if (!isLayoutNode(n)) {
      // N/DATA（annotation/dataObject）：纳入 DOC 虚拟泳道列，行 = 依附主节点的行（对齐优先）
      if (!n.parent && (n.type === 'annotation' || n.type === 'dataObject')) {
        const docCi = cols.findIndex((c) => c.dict === 'DOC');
        const attachRi = attachRowOf(n);
        const ri = attachRi >= 0 ? attachRi : 0;
        const ci = docCi >= 0 ? docCi : cols.length - 1;
        const gk = `${ri}_${ci}`;
        if (!group.has(gk)) group.set(gk, []);
        group.get(gk)!.push(n);
        usedCell.add(gk);
      }
      continue;
    }
    if (!n.cell) { autoSeq.push(n); continue; } // 缺省坐标：第二遍自动落格
    const ck = cellKeyOf(n.cell);
    if (isHSingle) {
      const v = Object.values(n.cell)[0] ?? 0;
      const dict = Object.keys(n.cell)[0] ?? 'D';
      const ri = lanePosOf(dict, v);
      if (ri < 0) { autoSeq.push(n); continue; }
      const seq = laneSeq.get(ri) ?? 0;
      laneSeq.set(ri, seq + 1);
      const gk = `${ri}_${seq}`;
      if (!group.has(gk)) group.set(gk, []);
      group.get(gk)!.push(n);
      usedCell.add(gk);
    } else if (isVSingle) {
      const v = Object.values(n.cell)[0] ?? 0;
      const dict = Object.keys(n.cell)[0] ?? 'P';
      const ci = lanePosOf(dict, v);
      if (ci < 0) { autoSeq.push(n); continue; }
      const seq = laneSeq.get(ci) ?? 0;
      laneSeq.set(ci, seq + 1);
      const gk = `${seq}_${ci}`;
      if (!group.has(gk)) group.set(gk, []);
      group.get(gk)!.push(n);
      usedCell.add(gk);
    } else {
      // 二维网格：直接 idx 匹配（rows/cols 中 dict+idx 唯一）
      const rc = ck ? cellNodeId.get(ck) : undefined;
      if (!rc) { autoSeq.push(n); continue; } // 越界/未知坐标 → 自动落格兜底
      const gk = `${rc.ri}_${rc.ci}`;
      if (!group.has(gk)) group.set(gk, []);
      group.get(gk)!.push(n);
      usedCell.add(gk);
    }
  }

  // 第二遍：缺省/未知坐标节点，按声明序填入第一个未占用交叉格
  for (const n of autoSeq) {
    if (isHSingle) {
      // 无泳道归属 → 放入第一条泳道(位置0)的下一个空位
      const ri = 0;
      let ci = laneSeq.get(ri) ?? 0;
      while (usedCell.has(`${ri}_${ci}`)) ci++;
      laneSeq.set(ri, ci + 1);
      const gk = `${ri}_${ci}`;
      if (!group.has(gk)) group.set(gk, []);
      group.get(gk)!.push(n);
      usedCell.add(gk);
    } else if (isVSingle) {
      const ci = 0;
      let ri = laneSeq.get(ci) ?? 0;
      while (usedCell.has(`${ri}_${ci}`)) ri++;
      laneSeq.set(ci, ri + 1);
      const gk = `${ri}_${ci}`;
      if (!group.has(gk)) group.set(gk, []);
      group.get(gk)!.push(n);
      usedCell.add(gk);
    } else {
      // 二维：行优先扫描第一个空位（保持整齐的读取顺序）
      let placed = false;
      for (let ri = 0; ri < nR && !placed; ri++) {
        for (let ci = 0; ci < nC && !placed; ci++) {
          const gk = `${ri}_${ci}`;
          if (usedCell.has(gk)) continue;
          if (!group.has(gk)) group.set(gk, []);
          group.get(gk)!.push(n);
          usedCell.add(gk);
          placed = true;
        }
      }
      if (!placed) { // 网格已满，溢出到 (0,0)
        if (!group.has('0_0')) group.set('0_0', []);
        group.get('0_0')!.push(n);
      }
    }
  }
  // ALIGN-1：单维虚拟轴长度 = 各泳道已占用最大序号 + 1（不再用全图节点数）
  if (isHSingle || isVSingle) {
    let maxRi = 0, maxCi = 0;
    for (const gk of group.keys()) {
      const [ri, ci] = gk.split('_').map(Number);
      if (Number.isFinite(ri)) maxRi = Math.max(maxRi, ri);
      if (Number.isFinite(ci)) maxCi = Math.max(maxCi, ci);
    }
    if (isHSingle) {
      nC = Math.max(1, maxCi + 1);
      cols = Array.from({ length: nC }, (_, i) => ({ dict: 'ROOT', idx: i }));
    } else {
      nR = Math.max(1, maxRi + 1);
      rows = Array.from({ length: nR }, (_, i) => ({ dict: 'ROOT', idx: i }));
    }
    rebuildCellIndex();
  }
  for (const [gk, nodes] of group) {
    let nx = 1, ny = 1, gx = 0, gy = 0;
    const items: { n: FlowData['nodes'][0]; gridX: number; gridY: number; m: NodeMetrics }[] = [];
    // b 阶段：交叉格内先按格内拓扑序重排（computeCellOrder），使流向相邻在格内也相邻；
    // 节点显式 vh 保持，缺省 vh 由种子/上游方位推导。返回 PlacedNode 已含相对方位(dx,dy)。
    const placed = computeCellOrder(nodes, data.edges);
    placed.forEach(({ n, dx, dy }) => {
      // 子流程 = 标准泳道交叉格整数倍（设计中心思想）：宽=k×subprocess.w，高=mm×subprocess.h
      // k/mm 恰好容纳内部子节点（内部也按同款格子数学排布），从而与相邻泳道/交叉格无缝对齐、不超格。
      let m = nodeMetrics(n, fs);
      if (n.type === 'subprocess') {
        const childCount = data.nodes.filter((x) => x.parent === n.id && x.id !== n.id).length;
        if (childCount > 0) {
          const innerCols = Math.max(1, Math.ceil(Math.sqrt(childCount))); // 内部列数（方阵近似）
          const rows = Math.ceil(childCount / innerCols);
          // 整除到标准节基准的整数倍
          const k = Math.max(1, Math.ceil(innerCols / 1));
          const mm = Math.max(1, rows);
          m = {
            halfW: Math.max(m.halfW, (k * NODE_BASE.subprocess.w) / 2),
            halfH: Math.max(m.halfH, (mm * NODE_BASE.subprocess.h) / 2),
            shapeType: m.shapeType,
          };
        }
      }
      // 首节点（placed[0].dx===dy===0）锚定原点；后续按 computeCellOrder 给的相对方位累加槽位
      gx += dx;
      gy += dy;
      items.push({ n, gridX: gx, gridY: gy, m });
      nx = Math.max(nx, gx + 1);
      ny = Math.max(ny, gy + 1);
    });
    cellXY.set(gk, { nx, ny, items });
  }

  // ===== 统一二维全向扩展格代数视线避让与流形松弛引擎 (Unified 2D Ray Clearance & Manifold Relaxation) =====
  // 核心代数全序公理：
  // 0 弯直线 (Cost=0) + 扩展格单次位移 (Cost=150) = 150 << 2/3/4 弯多重避障折线 (Cost=250~1000)
  
  // 1. 水平射线视线松弛 (Horizontal Ray Clearance via Y-Displacement)
  // 包含：资料依附虚线、同行跨列长跨度主干流
  for (const n of data.nodes) {
    if (!n.parent && (n.type === 'annotation' || n.type === 'dataObject') && n.attach) {
      const target = data.nodes.find((x) => x.id === n.attach);
      if (!target) continue;
      let targetRi = -1, targetCi = -1, targetGy = 0;
      for (const [gk, cell] of cellXY) {
        const item = cell.items.find((it) => it.n.id === target.id);
        if (item) {
          const [r, c] = gk.split('_').map(Number);
          targetRi = r; targetCi = c; targetGy = item.gridY;
          break;
        }
      }
      if (targetRi < 0) continue;

      let docCi = -1;
      for (const [gk, cell] of cellXY) {
        const item = cell.items.find((it) => it.n.id === n.id);
        if (item) {
          const [, c] = gk.split('_').map(Number);
          docCi = c;
          item.gridY = targetGy;
          break;
        }
      }
      if (docCi < 0 || targetCi === docCi) continue;

      const minC = Math.min(targetCi, docCi), maxC = Math.max(targetCi, docCi);
      for (let c = minC + 1; c < maxC; c++) {
        const midGk = `${targetRi}_${c}`;
        const midCell = cellXY.get(midGk);
        if (!midCell) continue;
        const blocker = midCell.items.find((it) => it.gridY === targetGy);
        if (blocker) {
          for (const it of midCell.items) {
            if (it.gridY >= targetGy) it.gridY += 1;
          }
          midCell.ny = Math.max(...midCell.items.map((it) => it.gridY + 1), 1);
        }
      }
    }
  }

  // 2. 垂直射线视线松弛 (Vertical Ray Clearance via X-Displacement, 双向支持向上与向下)
  // 当主干顺序流或关键边在同列跨行垂直直通 (向下如 w6 -> w7，向上如 w4 -> w5) 时：
  // 精确探测垂直射线上 (同一列 ci，同一槽位 gridX) 的所有障碍节点 (同格下/上方障碍、中间格障碍)。
  // 自动将阻挡节点右移至扩展格 (gridX -> gridX + 1)，彻底扫清垂直直通走廊，消灭多重折线！
  for (const e of data.edges) {
    if (e.parent || e.type !== 'sequence') continue;
    const u = data.nodes.find((x) => x.id === e.from);
    const v = data.nodes.find((x) => x.id === e.to);
    if (!u || !v) continue;

    let uRi = -1, uCi = -1, uGx = 0, uGy = 0;
    let vRi = -1, vCi = -1, vGx = 0, vGy = 0;
    for (const [gk, cell] of cellXY) {
      const itU = cell.items.find((it) => it.n.id === u.id);
      if (itU) {
        const [r, c] = gk.split('_').map(Number);
        uRi = r; uCi = c; uGx = itU.gridX; uGy = itU.gridY;
      }
      const itV = cell.items.find((it) => it.n.id === v.id);
      if (itV) {
        const [r, c] = gk.split('_').map(Number);
        vRi = r; vCi = c; vGx = itV.gridX; vGy = itV.gridY;
      }
    }

    if (uCi >= 0 && uCi === vCi && uRi !== vRi) {
      const isDownward = uRi < vRi;
      const minR = Math.min(uRi, vRi), maxR = Math.max(uRi, vRi);

      // (1) 源单元格内沿射线方向的障碍物
      const uGk = `${uRi}_${uCi}`;
      const uCell = cellXY.get(uGk);
      if (uCell) {
        const uBlocker = uCell.items.find((it) =>
          it.n.id !== u.id && (isDownward ? it.gridY > uGy : it.gridY < uGy) && it.gridX === uGx
        );
        if (uBlocker) {
          uBlocker.gridX = uGx + 1;
          uCell.nx = Math.max(...uCell.items.map((it) => it.gridX + 1), 1);
        }
      }

      // (2) 中间行单元格内的障碍物
      for (let r = minR + 1; r < maxR; r++) {
        const midGk = `${r}_${uCi}`;
        const midCell = cellXY.get(midGk);
        if (!midCell) continue;
        const midBlocker = midCell.items.find((it) => it.gridX === uGx);
        if (midBlocker) {
          midBlocker.gridX = uGx + 1;
          midCell.nx = Math.max(...midCell.items.map((it) => it.gridX + 1), 1);
        }
      }

      // (3) 目标单元格内迎着射线方向的障碍物 (如向上流动时目标单元格内位于 v 下方的节点 q2)
      const vGk = `${vRi}_${vCi}`;
      const vCell = cellXY.get(vGk);
      if (vCell) {
        const vBlocker = vCell.items.find((it) =>
          it.n.id !== v.id && (isDownward ? it.gridY < vGy : it.gridY > vGy) && it.gridX === uGx
        );
        if (vBlocker) {
          vBlocker.gridX = uGx + 1;
          vCell.nx = Math.max(...vCell.items.map((it) => it.gridX + 1), 1);
        }
      }
    }
  }

  // ④ W列最大宽 / H行最大高（由该列/行中心节点最大宽/高确定）
  const cellWself: number[] = new Array(nC).fill(0);
  const cellHself: number[] = new Array(nR).fill(0);
  for (const [gk, cell] of cellXY) {
    const [ri, ci] = gk.split('_').map(Number);
    if (ri < 0 || ri >= nR || ci < 0 || ci >= nC) continue;
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
  const colWPx = colNxMax.map((nx, ci) => Math.max(nx * (cellWself[ci] + 2 * half), 140));
  const rowHPx = rowNyMax.map((ny, ri) => Math.max(ny * (cellHself[ri] + 2 * half + (ny > 1 ? 24 : 0)), 120));

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
    if (ri < 0 || ri >= nR || ci < 0 || ci >= nC) continue;
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

  // ALIGN-3：修饰类不占格，依附声明序前驱，落在其右上走廊
  const artStack = new Map<string, number>();
  for (const art of artifacts) {
    const idx = data.nodes.indexOf(art);
    let predId: string | undefined;
    for (let i = idx - 1; i >= 0; i--) {
      if (isLayoutNode(data.nodes[i]) && nodePos.has(data.nodes[i].id)) {
        predId = data.nodes[i].id;
        break;
      }
    }
    if (!predId) {
      const first = [...nodePos.values()][0];
      predId = first?.n.id;
    }
    if (!predId) continue;
    const pp = nodePos.get(predId);
    if (!pp) continue;
    const m = nodeMetrics(art, fs);
    const stack = artStack.get(predId) ?? 0;
    artStack.set(predId, stack + 1);
    const cx = pp.x + pp.W / 2 + m.halfW + 8;
    const cy = pp.y - pp.H / 2 - 6 - stack * (m.halfH * 2 + 6);
    nodePos.set(art.id, { x: cx, y: cy, ri: pp.ri, ci: pp.ci, W: m.halfW * 2, H: m.halfH * 2, n: art });
  }

  const gridRight = colX[nC - 1] + colWPx[nC - 1];
  const gridBottom = bandTop(nR - 1) + rowHPx[nR - 1];
  // 网格边界保持泳道对齐；画布可因走廊上的修饰类略微外扩
  let width = gridRight + 5;
  let height = gridBottom + 5;
  for (const p of nodePos.values()) {
    width = Math.max(width, p.x + p.W / 2 + 8);
    height = Math.max(height, p.y + p.H / 2 + 16);
  }
  return {
    rows, cols, nodePos, colX, rowY: [], colWpx: colWPx, rowHpx: rowHPx,
    width, height, half, bandLeft, bandTop, gridRight, gridBottom, titleBandW,
  };
}

// ===== 六属性图例（AttrPanel）高度计算（P0-1 修复：getSvgSize 与 flowToSVG 共用同一套尺寸）=====
function attrPanelHeight(data: FlowData): number {
  const activeAttrs = data.attrPanel?.active || [];
  if (!activeAttrs.length) return 0;
  const agg = new Map<string, string[]>();
  for (const key of activeAttrs) agg.set(key, []);
  for (const n of data.nodes) {
    for (const [k, v] of Object.entries(n.attrs || {})) {
      const key = k.toLowerCase();
      if (agg.has(key) && v && !agg.get(key)!.includes(v)) agg.get(key)!.push(v);
    }
  }
  const entries = activeAttrs.filter((k) => agg.get(k) && agg.get(k)!.length > 0);
  if (!entries.length) return 0;
  const pad = 10, rowH = 20, titleH = 18;
  return titleH + entries.length * rowH + pad * 2 + 12;
}

export function getSvgSize(data: FlowData, st?: FlowChartStyles): FlowSvgDims {
  const L = computeExcelLayout(data, st ?? ({ nodeFontSize: 13 } as FlowChartStyles));
  return { width: L.width, height: L.height + attrPanelHeight(data) };
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
  parts.push(`<rect x="${x0}" y="${y0}" width="${L.gridRight - x0}" height="${L.gridBottom - y0}" fill="${st.panelColor || '#f8fafc'}"/>`);
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
  // Align L/R/C：整图标题按 axis.page.align 对齐（默认居中 C）
  const pageAlign = data.axes?.page?.align || 'C';
  const titleAnchor = pageAlign === 'L' ? 'start' : pageAlign === 'R' ? 'end' : 'middle';
  if (placeY) {
    // AxisY：左侧竖向标题带，宽度 titleBandW，旋转 -90°（文字竖向，宽度合理不横排）
    // 高度：从 colLabelH 顶部（titleH）到 gridBottom，与 X 轴泳道区（列头+网格）齐平；
    //   顶部 titleH 区域在 AxisY 模式下不再占位，故不包含，避免"超出一个单位"。
    const tbw = L.titleBandW || (st.titleFontSize + 32);
    const bandTopY = FLOW_SVG.titleH;
    const bandH = L.gridBottom - bandTopY;
    const bandMidY = bandTopY + bandH / 2;
    parts.push(`<rect x="0" y="${bandTopY}" width="${tbw}" height="${bandH}" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>`);
    // 竖向带内 Align（旋转文字：L/R 沿带内 x 略偏，保持旋转居中不受水平错位影响）
    const tiltX = pageAlign === 'L' ? 10 : pageAlign === 'R' ? tbw - 10 : tbw / 2;
    parts.push(`<text x="${tiltX}" y="${bandMidY}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${tiltX} ${bandMidY})" fill="${st.textColor}" font-size="${st.titleFontSize}" font-weight="bold">${esc(titleText)}</text>`);
  } else {
    parts.push(`<rect x="0" y="0" width="${L.gridRight}" height="${FLOW_SVG.titleH}" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>`);
    const titleX = pageAlign === 'L' ? 12 : pageAlign === 'R' ? L.gridRight - 12 : L.gridRight / 2;
    parts.push(`<text x="${titleX}" y="${FLOW_SVG.titleH / 2}" text-anchor="${titleAnchor}" dominant-baseline="middle" fill="${st.textColor}" font-size="${st.titleFontSize}" font-weight="bold">${esc(titleText)}</text>`);
  }

  // ===== 轴坐标标题 + 泳道标签：左/上表头，格子化，默认居中 =====
  const axisXT = data.axes?.x?.title || '';
  const axisYT = data.axes?.y?.title || '';
  const cornerW = L.bandLeft, cornerH = FLOW_SVG.colLabelH;
  // 左上角格：axis-x（顶部表头，按 axes.x.align 对齐）+ axis-y（左上角格水平，按 axes.y.align）
  // 左表头整体向右偏移 titleBandW（AxisY 标题带在最左）
  const hx = L.titleBandW;
  if (axisXT || axisYT) {
    parts.push(`<rect x="${hx}" y="${FLOW_SVG.titleH}" width="${cornerW}" height="${cornerH}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>`);
    // Align：坐标轴标题沿角落格 x 轴对齐（L=start 靠左, R=end 靠右, C=中间）
    const padX = 6;
    const anchorFor = (al: string | undefined) => al === 'L' ? 'start' : al === 'R' ? 'end' : 'middle';
    const xFor = (al: string | undefined) => al === 'L' ? hx + padX : al === 'R' ? hx + cornerW - padX : hx + cornerW / 2;
    if (axisXT && axisYT) {
      parts.push(`<text x="${xFor(data.axes?.x?.align)}" y="${FLOW_SVG.titleH + 11}" text-anchor="${anchorFor(data.axes?.x?.align)}" dominant-baseline="middle" fill="${st.axisColor}" font-size="11" font-weight="bold">${esc(axisXT)}</text>`);
      parts.push(`<text x="${xFor(data.axes?.y?.align)}" y="${FLOW_SVG.titleH + 24}" text-anchor="${anchorFor(data.axes?.y?.align)}" dominant-baseline="middle" fill="${st.axisColor}" font-size="10">${esc(axisYT)}</text>`);
    } else {
      const axisLabel = axisXT || axisYT;
      const al = axisXT ? data.axes?.x?.align : data.axes?.y?.align;
      parts.push(`<text x="${xFor(al)}" y="${FLOW_SVG.titleH + cornerH / 2}" text-anchor="${anchorFor(al)}" dominant-baseline="middle" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(axisLabel)}</text>`);
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

  // ===== 连线与端口引擎：全局协同 WSAD 硬性互斥 + 几何中点对齐原则 =====
  // [2026-09 清理] 旧引擎死代码已移除：nodeBoxes/getMidpointPort/getCorridorPort/
  // segIntersectsBox/routeHits/isPortBlocked 主路径已由 AlgebraicFlowRouter 承接，
  // 详见 docs/FLOW_OPTIMALITY_EXECUTION_NOTES.md。type Port/Box 仍供 allBoxes 等使用。
  type Port = 'R' | 'L' | 'T' | 'B';
  type Box = { x0: number; y0: number; x1: number; y1: number };

  // 提取顶层边列表（含 N/DATA 虚边）
  const edgeList = data.edges.filter((x) => !x.parent);
  const arrowParts: string[] = [];
  for (const n of data.nodes) {
    if (!n.parent && (n.type === 'annotation' || n.type === 'dataObject') && n.attach) {
      edgeList.push({ id: `doc_${n.id}`, from: n.id, to: n.attach, type: 'sequence', label: null, condition: '__doc__', default: false });
    }
  }

  // ===== 纯代数流形势能极小化连线与避障系统 (Algebraic Flow Routing System) =====
  const nodesGeo: NodeGeometry[] = [];
  for (const [id, p] of L.nodePos) {
    nodesGeo.push({ id, ri: p.ri, ci: p.ci, x: p.x, y: p.y, W: p.W, H: p.H });
  }

  const edgeSpecs: EdgeSpec[] = edgeList.map((e) => ({
    id: e.id,
    from: e.from,
    to: e.to,
    label: e.label,
    condition: e.condition,
    isDoc: e.condition === '__doc__',
  }));

  const { sourcePorts: sourcePortOf, targetPorts: targetPortOf } = solveAlgebraicPorts(nodesGeo, edgeSpecs);

  const { xChannels, yChannels } = computeGridChannels({
    colX: L.colX,
    colWpx: L.colWpx,
    bandTop: (ri) => L.bandTop(ri),
    rowHpx: L.rowHpx,
    nC,
    nR,
    gridLeft: L.bandLeft,
    gridRight: L.gridRight,
    gridTop: FLOW_SVG.titleH,
    gridBottom: L.gridBottom,
    half: L.half,
  }, nodesGeo);

  const allBoxes: Record<string, Box> = {};
  for (const n of nodesGeo) {
    allBoxes[n.id] = { x0: n.x - n.W / 2, y0: n.y - n.H / 2, x1: n.x + n.W / 2, y1: n.y + n.H / 2 };
  }

  const nodeGeoMap = new Map(nodesGeo.map((n) => [n.id, n]));

  // 计算每条边的代数无碰撞正交路径
  const edgeRoutes = new Map<string, Point[]>();
  for (const e of edgeList) {
    const u = nodeGeoMap.get(e.from), v = nodeGeoMap.get(e.to);
    if (!u || !v) continue;
    const sp = sourcePortOf.get(e.id) ?? 'R', tp = targetPortOf.get(e.id) ?? 'T';
    const path = solveAlgebraicRoute(u, v, sp, tp, xChannels, yChannels, allBoxes, L.half);
    edgeRoutes.set(e.id, path);
  }

  // 阶段 2：独立单箭头层与路径渲染
  const drawnInArrows = new Set<string>(); // 避免同一 IN 端口重复绘制箭头

  for (const e of edgeList) {
    const a = L.nodePos.get(e.from), b = L.nodePos.get(e.to);
    if (!a || !b) continue;
    const tp = targetPortOf.get(e.id) ?? 'T';
    const pts = edgeRoutes.get(e.id) ?? [];
    if (pts.length < 2) continue;

    // ===== 标签：放在折线最长线段的中点 =====
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
      const dx = horizontal ? 0 : 10;
      const dy = horizontal ? -10 : 0;
      label = `<text x="${lx + dx}" y="${ly + dy}" text-anchor="middle" fill="${st.textColor}" font-size="11" paint-order="stroke" stroke="#fff" stroke-width="4">${esc(e.label)}</text>`;
    }

    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    let slash = '';
    if (e.default && pts.length >= 2) {
      const p0 = pts[0], p1 = pts[1];
      const vx = p1.x - p0.x, vy = p1.y - p0.y;
      const len = Math.hypot(vx, vy) || 1;
      const ux = vx / len, uy = vy / len;
      const mx = p0.x + ux * 10, my = p0.y + uy * 10;
      slash = `<line data-flow="default-slash" x1="${mx - uy * 6}" y1="${my + ux * 6}" x2="${mx + uy * 6}" y2="${my - ux * 6}" stroke="${st.lineColor}" stroke-width="${st.lineWidth}"/>`;
    }
    const dash = e.condition === '__doc__' ? ' stroke-dasharray="6 4"' : '';
    parts.push(`<path d="${d}" fill="none" stroke="${st.lineColor}" stroke-width="${st.lineWidth}"${dash}/>${slash}${label}`);

    // IN 端口独立单箭头层（城门口接待员，单点唯一定位，尖端 0.00px 贴合目标边中点）
    const arrowKey = `${e.to}_${tp}`;
    if (!drawnInArrows.has(arrowKey)) {
      drawnInArrows.add(arrowKey);
      const al = 11, aw = 5;
      let tri = '';
      if (tp === 'T') tri = `${b.x},${b.y - b.H / 2} ${b.x - aw},${b.y - b.H / 2 - al} ${b.x + aw},${b.y - b.H / 2 - al}`;
      else if (tp === 'B') tri = `${b.x},${b.y + b.H / 2} ${b.x - aw},${b.y + b.H / 2 + al} ${b.x + aw},${b.y + b.H / 2 + al}`;
      else if (tp === 'L') tri = `${b.x - b.W / 2},${b.y} ${b.x - b.W / 2 - al},${b.y - aw} ${b.x - b.W / 2 - al},${b.y + aw}`;
      else tri = `${b.x + b.W / 2},${b.y} ${b.x + b.W / 2 + al},${b.y - aw} ${b.x + b.W / 2 + al},${b.y + aw}`;
      arrowParts.push(`<polygon points="${tri}" fill="${st.lineColor}" stroke="${st.lineColor}" stroke-width="1"/>`);
    }
  }

  // 节点
  for (const [, p] of L.nodePos) {
    const roleRaw = p.n.attrs?.role;
    const roleText = roleRaw ? expandRef(data, roleRaw) : undefined;
    parts.push(nodeShape(p.n, st, p.x, p.y, p.W, p.H, roleText));
    // 子流程：框内嵌套内部小图（缩略节点按声明序横排，迷你连线）
    if (p.n.type === 'subprocess') {
      const inner = data.nodes.filter((n) => n.parent === p.n.id && n.id !== p.n.id);
      if (inner.length) {
        const innerIds = new Set(inner.map((n) => n.id));
        const innerEdges = data.edges.filter((e) => innerIds.has(e.from) && innerIds.has(e.to));
        parts.push(renderSubprocessInner(data, inner, innerEdges, st, p));
      }
    }
  }

  // ===== FEAT-01：六属性图例边栏（AttrPanel） =====
  // 依据 data.attrPanel.active 聚合各节点的 attrs（role/sop/lv/time/kpi/m），
  // 在网格下方绘制属性图例卡片。属性值去重、按首次出现顺序排列。
  let panelH = attrPanelHeight(data);
  const panelParts: string[] = [];
  const activeAttrs = data.attrPanel?.active || [];
  if (activeAttrs.length && panelH > 0) {
    const ATTR_LABEL: Record<string, string> = { role: '岗位', sop: '依据/SOP', lv: '风险度', time: '时效(SLA)', kpi: 'KPI 指标', m: '标记' };
    const agg = new Map<string, string[]>(); // key -> 按首次出现顺序去重后的值
    for (const key of activeAttrs) agg.set(key, []);
    for (const n of data.nodes) {
      for (const [k, v] of Object.entries(n.attrs || {})) {
        const key = k.toLowerCase();
        const shown = expandRef(data, v);
        if (agg.has(key) && shown && !agg.get(key)!.includes(shown)) agg.get(key)!.push(shown);
      }
    }
    const entries = activeAttrs.filter((k) => agg.get(k) && agg.get(k)!.length > 0);
    if (entries.length) {
      const pad = 10, rowH = 20, titleH = 18;
      const panelW = Math.max(200, L.gridRight - 0);
      // 每条属性一行：标签 + 去重值（逗号连接）
      let y = L.gridBottom + 12;
      panelParts.push(`<rect x="0" y="${y}" width="${panelW}" height="${titleH + entries.length * rowH + pad * 2}" fill="${st.panelColor || '#f8fafc'}" stroke="#94a3b8" stroke-width="1"/>`);
      panelParts.push(`<text x="${pad}" y="${y + 14}" font-size="11" font-weight="bold" fill="${st.axisColor}">属性图例</text>`);
      y += titleH + 4;
      for (const key of entries) {
        const vals = agg.get(key)!;
        panelParts.push(`<text x="${pad}" y="${y + rowH - 6}" font-size="11" fill="${st.axisColor}">${esc(ATTR_LABEL[key] || key)}</text>`);
        panelParts.push(`<text x="${pad + 90}" y="${y + rowH - 6}" font-size="11" fill="${st.textColor}">${esc(vals.join('、'))}</text>`);
        y += rowH;
      }
    }
  }

  const outHeight = height + panelH;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${outHeight}" viewBox="0 0 ${width} ${outHeight}">${parts.join('')}${arrowParts.join('')}${panelParts.join('')}</svg>`;
}
