# IQS-DSL 卡片单一真源（SSOT）与分发收敛 — 设计方案（讨论稿）

| 标签 | 值 |
|:--|:--|
| **时效** | 🟢 现行（2026-09-12 讨论稿，**待决策**） |
| **权威层级** | L0（拟建真源）+ L2/L3/L4（现有分发） |
| **领域** | DSL · Protocol |
| **类型** | 设计 |
| **状态** | **讨论中** — §6 四项决策待拍板后方可实施 |
| **依据** | `docs/flow/review/FLOW_AGENT_CARD_AUDIT.md`（R20 / AUD-116..137） |

---

## 0. 现状诊断：同一个 kind 最多有 5 份手抄副本

| # | 来源 | 形态 | 消费者 | 数量 |
|:--|:--|:--|:--|--:|
| **A** | `mcp-server/mcp_tools.json` | JSON 字段（`expert_logic` / `syntax_rules` / `official_example`） | MCP → LLM | 55 tool |
| **B** | `protocol/segments/*.md` | Markdown（Soul / Flesh / Seed） | MCP（**仅 flow 特判**）+ 人 | 18 |
| **C** | `docs/IQS_DSL_V1_MANUAL.md` + `_SPEC.md` | Markdown | 人 | 2 |
| **D** | `constants.tsx` 的 `INITIAL_*_DSL` | TS 模板字符串 | 组件初始示例 | 16 |
| **E** | `components/*Editor.tsx` 的帮助弹窗 | **JSX 硬编码 HTML 表格** | 人（帮助按钮） | **14 组件 × 2 tab** |
| **F** | `services/aiService.ts` 提示词拼装 | TS 字符串 | 前端 AI | 1 |
| **G** | `output/flow-syntax-guide/*.md` | Markdown | 人 | 3 |

### 漂移量化

**D（组件示例）与 A（发给 LLM 的 `official_example`）的逐行重合率**：

| 重合率 | kind |
|:--|:--|
| **≥95%（同步良好）** | pareto 100% · relation 100% · histogram 95% |
| 21–50% | scatter 50% · fishbone 44% · radar 32% · control 31% · vchart 27% · basic 24% · matrix 21% |
| **≤15%（几乎无关）** | **flow 15% · matrixPlot 14% · mermaid 14% · affinity 13% · pdpc 10% · arrow 6%** |

> 均值 ≈ **35%**。即：**用户在组件里点开看到的示例，与发给大模型的示例，多数不是同一个**。

**E 的漂移实况**：`AffinityEditor.tsx` 弹窗写「`Title:` **图表标题**」，而 `mcp_tools.json` 写「`Title:` **图表主标题**」 —— 措辞已开始分叉；版本号（`Affinity Logic Base V2.1`、`Basic Chart Logic Base V1.2`）为**硬编码字符串**，无版本管理。

### 结论

**"语法全量 / 示例准确 / 统一管理对照"三项在当前架构下无法达成** —— 因为没有真源，任何一次修正都要同时改 5 处，漏改即漂移（R20 的 AUD-124/125/130 即其后果）。

---

## 1. 目标形态

```
dsl/cards/                                  ← ★ 单一真源（14 core + 2 relief family）
  affinity.card.ts  arrow.card.ts  ...  flow.card.ts
  _shared.ts                                 （跨 kind 公共条款：注释/围栏/标点/输出红线）
        │
        │  scripts/build_cards.mjs             （构建期生成 · 幂等）
        ▼
  ├─ mcp-server/mcp_tools.json               （重建 A：expert_logic + syntax_rules + official_example）
  ├─ protocol/segments/<kind>.md             （重建 B）
  ├─ docs/IQS_DSL_V1_MANUAL.md 的 kind 章节   （重建 C）
  ├─ constants.tsx → import 生成物            （重建 D：INITIAL_*_DSL）
  ├─ src/generated/cardDocs.ts               （重建 E：帮助弹窗数据）
  ├─ services/aiService.ts 提示词片段         （重建 F：从同一数据拼装）
  └─ output/flow-syntax-guide/*.md           （重建 G）
        │
        │  scripts/validate_cards.mjs         （CI 门禁 · 五道）
        ▼
  ① 结构完整性   每个 kind 的 syntax 条目数 ≥ 阈值；必填字段齐全（name/meaning/example）
  ② 示例可解析   用**真实 parser**（vite ssrLoadModule）跑每个 example，零 error
  ③ 示例语义断言 节点/边/泳道计数、无孤立节点、无悬空边、无 N/DATA 违规
  ④ 产物一致性   生成物与真源无 diff（阻止手工改产物）
  ⑤ 跨 kind 对照 自动产出「同名指令对照表」，冲突即 fail
```

