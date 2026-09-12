/**
 * sunburst · VChart 层级穿透/旭日图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 产品成本层级拆解 (旭日图)
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "sunburst",
  "data": [ {
      "values": [ {
          "name": "总成本",
          "children": [
            { "name": "材料", "value": 500, "children": [{ "name": "铝材", "value": 300 }] },
            { "name": "人工", "value": 400 }
          ]
        } ]
    } ],
  "categoryField": "name", "valueField": "value",
  "label": { "visible": true }
}`;

const vchart_sunburst: CardSpec = {
  meta: {
    id: "sunburst",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_sunburst",
    qcTool: "SUNBURST",
    version: '1.0',
    parentType: "vchart",
    subType: "sunburst",
    displayName: "VChart 层级穿透/旭日图",
    intents: ["旭日图", "多层饼图", "sunburst chart", "层级穿透"],
    expertise: ["层级穿透分析", "组织结构建模", "成本纵深可视化"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "sunburst",
    migrated: true,
  },

  description: "多层级占比透视工具。向上追溯父类结构，向下穿透子类细节。适用于成本构成或组织架构的递归展示。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**层级数据结构**: 数据必须采用 `children` 嵌套的树形 JSON 格式，包裹在顶层数组内。", "**严禁跨系挂载**: 禁制挂载笛卡尔坐标轴。", "**中心对齐**: 自动计算圆心，支持从内向外的占比逻辑解析。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "字段绑定", meaning: "categoryField 锚定名称，valueField 锚定叶子节点数值及枝干聚合权值。", example: "字段绑定: categoryField", status: 'supported' },
  ],

  example: {
    title: "产品成本层级拆解 (旭日图)",
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
    "层级数据结构: 数据必须采用 `children` 嵌套的树形 JSON 格式，包裹在顶层数组内。",
    "严禁跨系挂载: 禁制挂载笛卡尔坐标轴。",
    "中心对齐: 自动计算圆心，支持从内向外的占比逻辑解析。",
  ],
};

export default vchart_sunburst;
