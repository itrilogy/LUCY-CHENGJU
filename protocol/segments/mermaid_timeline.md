# timeline (历史年表/时间线) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 计划与追踪类图表。专注于以非刻度化的方式展示重要事件的先后顺序环境。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — timeline (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `timeline:` | 定义时间线起始。 | `timeline: <值>` |
| `title:` | 设置标题。 | `title: <值>` |
| `2024 : [事件1] : [事件2]:` | 时间段与事件定义语法。 | `2024 : [事件1] : [事件2]: <值>` |


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
timeline
    title IQS 产品历史
    2023 : 1.0 版本
    2024 : 2.0 版本
    2025 : 3.0 版本
```

---

**权威性声明**：本切片由 `dsl/cards/timeline.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。