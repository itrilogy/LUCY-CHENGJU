/**
 * wordCloud · VChart 异常字符/词云图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 巡检异常关键词画像
ColorPalette: forest
ShowTitle: true
ShowLabel: false
Animation: false

Spec: {
  "type": "wordCloud",
  "data": [{ "values": [
    {"name":"故障","value":100}, {"name":"波动","value":80}, {"name":"纠偏","value":40}
  ]}],
  "nameField": "name", "valueField": "value"
}`;

const vchart_wordcloud: CardSpec = {
  meta: {
    id: "wordCloud",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_wordcloud",
    qcTool: "WORDCLOUD",
    version: '1.0',
    parentType: "vchart",
    subType: "wordCloud",
    displayName: "VChart 异常字符/词云图",
    intents: ["词云", "字符图", "wordcloud", "关键词热力"],
    expertise: ["舆向画像分析", "文本挖掘呈现", "关键词热度可视化"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "wordCloud",
    migrated: true,
  },

  description: "工业舆向与文本热度分析工具。挖掘检测报告、巡检记录中的高频关键词，实现非结构化数据的快速语义画像。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**驼峰命名**: 必须使用 `wordCloud` (非小写) 作为 type 声明。", "**无轴约束**: 禁止配置坐标轴。所有信息通过节点的空间排布与文字大小表示。", "**显示标注**: 应配合 `valueField` 通过字号大小直观表达权重。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "字段绑定", meaning: "nameField 定义文本内容，valueField 定义权重频率。", example: "字段绑定: nameField", status: 'supported' },
  ],

  example: {
    title: "巡检异常关键词画像",
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
    "驼峰命名: 必须使用 `wordCloud` (非小写) 作为 type 声明。",
    "无轴约束: 禁止配置坐标轴。所有信息通过节点的空间排布与文字大小表示。",
    "显示标注: 应配合 `valueField` 通过字号大小直观表达权重。",
  ],
};

export default vchart_wordcloud;
