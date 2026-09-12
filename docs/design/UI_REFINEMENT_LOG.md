---
doc_id: IQS-UI-REFINEMENT-LOG
title: 澄矩 · ChengJu 视觉与交互精修记录（逐组件增量范式）
type: WORKLOG
domain: UI
status: active
version: 1.0
created: 2026-09-12
owner: 鹿溪联合创新实验室 · 工坊·一法（澄矩 ChengJu / IQS）
basis: LUXI Design System v1.0（LUCY-DESIGN）
related:
  - docs/PROJECT_INDEX.md
  - docs/ARCHIVE_STANDARD.md
  - docs/IQS_DSL_CARD_SSOT_DESIGN.md
---

# 视觉与交互精修记录

> **本册用途**：记录**逐组件**的视觉统一与交互优化，形成**可累积的增量范式**。
> 与 `docs/flow/notes/FLOW_ROUTING_WORKLOG.md`（FLOW 编辑器布线与路由专项）区分：那份管**算法内核**，本册管**UI 表现层**。

## 0. 本文档的使用约定

| 约定 | 说明 |
|:---|:---|
| **粒度** | 一节 = 一个组件（或一组同类组件） |
| **结构** | 「问题清单 → 判定依据（范式条款）→ 改动 → 范式增量」四段式 |
| **范式增量** | 每个组件精修后，若产生**可复用的新规则**，回填到 §A 汇总表，供后续组件直接套用 |
| **不可覆写** | `LUXI Design System v1.0` 的 core 四色与硬约束不得因单组件需要而改动 |

## A. 范式增量汇总（跨组件复用）

> 每次精修若提炼出**通用规则**，登记在此。后续组件优先套用，避免重复决策。

| 编号 | 规则 | 来源组件 | 落地方式 |
|:---|:---|:---|:---|
| **R-UI-01** | 输入控件一律用语义类：`.iqs-input`（输入框）· `.iqs-input-shell`（外壳）· `.iqs-code`（不换行代码区） | 全局 | `index.html` `<style>` |
| **R-UI-02** | DSL 代码区固定 `h-[400px] resize-y`；AI 自由文本框 `min-h-[160px] resize-y`（**必须换行**，禁 `whitespace-pre`） | 全局 | className 约定 |
| **R-UI-03** | 激活态（tab / 分段选择器 / 开关 / 滑杆）一律 `primary`；强调色不得替代品牌职能 | 全局 | `@theme` 色族覆写 |
| **R-UI-04** | 复选框 / 单选框 / 滑杆用 `accent-color: var(--luxi-green)` **一处定义**，不逐处写类名 | 全局 | `index.html` |
| **R-UI-05** | 状态徽章用 `.iqs-badge`；主按钮 `.iqs-btn-primary`；生成中 `.iqs-btn-pending` | 全局 | `index.html` |
| **R-UI-06** | 字号下限 **11px**（范式 `micro`），禁用 `text-[8px]`/`[9px]`/`[10px]` | 全局 | 静态检查规则 |
| **R-UI-07** | 组件内**禁止裸 hex**，一律走令牌变量 | 全局 | — |
| **R-UI-08** | 破坏性操作用**自有确认组件**，禁用 `window.confirm()` | **鱼骨图** | 见 §1 |
| **R-UI-09** | 行内操作按钮**不得**仅靠 `group-hover` 显示——必须键盘可达（`focus-visible` 同样显示） | **鱼骨图** | 见 §1 |
| **R-UI-10** | 异步操作**失败必须界面可见**，禁只 `console.error` | **鱼骨图** | 见 §1 |
| **R-UI-11** | 层级型数据（因果树 / 分解结构）用**结构化卡片编辑**，不让用户手写语法糖；语法糖只出现在 DSL tab | **鱼骨图** | 见 §1 |
| **R-UI-16** | **控件高度分档 + 同行等高**：同一行内的输入框与按钮必须等高；档位见 §A.1 | 全局 | 见 §A.1 |
| **R-UI-17** | **文字色必须达标（对比度 ≥4.5:1）**：语义装饰色（`--state-up` / `--alert-red` / `--info-blue` / `--luxi-gold`）**不得直接作文字色**；文字一律用 `--text-ok/-danger/-info/-warn`，且**随主题切换** | 全局 | 见 §A.2 |

### A.1 控件高度分档（R-UI-16）

| 档位 | 高度 | Tailwind | 适用控件 |
|:---|:---|:---|:---|
| `xs` | 28px | `h-7` | 色票 / 紧凑图标按钮 |
| `sm` | 32px | `h-8` | Tab / 分段选择器 |
| `md` | 36px | `h-9` | **列表内联输入** / 次级输入框 / 同级图标按钮 |
| `lg` | 44px | `h-11` | **主输入框** / 主按钮 / 行主控件 |
| `xl` | 48px | `h-12` | 强调按钮（页级主行动） |

**铁律**：**同一行内控件必须等高**。图标按钮宽度 = 同行输入框高度（`aspect-square`）。

> 反例（改造前）：主骨行 `h-11`(44) 输入框却配 `w-9 h-9`(36) 按钮 —— 同行不等高，视觉错位。

#### A.1.1 基准实现：鱼骨图（**控件高宽范式**）

> **鱼骨图的手动录入区是控件规格的基准样板**；其余组件的同类控件向它对齐。

| 控件 | 档位 | 尺寸 | 备注 |
|:---|:---|:---|:---|
| 页级输入框（鱼头 / 项目标题） | `lg` | `h-11` 44px | 独占一行 |
| 一级行输入框（主骨） | `lg` | `h-11` 44px | 带拖拽手柄 + 色点 |
| 二级行输入框（子因） | `md` | `h-9` 36px | 缩进 22px，字号 11px |
| 三级及以下行（孙因…） | `sm` | `h-8` 32px | 每级再缩进 22px |
| 行内图标按钮（+ / 🗑） | 随行 | `h-{同行} aspect-square` | **必须与同行输入框等高** |
| 头部图标块 | — | `w-10 h-10` | `bg-primary/20` + `border-primary/30` |
| 卡片 | — | `rounded-md` + `p-6` | 描边 `--border-line-r` |
| 行内间距 | — | `gap-2`；层间 `space-y-1.5` | 主骨卡间 `space-y-3` |
| 底部主行动 | `lg` | 全宽 `iqs-btn-primary` | — |

**尺寸随层级递减**（`depth` → 档位）：

```
depth 0  主骨  → lg  h-11 (44px)  图标 16
depth 1  子因  → md  h-9  (36px)  图标 14
depth ≥2 孙因  → sm  h-8  (32px)  图标 12
```

> 实现见 `components/FishboneEditor.tsx` 的 `TIER` / `ICON` / `tierOf()` / `iconOf()`。

#### A.1.2 层级深度不受限（R-UI-18）

层级型编辑器**必须支持任意深度**（DSL 的 `#` / `##` / `###` / `####` 一一对应），
每一层都须提供**「新增下一级」入口**，不得只渲染两级。

> 反例：鱼骨图首版 `HierarchyTree` 只渲染「主骨 → 子因」两级，`###` 以下在手动录入区无入口。

### A.2 文字色 vs 装饰色（R-UI-17）

**实测对比度**（浅色底 `#F5F7FA` / 深色底 `#121A17`）：

| 令牌 | 浅底 | 深底 | 可否作文字 |
|:---|---:|:---:|:---|
| `--text-main` | 14.75 | 15.09 | ✓ |
| `--text-secondary` | 7.55 | — | ✓ |
| `--text-muted` | 5.08 | 6.88 | ✓ |
| `--luxi-green` | 7.26 | 2.27 | 浅底 ✓ / 深底 ✗ |
| `--state-up` | **2.12** | 7.77 | **浅底 ✗** |
| `--alert-red` | **3.56** | — | **浅底 ✗** |
| `--state-down` | **3.51** | — | **浅底 ✗** |
| `--info-blue` | **2.94** | — | **浅底 ✗** |
| `--luxi-cyan` | **1.68** | 9.83 | **浅底 ✗** |
| `--luxi-gold` | **1.55** | 10.66 | **浅底 ✗** |
| `--state-flat` | **2.39** | — | **✗** |

**结论**：core 四色与状态色是**装饰色**（背景 / 边框 / 图标 / 图形），**不能直接当文字**。文字须走专用色：

