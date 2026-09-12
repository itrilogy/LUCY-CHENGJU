# funnel (VChart 过程转化/漏斗图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **数组结构**: VChart Funnel 必须接受数组格式的数据容器。
- **排序准则**: 默认按数值降序排列以符合“漏斗”语义，建议通过 `categoryField` 对齐逻辑阶段。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — funnel (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `外壳要求:` | 必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。 | `外壳要求: Title: [标题内容]` |
| `字段绑定:` | categoryField 定义阶段名称，valueField 定义各阶段余留量。 | `字段绑定: categoryField` |


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

### 场景：业务转化漏斗

```dsl
Title: 业务转化漏斗
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "funnel",
  "data": [{ "values": [
    {"step":"访问","v":1000}, {"step":"注册","v":600}, {"step":"试用","v":300}
  ]}],
  "categoryField": "step", "valueField": "v",
  "label": { "visible": true }
}
```

---

**权威性声明**：本切片由 `dsl/cards/funnel.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。