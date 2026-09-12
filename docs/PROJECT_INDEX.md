---
doc_id: IQS-PROJECT-INDEX
title: 项目文档总索引与工程历程
project: 澄矩 · ChengJu (IQS)
version: v1.0
domain: PROTOCOL
type: INDEX
authority: L4
freshness: 🟢现行
first_commit: 2026-09-12
last_commit: 2026-09-12
supersedes: []
superseded_by: []
related:
  - docs/ARCHIVE_STANDARD.md
  - docs/flow/README.md
---

# 澄矩 · ChengJu（IQS）— 项目文档总索引与工程历程

| 标签 | 值 |
|:--|:--|
| **用途** | 全项目文档的**唯一入口**（MOC）。按「工程历程 × 文档类别」组织，并标注时效与权威层级 |
| **维护规则** | 新增文档须在此登记；状态变化须同步更新。仅追加，不覆盖历史 |
| **软件版本** | `V3.5.3-ildr`（`package.json` name = `chengju-iqs`） |
| **出品** | 江西省上饶市烟草专卖局（公司）信息中心 · 鹿溪联合创新实验室（LUXI Lab） |
| **提交跨度** | **2026-02-05 → 2026-09-09**，151 次提交（`git log`） |
| **本索引生成** | 2026-09-12（含尚未提交的工作） |

> **FLOW 组件**的文档已在 2026-09-12 单独整理过一次，其子索引为 `docs/flow/README.md`（38 份）。本索引不重复其内部条目，只做**入口指引**。

---

## 1. 工程历程时间线（按提交时间）

> 时间取自 `git log --reverse --format=%ad`（各文件**首次提交**日期），作为追溯证据。
> ⚠️ 部分文档在后续提交中被持续修订，末次提交见 §3 表格。

| 阶段 | 时间 | 主题 | 标志性文档（首次提交） |
|:--:|:--|:--|:--|
| **P1** | 2026-02-05 | **项目起步**：QC 图表组件 + AI 服务 | `docs/IQS_REQ_SPEC_PRODUCT.md` · `docs/IQS_COMP_DESIGN_AFFINITY.md` · `docs/IQS_COMP_DESIGN_MATRIX.md` · `docs/IQS_COMP_MANUAL_*`（12 份）· `docs/IQS_GUIDE_TROUBLESHOOTING.md` · `docs/archive/IQS_DSL_MANUAL_LEGACY.md` |
| **P1** | 2026-02-06 | 基础图表（basic）+ README | `docs/IQS_COMP_MANUAL_BASIC.md` · `README.md` |
| **P1** | 2026-02-26 | Mermaid 救济层 | `docs/IQS_COMP_MANUAL_MERMAID.md` |
| **P2** | 2026-03-16 | **MCP 化**：把 14 个组件暴露为 MCP 工具 | `docs/IQS_CHART_MCP_DESIGN.md` · `docs/IQS_MCP_GUIDE_CONFIG.md` · `IGS_DSL_AGENT_MANIFESTO.md`（v3.0）· `docs/IQS_DSL_AGENT_MANIFESTO.md` |
| **P2** | 2026-03-26 | **ILDR 4.0 + Token 优化**：子类型对齐、上下文瘦身 | `docs/IQS_MCP_PLAN_ILDR4.md` · `docs/IQS_MCP_PLAN_TOKEN_OPTIMIZATION.md` · `docs/IQS_RENDER_PLAN_VCHART_DEBUG.md` · `docs/IQS_QA_AUDIT_PROMPTS_ALL.md` · `docs/IQS_QA_AUDIT_PROMPTS_CORE.md` |
| **P3** | 2026-08-24 | **IQS-DSL v1** 统一语言 | `docs/IQS_DSL_V1_MANUAL.md`（细粒度语法手册） |
| **P4** | 2026-08-25 | **FLOW 组件启动**（第 14 个 CORE kind） | `docs/flow/spec/IQS_FLOW_DSL_SPEC.md` · `docs/flow/design/FLOW_LAYOUT_ENGINE_DESIGN.md` · `docs/flow/review/FLOW_RENDER_REVIEW_QA.md` |
| **P5** | 2026-08-30 | **软著与发行准备** + DSL v1 架构规范 | `docs/软著与发行/*`（12 份）· `COPYRIGHT.md` · `NOTICE.md` · `CHANGELOG.md` · `docs/IQS_DSL_V1_SPEC.md` |
| **P4** | 2026-08-31 | **FLOW 深化（爆发日）**：布线 / 布局 / 数学 | `docs/flow/math/*`（5 份）· `docs/flow/design/*`（5 份）· `docs/flow/notes/*` · `docs/flow/review/FLOW_ROUTING_ALGO_STATE.md` |
| **P4** | 2026-09-01~02 | FLOW 格内序 / 主干序 / 下一阶段 | `docs/flow/design/FLOW_CELL_ORDER_DESIGN.md` · `docs/flow/notes/FLOW_MAINLINE_ORDER_NOTES.md` · `docs/flow/notes/*_PLAN_*` |
| **P5** | 2026-09-09 | **品牌化 + 仓库更名** | `README.md`（LUXI 双标头部）· 仓库更名 `LUCY-CHENGJU` |
| **P6** | **2026-09-12** | **卡片单一真源（SSOT）体系**（本次，未提交） | `docs/IQS_DSL_CARD_SSOT_DESIGN.md` · `docs/flow/review/FLOW_AGENT_CARD_AUDIT.md` · `dsl/cards/*` · `docs/flow/notes/FLOW_ROUTING_WORKLOG.md`（W12–W17） |
| **P6** | **2026-09-12** | **UI 范式精修 + 代码审计**（本次，未提交） | `docs/design/UI_REFINEMENT_LOG.md` · `components/ui/*` · `utils/{id,textMetrics,relationGraph}.ts` · `hooks/useAIEngine.ts` · `scripts/{lint_examples,assert_card_contracts,check_cards_fresh}.ts` |

