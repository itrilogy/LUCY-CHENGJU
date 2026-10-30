---
doc_id: IQS-DEV-DEPS-OPTIMIZER-R34
title: 开发态 Mermaid / VChart 动态导入 504 故障根因分析与依赖预构建改进方案（R34）
project: 澄矩 · ChengJu (IQS)
version: v1.0
domain: ENGINEERING
type: DESIGN
authority: L2
freshness: 🟢现行
first_commit: 2026-10-30
last_commit: 2026-10-30
supersedes: []
superseded_by: []
related:
  - docs/IQS_AUDIT_AND_CONTAINER_HARDENING_R33.md
  - docs/PROJECT_INDEX.md
  - vite.config.ts
  - App.tsx
  - components/MermaidDiagram.tsx
  - components/VChartDiagram.tsx
---

# 开发态 Mermaid / VChart 动态导入 504 故障根因分析与依赖预构建改进方案（R34）

| 标签 | 值 |
|:--|:--|
| **轮次** | **R34**（针对 R33 / `AUD-200` 按需分包落地后暴露的开发态回归） |
| **状态** | 已实施并验证：`vite.config.ts` 增加 `optimizeDeps.include`，开发态 504 消除，生产分包无回退 |
| **影响面** | 仅 `npm run dev`（Vite 开发服务器 `:12000`）。生产构建 `dist/` 与容器运行时**不受影响** |
| **基准** | `docs/IQS_AUDIT_AND_CONTAINER_HARDENING_R33.md` |

---

## 1. 故障现象

组件页面切换到「Mermaid 流程图」与「VChart 业务图表」时，浏览器控制台报：

```text
Failed to fetch dynamically imported module:
  http://localhost:12000/components/MermaidDiagram.tsx?t=1793348434786
Failed to fetch dynamically imported module:
  http://localhost:12000/components/VChartDiagram.tsx
```

其余 14 类图表组件在同一套 `React.lazy` 机制下渲染正常。

---

## 2. 复现证据（对运行中的开发服务器实测）

开发服务器（PID 监听 `*:12000`）对两个组件文件本身返回正常：

| 请求 | 状态 | 体积 |
|:--|:--:|:--|
| `/components/VChartDiagram.tsx` | **200** | 35,417 B |
| `/components/MermaidDiagram.tsx` | **200** | 64,490 B |

Vite 已把这两个文件转译成对**预构建依赖**的导入，而这些预构建产物全部失败：

| 转译后引用的依赖 | 状态 |
|:--|:--:|
| `/node_modules/.vite/deps/@visactor_vchart_esm_vchart-all.js?v=8c627b03` | **504 Outdated Optimize Dep**（0 字节） |
| `/node_modules/.vite/deps/@visactor_vchart_esm_theme_builtin.js?v=646899df` | **504** |
| `/node_modules/.vite/deps/mermaid.js?v=e3c83e40` | **504** |
| `/node_modules/.vite/deps/html-to-image.js?v=b2d04ec3` | **504** |
| `/node_modules/.vite/deps/react.js?v=9dffa170` | **200**（对照，正常） |

504 来自 Vite 依赖优化器中间件（`vite/dist/node/chunks/dep-CkSfqg8D.js`）：当请求携带的 `?v=` 浏览器哈希与当前已提交元数据中的哈希不一致时，抛出 `ERR_OUTDATED_OPTIMIZED_DEP`，状态消息固定为 `Outdated Optimize Dep`，响应体为空。浏览器因此把整条动态 `import()` 判为失败。

磁盘上的预构建缓存印证了同一结论：`node_modules/.vite/deps/_metadata.json` 的 `optimized` 只登记了 `react`、`react-dom`、`react/jsx-dev-runtime`、`react/jsx-runtime` 四项，**mermaid 与 vchart 的产物从未落盘**。

---

## 3. 根因

### 3.1 直接原因：懒加载入口逃出了依赖扫描，触发「发现即过期」的重优化

R33 / `AUD-200` 把 32 个图表与编辑器组件全部改为 `React.lazy`（`App.tsx:96-129`）：

```ts
const MermaidDiagram = lazy(() => import('./components/MermaidDiagram').then(m => ({ default: m.MermaidDiagram })));
const VChartDiagram = lazy(() => import('./components/VChartDiagram'));
```

Vite 的依赖预构建分两步，而这两步对动态导入的处理不对称：

1. **启动扫描**（`scanImports` → `computeEntries`）默认只从 `**/*.html` 出发，用 esbuild 做**静态**导入图遍历。`React.lazy(() => import(...))` 是运行期动态导入，扫描器到不了 `MermaidDiagram.tsx` / `VChartDiagram.tsx`，也就发现不了 `mermaid`、`html-to-image`、`@visactor/vchart`。
2. **运行期爬取**在浏览器真正请求到这些模块时，才通过 `registerMissingImport` 把依赖登记为 `discovered`，并当场分配一个由「当前已知依赖 + 本次时间戳」算出的临时 `browserHash`，把这个哈希写进转译结果返回给浏览器。

