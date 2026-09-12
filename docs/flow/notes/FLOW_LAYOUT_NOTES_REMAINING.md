# IQS-Flow 遗留规划执行记录（M0–M3）

> **文档状态**: 执行记录 / 归档
> **执行日期**: 2026-08-31
> **对应规划**: `docs/flow/notes/FLOW_LAYOUT_PLAN_REMAINING.md`（R1–R6 / 里程碑 M0–M3）
> **基线**: `main @ 9246131`（规划落盘）→ 执行后 `main` 含 M0–M3
> **原则**: 每里程碑独立 commit + 断言，全量回归；不触碰核心绘画引擎。

---

## M0：文档收尾（R4 + R5）— commit 16d941a

- **R4 协议 AxisY 矛盾**：`protocol/segments/flow.md:44` 由「纵轴标题（文字纵向）」修正为「纵轴坐标标题（保持水平；仅 Y 泳道标题旋转 -90°）」——与实际实现、spec §5 一致。
- **R5 文档一致性**：`USER_MANUAL_FLOW.md §5` 断言数 99 → 111（46+53+12）；`IQS_DSL_V1_SPEC` mermaid 救济行经核对应保持（已区分「体系文件→flow」与「复杂自由绘图→mermaid」）；历史 P0/ALIGN 日志保留原数字（归档原则）。
- 纯文档改动，无代码/断言变化。

## M1：走线精细（R1）— commit 64c0cc4

- `flowToSVG.ts`：避障 `tryOrder` 由固定 `dw*round` 整数偏移改为**螺旋分数档**（0.5/1.5/-0.5/-1.5/1/-1/0.25...），并新增**跨边共享走廊占用**（`usedCorrX`/`usedCorrY` + `round2`），同走廊多条边候选避开已占走廊、错开不同通道位置，消除"同走廊多边叠回同中线"。
- `assert_flow_svg.ts` 新增 `r1` 两字段（同走廊多边竖段错位 ≥2 种 x）。
- svg 断言 53 → 55。

## M2：BPMN DI 图形坐标（R2）— commit 462252b

- `FlowBpmn.ts`：`flowToBpmnXml(data, styles?)` 增加可选 `styles`，**静态 import `computeExcelLayout`** 生成 `<bpmndi:BPMNDiagram>`：每节点 `<BPMNShape>` + `<dc:Bounds>`（用 `nodePos` 的 x/y/W/H），每边 `<BPMNEdge>` + `<di:waypoint>`。
- 根因修复：初版用 `await import` 导致同步函数异步化；改为顶层静态 import（无循环依赖，avoid async）。
- `assert_flow_bpmn.ts` 新增 DI 五断言；bpmn 断言 12 → 17。

## M3：N/DATA attach 依附模型 + 子流程深度（R3 + R6）

- 类型：`types.ts FlowNode` 增可选 `attach?: string`（纯新增，向后兼容）。
- 解析 `FlowParser.parseWLine`：`Attach(#id)` / `Attach(id)` 语法，**在 label 提取前移出 rest**（避免 label 残留 `Attach(...)`）；写 `node.attach`。
- 校验 §10#14（attach 目标必须存在且非 N/DATA；非修饰节点不应用 Attach）。
- `data.artifacts` 填充：有 attach 的 N/DATA → `{id,type,label,attach}`（无 attach 保持 `[]`，兼容）。
- 往返 `FlowEditor.flowToDsl`：节点行追加 ` Attach(#id)`。
- R6：子流程嵌套深度 >1（父亦在子流程内）报 error。
- `assert_flow_parser.ts` 新增 M3 七断言（attach 解析/label 纯净/artifacts/目标不存在/目标为修饰/非修饰用attach/深度>1）；parser 46 → 53。
- 遗留说明：N/DATA 被默认顺序流作为**目标**（spec 禁止），既有 `#7` 已报错；本次不改变该既得行为（属 P0-4 延伸，不在 M3 范围）。

---

## 全量回归（每里程碑执行）

| 里程碑 | tsc | test:flow | 说明 |
|:---|:---|:---|:---|
| M0 | — | 111 | 纯文档 |
| M1 | ✅ | 113 | svg +2 |
| M2 | ✅ | 118 | bpmn +5 |
| M3 | ✅ | **125**（53+55+17） | parser +7 |

- `npm run build` 全链通过（validate:dsl + test:flow + sync-tools + vite build）。

---

## 提交链（规划执行）

| commit | 内容 |
|:---|:---|
| `9246131` | 规划文档落盘（前序） |
| `16d941a` | M0：R4+R5 文档收尾 |
| `64c0cc4` | M1：R1 走线精细（走廊错位） |
| `462252b` | M2：R2 BPMN DI 坐标 |
| M3 | R3 attach + R6 深度校验（本文档记录对应提交创建时同步） |

---

*记录人: 智能体辅助执行（遗留规划）*
*状态: M0–M3 全部落地，125 项断言全绿*
