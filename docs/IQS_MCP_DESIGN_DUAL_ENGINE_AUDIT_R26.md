---
doc_id: IQS-MCP-DESIGN-DUAL-ENGINE-AUDIT-R26
title: 全栈工程深度审计与 MCP 双模分层渲染架构设计及实施全记录（R26）
project: 澄矩 · ChengJu (IQS)
version: v1.0
domain: MCP
type: DESIGN
authority: L2
freshness: 🟢现行
first_commit: 2026-10-27
last_commit: 2026-10-27
supersedes: []
superseded_by: []
related:
  - docs/PROJECT_INDEX.md
  - docs/IQS_DSL_CARD_SSOT_DESIGN.md
  - docs/IQS_CHART_MCP_DESIGN.md
  - docs/flow/README.md
  - docs/flow/review/FLOW_AUDIT_FINDINGS.md
  - docs/design/UI_REFINEMENT_LOG.md
---

# 全栈工程深度审计与 MCP 双模分层渲染架构设计及实施全记录（R26）

| 标签 | 值 |
| :--- | :--- |
| **轮次** | R26（承接 R1–R25 / `AUD-001..158`，本轮登记 `AUD-159..164`） |
| **软件版本** | `V3.5.3-ildr`（`chengju-iqs`） |
| **出品** | 江西省上饶市烟草专卖局（公司）信息中心 · 鹿溪联合创新实验室（LUXI Lab） |
| **性质** | 全栈代码深度审计报告 + MCP 渲染引擎架构重塑设计 + Phase 1–4 实施与实测验收全记录 |

---

## 0. 背景与目标

在完成 P6 卡片单一真源（SSOT，55 张 `.card.ts`）、UI 范式精修（`R-UI-01..33`）、IQS-Flow 混合正交路由内核（R18–R24，206 项断言）以及 MCP 容器化初步改造（R25，`AUD-155..158`）后，针对全仓代码与最新 Markdown 文档体系开展了**全栈工程深度审计**，并重点围绕一个核心架构命题进行了系统性论证与工程改建：

> **核心命题**：「MCP 服务全部通过每次冷启动无头浏览器（Puppeteer + URL 传参）的方式进行图表渲染是否合适？是否存在更加直接、工程化且优雅的架构？」

本文档完整记录本次**深度审计发现（12 项缺陷）**、**MCP 渲染架构技术评估**、**双模分层渲染引擎（Dual-Mode Tiered Rendering Engine）设计方案**以及 **Phase 1–4 代码实施与实测验收全过程**。

---

## 1. 全栈工程深度审计发现（Audit Findings）

对照 `docs/PROJECT_INDEX.md`、`docs/IQS_DSL_CARD_SSOT_DESIGN.md`、`docs/IQS_DSL_V1_SPEC.md`、`docs/design/UI_REFINEMENT_LOG.md` 与 `docs/flow/review/FLOW_AUDIT_FINDINGS.md`，审计共定位 **4 个等级、12 项具体工程问题**：

### 1.1 🔴 P0 — 阻断性缺陷与安全问题

| 审计编号 | 位置 | 问题描述与根因 | 影响 |
| :--- | :--- | :--- | :--- |
| **AUD-159** | `Dockerfile:54-56` vs `mcp-server/index.js:13` | **Docker 生产镜像漏拷 `mcp-server/linters.js` 导致容器 100% 启动崩溃**：R25（`AUD-158`）在 `mcp-server/index.js` 顶层新增了 `import { getToolLinter, ... } from "./linters.js"`，但 `Dockerfile` Stage 2 只执行了 `COPY mcp-server/index.js ./mcp-server/`，未拷贝 `linters.js`。 | 生产容器启动即抛 `ERR_MODULE_NOT_FOUND` 退出，MCP SSE 服务完全不可用。 |
| **AUD-160** | `docs/flow/review/FLOW_AUDIT_FINDINGS.md:842, 1036` | **审计台账含本机私有绝对路径与 Markdown 表格语法断裂**：R25 章节硬编码了 `file:///Users/kwangwah/.gemini/...` 本机路径；第 842 行表头与第 897 行表格体之间被硬插入整节 `## R21`，导致表格结构破损。 | 公开仓库与软著材料泄露本地开发路径；文档渲染错乱。 |

