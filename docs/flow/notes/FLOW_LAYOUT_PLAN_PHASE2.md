# IQS-Flow 下一阶段综合方案

> **文档状态**: 独立详细方案（审阅结论 + 改善设计 + 编辑器对齐 + MCP 大模型接入）
> **日期**: 2026-09-02
> **基线**: `main` HEAD `6b805d9`（交叉格内排序 `computeCellOrder`）
> **断言口径**: `npm run test:flow` → parser 60 + svg 61 + bpmn 17 + mainline 8 + cell_order 8 = **154**
> **权威数学上限**: `docs/flow/math/FLOW_OPTIMALITY_FRAMEWORK.md` §0 分层结论表（不以旧文口号为准）
> **过程记录**: `docs/flow/notes/FLOW_LAYOUT_NOTES_PHASE2.md`（本轮调研/落盘；后续每次修订必须追加）
> **关联**: `IQS_FLOW_DSL_SPEC.md` · `FLOW_LAYOUT_ENGINE_DESIGN.md` · `FLOW_OPTIMALITY_FRAMEWORK.md` · `protocol/segments/flow.md`

---

## 0. 执行摘要

IQS-Flow 已经是可交付的企业泳道流程图引擎：字典-索引 DSL、自研 SVG、154 项断言、MCP `render_flow` 均可闭环。下一阶段的核心不是再堆启发式，而是把**文档承诺、数学方法、代码实现、编辑器体验、外部大模型接入**五条线重新对齐到同一套意图上。

意图一句话：

> 面向 665 体系文件中的程序文件（CX），用「谁（泳道）× 做什么（活动）× 什么条件下走哪条路（网关）」画出**高度整齐对齐**的正交泳道图；机器可校验、可交换、可被外部大模型准确书写并在内部引擎中绘制。

三件必须独立成案、按里程碑执行的事项：

| # | 事项 | 目标 | 优先级 |
|:--|:--|:--|:--:|
| **A** | 代码改善与功能完善 | 以 FRAMEWORK 分层最优为上限，补齐 T2 守护位移、主干序接入、Φ 统一、规范/代码错配；不承诺一般图全局最优 | P0–P2 |
| **B** | 左侧 Editor 面板对齐 | FlowEditor 套用其它组件的 LUXI LAB 侧栏骨架（Header + 三 Tab + 深色令牌），补「手动录入」 | P0 |
| **C** | MCP DSL 声明 | 让外部大模型在 `list_tools` 即可路由到 `render_flow`（而非 Mermaid flowchart），读一次 kind 资源即可写出可解析 DSL，调用后能根据 parser 诊断自我修正 | P0 |

**不做**：重写网格公式（③ 整行/整列统一扩展、节点居中）；BPMN import；多画布编排；在未统一 Φ 之前并行开新启发式。

---

## 1. 审阅范围与方法

### 1.1 范围

- `docs/` 下 24 篇 FLOW 专文 + `IQS_FLOW_DSL_SPEC.md` + `USER_MANUAL_FLOW.md`
- `protocol/segments/flow.md`、`protocol/DSL_V1.md`、`dsl/kinds.json`
- `output/flow-syntax-guide/`（规划 18 篇，仅落地 00/01/02）
- `components/flow/*`（8 个源文件）+ `scripts/assert_flow_*` / `assert_mainline` / `assert_cell_order`
- `components/*Editor.tsx` 对照 + `layout/Workspace.tsx`
- `mcp-server/index.js` + `mcp_tools.json` + `services/aiService.ts`
- `git log`：`components/flow/` 约 71 次提交，从网格棋盘到代数路由、A6、CellOrder

### 1.2 方法

1. 以 **FRAMEWORK 分层表** 为数学承诺上限，旧文口号一律降级。
2. 以 **commit 演进** 解释「为什么代码长成现在这样」（绕行 2→4 回退、走廊中线↔贴边反复、文档滞后）。
3. 以 **其它 Editor 的共享骨架** 为 UI 对齐目标（不以 FlowEditor 现状为基准）。
4. 以 **外部 LLM 真实拿到的 `list_tools` 薄描述** 评估 MCP，而不是以仓库里的完整 SPEC 评估。

---

## 2. 工程演进路线（commit 历史压缩）

Flow 不是一次性设计落地，而是「网格骨架 → 正确性修复 → 走线代数化 → 最优性诚实化」四段演进。后续改动必须顺着这条路走，而不是回到早期「确定性避障 3 轮」旧引擎。

```
① 网格骨架（绘制格 3×3 + XY 交叉格 + 整行整列扩展）
   86edb48 完整算法 v3
   43642a6 统一网格线贯穿棋盘
   d33d2a2 节点严格居中 / 单维兼容
   4f941c3 布局文档 v4

② 正确性与工整（P0 → ALIGN → 三阶段 → M0–M3）
   a540fc8 P0：视口 / 非连续索引 / 缺省落格 / 结束不出默认流
   79fb873 ALIGN：单维链长、子流程退网格、N/DATA 不占格、拐点吸附
   ea5eee5 阶段一：§10 校验 + flowToDsl 往返
   5ccc52a 阶段三 d：手册 + BPMN XML
   16d941a–4da0eb8 M0–M3：协议 AxisY、走廊错位、BPMN DI、Attach

③ 连线代数化（运输模型 + WSAD + 射线松弛）
   651881d 目的优先选端口
   59a8076 出口象限规则
   343bcd3 完整腾挪草稿不达标（绕行 2→4）已回退  ← 关键教训
   69bc9bd 绕行目标侧优先（131 全绿）
   63f8dd7 统一 2D 正交射线清障 + 流形松弛

④ 最优性诚实化 + 格内序
   c2d6acd A6 对角算子 + 死代码清理 + FRAMEWORK 落盘
   101e74e 编辑器导出契约回写 vh + MainlineOrder（未接 autoSeq）
   6b805d9 computeCellOrder：格内拓扑序 + 缺省 vh 派生
```

**演进给出的三条硬约束（后续方案必须遵守）**：

1. **腾挪必须有守护**：盲目位移已实测恶化（2→4），FRAMEWORK T2 是唯一允许再做腾挪的数学台阶。
2. **网格公式冻结**：③ 整行/整列统一扩展、节点居中、子流程整数倍、N/DATA 不进交叉格（DOC 列另论）是已锁定行为。
3. **每步独立 commit + `test:flow` 全绿 + 过程日志落盘**——这是既有变更纪律，本方案沿用。

