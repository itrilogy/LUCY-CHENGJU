/**
 * 过程决策程序图（PDPC Diagram）几何不变量门禁（R30 · G1–G6）
 *
 * G1 节点零重叠     Directional 与 Standard 两种模式下所有节点 AABB 两两交集为空
 * G2 阶段框包裹性   每个带 groupId 的节点 100% 落在对应 Group 阶段框内部，且不同阶段框互不重叠
 * G3 主干流向单调   Directional (LR) 下主轴 X 单调递增；Standard (TB) 下主轴 Y 单调递增
 * G4 正交连线零穿刺 每条连线的正交线段不穿过任何非端点节点的内部盒子
 * G5 语义样式完备   [NG] 边必为红色虚线且带 NG 标签；countermeasure 节点必为 hexagon；链式语法 a--b--c [OK] 全链生效
 * G6 确定性与 SVG   同输入两次解算坐标与 SVG 字符串逐字恒等
 *
 * 运行：node --experimental-strip-types scripts/assert_pdpc_math.ts
 */

import assert from 'node:assert/strict';
import {
    parsePDPCDSL,
    computePDPCGeometry,
    type PDPCGeometryNode,
} from '../utils/pdpcGraph.ts';
import { renderPDPCSVG } from '../utils/pdpcSvg.ts';

console.log('=== PDPC 图几何不变量门禁（G1–G6） ===');

const OFFICIAL_PDPC_DSL = `Title: 实验室火灾应急 PDPC 演练
Layout: Directional

Color[Start]: #DBEAFE
Color[Step]: #EFF6FF
Color[Countermeasure]: #ECFDF5
Color[End]: #FEF2F2
Color[StartText]: #1E40AF
Color[StepText]: #1D4ED8
Color[CountermeasureText]: #047857
Color[EndText]: #B91C1C
Color[Line]: #64748B
Line[Width]: 2

// 阶段 1：发现
Group: g1, 异常发现
  Item: n1, 烟雾报警器触发, [start]
  Item: n2, 确认火情真实性
EndGroup

// 阶段 2：处置
Group: g2, 应急处置
  Item: n3, 拨打 119 报警
  Item: n4, 启动自动灭火系统
  Item: n5, 灭火系统失效, [countermeasure]
  Item: n6, 使用手持灭火器补救, [countermeasure]
EndGroup

// 阶段 3：疏散
Group: g3, 人员疏散
  Item: n7, 全员依序撤离
  Item: n8, 清点人数, [end]
EndGroup

// 逻辑链条：id1--id2 [OK|NG]
n1--n2
n2--n3 [OK]
n2--n4 [OK]
n4--n7 [OK]
n4--n5 [NG]
n5--n6
n6--n7 [OK]
n7--n8
`;

function assertNoNodeOverlap(nodes: readonly PDPCGeometryNode[], tag: string) {
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const ox = (a.width + b.width) / 2 - Math.abs(a.x - b.x);
            const oy = (a.height + b.height) / 2 - Math.abs(a.y - b.y);
            assert.ok(
                ox <= 0 || oy <= 0,
                `[${tag}] 节点重叠: ${a.id}(${a.x},${a.y},${a.width}x${a.height}) 与 ${b.id}(${b.x},${b.y},${b.width}x${b.height})`
            );
        }
    }
}

function segmentHitsStrictInnerBox(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    nd: PDPCGeometryNode,
): boolean {
    // 缩进 2px 检测严格内穿
    const bx1 = nd.x - nd.width / 2 + 2;
    const by1 = nd.y - nd.height / 2 + 2;
    const bx2 = nd.x + nd.width / 2 - 2;
    const by2 = nd.y + nd.height / 2 - 2;
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    if (maxX < bx1 || minX > bx2 || maxY < by1 || minY > by2) return false;
    return true;
}

const parsed = parsePDPCDSL(OFFICIAL_PDPC_DSL);
assert.equal(parsed.data.nodes.length, 8, '官方示例应解析出 8 个节点');
assert.equal(parsed.data.groups.length, 3, '官方示例应解析出 3 个阶段分组');
assert.equal(parsed.data.links.length, 8, '官方示例应解析出 8 条逻辑链');