---

## 2. 真源的数据形态（关键约束）

**syntax 必须是结构化条目而非 Markdown 字符串** —— 否则"语法全量"无法机器校验，"对照"只能靠肉眼。

```ts
// dsl/cards/affinity.card.ts
import type { CardSpec } from './_types';

export default {
  meta: {
    id: 'affinity', tier: 'core', family: 'iqs_native', body: 'ItemTree',
    mcpName: 'render_affinity', qcTool: 'AFFINITY', version: '2.2',
    intents: ['亲和图', 'KJ法', '系统图', 'affinity', '卡片分组'],
    colorSlots: ['TitleBg', 'TitleText', 'GroupHeaderBg', 'ItemBg', 'ItemText', 'Line', 'Border'],
    typeDirective: { name: 'Type', values: ['Card', 'Label'], meaning: 'renderMode' },
  },
  soul: {
    title: 'KJ 法（亲和图）',
    summary: '按相互亲和性归纳语言信息，使问题条理化。',
    steps: ['发散', '收敛', '层级化'],
    tips: ['无法归类时不要强塞——可能意味着新的观察维度'],
  },
  syntax: [                                   // ← 结构化 = 可全量统计与对照
    { name: 'Title',  meaning: '图表标题', example: 'Title: 市场调研整理', required: true },
    { name: 'Type',   meaning: '渲染模式', values: ['Card', 'Label'], example: 'Type: Card' },
    { name: 'Layout', meaning: '布局方向', values: ['Horizontal', 'Vertical'], example: 'Layout: Horizontal' },
    { name: 'Color',  slot: ['TitleBg', 'TitleText', 'GroupHeaderBg', 'ItemBg', 'ItemText'],
      meaning: '#HEX 颜色', example: 'Color[TitleBg]: #4f46e5' },
    { name: 'Font',   slot: ['Title', 'GroupHeader', 'Item'], meaning: 'px 字号',
      example: 'Font[Title]: 20' },
    { name: 'Item',   meaning: '数据项（id, label, parentId）', example: 'Item: g1, 空间布局, root' },
  ],
  example: { title: '办公环境改善方案', dsl: `...`, notes: '' },
  counterexample: [{ bad: '用 # 建树', good: '用 Item:', reason: '亲和图是 ItemTree，不是 Tree' }],
} satisfies CardSpec;
```

**为什么推荐 TS 模块**：① 有类型检查（`satisfies CardSpec` 立即暴露漏字段）；② 生成器直接 `import`，无需额外 YAML/JSON 解析；③ 可写注释辅助人类维护；④ 与既有 `dsl/registry.ts` 一致。

---

## 3. MCP 工具声明与意图路由（用户重点 3）——**现有设计只做到一半**

**原始意图**：一个 MCP 服务携带大量工具 → 怕撑爆上下文 → 做收敛 → 让大模型先路由到**意图层面** → 再返回**语法规范**与**具体提示词**。

| 设计目标 | 现状 | 判定 |
|:--|:--|:--|
| 不把全量语法塞进 `tools/list` | 瘦描述 26–63 字符 | ✅ **已达成** |
| 按需返回语法规范 | `ReadResource` 二级分发（`protocol://segments/{parent}/{sub}`） | ✅ **已达成** |
| **路由到意图层面** | ❌ **无此机制**：55 个工具**全量列出**，LLM 仍需逐条读 description 才能选型 | ❌ |
| **返回「具体提示词」** | 只有 `expert_logic` + `syntax_rules` 的拼接；**「提示词」（prompt template）无处承载** | ❌ |
| 反红线在**选型时**可见 | 仅 `render_flow` / `render_mermaid_flowchart` 特判注入 | ❌ |
| 工具声明格式**一致** | `render_flow` 8 行 vs 其他 5 行 | ❌ |
| 已实现的意图路由 | **只在前端**：`aiService.ts` 的 `buildIntentDiscoveryPrompt` 让 LLM 从目录选 `sub_type` | ⚠️ 与 MCP 侧不对称 |