---

## 3. 数学方法与设计意图（权威对齐）

本章是后续代码改动的「允许做什么」边界。凡与本章冲突的旧文档口号，一律以本章为准。

### 3.1 产品意图（不变）

| 维度 | 意图 |
|:---|:---|
| 场景 | 665 体系文件中的 CX 程序文件：谁 × 做什么 × 走哪条路 |
| 语义 | BPMN 2.0 子集（起止/任务/子流程/排他与并行网关/标注/数据对象） |
| 语言 | 字典-索引：数据层 `Dict`，结构层只写索引；渲染展开字典值 |
| 几何 | Excel 式泳道交叉格；节点严格居中；连线纯正交曼哈顿，走格子走廊 |
| 美学 | 高度整齐对齐优先于绝对紧凑（G3 稀疏可接受） |
| 空间 | 有限网格（32/64），节点只在界内移动（G4） |
| 工程 | 确定性、可回归（G5）；不引入随机 |

### 3.2 统一目标泛函（FRAMEWORK §1）

决策变量：槽位 \((gx_u, gy_u)\)、端口对 \((sp_e, tp_e)\in\{T,B,L,R\}^2\)、正交路径 \(\pi_e\)。

\[
\Phi=\sum_e\bigl(w_B\cdot\mathrm{bends}(\pi_e)+w_L\cdot\mathrm{len}(\pi_e)+w_X\cdot\mathrm{overlap}(\pi_e)\bigr)+\sum_u w_S\cdot\mathrm{shift}(u)
\]

**在线启发式冻结为一套权重**（本方案拍板，禁止再开第四套）：

| 项 | 权重 | 代码落点 |
|:---|:---|:---|
| \(w_B\) 折弯 | 100 | `computeCost` / `solveAlgebraicPorts` |
| \(w_L\) 长度 | 0.01 | `computeCost` |
| blocked | 50 | 端口法向 60px 探针 |
| reuseOut | 20 | 出口复用惩罚 |
| 未复用 IN | 5 | 入端口复用优惠 |
| alignment | −35 | 法向与位移点积 |
| \(w_S = C_{shift1}\) | **150** | **目前只在文档里；T2 必须接进代码** |

废弃不再使用的权重：`FLOW_ROUTING_ENGINE_DESIGN.md` 的 `100/3/1/0.1`、CONNECTION 伪码 `bends*3+dist*0.1`、合并文 `L1+35·Bends`。这些文档在勘误时改为「历史草案，不以之为实现」。

### 3.3 公理 A1–A6（实现义务）

| 公理 | 内容 | 代码现状 | 本方案动作 |
|:---|:---|:---|:---|
| **A1** WSAD | \(\mathrm{Dirs}_{in}(u)\cap\mathrm{Dirs}_{out}(u)=\emptyset\) | `solveAlgebraicPorts` 硬约束 | 保持；把 `stress_test` 的交为空检查升入 `test:flow` |
| **A2** 法向 stub | \(s_1=p_0+\lambda n(sp)\)，箭头只在 IN | 已实现，\(\lambda=\) `half` | 保持；LAYOUT 文与代码「贴边 vs 走廊中线」统一为：**接触点 = 边中点，stub 走到走廊中线** |
| **A3** 同向入流复用 | 每入方向唯一接待箭头 | `reuseIn` + `drawnInArrows`；**无 J\*** | 保持近似；J\* 合并放到 P6，先证引理 |
| **A4** 无碰撞 | 段 ∩ 节点盒 = ∅（Liang-Barsky） | 候选过滤；**兜底 L 可穿盒** | P1：兜底路径若碰撞则改外侧走廊，禁止穿盒出图 |
| **A5** 几何对齐 | 节点居中；拐点吸附通道网格 | `computeGridChannels` | 保持 |
| **A6** 对角扩展格 | `vh=D` → \(gx+1\) 且 \(gy+1\)，\(C_{diag}=150\) | cellXY 已落地；**150 未编码** | 位移代价只在 T2 中计，布局层不改 |

**L0 支配引理（已述未证，本方案不阻塞实现）**：两轴均受阻时对角一次位移（150）优于两次轴对齐（300）；单轴受阻退化为单轴。

### 3.4 需求目标 G1–G5 与方法 M1–M8

| ID | 意图 | 现状 | 本方案 |
|:---|:---|:---|:---|
| G1 就近走廊 | 不绕画布边缘 | 部分长边仍走外侧 | T2 守护腾挪优先于外侧 |
| G2 让位而非绕行 | 右阻列下移 / 上阻行右移 | **完整腾挪已回退** | 只允许 T2 守护版 |
| G3 稀疏可接受 | 拉开间距不是缺陷 | 成立 | 保持 |
| G4 有限空间 | 32/64 界内 | 成立 | 保持 |
| G5 确定性回归 | 无随机 + 断言 | 154 项 | 只增不改旧语义 |
| M1 正交曼哈顿 | 无斜线 | 成立 | 保持 |
| M2 折弯+距离 | cost 最小 | 分级候选近似 T1 | 在线保持候选；离线 T3 可选 |
| M3 出口象限 | 同向→上下向→反向 | 已有象限规则 | 与端口势能并存，不另开分支 |
| M4 WSAD | 同侧不既入又出 | A1 已实现 | 保持 |
| M5 障碍腾挪 | 整列/整行单位格 | 仅 `gridX/Y += 1` 射线 | 升级为 T2 |
| M6 收敛 | 只下只右 + 上界 | 射线无回滚 | T2 良基接受条件 |
| M7 可解 | 容量够 → Φ=0 | 未量化 | T2 后出 Φ 报告 |
| M8 合并 | 后程最短 | **代码零实现** | P6，先证「合并不增 bend/len/箭头」 |

### 3.5 分层最优声明（本方案的承诺上限）

