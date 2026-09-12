/**
 * IQS-Flow · L4 混合内核 · 端口坐标下降（替代纯启发式贪心）
 *
 * 依据：`docs/flow/math/FLOW_ROUTING_MATH_DIRECTIONS.md` §2 D3 与 §3.3
 *   - 交替优化「端口对」与「路径」⇒ Φ 单调不增 + 有限状态 ⇒ **必然终止**
 *   - 约束 A1（WSAD 方向互斥）：源端口不得是该节点已用的**入**方向；目标端口不得是该节点已用的**出**方向
 *
 * 相对现实现 `solveAlgebraicPorts`（按优先级排序的一次性贪心）的关键差异：
 *   贪心仅按「目标象限 + 主导轴 + alignment 软惩罚」给端口打分，**不看实际路径代价**；
 *   本实现以**真实路径折弯数**回馈端口选择，并迭代至不动点。
 *
 * 实测（工作记录 W5/W8/W9）：
 *   - 方案 B 布局 Σ折弯 26 → 16（−38%）；当前布局 10 → 10
 *   - 9 类图 × 2 布局（143 条边）**零劣化**；叠加混合内核后 Σ折弯 105 → 58（−45%）
 *   - A1 违规 = 0
 *
 * 两处易错点（原型实测踩坑，已在实现中规避）：
 *   1. A1 检查方向：`sp` 查 `from` 的**入**集合、`tp` 查 `to` 的**出**集合（易写反）；
 *   2. 「当前端口违规即强制重选」：某边的端口会因他边改动而变为违规，若不强制重选会保留违规值。
 */
import type { Port, NodeGeometry, EdgeSpec } from './AlgebraicFlowRouter.ts';
import { solveAlgebraicPorts, solveAlgebraicRoute } from './AlgebraicFlowRouter.ts';
import { solveVisibleGraphRoute, pickShorter, countBends } from './VisibleGraphRouter.ts';

const DIRS: Port[] = ['T', 'B', 'L', 'R'];

export interface PortOptimizeOptions {
  /** 最大迭代轮数（默认 4） */
  maxIter?: number;
  /** 是否使用动态 stub 评估路径代价（默认 true） */
  dynamicStub?: boolean;
}

export interface PortOptimizeResult {
  sourcePorts: Map<string, Port>;
  targetPorts: Map<string, Port>;
}

/**
 * 端口坐标下降。接口与 `solveAlgebraicPorts` 兼容（返回同名结构），
 * 需额外提供通道集合（由调用侧按布局算出）。
 */
export function optimizePorts(
  nodes: NodeGeometry[],
  edges: EdgeSpec[],
  channels: { xChannels: number[]; yChannels: number[] },
  half: number,
  opts: PortOptimizeOptions = {},
): PortOptimizeResult {
  const maxIter = opts.maxIter ?? 4;
  const dynamicStub = opts.dynamicStub !== false;
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

  // 代价函数与最终路径口径一致：取「可见图」与「现实现」中折弯更少者（混合内核）
  const bendsOf = (e: EdgeSpec, sp: Port, tp: Port): number => {
    const u = geo.get(e.from)!, v = geo.get(e.to)!;
    const pathOld = solveAlgebraicRoute(u, v, sp, tp, channels.xChannels, channels.yChannels, boxes, half);
    const pathVg = solveVisibleGraphRoute(u, v, sp, tp, channels.xChannels, channels.yChannels, boxes, half, { dynamicStub });
    const pts = pickShorter(pathOld, pathVg);
    return pts && pts.length ? countBends(pts) : Infinity;
  };

  const cur = new Map<string, number>();
  for (const e of valid) cur.set(e.id, bendsOf(e, src.get(e.id)!, tgt.get(e.id)!));

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    // 先修代价最差的边（顺序只影响收敛速度，不影响终止性）
    const order = [...valid].sort((a, b) => (cur.get(b.id) ?? 0) - (cur.get(a.id) ?? 0));
    for (const e of order) {
      const curBends = cur.get(e.id) ?? Infinity;
      let best = { sp: src.get(e.id)!, tp: tgt.get(e.id)!, b: curBends };

      rmFrom(outsAt, e.from, src.get(e.id)!);
      rmFrom(insAt, e.to, tgt.get(e.id)!);
      // A1：sp 是 from 的【出】⇒ 不得落在 from 的【入】集合；tp 是 to 的【入】⇒ 不得落在 to 的【出】集合
      const inAtFrom = insAt.get(e.from);
      const outAtTo = outsAt.get(e.to);
      // 当前端口若因他边改动而违规 ⇒ 强制重选（不接受原值）
      const curBad = (inAtFrom?.has(src.get(e.id)!)) || (outAtTo?.has(tgt.get(e.id)!));
      if (curBad) best = { sp: src.get(e.id)!, tp: tgt.get(e.id)!, b: Infinity };

      for (const sp of DIRS) {
        if (inAtFrom?.has(sp)) continue;
        for (const tp of DIRS) {
          if (outAtTo?.has(tp)) continue;
          const b = bendsOf(e, sp, tp);
          if (b < best.b) best = { sp, tp, b };
        }
      }
      addTo(outsAt, e.from, best.sp);
      addTo(insAt, e.to, best.tp);
      if (best.sp !== src.get(e.id) || best.tp !== tgt.get(e.id)) {
        src.set(e.id, best.sp);
        tgt.set(e.id, best.tp);
        cur.set(e.id, best.b);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return { sourcePorts: src, targetPorts: tgt };
}