### 1.2 🟠 P1 — 架构分裂、协议误导与性能瓶颈

| 审计编号 | 位置 | 问题描述与根因 | 影响 |
| :--- | :--- | :--- | :--- |
| **AUD-161** | `mcp-server/index.js:259-291, 375-442` | **MCP 协议层残留硬编码错误范式与三倍重复拼接**：<br>1. `getToolDslDescription()` 手写了 `switch (kind)`，其中 `pareto` 与 `control` 错误示范了 `Data:\n 缺陷A: 40` 和 `Data: 10, 12`（IQS-DSL v1 实际为 `- 缺陷A: 40` 和 `[series]...[/series]`），直接误导 LLM 产出非法 DSL。<br>2. `buildFullProtocolDoc()` 在有 `agentDoc` 和 `master` 时输出两个 `## 二、`，且将同一份语法表和官方示例在 `rawSegment`、`official_example`、`promptDoc` 中重复拼接了 3 遍。<br>3. `resolveBaseUrl()` 直接取 `req.host`，而根 `package.json`（Express 4，`req.host` 不含端口）与 `mcp-server/package.json`（Express 5，`req.host` 含端口）版本不一致，导致非标端口反代地址解析分叉。 | 1. LLM 按 schema 描述写 `pareto`/`control` 必败；<br>2. `read_protocol` 浪费 ~40% 上下文 Token；<br>3. 本地与容器图片 URL 端口行为不一致。 |
| **AUD-162** | `App.tsx:113-343` vs `components/*Editor.tsx` | **前端解析器双源分裂（5 个核心组件在 `App.tsx` 维护阉割版内联解析器）**：`Fishbone`、`Pareto`、`Histogram`、`Scatter`、`Affinity` 在 `App.tsx` 中未使用各 `*Editor.tsx` 导出的标准 `parse*DSL`，而是手写了 230 行旧版 `parseInitial*`。 | MCP 无头渲染走 `App.tsx` 时：<br>• 鱼骨图 4 级及以上节点（`####`）全部丢失，`Color[Line]` 绑错槽位；<br>• 散点图 `Show3D:`、`ShowValues:` 失效；<br>• 排列图 `Font[...]`、`ShowValues:` 及小数频数全部丢失。 |
| **AUD-163** | `mcp-server/linters.js:54-65` | **MCP 前置 Linter 覆盖面不对称**：`linterRegistry` 仅挂载了 `render_flow`，其余 13 个 CORE 图表无前置语法拦截。 | 当 LLM 向 `render_pareto`、`render_control`、`render_affinity` 等传入非法语法（如把亲和图写成 `#` 树）时，MCP 不报错而是启动 Chromium 截白图返回，丧失自愈闭环。 |
| **AUD-164** | `mcp-server/index.js:118-203` & `App.tsx:620-655` | **MCP 全量冷启动无头浏览器架构瓶颈**：每次工具调用均重新 `puppeteer.launch()` + `browser.close()`，通过 URL Query `?dsl=${encodeURIComponent(dsl)}` 传参，且串联死等 `networkidle0` + `App.tsx` `500ms` + MCP `500ms`。 | 1. 单次出图耗时长达 2.5s–6.0s；<br>2. 纯函数 `flow`（120ms 即可算完 SVG）被迫拉起 300MB 浏览器；<br>3. 复杂 DSL 超长触发 URL 截断；<br>4. 并发调用极易导致容器 OOM。 |

### 1.3 🟡 P2 / 🟢 P3 — UI 范式尾项与仓库卫生

1. **`FlowEditor.tsx` 未闭环项**：
   - 错误提示条 `error` / `warnings` 仍嵌在 `activeTab === 'dsl'` 内部（违反 `R-UI-29` 内容区顶部全 Tab 可见原则）；
   - 重置按钮未接入 `<ConfirmInline>` 二次确认（违反 `R-UI-08`）；
   - 手动录入面板节点属性写死 `SOP` 与 `Role` 两个输入框，未与 `Attr active` 动态联动（`FLOW_PANEL_MATH_DOCKER_REVIEW.md` §4 待办项）。
