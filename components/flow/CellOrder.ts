/**
 * IQS-Flow 交叉格内排序（Cell Order）—— 格内拓扑序 + 缺省 vh 推导
 *
 * 对应 `docs/FLOW_CELL_ORDER_DESIGN.md` 设计（用户确认排序键 = 格内拓扑序，dec-5447e9c5a255f3ac）：
 *   a. 解析先落格 + 声明序（computeExcelLayout 前半）；
 *   b. 本函数：按格内节点间 from→to 直接边做拓扑序，使流向相邻在格内也相邻；
 *      · 显式 vh 保持原值（尊重作者语义，只变"相对谁"）；
 *      · 缺省 vh（undefined）按上游方位智能推导（y大→V / x大→H / 双大→D），不再一刀切 V；
 *   c. 连线避障在前述排序之上进行（后续 unchanged）。
 *
 * 纯函数、确定性（Kahn 拓扑序 + 声明序稳定兜底）、无副作用，便于单测。
 *
 * 注意：strip-types 不支持 `--x` 前缀/`++x` 作赋值左侧，入度递减用 `set(get()-1)`。
 */
import type { FlowNode, FlowEdge } from '../../types';

export interface PlacedNode {
  n: FlowNode;
  /** 相对上一节点的槽位差；首节点为 {dx:0, dy:0}（无参照）。推导缺省 vh 用 */
  dx: number;
  dy: number;
}

/** 判断两节点在格内是否有 from→to 直接边（格内拓扑序的边集） */
function hasDirectEdge(edges: FlowEdge[], fromId: string, toId: string): boolean {
  return edges.some((e) => !e.parent && e.from === fromId && e.to === toId);
}

/**
 * 计算交叉格内节点的排列。
 *
 * @param nodes 同格的节点（原始声明序）
 * @param edges 全部分层边（内部只用非 parent 且两端都在本格内的）
 * @returns 排序后的节点数组；首节点恒为格内 (0,0)（dx=dy=0）。
 */
export function computeCellOrder(nodes: FlowNode[], edges: FlowEdge[]): PlacedNode[] {
  if (nodes.length <= 1) {
    return nodes.map((n) => ({ n, dx: 0, dy: 0 }));
  }
  const ids = new Set(nodes.map((n) => n.id));
  // 仅用本格范围内、非 parent 的直接边
  const localAdj = new Map<string, string[]>();
  const localIndeg = new Map<string, number>();
  for (const n of nodes) { localAdj.set(n.id, []); localIndeg.set(n.id, 0); }
  for (const a of nodes) {
    for (const b of nodes) {
      if (a.id !== b.id && hasDirectEdge(edges, a.id, b.id)) {
        localAdj.get(a.id)!.push(b.id);
        localIndeg.set(b.id, localIndeg.get(b.id)! + 1);
      }
    }
  }
  // Kahn 拓扑序（入度 0 入队，按声明序稳定 → 确定性）
  const q: string[] = [];
  for (const n of nodes) if (localIndeg.get(n.id) === 0) q.push(n.id);
  const topo: string[] = [];
  while (q.length) {
    const id = q.shift()!;
    topo.push(id);
    for (const t of localAdj.get(id)!) {
      localIndeg.set(t, localIndeg.get(t)! - 1);
      if (localIndeg.get(t) === 0) q.push(t);
    }
  }
  // 环/孤立兜底：拓扑序未覆盖的按声明序补（拓扑序已确定性，无需额外随机）
  const topoSet = new Set(topo);
  for (const n of nodes) if (!topoSet.has(n.id)) topo.push(n.id);

  // 整串方向种子：首个显式 vh 决定整串铺开方向（用户确认 dec-bdfe7b9c74803f50：
  //   "首节点 vh 作为整串方向种子"）。首节点仍锚定 (0,0)，但其 vh 作为 seed 向后续传播。
  // 若无任何显式 vh（nodes 顺序），seed = undefined → 缺省节点按上游累计偏移推导。
  const seedDir: 'V' | 'H' | 'D' | undefined =
    nodes.find((x) => x.vh === 'V' || x.vh === 'H' || x.vh === 'D')?.vh ?? undefined;

  // 逐节点：首节点锚定 (0,0)，后续按 vh（显式保留 / 缺省用 seed 或上游方位推导）
  const placed: PlacedNode[] = [];
  let prevGx = 0, prevGy = 0;
  topo.forEach((id, idx) => {
    const n = nodes.find((x) => x.id === id)!;
    let dgx = 0, dgy = 0;
    if (idx === 0) {
      dgx = 0; dgy = 0;
    } else {
      // 显式 vh 保持原值（尊重作者语义，只变"相对谁"）
      let dir: 'V' | 'H' | 'D' | undefined = n.vh;
      if (!dir) {
        // 缺省：优先继承整串方向种子 seedDir（保证整串一致性）；
        // 无 seed 时按"上游相对本节点的方位"推导：
        //   上游在左上对角(prevGx>0 且 prevGy>0)→本节点 D；仅水平偏移(prevGx>0 且 prevGy==0)→H；
        //   其余(垂直偏移为主)→V（最常见顺流纵向）。
        if (seedDir) dir = seedDir;
        else {
          const upX = prevGx, upY = prevGy;
          if (upX > 0 && upY > 0) dir = 'D';
          else if (upX > 0 && upY === 0) dir = 'H';
          else dir = 'V';
        }
      }
      if (dir === 'V') dgy = 1;
      else if (dir === 'H') dgx = 1;
      else { dgx = 1; dgy = 1; } // D：对角右下
    }
    prevGx += dgx;
    prevGy += dgy;
    placed.push({ n, dx: dgx, dy: dgy });
  });
  return placed;
}
