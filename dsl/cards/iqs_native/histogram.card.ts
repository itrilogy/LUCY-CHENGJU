/**
 * histogram · 直方图（分布与工序能力）— 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_histogram 条目 + `protocol/segments/histogram.md`
 * 精修项：
 *   · 补 `Color[Bar|Curve|USL|LSL|Target]` 与 `Font[Title|Base]`（骨架缺失）
 *   · 补"数据录入语法 `- <数值>`"为正式条目（骨架仅留在散落说明里）
 *   · 补 `ShowValues`、`ShowLabels`
 *   · 补 `expect` 与 3 条 `counterexamples`；`promptNotes` 改为数据准备与规格限要点
 *   · 移除 `starter`（统一为 example，AUD-124）
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 产品直径分布分析
USL: 10.5
LSL: 9.5
Target: 10.0
Color[Bar]: #0D5E42
Color[Curve]: #F1C40F
Color[USL]: #E74C3C
Color[LSL]: #E74C3C
Color[Target]: #22c55e
Font[Title]: 18
Font[Base]: 12
Bins: auto
ShowCurve: true

// 原始测量数据（一行一个数值）
- 9.8
- 10.2
- 10.1
- 9.9
- 10.0
- 10.3
- 9.7
- 10.1
- 9.9
- 10.0
- 10.2
- 9.8
- 10.4
- 9.6
- 10.1
- 9.9
- 10.0
- 10.2
- 9.8
- 10.1
- 10.5
- 9.5
- 10.0
- 10.3
- 9.7
- 10.1
- 9.9
- 10.2
- 10.0
- 9.8
`;

const histogram: CardSpec = {
  meta: {
    id: 'histogram',
    tier: 'core',
    family: 'iqs_native',
    body: 'ScalarList',
    mcpName: 'render_histogram',
    qcTool: 'HISTOGRAM',
    version: '1.1',
    parentType: 'iqs_native',
    subType: 'histogram',
    displayName: 'IQS 分布分析/直方图',
    intents: ['直方图', '分布分析', 'Cp', 'Cpk', 'histogram', '正态性', '工序能力'],
    expertise: ['正态分布分析', '工序能力评估 (Cp/Cpk)'],
    colorSlots: ['Bar', 'Curve', 'USL', 'LSL', 'Target'],
    renderEngine: 'echarts',
    inferenceKey: 'histogram',
    migrated: true,
  },

  description: '过程能力与分布状态呈现。支持正态拟合曲线及规格限 (USL/LSL) 标注。',

  soul: {
    title: '正态分布分析与工序能力',
    summary: '用直方图观察分布形态；给定规格限时自动评估 Cp / Cpk。',
    blocks: [
      { kind: 'h', level: 3, text: '正态分布分析 (Normal Distribution)' },
      {
        kind: 'p',
        text: '直方图通过对大量随机样本的观察，识别生产过程是否受控。稳定的生产过程通常呈现对称的「钟形」曲线。',
      },
      {
        kind: 'ul',
        items: [
          '**均值 (μ)**：反映加工的中心位置。',
          '**标准差 (σ)**：反映加工的散差大小。',
          '**形态**：双峰说明数据可能来自两个班次/设备/供应商；偏斜说明中心偏移或单边截尾。',
        ],
      },
      { kind: 'h', level: 4, text: '工序能力指标 (Process Capability)' },
      {
        kind: 'p',
        text: '当定义了规格限（`USL` / `LSL`）时，引擎自动评估工序能力：',
      },
      {
        kind: 'ul',
        items: [
          '**Cp**：仅看散布宽度与规格宽度的比值，假设中心对齐。',
          '**Cpk**：同时考虑散布与中心偏移 —— **实际决策应看 Cpk**。',
          '**1.33**：工业级「合格」门槛；**1.67**：优秀。',
        ],
      },
      {
        kind: 'callout',
        type: 'TIP',
        text: '样本量建议 ≥ 50（QC 惯例 100 以上）再解读 Cp/Cpk；样本太少时直方图形状与控制限都不可靠。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '图表标题', argShape: '<文本>',
      example: 'Title: 钢管直径分布', required: true, status: 'supported',
    },
    {
      name: 'USL', meaning: '规格上限 (Upper Specification Limit)', argShape: '<数值>',
      example: 'USL: 10.5', status: 'supported',
      notes: '与 `LSL` 同时给出才会计算 Cp / Cpk；只给一个时只能评估单侧能力。',
    },
    {
      name: 'LSL', meaning: '规格下限 (Lower Specification Limit)', argShape: '<数值>',
      example: 'LSL: 9.5', status: 'supported',
    },
    {
      name: 'Target', meaning: '目标值（渲染为规格区内的目标线）', argShape: '<数值>',
      example: 'Target: 10.0', status: 'supported',
      notes: '目标值用于观察中心偏移方向，不参与 Cp/Cpk 计算。',
    },
    {
      name: 'Bins', meaning: '分组数（直方柱个数）', values: ['auto'],
      example: 'Bins: auto', status: 'supported',
      notes: '可写整数（如 `Bins: 20`）或 `auto`（按样本量自动，缺省）。',
    },
    {
      name: 'ShowCurve', meaning: '是否叠加正态拟合曲线', values: ['true', 'false'],
      example: 'ShowCurve: true', status: 'supported',
    },
    {
      name: 'ShowValues', meaning: '是否显示柱顶数值', values: ['true', 'false'],
      example: 'ShowValues: true', status: 'supported',
    },
    {
      name: 'Color', slot: ['Bar', 'Curve', 'USL', 'LSL', 'Target'],
      meaning: '#HEX 颜色：柱体 / 拟合曲线 / 规格上限线 / 规格下限线 / 目标线',
      example: 'Color[USL]: #E74C3C', status: 'supported',
    },
    {
      name: 'Font', slot: ['Title', 'Base'], meaning: 'px 字号（标题 / 正文）',
      example: 'Font[Title]: 18', status: 'supported',
    },
    {
      name: '数据行', meaning: '原始测量数据，**一行一个数值**（本 kind 唯一的数据录入方式）',
      argShape: '- <数值>', example: '- 9.8', required: true, status: 'supported',
      notes: '必须是**逐条原始观测值**，不要预先把数据分箱或写成 `频数: 值`。',
    },
  ],

  example: {
    title: '产品直径分布分析',
    dsl: EXAMPLE_DSL,
    notes: '30 个原始测量值；USL/LSL 齐全，引擎据此计算 Cp / Cpk 并叠加正态曲线。',
    expect: {
      noErrors: true,
      items: 30,
      note: 'parser 返回 { data: number[], styles }，items 取 data.length',
    },
  },

  counterexamples: [
    {
      bad: '- 9.8: 5   （把频数写进数据行）',
      good: '- 9.8\n- 9.8\n- 9.8\n- 9.8\n- 9.8',
      reason: '本 kind 录入的是**原始观测值**（一行一个），不是「值: 频数」的预统计表。',
    },
    {
      bad: 'Bins: 3   （用于 30 个样本）',
      good: 'Bins: auto',
      reason: '分组数过少会掩盖分布形态；样本量 30 时建议 6–8 组，或直接用 `auto`。',
    },
    {
      bad: 'LSL: 10.5\nUSL: 9.5',
      good: 'LSL: 9.5\nUSL: 10.5',
      reason: '下限必须小于上限，否则工序能力指标无意义。',
    },
  ],

  outputControls: [
    '数据用 `- <数值>` 逐行录入，必须是原始观测值。',
    '`LSL` 必须小于 `USL`；两者齐全才会计算 Cp / Cpk。',
  ],

  promptNotes: [
    '把用户给的数据整理成**逐条原始值**（一行一个），不要预先分箱或写成频数表。',
    '样本量建议 ≥ 50；若用户数据不足，如实说明并仍生成（引擎会给出结果，但解读需谨慎）。',
    '规格限要么都写、要么都不写；只给一个时提醒用户单侧评估的局限。',
    '不要臆造 USL/LSL —— 用户没给就不写，让图只呈现分布形态。',
  ],
};

export default histogram;