2. **`App.tsx` 外壳与死代码残留**：
   - 右上角头像硬编码外网 `https://api.dicebear.com/...`，内网离线环境必破图；
   - 底栏「导出原始数据 (CSV)」为无 `onClick` 的假按钮（Dead UI）；
   - 顶栏/底栏/导出弹窗残留 `text-[8px..10px]`（违反 `R-UI-06` 11px 下限）与 `blue-600`（未归位 `primary` 鹿溪绿）；
   - `components/EditorPanel.tsx`（100 行）与 `components/flow/GuardedShift.ts`（316 行）为 0 调用死文件。
3. **构建与依赖卫生**：
   - `Dockerfile` 未设 `PUPPETEER_SKIP_DOWNLOAD=true`，构建期重复下载 Chrome；
   - `.dockerignore` 未忽略 `build/`、`.reasonix/`、`mcp-server/renders/`、`*.bak`；
   - `package.json` 含零引用的 `@google/genai`、`recharts`；
   - `.github/workflows/ci.yml` 未纳入 `check:cards-fresh` 与 `validate:cards`。

---

## 2. 核心架构论证：MCP 通过无头浏览器渲染是否合适？

### 2.1 全仓 16 类图表底层渲染技术栈盘点

通过对 `components/*Diagram.tsx` 的逐一源码剖析，全项目 16 类图表（14 CORE + 2 RELIEF）按底层渲染机制可分为五组：

| 分组 | 图表类型（kind） | 底层实现机制 | 是否强依赖真实浏览器 DOM / WebGL？ |
| :--- | :--- | :--- | :--- |
| **A 组：纯函数 SVG** | **`flow`**（企业流程图） | `flowToSVG(data, styles): string`（**100% 纯 TS 函数**，零 React/DOM 依赖） | ❌ **完全不依赖！** Node 进程内直接算出完整 `<svg>` 字符串 |
| **B 组：JSX `<svg>`** | `matrix`、`matrixPlot`、`radar`、`arrow` | React 组件拼装 `<svg><g><rect><text>`，字宽走 `utils/textMetrics.ts` 纯数学估算 | ❌ **不依赖浏览器布局引擎**（仅用 JSX 作模板） |
| **C 组：原生 Canvas 2D** | `affinity`、`control` | 纯手写 `ctx.fillRect / arc / fillText / stroke` | ❌ **不依赖 DOM**（标准 Canvas 2D API） |
| **D 组：ECharts 2D** | `pareto`、`histogram`、`scatter`(2D)、`basic` | `echarts` 5.5 | ❌ **不依赖 DOM**（ECharts 5.3+ 支持 `ssr: true` + `renderToSVGString()`） |
| **E 组：重度 DOM / WebGL** | `fishbone`、`relation`、`pdpc`（`@antv/g6` v5）<br>`scatter`(3D)（`echarts-gl`）<br>`mermaid`、`vchart`（救济层） | G6 Canvas/DOM 图引擎、Mermaid `getBBox()` DOM 测量、VChart、WebGL | ✅ **强依赖浏览器环境** |

### 2.2 为什么“全量冷启动无头浏览器”不合理，但“一刀切废除浏览器”也不可行？

1. **为什么全量冷启动 Puppeteer 不合理？**
   - **算力错配**：`flow` 在 Node 内存里执行 `parseFlowDSL` + `flowToSVG` 只需 **~120ms**，却为了转成 PNG 而去冷启动一个 300MB 的 Chromium、通过 HTTP GET 加载 7MB 的前端 Bundle、再死等 1.5s 的 `setTimeout`。
   - **Web 端强耦合**：即使只用 `render_flow`，也必须先启动 `:12000` 的 Vite Web 服务器，否则 MCP 报 `ERR_CONNECTION_REFUSED`。
   - **URL 传参天花板**：`?dsl=${encodeURIComponent(dsl)}` 在大型流程图或矩阵图下易突破 URL 长度限制。
