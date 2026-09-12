/**
 * mermaid · family 汇总卡（RELIEF 救济层）
 *
 * 用途：MermaidEditor 是**一个组件覆盖 19 个 sub_type**（弹窗是 family 级），
 *       因此本卡承担该族的「治理 + 公共外壳 + sub_type 索引」，
 *       各 sub_type 的细节留在同目录的 `<slug>.card.ts` 中。
 *
 * 对应 MCP 的 `render_mermaid_master`（不发布为可调用 tool，仅用于拼接）。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "neutral", "look": "handDrawn"}}%%
graph TD
    A[提交申请] --> B{经理审批}
    B -- "通过" --> C[财务放款]
    B -- "驳回" --> D[退回修改]
    D --> A
    C --> E[流程结束]
`;

const mermaid_master: CardSpec = {
  meta: {
    id: 'mermaid_master',
    tier: 'relief',
    family: 'mermaid',
    body: 'Foreign',
    mcpName: 'render_mermaid_master',
    qcTool: 'MERMAID',
    version: '1.0',
    parentType: 'mermaid',
    subType: 'master',
    displayName: 'Mermaid 渲染引擎总纲',
    intents: ['Mermaid', '救济层', '类型外制图', '文本建模', '流程/时序/结构'],
    expertise: ['Mermaid 文本建模', '类型外制图', '语法纠偏'],
    colorSlots: [],
    renderEngine: 'mermaid',
    migrated: true,
  },

  description: 'Mermaid 渲染引擎的全局治理逻辑。定义了甘特图、流程图等图表的渲染纠偏规则。',

  soul: {
    title: 'Mermaid 引擎（RELIEF 救济层）',
    summary: '基于文本的通用建模工具；**仅用于 CORE 类型表以外的图**，不得替代 QC 统计终稿。',
    blocks: [
      { kind: 'h', level: 3, text: '救济层定位（最重要的前提）' },
      {
        kind: 'p',
        text: 'Mermaid 覆盖「逻辑流转 / 时序交互 / 结构建模 / 计划追踪 / 多维认知」五类。它**只能用于标准 QC 工具无法表达的场景** —— 凡是能映射到 CORE（控制图、排列图、直方图、鱼骨图、关联图、矢线图、矩阵图、PDPC、亲和图、基础统计图、散点图、雷达图、图矩阵、流程图）的，**必须**用 CORE。',
      },
      {
        kind: 'callout',
        type: 'IMPORTANT',
        text: '体系文件 / 部门泳道 / BPMN 子集终稿**必须**用 `render_flow`（IQS-Flow DSL），禁止用 Mermaid 的 `flowchart` / `graph` 冒充。',
      },
      { kind: 'h', level: 4, text: '五类用途' },
      {
        kind: 'ul',
        items: [
          '**逻辑流转类**：业务流转、决策树、闭环逻辑（flowchart、stateDiagram-v2）。',
          '**时序交互类**：组件协作、调用链、消息传递（sequenceDiagram）。',
          '**结构建模类**：系统架构、数据模型、组织关系（erDiagram、classDiagram、architecture、block-beta）。',
          '**计划与追踪类**：时间维度、进度管理、任务分配（gantt、kanban、timeline）。',
          '**多维认知类**：发散思维、体验感知、比例展示（mindmap、journey、pie、quadrantChart、xychart-beta、packet-beta、requirementDiagram、sankey-beta、gitGraph）。',
        ],
      },
      { kind: 'h', level: 4, text: '公共输出规则（全 sub_type 适用）' },
      {
        kind: 'ul',
        items: [
          '**纯净 DSL**：直接输出 Mermaid 原生指令，**不要** `Spec:` 外壳，**不要**包在 `{}` 里，**不要** Markdown 围栏。',
          '**符号冲突防御**：中文描述里必须用**中文全角标点**（，、；：）。**禁止**在未加引号的文本中出现的半角逗号 `,` 或分号 `;` —— 它们会被解析器当作语法分隔符。',
          '**复杂内容包裹**：含空格、特殊符号或多行的节点文字，必须用 `["内容"]`（矩形）、`("内容")`（圆角）等显式包裹。',
        ],
      },
    ],
  },

  syntax: [
    {
      name: '初始化指令', meaning: '渲染前的主题/外观配置（可选，置于首行）',
      argShape: '%%{init: {…}}%%',
      example: '%%{init: {"theme": "neutral", "look": "handDrawn"}}%%', status: 'supported',
    },
    {
      name: '图类型声明', meaning: '每个 sub_type 的第一行关键字',
      values: ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram-v2', 'erDiagram', 'journey', 'gantt', 'pie', 'quadrantChart', 'requirementDiagram', 'gitGraph', 'mindmap', 'timeline', 'kanban', 'block-beta', 'packet-beta', 'architecture-beta', 'sankey-beta', 'xychart-beta'],
      example: 'graph TD', required: true, status: 'supported',
      notes: '完整的 sub_type 列表；每个的细节见同目录的 `<slug>.card.ts`。',
    },
    {
      name: '节点包裹', meaning: '含空格 / 特殊符号 / 多行 的节点文字必须显式包裹',
      argShape: 'A["内容"] / A("内容") / A{"内容"}',
      example: 'A["提交申请（含附件）"]', status: 'supported',
      notes: '矩形 `[]`、圆角 `()`、菱形 `{}`、圆 `(())`。不包裹时含半角标点的文字会被截断。',
    },
    {
      name: '注释', meaning: 'Mermaid 自身用 `%%` 作行注释',
      argShape: '%% <注释>',
      example: '%% 审批主路径', status: 'supported',
      notes: '⚠️ 与 IQS-DSL 的 `//` 不同 —— 本族使用 Mermaid 原生注释语法。',
    },
  ],

  example: {
    title: 'graph TD（逻辑流转类代表）',
    dsl: EXAMPLE_DSL,
    notes: '仅作本族的语法形态示意；具体 sub_type 请读对应卡片。禁止用本 sub_type 冒充体系文件泳道图。',
  },

  counterexamples: [
    {
      bad: '（用 flowchart TD 画部门审批泳道图作为体系文件终稿）',
      good: 'Title: 采购申请审批流程\\nLayout: H\\nDict: D[…\\nLane from D[0,1] Layout H\\nW: w1: 提交申请 Type[S] Location(D[0])',
      reason: '体系文件 / 部门泳道 / BPMN 子集终稿必须用 IQS-Flow（`render_flow`）。',
    },
    {
      bad: 'A[提交申请, 含附件]',
      good: 'A["提交申请（含附件）"]',
      reason: '未包裹的半角逗号会被当作节点语法分隔符；中文内容请用全角标点并显式包裹。',
    },
    {
      bad: 'Title: xxx\\ngraph TD\\nA --> B',
      good: 'graph TD\\nA --> B',
      reason: 'Mermaid 不使用 `Title:` 外壳 —— 直接输出原生指令。',
    },
  ],

  outputControls: [
    '直接输出 Mermaid 原生指令：不要 `Spec:` 外壳、不要 `{}` 包裹、不要 Markdown 围栏。',
    '中文文本用全角标点并显式包裹（`["…"]`）；禁止裸的半角逗号与分号。',
  ],

  promptNotes: [
    '先按五类用途定位 sub_type（逻辑流转 / 时序交互 / 结构建模 / 计划追踪 / 多维认知），再读该 sub_type 的卡片。',
    '**先自问：能否用 CORE 表达？** 能则一律改 CORE —— 尤其是流程图（用 flow）、统计图（用 basic/control/pareto/histogram）。',
    '节点文字里的中文标点一律全角，并在含特殊符号时显式包裹。',
    '首行可加 `%%{init: …}%%` 统一主题；不加也能渲染。',
  ],
};

export default mermaid_master;
