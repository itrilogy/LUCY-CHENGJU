---
doc_id: IQS-DOC-STANDARD
title: 项目文档归档规范（命名 · 元数据 · 目录 · 迁移）
project: 澄矩 · ChengJu (IQS)
version: v1.0
domain: PROTOCOL
type: 标准
authority: L4
freshness: 🟢现行
first_commit: 2026-09-12
last_commit: 2026-09-12
supersedes: []
superseded_by: []
related:
  - docs/PROJECT_INDEX.md
  - docs/flow/README.md
  - protocol/governance.md
---

# 项目文档归档规范（Archive Standard）

> **用途**：定义全项目文档的**命名、元数据、目录与迁移**规则，使文档可被机器索引、可被人工追溯。
> **上位**：本规范扩展自 FLOW 组件已建立的标签体系（`docs/flow/README.md` §0），并与之完全兼容。
> **执行**：新文档必须遵守；既有文档按 §5 迁移路线分批对齐。

---

## 1. 命名范式

```
[IQS_]<领域>_<类型>[_<限定>].md
```

- **`IQS_` 前缀**：项目文档统一前缀。**根级索引**（`README.md`、`CHANGELOG.md`、`COPYRIGHT.md`、`NOTICE.md`）不适用。
- **领域（Domain）**：见 §2，全大写下划线分隔。
- **类型（Type）**：见 §3，全大写，单词间用下划线。
- **限定（Qualifier）**：可选的补充词（如 `VCHART`、`MATRIX`、`TOKEN_OPTIMIZATION`），全大写。
- 分隔符统一 **下划线 `_`**；**禁止** kebab-case、驼峰、空格、中文文件名。
- 文件名**全 ASCII**（中文只出现在标题与正文）。

### 示例

| ✅ 合规 | ❌ 不合规（原命名） | 问题 |
|:--|:--|:--|
| `IQS_DSL_SPEC.md` | `DSL_SYNTAX_MANUAL.md` | 缺项目前缀、类型词不统一 |
| `IQS_COMP_MANUAL_VCHART.md` | `vchart_user_manual.md` | 驼峰/小写混用 |
| `IQS_COMP_MANUAL_CONTROL.md` | `USER_MANUAL_CONTROL.md` | 缺项目前缀、`USER_` 冗余 |
| `IQS_MCP_PLAN_ILDR4.md` | `ILDR_4_0_Implementation_Plan.md` | 驼峰、无域 |
| `IQS_REQ_SPEC_PRODUCT.md` | `需求说明.md` | 中文文件名 |

### 特例（不适用命名范式）

| 文件 | 理由 |
|:--|:--|
| `README.md` · `CHANGELOG.md` · `COPYRIGHT.md` · `NOTICE.md` | 仓库根约定文件 |
| `docs/PROJECT_INDEX.md` | 项目级索引（MOC），置于 `docs/` 根作为唯一入口 |
| `docs/flow/README.md` | 子索引，邻接其所索引的目录树 |
| `protocol/*.md` · `dsl/cards/*` · `protocol/{segments,prompts}/*` | **协议资产与产物**，路径被代码硬引用，**禁止改名**（见 §6） |
| `docs/软著与发行/**` | 申报机构有既定命名要求，保持原样 |

---

## 2. 领域取值（Domain）

| 值 | 含义 | 典型内容 |
|:--|:--|:--|
| `DSL` | 语言与语法 | 语法手册、架构规范、真源卡片说明 |
| `COMP` | 绘图组件 | 各 kind 的用户手册、组件设计 |
| `LAYOUT` | 布局 | FLOW 落格、格内序、走廊腾挪 |
| `ROUTING` | 布线 | 正交走线、端口分配、数学建模 |
| `EXCHANGE` | 交换 | BPMN 映射、跨格式转换 |
| `RENDER` | 渲染 | SVG / Canvas / VChart / Mermaid 渲染与调试 |
| `MCP` | 协议与工具链 | MCP 设计、配置、Token 策略、ILDR |
| `QA` | 质量与审计 | 审计报告、测试用例、压测 |
| `RELEASE` | 发行 | 版本、部署、发行检查（正式材料见 `docs/软著与发行/`） |
| `FLOW` | FLOW 组件专项 | 归入 `docs/flow/`，命名 `FLOW_<领域>_<类型>.md` |
| `PROTOCOL` | 协议治理 | 治理规则、归档标准、索引 |

