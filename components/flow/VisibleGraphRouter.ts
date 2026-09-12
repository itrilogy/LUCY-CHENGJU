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
import { getPortMidpoint, PORT_NORMALS, segmentIntersectsBox, solveAlgebraicRoute, cleanOrthogonalPath } from './AlgebraicFlowRouter.ts';

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
  /**
   * 是否严格禁止穿过**源/目标节点自身**的盒体（默认 true）。
   * `false` 为兜底档：`FLOW_OPTIMALITY_FRAMEWORK.md` 的 A4（无碰撞）是**软约束**（AUD-027），
   * 严格判定下不可达时由 `solveRouteHybrid` 自动放宽重试 —— 宁可穿盒，不可缺线。
   */
  selfBoxStrict?: boolean;
  /** 槽位端点（同侧复用时偏离中点）；缺省则用边几何中点 */
  portFrom?: Point;
  portTo?: Point;
}

const OPP: Record<string, string> = { R: 'L', L: 'R', U: 'D', D: 'U' };
const PERP: Record<string, string[]> = { R: ['U', 'D'], L: ['U', 'D'], U: ['R', 'L'], D: ['R', 'L'] };
const DIRS = ['R', 'L', 'U', 'D'];

/**
 * 折弯计数（与 `solveAlgebraicRoute.computeCost` **同口径**）。
 * `AUD-083/107 余项`：原判据只按轴向，**漏计 180° 反向回折**，致「绕外侧再折回」的畸形路径
 * 在端口选择（`PortOptimizer.bendsOf`）与混合内核择优（`pickShorter`）中被系统性低估 → 回折路胜出。
 * 现补入符号项：180° 回折 ≈ 两次转弯。
 */
export function countBends(pts: Point[]): number {
  let b = 0;
  for (let i = 2; i < pts.length; i++) {
    const d1x = pts[i - 1].x - pts[i - 2].x, d1y = pts[i - 1].y - pts[i - 2].y;
    const d2x = pts[i].x - pts[i - 1].x, d2y = pts[i].y - pts[i - 1].y;
    if ((d1x !== 0 && d2y !== 0) || (d1y !== 0 && d2x !== 0)) b++;
    else if (d1x * d2x + d1y * d2y < 0) b += 2;
  }
  return b;
}

