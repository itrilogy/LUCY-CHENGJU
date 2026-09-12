# Smart QC Tools - 矩阵图 (Matrix Diagram) 工程实施预研

## 1. 矩阵图必要知识与工程定义

矩阵图（Matrix Diagram）是通过多维表格的形式，分析多组因素之间**关联程度**的工具。在工程实现上，核心挑战在于如何将**多维数据**映射到**二维平面的不同几何结构**中。

### 1.1 类型定义 (Type Definition)
根据因素维度的数量及组合方式，工程上需支持以下 4 种类型：

| 类型 | 别名 | 维度数 | 几何结构 | 典型应用 |
| :--- | :--- | :--- | :--- | :--- |
| **L型** | Matrix-L | 2 (A x B) | 矩形网格 (Table) | 最基础类型，如：任务分配 (人 vs 任务) |
| **T型** | Matrix-T | 3 (A x B, A x C) | 双翼结构 (Dual-Wing) | 两组不同因素关联到同一组核心因素 |
| **Y型** | Matrix-Y | 3 (A x B x C) | 立体/三角 (Cube/Tri) | 三组因素构成立体循环关联 |
| **X型** | Matrix-X | 4 (A x B, B x C...) | 十字结构 (Cross) | 四组因素两两相对关联 |

### 1.2 符号系统 (Symbology)
标准符号及其对应的权重值（用于计算得分）：
- **◎ (Double Circle)**: 强相关 (Strong, Weight=5 or 9)
- **○ (Circle)**: 中相关 (Medium, Weight=3)
- **△ (Triangle)**: 弱相关 (Weak, Weight=1)
- **Empty**: 无相关 (None, Weight=0)

---

## 2. DSL 规范设计 (DSL Specification)

为了适配复杂的 T/Y/X 型，DSL 必须采用 **“轴 (Axis)” + “关系 (Matrix)”** 分离定义的模式，而非简单的二维数组。

### 2.1 推荐 DSL 结构
采用兼容性设计，支持“基础模式”和“权重模式”混用。

```yaml
# 1. 元数据定义
Title: 产品功能与客户需求分析矩阵
Type: T  # L, T, Y, X
Relation: Strong(◎:9), Medium(○:3), Weak(△:1)

# 2. 轴定义 (Axes)
# 标准格式: Axis: [ID], [Label]
# 列表项格式: - [ItemID], [ItemLabel], [Weight](Optional)

Axis: a, 客户需求 (Customer Requirements)
# 混合写法示例：
- a1, 价格低廉, 50   # 显式指定权重为 50
- a2, 使用便捷, 30   # 显式指定权重为 30
- a3, 外观时尚       # 未指定，默认权重为 1

Axis: b, 产品功能 (Product Features)
- b1, 成本控制模块
- b2, 一键操作UI
- b3, 工业设计外壳

Axis: c, 竞品分析 (Optional for L)
- c1, 竞品A
- c2, 竞品B

# 3. 关系定义 (Matrices)
# 格式: Matrix: [RowAxis] x [ColAxis]
Matrix: a x b
# 数据行: [RowItemID]: [ColItemID]:[Symbol], ...
a1: b1:◎, b2:△
a2: b2:◎, b1:○
a3: b3:◎

Matrix: a x c
a1: c1:○, c2:○
a2: c1:◎
```

### 2.2 优势分析
- **解耦性**：轴的定义与关系定义分离，修改轴内的文字或增删项目不影响关系数据的解析结构。
- **扩展性**：对于 X 型图，只需增加 `Axis: d` 和 `Matrix: c x d` 即可，无需重构解析器。
- **可读性**：保留了类似 YAML 的缩进结构，符合工程师直觉。

---

## 3. 复杂多维表格与 DSL 的转换关系

### 3.1 核心数据结构 (Core Data Structure)
无论何种类型的矩阵图，在内存中都应标准化为以下结构：

```typescript
type SymbolType = 'strong' | 'medium' | 'weak' | 'none';

interface MatrixAxis {
    id: string;
    label: string;
    items: { id: string; label: string; weight?: number; }[];
}

interface MatrixCell {
    rowId: string;
    colId: string;
    symbol: SymbolType;
}

interface MatrixData {
    axes: Record<string, MatrixAxis>; // Map<AxisID, Axis>
    matrices: {
        rowAxisId: string;
        colAxisId: string;
        cells: MatrixCell[];
    }[];
}
```

### 3.2 转换算法挑战
- **多维映射**：
    - **L型**：直接映射为 `RowAxis` (左) 和 `ColAxis` (上)。
    - **T型**：`Axis A` (中列)，`Axis B` (左翼)，`Axis C` (右翼)。需要计算三组 SVG 坐标系。
    - **Y型/X型**：这是难点。通常不使用 Canvas 进行透视变换，而是使用 **"展开平面投影"**。
        - **Y型**：画成三个互成 120 度的扇形区域，或者标准的立方体展开图。建议初期仅支持 **立方体展开 (Cube Unfolded)** 模式，即三个 L 型拼接，便于 SVG 矩形计算。