| 语义 | 浅底文字色 | 深底文字色 | 实测（浅/深） |
|:---|:---|:---|:---|
| 成功 ok | `--text-ok` `#15803D` | `#4ADE88` | 4.67 / 10.20 |
| 危险 danger | `--text-danger` `#A92C20` | `#F09185` | 6.38 / 7.67 |
| 信息 info | `--text-info` `#1D6FA5` | `#8AEBFF` | 5.06 / 12.99 |
| 警示 warn | `--text-warn` `#8A6A05` | `#FAD749` | 4.72 / 12.55 |
| 中性 muted | `--text-muted` `#5A6B80` | `#8FA3BF` | 5.08 / 6.88 |

> ⚠️ **单一色值无法同时满足浅底与深底** —— 对比度是相对量。因此文字专用色**必须定义在 `:root` 与 `.dark` 两处**，随主题切换。

---

## 1. 鱼骨图 · Fishbone（IQS Fishbone Engine）

**精修日期**：2026-09-12
**组件**：`components/FishboneEditor.tsx` · `components/FishboneDiagram.tsx`
**范式基准**：`types` 的 `FishboneNode` / `FishboneChartStyles`（结构不变）

### 1.1 问题清单

#### （a）前一阶段批量统一的直接错误

| 位置 | 问题 | 性质 |
|:---|:---|:---|
| AI tab 文本框 | 被错误套用 `iqs-code h-[400px]` —— 它是**自由文本输入**，却按**代码区**渲染（400px 高 + 不换行） | **误伤**，违反 R-UI-02 |

#### （b）视觉残留（前一轮只改了 tab，未触内部）

| 位置 | 现状 | 应然 |
|:---|:---|:---|
| 头部图标 | `bg-blue-600/20 border-blue-500/30 text-blue-400` | `primary` 系（R-UI-03） |
| 重置 / 帮助按钮 | `hover:text-blue-400` | `hover:text-primary` |
| 分组标题图标 | `ChevronRight text-blue-500` | `text-primary` |
| 行输入框 | `group-hover:border-blue-500/30` `focus-within:border-blue-500/60` | `primary` 系 |
| 添加行按钮 | `hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5` | `primary` 系 |
| 加载图标 | `Loader2 text-blue-400` | 继承按钮色 |
| 引擎副标题 | `text-[8px]` | ≥ `11px`（R-UI-06） |
| 卡片 | `shadow-2xl` | `--shadow-md-p` |
| 主行动按钮 | `h-16`（64px） | `.iqs-btn-primary`（`lg`=44px 语义） |
| 提示正文 | `text-xs` | `text-[11px]` 或 `small` |

#### （c）交互缺陷（违反范式 §7.1 五条铁律）

| 位置 | 问题 | 违反条款 |
|:---|:---|:---|
| `handleReset` | `confirm()` 原生对话框 | 「破坏可退」+ 自有组件要求（R-UI-08） |
| 空状态 | 仅一行文字，**无下一步动作** | 「三态齐全 · 空状态给下一步」 |
| 删除按钮 | `opacity-0 group-hover:opacity-100` | 「键盘优先 · 主流程全键盘可达」（R-UI-09） |
| `generateAI` | 失败仅 `console.error` | 「乐观且诚实 · 失败必须明确告知」（R-UI-10） |
| 手动录入 | 要求用户**手写 `# 主骨` / `## 子因`** | 「克制 · 界面密度服务于任务」—— 让用户承担语法负担（R-UI-11） |
| 根容器 | `h-[calc(100vh-80px)]` 硬编码 | 骨架应走令牌 |

### 1.2 判定依据

- **R-UI-03 / 08 / 09 / 10 / 11**（本册新增），以及范式 `DESIGN.md` §3.4（accent 不得替换 primary）、§4.2（字号阶梯）、§5（阴影五档）、§6.2（按钮层级）、§7.1（五条铁律）。

### 1.3 改动

- **录入交互重构**：`手动录入` 由「手写 `#` 语法」改为**层级树编辑**——
  - 主骨卡片（可改名 / 删除 / 拖拽排序）
  - 子因行（可改名 / 删除 / 拖拽排序）
  - 「+ 主骨」/「+ 子因」按钮，**用户无需知道 `#` 语法**
  - `#` 语法仅保留在 **DSL 编辑器** tab
- **视觉归位**：蓝色残留 → `primary`；字号 → ≥11px；`shadow-2xl` → `--shadow-md-p`；按钮 → `.iqs-btn-primary`
- **交互补齐**：`confirm()` → 自有确认条；删除按钮 `focus-visible` 可见；AI 失败界面提示；空状态给「+ 主骨」动作
- **AI 文本框**：`iqs-code h-[400px]` → `iqs-input min-h-[160px] resize-y`

### 1.4 范式增量

新增 **R-UI-08**（自有确认）· **R-UI-09**（行内操作可聚焦）· **R-UI-10**（异步失败可见）· **R-UI-11**（层级数据用结构化编辑）。
均已在 §A 登记，后续组件（矩阵图 / PDPC / 亲和图等含层级或异步的组件）直接套用。

---

## 1.5 【范式】DSL 编辑器 与 AI 推理卡

> 本节是**跨组件的形态契约**：16 个 Editor 的 `DSL 编辑器` / `AI 推理` 两个 tab 一律照此实现。
> 鱼骨图为首个达标组件，其余组件按此逐一对齐。

### DSL 编辑器 tab

| 项 | 规范 | 落地 |
|:---|:---|:---|
| 容器 | `h-full flex flex-col space-y-4`（**必须 flex-col，textarea 才能填满**） | className |
| 输入框 | `iqs-input iqs-code flex-1 min-h-[400px] resize-y` | className |
| 高度行为 | **填满可用高度**（非固定 400px）；窗口矮时保底 400px 并出现内部滚动 | `.iqs-code` |
| 换行 | **不换行**（`white-space: pre`），横向可滚 | `.iqs-code` |
| 字号/字体 | `13px` 等宽（`--fs-small` + `--font-mono`） | `.iqs-input` + `.iqs-code` |
| 语法提示 | 底部一句话（`#`=主骨 / `##`=子因），**不要求用户记语法** | 组件内 `<p class="iqs-hint">` |

### AI 推理 tab

| 项 | 规范 | 落地 |
|:---|:---|:---|
| 容器 | `h-full flex flex-col`（**铺满**，与 DSL tab 一致） | className |
| 卡片 | `p-6 bg-card rounded-md border border-line flex flex-col gap-4 flex-1 min-h-0 overflow-hidden`（**禁 `shadow-2xl`**） | className |
| 卡头 | 左：标题（11px / black / 0.2em 字距）；右：引擎状态徽章；`shrink-0` | — |
| **引擎徽章** | `.iqs-badge`（`state-up` 绿 + 圆点 + 脉冲） | `iqs-badge` |
| **描述输入框** | `iqs-input flex-1 min-h-[200px] resize-none` —— **铺满卡片剩余空间**，且**必须换行** | className |
| **主按钮** | `.iqs-btn-primary`（鹿溪绿实底）；生成中 `.iqs-btn-pending`；均 `shrink-0` | `index.html` |
| **禁用可解释** | 空输入时按钮**禁用 + 下方 `.iqs-hint` 说明原因**（禁止无解释的灰按钮） | `.iqs-hint` |
| **失败可见** | 出错渲染 `alert-red/10` 提示条 + **可操作建议**（禁只 `console.error`） | 组件 state |
| 提示卡 | `.iqs-note`（中性底 + 边框），标题用 `--info-blue` | `iqs-note` |
| 字号下限 | **11px**；正文 11–13px | — |

### 生成后行为

| 项 | 规范 |
|:---|:---|
| 结果落地 | AI 返回 DSL → **写回数据 + 同步 DSL 文本** → 切到 `DSL 编辑器` tab 供用户核对 |
| 状态复位 | `finally` 中复位 `isGenerating`；`aiError` 在下一次请求前清空 |

### 范式增量（本节新增）

| 编号 | 规则 |
|:---|:---|
| **R-UI-12** | **DSL 编辑器与 AI 推理的输入框一律填满可用空间**：DSL 用 `flex-1 min-h-[400px] resize-y`，AI 用 `flex-1 min-h-[200px] resize-none`；禁止固定 `h-[400px]` / 过矮的 `min-h-[160px]` |
| **R-UI-13** | 引擎/状态徽章统一 `.iqs-badge`；AI 主按钮统一 `.iqs-btn-primary` / `.iqs-btn-pending` |
| **R-UI-14** | **禁用态必须可解释**：控件 disabled 时须以 `.iqs-hint` 说明原因 |
| **R-UI-15** | AI 结果回填后切至 DSL tab 核对；失败提示须含可操作建议 |

---

## 2. 矩阵图 · Matrix（IQS Matrix Engine）

