/**
 * block-beta · IQS 分层块图/Block — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `block-beta
    columns 3
    "服务1" "服务2" "服务3"
    block:group1
        columns 1
        "子项A" "子项B"
    end`;

const mermaid_block: CardSpec = {
  meta: {
    id: "block-beta",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_block",
    qcTool: "BLOCK-BETA",
    version: '1.0',
    parentType: "mermaid",
    subType: "block-beta",
    displayName: "IQS 分层块图/Block",
    intents: ["块图", "分层组件图", "block diagram"],
    expertise: ["层级架构展示", "组件化建模", "网格化布局分析"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "block-beta",
    migrated: true,
  },

  description: "基于 Mermaid 的分块结构图。用于展示层级化的服务、组件或逻辑块，支持网格化布局。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 结构建模类图表。用于将复杂的系统拆解为可视化的逻辑矩形块（Block）与容器。"] },
      { kind: 'h', level: 3, text: "分类图表注意事项 (Diagram-Specific Precautions)" },
      { kind: 'ul', items: ["**引号强制**: 在 `block-beta` 中，**所有中文标签必须用双引号 \"\" 包裹**。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "block-beta", meaning: "定义块图起始。", example: "block-beta: <值>", status: 'supported' },
    { name: "columns", slot: ["N"], meaning: "设置每行显示的网格列数。", example: "columns [N][N]: <值>", status: 'supported' },
    { name: "block:[ID]", meaning: "定义容器块。", example: "block:[ID]: <值>", status: 'supported' },
    { name: "\"Label\"", meaning: "定义具体内容块。", example: "\"Label\": <值>", status: 'supported' },
  ],

  example: {
    title: "block-beta",
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
    "核心分类: 结构建模类图表。用于将复杂的系统拆解为可视化的逻辑矩形块（Block）与容器。",
    "引号强制: 在 `block-beta` 中，所有中文标签必须用双引号 \"\" 包裹。",
  ],
};

export default mermaid_block;