| 情形 | 保证 | 本阶段是否做 |
|:---|:---|:---|
| 一般图 · 收敛 | 必然终止（良基） | 做 T2 即得 |
| 一般图 · 布局质量 | 位移邻域一阶局部最优 | T2 实现后自动得到 |
| 单条边（端口+同伦固定） | 全局精确最优（Dijkstra） | **本阶段不做**；维持分级候选 |
| 布线半边 ILP | 带证书全局最优 | **本阶段不做**（P5 可选离线） |
| 受限泳道（主干单调链） | 解析全局最优 | **本阶段不证 T3'** |
| 一般图 · 全局最优 | **NP-hard，不承诺** | 明确写进 SPEC/手册 |

旧文「合并+迭代 → 全局最优」「B≥3 无条件位移且 ΔJ≤−300」全部作废。

### 3.6 布局时序（用户已确认的 a/b/c）

不可再打乱：

```
a. DSL 解析：泳道 + 节点落格 + 声明序
b. 交叉格内排序：computeCellOrder（vh 值保持，只变「相对谁」；缺省 vh 由 seedDir / 上游方位推导）
c. 连线避障：solveAlgebraicPorts → solveAlgebraicRoute（在 nodePos 之上）
```

可选增量（独立守护）：

- **a'** 无 `Location` 的二维 `autoSeq` 改用 `computeMainlineOrder`（部件已可测，**未接线**）
- **b'** 不变
- **c'** 在 c 之前插入 T2 守护位移（改 `gridX/Y`，再重算 `nodePos`，再走 c）

---

## 4. 文档审阅结论

文档数量多（24 篇 FLOW_* + SPEC + 手册 + 协议），质量两极：过程日志可追溯性极高，**自称与代码同步的规范却严重滞后**。

### 4.1 必须立刻勘误的「现行文档」（规范事故）

这些文件标头写「与代码同步」，数字/状态已错：

| 文件 | 问题 | 修正 |
|:---|:---|:---|
| `IQS_FLOW_DSL_SPEC.md` 标头 | 「parser 40 + svg 41」 | 改为 154（分项列出），状态「已实现 + 最优性框架 P3–P6 待做」 |
| SPEC BNF | 无 `Attach` / `vh` / `Type[T]` | 补进 §1.1 |
| SPEC §5.3 / §7.1 | N/DATA 占格与默认流口径过时 | 写清：不占交叉格；DOC 虚拟列；不作默认流出源 |
| `USER_MANUAL_FLOW.md` §5 | 断言 111（46+53+12） | 154；补 Attach / VHD |
| `FLOW_LAYOUT_ENGINE_DESIGN.md` | ⑥ 仍写旧引擎「3 轮避障」；断言 138 | ⑥ 改为代数路由；断言 154 |
| `FLOW_CELL_ORDER_DESIGN.md` 文头 | 「待实施」 | 改为「已实施」 |
| `FLOW_NDATA_LANE_DESIGN.md` 文头 | 「待评审未实施」 | 对照代码改为已实施（DOC 列） |
| `protocol/segments/flow.md` | 末行损坏文本 `Riverside,`；无 Attach/vh | 删除损坏行；补最小语法 |
| `protocol/DSL_V1.md` | 「13 核心 kind」漏 `flow` | 改为 14，名单含 `flow` |
| `IQS_CHART_MCP_DESIGN.md` | 核心 14 工具无 `render_flow` | 补入；VChart 归 relief |
| `IQS_DSL_AGENT_MANIFESTO.md` | 无 Flow 专节 | 补 2.x Flow：Dict+Lane+W，禁止 Mermaid 冒充 |
| `FLOW_EDITOR` 内嵌 HELP | AxisY「文字纵向」 | 与 spec 一致：坐标标题水平 |

归档日志（P0/ALIGN/STAGES）**保留当时数字**，但文头加一行「归档时点，数字以当时为准」。

### 4.2 口号降级（FRAMEWORK §5 已指出、正文未改）

| 原文 | 改为 |
|:---|:---|
| PROOF §3「合并+迭代 → 全局最优」 | 指向 FRAMEWORK §0 分层表 |
| ALGEBRAIC §3.2「B≥3 无条件位移」 | T2 守护条件 |
| MATH §4「线路合并已接入」 | 未实现；仅端口复用 + 箭头去重 |
| CONNECTION M8 判定「趋近全局最小」 | 局部稳定点；合并待证 |

### 4.3 内部未拍板的产品张力（本方案拍板）

| 张力 | 拍板 |
|:---|:---|
| 绕行 vs 腾挪 | **腾挪优先，但只走 T2**；T2 拒绝则允许外侧走廊 |
| 稀疏 vs 主干平齐 | **Tier1 主干 `gridY=0` 锁定**，T2 受害边含主干时更难通过 ΔΦ≤−150 |
| N/DATA 不占格 vs DOC 列 | **DOC 虚拟列保留**（已实现、断言锁定）；SPEC 吸收此语义，不再写「右上走廊依附」 |
| 端点走廊中线 vs 贴边 | **接触点贴边中点 + stub 到走廊中线**（A2），LAYOUT/ALGO_STATE 统一 |
| 缺省 vh=V vs 智能推导 | **以 CellOrder 为准**（seedDir / 上游方位）；SPEC 改「未标注由格内拓扑序推导，无种子则 V」 |
| 一般图全局最优 | **不承诺** |

### 4.4 语法指南缺口

`output/flow-syntax-guide/` 规划 01–17，仅 00/01/02 落地。它**不是实现依据**。补全放到文档里程碑 D2，不阻塞 A/B/C 代码。

---

## 5. 代码评估（对照数学承诺）

### 5.1 架构现状

```
DSL 文本
  → parseFlowDSL (FlowParser.ts, 690 行)
  → FlowData + Styles
  → computeExcelLayout (flowToSVG.ts, 1058 行)   // a 落格 + b CellOrder + 弱射线松弛
  → solveAlgebraicPorts / solveAlgebraicRoute    // c 连线
  → SVG 字符串 → FlowDiagram (pan/zoom/PNG)
并行：flowToDsl (往返) / flowToBpmnXml (交换)
未接线：computeMainlineOrder
```

模块边界清晰，但 `flowToSVG.ts` 把布局+渲染+（已删除的旧走线残留注释）耦在一个千行文件里。Parser 单函数约 630 行。可维护，但继续加 T2 前应把 `computeExcelLayout` 抽到独立模块（纯搬迁，行为零变）。

### 5.2 对照 FRAMEWORK 实施路线

