/**
 * matrix · 矩阵图（L / T / Y / X / C 型）— 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_matrix 条目 + `protocol/segments/matrix.md`
 * 精修项：
 *   · skeleton 的 `Title` 条目把"Meta/Export 专用"误当**值域**，已改为说明
 *   · 补 `Axis` / `Matrix` / 轴项行 / 关系行 / `Weight[...]` / `CellSize` / `Font[...]`
 *     （本 kind 的核心语法骨架全部缺失）
 *   · 补 `Color[Title]`（示例用到但骨架未列）
 *   · 补 `expect` 与 3 条 `counterexamples`；`promptNotes` 改为建模与评分要点
 *   · 移除 `starter`（统一为 example，AUD-124）
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 零部件与故障模式关联分析
Type: L
ShowScores: true
CellSize: 40
Weight[Strong]: 9
Weight[Medium]: 3
Weight[Weak]: 1

// A 轴（行）：零部件，第三列为该行权重
Axis: A, 零部件
- a1, 活塞销, 0.8
- a2, 连杆, 0.9
- a3, 轴瓦, 1.0

// B 轴（列）：故障模式
Axis: B, 故障模式
- b1, 磨损
- b2, 裂纹
- b3, 泄漏
- b4, 异响

// 关系定义：<行项ID>: <列项ID>:<符号>
Matrix: A x B
a1: b1:S, b2:M
a2: b2:S, b4:W
a3: b1:M, b3:S, b4:S
`;

const matrix: CardSpec = {
  meta: {
    id: 'matrix',
    tier: 'core',
    family: 'iqs_native',
    body: 'Matrix',
    mcpName: 'render_matrix',
    qcTool: 'MATRIX',
    version: '1.1',
    parentType: 'iqs_native',
    subType: 'matrix',
    displayName: 'IQS 相关性识别/矩阵图',
    intents: ['矩阵图', 'L型矩阵', 'T型矩阵', 'Y型矩阵', 'matrix diagram', '相关矩阵', '决策矩阵'],
    expertise: ['多维度交叉分析', '评分系统', '决策矩阵'],
    colorSlots: ['Title'],
    typeDirective: { name: 'Type', values: ['L', 'T', 'Y', 'X', 'C'], meaning: 'matrixGeometry' },
    renderEngine: 'canvas',
    inferenceKey: 'matrix',
    migrated: true,
  },

  description: '从多维度的交叉点寻找解决问题线索的方法。展现各因素间的相关程度（强、中、弱）。',

  soul: {
    title: '矩阵图分析 (Matrix Diagram)',
    summary: '用行与列的交点表达两组（或多组）因素之间的相关强弱，并通过加权评分定位核心影响因子。',
    blocks: [
      { kind: 'h', level: 3, text: '矩阵图分析 (Matrix Diagram)' },
      {
        kind: 'p',
        text: '矩阵图是从多维度的交叉点寻找解决问题线索的方法。它通过行与列的交点，展现各因素间的相关程度（强 / 中 / 弱）。',
      },
      { kind: 'h', level: 4, text: '常见矩阵选型' },
      {
        kind: 'ul',
        items: [
          '**L 型**：两个维度 (A × B)，最常用。',
          '**T 型**：三个维度 (A × B, A × C)，A 为关联中心。',
          '**Y 型**：三个维度 (A × B, B × C, C × A)，形成闭环关联。',
          '**X 型**：四个维度两两交叉；**C 型**：立方体（三维）。',
        ],
      },
      { kind: 'h', level: 4, text: '符号与评分系统' },
      {
        kind: 'ul',
        items: [
          '**S (Strong)**：强相关，默认权重 **9**。',
          '**M (Medium)**：中等相关，默认权重 **3**。',
          '**W (Weak)**：弱相关，默认权重 **1**。',
          '符号写在关系行里（`a1: b1:S`），权重可用 `Weight[...]` 覆盖。',
        ],
      },
      { kind: 'h', level: 4, text: '两条渲染规则（重要）' },
      {
        kind: 'ul',
        items: [
          '**绘图区净化**：为最大化画布利用率，绘图区内部**不绘制标题**。`Title:` 仅作元数据、导出文件名与导出 PNG/PDF 时的外部标注。',
          '**Y 型视角标准化**：Y 型矩阵固定采用 Top-Down（俯视）透视，不支持旋转 —— 保证指标标签始终正向且向上放射。',
        ],
      },
      {
        kind: 'callout',
        type: 'TIP',
        text: '矩阵图不仅用于展示现状，更在于通过「评分模式」发现薄弱环节。启用 `ShowScores: true` 可识别核心影响因子。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '图表标题（**仅作元数据与导出标注，不在绘图区渲染**）', argShape: '<文本>',
      example: 'Title: 零部件与故障模式矩阵', required: true, status: 'supported',
    },
    {
      name: 'Type', meaning: '矩阵类型（几何形态）', values: ['L', 'T', 'Y', 'X', 'C'],
      example: 'Type: L', required: true, status: 'supported',
      notes: '大写字母；缺省为 `L`。选定后应给出与之匹配的轴数量（L=2 轴，T=3 轴，Y=3 轴闭环）。',
    },
    {
      name: 'ShowScores', meaning: '是否显示加权得分统计', values: ['true', 'false'],
      example: 'ShowScores: true', status: 'supported',
    },
    {
      name: 'CellSize', meaning: '单元格像素边长', argShape: '<整数>',
      example: 'CellSize: 40', status: 'supported', notes: '缺省按画布自适应；格子很多时应显式调小。',
    },
    {
      name: 'Weight', slot: ['Strong', 'Medium', 'Weak'], meaning: '符号权重（默认 9 / 3 / 1）',
      example: 'Weight[Strong]: 9', status: 'supported',
    },
    {
      name: 'Color', slot: ['Title'], meaning: '#HEX 颜色（标题等）',
      example: 'Color[Title]: #1A2428', status: 'supported',
    },
    {
      name: 'Font', slot: ['Title', 'Base'], meaning: 'px 字号（标题 / 正文）',
      example: 'Font[Base]: 10', status: 'supported',
    },
    {
      name: 'Axis', meaning: '定义一条轴（维度）', argShape: '<AxisID>, <轴标题>',
      example: 'Axis: A, 零部件', required: true, status: 'supported',
      notes: 'AxisID 用单字母（A/B/C…），供 `Matrix:` 与关系行引用。',
    },
    {
      name: '轴项行', meaning: '轴下的条目（紧跟所属 `Axis:` 之后）',
      argShape: '- <项ID>, <标签> [, <权重>]',
      example: '- a1, 活塞销, 0.8', required: true, status: 'supported',
      notes: '第三个字段为**可选的项权重**（用于加权得分），不是相关符号。',
    },
    {
      name: 'Matrix', meaning: '声明要渲染哪两条轴的交叉矩阵', argShape: '<RowAxisID> x <ColAxisID>',
      example: 'Matrix: A x B', required: true, status: 'supported',
      notes: '`x` 为半角小写字母 x，两侧留空格。',
    },
    {
      name: '关系行', meaning: '声明某行项与各列项的相关关系',
      argShape: '<行项ID>: <列项ID>:<符号>[, …]',
      example: 'a1: b1:S, b2:M', status: 'supported',
      notes: '符号取 `S` / `M` / `W`（也可写中文 ◎ / ○ / △）；一行可写多组，用**半角逗号**分隔。',
    },
  ],

  example: {
    title: '零部件与故障模式关联分析',
    dsl: EXAMPLE_DSL,
    notes: 'L 型矩阵：A 轴 3 行 × B 轴 4 列，权重用 `Weight[...]` 覆盖默认 9/3/1。',
    expect: {
      noErrors: true,
      items: 2,
      note: 'parser 返回 { data: { title, type, axes, matrices }, styles }，items 取 axes.length',
    },
  },

  counterexamples: [
    {
      bad: 'a1: b1, b2:S',
      good: 'a1: b1:S, b2:S',
      reason: '每个列项都要带符号（`S`/`M`/`W`）；漏写符号的关系不会被渲染。',
    },
    {
      bad: 'Matrix: A x C   （但未定义 Axis: C）',
      good: 'Axis: C, 环境因素\nMatrix: A x C',
      reason: '`Matrix:` 引用的两条轴都必须先由 `Axis:` 定义。',
    },
    {
      bad: 'Type: T   （但只定义了 2 条轴）',
      good: 'Type: L   （两条轴）或补第三条轴',
      reason: '矩阵类型与轴数量必须匹配：L/K = 2 轴，T/Y = 3 轴，X = 4 轴。',
    },
  ],

  outputControls: [
    '先 `Axis:` 定义轴与其条目，再 `Matrix:` 声明交叉，最后写关系行。',
    '关系行格式为 `<行项>: <列项>:<符号>`，多组用**半角逗号**分隔；符号取 `S`/`M`/`W`。',
  ],

  promptNotes: [
    '先判矩阵类型：只有两组因素 → L 型；三组中有一组为共同中心 → T 型；三组两两交叉 → Y 型。',
    '轴项数建议 ≤ 10（行 × 列 ≤ 100 格），过多时先归并次要项。',
    '关系强度符号只在**确有工程依据**时给 `S`；不要为了「好看」全部标 `S`。',
    '若用户提供了权重/评分，用 `- <项ID>, <标签>, <权重>` 与 `Weight[...]` 表达，不要写进 `Title:`。',
  ],
};

export default matrix;
