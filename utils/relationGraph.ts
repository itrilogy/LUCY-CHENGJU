/**
 * 关联图（Relation Diagram）图论工具 · 单一真源
 *
 * 背景：`RelationEditor` 原先在 **DSL 解析路径**与 **手工编辑路径** 各自实现了一遍
 * 自引用 / 环检测与入度·出度统计。两处独立演进，且**手工路径完全没有校验** ——
 * 可以直接造出自环、逻辑环与重复边，再交给渲染层。
 *
 * 本模块把这两件事收敛为唯一实现，供两条路径共用。
 */
import type { RelationNode, RelationLink } from '../types';

/**
 * 节点在因果链中的角色：
 *  · `sink`   无出边 —— 所有因果汇聚于此，即**主要症结**（对应 `Color[Root]`）
 *  · `source` 无入边 —— 因果链起点，即**末端因素**（对应 `Color[End]`）
 *  · `middle` 其余
 *
 * 注：原 `RelationNode.type` 用 `'root' | 'middle' | 'end'` 命名，但把「无出边」
 * 叫作 root、「无入边」叫作 end，语义与名称相反、极易误读。此处改以**图论方向**
 * 表述，映射关系由调用方在 `type` 赋值处显式体现。
 */
export type RelationNodeRole = 'source' | 'middle' | 'sink';

export interface RelationGraphAnalysis {
    inDegree: Map<string, number>;
    outDegree: Map<string, number>;
    roleOf: (id: string) => RelationNodeRole;
    /** 汇点：无出边 = 主要症结 */
    isSink: (id: string) => boolean;
    /** 源点：无入边 = 末端因素 */
    isSource: (id: string) => boolean;
}

/**
 * 单次 O(V+E) 遍历算出入度 / 出度与角色。
 * 原实现把这段逻辑写在 JSX 的 IIFE 里，**每次渲染重算一遍**，且与 DSL 解析路径的
 * 统计口径重复 —— 这里统一。
 */
export function analyzeRelation(
    nodes: readonly RelationNode[],
    links: readonly RelationLink[],
): RelationGraphAnalysis {
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    for (const n of nodes) {
        inDegree.set(n.id, 0);
        outDegree.set(n.id, 0);
    }
    for (const l of links) {
        if (l.source === l.target) continue; // 自环由 validate 单独报错，不计入度数
        if (outDegree.has(l.source)) outDegree.set(l.source, outDegree.get(l.source)! + 1);
        if (inDegree.has(l.target)) inDegree.set(l.target, inDegree.get(l.target)! + 1);
    }

    const ind = (id: string) => inDegree.get(id) ?? 0;
    const outd = (id: string) => outDegree.get(id) ?? 0;

    const roleOf = (id: string): RelationNodeRole =>
        outd(id) === 0 ? 'sink' : ind(id) === 0 ? 'source' : 'middle';

    return {
        inDegree,
        outDegree,
        roleOf,
        isSink: id => roleOf(id) === 'sink',
        isSource: id => roleOf(id) === 'source',
    };
}

/**
 * 校验连线的合法性。返回错误文案；合法则返回 `null`。
 *
 * 检查项：端点存在 → 自引用 → 重复边 → 环路（DFS）。
 * 原先只有 DSL 路径做前两三项中的一部分，手工路径一项都没做。
 */
export function validateRelationLinks(
    nodes: readonly RelationNode[],
    links: readonly RelationLink[],
): string | null {
    const known = new Set(nodes.map(n => n.id));

    // ① 端点存在性 / 自引用 / 重复边
    const seen = new Set<string>();
    for (const l of links) {
        if (!known.has(l.source) || !known.has(l.target)) {
            return `连线端点不存在：${l.source} -> ${l.target}`;
        }
        if (l.source === l.target) {
            return `检测到自引用连线：${l.source} -> ${l.target}。因果关系不能指向自身。`;
        }
        const key = `${l.source}->${l.target}`;
        if (seen.has(key)) {
            return `检测到重复连线：${l.source} -> ${l.target}。同一对节点之间只应有唯一因果方向。`;
        }
        seen.add(key);
    }

    // ② 环路检测（迭代式 DFS，避免深链递归爆栈）
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const l of links) adj.get(l.source)!.push(l.target);

    const WHITE = 0, GREY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const n of nodes) color.set(n.id, WHITE);

    for (const start of nodes) {
        if (color.get(start.id) !== WHITE) continue;
        const stack: Array<{ id: string; i: number }> = [{ id: start.id, i: 0 }];
        color.set(start.id, GREY);
        while (stack.length) {
            const top = stack[stack.length - 1];
            const neighbours = adj.get(top.id) ?? [];
            if (top.i >= neighbours.length) {
                color.set(top.id, BLACK);
                stack.pop();
                continue;
            }
            const next = neighbours[top.i++];
            const c = color.get(next) ?? WHITE;
            if (c === GREY) return '检测到逻辑循环回路！请检查因果路径。';
            if (c === WHITE) {
                color.set(next, GREY);
                stack.push({ id: next, i: 0 });
            }
        }
    }

    return null;
}

/**
 * 生成一个尚未占用的节点 id。
 * 原实现用 `` `n${Date.now().toString(36).substr(-4)}` ``，同毫秒内连点会**碰撞**
 * 产生重复 id（React key 冲突 + 数据串行）。
 */
export function nextRelationNodeId(nodes: readonly RelationNode[]): string {
    const used = new Set(nodes.map(n => n.id));
    let i = nodes.length + 1;
    while (used.has(`n${i}`)) i++;
    return `n${i}`;
}

/**
 * 在 `nodes` 中挑一对「尚未建立连线」的节点，用于「添加连线」。
 * 原实现硬编码取 `nodes[len-2] → nodes[len-1]`，既不符合直觉，
 * 也会不断生成重复边（而重复边此前的校验完全缺失）。
 */
export function pickUnlinkedPair(
    nodes: readonly RelationNode[],
    links: readonly RelationLink[],
): [string, string] | null {
    const existing = new Set(links.map(l => `${l.source}->${l.target}`));
    for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const key = `${nodes[i].id}->${nodes[j].id}`;
            if (!existing.has(key)) return [nodes[i].id, nodes[j].id];
        }
    }
    return null;
}
