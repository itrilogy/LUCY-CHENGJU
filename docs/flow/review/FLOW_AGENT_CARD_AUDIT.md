# AI 推理卡（Agent Card）审计报告

| 标签 | 值 |
|:--|:--|
| **时效** | 🟢 现行（2026-09-12 审计） |
| **权威层级** | L2（MCP Kind Resource）+ L3（协议切片）+ L4（说明文档） |
| **领域** | Protocol · DSL |
| **类型** | 审计 |
| **审计对象** | 所有供给 LLM 的 DSL 范式材料 + MCP 服务器分发设计 |
| **审计问题** | ① 范式说明是否到位？② 语义是否清晰？③ 能否有效指导大模型完成 DSL 生成？④ MCP 服务器设计 |
| **复现环境** | Node v26.5.0；`.tsx` parser 经 `vite` `ssrLoadModule` 加载；探针置于 `/tmp`（不入库） |

---

## 0. 结论摘要

| 问题 | 结论 |
|:--|:--|
| 说明是否到位 | ❌ **不到位**。同一 kind 有 **3 套规范源**，LLM 默认只拿到最简的一套；最完整的一套（`spec` / `segments` / `MANUAL`）**不在默认路径上** |
| 语义是否清晰 | ⚠️ **部分清晰**。核心机制（字典-索引、`Location` 按字典名索引）实现正确，但规范把「约定」写成「定义」；跨 kind 同名指令语义冲突且无统一声明 |
| 能否有效指导 LLM 生成 | ❌ **有硬伤**。7 条「卡-实现冲突」中，**LLM 照抄卡里的"正例"会被 MCP 自己的 lint 拒绝**；有 2 条冲突 **无法通过改写 DSL 规避** |
| MCP 服务器设计 | ⚠️ **方向正确、回执层有 4 处自相矛盾**。tier 分流 / 瘦描述 / 按需读资源 / lint 回执的设计是对的，但围栏、死数据、资源 URI 冲突、lint 静默失败使其失效；**12 个非 flow kind 无任何 lint 门禁** |

**一句话**：卡的「灵魂」写得好，但**「血肉」与「种子」在分发链路上被截断、被复制、被自相矛盾地包装**——LLM 拿到的是最薄的一份，而这份里恰好包含**两个照抄即失败的"正例"和一个引擎自己都不遵守的红线**。

---

## 1. 载体与分发结构（事实基线）

### 1.1 五处载体

| 载体 | 规模 | 内容 |
|:--|--:|:--|
| `mcp-server/mcp_tools.json` | 1395 行 / 113 KB / 55 工具 | 每工具 `description` `expertise` `expert_logic` `syntax_rules` `official_example` `intent_trigger` `inference_key` `input_schema` |
| `protocol/segments/*.md` | 18 文件 | 人读切片（Soul / Flesh / Seed 三段式）；`flow.md` + `flow.agent.md` 为 LLM 编译卡 |
| `protocol/DSL_V1.md` | 34 行 | `protocol://dsl/v1` 摘要 + 7 条快速红线 |
| `protocol/governance.md` | 53 行 | 权威层级 L0–L4 / Core vs Relief / token 策略 / 切片管理 |
| `docs/IQS_DSL_V1_MANUAL.md` + `_SPEC.md` | 1619 + 579 行 | 细粒度手册（14 kind）/ 架构规范 |
| `services/aiService.ts` | 295 行 | **前端** AI 提示词拼装（第二套分发） |

### 1.2 `ReadResource` 的三条分发路径（`mcp-server/index.js:285-374`）

| URI | 内容 | 典型消费者 |
|:--|:--|:--|
| `protocol://segments/iqs_native/flow` | **特判**：`flow.agent.md` + `---` + `## 人读协议切片` + `flow.md` 全文 | LLM（flow） |
| `protocol://segments/iqs_native/{其他 13 kind}` | `master.expert_logic` + `master.syntax_rules` + `tool.expert_logic` + `tool.syntax_rules` + ```dsl `tool.official_example` | LLM（其他 core） |
| `protocol://segments/{key}`（legacy） | `governance` + `segments/{key}.md` 全文 | **无**（thin description 不指向它） |

