/**
 * 鱼骨图（Ishikawa Diagram）纯数学确定性布局引擎 · R29 重构
 *
 * ── 五遍闭式解（无迭代退火、无随机量、O(V+E)）──────────────────────────
 * Pass 0  排版决策：三阶阶梯（单行 / 缩字 / 双行）+ 无子骨水平骨的 under-line 内嵌
 * Pass 1  族内在需求：由「行距必要条件」反解大骨垂直高度 H（取代线性经验式）
 * Pass 2  半区自治：上/下半区各自按 DSL 顺序做保序一维前缀和（不再成对绑定）
 * Pass 3  剪刀错位：下半区整体相位偏移 δ，主骨上永不共点
 * Pass 4  缩放闭环：以 fitView 等价缩放比反查有效字号，不达标则收紧族距重排（≤3 轮）
 *
 * ── 不变式（由 scripts/assert_fishbone_math.ts 的 G1–G7 守护）──────────
 * G1 包络两遍一致：族跨度用实际骨长（而非假定骨长）解算
 * G2 保序单调：同半区 x 严格递增，且间距 ≥ R_i + L_{i+1} + gap
 * G3 行距必要式：相邻中骨行距 ≥ d_j + u_{j+1} + 行高 + 净距
 * G4 零重叠零穿刺：文本 AABB 两两无交，线段与文本距离 ≥ 12px
 * G5 剪刀错位：40 ≤ 2δ ≤ min(族宽)，且错位不减少净空
 * G6 缩放可读：fitView 后有效字号 ≥ 9px（否则 warn 并建议更大画布）
 * G7 确定性：同输入两次解算坐标逐一相等
 *
 * ── 分形范式（保持）────────────────────────────────────────────────
 * Level 0 脊椎 / 2 中骨 / 4 细骨 → 严格水平 0°；Level 1 大骨 / 3 小骨 → 严格 60°
 * 同级子在父骨两侧羽状交替；文字永在骨末端背外侧（inline 时居中压线作下划线）
 */

import type { FishboneNode, FishboneChartStyles } from '../types.ts';
import { estimateTextWidth } from './textMetrics.ts';

/* ────────────────────────── 常量 ────────────────────────── */

/**
 * 大骨倾角（整体分形范式参数，非逐骨）。
 *
 * 60° 是经典石川角；但族宽 `dx = dy·cot(α)` 与骨高强耦合 —— α 从 60°→75° 时
 * cot 由 0.577 降到 0.268，**族宽近乎减半**，而分形结构（水平/斜角交替、羽状交替）
 * 完全不变。故允许 α 在 [60°, 75°] 内**全局弹性滑动**，由宽高比匹配自动择优。
 *
 * 实现说明：用模块级可变对象是为了避免把 angle 逐层透传进 buildBranch/materialize/emit
 * 的十几个函数；布局全程同步、单线程，因此在一次 compute 调用内是安全的。
 */
interface BoneAngle { deg: number; cos: number; sin: number; cot: number }

function boneAngleOf(deg: number): BoneAngle {
    const rad = (deg * Math.PI) / 180;
    return { deg, cos: Math.cos(rad), sin: Math.sin(rad), cot: 1 / Math.tan(rad) };
}

/**
 * 倾角只在一次布局求解内有效。computeDeterministicFishboneLayout 对每个候选角度
 * 同步调用 runLayoutAtAngle，函数返回前不会重入，因此用局部绑定而不是参数逐层透传。
 * 求解结束即清空，避免模块级状态残留到下一次调用。
 */
let ANGLE: BoneAngle = boneAngleOf(60);
const T = {
    rowGap: 10,
    clusterGap: 70,
    /** 中骨在骨上的起锚参数区间（名义值；实际按需求动态收窄，见 buildCluster） */
    tMin: 0.28,
    tMax: 0.74,
    /** 深层子骨沿父骨的起锚区间 */
    /* 深层子项沿父骨的占用区间 —— 按**父骨类型**分开：
       · 父骨水平（子项是 60° 骨、文字居中于端点）⇒ 端点处无文字，骨内可铺到 12%~88%
       · 父骨 60°（子项是水平骨、文字在端点**外挂**）⇒ 末端要留文字区，取 20%~62%
       否则水平父骨会出现"骨很长、子项挤在左半段、右半段空"。 */
    deepTMin: 0.20,
    deepTMax: 0.62,
    deepTMinH: 0.12,
    deepTMaxH: 0.88,
    lineHeight: 15,
    /** 子骨文字相对骨线的垂直净空（行距计算用） */
    inlineLift: 8,
    tailX: 50,
    tailW: 20,
    tailH: 60,
    rootH: 50,
    mainBoxH: 30,
    /** 鱼头禁入带 */
    headClearance: 34,
    minFont: 9.5,
    readableFont: 8.5,
    fitPadding: 120,
    minCanvasW: 640,
    minCanvasH: 480,
    maxPasses: 5,
    /** 剪刀错位的最小半幅（共轭族错开 ≥ 2×该值） */
    staggerMin: 22,
    /** 相邻族的最小推进步长（无冲突时也不贴死） */
    minClusterStep: 28,
    /** 大骨倾角（整体分形范式参数）的弹性滑动档位 */
    angleSteps: [60, 65, 70, 75] as const,
    /* ── 间隔弹性化：元素尺寸钉死，只有「间隔」可伸缩 ── */
    /** 行距可行域 */
    rowGapMin: 4,
    rowGapMax: 16,
    /** 族间净距可行域 */
    clusterGapMin: 24,
    clusterGapMax: 96,
    /** 间隔弹性倍率可行域（低于 min ⇒ 间隔已压到底，需靠生长骨长） */
    gapScaleMin: 0.34,
    gapScaleMax: 1.4,
} as const;

/* ────────────────────────── 类型 ────────────────────────── */

export interface FishboneLayoutMeta {
    passes: number;
    clusterGap: number;
    rowGap: number;
    /** 间隔弹性倍率（1=基准；<1 表示已压缩间隔） */
    gapScale: number;
    contentWidth: number;
    contentHeight: number;
    fitScale: number;
    effectiveFontSize: number;
    readable: boolean;
    /** 各族骨高的最大值（诊断用；大骨不强制等高） */
    maxBoneHeight: number;
    /** 本次布局采用的大骨倾角（度） */
    boneAngle: number;
    /** 图中最小字号（px，未经缩放）与缩放后的有效值 —— 可读性判定必须用它，而非大骨字号 */
    minFontSize: number;
    effectiveMinFontSize: number;
    warnings: string[];
}

export interface FishboneLayoutResult {
    nodes: any[];
    edges: any[];
    meta: FishboneLayoutMeta;
}

interface LabelMetric {
    text: string;
    fontSize: number;
    width: number;
    height: number;
    lines: number;
}

interface BranchSpec {
    node: FishboneNode;
    label: LabelMetric;
    /** 水平层的左右方向：+1 右 / −1 左 */
    side: 1 | -1;
    /** 60° 层的上下侧：+1 下（y+）/ −1 上 */
    vertical: 1 | -1;
    length: number;
    /** 文字向外的水平占用（水平骨外挂 = 整宽；60° 骨居中 = 半宽） */
    textOut: number;
    children: BranchSpec[];
}

interface ClusterSpec {
    node: FishboneNode;
    index: number;
    isTop: boolean;
    height: number;
    dx: number;
    titleW: number;
    spanLeft: number;
    spanRight: number;
    rows: BranchSpec[];
    /** 行锚点沿骨的累计距离（自脊椎侧起算） */
    rowPos: number[];
    baseX: number;
}

/* ────────────────────── Pass 0：排版决策 ────────────────────── */

function baseFont(level: number): number {
    if (level <= 1) return 12.5;
    if (level === 2) return 10.5;
    if (level === 3) return 10;
    return 9.5;
}

function maxLineWidth(level: number): number {
    if (level <= 1) return 132;
    if (level === 2) return 120;
    return 108;
}

