# xychart-beta (通用双轴图/XYChart) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 通过 XY 坐标系展示混合趋势。相比 VChart 混合图，XYChart 更强调在文档流中的快速直观输出。

### 分类图表注意事项 (Diagram-Specific Precautions)

- **引号强制**: 在 `xychart-beta` 中，**所有中文标签必须用双引号 "" 包裹**。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — xychart-beta (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `xychart-beta:` | 定义图表起始。 | `xychart-beta: <值>` |
| `x-axis ["L1", "L2"]:` | X 轴离散标签。 | `x-axis ["L1", "L2"]: <值>` |
| `bar[v1, v2]` | 系列定义语法。 | `bar [v1, v2][v1, v2]: <值>` |
| `line[v1, v2]` | 系列定义语法。 | `line [v1, v2][v1, v2]: <值>` |


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

### 场景：xychart-beta

```dsl
xychart-beta
    title "季度产量趋势"
    x-axis ["Q1", "Q2", "Q3", "Q4"]
    y-axis "产量(Ton)" 0 --> 500
    bar [320, 410, 390, 450]
    line [300, 380, 420, 440]
```

---

**权威性声明**：本切片由 `dsl/cards/xychart-beta.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。