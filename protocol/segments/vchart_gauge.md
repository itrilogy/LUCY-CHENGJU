# gauge (VChart 实时性能/仪表盘) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **角度控制**: 应显式定义 `startAngle` (如 -225) 和 `endAngle` (如 45) 以形成工业标准的扫掠范围。
- **严禁跨系挂载**: 禁止配置 Cartesian 坐标轴。
- **量程定义**: 通过半径 `outerRadius` 与 `innerRadius` 控制环厚。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — gauge (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `数据限制:` | 建议单系列数据展示。使用 valueField 绑定当前测得数值。 | `数据限制: valueField` |


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

### 场景：产线实时直通率仪表盘

```dsl
Title: 产线实时直通率仪表盘
ColorPalette: tech
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "gauge",
  "data": [{ "values": [{"v": 0.88}] }],
  "valueField": "v",
  "categoryField": "v",
  "outerRadius": 0.8, "innerRadius": 0.5,
  "startAngle": -225, "endAngle": 45,
  "label": { "visible": true }
}
```

---

**权威性声明**：本切片由 `dsl/cards/gauge.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。