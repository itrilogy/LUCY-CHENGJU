/**
 * common · VChart 组合分析图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 生产效能双轴组合图
ColorPalette: tech
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "common",
  "series": [
    { "id": "cost", "type": "bar", "data": {"values": [{"x":"Q1","y":120},{"x":"Q2","y":150}]}, "xField": "x", "yField": "y", "label": { "visible": true } },
    { "id": "yield", "type": "line", "data": {"values": [{"x":"Q1","y":98},{"x":"Q2","y":96}]}, "xField": "x", "yField": "y", "label": { "visible": true } }
  ],
  "axes": [
    { "orient": "left", "seriesIndex": [0], "title": {"visible": true, "text": "成本 (K)"} },
    { "orient": "right", "seriesIndex": [1], "title": {"visible": true, "text": "良率 (%)"} },
    { "orient": "bottom", "label": { "visible": true } }
  ],
  "legends": [{ "visible": true, "orient": "bottom" }]
}`;

const vchart_common: CardSpec = {
  meta: {
    id: "common",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_common",
    qcTool: "COMMON",
    version: '1.0',
    parentType: "vchart",
    subType: "common",
    displayName: "VChart 组合分析图",
    intents: ["组合图", "双轴图", "混合图", "common chart"],
    expertise: ["多指标关联分析", "双轴对比呈现", "复杂数据建模"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "common",
    migrated: true,
  },

  description: "工业级多轴组合分析工具。支持在同一坐标系内混合展示柱、线、面积等序列，实现多维度指标的同步监测。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**多轴绑定 (Critical)**: 在组合图中，必须通过 `seriesIndex` 或 `seriesId` 显式绑定轴向（如 `orient: left` 绑定 series 0）。", "**笛卡尔闭环**: 整体必须包含 `bottom` 轴，且每个垂直轴向均需显式配置。", "**数据解耦**: 每类序列建议使用独立的 `data` 块或通过 `series` 内置数据定义。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "系列定义", meaning: "使用 series 数组，每个对象需声明 type (bar/line/area)。", example: "系列定义: series", status: 'supported' },
    { name: "轴线映射", meaning: "axes 数组中通过 seriesIndex: [idx] 指定该轴服务的序列。", example: "轴线映射: axes", status: 'supported' },
  ],

  example: {
    title: "生产效能双轴组合图",
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
    "多轴绑定 (Critical): 在组合图中，必须通过 `seriesIndex` 或 `seriesId` 显式绑定轴向（如 `orient: left` 绑定 series 0）。",
    "笛卡尔闭环: 整体必须包含 `bottom` 轴，且每个垂直轴向均需显式配置。",
    "数据解耦: 每类序列建议使用独立的 `data` 块或通过 `series` 内置数据定义。",
  ],
};

export default vchart_common;
