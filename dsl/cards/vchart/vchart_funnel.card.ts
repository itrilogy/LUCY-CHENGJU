/**
 * funnel · VChart 过程转化/漏斗图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 业务转化漏斗
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "funnel",
  "data": [{ "values": [
    {"step":"访问","v":1000}, {"step":"注册","v":600}, {"step":"试用","v":300}
  ]}],
  "categoryField": "step", "valueField": "v",
  "label": { "visible": true }
}`;

const vchart_funnel: CardSpec = {
  meta: {
    id: "funnel",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_funnel",
    qcTool: "FUNNEL",
    version: '1.0',
    parentType: "vchart",
    subType: "funnel",
    displayName: "VChart 过程转化/漏斗图",
    intents: ["漏斗图", "转化图", "funnel chart", "流失率分析"],
    expertise: ["转化率分析", "业务流转建模", "衰减过程可视化"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "funnel",
    migrated: true,
  },

  description: "业务流转转化率分析工具。展示从入口到终口各阶段的数据衰减情况，定位转化瓶颈。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**数组结构**: VChart Funnel 必须接受数组格式的数据容器。", "**排序准则**: 默认按数值降序排列以符合“漏斗”语义，建议通过 `categoryField` 对齐逻辑阶段。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "外壳要求", meaning: "必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。", example: "外壳要求: Title: [标题内容]", status: 'supported' },
    { name: "字段绑定", meaning: "categoryField 定义阶段名称，valueField 定义各阶段余留量。", example: "字段绑定: categoryField", status: 'supported' },
  ],

  example: {
    title: "业务转化漏斗",
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
    "数组结构: VChart Funnel 必须接受数组格式的数据容器。",
    "排序准则: 默认按数值降序排列以符合“漏斗”语义，建议通过 `categoryField` 对齐逻辑阶段。",
  ],
};

export default vchart_funnel;
