# IQS-Flow 遗留问题设计规划（REMAINING → NEXT）

> **文档状态**: 设计规划 / 蓝图（待按里程碑执行）
> **规划日期**: 2026-08-31
> **基线**: `main @ 50157a6`（P0 + ALIGN + 三阶段全落地，111 项断言全绿）
> **前置原则**: 与三阶段一致——**不触碰/重构既有核心绘画引擎**，只做增量；每步跑 `npm run test:flow`（111 项）+ `tsc` 全量回归。
> **遗留来源**: `FLOW_STAGES1-3_EXECUTION_NOTES.md §8`、`FLOW_ALIGN_RECOVERY_NOTES.md §5`（其中多数已在三阶段闭环，此处仅列真正剩余项）、工程债复核发现。

---

## 一、遗留项总表（去重后）

| # | 遗留项 | 类别 | 现缺口 | 建议优先级 |
|:--|:--|:--|:--|:--|
| R1 | 走线更精细（极端多边叠加） | 渲染/走线 | 多边同走廊时仅固定偏移挪移 | P1 |
| R2 | BPMN DI 图形坐标（bpmndi Plane） | 交换 | 导出的 XML 无坐标，导入需重排 | P2 |
| R3 | N/DATA `attach` 依附模型 | 数据模型 | artifacts 恒空，N/DATA 仍作独立节点 | P1 |
| R4 | 协议切片 AxisY 描述矛盾 | 文档/协议 | `protocol/segments/flow.md:44` 写"文字纵向"，实际水平 | P3（最低成本） |
| R5 | 文档一致性（断言数/场景矩阵/角色表） | 文档 | USER_MANUAL/SPEC 表述在校验扩展后可能滞后 | P3 |
| R6 | §10 校验"语义深度" | 校验 | 子流程深度≤1 语义级、N/DATA 依附存在性 | P2（随 R3） |

> 说明：`ALIGN §5` 所列"子流程内嵌小图 / Align / Color[Panel] / §10 校验 / flowToDsl 往返 / BPMN XML / 外侧走廊"均已在三阶段闭环，本条不再重复。

---

## 二、设计理念

**增量优先，纵深优先**：
1. 凡能用「在现有函数上追加」解决的，不新建体系。
2. 数据模型变更（如 R3 attach）必须**向后兼容**：新字段可选、旧 DSL 无 attach 也不抛错、往返不丢。
3. 走线/布局类改动（R1）以**不破坏 111 项断言**为底线，必要时只增断言不改旧断言。
4. 文档/协议类（R4/R5）成本最低、风险最小，随时可做。
5. 每项独立成 commit，含断言与对应日志，避免捆绑无关改动。

---

## 三、逐项设计方案

### R1 走线更精细（极端多边叠加）

**背景**：当前外侧走廊只对"避障完全失败"兜底；当同一列/同走廊有 2+ 条边叠加时，`tryOrder` 只按 `dw * round` 固定偏移（0.5、1.0、1.5 倍走廊宽重复），多条边会被挤到同一条垂直线，视觉堆叠。

**方案**（按成本递增的可选档位）：
- **R1-a（端口冲突感知）**：在端口分配第二趟（出口）时，把"该走廊已占用的不同 x/y 偏移"收集，为每条边分配**错位的走廊通道**（0.25 / 0.5 / 0.75 走廊位置），避免多边重合。
- **R1-b（偏移递增去重）**：`tryOrder` 提供的 `mX/mY` 若与已接受路径冲突，则继续按 `round+` 试更多分数偏移（`dw * k/4`），而非只试整数倍。
- **R1-c（边交叉最小化）**：已绘制边记录占用走廊线段，下一候选若与已占用走廊重叠则跳过。

**选型**：首选 R1-a（端口通道错位），它改动集中在端口分配一处、可加断言、不影响其它边；R1-b 作为补充；R1-c 可视复杂度延后。

**验证**：构造"同一网关双分支输出到相邻行节点"场景，断言同走廊两竖直段 x 不同（`distinctXCount >= 2`）。断言脚本 `assert_flow_svg.ts` 追加。

**工作量 / 风险**：中 / 低（只动端口分配与接受判定，不动 buildRoute 直连特判）。

