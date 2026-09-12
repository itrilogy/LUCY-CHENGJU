/**
 * area · VChart 资源面积图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 能源消耗结构分析
ColorPalette: forest
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "area",
  "data": [{ "values": [
    {"x":"周一","y":50,"c":"电"}, {"x":"周一","y":30,"c":"气"}, {"x":"周一","y":10,"c":"水"},
    {"x":"周二","y":55,"c":"电"}, {"x":"周2","y":35,"c":"气"}, {"x":"周二","y":12,"c":"水"}
  ]}],
  "xField": "x", "yField": "y", "seriesField": "c", "stack": true,
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ],
  "legends": [{ "visible": true, "orient": "bottom" }]
}`;

const vchart_area: CardSpec = {
  meta: {
    id: "area",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_area",
    qcTool: "AREA",
    version: '1.0',
    parentType: "vchart",
    subType: "area",
    displayName: "VChart 资源面积图",
    intents: ["面积图", "堆叠面积图", "area chart"],
    expertise: ["资源分布结构", "累积效应分析", "面积占比可视化"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "area",
    migrated: true,
  },

  description: "工业级资源分布演进图。用于展示能源消耗、库存累积等结构的占比随时间变化。支持堆叠面积模式。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**笛卡尔闭环 (Critical)**: 必须配置 `bottom` 与 `left` 轴。", "**层级堆叠**: 推荐开启 `\"stack\": true` 以展示总量及各分量的贡献配比。", "**显示标注**: 必须配置 `\"label\": { \"visible\": true }`。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "外壳要求", meaning: "必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。", example: "外壳要求: Title: [标题内容]", status: 'supported' },
    { name: "分类标记", meaning: "使用 seriesField 区分不同的资源类别（如 电、气、水）。", example: "分类标记: seriesField", status: 'supported' },
    { name: "填充样式", meaning: "默认包含透明度梯度，以确多个序列层叠时的可读性。", example: "填充样式: <值>", status: 'supported' },
  ],

  example: {
    title: "能源消耗结构分析",
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
    "笛卡尔闭环 (Critical): 必须配置 `bottom` 与 `left` 轴。",
    "层级堆叠: 推荐开启 `\"stack\": true` 以展示总量及各分量的贡献配比。",
    "显示标注: 必须配置 `\"label\": { \"visible\": true }`。",
  ],
};

export default vchart_area;
