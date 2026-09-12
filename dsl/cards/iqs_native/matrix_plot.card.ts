/**
 * matrixPlot · 矩阵散点图（图矩阵 / pairs plot）— 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_matrix_plot 条目 + `protocol/segments/matrix_plot.md`
 * 精修项：
 *   · 条目名纠正 —— 骨架把 `DisplayMode` / `Diagonal` 当成顶层指令，实为 `Styles:` 块内字段
 *   · 补 `Data:` / `Styles:` 块语法（本 kind 唯一的录入方式，骨架完全缺失）
 *   · 修 soul 中 `$N \timesimes N$` 的 LaTeX 错字（骨架继承自源数据的转义错误）
 *   · 示例数据由 3 行扩到 10 行（矩阵散点图在 3 个样本下无统计意义）
 *   · 补 `expect` 与 3 条 `counterexamples`；`promptNotes` 改为建模要点
 *   · 移除 `starter`（统一为 example，AUD-124）
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 封装工艺参数相关性研究
Mode: Matrix
Dimensions: [压力, 温度, 固化时间, 剥离强度]
Group: 晶圆批次
Smoother: Lowess

Data:
- { 压力: 102, 温度: 185, 固化时间: 45, 剥离强度: 8.2, 晶圆批次: "W-01" }
- { 压力: 105, 温度: 188, 固化时间: 46, 剥离强度: 7.9, 晶圆批次: "W-01" }
- { 压力: 100, 温度: 186, 固化时间: 44, 剥离强度: 8.0, 晶圆批次: "W-01" }
- { 压力: 98, 温度: 192, 固化时间: 42, 剥离强度: 9.1, 晶圆批次: "W-02" }
- { 压力: 96, 温度: 194, 固化时间: 41, 剥离强度: 9.4, 晶圆批次: "W-02" }
- { 压力: 99, 温度: 191, 固化时间: 43, 剥离强度: 9.0, 晶圆批次: "W-02" }
- { 压力: 110, 温度: 180, 固化时间: 48, 剥离强度: 7.2, 晶圆批次: "W-03" }
- { 压力: 112, 温度: 178, 固化时间: 49, 剥离强度: 7.0, 晶圆批次: "W-03" }
- { 压力: 108, 温度: 182, 固化时间: 47, 剥离强度: 7.4, 晶圆批次: "W-03" }
- { 压力: 104, 温度: 187, 固化时间: 45, 剥离强度: 8.1, 晶圆批次: "W-01" }

Styles:
- DisplayMode: Lower
- Diagonal: Histogram
- ColorPalette: Industrial
`;

const matrix_plot: CardSpec = {
  meta: {
    id: 'matrixPlot',
    tier: 'core',
    family: 'iqs_native',
    body: 'Table',
    mcpName: 'render_matrix_plot',
    qcTool: 'MATRIX_PLOT',
    version: '1.1',
    parentType: 'iqs_native',
    subType: 'matrixPlot',
    displayName: 'IQS 多维交互/矩阵散点图',
    intents: ['矩阵散点图', '散点图矩阵', '多变量关联', 'matrix plot', 'pairs plot', '相关矩阵图'],
    expertise: ['多元统计分析', '多变量两两交互', '局部非线性趋势捕捉 (Lowess)'],
    colorSlots: [],
    renderEngine: 'echarts',
    inferenceKey: 'matrixPlot',
    migrated: true,
  },

  description: '多元统计分析核心工具。用于在单一视野内展示多变量间的两两交互关系。',

  soul: {
    title: '矩阵散点图分析价值 (Multi-variable Correlation)',
    summary: '用 N×N 的散点网格一次看遍所有变量的两两关系，对角线的分布图揭示各变量自身形态。',
    blocks: [
      { kind: 'h', level: 3, text: '矩阵散点图分析价值 (Multi-variable Correlation)' },
      {
        kind: 'p',
        text: '图矩阵是多元统计分析中的核心工具，用于在单一视野内展示多变量间的两两交互关系。',
      },
      { kind: 'h', level: 4, text: '核心逻辑与策略' },
      {
        kind: 'ul',
        items: [
          '**Lowess 平滑**：局部加权散点平滑，对离群点鲁棒，能捕捉局部非线性趋势。',
          '**对角线分布**：用直方图确认各变量自身形态（是否正态、有无双峰）—— 判定采样偏置的关键。',
          '**Group 分层识别**：用颜色/形状区分群组（班次、机台、批次）。群体分离往往标志着找到了问题的根本层级。',
          '**降维定位**：在 N×N 的交互网格中快速锁定那 20% 具有强相关的关键驱动因素。',
        ],
      },
      {
        kind: 'callout',
        type: 'TIP',
        text: '重点看**对角线上的直方图**：若某变量呈双峰，先怀疑采样偏置或数据混入了两个总体，再谈相关性。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '图表主标题', argShape: '<文本>',
      example: 'Title: 制程参数关联分析', required: true, status: 'supported',
    },
    {
      name: 'Mode', meaning: '布局模式', values: ['Matrix', 'YvsX'],
      example: 'Mode: Matrix', status: 'supported',
      notes: '`Matrix` = 全矩阵（N×N 网格）；`YvsX` = 单组交叉（仅 1 个 Y 对多个 X）。',
    },
    {
      name: 'Dimensions', meaning: '参与分析的变量维度列表（`Mode: Matrix` 时使用）',
      argShape: '[<变量1>, <变量2>, …]',
      example: 'Dimensions: [温度, 压力, 良率]', required: true, status: 'supported',
      notes: '维度名必须与 `Data:` 中每条记录的字段名**逐字一致**。建议 3–6 个维度（N×N 网格增长很快）。',
    },
    {
      name: 'Group', meaning: '分层变量名（用颜色/形状区分群组）', argShape: '<字段名>',
      example: 'Group: 批次', status: 'supported',
      notes: '该字段应同时出现在 `Data:` 的每条记录里。',
    },
    {
      name: 'Smoother', meaning: '平滑算法', values: ['Lowess', 'MovingAverage', 'false'],
      example: 'Smoother: Lowess', status: 'supported',
      notes: '写 `false` 或省略即不叠趋势线。',
    },
    {
      name: 'Data', meaning: '数据块**开始**；块内每条记录为一行 YAML-lite 对象',
      argShape: 'Data:\n- { <字段>: <值>, … }',
      example: 'Data:\n- { 压力: 102, 温度: 185, 晶圆批次: "W-01" }', required: true, status: 'supported',
      notes: '字段名可不加引号；字符串值（如批次号）建议加引号以免被解析为数值。**至少 10 条记录**才有统计意义。',
    },
    {
      name: 'Styles', meaning: '样式块**开始**；块内为 `- <键>: <值>` 列表',
      argShape: 'Styles:\n- <键>: <值>',
      example: 'Styles:\n- DisplayMode: Lower', status: 'supported',
      notes: '键包括 `DisplayMode` / `Diagonal` / `ColorPalette` / `PointSize` / `PointOpacity`。',
    },
    {
      name: 'DisplayMode',
      meaning: '（`Styles` 内）显示哪些三角区域',
      values: ['Full', 'Lower', 'Upper'],
      example: '- DisplayMode: Lower', status: 'supported',
      notes: '`Full` 全显（N×N）；`Lower` 只显左下三角（**最常用，避免重复信息**）；`Upper` 只显右上三角。',
    },
    {
      name: 'Diagonal',
      meaning: '（`Styles` 内）对角线单元格的呈现方式',
      values: ['Histogram', 'Boxplot', 'Label', 'None'],
      example: '- Diagonal: Histogram', status: 'supported',
    },
    {
      name: 'ColorPalette',
      meaning: '（`Styles` 内）配色方案',
      values: ['Industrial'],
      example: '- ColorPalette: Industrial', status: 'supported',
    },
  ],

  example: {
    title: '封装工艺参数相关性研究',
    dsl: EXAMPLE_DSL,
    notes: '4 个维度 × 10 条记录，按晶圆批次分 3 组；`DisplayMode: Lower` 只画左下三角。',
    expect: {
      noErrors: true,
      items: 10,
      note: 'parser 返回 { data: { …, data }, styles }，items 取 data.length（记录数）',
    },
  },

  counterexamples: [
    {
      bad: 'Dimensions: [压力, 温度]\nData:\n- { 压强: 102, 温度: 185 }',
      good: 'Dimensions: [压力, 温度]\nData:\n- { 压力: 102, 温度: 185 }',
      reason: '`Dimensions` 里的维度名必须与 `Data:` 记录的字段名逐字一致，否则该维度全为空。',
    },
    {
      bad: 'Data:\n- { 压力: 102, 温度: 185 }   （仅 1–2 条记录）',
      good: '至少 10 条记录',
      reason: '两两散点图在极少样本下无法读出分布与相关性，甚至会误导。',
    },
    {
      bad: 'Dimensions: [温度, 压力, 时间, 强度, 硬度, 湿度, 速度, 重量]   （8 维）',
      good: '选出 3–6 个关键维度',
      reason: 'N 维会生成 N×N 网格；8 维即 64 格，远超一屏可读范围。先做维度筛选。',
    },
  ],

  outputControls: [
    '`Data:` 与 `Styles:` 都是块式语法：块名独占一行，块内条目以 `- ` 开头。',
    '`Dimensions` 的维度名必须与 `Data:` 记录字段名逐字一致。',
  ],

  promptNotes: [
    '先选维度（3–6 个）——矩阵散点图的成本随维度平方增长。',
    '把用户数据整理成 `- { 字段: 值, … }` 的记录列表，字段名用简短中文并保持一致。',
    '有分组信息时务必用 `Group:` 表达（颜色分层往往比总体相关系数更有信息量）。',
    '缺省用 `DisplayMode: Lower` 只画左下三角；需要对照上下三角时才用 `Full`。',
    '不要臆造数据行 —— 用户给的样本量不足时如实说明。',
  ],
};

export default matrix_plot;
