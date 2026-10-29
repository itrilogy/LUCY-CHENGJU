/**
 * 关联图（Relation Diagram）图论工具、纯数学确定性布局与几何清单（Geometry Spec SSOT）
 *
 * 背景：
 * 1. `RelationEditor` 原先在 **DSL 解析路径**与 **手工编辑路径** 各自实现了一遍
 *    自引用 / 环检测与入度·出度统计。本模块将其收敛为唯一实现。
 * 2. R28 完成了方向型（Directional）、中央型（Centralized）、自由型（Free）三类
 *    因果代数闭式拓扑解算；R30 进一步将节点尺寸度量（estimateTextWidth）、
 *    椭圆/圆角矩形精确边界求交、双向边弧线分离、跨层长边避障与标题排版收敛为
 *    `RelationGeometrySpec`，彻底剥离 G6，支撑前端原生 SVG 与 MCP Tier-1 进程内直出。
 */
import type {
    RelationNode,
    RelationLink,
    RelationChartStyles,
    RelationLayoutType,
} from '../types.ts';
import { estimateTextWidth } from './textMetrics.ts';

/** 本地默认样式（避免跨文件导入含 enum 的 types.ts 运行时依赖，便于 Node strip-types 独立测试） */
const DEFAULT_RELATION_STYLES: RelationChartStyles = {
    title: '关联图分析',
    titleFontSize: 24,
    rootColor: '#2563eb',
    rootTextColor: '#ffffff',
    middleColor: '#3b82f6',
    middleTextColor: '#ffffff',
    endColor: '#93c5fd',
    endTextColor: '#1e3a8a',
    lineColor: '#64748b',
    nodeFontSize: 14,
    layout: 'Directional',
};

/**
 * 节点在因果链中的角色：
 *  · `sink`   无出边 —— 所有因果汇聚于此，即**主要症结**（对应 `Color[Root]`）
 *  · `source` 无入边 —— 因果链起点，即**末端因素**（对应 `Color[End]`）
 *  · `middle` 其余
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
 * 检查项：端点存在 → 自引用 → 重复边 → 环路（DFS）。
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
 */
export function nextRelationNodeId(nodes: readonly RelationNode[]): string {
    const used = new Set(nodes.map(n => n.id));
    let i = nodes.length + 1;
    while (used.has(`n${i}`)) i++;
    return `n${i}`;
}

/**
 * 在 `nodes` 中挑一对「尚未建立连线」的节点，用于「添加连线」。
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

/** Color[Slot] → RelationChartStyles 字段名 */
const COLOR_KEY_MAP: Record<string, keyof RelationChartStyles> = {
    Root: 'rootColor',
    RootText: 'rootTextColor',
    Middle: 'middleColor',
    MiddleText: 'middleTextColor',
    End: 'endColor',
    EndText: 'endTextColor',
    Line: 'lineColor',
};

/**
 * 纯函数关联图 DSL 解析器（零 React/DOM 依赖，供前端 RelationEditor 与 MCP Tier-1 共用）
 */
