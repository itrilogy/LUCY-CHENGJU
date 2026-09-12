/**
 * sankey-beta · IQS 能量流向/桑基图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `sankey-beta
    Agricultural,Fertilizer,150
    Agricultural,Irrigation,100
    Fertilizer,Crop,120
    Irrigation,Crop,80`;

const mermaid_sankey: CardSpec = {
  meta: {
    id: "sankey-beta",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_sankey",
    qcTool: "SANKEY-BETA",
    version: '1.0',
    parentType: "mermaid",
    subType: "sankey-beta",
    displayName: "IQS 能量流向/桑基图",
    intents: ["桑基图", "sankey", "流向图", "分配图"],
    expertise: ["能量平衡分析", "价值流映射 (VSM)", "资源分配可视化"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "sankey-beta",
    migrated: true,
  },

  description: "基于 Mermaid 的能量或价值流向可视化工具。展现系统内部的分配与转移逻辑。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 能量/价值流向类图表。用于展示流动量在不同节点间的分配关系。"] },
      { kind: 'h', level: 3, text: "分类图表注意事项 (Diagram-Specific Precautions)" },
      { kind: 'ul', items: ["**语言退避 (Critical)**: 当前版本 `sankey-beta` 解析器对非 ASCII 字符极其敏感。**强烈建议强制使用英文标注**以确保渲染成功，否则可能导致节点崩解。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "sankey-beta", meaning: "定义桑基图起始。", example: "sankey-beta: <值>", status: 'supported' },
    { name: "Source,Sink,Value", meaning: "数据行定义语法。", example: "Source,Sink,Value: <值>", status: 'supported' },
  ],

  example: {
    title: "sankey-beta",
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
    "核心分类: 能量/价值流向类图表。用于展示流动量在不同节点间的分配关系。",
    "语言退避 (Critical): 当前版本 `sankey-beta` 解析器对非 ASCII 字符极其敏感。强烈建议强制使用英文标注以确保渲染成功，否则可能导致节点崩解。",
  ],
};

export default mermaid_sankey;
