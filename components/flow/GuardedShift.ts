/**
 * T2 守护位移：仅当 ΔΦ ≤ −150 才接受格位移（FRAMEWORK §4）。
 * 位移只下/只右，界内 64，迭代有上限 → 良基终止。
 * 不替代既有 N/DATA 水平对齐与垂直射线初扫；本算子处理其后仍 B≥3 的正向边。
 */
import type { FlowData, FlowChartStyles } from '../../types';
import {
  solveAlgebraicPorts,
  solveAlgebraicRoute,
  computeGridChannels,
  BACK_EDGE_LABELS,
  type NodeGeometry,
  type Point,
  type Box,
} from './AlgebraicFlowRouter.ts';
import { computeMainlineOrder } from './MainlineOrder.ts';

export const T2_SHIFT_COST = 150;
export const T2_TIER1_PENALTY = 200;
export const T2_GRID_BOUND = 64;

export interface T2Stats {
  accepted: number;
  rejected: number;
  phiRoute0: number;
  phiRoute1: number;
}

export type CellItem = {
  n: FlowData['nodes'][0];
  gridX: number;
  gridY: number;
  m: { halfW: number; halfH: number };
};
export type CellRec = { nx: number; ny: number; items: CellItem[] };
export type CellXY = Map<string, CellRec>;

type LayoutSnap = {
  nodePos: Map<string, { x: number; y: number; ri: number; ci: number; W: number; H: number }>;
  colX: number[];
  colWpx: number[];
  rowHpx: number[];
  bandTop: (ri: number) => number;
  gridRight: number;
  gridBottom: number;
};

function pathBends(pts: Point[]): number {
  let b = 0;
  for (let i = 2; i < pts.length; i++) {
    const d1x = pts[i - 1].x - pts[i - 2].x, d1y = pts[i - 1].y - pts[i - 2].y;
    const d2x = pts[i].x - pts[i - 1].x, d2y = pts[i].y - pts[i - 1].y;
    if ((d1x !== 0 && d2y !== 0) || (d1y !== 0 && d2x !== 0)) b++;
  }
  return b;
}

function pathLen(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
  }
  return len;
}

function refreshNxNy(cellXY: CellXY) {
  for (const cell of cellXY.values()) {
    let nx = 1, ny = 1;
    for (const it of cell.items) {
      nx = Math.max(nx, it.gridX + 1);
      ny = Math.max(ny, it.gridY + 1);
    }
    cell.nx = nx;
    cell.ny = ny;
  }
}

function locate(cellXY: CellXY, id: string): { ri: number; ci: number; it: CellItem; cell: CellRec } | null {
  for (const [gk, cell] of cellXY) {
    const it = cell.items.find((x) => x.n.id === id);
    if (!it) continue;
    const [ri, ci] = gk.split('_').map(Number);
    return { ri, ci, it, cell };
  }
  return null;
}

