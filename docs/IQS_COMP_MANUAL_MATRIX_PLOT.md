# 图矩阵 (Matrix Plot) 用户手册 v1.0

## 1. 概述 (Overview)

图矩阵（Matrix Plot）是用于多变量关联性分析的高级可视化工具。它通过在单一视图中展示多个变量间的两两交互散点图，帮助分析人员快速识别变量间的相关性、群组模式、异常值以及非线性趋势。

本工具专为质量管理（QC）和制程稳定性分析设计，集成了专业级平滑算法与多维分层渲染技术。

---

## 2. 核心功能 (Core Features)

### 2.1 布局模式 (Layout Modes)
- **变量矩阵 (Matrix)**: 经典的 $N \times N$ 矩阵场景，分析同一组变量间的相互影响。
- **交叉矩阵 (Y vs X)**: 指定一组因变量（Y）与一组自变量（X）进行对比，适用于寻找特定响应的影响因素。

### 2.2 统计平滑 (Statistical Smoothing)
集成 **Lowess** (局部加权散点平滑) 算法：
- **原理**: 基于局部邻域数据的回归，具有极强的非线性捕捉能力。
- **优势**: 对异常值（Outliers）具有天然的鲁棒性，比传统线性回归更贴合实际生产制程波动。

### 2.3 多维分层 (Multivariate Layering)
通过 `Group` 变量实现：
- 自动根据分类变量映射颜色、几何形状和符号。
- 在混杂的数据中识别出不同子批次（Batch）或状态（Status）下的特定规律。

---

## 3. DSL 规范 (DSL Specification)

### 3.1 语法结构
```yaml
Title: [标题文本]
Mode: [Matrix / YvsX]
Dimensions: [变量1, 变量2...] (仅 Matrix 模式)
Y-Dimensions: [Y1, Y2...] (仅 YvsX 模式)
X-Dimensions: [X1, X2...] (仅 YvsX 模式)
Group: [分类变量名]
Smoother: [Lowess / MovingAverage / false]

Data:
- { 变量1: 值, 变量2: 值, Group: "群组A" }
- { 变量1: 值, 变量2: 值, Group: "群组B" }

Styles:
- Diagonal: [Histogram / Boxplot / Label / None]
- DisplayMode: [Full / Lower / Upper]
- ColorPalette: [Industrial / Vibrant]
```

### 3.2 关键字说明
| 关键字 | 取值类型 | 说明 |
|:---:|:---:|:---|
| **Mode** | Enum | `Matrix`: 全变量自相关；`YvsX`: 按行/列轴对齐分析 |
| **Smoother** | Enum | `Lowess`: 局部回归；`MovingAverage`: 滑动平均 |
| **Diagonal** | Enum | 矩阵对角线展示内容。`Histogram` 观察分布，`Boxplot` 观察中位数及离散度 |
| **DisplayMode** | Enum | 控制矩阵展示范围，减少冗余信息 |

---

## 4. 工业分析策略 (Analytic Strategy)

### 阶段一：观察分布 (Diagonal Analysis)
利用对角线上的 **直方图 (Histogram)** 确认：
- 变量是否符合正态分布？
- 是否存在双峰现象（意味着可能混入了不同的制程来源）？

### 阶段二：识别相关性 (Scatter Matrix)
观察两个变量交叉格的散点形态：
- **正相关/负相关**: 指引制程因果关系。
- **曲率变化**: 当散点呈现 U 型或曲线时，必须开启 **Lowess** 平滑线。

### 阶段三：分层定位 (Group Stratification)
查看不同颜色的点群：
- **群体重叠**: 变量对分类维度不敏感。
- **群体分离**: 找到了制程差异的根源（如：不同班次、不同设备）。

---

## 5. 示例 (Example)

```matrix_plot
Title: 核心工艺参数稳定性矩阵
Mode: Matrix
Dimensions: [温度, 压力, 纯度, 良率]
Group: 设备号
Smoother: Lowess

Data:
- { 温度: 200, 压力: 10.5, 纯度: 99.1, 良率: 0.98, 设备号: "Line_01" }
- { 温度: 205, 压力: 10.8, 纯度: 98.5, 良率: 0.95, 设备号: "Line_01" }
- { 温度: 195, 压力: 11.2, 纯度: 97.2, 良率: 0.92, 设备号: "Line_02" }

Styles:
- Diagonal: Histogram
- DisplayMode: Lower
```

---
---

## 5. 专家解读建议 (Professional Interpretation)

*   **识别假相关**：利用 `Group` 变色功能，可以识别出由于样本分层导致的“假相关”。有时全局看似相关，实则是不同群体内部性质截然不同导致的视觉错觉。
*   **对角线的意义**：观察对角线上的分布（通常为直方图），可以确认样本采集是否均匀，是否存在严重的偏态或抽样偏置。
*   **Lowess 平滑**：相比线性回归，Lowess 平滑线能捕捉到变量间非线性的微小波动，是识别复杂动力系统规律的利器。

---
*Smart QC Studio - 全维度数据工程团队*