| 步骤 | 内容 | 状态 |
|:---|:---|:---|
| P1 A6 对角 | types/Parser/cellXY | ✅ |
| P2 死代码清理 | 旧引擎函数已删 | ✅ |
| P3 水平射线覆盖主干 | 当前仅 N/DATA | ❌ |
| P4 T2 守护位移 | 无受害边集、无 ΔΦ、无回滚 | ❌ |
| P5 T3 ILP | 未做 | 本阶段不做 |
| P6 M8 合并 + T3' | 未做 | 本阶段后置 |
| 主干序 autoSeq | 部件可测，未接线 | ❌ |
| A4 兜底穿盒 | 无通道时返回可碰撞 L | 缺陷 |
| FlowEditor UI | 浅色 IDE 轨，与侧栏撕裂 | 缺陷 |
| MCP 文法入口 | 薄描述不够；kind 资源是缩水 json 字段 | 缺陷 |

### 5.3 代码质量要点

**已健康**：无 debugger；`:any` 少；每里程碑独立 commit；`test:flow` 接入 `build`。

**真实问题**：

1. `flowToSVG.ts` 文件头 ⑥ 仍描述已删除的旧引擎。
2. `getSvgSize(data)` 不传 styles，与绘制可能不一致。
3. `DEFAULT_FLOW_STYLES` 在 `types.ts` 与 Parser 各一份。
4. Tarjan SCC 在 Parser 与 MainlineOrder 各写一份。
5. 回边判定绑死中文标签 `{驳回,不达标,整改,否}`。
6. `Color[StartText/EndText/Label/Node]` 写入不存在的 style 键；`TaskText` 无映射。
7. `flowToDsl` 会把默认顺序流写出、不序列化 Color。
8. BPMN DI waypoint 用端点两点，不是代数折线。
9. `stress_test_complex_flow.ts` 验证 A1/A4 但不进 `test:flow`，失败不 `exit`。
10. FlowEditor 未用 import、`opacity-0` 占位按钮、HELP 过时。

### 5.4 构建过程评估

`package.json`：

```
test:flow = assert_parser + assert_svg + assert_bpmn + assert_mainline + assert_cell_order
build     = validate:dsl + test:flow + sync-tools + vite
```

优点：Flow 改动进不了发行包除非断言全绿。短板：无像素回归；覆盖率未统计；CI 工作流已加但可视化回归仍缺。本阶段不引入新测试框架，只把 A1/A4 硬约束从 stress 升入 `assert_flow_svg`。

---

## 6. 方案一：代码改善与功能完善

按「先冻结契约 → 再修正确性 → 再接数学台阶 → 最后可选增强」排序。每步独立 commit，遵循既有守护流程。

### 6.1 A0 契约冻结与文档勘误（不改行为）

**目的**：让后续实现有一份不撒谎的说明书。

1. 按 §4.1 / §4.2 勘误 SPEC、手册、LAYOUT、CELL_ORDER、NDATA、协议、DSL_V1、MCP 设计、Manifesto。
2. `flowToSVG.ts` 文件头 ⑥ 改为代数路由真实描述。
3. 归档日志文头加「归档时点」。
4. 在 SPEC 新增一小节「最优性承诺」= FRAMEWORK §0 分层表（压缩版）。

**验证**：grep 关键过时数字（40+41、111、13 核心 kind）；`test:flow` 零变化。

### 6.2 A1 正确性补丁（小改动、高价值）

| 项 | 做法 | 断言 |
|:---|:---|:---|
| A4 兜底禁止穿盒 | `solveAlgebraicRoute` 最后的 L 兜底若 `hitsObstacle`，改返回代价最低的外侧走廊；仍无则保留 L 但打 `data-flow="pierce"` 并 warning | svg：样例路径段不与第三方盒相交 |
| `getSvgSize` 传 styles | `FlowDiagram` 调用与 `flowToSVG` 同一 styles | 现有尺寸断言不回归 |
| Color 槽对齐 | Parser 只写入 `FlowChartStyles` 已有键；`TaskText` 映射或从 kinds.json 去掉 | parser 非法槽 warning |
| 回边词表 | `isExplicitBack` 改为：边 `default===false` 且（标签命中可配置否定词 **或** `dx<-40`）；词表抽常量 | 现有回边样例不回归 |
| 默认边往返 | `flowToDsl` 真正跳过 parser 生成且节点段未显式的默认边 | round-trip 幂等断言 |
| A1 入护栏 | 从 stress 抽取「任意节点 in∩out=∅」进 `assert_flow_svg` | +1 |

**不做**：拆 `flowToSVG.ts` 与本步捆绑。抽模块放到 A1b（纯搬迁 commit）。

### 6.3 A1b 结构搬迁（行为零变）

把 `computeExcelLayout` / `nodeMetrics` / `FLOW_SVG` 抽到 `components/flow/ExcelLayout.ts`。`flowToSVG.ts` 只负责着色。Tarjan 抽 `components/flow/scc.ts`，Parser 与 MainlineOrder 共用。

验证：154 项零回归 + tsc。

### 6.4 A2 接线 MainlineOrder → autoSeq（行为变更，独立守护）

**意图**：无 `Location` 的二维节点按业务主干（`default` 边最长路）落格，而不是行优先扫空位。与「关键路径优先摆放」一致，且**不新增 DSL 语法**（已拍板）。

**做法**：

- 仅改二维 `autoSeq` 填充顺序 = `computeMainlineOrder` 结果。
- 单维 / ROOT / 显式 Location **不动**。
- 新增断言：二维无 Location 的主干链沿流向占相邻格。
- Φ 统计：接入前后绕外侧边数 / Σbends / Σlen，不降即回滚。

风险：现有二维+无 Location 样例少。先用探针数清数量，再改。

### 6.5 A3 T2 守护位移（本阶段数学主项）

这是「腾挪 2→4 恶化」的根治，也是 G2 的唯一合法实现。

**算子**（严格按 FRAMEWORK §4 T2）：