2. **为什么不能一刀切废除无头浏览器？**
   - E 组图表（`@antv/g6` 的鱼骨图/关联图/PDPC、`mermaid` 19 种方言、`vchart` 19 种图表、`echarts-gl` 3D 散点图）深度依赖浏览器 DOM 树测量（如 `SVGElement.getBBox()`）与 Canvas/WebGL 上下文。若在 Node 端用 `jsdom` 模拟，Mermaid 和 G6 会因缺少真实排版盒模型而布局坍塌。

### 2.3 最优雅的工程解：双模分层渲染引擎（Dual-Mode Tiered Rendering Engine）

结合两者优势，我们设计并落地了 **Tier-1（Node 进程内原生 SVG 直出） + Tier-2（常驻 Browser 连接池 + Warm-Page 内存态 IPC 桥接）** 的双模分层架构：

```text
                        MCP CallTool: render_<kind>(dsl, width, height)
                                              │
                                              ▼
                     ┌─────────────────────────────────────────────────┐
                     │     第 1 层：统一前置语义与语法诊断管道           │
                     │   mcp-server/linters.js + lib/flow_lint.mjs     │
                     │   覆盖全部 14 个 CORE 图表（毫秒级拦截 + 自愈）   │
                     └────────────────────────┬────────────────────────┘
                                              │ 校验通过
                                              ▼
                     ┌─────────────────────────────────────────────────┐
                     │          第 2 层：双模分层渲染路由器              │
                     └───────────┬─────────────────────────┬───────────┘
                                 │                         │
            [Tier-1 原生直出通道] │                         │ [Tier-2 常驻热页 IPC 通道]
          (flow，零 Web 服务依赖)  │                         │ (G6 / ECharts / Mermaid / VChart)
                                 ▼                         ▼
        ┌────────────────────────────────────┐   ┌─────────────────────────────────────┐
        │ 1. 进程内调用 renderFlowSVG(dsl)   │   │ 1. 复用单例常驻 Browser + WarmPage   │
        │    (含同请求 LRU 缓存，免二次解析) │   │    (前端 Bundle 仅在启动时加载 1 次)│
        │ 2. 极速光栅化 rasterizeSvgString   │   │ 2. page.evaluate 调用内存桥接函数： │
        │    • 优先 @resvg/resvg-js (Rust)   │   │    window.renderIQSChart(payload)   │
        │    • 或常驻单页轻量 Canvas 光栅化  │   │    (无 URL 长度限制，自适应帧等待)  │
        └────────────────┬───────────────────┘   └──────────────────┬──────────────────┘
                         └────────────────────┬─────────────────────┘
                                              ▼
                     ┌─────────────────────────────────────────────────┐
                     │     第 3 层：产物输出（Stdio Base64 / SSE URL）  │
                     └─────────────────────────────────────────────────┘
```

---

## 3. 四阶段详细实施过程（Implementation Log）

### Phase 1：容器止血、依赖瘦身与文档修复

1. **`Dockerfile` 修正**：
   - 在 `builder` 和 `production` 两阶段顶部加入 `ENV PUPPETEER_SKIP_DOWNLOAD=true`，并在 `production` 阶段设置 `ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`。
   - 在 `production` 阶段第 59 行补齐 `COPY mcp-server/linters.js ./mcp-server/`。
2. **`docker-entrypoint.sh` 就绪探针改造**：
   - 移除原有的固定 `sleep 5`，改为最多 30 次（每次 0.5s）的 Node `fetch('http://127.0.0.1:${WEB_PORT}')` 轮询探针，Web 就绪后立即以 `exec npm run start:sse` 启动 MCP。
3. **`.dockerignore` 与 `package.json` 清理**：
   - `.dockerignore` 新增 `build`、`.reasonix`、`*.bak`、`mcp-server/renders`、`output`。
   - `package.json` 移除未使用的 `@google/genai`、`recharts`，将 `eslint` 移入 `devDependencies`。
   - 删除仓库冗余文件 `mcp-server/mcp_tools.json.bak`（1,266 行）与 `mcp-server/test_fishbone.png`。
