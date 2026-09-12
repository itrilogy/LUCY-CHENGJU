# mindmap (知识脑图/思维导图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 多维认知类图表。用于非线性的思维发散与归纳。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — mindmap (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `mindmap:` | 定义脑图起始。 | `mindmap: <值>` |
| `root(("中心")):` | 双括号代表圆角容器。 | `root(("中心")): <值>` |
| `(分支):` | 节点边界语法。 | `(分支): <值>` |
| `{{ 六角 }}:` | 节点边界语法。 | `{{ 六角 }}: <值>` |
| `[矩形]:` | 节点边界语法。 | `[矩形]: <值>` |


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
mindmap
  root(("质量管理"))
    控制方法
      (SPC 统计)
      (异常拦截)
    标准体系
      (ISO 9001)
      (行业标准)
```

---

**权威性声明**：本切片由 `dsl/cards/mindmap.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。