```
对每条 B(e)≥3 的正向边：
  1. 枚举受害边集 S = 穿过候选被挪格 ±1 走廊的边
  2. 试探位移：
       水平受阻 → 阻挡节点 gridY += 1（及其下方同列，单位一绘制格）
       垂直受阻 → 阻挡节点 gridX += 1（及其右侧同行）
       两轴受阻 → A6 对角一次（gridX+=1 且 gridY+=1），代价按一次 150 计
  3. 重算 nodePos + 全边 solveAlgebraicRoute
  4. ΔΦ = Φ_after - Φ_before
     仅当 ΔΦ ≤ -150 接受，否则回滚
  5. 位移只下/只右；界内 32/64；迭代上限 max(8, |E|*2)
```

**Tier 约束（拍板）**：Tier1 主干节点（`computeMainlineOrder` 主线上、且 `gridY===0` 的 task/start）被列入 S 时，额外加惩罚 `w_tier1 = 200`，使「推主干换直连」更难通过。这闭合「稀疏许可 vs 主干平齐」张力。

**P3 水平主干松弛**并入 T2：不再单独做「无守护的水平射线」。N/DATA 现有对齐逻辑保留为 T2 的一种候选（文档虚线优先级 1000，本来就后置）。

**验证**：

- 既有 154 零回归。
- 新增：曾经 2→4 的样例，接受后绕外侧边数不增。
- Φ 报告写入过程日志（绕外侧 / Σbends / Σlen / 接受次数 / 回滚次数）。
- A1 在位移后仍成立。

**明确不在本步**：J\* 合并、Dijkstra、ILP。

### 6.6 A4 可选增强（本阶段可延期）

| 项 | 条件 |
|:---|:---|
| J\* 合并 | 先写「合并不增 bend/len/箭头」交换论证短文，再实现 |
| 共端口入线末端微错位 | 视觉打磨，T2 稳定后 |
| BPMN waypoint = 代数折点 | 交换层，不触渲染 |
| AttrPanel §6.4 计数/排名/公式 | 产品增强，非正确性 |
| 像素回归 | 成本中等，不阻塞 |

### 6.7 代码改善的模块边界（目标态）

```
components/flow/
  FlowParser.ts          解析 + §10 校验
  scc.ts                 Tarjan（共用）
  CellOrder.ts           格内拓扑序（已有）
  MainlineOrder.ts       主干序（已有，A2 接线）
  ExcelLayout.ts         computeExcelLayout + T2 守护位移（A1b/A3）
  AlgebraicFlowRouter.ts 端口 + 路径（A1 穿盒兜底）
  flowToSVG.ts           纯渲染
  FlowDiagram.tsx        视图
  FlowEditor.tsx         侧栏（方案 B）
  FlowBpmn.ts            交换
```

---

## 7. 方案二：左侧 Editor 面板一致性与美化

### 7.1 问题

`Workspace` 侧栏是 **420px 深色**（`bg-[#0f172a]`）。其它 15 个 Editor 共用：

- 根：`flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)]`
- Header：40×40 Cpu 盒 + 中文大标题 + `IQS Xxx Engine | LUXI LAB`
- 右上：`RotateCcw` 恢复示例 + `HelpCircle`
- 三等分 Tab：手动录入 / DSL 编辑器 / AI 推理
- 内容：`p-6` 滚动；DSL textarea 深色圆角 inner-shadow；AI 有 Engine 绿点徽章

FlowEditor 是另一套浅色 IDE：左 40px 图标轨、无 Header、无手动页、硬编码 `slate-*`、白底 HELP。放进深色侧栏会直接撕裂。

### 7.2 对齐原则

1. **套用 Fishbone/PDPC/Arrow 骨架**，不发明第四种壳。
2. **保留 Flow 特有能力**：解析状态栏（节点/边/泳道/error/warn）、`flowToDsl` 往返、`Attach`/`vh`。
3. **手动页按字典-索引建模**，不要做成「拖拽画布」——DSL 仍是唯一数据源。
4. 切到 DSL Tab 时用 `flowToDsl(data)` 同步（与其它编辑器 `generateDSLFromData` 同构）。
5. 默认 Tab = **手动录入**（与其它组件一致），复杂用户再进 DSL。

### 7.3 目标信息架构

```
┌──────────────────────────────────────────────┐
│ [Cpu] 企业流程图分析                         │
│       IQS FLOW ENGINE | LUXI LAB    ↺  ?    │
├──────────────────────────────────────────────┤
│  手动录入  │  DSL 编辑器  │  AI 推理         │
├──────────────────────────────────────────────┤
│  （滚动内容，见下）                           │
├──────────────────────────────────────────────┤
│ ✓ 已解析  节点 22 · 边 27 · 泳道 2   ⚠ 0    │  ← 保留，改 sidebar 令牌
└──────────────────────────────────────────────┘
```

### 7.4 手动录入页（Flow 特有，必须做）

分区卡片，全部写回 DSL 再 `parseFlowDSL`（单一数据源，避免双源）：

| 分区 | 控件 | 回写 |
|:---|:---|:---|
| 分析课题 | Title 输入；Layout `H/V` 切换 | `Title:` / `Layout:` |
| 数据层 Dict | 每本字典一张卡：名（D/P/R 锁定 + 自定义可增删）+ 值芯片可增删改 | `Dict: Name[v1,v2]` |
| 结构层泳道 | 两行：横向 from 哪本字典（多选索引）/ 纵向 from 哪本 | `Lane from … Layout H/V` |
| 轴与边栏 | AxisX/AxisY/Axis 文本 + Align L/C/R；Attr active 多选六键 | `Axis*` / `Attr active` |
| 节点活动 | 列表：id、标签（字面量或 `dict[i]`）、Type 下拉（S/E/T/?/+/SUB/N/DATA）、Location 两个索引、六属性折叠、vh V/H/D、Attach | `W:` 行 |
| 网关出口 | 当 Type 为 ?/+ 时展开：标签 → 目标 id，+「否则」开关 | 缩进分支 + `End` |
| 显式边 | 源 → 目标 + 可选标签 | 文末 `a → #b` |
| 颜色方案 | `kinds.json` colorSlots 色板 | `Color[Slot]:` |

节点列表支持上移/下移（影响声明序/默认流）与删除。添加节点按钮插入 `W: wN: 新活动`。

**不做**：画布内拖拽改 Location（会绕过 DSL 源驱动）；子流程可视化嵌套编辑器（DSL 缩进已够，手动页对 SUB 用「内部节点」折叠列表即可）。