const CJK_PUNCT = new Set(['，', '、', '；', '：', '。', '（', '）', '·', '—']);

/** 在中点附近寻找折行点（仅纯 CJK；拉丁文本折断会破坏单词） */
function wrapAtMidpoint(label: string): string | null {
    if (/\s/.test(label)) return null;
    const chars = Array.from(label);
    if (chars.length < 6) return null;
    const mid = Math.round(chars.length / 2);
    let breakAt = mid;
    outer: for (let d = 0; d <= 3; d++) {
        for (const k of [mid - d, mid + d]) {
            if (k > 1 && k < chars.length - 1 && CJK_PUNCT.has(chars[k])) {
                breakAt = k;
                break outer;
            }
        }
    }
    if (breakAt <= 1 || breakAt >= chars.length - 1) return null;
    return chars.slice(0, breakAt).join('') + '\n' + chars.slice(breakAt).join('');
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

/** 三阶排版阶梯：正常 → 缩字 → 双行（含缩字） */
function measureLabel(label: string, level: number): LabelMetric {
    const limit = maxLineWidth(level);
    const floor = T.minFont;
    let fontSize = baseFont(level);
    let text = label;
    let width = estimateTextWidth(text, fontSize);

    if (width > limit) {
        const wrapped = wrapAtMidpoint(label);
        if (wrapped) {
            const w2 = estimateTextWidth(wrapped, fontSize);
            if (w2 > limit) fontSize = round1(Math.max(floor, (fontSize * limit) / w2));
            text = wrapped;
            width = estimateTextWidth(text, fontSize);
        } else {
            fontSize = round1(Math.max(floor, (fontSize * limit) / width));
            width = estimateTextWidth(text, fontSize);
        }
    }

    const lines = text.split('\n').length;
    return { text, fontSize, width, height: lines * T.lineHeight, lines };
}

/* ────────────────────── Pass 1：族内在需求 ────────────────────── */

/**
 * 递归构建分支规格（只带长度与方向，不含绝对坐标）
 * @param level 该分支自身层级（大骨 1、中骨 2、小骨 3 …）
 */
function buildBranch(node: FishboneNode, level: number, side: 1 | -1, vertical: 1 | -1): BranchSpec {
    const label = measureLabel(node.label, level);
    const isHorizontal = level % 2 === 0;
    const children = (node.children || []).map((child, idx) => {
        const alt: 1 | -1 = idx % 2 === 0 ? 1 : -1;
        /* 水平层用 side 交替左右；60° 层用 vertical 交替上下 */
        return buildBranch(child, level + 1, alt, alt);
    });

    /* 父骨长度必须同时满足三件事（自底向上传播，任意深度都成立）：
       ① 视觉比例（随层级衰减，保底 34px）
       ② 自身文字（水平骨需托住外挂文字）
       ③ **子项起锚间距**：n 个兄弟沿父骨 [tMin,tMax] 等距分布，
          相邻间距 = L·span/(n−1)，必须 ≥ 目标方向的文字尺寸 + 净距。
          缺了 ③ 就是「深层塌缩」：实测 6 层用例 L4 兄弟间距只剩 19px。 */
    /* 子项是否为水平骨：决定末端要不要留「外挂文字区」
       · 子项水平骨（文字在端点外挂）⇒ 保守区间 0.20–0.62
       · 子项 60° 骨（文字居中于端点，不占骨内）⇒ 铺满 0.12–0.88 */
    const childHorizontal = (level + 1) % 2 === 0;
    const span = childHorizontal
        ? T.deepTMax - T.deepTMin
        : T.deepTMaxH - T.deepTMinH;
    let length: number;

    if (isHorizontal) {
        const childDemand = children.reduce((acc, c) => acc + c.length * ANGLE.cos + 12, 0);
        /* 子项是 60° 骨、文字居中于端点 ⇒ 需要 X 向错开一个文字宽 */
        const anchorNeed = children.length >= 2
            ? ((children.length - 1) * (Math.max(...children.map(c => c.label.width)) + 12)) / span
            : 0;
        length = Math.max(56, label.width + 24, childDemand + 20, anchorNeed);
    } else {
        /* 子项是水平骨、文字挂在外侧 ⇒ 需要 Y 向错开一个行高（沿 60° 父骨投影 = L·span·sin60） */
        const anchorNeed = children.length >= 2
            ? ((children.length - 1) * (Math.max(...children.map(c => c.label.height)) + T.rowGap)) / (span * ANGLE.sin)
            : 0;
        /* 层级衰减：0.82^Δ（L4 0.82 / L5 0.67 / L6 0.55），下限 24px。
           旧值 0.94 时 L6 仍有 0.83 —— 深层看起来"和上一层一样长"，挤成一坨。 */
        const visual = Math.max(24, Math.min(72, 38 + label.width * 0.26))
            * Math.pow(0.82, Math.max(0, level - 3));
        length = Math.max(visual, anchorNeed, 34);
    }

    /* 文字外扩量：水平骨外挂（整宽 + 间距）；60° 骨以端点为中点居中（半宽 + 间距） */
    const textOut = isHorizontal ? label.width + 10 : label.width / 2 + 6;

    return { node, label, side, vertical, length, textOut, children };
}

/** 分支文字向外的水平占用 */
function textTail(b: BranchSpec): number {
    return b.textOut;
}

/**
 * 分支在父骨两侧的最大垂直占用（行距必要式的输入）
 *
 * 关键：**按子项所在层级的方向**计算 —— 水平子骨只占文字高度，60° 子骨才占 ℓ·sin60°。
 * （旧版一律乘 sin60°，把水平细骨 114px 的线段当成 110px 垂直占用，导致骨高虚高近 2 倍。）
 */
function verticalReach(b: BranchSpec, level: number): { up: number; down: number } {
    let up = 0;
    let down = 0;
    const childLevel = level + 1;
    const childHorizontal = childLevel % 2 === 0;

    for (const c of b.children) {
        const own = childHorizontal
            ? c.label.height + T.inlineLift                       // 水平子骨：文字在线之上
            : c.length * ANGLE.sin + c.label.height + T.inlineLift;    // 60° 子骨：斜投影 + 文字（居中偏外侧）

        /* 只统计直接子项：孙项（细骨）沿父段中部起锚，其外延由 G4 的元素级冲突检测兜底，
           若在此处递归叠加，会把骨高虚高 20%~40%。 */
        if (childHorizontal || c.vertical < 0) up = Math.max(up, own);
        else down = Math.max(down, own);
    }
    return { up, down };
}

/**
 * 分支的水平外延（族包络的输入）。
 * 水平子骨沿 `side` 伸出：side<0 时整段长度与外挂文字落在左侧，不能只记半个字宽。
 * 深层包络在子项局部坐标里，水平子骨 side<0 时左右对调后再并入父级。
 */
function horizontalReach(b: BranchSpec, level: number): { left: number; right: number } {
    let left = 0;
    let right = 0;
    const childLevel = level + 1;
    const childHorizontal = childLevel % 2 === 0;

    for (const c of b.children) {
        const proj = childHorizontal ? c.length : c.length * ANGLE.cos;
        const half = c.label.width / 2 + 6;
        const reachL = childHorizontal && c.side < 0 ? proj + c.textOut : half;
        const reachR = childHorizontal && c.side < 0 ? half : (childHorizontal ? proj + c.textOut : proj + half);
        left = Math.max(left, reachL);
        right = Math.max(right, reachR);

        const deep = horizontalReach(c, childLevel);
        const flip = childHorizontal && c.side < 0;
        left = Math.max(left, flip ? deep.right : deep.left);
        right = Math.max(right, flip ? deep.left : deep.right);
    }
    return { left, right };
}

interface ClusterShape {
    node: FishboneNode;
    index: number;
    isTop: boolean;
    rows: BranchSpec[];
    heightReq: number;
    titleW: number;
    /** 各行锚点沿骨的累计距离（自脊椎侧起算），长度 = rows.length */
    rowPos: number[];
    /** 行距累加需求的原始值（未含下限/修补），用于修补器设上界 */
    rawNeed: number;
    /** 端点余量（朝脊椎 / 朝骨末端） */
    innerToSpine: number;
    outerToTip: number;
    /** 相邻行「相向需求」序列，长度 = rows.length - 1 */
    towards: number[];
}

function buildClusterShape(node: FishboneNode, index: number, rowGap: number): ClusterShape {
    const isTop = index % 2 === 0;
    /* 中骨左右交替（羽状分形纹理） */
    const rows = (node.children || []).map((child, idx) => {
        const alt: 1 | -1 = idx % 2 === 0 ? 1 : -1;
        return buildBranch(child, 2, alt, alt);
    });

    const n = rows.length;
    const reaches = rows.map(r => verticalReach(r, 2));
    const rowHeights = rows.map(r => r.label.height);

    /* 端点余量：最内行朝脊椎、最外行朝骨末端 */
    const innerToSpine = reaches.length ? (isTop ? reaches[0].down : reaches[0].up) : 0;
    const outerToTip = reaches.length
        ? (isTop ? reaches[reaches.length - 1].up : reaches[reaches.length - 1].down)
        : 0;

    /* 高度 = 端部余量 + 相邻行「相向需求」顺序累加。
       旧式 H = (n−1)/tSpan · maxStep 把行挤进骨的 46%、两端留 54% 纯空白 —— 已废弃。 */
    /* 骨高 = 精确累加需求（端点余量 + 各行相向需求 + gap），下限 180。
       注：旧式还叠加了 `(innerToSpine+gap)/tMin` 与 `(outerToTip+endBand)/(1-tMax)` 两个端点约束，
       但 materialize 的行位已按 [inner, height−outer] 铺满、天然保证不越界 ——
       两者重复计算，把骨高顶大 60%+（"人"族 291 里约 110 是冗余）。 */
    const towards: number[] = [];
    let rawNeed = innerToSpine + outerToTip + (n > 1 ? rowGap * 2 : rowGap);
    for (let j = 0; j < n - 1; j++) {
        const toward = isTop
            ? reaches[j].up + reaches[j + 1].down
            : reaches[j].down + reaches[j + 1].up;
        const withText = toward + Math.max(rowHeights[j], rowHeights[j + 1]) + rowGap;
        towards.push(withText);
        rawNeed += withText;
    }
    const heightReq = n === 0 ? 200 : Math.max(rawNeed, 180);

    const titleW = Math.max(88, Math.ceil(estimateTextWidth(node.label, 14) + 26));
    return {
        node, index, isTop, rows, heightReq, titleW,
        rowPos: [], rawNeed: heightReq, innerToSpine, outerToTip, towards,
    };
}

/** 阶段 B · 落地几何：给定骨高与行锚点累计位置，算 dx 与族包络 */
function materializeCluster(shape: ClusterShape, height: number, rowGap: number): ClusterSpec {
    const { node, index, isTop, rows, titleW, innerToSpine, outerToTip, towards } = shape;
    const n = rows.length;

    /* 【行锚点】按**各行需求**累加，再线性铺满实际骨高（消除"重复计算"留下的空白）。
       height 可能被修补器放大过（heightReq += …），此处用 height 动态归一化：
       间距 ∝ 各行需求，总和恰好铺满可用区间 —— 骨高再大也不会出现空白块。 */
    const CLEAR = 16;
    const rowPos: number[] = [];
    if (n > 0) {
        if (n === 1) {
            rowPos[0] = height / 2;
        } else {
            /* towards 已含行距，这里不再加一次 rowGap（避免重复计费）。
               最小骨高装得下需求时按真实行距向内排；只有修补器把骨高撑过需求后，
               才把富余按需求比例铺开。没有 150px 硬阈值，输入连续。 */
            const raw: number[] = [0];
            for (let j = 0; j < n - 1; j++) raw.push(raw[j] + Math.max(1, towards[j]));
            const rawSpan = raw[n - 1] || 1;
            /* 两端只留端点净空。towards 已含行距，再加 rowGap 会把可用区间挤没，
               单侧钳位会让最后两行贴死（实测 3px）。装不下时按比例整体压缩。 */
            const lo = Math.max(innerToSpine, CLEAR) + rowGap;
            const tailRoom = Math.max(outerToTip, CLEAR);
            const room = Math.max(1, height - lo - tailRoom);
            const scale = Math.min(1, room / rawSpan);
            for (let j = 0; j < n; j++) rowPos[j] = lo + raw[j] * scale;
        }
    }

    const dx = height * ANGLE.cot;

    let spanLeft = dx + titleW / 2 + 12;
    let spanRight = 60;

    rows.forEach((row, j) => {
        const t = (rowPos[j] ?? height * 0.5) / height;
        const anchorRelX = -t * dx;
        const tail = textTail(row);
        const reach = horizontalReach(row, 2);

        if (row.side > 0) {
            spanRight = Math.max(spanRight, anchorRelX + row.length + tail + reach.right);
            spanLeft = Math.max(spanLeft, -anchorRelX + reach.left);
        } else {
            spanLeft = Math.max(spanLeft, -(anchorRelX - row.length - tail) + reach.left);
            spanRight = Math.max(spanRight, reach.right);
        }
    });

    return { node, index, isTop, height, dx, titleW, spanLeft, spanRight, rows, rowPos, baseX: 0 };
}

/* ────────────────── Pass 2 / 3：半区自治 + 剪刀错位 ────────────────── */

/** 参与冲突消解的几何元素（相对族内基准坐标） */
interface Elem {
    kind: 'text' | 'seg';
    /** 节点 id（kind==='text' 时为该节点自身，seg 时为所属分支） */
    id?: string;
    /** 所属大骨序号 */
    ownerIdx?: number;
    /** 父节点 id（大骨的父为 '__cluster__'） */
    parentId?: string;
    /** 层级（大骨=1） */
    level?: number;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    /** 线段端点（kind==='seg' 时有效） */
    ax?: number;
    ay?: number;
    bx?: number;
    by?: number;
}

/** 线段与矩形是否相交（Liang–Barsky） */
function segHitsBox(seg: Elem, box: Elem, pad = 0): boolean {
    const x1 = seg.ax!, y1 = seg.ay!, x2 = seg.bx!, y2 = seg.by!;
    const bx1 = box.x1 - pad, bx2 = box.x2 + pad, by1 = box.y1 - pad, by2 = box.y2 + pad;
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

/**
 * 从「baseX=0 的重叠探针」中提取每族元素（文本块 + 线段），坐标即相对族基准的偏移。
 * 这些坐标只用于计算「族 j 需要右移多少才不与族 i 的元素重叠」。
 */
function extractClusterElements(
    probe: Emitted,
    clusters: ClusterSpec[],
    meta?: { parentOf: Map<string, string>; levelOf: Map<string, number>; ownerOf: Map<string, number> }
): Map<string, Elem[]> {
    const enrich = (e: Elem, id: string): Elem => {
        if (!meta) return e;
        return {
            ...e,
            id,
            ownerIdx: meta.ownerOf.get(id),
            parentId: meta.parentOf.get(id),
            level: meta.levelOf.get(id),
        };
    };
    const map = new Map<string, Elem[]>();
    for (const c of clusters) map.set(c.node.id, []);
    const byId = new Map(probe.nodes.map(n => [n.id, n]));

    for (const n of probe.nodes) {
        const owner: string | undefined = n.data?.__owner;
        if (!owner || !map.has(owner)) continue;
        const st = n.style;
        const label = String(st.labelText ?? '');

        const box = textBoxOfNode(st);
        if (box && (n.type === 'rect' || label)) {
            map.get(owner)!.push(enrich({ kind: 'text', ...box }, n.id));
        }
        if (n.type === 'rect' || !label) continue;
    }

    for (const e of probe.edges) {
        const owner: string | undefined = e.data?.__owner;
        if (!owner || !map.has(owner)) continue;
        const s = byId.get(e.source);
        const t = byId.get(e.target);
        if (!s || !t) continue;
        map.get(owner)!.push(enrich({
            kind: 'seg',
            x1: Math.min(s.style.x, t.style.x),
            x2: Math.max(s.style.x, t.style.x),
            y1: Math.min(s.style.y, t.style.y),
            y2: Math.max(s.style.y, t.style.y),
            ax: s.style.x,
            ay: s.style.y,
            bx: t.style.x,
            by: t.style.y,
        }, e.source));
    }

    return map;
}

/**
 * 「族 j 相对族 i 至少需要右移多少」—— 只统计真正会撞到的元素对：
 *   · 文本 × 文本：Y 区间重叠 ⇒ X 方向留出 gap
 *   · 线段 × 文本：线段穿过文本矩形 ⇒ 文本（或线段所在族）右移让开
 * 若两族的元素在 Y 上错开（分处不同行），返回 0 ⇒ **允许族在 X 上自由交叉**。
 */
function clusterNeed(a: Elem[], b: Elem[], gap: number): number {
    let need = 0;
    for (const ea of a) {
        for (const eb of b) {
            if (ea.kind === 'text' && eb.kind === 'text') {
                if (ea.y1 < eb.y2 && eb.y1 < ea.y2) {
                    need = Math.max(need, ea.x2 - eb.x1 + gap);
                }
                continue;
            }
            const seg = ea.kind === 'seg' ? ea : eb;
            const box = ea.kind === 'text' ? ea : eb;
            if (!segHitsBox(seg, box, 4)) continue;   /* 与门禁同口径：4px 膨胀 */
            if (ea.kind === 'seg') {
                /* 前序族的线段压到本族文字 ⇒ 本族整体右移 */
                need = Math.max(need, Math.max(seg.ax!, seg.bx!) - box.x1 + gap);
            } else {
                /* 本族的线段压到前序族文字 ⇒ 本族整体右移 */
                need = Math.max(need, box.x2 - Math.min(seg.ax!, seg.bx!) + gap);
            }
        }
    }
    return need;
}

/**
 * 冲突驱动的保序推进（FLOW 式「局部修补」而非全局保守互斥）：
 * 每族只与**前面所有族**做元素级冲突检查，位移取「刚好不重叠」的最小值。
 */
function placeWithConflicts(
    list: ClusterSpec[],
    elements: Map<string, Elem[]>,
    gap: number,
    minStep: number,
    startLeft: number
): void {
    list.forEach((c, i) => {
        if (i === 0) {
            c.baseX = startLeft + c.spanLeft;
            return;
        }
        let x = list[i - 1].baseX + minStep;
        for (let j = 0; j < i; j++) {
            const need = clusterNeed(elements.get(list[j].node.id)!, elements.get(c.node.id)!, gap);
            if (need > 0) x = Math.max(x, list[j].baseX + need);
        }
        c.baseX = x;
    });
}

/** 下半区相位偏移 δ（G5：40 ≤ 2δ ≤ min(族宽)） */
function staggerDelta(btms: ClusterSpec[]): number {
    if (btms.length === 0) return 0;
    const minSpan = Math.min(...btms.map(c => c.spanLeft + c.spanRight));
    return Math.min(90, Math.max(40, minSpan * 0.35));
}

/* ────────────────────── 绘制：几何生成 ────────────────────── */

interface Box {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface Emitted {
    nodes: any[];
    edges: any[];
    bbox: Box;
}

function emitAll(
    clusters: ClusterSpec[],
    data: FishboneNode,
    styles: Required<FishboneChartStyles>,
    canvasH: number
): Emitted {
    const nodes: any[] = [];
    const edges: any[] = [];
    const bbox: Box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };

    const stretch = (x1: number, y1: number, x2: number, y2: number) => {
        if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) return;
        bbox.x1 = Math.min(bbox.x1, x1);
        bbox.y1 = Math.min(bbox.y1, y1);
        bbox.x2 = Math.max(bbox.x2, x2);
        bbox.y2 = Math.max(bbox.y2, y2);
    };

    const {
        boneLine: boneLineColor,
        caseLine: caseLineColor,
        caseColor: caseTextColor,
        endColor,
        rootColor,
        rootTextColor,
        mainColor,
        mainTextColor,
    } = styles;

    const cy = canvasH / 2;
    const rootW = Math.max(140, Math.ceil(estimateTextWidth(data.label, 16) + 36));

    /** 当前族是否位于上半区（决定 60° 文字朝哪一侧） */
    let currentIsTop = true;
    /** 当前族的斜骨线段（用于「文字是否压到斜骨」的判定） */
    let boneSeg: { x1: number; y1: number; x2: number; y2: number } = { x1: 0, y1: 0, x2: 0, y2: 0 };

    /** 文字框：统一走 textBoxOfNode（SSOT），保证布局判定与断言/审计同口径 */
    const labelBoxOf = (
        end: { x: number; y: number },
        label: LabelMetric,
        placement: string,
        dx: number,
        dy: number
    ) => textBoxOfNode({
        x: end.x, y: end.y,
        labelText: label.text, labelFontSize: label.fontSize, labelLineHeight: T.lineHeight,
        labelPlacement: placement, labelDx: dx, labelDy: dy,
    })!;

    const segHits = (a: { x1: number; y1: number; x2: number; y2: number }, b: { x1: number; y1: number; x2: number; y2: number }) => {
        const e: Elem = { kind: 'seg', x1: 0, x2: 0, y1: 0, y2: 0, ax: a.x1, ay: a.y1, bx: a.x2, by: a.y2 };
        return segHitsBox(e, b as Elem, 4);
    };

    /**
     * 文字布局：**以端点/线段中点居中优先**；若居中后压到本族斜骨，则退化为末梢外挂。
     * 这样既拿到「居中」的观感，又不会让文字半宽伸进斜骨。
     */
    const resolveLabel = (
        spec: BranchSpec,
        end: { x: number; y: number },
        isHorizontal: boolean,
        flow: 1 | -1,
        isTop: boolean
    ) => {
        if (isHorizontal) {
            /* 水平骨的文字必须落在**端点之外**（按伸展方向镜像），不得压线 */
            const dx = spec.side > 0 ? 6 : -6;
            const placement = spec.side > 0 ? 'right' : 'left';
            return { placement, dx, dy: 0, box: labelBoxOf(end, spec.label, placement, dx, 0) };
        }
        /* 60° 骨刺：文字以端点为水平中点，垂直偏到骨刺外侧让开刺尖。
           注：G6 的 'top'/'bottom' 语义不对称，下半区观感偏移 —— 已登记为待实机校准项（R29 §15）。
           这里统一用 'center' + labelDy 做**对称**偏移（不依赖 top/bottom 的渲染细节）。 */
        /* 60° 骨刺：文字**水平居中于端点**（dx=0），垂直用手写的 dy 精确控制。
           统一用 'top'（语义最明确：文字底边贴节点上方），上下只差一个 dy：
             上半区（刺向上）→ dy = −6                ⇒ 文字块落在端点上方 [−h−6, −6]
             下半区（刺向下）→ dy = +(h+6)            ⇒ 文字块落在端点下方 [+6, +h+6]
           两者数学对称；不再依赖 G6 的 bottom/center 基线（那正是"下半区不居中"的来源）。 */
        /* 同层统一居中于刺尖外侧。撞到斜骨时只沿骨刺方向继续外移，不改成左右外挂，
           否则同一层级会出现「有的居中、有的贴在骨的一侧」。 */
        let chosen: { placement: string; dx: number; dy: number; box: any } | null = null;
        for (let k = 0; k < 2; k++) {
            const shift = spec.label.height / 2 + 6 + k * (spec.label.height / 2 + 4);
            const dy = spec.vertical < 0 ? -shift : shift;
            const box = labelBoxOf(end, spec.label, 'center', 0, dy);
            /* 外移不得越过脊椎中线。越线说明这根刺太短，居中放不下，改走外挂。 */
            const crossesSpine = spec.vertical < 0 ? box.y2 > cy : box.y1 < cy;
            if (crossesSpine) break;
            chosen = { placement: 'center', dx: 0, dy, box };
            if (!segHits(boneSeg, box)) return chosen;
        }
        const hang = flow > 0 ? { placement: 'right', dx: 6, dy: 0 } : { placement: 'left', dx: -6, dy: 0 };
        return { ...hang, box: labelBoxOf(end, spec.label, hang.placement, hang.dx, hang.dy) };
    };

    /**
     * 递归发射一个分支（含其子项）
     * @param spec    分支规格
     * @param level   自身层级（1 大骨 / 2 中骨 / 3 小骨 …）
     * @param start   起锚点（父骨上的交点）
     * @param flow    父骨的水平流向（+1 右 / −1 左），决定 60° 层的顺流迎角
     */
    function emitBranch(
        spec: BranchSpec,
        level: number,
        start: { x: number; y: number },
        flow: 1 | -1,
        owner: string
    ) {
        const isHorizontal = level % 2 === 0;
        let end: { x: number; y: number };
        let flowHere: 1 | -1;

        if (isHorizontal) {
            end = { x: start.x + spec.side * spec.length, y: start.y };
            flowHere = spec.side;
        } else {
            /* 60° 骨顺流张开（与父骨同向）：斜骨与子骨同为 60° 斜率，
               逆流会「折返」贴回斜骨，顺流则持续远离。 */
            flowHere = flow;
            end = {
                x: start.x + flow * spec.length * ANGLE.cos,
                y: start.y + spec.vertical * spec.length * ANGLE.sin,
            };
        }

        /* 文字挂载方向：水平层跟随 side；60° 层跟随父骨流向 */
        const pull: 1 | -1 = isHorizontal ? spec.side : flow;
        const lbl = resolveLabel(spec, end, isHorizontal, flow, currentIsTop);

        nodes.push({
            id: spec.node.id,
            type: 'circle',
            data: { label: spec.node.label, type: spec.node.type, __owner: owner },
            style: {
                x: end.x,
                y: end.y,
                labelText: spec.label.text,
                labelFill: caseTextColor,
                labelFontSize: spec.label.fontSize,
                labelFontWeight: level === 2 ? 'bold' : 'normal',
                labelPlacement: lbl.placement,
                /* G6 v5 的标签偏移字段是 labelOffsetX/Y（源码 subStyleProps(style,'label') 取 offsetX/offsetY）；
                   labelDx/labelDy 是 v4 遗留，v5 不识别 —— 之前所有垂直偏移都没生效，这正是
                   「下半区文字不居中」的真因。两者都写，兼容旧版与探针。 */
                labelOffsetX: lbl.dx,
                labelOffsetY: lbl.dy,
                labelDx: lbl.dx,
                labelDy: lbl.dy,
                labelLineHeight: T.lineHeight,
                size: level === 2 ? 4 : 2,
                fill: caseLineColor,
                stroke: 'none',
            },
        });

        /* 起锚点节点（边的 target 必须存在） */
        nodes.push({
            id: `ba-${spec.node.id}`,
            type: 'circle',
            style: { x: start.x, y: start.y, size: level === 2 ? 2 : 1.5, fill: caseLineColor, stroke: 'none' },
        });

        edges.push({
            id: `edge-${spec.node.id}`,
            source: spec.node.id,
            target: `ba-${spec.node.id}`,
            data: { __owner: owner },
            style: {
                stroke: caseLineColor,
                lineWidth: Math.max(0.6, 1.5 / Math.pow(1.2, Math.max(0, level - 2))),
                endArrow: { path: 'M 0,0 L 6,3 L 6,-3 Z', fill: caseLineColor },
            },
        });

        /* bbox：线段 + 文字块 */
        const seg1 = Math.min(start.x, end.x);
        const seg2 = Math.max(start.x, end.x);
        const segY1 = Math.min(start.y, end.y);
        const segY2 = Math.max(start.y, end.y);

        stretch(
            Math.min(seg1, lbl.box.x1),
            Math.min(segY1, lbl.box.y1),
            Math.max(seg2, lbl.box.x2),
            Math.max(segY2, lbl.box.y2)
        );

        /* 子项：沿本段均匀起锚，羽状交替 */
        const children = spec.children;
        if (children.length === 0) return;
        const n = children.length;
        const childHorizontal = (level + 1) % 2 === 0;
        const tMin = level === 1 ? T.tMin : (childHorizontal ? T.deepTMin : T.deepTMinH);
        const tMax = level === 1 ? T.tMax : (childHorizontal ? T.deepTMax : T.deepTMaxH);
        const span = tMax - tMin;
        const nextLevel = level + 1;

        children.forEach((child, idx) => {
            const t = n === 1 ? (tMin + tMax) / 2 : tMin + (idx / (n - 1)) * span;
            const anchor = {
                x: start.x + (end.x - start.x) * t,
                y: start.y + (end.y - start.y) * t,
            };
            emitBranch(child, nextLevel, anchor, flowHere, owner);
        });
    }

    /* 大骨 + 中骨 */
    clusters.forEach(c => {
        const mainStart = { x: c.baseX, y: cy };
        const mainEnd = { x: c.baseX - c.dx, y: c.isTop ? cy - c.height : cy + c.height };

        nodes.push({
            id: c.node.id,
            type: 'rect',
            data: { label: c.node.label, type: 'main', __owner: c.node.id },
            style: {
                x: mainEnd.x,
                y: mainEnd.y,
                labelText: c.node.label,
                fill: mainColor,
                stroke: boneLineColor,
                lineWidth: 2,
                labelFill: mainTextColor,
                labelFontWeight: 'bold',
                labelPlacement: 'center',
                size: [c.titleW, T.mainBoxH],
                radius: 4,
            },
        });

        /* 大骨端点节点（骨末端）与生根锚点 */
        nodes.push({
            id: `anchor-${c.node.id}`,
            type: 'circle',
            data: { type: 'anchor', __owner: c.node.id },
            style: { x: c.baseX, y: cy, size: 4, fill: boneLineColor, stroke: 'none' },
        });

        edges.push({
            id: `edge-anchor-${c.node.id}`,
            source: c.node.id,
            target: `anchor-${c.node.id}`,
            data: { __owner: c.node.id },
            style: {
                stroke: boneLineColor,
                lineWidth: 3,
                endArrow: { path: 'M 0,0 L 8,4 L 8,-4 Z', fill: boneLineColor },
            },
        });

        stretch(mainEnd.x - c.titleW / 2, mainEnd.y - T.mainBoxH / 2, mainEnd.x + c.titleW / 2, mainEnd.y + T.mainBoxH / 2);
        stretch(Math.min(mainStart.x, mainEnd.x), Math.min(mainStart.y, mainEnd.y), Math.max(mainStart.x, mainEnd.x), Math.max(mainStart.y, mainEnd.y));

        boneSeg = { x1: mainStart.x, y1: mainStart.y, x2: mainEnd.x, y2: mainEnd.y };
        currentIsTop = c.isTop;

        /* 中骨层：沿大骨自生根向末端起锚 */
        const rows = c.rows;
        const n = rows.length;
        if (n === 0) return;
        rows.forEach((row, idx) => {
            const t = (c.rowPos[idx] ?? c.height * 0.5) / c.height;
            const anchor = {
                x: mainStart.x + (mainEnd.x - mainStart.x) * t,
                y: mainStart.y + (mainEnd.y - mainStart.y) * t,
            };
            emitBranch(row, 2, anchor, -1, c.node.id);
        });
    });

    /* 鱼头 / 鱼尾 / 脊椎：在所有族元素之后按**真实右界**定位，保证禁入带 */
    const contentRight = Number.isFinite(bbox.x2) ? bbox.x2 : T.tailX + 240;
    const rootX = Math.max(T.tailX + 240, contentRight + T.headClearance + rootW / 2 + 26);

    nodes.push({
        id: 'root',
        type: 'rect',
        data: { label: data.label, type: 'root' },
        style: {
            x: rootX,
            y: cy,
            labelText: data.label,
            fill: rootColor,
            labelFill: rootTextColor,
            labelFontSize: 16,
            labelFontWeight: 'bold',
            labelPlacement: 'center',
            size: [rootW, T.rootH],
            radius: 4,
            stroke: 'none',
        },
    });
    nodes.push({
        id: 'tail',
        type: 'rect',
        data: { type: 'tail' },
        style: { x: T.tailX, y: cy, size: [T.tailW, T.tailH], fill: endColor, stroke: 'none' },
    });
    edges.push({
        id: 'edge-spine',
        source: 'tail',
        target: 'root',
        style: {
            stroke: boneLineColor,
            lineWidth: 4,
            endArrow: { path: 'M 0,0 L 10,5 L 10,-5 Z', fill: boneLineColor },
        },
    });
    stretch(rootX - rootW / 2, cy - T.rootH / 2, rootX + rootW / 2, cy + T.rootH / 2);
    stretch(T.tailX - T.tailW / 2, cy - T.tailH / 2, T.tailX + T.tailW / 2, cy + T.tailH / 2);

    return { nodes, edges, bbox };
}

/** 统计当前布局中的「文本两两重叠」对数（用于"零重叠优先"的回退判定） */
function countTextOverlaps(emitted: Emitted, clusters?: ClusterSpec[]): number {
    const texts: Elem[] = [];
    if (clusters && clusters.length) {
        const els = extractClusterElements(emitted, clusters);
        for (const list of els.values()) for (const e of list) if (e.kind === 'text') texts.push(e);
    } else {
        for (const n of emitted.nodes) {
            const b = textBoxOfNode(n.style);
            if (b) texts.push({ kind: 'text', ...b });
        }
    }
    let n = 0;
    for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
            const ox = Math.min(texts[i].x2, texts[j].x2) - Math.max(texts[i].x1, texts[j].x1);
            const oy = Math.min(texts[i].y2, texts[j].y2) - Math.max(texts[i].y1, texts[j].y1);
            if (ox > 1 && oy > 1) n++;
        }
    }
    return n;
}

