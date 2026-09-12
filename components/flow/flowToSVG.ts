/**
 * IQS-Flow 自研 SVG 渲染器（布局见 ExcelLayout.ts + 代数路由）
 * 着色 / 节点形状 / 连线绘制 / 图例。布局由 computeExcelLayout 提供。
 */
import type { FlowData, FlowChartStyles, FlowEdge } from '../../types';
import {
  solveAlgebraicPorts,
  solveAlgebraicRoute,
  computeGridChannels,
  type NodeGeometry,
  type EdgeSpec,
  type Box,
  type Point,
} from './AlgebraicFlowRouter.ts';
import { solveVisibleGraphRoute, pickShorter } from './VisibleGraphRouter.ts';
import { optimizePorts } from './PortOptimizer.ts';
import {
  FLOW_SVG,
  NODE_BASE,
  nodeMetrics,
  computeExcelLayout,
  getSvgSize,
  wrapLabel,
  wrapInnerWidth,
  textW,
  esc,
  dictValue,
  expandRef,
  attrPanelHeight,
} from './ExcelLayout.ts';
import { contrastStroke } from './FlowThemes.ts';

export { FLOW_SVG, NODE_BASE, nodeMetrics, computeExcelLayout, getSvgSize };
export type { FlowSvgDims, NodeMetrics } from './ExcelLayout.ts';

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

const ATTR_CORNER_PREFIX: Record<string, string> = {
  role: '', sop: 'SOP ', lv: 'Lv ', time: '', kpi: 'KPI ', m: 'M ',
};

/** Attr active 顺序下，本节点有值的项（展开字典引用）；无 active 时回退只标 Role。 */
export function nodeCornerLines(n: FlowData['nodes'][0], data: FlowData): string[] {
  const active = data.attrPanel?.active?.length ? data.attrPanel.active : ['role'];
  const lines: string[] = [];
  for (const key of active) {
    const raw = n.attrs?.[key];
    if (raw == null || !String(raw).trim()) continue;
    const shown = expandRef(data, raw);
    if (!shown) continue;
    lines.push(`${ATTR_CORNER_PREFIX[key] || ''}${shown}`);
    if (lines.length >= 4) break;
  }
  return lines;
}

function renderCorner(cx: number, cy: number, W: number, H: number, lines: string[]): string {
  if (!lines.length) return '';
  const fs = 9, lh = 10;
  const x = cx + W / 2 - 2;
  const y0 = cy + H / 2 + 11;
  return lines.map((t, i) =>
    `<text data-flow="node-attr" x="${x}" y="${y0 + i * lh}" text-anchor="end" fill="#64748b" font-size="${fs}">${esc(t)}</text>`
  ).join('');
}