4. **`docs/flow/review/FLOW_AUDIT_FINDINGS.md` 修复**：
   - 将第 842–897 行被 `## R21` 截断的「修复优先级建议（累计）」表格完整闭合；
   - 移除 R25 中指向 `/Users/kwangwah/.gemini/...` 的本机绝对路径链接。

---

### Phase 1b：MCP 协议层单一真源化与去重（`mcp-server/index.js`）

1. **`getToolDslDescription(tool)` 彻底源自 L0 真源**：
   - 废除原先手写的 `switch (kind)`，改为从 `tool.official_example` 自动提取前 4 行非注释代码生成 `范式: ...`，从根源上消除了 `pareto` 与 `control` 中误导大模型的 `Data:` 示例。
2. **`buildFullProtocolDoc(tool, allTools)` 去重与动态编号**：
   - 引入 `const CN_NUM = ["一", "二", "三", "四", "五", "六"]` 与 `nextSec()`，确保无论是否存在 `agentDoc`（编译卡）或 `master`（家族总纲），输出的章节标题序号严格递增（消除两个 `## 二、`）。
   - 剥离 `rawSegment` 末尾的生成物维护声明，并在 `rawSegment` 已含 `## 3. 官方示例` 时不再重复粘贴整段示例；同时将 `promptDoc` 在 `\n## 范式` 处截断，仅保留「目标 + 生成要点 + 输出红线」，彻底消除了语法表和官方示例的三倍重复。
3. **`resolveBaseUrl(req)` 跨版本兼容**：
   - 显式读取受信任代理的 `x-forwarded-host` 首跳或 `req.get("host")`（保留端口号），兼容 Express 4 与 Express 5。

---

### Phase 2：前端解析器收敛与全量 14 CORE 前置 Linter

1. **`App.tsx` 解析器大一统（净删 ~220 行重复代码）**：
   - 在 `App.tsx` 中导入 `parseFishboneDSL`、`parseParetoDSL`、`parseHistogramDSL`、`parseScatterDSL`、`parseAffinityDSL`，替换原有的 5 个手写内联 `parseInitial*` 函数。
   - 在 `ParetoEditor.tsx` 中将数值正则从 `(\d+)` 升级为 `([\d.]+)`（支持浮点数频数/金额）；在 `AffinityEditor.tsx` 中补齐对 `//` 和 `#` 注释行的过滤。
   - 删除不可达的死组件 `components/EditorPanel.tsx`（100 行）与已停用的 `components/flow/GuardedShift.ts`（316 行，将 `T2Stats` 接口内联至 `ExcelLayout.ts` 保持向后兼容）。
2. **全量 14 CORE 前置校验（`scripts/flow_lint_core.ts` & `mcp-server/linters.js`）**：
   - 在 `scripts/flow_lint_core.ts` 中新增 `lintCoreKind(kindRaw, dslRaw)`：首先调用 `dsl/index.ts` 的 `lintDsl(kind, text)` 校验 Shell 层（`Title:`、`Type:` 枚举值域、`Color[Slot]` 合法性、`affinity` 禁 `#` 树），随后按 13 个 CORE 图表的 Body 代数类型逐一校验核心数据行（如 `fishbone` 必须有 `#` 标题、`pareto` 必须有 `- name: val`、`control` 必须有 `[series]...[/series]`、`radar` 必须有 ≥3 个 `Axis:` 与 ≥1 个 `Series:` 等），并生成针对性的 `fixHints`。
   - 在 `mcp-server/linters.js` 中为全部 14 个 CORE 工具（`render_flow`、`render_fishbone`、`render_affinity`、`render_pareto`、`render_histogram`、`render_control`、`render_scatter`、`render_radar`、`render_relation`、`render_arrow`、`render_pdpc`、`render_matrix`、`render_matrix_plot`、`render_basic`）统一注册前置 Linter。

---

### Phase 3：MCP 双模分层渲染引擎落地

