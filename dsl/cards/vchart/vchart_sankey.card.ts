/**
 * sankey · VChart 能量传递/桑基图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 生产资源流转路径分析
ColorPalette: industrial
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "sankey",
  "data": [
    {
      "values": [
        {
          "nodes": [
            { 
              "name": "总投入", 
              "children": [
                { "name": "原料A", "value": 160, "children": [{ "name": "工序1", "value": 160 }] },
                { "name": "原料B", "value": 120, "children": [{ "name": "工序1", "value": 120 }] },
                { "name": "原料C", "value": 140, "children": [{ "name": "工序2", "value": 140 }] }
              ]
            },
            {
              "name": "工序1",
              "children": [
                { "name": "工序2", "value": 210 },
                { "name": "废料", "value": 70 }
              ]
            },
            {
              "name": "工序2",
              "children": [
                { "name": "工序3", "value": 290 },
                { "name": "废料", "value": 60 }
              ]
            },
            {
              "name": "工序3",
              "children": [
                { "name": "产品X", "value": 190 },
                { "name": "产品Y", "value": 100 }
              ]
            }
          ]
        }
      ]
    }
  ],
  "nodeKey": "name",
  "categoryField": "name",
  "valueField": "value",
  "label": { "visible": true }
}`;

const vchart_sankey: CardSpec = {
  meta: {
    id: "sankey",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_sankey",
    qcTool: "SANKEY",
    version: '1.0',
    parentType: "vchart",
    subType: "sankey",
    displayName: "VChart 能量传递/桑基图",
    intents: ["桑基图", "能量流图", "sankey graph", "流转分析"],
    expertise: ["资源流转分析", "报文路径建模", "流量传递可视化"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "sankey",
    migrated: true,
  },

  description: "工业级复杂流转分析工具。展示节点间多对多的流量权重传递。用于分析能源流、报文路径或生产流转。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**分线图架构 (Node/Children)**: 推荐使用带有 `children` 的层级结构来定义流量，这比扁平的 from/to 在大规模工业拓扑中更具表达力。", "**严禁跨系挂载**: 作为关系型图表，**严禁**挂载任何 `orient` 轴，否则渲染崩溃。", "**显示标注**: series 中必须配置 `\"label\": { \"visible\": true }`。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "字段绑定", meaning: "categoryField 对应节点 ID，valueField 对应节点权重/流量大小。", example: "字段绑定: categoryField", status: 'supported' },
  ],

  example: {
    title: "生产资源流转路径分析",
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
    "分线图架构 (Node/Children): 推荐使用带有 `children` 的层级结构来定义流量，这比扁平的 from/to 在大规模工业拓扑中更具表达力。",
    "严禁跨系挂载: 作为关系型图表，严禁挂载任何 `orient` 轴，否则渲染崩溃。",
    "显示标注: series 中必须配置 `\"label\": { \"visible\": true }`。",
  ],
};

export default vchart_sankey;