/** 节点形状（中心格内，1W×1H） */
function nodeShape(n: FlowData['nodes'][0], st: FlowChartStyles, cx: number, cy: number, W: number, H: number, corner: string[] = []): string {
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
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>${labelPlate}${multilineText(cx, cy, lines, fs, overflow ? '#F5F7FA' : '#fff')}${renderCorner(cx, cy, W, H, corner)}`;
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
    out = shape + plate + `<text x="${cx - W / 2 + 10}" y="${titleY}" text-anchor="start" fill="${overflow ? '#F5F7FA' : '#fff'}" font-size="${fs}" font-weight="600">${esc(lines[0] || '')}</text>`;
  } else {
    out = shape + plate + multilineText(cx, textCy, lines, fs, overflow ? '#F5F7FA' : '#fff');
  }
  return out + renderCorner(cx, cy, W, H, corner);
}

/** 子流程框内内部小图：缩略节点按声明序横排/居中，迷你连线连接相邻内部节点 */
function renderSubprocessInner(
  data: FlowData,
  inner: FlowData['nodes'],
  innerEdges: FlowEdge[],
  st: FlowChartStyles,
  p: { x: number; y: number; W: number; H: number },
): string {
  const pad = 10, miniH = 20, fs = 10;   // 原 8px 低于可读下限，缩略图取 10
  const availW = p.W - pad * 2;
  const availH = p.H - pad * 2 - 6; // 预留底部＋盒位置
  if (availW < 40 || availH < 20 || !inner.length) return '';
  const n = inner.length;
  const gap = 8;
  /**
   * 内部列数由**文档级 `Layout`** 决定（AUD-138）。
   *
   * 原实现固定 `Math.ceil(Math.sqrt(n))` —— 与 `Layout H/V` 无关，
   * 因此 `Layout: H` 的子流程内部也不会横排，使用者感知为「子流程未继承布局」。
   * 现改为：`H` → 尽可能一行；`V` → 一列。并以可用宽度封顶，避免溢出框体。
   */
  const horizontal = data.layout !== 'V';
  const maxCols = Math.max(1, Math.floor((availW + gap) / (40 + gap)));
  const colMax = horizontal ? Math.min(n, maxCols) : 1;
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

export type CrossingHit = { x: number; y: number; a: string; b: string };

/** 正交路径的真交叉（两端点交不算；同边折角不算）。含「一线穿过另一线拐点」。 */
export function findOrthogonalCrossings(
  routes: Map<string, Point[]>,
  boxes: { x0: number; y0: number; x1: number; y1: number }[] = [],
): CrossingHit[] {
  type Seg = { x0: number; y0: number; x1: number; y1: number; id: string; hv: 'H' | 'V' };
  const segs: Seg[] = [];
  for (const [id, pts] of routes) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      if (Math.abs(dy) < 0.5) segs.push({ x0: Math.min(a.x, b.x), y0: a.y, x1: Math.max(a.x, b.x), y1: a.y, id, hv: 'H' });
      else if (Math.abs(dx) < 0.5) segs.push({ x0: a.x, y0: Math.min(a.y, b.y), x1: a.x, y1: Math.max(a.y, b.y), id, hv: 'V' });
    }
  }
  const hits: CrossingHit[] = [];
  const seen = new Set<string>();
  const PAD = 1.5;
  const inBox = (x: number, y: number) => boxes.some((b) => x >= b.x0 - 1 && x <= b.x1 + 1 && y >= b.y0 - 1 && y <= b.y1 + 1);
  const add = (x: number, y: number, ea: string, eb: string) => {
    if (inBox(x, y)) return;
    const key = `${Math.round(x * 2) / 2},${Math.round(y * 2) / 2}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ x, y, a: ea, b: eb });
  };
  const onClosed = (v: number, a: number, b: number) => v >= a - 0.51 && v <= b + 0.51;
  const interior = (v: number, a: number, b: number) => v > a + PAD && v < b - PAD;

  const hs = segs.filter((s) => s.hv === 'H');
  const vs = segs.filter((s) => s.hv === 'V');
  for (const h of hs) {
    for (const v of vs) {
      if (h.id === v.id) continue;
      const x = v.x0, y = h.y0;
      if (!onClosed(x, h.x0, h.x1) || !onClosed(y, v.y0, v.y1)) continue;
      const hIn = interior(x, h.x0, h.x1);
      const vIn = interior(y, v.y0, v.y1);
      if (hIn && vIn) add(x, y, h.id, v.id);
      else if ((hIn && onClosed(y, v.y0, v.y1)) || (vIn && onClosed(x, h.x0, h.x1))) add(x, y, h.id, v.id);
    }
  }
  return hits;
}

/** 交叉对中线序更大（后声明 / 后绘制）的边，整条用连线色×底色的公共差异色。 */
export function crossingOverIds(hits: CrossingHit[], order: Map<string, number>): Set<string> {
  const over = new Set<string>();
  for (const h of hits) {
    const oa = order.get(h.a) ?? -1;
    const ob = order.get(h.b) ?? -1;
    if (oa === ob) continue;
    over.add(oa > ob ? h.a : h.b);
  }
  return over;
}

