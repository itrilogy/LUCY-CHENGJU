/**
 * 过程决策程序图（PDPC Diagram）解析器、纯数学分层正交布局引擎与几何清单（Geometry Spec SSOT）
 *
 * 核心设计（R30 · 彻底剥离 @antv/g6 与异步 Dagre）：
 * 1. 纯函数 DSL 解析（parsePDPCDSL）：支持 Group/EndGroup、Item 四类节点与链式连线 `a--b--c [OK|NG]`；
 * 2. 拓扑分层与阶段凝聚（K-Rank + Group Cohesion）：
 *    - 结合有向边最长路径与 Group 阶段偏序计算层级 Rank；
 *    - 同一 Group 内的主线与对策分支聚集在连续 Rank 区间，保证阶段外框互不穿插；
 * 3. 主干与对策分支识别（Mainline vs Contingency）：
 *    - `[NG]` 或指向 `countermeasure` 的分支自动在副轴方向展开，避免与正常 `[OK]` 主线共线挤压；
 * 4. 正交圆角路由与避障（Orthogonal Routing）：
 *    - 生成正交折线点集 `pathPoints`，跨层回流边（对策回到主线）自动从阶段节点外侧走廊绕行，零穿刺；
 * 5. 阶段框（Combo/Group）精确包络：
 *    - Group 外框由其组内所有节点 AABB 的并集 + 标题内边距（顶部 40px，其余 22px）闭式合成。
 */
import type {
    PDPCNode,
    PDPCLink,
    PDPCGroup,
    PDPCData,
    PDPCChartStyles,
    PDPCNodeType,
    PDPCMarkerType,
} from '../types.ts';
import { estimateTextWidth } from './textMetrics.ts';

/** 本地默认样式（零运行时跨模块 enum 依赖，支持 Node --experimental-strip-types 直跑） */
export const DEFAULT_PDPC_STYLES_LOCAL: PDPCChartStyles = {
    title: '过程决策程序图 (PDPC)',
    layout: 'Directional',
    startColor: '#DBEAFE',
    startTextColor: '#1E40AF',
    stepColor: '#EFF6FF',
    stepTextColor: '#1D4ED8',
    countermeasureColor: '#ECFDF5',
    countermeasureTextColor: '#047857',
    endColor: '#FEF2F2',
    endTextColor: '#B91C1C',
    lineColor: '#64748B',
    lineWidth: 2,
    nodeFontSize: 12,
    titleFontSize: 20,
};

/**
 * 纯函数 PDPC DSL 解析器（供前端 PDPCEditor、门禁脚本与 MCP Tier-1 共用）
 */