---

## 4. 开发亮点与算法可行性

### 4.1 SVG 动态网格系统 (Dynamic SVG Grid System)
**挑战**：不同轴的项目数量差异巨大（如 A轴 50 项，B轴 5 项），导致网格极其细长或扁平。
**方案**：
- **自适应单元格 (Adaptive Cell)**：单元格宽高不固定，通过 `TextLength` 动态计算 `MinHeight`。
- **虚拟滚动 (Virtual Scroll)**：对于超过 50x50 的大矩阵，仅渲染可视区域内的 Cell (React Window 思路)，但这在 SVG 中较难实现。初期建议采用 **Canvas** 进行高性能渲染，或限制 SVG 节点数量。考虑到是报表工具，**全量 SVG** 更适合导出，但需优化 DOM 结构。

### 4.2 符号快速录入 (Quick Entry Interaction)
**亮点**：解决传统 Excel 录入符号困难的问题。
**方案**：
- **键盘快捷键**：
    - `1` / `S` -> ◎ (Strong)
    - `2` / `M` -> ○ (Medium)
    - `3` / `W` -> △ (Weak)
    - `0` / `Delete` -> 清除
- **批量刷写 (Paint Mode)**：按住 Shift 鼠标拖拽划选区域，批量填充符号。

### 4.3 智能权重计算 (Auto-Weighting)
系统可自动根据符号权重计算 **"得分"**：
- `Score(Row_i) = Sum(Weight(Symbol) * Factor(Col_j))`
- 这使得矩阵图不仅仅是展示工具，更是**决策量化工具**。

---

## 5. 用户体验与功能设计 (User Experience & Functional Design)

本章节详细阐述基于“渐进式披露（Progressive Disclosure）”原则的交互设计方案，旨在平衡普通用户的易用性与专业用户的深度需求，确保数据完整性。

### 5.1 典型用户故事 (User Story)
> **场景**：作为一名采购经理，我需要对比 3 家供应商的各项能力。初期我只需简单的勾选（好/坏），但在汇报时，领导要求根据“价格”和“质量”的不同重要性，给出一个量化的排名。

### 5.2 渐进式使用流程 (Progressive Workflow)

#### 阶段一：标准模式 (Standard Mode) - 只看关系
用户此时不需要关注权重，界面保持最简。
1.  **输入 DSL**：用户输入标准的 L 型矩阵数据。
2.  **视觉反馈**：界面仅展示符号（◎/○/△），不显示任何分值列。不显示权重输入框。
3.  **心理模型**：这是一个“定性分析”工具。

#### 阶段二：启用量化分析 (Enable Scoring)
用户需要计算得分。
1.  **操作**：点击工具栏上的 **[🧮 开启计分] (Enable Scoring)** 开关。
2.  **界面变化**：
    *   表格右侧（或底部）滑出 **“得分 (Score)”** 汇总列。
    *   此时默认所有权重均为 `1`，得分为符号计分之和。
    *   轴标签旁边出现隐蔽的编辑小图标 `✎` 或悬停提示“点击设置权重”。

#### 阶段三：配置权重 (Configuring Weights)
用户需要精细化控制。
1.  **操作**：用户点击 DSL 编辑器中的 **[插入权重]** 辅助按钮，或直接修改 DSL。
2.  **DSL 变更**：
    ```yaml
    # Before
    - a1, 价格低廉
    # After (用户手动输入或GUI回填)
    - a1, 价格低廉, 50
    ```
3.  **实时计算**：随着权重的输入，右侧“得分”列实时跳动更新。
4.  **完整性校验**：
    *   若用户只给部分项加了权重，系统会给未填项默认补 `1`，并在界面显示黄点提示 `⚠️ 部分权重使用默认值 1`，确保计算逻辑永远闭环。

### 5.3 详细功能规约

#### A. 数据完整性防线 (Data Integrity)
| 场景 | 系统行为 | 目的 |
| :--- | :--- | :--- |
| **权重缺省** | 默认为 `1` | 保证乘法运算永远有效 (Safe Math) |
| **非法字符** | DSL 解析器自动过滤非数字，回退为默认值，并标记波浪线错误 | 防止 `NaN` 错误 |
| **归一化建议** | 若这组权重之和 > 100 或 < 1，仅在 Tooltip 提示，**不强制报错** | 尊重用户的自定义评分体系 (如 5分制) |

#### B. 可视化反馈 (Visual Feedback)
1.  **权重可视化**：
    *   在轴标签下方或旁侧，用浅灰色小字显示 `W: 50`。
    *   (进阶) 背景色条长度代表权重占比，直观展示“哪个因素最重要”。
