/**
 * IQS-Flow 自研 SVG 渲染器（纯函数，可 node 断言验证）
 * 确定性坐标：泳道矩阵 + 节点落格 + 正交连线（端点贴合节点边界）+ 行/列标签。
 * 修复要点：连线端点按节点实际半宽（非固定±60）、菱形按文字自适应、行标签防裁切。
 */
import type { FlowData, FlowChartStyles } from '../../types';

export interface FlowSvgDims { width: number; height: number; }

export const FLOW_SVG = {
  cellW: 220,
  cellH: 140,
  gapX: 60,
  gapY: 80,
  head: 52,       // 左 header 区（行标签）
  colLabelH: 30,  // 顶部 header 区（列标签）
  rowLabelW: 118, // 行标签宽（防裁切）
};

/** 计算文字预估宽度（CJK 按 1em，ASCII 按 0.6em） */
function textW(text: string, fs: number): number {
  let w = 0;
  for (const ch of text) {
    w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? fs : fs * 0.6;
  }
  return w;
}

/** 节点尺寸/边界信息（shapes 与连线共用） */
export interface NodeMetrics {
  halfW: number;
  halfH: number;
  shapeType: 'circle' | 'diamond' | 'rect';
}
export function nodeMetrics(n: FlowData['nodes'][0], fs: number): NodeMetrics {
  const label = n.label || n.labelRef || n.id;
  // 菱形/节点按文字自适应最小宽度
  const tw = textW(label, fs);
  switch (n.type) {
    case 'start':
    case 'end':
      return { halfW: 24, halfH: 24, shapeType: 'circle' };
    case 'exclusiveGateway':
    case 'parallelGateway': {
      // 菱形对角线 = 文字宽 + padding
      const dw = Math.max(70, tw + 40);
      const dh = Math.max(54, fs + 24);
      return { halfW: dw / 2, halfH: dh / 2, shapeType: 'diamond' };
    }
    case 'annotation':
      return { halfW: Math.max(70, tw / 2 + 14), halfH: 20, shapeType: 'rect' };
    case 'dataObject':
      return { halfW: Math.max(55, tw / 2 + 14), halfH: 20, shapeType: 'rect' };
    case 'subprocess':
    case 'task':
    default:
      return { halfW: Math.max(60, tw / 2 + 16), halfH: 22, shapeType: 'rect' };
  }
}

export function getSvgSize(data: FlowData): FlowSvgDims {
  const nRows = rowsOf(data).length || 1;
  const nCols = colsOf(data).length || 1;
  const width = FLOW_SVG.head + FLOW_SVG.rowLabelW + nCols * (FLOW_SVG.cellW + FLOW_SVG.gapX) + FLOW_SVG.gapX + 30;
  const height = FLOW_SVG.head + FLOW_SVG.colLabelH + nRows * (FLOW_SVG.cellH + FLOW_SVG.gapY) + FLOW_SVG.gapY + 30;
  return { width, height };
}

function rowsOf(data: FlowData) {
  const out: { dict: string; idx: number }[] = [];
  for (const l of data.lanes.filter((x) => x.layout === 'H')) for (const idx of l.indices) out.push({ dict: l.dict, idx });
  return out;
}
function colsOf(data: FlowData) {
  const out: { dict: string; idx: number }[] = [];
  for (const l of data.lanes.filter((x) => x.layout === 'V')) for (const idx of l.indices) out.push({ dict: l.dict, idx });
  return out;
}