1. **Tier-1 极速进程内直出（`scripts/flow_lint_core.ts` + `mcp-server/index.js`）**：
   - 在 `scripts/flow_lint_core.ts` 中导出 `renderFlowSVG(dsl)`（直接调用 `parseFlowDSL` + `flowToSVG` + `getSvgSize`，并内置单条目 LRU 缓存避免同一请求内 Linter 与 Renderer 重复解析计算），通过 `npm run build:mcp-lint`（`esbuild`）打包进 `mcp-server/lib/flow_lint.mjs`。
   - 在 `mcp-server/index.js` 中实现 `rasterizeSvgString(svgString, width, height)`：优先尝试加载 `@resvg/resvg-js`（Rust 原生光栅化），未安装时自动复用常驻 Browser 的单页 `rasterPage` 在内存 Canvas 中完成 3x PNG 光栅化，**全程无需启动或访问 `:12000` Web 前端服务**。
2. **Tier-2 常驻热页池与内存桥接（`App.tsx` + `mcp-server/index.js`）**：
   - 在 `App.tsx` 的 `isHeadless` 模式下挂载 `window.renderIQSChart(payload)`：接收 `{ type, dsl, width, height, pixelRatio, backgroundColor }`，直接在内存态调用 `applyHeadlessPayload(type, dsl)` 更新 React 状态，经双 `requestAnimationFrame` + 自适应稳定等待（同步 SVG/Canvas 图表 40ms，G6/Mermaid/VChart 异步图表 220ms）后调用 `captureIQSChart` 返回 DataURL。
   - 在 `mcp-server/index.js` 中维护单例 `getSharedBrowser()`、`getWarmPage()` 与串行互斥队列 `renderQueue`：首次 Tier-2 请求预热一次 `/?mode=headless`，后续所有 Tier-2 请求直接通过 `page.evaluate((params) => window.renderIQSChart(params), ...)` 在毫秒级完成渲染，并在旧版前端下自动回退至冷加载模式。

---

### Phase 4：UI 范式收口与 CI 门禁闭环

1. **`components/flow/FlowEditor.tsx` 精修**：
   - 将 `error`（带关闭按钮与 `role="alert"`）和 `warnings` 横幅移至三 Tab 共享滚动区顶部（符合 `R-UI-29`）；
   - 重置按钮接入 `<ConfirmInline>` 组件（符合 `R-UI-08`）；
   - 手动录入面板新增「属性标注 `Attr active`」六键（`Role / SOP / Lv / Time / KPI / M`）多选芯片，点击即同步更新 DSL 的 `Attr active [...]` 行，且下方每个节点的属性输入框随激活项动态增减。
2. **`App.tsx` 视觉与离线合规精修**：
   - 移除右上角外网 `https://api.dicebear.com/...` 头像，替换为本地 `/brand/luxi-lab.svg`（暗色模式自动切换 `/brand/luxi-lab-inverse.svg`）；
   - 将底栏无响应的假按钮改为「导出分析报告 (PDF)」与「配置高清导出 (PNG)」真实动作按钮；
   - 将侧栏副标题、画布顶栏/底栏、导出弹窗中的 `<11px` 字号与 `blue-600` 全面归位至 `11px` 与 `primary`（鹿溪绿）。
3. **CI 门禁补齐（`.github/workflows/ci.yml`）**：
   - 新增 `npm run check:cards-fresh && npm run validate:cards` 步骤，确保 L0 真源卡片、114 个生成物、206 项 Flow 断言与全量构建在 CI 中形成完整闭环。

---

## 4. 量化验证与性能对比

### 4.1 改造前后关键指标对比

