# sankey-beta (能量流向/桑基图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 能量/价值流向类图表。用于展示流动量在不同节点间的分配关系。

### 分类图表注意事项 (Diagram-Specific Precautions)

- **语言退避 (Critical)**: 当前版本 `sankey-beta` 解析器对非 ASCII 字符极其敏感。**强烈建议强制使用英文标注**以确保渲染成功，否则可能导致节点崩解。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — sankey-beta (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `sankey-beta:` | 定义桑基图起始。 | `sankey-beta: <值>` |
| `Source,Sink,Value:` | 数据行定义语法。 | `Source,Sink,Value: <值>` |


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

### 场景：sankey-beta

```dsl
sankey-beta
    Agricultural,Fertilizer,150
    Agricultural,Irrigation,100
    Fertilizer,Crop,120
    Irrigation,Crop,80
```

---

**权威性声明**：本切片由 `dsl/cards/sankey-beta.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。