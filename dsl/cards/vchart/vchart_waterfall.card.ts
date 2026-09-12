/**
 * waterfall · VChart 变动归因/瀑布图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 质量成本变动归因分析
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "waterfall",
  "data": [ {
      "values": [
        { "x": "起始成本", "y": 1000 },
        { "x": "材料波动", "y": 200 },
        { "x": "工艺改进", "y": -150 },
        { "x": "最终成本", "y": 1050, "isTotal": true }
      ]
    } ],
  "xField": "x", "yField": "y",
  "total": { "tagField": "isTotal" },
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}`;

const vchart_waterfall: CardSpec = {
  meta: {
    id: "waterfall",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_waterfall",
    qcTool: "WATERFALL",
    version: '1.0',
    parentType: "vchart",
    subType: "waterfall",
    displayName: "VChart 变动归因/瀑布图",
    intents: ["瀑布图", "变动归因图", "waterfall chart", "成本拆解"],
    expertise: ["价值流分析", "变动归因建模", "成本拆解可视化"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "waterfall",
    migrated: true,
  },

  description: "工业级价值流变动分析工具。展示从起始点到终点过程中各因素的增减贡献，适用于成本分析或质量损失归因。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**终值标记**: 必须在最后一个数据点中使用标记字段（如 `isTotal: true`），并在 Spec 中通过 `total` 字段绑定，以确立总计柱的悬空基准。", "**笛卡尔闭环**: 必须显式包含 `bottom` 和 `left` 轴。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "关键字定义", meaning: "\"total\": { \"tagField\": \"isTotal\" } 用于识别总计项。", example: "关键字定义: \"total\": { \"tagField\": \"isTotal\" }", status: 'supported' },
    { name: "配色语义", meaning: "自动识别数值正负并分配上升/下降色系。", example: "配色语义: <值>", status: 'supported' },
  ],

  example: {
    title: "质量成本变动归因分析",
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
    "终值标记: 必须在最后一个数据点中使用标记字段（如 `isTotal: true`），并在 Spec 中通过 `total` 字段绑定，以确立总计柱的悬空基准。",
    "笛卡尔闭环: 必须显式包含 `bottom` 和 `left` 轴。",
  ],
};

export default vchart_waterfall;
