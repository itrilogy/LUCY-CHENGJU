# kanban (任务看板/Kanban) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 计划与追踪类图表。用于模拟敏捷看板，展示任务在不同状态列（Todo, InProgress, Done）间的分布。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — kanban (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `kanban:` | 定义看板起始。 | `kanban: <值>` |
| `[列名]:` | 顶格书写定义列。 | `[列名]: <值>` |
| `[事项]:` | 缩进定义任务项。 | `[事项]: <值>` |
| `@{ assigned: "人" }:` | 分配责任人语法。 | `@{ assigned: "人" }: <值>` |


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
kanban
  Todo
    需求评审
    架构设计
  InProgress
    API开发
  Done
    环境搭建
```

---

**权威性声明**：本切片由 `dsl/cards/kanban.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。