> **关键**：thin description 生成的是 `read: protocol://segments/${tool.parent_type}/${tool.sub_type}`（`index.js:224`）——**即只指向第二条路径**。⇒ `segments/*.md` 中远超 `mcp_tools.json` 的细节（`Color[...]` / `Font[...]` / `ShowValues` / `Grid` / `Attach` / 属性值域）**对 LLM 默认不可见**。

---

## 2. 实测：三源指令覆盖与示例一致性

**方法**：抽取各源中形如 `Xxx:` 与 `Slot` 的指令标记做集合差；对 `official_example` 逐行做子串命中。

### 2.1 指令覆盖（`mcp_tools.json` 的 `syntax_rules` 对比 `segments/*.md`）

`A\B` = 仅 mcp 有；`B\A` = 仅 segment 有（**LLM 默认看不到**）。

| kind | A\B | B\A（节选，LLM 不可见） |
|:--|:--|:--|
| affinity | — | `Color[TitleBg/TitleText/GroupHeaderBg/ItemBg/ItemText]` |
| arrow | — | `Color[Critical]` `Color[Line]` `ShowShortest` |
| basic | `Color[Title]` | `ShowLegend` `ShowValues` |
| control | — | `Color[Line/Point/UCL]` `Decimals` `ShowValues` |
| fishbone | — | `Color[Root/RootText/Main/MainText]` |
| histogram | — | `Color[Bar/Curve/USL/LSL/Target]` `ShowLabels` `ShowValues` |
| matrix | — | `Weight[Strong/Medium/Weak]` `CellSize` |
| matrixPlot | — | `Styles` `Data` `DisplayMode` `Diagonal` `ColorPalette` |
| pareto | — | `Color[Bar/Line/MarkLine/Title]` `Font[Title/Base/Bar/Line]` |
| pdpc | — | `Color[Start/Step/Countermeasure/End(+Text)]` `Line[Width]` |
| relation | — | `Color[Root/RootText/Middle/MiddleText/End/EndText]` `Color[Line]` |
| scatter | `Color[Point\|Trend]` `Opacity` `Show3D` `ShowValues` `Size[Base]` | `Color[Point]` `Color[Trend]` `X` `Y` `Z` |
| flow | `Type[+]` `Type[DATA]` `Type[T]` | `Attach(#id)` `Color[Slot]` `Color[Start]` `Grid` |

**结论**：13 个非 flow kind 的 `B\A` 几乎全部非空 ⇒ **LLM 默认拿到的语法清单显著窄于协议切片**。`scatter` 反向（mcp 写了 `Color[Point|Trend]` 合并形式，segment 与示例用分开形式）。

### 2.2 示例一致性（`official_example` 行命中率）

| 命中率 | kind |
|:--|:--|
| **100%**（9） | affinity · arrow · control · fishbone · histogram · matrix · matrixPlot · pareto · flow |
| 80% | scatter |
| 40% | radar |
| **25%** | basic |
| **21%** | pdpc |
| **9%** | **relation** |

⇒ **5 个 kind 的"官方示例"在 MCP 与协议切片里不是同一份**。`relation` 两份几乎是两个不同的图（16 节点 / 8 节点）。

### 2.3 示例可解析率

| 来源 | 结果 |
|:--|:--|
| `mcp_tools.json` 的 14 个 `official_example` | **14/14 ✅ 解析通过**，且均产出完整图（nodes>0） |
| `protocol/segments/*.md` 内嵌示例 | flow 内 **4 个 BNF 片段**（报错属正常，非缺陷）；**`flow.md` 正例 B 报错**；**`relation.md` 示例产出悬空边** |

---

## 3. 卡-实现冲突（直接决定"能否有效指导 LLM"）

> 判据：LLM 严格照卡书写 → 被 parser 拒绝或产出错误图。

