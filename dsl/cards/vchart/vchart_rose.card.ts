/**
 * rose · VChart 南丁格尔玫瑰图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 供应商异常反馈分布 (玫瑰图)
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "rose",
  "data": [{ "values": [
    {"type":"物流","v":400}, {"type":"包装","v":200}, {"type":"性能","v":300}, {"type":"外观","v":150}
  ]}],
  "categoryField": "type", "valueField": "v",
  "outerRadius": 0.8, "innerRadius": 0.2,
  "label": { "visible": true }
}`;

const vchart_rose: CardSpec = {
  meta: {
    id: "rose",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_rose",
    qcTool: "ROSE",
    version: '1.0',
    parentType: "vchart",
    subType: "rose",
    displayName: "VChart 南丁格尔玫瑰图",
    intents: ["玫瑰图", "南丁格尔图", "rose chart"],
    expertise: ["多维占比对比", "极坐标可视化", "视觉冲击力呈现"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "rose",
    migrated: true,
  },

  description: "极坐标下的面积占比工具。通过半径长度表达数值大小，兼具分类占比与数值对比的双重表现力。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**严禁跨系挂载 (Warning)**: 严禁配置 `orient` 笛卡尔轴。玫瑰图工作在极坐标系下。", "**数据容器**: 严格遵循 Top-level 数组结构。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "类型声明", meaning: "\"type\": \"rose\"。", example: "类型声明: \"type\": \"rose\"", status: 'supported' },
    { name: "字段绑定", meaning: "categoryField 与 valueField。", example: "字段绑定: categoryField", status: 'supported' },
    { name: "视觉标注", meaning: "必须开启 \"label\": { \"visible\": true }。", example: "视觉标注: \"label\": { \"visible\": true }", status: 'supported' },
  ],

  example: {
    title: "供应商异常反馈分布 (玫瑰图)",
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
    "严禁跨系挂载 (Warning): 严禁配置 `orient` 笛卡尔轴。玫瑰图工作在极坐标系下。",
    "数据容器: 严格遵循 Top-level 数组结构。",
  ],
};

export default vchart_rose;
