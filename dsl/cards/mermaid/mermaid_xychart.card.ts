/**
 * xychart-beta · IQS 通用双轴图/XYChart — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `xychart-beta
    title "季度产量趋势"
    x-axis ["Q1", "Q2", "Q3", "Q4"]
    y-axis "产量(Ton)" 0 --> 500
    bar [320, 410, 390, 450]
    line [300, 380, 420, 440]`;

const mermaid_xychart: CardSpec = {
  meta: {
    id: "xychart-beta",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_xychart",
    qcTool: "XYCHART-BETA",
    version: '1.0',
    parentType: "mermaid",
    subType: "xychart-beta",
    displayName: "IQS 通用双轴图/XYChart",
    intents: ["xy图", "组合图", "双轴图", "xychart"],
    expertise: ["混合趋势分析", "双变量呈现", "通用统计绘图"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "xychart-beta",
    migrated: true,
  },

  description: "基于 Mermaid 的通用组合图表。支持柱状与线状混合展示，适用于简单的趋势与对比分析。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 通过 XY 坐标系展示混合趋势。相比 VChart 混合图，XYChart 更强调在文档流中的快速直观输出。"] },
      { kind: 'h', level: 3, text: "分类图表注意事项 (Diagram-Specific Precautions)" },
      { kind: 'ul', items: ["**引号强制**: 在 `xychart-beta` 中，**所有中文标签必须用双引号 \"\" 包裹**。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "xychart-beta", meaning: "定义图表起始。", example: "xychart-beta: <值>", status: 'supported' },
    { name: "x-axis [\"L1\", \"L2\"]", meaning: "X 轴离散标签。", example: "x-axis [\"L1\", \"L2\"]: <值>", status: 'supported' },
    { name: "bar", slot: ["v1, v2"], meaning: "系列定义语法。", example: "bar [v1, v2][v1, v2]: <值>", status: 'supported' },
    { name: "line", slot: ["v1, v2"], meaning: "系列定义语法。", example: "line [v1, v2][v1, v2]: <值>", status: 'supported' },
  ],

  example: {
    title: "xychart-beta",
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
    "核心分类: 通过 XY 坐标系展示混合趋势。相比 VChart 混合图，XYChart 更强调在文档流中的快速直观输出。",
    "引号强制: 在 `xychart-beta` 中，所有中文标签必须用双引号 \"\" 包裹。",
  ],
};

export default mermaid_xychart;