export function parseRelationDSL(
    content: string,
    currentStyles: RelationChartStyles = DEFAULT_RELATION_STYLES,
): { nodes: RelationNode[]; links: RelationLink[]; styles: RelationChartStyles } {
    const newStyles: RelationChartStyles = { ...currentStyles };
    const newNodes: RelationNode[] = [];
    const newLinks: RelationLink[] = [];

    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        if (trimmed.startsWith('Title:')) {
            newStyles.title = trimmed.slice('Title:'.length).trim();
            return;
        }

        if (trimmed.startsWith('Layout:')) {
            const layoutVal = trimmed.slice('Layout:'.length).trim();
            if (['Centralized', 'Directional', 'Free'].includes(layoutVal)) {
                newStyles.layout = layoutVal as RelationLayoutType;
            }
            return;
        }

        const colorMatch = trimmed.match(/Color\[(Root|RootText|Middle|MiddleText|End|EndText|Line)\]\s*:\s*(#[0-9a-fA-F]{3,8})/i);
        if (colorMatch) {
            const matchedSlot = Object.keys(COLOR_KEY_MAP).find(k => k.toLowerCase() === colorMatch[1].toLowerCase());
            const key = matchedSlot ? COLOR_KEY_MAP[matchedSlot] : undefined;
            if (key) (newStyles as unknown as Record<string, unknown>)[key] = colorMatch[2];
            return;
        }

        const fontMatch = trimmed.match(/Font\[(Title|Node)\]\s*:\s*(\d+)/i);
        if (fontMatch) {
            if (fontMatch[1].toLowerCase() === 'title') newStyles.titleFontSize = parseInt(fontMatch[2], 10);
            if (fontMatch[1].toLowerCase() === 'node') newStyles.nodeFontSize = parseInt(fontMatch[2], 10);
            return;
        }

        if (trimmed.startsWith('Node:')) {
            const body = trimmed.slice('Node:'.length).trim();
            const comma = body.indexOf(',');
            if (comma > 0) {
                newNodes.push({ id: body.slice(0, comma).trim(), label: body.slice(comma + 1).trim() });
            }
            return;
        }

        if (trimmed.startsWith('Rel:')) {
            const parts = trimmed.slice('Rel:'.length).trim().split('->').map(t => t.trim());
            if (parts.length === 2 && parts[0] && parts[1]) {
                newLinks.push({ source: parts[0], target: parts[1] });
            }
        }
    });

    const invalid = validateRelationLinks(newNodes, newLinks);
    if (invalid) throw new Error(invalid);

    const graph = analyzeRelation(newNodes, newLinks);
    newNodes.forEach(n => {
        const role = graph.roleOf(n.id);
        n.type = role === 'sink' ? 'root' : role === 'source' ? 'end' : 'middle';
    });

    return { nodes: newNodes, links: newLinks, styles: newStyles };
}

/**
 * 确定性因果拓扑坐标
 */
export interface NodeCoordinate {
    x: number;
    y: number;
}

/**
 * 计算每个节点的真实盒子尺寸（供防重叠与几何清单统一调用）
 */
export function measureRelationNodeSize(
    label: string,
    shape: 'rect' | 'ellipse',
    fontSize: number,
): { width: number; height: number } {
    const textW = estimateTextWidth(label, fontSize);
    if (shape === 'rect') {
        return { width: Math.round(Math.max(126, textW + 40)), height: 50 };
    }
    // 椭圆外接矩形需比文本宽多留余量（椭圆内接矩形宽约为 0.707 * 2 * rx）
    return { width: Math.round(Math.max(112, textW * 1.18 + 32)), height: 44 };
}

/**
 * 方向型（Directional）因果拓扑分层布局算法（纯数学闭式解）
 *
 * 核心原理：
 * 1. 因果最长链分层（Longest-path layering）：源点（末端根因）位于 Rank 0，依次拓扑推进；
 * 2. 质心列内排序（Barycenter order）：按前驱节点的平均 Y 坐标重排各列节点，极小化连线交叉；
 * 3. 确定性几何映射：按每列真实最大节点宽度自适应计算列间距，杜绝长标签列间挤压。
 */
