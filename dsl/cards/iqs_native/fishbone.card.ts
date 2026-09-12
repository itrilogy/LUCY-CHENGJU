/**
 * fishbone · 因果图（石川图）— 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_fishbone 条目 + `protocol/segments/fishbone.md`
 * 精修项：
 *   · 修 `Color[...]` 的示例重复（骨架曾生成 `Color[Root][Root]: <值>`）
 *   · 把 `# [文字]` / `## [文字]` / `### [文字]` 三条"伪指令"改为对被引用的结构语法的
 *     正式条目（名为 `#` / `##` / `###`），并显式声明「**本 kind 是唯一把 `#` 用作结构的 kind**」
 *   · 补 `Color[End]`（骨架缺失）
 *   · 补 `expect` 与 3 条 `counterexamples`；`promptNotes` 改为建模要点
 *   · 移除 `starter`（统一为 example，AUD-124）
 *
 * 注：本卡 body = `Tree`，示例中的 `#` 是**层级结构**，与其他 kind 里作注释的 `#` 语义不同。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 注塑件表面缩水故障分析
Color[Root]: #E74C3C
Color[RootText]: #ffffff
Color[Main]: #0D5E42
Color[MainText]: #ffffff
Color[Bone]: #475569
Color[Line]: rgba(13,94,66,0.18)
Color[Text]: #1A2428

# 人 (Man)
## 调机参数设置不当
### 保压压力过低
### 保压时间不足
## 巡检意识淡薄

# 机 (Machine)
## 料筒加热温度偏移
## 模具冷却水道阻塞
### 冷却水流量不足

# 料 (Material)
## 材料缩水率不均匀
## 回料比例过高

# 法 (Method)
## 工艺标准不完善
## 注射速度过快
`;

const fishbone: CardSpec = {
  meta: {
    id: 'fishbone',
    tier: 'core',
    family: 'iqs_native',
    body: 'Tree',
    mcpName: 'render_fishbone',
    qcTool: 'FISHBONE',
    version: '1.1',
    parentType: 'iqs_native',
    subType: 'fishbone',
    displayName: 'IQS 因果分析/鱼骨图',
    intents: ['鱼骨图', '因果图', '石川图', 'fishbone', '根因分析', 'ishikawa', '5M1E', '4P', '5Why'],
    expertise: ['根因分析 (RCA)', '5M1E / 4P 因果模型', '工业质量改进'],
    colorSlots: ['Root', 'RootText', 'Main', 'MainText', 'Bone', 'Line', 'Text', 'End'],
    renderEngine: 'canvas',
    inferenceKey: 'fishbone',
    migrated: true,
  },

  description: '根因分析工具。支持 5M1E (制造业) 或 4P (管理) 模型拆解质量问题。通过逐级下钻寻找核心根因节点。',

  soul: {
    title: '石川图 (Ishikawa) 因果分析',
    summary: '用「鱼头—大骨—中骨—小骨」层级整理问题与原因，配合 5 Whys 下钻到根因。',
    blocks: [
      { kind: 'h', level: 3, text: '石川图 (Ishikawa) 因果分析原理' },
      {
        kind: 'p',
        text: '鱼骨图，又称因果图，是整理**问题与原因**之间关系的一种极佳工具。鱼头是待分析的问题（写进 `Title:`），大骨是原因分类，中骨/小骨是逐级下钻的原因。',
      },
      { kind: 'h', level: 4, text: '1. 5M1E 模型（制造业）' },
      {
        kind: 'ul',
        items: [
          '**人 (Man)**：操作员、技能、意识。',
          '**机 (Machine)**：设备稳定性、精度、润滑。',
          '**料 (Material)**：原材料、品质、规格。',
          '**法 (Method)**：工艺标准、操作流程。',
          '**环 (Environment)**：温湿度、照明、噪音。',
          '**测 (Measurement)**：测量工具、抽样方法。',
        ],
      },
      { kind: 'h', level: 4, text: '2. 4P 模型（服务业 / 管理）' },
      {
        kind: 'ul',
        items: [
          '**策略 (Policies)**：规章制度、管理流程。',
          '**程序 (Procedures)**：具体作业步骤。',
          '**人员 (People)**：能力、态度、协作。',
          '**场所 (Plant)**：办公环境、系统工具。',
        ],
      },
      {
        kind: 'callout',
        type: 'TIP',
        text: '鱼骨图的深度决定了解决问题的深度。推导出某个原因后，连续追问「为什么」(5 Whys)，直到找到可措施化的根因节点。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '问题陈述（渲染为**鱼头**）', argShape: '<文本>',
      example: 'Title: 售后投诉根因分析', required: true, status: 'supported',
      notes: '写"问题"而非"原因"；一个图只分析一个问题。',
    },
    {
      name: 'Color', slot: ['Root', 'RootText', 'Main', 'MainText', 'Bone', 'Line', 'Text', 'End'],
      meaning: '#HEX 颜色：鱼头底 / 鱼头字 / 大骨底 / 大骨字 / 主脊椎线 / 子因连接线 / 原因文字 / 末端骨',
      example: 'Color[Root]: #E74C3C', status: 'supported',
    },
    {
      name: '#', meaning: '一级分类（**大骨**）—— 本 kind 中 `#` 是**结构**而非注释',
      argShape: '# <分类名>', example: '# 人 (Man)', required: true, status: 'supported',
      notes: '⚠️ **本 kind 是唯一把 `#` 用作层级结构的 kind**（body = Tree）。其余 kind 中 `#` 仅作历史兼容注释，不可用 `#` 建层级。',
    },
    {
      name: '##', meaning: '二级原因（**中骨**）', argShape: '## <原因>',
      example: '## 调机参数设置不当', status: 'supported',
    },
    {
      name: '###', meaning: '三级原因（**小骨**）', argShape: '### <原因>',
      example: '### 保压压力过低', status: 'supported',
      notes: '可继续用 `####` 等更深层级（引擎支持多级嵌套），但超过四级会显著压缩可读性。',
    },
  ],

  example: {
    title: '注塑件表面缩水故障分析',
    dsl: EXAMPLE_DSL,
    notes: '5M1E 中取 4 个大骨（人/机/料/法），大小骨共 12 个原因节点。',
    expect: {
      noErrors: true,
      items: 4,
      note: 'parser 返回 { data: { id, label, type, children }, styles }，items 取 children.length（大骨数）',
    },
  },

  counterexamples: [
    {
      bad: '- 人 (Man)\n  - 调机参数设置不当',
      good: '# 人 (Man)\n## 调机参数设置不当',
      reason: '鱼骨图的层级必须用 `#` / `##` / `###` 表达；`-` 列表不会被解析为骨。',
    },
    {
      bad: 'Item: g1, 人 (Man), root',
      good: '# 人 (Man)',
      reason: '`Item:` 是**亲和图**（ItemTree）的录入方式；鱼骨图用 `#` 树。两者不可混用。',
    },
    {
      bad: '# 调机参数设置不当   （把原因写成大骨，而问题无处安放）',
      good: 'Title: 注塑件表面缩水故障分析\n# 人 (Man)\n## 调机参数设置不当',
      reason: '`Title:` 承载"问题"（鱼头），`#` 只能承载原因分类；不要把原因提到大骨层。',
    },
  ],

  outputControls: [
    '本 kind 用 `#` / `##` / `###` 表达层级（**唯一例外**）；问题写进 `Title:`。',
    '禁止用 `-` 列表或 `Item:` 建鱼骨层级（那是 basic / 亲和图的写法）。',
  ],

  promptNotes: [
    '先确认问题（写进 `Title:`），再选模型：制造业用 5M1E（人机料法环测），服务/管理用 4P。',
    '大骨取 4–6 个；每个大骨下用 5 Whys 追问到**可措施化**的根因，中骨 2–8 个。',
    '原因要具体且可验证（"保压压力过低"优于"操作不当"）。',
    '不要臆造原因：用户未提及的类别可以省略大骨，不要为了凑齐 5M1E 而编造。',
  ],
};

export default fishbone;
