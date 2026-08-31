# IQS-Flow 几何代数连线、扩展格避让与布局协同理论体系 (Algebraic Flow Routing & Layout Co-optimization Theory)

---

## 1. 核心理论模型：正交流形与流形势能极小化

流程图的连线与端口规划被形式化为一个**多目标势能泛函极小化问题**（Potential Functional Minimization on 2D Orthogonal Grid Manifolds），彻底根除硬编码条件分支与特判。

### 1.1 节点几何与端口定义
对于节点 $u \in \mathcal{V}$，其在欧氏平面上的包围盒为：
$$B(u) = \left[x_u - \frac{W_u}{2}, x_u + \frac{W_u}{2}\right] \times \left[y_u - \frac{H_u}{2}, y_u + \frac{H_u}{2}\right]$$

其四个侧边几何中点端口集合 $\mathcal{D} = \{T, B, L, R\}$，法向量定义为：
$$\mathbf{n}(T) = (0, -1), \quad \mathbf{n}(B) = (0, 1), \quad \mathbf{n}(L) = (-1, 0), \quad \mathbf{n}(R) = (1, 0)$$

端口实际几何坐标由仿射变换唯一确定：
$$P(u, d) = \mathbf{c}_u + \frac{1}{2} \operatorname{diag}(W_u, H_u) \mathbf{n}(d)$$

---

## 2. 核心代数几何公理与引线接驳模型 (Core Axioms & Stub Routing Model)

### 公理 1：WSAD 严格单属性互斥公理 (Strict WSAD Partition Axiom)
每个节点的每个侧边，其拓扑属性必须在 $\{\text{UNUSED}, \text{INPUT}, \text{OUTPUT}\}$ 中三态单选，绝对禁止既入又出：
$$\forall u \in \mathcal{V}, \quad \operatorname{Dirs}_{\text{in}}(u) \cap \operatorname{Dirs}_{\text{out}}(u) = \emptyset$$

### 公理 2：法向外延接驳引线模型 (Normal Stub & Lead-in Invariant)
连线本质上是出口引线端点 $s_1$ 与入口引线端点 $t_1$ 之间的流形接驳。
对于节点 $u$ 的端口 $s_p \in \mathcal{D}$，其外延引线端点 $s_1$ 严格沿边中点法向量 $\mathbf{n}(s_p)$ 外延长度 $\lambda$：
$$s_1 = p_0 + \lambda \cdot \mathbf{n}(s_p), \quad \text{其中 } p_0 = P(u, s_p)$$
同理，目标节点 $v$ 的入口端点 $p_k = P(v, t_p)$，其迎接入线端点 $t_1$ 满足：
$$t_1 = p_k + \lambda \cdot \mathbf{n}(t_p)$$
整条正交连线在代数上被严格定义为引线段与通道流形接驳器的直和：
$$\mathcal{P}(u \to v) = [p_0, s_1] \cup \operatorname{ManifoldRoute}(s_1, t_1) \cup [t_1, p_k]$$
- **箭头唯一定位原则**：箭头仅且唯一存在于入口接待点 $p_k$，尖端坐标精确贴合 $p_k$，底边朝向 $t_1$；出口 $p_0$ 与中间拐点严禁绘制任何箭头。

### 公理 3：同向入流复用公理 (Multiplexing Axiom)
当多个前驱流或依附文档流汇聚于同一入口方向时，允许共用同一法向入端点 $p_k$ 与引线段 $[t_1, p_k]$，由唯一的接待箭头统一接收：
$$\forall d \in \operatorname{Dirs}_{\text{in}}(u), \quad \operatorname{IncomingArrows}(u, d) = 1$$

### 公理 4：无碰撞正交连通性公理 (Collision-Free Invariant)
$$\forall [p_i, p_{i+1}] \subset \mathcal{P}, \quad \forall w \in \mathcal{V} \setminus \{u, v\}, \quad \operatorname{Segment}(p_i, p_{i+1}) \cap B_{\epsilon}(w) = \emptyset$$

---

## 3. 折线阶数与扩展格位移权重的代数全序理论 (Total Order of Bends vs. Grid Displacement)