| 指标维度 | 改造前（R25 基线） | 改造后（R26 实测） | 提升幅度 / 效果 |
| :--- | :--- | :--- | :--- |
| **Docker 容器启动** | 缺 `linters.js` 抛 `ERR_MODULE_NOT_FOUND` 崩溃 | 镜像内文件齐全 + HTTP 探针优雅就绪 | **P0 阻断缺陷清零** |
| **MCP 前置语法拦截覆盖率** | 仅 `1 / 14` CORE 图表（仅 `flow`） | **`14 / 14` CORE 图表（100% 覆盖）** | 13 个统计/逻辑图具备毫秒级自愈报错 |
| **`read_protocol("flow")` 体积** | ~23,200 字符（含 3 遍重复示例与错乱序号） | **14,681 字符**（章节 `一..五` 严格递增） | **节省 ~37% 上下文 Token** |
| **`render_flow` 热态渲染耗时** | ~3,500ms（每次冷启 Chromium + 访问 `:12000`） | **~270ms**（Tier-1 进程内 SVG + 常驻单页光栅化） | **提速 ~13 倍，且零 Web 服务依赖** |
| **Tier-2 图表热态渲染** | ~3,000ms + URL 长度受限（GET 传参） | **~300ms** + CDP 内存直传（无长度限制） | **提速 ~10 倍，消灭 HTTP 414 风险** |
| **`App.tsx` 重复解析代码** | 5 套手写阉割版内联解析器（230 行） | **0 行内联重复**（100% 委托 `*Editor.tsx`） | 交互态与无头态解析结果 100% 一致 |

### 4.2 全量门禁执行记录

```text
1. npx tsc --noEmit          → EXIT=0 (0 errors)
2. npm run check:cards-fresh → PASS (114 个产物文件与 L0 真源完全同步)
3. npm run validate:cards    → PASS (55 张卡片 0 error)
4. npm run validate:dsl      → PASS (14 份官方示例 lint + 14 份契约断言 0 error)
5. npm run test:flow         → PASS (206 pass / 0 fail：parser 66 + svg 85 + bpmn 17 + mainline 8 + cell_order 8 + alignment 7 + geometry 15)
6. npm run build             → PASS (build:mcp-lint esbuild + vite build 全部成功)
```

---

## 5. 改动文件清单（20 个文件）

| 类别 | 文件路径 | 改动性质 |
| :--- | :--- | :--- |
| **MCP 核心与双模渲染** | `mcp-server/index.js` | Tier-1/Tier-2 双模渲染引擎、常驻 Browser/Page 池、协议去重与动态序号、`getToolDslDescription` L0 真源化、`resolveBaseUrl` 端口兼容 |
| **MCP 前置校验管道** | `scripts/flow_lint_core.ts` | 新增 `lintCoreKind`（14 CORE 图表校验）与 `renderFlowSVG`（带 LRU 缓存） |
| **MCP 前置校验管道** | `mcp-server/linters.js` | 注册表扩展至全部 14 个 CORE 图表，导出 `loadCoreBundle` |
| **前端主入口与热桥接** | `App.tsx` | 删除 5 个内联重复解析器、实现 `window.renderIQSChart` 内存桥接、移除外网 `dicebear` 头像、归位 LUXI 视觉令牌 |
| **组件编辑器精修** | `components/flow/FlowEditor.tsx` | 错误条置顶、`ConfirmInline` 接入、`Attr active` 六键动态属性面板 |
| **组件解析器增强** | `components/ParetoEditor.tsx` | `parseParetoDSL` 支持浮点数数值解析 |
| **组件解析器增强** | `components/AffinityEditor.tsx` | `parseAffinityDSL` 补齐 `//` 与 `#` 注释行跳过 |
| **Flow 布局类型收敛** | `components/flow/ExcelLayout.ts` | 内联 `T2Stats` 类型定义，解除对死文件的引用 |
| **死文件与残留清理** | `components/EditorPanel.tsx` | 删除（0 引用不可达旧组件） |
| **死文件与残留清理** | `components/flow/GuardedShift.ts` | 删除（已停用的旧 T2 位移代码） |
| **死文件与残留清理** | `mcp-server/mcp_tools.json.bak` · `mcp-server/test_fishbone.png` | 删除（构建备份与测试残留） |
| **容器与 CI 工程** | `Dockerfile` · `docker-entrypoint.sh` · `.dockerignore` · `package.json` · `.github/workflows/ci.yml` | 补齐 `linters.js`、`PUPPETEER_SKIP_DOWNLOAD`、HTTP 就绪探针、依赖瘦身、CI 接入卡片门禁 |
| **文档与索引** | `CHANGELOG.md` · `README.md` · `docs/flow/review/FLOW_AUDIT_FINDINGS.md` · `docs/PROJECT_INDEX.md` | 同步 R26 审计台账、修复表格断裂与路径泄露、更新总索引 |

