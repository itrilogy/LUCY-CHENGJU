# IQS-Flow 文档索引（MOC）

> **用途**：FLOW 组件相关文档的**唯一入口**。按「权威层级 × 领域 × 类型」组织，并标注每份文档的**时效状态**，避免误引过时内容。
> **维护规则**：新增文档须在此登记；状态变化须同步更新。
> **上级索引**：**`docs/PROJECT_INDEX.md`**（全项目文档总索引与工程历程）—— 本文件是其 FLOW 专项子索引。
> **关联**：审计台账 `docs/flow/review/FLOW_AUDIT_FINDINGS.md`（R1–R21 / 140 条）· AI 推理卡审计 `docs/flow/review/FLOW_AGENT_CARD_AUDIT.md` · 工作记录 `docs/flow/notes/FLOW_ROUTING_WORKLOG.md`（W1–W17）· 数学方向 `docs/flow/math/FLOW_ROUTING_MATH_DIRECTIONS.md`

---

## 0. 标签体系

| 维度 | 取值 | 含义 |
|:--|:--|:--|
| **时效** | 🟢 现行 · 🟡 部分过时/已勘误 · 🔴 过时 · 🔵 历史快照 · ⚪ 未审计 | 与当前实现的一致性 |
| **权威层级** | L0 语言规范 · L1 运行时解析 · L2 MCP 资源 · L3 协议切片 · L4 说明文档 | 对齐 `protocol/governance.md` §3 |
| **领域** | DSL · 布局（Layout） · 布线（Routing） · 交换（Exchange） · 渲染（Render） · 协议（Protocol） | 功能域 |
| **类型** | 规范 · 设计 · 数学 · 过程记录 · 计划 · 评审 · 审计 · 手册 · 工作记录 | 文档性质 |

**命名规范（新增文档）**：`FLOW_<领域>_<类型>.md`
- 领域：`DSL` / `LAYOUT` / `ROUTING` / `EXCHANGE` / `RENDER` / `MCP`
- 类型：`SPEC` / `DESIGN` / `MATH` / `NOTES` / `PLAN` / `REVIEW` / `AUDIT` / `WORKLOG`

---

## 1. A · 规范层（L0–L3，权威）

| 文档 | 层级 | 领域 | 类型 | 时效 | 说明 |
|:--|:--:|:--|:--|:--:|:--|
| `docs/flow/spec/IQS_FLOW_DSL_SPEC.md` | **L0** | DSL | 规范 | 🟡 | FLOW DSL 规范 v0.7.1（权威） |
| `docs/IQS_DSL_V1_SPEC.md` | L0 | DSL | 规范 | ⚪ | DSL v1 架构/分层/权威序（跨 kind） |
| `docs/IQS_DSL_V1_MANUAL.md` | L0 | DSL | 规范 | ⚪ | DSL v1 细粒度语法手册（14 kind） |
| `dsl/kinds.json` | L0 | DSL | 规范 | 🟢 | 机器可读 kind 表（v1.1.0） |
| `protocol/DSL_V1.md` | L2 | 协议 | 规范 | 🟢 | MCP Resource `protocol://dsl/v1` 摘要 |
| `protocol/governance.md` | L2 | 协议 | 规范 | 🟢 | 权威层级 / Core vs Relief / token 策略 |
| `protocol/segments/flow.md` | L3 | 协议 | 切片 | 🟢 | FLOW 协议切片（人读：Soul/Grammar/Seed） |
| `protocol/segments/flow.agent.md` | L3 | 协议 | 切片 | 🟡 | FLOW 编译卡（LLM 一次读完即可写对） |

**已知漂移（引用前请核对审计条目）**

| 文档 | 漂移 | 审计 |
|:--|:--|:--|
| `IQS_FLOW_DSL_SPEC.md` | §9.1 canonical 示例不可复现（缺 `w2→q1`、含不存在的 `q2`）；§0.5 称"T2 待实施"（实际已实施） | AUD-017/018/002 |
| `flow.agent.md` | 未提"分支目标可省略""显式边标签"，与 spec §7.2/§7.3 口径不一（且两者实现均不支持） | AUD-020 |
| `IQS_FLOW_DSL_SPEC.md` §8.1 官方正例 | **样例自身断链**（`w4` 无出边）且会产出错误默认边 `w4→w5` | AUD-001/002 |

---

## 2. B · 设计层