**优先级**：P1（影响实际 BPMN 复杂图可读性）。

---

### R2 BPMN DI 图形坐标（bpmndi Plane）

**背景**：`FlowBpmn.ts` 导出无坐标；专业工具（如 Nigo/Camunda Modeler）导入时全部节点堆叠，需手工重排。

**方案**：
- 新增 `flowToBpmnDiXml(data): string`（或并入 `flowToBpmnXml` 的第二 `Process` + `BPMNDiagram`），复用 `computeExcelLayout` 的 `nodePos` 坐标。
- 为每个节点生成 `<bpmndi:BPMNShape id="shape_<id>" bpmnElement="<id>"><dc:Bounds x y width height/></bpmndi:BPMNShape>`；x/y 用 `p.x - p.W/2`、`p.y - p.H/2`；宽高用 `p.W/p.H`。
- 为每条边生成 `<bpmndi:BPMNEdge>`（含 `waypoint`，可用渲染后的 `pts` 简化折点）。

**选型**：BPMNShape 必做（解决"堆叠"痛点）；BPMNEdge waypoint 次选（边坐标可从 route 复用，成本低一并做）。

**验证**：断言导出 XML 含 `<bpmndi:BPMNShape` 且 `bpmnElement="w1"` 的 Bounds 坐标与 `computeExcelLayout.nodePos[w1]` 一致（公差 0.5）。`assert_flow_bpmn.ts` 追加。

**工作量 / 风险**：中 / 低（纯交换层，不触渲染判定）。

**优先级**：P2。

---

### R3 N/DATA `attach` 依附模型（优先级 P1，最需设计）

**背景**：spec §7.4 要求 N/DATA 标注/数据对象**依附前驱**，不独立占格、不参与流程排序；当前已验证它们不占交叉格，但 `artifacts` 恒空、N/DATA 仍是 `data.nodes` 里的独立节点，且无 `attach` 指向。

**方案**：
1. **类型层**：`FlowNode` 增加可选 `attach?: string`（依附的目标节点 id）。`FlowEdge` 不变。
2. **解析层**（FlowParser）：
   - 解析 `Type[N]`/`Type[DATA]` 时，若节点行含 `Attach(#id)`（新增可选语法）则取；缺省则依附**声明序前驱**节点。
   - `attach` 目标必须存在且非 N/DATA（否则 error，对应 spec #14）。
   - 不改变 N/DATA 的 `cell` 语义（仍可写或清洗）。
3. **canonical**：N/DATA 节点因有 `attach`，从"参与排序的 node"转为"挂在目标是 artifacts"——在 `data.artifacts` 填充 `{ id, type, label, attach }`，同时保留其 `node`（供 shape/label）但 marked 不作为默认流出/流入源（当前已如此）。
4. **渲染层**（flowToSVG）：对 `attach` 的 N/DATA，绘制在其依附节点**右上走廊**（相对固定偏移），而非占格——与 ALIGN-3 现状对齐；新增断言验证"N/DATA 画在右上、不新增行/列"。
5. **往返**：`flowToDsl` 输出 N/DATA 时带 `Attach(#id)`，保证 reintroduce 不丢依附；断言回归。

**向后兼容**：`attach` 可选；旧 DSL 无 `Attach` 时缺省依附声明前驱（行为与当前"不占格"一致或更贴合 spec）。旧断言应仍通过（N/DATA 原本就不占格，本次只是补关联字段与校验）。

**验证**：断言 `data.artifacts` 非空且含 `attach`；`artifacts` 元素 type/label 正确；无 `Attach` 时缺省依附前驱。parser + svg + bpmn 三脚本各补用例。

**工作量 / 风险**：高 / 中（跨类型/解析/渲染/往返/断言，但全部向后兼容）。**是本轮最容易引发回归的项**，故列为 P1 中"最需谨慎"。

**优先级**：P1（贴合 spec §7.4 语义，但实现面大，建议排在 R1 之后单独一个里程碑）。

---

### R4 协议切片 AxisY 描述矛盾（最低成本）

**背景**：`protocol/segments/flow.md:44` 把 AxisY 写为"文字纵向"，与 spec §5「axis-y 坐标标题保持水平（仅 Y 泳道标题旋转 -90°）」矛盾。

