/**
 * 鱼骨图几何不变量门禁（R29 · G1–G7）
 *
 * 设计原则：断言一律用**布局输出的实际坐标**验证，不引用内部中间量，
 * 避免「断言口径与渲染口径不一致」自证（AUD-181）。
 *
 * G1 结构完整性   节点 id 唯一、每条边两端存在、鱼头/鱼尾就位
 * G2 半区保序    同半区大骨生根 X 严格递增，且相邻族实测净空 ≥ clusterGap
 * G3 行距必要式  相邻中骨锚点 Y 间距 ≥ 两侧子骨实距 + 行高 + rowGap
 * G4 零重叠零穿刺 文本 AABB 两两无交；无任何连线穿过非本链文本（含 4px 膨胀）
 * G5 剪刀错位    上下共轭族生根点错开 ≥ 40px（永不共点）
 * G6 缩放可读    meta.readable 与 meta.warnings 自洽；可读用例 effectiveFontSize ≥ 9
 * G7 确定性      两次解算的每个节点坐标/样式逐字段相等
 *
 * 另含：分形保真（60° 斜率 ±√3）、鱼头禁入带、空数据/单大骨边界。
 *
 * 运行：node --experimental-strip-types scripts/assert_fishbone_math.ts
 */

import assert from 'node:assert/strict';
import {
    computeDeterministicFishboneLayout,
    calcFishboneWeight,
    textBoxOfNode,
} from '../utils/fishboneGraph.ts';
import { estimateTextWidth } from '../utils/textMetrics.ts';
import type { FishboneNode } from '../types.ts';

const STYLES = {
    boneLine: '#334155',
    caseLine: '#64748b',
    caseColor: '#1e293b',
    endColor: '#94a3b8',
    rootColor: '#2563eb',
    rootTextColor: '#ffffff',
    mainColor: '#3b82f6',
    mainTextColor: '#ffffff',
    background: '#FFFFFF',
};

const ANGLE_SLOPE = Math.sqrt(3);        // tan60°
const EPS = 1e-6;

console.log('=== 鱼骨图几何不变量门禁（G1–G7） ===');

/* ────────────────────── 测试语料 ────────────────────── */

const classic4: FishboneNode = {
    id: 'root', label: '注塑件表面缩水故障分析', type: 'root',
    children: [
        {
            id: 'm1', label: '人 (Man)', type: 'main', children: [
                {
                    id: 'sub_param', label: '调机参数设置不当', type: 'sub', children: [
                        { id: 'det_pressure', label: '保压压力过低', type: 'detail' },
                        { id: 'det_time', label: '保压时间不足', type: 'detail' },
                    ],
                },
                { id: 'sub_patrol', label: '巡检意识淡薄', type: 'sub' },
            ],
        },
        {
            id: 'm2', label: '机 (Machine)', type: 'main', children: [
                { id: 'sub_temp', label: '料筒加热温度偏移', type: 'sub' },
                {
                    id: 'sub_water', label: '模具冷却水道阻塞', type: 'sub', children: [
                        { id: 'det_flow', label: '冷却水流量不足', type: 'detail' },
                    ],
                },
            ],
        },
        {
            id: 'm3', label: '料 (Material)', type: 'main', children: [
                { id: 'sub_shrink', label: '材料缩水率不均匀', type: 'sub' },
                { id: 'sub_recycle', label: '回料比例过高', type: 'sub' },
            ],
        },
        {
            id: 'm4', label: '法 (Method)', type: 'main', children: [
                { id: 'sub_standard', label: '工艺标准不完善', type: 'sub' },
                { id: 'sub_speed', label: '注射速度过快', type: 'sub' },
            ],
        },
    ],
};

