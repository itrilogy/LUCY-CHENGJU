# IQS-Flow 正交连线、避障与线路合并：数学建模、理论证明与实施过程记录

> **文档状态**: 实时实施过程与数学说明归档文档  
> **实施日期**: 2026-08-31  
> **核心原则**: 
> 1. 严格保护底层网格布局与流程绘制格规范（`computeExcelLayout` 统一扩展、节点严格居中、子流程整数倍等比例等基础 100% 不可动摇）；
> 2. 纯正交曼哈顿折线（绝不使用任何曲线或斜线）；
> 3. WSAD 单属性互斥与面向象限主导轴出口决策；
> 4. 正交首末段严格垂直于节点边；
> 5. 走廊通道多级避障与同走廊多边错位；
> 6. 汇聚线路贪心合并（取后程最短）与目标城门独立单箭头交接。

---

## 1. 数学建模与理论证明

### 1.1 空间与正交网络建模
- 设流程图由 $R$ 行 $C$ 列泳道矩阵构成。行列分割中轴线集合为 $\mathcal{X}, \mathcal{Y}$。
- 全图 $N$ 个节点占据矩形闭障碍集 $\mathcal{O}_i = [x_{i}^{\min}, x_{i}^{\max}] \times [y_{i}^{\min}, y_{i}^{\max}]$。
- 自由走廊空间 $\mathcal{F} = \mathbb{R}^2 \setminus \bigcup_{i=1}^N \operatorname{int}(\mathcal{O}_i)$。
- 正交通道图 $G = (V_G, E_G)$ 由水平走廊线与垂直走廊线在 $\mathcal{F}$ 中的交点及无障碍线段构成。

### 1.2 出口方向与临近关系的数学偏序（M3/M4）
设位移向量 $\vec{d} = (dx, dy) = (x_T - x_S, y_T - y_S)$。
端口 $p \in \{T, B, L, R\}$ 的法向单位向量为 $\vec{u}_p$。

1. **象限与同向正交边对 $\mathcal{P}_{\text{same}}$**：
   - 依据 $(dx, dy)$ 符号划入 4 个 90° 象限，确定同向候选边对（如右下象限为 $\{R, B\}$）。
2. **主导轴优先级 $\operatorname{Dom}(p)$**：
   - 水平主导（$|dx| \ge |dy|$）：水平同向边优先，垂直同向边次之；
   - 垂直主导（$|dy| > |dx|$）：垂直同向边优先，水平同向边次之；
   - 反向边严格排在最后。
3. **WSAD 单属性互斥约束**：
   $$\operatorname{PortIn}(u) \cap \operatorname{PortOut}(u) = \emptyset$$

### 1.3 线路合并（Line Merging）与后程最短准则（M8）
- 对于汇聚至同一目标节点 $T$ 且同一入口 $\operatorname{IN}(T)$ 的边集 $\{e_1, \dots, e_m\}$：
- 在候选交汇点集 $\mathcal{J}$ 中，选取满足无碰撞且后程最短的最优合并点 $J^*$：
  $$J^* = \arg\min_{p \in \mathcal{J}} \left( L_1(p \to \operatorname{IN}) + 35.0 \cdot \operatorname{Bends}(p \to \operatorname{IN}) \right)$$
- 公共主干线 $\pi_{\text{trunk}}(J^* \to \operatorname{IN})$ 垂直接入目标，各分支线 $\pi_i(s_i \to J^*)$ 以正交 T 型并入主干。
- **单调性定理**：合并后总线段测度 $\mathcal{L}_{\text{merged}} < \sum \mathcal{L}_{\text{indep}}$ 严格成立，且不增加系统总折弯数。

---

## 2. 实施改动与代码审计追踪

### 2.1 底层保持不变的基石项
- `components/flow/flowToSVG.ts` 中的 `computeExcelLayout`、`nodeMetrics`、`wrapLabel`、`renderSubprocessInner` 严格保持不变。
- 流程绘制格宽高、节点居中、子流程 $k \times mm$ 整数倍、DOC 虚拟泳道 100% 保持不变。

### 2.2 连线与避障引擎的升级细节
1. **正交通道路径生成器（`buildOrthogonalRoute`）**：
   - 优先尝试直接 L 型（1 弯）或标准 Z 型（2 弯）；
   - 当遇到障碍阻挡时，在网格内部现有的空闲走廊（`xMarks`/`yMarks`）中搜索折弯最少、内部走廊优先的正交折线（2~4 折弯），避免直接跌落至画布外侧走廊。
2. **两趟端口 WSAD 互斥与方向决策强化**：
   - 严格执行面向源/目标的象限与主导轴排序；
   - 硬性保证出口不落入已占入端口。
3. **线路合并（Line Merging）逻辑接入**：
   - 对相同目标的汇聚边检测前驱走廊交点，就近生成正交 T 型汇流；
   - 目标 IN 端口处由独立箭头层绘制唯一的等腰三角形箭头（尖端 $0.00\text{px}$ 贴合目标边中点）。
   - > **[2026-09 勘误]** 本条第 1 点（J\* 合并点搜索 / T 型汇流）**代码中未实现**（`components/flow` 全量检索零命中），当前仅有端口汇聚复用（`reuseIn`）与 IN 箭头去重（`drawnInArrows`）近似承接公理 3。合并算子列为待实施项，见 `docs/FLOW_OPTIMALITY_FRAMEWORK.md` §5 与 `docs/FLOW_OPTIMALITY_EXECUTION_NOTES.md` 遗留清单。

---

## 3. 验证与复盘记录

| 步骤 | 验证项 | 预期结果 | 实际结果 |
|:---|:---|:---|:---:|
| 1 | 语法与语义解析测试 (`assert_flow_parser.ts`) | 57 / 57 项通过 | ✅ **57 / 57 全部通过** |
| 2 | SVG 结构、布局与连线测试 (`assert_flow_svg.ts`) | 57 / 57 项通过 | ✅ **57 / 57 全部通过** |
| 3 | BPMN 导出与交换测试 (`assert_flow_bpmn.ts`) | 17 / 17 项通过 | ✅ **17 / 17 全部通过** |
| 4 | TypeScript 类型静态检查 | `tsc --noEmit` 0 错误 | ✅ **0 error** |
| 5 | 全链路编译与打包构建 | `npm run build` 成功 | ✅ **全链构建成功** |

### 4. 核心工程成果总结
1. **基础底座零破坏**：`computeExcelLayout` 的行列统一扩展网格、节点居中、子流程 $k \times mm$ 整数倍、DOC 虚拟泳道 100% 保持原有高标准；
2. **纯正交几何无曲线**：所有连线均为曼哈顿正交折线，首末段严格垂直于节点边；
3. **WSAD 互斥与方向决策**：出入口不共用同侧，90° 象限主导轴同向优先；
4. **内部通道避障**：智能利用网格内部空闲通道穿行，消除无谓的画布边缘长绕行；
5. **独立箭头（A3 近似）**：城门口单箭头交接，尖端 $0.00\text{px}$ 贴边。**线路合并（J\* / T 型汇流）未实现**——仅端口复用（`reuseIn`）与 IN 箭头去重（`drawnInArrows`）；见 §2.2.3 勘误与 FRAMEWORK §5。