/* ────────── 分类修补器：四类重叠 → 四种定点动作 ────────── */

interface BranchIndex {
    parentOf: Map<string, string>;
    levelOf: Map<string, number>;
    ownerOf: Map<string, number>;
    specs: Map<string, BranchSpec>;
}

function indexBranches(shapes: ClusterShape[]): BranchIndex {
    const parentOf = new Map<string, string>();
    const levelOf = new Map<string, number>();
    const ownerOf = new Map<string, number>();
    const specs = new Map<string, BranchSpec>();

    shapes.forEach((sh, i) => {
        parentOf.set(sh.node.id, '__cluster__');
        levelOf.set(sh.node.id, 1);
        ownerOf.set(sh.node.id, i);
        const walk = (b: BranchSpec, level: number, parent: string) => {
            parentOf.set(b.node.id, parent);
            levelOf.set(b.node.id, level);
            ownerOf.set(b.node.id, i);
            specs.set(b.node.id, b);
            for (const c of b.children) walk(c, level + 1, b.node.id);
        };
        for (const r of sh.rows) walk(r, 2, sh.node.id);
    });
    return { parentOf, levelOf, ownerOf, specs };
}

interface Conflict {
    /** sibling=同父兄弟重叠；intra=同族跨父；inter=跨族同半区 */
    kind: 'sibling' | 'intra' | 'inter';
    owner: number;
    parentId?: string;
    laterIdx?: number;
    need: number;
    detail: string;
    /** 需要被收缩的分支（同族跨父时取层级更深的那个） */
    shrinkId?: string;
    ox?: number;
    oy?: number;
}