### 时间线读法（三条主线）

```
主线 A · 组件 → MCP → 单一真源
  2026-02-05 组件与手册 ──► 2026-03-16 MCP 化 ──► 2026-03-26 Token 优化 ──► 2026-09-12 卡片 SSOT + 意图路由

主线 B · 语言规范
  2026-02-05 DSL_SYNTAX_MANUAL ──► 2026-08-24 IQS_DSL_V1_MANUAL ──► 2026-08-30 IQS_DSL_V1_SPEC ──► 2026-09-12 dsl/cards/*（结构化真源）

主线 C · FLOW（第 14 kind）
  2026-08-25 启动 → 2026-08-31/09-01 布局·布线·数学深化 → 2026-09-12 卡-实现一致性审计 + 引擎缺陷修复
```

---

## 1.5 归档规范

> 全项目文档的**命名、元数据（YAML front-matter）、目录与迁移**规则见 **`docs/ARCHIVE_STANDARD.md`**。
> 本索引登记的所有文档均已按该规范迁移并注入元数据。

---

## 2. 文档类别总览

| 类别 | 位置 | 数量 | 用途 |
|:--|:--|--:|:--|
| **产品与需求** | `docs/IQS_REQ_SPEC_PRODUCT.md` | 1 | 产品定位、核心价值、功能边界（**P1，最早期需求基线**） |
| **设计** | `docs/` 根 | 5 | 组件设计、MCP 设计、实施计划 |
| **功能手册** | `docs/` 根 | 16 | 各组件用户手册（14 kind + Mermaid + VChart）+ 控制图领域笔记 |
| **协议与规范** | `docs/` 根 + `docs/flow/spec/` | 5 | IQS-DSL v1 手册/架构/宣言；FLOW DSL 规范 |
| **MCP 与工程** | `docs/` 根 | 4 | MCP 配置、Token 优化、ILDR 4.0、故障排查 |
| **审计与报告** | `docs/` 根 | 4 | 系统提示词审计报告、矩阵压测、VChart 调试 |
| **软著与发行** | `docs/软著与发行/` | 12 | 登记信息、部署发行、第三方声明、发行检查 |
| **FLOW 专项**（已整理） | `docs/flow/` | 38 | 见 `docs/flow/README.md` |
| **卡片真源** | `dsl/cards/` | 57 | 55 张 `<family>/<slug>.card.ts` + `_types.ts` + `_shared.ts` |

---

## 3. 全量文档登记表

> 时效图例：🟢 现行 · 🟡 部分过时/已勘误 · 🔴 过时 · 🔵 历史快照 · ⚪ 未审计
> 「首/末」= 首次/末次提交日期

### 3.1 产品与需求

