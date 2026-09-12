# IQS-Flow 三阶段收尾工程记录（阶段一/二/三）

> **文档状态**: 执行记录 / 归档
> **归档时点**: 文中断言数字以当时为准（结项写 111）；现行口径见 `FLOW_NEXT_PHASE_PLAN.md`（154 = 60+61+17+8+8）
> **执行日期**: 2026-08-31
> **范围**: 对 ALIGN 对齐批次（`79fb873`）之后的三阶段遗留工作逐一落地
> **核心不变原则**: 保留「流程图高度整齐对齐」设计——XY 矩阵统一扩展、节点居中、行列齐平、连线走格子通道；所有改动为增量，不推翻核心绘画引擎。

---

## 0. 本轮总览

在 P0 正确性 + ALIGN 对齐/工整已闭环的基础上，按三阶段计划补齐 P2 校验、工程护栏、视觉语义、交换层：

| 阶段 | 内容 | 提交 |
|:---|:---|:---|
| 阶段一 | P2 校验补全 + flowToDsl 往返完整化 | `ea5eee5` |
| 阶段二 | MCP render_engine→svg + test:flow 接入 build | `59bc223` |
| 阶段三a | Axis Align L/R/C 字锚 + Color[Panel] 配色 | `77b6dc4` |
| 阶段三b | 子流程框内嵌套内部小图 | `194df96` |
| 阶段三c | 跨多格/长回边外侧走廊回退 | `b20eeb2` |
| 阶段三d | USER_MANUAL_FLOW + v1 SPEC 场景矩阵 + BPMN XML 导出 | `5ccc52a` |
| 收尾 | public/mcp_tools.json 同步 render_engine | `439734f` |

---

## 1. 阶段一：P2 校验 + 往返（`ea5eee5`）

### 1.1 P2 校验补全（对齐 spec §10 规则表）
| # | 规则 | 落地 |
|:---|:---|:---|
| 1 | 字典名唯一（含自定义） | 重复定义报 error |
| 6 | 默认出口「否则」至多一条 | error |
| 7 | 分支/连线目标不可为 N/DATA | error |
| 9 | 无孤立节点 → error | 升级 warning→error（删旧重复 warning） |
| 12 | 分支出口标签唯一 | warn |
| 13 | 环路须含判断节点 | warn |
| 17 | Attr active ∈{SOP,Role,Lv,Time,KPI,M} | error + 重复 |
| 18 | Role(R[k]) 越界 | error |

### 1.2 flowToDsl 往返完整化
- `emitNode` 递归输出：网关分支块 + **子流程嵌套块**（内部节点缩进）+ 容器出边保留。
- 普通边过滤：跳过子流程内部节点边、默认边去重、保留子流程容器→外部显式边。
- 验证：子流程 q2/s1-s4 二次解析完全还原，边数 8=8、节点 9=9、无孤立、无越界。

### 1.3 断言
`assert_flow_parser.ts` 新增 P2 六项（字典重复/Attr非法Key/Role越界/否则重复/分割目标修饰类/孤岛error），parser 40→46。

---

## 2. 阶段二：工程护栏（`59bc223`）
- `mcp_tools.json` render_flow `render_engine: g6 → svg`（实际自研 SVG）；同步 public 副本。
- `package.json` 新增 `test:flow`（parser + svg），接入 `build`（validate:dsl && test:flow && sync-tools && vite）。实测 build 全链路通过。

---

## 3. 阶段三a：Align 字锚 + Panel 配色（`77b6dc4`）
- 整图标题（AxisX 顶部/AxisY 左侧竖带）按 `axis.page.align` 对齐 L/R/C（text-anchor start/end/middle）。
- 坐标轴标题（axisXT/axisYT 角落格）按 `axes.x/y.align` 对齐。
- 新增 `panelColor` 色槽（types `FlowChartStyles` + FlowParser 默认 + `slotToStyleKey['Panel']` + 渲染泳道背景/图例面板两处）。`Color[Panel]: #xxx` 可定制。
- svg 断言 41→45（Align L/R + Panel 色各新增）。

---

## 4. 阶段三b：子流程框内嵌套小图（`194df96`）
- 新增 `renderSubprocessInner`：子流程容器内，把内部节点绘制为迷你缩略图（start 圆/网关棱/task 圆角矩形，按类型极小化）、迷你 label（dict 展开）、内部边直角迷你连线。
- 容器「＋」展开盒保留；内部小图不扩充主网格（符合对齐原则）。
- svg 断言 45→51（子流程小图 6 项）。

---

## 5. 阶段三c：外侧走廊回退（`b20eeb2`）
- `buildRoute` 避障 MAX_ROUND 后仍穿节点时，尝试顶部/底部/左侧/右侧**画布外侧走廊**绕行，取第一个不穿节点的路径。
- 用于跨多格/长回边；不改变现有正常走线（仅避障失败的兜底）。
- svg 断言 51→53（外绕触发 ≥1 边触及外侧走廊）。

---

## 6. 阶段三d：文档 + BPMN 交换（`5ccc52a`）
- 新建 `docs/flow/manual/USER_MANUAL_FLOW.md`（使用手册：概述/快速上手/语法/概念/AI/FAQ）。
- `docs/IQS_DSL_V1_SPEC.md` 场景矩阵：新增 `flow → FlowGraph | Core（BPMN 子集）`，流程/时序/架构保留 mermaid 救济。
- 新增 `components/flow/FlowBpmn.ts`：`flowToBpmnXml` 导出 BPMN 2.0 XML（process + startEvent/task/gateway/subProcess + sequenceFlow(含 isDefault) + laneSet），可被专业工具导入。
- 新增 `scripts/assert_flow_bpmn.ts`（12 项）+ 接入 `test:flow`。

---

## 7. 全量回归（最终护栏）

| 命令 | 结果 |
|:---|:---|
| `npm run test:flow` | parser **46** + svg **53** + bpmn **12** = **111 项 全 green** |
| `npm run build` | 通过（validate:dsl + test:flow + sync-tools + vite） |
| `npx tsc --noEmit` | 零错 |

---

## 8. 遗留（明确不在本轮/后续可选）
- 走线通道化的更精细：跨多格回边已走外侧走廊；极端密集多边叠加仍可再优化。
- BPMN 仅"导出"里程碑（import 到专业工具重排）；BPMN DI 图形坐标（bpmndi Plane）可选补充。
- §10 校验中"子流程深度≤1 的语义块级校验"已由 flowToDsl 还原覆盖；N/DATA `attach` 字段模型可将来演进。

*记录人: 智能体辅助执行（三阶段托管）*
*状态: 三阶段全部落地，111 项断言全绿*