function detectConflicts(
    els: Map<string, Elem[]>,
    gap: number,
    parentOf?: Map<string, string>
): Conflict[] {
    const texts: Elem[] = [];
    const segs: Elem[] = [];
    for (const list of els.values()) {
        for (const e of list) {
            if (e.ownerIdx === undefined) continue;
            if (e.kind === 'text' && e.id) texts.push(e);
            else if (e.kind === 'seg') segs.push(e);
        }
    }

    /** text 是否为 seg 的本链节点（祖先或自身） */
    const sameChain = (segId: string | undefined, textId: string | undefined): boolean => {
        if (!segId || !textId) return false;
        if (segId === textId) return true;
        if (!parentOf) return false;
        let cur: string | undefined = textId;
        for (let i = 0; i < 8 && cur; i++) {
            if (cur === segId) return true;
            cur = parentOf.get(cur);
        }
        return false;
    };

    const out: Conflict[] = [];
    for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
            const A = texts[i];
            const B = texts[j];
            if (A.id === B.id) continue;
            const ox = Math.min(A.x2, B.x2) - Math.max(A.x1, B.x1);
            const oy = Math.min(A.y2, B.y2) - Math.max(A.y1, B.y1);
            if (ox <= 2 || oy <= 2) continue;

            if (A.ownerIdx === B.ownerIdx) {
                if (A.parentId === B.parentId) {
                    /* 同族同父：兄弟沿父骨挤在一起 → 加长/加高父骨 */
                    out.push({
                        kind: 'sibling', owner: A.ownerIdx!, parentId: A.parentId,
                        need: Math.max(ox, oy) + gap,
                        detail: `L${A.level} 兄弟 ${A.id}/${B.id}`,
                    });
                } else {
                    /* 同族跨父：分支链之间压叠 → 扩族高 */
                    out.push({
                        kind: 'intra', owner: A.ownerIdx!,
                        need: Math.max(ox, oy) + gap,
                        detail: `L${A.level}/L${B.level} 跨父 ${A.id}/${B.id}`,
                        shrinkId: (A.level! >= B.level!) ? A.id : B.id,
                        ox, oy,
                    });
                }
            } else {
                /* 跨族（含跨半区：一旦 Y 真的重叠就同样要处理）→ 后序族右移 */
                out.push({
                    kind: 'inter', owner: A.ownerIdx!,
                    laterIdx: Math.max(A.ownerIdx!, B.ownerIdx!),
                    need: ox + gap,
                    detail: `跨族 ${A.id}×${B.id}`,
                });
            }
            /* 跨族且跨半区 → Y 天然分离，无需动作 */
        }
    }

    /* 线段 × 文本（同口径 4px 膨胀）：与文本重叠同样按三类动作处理 */
    for (const seg of segs) {
        for (const t of texts) {
            if (sameChain(seg.id, t.id)) continue;
            if (!segHitsBox(seg, t, 4)) continue;

            const segRight = Math.max(seg.ax ?? seg.x2, seg.bx ?? seg.x2);
            const need = segRight - t.x1 + gap;

            if (seg.ownerIdx === t.ownerIdx) {
                /* 同族「斜骨×文字」：动作是**收缩该分支**（不是扩高 —— 扩高只让斜骨同比变长，
                   冲突不会消失，却把族骨高顶到 cap，"料"族 H=350 里有 320 是这么来的）。 */
                out.push({
                    kind: 'intra', owner: t.ownerIdx!,
                    need: Math.abs(need), detail: `seg×text 同族 ${seg.id}×${t.id}`,
                    ox: 8, oy: Math.abs(need), shrinkId: seg.id,
                });
            } else {
                out.push({
                    kind: 'inter', owner: seg.ownerIdx!,
                    laterIdx: Math.max(seg.ownerIdx!, t.ownerIdx!),
                    need: Math.abs(need), detail: `seg×text 跨族 ${seg.id}×${t.id}`,
                });
            }
        }
    }

    return out;
}

