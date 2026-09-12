/**
 * sequenceDiagram · IQS 系统协作/时序图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "forest"}}%%
sequenceDiagram
    actor 用户
    participant Web as Web端
    participant Srv as 服务端
    
    用户 ->> Web: 点击登录
    Web ->> Srv: 发送鉴权请求
    Srv -->> Web: 返回 Token
    Web -->> 用户: 显示主界面`;

const mermaid_sequence: CardSpec = {
  meta: {
    id: "sequenceDiagram",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_sequence",
    qcTool: "SEQUENCEDIAGRAM",
    version: '1.0',
    parentType: "mermaid",
    subType: "sequenceDiagram",
    displayName: "IQS 系统协作/时序图",
    intents: ["时序图", "顺序图", "调用链", "sequence diagram"],
    expertise: ["系统架构协作", "接口调用时序", "消息传递分析"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "sequenceDiagram",
    migrated: true,
  },

  description: "基于 Mermaid 的时序交互建模工具。用于刻画系统组件间的协作、调用链与消息传递。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "1. 纯净 DSL 范式: AI 必须生成纯文本 DSL 指令。严禁将代码块包裹在 JSON 结构中或附加冗余解释。",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 时序交互类图表。专注于刻画参与者（Participants）之间的消息传递顺序与调用逻辑。"] },
      { kind: 'h', level: 3, text: "公共事项及说明 (Common Instructions)" },
      { kind: 'p', text: "1. **纯净 DSL 范式**: AI 必须生成纯文本 DSL 指令。严禁将代码块包裹在 JSON 结构中或附加冗余解释。" },
      { kind: 'p', text: "2. **符号冲突防御**: 中文描述必须优先使用全角标点，或用引号包裹。例：`Alice ->> Bob: \"处理中，请稍候\"`。" },
      { kind: 'p', text: "3. **角色定义**: 使用 `actor` 定义人工角色，`participant` 定义系统组件。" },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "sequenceDiagram", meaning: "定义时序图起始。", example: "sequenceDiagram: <值>", status: 'supported' },
    { name: "activate", meaning: "开启/关闭生命线。", example: "activate: <值>", status: 'supported' },
    { name: "deactivate", meaning: "开启/关闭生命线。", example: "deactivate: <值>", status: 'supported' },
    { name: "loop", meaning: "控制流结构。", example: "loop: <值>", status: 'supported' },
    { name: "alt", meaning: "控制流结构。", example: "alt: <值>", status: 'supported' },
    { name: "opt", meaning: "控制流结构。", example: "opt: <值>", status: 'supported' },
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
    "核心分类: 时序交互类图表。专注于刻画参与者（Participants）之间的消息传递顺序与调用逻辑。",
  ],
};

export default mermaid_sequence;
