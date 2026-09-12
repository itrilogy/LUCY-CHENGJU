# rose (VChart 南丁格尔玫瑰图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **严禁跨系挂载 (Warning)**: 严禁配置 `orient` 笛卡尔轴。玫瑰图工作在极坐标系下。
- **数据容器**: 严格遵循 Top-level 数组结构。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — rose (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `类型声明:` | "type": "rose"。 | `类型声明: "type": "rose"` |
| `字段绑定:` | categoryField 与 valueField。 | `字段绑定: categoryField` |
| `视觉标注:` | 必须开启 "label": { "visible": true }。 | `视觉标注: "label": { "visible": true }` |


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

### 场景：供应商异常反馈分布 (玫瑰图)

```dsl
Title: 供应商异常反馈分布 (玫瑰图)
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "rose",
  "data": [{ "values": [
    {"type":"物流","v":400}, {"type":"包装","v":200}, {"type":"性能","v":300}, {"type":"外观","v":150}
  ]}],
  "categoryField": "type", "valueField": "v",
  "outerRadius": 0.8, "innerRadius": 0.2,
  "label": { "visible": true }
}
```

---

**权威性声明**：本切片由 `dsl/cards/rose.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。