/**
 * scatter · IQS 相关性分析/散点图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 注塑工艺参数三维分析 (温度/压力/收缩率)
XAxis: 模具温度(℃)
YAxis: 注射压力(MPa)
ZAxis: 收缩率%
Color[Point]: #0D5E42
Color[Trend]: #F1C40F
ShowTrend: true
3D: false

- 195.5, 85.2, 2.4
- 192.0, 82.5, 2.5
- 198.5, 88.0, 2.2`;

const STARTER_DSL = `Title: 注塑工艺参数三维分析 (温度/压力/收缩率)
XAxis: 模具温度(℃)
YAxis: 注射压力(MPa)
ZAxis: 收缩率%
Color[Point]: #0D5E42
Color[Trend]: #F1C40F
ShowTrend: true
3D: false

// 数据 (X:温度, Y:压力, Z:收缩率)
// 组1: 低温低压 -> 高收缩 (欠注)
- 195.5, 85.2, 2.4
- 192.0, 82.5, 2.5
- 198.5, 88.0, 2.2
- 194.2, 84.1, 2.35

// 组2: 优选参数 -> 低收缩 (理想)
- 215.0, 105.0, 0.6
- 218.5, 108.2, 0.55
- 212.0, 102.5, 0.7
- 216.5, 106.8, 0.58

// 组3: 高温高压 -> 中收缩 (过保压)
- 235.0, 125.0, 1.2
- 238.5, 128.5, 1.3
- 232.0, 122.0, 1.15
- 240.0, 130.2, 1.25`;

const vchart_scatter: CardSpec = {
  meta: {
    id: "scatter",
    tier: "relief",
    family: "vchart",
    body: "TupleList",
    mcpName: "render_vchart_scatter",
    qcTool: "SCATTER",
    version: '1.0',
    parentType: "vchart",
    subType: "scatter",
    displayName: "IQS 相关性分析/散点图",
    intents: ["散点图", "相关性分析", "回归分析", "scatter"],
    expertise: ["双变量相关性", "回归趋势分析", "3D 气泡分析"],
    colorSlots: ["Point", "Trend"],
    renderEngine: "echarts",
    inferenceKey: "scatter",
    migrated: true,
  },

  description: "双变量或三变量相关性分析工具。支持线性回归趋势线识别。",

  soul: {
    title: "相关性分析 (Correlation)",
    summary: "散点图是判断两个（或三个）变量之间是否存在相关关系的数学工具。通过观察点集的分布形态，可以得出结论：",
    blocks: [
      { kind: 'h', level: 3, text: "相关性分析 (Correlation)" },
      { kind: 'p', text: "散点图是判断两个（或三个）变量之间是否存在相关关系的数学工具。通过观察点集的分布形态，可以得出结论：" },
      { kind: 'ul', items: ["**正相关**: X 增加，Y 也随之增加。", "**负相关**: X 增加，Y 随之减少。", "**不相关**: 点集呈杂乱分布。"] },
      { kind: 'h', level: 3, text: "回归分析 (Regression)" },
      { kind: 'p', text: "系统自动计算线性回归线，作为预测模型的基础。通过趋势线，我们可以对未知的 X 值预测其对应的 Y 值位置。" },
      { kind: 'callout', type: 'IMPORTANT', text: "相关性并不等同于因果关系。两个变量表现出强相关，可能是因为它们共同受第三个隐藏变量的影响。" },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "Title", meaning: "图表标题", example: "Title: 工艺参数分析", status: 'supported' },
    { name: "XAxis", meaning: "X 轴标签", example: "XAxis: 温度(℃)", status: 'supported' },
    { name: "YAxis", meaning: "Y 轴标签", example: "YAxis: 压力(MPa)", status: 'supported' },
    { name: "ZAxis", meaning: "Z 轴标签", example: "ZAxis: 收缩率%", status: 'supported' },
  ],

  example: {
    title: "注塑工艺参数三维分析 (温度/压力/收缩率)",
    dsl: EXAMPLE_DSL,
    // TODO(scaffold): 补 expect 语义断言（nodes/edges/requiredEdges/forbiddenEdges）
  },

  starter: {
    title: "注塑工艺参数三维分析 (温度/压力/收缩率)",
    dsl: STARTER_DSL,
  },

  // TODO(scaffold): 补 counterexamples

  outputControls: [
    '纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。',
    '禁止把 dsl 参数写成 JSON 对象。',
  ],

  // TODO(scaffold): 审阅 promptNotes —— 下面是由 soul 自动提炼的初稿（即 protocol://prompts/<kind> 的内容）
  promptNotes: [
    "正相关: X 增加，Y 也随之增加。",
    "负相关: X 增加，Y 随之减少。",
    "不相关: 点集呈杂乱分布。",
    "相关性并不等同于因果关系。两个变量表现出强相关，可能是因为它们共同受第三个隐藏变量的影响。",
  ],
};

export default vchart_scatter;
