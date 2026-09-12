/**
 * gitGraph · IQS Git 分支/GitGraph — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Feature-A"
    checkout main
    merge develop
    commit id: "Release-1.0"`;

const mermaid_gitgraph: CardSpec = {
  meta: {
    id: "gitGraph",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_gitgraph",
    qcTool: "GITGRAPH",
    version: '1.0',
    parentType: "mermaid",
    subType: "gitGraph",
    displayName: "IQS Git 分支/GitGraph",
    intents: ["git图", "分支图", "代码提交记录", "gitgraph"],
    expertise: ["版本控制可视化", "Git 工作流分析", "代码提交记录建模"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "gitGraph",
    migrated: true,
  },

  description: "基于 Mermaid 的 Git 工作流模拟工具。展示提交记录、分支创建、切换及合并过程。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 逻辑流转类图表。专注于展示代码版本控制中的分支演进及合并逻辑。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "gitGraph", meaning: "定义 Git 图起始。", example: "gitGraph: <值>", status: 'supported' },
    { name: "commit id: \"ID\"", meaning: "提交记录。", example: "commit id: \"ID\": <值>", status: 'supported' },
    { name: "branch", slot: ["Name"], meaning: "创建分支。", example: "branch [Name][Name]: <值>", status: 'supported' },
    { name: "checkout", slot: ["Name"], meaning: "切换分支。", example: "checkout [Name][Name]: <值>", status: 'supported' },
    { name: "merge", slot: ["Name"], meaning: "合并分支。", example: "merge [Name][Name]: <值>", status: 'supported' },
  ],

  example: {
    title: "gitGraph",
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
    "核心分类: 逻辑流转类图表。专注于展示代码版本控制中的分支演进及合并逻辑。",
  ],
};

export default mermaid_gitgraph;