**精修日期**：2026-09-12
**组件**：`components/MatrixEditor.tsx`（935 行）· `components/MatrixDiagram.tsx`
**参考**：本册 §1（鱼骨图）确立的形态；本次为**首次纯套用**（验证范式可复用性）

### 2.1 问题清单

| 类别 | 位置 | 问题 | 对应规则 |
|:---|:---|:---|:---|
| **误伤** | AI tab 输入框 | 被套用 `iqs-code flex-1 min-h-[400px]` —— 自由文本却按代码区渲染（不换行） | R-UI-02 / 12 |
| 视觉 | 全文 | `blue-*` / `cyan-*` 残留 15 处 | R-UI-03 |
| 视觉 | AI tab 卡片 | `p-8 space-y-8 shadow-2xl` | 范式 §5 |
| 视觉 | 某处 | `text-[10px]` 低于下限 | R-UI-06 |
| 视觉 | 引擎徽章圆点 | `bg-cyan-500` + `shadow-[0_0_8px_#00D2FF]`（硬编码 hex） | R-UI-07 |
| **交互** | 3 处 | `window.confirm()`（加载示例 / 恢复示例 / 清空关系） | **R-UI-08** |
| 交互 | AI 失败 | `setError('AI 生成失败，请重试')` —— 无原因、无可操作建议 | **R-UI-10 / 15** |
| 结构 | AI tab 容器 | `space-y-6`（不铺满，输入框高度受限） | **R-UI-12** |

### 2.2 改动

- **AI tab 铺满**：外层 `h-full flex flex-col`；卡片 `flex flex-col gap-4 flex-1 min-h-0 overflow-hidden`
- **AI 输入框**：`iqs-code flex-1 min-h-[400px]` → `flex-1 min-h-[200px] resize-none`（**可换行 + 铺满**）
- **3 处 `confirm()` → 统一自有确认条**：以 `pendingAction: {label, run}` state 承载，header 内渲染红色警示条（确定 / 取消）
- **AI 失败提示升级**：附**具体原因** + **可操作建议**（改用 DSL 编辑器手工录入）
- **视觉归位**：15 处 `blue/cyan` → `primary`；`shadow-2xl` → `shadow-md`；`text-[10px]` → `11px`；徽章圆点改语义色 `--state-up`

### 2.3 范式增量

**无新增规则** —— 本次为 §1 确立规则的**纯套用**，验证了 **R-UI-02 / 03 / 07 / 08 / 10 / 12 / 15** 的跨组件可复用性。
唯一补充的实现细节：多个破坏性操作可共用一个 `pendingAction` state（形如 `{label, run}`），避免为每处各写一个标志位。

---

## 3. 排列图 · Pareto（IQS Pareto Engine）

### 3.1 问题清单

#### （a）构件契约错误（违反 R-UI-02）
- **DSL 与 AI 两个输入框的形态被搞反**：DSL tab 用了 `min-h-[160px]`，AI tab 却用了 `iqs-code flex-1 min-h-[400px]` —— 与 §1.5 形态契约（DSL 铺满代码区 / AI 可换行推理框）完全颠倒。

#### （b）交互缺陷（违反 R-UI-08 / 10）
- **恢复示例走 `window.confirm()`**：原生弹窗，样式脱离范式，且无法承载"将丢弃哪些内容"的说明。
- **AI 生成失败只 `console.error`**：界面上无任何反馈，用户只看到按钮回弹。

#### （c）视觉残留
- `rounded-lg` **14 处**（本项目 16px ≠ 范式 10px，应为 `rounded-md`）
- `border-[var(--sidebar-border)]` **8 处**（应为 `border-[var(--border-line-r)]`）
- 行内删除按钮仅 `group-hover` 可见，键盘用户不可达（违反 R-UI-09）

### 3.2 判定依据

| 问题 | 依据 |
|:---|:---|
| 输入框反转 | §1.5 形态契约 + R-UI-02 |
| `window.confirm` | R-UI-08（破坏性操作一律自有确认） |
| 失败无声 | R-UI-10（异步失败必须界面可见） |
| 圆角/边框残留 | §A R-UI-07（禁裸值，一律语义令牌） |
| 行内按钮不可聚焦 | R-UI-09 |

### 3.3 改动

- **DSL tab**：容器 `h-full flex flex-col gap-6`；textarea → `iqs-input iqs-code flex-1 min-h-[400px] resize-y`
- **AI tab**：容器 `h-full flex flex-col`；卡片 `p-6 bg-[var(--card-bg)] rounded-md border-[var(--border-line-r)] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden`；textarea → `iqs-input flex-1 min-h-[200px] resize-none`；按钮 `shrink-0 ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`
- **恢复示例**：`pendingReset: boolean` state + 自有确认条（文案"恢复示例将丢弃当前排列图的全部修改，确定继续？"）
- **AI 失败**：`aiError` state + 界面提示；请求前 `setAiError(null)`
- **手动录入**：标题 `iqs-input h-11`；行 `flex-1 h-11`；值输入 `iqs-input-shell`；删除按钮 `w-11 h-11 opacity-60 focus-visible:opacity-100 hover:opacity-100`
- **视觉归位**：`rounded-lg` → `rounded-md`（14）；`border-[var(--sidebar-border)]` → `border-[var(--border-line-r)]`（8）；头部图标 `bg-primary/20 border-primary/30`；`ChevronRight … text-primary`

### 3.4 范式增量

**无新增规则** —— 纯套用 **R-UI-02 / 07 / 08 / 09 / 10**。再次验证 §1.5 形态契约可跨组件直接落地。

---

## 4. 直方图 · Histogram（IQS Histogram Engine）

### 4.1 问题清单

#### （a）构件契约错误
- **同 §3 的输入框反转**（DSL 与 AI 形态互换）。

#### （b）可访问性缺陷（本轮**新发现**，违反 R-UI-17）
- **「显示配置」两个开关的文字标签用 `text-slate-300`** —— `slate` 族**未纳入 `@theme` 覆写**，`slate-300` = `#CBD5E1`，在浅底 `#F5F7FA` 上对比度仅 **≈1.5:1**，**实际不可见**；切深色主题又不会随之变化。
- 同类硬编码在 `ControlChartEditor` 另有 1 处（一并修正）。

#### （c）一致性缺陷（违反 R-UI-16）
- 开关本体 `w-12 h-6` + 圆点 `w-4 h-4`（`translate-x-7`），与矩阵图既定 `w-11 h-6` 不一致；且缺 `role="switch"` 语义。

#### （d）视觉残留
- `rounded-lg` **16 处**；`border-sidebar` **8 处**；规格限上下限标签直接用装饰色作字。

### 4.2 判定依据

| 问题 | 依据 |
|:---|:---|
| `text-slate-300` 不可见 | R-UI-17（文字色须 ≥4.5:1）+ 本轮新增 **R-UI-19** |
| 开关尺寸不一 | R-UI-16（控件尺寸分档 + 同类等高） |
| 装饰色作文字 | R-UI-17（装饰色不得作文字） |

### 4.3 改动

- **输入框**：同 §3（DSL `iqs-code flex-1 min-h-[400px] resize-y` / AI `flex-1 min-h-[200px] resize-none`）
- **规格限**：输入 `iqs-input h-9 !text-[var(--text-danger)]` / `!text-[var(--text-ok)]`；标签同色并 `uppercase`
- **两个开关**：`text-slate-300` → `text-[11px] font-bold text-[var(--sidebar-text)]`；尺寸统一 `w-11 h-6 rounded-full border` + 圆点 `w-[18px] h-[18px] top-[3px] left-[3px]`，开 `bg-primary border-primary` / 关 `bg-[var(--input-bg)] border-[var(--input-border)]`，补 `role="switch" aria-checked aria-label`
- **卡片**：`p-6 bg-[var(--card-bg)] rounded-md border-[var(--border-line-r)] shadow-md`
- **视觉归位**：`rounded-lg` → `rounded-md`（16）；`border-sidebar` → `border-line`（8）

### 4.4 范式增量

**新增 R-UI-19 —— 禁用未映射色族的硬编码文字色**

