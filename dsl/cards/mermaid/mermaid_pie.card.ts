/**
 * pie · IQS 极简饼图 (Mermaid) — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "neutral"}}%%
pie title 缺陷原因分布
    "物流损坏" : 45
    "品质瑕疵" : 30
    "包装问题" : 15
    "其他" : 10`;

const mermaid_pie: CardSpec = {
  meta: {
    id: "pie",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_pie",
    qcTool: "PIE",
    version: '1.0',
    parentType: "mermaid",
    subType: "pie",
    displayName: "IQS 极简饼图 (Mermaid)",
    intents: ["极简饼图", "Mermaid 饼图", "mermaid pie"],
    expertise: ["极简占比分析", "快速逻辑展示"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "pie",
    migrated: true,
  },

  description: "基于 Mermaid 的极简数据比例展示工具。适用于文档内快速插入，对非工业级高精场景的补充。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "1. 标题策略: 必须在 `pie` 关键字后显式跟随 `title [标题]`。",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 辅助类图表。仅当用户明确要求使用 Mermaid 或“极简”风格时使用。**常规占比分析首选 render_vchart_pie**。"] },
      { kind: 'h', level: 3, text: "公共事项及说明 (Common Instructions)" },
      { kind: 'p', text: "1. **标题策略**: 必须在 `pie` 关键字后显式跟随 `title [标题]`。" },
      { kind: 'p', text: "2. **数值约束**: 建议项数不超过 8 个。" },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "pie", meaning: "定义饼图起始。", example: "pie: <值>", status: 'supported' },
    { name: "title", slot: ["标题内容"], meaning: "设置标题。", example: "title [标题内容][标题内容]: <值>", status: 'supported' },
    { name: "\"项名\" : 数值", meaning: "数据项定义语法 (项名必须用双引号包裹)。", example: "\"项名\" : 数值: <值>", status: 'supported' },
  ],

  example: {
    title: "%%{init: {\"theme\": \"neutral\"}}%%",
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
    "核心分类: 辅助类图表。仅当用户明确要求使用 Mermaid 或“极简”风格时使用。常规占比分析首选 render_vchart_pie。",
  ],
};

export default mermaid_pie;
