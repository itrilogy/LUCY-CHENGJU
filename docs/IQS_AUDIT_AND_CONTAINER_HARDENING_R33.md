---
doc_id: IQS-AUDIT-AND-CONTAINER-HARDENING-R33
title: 全仓深度代码审计、双轨密钥隔离、单进程双端口容器加固与按需分包工程记录（R33）
project: 澄矩 · ChengJu (IQS)
version: v1.0
domain: ENGINEERING
type: LOG
authority: L2
freshness: 🟢现行
first_commit: 2026-10-30
last_commit: 2026-10-30
supersedes: []
superseded_by: []
related:
  - docs/PROJECT_INDEX.md
  - docs/IQS_MCP_DESIGN_DUAL_ENGINE_AUDIT_R26.md
  - docs/IQS_MCP_ENGINE_HARDENING_R27.md
  - docs/IQS_SVG_DE_G6_ENGINEERING_LOG_R30.md
  - mcp-server/api.js
  - mcp-server/index.js
  - services/aiService.ts
  - components/AIModelManagerModal.tsx
  - dsl/parsers.ts
  - App.tsx
  - vite.config.ts
  - Dockerfile
  - docker-compose.yml
  - docker-entrypoint.sh
---

# 全仓深度代码审计、双轨密钥隔离、单进程双端口容器加固与按需分包工程记录（R33）

| 标签 | 值 |
|:--|:--|
| **轮次** | **R33**（对应发行版本 `V3.6.3-ildr`，登记并闭环审计台账 `AUD-195..202`） |
| **覆盖域** | 安全架构（零前端密钥泄漏）· 容器化生产运行时（单进程双端口 + 非 root + Tini）· 首屏性能分包 · 供应链依赖治理 |
| **提交日期** | 2026-10-30 |

---

## 1. 背景与预审勘误台账（`AUD-195..202`）

本轮针对全仓代码质量、功能设计实现与容器化部署配置开展了系统审计，并在正式动手前完成了二次工程预检勘误，确立以下 8 项核心整改项并全部闭环落地：