### 3.1 建议的目标链路

```
第 0 层  tools/list  ── 收敛为 2–3 个工具（不再 55 条）
    render_native(dsl, kind?)              14 core 合一
    render_relief(dsl, dialect, subtype?)  40 relief 合一
    describe(kind | intent)                返回语法规范 + 提示词

第 1 层  resources  ── 意图路由入口
    protocol://intents                     意图目录（14 core + 2 relief 家族 × 关键词 ≈ 1KB）
    protocol://segments/iqs_native/<kind>  语法规范（现有 URI 不变）
    protocol://prompts/<kind>              「具体提示词」（新增，承载 R20 中缺失的那一环）

第 2 层  render  ── 执行
```

**收益**：`tools/list` 从 55 条 → 3 条；意图路由由**一个资源**承担（而非 55 条 description）；反红线可统一注入 `protocol://intents`。

### 3.2 一个必须权衡的点

现有 55 个 `render_*` 工具的 `inputSchema` **完全相同**（仅 `dsl` / `width` / `height`），因此**合并几乎无功能损失**。代价是：

- 失去 MCP 客户端「工具选择菜单」的便利（用户点选而非描述）；
- 工具名不再自解释（`render_pareto` → `render_native`），需靠 `describe` 补足。

> 若倾向保留可读性，可采**折中方案**：保留 14 个 core 工具（高频、需语义化），把 40 个 relief 收敛为 2 个（`render_mermaid` / `render_vchart`），并新增 `protocol://intents` 与 `protocol://prompts/*`。

---

## 4. 帮助弹窗的单一来源（用户重点 4）

**现状**：14 个 Editor 各有 ~90–150 行 JSX 硬编码表格（共约 1,500 行），与 A/B/C 手工同步。

| 方案 | 机制 | 优点 | 代价 |
|:--|:--|:--|:--|
| **(a) 构建期生成 TS 模块**（推荐） | `scripts/build_cards.mjs` 产出 `src/generated/cardDocs.ts`；Editor 改 `import { CARD_DOCS }` 渲染 | 类型安全 · 无运行时 fetch · 与 Vite 一致 · 保留现有排版自由度（仅把表格行换成 `map`） | 需重跑构建（已由 `npm run build` 覆盖） |
| (b) 运行时读 JSON | 组件 `fetch('/dsl-cards/<kind>.json')` | 产物即数据，最"纯"的单一来源 | 需处理 loading/失败态；多一次请求 |
| (c) 生成 Markdown + 渲染 | 复用 `docs/flow/manual/*.md` | 人读友好 | 项目无通用 Markdown 渲染器（未确认），改造成本高 |

**推荐 (a)**：`CARD_DOCS[kind] = { meta, soul, syntaxTable, example, counterexample, prompt }`，弹窗的「DSL 规范说明」渲染 `syntaxTable`，「分析逻辑与指南」渲染 `soul` + `counterexample`。**删除 14×2 段硬编码**。

---

## 5. 分阶段落地

| 阶段 | 内容 | 产出 |
|:--|:--|:--|
| **S0** | 建真源骨架 + 生成器 + CI 门禁；**先试点 2 个 kind**（`flow` 复杂 + `affinity` 简单） | `dsl/cards/`、`scripts/build_cards.mjs`、`scripts/validate_cards.mjs` |
| **S1** | 修 R20 的 22 条卡问题 —— **在真源里修**（改一处、全链路生效） | AUD-116..137 |
| **S2** | 迁移剩余 12 core + 2 relief family | 全量真源 |
| **S3** | MCP 工具收敛 + `protocol://intents` + `protocol://prompts/*` | `tools/list` 3 条 |
| **S4** | 帮助弹窗改为 import 生成物 | 删除 ~1,500 行硬编码 JSX |
| **S5** | 产物一致性门禁：`build → git diff --exit-code` | CI 闭环 |

---

## 6. 决策记录（已拍板）

