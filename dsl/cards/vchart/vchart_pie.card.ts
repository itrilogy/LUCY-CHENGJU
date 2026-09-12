/**
 * pie · IQS 工业级占比图 (VChart) — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 质量成本构成明细
ColorPalette: vibrant

Spec: {
  "type": "pie",
  "data": [{ "values": [
    {"name":"预防成本","v":400},
    {"name":"鉴定成本","v":200}
  ]}],
  "categoryField": "name", "valueField": "v",
  "outerRadius": 0.8, "innerRadius": 0,
  "label": { "visible": true }
}`;

const vchart_pie: CardSpec = {
  meta: {
    id: "pie",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_pie",
    qcTool: "PIE",
    version: '1.0',
    parentType: "vchart",
    subType: "pie",
    displayName: "IQS 工业级占比图 (VChart)",
    intents: ["工业级饼图", "高精占比图", "VChart 饼图", "complex pie"],
    expertise: ["工业级占比分析", "构成比例可视化", "高精度饼图"],
    colorSlots: [],
    renderEngine: "vchart",
    inferenceKey: "pie",
    migrated: true,
  },

  description: "高精度构成比例分析工具。支持饼图、环形图。适用于质量成本、市场份额等核心占比展示。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**严禁坐标轴**: 饼图工作在极坐标系，**绝对禁止**出现 `axes` 或 `orient: left/bottom` 配置。", "**数据容器**: `Spec.data` 顶层必须为数组格式 `[{ values: [...] }]`。", "**形态策略**: 默认为实心饼图 (`innerRadius: 0`)。当用户提到“环形”或“Donut”时，才设置 `innerRadius: 0.5`。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "外壳要求", meaning: "必须使用 Title: [标题] 起始。", example: "外壳要求: Title: [标题]", status: 'supported' },
    { name: "字段绑定", meaning: "categoryField 对应分类名称，valueField 对应数值。", example: "字段绑定: categoryField", status: 'supported' },
    { name: "显示控制", meaning: "\"label\": { \"visible\": true }。", example: "显示控制: \"label\": { \"visible\": true }", status: 'supported' },
  ],

  example: {
    title: "质量成本构成明细",
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
    "严禁坐标轴: 饼图工作在极坐标系，绝对禁止出现 `axes` 或 `orient: left/bottom` 配置。",
    "数据容器: `Spec.data` 顶层必须为数组格式 `[{ values: [...] }]`。",
    "形态策略: 默认为实心饼图 (`innerRadius: 0`)。当用户提到“环形”或“Donut”时，才设置 `innerRadius: 0.5`。",
  ],
};

export default vchart_pie;