随后 `onCrawlEnd` 发现「爬取到的依赖」与「扫描到的依赖」不一致（`scannerMissedDeps`），判定扫描结果过期并**整体重跑优化器**。重跑提交新元数据时重新计算 `browserHash`，于是浏览器手里那份 `?v=8c627b03` 立刻变成过期哈希，下一次取依赖即 504。

这一步还有个放大因素：只要重跑期间又有新依赖被发现（`newDepsDiscovered === true`），Vite 会 `processingResult.cancel()` 并推迟整页刷新，去等下一批。mermaid 的依赖图很宽（`mermaid.core.mjs` 内含 38 处动态 `import()`，其 chunk 再引出 `cytoscape`、`katex`、`d3`、`dompurify` 等），优化器容易在「优化 → 发现新依赖 → 取消 → 再优化」之间来回，浏览器侧则持续拿到 504。

### 3.2 为什么只有这两个组件

| 组件族 | 第三方依赖 | 依赖形态 | 开发态表现 |
|:--|:--|:--|:--|
| Pareto / Histogram / Scatter / Basic 等 | `echarts-for-react` → `echarts` | 单一入口、依赖图浅、预构建秒级完成 | 首次进入可能闪一次整页刷新，但很快收敛，**表现为正常** |
| Fishbone / Relation / PDPC / Flow / Radar / Matrix 等 | 无重型第三方引擎（自绘 SVG） | 不触发依赖优化 | 正常 |
| **MermaidDiagram** | `mermaid@11.17.2`、`html-to-image`，另有运行期 `import('jspdf')` | 入口 `dist/mermaid.core.mjs` 静态引入 `d3`、`dompurify`、`es-toolkit/compat`、`stylis`、`ts-dedent`，再加 130 个 chunk 与大量动态导入 | **504** |
| **VChartDiagram** | `@visactor/vchart@2.0.19` | 走深层路径 `esm/vchart-all.js` 与 `esm/theme/builtin`，扇出到全部图表类、标记与布局 | **504** |

也就是说，这不是组件代码或 DSL 解析的问题，而是**这两个依赖的预构建代价远超 Vite 默认「边发现边优化」机制的收敛窗口**。

### 3.3 已排除的怀疑

- **不是源码解析失败**。`@visactor/vchart/esm/vchart-all.js` 使用无扩展名相对导入（`./core`、`./chart/line`），初看可疑，但对应目录均含 `index.js`，Vite 的扩展名解析可以处理；实测组件文件 200 且转译正确。
- **不是生产构建缺陷**。`dist/assets` 中 `MermaidDiagram-*.js` 仅 24K、`VChartDiagram-*.js` 仅 8K，引擎分别落在 `vendor-mermaid`（3.3M）与 `vendor-vchart`（1.9M），分包符合 `AUD-200` 设计。
- **不是端口、中间件或缓存戳问题**。`?t=` 只是 Vite 对源码模块的失效戳；真正失败的是其后的 `?v=` 依赖请求。`react.js` 走同一中间件返回 200，可排除服务端整体异常。

---

## 4. 改进方案

### 4.1 推荐方案：把重型依赖显式纳入启动期预构建

在 `vite.config.ts` 增加 `optimizeDeps.include`，让 esbuild 在**服务器启动、浏览器发起任何请求之前**完成这两个引擎的打包，使其进入首次提交的元数据，从根源上消除 `scannerMissedDeps` 触发的重跑。

```ts
optimizeDeps: {
  include: [
    'mermaid',
    'html-to-image',
    '@visactor/vchart/esm/vchart-all',
    '@visactor/vchart/esm/theme/builtin',
  ],
},
```

要点：

- **必须使用源码里的原始请求路径**，而不是包名。`VChartDiagram.tsx` 导入的是 `@visactor/vchart/esm/vchart-all` 与 `@visactor/vchart/esm/theme/builtin`，预构建按请求路径建索引，只写 `@visactor/vchart` 覆盖不到这两条。
- `jspdf` 由 `MermaidDiagram.tsx:398` 的 `import('jspdf')` 触发，同样建议一并列入，避免导出 PDF 时再撞一次同样的 504。
- 该配置**只作用于开发态依赖优化器**，不改变 `build.rollupOptions.manualChunks`，因此 `vendor-mermaid` / `vendor-vchart` 的生产分包与首屏体积收益保持不变，不触碰 R33 红线 3（纯解析器与视图解耦）与红线 4（Headless 挂载门闩）。

