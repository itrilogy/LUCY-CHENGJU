/**
 * control · SPC 过程控制图 — 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_control 条目 + `protocol/segments/control.md`
 * 精修项：
 *   · 补 `Type` 的**完整值域**（骨架只抽到 X-bar-R / I-MR 两个，实为 7 种 SPC 图种）
 *   · 补 `[series]` / `[/series]` 数据块语法（骨架完全缺失 —— 这是本 kind 唯一的数据录入方式）
 *   · 补 `Decimals` / `Color[Line|Point|UCL|CL|LCL]`
 *   · `Rules` 说明支持**多规则逗号并列**（`Rules: Western-Electric,Nelson`）
 *   · 补 `expect` 与 4 条 `counterexamples`；`promptNotes` 改为选型与数据整理要点
 *   · 移除 `starter`（统一为 example，AUD-124）
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 缸盖螺栓孔径 X-bar-R 控制图
Type: X-bar-R
Size: 5
Rules: Nelson
Decimals: 3
Color[Line]: #0D5E42
Color[Point]: #0A4A33
Color[UCL]: #E74C3C

[series]: 孔径测量值 (mm)
12.01, 12.02, 11.99, 12.00, 12.01
12.03, 11.98, 12.01, 12.02, 11.99
12.00, 12.01, 12.04, 11.97, 12.02
12.01, 11.99, 12.00, 12.03, 12.01
11.98, 12.02, 12.01, 11.99, 12.00
[/series]
`;

const control: CardSpec = {
  meta: {
    id: 'control',
    tier: 'core',
    family: 'iqs_native',
    body: 'Series',
    mcpName: 'render_control',
    qcTool: 'CONTROL',
    version: '1.1',
    parentType: 'iqs_native',
    subType: 'control',
    displayName: 'IQS SPC 过程控制图',
    intents: ['控制图', 'SPC', '稳定性分析', 'control chart', '判异', '过程受控'],
    expertise: ['统计过程控制 (SPC)', '判异规则 (Nelson / Western Electric)'],
    colorSlots: ['Line', 'Point', 'UCL', 'CL', 'LCL'],
    typeDirective: { name: 'Type', values: ['I-MR', 'X-bar-R', 'X-bar-S', 'P', 'NP', 'C', 'U'], meaning: 'spcChartType' },
    renderEngine: 'echarts',
    inferenceKey: 'control',
    migrated: true,
  },

  description: '统计过程控制标准工具。遵循 Nelson 判异规则。',

  soul: {
    title: 'SPC 统计过程控制',
    summary: '用控制限区分过程的偶然波动与异常波动；按数据类型选图种，按判异规则报警。',
    blocks: [
      { kind: 'h', level: 3, text: 'SPC 统计过程控制原理' },
      {
        kind: 'p',
        text: '控制图（Control Chart）是用于区分过程中的**偶然波动**与**异常波动**的重要工具。计算遵循 ISO 7870 与 GB/T 4091 标准。',
      },
      { kind: 'h', level: 4, text: '控制图选型指南' },
      {
        kind: 'ul',
        items: [
          '**计量型（子组 n=1）**：I-MR（单值—移动极差）',
          '**计量型（2 ≤ n ≤ 10）**：X-bar-R（均值—极差）',
          '**计量型（n > 10）**：X-bar-S（均值—标准差）',
          '**计件型（不合格品数 / 率）**：NP / P',
          '**计点型（缺陷数 / 单位缺陷数）**：C / U',
        ],
      },
      { kind: 'h', level: 4, text: '判异规则 (Rules)' },
      {
        kind: 'p',
        text: '支持 `Basic`（3σ 越界）、`Western-Electric`、`Nelson` 三套规则，可**逗号并列多套**。常见异常：',
      },
      {
        kind: 'ul',
        items: [
          '1 个点落在 3σ 控制限外。',
          '连续 9 点落在中心线同一侧。',
          '连续 6 点持续上升或下降。',
        ],
      },
      {
        kind: 'callout',
        type: 'TIP',
        text: '控制图必须先有**足够的数据量**（一般 ≥ 20–25 个子组）再解读控制限；数据太少时控制限本身不可靠。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '图表主标题', argShape: '<文本>',
      example: 'Title: 关键尺寸控制图', required: true, status: 'supported',
    },
    {
      name: 'Type', meaning: '控制图类型（SPC 图种）',
      values: ['I-MR', 'X-bar-R', 'X-bar-S', 'P', 'NP', 'C', 'U'],
      example: 'Type: X-bar-R', required: true, status: 'supported',
      notes: '取值**区分大小写**，须与上表完全一致（如 `X-bar-R` 不能写 `XbarR`）。',
    },
    {
      name: 'Size', meaning: '子组样本容量 n（计量型专用）', argShape: '<整数>',
      example: 'Size: 5', status: 'supported',
      notes: '必须与实际每行数据个数一致，否则均值与极差计算错位。',
    },
    {
      name: 'Rules', meaning: '判异规则；可**逗号并列多套**',
      values: ['Basic', 'Western-Electric', 'Nelson'],
      example: 'Rules: Nelson', status: 'supported',
      notes: '多套并列写法：`Rules: Western-Electric,Nelson`。',
    },
    {
      name: 'Decimals', meaning: '数值显示精度', argShape: '<整数>',
      example: 'Decimals: 3', status: 'supported',
    },
    {
      name: 'Color', slot: ['Line', 'Point', 'UCL', 'CL', 'LCL'],
      meaning: '#HEX 颜色：折线 / 数据点 / 上控制限 / 中心线 / 下控制限',
      example: 'Color[UCL]: #E74C3C', status: 'supported',
    },
    {
      name: '[series]', meaning: '数据块**开始**（本 kind 唯一的数据录入方式）；`[series]: <标题>` 可带块标题',
      argShape: '[series]: <可选标题>',
      example: '[series]: 孔径测量值 (mm)', required: true, status: 'supported',
      notes: '必须与 `[/series]` 成对出现。',
    },
    {
      name: '[/series]', meaning: '数据块**结束**', argShape: '[/series]',
      example: '[/series]', required: true, status: 'supported',
    },
    {
      name: '数据行', meaning: '块内每行一组观测值，**半角逗号**分隔；计量型每行个数应等于 `Size`',
      argShape: '<数值>, <数值>, …',
      example: '12.01, 12.02, 11.99, 12.00, 12.01', required: true, status: 'supported',
    },
  ],

  example: {
    title: '缸盖螺栓孔径 X-bar-R 控制图',
    dsl: EXAMPLE_DSL,
    notes: '5 个子组 × 每组 5 个观测值（`Size: 5`）；控制限由引擎按 GB/T 4091 计算。',
    expect: {
      noErrors: true,
      series: 1,
      note: 'parser 返回 { series, styles }，series 为数据块个数',
    },
  },

  counterexamples: [
    {
      bad: '12.01, 12.02, 11.99\n12.03, 11.98, 12.01',
      good: '[series]: 孔径测量值\n12.01, 12.02, 11.99\n[/series]',
      reason: '数据必须包在 `[series]` … `[/series]` 块内；裸数据行不会被采集。',
    },
    {
      bad: 'Type: X-bar-R\nSize: 3\n12.01, 12.02, 11.99, 12.00, 12.01',
      good: 'Type: X-bar-R\nSize: 5\n12.01, 12.02, 11.99, 12.00, 12.01',
      reason: '`Size` 必须等于每行观测值个数，否则子组均值/极差错位。',
    },
    {
      bad: 'Type: XbarR',
      good: 'Type: X-bar-R',
      reason: '图种取值区分大小写且含连字符，须与值域完全一致。',
    },
    {
      bad: 'Type: X-bar-R   （用于计件数据「不合格品率」）',
      good: 'Type: P',
      reason: '计量型与计件/计点型不可混用；不合格品率应选 `P`。',
    },
  ],

  outputControls: [
    '数据必须包在 `[series]:` … `[/series]` 块内；每行一组，**半角逗号**分隔。',
    '`Type`（图种）与 `Size`（子组容量）必须与数据的实际结构一致。',
  ],

  promptNotes: [
    '先判数据类型：连续测量值 → 计量型（n=1 用 I-MR；2≤n≤10 用 X-bar-R；n>10 用 X-bar-S）；计数不合格品 → P/NP；计数缺陷 → C/U。',
    '按 `Size` 把原始观测值**分组**：每行恰好 n 个值，子组数建议 ≥ 20。',
    '判异规则缺省 `Basic`；需要更敏感时并列 `Western-Electric,Nelson`。',
    '不要自行计算控制限 —— 引擎按标准公式求解；用户给了 USL/LSL 时也不要写进本 kind（那是直方图的规格限）。',
  ],
};

export default control;
