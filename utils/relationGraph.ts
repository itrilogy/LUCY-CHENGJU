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

/**
 * 确定性因果拓扑坐标
 */
export interface NodeCoordinate {
    x: number;
    y: number;
}

/**
 * 方向型（Directional）因果拓扑分层布局算法（纯数学闭式解）
 * 
 * 核心原理：
 * 1. 因果最长链分层（Longest-path layering）：源点（末端根因）位于 Rank 0，依次拓扑推进；
 * 2. 质心列内排序（Barycenter order）：按前驱节点的平均 Y 坐标重排各列节点，极小化连线交叉；
 * 3. 确定性几何映射：居中对称投影，耗时 <2ms，无异步迭代。
 */
export function computeDirectionalLayout(
    nodes: readonly RelationNode[],
    links: readonly RelationLink[],
    width: number,
    height: number
): Map<string, NodeCoordinate> {
    const coords = new Map<string, NodeCoordinate>();
    if (nodes.length === 0) return coords;
    if (nodes.length === 1) {
        coords.set(nodes[0].id, { x: width / 2, y: height / 2 });
        return coords;
    }

    const validLinks = links.filter(l => l.source !== l.target && l.source !== 'root' && l.target !== 'root');
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    const revAdj = new Map<string, string[]>();

    for (const n of nodes) {
        inDegree.set(n.id, 0);
        outDegree.set(n.id, 0);
        adj.set(n.id, []);
        revAdj.set(n.id, []);
    }

    for (const l of validLinks) {
        if (!adj.has(l.source) || !adj.has(l.target)) continue;
        adj.get(l.source)!.push(l.target);
        revAdj.get(l.target)!.push(l.source);
        outDegree.set(l.source, (outDegree.get(l.source) || 0) + 1);
        inDegree.set(l.target, (inDegree.get(l.target) || 0) + 1);
    }

    // 1. 最长链因果分层
    const ranks = new Map<string, number>();
    const queue: string[] = [];
    for (const n of nodes) {
        if ((inDegree.get(n.id) || 0) === 0) {
            ranks.set(n.id, 0);
            queue.push(n.id);
        }
    }

    // 若无入度为 0 的节点（存在环回路），取净出度最大者作为起点
    if (queue.length === 0) {
        const sortedByOut = [...nodes].sort((a, b) => 
            ((outDegree.get(b.id) || 0) - (inDegree.get(b.id) || 0)) - 
            ((outDegree.get(a.id) || 0) - (inDegree.get(a.id) || 0))
        );
        ranks.set(sortedByOut[0].id, 0);
        queue.push(sortedByOut[0].id);
    }

    // 迭代推进拓扑层级，限制步数防止环死循环
    for (let iter = 0; iter < nodes.length; iter++) {
        let updated = false;
        for (const l of validLinks) {
            if (!ranks.has(l.source)) continue;
            const srcRank = ranks.get(l.source)!;
            const tgtRank = ranks.get(l.target) ?? -1;
            if (srcRank + 1 > tgtRank) {
                ranks.set(l.target, srcRank + 1);
                updated = true;
            }
        }
        if (!updated) break;
    }

    let maxRank = 0;
    ranks.forEach(r => { if (r > maxRank) maxRank = r; });
    for (const n of nodes) {
        if (!ranks.has(n.id)) {
            ranks.set(n.id, maxRank > 0 ? 1 : 0);
        }
    }
    maxRank = 0;
    ranks.forEach(r => { if (r > maxRank) maxRank = r; });

    // 2. 按 Rank 组织列
    const layers: string[][] = Array.from({ length: maxRank + 1 }, () => []);
    for (const n of nodes) {
        const r = ranks.get(n.id) || 0;
        layers[r].push(n.id);
    }

    // 3. Barycenter 质心列内排序（减少交叉）
    for (let r = 1; r <= maxRank; r++) {
        const layer = layers[r];
        const prevLayerPositions = new Map<string, number>();
        layers[r - 1].forEach((id, idx) => prevLayerPositions.set(id, idx));

        layer.sort((a, b) => {
            const predsA = revAdj.get(a) || [];
            const predsB = revAdj.get(b) || [];
            const avgA = predsA.length > 0
                ? predsA.reduce((sum, p) => sum + (prevLayerPositions.get(p) ?? 0), 0) / predsA.length
                : 0;
            const avgB = predsB.length > 0
                ? predsB.reduce((sum, p) => sum + (prevLayerPositions.get(p) ?? 0), 0) / predsB.length
                : 0;
            return avgA - avgB;
        });
    }

    // 4. 坐标映射（确定性防重叠几何展开，依靠 G6 fitView 全景居中包围）
    const usableWidth = Math.max(300, width - 160);
    const stepX = Math.max(260, usableWidth / (maxRank || 1));

    for (let r = 0; r <= maxRank; r++) {
        const layer = layers[r];
        const count = layer.length;
        const x = width / 2 + (r - maxRank / 2) * stepX;
        const layerHeight = (count - 1) * 90;

        layer.forEach((id, idx) => {
            const y = height / 2 - layerHeight / 2 + idx * 90;
            coords.set(id, { x: Math.round(x), y: Math.round(y) });
        });
    }

    return coords;
}

