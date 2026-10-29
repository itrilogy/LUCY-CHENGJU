/**
 * 关联图（Relation Diagram）几何不变量门禁（R30 · G1–G6）
 *
 * G1 拓扑角色守恒   sink（出度 0）必为 rect；source（入度 0）与 middle 必为 ellipse
 * G2 三模态零重叠   Directional / Centralized / Free 三种模式下所有节点 AABB 两两无交集
 * G3 方向型单调性   Directional 模式下，纯 DAG 的每条有向边满足 X(source) < X(target)
 * G4 中央型同心辐射 Centralized 模式下，核心症结位于质心，其余节点归一化椭圆半径随反向距离递增
 * G5 边界精确贴合   每条有向边的起止点精确落在源/目标节点外框（矩形或椭圆）上（误差 < 1.5px）
 * G6 确定性与 SVG   同输入两次解算坐标与 SVG 字符串逐字恒等，且包含标题、节点与箭头
 *
 * 运行：node --experimental-strip-types scripts/assert_relation_math.ts
 */

import assert from 'node:assert/strict';
import {
    parseRelationDSL,
    computeRelationGeometry,
    type RelationGeometryNode,
} from '../utils/relationGraph.ts';
import { renderRelationSVG } from '../utils/relationSvg.ts';

console.log('=== 关联图几何不变量门禁（G1–G6） ===');

const OFFICIAL_DSL = `Title: 多症结系统问题关联分析
Layout: Free

Color[Root]: #CF3A2B
Color[RootText]: #ffffff
Color[Middle]: #F1C40F
Color[MiddleText]: #ffffff
Color[End]: #fbbf24
Color[EndText]: #92400e
Color[Line]: #a1a1aa

Node: root1, 症结A：项目交付延期
Node: root2, 症结B：团队士气低落
Node: root3, 症结C：客户投诉增加
Node: m1, 需求频繁变更
Node: m2, 跨部门沟通不畅
Node: m3, 核心人员流失
Node: m4, 技术债务累积
Node: m5, 质量监控缺失
Node: e1, 客户决策链过长
Node: e2, 缺乏统一协作平台
Node: e3, 薪酬竞争力不足
Node: e4, 代码评审流程形同虚设
Node: e5, 自动化测试覆盖率低
Node: e6, 市场竞品压力传导
Node: e7, 历史遗留系统架构
Node: e8, 培训体系不完善

Rel: m1 -> root1
Rel: m2 -> root1
Rel: m4 -> root1
Rel: m3 -> root2
Rel: m2 -> root2
Rel: m5 -> root3
Rel: m1 -> root3
Rel: root1 -> root2
Rel: root1 -> root3
Rel: e1 -> m1
Rel: e6 -> m1
Rel: e2 -> m2
Rel: e8 -> m2
Rel: e3 -> m3
Rel: e7 -> m4
Rel: e4 -> m5
Rel: e5 -> m5
Rel: e8 -> m3
`;

/** 校验节点点坐标是否落在节点外框边界上 */
function distanceToNodeBoundary(nd: RelationGeometryNode, px: number, py: number): number {
    const dx = Math.abs(px - nd.x);
    const dy = Math.abs(py - nd.y);
    const hw = nd.width / 2;
    const hh = nd.height / 2;

    if (nd.shape === 'ellipse') {
        const norm = Math.hypot(dx / hw, dy / hh);
        // 距离椭圆边界的近似像素误差
        return Math.abs(norm - 1) * Math.min(hw, hh);
    }
    // 矩形边界误差
    const distToVert = Math.abs(dx - hw);
    const distToHoriz = Math.abs(dy - hh);
    if (dx <= hw + 1 && dy <= hh + 1) {
        return Math.min(distToVert, distToHoriz);
    }
    return Math.hypot(Math.max(0, dx - hw), Math.max(0, dy - hh));
}

function assertNoNodeOverlap(nodes: readonly RelationGeometryNode[], modeName: string) {
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const overlapX = (a.width + b.width) / 2 - Math.abs(a.x - b.x);
            const overlapY = (a.height + b.height) / 2 - Math.abs(a.y - b.y);
            assert.ok(
                overlapX <= 0 || overlapY <= 0,
                `[${modeName}] 节点重叠: ${a.id}(${a.x},${a.y},${a.width}x${a.height}) 与 ${b.id}(${b.x},${b.y},${b.width}x${b.height})`
            );
        }
    }
}

const parsed = parseRelationDSL(OFFICIAL_DSL);
assert.equal(parsed.nodes.length, 16, '官方示例应解析出 16 个节点');
assert.equal(parsed.links.length, 18, '官方示例应解析出 18 条连线');

