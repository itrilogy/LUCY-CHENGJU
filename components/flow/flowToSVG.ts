/**
 * IQS-Flow 自研 SVG 渲染器 —— Excel 表格范式布局引擎（纯函数，可 node 断言验证）
 *
 * 法则（用户红线图）：
 *   1. 先排节点成"自适应表格"：列 = 阶段(V lanes)，行 = 部门(H lanes)
 *      - 列宽 = max(该列格内节点横向占宽) + padding，行高 = max(该行格内节点纵向占高) + padding
 *      - 一个格子可放多个节点，格内按节点 `vh` 标注链式排布（V=下、H=右，无标注延续上一方向）
 *   2. 再叠泳道划分：有泳道画泳道带 + 行列表头；无泳道 = 整画布 1 个大格
 *   3. 连线顺单元格间隙正交，端点贴节点边界
 */
import type { FlowData, FlowChartStyles } from '../../types';

export interface FlowSvgDims { width: number; height: number; }

export const FLOW_SVG = {
  padX: 24,       // 格内横向 padding
  padY: 20,       // 格内纵向 padding
  gapX: 36,       // 列间 gap（连线通道）
  gapY: 36,       // 行间 gap（连线通道）
  head: 120,      // 左 header 区（行标题）
  colLabelH: 30,  // 顶部 header 区（列标题）
};

/** 计算文字预估宽度（CJK 按 1em，ASCII 按 0.6em） */
function textW(text: string, fs: number): number {
  let w = 0;
  for (const ch of text) w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? fs : fs * 0.6;
  return w;
}

