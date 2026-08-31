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
      return { halfW: r, halfH: r, shapeType: 'circle' };
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
  let out = shape + plate + multilineText(cx, textCy, lines, fs, overflow ? '#f8fafc' : '#fff');
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
  const iw = Math.min(72, Math.max(40, Math.floor((availW - (n - 1) * gap) / n)));
  const colMax = Math.max(1, Math.floor((availW + gap) / (iw + gap)));
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
  // 单维泳道：先按真实泳道占位，分类后再按「各泳道最大节点数」扩虚拟轴（ALIGN-1）
  const realRows = rowsOf(data), realCols = colsOf(data);
  const isHSingle = realRows.length > 0 && realCols.length === 0;
  const isVSingle = realCols.length > 0 && realRows.length === 0;
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

  // 第一遍：显式 cell 的主网格节点归类（ALIGN-2/3：内部节点与 N/DATA 不进主网格）
  const autoSeq: FlowData['nodes'][0][] = [];
  for (const n of data.nodes) {
    if (!isLayoutNode(n)) {
      if (!n.parent && (n.type === 'annotation' || n.type === 'dataObject')) artifacts.push(n);
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
    nodes.forEach((n, i) => {
      // 前提2：子流程作为"等比例缩放的流程节点"，其尺寸由内部节点数/排布决定，
      // 进而推动所在泳道/交叉格高宽（而非固定 BASE 尺寸）。
      let m = nodeMetrics(n, fs);
      if (n.type === 'subprocess') {
        const childCount = data.nodes.filter((x) => x.parent === n.id && x.id !== n.id).length;
        if (childCount > 0) {
          const miniW = 72, miniH = 20, gap = 8, padX = 12, padY = 12, plusH = 18;
          // 内部节点近似单行排布时所需宽，多行时所需高
          const perRow = Math.max(1, Math.ceil(childCount / 2)); // 至多 2 行（等比例换行）
          const needW = padX * 2 + perRow * miniW + (perRow - 1) * gap;
          const rows = Math.ceil(childCount / 2);
          const needH = padY * 2 + rows * miniH + (rows - 1) * gap + plusH;
          m = { halfW: Math.max(m.halfW, needW / 2), halfH: Math.max(m.halfH, needH / 2), shapeType: m.shapeType };
        }
      }
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

  // 连线：最小最短原则 + 进出口端口不重复（最短距离优先）
  type XYN = { x: number; y: number; W: number; H: number; ri: number; ci: number; usedIn: Set<string>; usedOut: Set<string> };
  const nodeXY: Record<string, XYN> = {};
  for (const [id, p] of L.nodePos) nodeXY[id] = { x: p.x, y: p.y, W: p.W, H: p.H, ri: p.ri, ci: p.ci, usedIn: new Set(), usedOut: new Set() };

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
  function snapTo(v: number, marks: number[]): number {
    if (!marks.length) return v;
    let best = marks[0], bd = Math.abs(v - marks[0]);
    for (const m of marks) {
      const d = Math.abs(v - m);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
  const xMarks: number[] = [];
  for (let ci = 0; ci < nC; ci++) { xMarks.push(L.colX[ci], L.colX[ci] + L.colWpx[ci]); }
  const yMarks: number[] = [];
  for (let ri = 0; ri < nR; ri++) { yMarks.push(L.bandTop(ri), L.bandTop(ri) + L.rowHpx[ri]); }

  // 源端口候选：同行强制左右、同列强制上下（ALIGN-5 格子通道）
  function sourceCandidates(a: XYN, b: XYN): Port[] {
    if (a.ri === b.ri && a.ci !== b.ci) {
      return b.x >= a.x ? ['R', 'L', 'B', 'T'] : ['L', 'R', 'B', 'T'];
    }
    if (a.ci === b.ci && a.ri !== b.ri) {
      return b.y >= a.y ? ['B', 'T', 'R', 'L'] : ['T', 'B', 'R', 'L'];
    }
    const dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? ['R', 'B', 'T', 'L'] : ['L', 'B', 'T', 'R'];
    }
    return dy >= 0 ? ['B', 'R', 'L', 'T'] : ['T', 'R', 'L', 'B'];
  }
  // 目标端口候选：target(b) 应"面向源(a)"的一侧（同行：b 朝 a 走 L/R；同列：b 朝 a 走 T/B）
  function targetCandidates(b: XYN, a: XYN): Port[] {
    if (b.ri === a.ri && b.ci !== a.ci) {
      return a.x <= b.x ? ['L', 'R', 'T', 'B'] : ['R', 'L', 'T', 'B']; // b 在 a 右 → 面左进
    }
    if (b.ci === a.ci && b.ri !== a.ri) {
      return a.y <= b.y ? ['T', 'B', 'L', 'R'] : ['B', 'T', 'L', 'R']; // b 在 a 下 → 面上进
    }
    const dx = a.x - b.x, dy = a.y - b.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? ['R', 'T', 'B', 'L'] : ['L', 'T', 'B', 'R']; // a 在 b 右 → b 面右(R)
    return dy > 0 ? ['B', 'L', 'R', 'T'] : ['T', 'L', 'R', 'B']; // a 在 b 下 → b 面下(B)
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
  // R1 走线精细：跨边共享"已用走廊"（横段用 y、竖段用 x，四舍五入到像素避免浮点重复），
  // 使同走廊多条边错开不同的分数通道位置而非全部叠回同一中线。
  const usedCorrX = new Set<number>();
  const usedCorrY = new Set<number>();
  const round2 = (v: number) => Math.round(v * 10) / 10;
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
    // 出口端口：按朝向排序优先选"未用作出口"的端口（不因入侧占用而背向）；
    // 若朝向端口全被占用，才回退到其余端口。
    let sp = cands[0];
    for (const c of cands) { if (!a.usedOut.has(c)) { sp = c; break; } }
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
      } else if (Math.abs(s.x - t.x) < 1) {
        // 【修复】同竖直轴：源 B 与目标 T 同列相邻，直接竖直连接。
        // 若走 "竖-横-竖" 分支，snapTo 会把横段吸附到错误的行网格线（如上一行边界），
        // 形成"上折 → 回穿源节点"的绕路（正是"提交采购申请""部门经理审批"被贯穿的根因）。
        pts = [{ x: s.x, y: s.y }, { x: t.x, y: t.y }];
      } else if (Math.abs(s.y - t.y) < 1) {
        // 【修复】同水平轴：源 R 与目标 L 同行相邻，直接水平连接（避免 snap 到错误列边界绕路）。
        pts = [{ x: s.x, y: s.y }, { x: t.x, y: t.y }];
      } else if (horiz1 && horiz2) {
        // 源水平出 + 目标水平入：横-竖-横（竖段吸到列边界）
        const mx = snapTo(midX ?? (s.x + t.x) / 2, xMarks);
        pts = [{ x: s.x, y: s.y }, { x: mx, y: s.y }, { x: mx, y: t.y }, { x: t.x, y: t.y }];
      } else if (!horiz1 && !horiz2) {
        // 源竖直出 + 目标竖直入：竖-横-竖（横段吸到行边界）
        const my = snapTo(midY ?? (s.y + t.y) / 2, yMarks);
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
    if (routeHits(pts, e.from, e.to)) {
      // L 型穿过节点时改走格子边界 Z 通道（ALIGN-5）
      const gutter = horiz1
        ? buildRoute(snapTo((s.x + t.x) / 2, xMarks), null)
        : buildRoute(null, snapTo((s.y + t.y) / 2, yMarks));
      if (!routeHits(gutter, e.from, e.to)) pts = gutter;
    }
    let round = 0;
    const MAX_ROUND = 3;
    const dw = L.half; // 走廊步长 = 0.5 连线区宽
    while (routeHits(pts, e.from, e.to) && round < MAX_ROUND) {
      round++;
      // R1 确定性避障 + 走廊分数错位：横/竖段按螺旋分数偏移（0.5/1.5/-0.5...），
      // 避开已占走廊（usedCorrX/Y），使同走廊多条边不叠回同一中线
      const FRACS = [0.5, 1.5, -0.5, -1.5, 1, -1, 0.25, -0.25, 0.75, 2, -2, 3];
      const tryOrder: { mX: number | null; mY: number | null }[] = [];
      if (horiz1 && horiz2) {
        const baseX = (s.x + t.x) / 2;
        for (const f of FRACS) tryOrder.push({ mX: baseX + dw * f, mY: null });
      } else if (!horiz1 && !horiz2) {
        const baseY = (s.y + t.y) / 2;
        for (const f of FRACS) tryOrder.push({ mX: null, mY: baseY + dw * f });
      } else {
        // L 型：拐点固定（无中间走廊可移），尝试整体下移/右移（扩格模拟）
        const my = horiz1 ? s.y : t.y;
        const mx = horiz1 ? t.x : s.x;
        for (const f of FRACS) {
          tryOrder.push(
            { mX: mx + dw * f, mY: horiz1 ? my + dw * f : my },
            { mX: horiz1 ? mx : mx + dw * f, mY: my + dw * f },
          );
        }
      }
      let found = false;
      for (const c of tryOrder) {
        // 走廊过滤：避开已占走廊坐标（竖段 x / 横段 y），使同走廊多条边错开不同通道
        if ((c.mX !== null && usedCorrX.has(round2(c.mX))) || (c.mY !== null && usedCorrY.has(round2(c.mY)))) continue;
        const candidate = buildRoute(c.mX, c.mY);
        if (!routeHits(candidate, e.from, e.to)) { pts = candidate; found = true; break; }
      }
      if (!found) break;
    }
    // 登记本边最终所用走廊（便于后续边错位）
    for (let k = 1; k < pts.length - 1; k++) {
      const a = pts[k - 1], b = pts[k], cc = pts[k + 1];
      // 中间转折点所在走廊：竖段记录 x，横段记录 y
      if (Math.abs(a.x - b.x) < 0.5 && Math.abs(cc.x - b.x) < 0.5) usedCorrX.add(round2(b.x));
      if (Math.abs(a.y - b.y) < 0.5 && Math.abs(cc.y - b.y) < 0.5) usedCorrY.add(round2(b.y));
    }
    // ===== P3 外侧走廊回退：MAX_ROUND 内仍穿节点时，绕画布外侧走廊走（跨多格长回边） =====
    if (routeHits(pts, e.from, e.to)) {
      const corridorX = x0 - L.half;           // 左走廊（左表头右边缘留 0.5 走廊）
      const corridorXr = L.gridRight + L.half; // 右走廊（网格右缘留 0.5 走廊）
      const corridorY = FLOW_SVG.titleH;       // 顶走廊（标题带下沿，已避开格子）
      const corridorYb = L.gridBottom + L.half;// 底走廊
      // 多种外绕候选：顶部、底部、左侧、右侧，取第一个不穿节点的
      const ops: { x: number; y: number }[] = [
        { x: s.x, y: corridorY }, { x: t.x, y: corridorY },      // 顶部走廊（竖向进/出）
        { x: s.x, y: corridorYb }, { x: t.x, y: corridorYb },    // 底部走廊
      ];
      if (x0 - L.half >= 0) ops.unshift({ x: corridorX, y: s.y }, { x: corridorX, y: t.y }); // 左走廊
      ops.push({ x: corridorXr, y: s.y }, { x: corridorXr, y: t.y }); // 右走廊
      // 逐候选：h-x-x-h
      for (let i = 0; i < ops.length; i += 2) {
        const p1 = ops[i], p2 = ops[i + 1];
        const cand = [{ x: s.x, y: s.y }, p1, p2, { x: t.x, y: t.y }];
        const cleanC = [cand[0]];
        for (let k = 1; k < cand.length; k++) {
          const a = cleanC[cleanC.length - 1], b = cand[k];
          if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5) continue;
          cleanC.push(b);
        }
        if (!routeHits(cleanC, e.from, e.to) && cleanC.length >= 2) { pts = cleanC; break; }
      }
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
    let slash = '';
    if (e.default && pts.length >= 2) {
      const p0 = pts[0], p1 = pts[1];
      const vx = p1.x - p0.x, vy = p1.y - p0.y;
      const len = Math.hypot(vx, vy) || 1;
      const ux = vx / len, uy = vy / len;
      const mx = p0.x + ux * 10, my = p0.y + uy * 10;
      slash = `<line data-flow="default-slash" x1="${mx - uy * 6}" y1="${my + ux * 6}" x2="${mx + uy * 6}" y2="${my - ux * 6}" stroke="${st.lineColor}" stroke-width="${st.lineWidth}"/>`;
    }
    parts.push(`<path d="${d}" fill="none" stroke="${st.lineColor}" stroke-width="${st.lineWidth}" marker-end="url(#flowArrow)"/>${slash}${label}`);
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${outHeight}" viewBox="0 0 ${width} ${outHeight}">${parts.join('')}${panelParts.join('')}</svg>`;
}