**方案**：改该行为「纵轴坐标标题（水平）」；同时核对 `flow.md` 其余语法表是否与实现一致（AxisX/Axis/Layout/Dict/Lane 等）。

**验证**：grep 确认文档无 "纵向"误述；无需断言。

**工作量 / 风险**：低 / 极低。

**优先级**：P3 —— **建议最优先做（5 分钟，零风险，先清理历史矛盾）**。

---

### R5 文档一致性

**背景**：断言数已从 41 → 53 → 111（含 bpmn）演进；`USER_MANUAL_FLOW.md` §5 写"99 项"、`FLOW_P0/ALIGN 日志` 仍有旧数字表述；v1 SPEC 场景矩阵已加 flow 行但其余提及"流程→mermaid"处需全核对。

**方案**：
- 全仓 grep 断言数字（41/40/35/99/111）统一校准。
- 核对 `IQS_DSL_V1_SPEC.md` / `IQS_DSL_V1_MANUAL.md` 中凡指向"流程图→mermaid 救济"的表述，改为"体系文件→flow Core"。
- `USER_MANUAL_FLOW.md` §5 断言数 99 → 111。

**验证**：grep 确认关键数字与 `npm run test:flow` 实际一致。

**工作量 / 风险**：低 / 极低。

**优先级**：P3。

---

### R6 §10 语义深度校验

**背景**：字面规则（#1~#18）已在三阶段补全；剩余是"语义级"——子流程深度≤1（嵌套链环检测）、N/DATA 依附目标存在（spec #14）。

**方案**：
- 子流程深度：解析期维护 `subProcesses` 嵌套层数，深度 >1 报 error（在三阶段的"子流程深度≤1 兜底"之上做**主动检测**，而非仅靠 flowToDsl 还原）。
- N/DATA 依附：随 R3 的 `attach` 一起校验（`Attach(#id)` 目标存在）。

**验证**：断言脚本补"深层子流程报 error""Attach 悬空目标报 error"。

**工作量 / 风险**：中 / 低（大部分逻辑并入 R3 + 解析期一层循环）。

**优先级**：P2（依赖 R3 的 attach）。

---

## 四、依赖 / 里程碑划分

```
M0（可立即）：R4 协议修复 + R5 文档一致性核对      —— 低成本收尾，一并提交
M1（走线）：R1 端口通道错位 + 断言                  —— 独立 commit
M2（交换）：R2 BPMN DI 坐标 + 断言                 —— 独立 commit
M3（语义，最大）：R3 attach 模型 + R6 深度校验 + 断言 —— 独立 commit，谨慎回归
```

- M0：无依赖。
- M1：无依赖（不触 attach/校验）。
- M2：无依赖（只加交换层，可提前）。
- M3：依赖 R6 的依附校验；且改数据模型，需 M0/M1/M2 已稳定后再动。

建议执行顺序 `M0 → M1 → M2 → M3`（由低成本到高风险，逐步积累回归信心；M3 放在最后，因其破坏面最大）。

---

## 五、全量回归策略（每里程碑通用）

| 关卡 | 命令 |
|:---|:---|
| 静态 | `npx tsc --noEmit` |
| 断言 | `npm run test:flow`（当前 111 项：parser 46 + svg 53 + bpmn 12） |
| 构建 | `npm run build` |
| 增量 | 每里程碑新增对应断言（见各方案"验证"），保证只增不破坏 |

每里程碑一个 commit（`feat(flow): Mx ...`）+ 对应日志（追加到 `FLOW_STAGES1-3_EXECUTION_NOTES.md` 或新建 `FLOW_Mx_NOTES`）。

---

## 六、不做 / 暂缓

- 重构核绘画引擎（网格/行列/端口主干）——与三阶段一致，避免动既有 111 项护栏。
- BPMN import（读取外部 XML）——投入大、收益有限，仅在「导出 → 专业工具编辑」闭环验证后视需求再议。
- 多画布/多流程编排——超出 IQS-Flow 定位（单流程 + 泳道）。

---

*规划人: 智能体辅助设计*
*状态: 蓝图完稿，M0 可立即执行*
