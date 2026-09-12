# circularProgress (VChart 进度追踪环) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **多条追踪**: 支持在一个圆环内展示多条进度轨道（seriesField 分组）。
- **严禁跨系挂载**: 极坐标系下的专用进度组件，禁制挂载笛卡尔轴。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — circularProgress (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `字段绑定:` | valueField (0-1 的进度值)，categoryField 进度名，seriesField 锚定轨道分组。 | `字段绑定: valueField` |


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

### 场景：核心指标达成进度

```dsl
Title: 核心指标达成进度
ColorPalette: tech
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "circularProgress",
  "data": [{ "values": [
    { "name": "产量达成", "value": 0.88 },
    { "name": "直通率", "value": 0.95 }
  ]}],
  "valueField": "value", "categoryField": "name", "seriesField": "name",
  "radius": 0.8, "innerRadius": 0.2,
  "label": { "visible": true, "position": "bottom" }
}
```

---

**权威性声明**：本切片由 `dsl/cards/circularProgress.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。