- **规则**：文字色**只允许**走语义令牌 —— `--text-main` / `--text-secondary` / `--text-muted` / `--text-ok` / `--text-danger` / `--text-info` / `--text-warn`（均随主题自动切换）。**禁止** `text-slate-*` 等未纳入 `@theme` 覆写的色族硬编码文字色。
- **判据**：`slate` 未被覆写，其 `200–500` 档在浅底上对比度 <1.6:1，且**不随主题切换** —— 无法同时满足 R-UI-17 的双主题 ≥4.5:1 要求。
- **例外**：图表 SVG 内的 `fill`/`stroke`（非 CSS 文字）不受此限，但须用范式色值。
- **形态**：`text-slate-200/300/400` → `text-[var(--sidebar-text)]`；`text-slate-500` → `text-[var(--text-muted)]`；若所在行已是 `isDark ? … : …` 三元式（已双主题适配）则**不替换**。

---

## 5. 全局清扫（跨组件批量归位）

一轮**机器可判定、零语义风险**的全局清扫，涉及 22 个文件：

| 项 | 规则 | 处数 | 映射 |
|:---|:---|:---|:---|
| 几何统一 | R-UI-07 | **277** | `rounded-lg` → `rounded-md`（本项目 16px → 范式 10px） |
| 卡片阴影 | R-UI-07 | **18** | `shadow-2xl` → `shadow-md`（仅 `*Editor.tsx` 卡片栈） |
| 字号下限 | R-UI-06 | **9** | `text-[9px]` / `text-[10px]` → `text-[11px]` |
| 浅灰文字 | **R-UI-19** | **13** | `text-slate-{200,300,400}` → `--sidebar-text`；`text-slate-500` → `--text-muted` |

**保留不动**（有正当理由，非残留）：

- `rounded-[2.5rem]` / `[2rem]` / `[1.8rem]`（`DashboardView` / `EditorPanel` 的深色模态特殊圆角）
- `drop-shadow-2xl`（`RadarDiagram` 拖拽态投影）
- `shadow-2xl` 于 `Workspace` 深色分隔条、`RadarDiagram`、`EditorPanel` 主按钮

---

### 5.1 开关控件统一（R-UI-20）

**用户指定：以「排列图 Pareto」的开关为全项目开关范式。**

统一前共 **3 种规格 + 2 种实现方式**：

| 实现 | 文件 | 处数 | 原规格 |
|:---|:---|--:|:---|
| 胶囊 button | `ParetoEditor` | 2 | **`w-14 h-7`** 圆点 `w-5 h-5` ← 范式基准 |
| 胶囊 button | `ControlChartEditor` | 1 | `w-10 h-5` 圆点 `w-3 h-3`（**圆心垂直不居中**：4+12=16 < 20） |
| 胶囊 button | `MermaidEditor` | 2 | `w-10 h-5`，用 `right-1`/`left-1` 定位 |
| 胶囊 button | `HistogramEditor` | 2 | `w-11 h-6`（上一轮临时改的） |
| `checkbox` + `peer` 伪元素 | `MatrixEditor` | 1 | `w-11 h-6`，靠 `after:` 伪元素画圆点 |
| 原生 `checkbox` | Basic 5 / Radar 6 / VChart 3 / Scatter 1 / MatrixPlot 1 | 16 | `w-4 h-4` 小方框 |

**统一方案**：新建共享组件 **`components/ui/Switch.tsx`**（唯一真源），全项目 **11 文件 27 处** 套用。

| 项 | 取值 |
|:---|:---|
| 外观（沿用 Pareto 范式） | `w-14 h-7` 胶囊 · 圆点 `w-5 h-5` · 开 `left-8` / 关 `left-1` · `transition-all` |
| 几何自洽 | `h-7(28) = top-1(4) + 20 + 4`；`w-14(56) = left-8(32) + 20 + 4` |
| **开启态** | `bg-primary border-primary` |
| **关闭态** | `bg-[var(--input-bg)] border-[var(--input-border)]` —— **升级**：原 Pareto 用 `--sidebar-muted`（文字色令牌误作背景、且无边界） |
| 无障碍 | `role="switch"` / `aria-checked` / `aria-label`（22 个非空标签） |
| 键盘 | `focus-visible` 焦点环（R-UI-09） |
| 禁用 | `disabled:opacity-50 disabled:cursor-not-allowed` |

**用法**：

```tsx
import { Switch } from './ui/Switch';   // flow/ 下用 '../ui/Switch'

<Switch checked={!!styles.showValues}
        onChange={v => onUpdate(data, { ...styles, showValues: v })}
        ariaLabel="显示数值标签" />
```

**范式增量**

- **R-UI-20**：**所有开关键控件必须使用 `components/ui/Switch.tsx`**，禁止自定义胶囊/原生 checkbox（表格行内勾选除外）。
- 规格锁定 `w-14 h-7`；颜色与语义令牌绑定，不得硬编码。

---

## 6. 散点图 · Scatter（IQS Scatter Engine）

### 6.1 问题清单

| 类别 | 问题 | 规则 |
|:---|:---|:---|
| 契约 | AI tab 输入框用 `iqs-code flex-1 min-h-[400px]`（**不换行**，与推理型输入冲突） | R-UI-02 |
| 契约 | AI 容器 `space-y-6 pb-12`、卡片 `p-8 bg-[var(--input-bg)]`（不铺满） | R-UI-12 |
| 一致性 | 开关为原生 `checkbox w-4 h-4` | R-UI-20 |
| 可访问 | 引擎徽章圆点 `bg-emerald-500` + 硬编码 `shadow-[0_0_8px_#00D2FF]` | R-UI-07 |
| 视觉 | 头部图标 `bg-blue-600/20 border-blue-500/30 text-blue-400`；`hover:text-blue-600`；`hover:bg-indigo-500` | R-UI-03 |
| 视觉 | `border-[var(--sidebar-border)]` × 5 | R-UI-07 |
| 可访问 | `text-amber-{400,500}` 作文字（`#F1C40F`，**1.55:1**）；提示卡 `bg-amber-900/10 border-amber-800/20` | R-UI-17 |

### 6.2 改动

- AI 输入框 → `iqs-input flex-1 min-h-[200px] resize-none`；容器/卡片铺满；主按钮 → `shrink-0 ${…}`
- 开关 → `<Switch>`；徽章圆点 → `bg-[var(--state-up)]`（去硬编码 shadow）
- 头部图标与 hover → `primary`；`border-sidebar` → `border-line-r`
- `text-amber-*` → `text-[var(--text-warn)]`；提示卡 → `.iqs-note`
- **保留**：manual tab 的坐标数据输入用 `iqs-code`（每行一条 `x, y, z`，不折行合理）

### 6.3 范式增量

无新增规则 —— 纯套用 R-UI-02 / 03 / 07 / 12 / 17 / 20。

---

## 7. 系统图 · Affinity（IQS Affinity Engine）

> **注**：本组件即 **亲和图 KJ 法 / 系统图（Tree Diagram）**——`affinity.card.ts` 的 `intents` 同时登记三者，为同一张卡。

### 7.1 问题清单

| 类别 | 问题 | 规则 |
|:---|:---|:---|
| 契约 | AI 输入框 `iqs-code flex-1 min-h-[400px]`（不换行） | R-UI-02 |
| 契约 | AI 容器无铺满；卡片 `p-8 border-[var(--sidebar-border)]` | R-UI-12 |
| 一致性 | 开关为原生 `checkbox` × 6 | R-UI-20 |
| 视觉 | 头部图标蓝色；`text-indigo-{300,400,500}` × 5；`bg-indigo-500/10 border-indigo-500/20` 标签 | R-UI-03 |
| 视觉 | `border-[var(--sidebar-border)]` × 13 | R-UI-07 |
| 可访问 | 状态圆点 `bg-indigo-500` / `bg-blue-500` / `bg-emerald-500` 三色混用 + 硬编码 shadow | R-UI-17 |
| 可访问 | 提示卡 `bg-indigo-900/10 border-indigo-800/20` | R-UI-07 |
| 视觉 | 删除按钮 `bg-red-600/20 text-red-300`（装饰色作文字） | R-UI-17 |

### 7.2 改动

- AI 输入框 → `iqs-input flex-1 min-h-[200px] resize-none`；容器/卡片铺满；按钮 → `shrink-0`
- 开关 6 处 → `<Switch>`；状态圆点统一 `bg-[var(--state-up)]`
- 头部图标 / `text-indigo-*` / `hover:*` → `primary`；`border-sidebar` → `border-line-r`（13）
- 标签 `bg-indigo-500/10 border-indigo-500/20` → `bg-primary/10 border-primary/20`
- 提示卡 → `.iqs-note`；删除按钮 → `bg-[var(--alert-red)]/20` + `text-[var(--text-danger)]`

### 7.3 范式增量

无新增规则 —— 套用 R-UI-02 / 03 / 07 / 12 / 17 / 20。

---

## 8. 控制图 · ControlChart（IQS SPC Engine）