/**
 * 分类修补器（R29 · 消歧层）
 *
 *  ① 同族同父兄弟 → 水平父骨加长 / 60° 父骨加高
 *  ② 同族跨父     → 该族骨高增大
 *  ③ 跨族同半区   → 后序族右移
 *  ④ 跨族跨半区   → 无需动作（Y 分离）
 *
 * 每轮只单调增大某个长度/间距，且存在「所有元素互斥」的保守上界 ⇒ 有限步收敛。
 * 与生成器解耦：生成器只需给出确定性草图（允许重叠），本函数负责零重叠。
 */
function resolveConflicts(
    shapes: ClusterShape[],
    clusters: ClusterSpec[],
    data: FishboneNode,
    styles: Required<FishboneChartStyles>,
    canvasH: number,
    gap: number,
    rowGap: number
): { emitted: Emitted; clusters: ClusterSpec[] } {
    let cur = clusters;
    let emitted = emitAll(cur, data, styles, canvasH);

    /* 第一段：族内（①②）—— 改的是骨架尺寸，需要重新 materialize */
    for (let round = 0; round < 10; round++) {
        const idx = indexBranches(shapes);
        const els = extractClusterElements(emitted, cur, idx);
        const intra = detectConflicts(els, gap, idx.parentOf).filter(c => c.kind !== 'inter');
        if (!intra.length) break;

        for (const c of intra) {
            if (c.kind === 'sibling') {
                const pLevel = idx.levelOf.get(c.parentId!) ?? 2;
                const spec = idx.specs.get(c.parentId!);
                const sh = shapes[c.owner];
                const capS = Math.max(sh.rawNeed, 180) * 1.8;
                if (pLevel % 2 === 0 && spec) spec.length += c.need;   // 水平父骨：加长
                else if (sh.heightReq < capS) sh.heightReq = Math.min(capS, sh.heightReq + c.need);
            } else {
                /* 同族跨父：优先**收缩较深的分支**（它越界压到了别的行），再扩族高兜底。
                   单纯扩高不会改变深层分支行的相对位置，故必须收缩。 */
                const deeper = (idx.levelOf.get(c.detail.split('/')[0].slice(1)) ?? 0);
                void deeper;
                const ids = c.detail.match(/L\d+/g) ?? [];
                void ids;
                /* 同族跨父 / 斜骨擦字：先收缩 detectConflicts 指定的分支。
                   扩高不改变链内相对位置，只在分支已收到下限后才兜底。 */
                const spec = c.shrinkId ? idx.specs.get(c.shrinkId) : undefined;
                const specLevel = c.shrinkId ? (idx.levelOf.get(c.shrinkId) ?? 0) : 0;
                /* 标题框（level 1）参与的冲突靠加高拉开，收缩分支解决不了。
                   其余只收缩 level≥3：中骨长度直接决定行距，收到低于行高会打穿 G3。 */
                const hitsTitle = /(?:^|\s)L1(?:\s|$)/.test(c.detail);
                /* 标题框冲突靠加高；同层深层冲突才收缩。跨层级重叠加高无效，交给族间推移兜底。 */
                if (!hitsTitle && spec && specLevel >= 3 && spec.length > 28) {
                    spec.length = Math.max(28, spec.length - Math.max(4, Math.min(spec.length * 0.5, c.need)));
                } else {
                    const oy = c.oy ?? c.need;
                    const ox = c.ox ?? c.need;
                    const sh = shapes[c.owner];
                    const cap = Math.max(sh.rawNeed, 180) * 1.8;
                    if (sh.heightReq < cap) {
                        sh.heightReq = Math.min(cap, sh.heightReq + Math.min(ox, oy) + gap);
                    } else {
                        cur[c.owner].baseX += Math.min(ox, oy) + gap;
                    }
                }
            }
        }

        const baseXs = cur.map(c => c.baseX);
        cur = shapes.map(sh => materializeCluster(sh, sh.heightReq, rowGap));
        cur.forEach((c, i) => { c.baseX = baseXs[i]; });
        emitted = emitAll(cur, data, styles, canvasH);
    }

    /* 第二段：族间（③）—— 只动 baseX */
    for (let round = 0; round < 10; round++) {
        const idx = indexBranches(shapes);
        const els = extractClusterElements(emitted, cur, idx);
        const inter = detectConflicts(els, gap, idx.parentOf).filter(c => c.kind === 'inter');
        if (!inter.length) break;

        const shift = new Map<number, number>();
        for (const c of inter) {
            shift.set(c.laterIdx!, Math.max(shift.get(c.laterIdx!) ?? 0, c.need));
        }
        for (const [idxCluster, need] of shift) cur[idxCluster].baseX += need;
        emitted = emitAll(cur, data, styles, canvasH);
    }

    return { emitted, clusters: cur };
}