| 文档 | 领域 | 类型 | 时效 | 说明 |
|:--|:--|:--|:--:|:--|
| `docs/flow/design/FLOW_LAYOUT_ENGINE_DESIGN.md` | 布局 | 设计 | 🟡 | 布局算法 v6（绘制格 3×3 / 整列整行统一扩展） |
| `docs/flow/design/FLOW_ROUTING_ENGINE_DESIGN.md` | 布线 | 设计 | ⚪ | 布线引擎设计（未逐行审计） |
| `docs/flow/design/FLOW_CELL_ORDER_DESIGN.md` | 布局 | 设计 | 🟡 | 格内拓扑序 + 缺省 vh 推导 |
| `docs/flow/design/FLOW_CORRIDOR_RELOCATE_DESIGN.md` | 布局 | 设计 | ⚪ | 走廊腾挪设计 |
| `docs/flow/design/FLOW_NDATA_LANE_DESIGN.md` | 布局 | 设计 | ⚪ | N/DATA 虚拟列（DOC 泳道） |
| `docs/flow/design/FLOW_CONNECTION_REQUIREMENTS_ALGO.md` | 布线 | 设计 | 🟡 | 需求目标 G1–G5 + 数学方法需求 M1–M8 + 伪码 |
| `docs/IQS_CHART_MCP_DESIGN.md` | 协议 | 设计 | ⚪ | MCP 图表服务设计 |

**已知漂移**

| 文档 | 漂移 | 审计 |
|:--|:--|:--|
| `FLOW_LAYOUT_ENGINE_DESIGN.md` | §6 称"未实施：T2"而 §100 又列出 T2（自相矛盾）；§1 称 stub `half/2` 而 §6 与实现为 `half` | AUD-065 |
| `FLOW_CELL_ORDER_DESIGN.md` | 声明"缺省 vh 按上游方位推导（H/D）"**不可达**（实测恒 V） | AUD-035 |
| `FLOW_CONNECTION_REQUIREMENTS_ALGO.md` | M4「两趟端口分配」、M5「整列/整行腾挪」均**未按文档实现**；M2 代价权重与实现差 333 倍 | AUD-061/062/063 |

---

## 3. C · 数学 / 理论层

| 文档 | 领域 | 类型 | 时效 | 说明 |
|:--|:--|:--|:--:|:--|
| `docs/flow/math/FLOW_ROUTING_ALGEBRAIC_THEORY.md` | 布线 | 数学 | 🟡 | 正交流形 / 势能泛函 / 三折线上界（已含 2026-09-02 勘误） |
| `docs/flow/math/FLOW_ROUTING_MATH_AND_IMPLEMENTATION.md` | 布线 | 数学 | 🟡 | 数学建模 + 实施追踪（M8 合并已勘误为零实现） |
| `docs/flow/math/FLOW_OPTIMALITY_FRAMEWORK.md` | 布线 | 数学 | 🟡 | 公理 A1–A6 / 引理 L1–L2 / 定理 T1–T4 / 分层最优声明 |
| `docs/flow/math/FLOW_CORRIDOR_RELOCATE_PROOF.md` | 布局 | 数学 | 🟡 | 腾挪的可解性/收敛性/最优性证明 |
| **`docs/flow/math/FLOW_ROUTING_MATH_DIRECTIONS.md`** | 布线 | 数学 | 🟢 | **新** · 6 个数学方向（D1–D6）+ 3 个可证引理 |

**已知漂移**

| 文档 | 漂移 | 审计 |
|:--|:--|:--|
| `FLOW_OPTIMALITY_FRAMEWORK.md` | §0 表称"T2 实现待做"（已实施）；A4（无碰撞）实为软约束；A5（拐点吸附）不成立；L1 前提不真 | AUD-027/028/033 |
| `FLOW_ROUTING_ALGEBRAIC_THEORY.md` | §6 网格定义（"列走廊中线 ∪ {x_u,x_v}"）与实现（列边界、无 x_u）不符 | AUD-028 |
| `FLOW_ROUTING_MATH_AND_IMPLEMENTATION.md` | §1.3「单调性定理」自称严格成立，实为**未证、未实现、很可能为假** | AUD-075 |
| `FLOW_CORRIDOR_RELOCATE_PROOF.md` | §1.1 论证对象（像素）与算子（槽位）错位 | AUD-033 |

---

## 4. D · 工程过程记录（时间线 / 演进）