| # | 决策 | **结论** | 影响 |
|:--|:--|:--|:--|
| **D1** | 真源数据形态 | ✅ **TS 模块** `dsl/cards/<kind>.card.ts`（`satisfies CardSpec`） | 有类型检查；生成器直接 `import`；可写注释；与 `dsl/registry.ts` 一致 |
| **D2** | MCP 工具面 | ✅ **保持 55 个工具不动**，仅新增 `protocol://intents` 与 `protocol://prompts/*` | 不动 `ListTools`；补上缺失的「意图路由入口」与「提示词承载」两环 |
| **D3** | 帮助弹窗接入 | ✅ **构建期生成 TS 模块** `src/generated/cardDocs.ts`（取推荐默认） | 删 14×2 段硬编码 JSX；保留现有排版自由度 |
| **D4** | 落地节奏 | ✅ **S0 试点先行**：先建真源骨架 + 生成器 + CI 门禁，只迁 `flow` 与 `affinity` | 先验证「改一处、全链路生效」，再复制到其余 12 kind |

### 6.1 由 D2 推导的 MCP 侧改动范围（**不含** `ListTools`）

**明确不改**：`ListToolsRequestSchema` 的 55 工具发布逻辑、各工具 `name` / `inputSchema`。

**新增两个资源**：

| URI | 内容 | 作用 |
|:--|:--|:--|
| `protocol://intents` | 意图目录：14 core + 2 relief 家族 × `intents` 关键词 × `read` URI，由 `dsl/cards/*.card.ts` 的 `meta.intents` **生成** | **补上缺失的「路由到意图层面」**——LLM 读一个资源即可完成选型，无需逐条读 55 条 description |
| `protocol://prompts/<kind>` | 「具体提示词」模板：由卡片的 `soul` + `syntax` + `example` + `outputControls` **生成** | **补上缺失的「返回具体提示词」**——现无任何载体 |

并在 `protocol://intents` 中统一注入反红线（含 governance §2 的「有 Native 等价时禁止走 `render_vchart_*` 充当 QC 终稿」——目前仅在 `flow` / `render_mermaid_flowchart` 特判）。

---

## 7. S0 实施进度（✅ 已完成）

| 项 | 实际路径 | 状态 |
|:--|:--|:--|
| `CardSpec` 类型契约 | `dsl/cards/_types.ts` | ✅ 完成 |
| 试点真源 · 简单 kind | `dsl/cards/affinity.card.ts`（10 条语法 · 2 反例） | ✅ 完成 |
| 试点真源 · 复杂 kind | `dsl/cards/flow.card.ts`（24 条语法 · 6 反例） | ✅ 完成 |
| 生成器 | `scripts/build_cards.ts` → `build/cards/`（13 产物） | ✅ 完成 |
| 五道门禁 | `scripts/validate_cards.ts` | ✅ 完成 |
| npm 脚本 | `npm run build:cards` / `npm run validate:cards` | ✅ 完成 |
| 产物隔离 | `.gitignore` 增 `build/` | ✅ 完成 |

**验收结果**：

| 命令 | 结果 |
|:--|:--|
| `npm run build:cards` | ✓ 生成 2 份卡片 |
| `npm run validate:cards` | **PASS (1 warnings)** —— 1 warning = AUD-120 已立案缺陷复现（附编号、不阻断） |
| `npm run validate:dsl` | PASS (0 warnings) —— 既有门禁未受影响 |
| `npx tsc --noEmit` | **`TSC_EXIT=0`** —— 零类型错误 |

**门禁即时价值**：首跑即抓出作者自写的 `flow.starter` 4 处错误（并行网关缺分支出口 + 3 节点孤立），修正后通过 ⇒ 证明门禁能拦住「照抄即失败」的卡。

**S1 前的待办（本轮已识别）**：

1. **下发分级** —— `syntax_rules` 长度 affinity 263→1076 / flow 734→3955。真源必须全量，但 MCP 下发应改用**表格版**（省长 notes），长 notes 只进 `protocol://segments/*` 与 `protocol://prompts/*`，按需 `ReadResource` 获取 —— 与 D2「收敛、按需」一致。
2. **新增两个 MCP 资源**（按 D2）—— `protocol://intents`（数据已生成于 `build/cards/intents.md`）与 `protocol://prompts/<kind>`（已生成于 `build/cards/prompts/`）；需接入 `mcp-server/index.js` 的 `ListResources` / `ReadResource`。
3. **切换产物落点** —— S1/S2 起把生成物写入生产路径，并把 `build → git diff --exit-code` 纳入 CI。