---

## 3. 类型取值（Type）

| 值 | 含义 | 时效倾向 |
|:--|:--|:--|
| `SPEC` | 规范 / 规格 | 长期有效 |
| `STANDARD` | 标准 / 规范约定 | 长期有效 |
| `REQ` | 需求 | 早期基线，易过时 |
| `DESIGN` | 设计 | 随实现演进 |
| `MATH` | 数学 / 理论 | 长期有效 |
| `MANUAL` | 用户手册 | 随功能演进 |
| `GUIDE` | 操作指南 | 随环境演进 |
| `PLAN` | 计划 | **一次性**，完成后转为历史 |
| `CASES` | 测试用例 | 随功能演进 |
| `AUDIT` | 审计报告 | **快照**，标注生成日期 |
| `REVIEW` | 评审记录 | 快照 |
| `NOTES` | 过程记录 / 笔记 | 快照 |
| `WORKLOG` | 逐轮工作记录 | **追加型**，不覆盖 |
| `MANIFESTO` | 宣言 / 方法论声明 | 长期有效 |
| `INDEX` | 索引（MOC） | 持续维护 |
| `LEGACY` | 已被取代的旧文档 | **只读存档** |

---

## 4. 元数据标签（YAML Front-matter）

新文档与迁移文档**必须**在首行加入以下块（字段顺序固定）：

```yaml
---
doc_id: IQS-DSL-SPEC            # 全局唯一；= 文件名去扩展名、`_`→`-` 大写
title: IQS-DSL v1 架构规范       # 人类可读标题
project: 澄矩 · ChengJu (IQS)    # 固定值
version: v0.7.1                 # 文档自身版本（非软件版本）
domain: DSL                     # §2 取值
type: SPEC                      # §3 取值
authority: L0                   # L0 语言规范 | L1 运行时解析 | L2 MCP 资源 | L3 协议切片 | L4 说明文档
freshness: 🟢现行                # 🟢现行 | 🟡部分过时 | 🔴过时 | 🔵历史快照 | ⚪未审计
first_commit: 2026-08-30        # 首次提交日期（来自 git，作为追溯证据）
last_commit: 2026-09-02         # 末次提交日期
supersedes: []                  # 本文件取代了谁（doc_id 列表）
superseded_by: []               # 本文件被谁取代
related: []                     # 强关联文档（相对路径）
---
```

### 字段约定

- **`authority` / `freshness`** 取值与 `protocol/governance.md` §3、`docs/flow/README.md` §0 完全一致，不另立体系。
- **`first_commit` / `last_commit`** 是**追溯证据**，不得臆造；取自 `git log --reverse --format=%ad --date=short -- <file>`。
- **`superseded_by` 非空**即表示该文档为历史存档，正文首行应加醒目横幅。
- 正文中**可**继续使用表格形式的人类可读元数据（与 FLOW 文档一致），但 YAML 块是**机器可读的唯一权威**。

---

## 5. 目录结构与迁移路线

### 5.1 目标结构

```
docs/
  PROJECT_INDEX.md              ← 项目级索引（唯一入口）
  ARCHIVE_STANDARD.md           ← 本规范
  IQS_DSL_*.md                  ← 语言与语法（SPEC / MANUAL / *_DESIGN）
  IQS_COMP_MANUAL_*.md          ← 组件手册（14 kind + Mermaid + VChart）
  IQS_COMP_DESIGN_*.md          ← 组件设计
  IQS_MCP_*.md                  ← MCP 设计与策略
  IQS_RENDER_*.md               ← 渲染调试
  IQS_QA_*.md                   ← 审计 / 用例
  IQS_REQ_*.md                  ← 需求
  IQS_GUIDE_*.md                ← 操作指南
  archive/                      ← 已取代或已完成的一次性文档
  flow/                         ← FLOW 专项（已整理，38 份）
  assets/                       ← 品牌资产
  软著与发行/                    ← 申报材料（保持既定命名）
```