| 文档 | 领域 | 时效 | 说明 |
|:--|:--|:--:|:--|
| `docs/flow/notes/FLOW_MAINLINE_ORDER_NOTES.md` | 布局 | 🟡 | 主干序排序键 + 编辑器导出契约 |
| `docs/flow/notes/FLOW_OPTIMALITY_EXECUTION_NOTES.md` | 布线 | 🔵 | 最优性框架实施过程 |
| `docs/flow/notes/FLOW_LAYOUT_NOTES_STAGES1-3.md` | 布局 | 🔵 | 阶段 1–3 执行记录 |
| `docs/flow/notes/FLOW_LAYOUT_NOTES_REMAINING.md` | 布局 | 🔵 | 剩余项执行记录 |
| `docs/flow/notes/FLOW_LAYOUT_NOTES_PHASE2.md` | 布局 | 🔵 | 下一阶段方案过程记录 |
| `docs/flow/notes/FLOW_LAYOUT_NOTES_ALIGN_RECOVERY.md` | 布局 | 🔵 | 对齐恢复记录 |
| `docs/flow/notes/FLOW_LAYOUT_NOTES_RECOVERY_P0.md` | 布局 | 🔵 | P0 恢复记录 |
| `docs/flow/notes/FLOW_ROUTING_NOTES_LINE_PIERCE_FIX.md` | 布线 | 🔵 | 连线穿盒修复记录 |
| **`docs/flow/notes/FLOW_ROUTING_WORKLOG.md`** | 布线 | 🟢 | **新** · 路径 B 工作记录 W1–W10（命令级留痕） |

**已知漂移**：`FLOW_MAINLINE_ORDER_NOTES.md` §4 称"autoSeq 接入…本轮不接入"，实际**已接入**（AUD-051）。

---

## 5. E · 计划

| 文档 | 领域 | 时效 | 说明 |
|:--|:--|:--:|:--|
| `docs/flow/notes/FLOW_LAYOUT_PLAN_REMAINING.md` | 布局 | 🔵 | 剩余工作计划 |
| `docs/flow/notes/FLOW_LAYOUT_PLAN_PHASE2.md` | 布局 | 🔵 | 下一阶段方案 |

> 计划类文档具**强时效性**，历史计划请勿作为现状依据。

---

## 6. F · 评审 / 审计

| 文档 | 领域 | 时效 | 说明 |
|:--|:--|:--:|:--|
| `docs/flow/review/FLOW_ROUTING_ALGO_STATE.md` | 布线 | 🔴 | 算法现状快照（防失忆）——**描述旧引擎** `buildRoute`/`targetCandidates`，未含 4 方向状态与混合内核 |
| `docs/flow/review/FLOW_ENGINEERING_ASSESSMENT.md` | 全局 | ⚪ | 工程评估（未审计） |
| `docs/flow/review/FLOW_ENGINEERING_AUDIT_NOTES.md` | 全局 | ⚪ | 工程审计记录（未审计） |
| `docs/flow/review/FLOW_RENDER_REVIEW_QA.md` | 渲染 | ⚪ | 渲染 QA（未审计） |
| `docs/flow/review/FLOW_PANEL_MATH_DOCKER_REVIEW.md` | 全局 | ⚪ | 面板/数学/Docker 评审（未审计） |
| **`docs/flow/review/FLOW_AUDIT_FINDINGS.md`** | 全局 | 🟢 | 审计台账 R1–R21 / **140 条**（含 P0–P3 优先级与验收状态） |
| **`docs/flow/review/FLOW_AGENT_CARD_AUDIT.md`** | 协议 | 🟢 | **新** · AI 推理卡专项审计（14 kind 全部供给 LLM 的范式材料 + MCP 分发设计）：三源漂移量化 · 7 条卡-实现冲突 · 含复现命令 |

> ⚠️ `FLOW_ROUTING_ALGO_STATE.md` 标题自称"**权威记录**"，但其内容描述的是**已被替换的旧引擎**（R18 落地后现行为「可见图 4 方向 + 动态 stub + 端口坐标下降 + 混合内核」）。引用前请以 `FLOW_ROUTERB_WORKLOG.md` W10 与源码为准。

---

## 7. G · 用户手册

| 文档 | 领域 | 时效 | 说明 |
|:--|:--|:--:|:--|
| `docs/flow/manual/USER_MANUAL_FLOW.md` | DSL | ⚪ | FLOW 用户手册（未审计） |

---

## 8. 当前实现状态（截至 R18 落地）

