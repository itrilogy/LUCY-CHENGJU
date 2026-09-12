/**
 * packet-beta · IQS 报文解析/Packet — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `packet-beta
    0-7: "版本号"
    8-15: "类型"
    16-31: "校验和"
    32-63: "偏移量"`;

const mermaid_packet: CardSpec = {
  meta: {
    id: "packet-beta",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_packet",
    qcTool: "PACKET-BETA",
    version: '1.0',
    parentType: "mermaid",
    subType: "packet-beta",
    displayName: "IQS 报文解析/Packet",
    intents: ["报文图", "协议解析", "packet structure"],
    expertise: ["报文协议分析", "比特位映射", "协议栈建模"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "packet-beta",
    migrated: true,
  },

  description: "基于 Mermaid 的报文协议可视化工具。用于精确刻画比特位偏移、字段宽度及报文协议头结构。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 报文协议解析类。专注于底层通信数据结构的精确位图展示。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "packet-beta", meaning: "定义报文图起始。", example: "packet-beta: <值>", status: 'supported' },
    { name: "[Start]-[End]: \"Label\"", meaning: "定义位偏移量及字段名称（例：0-7: \"Type\"）。", example: "[Start]-[End]: \"Label\": 0-7: \"Type\"", status: 'supported' },
  ],

  example: {
    title: "packet-beta",
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
    "核心分类: 报文协议解析类。专注于底层通信数据结构的精确位图展示。",
  ],
};

export default mermaid_packet;