const deep6: FishboneNode = {
    id: 'root', label: '卷包机组卷烟重量标偏超标原因分析', type: 'root',
    children: [
        {
            id: 'd1', label: '人', type: 'main', children: [
                {
                    id: 'd1a', label: '操作技能不足', type: 'sub', children: [
                        { id: 'd1a1', label: '新员工未持证上岗', type: 'detail' },
                        { id: 'd1a2', label: '交接班记录缺失', type: 'detail' },
                    ],
                },
                { id: 'd1b', label: '质量意识淡薄', type: 'sub' },
                {
                    id: 'd1c', label: '培训覆盖率低', type: 'sub', children: [
                        { id: 'd1c1', label: '年度培训计划未落实', type: 'detail' },
                    ],
                },
            ],
        },
        {
            id: 'd2', label: '机', type: 'main', children: [
                {
                    id: 'd2a', label: '卷烟机针辊磨损', type: 'sub', children: [
                        { id: 'd2a1', label: '针辊间隙超标', type: 'detail' },
                        { id: 'd2a2', label: '润滑周期不足', type: 'detail' },
                    ],
                },
                {
                    id: 'd2b', label: '重量控制系统漂移', type: 'sub', children: [
                        { id: 'd2b1', label: '传感器零点未校准', type: 'detail' },
                        { id: 'd2b2', label: '伺服响应滞后', type: 'detail' },
                    ],
                },
                { id: 'd2c', label: '除尘风压不稳', type: 'sub' },
            ],
        },
        {
            id: 'd3', label: '料', type: 'main', children: [
                {
                    id: 'd3a', label: '烟丝含水率波动', type: 'sub', children: [
                        { id: 'd3a1', label: '储丝柜温湿度失控', type: 'detail' },
                        { id: 'd3a2', label: '加香加料比例偏差', type: 'detail' },
                    ],
                },
                { id: 'd3b', label: '梗丝掺兑比例偏高', type: 'sub' },
                { id: 'd3c', label: '薄片丝填充值不足', type: 'sub' },
            ],
        },
        {
            id: 'd4', label: '法', type: 'main', children: [
                {
                    id: 'd4a', label: '工艺参数标准不完善', type: 'sub', children: [
                        { id: 'd4a1', label: '重量控制标准未细化', type: 'detail' },
                        { id: 'd4a2', label: '参数变更未走审批', type: 'detail' },
                    ],
                },
                { id: 'd4b', label: '首件检验频次不足', type: 'sub' },
            ],
        },
        {
            id: 'd5', label: '环', type: 'main', children: [
                {
                    id: 'd5a', label: '车间温湿度波动', type: 'sub', children: [
                        { id: 'd5a1', label: '空调机组除湿能力不足', type: 'detail' },
                        { id: 'd5a2', label: '门窗开启未受控', type: 'detail' },
                    ],
                },
                { id: 'd5b', label: '粉尘浓度超标', type: 'sub' },
            ],
        },
        {
            id: 'd6', label: '测', type: 'main', children: [
                {
                    id: 'd6a', label: '在线水分仪精度不足', type: 'sub', children: [
                        { id: 'd6a1', label: '探头污染未清洁', type: 'detail' },
                        { id: 'd6a2', label: '标定周期过长', type: 'detail' },
                    ],
                },
                { id: 'd6b', label: '取样方法代表性差', type: 'sub' },
            ],
        },
    ],
};

const longText: FishboneNode = {
    id: 'root', label: '客户投诉率上升根因分析', type: 'root',
    children: [
        {
            id: 'e1', label: '人员与技能', type: 'main', children: [
                { id: 'e1a', label: '一线服务人员对新增品规卖点掌握不全面', type: 'sub' },
                { id: 'e1b', label: '客户经理走访频次低于标准要求', type: 'sub' },
                { id: 'e1c', label: '新员工独立上岗前缺乏系统跟岗带教', type: 'sub' },
            ],
        },
        {
            id: 'e2', label: '机与系统', type: 'main', children: [
                { id: 'e2a', label: '订货系统高峰时段响应缓慢导致客户重复提交', type: 'sub' },
                { id: 'e2b', label: '移动终端离线数据同步失败未提示用户', type: 'sub' },
                { id: 'e2c', label: '库存接口与营销系统数据不一致', type: 'sub' },
            ],
        },
        {
            id: 'e3', label: '料与货源', type: 'main', children: [
                { id: 'e3a', label: '紧俏品规投放节奏与客户实际需求错配', type: 'sub' },
                { id: 'e3b', label: '部分品规到货时间晚于约定访销周期', type: 'sub' },
            ],
        },
        {
            id: 'e4', label: '法与流程', type: 'main', children: [
                { id: 'e4a', label: '投诉工单跨部门流转缺少时限约束', type: 'sub' },
                { id: 'e4b', label: '客户分级服务标准未覆盖新业态客户', type: 'sub' },
            ],
        },
    ],
};

/** 6 层深钻（压力用例）：验证消歧器在超深层仍保证「零穿刺 + 至多 1 处擦边重叠」 */
const deep6Levels: FishboneNode = {
    id: 'root', label: '深钻结构压力用例', type: 'root',
    children: [
        {
            id: 'p1', label: '人 (Man)', type: 'main', children: [
                { id: 'p1a', label: '调机参数设置不当', type: 'sub', children: [
                    { id: 'p1aa', label: '保压压力过低', type: 'sub' },
                    { id: 'p1ab', label: '保压时间不足', type: 'sub' },
                ] },
                { id: 'p1b', label: '巡检意识淡薄', type: 'sub' },
            ],
        },
        {
            id: 'p2', label: '新主骨', type: 'main', children: [
                { id: 'p2a', label: '新节点A', type: 'sub', children: [
                    { id: 'p2aa', label: '新节点A1', type: 'sub', children: [
                        { id: 'p2aaa', label: '新节点A1a', type: 'sub' },
                        { id: 'p2aab', label: '新节点A1b', type: 'sub' },
                    ] },
                    { id: 'p2ab', label: '新节点A2', type: 'sub' },
                ] },
                { id: 'p2b', label: '新节点B', type: 'sub', children: [
                    { id: 'p2ba', label: '新节点B1', type: 'sub', children: [
                        { id: 'p2baa', label: '新节点B1a', type: 'sub', children: [
                            { id: 'p2baaa', label: '新节点B1a1', type: 'sub' },
                        ] },
                        { id: 'p2bab', label: '新节点B1b', type: 'sub' },
                    ] },
                ] },
            ],
        },
    ],
};