### 5.2 迁移记录（**已于 2026-09-12 执行**）

| 原路径 | 新路径 | 领域 | 类型 | 状态 |
|:--|:--|:--|:--|:--|
| `docs/IQS_DSL_V1_SPEC.md` | — | DSL | SPEC | ✅ 原本合规（24 处引用，**受保护**） |
| `docs/IQS_DSL_V1_MANUAL.md` | — | DSL | MANUAL | ✅ 原本合规（32 处引用，**受保护**） |
| `docs/IQS_DSL_CARD_SSOT_DESIGN.md` | — | DSL | DESIGN | ✅ 原本合规 |
| `docs/IQS_CHART_MCP_DESIGN.md` | — | MCP | DESIGN | ✅ 原本合规 |
| `docs/IQS_DSL_AGENT_MANIFESTO.md` | — | DSL | MANIFESTO | ✅ 原本合规 |
| `docs/PROJECT_INDEX.md` · `docs/ARCHIVE_STANDARD.md` | — | PROTOCOL | INDEX / STANDARD | ✅ 特例（置 `docs/` 根） |
| `docs/DSL_SYNTAX_MANUAL.md` | `docs/archive/IQS_DSL_MANUAL_LEGACY.md` | DSL | LEGACY | ✅ 已迁移（🔴 已被 v1 取代） |
| `docs/DESIGN_AFFINITY.md` | `docs/IQS_COMP_DESIGN_AFFINITY.md` | COMP | DESIGN | ✅ 已迁移 |
| `docs/DESIGN_MATRIX.md` | `docs/IQS_COMP_DESIGN_MATRIX.md` | COMP | DESIGN | ✅ 已迁移 |
| `docs/USER_MANUAL_<KIND>.md` × 14 | `docs/IQS_COMP_MANUAL_<KIND>.md` | COMP | MANUAL | ✅ 已迁移 |
| `docs/vchart_user_manual.md` | `docs/IQS_COMP_MANUAL_VCHART.md` | COMP | MANUAL | ✅ 已迁移 |
| `docs/MCP_CONFIG_GUIDE.md` | `docs/IQS_MCP_GUIDE_CONFIG.md` | MCP | GUIDE | ✅ 已迁移 |
| `docs/MCP_TOKEN_OPTIMIZATION_PLAN.md` | `docs/IQS_MCP_PLAN_TOKEN_OPTIMIZATION.md` | MCP | PLAN | ✅ 已迁移 |
| `docs/ILDR_4_0_Implementation_Plan.md` | `docs/IQS_MCP_PLAN_ILDR4.md` | MCP | PLAN | ✅ 已迁移 |
| `docs/VChart_Debug_Plan.md` | `docs/IQS_RENDER_PLAN_VCHART_DEBUG.md` | RENDER | PLAN | ✅ 已迁移 |
| `docs/TROUBLESHOOTING.md` | `docs/IQS_GUIDE_TROUBLESHOOTING.md` | MCP | GUIDE | ✅ 已迁移 |
| `docs/matrix_test_cases.md` | `docs/IQS_QA_CASES_MATRIX.md` | QA | CASES | ✅ 已迁移 |
| `docs/obsidian-mermaid-tutorial.md` | `docs/archive/IQS_GUIDE_OBSIDIAN_MERMAID.md` | COMP | GUIDE | ✅ 已迁移（🔵 外围资料） |
| `docs/控制图笔记.md` | `docs/IQS_QA_NOTES_CONTROL_CHART.md` | QA | NOTES | ✅ 已迁移（中文名 → ASCII） |
| `docs/需求说明.md` | `docs/IQS_REQ_SPEC_PRODUCT.md` | PROTOCOL | REQ | ✅ 已迁移（中文名 → ASCII） |
| `implementation_plan.md`（根） | `docs/archive/IQS_COMP_PLAN_Y_MATRIX.md` | COMP | PLAN | ✅ 已迁移（🔵 已完成计划） |
| `conventional_prompts_audit.md`（根） | `docs/IQS_QA_AUDIT_PROMPTS_CORE.md` | QA | AUDIT | ✅ 已迁移（🔵 快照） |
| `logic_prompts_report.md`（根） | `docs/IQS_QA_AUDIT_PROMPTS_ALL.md` | QA | AUDIT | ✅ 已迁移（🔵 快照） |
| `IQS_DSL_AGENT_MANIFESTO.md`（根） | `docs/archive/IQS_DSL_MANIFESTO_ROOT_DUPLICATE.md` | DSL | MANIFESTO | ✅ 已去重（权威版为 `docs/IQS_DSL_AGENT_MANIFESTO.md`） |
| `docs/flow/**` | — | FLOW | 各类型 | ✅ 已整理（2026-09-12） |
| `docs/软著与发行/**` | — | RELEASE | 各类型 | ✅ 特例（申报机构命名要求） |