| 文档 | 行数 | 首→末 | 时效 | 说明 |
|:--|--:|:--|:--:|:--|
| `docs/IQS_REQ_SPEC_PRODUCT.md` | 81 | 02-05 → 02-05 | 🟡 | QC 小组活动图表工具需求说明书；**产品定位的最早书面依据**。其中「零门槛」「双轴比例」「3σ 线」等要求在后续实现中均已满足，但**未覆盖 FLOW 与卡片 SSOT 阶段的新增需求** |

### 3.2 设计

| 文档 | 行数 | 首→末 | 时效 | 说明 |
|:--|--:|:--|:--:|:--|
| `docs/IQS_COMP_DESIGN_AFFINITY.md` | — | 02-05 → 02-05 | 🔵 | 亲和图组件设计（P1 期） |
| `docs/IQS_COMP_DESIGN_MATRIX.md` | — | 02-05 → 02-05 | 🔵 | 矩阵图组件设计（P1 期） |
| `docs/IQS_CHART_MCP_DESIGN.md` | 48 | 03-16 → 09-02 | 🟡 | MCP 渲染服务设计：目标、**渲染增强桥接**架构 |
| `docs/archive/IQS_COMP_PLAN_Y_MATRIX.md` | 28 | 02-05 → 02-05 | 🔵 | Y-Matrix 精简与画布填充方案（**单点实施计划**，已完成） |
| `docs/IQS_DSL_CARD_SSOT_DESIGN.md` | ~400 | **09-12** | 🟢 | **卡片单一真源（SSOT）设计方案**：7 源诊断 → TS 真源 → 生成器 → 五道门禁 → 落点切换 → MCP 资源接入（§1–§11） |

### 3.3 功能手册

| 文档 | 行数 | 首→末 | 时效 | 说明 |
|:--|--:|:--|:--:|:--|
| `docs/IQS_COMP_MANUAL_FISHBONE.md` | — | 02-05 → 03-16 | 🟡 | 鱼骨图 |
| `docs/IQS_COMP_MANUAL_AFFINITY.md` | — | 02-05 → 03-16 | 🟡 | 亲和图 |
| `docs/IQS_COMP_MANUAL_PARETO.md` | — | 02-05 → 03-16 | 🟡 | 排列图 |
| `docs/IQS_COMP_MANUAL_HISTOGRAM.md` | — | 02-05 → 03-16 | 🟡 | 直方图 |
| `docs/IQS_COMP_MANUAL_CONTROL.md` | — | 02-05 → 03-16 | 🟡 | 控制图 |
| `docs/IQS_COMP_MANUAL_SCATTER.md` | — | 02-05 → 03-16 | 🟡 | 散点图 |
| `docs/IQS_COMP_MANUAL_RADAR.md` | — | 02-06 → 03-16 | 🟡 | 雷达图 |
| `docs/IQS_COMP_MANUAL_RELATION.md` | — | 02-05 → 03-16 | 🟡 | 关联图 |
| `docs/IQS_COMP_MANUAL_ARROW.md` | — | 02-05 → 03-16 | 🟡 | 矢线图 |
| `docs/IQS_COMP_MANUAL_PDPC.md` | — | 02-05 → 03-16 | 🟡 | PDPC |
| `docs/IQS_COMP_MANUAL_MATRIX.md` | — | 02-05 → 03-16 | 🟡 | 矩阵图 |
| `docs/IQS_COMP_MANUAL_MATRIX_PLOT.md` | — | 02-05 → 03-16 | 🟡 | 矩阵散点图 |
| `docs/IQS_COMP_MANUAL_BASIC.md` | — | 02-06 → 03-16 | 🟡 | 基础图表 |
| `docs/IQS_COMP_MANUAL_MERMAID.md` | — | 02-26 → 03-16 | 🟡 | Mermaid（救济层） |
| `docs/IQS_COMP_MANUAL_VCHART.md` | 56 | — | 🟡 | VChart 引擎用户手册（救济层） |
| `docs/IQS_QA_NOTES_CONTROL_CHART.md` | 134 | — | 🟢 | **控制图领域知识笔记**（Shewhart 原理、判异）；非工具手册，是内容资产 |

> ⚠️ **16 份功能手册均早于「卡片单一真源」体系**。其内容与 `dsl/cards/*.card.ts` 可能存在表述差异 —— 权威性上，**真源卡片优先**（见 §4）。
> ⚠️ `docs/flow/manual/USER_MANUAL_FLOW.md` 未在本目录，已迁至 `docs/flow/manual/USER_MANUAL_FLOW.md`。