代价：冷启动时多一次对 mermaid（约 3.3M 级）与 vchart（约 1.9M 级）的 esbuild 预打包，耗时数秒量级，且结果写入 `node_modules/.vite` 后被缓存，仅在锁文件或配置变化时重跑。对一个需要稳定切页的工作台，这笔启动成本是划算的。

### 4.2 备选方案（不建议单独采用）

| 方案 | 做法 | 评价 |
|:--|:--|:--|
| A. 维持现状，依赖整页刷新自愈 | 不改配置 | 不可靠。重依赖下优化器会反复取消并推迟刷新，页面可能一直停在 504，且无法解释给使用者 |
| B. `optimizeDeps.exclude` 这两个包 | 让 Vite 直接按源码 ESM 逐文件转译 | 与报错文案的字面建议相反：mermaid 130 个 chunk、vchart 全量图表类会变成海量小请求，首开更慢，且暴露库内部的 CJS 互操作问题 |
| C. 改回静态导入 | 撤销这两个组件的 `React.lazy` | 直接倒退 `AUD-200`，把 3.3M + 1.9M 重新塞进首屏主包，不可取 |
| D. 组件内二次动态导入引擎 | `MermaidDiagram` 内再 `import('mermaid')` | 只能推迟问题，不能消除扫描盲区，反而增加挂载时序复杂度，不利于 Headless 截帧 |

### 4.3 配套的可观测性

建议在开发态 `ErrorBoundary` 的降级提示中区分「依赖预构建过期」与「图表渲染异常」：当捕获到 `Failed to fetch dynamically imported module` 时，给出「依赖预构建未完成，刷新页面重试」而不是当前的通用渲染失败文案。此为体验补强，不替代 4.1。

---

## 5. 实施与验证结果（2026-10-30）

`vite.config.ts` 已按 4.1 增加 `optimizeDeps.include`，覆盖 `mermaid`、`html-to-image`、`jspdf`、`@visactor/vchart/esm/vchart-all`、`@visactor/vchart/esm/theme/builtin` 五项。

清空 `node_modules/.vite` 并重启 `npm run dev` 后实测：

1. **首次页面加载前**即完成预构建。`_metadata.json` 的 `optimized` 已含上述五项（`browserHash` 统一为 `c9625766`），不再是此前只登记 React 的状态。
2. 两个组件文件均 200，其引用的预构建依赖全部从 504 变为 200：

| 依赖 | 修复前 | 修复后 |
|:--|:--:|:--|
| `@visactor_vchart_esm_vchart-all.js` | 504 / 0 B | **200 / 4,422,269 B** |
| `@visactor_vchart_esm_theme_builtin.js` | 504 / 0 B | **200 / 2,778 B** |
| `mermaid.js` | 504 / 0 B | **200 / 63,396 B** |
| `html-to-image.js` | 504 / 0 B | **200 / 29,203 B** |
| `jspdf.js` | 未预构建 | **200 / 695,557 B** |

3. 预构建后的 `mermaid.js` 继续引用 20 余个共享 chunk，抽查 8 个（含 200K–300K 级大块）全部 200，504 没有转移到下一层。
4. `npx vite build` 通过（16.82s），`vendor-mermaid`（3,445 kB）与 `vendor-vchart`（1,987 kB）仍为独立 chunk，`MermaidDiagram` 21.81 kB、`VChartDiagram` 保持按需加载，生产分包无回退。

原验证计划第 4 项（浏览器内逐一回归其余 14 类图表）需在界面上确认，本次以构建产物与依赖响应验证代替。

---

## 6. 验证计划（归档）

1. 清空 `node_modules/.vite`，重启 `npm run dev`，确认启动日志出现 `new dependencies optimized` 且包含上述四项，`_metadata.json` 的 `optimized` 在**首次页面加载前**即含它们。
2. 浏览器无缓存状态下依次进入 Mermaid 与 VChart 页面，确认两条动态导入均 200、无 504、无整页刷新。
3. 在 Mermaid 页面触发 PDF 导出，确认 `jspdf` 预构建产物 200。
4. 回归其余 14 类图表，确认无行为变化。
5. `npm run build` 后核对 `dist/assets` 仍产出独立的 `vendor-mermaid` 与 `vendor-vchart`，两者体积无明显回退。

---

## 6. 结论

故障限定在开发态，根因是 R33 路由级懒加载使 `mermaid` 与 `@visactor/vchart` 逃出 Vite 启动期依赖扫描，而这两个依赖的图太宽，运行期补发现触发的重优化无法在浏览器取用前收敛，最终以 `504 Outdated Optimize Dep` 表现出来。生产构建与容器运行时均已验证正常。

推荐以一处 `optimizeDeps.include` 配置修复，改动面仅 `vite.config.ts`，不触及解析器、视图分层与生产分包。