| 审计编号 | 等级 | 问题诊断与预审勘误结论 | 落地方案与对应模块 | 状态 |
|:--|:--:|:--|:--|:--:|
| **AUD-195** | P0 | 原容器入口通过 `npx vite preview &` 后台启动前端预览且与 `:12001` 双进程脱节，同时将 ~500MB 前端构建依赖带入生产镜像；若直接合并为单端口则会破坏 `IQS_BASE_URL=:12000` 与 MCP `:12001` 既有拓扑 | **单进程双端口架构**：由 `mcp-server/index.js` 在同一 Node 22 进程内同时监听 `:12000`（`dist/` 静态托管 + SPA History Fallback + `/api/*` + `/healthz`）与 `:12001`（MCP `/sse` + `/messages` + `/renders` + `/api/*` + `/healthz`），彻底移除生产容器中的 `vite preview` 与根 `node_modules` | ✅ 已闭环 |
| **AUD-196** | P0 | 原 `vite.config.ts`、`public/config.js` 与 `docker-entrypoint.sh` 将 `API_KEY` 和 `IQS_ADMIN_PASSWORD` 直接暴露到浏览器 JS Bundle / `window.APP_CONFIG`；同时 R32 要求保留客户端浏览器直连本地 `127.0.0.1` Ollama / LM Studio 能力 | **双轨混合路由架构**：`source === "admin"` 全量走服务端 `POST /api/ai/chat` 与 `POST /api/ai/models` 代理（服务端按已注册 `profileId` 查表转发，杜绝 SSRF 与密钥下发）；`source === "client_cookie"` 保留浏览器端直连本地 `127.0.0.1` 模型服务 | ✅ 已闭环 |
| **AUD-197** | P1 | 开发态（`npm run dev`）与生产态（`mcp-server/index.js`）若各自实现 API 路由易产生行为漂移 | **同构零外部依赖中间件**：新建 `mcp-server/api.js`（仅依赖 Node 原生 `crypto` / `fs` / `path`），同时挂载于 `vite.config.ts`（`configureServer` / `configurePreviewServer`）与 `mcp-server/index.js` | ✅ 已闭环 |
| **AUD-198** | P0 | 原管理中心密码在前端明文比对，且管理员修改的全局大模型配置仅保存在当前浏览器 `localStorage`，容器重启或跨终端访问即丢失 | **服务端鉴权与原子持久化**：SHA-256 + `crypto.timingSafeEqual` 常量时间比对 + IP 级防暴力破解限流（5 分钟 10 次）+ HMAC-SHA256 签名 `HttpOnly; SameSite=Lax` 会话 Cookie；管理员配置原子写入 `data/ai_config.json`，前端仅接收 `hasApiKey` / `maskedKey` 脱敏视图，支持 `previousId` 改名平滑继承旧密钥 | ✅ 已闭环 |
| **AUD-199** | P0 | 原 `Dockerfile` 以 `root` 运行 Chromium、缺少 `tini` 僵尸进程回收、缺少中文字体 `fonts-noto-cjk`、`npm install` 未锁版本、无 `HEALTHCHECK` 与 `shm_size` 配置 | **生产容器全面加固**：多阶段 `npm ci` + `tini`（PID 1）+ `fonts-noto-cjk` + 非特权用户 `appuser (10001:10001)` + 可配 `IQS_CHROMIUM_NO_SANDBOX` + `shm_size: 512mb` + `no-new-privileges:true` + 双端口 `/healthz` 健康探针 + `iqs-data` / `iqs-renders` 双持久化卷 | ✅ 已闭环 |
| **AUD-200** | P1 | 原 `App.tsx` 顶层静态导入全部 16 个 `*Diagram`、16 个 `*Editor` 及重型图形库（`echarts`、`echarts-gl`、`@visactor/vchart`、`mermaid`、`jspdf`），导致首屏单包膨胀；但直接改 `React.lazy` 需防止 Headless 截帧 `diagramRef` 未挂载竞态 | **纯解析器解耦 + 路由级分包 + Headless 挂载门闩**：抽离纯函数解析器至 `dsl/parsers.ts`（各 `*Editor.tsx` 保留重导出以 100% 兼容 `assert_card_contracts.ts` / `validate_cards.ts`）；32 个图表/编辑器组件全量 `React.lazy` + `<Suspense>` + `<ErrorBoundary>`；`MermaidDiagram` 动态 `import('jspdf')`；`window.renderIQSChart` 与 `captureIQSChart` 增加 `waitForDiagramMount(5000)` 轮询门闩 | ✅ 已闭环 |
| **AUD-201** | P1 | `mcp-server/renders/render_*.png` 只增不减，长期运行存在磁盘写满风险 | **自动渲染快照 GC**：在 `mcp-server/index.js` 中按 `IQS_RENDER_TTL_HOURS`（默认 24h）与 `IQS_RENDER_MAX_FILES`（默认 500）启动时及定时清理过期 `render_*.png`，严格豁免 `.gitkeep` 与 `audit_*.png` | ✅ 已闭环 |
| **AUD-202** | P1 | 根 `package.json` 混装 `@modelcontextprotocol/sdk`、`express`、`cors`、`puppeteer` 与未使用的 `@visactor/react-vchart`，且 `mcp-server/package.json` 漏声明可选依赖 `@resvg/resvg-js`；CI 缺少容器构建与零密钥泄漏门禁 | **供应链收敛与 CI 门禁升级**：根 `package.json` 剥离 197 个后端/冗余子包，将 `@resvg/resvg-js` 归位至 `mcp-server/package.json` `optionalDependencies`；修复前后端锁文件 CVE；`.github/workflows/ci.yml` 新增 MCP 锁文件校验、`dist/` 零密钥扫描与 `docker build` 验证 | ✅ 已闭环 |

---

## 2. 关键架构变更说明

### 2.1 双轨大模型路由与服务端密钥隔离（`mcp-server/api.js` + `services/aiService.ts`）

```text
浏览器端
 ├─ source === "admin" (企业公共模型池)
 │    ├─ GET  /api/ai/config          ──► 返回脱敏配置（apiKey 恒为空，附带 hasApiKey / maskedKey）
 │    ├─ POST /api/admin/login        ──► timingSafeEqual 校验 + HttpOnly Cookie (iqs_admin_session)
 │    ├─ PUT  /api/admin/ai-config    ──► 原子持久化至 data/ai_config.json（留空自动保留既有密钥）
 │    ├─ POST /api/ai/models          ──► 服务端代拉远端 /models 列表
 │    └─ POST /api/ai/chat            ──► 仅接收 { profileId, prompt, systemInstruction }，服务端查表注入密钥转发
 │
 └─ source === "client_cookie" (个人浏览器私有模型 / 本地 Ollama & LM Studio)
      └─ 浏览器直连 127.0.0.1 / 自定义端点，配置仅存浏览器本地 Cookie + localStorage，不经过服务端落盘
```

### 2.2 单进程双端口生产容器拓扑（`Dockerfile` + `mcp-server/index.js`）

- **Stage 1 (`builder`)**：基于 `node:22-slim`，通过 `npm ci` 与 `npm run build` 执行全量 DSL 校验、几何数学不变量门禁（Fishbone / Relation / PDPC / Flow）、MCP Linter 打包与 Vite 分包构建，产出纯静态 `dist/`。
- **Stage 2 (`runner`)**：仅安装 `chromium`、`fonts-noto-cjk`、`tini` 及 `/app/mcp-server` 生产依赖（含可选原生 Rust 光栅化器 `@resvg/resvg-js`），以非特权用户 `appuser (10001:10001)` 运行 `tini -- /app/docker-entrypoint.sh`，由单个 Node 进程同时承载 `:12000` Web 工作台与 `:12001` MCP SSE 服务，进程内 Headless Chromium 直连本地回环 `http://localhost:12000/?mode=headless`。

