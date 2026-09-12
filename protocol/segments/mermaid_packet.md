# packet-beta (报文解析/Packet) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 报文协议解析类。专注于底层通信数据结构的精确位图展示。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — packet-beta (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `packet-beta:` | 定义报文图起始。 | `packet-beta: <值>` |
| `[Start]-[End]: "Label":` | 定义位偏移量及字段名称（例：0-7: "Type"）。 | `[Start]-[End]: "Label": 0-7: "Type"` |


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

### 场景：packet-beta

```dsl
packet-beta
    0-7: "版本号"
    8-15: "类型"
    16-31: "校验和"
    32-63: "偏移量"
```

---

**权威性声明**：本切片由 `dsl/cards/packet-beta.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。