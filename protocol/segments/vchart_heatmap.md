# heatmap (VChart 空间负荷/热力图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **Venn 替代**: VChart 不支持 Venn 图，处理逻辑关联集合时，推荐使用 Heatmap 或 Scatter 作为替代方案。
- **笛卡尔闭环**: 必须包含 `bottom` 和 `left` 轴。
- **颜色策略**: 必须配置 `visualMap` 或色带，以保证数值与色彩的直观映射感。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — heatmap (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `字段绑定:` | xField 对应时间维或 X 维度，yField 对应分类维度，valueField 对应热力强度。 | `字段绑定: xField` |


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

### 场景：产线负荷热力分布

```dsl
Title: 产线负荷热力分布
ColorPalette: sunset
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "heatmap",
  "data": [{ "values": [
    {"hour":"08:00","line":"Line1","v":90}, {"hour":"09:00","line":"Line1","v":95},
    {"hour":"08:00","line":"Line2","v":40}, {"hour":"09:00","line":"Line2","v":50}
  ]}],
  "xField": "hour", "yField": "line", "valueField": "v",
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
```

---

**权威性声明**：本切片由 `dsl/cards/heatmap.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。