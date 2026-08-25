/**
 * IQS-Flow 自研 SVG 渲染器（纯函数，可 node 断言验证）
 * 确定性坐标：泳道矩阵 + 节点落格 + 正交连线 + 行/列标签，无任何布局依赖。
 * 输出 SVG 字符串；提供 getSvgSize() 供导出尺寸。
 */
import type { FlowData, FlowChartStyles } from '../../types';

export interface FlowSvgDims {
  width: number;
  height: number;
}

export const FLOW_SVG = {
  cellW: 220,
  cellH: 140,
  gapX: 60,
  gapY: 80,
  head: 46,
  rowLabelW: 110,
  colLabelH: 26,
};

export function getSvgSize(data: FlowData): FlowSvgDims {
  const nRows = rowsOf(data).length || 1;
  const nCols = colsOf(data).length || 1;
  const width = FLOW_SVG.head + FLOW_SVG.rowLabelW + nCols * (FLOW_SVG.cellW + FLOW_SVG.gapX) + FLOW_SVG.gapX;
  const height = FLOW_SVG.head + FLOW_SVG.colLabelH + nRows * (FLOW_SVG.cellH + FLOW_SVG.gapY) + FLOW_SVG.gapY;
  return { width, height };
}

/** 行 = H lanes（部门），列 = V lanes（阶段） */
function rowsOf(data: FlowData): { dict: string; idx: number }[] {
  const out: { dict: string; idx: number }[] = [];
  for (const l of data.lanes.filter((x) => x.layout === 'H')) {
    for (const idx of l.indices) out.push({ dict: l.dict, idx });
  }
  return out;
}
function colsOf(data: FlowData): { dict: string; idx: number }[] {
  const out: { dict: string; idx: number }[] = [];
  for (const l of data.lanes.filter((x) => x.layout === 'V')) {
    for (const idx of l.indices) out.push({ dict: l.dict, idx });
  }
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

/** 节点 cell 坐标 → 唯一 cell key（与格子对应） */
function cellKeyOf(cell: FlowData['nodes'][0]['cell']): string | null {
  if (!cell) return null;
  const keys = Object.keys(cell);
  if (!keys.length) return null;
  const f = keys[0];
  const s = keys[1];
  if (s === undefined) return `${f}${cell[f]}`;
  return `${f}${cell[f]}${s}${cell[s]}`;
}

/** 字典取展开值 */
function dictValue(data: FlowData, dict: string, idx: number): string {
  const arr = data.dicts[dict];
  return arr && arr[idx] !== undefined ? arr[idx] : `${dict}[${idx}]`;
}

/** 节点形状 SVG 片段（返回 shape + 中心） */
function nodeShape(n: FlowData['nodes'][0], st: FlowChartStyles, cx: number, cy: number): string {
  const label = n.label || n.labelRef || n.id;
  const fs = st.nodeFontSize;
  const fw = 120, fh = 44;
  let shape = '';
  switch (n.type) {
    case 'start':
      shape = `<circle cx="${cx}" cy="${cy}" r="22" fill="${st.startColor}" stroke="#fff" stroke-width="2"/>`;
      return shape + `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="${fs}">${esc(label)}</text>`;
    case 'end':
      shape = `<circle cx="${cx}" cy="${cy}" r="22" fill="${st.endColor}" stroke="#fff" stroke-width="4"/>`;
      return shape + `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="${fs}">${esc(label)}</text>`;
    case 'exclusiveGateway':
    case 'parallelGateway': {
      const w = 64, h = 64, d = `M${cx},${cy - h / 2} L${cx + w / 2},${cy} L${cx},${cy + h / 2} L${cx - w / 2},${cy} Z`;
      const fill = n.type === 'parallelGateway' ? st.parallelColor : st.gatewayColor;
      return `<path d="${d}" fill="${fill}"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="${fs}">${esc(label)}</text>`;
    }
    case 'annotation':
      return `<rect x="${cx - fw / 2}" y="${cy - 18}" width="${Math.max(140, label.length * fs + 20)}" height="36" rx="2" fill="${st.annotationColor}"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="${fs}">${esc(label)}</text>`;
    case 'dataObject':
      return `<rect x="${cx - 55}" y="${cy - 18}" width="110" height="36" rx="4" fill="${st.dataColor}"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="${fs}">${esc(label)}</text>`;
    case 'subprocess':
      return `<rect x="${cx - fw / 2}" y="${cy - fh / 2}" width="${fw}" height="${fh}" rx="6" fill="${st.subprocessColor}" stroke="#f8fafc" stroke-width="2"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="${fs}">${esc(label)}</text>`;
    case 'task':
    default:
      return `<rect x="${cx - fw / 2}" y="${cy - fh / 2}" width="${fw}" height="${fh}" rx="6" fill="${st.taskColor}"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="${fs}">${esc(label)}</text>`;
  }
}

/** 正交折线（先横后竖），带箭头 */
function orthoPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;
}