### 8.1 问题清单

| 类别 | 问题 | 规则 |
|:---|:---|:---|
| **契约（严重）** | **DSL 与 AI 输入框再次对调**：DSL(463) 用 `min-h-[160px]`、AI(484) 用 `iqs-code flex-1 min-h-[400px]` | R-UI-02 |
| 契约 | AI 容器 `flex flex-col gap-6 … pb-12`；卡片 `p-8 bg-[var(--input-bg)] border-[var(--input-border)]` | R-UI-12 |
| 一致性 | 开关 `w-10 h-5` 且**圆心不居中**；颜色输入用原生 `checkbox` | R-UI-16 / 20 |
| 视觉 | `border-[var(--sidebar-border)]` × 8；头部图标蓝色 | R-UI-07 / 03 |
| 可访问 | `emerald` 大量作文字（`#22C55E`，**2.12:1**）× 12；异色卡 `bg-emerald-900/10 border-emerald-800/20` | R-UI-17 |
| 可访问 | 思考态按钮 `bg-[var(--sidebar-muted)]`（文字色令牌误作按钮底色） | R-UI-07 |

### 8.2 改动

- **DSL** → `iqs-input iqs-code flex-1 min-h-[400px] resize-y`；**AI** → `iqs-input flex-1 min-h-[200px] resize-none`
- AI 容器/卡片铺满；主按钮 → `shrink-0 ${isThinking ? 'iqs-btn-pending' : 'iqs-btn-primary'}`
- 开关 → `<Switch>`（修正圆心不居中）；`text-emerald-*` → `text-[var(--text-ok)]`；`border-emerald-*` → `border-[var(--state-up)]*`
- 异色卡 → `.iqs-note`；头部图标 / hover → `primary`；`border-sidebar` → `border-line-r`（8）
- **保留**：`#000000`（`<input type="color">` 的合法 fallback）

### 8.3 范式增量

无新增规则。

> **反复出现的模式**：`Pareto` / `Histogram` / `ControlChart` **三个组件都出现"DSL 与 AI 输入框对调"** —— 这是早期批量替换的遗留。已在 §1.5 形态契约中明确，并在 §9 列为**全项目待核查项**。

---

## 9. 关联图 / PDPC / 矢线图（**密度优先**修订）

> **用户约束**：「这几个组件设计的 UI 内容较多，尽量保持现有的密度或者合理布局。」
> → 本轮**只修正确性，不动布局**：卡片 padding 一律保留 `p-8`，不引入额外的行高/间距膨胀。

### 9.1 三组件共性清单

| 类别 | 问题 | 规则 |
|:---|:---|:---|
| 可访问 | `text-purple-*` / `text-emerald-*` / `text-blue-*` 作文字（`#22C55E` = **2.12:1**、`#A855F7` = **3.10:1**） | R-UI-17 |
| 可访问 | 异色提示卡 `bg-purple-900/10 border-purple-800/20` / `bg-emerald-900/10 border-emerald-800/20` | R-UI-07 |
| 视觉 | `border-[var(--sidebar-border)]` —— Relation 17 / PDPC 18 处 | R-UI-07 |
| 视觉 | 头部图标 `bg-blue-600/20 border-blue-500/30 text-blue-400` | R-UI-03 |
| 视觉 | `ArrowDiagram` tab 激活态 `bg-indigo-600 shadow-xl` | R-UI-03 |
| 工程 | 硬编码光晕 `shadow-[0_0_8px_#3498DB]` / `#00D2FF` 于状态圆点 | R-UI-07 |
| 契约 | `PDPC` AI 输入框用 `iqs-code`（不换行） | R-UI-02 |
| 契约 | 三组件 AI 段卡片未铺满 | R-UI-12 |

### 9.2 改动

- 装饰色文字 → `--text-ok` / `--text-danger` / `--text-warn` / `primary`
- 异色卡 → `.iqs-note`；状态圆点 → `bg-[var(--state-up)]`，**删除硬编码光晕**
- 标签底 / 头部图标 / hover 底 → `primary/10` · `primary/20` · `primary/30`（**保留 `/透明度`，密度不变**）
- `ArrowDiagram` tab 激活态 → `bg-primary text-white shadow-md`
- `border-sidebar` → `border-line-r`
- AI 段：容器 → `h-full flex flex-col`；卡片 → 加 `flex flex-col flex-1 min-h-0 overflow-hidden`、`space-y-8 → space-y-6`（**略增密度**）、**`p-8` 保留**；AI 输入框 → 可换行

### 9.3 PDPC 流程层级（R-UI-11 复核）

PDPC 的阶段层级用 **`parentId` 引用式**编排（`groups: { id, label, parentId }`），编辑入口为父级选择控件 —— **结构上天然不受深度限制**，无需像亲和图那样重做层级树。**本轮未改其布局**（密度约束）。

### 9.4 范式增量

- **R-UI-21**：**`hover:text-white` 仅在同一个 `className` 内伴随 `hover:bg-*` 时合法**（此时悬停有底色，白字可读）；否则必须改 `hover:text-primary`。全项目曾据此扫出 10 个 Editor 的浅底白字隐患。
- **R-UI-22（密度优先原则）**：对信息密度本就较高的编排器（关联图 / PDPC / 矢线图 / 矩阵图类），修订时**只修正确性与令牌，不得为一致性而放宽 `p-*` / 行高 / 间距**；容器铺满可通过 `flex-1 min-h-0` 实现，无需牺牲 padding。

### 9.5 配色复核与修正（**分类辨识色**）

> **用户反馈**：「你是完全不看组件配色吗？」—— 复核后确认前一轮把**承载分类语义的颜色压平成了单一品牌色**，属实质性错误。

#### 问题本质

这三个组件的配色**不是装饰**，而是**数据分类编码**（DSL 契约的一部分，用户可自定义）：

| 组件 | 分类色体系（`dsl/cards/iqs_native/*.card.ts` 默认值） |
|:---|:---|
| **关联图** | `Color[Root] #CF3A2B` 红（主要症结）· `Color[Middle] #F1C40F` 金（中间因素）· `Color[End] #fbbf24` 琥珀（末端因素）· `Color[Line]` 灰 |
| **PDPC** | `Color[Start] #4f46e5` 靛 · `Color[Step] #f0f9ff` · `Color[Countermeasure] #fef2f2` · `Color[End] #ecfdf5` · `Color[Line] #64748b` |
| **矢线图** | `Color[Line] #00D2FF`（= `--luxi-cyan`）· `Color[Critical] #E74C3C` 红 · `Color[Node]` / `Color[Shortest]` |

**前一轮的错误**：把矢线图 UI 中「**节点组（绿）/ 任务组（蓝）**」的对置配色、关联图「**主要症结 / 中间因素 / 末端因素**」三组配置块的区分色，**全部替换为 `primary`** → 成组元素的辨识度归零。

#### 修正

**矢线图**（恢复对置）：

| 元素 | 修正后 |
|:---|:---|
| 节点组（`Database` 图标 + 添加节点按钮） | `--text-ok` / `--state-up`/20 |
| 任务组（`Activity` 图标 + 添加连线按钮） | `--text-info` / `--luxi-cyan`/15 |

**关联图**（配置块标题按分类回色）：

| 配置块 | 标题色 |
|:---|:---|
| 主要症结 (Root) | `--text-danger` |
| 中间因素 (Middle) | `--text-warn` |
| 末端因素 (End) | `--text-ok` |
| 连线 (Line) | `--sidebar-muted`（中性） |

**PDPC**：**无需修改** —— 它用 `grid-cols-4` 的 color swatch + 实际色值文字展示四类颜色，标题保持中性灰度是正确设计。

#### 顺带修正（通用解法的漏网）

| 项 | 说明 |
|:---|:---|
| **漏网开关** | `矢线图` ×2、`Mermaid` ×1 使用 `w-8 h-4` 胶囊 —— 此前的扫描正则 `w-1[014] h-[567]` **漏掉该尺寸**。已全部 → `<Switch>`。现全项目无任何自绘胶囊。 |
| **深色主题遗留** | `矢线图` 6 处 `bg-black/20`（节点 ID / Label 输入框）—— 浅色主题下半透明黑。已 → `bg-[var(--input-bg)]`。现 Editor 层无 `bg-black/*` 残留（`CardDocModal` / `EditorPanel` 的 `bg-black/60,40` 为**遮罩层**，合法保留）。 |

### 9.6 范式增量

