# sankey (VChart 能量传递/桑基图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **分线图架构 (Node/Children)**: 推荐使用带有 `children` 的层级结构来定义流量，这比扁平的 from/to 在大规模工业拓扑中更具表达力。
- **严禁跨系挂载**: 作为关系型图表，**严禁**挂载任何 `orient` 轴，否则渲染崩溃。
- **显示标注**: series 中必须配置 `"label": { "visible": true }`。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — sankey (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `字段绑定:` | categoryField 对应节点 ID，valueField 对应节点权重/流量大小。 | `字段绑定: categoryField` |


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

### 场景：生产资源流转路径分析

```dsl
Title: 生产资源流转路径分析
ColorPalette: industrial
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "sankey",
  "data": [
    {
      "values": [
        {
          "nodes": [
            { 
              "name": "总投入", 
              "children": [
                { "name": "原料A", "value": 160, "children": [{ "name": "工序1", "value": 160 }] },
                { "name": "原料B", "value": 120, "children": [{ "name": "工序1", "value": 120 }] },
                { "name": "原料C", "value": 140, "children": [{ "name": "工序2", "value": 140 }] }
              ]
            },
            {
              "name": "工序1",
              "children": [
                { "name": "工序2", "value": 210 },
                { "name": "废料", "value": 70 }
              ]
            },
            {
              "name": "工序2",
              "children": [
                { "name": "工序3", "value": 290 },
                { "name": "废料", "value": 60 }
              ]
            },
            {
              "name": "工序3",
              "children": [
                { "name": "产品X", "value": 190 },
                { "name": "产品Y", "value": 100 }
              ]
            }
          ]
        }
      ]
    }
  ],
  "nodeKey": "name",
  "categoryField": "name",
  "valueField": "value",
  "label": { "visible": true }
}
```

---

**权威性声明**：本切片由 `dsl/cards/sankey.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。