| # | 卡的承诺 | 出处 | 实测 | 严重度 |
|:--|:--|:--|:--|:--:|
| **C1** | 显式边可带标签 `<源id> → #<目标id> [<标签>]` | spec §7.2 `w1 → #w5 [超时]` + `flow.md` | ❌ **两种写法均报错**：`显式边目标 w2 [提交申请] 未定义` / `显式边目标 w2 提交申请 未定义`（方括号被并入 ID） | **P1** |
| **C2** | 分支目标**可省略**（= 接声明顺序下一节点） | spec §7.3 表格「目标 … 可省略」 | ❌ **静默丢弃**：`是 →` 不产生任何边，无 err/warn | **P1** |
| **C3** | 「N/DATA **不作默认流出源、也不作为默认流入目标**」 | spec §5.5 + `flow.agent.md` 红线 7 | ❌ **引擎自身违约**。`W: n1: 备注 Type[N] Attach(#w1)` 紧邻主流时，默认序流产生 `w1 → n1` ⇒ 报错 `分支/连线目标 n1 为修饰类节点（N/DATA），不可作为流转目标`。**LLM 无法通过改写 DSL 规避**（它不是 DSL 错误） | **P0** |
| **C4** | 「可流转节点（S/T/SUB）按声明顺序自动连」 | spec §7.1 + `flow.agent.md` | ❌ 官方正例 A 现场产出**多余边 `w4 → w5`**（w4/w5 是 q1 的并列分支目标，不应相连）。**AUD-001 独立复现**；T16 场景亦复现 `w2 → w3` | **P0** |
| **C5** | 「多目标自动拆并行边」 | spec §7.3 + `flow.md` | ⚠️ 拆边成功，但**产生 warning**「节点 q1 分支出口标签「是」重复（应唯一）」——**该唯一性约束卡中从未提及** | P2 |
| **C6** | 「正例 B · 来料检验」（单维 + 子流程） | `flow.agent.md` §5 **与** `flow.md` §3 | ❌ **lint 报错**：`节点 w3（记录归档）孤立（无入边且无出边）`。⇒ **卡里的"正例"会被 MCP 自己的 `lintFlowDsl` 在渲染前拒绝**，且错误信息（"节点孤立"）无法从卡中推导修法 | **P0** |
| **C7** | 未列举的行为 | — | ❌ `Type[XX]`（未声明类型）**静默降级为 `task`**，无 err/warn（同 AUD-005 类静默失败） | P1 |

### 3.1 同源确认

- **C4 ↔ AUD-001**（默认流分支扇出误连）· **C2 ↔ AUD-003**（分支目标省略丢弃）· **C7 ↔ AUD-005**（静默降级）
- **C6 与 C3 是本次新发现**，且**都是"卡与引擎互斥"**：C6 是卡错、C3 是引擎错，但对外表现相同——**LLM 收到的指令与系统实际接受的行为不一致**。

---

## 4. 语义清晰性缺口

| # | 缺口 | 现状 |
|:--|:--|:--|
| **S1** | `Location()` 参数顺序语义 | 实现**正确**：`cell` 按**字典名**索引（实测 `{"D":0,"P":1}`），与 `Lane from ... Layout H/V` 无关。但 **spec §5.3 / §3.3 用「`Location(<D索引>, <P索引>)` = 行×列」表述**——把"D 必然是行"这一**约定**写成了**定义**；`Lane from D[..] Layout V` 时该表述失效。**`flow.agent.md` 完全未说明此语义** |
| **S2** | 六属性值域 | `flow.agent.md` §3 只列 `SOP() Role() Lv() Time() KPI() M()`；值域（`Lv(重大\|重要\|一般\|1\|2\|3)`、`M(BPM\|1..4)`）仅在 spec 附录 A 与 `flow.md` |
| **S3** | `Attr active` 语义 | `flow.agent.md` §1 BNF 列出该指令，§2–§7 正文**无任何解释**（作用、缺省行为、与节点右下角的关系） |
| **S4** | `Grid:` / `Color[Slot]:` | `flow.md` 有（表格 + 示例），`flow.agent.md` **无**，`mcp_tools.json` 的 flow `syntax_rules` **无** |
| **S5** | `Item:` 跨 kind 语义冲突 | affinity = `id, label, parentId`；pdpc = `id, label, [type]` —— 同名指令、不同含义，**无任何统一声明** |
| **S6** | `-` 列表项跨 kind 语义冲突 | histogram `- 数值`；pareto `- 名: 值`；scatter `- x, y [,z]`；matrix `- id, 名, 权重` |
| **S7** | 边语法跨 kind 不一致 | flow `w1 → #w2`（**全角箭头**）；relation `Rel: a -> b`；arrow `a -> b: 时长, 标签`；pdpc `a--b [OK]` |
| **S8** | `Grid:` 跨 kind 语义冲突 | flow = **线型**（`dashed`/`solid`）；basic = **开关**（mcp 示例用 `Grid: true`，而 basic 的任何 `syntax_rules` 都未声明 `Grid`） |
| **S9** | affinity 的 `root` 被吞 | 实测返回 `data` 只含 `root` 的 children（示例 `root` 不出现）。此契约**未在 affinity 卡中说明** |
| **S10** | `Lane from` 字典须与 `Location` 对齐 | spec §3.3 有；`flow.agent.md` 无 |