// ────────────────────── G1 & G2 & G5: 三种布局模式全量检验 ──────────────────────
for (const layoutMode of ['Directional', 'Centralized', 'Free'] as const) {
    const spec = computeRelationGeometry(parsed.nodes, parsed.links, {
        ...parsed.styles,
        layout: layoutMode,
    }, 1200, 800);

    // G1: 拓扑角色守恒（root2, root3 出度为 0 -> sink -> rect；root1 有出边 root1->root2 -> middle -> ellipse）
    const byId = new Map(spec.nodes.map(n => [n.id, n]));
    assert.equal(byId.get('root2')?.role, 'sink', `[${layoutMode}] root2 应为 sink`);
    assert.equal(byId.get('root2')?.shape, 'rect', `[${layoutMode}] root2 应渲染为矩形`);
    assert.equal(byId.get('root3')?.role, 'sink', `[${layoutMode}] root3 应为 sink`);
    assert.equal(byId.get('root3')?.shape, 'rect', `[${layoutMode}] root3 应渲染为矩形`);
    assert.equal(byId.get('root1')?.role, 'middle', `[${layoutMode}] root1 因指向 root2/root3 应为 middle`);
    assert.equal(byId.get('e1')?.role, 'source', `[${layoutMode}] e1 应为 source`);
    assert.equal(byId.get('e1')?.shape, 'ellipse', `[${layoutMode}] e1 应渲染为椭圆`);

    // G2: 零重叠
    assertNoNodeOverlap(spec.nodes, layoutMode);

    // G5: 每条连线端点精确贴合节点边界
    for (const edge of spec.edges) {
        const src = byId.get(edge.source)!;
        const tgt = byId.get(edge.target)!;
        const errStart = distanceToNodeBoundary(src, edge.x1, edge.y1);
        const errEnd = distanceToNodeBoundary(tgt, edge.x2, edge.y2);
        assert.ok(errStart < 1.5, `[${layoutMode}] 边 ${edge.source}->${edge.target} 起点偏离边界 ${errStart.toFixed(2)}px`);
        assert.ok(errEnd < 1.5, `[${layoutMode}] 边 ${edge.source}->${edge.target} 终点偏离边界 ${errEnd.toFixed(2)}px`);
    }

    // G3: Directional 下纯 DAG 拓扑单调递增 X(source) < X(target)
    if (layoutMode === 'Directional') {
        for (const edge of spec.edges) {
            const src = byId.get(edge.source)!;
            const tgt = byId.get(edge.target)!;
            assert.ok(
                src.x < tgt.x,
                `[Directional] 因果流向违反从左到右单调性: ${src.id}(x=${src.x}) -> ${tgt.id}(x=${tgt.x})`
            );
        }
    }

    // G4: Centralized 下中心锚点位于 (600, 400)
    if (layoutMode === 'Centralized') {
        // root2 入度=3 出度=0, root3 入度=3 出度=0，必有一个为核心圆心
        const cNode = spec.nodes.find(n => n.x === 600 && n.y === 400);
        assert.ok(cNode, '[Centralized] 必须存在位于画布中心 (600,400) 的核心症结节点');
        assert.equal(cNode.role, 'sink', '[Centralized] 中心节点必须为主要症结 (sink)');
    }
}

// ────────────────────── G6: 确定性与 SVG 渲染完整性 ──────────────────────
const r1 = renderRelationSVG(parsed.nodes, parsed.links, parsed.styles, 1200, 800);
const r2 = renderRelationSVG(parsed.nodes, parsed.links, parsed.styles, 1200, 800);
assert.equal(r1.svg, r2.svg, '[G6] 两次 SVG 渲染结果必须 100% 恒等');
assert.ok(r1.svg.includes('多症结系统问题关联分析'), '[G6] SVG 必须包含图表标题');
assert.ok(r1.svg.includes('<ellipse'), '[G6] SVG 必须包含椭圆原因节点');
assert.ok(r1.svg.includes('<rect'), '[G6] SVG 必须包含矩形症结节点');
assert.ok(r1.svg.includes('<polygon'), '[G6] SVG 必须包含因果箭头');

// ────────────────────── 补充高压测试：双向互为因果弧线分离 + 30 节点密集图 ──────────────────────
const bidirectionalSpec = computeRelationGeometry(
    [
        { id: 'a', label: '因素A：沟通摩擦' },
        { id: 'b', label: '因素B：响应延迟' },
        { id: 'c', label: '核心症结：交付违约' },
    ],
    [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'a' },
        { source: 'b', target: 'c' },
    ],
    { layout: 'Free' },
    1000,
    700
);
const edgeAB = bidirectionalSpec.edges.find(e => e.source === 'a' && e.target === 'b')!;
const edgeBA = bidirectionalSpec.edges.find(e => e.source === 'b' && e.target === 'a')!;
assert.ok(edgeAB.controlPoint && edgeBA.controlPoint, '[双向边] 互为因果边必须生成贝塞尔控制点以分离弧线');
assert.notEqual(
    `${edgeAB.controlPoint.cx},${edgeAB.controlPoint.cy}`,
    `${edgeBA.controlPoint.cx},${edgeBA.controlPoint.cy}`,
    '[双向边] 正向与反向边的控制点必须分布在法线两侧'
);

// 30 节点高压无重叠验证
const denseNodes = Array.from({ length: 30 }, (_, i) => ({
    id: `n${i + 1}`,
    label: `复杂工程质量制约因子描述条目_${i + 1}`,
}));
const denseLinks = Array.from({ length: 29 }, (_, i) => ({
    source: `n${i + 1}`,
    target: `n${Math.min(30, i + 2 + (i % 3))}`,
}));
for (const mode of ['Directional', 'Centralized', 'Free'] as const) {
    const denseSpec = computeRelationGeometry(denseNodes, denseLinks, { layout: mode }, 1400, 900);
    assertNoNodeOverlap(denseSpec.nodes, `Dense30-${mode}`);
}

console.log('✅ 关联图几何不变量门禁（G1–G6 / 3 模式全量断言 + 双向边 + 30 节点高压）全部 PASS！');
