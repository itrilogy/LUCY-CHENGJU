# flowchart (业务流程/流程图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 逻辑流转类图表。专注于描述业务流转、决策分支及逻辑闭环。

### 公共事项及说明 (Common Instructions)

1. **纯净 DSL 范式**: AI 必须生成纯文本 DSL 指令。严禁将代码块包裹在 JSON 结构中或附加冗余解释。

2. **符号冲突防御**: 在中文描述文字中，必须优先使用中文全角标点（如 ，、；、：）。严禁使用半角逗号或分号，防止解析误认。

3. **复杂内容包裹**: 包含特殊符号或多行的节点，必须使用 ["内容"]（矩形）、("内容")（圆角）等显式包裹。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — flowchart (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `graph:` | 定义流程图起始。 | `graph: <值>` |
| `flowchart:` | 定义流程图起始。 | `flowchart: <值>` |


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

### 场景：%%{init: {"theme": "neutral", "look": "handDrawn"}}%%

```dsl
%%{init: {"theme": "neutral", "look": "handDrawn"}}%%
graph TD
    A[提交申请] --> B{经理审批}
    B -- "通过" --> C[财务放款]
    B -- "驳回" --> D[退回修改]
    D --> A
    C --> E[流程结束]
```

---

**权威性声明**：本切片由 `dsl/cards/flowchart.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。