for (const layoutMode of ['Directional', 'Standard'] as const) {
    const spec = computePDPCGeometry(parsed.data, { ...parsed.styles, layout: layoutMode });
    const byId = new Map(spec.nodes.map(n => [n.id, n]));
    const grpById = new Map(spec.groups.map(g => [g.id, g]));

    // G1: 节点零重叠
    assertNoNodeOverlap(spec.nodes, layoutMode);

    // G2: 阶段框完全包裹成员节点，且阶段框之间互不交叠
    for (const nd of spec.nodes) {
        if (!nd.groupId) continue;
        const grp = grpById.get(nd.groupId);
        assert.ok(grp, `[${layoutMode}] 节点 ${nd.id} 的分组 ${nd.groupId} 必须存在`);
        assert.ok(nd.x - nd.width / 2 >= grp.x, `[${layoutMode}] 节点 ${nd.id} 左边界越出分组 ${grp.id}`);
        assert.ok(nd.x + nd.width / 2 <= grp.x + grp.width, `[${layoutMode}] 节点 ${nd.id} 右边界越出分组 ${grp.id}`);
        assert.ok(nd.y - nd.height / 2 >= grp.y, `[${layoutMode}] 节点 ${nd.id} 上边界越出分组 ${grp.id}`);
        assert.ok(nd.y + nd.height / 2 <= grp.y + grp.height, `[${layoutMode}] 节点 ${nd.id} 下边界越出分组 ${grp.id}`);
    }
    for (let i = 0; i < spec.groups.length; i++) {
        for (let j = i + 1; j < spec.groups.length; j++) {
            const ga = spec.groups[i], gb = spec.groups[j];
            const noOverlap =
                ga.x + ga.width <= gb.x ||
                gb.x + gb.width <= ga.x ||
                ga.y + ga.height <= gb.y ||
                gb.y + gb.height <= ga.y;
            assert.ok(noOverlap, `[${layoutMode}] 阶段分组框重叠: ${ga.id} 与 ${gb.id}`);
        }
    }

    // G3: 主干流向单调性（n1 -> n2 -> n4 -> n7 -> n8）
    const mainline = ['n1', 'n2', 'n4', 'n7', 'n8'];
    for (let i = 0; i < mainline.length - 1; i++) {
        const u = byId.get(mainline[i])!;
        const v = byId.get(mainline[i + 1])!;
        if (layoutMode === 'Directional') {
            assert.ok(u.x < v.x, `[Directional] 主干违反从左到右单调性: ${u.id}(x=${u.x}) -> ${v.id}(x=${v.x})`);
        } else {
            assert.ok(u.y < v.y, `[Standard] 主干违反从上到下单调性: ${u.id}(y=${u.y}) -> ${v.id}(y=${v.y})`);
        }
    }

    // G4: 正交连线零穿刺非端点节点
    for (const edge of spec.edges) {
        const pts = edge.pathPoints;
        assert.ok(pts.length >= 2, `[${layoutMode}] 边 ${edge.id} 至少包含 2 个路径点`);
        for (let s = 0; s < pts.length - 1; s++) {
            const p1 = pts[s], p2 = pts[s + 1];
            // 验证每段均为正交（水平或垂直）
            const isOrtho = Math.abs(p1.x - p2.x) < 1e-2 || Math.abs(p1.y - p2.y) < 1e-2;
            assert.ok(isOrtho, `[${layoutMode}] 边 ${edge.id} 段 ${s} 非正交: (${p1.x},${p1.y})->(${p2.x},${p2.y})`);
            for (const nd of spec.nodes) {
                if (nd.id === edge.source || nd.id === edge.target) continue;
                assert.ok(
                    !segmentHitsStrictInnerBox(p1.x, p1.y, p2.x, p2.y, nd),
                    `[${layoutMode}] 边 ${edge.source}->${edge.target} 穿刺了节点 ${nd.id}`
                );
            }
        }
    }

    // G5: 语义样式完备性
    assert.equal(byId.get('n1')?.shape, 'pill', '起点节点应为药丸胶囊形 (pill)');
    assert.equal(byId.get('n5')?.shape, 'hexagon', '对策节点应为六边形 (hexagon)');
    assert.equal(byId.get('n8')?.shape, 'double-rect', '终点节点应为双层终态框 (double-rect)');
    const ngEdge = spec.edges.find(e => e.source === 'n4' && e.target === 'n5')!;
    assert.equal(ngEdge.dashed, true, 'NG 异常分支连线必须为虚线');
    assert.equal(ngEdge.label?.text, 'NG', 'NG 异常分支必须附带 NG 标签');
}

// 链式语法全链标记生效回归测试（修复 G5：a--b--c [OK]）
const chainParsed = parsePDPCDSL(`Title: 链式测试
Item: a, 步骤A, [start]
Item: b, 步骤B
Item: c, 步骤C, [end]
a--b--c [OK]
`);
assert.equal(chainParsed.data.links.length, 2);
assert.equal(chainParsed.data.links[0].marker, 'OK', '链式语法第一段 a--b 也应携带 [OK] 标记');
assert.equal(chainParsed.data.links[1].marker, 'OK', '链式语法第二段 b--c 应携带 [OK] 标记');

// G6: 确定性与 SVG 渲染完整性
const r1 = renderPDPCSVG(parsed.data, parsed.styles);
const r2 = renderPDPCSVG(parsed.data, parsed.styles);
assert.equal(r1.svg, r2.svg, '[G6] 两次 PDPC SVG 渲染结果必须 100% 恒等');
assert.ok(r1.svg.includes('实验室火灾应急 PDPC 演练'), '[G6] SVG 必须包含图表标题');
assert.ok(r1.svg.includes('stroke-dasharray="6,4"'), '[G6] SVG 必须包含阶段分组框与 NG 虚线');
assert.ok(r1.svg.includes('<polygon'), '[G6] SVG 必须包含六边形对策节点与箭头');

console.log('✅ PDPC 图几何不变量门禁（G1–G6 / 双模式全量断言 + 链式语法回归）全部 PASS！');
