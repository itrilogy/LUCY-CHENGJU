# heatmap (VChart 相关矩阵图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **Venn 替代策略**: 由于 VChart 暂不支持 `venn` 类型，**必须**引导用户或 AI 使用 `heatmap` 构建相关性矩阵进行等效表达。
- **笛卡尔闭环**: 必须包含 `bottom` 和 `left` 两个类别轴。
- **显示标注**: 必须在 series 中配置 `"label": { "visible": true }` 以展示相关系数数值。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — heatmap (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `数据构建:` | 建立对称的 X-Y 坐标数据对，valueField 存储相关系数值（通常为 -1 到 1）。 | `数据构建: valueField` |


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

### 场景：品质指标相关性矩阵

```dsl
Title: 品质指标相关性矩阵
ColorPalette: deep
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "heatmap",
  "data": [{ "values": [
    {"x":"温度","y":"压力","v":0.92}, {"x":"温度","y":"转速","v":0.45},
    {"x":"压力","y":"温度","v":0.92}, {"x":"压力","y":"转速","v":0.31}
  ]}],
  "xField": "x", "yField": "y", "valueField": "v",
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
```

---

**权威性声明**：本切片由 `dsl/cards/heatmap.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。