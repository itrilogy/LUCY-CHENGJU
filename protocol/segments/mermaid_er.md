# erDiagram (数据建模/ER图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 结构建模类图表。用于定义数据实体（Entities）及其相互关联（Relationships）。
- **逻辑准则**: 刻画父子、依赖及引用关系。强调基数（Cardinality）的准确性，如 `||--o{` 代表一对多。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — erDiagram (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `erDiagram:` | 定义 ER 图起始。 | `erDiagram: <值>` |
| `||--o{:` | 定义基数关系。 | `\|\|--o{: <值>` |
| `||--|{:` | 定义基数关系。 | `\|\|--\|{: <值>` |
| `}|--|{:` | 定义基数关系。 | `}\|--\|{: <值>` |
| `ENTITY { int id }:` | 定义属性列表。 | `ENTITY { int id }: <值>` |


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

### 场景：%%{init: {"theme": "forest"}}%%

```dsl
%%{init: {"theme": "forest"}}%%
erDiagram
    USER ||--o{ ORDER : "下单"
    ORDER ||--|{ PRODUCT : "包含"
    USER {
        int id
        string name
    }
```

---

**权威性声明**：本切片由 `dsl/cards/erDiagram.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。