# treemap (VChart 资产矩形/树图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **递归深度**: 支持深层嵌套结构解析。父节点的面积等于所有子节点面积之和。
- **无轴约束**: 禁止配置坐标轴。利用几何空间的矩形分割展示比例关系。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — treemap (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `字段绑定:` | categoryField 用于节点标注，valueField 用于计算矩形权重。 | `字段绑定: categoryField` |


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

### 场景：固定资产分布比例图

```dsl
Title: 固定资产分布比例图
ColorPalette: deep
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "treemap",
  "data": [ {
      "values": [ {
          "name": "总资产",
          "children": [
            { "name": "生产设备", "value": 500 }, { "name": "IT设备", "value": 150 }
          ]
        } ]
    } ],
  "categoryField": "name", "valueField": "value",
  "label": { "visible": true }
}
```

---

**权威性声明**：本切片由 `dsl/cards/treemap.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。