export function applyGuardedShifts(
  data: FlowData,
  cellXY: CellXY,
  nR: number,
  nC: number,
  opts: { half: number; titleH: number; colLabelH: number; bandLeft: number; titleBandW: number; head: number },
): T2Stats {
  const stats: T2Stats = { accepted: 0, rejected: 0, phiRoute0: 0, phiRoute1: 0 };
  const topEdges = data.edges.filter((e) => !e.parent);
  if (topEdges.length === 0 || nR < 1 || nC < 1) return stats;

  const mainline = new Set(computeMainlineOrder(data.nodes, data.edges));
  const isTier1 = (n: FlowData['nodes'][0], gridY: number) =>
    mainline.has(n.id) && gridY === 0 && (n.type === 'task' || n.type === 'start');

  const capture = () => {
    const rows: { gk: string; nx: number; ny: number; items: { id: string; gx: number; gy: number }[] }[] = [];
    for (const [gk, c] of cellXY) {
      rows.push({
        gk, nx: c.nx, ny: c.ny,
        items: c.items.map((it) => ({ id: it.n.id, gx: it.gridX, gy: it.gridY })),
      });
    }
    return rows;
  };
  const restore = (rows: ReturnType<typeof capture>) => {
    for (const row of rows) {
      const c = cellXY.get(row.gk);
      if (!c) continue;
      c.nx = row.nx;
      c.ny = row.ny;
      for (const s of row.items) {
        const it = c.items.find((x) => x.n.id === s.id);
        if (it) { it.gridX = s.gx; it.gridY = s.gy; }
      }
    }
  };

  const materialize = (): LayoutSnap => {
    refreshNxNy(cellXY);
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
    const BASE_W = 100, BASE_H = 60;
    for (let c = 0; c < nC; c++) if (!cellWself[c]) cellWself[c] = BASE_W;
    for (let r = 0; r < nR; r++) if (!cellHself[r]) cellHself[r] = BASE_H;
    const colNxMax: number[] = new Array(nC).fill(1);
    const rowNyMax: number[] = new Array(nR).fill(1);
    for (const [gk, cell] of cellXY) {
      const [ri, ci] = gk.split('_').map(Number);
      if (ci >= 0 && ci < nC) colNxMax[ci] = Math.max(colNxMax[ci], cell.nx);
      if (ri >= 0 && ri < nR) rowNyMax[ri] = Math.max(rowNyMax[ri], cell.ny);
    }
    const half = opts.half;
    const colWpx = colNxMax.map((nx, ci) => Math.max(nx * (cellWself[ci] + 2 * half), 140));
    const rowHpx = rowNyMax.map((ny, ri) => Math.max(ny * (cellHself[ri] + 2 * half + (ny > 1 ? 24 : 0)), 120));
    const colX: number[] = [];
    let acc = opts.bandLeft + opts.titleBandW;
    for (let ci = 0; ci < nC; ci++) { colX.push(acc); acc += colWpx[ci]; }
    const bandTop = (ri: number) => {
      let a = opts.titleH + opts.colLabelH;
      for (let r = 0; r < ri; r++) a += rowHpx[r];
      return a;
    };
    const nodePos = new Map<string, { x: number; y: number; ri: number; ci: number; W: number; H: number }>();
    for (const [gk, cell] of cellXY) {
      const [ri, ci] = gk.split('_').map(Number);
      if (ri < 0 || ri >= nR || ci < 0 || ci >= nC) continue;
      const pw = colWpx[ci] / colNxMax[ci], ph = rowHpx[ri] / rowNyMax[ri];
      for (const it of cell.items) {
        const nodeW = it.m.halfW * 2, nodeH = it.m.halfH * 2;
        nodePos.set(it.n.id, {
          x: colX[ci] + it.gridX * pw + pw / 2,
          y: bandTop(ri) + it.gridY * ph + ph / 2,
          ri, ci, W: nodeW, H: nodeH,
        });
      }
    }
    const gridRight = colX[nC - 1] + colWpx[nC - 1];
    const gridBottom = bandTop(nR - 1) + rowHpx[nR - 1];
    return { nodePos, colX, colWpx, rowHpx, bandTop, gridRight, gridBottom };
  };

  const routePhi = (snap: LayoutSnap): { phi: number; bends: Map<string, number> } => {
    const nodesGeo: NodeGeometry[] = [];
    for (const [id, p] of snap.nodePos) {
      nodesGeo.push({ id, ri: p.ri, ci: p.ci, x: p.x, y: p.y, W: p.W, H: p.H });
    }
    const specs = topEdges
      .filter((e) => snap.nodePos.has(e.from) && snap.nodePos.has(e.to))
      .map((e) => ({
        id: e.id, from: e.from, to: e.to, label: e.label, condition: e.condition,
        isDoc: e.condition === '__doc__',
      }));
    const { sourcePorts, targetPorts } = solveAlgebraicPorts(nodesGeo, specs);
    const { xChannels, yChannels } = computeGridChannels({
      colX: snap.colX,
      colWpx: snap.colWpx,
      bandTop: snap.bandTop,
      rowHpx: snap.rowHpx,
      nC, nR,
      gridLeft: opts.bandLeft,
      gridRight: snap.gridRight,
      gridTop: opts.titleH,
      gridBottom: snap.gridBottom,
      half: opts.half,
    }, nodesGeo);
    const allBoxes: Record<string, Box> = {};
    for (const n of nodesGeo) {
      allBoxes[n.id] = { x0: n.x - n.W / 2, y0: n.y - n.H / 2, x1: n.x + n.W / 2, y1: n.y + n.H / 2 };
    }
    const geo = new Map(nodesGeo.map((n) => [n.id, n]));
    const bends = new Map<string, number>();
    let phi = 0;
    for (const e of specs) {
      const u = geo.get(e.from), v = geo.get(e.to);
      if (!u || !v) continue;
      const sp = sourcePorts.get(e.id) ?? 'R';
      const tp = targetPorts.get(e.id) ?? 'T';
      const pts = solveAlgebraicRoute(u, v, sp, tp, xChannels, yChannels, allBoxes, opts.half);
      const b = pathBends(pts);
      bends.set(e.id, b);
      phi += b * 100 + pathLen(pts) * 0.01;
    }
    return { phi, bends };
  };

  type Trial = { ids: string[]; dGx: number; dGy: number; tierHit: boolean };

  const propose = (fromId: string, toId: string): Trial | null => {
    const U = locate(cellXY, fromId), V = locate(cellXY, toId);
    if (!U || !V) return null;
    // 同列跨行：阻挡节点右移
    if (U.ci === V.ci && U.ri !== V.ri) {
      const gx = U.it.gridX;
      const minR = Math.min(U.ri, V.ri), maxR = Math.max(U.ri, V.ri);
      const blockers: CellItem[] = [];
      for (let r = minR; r <= maxR; r++) {
        const cell = cellXY.get(`${r}_${U.ci}`);
        if (!cell) continue;
        for (const it of cell.items) {
          if (it.n.id === fromId || it.n.id === toId) continue;
          if (it.gridX === gx) blockers.push(it);
        }
      }
      const b = blockers[0];
      if (b && b.gridX + 1 < T2_GRID_BOUND) {
        return { ids: [b.n.id], dGx: 1, dGy: 0, tierHit: isTier1(b.n, b.gridY) };
      }
    }
    // 同行跨列：阻挡节点及以下下移
    if (U.ri === V.ri && U.ci !== V.ci) {
      const gy = U.it.gridY;
      const minC = Math.min(U.ci, V.ci), maxC = Math.max(U.ci, V.ci);
      for (let c = minC + 1; c < maxC; c++) {
        const cell = cellXY.get(`${U.ri}_${c}`);
        if (!cell) continue;
        const b = cell.items.find((it) => it.gridY === gy);
        if (b && b.gridY + 1 < T2_GRID_BOUND) {
          const ids = cell.items.filter((it) => it.gridY >= gy).map((it) => it.n.id);
          const tierHit = cell.items.some((it) => it.gridY >= gy && isTier1(it.n, it.gridY));
          return { ids, dGx: 0, dGy: 1, tierHit };
        }
      }
    }
    // 异行异列：对角一次位移 L 角阻挡（A6，代价仍按一次 150）
    if (U.ri !== V.ri && U.ci !== V.ci) {
      const corner = cellXY.get(`${U.ri}_${V.ci}`) || cellXY.get(`${V.ri}_${U.ci}`);
      const b = corner?.items.find((it) => it.n.id !== fromId && it.n.id !== toId);
      if (b && b.gridX + 1 < T2_GRID_BOUND && b.gridY + 1 < T2_GRID_BOUND) {
        return { ids: [b.n.id], dGx: 1, dGy: 1, tierHit: isTier1(b.n, b.gridY) };
      }
    }
    return null;
  };

  const applyTrial = (t: Trial) => {
    for (const id of t.ids) {
      const loc = locate(cellXY, id);
      if (!loc) continue;
      loc.it.gridX += t.dGx;
      loc.it.gridY += t.dGy;
    }
    refreshNxNy(cellXY);
  };

  const phi0 = routePhi(materialize()).phi;
  stats.phiRoute0 = phi0;
  let phiCur = phi0;
  const maxIter = Math.max(8, topEdges.length * 2);
  for (let iter = 0; iter < maxIter; iter++) {
    const { phi, bends } = routePhi(materialize());
    phiCur = phi;
    const cand = topEdges.filter((e) => {
      if (e.condition === '__doc__') return false;
      if (e.label && BACK_EDGE_LABELS.has(e.label)) return false;
      return (bends.get(e.id) ?? 0) >= 3;
    });
    if (!cand.length) break;
    let accepted = false;
    for (const e of cand) {
      const trial = propose(e.from, e.to);
      if (!trial) { stats.rejected++; continue; }
      const snap = capture();
      applyTrial(trial);
      const phiAfter = routePhi(materialize()).phi;
      const dPhi = (phiAfter - phiCur) + T2_SHIFT_COST + (trial.tierHit ? T2_TIER1_PENALTY : 0);
      if (dPhi <= -T2_SHIFT_COST) {
        stats.accepted++;
        phiCur = phiAfter;
        accepted = true;
        break;
      }
      restore(snap);
      stats.rejected++;
    }
    if (!accepted) break;
  }
  stats.phiRoute1 = phiCur;
  return stats;
}