### 2.3 纯 DSL 解析器抽离与按需分包（`dsl/parsers.ts` + `App.tsx` + `vite.config.ts`）

- `dsl/parsers.ts` 汇总全部 16 类图表的纯文本 DSL 解析器，零 React 依赖、零枚举值运行期副作用，支撑首屏状态初始化与 SSR 契约校验脚本。
- `vite.config.ts` 将重型第三方引擎拆分为独立缓存 Chunk：`vendor-echarts-gl`、`vendor-echarts`、`vendor-vchart`、`vendor-mermaid`、`vendor-pdf`、`vendor-react`，首屏访问仪表盘时不再下载任何重型图表渲染引擎。

---

## 3. 全项目系统审计结论归档（代码质量 · 功能实现 · 容器部署）

本章节正式落盘作为本次及后续全仓代码修订的**根本工程前提与技术判例**：

### 3.1 代码质量与架构分层维度
1. **分层清晰性与单向依赖**：
   - 协议与卡片真源层（`dsl/cards/*.card.ts`，L0 权威）定义指令集、正反例与测试契约；
   - 纯解析层（`dsl/parsers.ts`，L1 权威）负责文本到抽象语法树（AST）及数据结构的转换，严禁混入任何 React Hook、DOM 操作或全局副作用；
   - 渲染与交互层（`components/*Diagram.tsx`、`components/*Editor.tsx`）仅消费解析后的状态，并由 `App.tsx` 统一通过 `React.lazy` 与 `Suspense` 隔离；
   - 门禁守卫层（`scripts/assert_*_math.ts`、`scripts/validate_cards.ts`）守护几何数学不变量（G1–G7 保序、零穿刺、零重叠、行距必要式、剪刀错位、可读性缩放）。
2. **类型系统与隐式缺陷清零**：
   - 全仓根绝 `@ts-ignore` 滥用，所有对外暴露 Ref 均继承 `BaseDiagramRef`；
   - 补齐 `@types/react` 与 `@types/react-dom`，修复了 SVG 属性（如 `textAnchor`、`transparent`、`background`）等潜在类型漂移。

### 3.2 功能设计与安全实现维度
1. **大模型接入双轨路由与身份鉴权**：
   - 管理端企业模型池：服务端强制托管密钥，通过 SHA-256 + `crypto.timingSafeEqual` 防时序侧信道，结合 IP 5 分钟 10 次防暴力破解与 `HttpOnly; SameSite=Lax` 签名 Cookie 维持会话；
   - 本地私有模型池：支持 Ollama、LM Studio 等本机 `127.0.0.1` 端点直连，配置保留于本地浏览器，兼顾企业安全内控与开发者极客灵活性；
   - 转发防 SSRF 保护：`/api/ai/chat` 严格限制通过服务端已配置的 `profileId` 查表寻址，杜绝任意第三方外发代理攻击。
2. **无头 Chromium IPC 桥接防竞态**：
   - 在 SPA 代码动态按需加载场景下，外部无头浏览器对 `window.captureIQSChart` / `window.renderIQSChart` 的调用必须依托 `waitForDiagramMount(5000)` 轮询探针；
   - 工具切换时同步清理 `diagramRef.current = null`，杜绝旧图表实例残留污染截图。

### 3.3 容器化与部署配置维度
1. **生产环境单进程双端口原生架构**：
   - 废除生产容器内使用 `npx vite preview &` 的临时做法，由 Node 原生进程统一兼顾 `:12000`（Web + 静态 SPA + History Fallback + API）与 `:12001`（MCP SSE 协议 + 图像资源），彻底消除跨进程通信开销与多进程管理隐患；
   - 生产镜像体积剥离约 500MB 前端 devDependencies。
2. **运行期深度防御（Defense-in-Depth）**：
   - 强制以非特权普通用户 `appuser (10001:10001)` 运行容器主进程；
   - 挂载 `tini` 作为 PID 1 处理信号转发与无头 Chromium 僵尸进程回收；
   - 部署系统级中文字体包 `fonts-noto-cjk` 保障无头截图字形渲染一致；
   - 强制启用 `no-new-privileges:true` 与 `shm_size: 512mb`（保障无头浏览器共享内存充足）；
   - 双命名卷分离：`iqs-data`（配置持久化）与 `iqs-renders`（渲染产物及自动 TTL 垃圾回收）。

---

## 4. 改造前后核心指标与交付基线对比表

