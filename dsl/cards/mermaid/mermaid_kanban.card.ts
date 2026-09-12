/**
 * kanban · IQS 任务看板/Kanban — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "neutral"}}%%
kanban
  Todo
    需求评审
    架构设计
  InProgress
    API开发
  Done
    环境搭建`;

const mermaid_kanban: CardSpec = {
  meta: {
    id: "kanban",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_kanban",
    qcTool: "KANBAN",
    version: '1.0',
    parentType: "mermaid",
    subType: "kanban",
    displayName: "IQS 任务看板/Kanban",
    intents: ["看板", "kanban", "任务流"],
    expertise: ["敏捷开发管理", "任务看板展现", "工作流追踪"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "kanban",
    migrated: true,
  },

  description: "基于 Mermaid 的敏捷开发看板工具。支持列划分、任务卡片定义及责任人分配状态。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 计划与追踪类图表。用于模拟敏捷看板，展示任务在不同状态列（Todo, InProgress, Done）间的分布。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "kanban", meaning: "定义看板起始。", example: "kanban: <值>", status: 'supported' },
    { name: "[列名]", meaning: "顶格书写定义列。", example: "[列名]: <值>", status: 'supported' },
    { name: "[事项]", meaning: "缩进定义任务项。", example: "[事项]: <值>", status: 'supported' },
    { name: "@{ assigned: \"人\" }", meaning: "分配责任人语法。", example: "@{ assigned: \"人\" }: <值>", status: 'supported' },
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
    "核心分类: 计划与追踪类图表。用于模拟敏捷看板，展示任务在不同状态列（Todo, InProgress, Done）间的分布。",
  ],
};

export default mermaid_kanban;