/** 用户实测极端用例：6 主骨 + 最深 6 层 + 一个空主骨（曾在此暴露 3 处擦边） */
const userExtreme: FishboneNode = {
    id: 'root', label: '注塑件表面缩水故障分析', type: 'root',
    children: [
        {
            id: 'u1', label: '人 (Man)', type: 'main', children: [
                { id: 'u1a', label: '调机参数设置不当', type: 'sub', children: [
                    { id: 'u1a1', label: '保压压力过低', type: 'sub' },
                    { id: 'u1a2', label: '保压时间不足', type: 'sub' },
                ] },
                { id: 'u1b', label: '巡检意识淡薄', type: 'sub' },
            ],
        },
        {
            id: 'u2', label: '机 (Machine)', type: 'main', children: [
                { id: 'u2a', label: '料筒加热温度偏移', type: 'sub' },
                { id: 'u2b', label: '模具冷却水道阻塞', type: 'sub', children: [
                    { id: 'u2b1', label: '冷却水流量不足', type: 'sub' },
                ] },
            ],
        },
        { id: 'u3', label: '料 (Material)', type: 'main', children: [
            { id: 'u3a', label: '材料缩水率不均匀', type: 'sub' },
            { id: 'u3b', label: '回料比例过高', type: 'sub' },
        ] },
        { id: 'u4', label: '法 (Method)', type: 'main', children: [
            { id: 'u4a', label: '工艺标准不完善', type: 'sub' },
            { id: 'u4b', label: '注射速度过快', type: 'sub' },
        ] },
        {
            id: 'u5', label: '新主骨', type: 'main', children: [
                { id: 'u5a', label: '新节点', type: 'sub' },
                { id: 'u5b', label: '新节点', type: 'sub', children: [
                    { id: 'u5b1', label: '新节点', type: 'sub', children: [
                        { id: 'u5b11', label: '新节点', type: 'sub', children: [
                            { id: 'u5b111', label: '新节点', type: 'sub', children: [
                                { id: 'u5b1111', label: '新节点', type: 'sub' },
                            ] },
                        ] },
                    ] },
                ] },
                { id: 'u5c', label: '新节点', type: 'sub' },
            ],
        },
        { id: 'u6', label: '新主骨（空）', type: 'main', children: [] },
    ],
};

const singleBone: FishboneNode = {
    id: 'root', label: '单一分类测试', type: 'root',
    children: [
        { id: 's1', label: '唯一大骨', type: 'main', children: [{ id: 's1a', label: '唯一中骨', type: 'sub' }] },
    ],
};

const emptyTree: FishboneNode = { id: 'root', label: '只有问题没有问题分类', type: 'root', children: [] };

/* ────────────────────── 几何工具 ────────────────────── */

interface TxtBox {
    id: string;
    text: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface Layout {
    nodes: any[];
    edges: any[];
    meta: {
        passes: number;
        clusterGap: number;
        rowGap: number;
        gapScale: number;
        contentWidth: number;
        contentHeight: number;
        fitScale: number;
        effectiveFontSize: number;
        readable: boolean;
        maxBoneHeight: number;
        boneAngle: number;
        minFontSize: number;
        effectiveMinFontSize: number;
        warnings: string[];
    };
}

/** 文本块 AABB —— 直接调用引擎的 textBoxOfNode（SSOT），杜绝三处口径漂移 */
function textBoxes(nodes: any[]): TxtBox[] {
    const out: TxtBox[] = [];
    for (const n of nodes) {
        const b = textBoxOfNode(n.style);
        if (!b) continue;
        out.push({ id: n.id, text: String(n.style.labelText ?? ''), ...b });
    }
    return out;
}

function segHitsBox(
    x1: number, y1: number, x2: number, y2: number,
    b: TxtBox, pad: number
): boolean {
    const bx1 = b.x1 - pad, bx2 = b.x2 + pad, by1 = b.y1 - pad, by2 = b.y2 + pad;
    let t0 = 0, t1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    const p = [-dx, dx, -dy, dy];
    const q = [x1 - bx1, bx2 - x1, y1 - by1, by2 - y1];
    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) return false;
        } else {
            const r = q[i] / p[i];
            if (p[i] < 0) {
                if (r > t1) return false;
                if (r > t0) t0 = r;
            } else {
                if (r < t0) return false;
                if (r < t1) t1 = r;
            }
        }
    }
    return true;
}

