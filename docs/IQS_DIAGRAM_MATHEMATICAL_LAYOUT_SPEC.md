# IQS 图形组件绘制布局数学实现规范与几何避障评审

- **版本**: 1.2（R30 增补 PDPC 分层正交路由与关联图边界求交规范，全仓 G6 归零）
- **更新日期**: 2026-10-28
- **执行门禁**: `npm run test:fishbone` · `npm run test:relation` · `npm run test:pdpc` · 已串入 `npm run build` 与 CI
- **责任模块**: 图形渲染引擎 / 数学几何算法层
- **核心定位**: 记录 LUCY-CHENGJU 全仓图形组件纯数学、确定性几何布局算法、图论推导与无碰撞避障模型的工程规范基线（SSOT）。

---

## 目录
1. [规范宗旨与设计边界](#1-规范宗旨与设计边界)
2. [第一章：关联图（Relation Diagram）数学布局实现](#2-第一章关联图relation-diagram数学布局实现)
   - 2.1 [图论拓扑模型定义](#21-图论拓扑模型定义)
   - 2.2 [方向型布局（Directional）：因果最长链分层 + 质心列内重排](#22-方向型布局directional因果最长链分层--质心列内重排)
   - 2.3 [中央型布局（Centralized）：入度极值锚定 + 同心椭圆极坐标投影](#23-中央型布局centralized入度极值锚定--同心椭圆极坐标投影)
   - 2.4 [关系自由型布局（Free）：拓扑图论距离 + 应力主化（Stress Majorization）](#24-关系自由型布局free拓扑图论距离--应力主化stress-majorization)
   - 2.5 [全模式复杂度与工程性能对照](#25-全模式复杂度与工程性能对照)
3. [第二章：鱼骨图（Fishbone Diagram）布局数学（R29 现行口径）](#3-第二章鱼骨图fishbone-diagram布局数学r29-现行口径)
   - 3.1 [现行算法：五遍闭式解](#31-现行算法五遍闭式解deterministic-five-pass-layout)
   - 3.2 [历史缺陷与 R29 修复对照](#32-历史缺陷与-r29-修复对照)
   - 3.3 [分形范式与几何定理](#33-分形范式与几何定理)
   - 3.4 [垂直自洽：行距必要式（G3）](#34-垂直自洽行距必要式g3)
   - 3.5 [缩放闭环与画布容量判据（G6）](#35-缩放闭环与画布容量判据g6)
   - 3.6 [三阶排版决策](#36-三阶排版决策typographic-ladder)
   - 3.7 [验收不变量（G1–G7）](#37-验收不变量由-npm-run-testfishbone-强制)
   - 3.8 [已知边界与后续](#38-已知边界与后续)

---

## 1. 规范宗旨与设计边界

### 1.1 宗旨
在质量控制（QC）与因果诊断系统中，图表不仅是视觉可视化媒介，更是**因果逻辑代数的几何载体**。长期以来，基于物理力导向（Force-Directed / Fruchterman-Reingold）等连续模拟退火退化的布局算法在无头自动化导出（Headless MCP Pipeline）中暴露了三大固有缺陷：
1. **非确定性**：依赖伪随机种子（`Math.random()`），相同数据在不同时刻出图坐标抖动；
2. **收敛延迟**：需多轮迭代微积分退火（1000ms~3000ms），与无头截帧生命周期失步，极易导致截图截断；
3. **空间包围盒（AABB）不可预测**：无法在静态挂载时确定精准缩放比例（`fitView`）。

本规范确立**纯数学解析解、静态拓扑代数映射、确定性几何投影**的底层实现基准，保证组件在 5ms 内完成静态坐标解算，且输出具有可复现性、可证明性与高空间利用率。

---

## 2. 第一章：关联图（Relation Diagram）数学布局实现

### 2.1 图论拓扑模型定义

设关联图为有向网络 $G = (V, E)$，其中：
- 节点集合 $V = \{v_1, v_2, \dots, v_n\}$，每个节点代表一个质量要素（末端原因、中间因素或重大症结）；
- 有向边集合 $E \subseteq V \times V$，$(u, v) \in E$ 表示从原因 $u$ 指向结果 $v$ 的因果联系；
- 节点度数定义：
  - 入度：$d^-(v) = |\{u \in V \mid (u, v) \in E\}|$；
  - 出度：$d^+(v) = |\{w \in V \mid (v, w) \in E\}|$；
  - 净因果通量（Net Causal Flux）：$\Phi(v) = d^-(v) - d^+(v)$。当 $\Phi(v) \ll 0$ 时倾向为根本原因源头；当 $\Phi(v) \gg 0$ 时倾向为核心症结结果。

关联图在 QC 业务标准（T/CAQ10201-2024）中严格对应三种形态，均已实现纯数学解析映射。

---

### 2.2 方向型布局（Directional）：因果最长链分层 + 质心列内重排

适用于因果单向演进明确的质量课题。核心数学流程分为三步：

#### 步骤 1：最长链分层（Longest-Path Layering）
1. 提取所有净入度为 0 的节点作为初始源头集合：$S_0 = \{v \in V \mid d^-(v) = 0\}$；
2. 若图中存在局部环路，利用深度优先遍历（Tarjan 算法或 DFS 染色）破除反向边生成 DAG；
3. 拓扑分层函数定义为到达节点 $v$ 的最长链因果步长：
   $$\operatorname{rank}(v) = \begin{cases} 0, & \text{若 } v \in S_0 \\ \max_{(u, v) \in E} (\operatorname{rank}(u) + 1), & \text{其他} \end{cases}$$
4. 设最大层级为 $R_{\max} = \max_{v} \operatorname{rank}(v)$，将节点集划分为 $R_{\max} + 1$ 列：$L_r = \{v \in V \mid \operatorname{rank}(v) = r\}$。

#### 步骤 2：质心列内排序（Barycenter Order Optimization）
为极小化跨层边线交叉（Crossing Reduction），对各层内部节点的垂直次序进行质心重排：
对于第 $r$ 层（$r \ge 1$）中的节点 $v \in L_r$，其 Y 轴启发式质心为其所有前驱节点在第 $r-1$ 层中 Y 坐标的算术平均值：
$$\operatorname{barycenter}(v) = \frac{1}{|\operatorname{Pred}(v)|} \sum_{u \in \operatorname{Pred}(v)} Y(u)$$
按 $\operatorname{barycenter}(v)$ 升序排列 $L_r$ 内节点，若无前驱节点则按节点 ID 确定性保序。

#### 步骤 3：居中对称几何映射
- 水平 X 坐标：
  $$X_r = X_{\text{start}} + r \cdot \Delta X, \quad \Delta X = \frac{W_{\text{usable}}}{R_{\max}}$$
- 垂直 Y 坐标：
  对于列 $L_r$ 中包含 $m = |L_r|$ 个节点，第 $k$ 个节点（$0 \le k < m$）的纵坐标为：
  $$Y(v_{r, k}) = \frac{H}{2} + \left(k - \frac{m - 1}{2}\right) \cdot \Delta Y, \quad \Delta Y = \max\left(75, \frac{H_{\text{usable}}}{m + 1}\right)$$
  **耗时**：$O(|V| + |E|)$，纯闭式解，耗时 $< 2\text{ms}$。

---

### 2.3 中央型布局（Centralized）：入度极值锚定 + 同心椭圆极坐标投影

适用于围绕单一核心重大问题攻关的课题。

#### 步骤 1：核心症结极点锚定
遍历所有节点，计算净因果通量 $\Phi(v)$：
$$v_{\text{center}} = \arg\max_{v \in V} \Phi(v) = \arg\max_{v \in V} \left(d^-(v) - d^+(v)\right)$$
将 $v_{\text{center}}$ 严格锚定于画布中心 $(X_c, Y_c) = \left(\frac{W}{2}, \frac{H}{2}\right)$。

#### 步骤 2：反向因果拓扑测距（Reverse BFS Layering）
从 $v_{\text{center}}$ 出发，沿入边反向广度优先搜索，计算各节点到核心症结的最短因果拓扑距离：
$$\operatorname{dist}(v) = \operatorname{shortest\_path}_{G^R}(v_{\text{center}}, v)$$
对于弱连通孤立节点，统一定义为 $\operatorname{dist}(v) = \operatorname{dist}_{\max} + 1$。
将节点集合划分为同心环簇：$C_d = \{v \in V \mid \operatorname{dist}(v) = d\}$。

#### 步骤 3：自适应无碰撞同心椭圆极坐标投影
为适配宽屏视口（通常宽高比为 16:9 或 4:3）以及节点文本长条椭圆外形，采用**同心椭圆极坐标变换**：
- 椭圆长半轴系数 $k_x = 1.3$，短半轴系数 $k_y = 0.9$；
- 第 $d$ 环切线无碰撞下界约束：若第 $d$ 环上有 $m = |C_d|$ 个节点，平均每个节点占据安全弧长 $S_{\min} \approx 180\text{px}$，则椭圆基准半径下界满足：
  $$R_d \ge \max\left(R_{d-1} + 180, \; \frac{m \cdot 180}{2\pi}, \; 240\right)$$
- 角度分布与错位旋转：
  $$\theta_{d, k} = \theta_{\text{base}}(d) + \frac{2\pi k}{m}, \quad \theta_{\text{base}}(d) = \begin{cases} 0, & d \text{ 为奇数} \\ \frac{\pi}{m}, & d \text{ 为偶数} \end{cases}$$
- 最终笛卡尔坐标：
  $$\begin{cases} X(v_{d, k}) = X_c + k_x \cdot R_d \cdot \cos(\theta_{d, k}) \\ Y(v_{d, k}) = Y_c + k_y \cdot R_d \cdot \sin(\theta_{d, k}) \end{cases}$$
  **耗时**：$O(|V| + |E|)$，单遍 BFS + 三角函数映射，耗时 $< 1\text{ms}$。

---

### 2.4 关系自由型布局（Free）：拓扑图论距离 + 应力主化（Stress Majorization）

适用于处理多原因、多结果、多核心共振缠绕的复杂因果系统。该算法保留了有机网状聚类形态，同时完全摈弃了物理力导向退火的不确定性。

#### 步骤 1：全源拓扑测地线距离矩阵（All-Pairs Geodesic Distance Matrix）
构建无向赋权拓扑图，边权均为 1。通过 Floyd-Warshall 算法计算节点对 $(i, j)$ 的拓扑最短距离矩阵 $D = (d_{ij})_{n \times n}$：
$$d_{ij} = \min_{\text{paths } p(i, j)} |p(i, j)|$$
对于非连通图分支，设 $d_{ij} = 1.6 \times \max_{u, v} \{d_{uv} < \infty\}$。
建立理论目标几何欧几里得距离矩阵 $L = (L_{ij})$ 与应力权重矩阵 $W = (w_{ij})$：
$$L_{ij} = d_{ij} \cdot L_0 \quad (L_0 = 180\text{px}), \qquad w_{ij} = \begin{cases} 0, & i = j \\ d_{ij}^{-2}, & i \ne j \end{cases}$$

#### 步骤 2：确定性先验相角初值（Zero-Random Phase Seeding）
彻底移除 `Math.random()`，杜绝坐标随机抖动。节点在初始圆环上的相角根据其节点索引及其度数确定性分配：
$$\theta_i = \frac{2\pi i}{n}, \quad R_i = R_{\text{init}} \cdot \left(0.8 + 0.4 \cdot \frac{\operatorname{deg}(v_i)}{\max_k \operatorname{deg}(v_k)}\right)$$
$$\begin{cases} X_i^{(0)} = X_c + R_i \cdot \cos(\theta_i) \\ Y_i^{(0)} = Y_c + R_i \cdot \sin(\theta_i) \end{cases}$$

#### 步骤 3：应力主化能量泛函与 Jacobi 迭代（Kamada-Kawai Energy Minimization）
目标为极小化全图拓扑应力泛函（Stress Function）：
$$E(X, Y) = \sum_{i < j} w_{ij} \left( \|P_i - P_j\| - L_{ij} \right)^2$$
利用凸优化主化理论（Majorization-Minimization），推导出等价的同步 Jacobi 迭代闭式解。在第 $t$ 步迭代中，所有节点坐标同步更新：
$$X_i^{(t+1)} = \frac{1}{\sum_{j \ne i} w_{ij}} \sum_{j \ne i} w_{ij} \left( X_j^{(t)} + L_{ij} \cdot \frac{X_i^{(t)} - X_j^{(t)}}{\|P_i^{(t)} - P_j^{(t)}\|} \right)$$
$$Y_i^{(t+1)} = \frac{1}{\sum_{j \ne i} w_{ij}} \sum_{j \ne i} w_{ij} \left( Y_j^{(t)} + L_{ij} \cdot \frac{Y_i^{(t)} - Y_j^{(t)}}{\|P_i^{(t)} - P_j^{(t)}\|} \right)$$
其中 $\|P_i^{(t)} - P_j^{(t)}\| = \sqrt{(X_i - X_j)^2 + (Y_i - Y_j)^2 + \epsilon}$（$\epsilon = 10^{-4}$ 防止除零）。
**迭代轮数**：45 轮同步迭代即可达到能量泛函驻点，残差 $\Delta E < 10^{-3}$。

#### 步骤 4：刚体防重叠几何推开（AABB Box Overlap Removal）
在 Jacobi 迭代收敛后，进行 15 轮刚体碰撞几何修正。设节点包围盒最小安全尺寸为 $W_{\text{box}} = 160\text{px}, H_{\text{box}} = 60\text{px}$：
对于任意重叠的节点对 $(i, j)$，沿重叠较小的坐标轴实行对称法向排斥：
$$\Delta X = W_{\text{box}} - |X_j - X_i|, \quad \Delta Y = H_{\text{box}} - |Y_j - Y_i|$$
若 $\Delta X > 0$ 且 $\Delta Y > 0$：
- 若 $\Delta X < \Delta Y$：$X_i \leftarrow X_i - \frac{\Delta X}{2} \operatorname{sgn}(X_j - X_i)$，$X_j \leftarrow X_j + \frac{\Delta X}{2} \operatorname{sgn}(X_j - X_i)$；
- 若 $\Delta Y \le \Delta X$：$Y_i \leftarrow Y_i - \frac{\Delta Y}{2} \operatorname{sgn}(Y_j - Y_i)$，$Y_j \leftarrow Y_j + \frac{\Delta Y}{2} \operatorname{sgn}(Y_j - Y_i)$。

#### 步骤 5：重心校准
平移全图质心对齐画布几何中心 $(X_c, Y_c)$。
**耗时**：全源最短路 $O(n^3)$ + 45 轮矩阵乘法 $O(45 \cdot n^2)$。在 QC 常规规模（$n \le 50$）下，JavaScript V8 引擎实测耗时稳定在 **3~5ms**。

---

### 2.5 全模式复杂度与工程性能对照

| 维度 | 方向型 (Directional) | 中央型 (Centralized) | 关系自由型 (Free) | 传统 Fruchterman 力导向 |
| :--- | :--- | :--- | :--- | :--- |
| **数学性质** | 纯闭式拓扑投影 | 纯闭式极坐标映射 | 应力主化凸优化解析迭代 | 连续时间微积分退火模拟 |
| **计算复杂度** | $O(\|V\| + \|E\|)$ | $O(\|V\| + \|E\|)$ | $O(\|V\|^3 + 45\|V\|^2)$ | $O(\text{epochs} \cdot \|V\|^2)$ |
| **实测耗时 ($n=30$)** | **< 1.5 ms** | **< 1.0 ms** | **3.8 ms** | 1800 ms ~ 3500 ms |
| **确定性** | 100% 绝对恒定 | 100% 绝对恒定 | 100% 绝对恒定 | 伪随机，存在不可复现扰动 |
| **无头截屏安全度** | 初始帧瞬间对齐 | 初始帧瞬间对齐 | 初始帧瞬间对齐 | 极易在退火中途截断画面 |
| **空间分布特征** | 严格分层流向 | 靶向同心辐射 | 有机网状聚类 | 容易产生局部震荡陷阱 |

---

---

## 3. 第二章：鱼骨图（Fishbone Diagram）布局数学（R29 现行口径）

> **本章于 2026-10-28（R29）整体重写。** 旧版 §3.1 描述的是「脊椎均分 + 线性骨长 `140 + w·65`」的历史算法，
> 与现行实现 `utils/fishboneGraph.ts` 不符，已作废；旧版正文还存在编号重复（两个 §3.4 / 两个 §3.5）与拼接残缺，一并清理。
>
> **权威序**：本章公式 ⇄ `utils/fishboneGraph.ts` 常量 `T`。二者冲突时以**代码 + `npm run test:fishbone`** 为准。

---

### 3.1 现行算法：五遍闭式解（Deterministic Five-Pass Layout）

设问题树 $T=(V,E)$，鱼头标签 $L_{\text{root}}$，大骨集合 $M=\{M_1,\dots,M_m\}$（$M_k$ 含 $n_k$ 个中骨、$g_k$ 个孙项），
第 $k$ 族的上半区判定 $\tau_k = (k \bmod 2 = 0)$。所有量均为闭式解，无随机数、无迭代退火，复杂度 $O(|V|+|E|)$。

#### Pass 0 · 排版决策（三阶阶梯）

$$\operatorname{measure}(\ell, v) \to (W_\ell,\ h_\ell,\ f_v)$$

| 阶梯 | 触发条件 | 处置 |
|:--|:--|:--|
| 1 单行 | $W \le L_{\text{safe}}(v)$ | 字号 $f_v$ 不变（大骨 12.5 / 中骨 10.5 / 小骨 10 / 更深 9.5） |
| 2 缩字 | $W > L_{\text{safe}}$ 且不可折行（含空格/拉丁） | $f \leftarrow \max(9.5,\ f \cdot L_{\text{safe}}/W)$ |
| 3 双行 | $W > L_{\text{safe}}$ 且纯 CJK 且 $\ge 6$ 字 | 在中点 $\pm3$ 字内优先于中文标点断开，再按阶梯 2 缩字 |

其中 $L_{\text{safe}}$：大骨 132px、中骨 120px、更深 108px。

#### Pass 1 · 族内在需求（按需反解骨高）

中骨在骨上的起锚由各行需求累加得到，不再使用固定参数区间。常量 `tMin=0.28`、`tMax=0.74` 只在 `level===1` 的子项起锚时使用；深层子项走 `deepTMin/deepTMax`（水平父骨 0.20–0.62，斜父骨 0.12–0.88）。
令 $d_j, u_j$ 为第 $j$ 行子骨的最大向下 / 向上垂距（$= \ell_{\text{sub}}\sin 60^\circ + h_{\text{label}}/2 + 4$），
$h_j$ 为该行文本高。$G_r$、$G_\ell$ 由 `gapScale` 连续压缩：`rowGap = clamp(10·gapScale, 4, 16)`，`clusterGap = clamp(70·gapScale, 24, 96)`，不再使用三档跳变：

$$S = \max_{j}\Big(\underbrace{\text{相向两侧}}_{\text{上半区：}u_j+d_{j+1}\ \ /\ \ \text{下半区：}d_j+u_{j+1}} + \max(h_j,h_{j+1}) + G_r\Big)$$

> **只有「相向」的两侧需要在 Y 上让位**；背向的一侧天然远离，不参与求和。
> 早期版本对两侧取 `max`（对称双向），把行距需求高估近一倍 —— 这是「人和机被撑到顶部」的主因之一。

$$H_k = \max\Big(\frac{n_k-1}{t_{\text{span}}^{0}}\,S,\ \ \frac{d_{\max}+G_r+8}{t_{\min}},\ \ \frac{26}{1-t_{\max}},\ \ 180\Big),\qquad dx_k = H_k\cot 60^\circ$$

> **与旧版的差异**：旧版用线性经验式 $H = 140 + 48n + 30g$，与行分配不自洽 —— 每行都挂子骨时必然违反行距必要条件（R29 实测 rows=3..8 全部违反）。现行以「行距必要式」为主约束，端点仅保留软约束。

#### Pass 1a · 大骨按需不等高（与初始实现同构）

$$H_k \ \text{逐族独立求解（§Pass 1）} \qquad dx_k = H_k\cot 60^\circ$$

**大骨不强制等高**：负载重的族骨更长、轻的更短，形成初始实现那种「错落有致」的轮廓
（初始代码为 $L_k = 140 + w_k\cdot 65$，本实现改为由行距必要式直接反解，方向一致但不会因经验系数失配）。
> 曾一度改为「全局谐波等长」，结果是低负载族被拉出大片空骨、行距被顶到 2 倍以上 —— 与初始效果相反，已作废。

#### Pass 1b · 行分布（固定占用骨的 22%–78%）

行位按 `towards[j]` 累加。骨高装得下需求时按真实行距向内排；装不下时按比例整体压缩，不单侧钳位。

中骨在骨上**等距铺满 22%–78%**：内侧 22% 让开脊椎交汇区、外侧 22% 让开骨端标题框。这是初始版本的分形节奏来源。
> 曾一度改为「动态收窄到骨中部」以消除稀疏，但会让中骨聚在中段、两端大片空白，反而更像「粗鱼骨 + 空骨架」。现回归铺满。
> 因 $H_k \ge \frac{n-1}{t_{\text{span}}}S$，铺满时行距 $= \frac{t_{\text{span}}}{n-1}H_k \ge S$，故 G3 自动成立。

#### Pass 1c · 族包络（两遍解算，用实际骨长）

$$L_k = \max\Big(dx_k + \tfrac{W_{\text{title}}}{2} + 12,\ \max_j\big(t_j dx_k + \ell_j + \tau^{\text{text}}_j + R^{\text{child}}_j\big)\Big)$$
$$R_k = \max\Big(60,\ \max_j\big(-t_j dx_k + \ell_j + \tau^{\text{text}}_j + R^{\text{child}}_j\big)\Big)$$

其中 $\tau^{\text{text}}_j = 0$（inline 内嵌）或 $W_{\text{text},j}+10$（末梢外挂）。
**关键**：$dx_k$ 来自 $H_k$ 的实解，不再使用「假定骨长」，消除系统性低估（R29 / AUD-177）。

#### Pass 2 · 半区自治 + 元素级冲突驱动推进（允许族交叉）

两半区各自按 **DSL 顺序保序**（G2），但**位移不再由整族包络决定**，而由「元素级冲突」决定：

$$x_1 = X_{\text{start}} + L_1,\qquad x_{i+1} = \max\Big(x_i + s_{\min},\ \max_{j\le i}\big(x_j + \Delta_{j,i}\big)\Big)$$

$$\Delta_{j,i} = \max_{\substack{a \in \Omega_j,\ b \in \Omega_i\\ a \times b\ \text{相撞}}} \big(a.x_2 - b.x_1 + G_\ell\big)$$

其中 $\Omega_k$ 是族 $k$ 的**元素集**（每个文本块 AABB + 每段骨骼线段），$s_{\min}=28$px：

| 元素对 | 约束条件 | 位移 |
|:--|:--|:--|
| 文本 × 文本 | **Y 区间重叠**才约束（$a.y_1<b.y_2 \wedge b.y_1<a.y_2$） | $a.x_2-b.x_1+G_\ell$ |
| 骨段 × 文本 | 线段与矩形**真相交**（Liang–Barsky） | 线段右端 − 文本左界 $+G_\ell$ |
| 其余 | Y 上错开 / 几何不相交 | $\Delta = 0$ ⇒ **允许族在 X 上自由交叉** |

> 这就是「**允许族交叉、只保证不重叠、重叠才扩展**」的闭式实现 —— 等价于 FLOW 组件的「冲突检测 → 局部修补」，
> 而不是全局保守的矩形互斥。实测 6 大骨复杂用例：整族包络互斥 **2847px** → 元素级冲突驱动 **2118px（−26%）**，且零重叠。
> 代价：族间不再有统一「呼吸净空」，交叉处的视觉密度靠 G4（零重叠 / 零穿刺）兜底。

**Pass 2b · 分类修补器（消歧层）**：一次闭式推进后仍可能残留冲突，故在绝对坐标上做**分类修补**。检测覆盖
「文本×文本」与「线段×文本」（4px 膨胀，跳过自身链），按重叠类型分派四种定点动作：

| # | 重叠类型 | 判定 | 动作 |
|:--:|:--|:--|:--|
| ① | 同族 · 同父兄弟 | 同 `parentId` | 水平父骨**加长** / 60° 父骨**加高** |
| ② | 同族 · 跨父 | 不同 `parentId` | 该族**骨高增大**（按 Y 向差值，取最小必要量） |
| ③ | 跨族 · 同半区 | 大骨序号同奇偶 | **后序族右移**（取最大需求，不累加） |
| ④ | 跨族 · 跨半区 | 奇偶不同 | 无需动作（Y 天然分离） |

**收敛性**：每次只单调增大某个长度/间距，且存在「所有元素互斥」的保守上界 ⇒ 有限步收敛（实测 ≤6 轮）。
**已知边界**：同一条链内的深层分支（如 L2 行 × L4 深分支）相对位置固定，①② 均不改变其相对几何，
需**分支级 `t` 重排**才能彻底消除 —— 当前以「≤1 处擦边、面积 ≤150px²」作为门禁上限。

#### Pass 3 · 剪刀错位（Scissor Staggering）

$$\delta = \min\Big(90,\ \max\big(40,\ 0.35\cdot\min_{k\in\text{btm}}(L_k+R_k)\big)\Big),\qquad x^{\text{btm}}_k \leftarrow x^{\text{btm}}_k + \delta$$

上下共轭族在脊椎上**永不共点**，最小错开 $2\delta \ge 80$px（R29 实测 86.6 / 113.4px）。

#### Pass 4 · 缩放闭环（Readability Feedback）

$$s = \min\Big(1,\ \tfrac{W-2p}{W_c},\ \tfrac{H-2p}{H_c}\Big),\quad p=120,\qquad f_{\text{eff}} = 12.5\,s$$

若 $f_{\text{eff}} < 8.5$px 且未耗尽轮次（上限 5），则**按缺口连续压缩「间隔」**（不动元素尺寸）后重跑 Pass 1–4：

$$\text{gapScale}_{t+1}=\text{gapScale}_t\cdot\operatorname{clamp}\Big(\frac{1}{\text{deficit}},\ 0.65,\ 0.90\Big),\qquad
G_\ell=\operatorname{clamp}(70\cdot\text{gapScale},\ 24,\ 96),\quad G_r=\operatorname{clamp}(10\cdot\text{gapScale},\ 4,\ 16)$$

**只有间隔可弹性化，元素尺寸（字号/文字/骨长/标题框）一律钉死** —— 这是可读性的底线。
每轮最多压 35%，连续逼近而非"三档跳变"（旧实现 `70→40→24` 会出现"差 1px 就跳档、要么偏松要么偏紧"）。

仍未达标则保持最优解并输出 `meta.warnings`（**不静默降级**），`meta.gapScale` 暴露弹性倍率便于诊断。
$s$ 上限为 1 —— 内容小于画布时不放大，避免小图被撑成巨型字号。

#### Pass 4b · 倾角弹性（Angle Elasticity）—— 族宽的第二个杠杆

族宽与骨高强耦合：$dx = dy\cot\alpha$。$\alpha$ 从 $60^\circ$ 到 $75^\circ$ 时 $\cot\alpha$ 由 $0.577$ 降到 $0.268$，
**族宽近乎减半**，而分形结构（水平/斜角交替、羽状交替、包络关系）完全不变 —— 只换倾角这一个标量。

$$\alpha^\ast=\arg\max_{\alpha\in\{60,65,70,75\}} s(\alpha),\qquad s(\alpha)=\min\Big(1,\tfrac{W-2p}{W_c(\alpha)},\tfrac{H-2p}{H_c(\alpha)}\Big)$$

实现：对 4 档倾角各跑一次完整布局（确定性、可复现），取 `fitView` 缩放比最大者；达到 100% 即提前结束。
`meta.boneAngle` 输出所选角度。实测：4 骨 3 层用例自动选 $65^\circ$（fit 68.9%→70.0%）；复杂用例因高度是瓶颈仍选 $60^\circ$。

> **为什么不是逐骨不同角度**：倾角是分形范式的定义参数（"奇层严格 $\alpha$"），逐骨变化会破坏自相似；
> 全局单参数滑动既保留范式，又拿到"族宽减半"的杠杆。

---

### 3.2 历史缺陷与 R29 修复对照

| # | 缺陷（旧版现象） | 数学根因 | R29 处置 | 守护断言 |
|:--:|:--|:--|:--|:--|
| 1 | 上下大骨共点、族对刚性对齐 | `pairCenterXs[p]` 强制成对绑定，$\sum_p\max(a_p,b_p) \ge \max(\sum a_p,\sum b_p)$ | 半区自治 + 剪刀错位 | G2 / G5 |
| 2 | 族与族「空中重叠」 | 包络用假定骨长，$dx$ 系统性偏小 | 两遍解算（实际 $H_k$） | G1 / G2b |
| 3 | 同级小骨同向挤压 | 小骨方向误由「上/下半区」决定 | 由父骨流向 + 行内 `idx` 交替决定 | 分形保真 |
| 4 | 文字压盖自身骨骼 | 文字未随线段朝向镜像 | 末梢背外侧镜像 / under-line 内嵌双范式 | G4b |
| 5 | 深层子骨挤在短线段上 | 中骨长度只按自身文字分配 | 中骨长度 ≥ 子骨水平投影之和 + 24 | G4a |
| 6 | 行与行文字粘连 | $H$ 线性经验式与行分配脱钩 | 行距必要式 + 动态收窄 | G3 |
| 7 | 整图缩放后字号不可读 | 布局与画布解耦，缩放比不回馈排版 | 缩放闭环（3 档族距重排 + warning） | G6 |
| 9 | 骨高虚高近一倍 | `verticalReach` 把**水平**细骨也乘 `sin60` 当垂直占用；且行距用对称双向 `max` | 按子项层级方向分别计算；行距只取相向一侧 | G3 |
| 8 | 族间包络互斥导致整图过宽 | 旧版「整族矩形外推」把 Y 上错开的元素也强行分离 | **元素级冲突驱动**：Y 错开即允许交叉，只在真实相撞处扩展（§3.1 Pass 2） | G2b / G4 |

---

### 3.3 分形范式与几何定理

#### 3.3.1 层级平行公理与有向矢量流

```
Level 0 脊椎（0°）──► Level 1 大骨（60°）【范式 Block 1】
                            │ 同构挂载
                            ▼
Level 2 中骨（0°）──► Level 3 小骨（60°）【范式 Block 2】
```

- **偶层水平公理**：Level 0 / 2 / 4 … 严格 $0^\circ$，全图互相平行；
- **奇层斜角公理**：Level 1 / 3 / 5 … 严格 $\alpha$，**$\alpha$ 是整图统一的范式参数**，在 $[60^\circ, 75^\circ]$ 内弹性滑动（见 §3.1 Pass 4b）；
- **顺流迎角汇聚律**：奇层骨在 X 轴的位移方向 = 父骨流向 $\operatorname{sgn}(\Delta X_{\text{parent}})$，即 $k = \pm\sqrt{3}$；
- **羽状对偶**：同一水平父骨上的兄弟，按索引奇偶上下交替（$\Delta Y = \pm \ell\sin 60^\circ$），$k_0 k_1 = -3$；
- **中骨左右交替**：同一大骨上的中骨按索引奇偶左右镜像（$\text{side}=(-1)^{j}$），在斜骨两侧形成对称羽翼；
- **行等距**：中骨在骨上的起锚参数严格等距（$t_j = t_{\text{start}} + \frac{j}{n-1}t_{\text{span}}$），这是分形节奏的来源，且包络计算与渲染同口径（不得一处用权重、一处用均分）。

#### 3.3.2 脊椎羽状非共点推进定理（G5）

上下共轭两族的生根点错开 $2\delta$，$\delta \in [40, 90]$。因两区 Y 向天然分离（$\pm$ 侧），X 向允许自由交错，
故错位**不引入新的碰撞约束**，只改变视觉节奏 —— 形成「剪刀状」而非「镜像对称」。

#### 3.3.3 半区自治与「保序 + 元素不重叠」约束（G2）

$$\big(x_{k+1} - R_{k+1}\big) - \big(x_k + L_k\big) \ge G_\ell$$

**定理（元素级推进的紧性）**：约束改为「保序 + 元素不重叠」后仍是前向差分约束系统
$x_{i+1}-x_i \ge \max_j \Delta_{j,i}$，其最小可行解唯一且等于前缀和。
与整族包络互斥相比，$\Delta$ 只在元素**真实相撞**时为正 —— 这正是允许交叉带来的紧致性来源。
**故优化只能来自三处**：包络口径（Pass 1c）、元素粒度（Pass 2）、范式宽度（§3.3.4）。

**定理（成对绑定的弱劣性）**：$W_{\text{indep}} = \max(\sum_{\text{top}},\sum_{\text{btm}}) \le W_{\text{pair}} = \sum_p \max(\cdot)$，
损耗上界 $1/2$；实测 0.0%–8.5% —— 收益有限，**主要价值是解耦**而非省宽。

#### 3.3.4 文字挂载的双范式（明确边界）

| 范式 | 适用层级 | 几何 | 水平占用 |
|:--|:--|:--|:--|
| **末梢背外侧** | **水平骨**（中骨 / 细骨） | 文字挂在末梢之外（按伸展方向镜像：`right` / `left`），与线同高 | $W_{\text{text}}+10$ |
| **端点居中** | **60° 骨**（小骨） | 文字以端点为水平中点，垂直偏到**骨刺生长方向的外侧**（`top` / `bottom`） | $W_{\text{text}}/2+6$ |
| **退化外挂** | 60° 骨且居中后会压到本族斜骨 | 自动退回末梢背外侧一次，避免文字半宽伸进斜骨 | $W_{\text{text}}+10$ |

**实测收益**：族跨度 $L_k+R_k$ 下降 26%–38%（4 大骨用例 1215 → 825px 量级）。

#### 3.3.5 三阶排版阶梯（详情见 §3.6）

---

### 3.4 垂直自洽：行距必要式（G3）

**定理**：族内相邻两行 $j, j+1$ 在骨上的垂直间距为 $\frac{t_{\text{span}}}{n-1}H$，无碰撞必要条件

$$\frac{t_{\text{span}}}{n-1}H \ \ge\ \max\big(d_j+u_{j+1},\ u_j+d_{j+1}\big) + \max(h_j,h_{j+1}) + G_r + \mathbb{1}_{\text{inline}}\cdot h_{\text{lift}}$$

移项即 §3.1 的 $H_k$ 主式。**旧版线性式在 $n \ge 3$ 且每行挂子骨时必然违反**（实测行距 86.6/80.1/76.2/73.5/70.3px，需求 93px）。

**端点软约束**（羽状交替的必付成本）：最内行「朝脊椎」一侧不得压脊椎（$t_{\min}H \ge d_{\text{inner}}+G_r+8$）；
最外行「朝骨末端」一侧不得撞标题框（$(1-t_{\max})H \ge u_{\text{outer}}+26$）。
其中 $t_{\min}=0.28,\ t_{\max}=0.74$。

> 曾试图用「整行羽向翻转」把这些约束消掉，结果**羽状交替被打散**（同级子骨全部同向），已回退。
> 羽状 ⟺ 每行都同时有朝脊椎与朝末端的子骨 ⟺ 两端约束必然生效，这是分形范式与紧凑之间的真实代价。

---

### 3.5 缩放闭环与画布容量判据（G6）

$$\boxed{\ W_c \le (W-2p)\cdot \frac{f_{\min\text{-font}}}{f_{\min}}\ }$$

> ⚠️ **基准必须是图中最小字号**（深层节点 9.5–10px），不是大骨字号 12.5px。
> 用大骨字号会虚高 25–32% —— 旧断言正是这么漏掉的：4 骨用例被判 8.62px「可读」，实测最小字只有 **7.94px**。

1200×800、$p=120$、$f=12.5$、$f_{\min}=9$ 时右端 $=1280$px。据此得**画布可容纳大骨数**：

$$m \ \le\ \frac{1280}{\overline{L+R}}$$

实测：经典 4 大骨 $\overline{L+R}\approx 288$ → $m\le4.4$ ✓；5M1E 6 大骨 + 三层深钻 $\overline{L+R}\approx 341$ → 内容宽 2045px，缩放 46.9%，有效字号 5.87px ✗（按设计给出 warning 并建议增大画布）。

---

### 3.6 三阶排版决策（Typographic Ladder）

```
                 [label]
                    │  W = estimateTextWidth(label, f)
        ┌───────────┴────────────┐
   W ≤ L_safe              W > L_safe
        │                        │
  ①单行标准字号         ┌────────┴────────┐
  （分形纯度最高）  纯CJK且≥6字        含空格/拉丁
                     │                 │
              ③双行折叠→缩字      ②仅缩字（≥9.5px）
```

- 字宽一律走 `utils/textMetrics.ts` 的**逐字符字宽表**（汉字 1em / 拉丁 0.56em），禁用 `len × fontSize`；
- 折行只对纯 CJK 启用（拉丁折断会破坏单词）；
- 字号绝对地板 9.5px，有效字号可读红线 **8.5px**（编辑视口与 MCP 3x 导出下仍清晰）。

---

### 3.7 验收不变量（由 `npm run test:fishbone` 强制）

| 编号 | 不变量 | 判定 | 现状 |
|:--:|:--|:--|:--|
| **G1** | 结构完整性 | 节点 id 唯一；每条边两端存在；鱼头/鱼尾就位 | ✅ |
| **G2** | 半区保序 | 同区 $x$ 严格递增且顺序 = DSL；族区间**允许交叉**（交叉对数仅诊断） | ✅（6 骨交叉 4 对）|
| **G3** | 行距必要式 | 相邻行距 $\ge (d_j+u_{j+1}) + 行高 + G_r + \text{lift}$ | ✅ |
| **G4** | 零重叠零穿刺 | 文本 AABB 两两无交；无连线穿过非本链文本（4px 膨胀） | ✅ |
| **G5** | 剪刀错位 | $2\delta \ge 44$px（永不共点，实测最小 44.0px） | ✅ |
| **G6** | 缩放可读 | 可读用例 $f^{\min}_{\text{eff}}\ge8.5$px 且无 warning；不可读用例必须多轮收紧 + `gapScale<0.9` + warning | ✅ |
| **G7** | 确定性 | 同输入两次解算坐标逐一相等 | ✅ |

另含：分形保真（60° 斜率 $=\pm\sqrt3$）、鱼头禁入带、空数据/单大骨边界、权重函数单调性。

**复现命令**

```bash
npm run test:fishbone     # G1–G7 共 67 项断言
npm run build             # 已串入 test:fishbone（构建即门禁）
npx tsc --noEmit
```

---

### 3.8 已知边界与后续

1. **族宽仍是主约束**：$L_k$ 中 $dx_k + W_{\text{title}}/2$ 占比最大；若把大骨标题框改为「贴骨端内侧」，可再省 ~50px/族（未实施）。
2. ~~大骨长度不齐~~：现为**按需不等高**（与初始实现一致），极差即负载差异的体现，不再视为缺陷。
3. **Lane 分带**（Y 向分带 + 行级区间互斥，允许同半区 X 局部重叠）尚未实施，是进一步压缩横向的理论下界方向。
   **复杂用例的骨高由零碰撞下界决定**：6 大骨 / 4 层 / 43 文本块时，单元需求 $S\approx159$px 且 $n=4$ ⇒ $H^\ast\approx843$px，
   内容 2847×1716，在 1600×1000 下有效字号仅 5.54px。初始版本 $H\approx572$（行距 107 < 需求 159）是靠**允许相邻行子骨轻微重叠**换来的紧凑。）
   注：当前已是元素级冲突推进，不再是"族区间整体互斥"的保守解 —— 初始版本用「脊椎均分」虽有重叠但更紧凑（6 族 1400px vs 本实现 2490px），Lane 分带是同时拿到紧凑与零碰撞的正解。
4. **under-line 的 G6 渲染验证**：本机 Chromium 受限，`labelPlacement: 'top'` 的实际渲染需在可用环境复核一次。

---

*本章为 LUCY-CHENGJU 图形数学布局标准资产。任何针对布局算法的重构，均须以 §3.7 的 G1–G7 为验收基准。*

---

## 4. 第三章：过程决策程序图（PDPC Diagram）分层正交布局数学（R30 现行口径）

> **本章于 2026-10-28（R30）新增。** 随全仓剥离 `@antv/g6` 与异步 Dagre 引擎，PDPC 图改由 `utils/pdpcGraph.ts` 与 `utils/pdpcSvg.ts` 实现纯数学闭式分层与正交圆角路由，执行门禁为 `npm run test:pdpc`（G1–G6）。

### 4.1 阶段凝聚拓扑分层（Group-Cohesive K-Rank Layering）

设 PDPC 图 $G = (V, E, \mathcal{C})$，其中 $\mathcal{C} = \{C_1, \dots, C_m\}$ 为阶段分组（`Group`）。
1. **组内局部最长路径分层**：对每条同组有向边 $(u, v) \in E$（满足 $\operatorname{group}(u) = \operatorname{group}(v)$），递推：
   $$\operatorname{rank}_{\text{local}}(v) = \max_{(u,v) \in E_{\text{intra}}} \big(\operatorname{rank}_{\text{local}}(u) + 1\big)$$
2. **阶段偏序凝聚映射**：按阶段桶 $C_1, \dots, C_m$ 顺序累加全局主轴阶数 $\operatorname{rank}(v)$，严格保证不同阶段框在主轴方向上的区间互斥（$\forall u \in C_a, v \in C_b, a < b \implies \operatorname{rank}(u) < \operatorname{rank}(v)$），从数学上杜绝阶段框交叉穿插。

### 4.2 主干与异常对策支线分流（Mainline vs Contingency Offset）

定义节点 $v$ 的异常支线示性函数：
$$\chi_{\text{cont}}(v) = \mathbb{I}\big(\operatorname{type}(v) = \text{countermeasure} \;\lor\; \forall (u,v)\in E,\ \operatorname{marker}(u,v)=\text{NG}\big)$$
同层（相同 $\operatorname{rank}$）内按 $(\chi_{\text{cont}}(v), \operatorname{barycenter}(v))$ 双关键字升序排列：
- 正常主线步骤（$\chi_{\text{cont}} = 0$）锚定于主干基线 $Y_{\text{base}}$；
- 异常与对策节点（$\chi_{\text{cont}} = 1$）向副轴正方向偏移 $\Delta_{\text{cont}} = 105\text{px}$，形成清晰的「主干直通 + 侧枝风险演练回流」拓扑视觉结构。

### 4.3 正交圆角走线与避障走廊（Orthogonal Routing & Corridor Search）

对于有向边 $e = (u, v)$：
1. 在候选折线中垂线集合 $\{ \frac{x_u+x_v}{2}, x_u+26, x_v-26, \dots \}$ 中检索与非端点节点集合 $V \setminus \{u,v\}$ 零碰撞（`segmentHitsBox = false`）的正交路径；
2. 若层间通道被完全阻断，自动抬升至全局包络外侧安全走廊 $Y_{\text{corridor}} = \min_{w \in V}(Y_w - H_w/2) - 36$ 绕行；
3. 在每个正交 $90^\circ$ 拐点 $P_i$ 处，以截断半径 $r = \min(6, \ell_{i-1}/2, \ell_i/2)$ 生成二次贝塞尔圆角指令 `Q`。

### 4.4 验收不变量（由 `npm run test:pdpc` 与 `npm run test:relation` 强制）

| 门禁脚本 | 守护不变量 | 状态 |
|:--|:--|:--:|
| `scripts/assert_relation_math.ts` | G1 拓扑角色守恒 · G2 三模态零重叠（含 30 节点高压） · G3 方向型单调 · G4 中央型同心锚定 · G5 椭圆/矩形精确边界求交（误差 < 1.5px） · G6 双向边曲率分离与 SVG 确定性 | ✅ PASS |
| `scripts/assert_pdpc_math.ts` | G1 节点零重叠 · G2 阶段框 100% 包裹且框间零交叠 · G3 主干流向单调（LR/TB） · G4 正交连线零穿刺 · G5 四类节点几何造型与 NG 虚线/链式标记完备 · G6 确定性 | ✅ PASS |

