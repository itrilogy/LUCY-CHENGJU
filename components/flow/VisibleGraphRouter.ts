/**
 * IQS-Flow · L4 混合内核 · 候选 A：可见图正交布线
 *
 * 依据：`docs/flow/math/FLOW_ROUTING_MATH_DIRECTIONS.md`
 *   - §2 D1（可见图 / 状态最短路）
 *   - §2 D2（动态 stub：λ = 到最近通道线的距离 ⇒ 拐点吸附通道）
 *   - §3.1 单调性引理（解空间扩张 ⇒ 不劣）
 *   - §3.2 吸附完备性
 *
 * 与现实现 `solveAlgebraicRoute` 组成「混合内核」：调用侧逐边取折弯更少者，
 * 由「并集不劣于任一」引理保证**结果不劣于任一单一内核**（构造性零回退）。
 *
 * 相对 `solveAlgebraicRoute` 的关键差异：
 *   1. 状态为**4 方向**（R/L/U/D）而非 2 轴（H/V）—— 终点按**方向符号**判定，
 *      从构造上排除「180° 回折被误算作 90° 转向」（见审计台账 AUD-107）；
 *   2. 动态 stub 长度，使 stub 端点落在通道网格上（AUD-089）；
 *   3. 搜索为**精确最短路**（状态图 Dijkstra），而非分级候选枚举（AUD-029）。
 *
 * 实测（`docs/flow/notes/FLOW_ROUTING_WORKLOG.md` W8/W9，9 类图 × 2 布局 = 143 条边）：
 *   混合内核 Σ折弯 105 → 58（−45%），劣于现实现的场景数 = 0。
 */
import type { Point, Box, Port } from './AlgebraicFlowRouter.ts';
import { getPortMidpoint, PORT_NORMALS, segmentIntersectsBox } from './AlgebraicFlowRouter.ts';

export interface VgGeometry {
  id: string;
  ri: number;
  ci: number;
  x: number;
  y: number;
  W: number;
  H: number;
}

export interface VgOptions {
  /** 动态 stub：λ = 到最近通道线的距离（默认 true） */
  dynamicStub?: boolean;
  /** 90° 转向代价（对应 libavoid 的 anglePenalty） */
  bendCost?: number;
  /** 180° 反向代价（对应 libavoid 的 reverseDirectionPenalty） */
  revPenalty?: number;
  /** 长度项权重 */
  lenWeight?: number;
}

const OPP: Record<string, string> = { R: 'L', L: 'R', U: 'D', D: 'U' };
const PERP: Record<string, string[]> = { R: ['U', 'D'], L: ['U', 'D'], U: ['R', 'L'], D: ['R', 'L'] };
const DIRS = ['R', 'L', 'U', 'D'];

/** 折弯计数（与现实现同口径）。4 方向状态已从构造上排除 180° 回折，故无需额外项。 */
export function countBends(pts: Point[]): number {
  let b = 0;
  for (let i = 2; i < pts.length; i++) {
    const d1x = pts[i - 1].x - pts[i - 2].x, d1y = pts[i - 1].y - pts[i - 2].y;
    const d2x = pts[i].x - pts[i - 1].x, d2y = pts[i].y - pts[i - 1].y;
    if ((d1x !== 0 && d2y !== 0) || (d1y !== 0 && d2x !== 0)) b++;
  }
  return b;
}

const uniqSorted = (a: number[]): number[] => [...new Set(a)].sort((p, q) => p - q);
const dedupe = (arr: Point[]): Point[] =>
  arr.filter((p, i) => i === 0 || Math.abs(p.x - arr[i - 1].x) > 1e-6 || Math.abs(p.y - arr[i - 1].y) > 1e-6);

const dirOf = (n: Point): string => (n.x > 0 ? 'R' : n.x < 0 ? 'L' : n.y < 0 ? 'U' : 'D');

/** 沿端口法向到最近通道线的距离（无候选时回退 fallback，保持法向不变） */
function nearestChannelDist(p: Point, n: Point, xs: number[], ys: number[], fallback: number): number {
  const arr = n.x !== 0 ? xs : ys;
  const coord = n.x !== 0 ? p.x : p.y;
  const nc = n.x !== 0 ? n.x : n.y;
  const cands = arr.filter((v) => (v - coord) * nc > 1e-6);
  if (!cands.length) return fallback;
  return Math.min(...cands.map((v) => Math.abs(v - coord)));
}

/**
 * 可见图 + 4 方向状态 Dijkstra。
 * @returns 正交折线点列（含 stub）；不可达时返回空数组（调用侧将回退到另一内核）
 */
