---
doc_id: IQS-MCP-DETERMINISTIC-LAYOUT-DESIGN-R28
title: G6 图表全景渲染缺陷诊断、关联图因果代数拓扑算法重构与全组件确定性布局设计（R28）
project: 澄矩 · ChengJu (IQS)
version: v1.0
domain: MCP
type: DESIGN
authority: L2
freshness: 🟢现行
first_commit: 2026-10-27
last_commit: 2026-10-27
supersedes: []
superseded_by: []
related:
  - docs/PROJECT_INDEX.md
  - docs/IQS_MCP_DESIGN_DUAL_ENGINE_AUDIT_R26.md
  - docs/IQS_MCP_ENGINE_HARDENING_R27.md
  - docs/flow/review/FLOW_AUDIT_FINDINGS.md
---

# G6 图表全景渲染缺陷诊断、关联图因果代数拓扑算法重构与全组件确定性布局设计（R28）

| 标签 | 值 |
| :--- | :--- |
| **轮次** | R28（承接 R26/R27，本轮登记 `AUD-170..174`） |
| **软件版本** | `V3.5.3-ildr`（`chengju-iqs`） |
| **出品** | 江西省上饶市烟草专卖局（公司）信息中心 · 鹿溪联合创新实验室（LUXI Lab） |
| **性质** | 针对 PDPC 图截取残缺根因分析、全组件视口排查报告与关联图纯数学拓扑重构方案 |

---

## 1. 缺陷复现与根因深度剖析

### 1.1 实测样本复核：`render_2026-10-27_07-37-13_vtad2v.png` 残缺现象

对 `mcp-server/renders/render_2026-10-27_07-37-13_vtad2v.png`（3600×2640 分辨率，即 1200×800 @ 3x）的像素与源码回溯发现：
整张图片仅截取到了画布左上角的极小局部（仅见图表标题与巨大化的首节点“下达割接停机指令”），其余 80% 以上的节点和连线被抛到了视口右侧和下方，呈现严重的“放大残缺”现象。

### 1.2 根因定位：为什么 PDPC 图只截取到了左上角一小部分？

通过对 `components/PDPCDiagram.tsx` 源码与 G6 v5 渲染管线的单步审计，定位到两个根本性技术硬伤：

#### 根因 1：`graph.render()` 与 `fitView()` 异步脱节（关键主因）
在 `PDPCDiagram.tsx` 第 264–273 行：
```typescript
graphRef.current.setData({ nodes: g6Nodes, edges: g6Edges, combos: g6Combos });
graphRef.current.setLayout(layoutConfig);
graphRef.current.render(); // ⚠️ 异步执行 Dagre 布局与渲染
graphRef.current.fitView({ padding: 40, duration: 500 }); // ⚠️ 同步立即触发视口适应
```
- **机制机制**：G6 的 `layout: { type: 'dagre' }` 依赖 Dagre 算法进行拓扑分层。布局计算本身是异步多微任务推进的。
- **灾难时序**：在 `graph.render()` 刚被触发、Dagre 布局尚未计算完成时，各节点 `x, y` 坐标仍在初始默认位置（或收缩在左上角），下一行的 `fitView` 立即以旧坐标执行了视口适配计算；等 50ms 后 Dagre 真正把节点展开到宽度 2000px、高度 1500px 时，视口却停留在未完成时的局部变换矩阵上，不再自适应！

#### 根因 2：`getDataURL` 时缺少绘制帧同步刷新
在 `PDPCDiagram.tsx` 第 28–36 行：
```typescript
if (options?.width && options?.height) {
    graphRef.current.setSize(options.width, options.height);
    graphRef.current.fitView({ padding: 40 } as any);
}
const graphCanvasData = await graphRef.current.toDataURL(...);
```
- 在同一次 JavaScript 任务微循环内，紧接着调用 `setSize`、`fitView` 后，直接执行 `toDataURL`。由于 Canvas 渲染管线的批处理刷新机制，当前视口变换矩阵尚未真正提交至 `<canvas>` 绘图缓冲区，导致导出的画面停留在脏帧或初始放大帧。

