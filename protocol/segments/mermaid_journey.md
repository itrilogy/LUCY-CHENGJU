# journey (体验路径/旅程图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 多维认知类图表。通过时间序列展示用户在交互过程中的情感曲线与参与点。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — journey (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `journey:` | 定义旅程图起始。 | `journey: <值>` |
| `title:` | 设置旅程名称。 | `title: <值>` |
| `section:` | 设置阶段（如 搜索、决策）。 | `section: <值>` |
| `动作: 5: 角色:` | 分别代表 动作名, 评分 (0-5), 角色名。 | `动作: 5: 角色: <值>` |


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

### 场景：%%{init: {"theme": "base"}}%%

```dsl
%%{init: {"theme": "base"}}%%
journey
    title 线上购物旅程
    section 搜索
      点击商品: 5: 用户
      查看详情: 4: 用户
    section 决策
      加购物车: 5: 用户
      下单支付: 3: 用户
```

---

**权威性声明**：本切片由 `dsl/cards/journey.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。