---

## 5. 示例（The Seed）自身质量问题

| # | 问题 | 证据 |
|:--|:--|:--|
| **E1** | **`#` 注释污染** | 8/14 core 的 `official_example` 用 `#` 写注释（fishbone 15 行、affinity 4、pdpc 4、basic 3、matrix 3、arrow 2、relation 2、histogram 1）。而 `protocol/DSL_V1.md` 红线 2 写「行注释用 `//`；`#/##` 层级**仅鱼骨图**」，master 写「非鱼骨图中 `#` 行**仅作兼容注释**」⇒ **示例示范了协议自己标记为不推荐的写法**；`radar`/`scatter` 却用 `//` —— **同一套协议内示例风格不一致** |
| **E2** | `#` 双重语义 | fishbone 中 `#` 是**结构**（一/二级分类），其他 kind 中是**注释**（兼容）——同文档内同名符号两种语义，最易混淆 |
| **E3** | `Line[Width]` | pdpc 示例使用（`Line[Width]: 2`），但 master 的 shell 清单只有 `Color[Slot]` / `Font[Slot]` / `Show*` / `Decimals` |
| **E4** | `Color[Point\|Trend]` | scatter 的 mcp `syntax_rules` 写合并形式，segment 与示例写分开形式 ⇒ 卡写了**可能不支持**的形式 |
| **E5** | radar 标注与内容不符 | `segments/radar.md` §3 标题「场景：某两款智能手机硬件参数对比」，示例实为「投资组合多维风险分析」 |
| **E6** | flow 兜底示例不一致 | `index.js:430` JSON 纠错回执里的 flow 范例（`Dict: D[部门A,部门B]` 简化版）与 `flow.agent.md` 正例 A **不是同一份** |
| **E7** | `relation` segment 示例**非法** | `Rel: m1 -> root` / `Rel: m2 -> root` 引用**从未定义的 `root` 节点**；parser 静默接受（8 节点 / 10 边含 2 条悬空边）⇒ 示例依赖一个**未文档化的隐式 root** |

---

## 6. MCP 服务器设计缺陷