- **R-UI-23（分类辨识色不得压平）**：同一界面中**成组出现、需要互相区分**的元素（多类型节点、多分组配置块、对置的操作组），**必须各用不同色**，禁止为「统一品牌」而全部替换为 `primary`。用色须取自范式色板：

  | 类别 | 面（背景） | 字（文字，≥4.5:1） |
  |:---|:---|:---|
  | 主因 / 关键 / 对策 | `--alert-red` | `--text-danger` |
  | 中间 / 过渡 | `--luxi-gold` | `--text-warn` |
  | 结果 / 合格 / 节点 | `--state-up` | `--text-ok` |
  | 信息 / 连线 / 任务 | `--luxi-cyan` | `--text-info` |
  | 品牌 / 交互 | `--primary` | `primary` |
  | 中性 | `--sidebar-muted` | `--text-muted` |

  > **区分原则**：数据可视化配色（节点/连线/系列的默认色）属 **DSL 契约**，不得改写；UI 层只需**与之呼应**，不得压平。

- **R-UI-20 补充**：范围判定以「是否为开关键控件」为准，**不限定尺寸** —— 自绘胶囊无论大小一律替换为 `<Switch>`。（本轮据此补获 3 处 `w-8 h-4`。）

### 9.7 输入框色调分层与排版规范（用户二次反馈「认真检查」）

> **用户反馈**：「输入框控件的色调呢，字体的色调呢？认真检查。这几个组件，请使用规范，并合理布局和排版。」

#### 问题（系统梳理）

| # | 问题 | 范围 |
|:---|:---|:---|
| 1 | **`text-slate-600` 漏网** —— 前轮扫描正则只覆盖 `slate-{200,300,400,500}` | PDPC 4 处 |
| 2 | **自绘输入框** —— 各自写 `bg/border/text/focus`，色调与焦点态互不相同 | 三组件 26 个输入框 |
| 3 | **边框三种浓度** —— `--input-border` / `--border-line-r` / `--border-line-r`**`/50`** | 三组件 |
| 4 | **`text-xs`(12px) 残留** —— 违反字号分档 | 三组件 8 处 |
| 5 | **令牌语义错位** —— 关联图把**输入框底色 `--input-bg`** 当作**顶级面板卡片底** | 关联图 4 处 |
| 6 | **面板 padding 不一致** —— `p-8` 与 `p-6` 混用 | 关联图 / PDPC |
| 7 | **双灰** —— `--sidebar-muted: #64748B`（Tailwind slate-500）与 `--text-muted: #5A6B80` 是**两个不同的灰** | 浅色主题全局 |

#### 解决：**色调层与尺寸层分离**

`.iqs-input` 默认 44px 高 + 16px padding，直接套用到**表格行内输入框**会撑破既有密度 —— 与「保密度」要求冲突。因此新增 **`.iqs-field` 色调层**：

```css
/* 全部属性用 :where() 包裹（specificity = 0）
   → 调用方的 Tailwind 类（text-[var(--text-ok)]、bg-transparent…）必定能覆盖，
     本类只提供**规范默认值**。 */
:where(.iqs-field)          { background: var(--input-bg); color: var(--text-main);
                              border: 1px solid var(--input-border); outline: none; }
:where(.iqs-field:focus)    { border-color: var(--luxi-cyan); box-shadow: var(--shadow-focus); }
:where(.iqs-field)::placeholder { color: var(--text-muted); opacity: 1; }
:where(.iqs-field--plain), :where(.iqs-field--plain:focus)
                            { background: transparent; border-color: transparent; box-shadow: none; }
```

| 语义类 | 用途 | 是否含尺寸 |
|:---|:---|:---|
| `.iqs-input` | 块级输入框（图表标题、DSL、AI） | **含**（默认 44px，可 `h-*` 覆盖） |
| `.iqs-field` | **紧凑自绘输入框的色调层**（表格行内、小下拉） | **不含**（尺寸由 Tailwind 保留） |
| `.iqs-field--plain` | 内联编辑态（列表行内改名，无底无边） | 不含 |
| `.iqs-field-xs` / `-sm` | 紧凑尺寸档（28 / 32px，**选配**） | 含 |

**结果**：三组件 26 个输入框 100% 纳入规范，**密度与布局零改动**。

#### 令牌语义归位

| 令牌 | 正确语义 |
|:---|:---|
| `--card-bg` | **顶级面板 / 卡片底色**（浅色 `#FFFFFF`） |
| `--input-bg` | **输入框底色**；亦作**内嵌子容器**底色（配 `/30` 半透明形成层次） |
| `--border-line-r` | 面板 / 卡片边框 |
| `--input-border` | 输入框边框（值同 `--border-line-r`，语义分离） |

- 关联图 4 处 `p-8 bg-[var(--input-bg)] … border-[var(--input-border)] shadow-sm` → **`p-6 bg-[var(--card-bg)] … border-[var(--border-line-r)] shadow-md`**
- PDPC 2 处 `p-8` → `p-6`
- **双灰消除**：`--sidebar-muted: #64748B` → `var(--text-muted)`

#### 排版规范（三组件统一）

| 层级 | 类 |
|:---|:---|
| 顶级面板 | `p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] shadow-md` |
| 内嵌子容器 | `p-4 bg-[var(--input-bg)]/30 rounded-md border border-[var(--border-line-r)]/50` |
| 分组小标题 | `text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1` |
| 卡片标题 | `text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]` |

### 9.8 范式增量

- **R-UI-24（输入框色调分层）**：输入框必须使用 **`.iqs-input`**（块级）或 **`.iqs-field`**（紧凑，仅色调）；**禁止**逐处手写 `bg`/`border`/`text`/`focus` 组合。`.iqs-field` 的样式全部 `:where()` 包裹，保证调用方尺寸类不被压过。
- **R-UI-25（令牌语义不得错位）**：`--card-bg` 用于面板、`--input-bg` 用于输入框；**不得**以 `--input-bg` 作顶级面板底色（内嵌子容器例外，须配 `/30`）。`--input-border` 与 `--border-line-r` 语义分离，不得互换使用。
- **R-UI-26（单一灰阶）**：浅色主题下 `--sidebar-muted` 与 `--text-muted` 必须同源（`var(--text-muted)`），禁止并存两套灰。
- **R-UI-06 补充**：字号扫描须覆盖 `text-xs` / `text-sm` 等**具名档位**，不限于 `text-[Npx]` 字面量。

---

## 10. 全组件代码审计（用户要求：站在代码审计 / 优化设计 / 范式统一角度）

> 与前面按「样式」精修不同，本轮**通读代码逻辑**，找的是**潜在缺陷**而非类名。
> 审计先做**模式扫描**（同一问题往往散布全项目），再逐个组件修，最后统一验证。

### 10.1 审计出的系统性缺陷（5 类）

| # | 缺陷 | 波及范围 | 危害 |
|:---|:---|:---|:---|
| **A1** | **`window.confirm()`** | **10 个组件** | 项目明令禁止：阻塞渲染、样式不受主题控制、iframe/沙箱下可能被直接屏蔽 → 「点了没反应」 |
| **A2** | **异步失败仅 `console.error`** | 7 个组件**完全没有**错误通道；另 6 个只在 DSL tab 内显示 | 违反 R-UI-10 —— 用户在 manual/AI tab 时**看不到任何失败反馈** |
| **A3** | **`getAIStatus().then(setX)` 无守卫** | **15 个文件** | ① 卸载后 setState ② 无 `catch` → 静默 unhandled rejection ③ 返回值未校验 |
| **A4** | **不可靠 ID 生成** | 5 文件 9 处 | `Date.now().toString(36)` **同毫秒连点即碰撞** → React key 冲突 + 数据串行；`Math.random().toString(36).substr(2,n)` 用了**废弃 API** |
| **A5** | **列表 key 用索引** | 扫描出 25+ 处 | 逐处判定：**Diagram 层 SVG 与色块预览**用 index 合理 ✓；**可编辑的受控 select/input 列表**用 index 亦合适（换内容 key 反而会 remount 丢焦点）→ **保持不动**（有意的判断，非遗漏） |

### 10.2 新增共享件（把重复实现收口为单一真源）

| 文件 | 职责 |
|:---|:---|
| `utils/id.ts` → `genId(prefix)` | **时间戳 + 进程内自增序号**，同一毫秒内严格唯一；替代 9 处散落实现 |
| `hooks/useAIEngine.ts` | 内聚 A3：卸载守卫 + `catch` + 返回值校验；15 个组件的 `useEffect` 样板收敛为一行 |
| `components/ui/ConfirmInline.tsx` | 内联二次确认条（`role="alertdialog"` + `aria-live`），替代 A1 的原生弹窗 |
| `utils/relationGraph.ts` | 关联图图论单一真源（见 §9 审计） |

