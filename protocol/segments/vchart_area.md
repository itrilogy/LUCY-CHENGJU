# area (VChart 资源面积图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **笛卡尔闭环 (Critical)**: 必须配置 `bottom` 与 `left` 轴。
- **层级堆叠**: 推荐开启 `"stack": true` 以展示总量及各分量的贡献配比。
- **显示标注**: 必须配置 `"label": { "visible": true }`。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — area (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `外壳要求:` | 必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。 | `外壳要求: Title: [标题内容]` |
| `分类标记:` | 使用 seriesField 区分不同的资源类别（如 电、气、水）。 | `分类标记: seriesField` |
| `填充样式:` | 默认包含透明度梯度，以确多个序列层叠时的可读性。 | `填充样式: <值>` |


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

### 场景：能源消耗结构分析

```dsl
Title: 能源消耗结构分析
ColorPalette: forest
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "area",
  "data": [{ "values": [
    {"x":"周一","y":50,"c":"电"}, {"x":"周一","y":30,"c":"气"}, {"x":"周一","y":10,"c":"水"},
    {"x":"周二","y":55,"c":"电"}, {"x":"周2","y":35,"c":"气"}, {"x":"周二","y":12,"c":"水"}
  ]}],
  "xField": "x", "yField": "y", "seriesField": "c", "stack": true,
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ],
  "legends": [{ "visible": true, "orient": "bottom" }]
}
```

---

**权威性声明**：本切片由 `dsl/cards/area.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。