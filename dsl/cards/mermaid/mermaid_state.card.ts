/**
 * stateDiagram-v2 · IQS 状态迁移/状态图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "neutral"}}%%
stateDiagram-v2
    state "待支付" as s1
    state "已支付" as s2
    state "待发货" as s3
    [*] --> s1
    s1 --> s2: 支付成功
    s2 --> s3
    s3 --> [*]`;

const mermaid_state: CardSpec = {
  meta: {
    id: "stateDiagram-v2",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_state",
    qcTool: "STATEDIAGRAM-V2",
    version: '1.0',
    parentType: "mermaid",
    subType: "stateDiagram-v2",
    displayName: "IQS 状态迁移/状态图",
    intents: ["状态图", "状态迁移图", "生命周期图", "state diagram"],
    expertise: ["系统状态建模", "生命周期分析", "业务状态流转"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "stateDiagram-v2",
    migrated: true,
  },

  description: "基于 Mermaid 的系统状态建模工具。用于刻画对象的生命周期、状态演变及触发条件。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 逻辑流转类图表。专注于描述对象在不同触发条件下如何从一个状态转移到另一个状态。"] },
      { kind: 'h', level: 3, text: "分类图表注意事项 (Diagram-Specific Precautions)" },
      { kind: 'ul', items: ["**语义固化**: 必须采用 `state \"描述文本\" as 别名` 语法。严禁直接在转移连线上书写过于复杂的逻辑描述，以防渲染混乱。", "**闭环思维**: 必须包含起始状态 `[*]`。建议显式标注每一个终结状态 `[*]`。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "stateDiagram-v2", meaning: "定义状态图起始。", example: "stateDiagram-v2: <值>", status: 'supported' },
    { name: "-->", meaning: "定义状态转移。", example: "-->: <值>", status: 'supported' },
    { name: "[*]", meaning: "定义起始/结束点。", example: "[*]: <值>", status: 'supported' },
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
    "核心分类: 逻辑流转类图表。专注于描述对象在不同触发条件下如何从一个状态转移到另一个状态。",
    "语义固化: 必须采用 `state \"描述文本\" as 别名` 语法。严禁直接在转移连线上书写过于复杂的逻辑描述，以防渲染混乱。",
    "闭环思维: 必须包含起始状态 `[*]`。建议显式标注每一个终结状态 `[*]`。",
  ],
};

export default mermaid_state;
