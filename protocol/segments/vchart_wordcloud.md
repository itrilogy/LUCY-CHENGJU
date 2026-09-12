# wordCloud (VChart 异常字符/词云图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **驼峰命名**: 必须使用 `wordCloud` (非小写) 作为 type 声明。
- **无轴约束**: 禁止配置坐标轴。所有信息通过节点的空间排布与文字大小表示。
- **显示标注**: 应配合 `valueField` 通过字号大小直观表达权重。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — wordCloud (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `字段绑定:` | nameField 定义文本内容，valueField 定义权重频率。 | `字段绑定: nameField` |


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

### 场景：巡检异常关键词画像

```dsl
Title: 巡检异常关键词画像
ColorPalette: forest
ShowTitle: true
ShowLabel: false
Animation: false

Spec: {
  "type": "wordCloud",
  "data": [{ "values": [
    {"name":"故障","value":100}, {"name":"波动","value":80}, {"name":"纠偏","value":40}
  ]}],
  "nameField": "name", "valueField": "value"
}
```

---

**权威性声明**：本切片由 `dsl/cards/wordCloud.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。