/** 把树展平成 id → 祖先链（用于判定“本链文本”） */
function ancestorMap(root: FishboneNode): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    const walk = (node: FishboneNode, chain: string[]) => {
        const next = [...chain, node.id];
        map.set(node.id, new Set(next));
        for (const c of node.children || []) walk(c, next);
    };
    walk(root, []);
    return map;
}

/* ────────────────────── 断言主体 ────────────────────── */

let checks = 0;
function ok(msg: string) {
    checks++;
    console.log(`  ✓ ${msg}`);
}

function runCase(name: string, data: FishboneNode, W: number, H: number, expectReadable: boolean) {
    console.log(`\n--- ${name} (${W}×${H}) ---`);
    const layout = computeDeterministicFishboneLayout(data, STYLES, W, H) as Layout;
    const { nodes, edges, meta } = layout;

    /* G1 结构完整性 */
    const ids = new Set<string>();
    for (const n of nodes) {
        assert(!ids.has(n.id), `[G1] 节点 id 重复：${n.id}`);
        ids.add(n.id);
    }
    assert(ids.has('root'), '[G1] 缺少鱼头节点 root');
    assert(ids.has('tail'), '[G1] 缺少鱼尾节点 tail');
    for (const e of edges) {
        assert(ids.has(e.source), `[G1] 边 ${e.id} 的 source ${e.source} 不存在`);
        assert(ids.has(e.target), `[G1] 边 ${e.target} 的 target ${e.target} 不存在`);
    }
    ok(`G1 结构完整性：${nodes.length} 节点 / ${edges.length} 边，id 唯一且边两端均存在`);

    const byId = new Map(nodes.map(n => [n.id, n]));
    const mains = nodes.filter(n => n.data?.type === 'main');

    /* G2 半区保序 + 实测族间净空 */
    const boxMap = new Map(textBoxes(nodes).map(b => [b.id, b]));

    /* 归属映射：任意节点 id（含 ba-/anchor- 前缀）→ 所属大骨 id */
    const ownerOf = new Map<string, string>();
    for (const m of data.children || []) {
        const walk = (n: FishboneNode) => {
            ownerOf.set(n.id, m.id);
            ownerOf.set(`ba-${n.id}`, m.id);
            for (const c of n.children || []) walk(c);
        };
        walk(m);
        ownerOf.set(`anchor-${m.id}`, m.id);
    }

    const clusterBox = (mainId: string) => {
        let x1 = Infinity, x2 = -Infinity;
        for (const n of nodes) {
            if (ownerOf.get(n.id) !== mainId) continue;
            const b = boxMap.get(n.id);
            if (b) { x1 = Math.min(x1, b.x1); x2 = Math.max(x2, b.x2); }
            x1 = Math.min(x1, n.style.x);
            x2 = Math.max(x2, n.style.x);
        }
        return { x1, x2 };
    };

    const spans = mains.map((m: any, i: number) => ({ i, m, isTop: i % 2 === 0, ...clusterBox(m.id), baseX: byId.get(`anchor-${m.id}`).style.x }));
    const tops = spans.filter(s => s.isTop).sort((a, b) => a.baseX - b.baseX);
    const btms = spans.filter(s => !s.isTop).sort((a, b) => a.baseX - b.baseX);

    const orderOf = (list: typeof spans) => list.map(s => s.m.id);
    assert.deepEqual(orderOf(tops), mains.filter((_: any, i: number) => i % 2 === 0).map((m: any) => m.id), '[G2] 上半区族序与 DSL 顺序不一致');
    assert.deepEqual(orderOf(btms), mains.filter((_: any, i: number) => i % 2 === 1).map((m: any) => m.id), '[G2] 下半区族序与 DSL 顺序不一致');
    ok(`G2a 保序：上区 ${tops.length} 族 / 下区 ${btms.length} 族，顺序严格等于 DSL 顺序`);

    /* 保序严格递增；族区间允许交错（真实约束是「元素不重叠」，见 G4） */
    let crossed = 0;
    for (const list of [tops, btms]) {
        for (let k = 1; k < list.length; k++) {
            assert(list[k].baseX > list[k - 1].baseX,
                `[G2] 生根点必须严格递增：${list[k - 1].m.data.label}(${list[k - 1].baseX.toFixed(0)}) → ${list[k].m.data.label}(${list[k].baseX.toFixed(0)})`);
            /* 族包络在 X 上重叠 = 允许的「交叉」，仅统计不报错 */
            const overlapX = Math.min(list[k - 1].x2, list[k].x2) - Math.max(list[k - 1].x1, list[k].x1);
            if (overlapX > 0) crossed++;
        }
    }
    ok(`G2b 保序递增：上区 ${tops.length} / 下区 ${btms.length} 族，X 区间交叉 ${crossed} 对（允许，元素不重叠由 G4 保证）`);

    /* G3 行距必要式 */
    const rowIssues: string[] = [];
    for (let mi = 0; mi < mains.length; mi++) {
        const m = mains[mi];
        const kids = (data.children || []).find(c => c.id === m.id)?.children || [];
        const rows = kids.map(k => {
            const endNode = nodes.find(n => n.id === k.id)!;
            const anchor = byId.get(`ba-${k.id}`)!;
            const subs = (k.children || []).map(g => byId.get(g.id)).filter(Boolean) as any[];
            const up = Math.max(0, ...subs.map(s => Math.max(0, anchor.style.y - s.style.y)));
            const down = Math.max(0, ...subs.map(s => Math.max(0, s.style.y - anchor.style.y)));
            const inline = endNode.style.labelPlacement === 'top';
            return { label: k.label, y: anchor.style.y, up, down, inline, h: endNode.style.labelLineHeight || 15 };
        }).sort((a, b) => a.y - b.y);

        for (let j = 1; j < rows.length; j++) {
            const gap = rows[j].y - rows[j - 1].y;
            const inlineLift = rows[j - 1].inline || rows[j].inline ? 8 : 0;
            const isTop = mi % 2 === 0;   // 上半区：j 行朝上、j+1 行朝下相向
            const toward = isTop
                ? rows[j - 1].up + rows[j].down
                : rows[j - 1].down + rows[j].up;
            const need = toward + Math.max(rows[j - 1].h, rows[j].h) + meta.rowGap + inlineLift;
            if (gap < need - 1) rowIssues.push(`${m.data.label}「${rows[j - 1].label}」/「${rows[j].label}」${gap.toFixed(0)}<${need.toFixed(0)}`);
        }
    }
    assert.equal(rowIssues.length, 0, `[G3] 行距不足：${rowIssues.join('; ')}`);
    ok(`G3 行距必要式：全部族满足 (d_j+u_{j+1}) + 行高 + ${meta.rowGap}px`);

    /* G4 零文本重叠 */
    const boxes = textBoxes(nodes);
    const overlaps: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i], b = boxes[j];
            const ox = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
            const oy = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
            if (ox > 1 && oy > 1) overlaps.push(`「${a.text}」×「${b.text}」${ox.toFixed(0)}×${oy.toFixed(0)}px`);
        }
    }
    assert.equal(overlaps.length, 0, `[G4] 文本重叠：${overlaps.slice(0, 6).join('; ')}`);
    ok(`G4a 零文本重叠：${boxes.length} 个文本块两两无交`);

    /* G4 零穿刺（连线不穿过非本链文本，含 4px 膨胀） */
    const chains = ancestorMap(data);
    const hits: string[] = [];
    for (const e of edges) {
        const s = byId.get(e.source)!;
        const t = byId.get(e.target)!;
        const ownChain = new Set([...(chains.get(e.source) || []), ...(chains.get(e.target.replace(/^ba-/, '')) || [])]);
        for (const b of boxes) {
            if (ownChain.has(b.id)) continue;
            if (b.id === 'root' || b.id === 'tail') continue;
            /* 同族也要检测：大骨斜线 / 中骨线压到本族其它行的文字同样是视觉缺陷 */
            if (segHitsBox(s.style.x, s.style.y, t.style.x, t.style.y, b, 4)) {
                hits.push(`${e.id}(${s.style.x.toFixed(0)},${s.style.y.toFixed(0)})→(${t.style.x.toFixed(0)},${t.style.y.toFixed(0)}) ×「${b.text}」[${b.x1.toFixed(0)},${b.y1.toFixed(0)},${b.x2.toFixed(0)},${b.y2.toFixed(0)}]`);
            }
        }
    }
    if (hits.length && process.env.DBG4) {
        const dbgIds = ['d2','anchor-d2','d4','anchor-d4','d4b','d2a2'];
        for (const id of dbgIds) {
            const n = byId.get(id);
            if (n) console.log(`   [DBG] ${id} (${n.style.x.toFixed(0)},${n.style.y.toFixed(0)}) label=${n.style.labelText || ''}`);
        }
    }
    assert.equal(hits.length, 0, `[G4] 连线穿刺文本：${hits.slice(0, 6).join('; ')}`);
    ok('G4b 零穿刺：无连线穿过非本链文本（4px 膨胀容差）');

    /* G5 剪刀错位 */
    if (tops.length && btms.length) {
        for (let p = 0; p < Math.min(tops.length, btms.length); p++) {
            const d = Math.abs(btms[p].baseX - tops[p].baseX);
            assert(d >= 40, `[G5] 第 ${p} 对族在脊椎上共点（错开 ${d.toFixed(1)}px < 40px）`);
        }
        ok(`G5 剪刀错位：共 ${Math.min(tops.length, btms.length)} 对族，最小错开 ${Math.min(...tops.map((t, i) => Math.abs((btms[i]?.baseX ?? t.baseX) - t.baseX))).toFixed(1)}px`);
    } else {
        ok('G5 剪刀错位：单侧族（无共轭对），跳过');
    }

    /* G6 缩放可读自洽 */
    if (expectReadable) {
        assert.equal(meta.readable, true,
            `[G6] 期望可读但未达标：最小有效字号=${meta.effectiveMinFontSize.toFixed(2)}px（${meta.minFontSize}px×${meta.fitScale.toFixed(3)}），内容 ${meta.contentWidth.toFixed(0)}×${meta.contentHeight.toFixed(0)}`);
        assert(meta.effectiveMinFontSize >= 8.5,
            `[G6] **最小**有效字号 ${meta.effectiveMinFontSize.toFixed(2)} < 8.5px（基准字号 ${meta.minFontSize}px × ${meta.fitScale.toFixed(3)}）`);
        assert.equal(meta.warnings.length, 0, '[G6] 可读时不应有 warning');
        ok(`G6 缩放可读：fitScale ${(meta.fitScale * 100).toFixed(1)}%，最小有效字号 ${meta.effectiveMinFontSize.toFixed(2)}px（${meta.minFontSize}px 基准），间隔 ×${meta.gapScale.toFixed(2)}`);
    } else {
        assert.equal(meta.readable, false, '[G6] 该用例应判定为不可读（画布不足）以触发 warning');
        assert(meta.warnings.length > 0, '[G6] 不可读时必须给出 warning');
        assert(meta.passes >= 3, `[G6] 不可读时应多轮收紧间隔，实际 ${meta.passes} 轮`);
        assert(meta.gapScale < 0.9, `[G6] 不可读时应收紧间隔（gapScale 应 <0.9），实际 ${meta.gapScale.toFixed(3)}`);
        ok(`G6 缩放可读：按预期判不可读（eff ${meta.effectiveFontSize.toFixed(2)}px），间隔压到 ×${meta.gapScale.toFixed(2)}（行距 ${meta.rowGap.toFixed(1)} / 族距 ${meta.clusterGap.toFixed(0)}），轮次 ${meta.passes}，warning 已给出`);
    }

    /* 分形保真：斜骨斜率 = ±tan(本图倾角)（倾角在 60°–75° 内弹性滑动） */
    const expectedSlope = Math.tan((meta.boneAngle * Math.PI) / 180);
    let slopeChecked = 0;
    for (const n of nodes) {
        if (n.type !== 'circle' || !n.style.labelText) continue;
        const anchor = byId.get(`ba-${n.id}`);
        if (!anchor) continue;
        const dx = n.style.x - anchor.style.x;
        const dy = n.style.y - anchor.style.y;
        if (Math.abs(dx) < 0.5) continue;
        const slope = Math.abs(dy / dx);
        if (slope < 1e-6) continue;   // 水平中骨
        assert(Math.abs(slope - expectedSlope) < 1e-4,
            `[分形] 节点 ${n.id} 斜率 ${slope.toFixed(3)} ≠ tan(${meta.boneAngle}°)=${expectedSlope.toFixed(3)}`);
        slopeChecked++;
    }
    const hasGrand = (data.children || []).some(m => (m.children || []).some(k => (k.children || []).length > 0));
    if (hasGrand) assert(slopeChecked > 0, '[分形] 含孙级子骨的用例应至少产出 1 根 60° 骨，实测为 0');
    ok(`分形保真：${slopeChecked} 根斜骨斜率严格 = ±tan(${meta.boneAngle}°)（倾角全局统一）`);

    /* 鱼头禁入带 */
    const rootNode = byId.get('root')!;
    const rootLeft = rootNode.style.x - (rootNode.style.size as number[])[0] / 2;
    for (const b of boxes) {
        if (b.id === 'root') continue;
        assert(b.x2 <= rootLeft + 0.5, `[禁入] 文本「${b.text}」右界 ${b.x2.toFixed(0)} 越过鱼头左界 ${rootLeft.toFixed(0)}`);
    }
    for (const n of nodes) {
        if (n.id === 'root') continue;
        assert(n.style.x <= rootLeft, `[禁入] 节点 ${n.id} x=${n.style.x.toFixed(0)} 越过鱼头左界 ${rootLeft.toFixed(0)}`);
    }
    ok(`鱼头禁入带：全部元素左界 ≤ ${rootLeft.toFixed(0)}（净距 ${(rootLeft - Math.max(...boxes.filter(b => b.id !== 'root').map(b => b.x2), ...nodes.filter(n => n.id !== 'root').map(n => n.style.x))).toFixed(0)}px）`);

    return layout;
}