### 3.4 协议与规范

| 文档 | 行数 | 首→末 | 时效 | 权威 | 说明 |
|:--|--:|:--|:--:|:--:|:--|
| `docs/archive/IQS_DSL_MANUAL_LEGACY.md` | — | 02-05 → 08-30 | 🔴 | L4 | 早期 DSL 语法手稿；**已被 IQS-DSL v1 取代** |
| `IQS_DSL_AGENT_MANIFESTO.md`（根） | 116 | 03-16 → 03-26 | 🟡 | L4 | DSL 代理人宣示录 v3.0；「全量、标准、专业」的**方法论声明** |
| `docs/IQS_DSL_AGENT_MANIFESTO.md` | — | 03-16 → 09-02 | 🟡 | L4 | 同上（docs 副本，持续修订） |
| `docs/IQS_DSL_V1_MANUAL.md` | 1619 | 08-24 → 09-02 | 🟢 | L0 | **细粒度语法手册**（14 kind 全指令表 / Body / 示例 / 反例） |
| `docs/IQS_DSL_V1_SPEC.md` | 579 | 08-30 → 09-02 | 🟢 | L0 | DSL v1 架构、分层、代数、权威序 |
| `docs/flow/spec/IQS_FLOW_DSL_SPEC.md` | 697 | 08-25 → 09-02 | 🟡 | L0 | FLOW DSL 规范 v0.7.1（**§7.2/§7.3 与实现有偏差，见 AUD-117/118**） |
| `protocol/DSL_V1.md` · `governance.md` | 34 / 53 | — | 🟢 | L2 | MCP 资源入口与治理（Core vs Relief、权威层级 L0–L4） |
| `dsl/kinds.json` | — | — | 🟢 | L0 | 机器可读 kind 表 v1.1.0 |

### 3.5 MCP 与工程

| 文档 | 行数 | 首→末 | 时效 | 说明 |
|:--|--:|:--|:--:|:--|
| `docs/IQS_MCP_GUIDE_CONFIG.md` | — | 03-16 → 09-02 | 🟢 | MCP 客户端配置指南 |
| `docs/IQS_MCP_PLAN_TOKEN_OPTIMIZATION.md` | 59 | 03-26 → 03-26 | 🟢 | **ILDR 2.0 预研**：单次生成 250k token 的病因（元数据指数堆叠）与瘦描述方案 |
| `docs/IQS_MCP_PLAN_ILDR4.md` | 44 | 03-26 → 03-26 | 🟢 | **ILDR 4.0**：`parent_type` / `sub_type` 声明，实现「AI 指令 → 推理逻辑 → 前端组件」三位一体 |
| `docs/IQS_GUIDE_TROUBLESHOOTING.md` | — | 02-05 → 02-05 | 🟡 | 早期故障排查 |

> 这三份是理解 **MCP 设计意图**（收敛 → 按需取用 → 意图路由）的关键史料；2026-09-12 的 `protocol://intents` + `protocol://prompts/*` 正是其落地。

### 3.5.1 工程门禁脚本（2026-09-12 新增）

| 脚本 | 挂载 | 作用 |
|:--|:--|:--|
| `scripts/validate_dsl.mjs` | `npm run validate:dsl` | 跨 kind **正则浅校验**（`Title:` 存在 / 无围栏 / affinity 用 `Item:` / fishbone 用 `#`） |
| `scripts/lint_examples.ts` | ↑ 串联 | **用真实 `lintDsl()`** 校验 14 份官方示例 + **引用完整性**（扫 `#id` / `-> id` / `Attach(#id)` 是否都指向已定义节点）。**修复 AUD-134 的一半**：此前 `lintDsl()` 无任何调用方 |
| `scripts/assert_card_contracts.ts` | ↑ 串联 | **执行 L0 卡自己声明的 `example.expect`**（`noErrors` / `nodes` / `edges` / `requiredEdges` / **`forbiddenEdges`**）。14 张卡全部带契约，此前**无人执行** |
| `scripts/check_cards_fresh.ts` | `npm run check:cards-fresh` | **产物新鲜度**：对 114 个产物文件取 sha256 → 重生成 → 比对。语义是「**重生成前后是否变化**」，**不是** `git diff --exit-code`（产物本就在未提交状态，那样写会恒红） |