### 7.5 DSL 页

复制 Fishbone textarea class：

```
bg-[var(--input-bg)] text-[var(--sidebar-text)] p-8 font-mono text-[11px]
border border-[var(--input-border)] rounded-lg shadow-inner custom-scrollbar
```

错误用 `bg-red-500/10` 条展示完整信息（不要 `slice(0,80)`）。警告可折叠列表。

### 7.6 AI 页

与其它组件同构：

- 标题「智能流程描述」+ `Engine Active: {engineName}` 绿点
- 占位示例：跨部门审批（部门/阶段/判断条件）
- 主按钮「智能解析并回填」`h-16`
- 推理提示卡（**Flow 专属红线**，见方案 C §8.6）：
  - 必须 `Dict` 先于 `Lane`/`W`
  - 判断/并行必须分支行 + `End`
  - 禁止输出 Mermaid `flowchart TD` / `graph LR`
  - 标签优先字典引用；图上会展开字典值
  - 纯文本，无 Markdown 围栏

`generateLogicDSL` 的 constraint 5 对 `iqs_native`+`flow` 必须改写（见 §8.6），否则 AI Tab 会诱导 `# 分类 / - 项目`。

### 7.7 帮助知识库

`createPortal` + `z-[10000]` 暗色玻璃，双 Tab：

1. **DSL 规范**：表格式语法（从 `protocol/segments/flow.md` 同步，禁止再维护一份过时 HELP 字符串）
2. **BPMN 子集 / 对齐原理**：3×3 绘制格、WSAD、默认顺序流、DOC 列

底部 CTA「我理解了，开始建模」。示例用采购审批（协议官方 Seed）。

### 7.8 视觉令牌

全部改 CSS 变量：`--sidebar-bg` `--sidebar-text` `--sidebar-muted` `--sidebar-border` `--input-bg` `--input-border` `--nav-bg` `--card-bg`。禁止硬编码 `#3b82f6` / `slate-200`。选中 Tab 用 `bg-teal-600`（`TOOL_CONFIGS.flow` 已是 teal），与其它组件「每工具一色」一致。

删除：左图标轨、`opacity-0` 按钮、未用 lucide import、内联 `fontFamily`。

### 7.9 实现策略

- **B0**：只换壳（Header + 三 Tab + 令牌 + DSL/AI 页 + 帮助），手动页可以是「Dict 只读摘要 + 引导去 DSL」。此步即可消除撕裂。
- **B1**：落地 §7.4 手动页（Dict/Lane/节点表单）。
- **B2**：Color 色板、网关出口编辑、子流程折叠。

建议 B0 与方案 C 的 AI 红线同一 PR；B1 独立 PR。

---

## 8. 方案三：MCP DSL 声明 —— 让外部大模型准确理解并绘制

### 8.1 问题本质

外部模型**不会读仓库里的 24 篇 FLOW 文档**。它只看到：

1. `list_tools` 一行薄描述
2. （如果它听话）`read protocol://segments/iqs_native/flow`
3. `CallTool render_flow({ dsl, width, height })` 的返回图或一句「渲染错误」

当前失败模式：

- 薄描述与 `render_mermaid_flowchart` 抢「流程图」意图
- kind 资源拼的是 `mcp_tools.json` 的**缩水** `syntax_rules`，不是 `protocol/segments/flow.md`
- 无 Attach / vh / 子流程块 / `否则` / 默认顺序流 / Color
- 只有 1 个官方示例
- 渲染失败不返回 parser errors，模型无法自我修正
- `protocol/DSL_V1.md` 核心名单 13 个、漏 flow
- 前端 `generateLogicDSL` constraint 5 把 Flow 当成鱼骨分级语法；`max_tokens: 2000` 不够写二维泳道

ILDR 瘦 catalog **方向正确**（250k → 数 k），FLOW 的下一刀不是把 SPEC 塞回 `list_tools`，而是让**一次 read 就够编译**。

### 8.2 分层声明架构（拍板）

```
L0  list_tools 薄描述（路由卡，≤ 500 字）
      ↓ 强制指引 read
L1  protocol://segments/iqs_native/flow   （编译卡：完整可写文法 + 2 正例 + 3 反例）
      ↓ 复杂场景可选
L2  protocol://segments/flow              （protocol/segments/flow.md 全文，不再拼接 governance）
L3  docs/flow/spec/IQS_FLOW_DSL_SPEC.md             （人读规范，不进 MCP 默认路径）
```

原则：**L0 负责选对工具；L1 负责写出能 parse 的 DSL；L2 负责进阶；调用循环靠 parser 诊断，不靠把校验 18 条提前灌进 context。**

### 8.3 L0 路由卡（`buildThinDescription` 对 flow 特化）

`list_tools` 对 `render_flow` 使用专用模板，而不是通用拼接：

```
[CORE] IQS 企业流程图/泳道图
面向体系文件（CX）：谁×做什么×走哪条路。字典-索引 DSL（Dict / Lane from / W），自研 SVG。
intents: 流程图, 泳道图, 程序文件, 跨部门流程, BPMN, swimlane
NOT mermaid: 企业泳道/审批/程序文件必须用本工具，禁止 render_mermaid_flowchart。
must: Dict 先于 Lane 与 W；Type[?]/[+] 必须分支行并以 End 闭合；纯文本非 JSON。
read: protocol://segments/iqs_native/flow
dsl: IQS-DSL v1 pure text (not JSON)
```

同时给 `render_mermaid_flowchart` 的薄描述加一句：

```
RELIEF only. 体系文件/部门泳道/BPMN 子集请改用 render_flow。
```

Core 工具已排在 relief 之前；这两句是双保险。

### 8.4 L1 编译卡（一次 read 即可写对）

`ReadResource(protocol://segments/iqs_native/flow)` **不要**再拼 json 短字段。改为固定七段，总预算建议 ≤ 8k tokens：