---

## 2. 全仓 16 类图表无头截帧确定性排查矩阵

对全仓组件逐一进行生命周期排查，分类结论如下：

| 图表类型（kind） | 底层引擎 | 是否存在异步布局未收敛？ | 是否存在缓动动画截帧干扰？ | 现状风险评估 |
| :--- | :--- | :---: | :---: | :--- |
| **`flow`** | 自研纯 TS | ❌ 无（纯数学计算） | ❌ 无 | 🟢 进程内原生直出，绝对确定，0 风险 |
| **`matrix` / `matrixPlot`** | 纯 SVG / Canvas | ❌ 无（同步计算） | ❌ 无 | 🟢 显式矩阵映射，0 风险 |
| **`radar` / `arrow`** | 纯 SVG | ❌ 无（纯三角函数） | ❌ 无 | 🟢 几何代数解析，0 风险 |
| **`affinity` / `control`** | Canvas 2D 手绘 | ❌ 无（同步绘制） | ❌ 无 | 🟢 纯同步无动画，0 风险 |
| **`fishbone`** | G6 v5 | ❌ 无（静态分形树） | ⚠️ 原有 500ms（R27 已清零） | 🟢 现无头 `duration: 0`，安全 |
| **`pdpc`** | G6 v5 (Dagre) | 🔴 **严重（未等 layout 完成）** | 🔴 **严重（有 500ms 缓动）** | 🔴 **当前阻断性残缺，需立即修复** |
| **`relation`** | G6 v5 (Force/Dagre) | 🔴 **严重（力导向异步迭代）** | 🔴 **严重（有 500ms 缓动）** | 🔴 **当前高度残缺与不可预测** |
| **`pareto` / `histogram` / `scatter` / `basic`** | ECharts 5.5 | ❌ 无（同步 `setOption`） | 🟡 **有默认 1000ms 入场动画** | 🟡 **需在无头模式注入 `animation: false`** |
| **`mermaid` / `vchart`** | 救济层三方引擎 | 🟡 异步渲染（已设 220ms 延时） | 🟡 需确保最终状态定格 | 🟡 稳定等待时间基本够用，需硬指标兜底 |

---

## 3. 关联图（Relation Diagram）算法重构：基于因果代数的确定性拓扑投影

用户指出：*“关联图在点位布局方面需要进行大量路径尝试计算，可能导致截取一部分。需站在优雅工程与数学方法层面解决。”*

### 3.1 现存力导向算法（Fruchterman-Reingold）的根本缺陷

当前 `RelationDiagram.tsx` 的自由模式使用 G6 `fruchterman` 物理引擎：
1. **收敛漫长且异步脱节**：力导向算法基于带电粒子库仑斥力与弹簧胡克引力的多次退火迭代（需 300–1000 次迭代，耗时 500ms~2s）。无头渲染等不及迭代收敛，直接截取到了初始随机位置或收缩爆炸过程中的中间帧；
2. **非确定性（Non-deterministic）**：初始随机种子微小差异即导致布局剧烈旋转、镜像，完全丧失工业可重现性；
3. **脱离 QC 因果业务逻辑**：物理力导向只管几何距离均匀，完全不懂 QC 关联图“从末端根因向核心症结汇聚”的因果指向流。

### 3.2 优雅数学解法：代数因果拓扑排序与极坐标映射引擎（Causal Algebraic Engine）

针对 QC 关联图的业务本质，完全抛弃不可控的异步物理力导向插件，采用**确定性代数因果拓扑算法**，在 **5ms 纯数学计算**内完成确定性坐标解析。

