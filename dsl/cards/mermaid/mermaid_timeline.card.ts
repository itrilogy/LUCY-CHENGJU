/**
 * timeline · IQS 历史年表/时间线 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "forest"}}%%
timeline
    title IQS 产品历史
    2023 : 1.0 版本
    2024 : 2.0 版本
    2025 : 3.0 版本`;

const mermaid_timeline: CardSpec = {
  meta: {
    id: "timeline",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_timeline",
    qcTool: "TIMELINE",
    version: '1.0',
    parentType: "mermaid",
    subType: "timeline",
    displayName: "IQS 历史年表/时间线",
    intents: ["时间线", "年表", "迭代记录", "timeline"],
    expertise: ["历史路径分析", "迭代周期展现", "时间线建模"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "timeline",
    migrated: true,
  },

  description: "基于 Mermaid 的时间轴呈现工具。用于展示产品迭代、历史事件及关键里程碑的线性演进。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 计划与追踪类图表。专注于以非刻度化的方式展示重要事件的先后顺序环境。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "timeline", meaning: "定义时间线起始。", example: "timeline: <值>", status: 'supported' },
    { name: "title", meaning: "设置标题。", example: "title: <值>", status: 'supported' },
    { name: "2024 : [事件1] : [事件2]", meaning: "时间段与事件定义语法。", example: "2024 : [事件1] : [事件2]: <值>", status: 'supported' },
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
    "核心分类: 计划与追踪类图表。专注于以非刻度化的方式展示重要事件的先后顺序环境。",
  ],
};

export default mermaid_timeline;
