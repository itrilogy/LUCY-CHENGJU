# IQS-Flow 几何代数连线、三折线扩展格上界与流形松弛理论体系 (3-Bend Threshold & Manifold Relaxation Theory)

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

## 3. 三折线上界与扩展格闭环松弛理论 (The 3-Bend Threshold & Closed-Loop Relaxation)

在二维正交网格系统 $\mathcal{G} = \mathcal{R} \times \mathcal{C}$ 中，系统的整体美学势能泛函形式化为：
$$J = \sum_{e \in \mathcal{E}} C_{\text{route}}(e) + \sum_{u \in \mathcal{V}} C_{\text{slot}}(u)$$

### 3.1 路径折线阶数与扩展格位移的严格代数全序
1. **0 弯直线（Straight Line, 1 段线）**：$C_0 = 0$
2. **1 弯 90度折线（L-bend, 2 段线）**：$C_1 = 100$
3. **扩展格单次位移（Single Grid Slot Shift, $\Delta gx = 1$ 或 $\Delta gy = 1$）**：$C_{\text{shift1}} = 150$
4. **2 弯走廊折线（Z-bend, 3 段线）**：$C_2 = 250$
5. **3 弯及以上复杂折线（$\ge 3$ Bends, $\ge 4$ 段线）**：$C_{\ge 3} \ge 450$（**严禁在正向流中出现，触发扩展格松弛阈值**）

### 3.2 三折线扩展格松弛定理 (The 3-Bend Expansion Threshold Theorem)
> **定理**：在工业流程图几何代数中，任何单条连线的正交折线段数必须严格满足 $S(e) \le 3$（即折弯数 $B(e) \le 2$）。
> 一旦布局计算出现单一路径折弯数 $B(e) \ge 3$（线段数 $\ge 4$），系统即判定发生了“流形阻塞（Manifold Congestion）”，必须触发扩展格位移算子 $\mathcal{T}_{\text{shift}}$ 进行流形松弛：
> $$\Delta J = (C_0 - C_{\ge 3}) + C_{\text{shift1}} \le -450 + 150 = -300 < 0$$
> 系统势能严格单调递减，直至全图所有正向流的折弯数收敛于 $B(e) \le 2$！

### 3.3 全向正交射线遮挡松弛算子
1. **水平射线松弛（Horizontal Clearance）**：
   对于同行跨列长跨度边（如资料依附线 $n \to u$），若中间列存在同高度阻挡节点 $w$：
   $$\operatorname{slotY}(w) \gets \operatorname{slotY}(w) + 1 \implies \text{打通 0 弯水平纯净直线}$$
2. **垂直射线松弛（Vertical Clearance，向下/向上双向对称）**：
   对于同列跨行直连边（向下如 $w_6 \to w_7$，向上如 $w_4 \to w_5$），若同单元格或中间行存在阻挡节点 $w$：
   $$\operatorname{slotX}(w) \gets \operatorname{slotX}(w) + 1 \implies \text{打通 0 弯垂直纯净直线}$$

---

## 4. 全局边规划优先级全序模型 (Priority Ordering & Port Allocation)

边的规划全序 $\Phi(e)$ 严格定义为：

$$\Phi(e) = \begin{cases}
0, & \text{同轴正向直连顺序流 } (|\Delta x| < 1 \land \text{正向顺序流} \text{ 或 } |\Delta y| < 1 \land \Delta x > 0) \\
10 + 5 \cdot \text{dist}(u, v), & \text{正向邻近推进流 } (\Delta x > 0) \\
200 + 10 \cdot \text{dist}(u, v), & \text{显式逆向回流 / 驳回流 / 不达标流 } (\text{带否定标签 或 } \Delta x < -40) \\
1000, & \text{资料卡片依附虚线}
\end{cases}$$

- **最高规划权（$\Phi = 0$）**：同轴直通边率先执行，原子性锁定直通端口；
- **回流后置规划（$\Phi \ge 200$）**：逆向流后置规划，沿走廊外绕，杜绝端口抢占与倒置。

---

## 5. 正交通道网格与光线投射碰撞检测 (Raycasting & Corridor Mesh)

折线拐点坐标被严格约束在网格正交通道网格上：
$$X_{\text{mesh}} = \{ \text{列走廊中线 } x_{\text{col}} \} \cup \{ x_u, x_v \}$$
$$Y_{\text{mesh}} = \{ \text{行走廊中线 } y_{\text{row}} \} \cup \{ y_u, y_v \}$$

出入端口通过 $60\text{px}$ 光线投射（Raycasting）精确探测正向近邻障碍物，自适应避开被阻挡侧边。
