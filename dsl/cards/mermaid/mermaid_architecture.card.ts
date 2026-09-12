/**
 * architecture · IQS 架构拓扑/Architecture — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `architecture-beta
    group api(cloud)[API Layer]
    group services(server)[Service Layer]
    group db(database)[Database Layer]

    service gateway(internet)[API Gateway] in api
    service auth(server)[Auth Service] in services
    service user(server)[User Service] in services
    service mysql(database)[MySQL] in db

    gateway:R --> L:auth
    gateway:B --> T:user
    auth:R --> L:mysql
    user:R --> L:mysql`;

const mermaid_architecture: CardSpec = {
  meta: {
    id: "architecture",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_architecture",
    qcTool: "ARCHITECTURE",
    version: '1.0',
    parentType: "mermaid",
    subType: "architecture",
    displayName: "IQS 架构拓扑/Architecture",
    intents: ["架构图", "拓扑图", "系统架构", "architecture"],
    expertise: ["系统架构设计", "服务拓扑分析", "云原生架构建模"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "architecture",
    migrated: true,
  },

  description: "基于 Mermaid 的系统架构可视化工具。支持逻辑分层（Group）、服务定义及带方向的拓扑连线。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 结构建模类图表。用于刻画现代云原生或微服务架构的逻辑层级与物理拓扑。"] },
      { kind: 'h', level: 3, text: "分类图表注意事项 (Diagram-Specific Precautions)" },
      { kind: 'ul', items: ["**拓扑语法 (Critical)**: 连线方向必须遵循 `源节点:方向 --> 方向:目标节点`（例如 `gateway:R --> L:auth`）。", "**命名建议**: Label 建议优先使用英文以确保持续兼容性。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "architecture-beta", meaning: "定义架构图起始。", example: "architecture-beta: <值>", status: 'supported' },
    { name: "group [ID](图标)[Label]", meaning: "定义逻辑层级组。", example: "group [ID](图标)[Label]: <值>", status: 'supported' },
    { name: "service [ID](图标)[Label]", meaning: "定义具体服务节点。", example: "service [ID](图标)[Label]: <值>", status: 'supported' },
  ],

  example: {
    title: "architecture-beta",
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
    "核心分类: 结构建模类图表。用于刻画现代云原生或微服务架构的逻辑层级与物理拓扑。",
    "拓扑语法 (Critical): 连线方向必须遵循 `源节点:方向 --> 方向:目标节点`（例如 `gateway:R --> L:auth`）。",
    "命名建议: Label 建议优先使用英文以确保持续兼容性。",
  ],
};

export default mermaid_architecture;
