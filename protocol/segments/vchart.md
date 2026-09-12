# vchart_master (VChart 渲染引擎总纲) 协议切片

## 1. 专家灵魂 (The Soul)

### 救济层定位

VChart 用于 CORE 类型表无法表达的可视化。**凡有 Native 等价的，一律用 CORE** —— VChart 只能作为最后手段。

> [!IMPORTANT]
> **有 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿** —— 散点与雷达都有 Native CORE 工具（`render_scatter` / `render_radar`）。

#### 两种语法模式（先选模式，再写内容）

- **Spec 模式（JSON 外壳）**：适用于 bar、line、area、pie、funnel、gauge、heatmap、rose、sankey、sunburst、treemap、waterfall、wordCloud、boxPlot、circularProgress、common。内容必须包在 `Spec: { … }` 内。
- **Custom DSL 模式（K-V 键值）**：**仅**适用于 vchart 族的 `radar` / `scatter` —— 采用关键字驱动，无需 JSON。

#### 三条硬约束

- **外壳必需**：必须以 `Title:` 开头，后跟 `Spec: { … }`。**严禁**把整个结果作为纯 JSON 对象输出（那样连 `Title:` 都没有）。
- **100% 静态**：`Spec` 内**严禁**出现任何 JavaScript 函数、注释或表达式 —— 只能是静态 JSON。
- **数据容器规范**：`Spec.data` 必须是数组 `[{ values: [...] }]`，元素为对象数组。

> [!TIP]
> 把用户给的「时间:数值」表格转成 `{ "values": [{ "x": "A", "y": 10 }, …] }`，再由 `xField` / `yField` 指向字段名 —— 这是最常见的转换。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — vchart_master (Foreign)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题文字（**必需**，外壳首行） 形如 `<文本>` **必填** | `Title: 核心指标分析` |
| `ColorPalette:` | 配色主题（light / tech / vibrant / industrial / ocean / forest） | `ColorPalette: tech` |
| `ShowTitle:` | 是否显示标题（true / false） | `ShowTitle: true` |
| `ShowLabel:` | 是否显示数据标签（true / false） | `ShowLabel: true` |
| `Animation:` | 是否播放动画（导出静态图时建议 false）（true / false） | `Animation: false` |
| `Spec:` | 核心 JSON 配置（Spec 模式的**必填**内核） 形如 `Spec: { "type": "<图表类型>", … }` **必填** | `Spec: { "type": "bar", "data": [{ "values": […] }] }` |
| `数据字段:` | （`Spec` 内）字段名映射 形如 `"xField": "<字段>", "yField": "<字段>"` | `"xField": "month", "yField": "v"` |
| `轴线映射:` | （`Spec` 内）轴的朝向与服务序列 形如 `{ "orient": "left\|bottom\|right\|top", "seriesIndex": [<序号>] }` | `{ "orient": "left", "label": { "visible": true } }` |

### 边界说明

- **`Spec`**：① `Spec` 内是 **100% 静态 JSON** —— 严禁函数、注释、表达式；② 外层 `{ }` 必须成对，且整个 `Spec:` 是**文本**（不是把整个 DSL 变成 JSON 对象）；③ `data` 必须是 `[{ values: [...] }]` 形式。
- **`数据字段`**：`xField` / `yField` / `seriesField` / `categoryField` 各自指向 `values` 里的键名。
- **`轴线映射`**：组合图（`common`）中**必须**用 `seriesIndex` 或 `seriesId` 显式绑定轴；且整体必须包含 `bottom` 轴。

### 反例（错 → 对）

- 错：`{ "type": "bar", "data": [{ "values": [] }] }`
  对：`Title: 月度 OEE\nSpec: { "type": "bar", "data": [{ "values": [] }] }`
  因：`dsl` 字段必须是**文本**且以 `Title:` 开头；直接把整个结果写成 JSON 对象会被 MCP 判为格式错误。
- 错：`Spec: { "type": "bar", "tooltip": { "formatter": (v) => v + "%" } }`
  对：`Spec: { "type": "bar", "tooltip": { "visible": true } }`
  因：Spec 必须 100% 静态 —— 任何 JavaScript 函数都不被接受。
- 错：`Spec: { "data": [{ "month": "1月", "v": 0.85 }] }`
  对：`Spec: { "data": [{ "values": [{ "month": "1月", "v": 0.85 }] }] }`
  因：`data` 必须是 `[{ values: [...] }]` 容器，而不是裸的对象数组。
- 错：`（用 render_vchart_scatter 画 QC 相关分析终稿）`
  对：`Title: 注塑工艺参数相关分析\nXAxis: 模具温度(℃)\n- 195.5, 85.2`
  因：散点有 Native CORE 工具 `render_scatter`；QC 终稿禁止用 vchart 救济版冒充。
- 错：````dsl\nTitle: xxx\n````
  对：`Title: xxx`
  因：禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。
- 错：`{"Title": "xxx"}`
  对：`Title: xxx`
  因：`dsl` 必须是纯文本字符串，不是 JSON 对象。
- 错：`这是根据您的需求生成的图表：\nTitle: xxx`
  对：`Title: xxx`
  因：禁止解释性前后缀。

---

## 3. 官方示例 (The Seed)

### 场景：bar（Spec 模式代表）

```dsl
Title: 月度设备综合效率 (OEE)
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
```

> 仅作本族的语法形态示意（外壳 + 静态 Spec + data.values 容器）；具体 sub_type 请读对应卡片。

---

**权威性声明**：本切片由 `dsl/cards/vchart_master.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。