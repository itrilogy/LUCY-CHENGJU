# Radar (雷达图) 协议切片

## 1. 专家灵魂 (The Soul)

### 雷达图多维分析 (Radar Chart)
雷达图是通过多轴展现对象在不同维度上得分，以评估整体平衡性与优劣势的工具。

#### 核心分析算子：
- **面积综合得分 (Area Score)**: 通过计算多边形面积来评估综合实力。相较于平均分，它能更好地体现“短板效应”。
- **相似度分析 (Similarity Analysis)**: 结合欧氏距离，计算不同系列间的重合度，用于识别竞争对手或特征对标。
- **数据标准化 (Standardize)**: 当各指标量纲不一致时（如一个是百分比，一个是金额），自动映射至 0-1 范围。

### 专家建议
> [!TIP]
> **多维平衡性**: 观察多边形的均匀度。极度不规则的雷达图意味着资源分配极度不均，可能存在局部优势掩盖系统性缺陷的风险。

---

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 | `Title: 产品竞品对比分析` |
| `Standardize:` | 是否自动标准化数据 (true/false) | `Standardize: true` |
| `ShowAreaScore:` | 显示多边形面积综合得分 | `ShowAreaScore: true` |
| `ShowSimilarity:` | 显示系列间的相似度比较 | `ShowSimilarity: true` |

### 极坐标控制
- `StartAngle:`: 偏置角度（`-90` 为 12 点钟位置）。
- `Clockwise:`: 布尔值，渲染方向。
- `Closed:`: 网格样式（true 为多边形，false 为圆形）。
- `ShowValues:`: 在数据点显示原始数值。

### 核心定义
- **轴定义**: `Axis: [Name], [Max], [Min]` (Min 可省，默认 0)。
- **系列定义**: `Series: [Name], [ValueList], [Color], [Opacity]`
  - `ValueList` 格式为 `[v1, v2, ...]`。
  - `Color` 可为 HEX 或 `null`。

### 注释与权威
- 行注释：`//`；`#` 行在本 kind 中丢弃（非 Tree）。
- 完整规范见 [IQS-DSL v1](../../docs/IQS_DSL_V1_SPEC.md) · kind=`radar`（CORE Native，优先于 `render_vchart_radar`）。

---

## 3. 官方示例 (The Seed)

### 场景：某两款智能手机硬件参数对比
```dsl
Title: 投资组合多维风险分析

// 统计分析控制
Standardize: true
ShowAreaScore: true
ShowSimilarity: true
ShowValues: true

// 极坐标控制
StartAngle: -90
Clockwise: true
Closed: true

// 轴定义
Axis: 年化回报(%), 25, 0
Axis: 波动率(%), 30, 0
Axis: 流动性评分, 100, 0
Axis: 夏普比率, 3, 0
Axis: 最大回撤(%), 40, 0

// 数据系列
Series: 平衡型组合, [12, 15, 80, 1.8, 12], #3b82f6, 0.4
Series: 激进型组合, [20, 25, 60, 2.2, 28], #ef4444, 0.3
Series: 保守型组合, [6, 8, 95, 1.2, 5], #10b981, 0.2
```

---
**权威性声明**: 本文档内容与 `RadarEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
