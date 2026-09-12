# line (VChart 趋势折线图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **笛卡尔闭环 (Critical)**: 必须显式定义 `bottom` (时间/类别轴) 与 `left` (数值轴) 对齐。
- **显示标注**: series 中必须配置 `"label": { "visible": true }` 以确保关键拐点数值可见。
- **数据平滑**: 可选配置 `"smooth": true` 以美化非精度敏感的趋势描述。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — line (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `外壳要求:` | 必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。 | `外壳要求: Title: [标题内容]` |
| `字段绑定:` | xField 对应时间维，yField 对应监控指标。 | `字段绑定: xField` |
| `数据点:` | 设置 "point": { "visible": true } 增强交互触达。 | `数据点: "point": { "visible": true }` |


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

### 场景：月度良率趋势分析

```dsl
Title: 月度良率趋势分析
ColorPalette: ocean
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "line",
  "data": [{ "values": [
    {"month":"1月","v":95}, {"month":"2月","v":96}, {"month":"3月","v":94},
    {"month":"4月","v":97}, {"month":"5月","v":98}, {"month":"6月","v":95}
  ]}],
  "xField": "month", "yField": "v",
  "label": { "visible": true },
  "point": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
```

---

**权威性声明**：本切片由 `dsl/cards/line.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。