/**
 * heatmap · VChart 空间负荷/热力图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 产线负荷热力分布
ColorPalette: sunset
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "heatmap",
  "data": [{ "values": [
    {"hour":"08:00","line":"Line1","v":90}, {"hour":"09:00","line":"Line1","v":95},
    {"hour":"08:00","line":"Line2","v":40}, {"hour":"09:00","line":"Line2","v":50}
  ]}],
  "xField": "hour", "yField": "line", "valueField": "v",
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}`;

const vchart_heatmap: CardSpec = {
  meta: {
    id: "heatmap",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_heatmap",
    qcTool: "HEATMAP",
    version: '1.0',
    parentType: "vchart",
    subType: "heatmap",
    displayName: "VChart 空间负荷/热力图",
    intents: ["热力图", "颜色映射图", "heatmap", "矩阵分析"],
    expertise: ["热力分布分析", "相关性矩阵展现", "负荷密度可视化"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "heatmap",
    migrated: true,
  },

  description: "工业级关联强度与负荷热力可视化工具。通过颜色深浅表达数值密度，适用于相关性矩阵或产线负荷分析。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**Venn 替代**: VChart 不支持 Venn 图，处理逻辑关联集合时，推荐使用 Heatmap 或 Scatter 作为替代方案。", "**笛卡尔闭环**: 必须包含 `bottom` 和 `left` 轴。", "**颜色策略**: 必须配置 `visualMap` 或色带，以保证数值与色彩的直观映射感。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "字段绑定", meaning: "xField 对应时间维或 X 维度，yField 对应分类维度，valueField 对应热力强度。", example: "字段绑定: xField", status: 'supported' },
  ],

  example: {
    title: "产线负荷热力分布",
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
    "Venn 替代: VChart 不支持 Venn 图，处理逻辑关联集合时，推荐使用 Heatmap 或 Scatter 作为替代方案。",
    "笛卡尔闭环: 必须包含 `bottom` 和 `left` 轴。",
    "颜色策略: 必须配置 `visualMap` 或色带，以保证数值与色彩的直观映射感。",
  ],
};

export default vchart_heatmap;
