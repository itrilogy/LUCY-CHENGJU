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
