/**
 * radar · IQS 指标评估/雷达图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 手机硬件参数对比
Standardize: true
ShowAreaScore: true

// 轴定义
Axis: 续航, 100, 0
Axis: 性能, 100, 0
Axis: 拍照, 100, 0

// 数据系列
Series: A手机, [85, 92, 78], #0D5E42, 0.4`;

const STARTER_DSL = `Title: 投资组合多维风险分析

// 统计分析控制
Standardize: true
ShowAreaScore: true
ShowSimilarity: true

// 极坐标控制
StartAngle: -90
Clockwise: true
Closed: true

// 轴定义: Axis: 名称, 最大值, [最小值]
Axis: 年化回报(%), 25, 0
Axis: 波动率(%), 30, 0
Axis: 流动性评分, 100, 0
Axis: 夏普比率, 3.0, 0
Axis: 最大回撤(%), 40, 0

// 数据系列: Series: 名称, [值列表], 颜色?, 透明度?
Series: 平衡型组合, [12, 15, 80, 1.8, 12], #0D5E42, 0.4
Series: 激进型组合, [20, 25, 60, 2.2, 28], #E74C3C, 0.3
Series: 保守型组合, [6, 8, 95, 1.2, 5], #00D2FF, 0.2`;

const vchart_radar: CardSpec = {
  meta: {
    id: "radar",
    tier: "relief",
    family: "vchart",
    body: "AxisSeries",
    mcpName: "render_vchart_radar",
    qcTool: "RADAR",
    version: '1.0',
    parentType: "vchart",
    subType: "radar",
    displayName: "IQS 指标评估/雷达图",
    intents: ["雷达图", "能力雷达", "绩效分析", "radar chart"],
    expertise: ["多维绩效评估", "核心竞争力分析", "指标均衡性观察"],
    colorSlots: [],
    renderEngine: "echarts",
    inferenceKey: "radar",
    migrated: true,
  },

  description: "多轴展现对象在不同维度上得分，以评估整体平衡性与优劣势的工具。",

  soul: {
    title: "雷达图多维分析 (Radar Chart)",
    summary: "雷达图是通过多轴展现对象在不同维度上得分，以评估整体平衡性与优劣势的工具。",
    blocks: [
      { kind: 'h', level: 3, text: "雷达图多维分析 (Radar Chart)" },
      { kind: 'p', text: "雷达图是通过多轴展现对象在不同维度上得分，以评估整体平衡性与优劣势的工具。" },
      { kind: 'h', level: 4, text: "核心分析算子：" },
      { kind: 'ul', items: ["**面积综合得分 (Area Score)**: 评估综合实力，体现“短板效应”。", "**相似度分析 (Similarity Analysis)**: 用于识别竞争对手或特征对标。", "**数据标准化 (Standardize)**: 自动映射量纲不一致的指标至 0-1 范围。"] },
      { kind: 'callout', type: 'TIP', text: "**多维平衡性**: 观察多边形的均匀度。极度不规则意味着资源分配极度不均，可能存在局部优势掩盖系统性缺陷。" },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "Title", meaning: "图表标题", example: "Title: 竞品对比", status: 'supported' },
    { name: "Standardize", meaning: "是否自动标准化数据", values: ["true", "false"], example: "Standardize: true", status: 'supported' },
    { name: "ShowAreaScore", meaning: "显示多边形面积综合得分", example: "ShowAreaScore: true", status: 'supported' },
    { name: "轴定义", meaning: "Axis: [Name], [Max], [Min]", example: "轴定义: Axis: [Name], [Max], [Min]", status: 'supported' },
    { name: "系列定义", meaning: "Series: [Name], [ValueList], [Color], [Opacity]", example: "系列定义: Series: [Name], [ValueList], [Color], [Opacity]", status: 'supported' },
  ],

  example: {
    title: "手机硬件参数对比",
    dsl: EXAMPLE_DSL,
    // TODO(scaffold): 补 expect 语义断言（nodes/edges/requiredEdges/forbiddenEdges）
  },

  starter: {
    title: "投资组合多维风险分析",
    dsl: STARTER_DSL,
  },

  // TODO(scaffold): 补 counterexamples

  outputControls: [
    '纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。',
    '禁止把 dsl 参数写成 JSON 对象。',
  ],

  // TODO(scaffold): 审阅 promptNotes —— 下面是由 soul 自动提炼的初稿（即 protocol://prompts/<kind> 的内容）
  promptNotes: [
    "面积综合得分 (Area Score): 评估综合实力，体现“短板效应”。",
    "相似度分析 (Similarity Analysis): 用于识别竞争对手或特征对标。",
    "数据标准化 (Standardize): 自动映射量纲不一致的指标至 0-1 范围。",
    "多维平衡性: 观察多边形的均匀度。极度不规则意味着资源分配极度不均，可能存在局部优势掩盖系统性缺陷。",
  ],
};

export default vchart_radar;
