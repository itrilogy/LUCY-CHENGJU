/**
 * IQS-Flow 主干序（Mainline Order）—— 关键路径优先排序键
 *
 * 目的：
 *   为「无 Location 节点落格序 / 同格 vh 链序」提供主干优先的确定性排序，
 *   替代纯声明序 / 二维「行优先扫描」，使主干沿主流程顺滑推进、减少连线交叉与扩展格。
 *   对应讨论共识：步骤1「最短关键路径优先，其他节点再扩展格」的算法部件。
 *
 * 算法（纯函数，无副作用，可单测）：
 *   1. 只取顶层节点/边（parent 子流程内部不参与）；
 *   2. Tarjan SCC 缩点去环 → 得到 DAG（回边/循环去环，避免「节点数最多路径」在有环图上非良定义）；
 *   3. DAG 上以 (default 加成 bonus, 节点数 count) 元组做最长路 DP —— default 边加成使业务主干优先；
 *   4. 从「入度 0 且含 start 节点（或退化第一个）」的 comp 沿 best.next 还原主线路径；
 *   5. 输出顺序 = 主线 comp 内节点（沿主线）先，其余节点按拓扑序补在主线后。
 *
 * 二维 autoSeq（无 Location）已按本函数结果取节点再填空格（见 computeExcelLayout）。
 * 单维 / ROOT 仍走声明序，避免改动 ALIGN-1。
 */
import type { FlowNode, FlowEdge } from '../../types';
import { tarjanSCC } from './scc.ts';

export interface MainlineOpts {
  /** default 边加成（默认 10），使 default 主线优先于非 default 分支 */
  defaultBonus?: number;
}

export function computeMainlineOrder(nodes: FlowNode[], edges: FlowEdge[], opts?: MainlineOpts): string[] {
  const defaultBonus = opts?.defaultBonus ?? 10;
  const top = nodes.filter((n) => !n.parent);
  const ids = new Set(top.map((n) => n.id));
  const topEdges = edges.filter((e) => !e.parent && ids.has(e.from) && ids.has(e.to));

  // ---- 1. 邻接表 ----
  const adj = new Map<string, { to: string; def: boolean }[]>();
  for (const n of top) adj.set(n.id, []);
  for (const e of topEdges) adj.get(e.from)!.push({ to: e.to, def: e.default });

  // ---- 2. Tarjan SCC（共享 scc.ts）----
  const sccAdj = new Map<string, string[]>();
  for (const n of top) sccAdj.set(n.id, (adj.get(n.id) ?? []).map((x) => x.to));
  const { compOf, components } = tarjanSCC(top.map((n) => n.id), sccAdj);
  const compCount = components.length;

  // ---- 3. 聚合 comp、建 DAG（去重）+ 入度 ----
  const compNodes: string[][] = Array.from({ length: compCount }, () => []);
  for (const n of top) compNodes[compOf.get(n.id)!].push(n.id);
  const compAdj: { to: number; def: boolean }[][] = Array.from({ length: compCount }, () => []);
  const compIndeg = new Array(compCount).fill(0);
  for (const e of topEdges) {
    const a = compOf.get(e.from)!, b = compOf.get(e.to)!;
    if (a !== b) compAdj[a].push({ to: b, def: e.default });
  }
  for (let a = 0; a < compCount; a++) {
    const seen = new Set<number>();
    compAdj[a] = compAdj[a].filter((x) => {
      if (seen.has(x.to)) return false;
      seen.add(x.to);
      return true;
    });
  }
  for (let a = 0; a < compCount; a++) for (const x of compAdj[a]) compIndeg[x.to]++;

  // ---- 4. Kahn 拓扑序 ----
  const topo: number[] = [];
  const indeg = [...compIndeg];
  const q: number[] = [];
  for (let c = 0; c < compCount; c++) if (indeg[c] === 0) q.push(c);
  while (q.length) {
    const c = q.shift()!;
    topo.push(c);
    for (const x of compAdj[c]) if (--indeg[x.to] === 0) q.push(x.to);
  }

  // ---- 5. 逆拓扑最长路 DP（(bonus, count) 元组，default 优先）----
  const best = Array.from({ length: compCount }, () => ({ bonus: 0, count: 0, next: -1 }));
  for (const c of [...topo].reverse()) {
    best[c] = { bonus: 0, count: compNodes[c].length, next: -1 };
    for (const x of compAdj[c]) {
      const cand = {
        bonus: (x.def ? defaultBonus : 0) + best[x.to].bonus,
        count: compNodes[c].length + best[x.to].count,
        next: x.to,
      };
      if (cand.bonus > best[c].bonus || (cand.bonus === best[c].bonus && cand.count > best[c].count)) {
        best[c] = cand;
      }
    }
  }

  // ---- 6. 起点 comp：入度 0 且含 start 节点优先，否则含 start / 第一个 ----
  const noIn = new Set<number>();
  for (let c = 0; c < compCount; c++) if (compIndeg[c] === 0) noIn.add(c);
  let startComp = -1, startBest = -1;
  for (const c of noIn) {
    const hasStart = compNodes[c].some((id) => {
      const n = nodes.find((x) => x.id === id);
      return !!n && (n.type as string) === 'start';
    });
    const score = (hasStart ? 1e6 : 0) + best[c].bonus;
    if (score > startBest) { startBest = score; startComp = c; }
  }
  if (startComp < 0) startComp = compOf.get(top[0]?.id ?? '') ?? 0;

  // ---- 7. 还原主线 comp 序列（沿 best.next，防环兜底）----
  const mainline: number[] = [];
  let cur = startComp;
  const guard = compCount + 1;
  while (cur >= 0 && mainline.length < guard && !mainline.includes(cur)) {
    mainline.push(cur);
    cur = best[cur].next;
  }
  const mainlineSet = new Set(mainline);

  // ---- 8. 输出：主线节点先，其余按拓扑序 ----
  const order: string[] = [];
  const inOrder = new Set<string>();
  for (const c of mainline) for (const id of compNodes[c]) { order.push(id); inOrder.add(id); }
  for (const c of topo) {
    if (mainlineSet.has(c)) continue;
    for (const id of compNodes[c]) if (!inOrder.has(id)) { order.push(id); inOrder.add(id); }
  }
  for (const n of top) if (!inOrder.has(n.id)) order.push(n.id);
  return order;
}
