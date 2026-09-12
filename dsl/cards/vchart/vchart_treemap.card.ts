/**
 * treemap · VChart 资产矩形/树图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 固定资产分布比例图
ColorPalette: deep
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "treemap",
  "data": [ {
      "values": [ {
          "name": "总资产",
          "children": [
            { "name": "生产设备", "value": 500 }, { "name": "IT设备", "value": 150 }
          ]
        } ]
    } ],
  "categoryField": "name", "valueField": "value",
  "label": { "visible": true }
}`;

const vchart_treemap: CardSpec = {
  meta: {
    id: "treemap",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_treemap",
    qcTool: "TREEMAP",
    version: '1.0',
    parentType: "vchart",
    subType: "treemap",
    displayName: "VChart 资产矩形/树图",
    intents: ["树图", "矩形树图", "treemap", "空间比例"],
    expertise: ["空间占比映射", "资产分布呈现", "矩形树图可视化"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "treemap",
    migrated: true,
  },

  description: "通过空间平铺面积展示层级占比的视觉化工具。适用于固定资产分布、文件空间占用等树形比例分析。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**递归深度**: 支持深层嵌套结构解析。父节点的面积等于所有子节点面积之和。", "**无轴约束**: 禁止配置坐标轴。利用几何空间的矩形分割展示比例关系。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "字段绑定", meaning: "categoryField 用于节点标注，valueField 用于计算矩形权重。", example: "字段绑定: categoryField", status: 'supported' },
  ],

  example: {
    title: "固定资产分布比例图",
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
    "递归深度: 支持深层嵌套结构解析。父节点的面积等于所有子节点面积之和。",
    "无轴约束: 禁止配置坐标轴。利用几何空间的矩形分割展示比例关系。",
  ],
};

export default vchart_treemap;
