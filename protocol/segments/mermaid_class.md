# classDiagram (系统结构/类图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 结构建模类图表。专注于软件工程中的静态结构，表现类、接口及其依赖路径。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — classDiagram (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `classDiagram:` | 定义类图起始。 | `classDiagram: <值>` |


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
classDiagram
    class Vehicle {
        +move()
    }
    class Car {
        -engine: String
        +drive()
    }
    Vehicle <|-- Car
```

---

**权威性声明**：本切片由 `dsl/cards/classDiagram.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。