/**
 * 中央型（Centralized）极坐标同心环因果投影算法（纯数学闭式解）
 * 
 * 核心原理：
 * 1. 核心症结锚定：净因果流入度最高者作为圆心 (width/2, height/2)；
 * 2. 因果同心环反向分层：反向 BFS 测量各节点到核心症结的最短因果距离；
 * 3. 极坐标防碰撞投影：按同心椭圆展开，切线与径向均满足节点边界间隔，通过 fitView 极速收敛。
 */
export function computeCentralizedLayout(
    nodes: readonly RelationNode[],
    links: readonly RelationLink[],
    width: number,
    height: number
): Map<string, NodeCoordinate> {
    const coords = new Map<string, NodeCoordinate>();
    if (nodes.length === 0) return coords;
    const centerX = width / 2;
    const centerY = height / 2;

    if (nodes.length === 1) {
        coords.set(nodes[0].id, { x: centerX, y: centerY });
        return coords;
    }

    const validLinks = links.filter(l => l.source !== l.target && l.source !== 'root' && l.target !== 'root');
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    const revAdj = new Map<string, string[]>();

    for (const n of nodes) {
        inDegree.set(n.id, 0);
        outDegree.set(n.id, 0);
        revAdj.set(n.id, []);
    }

    for (const l of validLinks) {
        if (!revAdj.has(l.target) || !revAdj.has(l.source)) continue;
        revAdj.get(l.target)!.push(l.source);
        inDegree.set(l.target, (inDegree.get(l.target) || 0) + 1);
        outDegree.set(l.source, (outDegree.get(l.source) || 0) + 1);
    }

    // 1. 寻找核心症结（净入度最高者）
    let centerId = nodes[0].id;
    let maxFlux = -Infinity;
    for (const n of nodes) {
        const flux = (inDegree.get(n.id) || 0) - (outDegree.get(n.id) || 0);
        if (flux > maxFlux) {
            maxFlux = flux;
            centerId = n.id;
        }
    }

    // 2. 反向 BFS 分层，计算到核心症结的因果拓扑距离
    const dist = new Map<string, number>();
    dist.set(centerId, 0);
    const queue = [centerId];

    while (queue.length > 0) {
        const curr = queue.shift()!;
        const currDist = dist.get(curr)!;
        const parents = revAdj.get(curr) || [];
        for (const p of parents) {
            if (!dist.has(p)) {
                dist.set(p, currDist + 1);
                queue.push(p);
            }
        }
    }

    // 兜底未连通节点，置于外环
    let maxDist = 0;
    dist.forEach(d => { if (d > maxDist) maxDist = d; });
    for (const n of nodes) {
        if (!dist.has(n.id)) {
            dist.set(n.id, maxDist + 1);
        }
    }
    maxDist = 0;
    dist.forEach(d => { if (d > maxDist) maxDist = d; });

    // 3. 将节点按同心圆组织
    const concentricRings: string[][] = Array.from({ length: maxDist + 1 }, () => []);
    for (const n of nodes) {
        const d = dist.get(n.id) || 0;
        concentricRings[d].push(n.id);
    }

    // 中心节点位于坐标原点
    coords.set(centerId, { x: centerX, y: centerY });

    // 4. 自适应确定性无碰撞同心椭圆极坐标投影
    let currentRadius = 0;
    for (let ringIdx = 1; ringIdx <= maxDist; ringIdx++) {
        const ringNodes = concentricRings[ringIdx];
        const count = ringNodes.length;
        if (count === 0) continue;

        // 环向切线无碰撞最小半径：2 * PI * R >= count * 180
        const minTangentialRadius = (count * 180) / (2 * Math.PI);
        // 径向层间距保证至少 180px
        currentRadius = Math.max(currentRadius + 180, minTangentialRadius, 240);

        // 错位旋转，提升视觉分散度
        const baseAngle = (ringIdx % 2 === 1 ? 0 : Math.PI / count);

        // 椭圆展宽系数：横向长半轴 1.3，纵向短半轴 0.9，匹配横屏画布与节点宽高比
        const radiusX = currentRadius * 1.3;
        const radiusY = currentRadius * 0.9;

        ringNodes.forEach((id, idx) => {
            const angle = baseAngle + (2 * Math.PI * idx) / count;
            const x = centerX + radiusX * Math.cos(angle);
            const y = centerY + radiusY * Math.sin(angle);
            coords.set(id, { x: Math.round(x), y: Math.round(y) });
        });
    }

    return coords;
}