| 评估指标 | R33 改造前（基线） | R33 落地后（现状） | 改进效果 / 收益 |
| :--- | :--- | :--- | :--- |
| **容器生产依赖包数量** | 208 个（混装根 `package.json`） | 11 个（仅 `mcp-server/package.json`） | 依赖项减少 **94.7%**，排除构建期编译器等 ~500MB 冗余 |
| **依赖安全漏洞 (mcp-server)** | 19 个（含 critical / high） | **0 漏洞 (0 audit vulnerabilities)** | 生产容器完全达成零安全漏洞运行 |
| **依赖安全漏洞 (root)** | 54 个（含 50 个 high/critical） | **0 Critical / 0 High** | 彻底消除高危供应链漏洞风险 |
| **前端敏感变量暴露面** | `window.APP_CONFIG` 注入 API Key 与口令 | **绝对零敏感变量注入** | 通过自动化 CI 门禁正则扫描拦截 |
| **容器主进程权限** | `root (uid 0)` | **`appuser (10001:10001)`** | 遵循最小特权原则，防御容器逃逸 |
| **容器进程监管** | 无 init，`docker-entrypoint.sh` 后台挂 `&` | **`tini` (PID 1) 原生信号接管** | 彻底消除 Chromium 僵尸进程残留与优雅启停异常 |
| **生产运行时进程数** | 2 进程（`vite preview` + Node MCP） | **1 进程（Node 22 原生监听双端口）** | 消除端口抢占冲突，节省内存与 CPU 调度开销 |
| **前端主包体积与分割** | 单包静态全量打包（全部图表与引擎） | **32 个图表/编辑器全面按需分包** | 首屏主包大幅缩减，非当前使用图表不产生流量 |
| **Headless 截图稳定性** | 易与动态导入产生时序竞态 | **`waitForDiagramMount` 轮询门闩** | 彻底杜绝异步分包导致的偶发截图白屏 |
| **CI 自动化防御能力** | 仅基础测试脚本 | **新增前端零密钥泄漏扫描 + 容器构建校验** | 杜绝任何敏感配置进入构建产物和生产镜像 |

---

## 5. 端到端实测验证套件（`scripts/verify_r33_e2e.mjs`）

为保障 R33 架构改动不会在未来版本发生功能倒退，建立了配套的端到端自动化验证套件：
- **验证脚本**：[`scripts/verify_r33_e2e.mjs`](scripts/verify_r33_e2e.mjs)
- **覆盖流程**：
  1. 动态拉起独立双端口测试实例（`:13000` 与 `:13001`）；
  2. 验证 Web SPA 首页托管与前端路由 History Fallback；
  3. 验证公开 `/api/ai/config` 密钥脱敏有效性；
  4. 验证未授权访问拦截（401）与密码暴力破解限制；
  5. 验证正确密码认证及 `HttpOnly; SameSite=Lax` Cookie 签发；
  6. 验证带会话的配置更新与宿主机原子落盘（`data/ai_config.json`）；
  7. 验证 MCP 端口 SSE 协议双向握手、`initialize` 及 `read_protocol` 契约；
  8. 验证真实 Headless Chromium 对 `React.lazy` 组件加载、等待及完成 `render_fishbone` 渲染出图。

---

## 6. 后续维护红线与工程准则（永久生效）

1. **【红线 1 · 零敏感变量注入】**：严禁向前端构建产物（`dist/`）、公共静态文件（`public/config.js`）或前端全局变量（`window.APP_CONFIG`）注入任何服务端秘密变量（包括但不限于 API Key、管理员密码）。所有密钥持久化仅存留于服务端 `data/ai_config.json`。
2. **【红线 2 · 保持单进程双端口拓扑】**：生产容器坚决禁止恢复 `vite preview` 或任何形式的多进程反向代理模式，保持由 `mcp-server/index.js` 单进程原生承载 `:12000`（Web）与 `:12001`（MCP）的双端口架构。
3. **【红线 3 · 纯解析器与视图严格解耦】**：新增或修改任何专业图表的 DSL 解析器，必须置于 `dsl/parsers.ts` 或其无状态纯函数子模块中，严禁在解析器中依赖 React 生命周期或 DOM 全局状态；视图组件必须支持 `React.lazy` 懒加载。
4. **【红线 4 · Headless 异步挂载等待】**：任何供 MCP 或自动化爬虫截帧的渲染视图，必须严格受 `waitForDiagramMount` 或等效挂载探针守护，严禁对 DOM 挂载时序做任何同步可用性假设。
5. **【红线 5 · 容器非特权与最小依赖】**：生产镜像构建必须继承非特权用户 `appuser`、`tini` 守护进程及精简后的生产依赖树，任何新增生产依赖必须经过严格 CVE 审计方可入库。