// ===== 布局计算结果 =====
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
  parts.push(`<rect x="${x0}" y="${y0}" width="${L.gridRight - x0}" height="${L.gridBottom - y0}" fill="${st.panelColor || '#F5F7FA'}"/>`);
  // 绘制格内框 + 行列边界：同一套 Grid dashed|solid（内线条此前写死实线，开关无效）
  const gridDash = st.gridLine === 'solid' ? '' : ' stroke-dasharray="4 4"';
  const gridStroke = `stroke="#94a3b8" stroke-width="0.8"${gridDash}`;
  for (let ri = 0; ri < nR; ri++) {
    for (let ci = 0; ci < nC; ci++) {
      const gx0 = L.colX[ci], gy0 = L.bandTop(ri);
      const gw = L.colWpx[ci], gh = L.rowHpx[ri];
      parts.push(`<rect x="${gx0}" y="${gy0}" width="${gw}" height="${gh}" fill="none" ${gridStroke} data-flow="lane-grid"/>`);
    }
  }
  for (let ci = 0; ci <= nC; ci++) {
    const gx = ci < nC ? L.colX[ci] : L.gridRight;
    parts.push(`<line data-flow="lane-grid" x1="${gx}" y1="${y0}" x2="${gx}" y2="${L.gridBottom}" ${gridStroke}/>`);
  }
  for (let ri = 0; ri <= nR; ri++) {
    const gy = ri < nR ? L.bandTop(ri) : L.gridBottom;
    parts.push(`<line data-flow="lane-grid" x1="${x0}" y1="${gy}" x2="${L.gridRight}" y2="${gy}" ${gridStroke}/>`);
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
    parts.push(`<rect x="0" y="${bandTopY}" width="${tbw}" height="${bandH}" fill="#EEF2F5" stroke="#94a3b8" stroke-width="1"/>`);
    // 竖向带内 Align（旋转文字：L/R 沿带内 x 略偏，保持旋转居中不受水平错位影响）
    const tiltX = pageAlign === 'L' ? 10 : pageAlign === 'R' ? tbw - 10 : tbw / 2;
    parts.push(`<text x="${tiltX}" y="${bandMidY}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${tiltX} ${bandMidY})" fill="${st.textColor}" font-size="${st.titleFontSize}" font-weight="bold">${esc(titleText)}</text>`);
  } else {
    parts.push(`<rect x="0" y="0" width="${L.gridRight}" height="${FLOW_SVG.titleH}" fill="#EEF2F5" stroke="#94a3b8" stroke-width="1"/>`);
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
    parts.push(`<rect x="${hx}" y="${FLOW_SVG.titleH}" width="${cornerW}" height="${cornerH}" fill="rgba(13,94,66,0.10)" stroke="#94a3b8" stroke-width="1"/>`);
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
    parts.push(`<rect x="${L.colX[ci]}" y="${FLOW_SVG.titleH}" width="${L.colWpx[ci]}" height="${cornerH}" fill="${show ? 'rgba(13,94,66,0.10)' : 'none'}" stroke="#94a3b8" stroke-width="1"/>`);
    if (show) parts.push(`<text x="${L.colX[ci] + L.colWpx[ci] / 2}" y="${FLOW_SVG.titleH + cornerH / 2}" text-anchor="middle" dominant-baseline="middle" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(cl)}</text>`);
  }
  // 行标签格（左表头，每行一格）：Y 泳道标题旋转 -90°（竖向排列）
  for (let ri = 0; ri < nR; ri++) {
    const rl = dictValue(data, L.rows[ri].dict, L.rows[ri].idx);
    const show = L.rows[ri].dict !== 'ROOT';
    const rcx = hx + cornerW / 2, rcy = L.bandTop(ri) + L.rowHpx[ri] / 2;
    parts.push(`<rect x="${hx}" y="${L.bandTop(ri)}" width="${cornerW}" height="${L.rowHpx[ri]}" fill="${show ? 'rgba(13,94,66,0.10)' : 'none'}" stroke="#94a3b8" stroke-width="1"/>`);
    if (show) parts.push(`<text x="${rcx}" y="${rcy}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${rcx} ${rcy})" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(rl)}</text>`);
  }

  // ===== 连线与端口引擎：全局协同 WSAD 硬性互斥 + 几何中点对齐原则 =====
  // [2026-09 清理] 旧引擎死代码已移除：nodeBoxes/getMidpointPort/getCorridorPort/
  // segIntersectsBox/routeHits/isPortBlocked 主路径已由 AlgebraicFlowRouter 承接，
  // 详见 docs/flow/notes/FLOW_OPTIMALITY_EXECUTION_NOTES.md。type Port/Box 仍供 allBoxes 等使用。
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
  // 端口分配：坐标下降（审计台账 AUD-104）—— 以真实路径折弯数回馈端口选择，受 A1 互斥约束，
  // 迭代至不动点（引理 §3.3 保证终止）。初值取自 solveAlgebraicPorts，故结果必不劣于原贪心。
  const { sourcePorts: sourcePortOf, targetPorts: targetPortOf } = optimizePorts(
    nodesGeo, edgeSpecs, { xChannels, yChannels }, L.half, { maxIter: 4, dynamicStub: true });

  const allBoxes: Record<string, Box> = {};
  for (const n of nodesGeo) {
    allBoxes[n.id] = { x0: n.x - n.W / 2, y0: n.y - n.H / 2, x1: n.x + n.W / 2, y1: n.y + n.H / 2 };
  }

  const nodeGeoMap = new Map(nodesGeo.map((n) => [n.id, n]));

  // 计算每条边的正交路径 —— 混合内核（审计台账 AUD-109）：
  //   候选 A = 可见图 + 4 方向状态 + 动态 stub（VisibleGraphRouter）
  //   候选 B = 现实现 solveAlgebraicRoute（分级候选枚举）
  //   逐边取折弯更少者 ⇒ 由「并集不劣于任一」引理保证**不劣于**任一单一内核
  const edgeRoutes = new Map<string, Point[]>();
  for (const e of edgeList) {
    const u = nodeGeoMap.get(e.from), v = nodeGeoMap.get(e.to);
    if (!u || !v) continue;
    const sp = sourcePortOf.get(e.id) ?? 'R', tp = targetPortOf.get(e.id) ?? 'T';
    const pathOld = solveAlgebraicRoute(u, v, sp, tp, xChannels, yChannels, allBoxes, L.half);
    const pathVg = solveVisibleGraphRoute(u, v, sp, tp, xChannels, yChannels, allBoxes, L.half, { dynamicStub: true });
    const path = pickShorter(pathOld, pathVg) ?? pathOld;
    edgeRoutes.set(e.id, path);
  }

  // 交叉：线序更大者整条用连线色×底色的公共差异色，后绘压在上面
  const edgeOrder = new Map(edgeList.map((e, i) => [e.id, i]));
  const crossHits = findOrthogonalCrossings(edgeRoutes, Object.values(allBoxes));
  const overIds = crossingOverIds(crossHits, edgeOrder);
  const contrast = contrastStroke(st.lineColor || '#64748b', st.panelColor || '#F5F7FA');
  const drawOrder = [...edgeList].sort((a, b) => {
    const ao = overIds.has(a.id) ? 1 : 0;
    const bo = overIds.has(b.id) ? 1 : 0;
    if (ao !== bo) return ao - bo;
    return (edgeOrder.get(a.id) ?? 0) - (edgeOrder.get(b.id) ?? 0);
  });

  // 阶段 2：独立单箭头层与路径渲染
  const drawnInArrows = new Set<string>(); // 避免同一 IN 端口重复绘制箭头

  for (const e of drawOrder) {
    const a = L.nodePos.get(e.from), b = L.nodePos.get(e.to);
    if (!a || !b) continue;
    const tp = targetPortOf.get(e.id) ?? 'T';
    const pts = edgeRoutes.get(e.id) ?? [];
    if (pts.length < 2) continue;
    const isOver = overIds.has(e.id);
    const stroke = isOver ? contrast : (st.lineColor || '#64748b');
    const overAttr = isOver ? ' data-flow="cross-over"' : '';

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
      slash = `<line data-flow="default-slash" x1="${mx - uy * 6}" y1="${my + ux * 6}" x2="${mx + uy * 6}" y2="${my - ux * 6}" stroke="${stroke}" stroke-width="${st.lineWidth}"/>`;
    }
    const dash = e.condition === '__doc__' ? ' stroke-dasharray="6 4"' : '';
    parts.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${st.lineWidth}"${dash}${overAttr}/>${slash}${label}`);

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
      arrowParts.push(`<polygon points="${tri}" fill="${stroke}" stroke="${stroke}" stroke-width="1"/>`);
    }
  }

  // 节点
  for (const [, p] of L.nodePos) {
    parts.push(nodeShape(p.n, st, p.x, p.y, p.W, p.H, nodeCornerLines(p.n, data)));
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
      panelParts.push(`<rect x="0" y="${y}" width="${panelW}" height="${titleH + entries.length * rowH + pad * 2}" fill="${st.panelColor || '#F5F7FA'}" stroke="#94a3b8" stroke-width="1"/>`);
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
