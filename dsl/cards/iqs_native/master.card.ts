/**
 * iqs_native · family 汇总卡（CORE 核心层总纲）
 *
 * 与 `mermaid/master.card.ts`、`vchart/master.card.ts` 对齐 —— 三个 family 各有一张总纲卡，
 * 对应 MCP 的 `render_iqs_native_master`（不发布为可调用 tool，仅用于拼接）。
 *
 * 作用：承载**跨全部 CORE kind 的公共外壳与红线**，各 kind 的细节留在同目录 `<slug>.card.ts`。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 2024年三季度产线效能
Color[Title]: #1A2428
Font[Title]: 20
Decimals: 2

// 以下为各 kind 的正文结构示意（实际只写一种）
// Tree      → # 一级  /  ## 二级            （fishbone）
// ItemTree  → Item: id, label, parentId      （affinity）
// Pairs     → - 名称: 数值                    （pareto）
// ScalarList→ - 数值                          （histogram）
// Series    → [series]: 标题 … [/series]      （control）
// TupleList → - x, y [, z]                    （scatter）
// Dataset   → Dataset: 名称, [值], 色, 轴      （basic）
// AxisSeries→ Axis: 名, 最大 … / Series: 名, [值]（radar）
// Graph     → Node: id, 标签 / Rel: a -> b    （relation）
// Network   → Event: id, 名 / a -> b: 工期, 名 （arrow）
// Matrix    → Axis: A, 名 / Matrix: A x B     （matrix）
// Table     → Data: / Styles:                 （matrixPlot）
// ProcessGraph → Group: … EndGroup / a--b [NG]（pdpc）
// FlowGraph → Dict: / Lane from / W:          （flow）
`;

const iqs_native_master: CardSpec = {
  meta: {
    id: 'iqs_native_master',
    tier: 'core',
    family: 'iqs_native',
    body: 'Family',
    mcpName: 'render_iqs_native_master',
    qcTool: 'IQS_NATIVE',
    version: '1.2',
    parentType: 'iqs_native',
    subType: 'master',
    displayName: 'IQS 原生组件总纲',
    intents: ['IQS 原生', 'CORE', 'QC 核心图', '质量工具'],
    expertise: ['质量工具标准化', '逻辑模型统一化'],
    colorSlots: [],
    renderEngine: 'native',
    migrated: true,
  },

  description: 'IQS 逻辑图表组件协议总纲。定义了所有非 VChart/Mermaid 原生图表的共有专家逻辑与 DSL 包裹红线。',

  soul: {
    title: 'IQS-DSL v1 核心总纲（CORE 层）',
    summary: '14 个 QC 原生图表共用的外壳、注释与 Type 消歧规则；能映射标准 QC 工具时一律用本层。',
    blocks: [
      { kind: 'h', level: 3, text: '分层与选用' },
      {
        kind: 'ul',
        items: [
          '**CORE（本层）**：`iqs_native` 的 14 个 kind —— 成果报告、专业 QC 图、可审计，**严格语言**。',
          '**RELIEF**：Mermaid / VChart —— 仅作类型外制图，**不得冒充** SPC / 排列图等终稿。',
          '**选用红线**：能映射标准 QC 工具 → 必须 CORE；仅当类型表外 → 才用 RELIEF。',
        ],
      },
      { kind: 'h', level: 4, text: '共同外壳' },
      {
        kind: 'ul',
        items: [
          '**首行 `Title:`**（推荐必写）：承载图表主标题或待分析的问题。',
          '**样式指令**：`Color[Slot]: #RRGGBB` / `Font[Slot]: <px>` / `Show*: true|false` / `Decimals: <整数>`。',
          '槽位名（`Slot`）因 kind 而异，取值见各 kind 卡片——**不要跨 kind 混用**。',
        ],
      },
      { kind: 'h', level: 4, text: '注释与 `#` 规则（最易误用）' },
      {
        kind: 'ul',
        items: [
          '**行注释统一用 `//`**。',
          '**`#` / `##` / `###` 仅鱼骨图（fishbone，body = Tree）可用**，作层级结构。其余 13 个 kind 中 `#` 行只是历史兼容注释，**不要模仿**。',
          '**亲和图必须用 `Item:`** 建树，禁止用 `#`。',
        ],
      },
      { kind: 'h', level: 4, text: '`Type:` 消歧（**同名不同义**）' },
      {
        kind: 'ul',
        items: [
          '`control`：SPC 图种（`I-MR` / `X-bar-R` / …）。',
          '`matrix`：矩阵几何（`L` / `T` / `Y` / `X` / `C`）。',
          '`affinity`：渲染模式（`Card` / `Label`）。',
          '`basic`：图表类型（`bar` / `line` / `pie`）。',
          '**禁止跨 kind 混用取值**（引擎不校验时会静默降级）。',
        ],
      },
      {
        kind: 'callout',
        type: 'IMPORTANT',
        text: '**代码块禁令**：严禁 Markdown 围栏与解释性前后缀，只输出纯文本 DSL；`dsl` 参数不得写成 JSON 对象。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '首行标题（推荐必写）', argShape: '<文本>',
      example: 'Title: 售后投诉根因分析', required: true, status: 'supported',
    },
    {
      name: 'Color', slot: ['Slot'], meaning: '#HEX 颜色；Slot 名因 kind 而异，取值见对应卡片',
      example: 'Color[Bar]: #0D5E42', status: 'supported',
    },
    {
      name: 'Font', slot: ['Slot'], meaning: 'px 字号；Slot 名因 kind 而异',
      example: 'Font[Title]: 20', status: 'supported',
    },
    {
      name: 'Show*', meaning: '显示开关族（`ShowValues` / `ShowLegend` / `ShowCurve` / `ShowScores` / `ShowCritical` …）',
      values: ['true', 'false'], example: 'ShowValues: true', status: 'supported',
      notes: '具体有哪些开关因 kind 而异；取值为小写布尔。',
    },
    {
      name: 'Decimals', meaning: '数值显示精度（小数位）', argShape: '<整数>',
      example: 'Decimals: 2', status: 'supported',
    },
    {
      name: '注释', meaning: '行注释，**统一用 `//`**', argShape: '// <注释>',
      example: '// 主轴产量', status: 'supported',
    },
    {
      name: '正文结构', meaning: '各 kind 的正文形态（Body）不同，必须严格匹配对应卡片的范式',
      values: ['Tree', 'ItemTree', 'Pairs', 'ScalarList', 'Series', 'TupleList', 'Dataset', 'AxisSeries', 'Graph', 'Network', 'Matrix', 'Table', 'ProcessGraph', 'FlowGraph'],
      example: '// 见示例中的逐 kind 结构对照', status: 'supported',
      notes: '**不要混用**：如 `Item:` 属 ItemTree（affinity）与 ProcessGraph（pdpc）但第三参语义不同；`- ` 列表属 Pairs / ScalarList / TupleList，但取值形态不同。',
    },
  ],

  example: {
    title: '共同外壳 + 14 个 kind 的正文结构对照',
    dsl: EXAMPLE_DSL,
    notes: '仅作外层与结构的对照示意；实际生成时**只写一种** kind 的正文，并遵循其卡片。',
  },

  counterexamples: [
    {
      bad: '用 `# 人 (Man)` 在亲和图里建层级',
      good: 'Item: g1, 人员因素, root',
      reason: '`#` 层级仅鱼骨图可用；亲和图是 ItemTree，必须用 `Item:`。',
    },
    {
      bad: 'Type: X-bar-R   （写在 matrix 图里）',
      good: 'Type: L        （matrix 的 Type 取 L/T/Y/X/C）',
      reason: '`Type:` 同名不同义 —— 跨 kind 混用取值不会被接受（或静默降级）。',
    },
    {
      bad: '```dsl\\nTitle: xxx\\n```',
      good: 'Title: xxx',
      reason: '禁止 Markdown 围栏。',
    },
    {
      bad: '{"Title": "xxx"}',
      good: 'Title: xxx',
      reason: '`dsl` 必须是纯文本字符串，不是 JSON 对象。',
    },
  ],

  outputControls: [
    '首行写 `Title:`；样式用 `Color[Slot]:` / `Font[Slot]:` / `Show*:` / `Decimals:`。',
    '行注释统一 `//`；`#` 层级仅鱼骨图可用。',
    '`Type:` 按 kind 解释，禁止跨 kind 混用取值。',
  ],

  promptNotes: [
    '**先选 kind**（14 个 CORE 之一），再读该 kind 的卡片获取其语法与示例 —— 本卡只给外壳。',
    '能映射标准 QC 工具就用 CORE；不要用 Mermaid/VChart 替代。',
    '正文结构必须匹配所选 kind 的 Body；跨 kind 的「同名指令」语义不同，不要照搬。',
    '输出纯文本，首行 `Title:`，不要围栏、不要 JSON。',
  ],
};

export default iqs_native_master;