> **技术要点**：`dsl/*.ts` 的内部 import **不带扩展名**，Node 原生 ESM 无法解析 —— 所以两个 TS 门禁脚本都经 **`vite.ssrLoadModule`** 载入（沿用 `FLOW_AGENT_CARD_AUDIT.md` 已验证的做法）。这正是 `lintDsl()` 长期悬空的技术原因。
>
> **验证有效性**：两个门禁都做过**注入回归测试** —— 改错 `flow.card.ts` 的 `edges: 7 → 8` 后 `assert_card_contracts` 准确报红「边数 7 ≠ 期望 8（多余边是 AUD-120 那类缺陷的信号）」。
>
> **S1 状态**：`scripts/build_cards.ts` **默认即写入生产**（`--dry-run` 才跳过），S1 早已是默认行为；`check:cards-fresh` 补上了缺失的一致性门禁。

### 3.6 审计与报告

| 文档 | 行数 | 首→末 | 时效 | 说明 |
|:--|--:|:--|:--:|:--|
| `docs/IQS_QA_AUDIT_PROMPTS_ALL.md` | **4258** | 03-26 → 03-26 | 🔵 | 全 49 个 tool 的**系统提示词审计报告**（2026-03-26 快照） |
| `docs/IQS_QA_AUDIT_PROMPTS_CORE.md` | 963 | 03-26 → 03-26 | 🔵 | 上者的 **CORE-only 子集**（13 个 tool） |
| `docs/IQS_RENDER_PLAN_VCHART_DEBUG.md` | — | 03-26 → 03-26 | 🔵 | VChart 调试计划 |
| `docs/IQS_QA_CASES_MATRIX.md` | 286 | — | 🟢 | 矩阵图高压测试用例（12×15 等大数据量） |
| `docs/archive/IQS_GUIDE_OBSIDIAN_MERMAID.md` | — | — | ⚪ | Obsidian Mermaid 教程（外围资料） |

> 这两份 03-26 的提示词快照**正好是「卡片 SSOT 之前」的基线** —— 可与 `dsl/cards/*` 对照，量化 6 个月的漂移。

### 3.7 软著与发行

| 文档 | 说明 |
|:--|:--|
| `docs/软著与发行/00_文档索引.md` | 软著申报与发行文档索引（含版本 V3.5.3-ildr） |
| `01_软件登记信息表.md` | 登记信息 |
| `04_安装部署与发行指南.md` | 部署发行 |
| `05_版本说明与发行记录.md` | 版本与发行记录 |
| `06_源代码鉴别材料说明.md` | 源代码鉴别材料 |
| `07_第三方组件与开源声明.md` | 第三方/开源声明 |
| `08_版权声明.md` | 版权 |
| `09_发行检查清单.md` | 发行检查 |
| `A_DSL引擎/{用户操作手册,设计说明书}.md` | DSL 引擎分册 |
| `B_MCP服务/{用户操作手册,设计说明书}.md` | MCP 服务分册 |

### 3.8 FLOW 专项（子索引）

| 位置 | 数量 | 入口 |
|:--|--:|:--|
| `docs/flow/{spec,design,math,notes,review,manual}/` | 38 | **`docs/flow/README.md`** |

> 已于 2026-09-12 单独整理：按「权威层级 × 领域 × 类型」组织，含标签体系与漂移审计指针。
> 本轮新增/更新的 FLOW 文档：`review/FLOW_AGENT_CARD_AUDIT.md`（AI 推理卡审计）、`review/FLOW_AUDIT_FINDINGS.md`（R20 / AUD-116..137）、`notes/FLOW_ROUTING_WORKLOG.md`（W12–W17）。

### 3.9 其他

| 位置 | 说明 |
|:--|:--|
| `output/flow-syntax-guide/*.md` | FLOW 语法指南（导航总览 + 字典层 + 骨架词法），**与真源存在重复**，建议并入 `dsl/cards/` 的产物 |
| `docs/assets/` | 品牌资产（logo / banner / favicon） |
| `mcp-server/mcp_tools.json` | **生成的产物**（真源为 `dsl/cards/*.card.ts`，勿手工编辑） |
| `dsl/generated/cardDocs.ts` | 帮助弹窗数据（生成物） |
| `protocol/{segments,prompts}/` | 生成物（55 + 55） |

### 3.10 UI 范式与共享件（2026-09-12 新增）