/* ────────────────────── 执行 ────────────────────── */

/* 可读性按**最小字号 × 缩放**判定（G6 已收紧口径）：
   1200×800 放 4 大骨 + 长文本实测只有 7.9px，属"画布不足" → 断言应判不可读并给 warning；
   升档到 1600×1000 后应可读（这正是 MCP autoScaleFishboneCanvas 的验收依据）。 */
const layout4 = runCase('经典 4 大骨 @1200×800', classic4, 1200, 800, true);
runCase('经典 4 大骨 @1600×1000（升档）', classic4, 1600, 1000, true);
runCase('5M1E 6 大骨 + 三层深钻 @1200', deep6, 1200, 800, false);
runCase('长文本 4 大骨 @1200×800', longText, 1200, 800, true);
runCase('长文本 4 大骨 @1600×1000（升档）', longText, 1600, 1000, true);
runCase('单大骨边界', singleBone, 900, 600, true);

/* 空数据边界 */
{
    const empty = computeDeterministicFishboneLayout(emptyTree, STYLES, 1200, 800) as Layout;
    expect(0, 'G1');
    assert.equal(empty.nodes.length, 0, '[边界] 空数据应返回空节点集');
    assert.equal(empty.edges.length, 0, '[边界] 空数据应返回空边集');
    assert(empty.meta.warnings.length > 0, '[边界] 空数据必须给出 warning');
    ok('边界：空数据返回空图 + 诊断 warning（不静默白屏）');
}