export function computeDirectionalLayout(
    nodes: readonly RelationNode[],
    links: readonly RelationLink[],
    width: number,
    height: number,
    fontSize = 14,
): Map<string, NodeCoordinate> {
    const coords = new Map<string, NodeCoordinate>();
    if (nodes.length === 0) return coords;
    if (nodes.length === 1) {
        coords.set(nodes[0].id, { x: Math.round(width / 2), y: Math.round(height / 2) });
        return coords;
    }

    const validLinks = links.filter(l => l.source !== l.target && l.source !== 'root' && l.target !== 'root');
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    const revAdj = new Map<string, string[]>();
    const nodeById = new Map<string, RelationNode>();

    for (const n of nodes) {
        inDegree.set(n.id, 0);
        outDegree.set(n.id, 0);
        adj.set(n.id, []);
        revAdj.set(n.id, []);
        nodeById.set(n.id, n);
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

    if (queue.length === 0) {
        const sortedByOut = [...nodes].sort((a, b) =>
            ((outDegree.get(b.id) || 0) - (inDegree.get(b.id) || 0)) -
            ((outDegree.get(a.id) || 0) - (inDegree.get(a.id) || 0))
        );
        ranks.set(sortedByOut[0].id, 0);
        queue.push(sortedByOut[0].id);
    }

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

    // 3. Barycenter 质心列内排序（前向 + 反向双遍扫描极小化交叉）
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

    // 4. 坐标映射（结合每列真实最大节点宽度自适应推进）
    const colMaxW = layers.map(layer => {
        let m = 140;
        for (const id of layer) {
            const n = nodeById.get(id);
            if (!n) continue;
            const isSink = (outDegree.get(id) || 0) === 0;
            const sz = measureRelationNodeSize(n.label, isSink ? 'rect' : 'ellipse', fontSize);
            if (sz.width > m) m = sz.width;
        }
        return m;
    });

    const usableWidth = Math.max(300, width - 160);
    const defaultStepX = Math.max(260, usableWidth / (maxRank || 1));
    const colXs: number[] = [0];
    for (let r = 1; r <= maxRank; r++) {
        const neededStep = (colMaxW[r - 1] + colMaxW[r]) / 2 + 88;
        colXs.push(colXs[r - 1] + Math.max(defaultStepX, neededStep));
    }
    const totalSpanX = colXs[colXs.length - 1] || 0;

    for (let r = 0; r <= maxRank; r++) {
        const layer = layers[r];
        const count = layer.length;
        const x = width / 2 - totalSpanX / 2 + colXs[r];
        const rowStepY = 88;
        const layerHeight = (count - 1) * rowStepY;

        layer.forEach((id, idx) => {
            const y = height / 2 - layerHeight / 2 + idx * rowStepY;
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
 * 3. 极坐标防碰撞投影：按同心椭圆展开，切线与径向均满足真实节点边界安全间隔。
 */
export function computeCentralizedLayout(
    nodes: readonly RelationNode[],
    links: readonly RelationLink[],
    width: number,
    height: number,
    fontSize = 14,
): Map<string, NodeCoordinate> {
    const coords = new Map<string, NodeCoordinate>();
    if (nodes.length === 0) return coords;
    const centerX = width / 2;
    const centerY = height / 2;

    if (nodes.length === 1) {
        coords.set(nodes[0].id, { x: Math.round(centerX), y: Math.round(centerY) });
        return coords;
    }

    const validLinks = links.filter(l => l.source !== l.target && l.source !== 'root' && l.target !== 'root');
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    const revAdj = new Map<string, string[]>();
    const nodeById = new Map<string, RelationNode>();

    for (const n of nodes) {
        inDegree.set(n.id, 0);
        outDegree.set(n.id, 0);
        revAdj.set(n.id, []);
        nodeById.set(n.id, n);
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

    coords.set(centerId, { x: Math.round(centerX), y: Math.round(centerY) });

    // 4. 自适应确定性无碰撞同心椭圆极坐标投影
    let currentRadius = 0;
    let prevRingNodeW = 160;
    const centerNodeObj = nodeById.get(centerId);
    if (centerNodeObj) {
        prevRingNodeW = measureRelationNodeSize(centerNodeObj.label, 'rect', fontSize).width;
    }

    for (let ringIdx = 1; ringIdx <= maxDist; ringIdx++) {
        const ringNodes = concentricRings[ringIdx];
        const count = ringNodes.length;
        if (count === 0) continue;

        let maxNodeW = 160;
        for (const id of ringNodes) {
            const n = nodeById.get(id);
            if (n) {
                const isSink = (outDegree.get(id) || 0) === 0;
                const sz = measureRelationNodeSize(n.label, isSink ? 'rect' : 'ellipse', fontSize);
                if (sz.width > maxNodeW) maxNodeW = sz.width;
            }
        }

        const arcSlot = Math.max(190, maxNodeW + 32);
        const minTangentialRadius = (count * arcSlot) / (2 * Math.PI);
        // 径向步长保证相邻环在水平轴 (radiusX = R * 1.3) 上不发生长节点盒重叠
        const minRadialStep = Math.max(190, Math.ceil(((prevRingNodeW + maxNodeW) / 2 + 48) / 1.3));
        currentRadius = Math.max(currentRadius + minRadialStep, minTangentialRadius, 240);
        prevRingNodeW = maxNodeW;

        const baseAngle = (ringIdx % 2 === 1 ? 0 : Math.PI / count);
        const radiusX = currentRadius * 1.3;
        const radiusY = currentRadius * 0.92;

        ringNodes.forEach((id, idx) => {
            const angle = baseAngle + (2 * Math.PI * idx) / count;
            const x = centerX + radiusX * Math.cos(angle);
            const y = centerY + radiusY * Math.sin(angle);
            coords.set(id, { x: Math.round(x), y: Math.round(y) });
        });
    }

    // 5. 极坐标投影后执行轻量刚体 AABB 微调（彻底消除极端同角度跨环或切向擦边）
    const nodeList = [...nodes];
    const sizes = nodeList.map(nd =>
        measureRelationNodeSize(nd.label, (outDegree.get(nd.id) || 0) === 0 ? 'rect' : 'ellipse', fontSize)
    );
    for (let iter = 0; iter < 15; iter++) {
        let moved = false;
        for (let i = 0; i < nodeList.length; i++) {
            for (let j = i + 1; j < nodeList.length; j++) {
                const idA = nodeList[i].id, idB = nodeList[j].id;
                const cA = coords.get(idA)!, cB = coords.get(idB)!;
                const minW = (sizes[i].width + sizes[j].width) / 2 + 20;
                const minH = (sizes[i].height + sizes[j].height) / 2 + 16;
                const dx = cB.x - cA.x;
                const dy = cB.y - cA.y;
                const ox = minW - Math.abs(dx);
                const oy = minH - Math.abs(dy);
                if (ox > 0 && oy > 0) {
                    const signX = dx >= 0 ? 1 : -1;
                    const signY = dy >= 0 ? 1 : -1;
                    if (ox < oy) {
                        const s = Math.ceil(ox / 2) + 1;
                        if (idA !== centerId) cA.x -= signX * s;
                        if (idB !== centerId) cB.x += signX * s;
                    } else {
                        const s = Math.ceil(oy / 2) + 1;
                        if (idA !== centerId) cA.y -= signY * s;
                        if (idB !== centerId) cB.y += signY * s;
                    }
                    moved = true;
                }
            }
        }
        if (!moved) break;
    }

    return coords;
}

/**
 * 关系自由型（Free）确定性拓扑应力极小化布局算法（纯数学闭式解）
 *
 * 核心原理：
 * 1. 拓扑图论距离矩阵（All-Pairs Shortest Path）：通过 Floyd-Warshall 计算节点对间拓扑测地线距离 d_ij；
 * 2. 确定性先验相角初值（Deterministic Phase Seeding）：按度数与因果通量确定性赋初值，彻底消除 Math.random 抖动；
 * 3. 应力主化能量泛函（Stress Majorization / Kamada-Kawai）：通过 45 轮同步 Jacobi 迭代将拓扑结构映射为自由网状聚类；
 * 4. 真实尺寸刚体防重叠几何投影（True-Size Node-Box Overlap Removal）：按每个节点的实际 (width, height) 消除交叠。
 */
export function computeFreeLayout(
    nodes: readonly RelationNode[],
    links: readonly RelationLink[],
    width: number,
    height: number,
    fontSize = 14,
): Map<string, NodeCoordinate> {
    const coords = new Map<string, NodeCoordinate>();
    const n = nodes.length;
    if (n === 0) return coords;
    const centerX = width / 2;
    const centerY = height / 2;
    if (n === 1) {
        coords.set(nodes[0].id, { x: Math.round(centerX), y: Math.round(centerY) });
        return coords;
    }

    const idMap = new Map<string, number>();
    nodes.forEach((node, idx) => idMap.set(node.id, idx));

    // 1. 构建无向邻接关系与最短拓扑距离矩阵 D
    const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) dist[i][i] = 0;

    const validLinks = links.filter(l => l.source !== l.target && l.source !== 'root' && l.target !== 'root');
    const outDeg = new Array(n).fill(0);
    validLinks.forEach(l => {
        const u = idMap.get(l.source);
        const v = idMap.get(l.target);
        if (u !== undefined && v !== undefined) {
            dist[u][v] = 1;
            dist[v][u] = 1;
            outDeg[u]++;
        }
    });

    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
        }
    }

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
    const L0 = 195;
    const L: number[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => dist[i][j] * L0)
    );
    const W: number[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 0 : 1 / (dist[i][j] * dist[i][j])))
    );

    // 3. 确定性先验初始坐标
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

    // 5. 真实节点尺寸刚体防碰撞几何推开
    const nodeSizes = nodes.map((nd, idx) =>
        measureRelationNodeSize(nd.label, outDeg[idx] === 0 ? 'rect' : 'ellipse', fontSize)
    );
    const padX = 28;
    const padY = 22;

    for (let iter = 0; iter < 30; iter++) {
        let moved = false;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const minW = (nodeSizes[i].width + nodeSizes[j].width) / 2 + padX;
                const minH = (nodeSizes[i].height + nodeSizes[j].height) / 2 + padY;
                const dx = posX[j] - posX[i];
                const dy = posY[j] - posY[i];
                const overlapX = minW - Math.abs(dx);
                const overlapY = minH - Math.abs(dy);

                if (overlapX > 0 && overlapY > 0) {
                    if (overlapX < overlapY) {
                        const shift = overlapX / 2 + 1;
                        const sign = dx >= 0 ? 1 : -1;
                        posX[i] -= sign * shift;
                        posX[j] += sign * shift;
                    } else {
                        const shift = overlapY / 2 + 1;
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
            y: Math.round(posY[i] + offsetY),
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
    height: number,
    fontSize = 14,
): Map<string, NodeCoordinate> {
    if (layoutType === 'Centralized') {
        return computeCentralizedLayout(nodes, links, width, height, fontSize);
    }
    if (layoutType === 'Free') {
        return computeFreeLayout(nodes, links, width, height, fontSize);
    }
    return computeDirectionalLayout(nodes, links, width, height, fontSize);
}

/* ────────────────────── 几何清单契约（Geometry Spec SSOT） ────────────────────── */

export interface RelationGeometryNode {
    id: string;
    role: RelationNodeRole;
    shape: 'rect' | 'ellipse';
    x: number;
    y: number;
    width: number;
    height: number;
    rx: number;
    label: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fill: string;
    stroke: string;
    textColor: string;
}

export interface RelationGeometryEdge {
    id: string;
    source: string;
    target: string;
    /** 起点（源节点外框边界点） */
    x1: number;
    y1: number;
    /** 终点（目标节点外框边界点，即箭头尖端） */
    x2: number;
    y2: number;
    /** 若存在双向边或中间节点遮挡避让，给出二次贝塞尔控制点 */
    controlPoint?: { cx: number; cy: number };
    stroke: string;
    lineWidth: number;
}

export interface RelationGeometrySpec {
    title?: {
        text: string;
        x: number;
        y: number;
        fontSize: number;
        color: string;
    };
    nodes: RelationGeometryNode[];
    edges: RelationGeometryEdge[];
    bbox: { x1: number; y1: number; x2: number; y2: number };
}

/**
 * 计算从节点中心 (cx, cy) 朝目标点 (tx, ty) 射出的射线与节点外框（矩形或椭圆）的精确交点
 */
export function intersectNodeBoundary(
    node: { shape: 'rect' | 'ellipse'; x: number; y: number; width: number; height: number },
    tx: number,
    ty: number,
): { x: number; y: number } {
    const dx = tx - node.x;
    const dy = ty - node.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) return { x: node.x, y: node.y };

    const ux = dx / dist;
    const uy = dy / dist;
    const hw = node.width / 2;
    const hh = node.height / 2;

    if (node.shape === 'ellipse') {
        // 椭圆方程: (t*ux / hw)^2 + (t*uy / hh)^2 = 1
        const denom = Math.hypot(ux / hw, uy / hh) || 1;
        const t = 1 / denom;
        return {
            x: Number((node.x + ux * t).toFixed(2)),
            y: Number((node.y + uy * t).toFixed(2)),
        };
    }

    // 圆角矩形外框 AABB 射线求交
    const txBound = Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : Infinity;
    const tyBound = Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : Infinity;
    const t = Math.min(txBound, tyBound);
    return {
        x: Number((node.x + ux * t).toFixed(2)),
        y: Number((node.y + uy * t).toFixed(2)),
    };
}

/**
 * 判别线段 P1->P2 是否穿过某个非端点的节点 AABB，若穿过则返回法向推开的控制点
 */
function findObstacleAvoidControlPoint(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    srcId: string,
    tgtId: string,
    nodes: readonly RelationGeometryNode[],
): { cx: number; cy: number } | undefined {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 40) return undefined;

    const ux = dx / len;
    const uy = dy / len;
    // 法向量（向上偏优先）
    const nx = -uy;
    const ny = ux;

    for (const nd of nodes) {
        if (nd.id === srcId || nd.id === tgtId) continue;
        // 投影节点中心到线段 P1->P2
        const vx = nd.x - p1.x;
        const vy = nd.y - p1.y;
        const proj = vx * ux + vy * uy;
        if (proj <= 20 || proj >= len - 20) continue;

        const perpDist = vx * nx + vy * ny;
        const safeRadius = Math.hypot(nd.width / 2, nd.height / 2) * 0.65;
        if (Math.abs(perpDist) < safeRadius) {
            const sign = perpDist >= 0 ? -1 : 1;
            const offset = Math.max(48, safeRadius - Math.abs(perpDist) + 36);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            return {
                cx: Number((midX + nx * sign * offset).toFixed(2)),
                cy: Number((midY + ny * sign * offset).toFixed(2)),
            };
        }
    }
    return undefined;
}

/**
 * 生成关联图完整几何清单（Geometry Spec SSOT）
 */
export function computeRelationGeometry(
    rawNodes: readonly RelationNode[],
    rawLinks: readonly RelationLink[],
    styles?: Partial<RelationChartStyles>,
    viewportWidth = 1200,
    viewportHeight = 800,
): RelationGeometrySpec {
    const finalStyles: RelationChartStyles = { ...DEFAULT_RELATION_STYLES, ...styles };
    const validNodes = rawNodes.filter(n => n.id !== 'root');
    const validLinks = rawLinks.filter(
        l => l.source !== l.target && l.source !== 'root' && l.target !== 'root'
    );

    const analysis = analyzeRelation(validNodes, validLinks);
    const fontSize = finalStyles.nodeFontSize || 14;
    const coords = computeDeterministicRelationLayout(
        validNodes,
        validLinks,
        finalStyles.layout,
        viewportWidth,
        viewportHeight,
        fontSize,
    );

    const geoNodes: RelationGeometryNode[] = validNodes.map(node => {
        const role = analysis.roleOf(node.id);
        const coord = coords.get(node.id) || { x: viewportWidth / 2, y: viewportHeight / 2 };

        let fill = finalStyles.middleColor;
        let stroke = finalStyles.middleColor;
        let textColor = finalStyles.middleTextColor;
        let fontWeight: 'normal' | 'bold' = 'normal';
        let shape: 'rect' | 'ellipse' = 'ellipse';

        if (role === 'sink' || node.type === 'root') {
            fill = finalStyles.rootColor;
            stroke = finalStyles.rootColor;
            textColor = finalStyles.rootTextColor;
            fontWeight = 'bold';
            shape = 'rect';
        } else if (role === 'source' || node.type === 'end') {
            fill = finalStyles.endColor;
            stroke = finalStyles.endColor;
            textColor = finalStyles.endTextColor;
            shape = 'ellipse';
        }

        const { width, height } = measureRelationNodeSize(node.label, shape, fontSize);

        return {
            id: node.id,
            role,
            shape,
            x: coord.x,
            y: coord.y,
            width,
            height,
            rx: shape === 'rect' ? 8 : Math.round(width / 2),
            label: node.label,
            fontSize,
            fontWeight,
            fill,
            stroke,
            textColor,
        };
    });

    const nodeMap = new Map<string, RelationGeometryNode>(geoNodes.map(n => [n.id, n]));
    const edgeSet = new Set<string>(validLinks.map(l => `${l.source}->${l.target}`));

    const geoEdges: RelationGeometryEdge[] = [];
    validLinks.forEach((link, idx) => {
        const src = nodeMap.get(link.source);
        const tgt = nodeMap.get(link.target);
        if (!src || !tgt) return;

        const hasReverse = edgeSet.has(`${link.target}->${link.source}`);
        let controlPoint: { cx: number; cy: number } | undefined;

        if (hasReverse) {
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const offset = 26;
            controlPoint = {
                cx: Number(((src.x + tgt.x) / 2 + nx * offset).toFixed(2)),
                cy: Number(((src.y + tgt.y) / 2 + ny * offset).toFixed(2)),
            };
        } else {
            controlPoint = findObstacleAvoidControlPoint(src, tgt, src.id, tgt.id, geoNodes);
        }

        // 若有控制点，起点朝向控制点求交，终点从控制点朝向目标节点求交
        const aimFromSrc = controlPoint ? { x: controlPoint.cx, y: controlPoint.cy } : { x: tgt.x, y: tgt.y };
        const aimFromTgt = controlPoint ? { x: controlPoint.cx, y: controlPoint.cy } : { x: src.x, y: src.y };

        const pStart = intersectNodeBoundary(src, aimFromSrc.x, aimFromSrc.y);
        const pEnd = intersectNodeBoundary(tgt, aimFromTgt.x, aimFromTgt.y);

        geoEdges.push({
            id: `rel_edge_${idx}_${link.source}_${link.target}`,
            source: link.source,
            target: link.target,
            x1: pStart.x,
            y1: pStart.y,
            x2: pEnd.x,
            y2: pEnd.y,
            controlPoint,
            stroke: finalStyles.lineColor || '#64748b',
            lineWidth: 2,
        });
    });

    // 计算全局紧致包围盒 bbox
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const nd of geoNodes) {
        x1 = Math.min(x1, nd.x - nd.width / 2);
        y1 = Math.min(y1, nd.y - nd.height / 2);
        x2 = Math.max(x2, nd.x + nd.width / 2);
        y2 = Math.max(y2, nd.y + nd.height / 2);
    }
    for (const ed of geoEdges) {
        if (ed.controlPoint) {
            x1 = Math.min(x1, ed.controlPoint.cx);
            y1 = Math.min(y1, ed.controlPoint.cy);
            x2 = Math.max(x2, ed.controlPoint.cx);
            y2 = Math.max(y2, ed.controlPoint.cy);
        }
    }
    if (!Number.isFinite(x1)) {
        x1 = 0; y1 = 0; x2 = 800; y2 = 600;
    }

    let titleSpec: RelationGeometrySpec['title'] | undefined;
    const titleText = (finalStyles.title || '').trim();
    if (titleText) {
        const titleFs = finalStyles.titleFontSize || 24;
        const titleW = estimateTextWidth(titleText, titleFs);
        const centerX = Number(((x1 + x2) / 2).toFixed(2));
        const titleY = Number((y1 - 36).toFixed(2));
        titleSpec = {
            text: titleText,
            x: centerX,
            y: titleY,
            fontSize: titleFs,
            color: '#1e293b',
        };
        x1 = Math.min(x1, centerX - titleW / 2 - 16);
        x2 = Math.max(x2, centerX + titleW / 2 + 16);
        y1 = Math.min(y1, titleY - titleFs);
    }

    return {
        title: titleSpec,
        nodes: geoNodes,
        edges: geoEdges,
        bbox: {
            x1: Math.floor(x1),
            y1: Math.floor(y1),
            x2: Math.ceil(x2),
            y2: Math.ceil(y2),
        },
    };
}
