/**
 * radar · 雷达图（多维评价）— 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_radar 条目 + `protocol/segments/radar.md`
 * 精修项：
 *   · 补 `Axis` / `Series`（本 kind 唯一的录入方式，骨架**完全缺失** —— 只抽到开关）
 *   · 八个开关条目由「分析开关 / 极坐标」的占位说明补全为**具体语义与值域**
 *   · 补 `expect` 与 3 条 `counterexamples`；`promptNotes` 改为建模要点
 *   · 移除 `starter`（统一为 example，AUD-124）
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 方案多维效果对比
Standardize: true
ShowAreaScore: true
ShowSimilarity: true
ShowValues: false
StartAngle: -90
Clockwise: true
Closed: true

// 轴定义：Axis: <名称>, <最大值>[, <最小值>]
Axis: 质量, 100, 0
Axis: 成本, 100, 0
Axis: 交期, 100, 0
Axis: 安全, 100, 0
Axis: 可维护性, 100, 0

// 系列：Series: <名称>, [<值列表>][, <颜色>[, <透明度>]]
Series: 方案A, [85, 70, 90, 80, 75], #0D5E42, 0.4
Series: 方案B, [70, 85, 75, 88, 80], #E74C3C, 0.3
`;

const radar: CardSpec = {
  meta: {
    id: 'radar',
    tier: 'core',
    family: 'iqs_native',
    body: 'AxisSeries',
    mcpName: 'render_radar',
    qcTool: 'RADAR',
    version: '1.1',
    parentType: 'iqs_native',
    subType: 'radar',
    displayName: 'IQS 多维评价/雷达图',
    intents: ['雷达图', '多维对比', 'radar', '综合评分', '蜘蛛图', '能力评估'],
    expertise: ['多维对比', '综合评分', '效果检查'],
    colorSlots: [],
    renderEngine: 'echarts',
    inferenceKey: 'radar',
    migrated: true,
  },

  description: '多维指标综合对比。支持标准化、面积得分与系列相似度。QC 核心工具（非 VChart 救济）。',

  soul: {
    title: '雷达图综合评价',
    summary: '把多维度得分画成多边形：尖角暴露短板，面积与圆润度反映均衡与综合实力。',
    blocks: [
      { kind: 'h', level: 3, text: '雷达图综合评价' },
      {
        kind: 'p',
        text: '雷达图把对象在多个维度上的得分画成闭合多边形。**尖角**暴露短板，**面积大且圆润**表示均衡且综合实力强。',
      },
      { kind: 'h', level: 4, text: '三个分析算子' },
      {
        kind: 'ul',
        items: [
          '**Standardize（标准化）**：消除量纲后比较形态。当各轴量纲不一致（一个是百分比、一个是金额）时必须开启。',
          '**ShowAreaScore（面积得分）**：多边形面积反映综合实力，比平均分更能体现「短板效应」。',
          '**ShowSimilarity（相似度）**：计算各系列与**首个系列**的形态相似度，用于对标。',
        ],
      },
      {
        kind: 'callout',
        type: 'TIP',
        text: '看雷达图先看**形状**再看面积：极度不规则说明资源分配失衡，可能存在局部优势掩盖系统性缺陷。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '图表标题', argShape: '<文本>',
      example: 'Title: 产品竞品对比分析', required: true, status: 'supported',
    },
    {
      name: 'Standardize', meaning: '按各轴最大值归一后比较（**量纲不一致时必须开启**）',
      values: ['true', 'false'], example: 'Standardize: true', status: 'supported',
    },
    {
      name: 'ShowAreaScore', meaning: '显示多边形面积综合得分', values: ['true', 'false'],
      example: 'ShowAreaScore: true', status: 'supported',
    },
    {
      name: 'ShowSimilarity', meaning: '显示各系列与**首个系列**的形态相似度', values: ['true', 'false'],
      example: 'ShowSimilarity: true', status: 'supported',
    },
    {
      name: 'ShowValues', meaning: '在数据点旁显示原始数值', values: ['true', 'false'],
      example: 'ShowValues: false', status: 'supported',
    },
    {
      name: 'StartAngle', meaning: '首个轴的起始角度（`-90` = 12 点钟方向）', argShape: '<角度>',
      example: 'StartAngle: -90', status: 'supported',
    },
    {
      name: 'Clockwise', meaning: '轴排列方向是否为顺时针', values: ['true', 'false'],
      example: 'Clockwise: true', status: 'supported',
    },
    {
      name: 'Closed', meaning: '网格样式：`true` 多边形，`false` 圆形',
      values: ['true', 'false'], example: 'Closed: true', status: 'supported',
    },
    {
      name: 'Axis', meaning: '定义一条维度轴',
      argShape: '<名称>, <最大值>[, <最小值>]',
      example: 'Axis: 质量, 100, 0', required: true, status: 'supported',
      notes: '最小值可省略（默认 0）。轴的**声明顺序**即雷达图的轴顺序。',
    },
    {
      name: 'Series', meaning: '定义一个对比系列',
      argShape: '<名称>, [<值列表>][, <颜色>[, <透明度>]]',
      example: 'Series: 方案A, [85, 70, 90, 80, 75], #0D5E42, 0.4',
      required: true, status: 'supported',
      notes:
        '① 值列表元素个数必须**等于轴数量**，且与轴顺序一一对应；' +
        '② 颜色可省略（用内置色板）或写 `null`；' +
        '③ 透明度取 0–1，多系列重叠时建议 ≤ 0.4。',
    },
  ],

  example: {
    title: '方案多维效果对比',
    dsl: EXAMPLE_DSL,
    notes: '5 条轴 × 2 个系列；开启标准化、面积得分与相似度。',
    expect: {
      noErrors: true,
      series: 2,
      note: 'parser 返回 { data: { title, axes, series }, styles }，series 取 series.length',
    },
  },

  counterexamples: [
    {
      bad: 'Axis: 质量, 100\nAxis: 成本, 100\nSeries: 方案A, [85]',
      good: 'Axis: 质量, 100\nAxis: 成本, 100\nSeries: 方案A, [85, 70]',
      reason: '每个系列的值个数必须**等于轴数量**，否则无法闭合多边形。',
    },
    {
      bad: 'Standardize: true   （但所有轴量纲相同，都是评分）',
      good: 'Standardize: false（同量纲时无需归一）',
      reason: '同量纲时归一反而会扭曲真实差距；标准化应当只在量纲不一致时开启。',
    },
    {
      bad: 'Axis: 年化回报(%), 25\nAxis: 夏普比率, 3.0\nSeries: A, [12, 1.8]   （未开 Standardize）',
      good: '同上，但加 `Standardize: true`',
      reason: '各轴量纲差异巨大（% 与比率）却不归一，小量纲的轴会被压成一条直线，看不出形态。',
    },
  ],

  outputControls: [
    '先写全部 `Axis:`，再写 `Series:`；每个系列的值个数须等于轴数量。',
    '轴量纲不一致时**必须**开启 `Standardize: true`。',
  ],

  promptNotes: [
    '先确定评价维度（4–8 条轴），再为每个对象生成一组等长的得分。',
    '各轴量纲不一致时开 `Standardize: true`；全部同量纲（如都是 0–100 评分）时不要开。',
    '系列数控制在 2–4 个（超过 4 个多边形会互相遮挡）；重叠时把透明度降到 0.3 以下。',
    '不要臆造得分 —— 用户未给维度的就少画几条轴，不要为了「好看」补满。',
  ],
};

export default radar;
