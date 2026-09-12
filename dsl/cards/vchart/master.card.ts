/**
 * vchart · family 汇总卡（RELIEF 救济层）
 *
 * 用途：VChartEditor 是**一个组件覆盖 19 个 sub_type**（弹窗是 family 级），
 *       因此本卡承担该族的「治理 + 外壳规范 + 两种语法模式 + sub_type 索引」，
 *       各 sub_type 的细节留在同目录的 `<slug>.card.ts` 中。
 *
 * 对应 MCP 的 `render_vchart_master`（不发布为可调用 tool，仅用于拼接）。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `Title: 月度设备综合效率 (OEE)
ColorPalette: tech
ShowTitle: true

Spec: {
  "type": "bar",
  "data": [{ "values": [
    { "month": "1月", "v": 0.85 }, { "month": "2月", "v": 0.88 }
  ]}],
  "xField": "month", "yField": "v",
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
`;

const vchart_master: CardSpec = {
  meta: {
    id: 'vchart_master',
    tier: 'relief',
    family: 'vchart',
    body: 'Foreign',
    mcpName: 'render_vchart_master',
    qcTool: 'VCHART',
    version: '1.0',
    parentType: 'vchart',
    subType: 'master',
    displayName: 'VChart 渲染引擎总纲',
    intents: ['VChart', '救济层', '类型外可视化', 'VisActor'],
    expertise: ['VisActor VChart 配置', '类型外复杂可视化', '静态 Spec 约束'],
    colorSlots: [],
    renderEngine: 'vchart',
    migrated: true,
  },

  description: 'IQS VChart 渲染引擎的核心专家灵魂与公共治理准则。定义了全局样式外壳及 100% 静态 JSON 约束。',

  soul: {
    title: 'VChart 引擎（RELIEF 救济层）',
    summary: '基于 VisActor JSON Spec 的复杂可视化；**有 Native 等价时必须改走 CORE**。',
    blocks: [
      { kind: 'h', level: 3, text: '救济层定位' },
      {
        kind: 'p',
        text: 'VChart 用于 CORE 类型表无法表达的可视化。**凡有 Native 等价的，一律用 CORE** —— VChart 只能作为最后手段。',
      },
      {
        kind: 'callout',
        type: 'IMPORTANT',
        text: '**有 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿** —— 散点与雷达都有 Native CORE 工具（`render_scatter` / `render_radar`）。',
      },
      { kind: 'h', level: 4, text: '两种语法模式（先选模式，再写内容）' },
      {
        kind: 'ul',
        items: [
          '**Spec 模式（JSON 外壳）**：适用于 bar、line、area、pie、funnel、gauge、heatmap、rose、sankey、sunburst、treemap、waterfall、wordCloud、boxPlot、circularProgress、common。内容必须包在 `Spec: { … }` 内。',
          '**Custom DSL 模式（K-V 键值）**：**仅**适用于 vchart 族的 `radar` / `scatter` —— 采用关键字驱动，无需 JSON。',
        ],
      },
      { kind: 'h', level: 4, text: '三条硬约束' },
      {
        kind: 'ul',
        items: [
          '**外壳必需**：必须以 `Title:` 开头，后跟 `Spec: { … }`。**严禁**把整个结果作为纯 JSON 对象输出（那样连 `Title:` 都没有）。',
          '**100% 静态**：`Spec` 内**严禁**出现任何 JavaScript 函数、注释或表达式 —— 只能是静态 JSON。',
          '**数据容器规范**：`Spec.data` 必须是数组 `[{ values: [...] }]`，元素为对象数组。',
        ],
      },
      {
        kind: 'callout',
        type: 'TIP',
        text: '把用户给的「时间:数值」表格转成 `{ "values": [{ "x": "A", "y": 10 }, …] }`，再由 `xField` / `yField` 指向字段名 —— 这是最常见的转换。',
      },
    ],
  },

  syntax: [
    {
      name: 'Title', meaning: '图表标题文字（**必需**，外壳首行）', argShape: '<文本>',
      example: 'Title: 核心指标分析', required: true, status: 'supported',
    },
    {
      name: 'ColorPalette', meaning: '配色主题',
      values: ['light', 'tech', 'vibrant', 'industrial', 'ocean', 'forest'],
      example: 'ColorPalette: tech', status: 'supported',
    },
    {
      name: 'ShowTitle', meaning: '是否显示标题', values: ['true', 'false'],
      example: 'ShowTitle: true', status: 'supported',
    },
    {
      name: 'ShowLabel', meaning: '是否显示数据标签', values: ['true', 'false'],
      example: 'ShowLabel: true', status: 'supported',
    },
    {
      name: 'Animation', meaning: '是否播放动画（导出静态图时建议 false）', values: ['true', 'false'],
      example: 'Animation: false', status: 'supported',
    },
    {
      name: 'Spec', meaning: '核心 JSON 配置（Spec 模式的**必填**内核）',
      argShape: 'Spec: { "type": "<图表类型>", … }',
      example: 'Spec: { "type": "bar", "data": [{ "values": […] }] }',
      required: true, status: 'supported',
      notes:
        '① `Spec` 内是 **100% 静态 JSON** —— 严禁函数、注释、表达式；' +
        '② 外层 `{ }` 必须成对，且整个 `Spec:` 是**文本**（不是把整个 DSL 变成 JSON 对象）；' +
        '③ `data` 必须是 `[{ values: [...] }]` 形式。',
    },
    {
      name: '数据字段', meaning: '（`Spec` 内）字段名映射',
      argShape: '"xField": "<字段>", "yField": "<字段>"',
      example: '"xField": "month", "yField": "v"', status: 'supported',
      notes: '`xField` / `yField` / `seriesField` / `categoryField` 各自指向 `values` 里的键名。',
    },
    {
      name: '轴线映射', meaning: '（`Spec` 内）轴的朝向与服务序列',
      argShape: '{ "orient": "left|bottom|right|top", "seriesIndex": [<序号>] }',
      example: '{ "orient": "left", "label": { "visible": true } }', status: 'supported',
      notes: '组合图（`common`）中**必须**用 `seriesIndex` 或 `seriesId` 显式绑定轴；且整体必须包含 `bottom` 轴。',
    },
  ],

  example: {
    title: 'bar（Spec 模式代表）',
    dsl: EXAMPLE_DSL,
    notes: '仅作本族的语法形态示意（外壳 + 静态 Spec + data.values 容器）；具体 sub_type 请读对应卡片。',
  },

  counterexamples: [
    {
      bad: '{ "type": "bar", "data": [{ "values": [] }] }',
      good: 'Title: 月度 OEE\\nSpec: { "type": "bar", "data": [{ "values": [] }] }',
      reason: '`dsl` 字段必须是**文本**且以 `Title:` 开头；直接把整个结果写成 JSON 对象会被 MCP 判为格式错误。',
    },
    {
      bad: 'Spec: { "type": "bar", "tooltip": { "formatter": (v) => v + "%" } }',
      good: 'Spec: { "type": "bar", "tooltip": { "visible": true } }',
      reason: 'Spec 必须 100% 静态 —— 任何 JavaScript 函数都不被接受。',
    },
    {
      bad: 'Spec: { "data": [{ "month": "1月", "v": 0.85 }] }',
      good: 'Spec: { "data": [{ "values": [{ "month": "1月", "v": 0.85 }] }] }',
      reason: '`data` 必须是 `[{ values: [...] }]` 容器，而不是裸的对象数组。',
    },
    {
      bad: '（用 render_vchart_scatter 画 QC 相关分析终稿）',
      good: 'Title: 注塑工艺参数相关分析\\nXAxis: 模具温度(℃)\\n- 195.5, 85.2',
      reason: '散点有 Native CORE 工具 `render_scatter`；QC 终稿禁止用 vchart 救济版冒充。',
    },
  ],

  outputControls: [
    '必须 `Title:` 开头 + `Spec: { … }` 外壳；`Spec` 内为 **100% 静态 JSON**。',
    '`data` 用 `[{ values: [...] }]` 容器；严禁函数、注释与表达式。',
  ],

  promptNotes: [
    '**先自问：能否用 CORE？** 能则一律改 CORE（尤其 scatter / radar 有 Native 等价）。',
    '再选模式：本节列举的 Spec 类表型用 JSON 外壳；vchart 的 radar / scatter 用 K-V 模式。',
    '把用户数据转成 `{"values": [{"x": …, "y": …}]}`，再用 `xField`/`yField` 映射字段名。',
    '组合图（`common`）务必为每个系列绑定轴（`seriesIndex`/`seriesId`）并补 `bottom` 轴。',
    '导出静态图时设 `Animation: false`。',
  ],
};

export default vchart_master;
