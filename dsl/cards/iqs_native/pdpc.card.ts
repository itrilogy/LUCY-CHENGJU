/**
 * pdpc · 过程决策程序图 — 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_pdpc 条目 + `protocol/segments/pdpc.md`
 * 精修项：
 *   · 条目名纠正 —— 骨架把 `Group` / `Item` 写成"分组" / "数据项"
 *   · 补 `EndGroup`、逻辑链条的**三种形态**（普通 / 带标记 / 链式直写）
 *   · 补 `Color[Start|Step|Countermeasure|End(+Text)]`、`Color[Line]`、`Line[Width]`
 *   · 明确 `Item:` 第三个方括号参数是 **Type**（与亲和图的第三参 parentId 语义不同）
 *   · 补 `expect` 与 3 条 `counterexamples`；`promptNotes` 改为建模要点
 *   · 移除 `starter`（统一为 example，AUD-124）
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 实验室火灾应急 PDPC 演练
Layout: Directional

Color[Start]: #DBEAFE
Color[Step]: #EFF6FF
Color[Countermeasure]: #ECFDF5
Color[End]: #FEF2F2
Color[StartText]: #1E40AF
Color[StepText]: #1D4ED8
Color[CountermeasureText]: #047857
Color[EndText]: #B91C1C
Color[Line]: #64748B
Line[Width]: 2

// 阶段 1：发现
Group: g1, 异常发现
  Item: n1, 烟雾报警器触发, [start]
  Item: n2, 确认火情真实性
EndGroup

// 阶段 2：处置
Group: g2, 应急处置
  Item: n3, 拨打 119 报警
  Item: n4, 启动自动灭火系统
  Item: n5, 灭火系统失效, [countermeasure]
  Item: n6, 使用手持灭火器补救, [countermeasure]
EndGroup

// 阶段 3：疏散
Group: g3, 人员疏散
  Item: n7, 全员依序撤离
  Item: n8, 清点人数, [end]
EndGroup

// 逻辑链条：id1--id2 [OK|NG]
n1--n2
n2--n3 [OK]
n2--n4 [OK]
n4--n7 [OK]
n4--n5 [NG]
n5--n6
n6--n7 [OK]
n7--n8
`;

const pdpc: CardSpec = {
  meta: {
    id: 'pdpc',
    tier: 'core',
    family: 'iqs_native',
    body: 'ProcessGraph',
    mcpName: 'render_pdpc',
    qcTool: 'PDPC',
    version: '1.1',
    parentType: 'iqs_native',
    subType: 'pdpc',
    displayName: 'IQS 风险预研/PDPC图',
    intents: ['PDPC', '过程决策', '风险对策', '应急预案', '风险预演'],
    expertise: ['过程决策程序图 (PDPC)', '风险防范', '应急预案预演'],
    colorSlots: ['Start', 'StartText', 'Step', 'StepText', 'Countermeasure', 'CountermeasureText', 'End', 'EndText', 'Line'],
    renderEngine: 'g6',
    inferenceKey: 'pdpc',
    migrated: true,
  },

  description: '过程决策程序图。对计划实施阶段可能出现的风险进行动态预测。',

  soul: {
    title: '过程决策程序图 (Process Decision Program Chart)',
    summary: '在制定计划阶段就预先设计好各环节的失败对策，把「出事再说」变成「事前演练」。',
    blocks: [
      { kind: 'h', level: 3, text: '过程决策程序图 (Process Decision Program Chart)' },
      {
        kind: 'p',
        text: 'PDPC 法是在制定计划阶段，对预期可能出现的问题预先设计好各种对策的方法。它把每条「正常路径」与「异常路径」都画出来，从而在纸面上完成风险演练。',
      },
      { kind: 'h', level: 4, text: '核心逻辑' },
      {
        kind: 'ul',
        items: [
          '**目标设定**：明确计划的起点与理想终点。',
          '**路径推演**：识别所需的各个步骤 (Step)。',
          '**风险识别**：预测可能导致中断的异常情况，用 `[NG]` 标记。',
          '**对策制定**：针对每个 `NG` 预设补救措施 (Countermeasure)，并连回主线。',
        ],
      },
      {
        kind: 'callout',
        type: 'IMPORTANT',
        text: 'PDPC 的价值在于「思维的深度」而非图的厚度。重点标注那些**可能导致毁灭性失败**的关键环节，并为其配置 `[NG]` 与对策。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '图表标题', argShape: '<文本>',
      example: 'Title: 应急预案', required: true, status: 'supported',
    },
    {
      name: 'Layout', meaning: '布局方向', values: ['Directional', 'Standard'],
      example: 'Layout: Directional', status: 'supported',
      notes: '注意是**全称**（`Directional` / `Standard`），与 flow 的 `H` / `V` 写法不同。',
    },
    {
      name: 'Color', slot: ['Start', 'Step', 'Countermeasure', 'End', 'Line'],
      meaning: '#HEX 颜色：起点 / 步骤 / 对策 / 终点 / 连线',
      example: 'Color[Countermeasure]: #ECFDF5', status: 'supported',
    },
    {
      name: 'Color',
      slot: ['StartText', 'StepText', 'CountermeasureText', 'EndText'],
      meaning: '#HEX 各类型节点的**文字**颜色',
      example: 'Color[StepText]: #1D4ED8', status: 'supported',
    },
    {
      name: 'Line', slot: ['Width'], meaning: '连线像素粗细',
      example: 'Line[Width]: 2', status: 'supported',
    },
    {
      name: 'Group', meaning: '分组（阶段）定义', argShape: '<ID>, <标签>[, <父组ID>]',
      example: 'Group: g1, 异常发现', status: 'supported',
      notes: '与 `EndGroup` 成对；组内 `Item:` 建议缩进两格（仅视觉，不参与解析）。',
    },
    {
      name: 'EndGroup', meaning: '分组结束', argShape: 'EndGroup',
      example: 'EndGroup', status: 'supported',
    },
    {
      name: 'Item', meaning: '数据项（步骤/对策/起终点）',
      argShape: '<ID>, <标签>[, [<类型>]]',
      example: 'Item: n5, 灭火系统失效, [countermeasure]', required: true, status: 'supported',
      notes:
        '① 类型取值 `start` / `step`（缺省）/ `countermeasure` / `end`，写在**方括号**内；' +
        '② ⚠️ 与**亲和图**的 `Item:` 同名异义 —— 亲和图的第三参是 `ParentID`（树父节点），此处是节点类型；' +
        '③ 贴在组外也可以（如全局终点）。',
    },
    {
      name: '逻辑链条', meaning: '用 `--` 连接两个节点 ID',
      argShape: '<id1>--<id2> [OK|NG]',
      example: 'n4--n5 [NG]', required: true, status: 'supported',
      notes:
        '三种形态：① 普通 `a--b`；② 带标记 `a--b [OK]` 或 `a--b [NG]`；' +
        '③ **链式直写** `a--b--c--d [OK]`（一次声明整条链，标记作用于全链）。' +
        '`[NG]` 表示该环节出现异常，应连向对策节点；`[OK]` 表示顺利通过。',
    },
  ],

  example: {
    title: '实验室火灾应急 PDPC 演练',
    dsl: EXAMPLE_DSL,
    notes: '3 个阶段组，8 个节点；`n4--n5 [NG]` 引出「灭火系统失效」对策链后回到主线。',
    expect: {
      noErrors: true,
      items: 8,
      note: 'parser 返回 { data: { nodes, links, groups }, styles }，items 取 nodes.length',
    },
  },

  counterexamples: [
    {
      bad: 'Group: g1, 异常发现\n  Item: n1, 烟雾报警器触发, start',
      good: 'Group: g1, 异常发现\n  Item: n1, 烟雾报警器触发, [start]',
      reason: '节点类型**必须写在方括号内**（`[start]`）；裸写 `start` 会被当作标签的一部分。',
    },
    {
      bad: 'Group: g1, 异常发现\n  Item: n1, 报警\n  （缺 EndGroup）',
      good: 'Group: g1, 异常发现\n  Item: n1, 报警\nEndGroup',
      reason: '每个 `Group:` 都必须由 `EndGroup` 闭合，否则后续 `Item:` 的归属不确定。',
    },
    {
      bad: 'Item: g1, 异常发现, root   （把 Group 写成 Item 并用 parentId 关联）',
      good: 'Group: g1, 异常发现\n  Item: n1, 报警, [start]',
      reason: 'PDPC 用 `Group:` / `EndGroup` 表达阶段；`Item:` 的第三参是**节点类型**（方括号），不是父节点 ID（那是亲和图）。',
    },
    {
      bad: 'a--b [NG]   （但 b 是普通 step，无对策承接）',
      good: 'a--b [NG]\nb--c [OK]      （c 为 countermeasure）',
      reason: '`[NG]` 必须引出对策或明确的异常处置路径，否则只标记了风险而没给答案。',
    },
  ],

  outputControls: [
    '分组用 `Group:` … `EndGroup` 成对；节点用 `Item: <ID>, <标签>[, [<类型>]]`，类型在方括号内。',
    '连线用 `--`：`a--b` / `a--b [OK]` / `a--b [NG]` / 链式 `a--b--c`。',
  ],

  promptNotes: [
    '先画主线（起点 → 各步骤 → 终点），再把每条主线上「可能失败」的环节用 `[NG]` 引出对策支线，最后让对策连回主线。',
    '`[NG]` 只标**真正会中断流程**的风险，不要把每个步骤都标异常（否则失去重点）。',
    '对策节点用 `[countermeasure]` 类型；每个 `[NG]` 至少配 1 个对策。',
    '组（阶段）控制在 2–5 个；每组 2–6 个节点。',
  ],
};

export default pdpc;
