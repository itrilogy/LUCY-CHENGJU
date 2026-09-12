/**
 * boxPlot · VChart 质量审计/箱线图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 加工尺寸分布审计 (箱线图)
ColorPalette: tech
ShowTitle: true
ShowLabel: false
Animation: false

Spec: {
  "type": "boxPlot",
  "data": [ {
      "values": [
        { "batch": "批次A", "min": 10.1, "q1": 10.2, "median": 10.3, "q3": 10.4, "max": 10.5 },
        { "batch": "批次B", "min": 10.6, "q1": 10.7, "median": 10.75, "q3": 10.85, "max": 11.0 }
      ]
    } ],
  "xField": "batch", "minField": "min", "q1Field": "q1", "medianField": "median", "q3Field": "q3", "maxField": "max",
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}`;

const vchart_boxplot: CardSpec = {
  meta: {
    id: "boxPlot",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_boxplot",
    qcTool: "BOXPLOT",
    version: '1.0',
    parentType: "vchart",
    subType: "boxPlot",
    displayName: "VChart 质量审计/箱线图",
    intents: ["箱线图", "分位数图", "boxplot", "离散度分析"],
    expertise: ["离散度分析", "质量审计建模", "异常值识别"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "boxPlot",
    migrated: true,
  },

  description: "工业级批次离散度审计工具。展示数据的中位数、分位数及异常点分布。通过五数概括法快速识别过程稳定性。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**预计算统计量 (Critical)**: VChart BoxPlot **不负责**原始行数据的统计，必须传递已计算好的 `min`, `q1`, `median`, `q3`, `max` 值。", "**笛卡尔闭环**: 作为笛卡尔系图表，必须包含 `bottom` 和 `left` 坐标轴。", "**静态约束**: 所有计算值必须为字面量数字。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "字段绑定", meaning: "显式映射 minField, q1Field, medianField, q3Field, maxField。", example: "字段绑定: minField", status: 'supported' },
    { name: "样式", meaning: "boxPlot 关键字采用驼峰命名。", example: "样式: boxPlot", status: 'supported' },
  ],

  example: {
    title: "加工尺寸分布审计 (箱线图)",
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
    "预计算统计量 (Critical): VChart BoxPlot 不负责原始行数据的统计，必须传递已计算好的 `min`, `q1`, `median`, `q3`, `max` 值。",
    "笛卡尔闭环: 作为笛卡尔系图表，必须包含 `bottom` 和 `left` 坐标轴。",
    "静态约束: 所有计算值必须为字面量数字。",
  ],
};

export default vchart_boxplot;
