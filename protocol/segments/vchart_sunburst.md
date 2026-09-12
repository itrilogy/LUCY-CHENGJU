# sunburst (VChart 层级穿透/旭日图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **层级数据结构**: 数据必须采用 `children` 嵌套的树形 JSON 格式，包裹在顶层数组内。
- **严禁跨系挂载**: 禁制挂载笛卡尔坐标轴。
- **中心对齐**: 自动计算圆心，支持从内向外的占比逻辑解析。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — sunburst (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `字段绑定:` | categoryField 锚定名称，valueField 锚定叶子节点数值及枝干聚合权值。 | `字段绑定: categoryField` |


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

### 场景：产品成本层级拆解 (旭日图)

```dsl
Title: 产品成本层级拆解 (旭日图)
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "sunburst",
  "data": [ {
      "values": [ {
          "name": "总成本",
          "children": [
            { "name": "材料", "value": 500, "children": [{ "name": "铝材", "value": 300 }] },
            { "name": "人工", "value": 400 }
          ]
        } ]
    } ],
  "categoryField": "name", "valueField": "value",
  "label": { "visible": true }
}
```

---

**权威性声明**：本切片由 `dsl/cards/sunburst.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。