1. **身份**：tier=core，body=FlowGraph，engine=svg，禁止 Mermaid。
2. **最小 BNF**（与 SPEC §1.1 同步后的真 BNF，含 Attach / vh / Type[T] / End）。
3. **非协商红线**（模型最容易写错的 8 条）：
   - Dict 必须先定义再引用；D/P/R 保留字
   - 结构分隔符半角逗号，标签内全角标点
   - `#` 只用于 `#节点id`，不作注释、不作标题层级
   - 普通节点按声明序自动连；`Type[?]`/`Type[+]` **禁止**依赖自动出边
   - 分支块与子流程块必须 `End`
   - 开始、结束各至少 1 个（子流程内部 start 不计顶层）
   - N/DATA 用 `Attach(#id)`，不作流转目标
   - 输出纯文本：禁止 ` ``` `、禁止 JSON、禁止 `flowchart TD`
4. **节点类型表**：S/E/T/?/+/SUB/N/DATA 一行一张。
5. **正例 2 个**：
   - Seed A：协议里的采购审批（二维矩阵 + 判断）
   - Seed B：来料检验（单维 + SUB + 出口名）——协议已有，json 没带上
6. **反例 3 个**（各两行：错的 → 对的）：
   - 用了 `flowchart TD`
   - 判断节点无 `End`
   - `Lane from` 写在 `Dict` 之前
7. **输出控制**：CoT 自检红线后只 emit DSL；调用 `render_flow`。

这七段从 `protocol/segments/flow.md` **生成**，禁止在 `mcp_tools.json` 再手写一份会漂的 syntax。实施上：

- `mcp_tools.json` 的 `syntax_rules` / `official_example` 改为短摘要或删除
- `index.js` 对 `iqs_native/flow` 走「读 `protocol/segments/flow.md` + 注入红线/反例附录」
- 附录可放 `protocol/segments/flow.agent.md`（专门给模型的编译卡，人读仍看 flow.md）

推荐新增 `protocol/segments/flow.agent.md`，与人读切片分离：人读可以散文化，模型卡必须条目化、有反例。

### 8.5 调用闭环：把 parser 诊断还给模型

`CallTool render_flow` 成功/失败都附短诊断（不回完整 canonical JSON，控制 token）：

**失败**（parse error 或 headless 抛错）：

```
error: true
parser_errors:
  - "第 12 行：判断节点 q1 缺少 End"
parser_warnings: []
hint: "Type[?] 的出口必须写成缩进分支并以 End 闭合。见 protocol://segments/iqs_native/flow §红线"
```

**成功**：

```
error: false
nodes: 22
edges: 27
lanes: 2
warnings: []          # 若有则列出，便于模型决定是否重写
image: <url or base64>
```

JSON 拦截的纠正示例按工具分流：flow 给 `Title:` + `Dict:` 骨架，不要给 `Spec: {…}`（那是 VChart）。

可选（不阻塞）：`lint_flow` 工具只跑 `parseFlowDSL` 不渲染，供模型在出图前自检。若做，必须 thin description，避免再膨胀 catalog。

### 8.6 前端 AI 通道（与 MCP 同源）

`services/aiService.ts`：

```javascript
const getConstraint5 = () => {
  if (parentType === 'vchart') return `…`;
  if (parentType === 'mermaid') return `…`;
  if (subType === 'flow') return `5. **IQS-Flow**：必须 Dict → Lane → W；判断/并行必须分支+End；严禁 flowchart TD / graph LR / JSON / Markdown 围栏。`;
  return `5. **标准 DSL 分级**: Title: / # 分类 / - 项目 …`; // 仅鱼骨等
};
```

- `max_tokens`：flow 升到 **4000**（二维 20+ 节点样例会超 2000）。
- system prompt 对 flow 追加 L1 红线摘要（可直接读 `/mcp_tools.json` 已同步的 agent 卡）。
- 生成后先 `parseFlowDSL`：有 error 则把 errors 作为第二轮 user message 让模型修，最多 1 次重试，再回填编辑器。

### 8.7 kinds / 协议 / 手册同步清单

| 位置 | 动作 |
|:---|:---|
| `dsl/kinds.json` | 已有 `mcpName: render_flow`；intents 加「审批流程」「体系文件」；可保留「航道」 |
| `protocol/DSL_V1.md` | 13 → 14，名单加 `flow`；红线加「流程图终稿用 render_flow」 |
| `protocol/governance.md` | 确认 core vs relief：体系文件流程图 = core |
| `protocol/segments/flow.md` | 删 `Riverside,`；补 Attach、vh、默认顺序流、禁止 Mermaid |
| `protocol/segments/flow.agent.md` | **新建** L1 编译卡 |
| `mcp_tools.json` | description 按 §8.3；syntax 改为「以 agent 卡为准」或生成时覆盖 |
| `docs/IQS_DSL_V1_SPEC.md` | 补 §5.14 FlowGraph 正文（现在 5.13 后直接救济层） |
| `docs/IQS_DSL_V1_MANUAL.md` | 身份卡已有；补最小示例与反例 |
| `docs/IQS_DSL_AGENT_MANIFESTO.md` | 补 Flow 专节 |
| `docs/IQS_CHART_MCP_DESIGN.md` | core 列表加入 `render_flow` |
| `docs/flow/manual/USER_MANUAL_FLOW.md` §5 | MCP 段写清：外部模型应 read kind 资源，不要凭记忆写 Mermaid |

### 8.8 模型可执行的「绘制契约」（给接入方的一页纸）

外部系统（Cursor / Claude / 自建 Agent）接入时应遵守：

```
1. list_tools 后若用户要「部门泳道 / 审批 / 程序文件 / BPMN 子集」→ 选 render_flow
2. 先 read protocol://segments/iqs_native/flow
3. 按编译卡写纯文本 DSL
4. call render_flow({ dsl, width: 1400, height: 900 })
   （二维矩阵默认高度 800 容易裁切，建议 900–1200）
