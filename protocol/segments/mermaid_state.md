# stateDiagram-v2 (状态迁移/状态图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 逻辑流转类图表。专注于描述对象在不同触发条件下如何从一个状态转移到另一个状态。

### 分类图表注意事项 (Diagram-Specific Precautions)

- **语义固化**: 必须采用 `state "描述文本" as 别名` 语法。严禁直接在转移连线上书写过于复杂的逻辑描述，以防渲染混乱。
- **闭环思维**: 必须包含起始状态 `[*]`。建议显式标注每一个终结状态 `[*]`。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — stateDiagram-v2 (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `stateDiagram-v2:` | 定义状态图起始。 | `stateDiagram-v2: <值>` |
| `-->:` | 定义状态转移。 | `-->: <值>` |
| `[*]:` | 定义起始/结束点。 | `[*]: <值>` |


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
stateDiagram-v2
    state "待支付" as s1
    state "已支付" as s2
    state "待发货" as s3
    [*] --> s1
    s1 --> s2: 支付成功
    s2 --> s3
    s3 --> [*]
```

---

**权威性声明**：本切片由 `dsl/cards/stateDiagram-v2.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。