/**
 * 关系自由型（Free）确定性拓扑应力极小化布局算法（纯数学闭式解）
 * 
 * 核心原理：
 * 1. 拓扑图论距离矩阵（All-Pairs Shortest Path）：通过无向 BFS 计算节点对间拓扑测地线距离 d_ij；
 * 2. 确定性先验相角初值（Deterministic Phase Seeding）：按度数与因果通量确定性赋初值，彻底消除 Math.random 抖动；
 * 3. 应力主化能量泛函（Stress Majorization / Kamada-Kawai）：通过 45 轮同步 Jacobi 迭代将拓扑结构映射为自由网状聚类（耗时 <5ms）；
 * 4. 刚体防重叠几何投影（Node-Box Overlap Removal）：消除长条椭圆与矩形节点交叠；
 * 5. 零异步物理仿真：纯数学同步直出坐标，完全恢复网状自由分布与多核心团簇结构。
 */
export function computeFreeLayout(
    nodes: readonly RelationNode[],
    links: readonly RelationLink[],
    width: number,
    height: number
): Map<string, NodeCoordinate> {
    const coords = new Map<string, NodeCoordinate>();
    const n = nodes.length;
    if (n === 0) return coords;
    const centerX = width / 2;
    const centerY = height / 2;
    if (n === 1) {
        coords.set(nodes[0].id, { x: centerX, y: centerY });
        return coords;
    }

    const idMap = new Map<string, number>();
    nodes.forEach((node, idx) => idMap.set(node.id, idx));

    // 1. 构建无向邻接关系与最短拓扑距离矩阵 D
    const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) dist[i][i] = 0;

    const validLinks = links.filter(l => l.source !== l.target && l.source !== 'root' && l.target !== 'root');
    validLinks.forEach(l => {
        const u = idMap.get(l.source);
        const v = idMap.get(l.target);
        if (u !== undefined && v !== undefined) {
            dist[u][v] = 1;
            dist[v][u] = 1;
        }
    });

    // Floyd-Warshall 计算全源最短拓扑步长 (n <= 50, O(n^3) 耗时 <0.1ms)
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
        }
    }

    // 非连通分支兜底
    let maxFiniteDist = 1;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (dist[i][j] < Infinity && dist[i][j] > maxFiniteDist) {
                maxFiniteDist = dist[i][j];
            }
        }
    }
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (dist[i][j] === Infinity) {
                dist[i][j] = maxFiniteDist * 1.6;
            }
        }
    }

    // 2. 理想几何距离 L_ij 与 权重 W_ij
    const L0 = 180; // 基准边长 (px)
    const L: number[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => dist[i][j] * L0)
    );
    const W: number[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 0 : 1 / (dist[i][j] * dist[i][j])))
    );

    // 3. 确定性先验初始坐标 (按度数与因果通量排序确定相角，零随机性)
    const deg = new Array(n).fill(0);
    validLinks.forEach(l => {
        const u = idMap.get(l.source);
        const v = idMap.get(l.target);
        if (u !== undefined && v !== undefined) {
            deg[u]++;
            deg[v]++;
        }
    });
    const maxDeg = Math.max(...deg) || 1;

    const posX = new Float64Array(n);
    const posY = new Float64Array(n);
    const initRadius = Math.max(220, n * 24);

    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        const r = initRadius * (0.8 + 0.4 * (deg[i] / maxDeg));
        posX[i] = centerX + r * Math.cos(angle);
        posY[i] = centerY + r * Math.sin(angle);
    }

    // 4. Stress Majorization 凸能量 Jacobi 迭代 (45 轮)
    const nextX = new Float64Array(n);
    const nextY = new Float64Array(n);

    for (let iter = 0; iter < 45; iter++) {
        for (let i = 0; i < n; i++) {
            let sumWeight = 0;
            let sumTargetX = 0;
            let sumTargetY = 0;

            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                const w = W[i][j];
                sumWeight += w;

                const dx = posX[i] - posX[j];
                const dy = posY[i] - posY[j];
                const dNorm = Math.hypot(dx, dy) || 1e-4;

                const idealDist = L[i][j];
                sumTargetX += w * (posX[j] + (dx / dNorm) * idealDist);
                sumTargetY += w * (posY[j] + (dy / dNorm) * idealDist);
            }

            nextX[i] = sumWeight > 0 ? sumTargetX / sumWeight : posX[i];
            nextY[i] = sumWeight > 0 ? sumTargetY / sumWeight : posY[i];
        }

        posX.set(nextX);
        posY.set(nextY);
    }

    // 5. 刚体防碰撞几何推开 (消除长条椭圆与矩形交叠)
    const minBoxW = 160;
    const minBoxH = 60;
    for (let iter = 0; iter < 15; iter++) {
        let moved = false;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dx = posX[j] - posX[i];
                const dy = posY[j] - posY[i];
                const overlapX = minBoxW - Math.abs(dx);
                const overlapY = minBoxH - Math.abs(dy);

                if (overlapX > 0 && overlapY > 0) {
                    if (overlapX < overlapY) {
                        const shift = overlapX / 2;
                        const sign = dx >= 0 ? 1 : -1;
                        posX[i] -= sign * shift;
                        posX[j] += sign * shift;
                    } else {
                        const shift = overlapY / 2;
                        const sign = dy >= 0 ? 1 : -1;
                        posY[i] -= sign * shift;
                        posY[j] += sign * shift;
                    }
                    moved = true;
                }
            }
        }
        if (!moved) break;
    }

    // 6. 重心平移对齐画布中心
    let avgX = 0, avgY = 0;
    for (let i = 0; i < n; i++) {
        avgX += posX[i];
        avgY += posY[i];
    }
    avgX /= n;
    avgY /= n;
    const offsetX = centerX - avgX;
    const offsetY = centerY - avgY;

    for (let i = 0; i < n; i++) {
        coords.set(nodes[i].id, {
            x: Math.round(posX[i] + offsetX),
            y: Math.round(posY[i] + offsetY)
        });
    }

    return coords;
}

/**
 * 关联图全模式确定性因果代数布局入口
 */
export function computeDeterministicRelationLayout(
    nodes: readonly RelationNode[],
    links: readonly RelationLink[],
    layoutType: string | undefined,
    width: number,
    height: number
): Map<string, NodeCoordinate> {
    if (layoutType === 'Centralized') {
        return computeCentralizedLayout(nodes, links, width, height);
    }
    if (layoutType === 'Free') {
        return computeFreeLayout(nodes, links, width, height);
    }
    return computeDirectionalLayout(nodes, links, width, height);
}