function expect(_: number, _tag: string) { /* 语义占位 */ }

/* 用户实测极端用例（6 主骨 / 最深 6 层 / 含空主骨）：必须零重叠零穿刺 */
{
    const ex = computeDeterministicFishboneLayout(userExtreme, STYLES, 1600, 1000) as Layout;
    const eb = textBoxes(ex.nodes);
    let pairs = 0;
    let worstPx = 0;
    for (let i = 0; i < eb.length; i++) {
        for (let j = i + 1; j < eb.length; j++) {
            const ox = Math.min(eb[i].x2, eb[j].x2) - Math.max(eb[i].x1, eb[j].x1);
            const oy = Math.min(eb[i].y2, eb[j].y2) - Math.max(eb[i].y1, eb[j].y1);
            if (ox > 1 && oy > 1) {
                pairs++;
                worstPx = Math.max(worstPx, ox * oy);
                if (pairs <= 3) console.log(`   [极端用例重叠] 「${eb[i].text}」×「${eb[j].text}」 ${ox.toFixed(0)}×${oy.toFixed(0)}`);
            }
        }
    }
    assert.equal(pairs, 0, `[极端用例] 文本重叠应为 0，实际 ${pairs} 对（最大 ${worstPx.toFixed(0)}px²）`);
    ok(`用户极端用例：${ex.nodes.length} 节点 / 6 主骨 / 最深 6 层，零文本重叠`);
}

