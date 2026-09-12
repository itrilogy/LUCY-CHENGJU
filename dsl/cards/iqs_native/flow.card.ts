/**
 * flow · 企业流程图（泳道 / BPMN 子集）— 卡片真源（试点）
 *
 * 汇总来源：
 *   A `mcp-server/mcp_tools.json` 的 flow 条目（**注**：该条目被 index.js 特判绕过，属死数据）
 *   B `protocol/segments/flow.md` + `flow.agent.md`
 *   C `docs/flow/spec/IQS_FLOW_DSL_SPEC.md`（§3–§7）
 *   D `constants.tsx` 的 INITIAL_FLOW_DSL
 *
 * 修正的 R20 条目：
 *   AUD-117 显式边标签 —— 实测**不支持**，在 syntax 中标注 status='unsupported' 并给出替代写法
 *   AUD-118 分支目标省略 —— 实测**静默丢弃**，标注 status='unsupported'
 *   AUD-119 N/DATA 被默认序流串入主流 —— 在 notes 中给出**可规避的写法约束**
 *   AUD-120 默认流分支扇出误连 —— 以 knownDefects 固化进 CI（引擎缺陷，非卡错）
 *   AUD-122 正例 B 孤立节点 —— **已在此处修正**（补 `q2 → #w3`）
 *   AUD-123/AUD-002 正例 A 断链 —— **已在此处修正**（补 `w4 → #w6`）
 *   AUD-125 示例 `#` 注释 —— 统一为 `//`
 *   AUD-127 Location 维度语义 —— 显式声明「按字典名索引，与 Layout H/V 无关」
 *   AUD-128 六属性值域 / Attr active —— 补全
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 卷烟生产批次质量追溯与放行流程
Layout: H
Grid: dashed
Dict: D[制丝车间,卷包车间,质检中心,技术中心,档案室]
Dict: P[批次创建,参数采集,并行检测,异常处置,放行归档]
Dict: R[操作员,质检员,技术员,档案员]
Dict: worker[创建生产批次,录入工艺参数,质量指标是否合规?,物理指标检测,化学指标检测,偏差分析与处置,技术中心复核,编制批次报告,质量放行,资料归档,复核评审记录,检测数据集]
Lane from D[0,1,2,3,4] Layout H
Lane from P[0,1,2,3,4] Layout V
AxisX: 责任部门 Align C
AxisY: 流程阶段 Align C
Axis: 卷烟批次质量追溯 AxisY
Attr active [Role,SOP,Lv,Time,KPI,M]
W: w1: worker[0] Type[S] Location(D[0],P[0]) Role(R[0]) SOP(ZZ-PC-01) Lv(一般) Time(0.5h)
W: w2: worker[1] Location(D[0],P[1]) Role(R[0]) SOP(ZZ-PC-02) Time(1h)
W: g1: worker[2] Type[?] Location(D[2],P[1]) Role(R[1]) KPI(一次合格率)
   合规 → #p1
   不合规 → #w5
   End
W: p1: worker[3] Type[+] Location(D[1],P[1]) Role(R[1]) SOP(ZD-JC-05)
   物理检测 → #w3
   化学检测 → #w4
   End
W: w3: worker[3] Location(D[1],P[2]) Role(R[1]) Time(2h) Lv(重要)
W: w4: worker[4] Location(D[2],P[2]) Role(R[1]) Time(3h) Lv(重要)
W: sub1: worker[6] Type[SUB] Location(D[3],P[2]) Role(R[2]) Time(4h)
   W: s1: 受理复核 Type[S] Role(R[2]) SOP(JS-FH-01)
   W: s2: 出具意见 Type[E] Role(R[2]) SOP(JS-FH-02)
   End
W: w5: worker[5] Location(D[3],P[2]) Role(R[2]) SOP(JS-YC-11) Lv(关键) M(强制项)
W: w8: worker[7] Location(D[2],P[3]) Role(R[1]) SOP(ZD-BG-08) Time(1h)
W: w9: worker[8] Location(D[1],P[4]) Role(R[1]) Lv(关键) KPI(放行及时率)
W: w10: worker[9] Type[E] Location(D[4],P[4]) Role(R[3]) Time(0.5h)
W: n1: worker[10] Type[N] Attach(#w8)
W: d1: worker[11] Type[DATA] Attach(#p1)
w2 → #g1
w3 → #w8
w4 → #w8
w5 → #sub1
sub1 → #w8
w8 → #w9
w9 → #w10
`;


const flow: CardSpec = {
  meta: {
    id: 'flow',
    tier: 'core',
    family: 'iqs_native',
    body: 'FlowGraph',
    mcpName: 'render_flow',
    qcTool: 'FLOW',
    version: '0.8',
    parentType: 'iqs_native',
    subType: 'flow',
    displayName: 'IQS 企业流程图/泳道图',
    intents: ['流程图', '泳道图', '流程', '程序文件', '跨部门流程', 'BPMN', 'flow', 'swimlane', '审批流程'],
    expertise: ['泳道流程图 (Swimlane)', 'BPMN 子集', '程序文件', '字典-索引', '岗位图例', '流程建模'],
    colorSlots: [
      'Start', 'StartText', 'End', 'EndText', 'Task', 'TaskText',
      'Gateway', 'Parallel', 'Subprocess', 'Annotation', 'Data',
      'Lane', 'Axis', 'Line', 'Text', 'Panel',
    ],
    renderType: 'flow',
    inferenceKey: 'flow',
    renderEngine: 'svg',
    migrated: true,
  },

  description:
    '面向企业体系文件（CX 程序文件）的泳道流程图。基于字典-索引范式：Dict 定义部门/阶段/岗位/动作数组，Lane from 批量画泳道，W 节点引用字典并落格，分支/子流程 End 闭合，六属性边栏提取。',

  soul: {
    title: '企业流程图（Flow / BPMN 子集）',
    summary: '定义「谁（泳道）× 做什么（活动）× 什么条件下走哪条路（网关）」，用于程序文件（CX）建模。',
    blocks: [
      { kind: 'h', level: 3, text: '企业流程图（Flow / BPMN 子集）' },
      {
        kind: 'p',
        text: '流程图定义「**谁（泳道）× 做什么（活动）× 什么条件下走哪条路（网关）**」，面向企业体系文件中的程序文件（CX）建模。语义定界为 **BPMN 2.0 子集**：保留开始/结束/任务/子流程/排他与并行网关/标注/数据对象，裁掉边界事件、补偿、多实例等体系文件中不用的元素。',
      },
      { kind: 'h', level: 4, text: '字典-索引范式（核心）' },
      {
        kind: 'ul',
        items: [
          '**数据层（Dict）**：所有可变内容（部门/阶段/岗位/动作/属性值）集中成数组；`D`（部门）`P`（阶段）`R`（岗位）为**保留字**，其余自定义。',
          '**结构层**：只写**索引引用**（`D[0]`、`worker[2]`），渲染时展开为字典值（图上显示「信息中心」而非 `D[0]`）。一处定义、多处引用、修改全局生效。',
        ],
      },
      { kind: 'h', level: 4, text: '专家建议' },
      {
        kind: 'ul',
        items: [
          '**默认顺序流**：可流转节点（S/T/SUB）按声明顺序自动连；判断/并行节点不出自动序，其出口必须显式分支行声明并以 `End` 闭合。结束节点与 N/DATA 不作默认流出源。',
          '**禁止 Mermaid 冒充**：体系文件/部门泳道/BPMN 子集终稿必须用本 kind（MCP `render_flow`），禁止 `flowchart TD` / `graph LR`。',
          '**岗位图例**：从节点实际 `Role` 属性值去重提取，按出现次数定字体粗细（非渲染 `R` 数组本身）。',
          '**属性边栏**：`Attr active` 激活后从全部节点提取聚合视图（Role/SOP 计数、Lv 区间评分、Time 最小时长、KPI 清单、M 色卡）。',
        ],
      },
      {
        kind: 'callout',
        type: 'IMPORTANT',
        text: '网格**只按 `Lane from` 的定义产生**；节点坐标的多余维度**自动清洗**；图上必须显示字典展开值。',
      },
    ],
  },

  syntax: [
    // ── 文档骨架 ──────────────────────────────────────────────────
    {
      name: 'Title', meaning: '图表标题', argShape: '<文本>',
      example: 'Title: 采购审批流程', required: true, status: 'supported',
    },
    {
      name: 'Layout', meaning: '整体方向', values: ['H', 'V'],
      example: 'Layout: H', status: 'supported',
      notes: '注意与 affinity/pdpc/relation 的 `Layout: Horizontal` 全称写法不同。',
    },
    {
      name: 'Color', slot: ['Slot'],
      meaning: '#HEX 颜色；Slot 取 meta.colorSlots 中的键（Start/End/Task/Gateway/Parallel/Subprocess/Annotation/Data/Lane/Axis/Line/Text/Panel）',
      example: 'Color[Start]: #0D5E42', status: 'supported',
    },
    {
      name: 'Grid', meaning: '泳道网格线型（**线型**，非开关）', values: ['dashed', 'solid'],
      example: 'Grid: dashed', status: 'supported',
      notes: '缺省 `dashed`。⚠️ 与 basic 的 `Grid: true`（开关）语义不同。',
    },
    // ── 数据层 ────────────────────────────────────────────────────
    {
      name: 'Dict', meaning: '字典定义（数据层，必须**先于**一切引用出现）',
      argShape: '<名>[<值>,<值>,…]',
      example: 'Dict: D[信息中心,综合计划科,办公室]', required: true, status: 'supported',
      notes:
        '`D` / `P` / `R` 为保留字（部门/阶段/岗位）；其余自定义（如 `worker`）。' +
        '值之间用**半角逗号**；值内部若需逗号请用全角「，」。同名 `Dict` 重复定义会报错。',
    },
    {
      name: 'Lane', meaning: '批量画泳道（结构层，网格只由此产生）',
      argShape: 'Lane from <字典>[<索引>,…] Layout H|V',
      example: 'Lane from D[0,1,2] Layout H', required: true, status: 'supported',
      notes:
        '`H` = 行（横向泳道），`V` = 列（纵向泳道）。索引支持 `D[0]` / `D[0,1,3]` / `D[*]`（全部）。' +
        '**行/列顺序 = 索引列表顺序，与字典声明顺序无关**。无 `Lane from` 则无网格（`Location` 会失效）。',
    },
    {
      name: 'AxisX', meaning: '横轴标题', argShape: '<标题> Align L|R|C',
      example: 'AxisX: 职能部门 Align C', status: 'supported',
    },
    {
      name: 'AxisY', meaning: '纵轴坐标标题（文字保持水平；真正旋转 -90° 的是各 Y 泳道标题）',
      argShape: '<标题> Align L|R|C', example: 'AxisY: 推进阶段 Align C', status: 'supported',
    },
    {
      name: 'Axis', meaning: '整图标题（挂在所选轴的最外围）', argShape: '<整图标题> AxisX|AxisY [Align L|R|C]',
      example: 'Axis: 采购审批 AxisX', status: 'supported',
    },
    {
      name: 'Attr', meaning: '属性边栏提取开关', argShape: 'Attr active [<键>,…]',
      example: 'Attr active [Role,SOP,Lv,Time]', status: 'supported',
      notes:
        '缺省（不写）= 只标 Role。写入后，节点**右下角**按此顺序渲染该节点**有值**的项，多行右对齐，**至多 4 行**；空键不占行。' +
        '可提取的键即六属性：`Role` `SOP` `Lv` `Time` `KPI` `M`。',
    },
    // ── 节点 ─────────────────────────────────────────────────────
    {
      name: 'W', meaning: '节点定义',
      argShape: '[<id>:] <标签> [Type[…]] [Location(…)] [属性(…)]* [Attach(#id)] [V|H|D]',
      example: 'W: w1: worker[0] Type[S] Location(D[0],P[0])',
      required: true, status: 'supported',
      notes:
        '① `id` 可省略（自动 `w1,w2,…`），用于 `#引用`；' +
        '② `标签` 为字典引用（`worker[0]`）或字面量（`提交申请`），二选一；' +
        '③ 行尾 `V`/`H`/`D` 指定**格内相对上一节点**的方位：下 / 右 / 对角右下。',
    },
    {
      name: 'Type', meaning: '节点类型',
      values: ['S', 'E', 'T', '?', '+', 'SUB', 'N', 'DATA'],
      example: 'W: q1: worker[2] Type[?] Location(D[0],P[1])', status: 'supported',
      notes:
        '`S`开始 `E`结束 `T`任务（缺省）`?`排他网关 `+`并行网关 `SUB`子流程 `N`标注 `DATA`数据对象。' +
        '⚠️ 实测未声明的 `Type[XX]` 会**静默降级为 T**，不报错——请只用上表取值（AUD-005/C7）。',
    },
    {
      name: 'Location', meaning: '节点落格坐标',
      argShape: 'Location(<字典名>[索引], …)',
      example: 'Location(D[0],P[1])', status: 'supported',
      notes:
        '**参数按字典名索引，与 `Layout H/V` 无关**：`Location(D[0],P[1])` 恒表示「D 字典第 0 项」×「P 字典第 1 项」；' +
        '哪个是行、哪个是列由对应的 `Lane from … Layout` 决定。实测 canonical 输出为 `cell:{D:0,P:1}`。' +
        '坐标维度必须已由某条 `Lane from` 定义；**多余维度自动清洗**（不报错）；缺省 `Location` = 按声明顺序自动落格。',
    },
    // ── 连线与分支 ────────────────────────────────────────────────
    {
      name: '→', meaning: '显式边（源在左、目标在右，目标必须已定义）',
      argShape: '<源id> → #<目标id>',
      example: 'w5 → #w6', status: 'partial',
      notes:
        '✅ 无标签形式可用。' +
        '❌ **标签形式不可用**：spec §7.2 曾文档化 `w1 → #w5 [超时]`，实测报错「显式边目标 w5 [超时] 未定义」（AUD-117）——' +
        '**不要在显式边上写标签**；需要连线文字时改用分支行（分支行的标签是支持的）。' +
        '⚠️ 箭头为**全角 `→`**；目标必须带 `#`；目标需先于该行定义。',
    },
    {
      name: '分支行', meaning: '网关出口声明（Type[?]/Type[+] 必须写）',
      argShape: '<标签> [(<出口名>)] [<条件>] → #<目标>[, #<目标>]*',
      example: '   合格 (pass) → #w2',
      required: true, status: 'partial',
      notes:
        '✅ `标签`（连线文字）、`(出口名)`（稳定 id，缺省自动 `{节点id}-Y`/`-N`）、`[条件]`（BPMN conditionExpression）、' +
        '多目标 `→ #a, #b`（自动拆并行边）、`否则 → #w5`（默认出口，渲染为带斜杠实线）。' +
        '⚠️ 多目标拆分时会因标签重名产生 warning「分支出口标签「是」重复（应唯一）」——多目标时请给**不同标签**或省略标签（AUD-121）。' +
        '❌ **目标不可省略**：spec §7.3 曾写「可省略 = 接声明顺序下一节点」，实测 `是 →` 被**静默丢弃**、不产生任何边（AUD-118）——必须写 `#目标`。',
    },
    {
      name: 'End', meaning: '显式闭合分支块 / 子流程块', argShape: 'End',
      example: '   End', required: true, status: 'supported',
      notes: '缩进仅为视觉辅助，不参与解析；但**每个分支块与子流程块都必须以 `End` 闭合**。',
    },
    {
      name: 'SUB', meaning: '子流程块（内嵌子图）',
      argShape: 'W: <id>: <标签> Type[SUB] …\\n   W: <内嵌节点>…\\n   End',
      example: 'W: q2: worker[4] Type[SUB] Location(D[0])\\n   W: s1: worker[5] Type[S]\\n   W: s2: worker[6] Type[E]\\n   End',
      status: 'partial',
      notes:
        '⚠️ **子流程内嵌的 `W` 行会打断默认顺序流**：实测 SUB 节点**不会**自动连到其后的节点（AUD-119 同源机制）——' +
        '**必须显式写 `SUBid → #下一节点`**，否则后续节点会报「孤立」。（这正是旧版正例 B 的失败原因，AUD-122，已修正。）',
    },
    {
      name: 'Attach', meaning: 'N/DATA 依附目标节点（仅修饰类可用）',
      argShape: 'Attach(#id) | Attach(id)',
      example: 'W: n1: 评审记录 Type[N] Attach(#w10)', status: 'partial',
      notes:
        '① N/DATA **不占交叉格**，渲染在网格最右侧的 `DOC` 虚拟列，与 `Attach` 目标同行；' +
        '② 连线用虚线（`condition=__doc__`）；' +
        '③ 目标必须存在且非 N/DATA；' +
        '④ ❌ **已知缺陷（AUD-119）**：若把 N/DATA 直接排在主流节点的**相邻声明位置**，默认顺序流会产出 `w1 → n1` 这样的违规边，' +
        '进而报错「连线目标 n1 为修饰类节点」。**规避写法：把 `Type[N]`/`Type[DATA]` 的 `W` 行写在所有主流节点之后**，不要插入主流声明序列中间。',
    },
    // ── 属性 ─────────────────────────────────────────────────────
    {
      name: 'SOP', meaning: '标准编号（如体系文件号）', argShape: 'SOP(<值>)',
      example: 'SOP(XX-CX-04)', status: 'supported', notes: '值可为字面量或字典引用。',
    },
    {
      name: 'Role', meaning: '岗位（**不占格**，用于节点右下角标注与岗位图例）',
      argShape: 'Role(<R[i]> | <字典引用> | <字面量>)',
      example: 'Role(R[0])', status: 'supported',
      notes: '三种写法等价：`Role(R[1])` / `Role(岗位[2])` / `Role(部门经理)`。**不强制绑定 `R` 数组**。',
    },
    {
      name: 'Lv', meaning: '重要度', values: ['重大', '重要', '一般', '1', '2', '3'],
      example: 'Lv(重要)', status: 'supported', notes: '文字与数字两种写法均可（1=重大 3=一般）。',
    },
    {
      name: 'Time', meaning: '时限', argShape: 'Time(24h)',
      example: 'Time(24h)', status: 'supported', notes: '体系文件常用时长写法，如 `24h` / `3d`。',
    },
    {
      name: 'KPI', meaning: '考核指标', argShape: 'KPI(<文本>)',
      example: 'KPI(及时率≥98%)', status: 'supported',
    },
    {
      name: 'M', meaning: '成熟度/等级', values: ['BPM', '1', '2', '3', '4'],
      example: 'M(BPM)', status: 'supported', notes: '`BPM` 表示已纳入流程管理，数字表示等级。',
    },
  ],

  example: {
    title: '采购申请审批（二维矩阵泳道）',
    dsl: EXAMPLE_DSL,
    notes:
      '2 条 `Lane from` 构成行×列网格；`q1` 为排他网关，两个出口显式声明；' +
      '`w4` 与 `w5` 为并列分支目标，各自显式连到 `w6`（**已修正旧版 w4 断链**）。',
    expect: {
      noErrors: true,
      nodes: 15,
      edges: 13,
      requiredEdges: [
        ['w1', 'w2'], ['w2', 'g1'], ['g1', 'p1'], ['g1', 'w5'],
        ['p1', 'w3'], ['p1', 'w4'], ['w3', 'w8'], ['w4', 'w8'],
        ['w5', 'sub1'], ['sub1', 'w8'], ['w8', 'w9'], ['w9', 'w10'],
      ],
      /**
       * AUD-120 回归防线：并列分支目标之间不得出现串行边。
       * 本例中 w3/w4 是 p1 的并列分支目标，二者不得相连；
       * w5 与 sub1 同为异常支路，亦不得互连。
       */
      forbiddenEdges: [['w3', 'w4'], ['w4', 'w3']],
      note: '15 节点 / 13 条边；覆盖全部 8 种 Type（S/E/T/?/+/SUB/N/DATA）、子流程块与数据对象。',
    },
  },


  counterexamples: [
    {
      bad: 'flowchart TD\n  A[提交申请] --> B{经理审批}',
      good: 'Title: 采购申请审批流程\nLayout: H\nDict: D[…]…\nLane from D[0,1] Layout H\nW: w1: 提交申请 Type[S] Location(D[0])',
      reason: '体系文件/部门泳道/BPMN 子集终稿必须用 IQS-Flow DSL（`render_flow`），禁止 Mermaid `flowchart`/`graph` 冒充。',
    },
    {
      bad: 'Lane from D[0,1] Layout H\nDict: D[部门A,部门B]',
      good: 'Dict: D[部门A,部门B]\nLane from D[0,1] Layout H',
      reason: '`Dict` 必须先于一切引用（Lane / W / Location / Role）出现。',
    },
    {
      bad: 'W: q1: 超限? Type[?] Location(D[0],P[0])\nW: w2: 处理',
      good: 'W: q1: 超限? Type[?] Location(D[0],P[0])\n   是 → #w2\n   否则 → #w3\n   End',
      reason: '排他/并行网关**禁止依赖自动出边**，必须写分支行并以 `End` 闭合。',
    },
    {
      bad: 'W: w1: 开始 Type[S] Location(D[0],P[0])\nW: n1: 备注 Type[N] Attach(#w1)\nW: w2: 处理 Location(D[1],P[1])',
      good: 'W: w1: 开始 Type[S] Location(D[0],P[0])\nW: w2: 处理 Location(D[1],P[1])\nW: n1: 备注 Type[N] Attach(#w1)',
      reason: 'N/DATA 插在主流声明序列中间会被默认顺序流串入主流并报错（AUD-119）；应把所有修饰类节点写在主流之后。',
    },
    {
      bad: 'w1 → #w5 [超时]',
      good: '（显式边写标签不被支持）改用分支行：`超时 → #w5`',
      reason: 'spec §7.2 曾承诺显式边标签，实测报错「显式边目标 w5 [超时] 未定义」（AUD-117）。连线文字请走分支行。',
    },
    {
      bad: '  是 →\n  否 → #w3',
      good: '  是 → #w2\n  否 → #w3',
      reason: '分支目标不可省略——省略会被静默丢弃、不产生任何边（AUD-118）。',
    },
  ],

  outputControls: [
    '纯文本 DSL；**禁止** Markdown 代码围栏、禁止 JSON、禁止 `flowchart TD` / `graph LR`。',
    '行注释用 `//`；`#` **只用于节点引用**（`#w1`），不作注释、不作标题层级。',
    '结构分隔用**半角逗号**；标签内部若需标点请用**中文全角**（，、；：）。',
    '`Dict` 必须先定义再被引用；分支块与子流程块必须 `End` 闭合。',
    '开始与结束节点至少各 1 个（子流程内部的 start/end 不计入顶层）。',
  ],

  promptNotes: [
    '先抽取参与方（部门）→ 阶段 → 动作，分别填进 `Dict: D/P/worker`；再决定 `Lane from` 的行列与顺序；最后按声明顺序排 `W` 节点。',
    '判断节点（`Type[?]`）必须是**真的分叉**（至少两条出口）；没有分叉就用普通任务节点。',
    '一条流程的动作节点控制在 6–20 个；超过 20 个时考虑拆成主流程 + 子流程（`Type[SUB]`）。',
    '二维矩阵建议 `height` 900–1200；单维泳道用 600–800。',
    '若返回 `parser_errors`，按提示改，最多两轮。',
  ],
};

export default flow;
