/**
 * flowchart · IQS 业务流程/流程图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "neutral", "look": "handDrawn"}}%%
graph TD
    A[提交申请] --> B{经理审批}
    B -- "通过" --> C[财务放款]
    B -- "驳回" --> D[退回修改]
    D --> A
    C --> E[流程结束]`;

const mermaid_flowchart: CardSpec = {
  meta: {
    id: "flowchart",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_flowchart",
    qcTool: "FLOWCHART",
    version: '1.0',
    parentType: "mermaid",
    subType: "flowchart",
    displayName: "IQS 业务流程/流程图",
    intents: ["流程图", "flowchart", "业务流", "决策图"],
    expertise: ["业务流程建模", "逻辑决策树", "拓扑闭环分析"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "flowchart",
    migrated: true,
  },

  description: "基于 Mermaid 的结构化建模工具。用于刻画业务流转、决策树及闭环逻辑。支持多种布局方向与样式自定义。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "1. 纯净 DSL 范式: AI 必须生成纯文本 DSL 指令。严禁将代码块包裹在 JSON 结构中或附加冗余解释。",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 逻辑流转类图表。专注于描述业务流转、决策分支及逻辑闭环。"] },
      { kind: 'h', level: 3, text: "公共事项及说明 (Common Instructions)" },
      { kind: 'p', text: "1. **纯净 DSL 范式**: AI 必须生成纯文本 DSL 指令。严禁将代码块包裹在 JSON 结构中或附加冗余解释。" },
      { kind: 'p', text: "2. **符号冲突防御**: 在中文描述文字中，必须优先使用中文全角标点（如 ，、；、：）。严禁使用半角逗号或分号，防止解析误认。" },
      { kind: 'p', text: "3. **复杂内容包裹**: 包含特殊符号或多行的节点，必须使用 [\"内容\"]（矩形）、(\"内容\")（圆角）等显式包裹。" },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "graph", meaning: "定义流程图起始。", example: "graph: <值>", status: 'supported' },
    { name: "flowchart", meaning: "定义流程图起始。", example: "flowchart: <值>", status: 'supported' },
  ],

  example: {
    title: "%%{init: {\"theme\": \"neutral\", \"look\": \"handDrawn\"}}%%",
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
    "核心分类: 逻辑流转类图表。专注于描述业务流转、决策分支及逻辑闭环。",
  ],
};

export default mermaid_flowchart;
