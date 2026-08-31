# IQS-Flow 模块工程评估报告（交付度 + 工程化）

> **文档状态**: 评估记录 / 归档
> **评估日期**: 2026-08-31
> **基线**: `main @ 8da0eb8`（遗留规划 M0–M3 全部落地，125 项断言全绿）
> **对象**: `components/flow/*` + `scripts/assert_flow_*` + `docs/FLOW_*` 全链路

---

## 1. 代码交付程度

### 1.1 功能交付（相对 spec v0.7 承诺）

| 能力维度 | 交付度 | 说明 |
|:---|:---|:---|
| DSL 解析 | ~95% | Dict/Lane/Axis/W/分支End/显式边/子流程/Attach 全支持；坐标清洗/维度/索引越界校验 |
| 校验（§10 18条） | ~95% | #1–#18 全覆盖；attach 语义与深度校验已补 |
| 渲染（自研 SVG） | ~92% | 网格/泳道/8 类节点/连线/子流程小图/AttrPanel/Align/Panel 配色 |
| 走线（格子通道） | ~88% | 直连/L/Z/走廊吸附/外侧走廊/多边错位；极端密集可再优化 |
| 往返 flowToDsl | ~90% | 分支/子流程嵌套/attach/默认边去重；条件/出口名细节可再精 |
| BPMN 2.0 XML 导出 | ~85% | process+flow+laneSet+DI 坐标；DI waypoint 用端点（已知简化） |
| 交互（FlowDiagram） | ~95% | pan/zoom/整理布局/PNG 导出/MCP render_flow |

**整体功能交付度：约 90%。** 核心"泳道审批图"场景完整可用，剩余为交换层简化与实际视图打磨。

### 1.2 未满点（诚实清单）
- **范围外非缺陷**：BPMN import（反向）、多画布编排、部分 `Color[]` 全槽、`Align` 对部分标签。
- **已知简化**：BPMN DI waypoint 用端点；N/DATA 被默认流作目标产生既有 #7 警告；AttrPanel 聚合未做 spec §6.4 计数/排名/公式（当前为去重列表）。

---

## 2. 工程化进展

### 2.1 质量护栏（实测基准）
| 指标 | 数值 |
|:---|:---|
| 测试断言 | **125 项**（parser 53 + svg 55 + bpmn 17） |
| 断言语义 | 存在性+结构+行为（贯穿/外绕/落格/错位/校验） |
| 类型检查 | tsc --noEmit 零错 |
| 构建 | npm run build 全链（validate + test:flow + vite） |
| 回归频率 | 每里程碑 125 项全量 |

### 2.2 工程化成熟度（评级）
| 维度 | 等级 | 证据 |
|:---|:---:|:---|
| 可测试性 | ★★★★☆ | 纯函数 parser/renderer，strip-types 无依赖可独立跑 |
| 可维护性 | ★★★★☆ | parser/render/布局/序列化/交换分模块清晰 |
| 可扩展性 | ★★★★☆ | attach 等可选字段纯新增，增量不动核心 |
| 文档完备 | ★★★★★ | 9 篇 FLOW 文档 + 5 篇修复日志 |
| 变更纪律 | ★★★★★ | 多批独立 commit + 每步 125 项回归 |
| 可追溯性 | ★★★★★ | 提交链 P0→ALIGN→3阶段→M0-3 可回溯 |
| **回归自动化** | ★★★☆☆ | test:flow 已接入 build，但**无独立 CI** |
| 契约/接口一致性 | ★★★★☆ | MCP render_engine→svg、协议 AxisY 已修 |

### 2.3 工程化短板
1. **无 CI（GitHub Actions）**：test:flow 仅本地 build 跑，未自动运行于 push/PR。
2. **覆盖率未统计**：无 c8/vitest 报告，125 项未量化"实际行覆盖"。
3. **渲染无可视化回归**：SVG 断言是字符串匹配，未做像素级对比。
4. **类型局部 any**：parser 局部 `any` 风格。
5. **探针脚本滞留**：`_flow_probe.ts` 在 scripts/，未入 build、仅诊断。

---

## 3. 综合评分

| 维度 | 评分 |
|:---|:---:|
| 功能交付 | 90/100 |
| 代码质量 | 88/100 |
| 工程化 | 78/100 |
| 文档/治理 | 95/100 |
| **整体工程成熟度** | **≈ 8.5/10（可交付生产/审计级）** |

就 IQS-Flow 之于 665 体系文件场景：**已达"能编二维泳道审批图的正式引擎"标准**，从"设计未实现"演进到"解析+渲染+校验+交换+文档全链闭环"。

---

*记录人: 智能体辅助评估*
*状态: 评估完成，短板上报，后续按建议推进*

---

## 4. 后续落地实况（2026-08-31）

评估完成后按建议推进的工程化改进：