/** 曼哈顿总长（用作折弯数相同时的次关键字，抑制无谓绕行） */
export function pathLength(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
  return len;
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
  const selfBoxStrict = opts.selfBoxStrict !== false;

  const p0 = opts.portFrom ?? getPortMidpoint(from, sp);
  const pk = opts.portTo ?? getPortMidpoint(to, tp);
  const n0 = PORT_NORMALS[sp];
  const nk = PORT_NORMALS[tp];
  // ① 3×3 绘制格：stub = 连线区宽度 `half`（与 AlgebraicFlowRouter 同一数学，禁止短于一格走廊）
  const lam0 = useDynamicStub ? Math.max(half, nearestChannelDist(p0, n0, xChannels, yChannels, half)) : half;
  const lamk = useDynamicStub ? Math.max(half, nearestChannelDist(pk, nk, xChannels, yChannels, half)) : half;
  const s1: Point = { x: p0.x + n0.x * lam0, y: p0.y + n0.y * lam0 };
  const t1: Point = { x: pk.x + nk.x * lamk, y: pk.y + nk.y * lamk };

  const startDir = dirOf(n0);
  const needDir = dirOf({ x: -nk.x, y: -nk.y } as Point);

  // 发布版代数内核先搜源宿局部包围盒（±数格），全图外圈只作最后手段。
  // 可见图若直接吞下全部 xChannels（含 gridRight 外缘），会走出「顶边横贯整图」的 4 弯绕行。
  const pad = Math.max(half * 8, Math.max(from.W + to.W, from.H + to.H) / 2 + half * 4);
  const minX = Math.min(from.x, to.x, p0.x, pk.x, s1.x, t1.x) - pad;
  const maxX = Math.max(from.x, to.x, p0.x, pk.x, s1.x, t1.x) + pad;
  const minY = Math.min(from.y, to.y, p0.y, pk.y, s1.y, t1.y) - pad;
  const maxY = Math.max(from.y, to.y, p0.y, pk.y, s1.y, t1.y) + pad;
  const locX = xChannels.filter((x) => x >= minX && x <= maxX);
  const locY = yChannels.filter((y) => y >= minY && y <= maxY);
  const Xs = uniqSorted([...(locX.length ? locX : xChannels), s1.x, t1.x]);
  const Ys = uniqSorted([...(locY.length ? locY : yChannels), s1.y, t1.y]);
  const key = (x: number, y: number, d: string) => `${x.toFixed(3)}|${y.toFixed(3)}|${d}`;

  /**
   * 碰撞检测。原实现把**源/目标节点自身**的盒体整体跳过
   * （`if (id === from.id || id === to.id) continue`），于是「绕出去再折回、穿过自己盒子」的畸形路径
   * 被判为无碰撞，凭折弯数更少而胜出。修正：自身盒体**仍须检测**，只把判定盒**收缩 3px** ——
   * 出线 stub 段自盒边界出发不会进入收缩盒，而任何真正穿回盒体的段必然命中。
   * `selfBoxStrict:false` 为兜底档（A4 软约束，见 `VgOptions`）。
   */
  const blocked = (a: Point, b: Point): boolean => {
    for (const [id, box] of Object.entries(allBoxes)) {
      const self = id === from.id || id === to.id;
      if (self && !selfBoxStrict) continue;
      if (segmentIntersectsBox(a, b, box, self ? -3 : 4)) return true;
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
 * `AUD-083/107 余项`：折弯数由 `countBends` 提供，**已含 180° 回折项** ——
 * 否则「绕外侧再折回」的畸形路径会在择优中被低估。
 */
export function pickShorter(
  pathA: Point[] | undefined,
  pathB: Point[] | undefined,
): Point[] | undefined {
  const a = pathA && pathA.length ? pathA : undefined;
  const b = pathB && pathB.length ? pathB : undefined;
  if (!a) return b;
  if (!b) return a;
  const ba = countBends(a), bb = countBends(b);
  if (ba !== bb) return bb < ba ? b : a;
  return pathLength(b) < pathLength(a) ? b : a;
}

/**
 * **单一真源**：一条边的最终路径 = 混合内核（代数候选 ⊕ 可见图候选，取折弯更少者），
 * 并在严格判定无解时按 A4 软约束放宽兜底。
 *
 * 为什么必须是单一真源：此前 `flowToSVG`（渲染）与 `PortOptimizer`（端口评估）**各自复制**了
 * 「调两内核 + `pickShorter`」的编排代码，两处口径一旦分叉，端口选择就会按「与最终渲染不同」
 * 的代价函数做决定（`AUD-141` 排查中确认的口径风险）。
 */
export function solveRouteHybrid(
  u: VgGeometry,
  v: VgGeometry,
  sp: Port,
  tp: Port,
  xChannels: number[],
  yChannels: number[],
  allBoxes: Record<string, Box>,
  half: number,
  opts: VgOptions = {},
): Point[] {
  const finish = (p: Point[] | undefined) => (p && p.length >= 2 ? cleanOrthogonalPath(p) : []);
  const alg = finish(solveAlgebraicRoute(u, v, sp, tp, xChannels, yChannels, allBoxes, half, {
    selfBoxStrict: true, portFrom: opts.portFrom, portTo: opts.portTo,
  }));
  // 三折线上界：代数核已 ≤2 弯则不必跑可见图 Dijkstra（打开示例的主要耗时）
  if (alg.length >= 2 && countBends(alg) <= 2) return alg;
  const vg = finish(solveVisibleGraphRoute(u, v, sp, tp, xChannels, yChannels, allBoxes, half, { ...opts, selfBoxStrict: true }));
  const strict = finish(pickShorter(alg, vg));
  if (strict.length >= 2) return strict;
  /**
   * 兜底档。范式依据：`FLOW_OPTIMALITY_FRAMEWORK.md` A4（无碰撞）**实为软约束**（AUD-027）——
   * 当「不穿任何盒（含自身盒）」在通道网格上不可达时，放宽为「不穿**其他**节点的盒」，
   * 宁可穿自身盒也不让边消失（缺线是硬缺陷，穿盒是软缺陷）。
   */
  const loose = finish(pickShorter(
    solveAlgebraicRoute(u, v, sp, tp, xChannels, yChannels, allBoxes, half, { selfBoxStrict: false, portFrom: opts.portFrom, portTo: opts.portTo }),
    solveVisibleGraphRoute(u, v, sp, tp, xChannels, yChannels, allBoxes, half, { ...opts, selfBoxStrict: false }),
  ));
  return loose.length >= 2 ? loose : strict;
}