export function parsePDPCDSL(content: string): { data: PDPCData; styles: PDPCChartStyles } {
    const lines = String(content ?? '').split('\n');
    const styles: PDPCChartStyles = { ...DEFAULT_PDPC_STYLES_LOCAL };
    const nodes: PDPCNode[] = [];
    const links: PDPCLink[] = [];
    const groups: PDPCGroup[] = [];

    let currentGroupId: string | undefined = undefined;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        if (trimmed.startsWith('Title:')) {
            styles.title = trimmed.replace('Title:', '').trim();
            return;
        }
        if (trimmed.startsWith('Layout:')) {
            const layoutVal = trimmed.replace('Layout:', '').trim();
            if (layoutVal === 'Directional' || layoutVal === 'Standard') {
                styles.layout = layoutVal;
            }
            return;
        }

        const colorMatch = trimmed.match(
            /Color\[(Start|StartText|End|EndText|Step|StepText|Countermeasure|CountermeasureText|Line)\]:\s*(#[0-9a-fA-F]+)/i
        );
        if (colorMatch) {
            const keyMap: Record<string, keyof PDPCChartStyles> = {
                start: 'startColor',
                starttext: 'startTextColor',
                end: 'endColor',
                endtext: 'endTextColor',
                step: 'stepColor',
                steptext: 'stepTextColor',
                countermeasure: 'countermeasureColor',
                countermeasuretext: 'countermeasureTextColor',
                line: 'lineColor',
            };
            const targetKey = keyMap[colorMatch[1].toLowerCase()];
            if (targetKey) {
                (styles as unknown as Record<string, unknown>)[targetKey] = colorMatch[2];
            }
            return;
        }

        const fontMatch = trimmed.match(/Font\[(Title|Node)\]:\s*(\d+)/i);
        if (fontMatch) {
            if (fontMatch[1].toLowerCase() === 'title') styles.titleFontSize = parseInt(fontMatch[2], 10);
            if (fontMatch[1].toLowerCase() === 'node') styles.nodeFontSize = parseInt(fontMatch[2], 10);
            return;
        }

        const lineWidthMatch = trimmed.match(/Line\[Width\]:\s*(\d+)/i);
        if (lineWidthMatch) {
            styles.lineWidth = parseInt(lineWidthMatch[1], 10);
            return;
        }

        if (trimmed.startsWith('Group:')) {
            const parts = trimmed.replace('Group:', '').split(',').map(s => s.trim());
            if (parts.length >= 2) {
                currentGroupId = parts[0];
                groups.push({
                    id: parts[0],
                    label: parts[1],
                    parentId: parts[2] ? parts[2].replace(/^\[|\]$/g, '') : null,
                });
            }
            return;
        }
        if (trimmed.startsWith('EndGroup')) {
            currentGroupId = undefined;
            return;
        }

        if (trimmed.startsWith('Item:')) {
            const parts = trimmed.replace('Item:', '').split(',').map(s => s.trim());
            if (parts.length >= 2) {
                const id = parts[0];
                const label = parts[1];
                let type: PDPCNodeType = 'step';

                if (parts[2]) {
                    const typeStr = parts[2].toLowerCase();
                    if (typeStr.includes('start')) type = 'start';
                    else if (typeStr.includes('end')) type = 'end';
                    else if (typeStr.includes('countermeasure')) type = 'countermeasure';
                }

                nodes.push({ id, label, type, groupId: currentGroupId });
            }
            return;
        }

        if (trimmed.includes('--')) {
            const markerMatch = trimmed.match(/\[(OK|NG)\]/i);
            const marker: PDPCMarkerType = markerMatch
                ? (markerMatch[1].toUpperCase() as PDPCMarkerType)
                : 'None';
            const cleanLine = trimmed.replace(/\[(OK|NG)\]/i, '').trim();
            const sequence = cleanLine.split('--').map(s => s.trim()).filter(Boolean);

            // 遵循 L0 卡片真源规范：链式直写 `a--b--c [OK]` 时标记作用于整条链
            for (let i = 0; i < sequence.length - 1; i++) {
                links.push({
                    source: sequence[i],
                    target: sequence[i + 1],
                    marker,
                });
            }
        }
    });

    return {
        data: { title: styles.title, nodes, links, groups },
        styles,
    };
}

/* ────────────────────── 几何清单契约（PDPC Geometry Spec SSOT） ────────────────────── */

export interface PDPCGeometryNode {
    id: string;
    type: PDPCNodeType;
    shape: 'pill' | 'rect' | 'hexagon' | 'double-rect';
    groupId?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rx: number;
    label: string;
    fontSize: number;
    fill: string;
    stroke: string;
    textColor: string;
    rank: number;
}

export interface PDPCGeometryEdge {
    id: string;
    source: string;
    target: string;
    marker: PDPCMarkerType;
    pathPoints: Array<{ x: number; y: number }>;
    stroke: string;
    lineWidth: number;
    dashed: boolean;
    label?: {
        text: 'OK' | 'NG';
        x: number;
        y: number;
        width: number;
        height: number;
        color: string;
        bgColor: string;
        borderColor: string;
    };
}

export interface PDPCGeometryGroup {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    stroke: string;
    labelColor: string;
}

export interface PDPCGeometrySpec {
    title?: {
        text: string;
        x: number;
        y: number;
        fontSize: number;
        color: string;
    };
    layout: 'Directional' | 'Standard';
    groups: PDPCGeometryGroup[];
    nodes: PDPCGeometryNode[];
    edges: PDPCGeometryEdge[];
    bbox: { x1: number; y1: number; x2: number; y2: number };
}

/**
 * 估算 PDPC 节点尺寸
 * - `start` -> 药丸胶囊 (`pill`)
 * - `step`  -> 圆角矩形 (`rect`)
 * - `countermeasure` -> 六边形决策盒 (`hexagon`，兼顾高辨识度与 85% 文本容纳率)
 * - `end`   -> 双层终态圆角框 (`double-rect`)
 */
export function measurePDPCNodeSize(
    label: string,
    type: PDPCNodeType,
    fontSize: number,
): { width: number; height: number; shape: PDPCGeometryNode['shape']; rx: number } {
    const textW = estimateTextWidth(label, fontSize);
    if (type === 'start') {
        const w = Math.round(Math.max(120, textW + 38));
        const h = 44;
        return { width: w, height: h, shape: 'pill', rx: 22 };
    }
    if (type === 'end') {
        const w = Math.round(Math.max(120, textW + 38));
        const h = 46;
        return { width: w, height: h, shape: 'double-rect', rx: 10 };
    }
    if (type === 'countermeasure') {
        // 六边形左右斜切角各占 14px，留足横向余量
        const w = Math.round(Math.max(134, textW + 48));
        const h = 46;
        return { width: w, height: h, shape: 'hexagon', rx: 0 };
    }
    const w = Math.round(Math.max(120, textW + 34));
    const h = 44;
    return { width: w, height: h, shape: 'rect', rx: 6 };
}