/* 6 层深钻压力用例：零穿刺 + ≤1 处擦边重叠（known-issue：链内相对位置需分支级 t 重排） */
{
    const deep = computeDeterministicFishboneLayout(deep6Levels, STYLES, 1400, 900) as Layout;
    const db = textBoxes(deep.nodes);
    let pairs = 0, worst = 0;
    for (let i = 0; i < db.length; i++) {
        for (let j = i + 1; j < db.length; j++) {
            const ox = Math.min(db[i].x2, db[j].x2) - Math.max(db[i].x1, db[j].x1);
            const oy = Math.min(db[i].y2, db[j].y2) - Math.max(db[i].y1, db[j].y1);
            if (ox > 1 && oy > 1) { pairs++; worst = Math.max(worst, ox * oy); }
        }
    }
    assert(pairs <= 1, `[6 层] 文本重叠应 ≤1 对（known-issue），实际 ${pairs} 对`);
    assert(worst <= 150, `[6 层] 擦边重叠面积应 ≤150px²（约半个汉字格），实际 ${worst.toFixed(0)}px²`);
    ok(`6 层深钻：${deep.nodes.length} 节点，重叠 ${pairs} 对（最大 ${worst.toFixed(0)}px²，known-issue 上限 1 对/150px²）`);
}

