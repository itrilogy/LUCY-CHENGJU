/**
 * relation · 关联图（交叉因果网络）— 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_relation 条目 + `protocol/segments/relation.md`
 * 精修项：
 *   · 条目名纠正 —— 骨架把 `Node` / `Rel` 写成"节点定义" / "关系定义"
 *   · 补 `Color[Root|Middle|End(+Text)]`、`Color[Line]`（骨架完全缺失）
 *   · **修正 segment 示例的悬空边** —— `protocol/segments/relation.md` 的示例写 `Rel: m1 -> root`
 *     却从未定义 `root` 节点（AUD-123）；本卡的真源示例已全部显式定义（`root1/root2/root3`）
 *   · 补 `expect`（含 `edgeList`，可回归检测悬空边）与 3 条 `counterexamples`
 *   · 移除 `starter`（统一为 example，AUD-124）
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 多症结系统问题关联分析
Layout: Free

Color[Root]: #CF3A2B
Color[RootText]: #ffffff
Color[Middle]: #F1C40F
Color[MiddleText]: #ffffff
Color[End]: #fbbf24
Color[EndText]: #92400e
Color[Line]: #a1a1aa

// 节点定义（ID, 标签）——所有被 Rel 引用的 ID 都必须在此定义
Node: root1, 症结A：项目交付延期
Node: root2, 症结B：团队士气低落
Node: root3, 症结C：客户投诉增加
Node: m1, 需求频繁变更
Node: m2, 跨部门沟通不畅
Node: m3, 核心人员流失
Node: m4, 技术债务累积
Node: m5, 质量监控缺失
Node: e1, 客户决策链过长
Node: e2, 缺乏统一协作平台
Node: e3, 薪酬竞争力不足
Node: e4, 代码评审流程形同虚设
Node: e5, 自动化测试覆盖率低
Node: e6, 市场竞品压力传导
Node: e7, 历史遗留系统架构
Node: e8, 培训体系不完善

// 关系定义：源 -> 目标（类型由引擎按拓扑自动推断）
Rel: m1 -> root1
Rel: m2 -> root1
Rel: m4 -> root1
Rel: m3 -> root2
Rel: m2 -> root2
Rel: m5 -> root3
Rel: m1 -> root3
Rel: root1 -> root2
Rel: root1 -> root3
Rel: e1 -> m1
Rel: e6 -> m1
Rel: e2 -> m2
Rel: e8 -> m2
Rel: e3 -> m3
Rel: e7 -> m4
Rel: e4 -> m5
Rel: e5 -> m5
Rel: e8 -> m3
`;

const relation: CardSpec = {
  meta: {
    id: 'relation',
    tier: 'core',
    family: 'iqs_native',
    body: 'Graph',
    mcpName: 'render_relation',
    qcTool: 'RELATION',
    version: '1.1',
    parentType: 'iqs_native',
    subType: 'relation',
    displayName: 'IQS 交叉分析/关联图',
    intents: ['关联图', '交叉因果', 'relationship diagram', '网状因果', '多症结'],
    expertise: ['复杂矛盾关联', '出入度分析', '根源寻找'],
    colorSlots: ['Root', 'RootText', 'Middle', 'MiddleText', 'End', 'EndText', 'Line'],
    renderEngine: 'g6',
    inferenceKey: 'relation',
    migrated: true,
  },

  description: '复杂因果关联分析工具。通过出入度分析识别末端根因与核心症结。',

  soul: {
    title: '关联图 (Relationship Diagram)',
    summary: '用箭头连接交织的因素，以出入度识别「谁能被解决」与「什么在拖后腿」。',
    blocks: [
      { kind: 'h', level: 3, text: '关联图 (Relationship Diagram)' },
      {
        kind: 'p',
        text: '关联图把问题及其各种因素之间的复杂因果关系用箭头连成网状。适用于因素交织、互为因果的场景 —— 这正是鱼骨图的层级结构无法表达的部分。',
      },
      { kind: 'h', level: 4, text: '核心推演逻辑' },
      {
        kind: 'ul',
        items: [
          '**多症结支持**：识别系统中并列或递进的多个问题症结 (Sink)，它们作为最终的**结果点**呈现在图中。',
          '**禁止自引用**：严禁 `Rel: A -> A`。',
          '**交叉网状**：鼓励跨分支连接 —— 因素间的交叉影响正是关联图相对鱼骨图的价值所在。',
        ],
      },
      { kind: 'h', level: 4, text: '角色识别（由引擎按出入度自动推断，无需显式标注）' },
      {
        kind: 'ul',
        items: [
          '**主要症结 (Root/Sink)**：只有入边、没有出边 → 渲染为**矩形**。',
          '**末端根因 (End/Source)**：只有出边、没有入边 → 渲染为**椭圆**。',
          '**中间因素 (Middle)**：既有入边也有出边 → 渲染为**椭圆**。',
        ],
      },
      {
        kind: 'callout',
        type: 'IMPORTANT',
        text: '**出入度分析**：入度极高 = 核心矛盾的汇聚点；出度极高 = 问题的根源所在。先解决高**出度**的末端根因，通常能同时松动多个症结。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '图表主标题', argShape: '<文本>',
      example: 'Title: 2024年三季度质量波动分析', required: true, status: 'supported',
    },
    {
      name: 'Layout', meaning: '布局模式',
      values: ['Directional', 'Centralized', 'Free'],
      example: 'Layout: Free', status: 'supported',
      notes:
        '`Directional` = 有向分层（因果方向感最强）；`Centralized` = 中心辐射（围绕单一核心症结）；' +
        '`Free` = 自由力导向（因素多、交叉多时最易读）。注意是**全称**，与 flow 的 `H`/`V` 不同。',
    },
    {
      name: 'Color', slot: ['Root', 'RootText', 'Middle', 'MiddleText', 'End', 'EndText', 'Line'],
      meaning: '#HEX 颜色：症结底 / 症结字 / 中间因素底 / 中间因素字 / 末端根因底 / 末端根因字 / 连线',
      example: 'Color[Root]: #CF3A2B', status: 'supported',
    },
    {
      name: 'Node', meaning: '节点定义（ID, 标签）',
      argShape: '<ID>, <标签>',
      example: 'Node: m1, 需求频繁变更', required: true, status: 'supported',
      notes:
        '**节点类型不需显式标注** —— 引擎按拓扑（出入度）自动推断 Root / Middle / End 并赋予对应形状与颜色。' +
        '标签内如需冒号请用全角「：」。',
    },
    {
      name: 'Rel', meaning: '关系（有向边）定义',
      argShape: '<源ID> -> <目标ID>',
      example: 'Rel: m1 -> root1', required: true, status: 'supported',
      notes:
        '① 箭头为**半角** `->`（与 flow 的全角 `→` 不同）；' +
        '② 两端 ID **必须**已由 `Node:` 定义，否则产生悬空边；' +
        '③ 源与目标不得相同；' +
        '④ 同一对节点可有多条不同方向的边（互为因果），但不鼓励。',
    },
  ],

  example: {
    title: '多症结系统问题关联分析',
    dsl: EXAMPLE_DSL,
    notes: '16 个节点 / 18 条关系；3 个症结（root1–3）、5 个中间因素、8 个末端根因。',
    expect: {
      noErrors: true,
      items: 16,
      requiredEdges: [
        ['m1', 'root1'], ['root1', 'root2'], ['e8', 'm3'], ['e5', 'm5'],
      ],
      note: 'parser 返回 { nodes, links, styles }，items 取 nodes.length；requiredEdges 可回归检测悬空边',
    },
  },

  counterexamples: [
    {
      bad: 'Rel: m1 -> root\n（而未定义 Node: root）',
      good: 'Node: root1, 症结A：交付延期\nRel: m1 -> root1',
      reason:
        '`Rel:` 引用的 ID 必须先由 `Node:` 定义。**注意**：`protocol/segments/relation.md` 旧示例恰好犯了这个错误（引用未定义的 `root`，产生悬空边）—— 本卡的真源示例已修正。',
    },
    {
      bad: 'Rel: m1 -> m1',
      good: '（删除该自环，或改为两个不同节点）',
      reason: '禁止自引用；自环不表达任何因果关系。',
    },
    {
      bad: 'Node: root1, 症结A   （并期望它渲染成矩形）',
      good: '让 root1 只有入边、没有出边 —— 引擎会自动把它识别为 Sink 并渲染为矩形',
      reason: '节点角色由**拓扑**决定，不能通过命名或声明指定；若 root1 也有出边，它会被判为 Middle（椭圆）。',
    },
    {
      bad: 'Rel: a -> b   （全角箭头 →）',
      good: 'Rel: a -> b   （半角 ->）',
      reason: 'relation 的箭头是半角 `->`；全角 `→` 是 flow 的显式边写法。',
    },
  ],

  outputControls: [
    '先 `Node:` 定义全部节点，再 `Rel: <源> -> <目标>` 声明关系；箭头为**半角** `->`。',
    '不要标注节点类型 —— 引擎按出入度自动推断 Root / Middle / End。',
  ],

  promptNotes: [
    '先找「结果」（用户最关心的 1–3 个问题）作为症结，再向下追原因，形成从原因指向结果的箭头。',
    '识别并产出**多条**并列症结 —— 这是关联图区别于鱼骨图的关键（鱼骨图只有一个问题）。',
    '鼓励跨分支连接：若某原因同时影响多个症结，就画多条箭头（这正是「关联」的意义）。',
    '节点数控制在 8–25 个；每个 Rel 的两端都必须已在 `Node:` 中出现。',
    '不要制造自环，也不要为了连线美观添加无因果依据的边。',
  ],
};

export default relation;
