# bar (VChart 基础柱状图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **笛卡尔闭环 (Critical)**: 作为笛卡尔坐标系图表，**必须**显式包含 `bottom` 和 `left` 两个轴配置，否则会导致渲染异常。
- **显示标注**: 为了保证工业读数精度，必须在 series 中配置 `"label": { "visible": true }`。
- **静态约束**: 严禁在 Spec 块内出现 JavaScript 函数或 formatMethod 逻辑。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — bar (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `外壳要求:` | 必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。 | `外壳要求: Title: [标题内容]` |
| `数据容器:` | 所有的 Spec.data 必须是数组格式 data: [{ values: [...] }]。 | `数据容器: Spec.data` |
| `字段绑定:` | xField 绑定类别，yField 绑定数值。 | `字段绑定: xField` |


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

### 场景：生产单元故障堆叠分析

```dsl
Title: 生产单元故障堆叠分析
ColorPalette: ocean
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "bar",
  "data": [{ "values": [
    {"unit":"单元A","type":"机械","v":10}, {"unit":"单元A","type":"电气","v":20}, {"unit":"单元A","type":"人为","v":5},
    {"unit":"单元B","type":"机械","v":15}, {"unit":"单元B","type":"电气","v":5}, {"unit":"单元B","type":"人为","v":8}
  ]}],
  "xField": "unit", "yField": "v", "seriesField": "type", "stack": true,
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ],
  "legends": [{ "visible": true, "orient": "bottom" }]
}
```

---

**权威性声明**：本切片由 `dsl/cards/bar.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。