5. 若 error=true，按 parser_errors 修改，最多两轮
6. 不要把节点坐标算成像素——Location 只写字典索引，布局由引擎做
7. 不要试图用 vh 微雕像素；vh 只表达格内相对方位（V 下 / H 右 / D 对角）
```

第 6、7 条极度重要：模型常想「自己排版」。必须明确 **排版是引擎的数学问题（A5/A6/T2），模型只负责语义图。**

### 8.9 验收样例（MCP 专用）

用同一套自然语言需求，分别让「只看 L0」「看 L0+L1」「看 L0+L1+失败诊断」生成，统计 parse 成功率：

| 用例 | 期望语法点 |
|:---|:---|
| 采购审批（协议 Seed） | 二维 Lane + Type[?] + End + 显式边 |
| 来料检验 | 单维 + SUB + 出口名 |
| 「用 flowchart 画跨部门审批」 | 必须路由到 render_flow，产出 IQS-Flow 而非 Mermaid |
| 判断漏 End | 第一轮可失败，诊断后第二轮闭合 |
| 含 N/DATA | Attach，且不作为流转目标 |

目标：L0+L1 下 Seed 类成功率 ≥ 90%；误路由到 Mermaid = 0。

---

## 9. 实施路线与里程碑

依赖：B 的 AI 红线依赖 C 的 constraint 5；A3 T2 依赖 A1 穿盒兜底与 A1b 搬迁；C 的 L1 依赖 A0 的协议勘误。

```
M-Doc   A0 文档勘误 + 协议补全 + DSL_V1 14 kind     （无代码行为）
M-UI    B0 Editor 换壳 + C 的 AI constraint 5        （可见、低风险）
M-MCP   C L0/L1/诊断闭环 + flow.agent.md              （外部模型可测）
M-Fix   A1 正确性补丁 + A1b 搬迁                      （护栏升级）
M-Ord   A2 MainlineOrder 接 autoSeq                  （行为变更）
M-T2    A3 守护位移                                   （数学主项）
M-Man   B1 手动录入页                                 （可与 M-T2 并行）
M-Opt   A4 / B2 / 语法指南 03–17                      （可选）
```

建议执行顺序：

**`M-Doc → M-UI → M-MCP → M-Fix → M-Ord → M-T2`**，`M-Man` 插在 M-MCP 之后与 M-Fix 并行。

每里程碑：

```
npx tsc --noEmit
npm run test:flow          # 只增断言，不改旧语义
npm run build              # 含 validate:dsl + sync-tools
独立 commit: feat(flow): Mx …
追加 docs/flow/notes/FLOW_LAYOUT_NOTES_PHASE2.md
```

T2 / autoSeq 额外：黄金样例 SVG 目视 + Φ 统计，不降即回滚。

### 9.1 工作量粗估

| 里程碑 | 体量 | 风险 |
|:---|:---|:---|
| M-Doc | 小（多文件文字） | 极低 |
| M-UI B0 | 中（重写 FlowEditor 壳） | 低（不碰引擎） |
| M-MCP | 中（index.js + agent 卡 + CallTool 诊断） | 中（要测外部模型，需人工抽检） |
| M-Fix | 小–中 | 低 |
| M-Ord | 中 | 中（改落格） |
| M-T2 | 大 | 高（必须 Φ 护栏） |
| M-Man | 中–大 | 低（只写 DSL） |

---

## 10. 过程记录与文档治理约定

用户要求：**后续相关修订都必须同步记录并落盘过程文件**。本方案把约定写死。

### 10.1 过程文件

- **本方案**：`docs/flow/notes/FLOW_LAYOUT_PLAN_PHASE2.md`（本文）。方案本身的修订在文头改日期，并在 NOTES 记一笔「方案修订」。
- **过程记录**：`docs/flow/notes/FLOW_LAYOUT_NOTES_PHASE2.md`。每个里程碑、每次回滚、每次拍板追加一节，禁止覆盖历史。
- **数学框架**：仍以 `FLOW_OPTIMALITY_FRAMEWORK.md` 为上限；T2 落地后在 FRAMEWORK §6 把 P3/P4 标 ✅，不要另起炉灶。

### 10.2 每节 NOTES 必含

1. 基线 commit
2. 改动文件表（文件 × 性质 × 验证方式）
3. `test:flow` / `tsc` / `build` 实测数字
4. 若行为变更：Φ 或样例外观结论
5. 未做项与原因
6. 若偏离本方案：写明新拍板（dec-id 可选）

### 10.3 文档同步规则

代码先于文档的缺口（Attach、vh、DOC 列、代数路由）必须在 **同一里程碑** 写进 SPEC/协议/agent 卡。禁止再出现「代码已做、现行规范仍写未实现」。

归档日志不改数字；现行规范必须改数字。

---

## 11. 验收标准

### 11.1 方案 A

- SPEC/手册/协议不再出现 40+41、111、13 kind 等过时口径
- A4：默认样例与复杂样例无穿盒路径（断言锁定）
- A1 WSAD 进入 `test:flow`
- autoSeq 接线后：无 Location 二维主干沿流向相邻；154+ 新断言全绿
- T2：2→4 恶化样例绕外侧边数不增；Φ 报告落盘；位移只下/只右

### 11.2 方案 B

- FlowEditor 与 Fishbone 同骨架：Header、三 Tab、深色令牌、重置、知识库
- 深色 420px 侧栏内无浅色图标轨
- B1：不写 DSL 也能用表单改 Dict/Lane/节点并出图
- AI Tab 不再诱导 `# 分类`

### 11.3 方案 C

- `list_tools` 中 `render_flow` 含 NOT mermaid + End/Dict 红线
- `read protocol://segments/iqs_native/flow` 含 BNF + 2 正例 + 3 反例
- `render_flow` 失败返回 parser_errors
- 误用「flowchart 画审批」路由到 `render_flow`（抽检）
- L0+L1 下协议 Seed 解析成功率 ≥ 90%

### 11.4 回归底线

任何里程碑结束时：`npm run test:flow` 全绿、`npx tsc --noEmit` 零错、`npm run build` 通过。不允许「先红再补」。

---

## 12. 明确不做 / 暂缓

- 重写 ③ 网格公式、节点居中、子流程整数倍
- 一般图全局最优证明或宣传
- 无守护的走廊腾挪（已回退，禁止再开）
- 在线 Dijkstra / ILP（T1 精确 / T3）—— 本阶段不引入求解器
- BPMN XML 反向导入
- 多画布 / 多流程编排
- 像素级视觉回归框架（可选，不阻塞）
- 把 24 篇 FLOW 文档全文灌进 MCP `list_tools`

---

*方案作者: 智能体辅助审阅（对照文档数学方法、commit 演进、组件对照、MCP 实装）*
*状态: 方案完稿，待按 M-Doc → M-UI → M-MCP 起执行*
*过程记录: `docs/flow/notes/FLOW_LAYOUT_NOTES_PHASE2.md`*
