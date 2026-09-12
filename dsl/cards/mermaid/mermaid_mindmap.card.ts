/**
 * mindmap · IQS 知识脑图/思维导图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "neutral"}}%%
mindmap
  root(("质量管理"))
    控制方法
      (SPC 统计)
      (异常拦截)
    标准体系
      (ISO 9001)
      (行业标准)`;

const mermaid_mindmap: CardSpec = {
  meta: {
    id: "mindmap",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_mindmap",
    qcTool: "MINDMAP",
    version: '1.0',
    parentType: "mermaid",
    subType: "mindmap",
    displayName: "IQS 知识脑图/思维导图",
    intents: ["脑图", "思维导图", "mindmap"],
    expertise: ["思维导图", "逻辑结构梳理", "知识分类建模"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "mindmap",
    migrated: true,
  },

  description: "基于 Mermaid 的发散性思维梳理工具。通过中心节点放射出的层级结构，快速理清逻辑架构。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 多维认知类图表。用于非线性的思维发散与归纳。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "mindmap", meaning: "定义脑图起始。", example: "mindmap: <值>", status: 'supported' },
    { name: "root((\"中心\"))", meaning: "双括号代表圆角容器。", example: "root((\"中心\")): <值>", status: 'supported' },
    { name: "(分支)", meaning: "节点边界语法。", example: "(分支): <值>", status: 'supported' },
    { name: "{{ 六角 }}", meaning: "节点边界语法。", example: "{{ 六角 }}: <值>", status: 'supported' },
    { name: "[矩形]", meaning: "节点边界语法。", example: "[矩形]: <值>", status: 'supported' },
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
    "核心分类: 多维认知类图表。用于非线性的思维发散与归纳。",
  ],
};

export default mermaid_mindmap;