**未做（本轮范围外，按 D4 留待 S1–S5）**：其余 12 core kind 与 2 relief family 的迁移；`protocol://intents` / `protocol://prompts` 的 MCP 接入；帮助弹窗 JSX 的替换（14×2 段）。

---

## 8. 全量迁移（✅ 已完成）

> 详见 `docs/flow/notes/FLOW_ROUTING_WORKLOG.md` **W14**。

| 项 | 结果 |
|:--|:--|
| 卡片总数 | **52** = 14 `iqs_native` + 19 `mermaid` + 19 `vchart` |
| 目录结构 | 按 `family` 分层（**必需**：`radar`/`scatter`/`pie` 跨 family 重名，`heatmap` 同族双占 —— AUD-131 根因）；文件名 = `mcpName` 去 `render_` 前缀 |
| 公共条款 | 新增 `dsl/cards/_shared.ts` —— 输出红线 / CORE 与 RELIEF 附加红线 / 公共反例，由生成器**注入**而非各卡抄写 |
| 脚手架 | 新增 `scripts/scaffold_cards.ts` —— 从 `mcp_tools.json` 与 `constants.tsx` 自动抽取并结构化（Markdown→`syntax`/`soul`，支持 5 种写法） |
| 快照 | 新增 `dsl/cards/_snapshots.json`（28 条）—— 回归防护，与人工 `expect` 互补 |
| 自动修正 | 非 Tree body 的示例中 **30 行 `#` 注释**一键归一为 `//`（AUD-125） |
| 产物 | `build/cards/<family>/{segments,manual,cardDocs,prompts}/…` 共 **259** 个文件 + `intents.md` + `DIFF_REPORT.md` |

**验收**：`npm run build:cards` ✓ ｜ `npm run validate:cards` → **PASS (51 warnings / 0 error)** ｜ `npm run validate:dsl` PASS ｜ `npx tsc --noEmit` → **`TSC_EXIT=0`**。

### 8.1 剩余人工审阅（51 warnings 的构成）

| 数量 | 内容 |
|:--|:--|
| 50 | 骨架卡尚未声明 `expect` 意图断言（快照已提供回归防护） |
| 1 | `[AUD-120]` 默认流分支扇出误连（引擎缺陷，非卡错） |

1. **12 个 core kind 的领域精修**：`syntax` 值域与 `required`、`counterexamples`、`promptNotes` 精修、`status` 标注（尤以 `arrow`/`pdpc`/`relation` 的边语法形态）。
2. **`starter` 与 `example` 的差异**（AUD-124 残余）：如 flow 15%、arrow 6% 重合 —— 需逐张判断「保留差异化」还是「统一为 example」。
3. **relief 40 张**：mermaid 的语法散落在方言描述中，建议按 family 增设汇总卡。

---

## 9. 精修 / 示例统一 / family 汇总卡（✅ 已完成）

> 详见 `docs/flow/notes/FLOW_ROUTING_WORKLOG.md` **W15**。

| 项 | 结果 |
|:--|:--|
| 卡片总数 | **54**（14 core + 19 mermaid + 19 vchart + **2 master**） |
| **① 领域精修** | 12 个 core kind 逐张补齐：值域 / `required` / `status` / `notes` / `counterexamples`（各 3–4 条）/ `expect` / `promptNotes` |
| **② 示例统一** | 移除**全部** `starter` 字段 ⇒ 每个 kind **只保留一份示例**；AUD-124 的 6%–100% 漂移归零 |
| **③ family 汇总卡** | 新增 `mermaid/master.card.ts`、`vchart/master.card.ts`（治理 + 公共外壳 + sub_type 索引），并驱动 `intents.md` 的 RELIEF 段（原为硬编码） |

### 9.1 骨架暴露的三类系统性问题（已逐张修正）