在流程图几何代数中，整体视觉惩罚势能泛函定义为：
$$J = \sum_{e \in \mathcal{E}} C_{\text{route}}(e) + \sum_{u \in \mathcal{V}} C_{\text{slot}}(u)$$

### 3.1 路径折线阶数代价 $C_{\text{route}}(e)$
1. **0 弯直线（Straight Line, 0 Bend）**：$C_0 = 0$（完美几何直通）
2. **1 弯 90度折线（Single Orthogonal Bend, 1 Bend, L-shape）**：$C_1 = 100$
3. **2 弯走廊折线（Double Orthogonal Bends, 2 Bends, Z-shape）**：$C_2 = 250$
4. **3 弯避障折线（Triple Orthogonal Bends, 3 Bends）**：$C_3 = 450$
5. **$\ge 4$ 弯复杂回绕（Multi-bend Loop, $\ge 4$ Bends）**：$C_{\ge 4} \ge 1000$

### 3.2 节点扩展格位移代价 $C_{\text{slot}}(u)$
1. **基准槽位（自然落格，$\Delta gy = 0$）**：$C_{\text{slot}} = 0$
2. **扩展格单次位移（Single Grid Slot Shift, $gy \to gy+1$）**：$C_{\text{shift1}} = 150$
3. **扩展格两次位移（Double Grid Slot Shift, $gy \to gy+2$）**：$C_{\text{shift2}} = 600$

### 3.3 核心代数决策不等式与扩展格视线避让定理
$$\underbrace{C_{\text{shift1}} + C_0}_{150 + 0 = 150} < \underbrace{C_2}_{250} < \underbrace{C_3}_{450} < \underbrace{C_{\ge 4}}_{1000}$$

**定理（视线避让与扩展格自适应提升定理）**：
> 当一条重要的水平直连线（如资料节点依附虚线 $n \to u$）或主业务流水线跨越多个列/行时：
> 若直通路径上存在中间阻挡节点 $w$：
> 通过将阻挡节点 $w$ 及其所在单元格在纵向**下移 1 个扩展格槽位（代价 150）**，从而彻底消除中间阻挡，使连线获得 **0 弯纯净水平直线（代价 0）**，总代价为 $150$；
> 该方案严格优于保持节点不动而导致连线走 3 弯或 4 弯外围走廊（代价 $450 \sim 1000$）。
> 因此系统必然主动触发扩展格位移避让机制！

---

## 4. 全局边规划优先级全序模型 (Priority Ordering & Port Allocation)

为避免回流/复杂边抢占直通端口导致主干道绕圈，边的规划全序 $\Phi(e)$ 严格定义为：

$$\Phi(e) = \begin{cases}
0, & \text{同轴正向直连顺序流 } (\Delta x < 1 \land \Delta y > 0 \text{ 或 } \Delta y < 1 \land \Delta x > 0) \\
10 + 5 \cdot \text{dist}(u, v), & \text{正向邻近推进流 } (\Delta x > 0) \\
200 + 10 \cdot \text{dist}(u, v), & \text{物理逆向回流 / 驳回流 / 不达标流 } (\Delta x < -20 \lor (\Delta x \approx 0 \land \Delta y < -20)) \\
1000, & \text{资料卡片依附虚线}
\end{cases}$$

- **最高规划权（$\Phi = 0$）**：$w_1 \to w_2 \to q_1$ 等主轴直通边率先执行，原子性锁定 $u(B) \to v(T)$ 垂直直线；
- **回流后置规划（$\Phi \ge 200$）**：$q_1 \to w_1$（驳回）在正向直通端口锁定后进行，自然从 $q_1(L)$ 优雅外绕，杜绝端口倒置与绕圈。

---

## 5. 正交通道网格与光线投射碰撞检测 (Raycasting & Corridor Mesh)

折线拐点坐标被严格约束在网格正交通道网格上：
$$X_{\text{mesh}} = \{ \text{列走廊中线 } x_{\text{col}} \} \cup \{ x_u, x_v \}$$
$$Y_{\text{mesh}} = \{ \text{行走廊中线 } y_{\text{row}} \} \cup \{ y_u, y_v \}$$

出入端口通过 $60\text{px}$ 光线投射（Raycasting）精确探测正向近邻障碍物，自适应避开被阻挡侧边。
