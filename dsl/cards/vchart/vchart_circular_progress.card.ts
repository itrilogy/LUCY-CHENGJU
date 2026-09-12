/**
 * circularProgress · VChart 进度追踪环 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 核心指标达成进度
ColorPalette: tech
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "circularProgress",
  "data": [{ "values": [
    { "name": "产量达成", "value": 0.88 },
    { "name": "直通率", "value": 0.95 }
  ]}],
  "valueField": "value", "categoryField": "name", "seriesField": "name",
  "radius": 0.8, "innerRadius": 0.2,
  "label": { "visible": true, "position": "bottom" }
}`;

const vchart_circular_progress: CardSpec = {
  meta: {
    id: "circularProgress",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_circular_progress",
    qcTool: "CIRCULARPROGRESS",
    version: '1.0',
    parentType: "vchart",
    subType: "circularProgress",
    displayName: "VChart 进度追踪环",
    intents: ["进度环", "环形进度", "circular progress", "达成追踪"],
    expertise: ["多指标进度对比", "达成率追踪分析", "环形进度建模"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "circularProgress",
    migrated: true,
  },

  description: "多指标达成率对比工具。通过环形轨道的填充比例展示当前进度，适用于多个 KPI 指标的横向对齐对比。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**多条追踪**: 支持在一个圆环内展示多条进度轨道（seriesField 分组）。", "**严禁跨系挂载**: 极坐标系下的专用进度组件，禁制挂载笛卡尔轴。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "字段绑定", meaning: "valueField (0-1 的进度值)，categoryField 进度名，seriesField 锚定轨道分组。", example: "字段绑定: valueField", status: 'supported' },
  ],

  example: {
    title: "核心指标达成进度",
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
    "多条追踪: 支持在一个圆环内展示多条进度轨道（seriesField 分组）。",
    "严禁跨系挂载: 极坐标系下的专用进度组件，禁制挂载笛卡尔轴。",
  ],
};

export default vchart_circular_progress;