| 类型 | 实例 |
|:--|:--|
| **条目名错误** | arrow「节点: Event: …」；pdpc「分组」/「数据项」；relation「节点定义」/「关系定义」；fishbone「# [文字]」 |
| **核心语法整条缺失** | control 缺 `[series]` 块；radar 缺 `Axis`/`Series`；matrix 缺 `Axis`/`Matrix`/关系行/`Weight`；matrixPlot 缺 `Data:`/`Styles:` 块；histogram 缺 `Color[...]`/`Font[...]` |
| **示例拼接错误** | fishbone `Color[Root][Root]: <值>`；pareto `Font[Title/Base/Bar][Title|Base|Bar]: <值>`（slot 重复拼接） |

### 9.2 跨 kind 同名指令对照（已写进各卡 `notes`）

| 指令 | 语义 A | 语义 B |
|:--|:--|:--|
| `Grid:` | flow = 线型 `dashed`/`solid` | basic = 开关 `true`/`false` |
| `Layout:` | flow = `H`/`V` | affinity/pdpc/relation = 全称（`Horizontal`/`Directional`…） |
| `Item:` | affinity = `id, label, parentId` | pdpc = `id, label, [type]` |
| `#` | fishbone = **结构** | 其余 kind = 历史兼容注释 |
| 箭头 | flow = 全角 `→` + `#` | relation = 半角 `->` |
| `Type:` | control = SPC 图种 ｜ matrix = 矩阵几何 | affinity = 渲染模式 ｜ basic = bar/line/pie |

### 9.3 验收

| 命令 | 结果 |
|:--|:--|
| `npm run build:cards` | ✓ 54 份卡，产物按 family 分层 |
| `npm run validate:cards` | **PASS (41 warnings / 0 error)** —— warning 51 → 41 |
| `npm run validate:dsl` | PASS (0 warnings) |
| `npx tsc --noEmit` | **`TSC_EXIT=0`** |

**41 warnings 构成**：40 条 = relief 的 `expect` 缺失（relief 无独立 parser 探针，**属预期**）；1 条 = `[AUD-120]`（flow 引擎缺陷，非卡错）。

### 9.4 尚未做（需决策）

1. **切换产物落点** —— 生成物仍在 `build/cards/`；写入生产路径将覆盖 `mcp_tools.json`（55 条目中 54 条）、`constants.tsx`、14 个 Editor 的 JSX 弹窗、`protocol/segments/*.md`。
2. **MCP 资源接入** —— `protocol://intents` 与 `protocol://prompts/*` 尚未注册进 `mcp-server/index.js` 的 `ListResources` / `ReadResource`。

---

## 10. 落点切换 + CardDocModal（✅ 已完成）

> 详见 `docs/flow/notes/FLOW_ROUTING_WORKLOG.md` **W16**。决策：**全量一次切换** + **抽共享组件 `<CardDocModal>`**。

### 10.1 四个问题的答案（切换前 → 切换后）

| 问题 | 切换前 | 现在 |
|:--|:--|:--|
| ① 全量语法规范是否有独立文件 | ✅ 有 | ✅ `dsl/cards/` × 55 卡 + `_types.ts` + `_shared.ts` |
| ② 帮助弹窗是否取自全量语法规范 | ❌ **零引用**（JSX 硬编码） | ✅ `CardDocModal` ← `dsl/generated/cardDocs.ts` ← `dsl/cards/*.card.ts` |
| ③ 组件默认示例是否取自真源 | ❌ 仅 **3/14** 一致 | ✅ `constants.tsx` 的 **16** 个 `INITIAL_*_DSL` 全部来自真源 `example` |
| ④ 弹窗显示/排版/布局范式是否统一 | ❌ 宽度 2 种 · tab 4 种叫法 · 配色 2 种 · 排版混用 | ✅ **集中**在 `CardDocModal` 一处；14 个调用点写法完全一致 |

### 10.2 生产写入清单（`npm run build:cards`，含 `build/cards/_backup/` 备份）

| 生产文件 | 内容 |
|:--|:--|
| `mcp-server/mcp_tools.json` | **55** 条目（description / expertise / expert_logic / syntax_rules / official_example / intent_trigger / tier / render_engine / inference_key） |
| `protocol/segments/*.md` | **55** 个切片 |
| `constants.tsx` | **16** 个 `INITIAL_*_DSL` |
| `dsl/generated/cardDocs.ts` | **新建** 55 键 |