| 位置 | 说明 |
|:--|:--|
| `docs/design/UI_REFINEMENT_LOG.md` | **UI 范式增量记录**（v1.7）。规则 **R-UI-01..31** + 逐组件精修与代码审计的完整过程 |
| `components/ui/Switch.tsx` | 开关键控件**唯一真源**（`w-14 h-7`，范式取自排列图）。全项目 11 文件 27 处统一 |
| `components/ui/ConfirmInline.tsx` | 内联二次确认条，替代 `window.confirm()`（项目禁用原生弹窗） |
| `hooks/useAIEngine.ts` | AI 引擎名获取（带卸载守卫 + `catch` + 返回值校验），收口 15 个组件的重复 `useEffect` |
| `utils/id.ts` | `genId()` —— 时间戳 + 进程内自增序号，替代 9 处 `Date.now().toString(36)` / `Math.random().substr()`（同毫秒碰撞） |
| `utils/textMetrics.ts` | 逐字符字宽表（汉字 1em / 拉丁 0.56em）+ `fitText()`。**`str.length` 估算中英混排误差达 1.8 倍** |
| `utils/relationGraph.ts` | 关联图图论单一真源（`analyzeRelation` / `validateRelationLinks` / `pickUnlinkedPair`） |

> 本轮同时清扫了全项目的**装饰色作文字**（`text-amber-*` 最低 **1.55:1**）与**未映射色族**（`text-slate-*` / `text-blue-*` / `text-indigo-*`），并统一了 `rounded-lg → rounded-md`、`shadow-2xl → shadow-md`、字号下限 11px。

---

---

## 4. 权威层级（冲突时的裁决顺序）

沿 `protocol/governance.md` §3，并结合 2026-09-12 建立的 SSOT 体系：

| 层级 | 内容 | 位置 |
|:--:|:--|:--|
| **L0** | 语言规范 | `dsl/cards/*.card.ts`（**真源**） · `docs/IQS_DSL_V1_SPEC.md` · `dsl/kinds.json` |
| **L1** | 运行时解析 | `components/*Editor.tsx` / `components/flow/FlowParser.ts` 中的 `parse*DSL` |
| **L2** | MCP 资源 | `protocol/segments/*` · `protocol/intents.md` · `protocol/prompts/*`（**均为 L0 的产物**） |
| **L3** | 协议切片 | `protocol/DSL_V1.md` · `governance.md` |
| **L4** | 说明文档 | `docs/IQS_COMP_MANUAL_*` · 各类设计/报告 |

> **裁决规则**：冲突时以 L0 为准；L2/L3 与 L0 不一致即为**产物过期**（重跑 `npm run build:cards`）。
> 注意 `docs/IQS_COMP_MANUAL_*`（L4，02–03 月）与 `docs/IQS_DSL_V1_MANUAL.md`（L0，08 月）表述不一致时，**以 L0 为准**。

---

## 5. 文档整理建议（未执行，待决策）

| # | 建议 | 理由 |
|:--|:--|:--|
| 1 | `IQS_DSL_MANUAL_LEGACY.md`（根，🔴 已被取代）→ 移入 `docs/archive/` 并加时效横幅 | 与 `IQS_DSL_V1_MANUAL.md` 内容重叠且过时，易误引 |
| 2 | `docs/IQS_QA_AUDIT_PROMPTS_ALL.md` / `docs/IQS_QA_AUDIT_PROMPTS_CORE.md` → `docs/audit/`（标注 03-26 快照） | 4 千行大文件散落根目录；作为「SSOT 前基线」有对照价值 |
| 3 | 16 份 `docs/IQS_COMP_MANUAL_*` → `docs/manual/`；并在各篇头部加「权威性声明：语法以 `dsl/cards/` 为准」 | 与 FLOW 的 `docs/flow/manual/` 结构对齐 |
| 4 | `output/flow-syntax-guide/` → 并入 `dsl/cards/` 产物或移入 `docs/archive/` | 与真源重复，存在漂移风险 |
| 5 | `IQS_DSL_AGENT_MANIFESTO.md`（根与 docs 两份）→ 保留一份 | 两份副本易漂移 |
| 6 | `docs/archive/IQS_COMP_PLAN_Y_MATRIX.md` / `docs/IQS_RENDER_PLAN_VCHART_DEBUG.md`（单点已完成计划）→ `docs/archive/` | 历史价值 > 当前指导价值 |

---

*本索引由文档整理任务生成 · 时间线取自 git 提交历史（151 commits, 2026-02-05 → 2026-09-09）*