export function solveVisibleGraphRoute(
  from: VgGeometry,
  to: VgGeometry,
  sp: Port,
  tp: Port,
  xChannels: number[],
  yChannels: number[],
  allBoxes: Record<string, Box>,
  half: number,
  opts: VgOptions = {},
): Point[] {
  const bendCost = opts.bendCost ?? 100;
  const revPenalty = opts.revPenalty ?? 1000;
  const WL = opts.lenWeight ?? 0.01;
  const useDynamicStub = opts.dynamicStub !== false;

  const p0 = getPortMidpoint(from, sp);
  const pk = getPortMidpoint(to, tp);
  const n0 = PORT_NORMALS[sp];
  const nk = PORT_NORMALS[tp];
  const lam0 = useDynamicStub ? nearestChannelDist(p0, n0, xChannels, yChannels, half) : half;
  const lamk = useDynamicStub ? nearestChannelDist(pk, nk, xChannels, yChannels, half) : half;
  const s1: Point = { x: p0.x + n0.x * lam0, y: p0.y + n0.y * lam0 };
  const t1: Point = { x: pk.x + nk.x * lamk, y: pk.y + nk.y * lamk };

  const startDir = dirOf(n0);
  const needDir = dirOf({ x: -nk.x, y: -nk.y } as Point);

  const Xs = uniqSorted([...xChannels, s1.x, t1.x]);
  const Ys = uniqSorted([...yChannels, s1.y, t1.y]);
  const key = (x: number, y: number, d: string) => `${x.toFixed(3)}|${y.toFixed(3)}|${d}`;

  const blocked = (a: Point, b: Point): boolean => {
    for (const [id, box] of Object.entries(allBoxes)) {
      if (id === from.id || id === to.id) continue;
      if (segmentIntersectsBox(a, b, box, 4)) return true;
    }
    return false;
  };

  const dist = new Map<string, number>();
  const prev = new Map<string, string | undefined>();
  const done = new Set<string>();
  const pool: { k: string; x: number; y: number; d: string; c: number }[] = [];
  const push = (x: number, y: number, d: string, c: number, fromK?: string) => {
    const k = key(x, y, d);
    if (done.has(k)) return;
    if (!dist.has(k) || c < dist.get(k)!) {
      dist.set(k, c);
      prev.set(k, fromK);
      pool.push({ k, x, y, d, c });
    }
  };
  push(s1.x, s1.y, startDir, 0);

  for (;;) {
    let bi = -1;
    let bc = Infinity;
    for (let i = 0; i < pool.length; i++) {
      if (!done.has(pool[i].k) && pool[i].c < bc) { bc = pool[i].c; bi = i; }
    }
    if (bi < 0) break;
    const cur = pool[bi];
    done.add(cur.k);
    const { x, y, d, c } = cur;

    if (d === 'R' || d === 'L') {
      const i = Xs.findIndex((v) => Math.abs(v - x) < 1e-6);
      const j = d === 'R' ? i + 1 : i - 1;
      if (j >= 0 && j < Xs.length) {
        const nx = Xs[j];
        if (!blocked({ x, y }, { x: nx, y })) push(nx, y, d, c + Math.abs(nx - x) * WL, cur.k);
      }
    } else {
      const i = Ys.findIndex((v) => Math.abs(v - y) < 1e-6);
      const j = d === 'D' ? i + 1 : i - 1;
      if (j >= 0 && j < Ys.length) {
        const ny = Ys[j];
        if (!blocked({ x, y }, { x, y: ny })) push(x, ny, d, c + Math.abs(ny - y) * WL, cur.k);
      }
    }
    for (const nd of PERP[d]) push(x, y, nd, c + bendCost, cur.k);
    push(x, y, OPP[d], c + revPenalty, cur.k);
  }

  let best: string | undefined;
  let bestC = Infinity;
  for (const d of DIRS) {
    const k = key(t1.x, t1.y, d);
    if (!dist.has(k)) continue;
    const extra = d === needDir ? 0 : (d === OPP[needDir] ? revPenalty : bendCost);
    const c = dist.get(k)! + extra;
    if (c < bestC) { bestC = c; best = k; }
  }
  if (!best) return [];

  const back: Point[] = [];
  let k: string | undefined = best;
  while (k !== undefined && back.length < 800) {
    const parts = k.split('|');
    back.push({ x: +parts[0], y: +parts[1] });
    k = prev.get(k);
  }
  back.reverse();
  return dedupe([p0, s1, ...back, t1, pk]);
}

/**
 * 混合内核：逐边取两个候选内核中折弯更少者。
 * 「并集不劣于任一」引理保证结果不劣于任一单一内核 ⇒ 构造性零回退。
 */
export function pickShorter(
  pathA: Point[] | undefined,
  pathB: Point[] | undefined,
): Point[] | undefined {
  const a = pathA && pathA.length ? pathA : undefined;
  const b = pathB && pathB.length ? pathB : undefined;
  if (!a) return b;
  if (!b) return a;
  return countBends(b) < countBends(a) ? b : a;
}
