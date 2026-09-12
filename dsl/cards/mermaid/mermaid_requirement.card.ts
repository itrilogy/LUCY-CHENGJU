/**
 * requirementDiagram · IQS 需求建模/需求图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `requirementDiagram
    requirement req_lock {
        id: 1.1
        text: "当速度超过20km/h时自动锁定车门"
        risk: medium
        verifyMethod: test
    }
    element actuator {
        type: "Actuator"
    }
    actuator - satisfies -> req_lock`;

const mermaid_requirement: CardSpec = {
  meta: {
    id: "requirementDiagram",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_requirement",
    qcTool: "REQUIREMENTDIAGRAM",
    version: '1.0',
    parentType: "mermaid",
    subType: "requirementDiagram",
    displayName: "IQS 需求建模/需求图",
    intents: ["需求图", "requirement diagram", "规格限制"],
    expertise: ["需求工程", "系统规格定义", "追溯分析"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "requirementDiagram",
    migrated: true,
  },

  description: "基于 Mermaid 的系统需求工程工具。定义需求条目、风险等级及验证方法，建立需求与实现的关联。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 系统需求建模类图表。专注于需求条目的结构化定义及其在物理系统中的闭环验证。"] },
      { kind: 'h', level: 3, text: "分类图表注意事项 (Diagram-Specific Precautions)" },
      { kind: 'ul', items: ["**关系严谨**: 关系连接必须带箭头（如 `- satisfies ->`）。", "**验证闭环**: 验证方法建议必须使用官方关键字 `verifyMethod`。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "requirementDiagram", meaning: "定义需求图起始。", example: "requirementDiagram: <值>", status: 'supported' },
    { name: "requirement [Name] { id: text, risk: level }", meaning: "需求定义块。", example: "requirement [Name] { id: text, risk: level }: <值>", status: 'supported' },
    { name: "element [Name] { type: \"Type\" }", meaning: "系统元素定义块。", example: "element [Name] { type: \"Type\" }: <值>", status: 'supported' },
    { name: "element - satisfies -> requirement", meaning: "关联关系定义。", example: "element - satisfies -> requirement: <值>", status: 'supported' },
  ],

  example: {
    title: "requirementDiagram",
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
    "核心分类: 系统需求建模类图表。专注于需求条目的结构化定义及其在物理系统中的闭环验证。",
    "关系严谨: 关系连接必须带箭头（如 `- satisfies ->`）。",
    "验证闭环: 验证方法建议必须使用官方关键字 `verifyMethod`。",
  ],
};

export default mermaid_requirement;