| # | 缺陷 | 位置 | 影响 |
|:--|:--|:--|:--|
| **M1** | `ReadResource` 把 `official_example` 包进 ` ```dsl ` 围栏 | `index.js:345` | 与「禁止 Markdown 围栏」红线**直接冲突**；且 `validate_dsl.mjs` 对含围栏的示例 `fail` ⇒ **门禁与分发自相矛盾**；**示范围栏会诱导 LLM 输出围栏** |
| **M2** | 前端提示词同样包围栏 | `aiService.ts:119` | 同上（第二条分发链路重复同一错误） |
| **M3** | `render_flow` 在 `mcp_tools.json` 的 `expert_logic` / `syntax_rules` / `official_example` 是**死数据** | `index.js:326-331` 特判走文件 | **AUD-020 的根因**：三源漂移无对账 |
| **M4** | **资源 URI 冲突**：`vchart/heatmap` 被两个工具占用（`render_vchart_heatmap` 与 `render_vchart_correlation_heat` 的 `sub_type` 均为 `heatmap`） | `mcp_tools.json` + `index.js:334`（`find` 只命中首个） | 第二个工具的资源**不可达**或返回错内容 |
| **M5** | `render_vchart_correlation_heat` 名称疑似截断（应为 `…_heatmap`） | `mcp_tools.json` | 命名一致性 |
| **M6** | **JSON 纠错兜底示例对除 flow 外所有工具无效** | `index.js:428`：`t.parent_type === type`，但 `type="pareto"` 而 `parent_type="iqs_native"`，**永不匹配** → 落到 `Title: 标题\nSpec: { ... }` | 非 flow 工具被纠正时收到**错误的修复范式**（把 QC 工具导向 Spec JSON） |
| **M7** | `inputSchema` 未声明 `sub_type`，但 `CallTool` 读取 `args.sub_type` | `index.js:390-401` vs `:428` | 死路径 |
| **M8** | `lintFlowDsl` 抛异常时 `return null`；调用处 `if (flowLint && …)` 为假 ⇒ **静默跳过校验直接渲染** | `index.js:242-245, 447-465` | 门禁静默失效（超时 8s / spawn 失败 / 输出非 JSON） |
| **M9** | `buildThinDescription` 只为 `render_flow` 与 `render_mermaid_flowchart` 注入反红线 | `index.js:202-218` | governance §2「存在 Native 散点/雷达时禁止默认走 `render_vchart_scatter`/`render_vchart_radar` 充当 QC 终稿」**未在 `list_tools` 层可见**，LLM 选型时看不到该红线 |
| **M10** | flow 资源 = `flow.agent.md` **全文 +** `flow.md` **全文**，两份正例 A/B **逐字重复** | `index.js:329` | token 浪费（实测两份共 271 行）；**若两份漂移则 LLM 同时收到互相矛盾的指令** |
| **M11** | `dsl/index.ts` 的 `lintDsl()`（唯一跨 kind shell 校验）**无任何调用方** | `dsl/index.ts` | 死代码 ⇒ **12 个非 flow kind 无任何 lint 门禁** |
| **M12** | `validate_dsl.mjs` 仅浅校验（`Title:` 存在 / 无围栏 / affinity 用 `Item:` / fishbone 用 `#`），**不跑真实解析器** | `scripts/validate_dsl.mjs` | AUD-069 未闭环：解析器漂移无门禁 |
| **M13** | `protocol://segments` 索引**同时**列 File segments 与 Kind resources，同一 kind 两个 URI | `index.js:304-320` | LLM 可能两个都读 ⇒ token 翻倍（与 ILDR 省 token 目标相悖） |
| **M14** | `mcp_tools.json.bak`（101 KB）与 `test_fishbone.png` 残留仓库 | `mcp-server/` | 交付卫生 |
| **M15** | `ListResources` 中 flow 资源名为 `… (Master + Kind)`，实际内容是 agent+segment | `index.js:276` | 命名误导 |

---

## 7. 与既有台账的对应关系

| 本条新编号 | 同源既有条目 | 关系 |
|:--|:--|:--|
| AUD-116 | AUD-067 / 069 / 070 | 分发链路的系统性描述（三源） |
| AUD-117 | AUD-020 | **实测确证**：显式边标签在 spec/flow.md 有、实现无、agent.md 不提 |
| AUD-118 | AUD-003 | **实测确证**：分支目标省略静默丢弃 |
| AUD-119 | 新 | N/DATA 被默认序流串入主流（引擎违约，红线 7 不可执行） |
| AUD-120 | AUD-001 | **独立复现**：官方正例 A 产出 `w4→w5` |
| AUD-121 | 新 | 多目标出口标签唯一性约束未文档化 |
| AUD-122 | AUD-001/002/020 | **新**：`flow.agent.md` 正例 B 被自家 lint 拒绝 |
| AUD-123 | 新 | `relation.md` 示例引用未定义 `root` |
| AUD-124 | AUD-002 | **量化**：5/14 kind 示例三源不一致（relation 9%） |
| AUD-125 | AUD-020 | **量化**：8/14 示例用 `#` 注释，与红线 2 冲突 |
| AUD-126 | 新 | 跨 kind 同名指令语义冲突无统一声明 |
| AUD-127 | 新 | `Location` 维度顺序表述问题 + agent.md 缺失 |
| AUD-128 | 新 | 六属性值域 / `Attr active` 在 agent.md 缺失 |
| AUD-129 | AUD-070 | **实测确证**：围栏与红线冲突（MCP + 前端两条链路） |
| AUD-130 | AUD-020 | `render_flow` 死数据（三源漂移根因） |
| AUD-131 | 新 | `vchart/heatmap` 资源 URI 冲突 |
| AUD-132 | 新 | JSON 兜底示例对非 flow 工具失效 |
| AUD-133 | 新 | `lintFlowDsl` 静默失败 |
| AUD-134 | AUD-069 | 非 flow kind 无 lint 门禁 + `lintDsl` 死代码 |
| AUD-135 | 新 | vchart 反红线未注入 thin description |
| AUD-136 | 新 | 资源索引重复列同一 kind 两个 URI |
| AUD-137 | 新 | 仓库残留 `.bak` / `.png` |