/**
 * 检查水平或垂直线段是否穿过某个非端点节点的盒子（带膨胀 margin）
 */
function segmentHitsBox(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    box: { x: number; y: number; width: number; height: number },
    margin = 6,
): boolean {
    const bx1 = box.x - box.width / 2 - margin;
    const by1 = box.y - box.height / 2 - margin;
    const bx2 = box.x + box.width / 2 + margin;
    const by2 = box.y + box.height / 2 + margin;

    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    if (maxX < bx1 || minX > bx2 || maxY < by1 || minY > by2) return false;

    // 正交线段（水平或垂直）一旦 AABB 相交即必相交
    if (Math.abs(x1 - x2) < 1e-3 || Math.abs(y1 - y2) < 1e-3) {
        return true;
    }

    // 一般斜线段使用 Liang-Barsky 判断
    const dx = x2 - x1;
    const dy = y2 - y1;
    let t0 = 0, t1 = 1;
    const p = [-dx, dx, -dy, dy];
    const q = [x1 - bx1, bx2 - x1, y1 - by1, by2 - y1];
    for (let i = 0; i < 4; i++) {
        if (Math.abs(p[i]) < 1e-6) {
            if (q[i] < 0) return false;
        } else {
            const t = q[i] / p[i];
            if (p[i] < 0) {
                if (t > t1) return false;
                if (t > t0) t0 = t;
            } else {
                if (t < t0) return false;
                if (t < t1) t1 = t;
            }
        }
    }
    return t0 <= t1;
}

/**
 * 计算 PDPC 确定性分层正交几何清单（Geometry Spec SSOT）
 */