/* ────────────────────── 主入口 ────────────────────── */

/**
 * **文字盒 SSOT**：从节点 style 直接算外接矩形。
 *
 * 布局（撞斜骨判定）、断言（G4）、审计脚本必须共用此函数 ——
 * 此前三处各写一套，对 `top`/`bottom`/`center` + `labelDy` 的解释不一致，
 * 导致「退化外挂」漏判与「下半区文字不居中」两个久拖问题。
 */
export function textBoxOfNode(style: any): { x1: number; y1: number; x2: number; y2: number } | null {
    if (!style) return null;
    if (Array.isArray(style.size)) {
        const [w, h] = style.size as [number, number];
        return { x1: style.x - w / 2, y1: style.y - h / 2, x2: style.x + w / 2, y2: style.y + h / 2 };
    }
    const label = String(style.labelText ?? '');
    if (!label) return null;

    const fs = style.labelFontSize || 12;
    const lines = label.split('\n');
    const w = Math.max(...lines.map((l: string) => estimateTextWidth(l, fs)));
    const h = lines.length * (style.labelLineHeight || fs * 1.25);
    const p = style.labelPlacement || 'center';
    /* 偏移以 G6 v5 的 labelOffsetX/Y 为准，回退 v4 的 labelDx/Dy */
    const offX = style.labelOffsetX ?? style.labelDx ?? 0;
    const offY = style.labelOffsetY ?? style.labelDy ?? 0;
    const cx = style.x + offX;
    const cy = style.y + offY;

    if (p === 'left') return { x1: cx - w, y1: cy - h / 2, x2: cx, y2: cy + h / 2 };
    if (p === 'right') return { x1: cx, y1: cy - h / 2, x2: cx + w, y2: cy + h / 2 };
    if (p === 'top') return { x1: cx - w / 2, y1: cy - h, x2: cx + w / 2, y2: cy };
    if (p === 'bottom') return { x1: cx - w / 2, y1: cy, x2: cx + w / 2, y2: cy + h };
    return { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 };
}

