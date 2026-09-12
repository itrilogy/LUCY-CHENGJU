/**
 * arrow · 矢线图 / 双代号网络图（ADM）— 卡片真源
 *
 * 迁移来源：`mcp-server/mcp_tools.json` 的 render_arrow 条目 + `protocol/segments/arrow.md`
 * 精修项：
 *   · 条目名纠正 —— 骨架曾误作「节点: Event: [ID], [Label]」，实为三条独立语法：
 *     `Event` / 实任务（`->`）/ 虚任务（`..>`）
 *   · 补 `ShowShortest`、`Color[Node|Line|Critical|Shortest]`
 *   · 补 `expect` 语义断言与 3 条 `counterexamples`
 *   · `promptNotes` 由 soul 摘录改写为可执行的生成要点
 *   · 移除 `starter` —— 统一为 example（全项目只保留一份示例，AUD-124）
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 办公软件 V1.0 开发计划
ShowCritical: true
ShowShortest: false

Color[Critical]: #E74C3C
Color[Line]: #00D2FF

// 节点（事件）
Event: 1, 立项完成
Event: 2, 需求评审
Event: 3, 架构设计
Event: 4, 模块 A 开发
Event: 5, 模块 B 开发
Event: 6, 集成测试
Event: 7, 交付

// 实任务：Src -> Tgt: 工期, 名称
1 -> 2: 3, 需求分析
2 -> 3: 2, 架构方案
3 -> 4: 10, A逻辑实现
3 -> 5: 8, B逻辑实现
4 -> 6: 5, 系统集成
6 -> 7: 2, 验收发布

// 虚任务：仅表达逻辑依赖，工期恒为 0
5 ..> 4: 0, 依赖同步
`;

const arrow: CardSpec = {
  meta: {
    id: 'arrow',
    tier: 'core',
    family: 'iqs_native',
    body: 'Network',
    mcpName: 'render_arrow',
    qcTool: 'ARROW',
    version: '1.1',
    parentType: 'iqs_native',
    subType: 'arrow',
    displayName: 'IQS 进度控制/双代号网络图',
    intents: ['矢线图', '双代号网络图', '关键路径', 'arrow diagram', '网络计划', 'CPM'],
    expertise: ['项目进度管理', '关键路径 (CPM)', 'ADM 网络图'],
    colorSlots: ['Node', 'Line', 'Critical', 'Shortest'],
    renderEngine: 'g6',
    inferenceKey: 'arrow',
    migrated: true,
  },

  description: '通过节点和箭条展示任务间的先后顺序与时间关联。识别关键路径。',

  soul: {
    title: '双代号网络图 (Arrow Diagram Method)',
    summary: '用节点表示事件、用箭条表示工作，展示任务先后顺序与时间关联，并自动求解关键路径。',
    blocks: [
      { kind: 'h', level: 3, text: '双代号网络图 (Arrow Diagram Method)' },
      {
        kind: 'p',
        text: '矢线图，又称双代号网络图 (ADM)，是计划管理的重要工具。它通过节点（事件）和箭条（工作）展示各项任务间的先后顺序与时间关联。',
      },
      { kind: 'h', level: 4, text: '核心计算逻辑 (CPM)' },
      {
        kind: 'ul',
        items: [
          '**关键路径 (Critical Path)**：项目中耗时最长的路径。任何延迟都会导致整个项目的延期。',
          '**宽裕时间 (Float)**：通过 ES/LS 计算每个节点的时差。',
          '**虚任务 (Dummy Task)**：仅表示任务间逻辑依赖关系的虚线，**工期恒为 0**。',
        ],
      },
      {
        kind: 'callout',
        type: 'TIP',
        text: '**资源优化**：识别非关键路径上的时差 (Float)，平衡峰值期间的人力或设备资源。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '项目名称（图标题）', argShape: '<文本>',
      example: 'Title: 新生产线建设', required: true, status: 'supported',
    },
    {
      name: 'ShowCritical', meaning: '是否高亮关键路径', values: ['true', 'false'],
      example: 'ShowCritical: true', status: 'supported',
    },
    {
      name: 'ShowShortest', meaning: '是否高亮最短路径', values: ['true', 'false'],
      example: 'ShowShortest: false', status: 'supported',
    },
    {
      name: 'Color', slot: ['Node', 'Line', 'Critical', 'Shortest'],
      meaning: '#HEX 颜色：节点 / 连线 / 关键路径高亮 / 最短路径高亮',
      example: 'Color[Critical]: #E74C3C', status: 'supported',
    },
    {
      name: 'Event', meaning: '节点（事件）定义；ID 为**整数**，供任务行引用',
      argShape: '<ID>, <标签>', example: 'Event: 1, 立项完成', required: true, status: 'supported',
      notes: 'ID 建议用连续整数；每个 ID 只能定义一次。',
    },
    {
      name: '实任务', meaning: '带工期的实际工作（用 `->`）',
      argShape: '<SrcID> -> <TgtID>: <工期>, <名称>',
      example: '1 -> 2: 3, 需求分析', required: true, status: 'supported',
      notes: '工期为**正数**（单位自定，通常为天）；名称可省略。`->` 与 `..>` 不可混用。',
    },
    {
      name: '虚任务', meaning: '仅表达逻辑依赖的虚线（用 `..>`），**工期固定 0**',
      argShape: '<SrcID> ..> <TgtID>: 0, <名称>',
      example: '5 ..> 4: 0, 依赖同步', status: 'supported',
      notes: '用于表达「同一对节点间需要多条并行逻辑」或修正跨层级依赖；工期写非 0 不报错但语义无效。',
    },
  ],

  example: {
    title: '办公软件 V1.0 开发计划',
    dsl: EXAMPLE_DSL,
    notes: '7 个事件 + 6 条实任务 + 1 条虚任务；关键路径由引擎按 CPM 自动求解并高亮。',
    expect: {
      noErrors: true,
      items: 7,
      note: 'parser 返回 { data: { nodes, links }, styles }，items 取 nodes.length',
    },
  },

  counterexamples: [
    {
      bad: '1 -> 2: 0, 依赖同步',
      good: '1 ..> 2: 0, 依赖同步',
      reason: '零工期的逻辑依赖应写成虚任务 `..>`；用 `->` 会被当作实任务参与关键路径计算。',
    },
    {
      bad: '1 -> 2: 3天, 需求分析',
      good: '1 -> 2: 3, 需求分析',
      reason: '工期须为纯数值；单位写在标签里或图标题中，不要混进数值字段。',
    },
    {
      bad: '2 -> 3: 2, 架构方案   （而未定义 Event: 2）',
      good: 'Event: 2, 需求评审\n2 -> 3: 2, 架构方案',
      reason: '任务两端的事件 ID 必须先由 `Event:` 定义。',
    },
  ],

  outputControls: [
    '节点用 `Event:` 定义；工作用 `<Src> -> <Tgt>: 工期, 名称`；虚任务用 `..>` 且工期为 0。',
    '工期为纯数字，不要在数值字段内混入单位或文字说明。',
  ],

  promptNotes: [
    '先把用户描述拆成「里程碑/事件」与「工作包」两类；事件进 `Event:` 行，工作进 `Src -> Tgt:` 行。',
    '只有存在跨层级逻辑依赖（无法靠节点合并表达）时才引入虚任务 `..>`。',
    '事件数控制在 5–20 个；过多时考虑拆分为子网络。',
    '不要手工标注关键路径 —— 引擎按 CPM 自动计算；用 `ShowCritical: true` 控制是否高亮。',
  ],
};

export default arrow;
