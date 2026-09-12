/**
 * basic · 基础统计图（DSL 驱动的 bar / line / pie）— 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_basic 条目 + `protocol/segments/basic.md`
 * 精修项：
 *   · 补 `Type` / `View` 的**值域**（骨架未抽出）
 *   · 补 `ShowLegend` / `ShowValues` / `Grid` / `Decimals` / `Font` / `Color[Bg]`
 *   · 把「重复声明 `Type:` 切换后续 Dataset 渲染类型」这一**混合渲染语义**从 soul 提升为
 *     `Type` 条目的正式说明（骨架仅作散落描述）
 *   · 标注 `Grid` 与 flow 的**同名异义**（flow 为线型 dashed/solid，此处为开关）
 *   · 补 `expect` 与 3 条 `counterexamples`；`promptNotes` 改写为可执行要点
 *   · 移除 `starter`（统一为 example，AUD-124）
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 2024年三季度产线效能对冲分析
Type: bar
ShowLegend: true
Grid: true

// 1. 分类标签（必填：必须有一个 X 轴 Dataset）
Dataset: 月份, [7月, 8月, 9月], null, X

// 2. 主轴产量（柱状）
Dataset: 入库合格量, [12000, 14500, 13800], #0D5E42, Y

// 3. 副轴稼动率：重新声明 Type 切换后续 Dataset 的渲染类型为折线
Type: line
Smooth: true
Dataset: 设备稼动率(%), [88.5, 92.1, 91.4], #E74C3C, Y2
`;

const basic: CardSpec = {
  meta: {
    id: 'basic',
    tier: 'core',
    family: 'iqs_native',
    body: 'Dataset',
    mcpName: 'render_basic',
    qcTool: 'BASIC',
    version: '1.2',
    parentType: 'iqs_native',
    subType: 'basic',
    displayName: 'IQS 基础统计图 (DSL)',
    intents: ['基础图表', '饼图', '折线图', '柱状图', '占比图', '趋势对冲', '环形图', 'bar', 'line', 'pie'],
    expertise: ['通用数据可视化', '趋势分析', '占比分析', '多轴对冲分析'],
    colorSlots: ['Title', 'Bg'],
    typeDirective: { name: 'Type', values: ['bar', 'line', 'pie'], meaning: 'basicChartType' },
    renderEngine: 'echarts',
    inferenceKey: 'basic',
    migrated: true,
  },

  description: '通过简单 DSL 驱动的 Bar / Line / Pie 图表。支持多轴对比、堆叠分析及多层同心圆环。',

  soul: {
    title: '基础图表分析（Bar / Line / Pie）',
    summary: '比较、趋势、占比三大维度的通用工具；支持副轴对冲与多层同心圆环。',
    blocks: [
      { kind: 'h', level: 3, text: '基础图表分析 (Bar / Line / Pie)' },
      {
        kind: 'ul',
        items: [
          '**柱状图 (Bar)**：强调个体之间的横向比较，适合分类数据的离散分析。',
          '**折线图 (Line)**：专注于随时间或连续维度的趋势演变；`Smooth: true` 提升视觉连续性。',
          '**饼图 (Pie)**：表达组成部分与整体的比例分配；多层用 `Y`/`Y2`/`Y3` 做同心圆环。',
          '**混合多轴 (Multi-Axis)**：通过 `Y2` / `Y3` 绑定副轴，可在同一画布对比量级差异巨大的数据（如产量 vs 百分比）。',
        ],
      },
      { kind: 'h', level: 4, text: '核心规则' },
      {
        kind: 'ul',
        items: [
          '**分类标签必填**：无论何种图型，都必须有一个含 `X` 轴匹配的 `Dataset:` 作为分类维，否则数值失去语义。',
          '**混合渲染**：重复声明 `Type:` 会切换**其后** `Dataset` 的渲染类型 —— 这是 bar/line 混排的唯一方式。',
          '**叠层顺序**：`Y` 为最内层，`Y2` 中层，`Y3` 最外层。',
        ],
      },
      {
        kind: 'callout',
        type: 'IMPORTANT',
        text: '**分类限制**：单一图表避免超过 7 个分类。分类过多时应合并为「其他」项，或改用水平柱状图（`View: h`）。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '图表标题', argShape: '<文本>',
      example: 'Title: 2024年产线效能', required: true, status: 'supported',
    },
    {
      name: 'Type', meaning: '渲染模式；**重复声明可切换其后 Dataset 的类型**（混合渲染）',
      values: ['bar', 'line', 'pie'], example: 'Type: bar', status: 'supported',
      notes: '取值**小写**；`Type: Bar` 不生效。',
    },
    {
      name: 'View', meaning: '布局方向', values: ['v', 'h'],
      example: 'View: v', status: 'supported', notes: '`v` 垂直（缺省）、`h` 水平。',
    },
    {
      name: 'Stacked', meaning: '启用堆叠（分量与总量的累计分析）', values: ['true', 'false'],
      example: 'Stacked: true', status: 'supported',
    },
    {
      name: 'Smooth', meaning: '平滑折线（仅 line 有效）', values: ['true', 'false'],
      example: 'Smooth: true', status: 'supported',
    },
    {
      name: 'ShowLegend', meaning: '是否显示图例', values: ['true', 'false'],
      example: 'ShowLegend: true', status: 'supported',
    },
    {
      name: 'ShowValues', meaning: '是否显示数值标签', values: ['true', 'false'],
      example: 'ShowValues: true', status: 'supported',
    },
    {
      name: 'Grid', meaning: '是否显示网格线（**开关**，非线型）', values: ['true', 'false'],
      example: 'Grid: true', status: 'supported',
      notes: '⚠️ 与 flow 的 `Grid:` 同名异义 —— flow 的取值为 `dashed` / `solid`（线型）。',
    },
    {
      name: 'Decimals', meaning: '小数位精度', argShape: '<整数>',
      example: 'Decimals: 1', status: 'supported',
    },
    {
      name: 'Color', slot: ['Title', 'Bg'], meaning: '#HEX 标题色 / 背景色',
      example: 'Color[Title]: #1A2428', status: 'supported',
    },
    {
      name: 'Font', slot: ['Title', 'Base'], meaning: 'px 字号（标题 / 正文）',
      example: 'Font[Title]: 20', status: 'supported',
    },
    {
      name: 'Dataset', meaning: '数据序列定义（本 kind 的唯一数据录入方式）',
      argShape: '<名称>, [<值列表>], <颜色或 null>, <轴匹配>',
      example: 'Dataset: 入库合格量, [12000, 14500, 13800], #0D5E42, Y',
      required: true, status: 'supported',
      notes:
        '① 轴匹配取值 `X`（分类标签，**必须恰好一个**）/ `Y`（主轴）/ `Y2` `Y3`（副轴或同心环层）；' +
        '② 颜色写 `null` 时使用内置色板；' +
        '③ 值列表用**半角逗号**分隔，元素个数应与 X 轴分类数一致。',
    },
  ],

  example: {
    title: '2024年三季度产线效能对冲分析',
    dsl: EXAMPLE_DSL,
    notes: 'X 轴分类 + 主轴柱状 + 副轴折线（通过重复声明 `Type: line` 切换）的典型双轴对冲。',
    expect: {
      noErrors: true,
      items: 3,
      note: 'parser 返回 { data: { datasets }, styles }，items 取 datasets.length',
    },
  },

  counterexamples: [
    {
      bad: 'Dataset: 月份, [7月, 8月], #0D5E42, Y',
      good: 'Dataset: 月份, [7月, 8月], null, X',
      reason: '缺少 `X` 轴分类定义时数值将失去语义标签；必须**恰好有一个** Dataset 用 `X`。',
    },
    { bad: 'Type: Bar', good: 'Type: bar', reason: '`Type` 取值小写，大写不生效。' },
    {
      bad: 'Dataset: 产量, [{x:1,y:2}], null, Y',
      good: 'Dataset: 产量, [12, 15, 9], null, Y',
      reason: '`Dataset` 的值是**纯数组文本**，不是 JSON 对象数组。',
    },
  ],

  outputControls: [
    '`Dataset:` 的四个字段固定为「名称, [值列表], 颜色或 null, 轴匹配」，用**半角逗号**分隔。',
    '必须有一个 `X` 轴 Dataset 作分类维；副轴用 `Y2` / `Y3`。',
  ],

  promptNotes: [
    '先确定图型（比较→bar / 趋势→line / 占比→pie），再决定是否需要副轴对冲（量级差异 ≥ 10 倍时用 Y2）。',
    '先写 X 轴分类 Dataset，再写各数据序列；序列顺序决定图例与堆叠顺序。',
    '分类数 ≤ 7；超过则合并「其他」项或改用 `View: h`。',
    '多层同心圆环：`Y` 最内层、`Y2` 中层、`Y3` 最外层，每层都要有自己的 X 轴标签 Dataset。',
  ],
};

export default basic;
