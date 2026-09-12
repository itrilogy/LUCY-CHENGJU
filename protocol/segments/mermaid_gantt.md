# gantt (进度计划/甘特图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 计划与追踪类图表。关注任务在时间轴上的分布、依赖及完成状态。

### 分类图表注意事项 (Diagram-Specific Precautions)

- **缩放防御 (Critical)**: 若当前日期不在项目周期内，必须强制设置 `todayMarker off`，否则时间轴会被无限拉伸导致图例不可见。
- **日期格式**: 必须通过 `dateFormat YYYY-MM-DD` 显式声明日期解析方式，以确保跨平台渲染一致性。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — gantt (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `gantt:` | 定义甘特图起始。 | `gantt: <值>` |
| `section:` | 定义阶段。 | `section: <值>` |
| `任务 :a1, 2024-03-01, 5d:` | 任务定义语法。 | `任务 :a1, 2024-03-01, 5d: <值>` |
| `after a1:` | 任务依赖语法。 | `after a1: <值>` |


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

### 场景：%%{init: {"theme": "base", "gantt": {"barHeight": 35, "fontSize": 16}}}%%

```dsl
%%{init: {"theme": "base", "gantt": {"barHeight": 35, "fontSize": 16}}}%%
gantt
    title 项目开发进度
    dateFormat YYYY-MM-DD
    todayMarker off
    section 核心开发
    架构设计 :a1, 2024-03-01, 5d
    功能开发 :after a1, 10d
    section 质量验证
    集成测试 :2024-03-15, 7d
```

---

**权威性声明**：本切片由 `dsl/cards/gantt.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。