### 10.3 逐组件结果

| 组件 | A1 confirm | A2 错误通道 | A3 useAIEngine | A4 genId |
|:---|:---:|:---:|:---:|:---:|
| AffinityEditor | ✓ | ✓ | ✓ | ✓ |
| ArrowDiagramEditor | ✓ | ✓ | ✓ | — |
| BasicEditor | ✓ | ✓ | ✓ | — |
| ControlChartEditor | ✓ | ✓ | ✓ | — |
| FishboneEditor | —（本无 confirm） | ✓ | ✓ | ✓ |
| HistogramEditor | —（本无 confirm） | ✓ | ✓ | — |
| MatrixEditor | —（本无 confirm） | ✓ | ✓ | — |
| MatrixPlotEditor | ✓ | ✓ | ✓ | — |
| MermaidEditor | ✓ | ✓ | ✓ | — |
| PDPCEditor | ✓ | ✓ | ✓ | — |
| ParetoEditor | —（本无 confirm） | ✓ | ✓ | ✓ |
| RadarEditor | ✓ | ✓ | ✓ | — |
| RelationEditor | ✓（§9 已修） | ✓ | ✓ | — |
| ScatterEditor | ✓ | ✓ | ✓ | ✓ |
| VChartEditor | ✓ | ✓ | ✓ | — |
| `flow/FlowEditor` | —（本无 confirm） | ✓ | ✓ | — |

**错误 UI 统一归位**：原先 6 个组件（Relation / PDPC / Affinity / Matrix / MatrixPlot / Fishbone）把错误显示**嵌在 DSL tab 内** —— 切到 manual/AI tab 就看不见。现已全部提到**内容区顶部**，任何 tab 均可见，并统一为 `role="alert"` + 可关闭。

### 10.4 关联图（Relation）深度审计 —— 15 项

详见 `utils/relationGraph.ts` 的模块注释。关键几条：

| 缺陷 | 说明 |
|:---|:---|
| **拓扑变、配色不变** | 渲染层读 `node.type` 决定配色，而手工编辑从不重算 `type` → 改完连线颜色停在旧状态。抽 `withRecomputedTypes()` 接入 4 个拓扑变更点 |
| **手工路径零校验** | DSL 路径有自引用/环路检测，手工 `addLink`/`updateLink` 一项都没有 → 可造出非法图。收敛为 `validateRelationLinks()` 两条路径共用 |
| **DSL 往返损坏** | 写 `Node: id, label`、读 `split(',')` → label 含逗号即被截断。改为只在**首个逗号**切分 |
| **AI 按钮图标不可见** | 绿底按钮上转圈图标用了 `text-primary`（同为绿）→ 改为 `text-white` |
| **连线列表 `key={idx}`** | 删中间行时输入串位 → 改稳定 key |
| **`addNode` ID 碰撞** | 改 `nextRelationNodeId()` |
| **渲染期重算入度** | JSX 内 IIFE 每次渲染 O(V+E) → `useMemo` |
| **语义命名反直觉** | 「无出边」叫 `root`、「无入边」叫 `end` —— 与图论方向相反。改用 `sink`/`source`/`middle`，UI 标签改为**「症结」/「起点」**并带 `title` 解释 |

### 10.5 范式增量

- **R-UI-27（共享件优先）**：跨组件重复出现的**行为逻辑**（ID 生成、AI 状态获取、二次确认）必须抽为 `utils/` 或 `hooks/` 下的单一真源，**禁止复制粘贴**。样式类同理（`.iqs-input` / `.iqs-field` / `Switch` / `ConfirmInline`）。
- **R-UI-28（索引 key 的判定标准）**：列表 `key` **不得一律视为缺陷**。判定规则：
  - **纯展示 / SVG 渲染 / 色块预览** → `index` 可接受 ✓
  - **受控 `select` / `input` 列表** → `index` **更优**（内容 key 会在编辑时 remount 丢焦点）✓
  - **含本地 state / 不受控 DOM 状态的行** → **必须**稳定 key ✗
- **R-UI-29（错误反馈的位置）**：错误提示必须放在**内容区顶部**（所有 tab 可见），不得只嵌在某个 tab 内部。

---

## 11. 指定问题修复轮（用户逐项点名）

用户提出 7 项，逐项**先审计再决定**，不做未经判断的改动。

| # | 用户问题 | 审计结论 | 处理 |
|:--|:---|:---|:---|
| **1** | 散点图顶部报 `Failed to load AI config: Unexpected token '<'` | `fetch('/chart_spec.json')` 的**文件不存在**（`public/` 只有 `config.json`/`mcp_tools.json`）→ Vite SPA fallback 返回 `index.html` → `res.json()` 解析 `<!DOCTYPE` 失败。且组件里的 `aiConfig` state **声明后从未被读取** → **整段是死代码**；`aiService` 内部已有 `getChartSpec()` 正确处理。**上一轮我把静默 `console.error` 提升为 `setError`，才把这个本不该暴露的内部失败暴露出来** | 删除该 fetch 与无用 state（`FishboneEditor` 同类一并删） |
| **2** | 关联图图形绘制优化 | 节点宽度按 `label.length * fontSize` 估算 —— **未区分中英文字宽**：汉字 ≈1em、拉丁 ≈0.56em → 中文标签溢出、英文留白过大。另 `lineWidth: 0` 使同色相邻节点糊在一起；`setTimeout(…,100)` 重布局**无清理** | 抽 `utils/textMetrics.ts` 共享度量；节点尺寸按其计算；补 `lineWidth: 1`；`setTimeout` → `requestAnimationFrame` 双帧 + `cancelAnimationFrame` 清理 |
| **3** | PDPC 初始配色难分辨（白字） | `DEFAULT_PDPC_STYLES` 用**饱和底 + 白字**：Step **3.68:1**、Countermeasure **2.54:1**、End 3.76:1 —— 均不达 4.5:1；且与卡内声明的 `Step: #f0f9ff`（极浅底）**是两套默认值** | 改「浅底 + 同色系深字」，全部 ≥5.5:1 且保留四类色相；`pdpc.card.ts` 同步，并补齐此前**缺失的 4 个 `*Text` 槽位** |
| **4** | 矢线图连线文字需字号自适应 | 标号白底矩形**硬编码 `80×36`**、文字用固定 `fontSize` → 中英混排标号（如「需求评审(3天)」）溢出裁切 | 按真实字宽估算，超出则同比缩字号（下限 9px），底板贴合 |
| **5** | 雷达图配色是否造成阅读困难 | ① 图例小标题 `#64748b`（**未映射的 slate-500**）② 图例条目 `fontSize: 10` ③ 数值标签 **`fontSize: 9`** + **`fill: s.color`（系列色作文字）** | → `#5A6B80`；字号 → 11px；数值标签 → 11px + 深墨（**系列辨识交给圆点与多边形填充**，白描边加粗至 3） |
| **6** | VChart 示例 JSON 复杂度不足 | 原示例 **2 个数据点、单系列** —— 而 `ColorPalette` 是组件卖点（5 色），单系列**根本看不出调色板效果**，也未展示图例/提示 | 改为 **12 点 / 3 系列**分组条形图，展示 `seriesField` / `legends` / `tooltip` / `crosshair` / 圆角 / 轴标题；**已用 JSON.parse 验证可解析** |
| **7a** | FLOW 的 DSL 样式语句是否已写入规范与语法 | **已写入，且三层一致**：BNF（spec L69 `Color[" slot "]:" hex`）、L0 spec §615 列全 **13 个色槽**、`flow.card.ts` 标 `supported`、`FlowEditor` 有 13 槽读写 —— 与代码 `COLOR_SLOTS` **完全对应** | **无需新增语法**（结论：现状正确） |
| **7b** | FLOW AI 推理选项卡需对齐 | 确未对齐：输入框 `min-h-[160px] resize-y`、容器未铺满、按钮无 `shrink-0`、徽章硬编码光晕、提示卡 `bg-teal-900/10`、状态栏用 `text-rose-400`/`text-emerald-400` 作文字 | 9 处对齐范式 |

### 11.1 新增共享件

| 文件 | 职责 |
|:---|:---|
| `utils/textMetrics.ts` | 逐字符字宽表（汉字 1em / 拉丁 0.56em）+ `estimateTextWidth()` + `fitText()`；箭头图与关联图**共用同一实现**，消除两份「按 length 估算」 |

### 11.2 范式增量

