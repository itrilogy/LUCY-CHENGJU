# common (VChart 组合分析图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **多轴绑定 (Critical)**: 在组合图中，必须通过 `seriesIndex` 或 `seriesId` 显式绑定轴向（如 `orient: left` 绑定 series 0）。
- **笛卡尔闭环**: 整体必须包含 `bottom` 轴，且每个垂直轴向均需显式配置。
- **数据解耦**: 每类序列建议使用独立的 `data` 块或通过 `series` 内置数据定义。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — common (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `系列定义:` | 使用 series 数组，每个对象需声明 type (bar/line/area)。 | `系列定义: series` |
| `轴线映射:` | axes 数组中通过 seriesIndex: [idx] 指定该轴服务的序列。 | `轴线映射: axes` |


### 反例（错 → 对）

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

### 场景：生产效能双轴组合图

```dsl
Title: 生产效能双轴组合图
ColorPalette: tech
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "common",
  "series": [
    { "id": "cost", "type": "bar", "data": {"values": [{"x":"Q1","y":120},{"x":"Q2","y":150}]}, "xField": "x", "yField": "y", "label": { "visible": true } },
    { "id": "yield", "type": "line", "data": {"values": [{"x":"Q1","y":98},{"x":"Q2","y":96}]}, "xField": "x", "yField": "y", "label": { "visible": true } }
  ],
  "axes": [
    { "orient": "left", "seriesIndex": [0], "title": {"visible": true, "text": "成本 (K)"} },
    { "orient": "right", "seriesIndex": [1], "title": {"visible": true, "text": "良率 (%)"} },
    { "orient": "bottom", "label": { "visible": true } }
  ],
  "legends": [{ "visible": true, "orient": "bottom" }]
}
```

---

**权威性声明**：本切片由 `dsl/cards/common.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。