> **合计**：迁移 31 个文件（含去重 1 个）· 同步更新引用 8 个文件 · 注入 front-matter 30 个文件。
> **正文中的历史文件名**（如 `docs/IQS_DSL_V1_SPEC.md` 提到「旧 `DSL_SYNTAX_MANUAL`」）**保留不改** —— 那是追溯证据。

### 5.3 批量迁移的可复现方法

迁移由一次性脚本完成（`git mv` + 全库引用替换 + front-matter 注入）：

1. 采集每个文件的 `first_commit` / `last_commit`（`git log --reverse/--format=%ad --date=short -- <file>`）；
2. `git mv`（未跟踪文件回退为 `mv`）；
3. 全库替换引用：同时匹配**相对路径**与**裸文件名**两种形式，跳过 `node_modules` / `build` / `.git` / `package-lock.json`；
4. 注入 YAML front-matter；已有 front-matter 的仅补齐缺失字段；
5. 验证：`grep` 残留旧名 + `tsc` + `test:flow` + `validate:*`。

---

## 6. 受保护路径（禁止改名）

以下路径被**代码或配置硬引用**，改名会破坏构建与运行：

| 路径 | 引用方 |
|:--|:--|
| `docs/IQS_DSL_V1_SPEC.md` | `dsl/kinds.json`（`spec` 字段）、`scripts/validate_dsl.mjs`、`mcp-server/index.js`、`dsl/types.ts` |
| `docs/IQS_DSL_V1_MANUAL.md` | `dsl/kinds.json`（`manual` 字段）、`scripts/validate_dsl.mjs`、`public/mcp_tools.json` |
| `protocol/DSL_V1.md` · `protocol/governance.md` | `mcp-server/index.js` |
| `protocol/segments/*.md` · `protocol/prompts/*.md` · `protocol/intents.md` | `mcp-server/index.js` |
| `dsl/cards/**` | `scripts/{scaffold,build,validate}_cards.ts` |
| `docs/flow/spec/IQS_FLOW_DSL_SPEC.md` | 契约文档，被多份 FLOW 文档与 `protocol/segments/flow.md` 引用 |

> 若要调整这些路径，须**同步修改引用方**并在 `CHANGELOG` 记录。

---

## 7. 维护规则

1. **新增文档**：必须遵守 §1 命名 + §4 元数据；在 `docs/PROJECT_INDEX.md` §3 登记。
2. **状态变更**：只改 `freshness` / `superseded_by`，**不删除**历史正文。
3. **索引联动**：`docs/PROJECT_INDEX.md`（项目级）与 `docs/flow/README.md`（FLOW 级）双向引用。
4. **生成物不手工编辑**：`mcp-server/mcp_tools.json`、`dsl/generated/cardDocs.ts`、`protocol/{segments,prompts}/*`、`protocol/intents.md` 均由 `npm run build:cards` 生成。
5. **时间证据不可臆造**：`first_commit` / `last_commit` 必须来自 `git log`。

---

*本规范由文档整理任务建立（2026-09-12） · 与 `docs/flow/README.md` §0 标签体系同源*