**注意**：relief 的 segment 文件名带 family 前缀（`vchart_radar.md` / `mermaid_pie.md`）—— 因为 `sub_type` 跨 family 重名，扁平目录会互相覆盖。

### 10.3 过程中修掉的 3 个真实缺陷

1. **`protocol/segments/` 扁平目录导致 relief 覆盖 core** —— 首次切换后 `radar.md`/`scatter.md` 内容是 vchart 的，`pie.md` 覆盖了 mermaid 的。修：relief 加 family 前缀 + 清理 34 个旧扁平文件。
2. **`render_iqs_native_master` 缺卡片** —— 三族中唯一没有 master 卡的。修：新增 `dsl/cards/iqs_native/master.card.ts`。
3. **Tailwind 动态类名静默失效** —— `CardDocModal` 初版用 `bg-${UI.accent}-600`。修：改静态类名。

另修 `MatrixEditor` / `MermaidEditor` 批量替换产生的双花括号语法错误。

### 10.4 验收

| 命令 | 结果 |
|:--|:--|
| `npm run build:cards` | ✓ 55 份卡 |
| `npm run validate:cards` | **PASS (43 warnings / 0 error)** |
| `npm run validate:dsl` | **PASS (0 warnings)** |
| `npm run test:flow` | **190 pass / 0 fail** |
| `npx tsc --noEmit` | **`TSC_EXIT=0`** |
| 四者对应 | segments 55 · cardDocs 55 · mcp 55 · 14 个 Editor 接入 ✓ |

### 10.5 仍未做

1. **MCP 资源接入** —— `protocol://intents` 与 `protocol://prompts/*` 的数据已生成，但尚未注册进 `mcp-server/index.js`。
2. **引擎侧缺陷** —— R20 的 AUD-119/120（flow 默认顺序流误连），属 `FlowParser` 修复。

---

## 11. MCP 资源接入：意图路由闭环（✅ 已完成）

> 详见 `docs/flow/notes/FLOW_ROUTING_WORKLOG.md` **W17**。

### 11.1 目标链路（现已可用）

```
tools/list ── 52 条瘦描述（每条含 read + prompt 两个 URI；工具数量与身份未变）
    │
    ├─ read protocol://intents           ← 意图路由：1 个资源完成选型
    ├─ read protocol://segments/<p>/<s>  ← 语法规范
    └─ read protocol://prompts/<kind>    ← 具体提示词（此前无任何载体）
    │
    └─ call render_<kind>(dsl)           ← 渲染（失败返回 parser_errors）
```

### 11.2 生产产物与代码改动

| 项 | 内容 |
|:--|:--|
| `protocol/intents.md` | 意图路由目录（CORE 15 行 + RELIEF 2 族 + sub_type 索引 + 全局反红线） |
| `protocol/prompts/<slug>.md` × **55** | 每 kind 的具体生成提示词 |
| `mcp-server/index.js` | `ListResources` 注册 `protocol://intents`；`ReadResource` 新增 `intents` 与 `prompts/<kind>` 两分支；`segments` 索引补 prompt 列；`buildThinDescription` 补 `prompt:` 指引 |
| `protocol/DSL_V1.md` | 新增「生成前的标准流程」四步，并注明三入口**数据同源** |

### 11.3 端到端验收（实起 MCP server）

| 检查 | 结果 |
|:--|:--|
| `listResources()` | 56（4 协议资源 + 52 kind 资源） |
| `readResource('protocol://intents')` | ✓ 6865 字符 · CORE 路由表 15 行 · 含反红线 |
| `readResource('protocol://prompts/{flow,affinity,matrix_plot,mermaid,vchart}')` | ✓ 1953–6243 字符 |
| `listTools()` | **52**（55 − 3 master）—— 工具面未变 |
| thin description / segments 索引 / flow 特判 | ✓ 均含 prompt 指引 |
| 既有 flow 语法资源 | ✓ 未破坏（10459 字符） |

**`=== PASS (0 项失败) ===`** ｜ `validate:dsl` PASS ｜ `validate:cards` PASS ｜ `node --check index.js` OK ｜ `tsc` `TSC_EXIT=0`

### 11.4 仍未做

- **引擎侧缺陷** —— R20 的 AUD-119/120（flow 默认顺序流把并列分支目标串成串行边），属 `FlowParser` 修复。

---

