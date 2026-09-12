/**
 * heatmap · VChart 相关矩阵图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 品质指标相关性矩阵
ColorPalette: deep
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "heatmap",
  "data": [{ "values": [
    {"x":"温度","y":"压力","v":0.92}, {"x":"温度","y":"转速","v":0.45},
    {"x":"压力","y":"温度","v":0.92}, {"x":"压力","y":"转速","v":0.31}
  ]}],
  "xField": "x", "yField": "y", "valueField": "v",
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}`;

const vchart_correlation_heat: CardSpec = {
  meta: {
    id: "heatmap",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_correlation_heat",
    qcTool: "HEATMAP",
    version: '1.0',
    parentType: "vchart",
    subType: "heatmap",
    displayName: "VChart 相关矩阵图",
    intents: ["相关性矩阵", "矩阵热力图", "correlation heatmap", "替换韦恩图"],
    expertise: ["多因果相关性分析", "质量指标矩阵建模", "相关强度可视化"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "heatmap",
    migrated: true,
  },

  description: "工业级多维指标相关性分析工具。通过 2D 矩阵热力颜色展示变量之间的正负相关强度，是韦恩图 (Venn) 的标准等效替代方案。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**Venn 替代策略**: 由于 VChart 暂不支持 `venn` 类型，**必须**引导用户或 AI 使用 `heatmap` 构建相关性矩阵进行等效表达。", "**笛卡尔闭环**: 必须包含 `bottom` 和 `left` 两个类别轴。", "**显示标注**: 必须在 series 中配置 `\"label\": { \"visible\": true }` 以展示相关系数数值。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "数据构建", meaning: "建立对称的 X-Y 坐标数据对，valueField 存储相关系数值（通常为 -1 到 1）。", example: "数据构建: valueField", status: 'supported' },
  ],

  example: {
    title: "品质指标相关性矩阵",
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
    "Venn 替代策略: 由于 VChart 暂不支持 `venn` 类型，必须引导用户或 AI 使用 `heatmap` 构建相关性矩阵进行等效表达。",
    "笛卡尔闭环: 必须包含 `bottom` 和 `left` 两个类别轴。",
    "显示标注: 必须在 series 中配置 `\"label\": { \"visible\": true }` 以展示相关系数数值。",
  ],
};

export default vchart_correlation_heat;
