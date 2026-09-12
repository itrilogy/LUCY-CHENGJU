/**
 * IQS-Flow Excel 式泳道布局（绘制格 3×3 + 交叉格 + 整行整列扩展 + CellOrder + 射线松弛 + T2 守护位移）
 * 纯函数，无 SVG 着色。渲染见 flowToSVG.ts。T2 见 GuardedShift.ts。
 */
import type { FlowData, FlowChartStyles } from '../../types';
import { computeCellOrder } from './CellOrder.ts';
import { computeMainlineOrder } from './MainlineOrder.ts';
import type { T2Stats } from './GuardedShift.ts';

export interface FlowSvgDims { width: number; height: number; }

export const FLOW_SVG = {
  head: 110,       // 左 header 区（行标签）
  colLabelH: 30,   // 顶部 header 区（列标签）
  titleH: 44,      // 流程图标题通栏高度
  half: 34,        // 0.5 单位 px（连线区宽/高）
};

/** 计算文字预估宽度（CJK 按 1em，ASCII 按 0.6em） */
export function textW(text: string, fs: number): number {
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

/**
 * 子流程内部 3×3 绘制格（R23 / 前提②）。
 * 迷你节点 + 2×innerHalf 走廊；标题带独立；格数由**内部边**的 CellOrder 决定，
 * 不用文档级 Layout 当铺排方向（AUD-151）。
 */
export const SUBPROCESS_INNER = {
  w: 72,
  h: 20,
  half: 8,
  titleBand: 18,
  maxCols: 4,
};

export function innerCellSize(): { cellW: number; cellH: number } {
  return {
    cellW: SUBPROCESS_INNER.w + 2 * SUBPROCESS_INNER.half,
    cellH: SUBPROCESS_INNER.h + 2 * SUBPROCESS_INNER.half,
  };
}

export interface SubprocessInnerLayout {
  cols: number;
  rows: number;
  boxW: number;
  boxH: number;
  items: { n: FlowData['nodes'][0]; gx: number; gy: number }[];
}

export function subprocessInnerLayout(data: FlowData, parentId: string): SubprocessInnerLayout {
  const inner = data.nodes.filter((x) => x.parent === parentId && x.id !== parentId);
  const innerIds = new Set(inner.map((n) => n.id));
  const innerEdges = data.edges.filter((e) => innerIds.has(e.from) && innerIds.has(e.to));
  const placed = computeCellOrder(inner, innerEdges);
  let gx = 0, gy = 0;
  const items: SubprocessInnerLayout['items'] = [];
  let nx = 1, ny = 1;
  if (!placed.length) {
    const { cellW, cellH } = innerCellSize();
    return { cols: 1, rows: 1, boxW: cellW, boxH: SUBPROCESS_INNER.titleBand + cellH, items };
  }
  for (const p of placed) {
    gx += p.dx;
    gy += p.dy;
    items.push({ n: p.n, gx, gy });
    nx = Math.max(nx, gx + 1);
    ny = Math.max(ny, gy + 1);
  }
  nx = Math.min(nx, SUBPROCESS_INNER.maxCols);
  const { cellW, cellH } = innerCellSize();
  return {
    cols: nx,
    rows: ny,
    boxW: nx * cellW,
    boxH: SUBPROCESS_INNER.titleBand + ny * cellH,
    items,
  };
}

/** @deprecated 使用 subprocessInnerLayout(data, parentId)；保留 count 入口给旧断言迁移。 */
export function subprocessInnerGrid(data: FlowData, childCount: number): { cols: number; rows: number } {
  const n = Math.max(1, childCount);
  const dummyId = data.nodes.find((x) => x.type === 'subprocess')?.id;
  if (dummyId) {
    const L = subprocessInnerLayout(data, dummyId);
    if (L.items.length === n) return { cols: L.cols, rows: L.rows };
  }
  return { cols: 1, rows: n };
}

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
export function dictValue(data: FlowData, dict: string, idx: number): string {
  const arr = data.dicts[dict];
  return arr && arr[idx] !== undefined ? arr[idx] : `${dict}[${idx}]`;
}
/** 属性值若为 Dict[i] 则展开为字面量（图面不出现 R[0]） */
export function expandRef(data: FlowData, raw: string): string {
  const m = String(raw).match(/^([A-Za-z_\u4e00-\u9fff][\w\u4e00-\u9fff]*)\[(\d+)\]$/);
  if (!m) return raw;
  const arr = data.dicts[m[1]];
  const idx = parseInt(m[2], 10);
  if (arr && arr[idx] !== undefined) return arr[idx];
  return raw;
}
/** 主网格节点：子流程内部与修饰类不占交叉格 */
export function isLayoutNode(n: FlowData['nodes'][0]): boolean {
  if (n.parent) return false;
  if (n.type === 'annotation' || n.type === 'dataObject') return false;
  return true;
}
export function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function wrapInnerWidth(type: string): number {
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
export function wrapLabel(label: string, maxWidth: number, fs: number): string[] {
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

// ===== 布局计算结果 =====
export interface NodePos { x: number; y: number; ri: number; ci: number; W: number; H: number; n: FlowData['nodes'][0]; gridX?: number; gridY?: number; }
export interface XyLayout {
  rows: { dict: string; idx: number }[];
  cols: { dict: string; idx: number }[];
  nodePos: Map<string, NodePos>;
  colX: number[]; rowY: number[];
  colWpx: number[]; rowHpx: number[];
  colNxMax: number[]; rowNyMax: number[];
  width: number; height: number;
  half: number;      // 0.5 单位
  bandLeft: number;
  bandTop: (ri: number) => number;
  gridRight: number;
  gridBottom: number;
  titleBandW: number;
  t2?: T2Stats;
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

  // 第二遍：缺省/未知坐标节点填入未占用交叉格
  // 二维：按主干序（computeMainlineOrder）取节点，空格仍行优先扫描 —— 单维/ROOT 保持声明序
  if (!isHSingle && !isVSingle && autoSeq.length > 1) {
    const rank = new Map(computeMainlineOrder(data.nodes, data.edges).map((id, i) => [id, i]));
    autoSeq.sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
  }
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
      // 子流程 = 内部 3×3 绘制格的外轮廓（R23）：迷你节点 + 走廊 + 标题带。
      let m = nodeMetrics(n, fs);
      if (n.type === 'subprocess') {
        const childCount = data.nodes.filter((x) => x.parent === n.id && x.id !== n.id).length;
        if (childCount > 0) {
          const inner = subprocessInnerLayout(data, n.id);
          m = {
            halfW: Math.max(m.halfW, inner.boxW / 2),
            halfH: Math.max(m.halfH, inner.boxH / 2),
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

  // 2. 垂直射线视线松弛（发布版 ExcelLayout）：同列跨行直通时，把挡在射线上的节点右移一格，
  // 打通 0 弯竖走廊，并抬升该列 nx（③ 整列变宽 = 缓冲区间）。对齐口径改为「同 (ci, gridX)」。
  for (const e of data.edges) {
    if (e.parent || (e.type && e.type !== 'sequence')) continue;
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
    if (uCi < 0 || uCi !== vCi || uRi === vRi) continue;
    const isDownward = uRi < vRi;
    const minR = Math.min(uRi, vRi), maxR = Math.max(uRi, vRi);
    const uCell = cellXY.get(`${uRi}_${uCi}`);
    if (uCell) {
      const uBlocker = uCell.items.find((it) =>
        it.n.id !== u.id && (isDownward ? it.gridY > uGy : it.gridY < uGy) && it.gridX === uGx
      );
      if (uBlocker) {
        uBlocker.gridX = uGx + 1;
        uCell.nx = Math.max(...uCell.items.map((it) => it.gridX + 1), 1);
      }
    }
    for (let r = minR + 1; r < maxR; r++) {
      const midCell = cellXY.get(`${r}_${uCi}`);
      if (!midCell) continue;
      const midBlocker = midCell.items.find((it) => it.gridX === uGx);
      if (midBlocker) {
        midBlocker.gridX = uGx + 1;
        midCell.nx = Math.max(...midCell.items.map((it) => it.gridX + 1), 1);
      }
    }
    const vCell = cellXY.get(`${vRi}_${vCi}`);
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

  // 【已停用】T2 守护位移（审计台账 AUD-090）：该算子为减少折弯而移动节点槽位，
  // 与「节点位置权威」原则冲突（节点位置来自 泳道×阶段，是结构事实）；
  // 其「腾挪让位」职责已由 L2/L3 的格位分配与溢出机制承接。
  const t2: T2Stats | undefined = undefined;

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
  // 有贯穿边的行列至少 2 个绘制格：空出来的那一格是走廊缓冲（节点仍可全在 grid=0）
  const locOf = (id: string): { ri: number; ci: number } | null => {
    for (const [gk, cell] of cellXY) {
      if (cell.items.some((it) => it.n.id === id)) {
        const [ri, ci] = gk.split('_').map(Number);
        return { ri, ci };
      }
    }
    return null;
  };
  for (const e of data.edges) {
    if (e.parent) continue;
    const a = locOf(e.from), b = locOf(e.to);
    if (!a || !b) continue;
    if (a.ci === b.ci && a.ri !== b.ri && a.ci >= 0 && a.ci < nC) colNxMax[a.ci] = Math.max(colNxMax[a.ci], 2);
    if (a.ri === b.ri && a.ci !== b.ci && a.ri >= 0 && a.ri < nR) rowNyMax[a.ri] = Math.max(rowNyMax[a.ri], 2);
  }
  for (const n of data.nodes) {
    if (n.parent || (n.type !== 'annotation' && n.type !== 'dataObject') || !n.attach) continue;
    const t = locOf(n.attach);
    if (t && t.ri >= 0 && t.ri < nR) rowNyMax[t.ri] = Math.max(rowNyMax[t.ri], 2);
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
      nodePos.set(it.n.id, { x: cx, y: cy, ri, ci, W: nodeW, H: nodeH, n: it.n, gridX: it.gridX, gridY: it.gridY });
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
    colNxMax, rowNyMax,
    width, height, half, bandLeft, bandTop, gridRight, gridBottom, titleBandW,
    t2,
  };
}

// ===== 六属性图例（AttrPanel）高度计算（P0-1 修复：getSvgSize 与 flowToSVG 共用同一套尺寸）=====
export function attrPanelHeight(data: FlowData): number {
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
