# boxPlot (VChart 质量审计/箱线图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **预计算统计量 (Critical)**: VChart BoxPlot **不负责**原始行数据的统计，必须传递已计算好的 `min`, `q1`, `median`, `q3`, `max` 值。
- **笛卡尔闭环**: 作为笛卡尔系图表，必须包含 `bottom` 和 `left` 坐标轴。
- **静态约束**: 所有计算值必须为字面量数字。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — boxPlot (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `字段绑定:` | 显式映射 minField, q1Field, medianField, q3Field, maxField。 | `字段绑定: minField` |
| `样式:` | boxPlot 关键字采用驼峰命名。 | `样式: boxPlot` |


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

### 场景：加工尺寸分布审计 (箱线图)

```dsl
Title: 加工尺寸分布审计 (箱线图)
ColorPalette: tech
ShowTitle: true
ShowLabel: false
Animation: false

Spec: {
  "type": "boxPlot",
  "data": [ {
      "values": [
        { "batch": "批次A", "min": 10.1, "q1": 10.2, "median": 10.3, "q3": 10.4, "max": 10.5 },
        { "batch": "批次B", "min": 10.6, "q1": 10.7, "median": 10.75, "q3": 10.85, "max": 11.0 }
      ]
    } ],
  "xField": "batch", "minField": "min", "q1Field": "q1", "medianField": "median", "q3Field": "q3", "maxField": "max",
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
```

---

**权威性声明**：本切片由 `dsl/cards/boxPlot.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。