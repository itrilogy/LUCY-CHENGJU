---
doc_id: IQS-MCP-ENGINE-HARDENING-R27
title: MCP 双模渲染引擎稳定性加固与确定性渲染设计及实施（R27）
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
  - docs/IQS_MCP_DESIGN_DUAL_ENGINE_AUDIT_R26.md
  - docs/flow/review/FLOW_AUDIT_FINDINGS.md
  - docs/IQS_CHART_MCP_DESIGN.md
---

# MCP 双模渲染引擎稳定性加固与确定性渲染设计及实施（R27）

| 标签 | 值 |
| :--- | :--- |
| **轮次** | R27（承接 R26，本轮登记 `AUD-165..169`） |
| **软件版本** | `V3.5.3-ildr`（`chengju-iqs`） |
| **出品** | 江西省上饶市烟草专卖局（公司）信息中心 · 鹿溪联合创新实验室（LUXI Lab） |
| **性质** | 针对 R26 审计发现的短中期工程加固实施与架构深化设计 |

---

## 1. 背景与目标

在 R26 实现了「Tier-1（Flow 纯进程内直出） + Tier-2（常驻 Browser 热页 IPC 桥接）」双模分层架构后，全栈深度审计发现了以下潜在的生产运行风险与确定性缺陷：

1. **孤儿进程风险（AUD-165）**：MCP 服务常驻 Chromium 实例在接收到宿主退出信号（`SIGINT`/`SIGTERM`）或管道关闭时，缺乏清理钩子，容易导致 Chromium 孤儿进程驻留后台；
2. **队列挂死风险（AUD-166）**：Tier-2 内存桥接 `page.evaluate(renderIQSChart)` 默认无超时限制，一旦图表异步渲染或布局死循环，会导致串行队列 `renderQueue` 永久堵塞，引发后续所有请求雪崩；
3. **动画抓帧错位风险（AUD-167）**：G6 组件（如鱼骨图、关联图）在 `fitView` 中硬编码了 500ms 缓动平移动画，而无头等待时间仅为 220ms，且无头模式未全局禁用 CSS transition，存在截取位移中或半透明画面的不确定性；
4. **原生光栅化缺位（AUD-168）**：Tier-1 虽然绕过了 `:12000` Web 端，但由于缺少 `@resvg/resvg-js` 依赖，依然必须唤醒 Chromium 打开单页做 Canvas 光栅化，未完全达成极致纯 CPU 渲染；
5. **构建物新鲜度门禁缺失（AUD-169）**：`scripts/flow_lint_core.ts` 与打包产物 `mcp-server/lib/flow_lint.mjs` 在 CI 中缺少单向新鲜度校验门禁。

本方案针对上述 5 项问题，给出具体的短中期工程加固设计，并予以落地与实测验收。

---

## 2. 详细技术方案设计

### 2.1 模块一：Chromium 实例生命周期与优雅退出（Graceful Shutdown）

在 `mcp-server/index.js` 中建立全局退出资源清理机制：
- 捕获 `SIGINT`、`SIGTERM`、`SIGHUP` 以及进程 `exit` 事件；
- 异步注销并关闭常驻 Chromium 浏览器实例，清理 `warmPage` 与 `rasterPage`；
- 防止在 Stdio 客户端突然断开连接或 Docker 容器优雅终止时产生内存泄漏与孤儿进程。

```text
Host / Docker Stop (SIGTERM)
         │
         ▼
 ┌──────────────────────┐
 │ process.on("SIGTERM")│
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────────────────────────────┐
 │ 1. 标记 shuttingDown = true，拒绝新入队渲染     │
 │ 2. 等待当前进行中的单帧完成或 3s 超时强制中断   │
 │ 3. await browser.close() 彻底释放 Chromium    │
 │ 4. process.exit(0)                           │
 └──────────────────────────────────────────────┘
```

### 2.2 模块二：Tier-2 内存桥接熔断与自愈机制（IPC Circuit Breaker）

针对 `page.evaluate` 无默认超时的问题，引入硬超时包装器：
- 设置 12,000ms（12秒）硬超时截断机制；
- 若渲染超过 12 秒未返回，`Promise.race` 立即抛出超时异常；
- 触发超时后，立即将 `warmPagePromise = null`，异步尝试销毁并重新初始化 `warmPage`；
- 串行队列 `renderQueue` 正常捕获错误并前移，确保后续等待的请求不会被永久卡死。

### 2.3 模块三：绝对确定性渲染（Deterministic Rendering & Zero-Animation）

彻底消除动画、过渡缓动对截图画面的随机性干扰：
1. **全局 CSS 动画强制清零**：在无头模式注入的样式中，增加通用选择器规则，将所有伪元素与元素的 `animation-duration` 设为 `0s`、`transition-duration` 设为 `0s`；
2. **G6 图表组件无头自适应**：在 `FishboneDiagram.tsx`、`RelationDiagram.tsx` 等依赖 G6 的图表中，检测当前处于 `isHeadless` 模式时，将 `fitView` 的动画时长 `duration` 强制归零（`duration: 0`），使视口瞬时完成自适应对齐。

### 2.4 模块四：Tier-1 原生光栅化可选加速依赖（`@resvg/resvg-js`）

- 将 `@resvg/resvg-js` 引入为 `optionalDependencies`；
- 在具备 Rust/C++ 预编译二进制的环境下（如 macOS ARM64/x64、Linux x64/ARM64 容器），自动激活 `resvg` 原生渲染通道，耗时由 ~250ms 进一步缩短至 ~40ms；
- 在不具备编译环境的机器上，优雅降级为既有的常驻 Chromium 单页 Canvas 光栅化，保持 100% 兼容。

### 2.5 模块五：MCP 核心包新鲜度校验门禁（`check:mcp-lint-fresh`）

- 编写 `scripts/check_mcp_lint_fresh.ts`；
- 在 CI 流程中，比对临时生成的 `esbuild` 产物与仓库内 `mcp-server/lib/flow_lint.mjs` 的哈希值；
- 若开发者修改了 `scripts/flow_lint_core.ts` 却忘记执行 `npm run build:mcp-lint`，CI 门禁立即阻断，确保生成物不发生代码漂移。

---

## 3. 实施计划与里程碑

- **Phase A（短期加固）**：
  1. 落地 `mcp-server/index.js` 的优雅停机信号捕获与生命周期管理；
  2. 落地 `mcp-server/index.js` Tier-2 `evaluateWithTimeout`（12s 熔断）与热页重置；
  3. 落地 `iqs-headless-style` 全局动画清零与 `FishboneDiagram.tsx` G6 无头 `duration: 0`；
  4. 加固 `mcp-server/linters.js` 子进程执行容错。
- **Phase B（中期加固）**：
  1. 在 `package.json` 引入 `@resvg/resvg-js` 并测试原生加载；
  2. 编写 `scripts/check_mcp_lint_fresh.ts` 并挂载至 `package.json` 与 `.github/workflows/ci.yml`。
- **Phase C（验证与归档）**：
  1. 跑通全量门禁（`check:cards-fresh`, `validate:cards`, `validate:dsl`, `test:flow`, `build`）；
  2. 真实测试 Tier-1 与 Tier-2 动态出图；
  3. 登记工程日志与审计台账。