function cellCx(ci: number): number {
  return FLOW_SVG.head + FLOW_SVG.rowLabelW + ci * (FLOW_SVG.cellW + FLOW_SVG.gapX) + FLOW_SVG.cellW / 2;
}
function cellCy(ri: number): number {
  return FLOW_SVG.head + FLOW_SVG.colLabelH + ri * (FLOW_SVG.cellH + FLOW_SVG.gapY) + FLOW_SVG.cellH / 2;
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

/** 节点形状 SVG（返回 shape + text） */
function nodeShape(n: FlowData['nodes'][0], st: FlowChartStyles, cx: number, cy: number): string {
  const label = n.label || n.labelRef || n.id;
  const fs = st.nodeFontSize;
  const m = nodeMetrics(n, fs);
  let shape = '';
  switch (n.type) {
    case 'start':
      shape = `<circle cx="${cx}" cy="${cy}" r="${m.halfW}" fill="${st.startColor}" stroke="#fff" stroke-width="2"/>`;
      break;
    case 'end':
      shape = `<circle cx="${cx}" cy="${cy}" r="${m.halfW}" fill="${st.endColor}" stroke="#fff" stroke-width="4"/>`;
      break;
    case 'exclusiveGateway':
    case 'parallelGateway': {
      const w = m.halfW * 2, h = m.halfH * 2;
      const d = `M${cx},${cy - h / 2} L${cx + w / 2},${cy} L${cx},${cy + h / 2} L${cx - w / 2},${cy} Z`;
      const fill = n.type === 'parallelGateway' ? st.parallelColor : st.gatewayColor;
      shape = `<path d="${d}" fill="${fill}"/>`;
      break;
    }
    case 'annotation':
      shape = `<rect x="${cx - m.halfW}" y="${cy - m.halfH}" width="${m.halfW * 2}" height="${m.halfH * 2}" rx="2" fill="${st.annotationColor}"/>`;
      break;
    case 'dataObject':
      shape = `<rect x="${cx - m.halfW}" y="${cy - m.halfH}" width="${m.halfW * 2}" height="${m.halfH * 2}" rx="4" fill="${st.dataColor}"/>`;
      break;
    case 'subprocess':
      shape = `<rect x="${cx - m.halfW}" y="${cy - m.halfH}" width="${m.halfW * 2}" height="${m.halfH * 2}" rx="6" fill="${st.subprocessColor}" stroke="#f8fafc" stroke-width="2"/>`;
      break;
    case 'task':
    default:
      shape = `<rect x="${cx - m.halfW}" y="${cy - m.halfH}" width="${m.halfW * 2}" height="${m.halfH * 2}" rx="6" fill="${st.taskColor}"/>`;
      break;
  }
  return shape + `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="${fs}">${esc(label)}</text>`;
}

/** 正交走线：先横后竖，端点贴节点边界（源右缘 → 目标左缘） */
function orthoPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;
}

function arrowMarker(id: string, color: string): string {
  return `<defs><marker id="${id}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L8,3 z" fill="${color}"/></marker></defs>`;
}

/**
 * 生成流程图 SVG 字符串（确定性）。
 */