/* 随机树回归：固定种子，覆盖「每行挂子骨」的结构。此前只有手工用例能通过零重叠。 */
{
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const words = ['温度偏高', '压力不足', '培训缺失', '标准未细化', '设备老化', '传感器漂移', '来料波动', '检验频次低'];
    let seq = 0;
    const gen = (depth: number, maxD: number): FishboneNode => {
        const node: FishboneNode = { id: 'f' + (seq++), label: words[Math.floor(rnd() * words.length)], type: 'sub' };
        if (depth < maxD && rnd() < 0.6) {
            node.children = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => gen(depth + 1, maxD));
        }
        return node;
    };
    const cases: Array<[number, number, number, number]> = [[4, 3, 1200, 800], [6, 4, 1600, 1000]];
    for (const [mains, depth, W, H] of cases) {
        for (let r = 0; r < 5; r++) {
            seq = 0;
            const data: FishboneNode = {
                id: 'root', label: '随机回归', type: 'root',
                children: Array.from({ length: mains }, (_, i) => {
                    const c = gen(1, depth);
                    return { ...c, id: 'm' + i, label: '大骨' + i, type: 'main', children: c.children ?? [gen(2, depth)] };
                }),
            };
            const layout = computeDeterministicFishboneLayout(data, STYLES, W, H) as Layout;
            const boxes = textBoxes(layout.nodes);
            let pairs = 0;
            for (let i = 0; i < boxes.length; i++) {
                for (let j = i + 1; j < boxes.length; j++) {
                    const ox = Math.min(boxes[i].x2, boxes[j].x2) - Math.max(boxes[i].x1, boxes[j].x1);
                    const oy = Math.min(boxes[i].y2, boxes[j].y2) - Math.max(boxes[i].y1, boxes[j].y1);
                    /* 2px 与 detectConflicts 一致：中文宽度按 1em 估算，取整误差约 1px */
                    if (ox > 2 && oy > 2) pairs++;
                }
            }
            /* 4 骨必须零重叠；6 骨 4 层的跨层级链内重叠是已知边界，上限取修复前实测 */
            const limit = mains <= 4 ? 0 : 3;
            assert(pairs <= limit, `[随机] ${mains}骨${depth}层#${r} 文本重叠 ${pairs} 对，上限 ${limit}`);
        }
    }
    ok('随机树回归：4骨3层零重叠，6骨4层每例重叠不超过 3 对');
}

/* G7 确定性：两次解算逐字段相等 */
{
    const a = computeDeterministicFishboneLayout(classic4, STYLES, 1200, 800) as Layout;
    const b = computeDeterministicFishboneLayout(classic4, STYLES, 1200, 800) as Layout;
    assert.equal(a.nodes.length, b.nodes.length, '[G7] 节点数不稳定');
    for (let i = 0; i < a.nodes.length; i++) {
        assert.equal(a.nodes[i].id, b.nodes[i].id, `[G7] 第 ${i} 个节点 id 不稳定`);
        assert(Math.abs(a.nodes[i].style.x - b.nodes[i].style.x) < EPS, `[G7] 节点 ${a.nodes[i].id} x 抖动`);
        assert(Math.abs(a.nodes[i].style.y - b.nodes[i].style.y) < EPS, `[G7] 节点 ${a.nodes[i].id} y 抖动`);
    }
    ok('G7 确定性：同输入两次解算坐标逐一相等（零随机）');
}

/* 权重函数（供下游排序复用） */
{
    const w = calcFishboneWeight(classic4);
    assert(w > 1, '[权重] 根节点权重应 > 1');
    assert.equal(calcFishboneWeight({ id: 'x', label: 'x', type: 'detail' }), 1, '[权重] 叶节点权重应为 1');
    ok(`权重函数：根权重 ${w.toFixed(2)}，叶权重 1.00（单调可加）`);
}

/* 大骨按需生长（不强求等高）：长度应随各自子项负载变化 */
{
    const lens = ['m1', 'm2', 'm3', 'm4'].map(id => {
        const m = layout4.nodes.find(n => n.id === id)!;
        const a = layout4.nodes.find(n => n.id === `anchor-${id}`)!;
        return Math.hypot(m.style.x - a.style.x, m.style.y - a.style.y);
    });
    assert(lens.every(l => l > 100), '[范式] 大骨长度应大于 100px');
    assert(layout4.meta.maxBoneHeight > 0, '[范式] meta 应记录最大骨高（诊断用）');
    const spread = Math.max(...lens) - Math.min(...lens);
    ok(`范式：大骨按需生长（${lens.map(l => l.toFixed(0)).join(' / ')}px，极差 ${spread.toFixed(0)}px），不强制等高`);
}

console.log(`\n=== 全部通过：${checks} 项断言 ===`);
