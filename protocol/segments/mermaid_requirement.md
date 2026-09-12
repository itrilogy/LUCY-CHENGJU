# requirementDiagram (需求建模/需求图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 系统需求建模类图表。专注于需求条目的结构化定义及其在物理系统中的闭环验证。

### 分类图表注意事项 (Diagram-Specific Precautions)

- **关系严谨**: 关系连接必须带箭头（如 `- satisfies ->`）。
- **验证闭环**: 验证方法建议必须使用官方关键字 `verifyMethod`。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — requirementDiagram (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `requirementDiagram:` | 定义需求图起始。 | `requirementDiagram: <值>` |
| `requirement [Name] { id: text, risk: level }:` | 需求定义块。 | `requirement [Name] { id: text, risk: level }: <值>` |
| `element [Name] { type: "Type" }:` | 系统元素定义块。 | `element [Name] { type: "Type" }: <值>` |
| `element - satisfies -> requirement:` | 关联关系定义。 | `element - satisfies -> requirement: <值>` |


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

### 场景：requirementDiagram

```dsl
requirementDiagram
    requirement req_lock {
        id: 1.1
        text: "当速度超过20km/h时自动锁定车门"
        risk: medium
        verifyMethod: test
    }
    element actuator {
        type: "Actuator"
    }
    actuator - satisfies -> req_lock
```

---

**权威性声明**：本切片由 `dsl/cards/requirementDiagram.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。