| 层 | 实现 | 关键文件 |
|:--|:--|:--|
| L1 语义 | 字典-索引 DSL · 六属性 | `components/flow/FlowParser.ts` |
| L2 落格 | 网格 + 格内槽位（V/H/D） | `components/flow/ExcelLayout.ts` |
| L3 对齐 | 整列/整行统一扩展 · 节点居中 | 同上 |
| **L4 布线** | **可见图 4 方向 Dijkstra + 动态 stub + 端口坐标下降 + 混合内核** | `VisibleGraphRouter.ts` · `PortOptimizer.ts` · `flowToSVG.ts` |
| L5 门禁 | 184 断言（parser 66 / svg 85 / bpmn 17 / mainline 8 / cell_order 8） | `scripts/assert_flow_*.ts` |

**L4 换代实测（审计 AUD-110）**：Σ折弯 **105 → 58（−45%）**，9 类图 × 2 布局 143 条边**零回退**、零穿盒、184 断言零回归。

---

## 9. 目录结构（✅ 已执行）

原 31 份 FLOW 文档平铺于 `docs/`，检索成本高。**已完成迁移**为：

```
docs/flow/
├── README.md          ← 本索引
├── spec/              ← A 规范层（SPEC）
├── design/            ← B 设计层（DESIGN）
├── math/              ← C 数学/理论（MATH）
├── notes/             ← D 过程记录 + E 计划（NOTES / PLAN）
├── review/            ← F 评审审计（REVIEW / AUDIT / 状态快照）
└── manual/            ← G 用户手册
```

> **迁移记录**：31 份文档已按上文结构落位，**81 处交叉引用同步改写**（全仓校验「零残留旧路径」）。
> `protocol/segments/flow.md` 与 `flow.agent.md` **保持在原处** —— 其路径被 `mcp-server/index.js` 硬编码读取，不属可迁移范围。

---

## 10. 命名规范（✅ 已执行）

统一范式 **`FLOW_<领域>_<类型>[_<限定>].md`**。已按下列映射完成重命名（原命名多未含领域或含随迭代失效的词）：

| 现名 | 建议名 | 理由 |
|:--|:--|:--|
| `FLOW_REMAINING_PLAN.md` | `FLOW_LAYOUT_PLAN_REMAINING.md` | "REMAINING" 未指明领域 |
| `FLOW_REMAINING_EXECUTION_NOTES.md` | `FLOW_LAYOUT_NOTES_REMAINING.md` | 同上 |
| `FLOW_NEXT_PHASE_PLAN.md` | `FLOW_LAYOUT_PLAN_PHASE2.md` | "NEXT_PHASE" 随迭代失效 |
| `FLOW_NEXT_PHASE_PLAN_NOTES.md` | `FLOW_LAYOUT_NOTES_PHASE2.md` | 同上 |
| `FLOW_STAGES1-3_EXECUTION_NOTES.md` | `FLOW_LAYOUT_NOTES_STAGES1-3.md` | 未含领域 |
| `FLOW_P0_RECOVERY_NOTES.md` | `FLOW_LAYOUT_NOTES_RECOVERY_P0.md` | 未含领域 |
| `FLOW_ALIGN_RECOVERY_NOTES.md` | `FLOW_LAYOUT_NOTES_ALIGN_RECOVERY.md` | 未含领域 |
| `FLOW_LINE_PIERCE_FIX_NOTES.md` | `FLOW_ROUTING_NOTES_LINE_PIERCE_FIX.md` | 未含领域 |
| `FLOW_ROUTERB_WORKLOG.md` | `FLOW_ROUTING_WORKLOG.md` | 统一到领域命名（ROUTERB → ROUTING） |
| `FLOW_ROUTERB_MATH_DIRECTIONS.md` | `FLOW_ROUTING_MATH_DIRECTIONS.md` | 同上 |
| `FLOW_DIAGRAM_RENDER_QA.md` | `FLOW_RENDER_REVIEW_QA.md` | 领域+类型对齐 |

**统一范式**：`FLOW_<领域>_<类型>[_<限定>].md`
- 领域：`DSL` / `LAYOUT` / `ROUTING` / `EXCHANGE` / `RENDER` / `MCP`
- 类型：`SPEC` / `DESIGN` / `MATH` / `NOTES` / `PLAN` / `REVIEW` / `AUDIT` / `WORKLOG` / `MANUAL`

> **新文档必须遵守上述范式**；领域与类型取自 §0 标签体系。

---

*索引维护：新增 FLOW 文档须在此登记并标注标签；发现漂移须补记审计条目号。*