export function computePDPCGeometry(
    data: PDPCData,
    styles?: Partial<PDPCChartStyles>,
): PDPCGeometrySpec {
    const finalStyles: PDPCChartStyles = { ...DEFAULT_PDPC_STYLES_LOCAL, ...styles };
    const isHorizontal = finalStyles.layout !== 'Standard'; // Directional = LR (水平), Standard = TB (垂直)
    const fontSize = finalStyles.nodeFontSize || 12;

    const validNodes = data.nodes || [];
    const nodeById = new Map<string, PDPCNode>();
    validNodes.forEach(n => nodeById.set(n.id, n));

    const validLinks = (data.links || []).filter(
        l => l.source !== l.target && nodeById.has(l.source) && nodeById.has(l.target)
    );

    if (validNodes.length === 0) {
        return {
            layout: finalStyles.layout,
            groups: [],
            nodes: [],
            edges: [],
            bbox: { x1: 0, y1: 0, x2: 800, y2: 600 },
        };
    }

    // ────────────────────── 1. 阶段（Group）偏序与组内拓扑分层 ──────────────────────
    const groupOrder = new Map<string, number>();
    (data.groups || []).forEach((g, idx) => groupOrder.set(g.id, idx));

    const inDegree = new Map<string, number>();
    const adj = new Map<string, PDPCLink[]>();
    const revAdj = new Map<string, PDPCLink[]>();
    for (const n of validNodes) {
        inDegree.set(n.id, 0);
        adj.set(n.id, []);
        revAdj.set(n.id, []);
    }
    for (const l of validLinks) {
        adj.get(l.source)!.push(l);
        revAdj.get(l.target)!.push(l);
        inDegree.set(l.target, (inDegree.get(l.target) || 0) + 1);
    }

    // 先在每个 Group 内部计算局部拓扑深度 localRank，使得不同 Group 按声明顺序严格分带，
    // 彻底保证不同 Group 的包围盒在主轴方向互不重叠、互不穿插！
    const localRanks = new Map<string, number>();
    for (const n of validNodes) localRanks.set(n.id, 0);

    for (let iter = 0; iter < validNodes.length; iter++) {
        let updated = false;
        for (const l of validLinks) {
            const srcNode = nodeById.get(l.source)!;
            const tgtNode = nodeById.get(l.target)!;
            const sameGroup = (srcNode.groupId || '') === (tgtNode.groupId || '');
            if (!sameGroup) continue;
            const rSrc = localRanks.get(l.source) ?? 0;
            const rTgt = localRanks.get(l.target) ?? 0;
            if (rSrc + 1 > rTgt && rSrc + 1 < validNodes.length) {
                localRanks.set(l.target, rSrc + 1);
                updated = true;
            }
        }
        if (!updated) break;
    }

    // 若存在无 Group 节点与有 Group 节点混排，按 (groupIndex, localRank) 或全局最长路径生成全局 Rank
    const ranks = new Map<string, number>();
    if ((data.groups || []).length > 0) {
        // 按 Group 分桶，依次累加主轴 Rank 偏移量
        const buckets: Array<{ key: string; nodes: PDPCNode[] }> = [];
        const seenBuckets = new Map<string, PDPCNode[]>();

        // 保持 Group 定义顺序，未分组节点按出现位置放入独立桶
        for (const g of data.groups) {
            const arr: PDPCNode[] = [];
            seenBuckets.set(g.id, arr);
            buckets.push({ key: g.id, nodes: arr });
        }
        for (const n of validNodes) {
            if (n.groupId && seenBuckets.has(n.groupId)) {
                seenBuckets.get(n.groupId)!.push(n);
            } else {
                buckets.push({ key: `__orphan_${n.id}`, nodes: [n] });
            }
        }

        let rankCursor = 0;
        for (const b of buckets) {
            if (b.nodes.length === 0) continue;
            let minLocal = Infinity;
            let maxLocal = -Infinity;
            for (const nd of b.nodes) {
                const lr = localRanks.get(nd.id) ?? 0;
                if (lr < minLocal) minLocal = lr;
                if (lr > maxLocal) maxLocal = lr;
            }
            for (const nd of b.nodes) {
                const lr = (localRanks.get(nd.id) ?? 0) - minLocal;
                ranks.set(nd.id, rankCursor + lr);
            }
            rankCursor += (maxLocal - minLocal + 1);
        }
    } else {
        // 无 Group 时直接用全局最长链分层
        for (const n of validNodes) ranks.set(n.id, 0);
        for (let iter = 0; iter < validNodes.length; iter++) {
            let updated = false;
            for (const l of validLinks) {
                const rSrc = ranks.get(l.source) ?? 0;
                const rTgt = ranks.get(l.target) ?? 0;
                if (rSrc + 1 > rTgt && rSrc + 1 < validNodes.length) {
                    ranks.set(l.target, rSrc + 1);
                    updated = true;
                }
            }
            if (!updated) break;
        }
    }

    let maxRank = 0;
    ranks.forEach(r => { if (r > maxRank) maxRank = r; });

    // ────────────────────── 2. 层内排序（主线优先 + NG/对策侧移） ──────────────────────
    const layers: string[][] = Array.from({ length: maxRank + 1 }, () => []);
    for (const n of validNodes) {
        layers[ranks.get(n.id) ?? 0].push(n.id);
    }

    // 判断节点是否属于异常/对策支线（自身为 countermeasure 或所有入边均为 NG）
    const isContingencyNode = (id: string): boolean => {
        const nd = nodeById.get(id);
        if (!nd) return false;
        if (nd.type === 'countermeasure') return true;
        const inLinks = revAdj.get(id) || [];
        return inLinks.length > 0 && inLinks.every(l => l.marker === 'NG');
    };

    // 每一层内部排序：正常步骤在前（主线居中/偏上），NG 与 countermeasure 对策支线排在同层下侧/右侧
    for (let r = 0; r <= maxRank; r++) {
        const layer = layers[r];
        const prevOrder = new Map<string, number>();
        if (r > 0) {
            layers[r - 1].forEach((id, idx) => prevOrder.set(id, idx));
        }
        layer.sort((a, b) => {
            const contA = isContingencyNode(a) ? 1 : 0;
            const contB = isContingencyNode(b) ? 1 : 0;
            if (contA !== contB) return contA - contB;
            const predsA = revAdj.get(a) || [];
            const predsB = revAdj.get(b) || [];
            const avgA = predsA.length
                ? predsA.reduce((s, l) => s + (prevOrder.get(l.source) ?? 0), 0) / predsA.length
                : 0;
            const avgB = predsB.length
                ? predsB.reduce((s, l) => s + (prevOrder.get(l.source) ?? 0), 0) / predsB.length
                : 0;
            return avgA - avgB;
        });
    }

    // ────────────────────── 3. 节点尺寸度量与笛卡尔坐标解算 ──────────────────────
    const measured = new Map<string, ReturnType<typeof measurePDPCNodeSize>>();
    for (const n of validNodes) {
        measured.set(n.id, measurePDPCNodeSize(n.label, n.type, fontSize));
    }

    // 计算各 Rank 在主轴方向上的中心坐标（跨 Group 边界自动加宽留出 Group 内外边距）
    const rankMainCoord: number[] = new Array(maxRank + 1).fill(0);
    const rankMaxMainSpan: number[] = layers.map(layer => {
        let m = isHorizontal ? 130 : 46;
        for (const id of layer) {
            const sz = measured.get(id)!;
            const span = isHorizontal ? sz.width : sz.height;
            if (span > m) m = span;
        }
        return m;
    });

    const rankGroupKey = layers.map(layer => {
        const first = layer[0] ? nodeById.get(layer[0]) : undefined;
        return first?.groupId || '';
    });

    rankMainCoord[0] = 120;
    for (let r = 1; r <= maxRank; r++) {
        const groupChanged = rankGroupKey[r] !== rankGroupKey[r - 1];
        const baseGap = isHorizontal ? 86 : 78;
        const groupBorderExtra = groupChanged ? 64 : 0;
        const step = (rankMaxMainSpan[r - 1] + rankMaxMainSpan[r]) / 2 + baseGap + groupBorderExtra;
        rankMainCoord[r] = Math.round(rankMainCoord[r - 1] + step);
    }

    // 副轴方向坐标分配：主干对齐 baseline = 300，同层多节点或对策节点依次向下/向右展开
    const BASE_CROSS = 300;
    const nodeCoords = new Map<string, { x: number; y: number }>();

    for (let r = 0; r <= maxRank; r++) {
        const layer = layers[r];
        if (layer.length === 0) continue;

        const mainPos = rankMainCoord[r];
        const crossPositions: number[] = [];

        // 若该层只有 1 个节点且它是对策节点，向副轴正方向偏移 96px，凸显分支回流结构
        if (layer.length === 1) {
            const onlyId = layer[0];
            const offset = isContingencyNode(onlyId) ? 105 : 0;
            crossPositions.push(BASE_CROSS + offset);
        } else {
            let cursor = BASE_CROSS;
            for (let i = 0; i < layer.length; i++) {
                const id = layer[i];
                if (i === 0) {
                    cursor = isContingencyNode(id) ? BASE_CROSS + 105 : BASE_CROSS;
                    crossPositions.push(cursor);
                } else {
                    const prevSz = measured.get(layer[i - 1])!;
                    const currSz = measured.get(id)!;
                    const crossSpan = isHorizontal
                        ? (prevSz.height + currSz.height) / 2 + 54
                        : (prevSz.width + currSz.width) / 2 + 64;
                    cursor = Math.round(cursor + crossSpan);
                    crossPositions.push(cursor);
                }
            }
        }

        layer.forEach((id, idx) => {
            const crossPos = crossPositions[idx];
            if (isHorizontal) {
                nodeCoords.set(id, { x: mainPos, y: crossPos });
            } else {
                nodeCoords.set(id, { x: crossPos, y: mainPos });
            }
        });
    }

    // 组装 PDPCGeometryNode
    const geoNodes: PDPCGeometryNode[] = validNodes.map(n => {
        const sz = measured.get(n.id)!;
        const pos = nodeCoords.get(n.id) || { x: 200, y: 200 };
        let fill = finalStyles.stepColor;
        let textColor = finalStyles.stepTextColor;
        let stroke = '#93C5FD';

        if (n.type === 'start') {
            fill = finalStyles.startColor;
            textColor = finalStyles.startTextColor;
            stroke = '#60A5FA';
        } else if (n.type === 'end') {
            fill = finalStyles.endColor;
            textColor = finalStyles.endTextColor;
            stroke = '#F87171';
        } else if (n.type === 'countermeasure') {
            fill = finalStyles.countermeasureColor;
            textColor = finalStyles.countermeasureTextColor;
            stroke = '#34D399';
        }

        return {
            id: n.id,
            type: n.type,
            shape: sz.shape,
            groupId: n.groupId,
            x: pos.x,
            y: pos.y,
            width: sz.width,
            height: sz.height,
            rx: sz.rx,
            label: n.label,
            fontSize,
            fill,
            stroke,
            textColor,
            rank: ranks.get(n.id) ?? 0,
        };
    });

    const geoNodeMap = new Map<string, PDPCGeometryNode>(geoNodes.map(n => [n.id, n]));

    // ────────────────────── 4. 阶段分组框（Group/Combo）精确包络合成 ──────────────────────
    const geoGroups: PDPCGeometryGroup[] = [];
    for (const grp of data.groups || []) {
        const members = geoNodes.filter(n => n.groupId === grp.id);
        if (members.length === 0) continue;

        let gx1 = Infinity, gy1 = Infinity, gx2 = -Infinity, gy2 = -Infinity;
        for (const m of members) {
            gx1 = Math.min(gx1, m.x - m.width / 2);
            gy1 = Math.min(gy1, m.y - m.height / 2);
            gx2 = Math.max(gx2, m.x + m.width / 2);
            gy2 = Math.max(gy2, m.y + m.height / 2);
        }

        const padLeft = 24;
        const padRight = 24;
        const padTop = 42; // 顶部预留阶段标题栏高度
        const padBottom = 24;

        const labelW = estimateTextWidth(grp.label, 13) + 32;
        const boxW = Math.max(gx2 - gx1 + padLeft + padRight, labelW);
        const boxH = gy2 - gy1 + padTop + padBottom;
        const boxX = Math.round((gx1 + gx2) / 2 - boxW / 2);
        const boxY = Math.round(gy1 - padTop);

        geoGroups.push({
            id: grp.id,
            label: grp.label,
            x: boxX,
            y: boxY,
            width: Math.round(boxW),
            height: Math.round(boxH),
            fill: '#F8FAFC',
            stroke: 'rgba(13, 94, 66, 0.22)',
            labelColor: '#334155',
        });
    }

    // ────────────────────── 5. 正交走线路由与标签避障（Orthogonal Routing） ──────────────────────
    const geoEdges: PDPCGeometryEdge[] = [];

    // 跟踪每个节点的右侧/下侧出射端口及左侧/上侧入射端口序号，做微距分流防重合
    const outPortCount = new Map<string, number>();
    const inPortCount = new Map<string, number>();

    validLinks.forEach((link, idx) => {
        const src = geoNodeMap.get(link.source);
        const tgt = geoNodeMap.get(link.target);
        if (!src || !tgt) return;

        const isNG = link.marker === 'NG';
        const isOK = link.marker === 'OK';
        const stroke = isNG ? '#DC2626' : (isOK ? '#0284C7' : (finalStyles.lineColor || '#64748B'));
        const dashed = isNG || src.type === 'countermeasure';

        const outIdx = outPortCount.get(src.id) || 0;
        outPortCount.set(src.id, outIdx + 1);
        const inIdx = inPortCount.get(tgt.id) || 0;
        inPortCount.set(tgt.id, inIdx + 1);

        const otherNodes = geoNodes.filter(n => n.id !== src.id && n.id !== tgt.id);
        let pathPoints: Array<{ x: number; y: number }> = [];

        if (isHorizontal) {
            // 水平布局（LR）
            const sameCol = Math.abs(src.x - tgt.x) < 10;
            if (sameCol) {
                // 同列上下直连（如 n4 -> n5 [NG]）
                const goingDown = tgt.y >= src.y;
                const pStart = { x: src.x, y: goingDown ? src.y + src.height / 2 : src.y - src.height / 2 };
                const pEnd = { x: tgt.x, y: goingDown ? tgt.y - tgt.height / 2 : tgt.y + tgt.height / 2 };
                pathPoints = [pStart, pEnd];
            } else if (Math.abs(src.y - tgt.y) < 6) {
                // 同行水平连线：检查中间是否有阻挡节点
                const pStart = { x: src.x + src.width / 2, y: src.y };
                const pEnd = { x: tgt.x - tgt.width / 2, y: tgt.y };
                const blocked = otherNodes.some(nd => segmentHitsBox(pStart.x, pStart.y, pEnd.x, pEnd.y, nd));
                if (!blocked && tgt.x > src.x) {
                    pathPoints = [pStart, pEnd];
                } else {
                    // 绕行下方或上方走廊
                    const bypassY = Math.max(src.y, tgt.y) + 68;
                    pathPoints = [
                        { x: src.x, y: src.y + src.height / 2 },
                        { x: src.x, y: bypassY },
                        { x: tgt.x, y: bypassY },
                        { x: tgt.x, y: tgt.y + tgt.height / 2 },
                    ];
                }
            } else if (tgt.y > src.y && isNG) {
                // 主干节点向下引出 NG 分支到斜下方节点：从源节点底侧引出，水平折入目标节点左侧
                const pStart = { x: src.x, y: src.y + src.height / 2 };
                const pEnd = { x: tgt.x - tgt.width / 2, y: tgt.y };
                const midCorner = { x: src.x, y: tgt.y };
                const blocked = otherNodes.some(
                    nd =>
                        segmentHitsBox(pStart.x, pStart.y, midCorner.x, midCorner.y, nd) ||
                        segmentHitsBox(midCorner.x, midCorner.y, pEnd.x, pEnd.y, nd)
                );
                if (!blocked) {
                    pathPoints = [pStart, midCorner, pEnd];
                } else {
                    const midX = Math.round((src.x + src.width / 2 + tgt.x - tgt.width / 2) / 2);
                    pathPoints = [
                        { x: src.x + src.width / 2, y: src.y },
                        { x: midX, y: src.y },
                        { x: midX, y: tgt.y },
                        pEnd,
                    ];
                }
            } else if (src.y > tgt.y && src.type === 'countermeasure') {
                // 对策节点回流主干（如 n6 -> n7 [OK]）：从对策右侧水平延伸，再向上接入主干节点底侧或左侧
                const pStart = { x: src.x + src.width / 2, y: src.y };
                const pEndBottom = { x: tgt.x, y: tgt.y + tgt.height / 2 };
                const corner = { x: tgt.x, y: src.y };
                const blocked = otherNodes.some(
                    nd =>
                        segmentHitsBox(pStart.x, pStart.y, corner.x, corner.y, nd) ||
                        segmentHitsBox(corner.x, corner.y, pEndBottom.x, pEndBottom.y, nd)
                );
                if (!blocked && tgt.x > src.x) {
                    pathPoints = [pStart, corner, pEndBottom];
                } else {
                    const midX = Math.round((src.x + src.width / 2 + tgt.x - tgt.width / 2) / 2);
                    pathPoints = [
                        pStart,
                        { x: midX, y: src.y },
                        { x: midX, y: tgt.y },
                        { x: tgt.x - tgt.width / 2, y: tgt.y },
                    ];
                }
            } else {
                // 常规三段正交 Z 型折线，带碰撞走廊自适应搜索
                const yShiftOut = outIdx > 0 ? (outIdx % 2 === 1 ? 6 : -6) : 0;
                const yShiftIn = inIdx > 0 ? (inIdx % 2 === 1 ? 6 : -6) : 0;
                const pStart = { x: src.x + src.width / 2, y: src.y + yShiftOut };
                const pEnd = { x: tgt.x - tgt.width / 2, y: tgt.y + yShiftIn };

                const isZPathBlocked = (mx: number) =>
                    otherNodes.some(
                        nd =>
                            segmentHitsBox(pStart.x, pStart.y, mx, pStart.y, nd) ||
                            segmentHitsBox(mx, pStart.y, mx, pEnd.y, nd) ||
                            segmentHitsBox(mx, pEnd.y, pEnd.x, pEnd.y, nd)
                    );

                const candidateMidXs = [
                    Math.round((pStart.x + pEnd.x) / 2),
                    Math.round(pStart.x + 26),
                    Math.round(pEnd.x - 26),
                    Math.round(pStart.x + 14),
                    Math.round(pEnd.x - 14),
                ];

                const validMidX = candidateMidXs.find(mx => !isZPathBlocked(mx));
                if (validMidX !== undefined) {
                    pathPoints = [
                        pStart,
                        { x: validMidX, y: pStart.y },
                        { x: validMidX, y: pEnd.y },
                        pEnd,
                    ];
                } else {
                    // 若中间层被全部占据，走顶部或底部安全走廊
                    const minNodeY = Math.min(...geoNodes.map(n => n.y - n.height / 2));
                    const corridorY = Math.round(minNodeY - 36);
                    pathPoints = [
                        { x: src.x, y: src.y - src.height / 2 },
                        { x: src.x, y: corridorY },
                        { x: tgt.x, y: corridorY },
                        { x: tgt.x, y: tgt.y - tgt.height / 2 },
                    ];
                }
            }
        } else {
            // 垂直布局（Standard = TB 从上到下）
            const sameRow = Math.abs(src.y - tgt.y) < 10;
            if (sameRow) {
                const goingRight = tgt.x >= src.x;
                const pStart = { x: goingRight ? src.x + src.width / 2 : src.x - src.width / 2, y: src.y };
                const pEnd = { x: goingRight ? tgt.x - tgt.width / 2 : tgt.x + tgt.width / 2, y: tgt.y };
                pathPoints = [pStart, pEnd];
            } else if (Math.abs(src.x - tgt.x) < 6) {
                const pStart = { x: src.x, y: src.y + src.height / 2 };
                const pEnd = { x: tgt.x, y: tgt.y - tgt.height / 2 };
                const blocked = otherNodes.some(nd => segmentHitsBox(pStart.x, pStart.y, pEnd.x, pEnd.y, nd));
                if (!blocked && tgt.y > src.y) {
                    pathPoints = [pStart, pEnd];
                } else {
                    const bypassX = Math.max(src.x + src.width / 2, tgt.x + tgt.width / 2) + 56;
                    pathPoints = [
                        { x: src.x + src.width / 2, y: src.y },
                        { x: bypassX, y: src.y },
                        { x: bypassX, y: tgt.y },
                        { x: tgt.x + tgt.width / 2, y: tgt.y },
                    ];
                }
            } else {
                const xShiftOut = outIdx > 0 ? (outIdx % 2 === 1 ? 8 : -8) : 0;
                const xShiftIn = inIdx > 0 ? (inIdx % 2 === 1 ? 8 : -8) : 0;
                const pStart = { x: src.x + xShiftOut, y: src.y + src.height / 2 };
                const pEnd = { x: tgt.x + xShiftIn, y: tgt.y - tgt.height / 2 };

                const isVPathBlocked = (my: number) =>
                    otherNodes.some(
                        nd =>
                            segmentHitsBox(pStart.x, pStart.y, pStart.x, my, nd) ||
                            segmentHitsBox(pStart.x, my, pEnd.x, my, nd) ||
                            segmentHitsBox(pEnd.x, my, pEnd.x, pEnd.y, nd)
                    );

                const candidateMidYs = [
                    Math.round((pStart.y + pEnd.y) / 2),
                    Math.round(pStart.y + 24),
                    Math.round(pEnd.y - 24),
                    Math.round(pStart.y + 14),
                    Math.round(pEnd.y - 14),
                ];

                const validMidY = candidateMidYs.find(my => !isVPathBlocked(my));
                if (validMidY !== undefined) {
                    pathPoints = [
                        pStart,
                        { x: pStart.x, y: validMidY },
                        { x: pEnd.x, y: validMidY },
                        pEnd,
                    ];
                } else {
                    const minNodeX = Math.min(...geoNodes.map(n => n.x - n.width / 2));
                    const corridorX = Math.round(minNodeX - 42);
                    pathPoints = [
                        { x: src.x - src.width / 2, y: src.y },
                        { x: corridorX, y: src.y },
                        { x: corridorX, y: tgt.y },
                        { x: tgt.x - tgt.width / 2, y: tgt.y },
                    ];
                }
            }
        }

        // 计算 [OK] / [NG] 胶囊标签坐标（取最长线段的中点）
        let labelSpec: PDPCGeometryEdge['label'] | undefined;
        if (isOK || isNG) {
            let bestSegIdx = 0;
            let bestLen = -1;
            for (let i = 0; i < pathPoints.length - 1; i++) {
                const segLen = Math.hypot(
                    pathPoints[i + 1].x - pathPoints[i].x,
                    pathPoints[i + 1].y - pathPoints[i].y
                );
                if (segLen > bestLen) {
                    bestLen = segLen;
                    bestSegIdx = i;
                }
            }
            const a = pathPoints[bestSegIdx];
            const b = pathPoints[bestSegIdx + 1];
            labelSpec = {
                text: isNG ? 'NG' : 'OK',
                x: Math.round((a.x + b.x) / 2),
                y: Math.round((a.y + b.y) / 2),
                width: 32,
                height: 18,
                color: isNG ? '#DC2626' : '#0369A1',
                bgColor: isNG ? '#FEF2F2' : '#F0F9FF',
                borderColor: isNG ? '#FCA5A5' : '#7DD3FC',
            };
        }

        geoEdges.push({
            id: `pdpc_edge_${idx}_${link.source}_${link.target}`,
            source: link.source,
            target: link.target,
            marker: link.marker,
            pathPoints,
            stroke,
            lineWidth: finalStyles.lineWidth || 2,
            dashed,
            label: labelSpec,
        });
    });

    // ────────────────────── 6. 全局包围盒 bbox 与顶部标题计算 ──────────────────────
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const nd of geoNodes) {
        x1 = Math.min(x1, nd.x - nd.width / 2);
        y1 = Math.min(y1, nd.y - nd.height / 2);
        x2 = Math.max(x2, nd.x + nd.width / 2);
        y2 = Math.max(y2, nd.y + nd.height / 2);
    }
    for (const grp of geoGroups) {
        x1 = Math.min(x1, grp.x);
        y1 = Math.min(y1, grp.y);
        x2 = Math.max(x2, grp.x + grp.width);
        y2 = Math.max(y2, grp.y + grp.height);
    }
    for (const ed of geoEdges) {
        for (const pt of ed.pathPoints) {
            x1 = Math.min(x1, pt.x);
            y1 = Math.min(y1, pt.y);
            x2 = Math.max(x2, pt.x);
            y2 = Math.max(y2, pt.y);
        }
    }
    if (!Number.isFinite(x1)) {
        x1 = 0; y1 = 0; x2 = 800; y2 = 600;
    }

    let titleSpec: PDPCGeometrySpec['title'] | undefined;
    const titleText = (data.title || finalStyles.title || '').trim();
    if (titleText) {
        const titleFs = finalStyles.titleFontSize || 20;
        const titleW = estimateTextWidth(titleText, titleFs);
        const centerX = Math.round((x1 + x2) / 2);
        const titleY = Math.round(y1 - 36);
        titleSpec = {
            text: titleText,
            x: centerX,
            y: titleY,
            fontSize: titleFs,
            color: '#1A2428',
        };
        x1 = Math.min(x1, centerX - titleW / 2 - 16);
        x2 = Math.max(x2, centerX + titleW / 2 + 16);
        y1 = Math.min(y1, titleY - titleFs);
    }

    return {
        title: titleSpec,
        layout: finalStyles.layout,
        groups: geoGroups,
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
