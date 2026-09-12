# pie (工业级占比图 (VChart)) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **严禁坐标轴**: 饼图工作在极坐标系，**绝对禁止**出现 `axes` 或 `orient: left/bottom` 配置。
- **数据容器**: `Spec.data` 顶层必须为数组格式 `[{ values: [...] }]`。
- **形态策略**: 默认为实心饼图 (`innerRadius: 0`)。当用户提到“环形”或“Donut”时，才设置 `innerRadius: 0.5`。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — pie (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `外壳要求:` | 必须使用 Title: [标题] 起始。 | `外壳要求: Title: [标题]` |
| `字段绑定:` | categoryField 对应分类名称，valueField 对应数值。 | `字段绑定: categoryField` |
| `显示控制:` | "label": { "visible": true }。 | `显示控制: "label": { "visible": true }` |


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

### 场景：质量成本构成明细

```dsl
Title: 质量成本构成明细
ColorPalette: vibrant

Spec: {
  "type": "pie",
  "data": [{ "values": [
    {"name":"预防成本","v":400},
    {"name":"鉴定成本","v":200}
  ]}],
  "categoryField": "name", "valueField": "v",
  "outerRadius": 0.8, "innerRadius": 0,
  "label": { "visible": true }
}
```

---

**权威性声明**：本切片由 `dsl/cards/pie.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。