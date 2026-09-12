/**
 * scatter · 散点图（相关与回归）— 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_scatter 条目 + `protocol/segments/scatter.md`
 * 精修项：
 *   · 八个条目的说明由占位（"开关" / "轴标签"）补全为**具体语义与值域**
 *   · 补 `Color[Point|Trend]`（骨架缺失，而示例已在使用）
 *   · 明确 `Show3D` 与 `3D` 的**兼容别名**关系（骨架未提）
 *   · 补数据行语法（`- x, y [, z]`）为正式条目
 *   · 补 `expect` 与 3 条 `counterexamples`；`promptNotes` 改为建模要点
 *   · 移除 `starter`（统一为 example，AUD-124）
 *
 * 注：本 kind 是 QC 的 **Native CORE** 相关分析工具 —— 有 Native 等价时禁止改用
 *     `render_vchart_scatter` 充当终稿。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 注塑工艺参数相关分析
XAxis: 模具温度(℃)
YAxis: 注射压力(MPa)
ZAxis: 收缩率%
Color[Point]: #0D5E42
Color[Trend]: #F1C40F
ShowTrend: true
Show3D: false
ShowValues: false

// 数据点：- <X>, <Y> [, <Z>]
- 195.5, 85.2, 2.4
- 192.0, 82.5, 2.5
- 198.5, 88.0, 2.2
- 215.0, 105.0, 0.6
- 218.5, 108.2, 0.55
- 212.0, 102.5, 0.7
`;

const scatter: CardSpec = {
  meta: {
    id: 'scatter',
    tier: 'core',
    family: 'iqs_native',
    body: 'TupleList',
    mcpName: 'render_scatter',
    qcTool: 'SCATTER',
    version: '1.1',
    parentType: 'iqs_native',
    subType: 'scatter',
    displayName: 'IQS 相关分析/散点图',
    intents: ['散点图', '相关分析', '回归', 'scatter', '相关性', 'X-Y确认'],
    expertise: ['相关分析', '回归分析', '原因确认'],
    colorSlots: ['Point', 'Trend'],
    renderEngine: 'echarts',
    inferenceKey: 'scatter',
    migrated: true,
  },

  description: '双变量/三变量相关分析。支持趋势回归、气泡尺寸与 3D 视图开关。QC 核心工具（非 VChart 救济）。',

  soul: {
    title: '相关与回归',
    summary: '验证 X 与 Y 是否存在相关关系，并用最小二乘趋势线量化其方向与强度。',
    blocks: [
      { kind: 'h', level: 3, text: '相关与回归' },
      {
        kind: 'p',
        text: '散点图用于验证 X 与 Y 是否存在线性/非线性相关，是「确认原因」阶段的核心工具。',
      },
      {
        kind: 'ul',
        items: [
          '**相关 ≠ 因果**：观察到相关后仍需排除第三变量，或在专业上给出机理解释。',
          '**离群点优先追查**：偏离主群的少数点往往对应特殊原因（特定机台、班次、批次）。',
          '**趋势线**：开启 `ShowTrend` 后由引擎做最小二乘拟合。',
          '**分组对比**：若疑似存在两个总体（如两台设备），它们会在图上呈现为两团 —— 这是最有价值的信息。',
        ],
      },
      {
        kind: 'callout',
        type: 'TIP',
        text: '点太少（< 20）时不要解读趋势线的斜率，容易过拟合；样本点越密集，趋势线越可信。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '图表标题', argShape: '<文本>',
      example: 'Title: 注塑工艺参数相关分析', required: true, status: 'supported',
    },
    {
      name: 'XAxis', meaning: 'X 轴标签（**含单位**，如 `模具温度(℃)`）', argShape: '<文本>',
      example: 'XAxis: 模具温度(℃)', status: 'supported',
    },
    {
      name: 'YAxis', meaning: 'Y 轴标签（含单位）', argShape: '<文本>',
      example: 'YAxis: 注射压力(MPa)', status: 'supported',
    },
    {
      name: 'ZAxis', meaning: 'Z 轴标签（仅在三维模式 / 气泡图时有意义）', argShape: '<文本>',
      example: 'ZAxis: 收缩率%', status: 'supported',
      notes: '二维模式下数据行的第三个数仅作气泡尺寸，不产生 Z 轴。',
    },
    {
      name: 'ShowTrend', meaning: '显示最小二乘趋势线', values: ['true', 'false'],
      example: 'ShowTrend: true', status: 'supported',
    },
    {
      name: 'Show3D', meaning: '启用三维散点视图（兼容别名 `3D` 效果相同）',
      values: ['true', 'false'], example: 'Show3D: false', status: 'supported',
      notes: '开启后数据行需带第三个数（Z 值）。',
    },
    {
      name: 'ShowValues', meaning: '在点旁显示数值标签', values: ['true', 'false'],
      example: 'ShowValues: false', status: 'supported',
    },
    {
      name: 'Color', slot: ['Point', 'Trend'], meaning: '#HEX 颜色：数据点 / 趋势线',
      example: 'Color[Point]: #0D5E42', status: 'supported',
    },
    {
      name: 'Size', slot: ['Base'], meaning: '数据点基准像素大小（气泡模式下作为尺寸下限）',
      argShape: '<数值>', example: 'Size[Base]: 8', status: 'supported',
    },
    {
      name: 'Opacity', meaning: '数据点透明度（点密集时降低可缓解叠色）',
      argShape: '0–1 之间的数值', example: 'Opacity: 0.6', status: 'supported',
    },
    {
      name: '数据行', meaning: '一个观测点 —— 本 kind 唯一的数据录入方式',
      argShape: '- <X>, <Y>[, <Z>]',
      example: '- 195.5, 85.2, 2.4', required: true, status: 'supported',
      notes: '用**半角逗号**分隔；同一张图内所有行的字段数必须一致（要么都 2 个、要么都 3 个）。',
    },
  ],

  example: {
    title: '注塑工艺参数相关分析',
    dsl: EXAMPLE_DSL,
    notes: '6 个三变量观测点；温度—压力呈正相关，但收缩率在高温高压组骤降（可据此发现工艺窗口）。',
    expect: {
      noErrors: true,
      items: 6,
      note: 'parser 返回 { data: number[][], styles }，items 取 data.length',
    },
  },

  counterexamples: [
    {
      bad: '- 195.5, 85.2\n- 192.0, 82.5, 2.5',
      good: '- 195.5, 85.2, 2.4\n- 192.0, 82.5, 2.5',
      reason: '同一张图内每行的字段数必须一致；混用二维与三维会让部分点无法定位。',
    },
    {
      bad: 'Show3D: true\n- 195.5, 85.2',
      good: 'Show3D: true\n- 195.5, 85.2, 2.4',
      reason: '开启三维后每行都需要第三个数值（Z）。',
    },
    {
      bad: 'XAxis: 模具温度   （无单位）',
      good: 'XAxis: 模具温度(℃)',
      reason: '轴标签应带单位，否则趋势线的斜率无法解读。',
    },
    {
      bad: '（只有 6 个点）ShowTrend: true 并据此断言强相关',
      good: '样本量 ≥ 20 再解读趋势线与相关性',
      reason: '极少样本下趋势线极不稳定，容易得出误导性结论。',
    },
  ],

  outputControls: [
    '数据用 `- <X>, <Y>[, <Z>]` 逐行录入；**半角逗号**分隔，字段数全图一致。',
    '轴标签请带单位（如 `模具温度(℃)`）。',
  ],

  promptNotes: [
    '先确认分析目标：是「验证 X 影响 Y」还是「看数据是否存在分组」；前者开 `ShowTrend`，后者强调点的分布。',
    '把用户给的成对（或三元）数据整理成 `- x, y[, z]` 行；字段数保持一致。',
    '轴标签务必带单位 —— 散点图的解读高度依赖量纲。',
    '样本量 < 20 时不要解读相关性强度；点很多（> 200）时把 `Opacity` 降到 0.5 以下避免叠色成块。',
    '不要臆造数据点；也不要对明显非线性的数据强行用线性趋势线下结论。',
  ],
};

export default scatter;
