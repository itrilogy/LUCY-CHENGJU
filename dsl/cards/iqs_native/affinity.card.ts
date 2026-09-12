/**
 * affinity · 亲和图（KJ 法）— 卡片真源（试点）
 *
 * 汇总来源（消除 R20 所指的「5 份手抄副本」）：
 *   A `mcp-server/mcp_tools.json` 的 affinity 条目
 *   B `protocol/segments/affinity.md`
 *   D `constants.tsx` 的 INITIAL_AFFINITY_DSL
 *   E `components/AffinityEditor.tsx` 的帮助弹窗（DSL 规范说明 + 分析逻辑与指南）
 *
 * 修正的 R20 条目：AUD-125（示例 `#` 注释 → `//`）、AUD-124（四源示例不一致 → 统一）、
 *                  AUD-126（`Item:` 语义在此卡片内显式声明）
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 办公环境改善方案（KJ 法）
Type: Card
Layout: Horizontal

// 样式
Color[TitleBg]: #4f46e5
Color[TitleText]: #ffffff
Color[GroupHeaderBg]: #e0e7ff
Color[GroupHeaderText]: #1A2428
Color[ItemBg]: #ffffff
Color[ItemText]: #1A2428
Font[Title]: 24
Font[GroupHeader]: 16
Font[Item]: 14
Color[Line]: #64748b
Color[Border]: rgba(13,94,66,0.18)

// 核心主题（parentId 写 null 或不写；写 root 时该节点会被解析器作为虚拟根吸收，图上不显示）
Item: root, 核心目标: 提升员工幸福感, null

// 一级分组
Item: g1, 空间布局, root
Item: g2, 行政服务, root
Item: g3, 数字化工具, root

// 二级条目
Item: sub1, 增加绿植覆盖, g1
Item: sub2, 设立静默专注区, g1
Item: sub3, 升级人体工学椅, g1
Item: sub4, 现磨咖啡无限供应, g2
Item: sub5, 每周五下午茶, g2
Item: sub6, 引入智能看板系统, g3
Item: sub7, 简化报销流程, g3
`;


const affinity: CardSpec = {
  meta: {
    id: 'affinity',
    tier: 'core',
    family: 'iqs_native',
    body: 'ItemTree',
    mcpName: 'render_affinity',
    qcTool: 'AFFINITY',
    version: '2.2',
    parentType: 'iqs_native',
    subType: 'affinity',
    displayName: 'IQS 核心归类/亲和图',
    intents: ['亲和图', 'KJ法', '系统图', 'affinity diagram', '卡片分组', '语言资料归纳'],
    expertise: ['KJ 法 (Affinity)', '语言资料归纳', '多级脑图梳理'],
    colorSlots: ['TitleBg', 'TitleText', 'GroupHeaderBg', 'GroupHeaderText', 'ItemBg', 'ItemText', 'Line', 'Border'],
    typeDirective: { name: 'Type', values: ['Card', 'Label'], meaning: 'renderMode' },
    renderType: 'affinity',
    inferenceKey: 'affinity',
    renderEngine: 'g6',
    migrated: true,
  },

  description: '基于 KJ 法的思想归纳工具。通过卡片化管理发散思维。',

  soul: {
    title: 'KJ 法 (Affinity Diagram)',
    summary: '把杂乱的语言信息按「相互亲和性」归纳成层级，使问题条理化。',
    blocks: [
      { kind: 'h', level: 3, text: 'KJ 法 (Affinity Diagram)' },
      {
        kind: 'p',
        text: '亲和图法，又称 KJ 法，由川喜田二郎发明。它是将收集到的事实、意见、想法等语言信息，按其相互亲和性（相近性）归纳整理，使问题条理化的方法。',
      },
      { kind: 'h', level: 4, text: '核心步骤' },
      {
        kind: 'ul',
        items: [
          '**发散 (Divergence)**：收集尽可能多的原始想法、反馈或观测值。',
          '**收敛 (Convergence)**：寻找想法间的内在亲和逻辑，形成分组并提炼标题。',
          '**层级化**：建立多级归纳，从具体到抽象，理清思路。',
        ],
      },
      { kind: 'h', level: 4, text: '逻辑构建' },
      {
        kind: 'p',
        text: '通过层级化的定义，亲和图可以帮助团队从混乱的信息中理出头绪。一个好的亲和图应具有清晰的因果或从属逻辑——上级是下级共同性质的提炼，而不是简单的时间顺序。',
      },
      {
        kind: 'callout',
        type: 'IMPORTANT',
        text: '当多个想法无法归入现有分组时，**不要强行塞入**。这可能意味着存在一个新的观察维度，或者是未被识别的根本问题。',
      },
    ],
  },

  syntax: [
    { name: 'Title', meaning: '图表主标题', argShape: '<文本>', example: 'Title: 市场调研整理', required: true, status: 'supported' },
    {
      name: 'Type', meaning: '渲染模式', values: ['Card', 'Label'], example: 'Type: Card',
      notes: 'Card = 卡片形态；Label = 纯文字标签形态。缺省 Card。', status: 'supported',
    },
    {
      name: 'Layout', meaning: '布局方向', values: ['Horizontal', 'Vertical'], example: 'Layout: Horizontal',
      notes: '注意与 flow 的 `Layout: H|V` 写法不同（此处为全称）。', status: 'supported',
    },
    {
      name: 'Color', slot: ['TitleBg', 'TitleText'], meaning: '#HEX 标题背景与文字色',
      example: 'Color[TitleBg]: #4f46e5', status: 'supported',
    },
    {
      name: 'Color', slot: ['GroupHeaderBg', 'GroupHeaderText'], meaning: '#HEX 分组（一级节点）样式',
      example: 'Color[GroupHeaderBg]: #e0e7ff', status: 'supported',
    },
    {
      name: 'Color', slot: ['ItemBg', 'ItemText'], meaning: '#HEX 常规条目（卡片）样式',
      example: 'Color[ItemBg]: #ffffff', status: 'supported',
    },
    { name: 'Color', slot: ['Line'], meaning: '#HEX 连线颜色', example: 'Color[Line]: #64748b', status: 'supported' },
    { name: 'Color', slot: ['Border'], meaning: '#HEX 边框颜色', example: 'Color[Border]: rgba(13,94,66,0.18)', status: 'supported' },
    {
      name: 'Font', slot: ['Title', 'GroupHeader', 'Item'], meaning: 'px 数字字号',
      example: 'Font[Title]: 24', status: 'supported',
    },
    {
      name: 'Item', meaning: '数据项（ItemTree 唯一录入方式）',
      argShape: '[ID], [Label], [ParentID]',
      example: 'Item: g1, 空间布局, root',
      required: true,
      status: 'supported',
      notes:
        '① `ID` 唯一，供 `ParentID` 引用；' +
        '② `Label` 为显示文字，**内容中若需冒号请用全角「：」**，因为分隔符是半角逗号；' +
        '③ `ParentID` 写上级 ID（一级节点写 `root` 或 `null`）；' +
        '④ **被解析器作为虚拟根吸收**：`Item: root, …` 这一行本身不出现在图上，其 children 即为顶层——这是 affinity 独有行为，与 `#` 树无关。',
    },
  ],

  example: {
    title: '改善办公环境的想法整理（KJ 法）',
    dsl: EXAMPLE_DSL,
    notes: '一级分组 + 二级条目两层；`root` 作虚拟根不显示。',
    expect: {
      noErrors: true,
      items: 3, // 解析器返回 root 的 children（g1/g2/g3）
      note: 'parser 返回 { data: rootItems, styles }，data 为 root 的 children 数组',
    },
  },


  counterexamples: [
    {
      bad: '# 一级分类\n## 二级原因',
      good: 'Item: g1, 一级分类, root\nItem: i1, 二级原因, g1',
      reason: '亲和图是 ItemTree，不是 Tree；`#` 层级仅鱼骨图可用。',
    },
    {
      bad: 'Item: root, 公司目标, null\nItem: a, 降本, root\nItem: b, 增效, a\nItem: c, 提效, root',
      good: '每个条目只写一次，层级由 ParentID 单一指定',
      reason: '同一 ID 重复出现或层级自相矛盾会导致树结构不确定。',
    },
  ],

  outputControls: [
    '纯文本 DSL，**禁止** Markdown 代码围栏与解释性前后缀。',
    '行注释用 `//`；**禁止**在亲和图中使用 `#` 建层级。',
    '禁止把 `dsl` 参数写成 JSON 对象。',
  ],

  promptNotes: [
    '先做关键词抽取（把用户描述拆成 5–15 条原子想法），再做亲和分组，最后为每组提炼一句「上位概念」作为组标签。',
    '组的数量控制在 3–7 个；每组条目 2–8 条。',
    '不要臆造数据：用户没提到的原因不要补。',
  ],
};

export default affinity;
