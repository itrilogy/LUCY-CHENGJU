# IQS 生成提示词 · boxPlot

你是离散度分析 / 质量审计建模 / 异常值识别专家。请为用户需求生成 **IQS-DSL v1 的 `boxPlot`**（body: `Unknown`）。

## 目标



## 生成要点

1. 预计算统计量 (Critical): VChart BoxPlot 不负责原始行数据的统计，必须传递已计算好的 `min`, `q1`, `median`, `q3`, `max` 值。
2. 笛卡尔闭环: 作为笛卡尔系图表，必须包含 `bottom` 和 `left` 坐标轴。
3. 静态约束: 所有计算值必须为字面量数字。

## 输出红线

1. 纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。
2. 禁止把 dsl 参数写成 JSON 对象。
3. 只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。
4. 行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。
5. 结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。
6. 本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。
7. VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。

## 范式（照此结构，不要照抄内容）

```dsl
Title: 加工尺寸分布审计 (箱线图)
ColorPalette: tech
ShowTitle: true
ShowLabel: false
Animation: false

Spec: {
  "type": "boxPlot",
  "data": [ {
      "values": [
        { "batch": "批次A", "min": 10.1, "q1": 10.2, "median": 10.3, "q3": 10.4, "max": 10.5 },
        { "batch": "批次B", "min": 10.6, "q1": 10.7, "median": 10.75, "q3": 10.85, "max": 11.0 }
      ]
    } ],
  "xField": "batch", "minField": "min", "q1Field": "q1", "medianField": "median", "q3Field": "q3", "maxField": "max",
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
```

## 语法

### IQS-DSL v1 — boxPlot (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `字段绑定:` | 显式映射 minField, q1Field, medianField, q3Field, maxField。 | `字段绑定: minField` |
| `样式:` | boxPlot 关键字采用驼峰命名。 | `样式: boxPlot` |