/** 箭头 marker 定义 */
function arrowMarker(id: string, color: string): string {
  return `<defs><marker id="${id}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L8,3 z" fill="${color}"/></marker></defs>`;
}

/**
 * 生成流程图 SVG 字符串（确定性，供浏览器 & node 验证共用）。
 */
export function flowToSVG(data: FlowData, styles: FlowChartStyles): string {
  const st = styles;
  const rows = rowsOf(data);
  const cols = colsOf(data);
  const { width, height } = getSvgSize(data);

  const parts: string[] = [];
  parts.push(arrowMarker('flowArrow', st.lineColor));

  // ===== 泳道格子衬底 + 行/列标签 =====
  for (let ri = 0; ri < rows.length; ri++) {
    const ry = FLOW_SVG.head + FLOW_SVG.colLabelH + ri * (FLOW_SVG.cellH + FLOW_SVG.gapY);
    const label = dictValue(data, rows[ri].dict, rows[ri].idx);
    // 行标签（部门名，居左）
    parts.push(`<text x="${FLOW_SVG.head}" y="${ry + FLOW_SVG.cellH / 2}" text-anchor="end" fill="${st.axisColor}" font-size="13" font-weight="bold">${esc(label)}</text>`);
    for (let ci = 0; ci < cols.length; ci++) {
      const cx0 = FLOW_SVG.head + FLOW_SVG.rowLabelW + ci * (FLOW_SVG.cellW + FLOW_SVG.gapX);
      parts.push(`<rect x="${cx0}" y="${ry}" width="${FLOW_SVG.cellW}" height="${FLOW_SVG.cellH}" rx="8" fill="${st.laneColor}" fill-opacity="0.3" stroke="#cbd5e1" stroke-width="1"/>`);
      // 列标签（阶段名），仅第一行格子顶部显示一次
      if (ri === 0) {
        const colLabel = dictValue(data, cols[ci].dict, cols[ci].idx);
        parts.push(`<text x="${cx0 + FLOW_SVG.cellW / 2}" y="${ry - 6}" text-anchor="middle" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(colLabel)}</text>`);
      }
    }
  }

  // ===== 计算节点中心（与格子同坐标系） =====
  const nodeCenter = new Map<string, { x: number; y: number }>();
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
  }

  // ===== 连线（在衬底之上、节点之下），正交折线 + 箭头 =====
  for (const e of data.edges.filter((x) => !x.parent)) {
    const a = nodeCenter.get(e.from);
    const b = nodeCenter.get(e.to);
    if (!a || !b) continue;
    const d = orthoPath(a.x + 60, a.y, b.x - 60, b.y); // 节点右/左缘
    const label = e.label ? `<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 4}" text-anchor="middle" fill="${st.textColor}" font-size="11" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(e.label)}</text>` : '';
    parts.push(`<path d="${d}" fill="none" stroke="${st.lineColor}" stroke-width="${st.lineWidth}" marker-end="url(#flowArrow)"/>${label}`);
  }

  // ===== 节点（叠加） =====
  for (const n of data.nodes) {
    const c = nodeCenter.get(n.id);
    if (!c) continue;
    parts.push(nodeShape(n, st, c.x, c.y));
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
  return svg;
}
