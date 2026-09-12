# quadrantChart (四象限分析/象限图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 多维认知类图表。用于将事物按照两种维度的强弱划分为四个象限，辅助决策。

### 分类图表注意事项 (Diagram-Specific Precautions)

- **引号强制**: 在 `quadrantChart` 中，**所有中文标签必须用双引号 "" 包裹**，否则会导致解析引擎挂起。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — quadrantChart (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `quadrantChart:` | 定义象限图起始。 | `quadrantChart: <值>` |
| `x-axis "Min" --> "Max":` | X 轴标签定义。 | `x-axis "Min" --> "Max": <值>` |
| `quadrant-1 "Label":` | 象限区域标注。 | `quadrant-1 "Label": <值>` |
| `"Item": [x, y]:` | 数据点定位语法。 | `"Item": [x, y]: <值>` |


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

### 场景：quadrantChart

```dsl
quadrantChart
    title "研发任务优先级"
    x-axis "低价值" --> "高价值"
    y-axis "难实现" --> "易实现"
    quadrant-1 "重点投入"
    quadrant-2 "长期规划"
    "任务A": [0.8, 0.9]
    "任务B": [0.2, 0.3]
```

---

**权威性声明**：本切片由 `dsl/cards/quadrantChart.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。