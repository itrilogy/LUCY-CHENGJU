/**
 * IQS-Flow · L4 混合内核 · 端口坐标下降
 *
 * 依据：
 *   · `docs/flow/math/FLOW_ROUTING_MATH_DIRECTIONS.md` §2 D3 / §3.3（交替优化，Φ 单调终止）
 *   · `docs/flow/design/FLOW_ROUTING_EXCLUSIVITY_DESIGN.md`（R23 红线）
 *
 * 层 0（硬）：A1 `Dirs_in ∩ Dirs_out = ∅`，**含网关、含 DOC 虚边**。同入/同出可复用（A3）。
 * 层 1–3（软）：背向罚 1000 + 折弯（含回折）+ 长度。
 * 侧染色从贪心初值冻结：已是 IN 的侧不能再作出，已是 OUT 的侧不能再作入；UNUSED 可升级。
 */
import type { Port, NodeGeometry, EdgeSpec, Point } from './AlgebraicFlowRouter.ts';
import { solveAlgebraicPorts, PORT_NORMALS, solveAlgebraicRoute } from './AlgebraicFlowRouter.ts';
import { countBends, pathLength } from './VisibleGraphRouter.ts';

const DIRS: Port[] = ['T', 'B', 'L', 'R'];
const BACK_FACING_PENALTY = 1000;
const BEND_WEIGHT = 100; // 与发布版 AlgebraicFlowRouter.computeCost 同口径
const LEN_WEIGHT = 0.01;
const DETOUR_RATIO = 2.5;
const DETOUR_PENALTY = 400;

export type SideRole = 'UNUSED' | 'IN' | 'OUT';

export interface PortOptimizeOptions {
  maxIter?: number;
  dynamicStub?: boolean;
}

export interface PortSlot { index: number; count: number }

export interface PortOptimizeResult {
  sourcePorts: Map<string, Port>;
  targetPorts: Map<string, Port>;
  sourceSlots: Map<string, PortSlot>;
  targetSlots: Map<string, PortSlot>;
  roles: Map<string, Record<Port, SideRole>>;
}

function emptyRoles(): Record<Port, SideRole> {
  return { T: 'UNUSED', B: 'UNUSED', L: 'UNUSED', R: 'UNUSED' };
}

/** 由当前入/出占用冻结侧角色（A1 可行划分）。 */
export function colorSidesFromSets(
  nodeIds: Iterable<string>,
  insAt: Map<string, Set<Port>>,
  outsAt: Map<string, Set<Port>>,
): Map<string, Record<Port, SideRole>> {
  const roles = new Map<string, Record<Port, SideRole>>();
  for (const id of nodeIds) {
    const rec = emptyRoles();
    for (const d of DIRS) {
      const inn = insAt.get(id)?.has(d) ?? false;
      const out = outsAt.get(id)?.has(d) ?? false;
      if (inn && out) rec[d] = 'OUT';
      else if (inn) rec[d] = 'IN';
      else if (out) rec[d] = 'OUT';
    }
    roles.set(id, rec);
  }
  return roles;
}

export function assignPortSlots(
  nodes: NodeGeometry[],
  edges: EdgeSpec[],
  sourcePorts: Map<string, Port>,
  targetPorts: Map<string, Port>,
): { sourceSlots: Map<string, PortSlot>; targetSlots: Map<string, PortSlot> } {
  const geo = new Map(nodes.map((n) => [n.id, n]));
  const valid = edges.filter((e) => geo.has(e.from) && geo.has(e.to));
  const outGroups = new Map<string, EdgeSpec[]>();
  const inGroups = new Map<string, EdgeSpec[]>();
  const gk = (id: string, p: Port) => `${id}:${p}`;
  for (const e of valid) {
    const sk = gk(e.from, sourcePorts.get(e.id) ?? 'R');
    const tk = gk(e.to, targetPorts.get(e.id) ?? 'T');
    if (!outGroups.has(sk)) outGroups.set(sk, []);
    outGroups.get(sk)!.push(e);
    if (!inGroups.has(tk)) inGroups.set(tk, []);
    inGroups.get(tk)!.push(e);
  }
  const sortAlong = (group: EdgeSpec[], nodeId: string, dir: Port, isOut: boolean) => {
    const alongY = dir === 'L' || dir === 'R';
    group.sort((a, b) => {
      const oa = geo.get(isOut ? a.to : a.from)!;
      const ob = geo.get(isOut ? b.to : b.from)!;
      return alongY ? oa.y - ob.y : oa.x - ob.x;
    });
  };
  const sourceSlots = new Map<string, PortSlot>();
  const targetSlots = new Map<string, PortSlot>();
  for (const [k, group] of outGroups) {
    const [id, dir] = k.split(':') as [string, Port];
    sortAlong(group, id, dir, true);
    group.forEach((e, i) => sourceSlots.set(e.id, { index: i, count: group.length }));
  }
  for (const [k, group] of inGroups) {
    const [id, dir] = k.split(':') as [string, Port];
    sortAlong(group, id, dir, false);
    group.forEach((e, i) => targetSlots.set(e.id, { index: i, count: group.length }));
  }
  return { sourceSlots, targetSlots };
}

