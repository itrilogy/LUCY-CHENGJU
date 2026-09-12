/**
 * erDiagram · IQS 数据建模/ER图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "forest"}}%%
erDiagram
    USER ||--o{ ORDER : "下单"
    ORDER ||--|{ PRODUCT : "包含"
    USER {
        int id
        string name
    }`;

const mermaid_er: CardSpec = {
  meta: {
    id: "erDiagram",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_er",
    qcTool: "ERDIAGRAM",
    version: '1.0',
    parentType: "mermaid",
    subType: "erDiagram",
    displayName: "IQS 数据建模/ER图",
    intents: ["ER图", "实体关系图", "数据库模型", "er diagram"],
    expertise: ["数据库设计", "数据模型建模", "实体关系分析"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "erDiagram",
    migrated: true,
  },

  description: "基于 Mermaid 的实体关系建模工具。用于描述系统架构、数据模型及组织关系。强调一对多、多对一的关系严谨性。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 结构建模类图表。用于定义数据实体（Entities）及其相互关联（Relationships）。", "**逻辑准则**: 刻画父子、依赖及引用关系。强调基数（Cardinality）的准确性，如 `||--o{` 代表一对多。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "erDiagram", meaning: "定义 ER 图起始。", example: "erDiagram: <值>", status: 'supported' },
    { name: "||--o{", meaning: "定义基数关系。", example: "||--o{: <值>", status: 'supported' },
    { name: "||--|{", meaning: "定义基数关系。", example: "||--|{: <值>", status: 'supported' },
    { name: "}|--|{", meaning: "定义基数关系。", example: "}|--|{: <值>", status: 'supported' },
    { name: "ENTITY { int id }", meaning: "定义属性列表。", example: "ENTITY { int id }: <值>", status: 'supported' },
  ],

  example: {
    title: "%%{init: {\"theme\": \"forest\"}}%%",
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
    "核心分类: 结构建模类图表。用于定义数据实体（Entities）及其相互关联（Relationships）。",
    "逻辑准则: 刻画父子、依赖及引用关系。强调基数（Cardinality）的准确性，如 `||--o{` 代表一对多。",
  ],
};

export default mermaid_er;