/** 递归计算节点的几何负载权重（深层子树向上传导）—— 保留给门禁与外部调用 */
export function calcFishboneWeight(node: FishboneNode): number {
    if (!node.children || node.children.length === 0) {
        return 1.0;
    }
    return node.children.reduce((acc, child) => acc + calcFishboneWeight(child), 0) + 0.6;
}

/**
 * 鱼骨图全量几何拓扑计算主入口
 *
 * @param data      问题树（root 为鱼头问题，children 为大骨）
 * @param styles    颜色样式（全字段必需）
 * @param containerWidth  容器宽（逻辑 px）
 * @param containerHeight 容器高（逻辑 px）
 */
export function computeDeterministicFishboneLayout(
    data: FishboneNode,
    styles: Required<FishboneChartStyles>,
    containerWidth: number,
    containerHeight: number
): FishboneLayoutResult {
    /* 倾角弹性滑动：在 [60°, 75°] 内择优（档位 4 档，确定性、可复现）。
       选优标准 = fitView 缩放比（越大越省画布）；达到 100% 即提前结束。 */
    let best: FishboneLayoutResult | null = null;
    for (const deg of T.angleSteps) {
        ANGLE = boneAngleOf(deg);
        const r = runLayoutAtAngle(data, styles, containerWidth, containerHeight);
        r.meta.boneAngle = deg;
        if (!best || r.meta.fitScale > best.meta.fitScale + 1e-6) best = r;
        if (r.meta.fitScale >= 0.999) break;
    }
    ANGLE = boneAngleOf(60);
    return best!;
}

