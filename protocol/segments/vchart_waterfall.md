# waterfall (VChart 变动归因/瀑布图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **终值标记**: 必须在最后一个数据点中使用标记字段（如 `isTotal: true`），并在 Spec 中通过 `total` 字段绑定，以确立总计柱的悬空基准。
- **笛卡尔闭环**: 必须显式包含 `bottom` 和 `left` 轴。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — waterfall (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `关键字定义:` | "total": { "tagField": "isTotal" } 用于识别总计项。 | `关键字定义: "total": { "tagField": "isTotal" }` |
| `配色语义:` | 自动识别数值正负并分配上升/下降色系。 | `配色语义: <值>` |


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

### 场景：质量成本变动归因分析

```dsl
Title: 质量成本变动归因分析
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "waterfall",
  "data": [ {
      "values": [
        { "x": "起始成本", "y": 1000 },
        { "x": "材料波动", "y": 200 },
        { "x": "工艺改进", "y": -150 },
        { "x": "最终成本", "y": 1050, "isTotal": true }
      ]
    } ],
  "xField": "x", "yField": "y",
  "total": { "tagField": "isTotal" },
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
```

---

**权威性声明**：本切片由 `dsl/cards/waterfall.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。