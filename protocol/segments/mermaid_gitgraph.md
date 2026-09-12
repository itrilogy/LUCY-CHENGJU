# gitGraph (Git 分支/GitGraph) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 逻辑流转类图表。专注于展示代码版本控制中的分支演进及合并逻辑。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — gitGraph (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `gitGraph:` | 定义 Git 图起始。 | `gitGraph: <值>` |
| `commit id: "ID":` | 提交记录。 | `commit id: "ID": <值>` |
| `branch[Name]` | 创建分支。 | `branch [Name][Name]: <值>` |
| `checkout[Name]` | 切换分支。 | `checkout [Name][Name]: <值>` |
| `merge[Name]` | 合并分支。 | `merge [Name][Name]: <值>` |


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

### 场景：gitGraph

```dsl
gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Feature-A"
    checkout main
    merge develop
    commit id: "Release-1.0"
```

---

**权威性声明**：本切片由 `dsl/cards/gitGraph.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。