- **R-UI-30（文本度量不得用 `length`）**：任何「按文本定尺寸 / 缩字号」的渲染层（SVG 标号、图节点、标签底板）**必须**使用 `utils/textMetrics.ts` 估算宽度。`str.length` 对中英混排的误差可达 **1.8 倍**（汉字 1em vs 拉丁 0.56em），必然导致中文溢出或英文留白。
- **R-UI-31（内部配置失败不得暴露给用户）**：装饰性/内部性的资源加载失败（引擎名、可选配置）应**静默降级**；只有**用户操作直接触发**的失败才需要 `setError` 呈现。上一轮把 `console.error` 无差别提升为界面错误，正是违反此条。

---

## 12. 门禁建设与文档整备（用户 5 项指令）

### 12.1 FLOW 示例扩容（覆盖全部构造）

原 `INITIAL_FLOW_DSL` 只用了基础构造。核查 `flow.card.ts` 声明的 **24 种语法能力**后，重写为：

| 构造 | 覆盖 |
|:--|:--|
| `Type[S/E/T/?/+/SUB/N/DATA]` | ✅ **8 种全覆盖**（原只用了 `S` / `?` / `E`） |
| `Grid: dashed` 泳道线型 | ✅ |
| `Axis:` 整图标题 | ✅ |
| 子流程块（内嵌 `W` + `End`） | ✅ |
| 数据对象 `DATA` + 标注 `N`（`Attach`） | ✅ |
| 分支行（带标签 + 条件） | ✅ |
| 6 种属性 `Role/SOP/Lv/Time/KPI/M` | ✅ |

**15 节点 / 13 条边 · `errors: []` · `warnings: []`**（`parseFlowDSL` 实测）。

要点：**规避了两个已知 P0 缺陷** —— `SUB` 必须显式连出（`sub1 → #w8`）；`N`/`DATA` 必须排在**所有主流 `W` 行之后**（AUD-119 的规避写法）。

### 12.2 版本说明按工程阶段重塑

主页面问号按钮的「版本发布记录」原为 **15 条扁平列表**，现按 `PROJECT_INDEX.md` 的工程阶段分组：

| 分组 | 条目 |
|:--|:--|
| **P6 · 单一真源（SSOT）与 UI 范式 · 未发布** | v3.5.0 / v3.4.0 / v3.3.0（高亮） |
| **P5 · 品牌化与发行** | v3.2.0 / v3.1.0 / v3.0.0 |
| **P2–P4 · MCP 化 / 语言规范 / FLOW / 工程化** | v2.9.0 / v2.8.0 / v2.5.0 / v2.1.0 / v2.0.0 |
| **P1 · 项目起步** | v1.8.0 / v1.5.0 / v1.2.0 / v1.0.0 |

**15 条内容一字未改**，只加分组与来源标注（「按工程阶段归档 · 详见 docs/PROJECT_INDEX.md」）。

### 12.3 门禁建设（三项）

见 `PROJECT_INDEX.md` §3.5.1。核心两点：

1. **`assert_card_contracts.ts`** —— 执行 L0 卡自己的 `example.expect`（含 `forbiddenEdges` 回归防线）。**14 张卡全部带契约，此前无人执行。**
2. **`check_cards_fresh.ts`** —— 产物新鲜度，语义是「**重生成前后是否变化**」。**第一版误用 `git diff --exit-code`**：产物本就在未提交状态，那样写会**恒红，等于没有**。

**两处技术要点**：
- `dsl/*.ts` 的内部 import **不带扩展名**，Node ESM 无法解析 → 门禁脚本经 **`vite.ssrLoadModule`** 载入（这是 `lintDsl()` 长期悬空的**真因**，AUD-134）
- 两个门禁都做了**注入回归测试**，确认能报红

### 12.4 范式增量

- **R-UI-32（门禁须自证有效）**：新增任何校验门禁，**必须**做一次注入回归 —— 故意造出它应拦截的错误，确认它报红，再恢复。否则无法区分「真的通过」与「根本没跑」。
- **R-UI-33（门禁语义须自洽）**：校验「产物是否新鲜」时，**不得**用 `git diff --exit-code`（产物常处未提交态，会恒红）；应比对**重生成前后的哈希**。

---

## 13. 待精修队列

### 13.1 单列一轮（独立视觉语言，需整体决策）

| 对象 | 规模 | 说明 |
|:---|:---|:---|
| `DashboardView` | 56 处 `text-slate-*` · 7 处 `rounded-lg` · 7 处 `<11px` · `rounded-[2.5rem]` | **独立深色霓虹视觉语言**（59 处 `isDark` 三元式），与范式浅色卡片栈并存。归位范式需整体决策（是否保留 Dashboard 深色皮肤）。 |
| `EditorPanel` | `bg-slate-800` / `border-slate-700` / `text-slate-500` | 残留旧深色语言；`shadow-2xl` 主按钮 `h-16`。 |
| Diagram 画布组 | 亮档色作文字（`text-blue-400` / `text-amber-*` / `text-indigo-*` 等 188 处） | 多数位于**深色画布**上，亮档文字正确；仅浅色卡片栈内的需按 R-UI-17/19 归位。需按背景逐处判定。 |

### 13.2 逐组件套用

| 组件 | 优先级 | 备注 |
|:---|:---|:---|
| PDPC | 中 | 含流程层级，可复用 R-UI-11 |
| Affinity（亲和图） | 中 | 含分组层级 |
| Arrow / ControlChart / Mermaid / Radar / Relation / Scatter / VChart / Basic / MatrixPlot | 中 | 套用 §A 通用规则 + §1.5 契约 |
| 帮助弹窗表格行高 | 低 | 未按 `compact 36 / comfortable 44` 显式设定 |
| 侧栏激活态 | 低 | 「深灰实底胶囊」与 Tab 组件不同源 |

---

## 变更记录

| 版本 | 日期 | 内容 |
|:---|:---|:---|
| v1.0 | 2026-09-12 | 建册；完成 §1 鱼骨图精修；登记 R-UI-01..11 |
| v1.1 | 2026-09-12 | 完成 §2 矩阵图、§3 排列图、§4 直方图；新增 **R-UI-19**；新增 §5 全局清扫（22 文件 / 317 处） |
| v1.2 | 2026-09-12 | 新增 **R-UI-20** 与共享组件 `components/ui/Switch.tsx`，全项目开关统一（10 文件 / 24 处，范式取自排列图）；完成 §6 散点图、§7 系统图、§8 控制图；补扫 `text-[8px]` 27 处 |
| v1.3 | 2026-09-12 | 新增 **R-UI-21**（`hover:text-white` 合法性判定）与 **R-UI-22**（密度优先原则）；完成 §9 关联图 / PDPC / 矢线图**密度优先**修订；修复亲和图层级树浅底白字；全项目扫出并修复 10 个 Editor 的 `hover:text-white` 隐患 |
| v1.4 | 2026-09-12 | 新增 **R-UI-23**（分类辨识色不得压平）并修正 §9 的过度统一错误：恢复矢线图「节点绿 / 任务蓝」对置、关联图三组配置块分类色；补获漏网开关 3 处（`w-8 h-4`，开关统一数 24 → **27**）；清除矢线图 6 处深色遗留 `bg-black/20` |
| v1.5 | 2026-09-12 | 新增 **R-UI-24/25/26**；三组件 26 个输入框 100% 纳入规范；修复 `--input-bg` 误用作面板底、`p-8`/`p-6` 混用、`text-slate-600` 漏网、`text-xs` 残留；消除浅色主题双灰 |
| v1.7 | 2026-09-12 | 新增 **R-UI-30/31**；`utils/textMetrics.ts` 落地；修 7 项指定问题 |
| v1.8 | 2026-09-12 | 新增 **R-UI-32**（门禁须自证有效）与 **R-UI-33**（门禁语义须自洽）；FLOW 示例扩容至覆盖全部 8 种 `Type` 构造；版本说明按工程阶段重塑；建 `lint_examples` / `assert_card_contracts` / `check_cards_fresh` 三道门禁；§12 记录，队列顺延 §13 |
| v1.6 | 2026-09-12 | **代码审计轮**：新增 **R-UI-27/28/29**；`utils/id.ts`、`hooks/useAIEngine.ts`、`components/ui/ConfirmInline.tsx` 三件共享件落地；10 组件 `window.confirm` 归零、15 文件 AI 状态收口、9 处不可靠 ID 收口；6 组件错误 UI 由 DSL tab 提到内容区顶部；§10 记关联图 15 项深度审计；队列顺延 §11 |
