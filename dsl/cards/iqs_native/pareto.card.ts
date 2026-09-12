/**
 * pareto · 排列图（帕累托图）— 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_pareto 条目 + `protocol/segments/pareto.md`
 * 精修项：
 *   · 修 `Color[...]` / `Font[...]` 的示例重复（骨架曾生成 `Color[Bar][Bar]: #0D5E42`、
 *     `Font[Title/Base/Bar][Title|Base|Bar]: <值>`）
 *   · 补 `Font[Line]`、`Color[Title]`
 *   · 把"数据录入语法 `- <项目>: <频数>`"从散落说明提升为正式条目
 *   · 补 `expect` 与 3 条 `counterexamples`；`promptNotes` 改为数据整理与解读要点
 *   · 移除 `starter`（统一为 example，AUD-124）
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 售后质量问题分布分析
Color[Title]: #1A2428
Color[Bar]: #0D5E42
Color[Line]: #F1C40F
Color[MarkLine]: #E74C3C
Decimals: 1
ShowValues: true
Font[Title]: 20
Font[Base]: 12
Font[Bar]: 12
Font[Line]: 12

// 数据项：<项目名称>: <频数或成本>
- 物流破损: 420
- 零件缺失: 215
- 包装老化: 89
- 标签错误: 56
- 其他细项: 23
`;

const pareto: CardSpec = {
  meta: {
    id: 'pareto',
    tier: 'core',
    family: 'iqs_native',
    body: 'Pairs',
    mcpName: 'render_pareto',
    qcTool: 'PARETO',
    version: '1.1',
    parentType: 'iqs_native',
    subType: 'pareto',
    displayName: 'IQS 关键性分析/排列图',
    intents: ['排列图', '帕累托图', 'pareto chart', '二八定律', '80/20', 'ABC分析', '关键少数'],
    expertise: ['二八定律 (Pareto)', '关键因素识别', 'ABC 分类法'],
    colorSlots: ['Title', 'Bar', 'Line', 'MarkLine'],
    renderEngine: 'echarts',
    inferenceKey: 'pareto',
    migrated: true,
  },

  description: '基于二八定律的质量改进工具。自动识别 A 类关键少数因素，辅助决策优先级。',

  soul: {
    title: 'ABC 分类法 (Pareto Principle)',
    summary: '把质量问题的频数降序排列并叠加累计百分比，用 80% 线切出「关键少数」。',
    blocks: [
      { kind: 'h', level: 3, text: 'ABC 分类法 (Pareto Principle)' },
      {
        kind: 'p',
        text: '排列图基于「二八定律」，用于从众多质量问题中找出影响质量的「关键少数」。柱为各因素频数（降序），线为累计百分比。',
      },
      {
        kind: 'ul',
        items: [
          '**A 类因素 (0–80%)**：主要影响因素，必须重点解决。',
          '**B 类因素 (80–90%)**：次要影响因素。',
          '**C 类因素 (90–100%)**：一般影响因素。',
        ],
      },
      { kind: 'h', level: 4, text: '引擎内置算法' },
      {
        kind: 'ul',
        items: [
          '**自动降序**：Value[i] ≥ Value[i+1] —— 无需用户自行排序。',
          '**累计百分比**：P[i] = (Σ V[0…i]) / Σ V[all]。',
          '**80% 标识线**：自动定位 P[i] ≈ 80% 的临界坐标并绘制标线。',
        ],
      },
      {
        kind: 'callout',
        type: 'TIP',
        text: '解决排列图中最左侧的两三个因素，通常就能消除 80% 的质量成本 —— 这正是排列图的决策价值。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '图表主标题', argShape: '<文本>',
      example: 'Title: 售后数据分析', required: true, status: 'supported',
    },
    {
      name: 'Decimals', meaning: '数值 / 百分比显示精度（小数位）', argShape: '<整数>',
      example: 'Decimals: 2', status: 'supported',
    },
    {
      name: 'ShowValues', meaning: '是否显示柱顶数据标记', values: ['true', 'false'],
      example: 'ShowValues: true', status: 'supported',
    },
    {
      name: 'Color', slot: ['Title', 'Bar', 'Line', 'MarkLine'],
      meaning: '#HEX 颜色：标题 / 柱形（默认 #0D5E42）/ 累计折线（默认 #F1C40F）/ 80% 标线（默认 #E74C3C）',
      example: 'Color[Bar]: #0D5E42', status: 'supported',
    },
    {
      name: 'Font', slot: ['Title', 'Base', 'Bar', 'Line'],
      meaning: 'px 字号：标题 / 正文 / 柱标签 / 折线标签',
      example: 'Font[Bar]: 12', status: 'supported',
    },
    {
      name: '数据行', meaning: '一个质量因素及其频数（或成本）——本 kind 唯一的数据录入方式',
      argShape: '- <项目名称>: <频数>',
      example: '- 物流破损: 420', required: true, status: 'supported',
      notes:
        '① 频数须为正数（计数或金额均可，但**同一张图内单位必须统一**）；' +
        '② **不需要用户自行降序** —— 引擎自动降序；' +
        '③ 项目名称内如需冒号请用全角「：」。',
    },
  ],

  example: {
    title: '售后质量问题分布分析',
    dsl: EXAMPLE_DSL,
    notes: '5 个项目，频数已按降序书写（引擎仍会自动校验排序）；MarkLine 为 80% 累计标线。',
    expect: {
      noErrors: true,
      items: 5,
      note: 'parser 返回 { items, styles }，items 取 items.length',
    },
  },

  counterexamples: [
    {
      bad: '- 物流破损: 420 元\n- 零件缺失: 215 次',
      good: '- 物流破损: 420\n- 零件缺失: 215',
      reason: '频数须为纯数值；同一张图的单位必须统一（都是次数或都是金额），单位写进 `Title:`。',
    },
    {
      bad: '- 物流破损: 0\n- 零件缺失: 215',
      good: '（删除该零频项）',
      reason: '零或负频数会破坏累计百分比的分母意义。',
    },
    {
      bad: '- 物流破损: 420\n- 其他: 383   （用「其他」混入大量分散小项）',
      good: '把「其他」拆到确实次要的粒度，或如实保留但不过度解读其排序',
      reason: '「其他」项会因归类方式而人为抬高排序，解读 A 类时应予以说明。',
    },
  ],

  outputControls: [
    '数据用 `- <项目名称>: <频数>` 逐行录入，频数为纯正数且**单位统一**。',
    '不要自行排序 —— 引擎自动降序；不要手工计算累计百分比。',
  ],

  promptNotes: [
    '把用户给的问题清单整理成「项目 + 频数」的成对数据；频数为空的项直接省略。',
    '单位必须在整张图内统一（次数 / 金额 / 工时选其一），并在 `Title:` 里点明。',
    '项目数建议 5–10 个；过少（<4）体现不出 80/20，过多（>15）时先归并长尾。',
    '不要臆造频数 —— 用户只给排序时，如实说明无法生成排列图并请其补充数值。',
  ],
};

export default pareto;