function runLayoutAtAngle(
    data: FishboneNode,
    styles: Required<FishboneChartStyles>,
    containerWidth: number,
    containerHeight: number
): FishboneLayoutResult {
    const canvasW = Math.max(T.minCanvasW, containerWidth);
    const canvasH = Math.max(T.minCanvasH, containerHeight);

    const mainNodes = data.children || [];
    if (mainNodes.length === 0) {
        return {
            nodes: [],
            edges: [],
            meta: {
                passes: 0,
                clusterGap: T.clusterGap,
                rowGap: T.rowGap,
                gapScale: 1,
                contentWidth: 0,
                contentHeight: 0,
                fitScale: 1,
                effectiveFontSize: baseFont(1),
                readable: false,
                maxBoneHeight: 0,
                boneAngle: ANGLE.deg,
                minFontSize: baseFont(1),
                effectiveMinFontSize: baseFont(1),
                warnings: ['空数据：未提供任何大骨（`# 分类`），无法生成鱼骨图'],
            },
        };
    }

    const startLeft = T.tailX + T.tailW / 2 + 16;
    let clusterGap: number = T.clusterGap;
    let maxBoneHeight = 0;
    let rowGap: number = T.rowGap;
    let emitted: Emitted | null = null;
    let fitScale = 1;
    let effFont = baseFont(1);
    let minFontSize = baseFont(1);
    let readable = true;
    let passes = 0;

    /* 间隔弹性倍率：空间不足时连续压缩间隔（元素尺寸不动），比"三档跳变"更平滑 */
    let gapScale = 1;
    /** 最近一次「零文本重叠」的结果快照 —— 压到底若重叠，回退到它 */
    let clean: { emitted: Emitted; meta: FishboneLayoutMeta } | null = null;
    let worstOverlap = Number.POSITIVE_INFINITY;

    for (passes = 0; passes < T.maxPasses; passes++) {
        clusterGap = Math.min(T.clusterGapMax, Math.max(T.clusterGapMin, T.clusterGap * gapScale));
        rowGap = Math.min(T.rowGapMax, Math.max(T.rowGapMin, T.rowGap * gapScale));

        /* Pass 1：每族按自身需求定骨高（大骨不等高 —— 与初始效果一致） */
        const shapes = mainNodes.map((n, i) => buildClusterShape(n, i, rowGap));
        const clusters = shapes.map(sh => materializeCluster(sh, sh.heightReq, rowGap));
        maxBoneHeight = Math.max(...shapes.map(sh => sh.heightReq));

        /* Pass 2：半区自治（保序）+ 元素级冲突驱动推进（允许族交叉，只要元素不重叠）
           1) 先把所有族重叠在原点 emit 一次，取得每族元素的相对坐标；
           2) 逐族向后推，位移 = 与所有前序族的最大「不重叠所需位移」；
           3) 再用最终 baseX 重新 emit。*/
        const tops = clusters.filter(c => c.isTop);
        const btms = clusters.filter(c => !c.isTop);
        const probe = emitAll(clusters.map(c => ({ ...c, baseX: 0 })), data, styles, canvasH);
        const elements = extractClusterElements(probe, clusters);
        placeWithConflicts(tops, elements, clusterGap, T.minClusterStep, startLeft);
        placeWithConflicts(btms, elements, clusterGap, T.minClusterStep, startLeft);

        /* Pass 3：剪刀错位（G5）—— 相位偏移后仍逐对校正，确保「永不共点」且错开 ≥ 40px */
        const delta = staggerDelta(btms);
        btms.forEach((c, i) => {
            c.baseX += delta;
            const top = tops[i];
            if (top) {
                const gap = c.baseX - top.baseX;
                if (Math.abs(gap) < 2 * T.staggerMin) {
                    c.baseX = top.baseX + 2 * T.staggerMin;
                }
            }
        });

        const resolved = resolveConflicts(shapes, clusters, data, styles, canvasH, clusterGap, rowGap);
        emitted = resolved.emitted;

        /* 零重叠优先：压缩间隙不允许压出重叠（宁可字号小，也不能叠字） */
        const overlapCount = countTextOverlaps(emitted, clusters);

        /* Pass 4：缩放闭环（G6） */
        const bw = Math.max(1, emitted.bbox.x2 - emitted.bbox.x1);
        const bh = Math.max(1, emitted.bbox.y2 - emitted.bbox.y1);
        fitScale = Math.min(
            1,
            (canvasW - 2 * T.fitPadding) / bw,
            (canvasH - 2 * T.fitPadding) / bh
        );
        /* 可读性以**图中最小字号**为准（深层节点 9.5px 起）—— 用大骨字号会高估 32% */
        const sizes = emitted.nodes
            .map((n: any) => n.style?.labelFontSize)
            .filter((v: any) => typeof v === 'number' && v > 0);
        minFontSize = sizes.length ? Math.min(...sizes) : baseFont(1);
        effFont = minFontSize * fitScale;
        readable = effFont >= T.readableFont;

        worstOverlap = Math.min(worstOverlap, overlapCount);
        if (overlapCount === 0) {
            const bw0 = Math.max(0, emitted.bbox.x2 - emitted.bbox.x1);
            const bh0 = Math.max(0, emitted.bbox.y2 - emitted.bbox.y1);
            clean = {
                emitted,
                meta: {
                    passes, clusterGap, rowGap, gapScale,
                    contentWidth: bw0, contentHeight: bh0, fitScale, effectiveFontSize: effFont, readable,
                    maxBoneHeight, boneAngle: ANGLE.deg, minFontSize, effectiveMinFontSize: effFont,
                    warnings: [],
                },
            };
        }
        if (readable && overlapCount === 0) break;

        /* 按缺口反算：需要把内容线性缩小 deficit 倍；间隔只占内容一部分，
           故每轮最多压 35%，连续逼近而非跳档。 */
        const deficit = T.readableFont / Math.max(effFont, 0.01);
        const next = gapScale * Math.min(0.9, Math.max(0.65, 1 / deficit));
        if (next <= T.gapScaleMin) {
            gapScale = T.gapScaleMin;
        } else {
            gapScale = next;
        }
    }

    /* 若最后一轮压出了重叠，连几何和诊断一起回退到最近一次零重叠快照 */
    if (clean && worstOverlap === 0 && countTextOverlaps(emitted!) > 0) {
        return { nodes: clean.emitted.nodes, edges: clean.emitted.edges, meta: clean.meta };
    }

    const bbox = emitted!.bbox;
    const warnings: string[] = [];
    if (!readable) {
        warnings.push(
            `有效字号 ${effFont.toFixed(2)}px 低于可读红线 ${T.readableFont}px：` +
            `内容 ${(bbox.x2 - bbox.x1).toFixed(0)}×${(bbox.y2 - bbox.y1).toFixed(0)} 对画布 ${canvasW}×${canvasH} 过大；` +
            `建议增大画布或减少大骨/子骨数量`
        );
    }

    return {
        nodes: emitted!.nodes,
        edges: emitted!.edges,
        meta: {
            passes,
            clusterGap,
            rowGap,
            gapScale,
            contentWidth: bbox.x2 - bbox.x1,
            contentHeight: bbox.y2 - bbox.y1,
            fitScale,
            effectiveFontSize: effFont,
            readable,
            maxBoneHeight,
            boneAngle: ANGLE.deg,
            minFontSize,
            effectiveMinFontSize: effFont,
            warnings,
        },
    };
}