#### (1) 数学模型：节点因果通量（Causal Net Flux）
对有向图 $G=(V, E)$，定义每个节点的**净因果通量**：
$$C(v) = \deg^+(v) - \deg^-(v)$$
- $\deg^+(v)$：出度（作为原因，引发其他后果的能力）；
- $\deg^-(v)$：入度（作为后果，被其他原因引发的频次）。
- 节点分类：
  - $C(v) > 0$ 且 $\deg^-(v) = 0$：**末端根本原因（Root Causes）**；
  - $C(v) \approx 0$：**中间传导因素（Intermediate Factors）**；
  - $C(v) < 0$ 且 $\deg^+(v) = 0$：**核心症结（Key Problems / Symptoms）**。

#### (2) 方向型布局（Directional）：基于最长链因果分层（Longest Path Stratification）
1. **分层算法**：
   - 提取所有源节点（入度为 0）放置在第 0 列（$X_0$）；
   - 对其余节点按反向因果最长路径赋值阶数（Rank）：
     $$\text{Rank}(v) = \max_{(u, v) \in E} (\text{Rank}(u) + 1)$$
   - 若存在回路（Cycles），根据因果通量切断反向弱边；
2. **列内重排（Barycenter 质心降交叉）**：
   - 每一列的节点按其左侧相连节点的平均 $Y$ 坐标重排，使得连线交叉数（Edge Crossings）最小；
3. **确定性落格**：
   - $X(v) = \text{Rank}(v) \cdot \Delta X$
   - $Y(v) = \text{OrderInCol}(v) \cdot \Delta Y$

#### (3) 中央型布局（Centralized）：同心圆因果投影（Concentric Causal Radial Projection）
1. **中心锚定**：以净入度最高（最严重症结）的节点作为绝对极坐标原点 $(0, 0)$；
2. **半径分层**：节点到核心症结的最短因果距离定义同心环半径：
   $$r(v) = d(v, \text{Center}) \cdot \Delta R$$
3. **极角解析分布**：
   - 相同半径环上的节点按极角 $\theta_i = \frac{2\pi}{N_r} \cdot i$ 均匀分布，结合连接边的极角吸引力进行微调松弛；
   - 坐标解析直出：
     $$x = x_0 + r(v) \cos(\theta), \quad y = y_0 + r(v) \sin(\theta)$$

#### (4) 工程落地价值
- **零等待**：纯代数计算在纯 JavaScript 中执行耗时 $<3\text{ms}$；
- **零异步插件**：将算出的 $(x, y)$ 直接注入 `nodes`，在 G6 中设置 `layout: undefined`！
- **绝对确定性**：相同 DSL 输入，产出的每个节点坐标精确到 0.01px，`fitView` 一次性完美包围全图。

---

## 4. 实施规划与步骤（Phase 1–3）

### Phase 1：PDPC 图与 G6 组件 `fitView` 异步生命周期止血
1. **`PDPCDiagram.tsx` 改造**：
   - 监听 G6 布局完成事件：通过 `await graph.render()` 或 `graph.on('afterlayout')` 触发 `fitView`；
   - 无头模式下强制 `duration: 0`；
   - 在 `getDataURL` 时增加帧等待，确保 `setSize` 与 `fitView` 彻底上屏后再调用 `toDataURL`。
2. **ECharts 系列组件排查**：
   - 在 `isHeadless` 模式下，统一在各 ECharts 图表的 `setOption` 中注入 `animation: false`，彻底消除 1000ms 入场缓动对截图的干扰。

### Phase 2：关联图（Relation Diagram）因果代数拓扑算法落地
1. 在 `utils/relationGraph.ts` 中实现纯数学的因果拓扑分层（方向型）与同心圆因果极坐标算法（中央型）；
2. 改造 `RelationDiagram.tsx`，将纯数学计算结果直接赋予各节点，移除不可靠的异步力导向布局，实现同步瞬时加载与全景定格。

### Phase 3：全组件无头确定性截帧回归与门禁测试
1. 执行全量 16 类图表的无头出图测试；
2. 验证生成的各 PNG 分辨率与画面完整度（确保全景完整，无任何局部残缺）。
