/**
 * journey · IQS 体验路径/旅程图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "base"}}%%
journey
    title 线上购物旅程
    section 搜索
      点击商品: 5: 用户
      查看详情: 4: 用户
    section 决策
      加购物车: 5: 用户
      下单支付: 3: 用户`;

const mermaid_journey: CardSpec = {
  meta: {
    id: "journey",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_journey",
    qcTool: "JOURNEY",
    version: '1.0',
    parentType: "mermaid",
    subType: "journey",
    displayName: "IQS 体验路径/旅程图",
    intents: ["旅程图", "用户旅程", "体验路径", "journey board"],
    expertise: ["用户体验映射", "客户旅程分析", "服务感知可视化"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "journey",
    migrated: true,
  },

  description: "基于 Mermaid 的用户旅程映射工具。标注不同阶段用户的情绪、动作与角色参与。适用于体验感知分析。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 多维认知类图表。通过时间序列展示用户在交互过程中的情感曲线与参与点。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "journey", meaning: "定义旅程图起始。", example: "journey: <值>", status: 'supported' },
    { name: "title", meaning: "设置旅程名称。", example: "title: <值>", status: 'supported' },
    { name: "section", meaning: "设置阶段（如 搜索、决策）。", example: "section: <值>", status: 'supported' },
    { name: "动作: 5: 角色", meaning: "分别代表 动作名, 评分 (0-5), 角色名。", example: "动作: 5: 角色: <值>", status: 'supported' },
  ],

  example: {
    title: "%%{init: {\"theme\": \"base\"}}%%",
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
    "核心分类: 多维认知类图表。通过时间序列展示用户在交互过程中的情感曲线与参与点。",
  ],
};

export default mermaid_journey;
