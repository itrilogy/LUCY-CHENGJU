/**
 * quadrantChart · IQS 四象限分析/象限图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `quadrantChart
    title "研发任务优先级"
    x-axis "低价值" --> "高价值"
    y-axis "难实现" --> "易实现"
    quadrant-1 "重点投入"
    quadrant-2 "长期规划"
    "任务A": [0.8, 0.9]
    "任务B": [0.2, 0.3]`;

const mermaid_quadrant: CardSpec = {
  meta: {
    id: "quadrantChart",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_quadrant",
    qcTool: "QUADRANTCHART",
    version: '1.0',
    parentType: "mermaid",
    subType: "quadrantChart",
    displayName: "IQS 四象限分析/象限图",
    intents: ["象限图", "四象限", "优先级分析", "quadrant chart"],
    expertise: ["优先级评估", "战略分析", "四象限法则"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "quadrantChart",
    migrated: true,
  },

  description: "基于 Mermaid 的多维评估工具。通过 X/Y 轴构建四个维度象限，快速定位任务或对象的优先级。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 多维认知类图表。用于将事物按照两种维度的强弱划分为四个象限，辅助决策。"] },
      { kind: 'h', level: 3, text: "分类图表注意事项 (Diagram-Specific Precautions)" },
      { kind: 'ul', items: ["**引号强制**: 在 `quadrantChart` 中，**所有中文标签必须用双引号 \"\" 包裹**，否则会导致解析引擎挂起。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "quadrantChart", meaning: "定义象限图起始。", example: "quadrantChart: <值>", status: 'supported' },
    { name: "x-axis \"Min\" --> \"Max\"", meaning: "X 轴标签定义。", example: "x-axis \"Min\" --> \"Max\": <值>", status: 'supported' },
    { name: "quadrant-1 \"Label\"", meaning: "象限区域标注。", example: "quadrant-1 \"Label\": <值>", status: 'supported' },
    { name: "\"Item\": [x, y]", meaning: "数据点定位语法。", example: "\"Item\": [x, y]: <值>", status: 'supported' },
  ],

  example: {
    title: "quadrantChart",
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
    "核心分类: 多维认知类图表。用于将事物按照两种维度的强弱划分为四个象限，辅助决策。",
    "引号强制: 在 `quadrantChart` 中，所有中文标签必须用双引号 \"\" 包裹，否则会导致解析引擎挂起。",
  ],
};

export default mermaid_quadrant;
