# block-beta (分层块图/Block) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 结构建模类图表。用于将复杂的系统拆解为可视化的逻辑矩形块（Block）与容器。

### 分类图表注意事项 (Diagram-Specific Precautions)

- **引号强制**: 在 `block-beta` 中，**所有中文标签必须用双引号 "" 包裹**。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — block-beta (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `block-beta:` | 定义块图起始。 | `block-beta: <值>` |
| `columns[N]` | 设置每行显示的网格列数。 | `columns [N][N]: <值>` |
| `block:[ID]:` | 定义容器块。 | `block:[ID]: <值>` |
| `"Label":` | 定义具体内容块。 | `"Label": <值>` |


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

### 场景：block-beta

```dsl
block-beta
    columns 3
    "服务1" "服务2" "服务3"
    block:group1
        columns 1
        "子项A" "子项B"
    end
```

---

**权威性声明**：本切片由 `dsl/cards/block-beta.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。