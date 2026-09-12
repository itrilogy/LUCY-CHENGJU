/**
 * line · VChart 趋势折线图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 月度良率趋势分析
ColorPalette: ocean
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "line",
  "data": [{ "values": [
    {"month":"1月","v":95}, {"month":"2月","v":96}, {"month":"3月","v":94},
    {"month":"4月","v":97}, {"month":"5月","v":98}, {"month":"6月","v":95}
  ]}],
  "xField": "month", "yField": "v",
  "label": { "visible": true },
  "point": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}`;

const vchart_line: CardSpec = {
  meta: {
    id: "line",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_line",
    qcTool: "LINE",
    version: '1.0',
    parentType: "vchart",
    subType: "line",
    displayName: "VChart 趋势折线图",
    intents: ["折线图", "趋势图", "line chart", "良率趋势"],
    expertise: ["趋势追踪分析", "过程波动监控", "时间序列可视化"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "line",
    migrated: true,
  },

  description: "工业级过程趋势追踪工具。专注于随时间维度的良率波动、参数演变分析。支持高频采样脉冲显示。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**笛卡尔闭环 (Critical)**: 必须显式定义 `bottom` (时间/类别轴) 与 `left` (数值轴) 对齐。", "**显示标注**: series 中必须配置 `\"label\": { \"visible\": true }` 以确保关键拐点数值可见。", "**数据平滑**: 可选配置 `\"smooth\": true` 以美化非精度敏感的趋势描述。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "外壳要求", meaning: "必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。", example: "外壳要求: Title: [标题内容]", status: 'supported' },
    { name: "字段绑定", meaning: "xField 对应时间维，yField 对应监控指标。", example: "字段绑定: xField", status: 'supported' },
    { name: "数据点", meaning: "设置 \"point\": { \"visible\": true } 增强交互触达。", example: "数据点: \"point\": { \"visible\": true }", status: 'supported' },
  ],

  example: {
    title: "月度良率趋势分析",
    dsl: EXAMPLE_DSL,
    // TODO(scaffold): 补 expect 语义断言（nodes/edges/requiredEdges/forbiddenEdges）
  },

  // TODO(scaffold): 补 counterexamples

  outputControls: [
    '纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。',
    '禁止把 dsl 参数写成 JSON 对象。',
  ],

  // TODO(scaffold): 审阅 promptNotes —— 下面是由 soul 自动提炼的初稿（即 protocol://prompts/<kind> 的内容）
  promptNotes: [
    "笛卡尔闭环 (Critical): 必须显式定义 `bottom` (时间/类别轴) 与 `left` (数值轴) 对齐。",
    "显示标注: series 中必须配置 `\"label\": { \"visible\": true }` 以确保关键拐点数值可见。",
    "数据平滑: 可选配置 `\"smooth\": true` 以美化非精度敏感的趋势描述。",
  ],
};

export default vchart_line;
