/**
 * Tarjan 强连通分量（共享：FlowParser 环路校验 + MainlineOrder 缩点去环）
 * 纯函数、确定性：按 ids 声明序起访，分量编号为弹出顺序。
 */
export function tarjanSCC(
  ids: string[],
  adj: Map<string, string[]>,
): { compOf: Map<string, number>; components: string[][] } {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const compOf = new Map<string, number>();
  const components: string[][] = [];
  let idx = 0;

  function strongconnect(v: string) {
    index.set(v, idx); low.set(v, idx); idx++;
    stack.push(v); onStack.add(v);
    for (const w of adj.get(v) ?? []) {
      if (!index.has(w)) {
        strongconnect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) === index.get(v)) {
      const comp: string[] = [];
      let u: string;
      do {
        u = stack.pop()!;
        onStack.delete(u);
        compOf.set(u, components.length);
        comp.push(u);
      } while (u !== v);
      components.push(comp);
    }
  }

  for (const id of ids) if (!index.has(id)) strongconnect(id);
  return { compOf, components };
}