---

## 8. 修复优先级建议

| 优先级 | 动作 | 对应用例 |
|:--|:--|:--|
| **P0** | 修 `flow.agent.md` / `flow.md` 的正例 B（w3 加入边或改结构），使其通过自家 lint | C6 / AUD-122 |
| **P0** | 修默认顺序流：分支目标之间不得自动连（抑制 `w4→w5`）；N/DATA 不作默认流入目标 | C3 / C4 / AUD-119 / AUD-120 |
| **P0** | 决策：显式边标签与分支目标省略——**实现之** 或 **从 spec/flow.md 移除**（当前"文档承诺、实现报错"最坏） | C1 / C2 / AUD-117 / AUD-118 |
| **P1** | **单一真源**：`mcp_tools.json` 的 flow 条目删除或改为从 `flow.agent.md` 生成；消除三源漂移 | M3 / AUD-124 / AUD-130 |
| **P1** | 移除 `official_example` 的 ` ```dsl ` 围栏（MCP + 前端两处） | M1 / M2 / AUD-129 |
| **P1** | 补齐 `flow.agent.md`：六属性值域、`Attr active`、`Grid` / `Color[Slot]`、`Location` 语义、`Lane from` 对齐要求 | S1–S4 / S10 / AUD-127 / AUD-128 |
| **P1** | 新增「跨 kind 同名指令对照表」（`Item:` / `-` / `Grid:` / `#` / 边箭头），并入 `protocol/DSL_V1.md` | S5–S8 / AUD-126 |
| **P1** | 修 M4（资源 URI 冲突）/ M6（兜底示例）/ M8（lint 静默）/ M12（门禁跑真解析器） | AUD-131/132/133/134 |
| **P2** | 统一示例注释为 `//`；修正 `relation.md` 示例的 `root`；修 radar 场景标题 | E1 / E5 / E7 / AUD-123 / AUD-125 |
| **P2** | `render_scatter`/`render_radar` 的 thin description 注入 vchart 反红线 | M9 / AUD-135 |
| **P2** | 清理 `mcp_tools.json.bak`、`test_fishbone.png` | M14 / AUD-137 |

---

## 附：复现命令摘要

```bash
# 1. 14 kind 的 official_example 可解析率（vite SSR 加载 .tsx parser）
node /tmp/check_examples.mjs        # → 14/14 ✅

# 2. segments 内嵌示例（含 flow 正例 B / relation 悬空 root）
node /tmp/check4.mjs                # → flow 正例 B ❌ w3 孤立；relation 悬空边 m1→root

# 3. 卡-实现冲突矩阵（15 用例）
node /tmp/check5.mjs                # → T1 显式边标签 ❌；T4 N/DATA 默认流 ❌
node /tmp/check6.mjs                # → T1b/T1c ❌；T15 省略目标静默丢边；T19/T20 ❌

# 4. Location 维度顺序语义
node /tmp/check7.mjs                # → cell 按字典名索引 {"D":0,"P":1}

# 5. 三源一致性
node /tmp/check3.mjs                # → 指令覆盖子集 + 示例命中率（relation 9%）

# 6. 仓库门禁（现状：浅校验，不跑解析器）
npm run validate:dsl                # → PASS (0 warnings)
```

---

*审计人：审计助手 · 只追加、不覆盖 · 与 `FLOW_AUDIT_FINDINGS.md` 通过 AUD 编号双向引用*
