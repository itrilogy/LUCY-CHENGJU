/**
 * gauge · VChart 实时性能/仪表盘 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 产线实时直通率仪表盘
ColorPalette: tech
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "gauge",
  "data": [{ "values": [{"v": 0.88}] }],
  "valueField": "v",
  "categoryField": "v",
  "outerRadius": 0.8, "innerRadius": 0.5,
  "startAngle": -225, "endAngle": 45,
  "label": { "visible": true }
}`;

const vchart_gauge: CardSpec = {
  meta: {
    id: "gauge",
    tier: "relief",
    family: "vchart",
    body: "Unknown",
    mcpName: "render_vchart_gauge",
    qcTool: "GAUGE",
    version: '1.0',
    parentType: "vchart",
    subType: "gauge",
    displayName: "VChart 实时性能/仪表盘",
    intents: ["仪表盘", "刻度盘", "gauge chart", "达成率监控"],
    expertise: ["实时监控展示", "KPI 达成呈现", "水位仪表建模"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "gauge",
    migrated: true,
  },

  description: "核心 KPI 达成效率呈现工具。模拟物理仪表盘，展示数值在量程范围内的当前水位，适用于良率、效率的阈值监控。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**角度控制**: 应显式定义 `startAngle` (如 -225) 和 `endAngle` (如 45) 以形成工业标准的扫掠范围。", "**严禁跨系挂载**: 禁止配置 Cartesian 坐标轴。", "**量程定义**: 通过半径 `outerRadius` 与 `innerRadius` 控制环厚。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "数据限制", meaning: "建议单系列数据展示。使用 valueField 绑定当前测得数值。", example: "数据限制: valueField", status: 'supported' },
  ],

  example: {
    title: "产线实时直通率仪表盘",
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
    "角度控制: 应显式定义 `startAngle` (如 -225) 和 `endAngle` (如 45) 以形成工业标准的扫掠范围。",
    "严禁跨系挂载: 禁止配置 Cartesian 坐标轴。",
    "量程定义: 通过半径 `outerRadius` 与 `innerRadius` 控制环厚。",
  ],
};

export default vchart_gauge;