---

## 6. 后续运维与开发实操速查手册（Runbook & Cheat Sheet）

### 6.1 日常开发与构建门禁命令

```bash
# 1. 重新生成 L0 卡片真源的全部下游产物（mcp_tools.json / protocol/* / constants.tsx / cardDocs.ts）
npm run build:cards

# 2. 检查卡片生成物是否与 L0 真源一致（CI 必跑）
npm run check:cards-fresh

# 3. 执行 55 张卡片的五道门禁（结构 + 真解析器 + 语义契约 + 同名对照 + 产物）
npm run validate:cards

# 4. 执行 DSL v1 规范与 14 张 CORE 卡片契约断言
npm run validate:dsl

# 5. 执行 IQS-Flow 引擎 7 段 206 项几何/拓扑/解析/BPMN 断言
npm run test:flow

# 6. 单独打包 MCP 共享内核（scripts/flow_lint_core.ts -> mcp-server/lib/flow_lint.mjs）
npm run build:mcp-lint

# 7. 全链路生产构建（串联 validate:dsl + test:flow + sync-tools + build:mcp-lint + vite build）
npm run build
```

### 6.2 如何将新图表从 Tier-2（热页浏览器）升级至 Tier-1（Node 进程内直出）

当前 **`flow`（IQS-Flow）** 已跑通 Tier-1 进程内直出通道。后续若需将 **B 组（`matrix` / `radar` / `arrow`）** 或 **D 组（`pareto` / `histogram` / `basic` ECharts SSR）** 迁入 Tier-1，只需 3 步：

1. **在 `scripts/flow_lint_core.ts` 中导出纯 SVG 生成函数**：
   ```ts
   // 示例：为雷达图或 ECharts SSR 导出纯字符串渲染器
   export function renderKindSVG(kind: string, dsl: string): { svg: string; width: number; height: number } | null {
     if (kind === 'flow') return renderFlowSVG(dsl);
     // 后续在此扩展 matrix / radar / echarts SSR
     return null;
   }
   ```
2. **运行 `npm run build:mcp-lint`**：
   `esbuild` 会自动将依赖树打包进 `mcp-server/lib/flow_lint.mjs`。
3. **`mcp-server/index.js` 自动接管**：
   `renderChart()` 检测到 `coreMod.renderKindSVG` 返回非空 SVG 后，直接交由 `rasterizeSvgString()` 光栅化为 3x PNG，无需改动任何 MCP 协议层代码。

### 6.3 容器化与反向代理环境变量速查

| 环境变量 | 默认值 | 作用说明 |
| :--- | :--- | :--- |
| `API_KEY` | 空 | 前端 AI 推理使用的 OpenAI 兼容接口密钥（容器启动时由 `docker-entrypoint.sh` 注入 `dist/config.js`） |
| `AI_ACTIVE_PROFILE` | `deepseek_public` | 对应 `public/config.json` 中的模型档案名（如 `deepseek_public` / 内网 `qwen`） |
| `WEB_PORT` | `12000` | 容器内前端 Vite Preview 监听端口 |
| `PORT` | `12001` | MCP Server SSE 监听端口 |
| `IQS_BASE_URL` | `http://localhost:12000` | Tier-2 热页池访问的前端基准地址 |
| `IQS_SERVER_PUBLIC_URL` | 自动推导 | 外部客户端访问 `/renders/*.png` 的公网/反代基准 URL（如 `https://iqs.example.com`） |
| `IQS_TRUST_PROXY` | `loopback, linklocal, uniquelocal` | Express `trust proxy` 策略（多级反代可设为跳数 `1`、`2` 或 `true`） |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium`（容器内） | 指定系统 Chromium 路径，配合 `PUPPETEER_SKIP_DOWNLOAD=true` 免下载 |

