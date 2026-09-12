# pie (极简饼图 (Mermaid)) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 辅助类图表。仅当用户明确要求使用 Mermaid 或“极简”风格时使用。**常规占比分析首选 render_vchart_pie**。

### 公共事项及说明 (Common Instructions)

1. **标题策略**: 必须在 `pie` 关键字后显式跟随 `title [标题]`。

2. **数值约束**: 建议项数不超过 8 个。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — pie (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `pie:` | 定义饼图起始。 | `pie: <值>` |
| `title[标题内容]` | 设置标题。 | `title [标题内容][标题内容]: <值>` |
| `"项名" : 数值:` | 数据项定义语法 (项名必须用双引号包裹)。 | `"项名" : 数值: <值>` |


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

### 场景：%%{init: {"theme": "neutral"}}%%

```dsl
%%{init: {"theme": "neutral"}}%%
pie title 缺陷原因分布
    "物流损坏" : 45
    "品质瑕疵" : 30
    "包装问题" : 15
    "其他" : 10
```

---

**权威性声明**：本切片由 `dsl/cards/pie.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。