| 项 | 落地 |
|:---|:---|
| **CI（短板1）** | 新增 `.github/workflows/ci.yml`：push/PR 触发，Node 22 + npm ci + `npx tsc --noEmit` + `npm run test:flow` + `npm run build`（全链）。 |
| **覆盖率（短板2）** | **评估暂缓**：项目无 vitest/c8，引入新框架需评估与 `--experimental-strip-types` 断言脚本的兼容性与依赖污染；现以 125 项断言为事实护栏，覆盖率列为可选后续项。 |
| **探针脚本（短板5）** | `scripts/_flow_probe.ts` 头部加注释明确"诊断用途、非 build 护栏"，**不迁移**（历史文档统一引用 `scripts/_flow_probe.ts`，迁移会破坏引用）。 |
| **类型局部 any（短板4）** | 保持 parser 现有风格（strip-types 无 enum 依赖约束），未动以免引发回归。 |
| **可视化回归（短板3）** | 未做（需 pixelmatch/截图基线，成本中等，列为后续可选）。 |

- 提交：`docs/FLOW_ENGINEERING_ASSESSMENT.md` + `.github/workflows/ci.yml`（同批）。
- 回归：`npx tsc --noEmit` 零错，`npm run test:flow` 125 项全绿，`npm run build` 通过。

> 注：CI 工作流语法仅能通过 `npx github-actions`-类工具校验或 GitHub 侧执行确认；本地已等价跑通其三个验证步骤（tsc / test:flow / build）。

---

## 5. 代码审计发现与修复（2026-08-31）

对新基线 flow 组件代码做一轮审计（全量断言 + 静态扫描 + 复杂场景行为抽验）。

### 5.1 审计结论（健康项）
- **无调试残留**：无 console.log/debugger/TODO/HACK（注释中的"占位"是布局语义）。
- **类型干净**：`:any` 仅 2 处（FlowParser style init、FlowEditor），非类型系统隐患。
- **静态度量**：flowToSVG 1034 行（布局+渲染+走线+子流程内嵌，规模居中可维护）；魔法色集中在 9 个调色板值，可接受。
- **行为抽验**：真实 `INITIAL_FLOW_DSL` 解析零 error；复杂混合场景（子流程+attach+并行+多泳道+回边）渲染功能全部正常。

### 5.2 修复（1 个真实缺陷）
| 缺陷 | 现象 | 修复 |
|:---|:---|:---|
| **P2 环路校验近似误报** | 真实样例的含网关回路（`w2→q1→w4→q2→w2`，环含 q1/q2）误报"不含判断节点的环路" | 用 **Tarjan SCC** 求真强连通分量；仅当存在**整个环不含任何网关**时才 warn（替换原 Kahn 残留近似）。 |

- 修复后：纯任务回路正确 warn（`w3,w2`）；含网关回路不再误报；真实样例 warnings 归零。
- 断言：`assert_flow_parser.ts` 新增 2 项（纯任务环 warn / 含网关环不误报），parser 53 → 55。

### 5.3 回归
- `npm run test:flow` **127 项全绿**（55+55+17）；`npx tsc --noEmit` 零错。

*记录人: 智能体辅助审计*
*状态: 审计完成，1 处真实缺陷已修复，127 项断言全绿*

---

## 6. 组件页面复杂图例示例 + parser 语义修复（2026-08-31）

### 6.1 复杂图例示例（组件默认展示）
将 `constants.tsx` 的 `INITIAL_FLOW_DSL` 由"采购审批流程"（8 节点）升级为 **"供应商准入评审流程"**（22 节点 / 27 边 / 4 部门×5 阶段双泳道），覆盖 DSL **全部核心语法点**：
- Dict：保留字 D/P/R + 自定义 worker（20 项）
- 泳道：H(部门) × V(阶段) 双泳道矩阵
- 节点类型：start / task / 判断 `?`(×4) / **并行 `+`** / **子流程 `SUB`(含内嵌 start/判断/结束)** / **标注 `N`** / **数据 `DATA`**
- 连线：分支行（含 `否则` 默认出口 / `[超差说明]` 条件）、显式边、**回边**（`w5→#w2` 等，均经网关）
- 属性：Role/SOP/Lv/Time/KPI + **Attach(#id)** 依附 N/DATA
- 轴标题 AxisX/AxisY/Axis + Align
- AttrPanel 六属性

改用 `INITIAL_FLOW_DATA = parseFlowDSL(INITIAL_FLOW_DSL).data` **生成式**（消除双源手工维护不一致）。

### 6.2 parser 语义修复（子流程 start/end 计数）
- 原缺陷：子流程内部 start/end 被计入**顶层**"开始恰有1个"计数，导致含子流程内 start 的图误报"开始2个"。
- 修复：顶层 start 恰 1；顶层无 start 但有子流程内 start 时视为图入口（退化用例，兼容 PDPC 整图即子流程）；子流程内 end 不计顶层。
- 断言：`assert_flow_parser.ts` 新增 2 项（子流程内 start 不计顶层 / 顶层无 start 回退），parser 53 → 57。

### 6.3 状态
- 组件默认图例：零 error/warn；并行+/子流程小图/默认斜杠/AttrPanel/岗位·标签展开全展示。
- 回归：`npm run test:flow` **129 项全绿**（57+55+17）；`npx tsc --noEmit` 零错；`npm run build` 通过。

*记录人: 智能体辅助实施*
*状态: 复杂图例已接入组件，parser 语义修复完成，129 项断言全绿*