export function optimizePorts(
  nodes: NodeGeometry[],
  edges: EdgeSpec[],
  channels: { xChannels: number[]; yChannels: number[] },
  half: number,
  opts: PortOptimizeOptions = {},
): PortOptimizeResult {
  const maxIter = opts.maxIter ?? 3;
  const init = solveAlgebraicPorts(nodes, edges);

  const geo = new Map(nodes.map((n) => [n.id, n]));
  const valid = edges.filter((e) => geo.has(e.from) && geo.has(e.to));
  const boxes: Record<string, { x0: number; y0: number; x1: number; y1: number }> = {};
  for (const n of nodes) {
    boxes[n.id] = { x0: n.x - n.W / 2, y0: n.y - n.H / 2, x1: n.x + n.W / 2, y1: n.y + n.H / 2 };
  }

  const src = new Map<string, Port>();
  const tgt = new Map<string, Port>();
  for (const e of valid) {
    src.set(e.id, init.sourcePorts.get(e.id) ?? 'R');
    tgt.set(e.id, init.targetPorts.get(e.id) ?? 'T');
  }

  const outsAt = new Map<string, Set<Port>>();
  const insAt = new Map<string, Set<Port>>();
  const addTo = (m: Map<string, Set<Port>>, k: string, v: Port) => {
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(v);
  };
  const rmFrom = (m: Map<string, Set<Port>>, k: string, v: Port) => { m.get(k)?.delete(v); };
  for (const e of valid) { addTo(outsAt, e.from, src.get(e.id)!); addTo(insAt, e.to, tgt.get(e.id)!); }

  const nodeIds = new Set<string>([...valid.map((e) => e.from), ...valid.map((e) => e.to)]);
  const roles = colorSidesFromSets(nodeIds, insAt, outsAt);

  // A1：已是入的侧不能作出，已是出的侧不能作入。UNUSED 可升级（第二出/入侧）。
  const legalSp = (fromId: string, sp: Port) => (roles.get(fromId)?.[sp] ?? 'UNUSED') !== 'IN';
  const legalTp = (toId: string, tp: Port) => (roles.get(toId)?.[tp] ?? 'UNUSED') !== 'OUT';

  const claim = (fromId: string, sp: Port, toId: string, tp: Port) => {
    const rf = roles.get(fromId) ?? emptyRoles();
    const rt = roles.get(toId) ?? emptyRoles();
    if (rf[sp] === 'UNUSED') rf[sp] = 'OUT';
    if (rt[tp] === 'UNUSED') rt[tp] = 'IN';
    roles.set(fromId, rf);
    roles.set(toId, rt);
  };

  const project = (e: EdgeSpec, sp: Port, tp: Port): [Port, Port] => {
    let s = sp, t = tp;
    if (!legalSp(e.from, s)) s = DIRS.find((d) => legalSp(e.from, d)) ?? s;
    if (!legalTp(e.to, t)) t = DIRS.find((d) => legalTp(e.to, d)) ?? t;
    return [s, t];
  };

  for (const e of valid) {
    const [s, t] = project(e, src.get(e.id)!, tgt.get(e.id)!);
    if (s !== src.get(e.id) || t !== tgt.get(e.id)) {
      rmFrom(outsAt, e.from, src.get(e.id)!);
      rmFrom(insAt, e.to, tgt.get(e.id)!);
      src.set(e.id, s);
      tgt.set(e.id, t);
      addTo(outsAt, e.from, s);
      addTo(insAt, e.to, t);
    }
    claim(e.from, src.get(e.id)!, e.to, tgt.get(e.id)!);
  }

  const backFacing = (e: EdgeSpec, sp: Port, tp: Port): number => {
    const u = geo.get(e.from)!, v = geo.get(e.to)!;
    const dx = v.x - u.x, dy = v.y - u.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const out = PORT_NORMALS[sp].x * ux + PORT_NORMALS[sp].y * uy;
    const inc = -(PORT_NORMALS[tp].x * ux + PORT_NORMALS[tp].y * uy);
    return (out < -1e-6 ? 1 : 0) + (inc < -1e-6 ? 1 : 0);
  };
  const facingDot = (from: NodeGeometry, to: NodeGeometry, port: Port, asOut: boolean): number => {
    const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1;
    const n = PORT_NORMALS[port];
    const dot = n.x * (dx / d) + n.y * (dy / d);
    return asOut ? dot : -dot;
  };
  const outsFrom = new Map<string, EdgeSpec[]>();
  const insTo = new Map<string, EdgeSpec[]>();
  for (const e2 of valid) {
    if (!outsFrom.has(e2.from)) outsFrom.set(e2.from, []);
    outsFrom.get(e2.from)!.push(e2);
    if (!insTo.has(e2.to)) insTo.set(e2.to, []);
    insTo.get(e2.to)!.push(e2);
  }
  const stealCost = (e: EdgeSpec, sp: Port, tp: Port): number => {
    let s = 0;
    for (const e2 of outsFrom.get(e.to) ?? []) {
      if (e2.id === e.id) continue;
      const a = geo.get(e2.from)!, b = geo.get(e2.to)!;
      if (facingDot(a, b, tp, true) > 1e-6) s += 80;
    }
    for (const e2 of insTo.get(e.from) ?? []) {
      if (e2.id === e.id) continue;
      const a = geo.get(e2.from)!, b = geo.get(e2.to)!;
      if (facingDot(a, b, sp, false) > 1e-6) s += 80;
    }
    return s;
  };
  /** 下降阶段只用代数内核（D3 在代数势能上交替）。可见图 Dijkstra 留给最终渲染。 */
  const algCache = new Map<string, Point[]>();
  const algebraicOf = (e: EdgeSpec, sp: Port, tp: Port): Point[] => {
    const k = `${e.from}|${e.to}|${sp}|${tp}`;
    const hit = algCache.get(k);
    if (hit) return hit;
    const u = geo.get(e.from)!, v = geo.get(e.to)!;
    const pts = solveAlgebraicRoute(u, v, sp, tp, channels.xChannels, channels.yChannels, boxes, half, { selfBoxStrict: true });
    const out = pts && pts.length >= 2 ? pts : [];
    algCache.set(k, out);
    return out;
  };
  const costOf = (e: EdgeSpec, sp: Port, tp: Port): number => {
    const u = geo.get(e.from)!, v = geo.get(e.to)!;
    const pts = algebraicOf(e, sp, tp);
    if (pts.length < 2) return Infinity;
    const len = pathLength(pts);
    const manh = Math.abs(v.x - u.x) + Math.abs(v.y - u.y) || 1;
    const detour = len > DETOUR_RATIO * manh ? DETOUR_PENALTY + (len - DETOUR_RATIO * manh) * LEN_WEIGHT : 0;
    return BACK_FACING_PENALTY * backFacing(e, sp, tp) + BEND_WEIGHT * countBends(pts) + LEN_WEIGHT * len + detour + stealCost(e, sp, tp);
  };

  const cur = new Map<string, number>();
  for (const e of valid) cur.set(e.id, costOf(e, src.get(e.id)!, tgt.get(e.id)!));

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    const order = [...valid].sort((a, b) => (cur.get(b.id) ?? 0) - (cur.get(a.id) ?? 0));
    for (const e of order) {
      const curCost = cur.get(e.id) ?? Infinity;
      let best = { sp: src.get(e.id)!, tp: tgt.get(e.id)!, b: curCost };

      // DOC 虚边保持贪心初值（发布版：priority 1000 + 固定 L→R/B/T），下降会把它赶到整图外圈。
      if (e.isDoc || e.condition === '__doc__') continue;

      rmFrom(outsAt, e.from, src.get(e.id)!);
      rmFrom(insAt, e.to, tgt.get(e.id)!);
      const inAtFrom = insAt.get(e.from);
      const outAtTo = outsAt.get(e.to);
      const curBad = !legalSp(e.from, src.get(e.id)!) || !legalTp(e.to, tgt.get(e.id)!)
        || (inAtFrom?.has(src.get(e.id)!)) || (outAtTo?.has(tgt.get(e.id)!));
      if (curBad) best = { sp: src.get(e.id)!, tp: tgt.get(e.id)!, b: Infinity };

      for (const sp of DIRS) {
        if (!legalSp(e.from, sp)) continue;
        if (inAtFrom?.has(sp)) continue;
        for (const tp of DIRS) {
          if (!legalTp(e.to, tp)) continue;
          if (outAtTo?.has(tp)) continue;
          const b = costOf(e, sp, tp);
          if (b < best.b) best = { sp, tp, b };
        }
      }
      addTo(outsAt, e.from, best.sp);
      addTo(insAt, e.to, best.tp);
      claim(e.from, best.sp, e.to, best.tp);
      if (best.sp !== src.get(e.id) || best.tp !== tgt.get(e.id)) {
        src.set(e.id, best.sp);
        tgt.set(e.id, best.tp);
        cur.set(e.id, best.b);
        changed = true;
      } else {
        cur.set(e.id, best.b);
      }
    }
    if (!changed) break;
  }

  const { sourceSlots, targetSlots } = assignPortSlots(nodes, valid, src, tgt);
  return { sourcePorts: src, targetPorts: tgt, sourceSlots, targetSlots, roles };
}
