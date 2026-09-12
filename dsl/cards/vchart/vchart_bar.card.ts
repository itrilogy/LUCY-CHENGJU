/**
 * bar · VChart 基础柱状图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 生产单元故障堆叠分析
ColorPalette: ocean
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "bar",
  "data": [{ "values": [
    {"unit":"单元A","type":"机械","v":10}, {"unit":"单元A","type":"电气","v":20}, {"unit":"单元A","type":"人为","v":5},
    {"unit":"单元B","type":"机械","v":15}, {"unit":"单元B","type":"电气","v":5}, {"unit":"单元B","type":"人为","v":8}
  ]}],
  "xField": "unit", "yField": "v", "seriesField": "type", "stack": true,
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ],
  "legends": [{ "visible": true, "orient": "bottom" }]
}`;

const vchart_bar: CardSpec = {
  meta: {
    id: "bar",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_bar",
    qcTool: "BAR",
    version: '1.0',
    parentType: "vchart",
    subType: "bar",
    displayName: "VChart 基础柱状图",
    intents: ["柱状图", "条形图", "bar chart", "堆叠柱状图"],
    expertise: ["横向对比分析", "频数统计呈现", "工业数据可视化"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "bar",
    migrated: true,
  },

  description: "工业级柱状对比工具。支持垂直、堆叠、分组展示。通过 Canvas 渲染优化，支撑万级数据点实时交互。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**笛卡尔闭环 (Critical)**: 作为笛卡尔坐标系图表，**必须**显式包含 `bottom` 和 `left` 两个轴配置，否则会导致渲染异常。", "**显示标注**: 为了保证工业读数精度，必须在 series 中配置 `\"label\": { \"visible\": true }`。", "**静态约束**: 严禁在 Spec 块内出现 JavaScript 函数或 formatMethod 逻辑。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "外壳要求", meaning: "必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。", example: "外壳要求: Title: [标题内容]", status: 'supported' },
    { name: "数据容器", meaning: "所有的 Spec.data 必须是数组格式 data: [{ values: [...] }]。", example: "数据容器: Spec.data", status: 'supported' },
    { name: "字段绑定", meaning: "xField 绑定类别，yField 绑定数值。", example: "字段绑定: xField", status: 'supported' },
  ],

  example: {
    title: "生产单元故障堆叠分析",
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
    "笛卡尔闭环 (Critical): 作为笛卡尔坐标系图表，必须显式包含 `bottom` 和 `left` 两个轴配置，否则会导致渲染异常。",
    "显示标注: 为了保证工业读数精度，必须在 series 中配置 `\"label\": { \"visible\": true }`。",
    "静态约束: 严禁在 Spec 块内出现 JavaScript 函数或 formatMethod 逻辑。",
  ],
};

export default vchart_bar;
