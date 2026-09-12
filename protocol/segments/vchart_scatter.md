# scatter (相关性分析/散点图) 协议切片

## 1. 专家灵魂 (The Soul)

### 相关性分析 (Correlation)

散点图是判断两个（或三个）变量之间是否存在相关关系的数学工具。通过观察点集的分布形态，可以得出结论：

- **正相关**: X 增加，Y 也随之增加。
- **负相关**: X 增加，Y 随之减少。
- **不相关**: 点集呈杂乱分布。

### 回归分析 (Regression)

系统自动计算线性回归线，作为预测模型的基础。通过趋势线，我们可以对未知的 X 值预测其对应的 Y 值位置。

> [!IMPORTANT]
> 相关性并不等同于因果关系。两个变量表现出强相关，可能是因为它们共同受第三个隐藏变量的影响。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — scatter (TupleList)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 | `Title: 工艺参数分析` |
| `XAxis:` | X 轴标签 | `XAxis: 温度(℃)` |
| `YAxis:` | Y 轴标签 | `YAxis: 压力(MPa)` |
| `ZAxis:` | Z 轴标签 | `ZAxis: 收缩率%` |


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

### 场景：注塑工艺参数三维分析 (温度/压力/收缩率)

```dsl
Title: 注塑工艺参数三维分析 (温度/压力/收缩率)
XAxis: 模具温度(℃)
YAxis: 注射压力(MPa)
ZAxis: 收缩率%
Color[Point]: #0D5E42
Color[Trend]: #F1C40F
ShowTrend: true
3D: false

- 195.5, 85.2, 2.4
- 192.0, 82.5, 2.5
- 198.5, 88.0, 2.2
```

---

**权威性声明**：本切片由 `dsl/cards/scatter.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。