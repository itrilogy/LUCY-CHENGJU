/**
 * gantt · IQS 进度计划/甘特图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "base", "gantt": {"barHeight": 35, "fontSize": 16}}}%%
gantt
    title 项目开发进度
    dateFormat YYYY-MM-DD
    todayMarker off
    section 核心开发
    架构设计 :a1, 2024-03-01, 5d
    功能开发 :after a1, 10d
    section 质量验证
    集成测试 :2024-03-15, 7d`;

const mermaid_gantt: CardSpec = {
  meta: {
    id: "gantt",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_gantt",
    qcTool: "GANTT",
    version: '1.0',
    parentType: "mermaid",
    subType: "gantt",
    displayName: "IQS 进度计划/甘特图",
    intents: ["甘特图", "进度计划", "项目排期", "gantt"],
    expertise: ["项目计划管理", "时间进度追踪", "任务计划排期"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "gantt",
    migrated: true,
  },

  description: "基于 Mermaid 的项目进度管理工具。专注于时间维度、阶段划分及任务分配。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 计划与追踪类图表。关注任务在时间轴上的分布、依赖及完成状态。"] },
      { kind: 'h', level: 3, text: "分类图表注意事项 (Diagram-Specific Precautions)" },
      { kind: 'ul', items: ["**缩放防御 (Critical)**: 若当前日期不在项目周期内，必须强制设置 `todayMarker off`，否则时间轴会被无限拉伸导致图例不可见。", "**日期格式**: 必须通过 `dateFormat YYYY-MM-DD` 显式声明日期解析方式，以确保跨平台渲染一致性。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "gantt", meaning: "定义甘特图起始。", example: "gantt: <值>", status: 'supported' },
    { name: "section", meaning: "定义阶段。", example: "section: <值>", status: 'supported' },
    { name: "任务 :a1, 2024-03-01, 5d", meaning: "任务定义语法。", example: "任务 :a1, 2024-03-01, 5d: <值>", status: 'supported' },
    { name: "after a1", meaning: "任务依赖语法。", example: "after a1: <值>", status: 'supported' },
  ],

  example: {
    title: "%%{init: {\"theme\": \"base\", \"gantt\": {\"barHeight\": 35, \"fontSize\": 16}}}%%",
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
    "核心分类: 计划与追踪类图表。关注任务在时间轴上的分布、依赖及完成状态。",
    "缩放防御 (Critical): 若当前日期不在项目周期内，必须强制设置 `todayMarker off`，否则时间轴会被无限拉伸导致图例不可见。",
    "日期格式: 必须通过 `dateFormat YYYY-MM-DD` 显式声明日期解析方式，以确保跨平台渲染一致性。",
  ],
};

export default mermaid_gantt;