export function flowToSVG(data: FlowData, styles: FlowChartStyles): string {
  const st = styles;
  const rows = rowsOf(data);
  const cols = colsOf(data);
  const { width, height } = getSvgSize(data);

  const parts: string[] = [];
  parts.push(arrowMarker('flowArrow', st.lineColor));

  const bandH = FLOW_SVG.cellH;              // 泳道带高 = 格子高
  const bandTop = (ri: number) => FLOW_SVG.head + FLOW_SVG.colLabelH + ri * (bandH + FLOW_SVG.gapY);
  const bandLeft = FLOW_SVG.head + FLOW_SVG.rowLabelW;
  const bandRight = width - FLOW_SVG.gapX;

  // ===== 1. 泳道带（每行一条贯穿背景条，非交叉格） =====
  for (let ri = 0; ri < rows.length; ri++) {
    const ry = bandTop(ri);
    const label = dictValue(data, rows[ri].dict, rows[ri].idx);
    // 贯穿泳道带背景
    parts.push(`<rect x="${bandLeft}" y="${ry}" width="${bandRight - bandLeft}" height="${bandH}" rx="10" fill="${st.laneColor}" fill-opacity="0.22" stroke="${st.laneColor}" stroke-width="1.5"/>`);
    // 行标签（泳道名，居左 header 区）
    parts.push(`<text x="${FLOW_SVG.head}" y="${ry + bandH / 2}" text-anchor="middle" fill="${st.axisColor}" font-size="13" font-weight="bold">${esc(label)}</text>`);
  }

  // ===== 2. 列标签（阶段名，顶部一条） =====
  for (let ci = 0; ci < cols.length; ci++) {
    const cx0 = bandLeft + ci * (FLOW_SVG.cellW + FLOW_SVG.gapX);
    const colLabel = dictValue(data, cols[ci].dict, cols[ci].idx);
    parts.push(`<text x="${cx0 + FLOW_SVG.cellW / 2}" y="${FLOW_SVG.head + FLOW_SVG.colLabelH - 8}" text-anchor="middle" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(colLabel)}</text>`);
  }

  // ===== 3. 节点中心 + 尺寸 metrics =====
  const nodeCenter = new Map<string, { x: number; y: number }>();
  const nodeMetricMap = new Map<string, NodeMetrics>();
  const cellNodeId = new Map<string, string>();
  for (let ri = 0; ri < rows.length; ri++) {
    for (let ci = 0; ci < cols.length; ci++) {
      const key = `${rows[ri].dict}${rows[ri].idx}${cols[ci].dict}${cols[ci].idx}`;
      cellNodeId.set(key, `${ri}_${ci}`);
    }
  }
  for (const n of data.nodes) {
    const key = cellKeyOf(n.cell);
    const rc = key ? cellNodeId.get(key) : undefined;
    if (rc) {
      const [ri, ci] = rc.split('_').map(Number);
      nodeCenter.set(n.id, { x: cellCx(ci), y: cellCy(ri) });
    } else {
      const ord = data.nodes.indexOf(n);
      nodeCenter.set(n.id, { x: 80 + ord * 80, y: height / 2 });
    }
    nodeMetricMap.set(n.id, nodeMetrics(n, st.nodeFontSize));
  }

  // ===== 4. 只画有节点的格子定位框（淡虚线；空格子不画） =====
  const occupiedCell = new Set<string>();
  for (const n of data.nodes) {
    const key = cellKeyOf(n.cell);
    if (key && cellNodeId.has(key)) {
      const [ri, ci] = cellNodeId.get(key)!.split('_').map(Number);
      const oc = `${ri}_${ci}`;
      if (!occupiedCell.has(oc)) {
        occupiedCell.add(oc);
        const ry = bandTop(ri);
        const cx0 = bandLeft + ci * (FLOW_SVG.cellW + FLOW_SVG.gapX);
        parts.push(`<rect x="${cx0}" y="${ry}" width="${FLOW_SVG.cellW}" height="${FLOW_SVG.cellH}" rx="8" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 3"/>`);
      }
    }
  }

  // ===== 5. 连线（端点贴节点边界，正交；回边沿泳道底部走规整回线） =====
  for (const e of data.edges.filter((x) => !x.parent)) {
    const a = nodeCenter.get(e.from);
    const b = nodeCenter.get(e.to);
    const ma = nodeMetricMap.get(e.from);
    const mb = nodeMetricMap.get(e.to);
    if (!a || !b || !ma || !mb) continue;
    const label = e.label ? `<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 8}" text-anchor="middle" fill="${st.textColor}" font-size="11" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(e.label)}</text>` : '';
    // 回退边：目标在源的下方行 或 左方列（回环）→ 走节点底→带底间隙通道→目标底
    const isBack = b.y > a.y + 10 || b.x < a.x - 10;
    if (isBack) {
      // 源底部 → 垂直下到带底通道（该行带底 = bandTop(ri)+bandH），水平到目标列中心，垂直上到目标底部
      const srcBottom = a.y + ma.halfH + 4;
      const dstBottom = b.y + mb.halfH + 4;
      const channelY = Math.max(srcBottom, dstBottom) + 6; // 泳道带下缘通道
      const midX = b.x; // 在目标列中心上下，避免横穿多格
      const d = `M${a.x},${srcBottom} L${a.x},${channelY} L${midX},${channelY} L${midX},${dstBottom} L${b.x},${dstBottom}`;
      parts.push(`<path d="${d}" fill="none" stroke="${st.lineColor}" stroke-width="${st.lineWidth}" marker-end="url(#flowArrow)"/>${label}`);
    } else {
      // 顺序边：源右缘 → 目标左缘，先横后竖
      const x1 = a.x + ma.halfW + 4;
      const y1 = a.y;
      const x2 = b.x - mb.halfW - 4;
      const y2 = b.y;
      const d = orthoPath(x1, y1, x2, y2);
      parts.push(`<path d="${d}" fill="none" stroke="${st.lineColor}" stroke-width="${st.lineWidth}" marker-end="url(#flowArrow)"/>${label}`);
    }
  }

  // ===== 6. 节点（叠加） =====
  for (const n of data.nodes) {
    const c = nodeCenter.get(n.id);
    if (!c) continue;
    parts.push(nodeShape(n, st, c.x, c.y));
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
  return svg;
}