2.  **得分可视化**：
    *   **排序功能**：点击“得分”表头，可按分数自动重排矩阵行顺序，辅助决策。
    *   **极值高亮**：最高分自动标绿，最低分标红。

### 5.4 绘图区展示规范 (Drawing Area Visualization)

在 SVG/Canvas 绘图区域中，除了标准的网格符号外，通过以下视觉元素呈现量化数据：

#### A. 权重指示器 (Weight Indicators)
位于行列标题（Axis Labels）区域。
*   **文本展示**：在标签文字后方，以更细字号、更低灰度显示 `(w:10)`。
*   **视觉隐喻**（可选）：在标签单元格边缘绘制一条深浅或粗细不同的“权重条（Weight Bar）”，直观传达权重占比。

#### B. 得分仪表盘 (Score Dashboard)
对于 L 型图，在矩阵最右侧（或最下方）增加 **“综合得分区”**。
*   **数字展示**：大号字体显示总分。
*   **数据条 (Data Bars)**：在得分单元格背景中绘制半透明的数据条（类似 Excel 条件格式），长度 = `CurrentScore / MaxScore`。这能让用户一眼看出原本枯燥数字的差异。
*   **极值标记**：自动给最高分行的背景色添加淡绿色高亮。

#### C. T/Y/X 型的特殊处理
*   **T 型**：作为“双翼图”，左翼和右翼分别计算得分。得分列应贴近 `Axis A`（中心轴），形成 `Score_Left | Axis A | Score_Right` 的布局，方便对比中心因素在两个维度下的综合表现。

### 5.5 最终交付物形态 (User Interface Spec)

```text
[ Toolbar ]
[ ] Enable Weights  [ ] Auto Sort by Score

-------------------------------------------------------------------
| Factors (Axis A)     |  Axis B (Product Features)       | Score |
|                      |  b1(Low Cost) | b2(Design)       |       |
|                      |  (w:40)       | (w:60)           |       |
-------------------------------------------------------------------
| a1 (Price)    (w:10) |      ◎ (5)    |     △ (1)        | [==]260
-------------------------------------------------------------------
| a2 (Quality)  (w:20) |      ○ (3)    |     ◎ (5)        | [====]420
-------------------------------------------------------------------
```
通过**数字+图形**的双重编码，确保绘图区既精确又直观。

---

## 6. 实施路线图 (Roadmap)

---

## 6. 几何布局与渲染规范 (Geometry & Layout Specification)
本章节根据标准 QC 图例定义四种矩阵图的几何拓扑结构与坐标系。

### 6.1 L 型 (L-Matrix)
*   **结构**：基础二维表格。
*   **布局逻辑**：
    *   **Header**: 左上角表头分割线（Diagonal Line），左下为 `Axis B Label`，右上为 `Axis A Label`。
    *   **Grid**: `Row(B) x Col(A)` 的笛卡尔网格。

### 6.2 T 型 (T-Matrix)
*   **结构**：双翼共轴结构（Dual-Wing sharing Axis A）。
*   **布局逻辑**：
    *   **Axis A (Center)**: 垂直居中，自下而上（或自上而下）排列。
    *   **Axis B (Left)**: 位于左侧，与 A 形成 `B x A` 网格。注意 B 的列头通常位于底部。
    *   **Axis C (Right)**: 位于右侧，与 A 形成 `A x C` 网格。
*   **空间关系**：`[Left Grid (B)] - [Center Axis (A)] - [Right Grid (C)]`。

### 6.3 Y 型 (Y-Matrix)
*   **结构**：3D 立方体等轴测投影 (Isometric Cube Projection)。
*   **布局逻辑**：
    *   **坐标系**：基于 30°/150°/270° 的三轴坐标。
    *   **面 (Faces)**：
        *   **Top Face**: Axis A vs Axis B
        *   **Left Face**: Axis B vs Axis C
        *   **Right Face**: Axis C vs Axis A
    *   **循环流**：数据流向需闭环 (`a->b->c->a`)。

### 6.4 X 型 (X-Matrix)
*   **结构**：四象限环形结构 (4-Quadrant Ring)。
*   **布局逻辑**：
    *   **中心**：无效区域或标题区。
    *   **四轴分布**：Top(A), Right(C), Bottom(D), Left(B)。
    *   **交互网格**：
        *   Top-Left: B vs A
        *   Top-Right: A vs C
        *   Bottom-Right: C vs D
        *   Bottom-Left: D vs B
*   **注意事项**：轴的索引顺序通常由中心向外递增（或反之），需统一规范以保证数据对应正确。

---

## 7. 实施路线图 (Roadmap)
2.  **Phase 2 (Interaction)**: 实现快捷键录入与符号切换。
3.  **Phase 3 (X/Y Type)**: 攻克复杂布局，支持 3D 展开视角的 Y 型图。