export interface NodeMetrics {
  halfW: number;
  halfH: number;
  shapeType: 'circle' | 'diamond' | 'rect';
}
export function nodeMetrics(n: FlowData['nodes'][0], fs: number): NodeMetrics {
  const label = n.label || n.labelRef || n.id;
  const tw = textW(label, fs);
  switch (n.type) {
    case 'start':
    case 'end':
      return { halfW: 22, halfH: 22, shapeType: 'circle' };
    case 'exclusiveGateway':
    case 'parallelGateway': {
      const dw = Math.max(64, tw + 36);
      const dh = Math.max(50, fs + 22);
      return { halfW: dw / 2, halfH: dh / 2, shapeType: 'diamond' };
    }
    case 'annotation':
      return { halfW: Math.max(60, tw / 2 + 12), halfH: 18, shapeType: 'rect' };
    case 'dataObject':
      return { halfW: Math.max(50, tw / 2 + 12), halfH: 18, shapeType: 'rect' };
    case 'subprocess':
    case 'task':
    default:
      return { halfW: Math.max(52, tw / 2 + 14), halfH: 20, shapeType: 'rect' };
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

/** 节点形状 SVG（圆角+细描边+文字留白） */
function nodeShape(n: FlowData['nodes'][0], st: FlowChartStyles, cx: number, cy: number): string {
  const label = n.label || n.labelRef || n.id;
  const fs = st.nodeFontSize;
  const m = nodeMetrics(n, fs);
  const stroke = 'rgba(15,23,42,0.25)';
  let shape = '';
  switch (n.type) {
    case 'start':
      shape = `<circle cx="${cx}" cy="${cy}" r="${m.halfW}" fill="${st.startColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    case 'end':
      shape = `<circle cx="${cx}" cy="${cy}" r="${m.halfW}" fill="${st.endColor}" stroke="${stroke}" stroke-width="3"/>`;
      break;
    case 'exclusiveGateway':
    case 'parallelGateway': {
      const w = m.halfW * 2, h = m.halfH * 2;
      const d = `M${cx},${cy - h / 2} L${cx + w / 2},${cy} L${cx},${cy + h / 2} L${cx - w / 2},${cy} Z`;
      shape = `<path d="${d}" fill="${n.type === 'parallelGateway' ? st.parallelColor : st.gatewayColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    }
    case 'annotation':
      shape = `<rect x="${cx - m.halfW}" y="${cy - m.halfH}" width="${m.halfW * 2}" height="${m.halfH * 2}" rx="3" fill="${st.annotationColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    case 'dataObject':
      shape = `<rect x="${cx - m.halfW}" y="${cy - m.halfH}" width="${m.halfW * 2}" height="${m.halfH * 2}" rx="5" fill="${st.dataColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    case 'subprocess':
      shape = `<rect x="${cx - m.halfW}" y="${cy - m.halfH}" width="${m.halfW * 2}" height="${m.halfH * 2}" rx="6" fill="${st.subprocessColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    default:
      shape = `<rect x="${cx - m.halfW}" y="${cy - m.halfH}" width="${m.halfW * 2}" height="${m.halfH * 2}" rx="6" fill="${st.taskColor}" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
  }
  return shape + `<text x="${cx}" y="${cy + fs * 0.36}" text-anchor="middle" fill="#fff" font-size="${fs}" font-weight="500">${esc(label)}</text>`;
}

/** 正交走线 */
function orthoPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;
}

function arrowMarker(id: string, color: string): string {
  return `<defs><marker id="${id}" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L7,3 z" fill="${color}"/></marker></defs>`;
}

/** ===== Excel 表格布局计算（确定性，返回格子/节点绝对坐标） ===== */
interface CellContent { node: FlowData['nodes'][0]; cx: number; cy: number; m: NodeMetrics; }
interface CellLayout {
  ri: number; ci: number;
  x: number; y: number; w: number; h: number;
  key: string;
  contents: CellContent[];
}
interface ExcelLayout {
  rows: { dict: string; idx: number }[];
  cols: { dict: string; idx: number }[];
  cells: CellLayout[];
  nodeXY: Map<string, { x: number; y: number; ri: number; ci: number }>;
  nodeM: Map<string, NodeMetrics>;
  width: number;
  height: number;
  bandTop: (ri: number) => number;
  bandLeft: number;
  gridStep: number;   // 半单位网格 px（0.5 单位 = 1 格）
  colW: number[];     // 每列宽 px
  rowH: number[];     // 每行高 px
}

export function computeExcelLayout(data: FlowData, st: FlowChartStyles): ExcelLayout {
  const rows = rowsOf(data);
  const cols = colsOf(data);
  const nR = rows.length || 1;
  const nC = cols.length || 1;

  // 1. 归类节点到格子 (ri, ci)
  const cellNodeId = new Map<string, { ri: number; ci: number }>();
  for (let ri = 0; ri < nR; ri++) for (let ci = 0; ci < nC; ci++) {
    cellNodeId.set(`${rows[ri].dict}${rows[ri].idx}${cols[ci].dict}${cols[ci].idx}`, { ri, ci });
  }
  const group = new Map<string, CellContent[]>();
  const nodeXY = new Map<string, { x: number; y: number; ri: number; ci: number }>();
  const nodeM = new Map<string, NodeMetrics>();
  for (const n of data.nodes) {
    const key = cellKeyOf(n.cell);
    let rc: { ri: number; ci: number } | undefined = key ? cellNodeId.get(key) : undefined;
    if (!rc) rc = { ri: 0, ci: 0 }; // 无泳道 → 大格 0,0；坐标越界归默认
    // 处理多维清洗：若 cell 含未定义维，落默认
    const gk = `${rc.ri}_${rc.ci}`;
    if (!group.has(gk)) group.set(gk, []);
    const m = nodeMetrics(n, st.nodeFontSize);
    nodeM.set(n.id, m);
    group.get(gk)!.push({ node: n, cx: 0, cy: 0, m });
  }

  // 2. 每格内容按 V/H 链排，求格内局部坐标与包围盒
  const cellGeom = new Map<string, { w: number; h: number; items: { n: FlowData['nodes'][0]; lx: number; ly: number; m: NodeMetrics }[] }>();
  for (const [gk, contents] of group) {
    // 链式排布：每个节点 = 一个红框（节点区 + 右侧连线区）。
    // 红框宽 = 节点区(节点宽) + 连线区(固定连廊slot)，高 = 节点高。
    // 红框间距：框间留小 gap。多节点按 vh 链排（V=下、H=右）。
    const linkSlot = 42;          // 红框内右侧"连线区"宽度
    const frameGap = 16;          // 红框之间 gap
    const pad = FLOW_SVG.padX;    // 格内 padding
    let cursorX = pad, cursorY = pad;
    let prevDir: 'V' | 'H' = 'H';
    let maxX = 0, maxY = 0;
    const out: { n: FlowData['nodes'][0]; lx: number; ly: number; m: NodeMetrics }[] = [];
    for (let i = 0; i < contents.length; i++) {
      const c = contents[i];
      const dir = c.node.vh ?? prevDir; // 无标注延续上一方向（首节点默认 H）
      if (i > 0) {
        if (dir === 'V') { cursorY += (out[i - 1].m.halfH * 2) + frameGap; }
        else { cursorX += (out[i - 1].m.halfW * 2) + linkSlot + frameGap; }
      }
      out.push({ n: c.node, lx: cursorX + c.m.halfW, ly: cursorY + c.m.halfH, m: c.m });
      // 红框宽 = 节点区(2*halfW) + 连线区(linkSlot)；高 = 节点高
      maxX = Math.max(maxX, cursorX + c.m.halfW * 2 + linkSlot);
      maxY = Math.max(maxY, cursorY + c.m.halfH * 2);
      prevDir = dir;
    }
    cellGeom.set(gk, { w: Math.max(90, maxX + pad), h: Math.max(64, maxY + pad), items: out });
  }

  // 3. 自适应列宽/行高
  const colW: number[] = new Array(nC).fill(0);
  const rowH: number[] = new Array(nR).fill(0);
  for (const [gk, g] of cellGeom) {
    const [ri, ci] = gk.split('_').map(Number);
    if (ci >= 0 && ci < nC) colW[ci] = Math.max(colW[ci], g.w);
    if (ri >= 0 && ri < nR) rowH[ri] = Math.max(rowH[ri], g.h);
  }
  for (let c = 0; c < nC; c++) if (!colW[c]) colW[c] = 120;
  for (let r = 0; r < nR; r++) if (!rowH[r]) rowH[r] = 80;

  // 4. 统一网格线坐标系统（贯穿棋盘）
  // 网格单位：半单位 = GRID px，全单位 = 2*GRID px。
  // 列宽 = 该列最大横向切分数 * 全单位；行高 = 该行最大纵向切分数 * 全单位。
  // 泳道格相邻无走廊，网格线贯穿整个棋盘（一套坐标系统）。
  const GRID = 34; // 半单位 px（0.5 单位 = 1 格）
  // 每格 nx(横向切分)/ny(纵向切分)：按该格内节点网格坐标的最大值+1
  const cellXY = new Map<string, { nx: number; ny: number }>();
  for (let ri = 0; ri < nR; ri++) for (let ci = 0; ci < nC; ci++) {
    const gk = `${ri}_${ci}`;
    const content = group.get(gk) || [];
    const xs = content.map((c) => c.node.vh === 'H' ? 1 : 0); // 简化：横向节点取横坐标偏移
    // 每个节点占一个"绘制格"。绘制格在交叉格内的网格坐标 = 节点声明的排列位置。
    // 用 vh 链式推断：V 节点纵向堆叠 → ny 增加；H 节点横向并排 → nx 增加。
    let nx = 1, ny = 1;
    let rowCursor = 0, colCursor = 0;
    let prevDir: 'V' | 'H' = 'H';
    for (const c of content) {
      const dir = c.node.vh ?? prevDir;
      if (dir === 'V') { rowCursor++; ny = Math.max(ny, rowCursor + 1); }
      else { colCursor++; nx = Math.max(nx, colCursor + 1); }
      prevDir = dir;
    }
    cellXY.set(gk, { nx, ny });
  }
  const colWArr: number[] = new Array(nC).fill(1);
  const rowHArr: number[] = new Array(nR).fill(1);
  for (let ri = 0; ri < nR; ri++) for (let ci = 0; ci < nC; ci++) {
    const v = cellXY.get(`${ri}_${ci}`)!;
    colWArr[ci] = Math.max(colWArr[ci], v.nx);
    rowHArr[ri] = Math.max(rowHArr[ri], v.ny);
  }
  // 列宽(px) = nx * 2*GRID(全单位)；行高 = ny * 2*GRID
  const colWpx = colWArr.map((v) => v * 2 * GRID);
  const rowHpx = rowHArr.map((v) => v * 2 * GRID);
  const bandLeft = FLOW_SVG.head;
  const colX: number[] = [];
  let acc = bandLeft;
  for (let ci = 0; ci < nC; ci++) { colX.push(acc); acc += colWpx[ci]; }
  const bandTop = (ri: number) => {
    let a = FLOW_SVG.head + FLOW_SVG.colLabelH;
    for (let r = 0; r < ri; r++) a += rowHpx[r];
    return a;
  };
  // 泳道格内每"绘制格"的局部网格坐标（在统一网格上）
  const cells: CellLayout[] = [];
  for (let ri = 0; ri < nR; ri++) {
    for (let ci = 0; ci < nC; ci++) {
      const key = `${ri}_${ci}`;
      const g = cellGeom.get(key);
      const w = colWpx[ci], h = rowHpx[ri];
      const x = colX[ci], y = bandTop(ri);
      const contents: CellContent[] = [];
      // 每个绘制格 = w/nx × h/ny，节点放对应单元中心
      const xy = cellXY.get(key) || { nx: 1, ny: 1 };
      const pw = w / xy.nx, ph = h / xy.ny;
      if (g) {
        let rr = 0, cc = 0, prevDir: 'V' | 'H' = 'H';
        for (const it of g.items) {
          const dir = it.n.vh ?? prevDir;
          // 节点放在当前 (rr,cc) 绘制格中心
          const cx = x + cc * pw + pw / 2;
          const cy = y + rr * ph + ph / 2;
          contents.push({ node: it.n, cx, cy, m: it.m });
          nodeXY.set(it.n.id, { x: cx, y: cy, ri, ci });
          if (dir === 'V') rr++; else cc++;
          prevDir = dir;
        }
      }
      cells.push({ ri, ci, x, y, w, h, key, contents });
    }
  }
  const totalW = colX[nC - 1] + colWpx[nC - 1] + 20;
  const totalH = bandTop(nR - 1) + rowHpx[nR - 1] + 20;
  return { rows, cols, cells, nodeXY, nodeM, width: totalW, height: totalH, bandTop, bandLeft, gridStep: GRID, colW: colWpx, rowH: rowHpx };
}

/** 由 computeExcelLayout 计算画布尺寸（styles 可选，缺省用默认字体） */
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

  // 统一网格线贯穿棋盘（横纵线从首到尾，gridStep 间距）
  const nR = L.rows.length || 1;
  const nC = L.cols.length || 1;
  const x0 = L.bandLeft, y0 = L.bandTop(0);
  // 泳道区背景
  parts.push(`<rect x="${x0}" y="${y0}" width="${width - x0 - 5}" height="${height - y0 - 5}" fill="#f8fafc"/>`);
  // 纵向网格线（贯穿到棋盘底）
  for (let gx = x0; gx <= width; gx += L.gridStep) {
    parts.push(`<line x1="${gx}" y1="${y0}" x2="${gx}" y2="${height - 5}" stroke="#cbd5e1" stroke-width="0.6"/>`);
  }
  // 横向网格线（贯穿到棋盘右缘）
  for (let gy = y0; gy <= height; gy += L.gridStep) {
    parts.push(`<line x1="${x0}" y1="${gy}" x2="${width - 5}" y2="${gy}" stroke="#cbd5e1" stroke-width="0.6"/>`);
  }
  // 泳道行标题（行标签，列标题右侧）
  for (let ri = 0; ri < nR; ri++) {
    const y = L.bandTop(ri);
    const h = L.rowH[ri];
    const rl = dictValue(data, L.rows[ri].dict, L.rows[ri].idx);
    parts.push(`<text x="${L.bandLeft - 12}" y="${y + h / 2}" text-anchor="end" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(rl)}</text>`);
  }
  // 列标题表头带
  const colHeaderY = FLOW_SVG.head - 16;
  parts.push(`<rect x="${L.bandLeft}" y="${colHeaderY}" width="${width - L.bandLeft - 5}" height="18" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>`);
  for (let ci = 0; ci < nC; ci++) {
    const cx0 = L.cells.find((c) => c.ci === ci)?.x ?? L.bandLeft;
    const cl = dictValue(data, L.cols[ci].dict, L.cols[ci].idx);
    parts.push(`<text x="${cx0 + 8}" y="${colHeaderY + 13}" text-anchor="start" fill="${st.axisColor}" font-size="12" font-weight="bold">${esc(cl)}</text>`);
  }

  // 格子边框（含内容的格子才画）
  for (const c of L.cells) {
    if (c.contents.length) {
      parts.push(`<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="6" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 3"/>`);
    }
  }

  // 连线（按行列关系布规整线：同泳道直连，同列垂直，跨带走最近泳道间隙通道）
  // 计算相邻泳道带之间的间隙通道 y
  const bandGapY: number[] = [];
  const nBands = L.rows.length;
  for (let ri = 0; ri < nBands - 1; ri++) {
    const top = L.bandTop(ri);
    const h = L.cells.find((c) => c.ri === ri)?.h ?? 80;
    bandGapY.push(top + h + FLOW_SVG.gapY / 2);
  }
  const nearestGap = (y: number): number => {
    if (!bandGapY.length) return y - 20;
    let best = bandGapY[0], bd = Infinity;
    for (const g of bandGapY) { const d = Math.abs(g - y); if (d < bd) { bd = d; best = g; } }
    return best;
  };
  for (const e of data.edges.filter((x) => !x.parent)) {
    const a = L.nodeXY.get(e.from);
    const b = L.nodeXY.get(e.to);
    const ma = L.nodeM.get(e.from);
    const mb = L.nodeM.get(e.to);
    if (!a || !b || !ma || !mb) continue;
    const label = e.label ? `<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 12}" text-anchor="middle" fill="${st.textColor}" font-size="11" paint-order="stroke" stroke="#fff" stroke-width="4">${esc(e.label)}</text>` : '';
    let d: string;
    if (a.ri === b.ri) {
      // 同泳道带：水平直连
      if (b.x >= a.x) { const x1 = a.x + ma.halfW + 3; const x2 = b.x - mb.halfW - 3; d = `M${x1},${a.y} L${x2},${b.y}`; }
      else { const x1 = a.x - ma.halfW - 3; const x2 = b.x + mb.halfW + 3; d = `M${x1},${a.y} L${x2},${b.y}`; }
    } else if (a.ci === b.ci) {
      // 同列跨带：垂直直连
      if (b.y >= a.y) { const y1 = a.y + ma.halfH + 3; const y2 = b.y - mb.halfH - 3; d = `M${a.x},${y1} L${b.x},${y2}`; }
      else { const y1 = a.y - ma.halfH - 3; const y2 = b.y + mb.halfH + 3; d = `M${a.x},${y1} L${b.x},${y2}`; }
    } else {
      // 跨带不同列：走最近泳道间隙通道
      const chY = nearestGap(Math.min(a.y, b.y));
      const aSideY = a.y < chY ? a.y + ma.halfH + 3 : a.y - ma.halfH - 3;
      const bSideY = b.y < chY ? b.y + mb.halfH + 3 : b.y - mb.halfH - 3;
      d = `M${a.x},${aSideY} L${a.x},${chY} L${b.x},${chY} L${b.x},${bSideY}`;
    }
    parts.push(`<path d="${d}" fill="none" stroke="${st.lineColor}" stroke-width="${st.lineWidth}" marker-end="url(#flowArrow)"/>${label}`);
  }

  // 节点
  for (const c of L.cells) for (const cc of c.contents) {
    parts.push(nodeShape(cc.node, st, cc.cx, cc.cy));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
}
