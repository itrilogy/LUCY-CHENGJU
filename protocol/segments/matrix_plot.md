# matrixPlot (多维交互/矩阵散点图) 协议切片

## 1. 专家灵魂 (The Soul)

### 矩阵散点图分析价值 (Multi-variable Correlation)

图矩阵是多元统计分析中的核心工具，用于在单一视野内展示多变量间的两两交互关系。

#### 核心逻辑与策略

- **Lowess 平滑**：局部加权散点平滑，对离群点鲁棒，能捕捉局部非线性趋势。
- **对角线分布**：用直方图确认各变量自身形态（是否正态、有无双峰）—— 判定采样偏置的关键。
- **Group 分层识别**：用颜色/形状区分群组（班次、机台、批次）。群体分离往往标志着找到了问题的根本层级。
- **降维定位**：在 N×N 的交互网格中快速锁定那 20% 具有强相关的关键驱动因素。

> [!TIP]
> 重点看**对角线上的直方图**：若某变量呈双峰，先怀疑采样偏置或数据混入了两个总体，再谈相关性。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — matrixPlot (Table)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表主标题 形如 `<文本>` **必填** | `Title: 制程参数关联分析` |
| `Mode:` | 布局模式（Matrix / YvsX） | `Mode: Matrix` |
| `Dimensions:` | 参与分析的变量维度列表（`Mode: Matrix` 时使用） 形如 `[<变量1>, <变量2>, …]` **必填** | `Dimensions: [温度, 压力, 良率]` |
| `Group:` | 分层变量名（用颜色/形状区分群组） 形如 `<字段名>` | `Group: 批次` |
| `Smoother:` | 平滑算法（Lowess / MovingAverage / false） | `Smoother: Lowess` |
| `Data:` | 数据块**开始**；块内每条记录为一行 YAML-lite 对象 形如 `Data:
- { <字段>: <值>, … }` **必填** | `Data:\n- { 压力: 102, 温度: 185, 晶圆批次: "W-01" }` |
| `Styles:` | 样式块**开始**；块内为 `- <键>: <值>` 列表 形如 `Styles:
- <键>: <值>` | `Styles:\n- DisplayMode: Lower` |
| `DisplayMode:` | （`Styles` 内）显示哪些三角区域（Full / Lower / Upper） | `- DisplayMode: Lower` |
| `Diagonal:` | （`Styles` 内）对角线单元格的呈现方式（Histogram / Boxplot / Label / None） | `- Diagonal: Histogram` |
| `ColorPalette:` | （`Styles` 内）配色方案（Industrial） | `- ColorPalette: Industrial` |

### 边界说明

- **`Mode`**：`Matrix` = 全矩阵（N×N 网格）；`YvsX` = 单组交叉（仅 1 个 Y 对多个 X）。
- **`Dimensions`**：维度名必须与 `Data:` 中每条记录的字段名**逐字一致**。建议 3–6 个维度（N×N 网格增长很快）。
- **`Group`**：该字段应同时出现在 `Data:` 的每条记录里。
- **`Smoother`**：写 `false` 或省略即不叠趋势线。
- **`Data`**：字段名可不加引号；字符串值（如批次号）建议加引号以免被解析为数值。**至少 10 条记录**才有统计意义。
- **`Styles`**：键包括 `DisplayMode` / `Diagonal` / `ColorPalette` / `PointSize` / `PointOpacity`。
- **`DisplayMode`**：`Full` 全显（N×N）；`Lower` 只显左下三角（**最常用，避免重复信息**）；`Upper` 只显右上三角。

### 反例（错 → 对）

- 错：`Dimensions: [压力, 温度]\nData:\n- { 压强: 102, 温度: 185 }`
  对：`Dimensions: [压力, 温度]\nData:\n- { 压力: 102, 温度: 185 }`
  因：`Dimensions` 里的维度名必须与 `Data:` 记录的字段名逐字一致，否则该维度全为空。
- 错：`Data:\n- { 压力: 102, 温度: 185 }   （仅 1–2 条记录）`
  对：`至少 10 条记录`
  因：两两散点图在极少样本下无法读出分布与相关性，甚至会误导。
- 错：`Dimensions: [温度, 压力, 时间, 强度, 硬度, 湿度, 速度, 重量]   （8 维）`
  对：`选出 3–6 个关键维度`
  因：N 维会生成 N×N 网格；8 维即 64 格，远超一屏可读范围。先做维度筛选。
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

### 场景：封装工艺参数相关性研究

```dsl
Title: 封装工艺参数相关性研究
Mode: Matrix
Dimensions: [压力, 温度, 固化时间, 剥离强度]
Group: 晶圆批次
Smoother: Lowess

Data:
- { 压力: 102, 温度: 185, 固化时间: 45, 剥离强度: 8.2, 晶圆批次: "W-01" }
- { 压力: 105, 温度: 188, 固化时间: 46, 剥离强度: 7.9, 晶圆批次: "W-01" }
- { 压力: 100, 温度: 186, 固化时间: 44, 剥离强度: 8.0, 晶圆批次: "W-01" }
- { 压力: 98, 温度: 192, 固化时间: 42, 剥离强度: 9.1, 晶圆批次: "W-02" }
- { 压力: 96, 温度: 194, 固化时间: 41, 剥离强度: 9.4, 晶圆批次: "W-02" }
- { 压力: 99, 温度: 191, 固化时间: 43, 剥离强度: 9.0, 晶圆批次: "W-02" }
- { 压力: 110, 温度: 180, 固化时间: 48, 剥离强度: 7.2, 晶圆批次: "W-03" }
- { 压力: 112, 温度: 178, 固化时间: 49, 剥离强度: 7.0, 晶圆批次: "W-03" }
- { 压力: 108, 温度: 182, 固化时间: 47, 剥离强度: 7.4, 晶圆批次: "W-03" }
- { 压力: 104, 温度: 187, 固化时间: 45, 剥离强度: 8.1, 晶圆批次: "W-01" }

Styles:
- DisplayMode: Lower
- Diagonal: Histogram
- ColorPalette: Industrial
```

> 4 个维度 × 10 条记录，按晶圆批次分 3 组；`DisplayMode: Lower` 只画左下三角。

---

**权威性声明**：本切片由 `dsl/cards/matrixPlot.card.ts` 生成（卡片版本 1.1），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。