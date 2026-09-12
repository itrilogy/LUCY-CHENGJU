# radar (指标评估/雷达图) 协议切片

## 1. 专家灵魂 (The Soul)

### 雷达图多维分析 (Radar Chart)

雷达图是通过多轴展现对象在不同维度上得分，以评估整体平衡性与优劣势的工具。

#### 核心分析算子：

- **面积综合得分 (Area Score)**: 评估综合实力，体现“短板效应”。
- **相似度分析 (Similarity Analysis)**: 用于识别竞争对手或特征对标。
- **数据标准化 (Standardize)**: 自动映射量纲不一致的指标至 0-1 范围。

> [!TIP]
> **多维平衡性**: 观察多边形的均匀度。极度不规则意味着资源分配极度不均，可能存在局部优势掩盖系统性缺陷。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — radar (AxisSeries)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 | `Title: 竞品对比` |
| `Standardize:` | 是否自动标准化数据（true / false） | `Standardize: true` |
| `ShowAreaScore:` | 显示多边形面积综合得分 | `ShowAreaScore: true` |
| `轴定义:` | Axis: [Name], [Max], [Min] | `轴定义: Axis: [Name], [Max], [Min]` |
| `系列定义:` | Series: [Name], [ValueList], [Color], [Opacity] | `系列定义: Series: [Name], [ValueList], [Color], [Opacity]` |


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

### 场景：手机硬件参数对比

```dsl
Title: 手机硬件参数对比
Standardize: true
ShowAreaScore: true

// 轴定义
Axis: 续航, 100, 0
Axis: 性能, 100, 0
Axis: 拍照, 100, 0

// 数据系列
Series: A手机, [85, 92, 78], #0D5E42, 0.4
```

---

**权威性声明**：本切片由 `dsl/cards/radar.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。