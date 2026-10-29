---
doc_id: IQS-SVG-DE-G6-ENGINEERING-LOG-R30
title: 全仓 G6 归零与关联图/PDPC 原生 SVG 闭式重构工程记录（R30）
project: 澄矩 · ChengJu (IQS)
version: v1.0
domain: RENDER
type: LOG
authority: L2
freshness: 🟢现行
first_commit: 2026-10-28
last_commit: 2026-10-28
supersedes: []
superseded_by: []
related:
  - docs/PROJECT_INDEX.md
  - docs/IQS_MIGRATION_PLAN_SVG_DE_G6.md
  - docs/IQS_DIAGRAM_MATHEMATICAL_LAYOUT_SPEC.md
  - docs/IQS_FISHBONE_ENGINEERING_LOG_R29.md
  - utils/relationGraph.ts
  - utils/relationSvg.ts
  - utils/pdpcGraph.ts
  - utils/pdpcSvg.ts
  - utils/fishboneSvg.ts
  - components/RelationDiagram.tsx
  - components/PDPCDiagram.tsx
  - scripts/assert_relation_math.ts
  - scripts/assert_pdpc_math.ts
---

# 全仓 G6 归零与关联图 / PDPC 原生 SVG 闭式重构工程记录（R30）

| 标签 | 值 |
|:--|:--|
| **轮次** | **R30**（承接 R28 确定性布局与 R29 鱼骨图闭式 SVG 归位，本轮登记并闭环 `AUD-188..194`） |
| **执行依据** | `docs/IQS_MIGRATION_PLAN_SVG_DE_G6.md`（全量 SVG 化与 G6 归零设计规划书） |
| **核心产出** | `utils/{relationGraph,relationSvg,pdpcGraph,pdpcSvg,fishboneSvg}.ts` · `components/{RelationDiagram,PDPCDiagram}.tsx` · `scripts/assert_{relation,pdpc}_math.ts` · `mcp-server/lib/flow_lint.mjs` |
| **里程碑** | 全仓 `@antv/g6`（及 92 个间接依赖包）**彻底清零**；**Flow / Fishbone / Relation / PDPC** 四大复杂拓扑图 100% 统一为「纯数学闭式几何清单（Geometry Spec SSOT）+ 原生 SVG 渲染 + MCP Tier-1 进程内直出」架构 |

---

## 1. 一句话现状与核心量化指标

| 维度 | R30 实施前（As-Is） | R30 实施后（To-Be） |
|:--|:--|:--|
| **`@antv/g6` 依赖** | 残留 2 处引用（`RelationDiagram.tsx`、`PDPCDiagram.tsx`），含 92 个子包 | **0 引用、彻底卸载**（`package.json` 与 `node_modules` 归零） |
| **MCP Tier-1 进程内直出覆盖** | 仅 `flow`（1/14 CORE） | **`flow` + `fishbone` + `relation` + `pdpc`**（4/14 CORE，覆盖全部拓扑图，无需启动 `:12000` Web 服务与无头浏览器） |
| **Tier-2 热页同步等待时延** | `relation` / `pdpc` 走 220ms 慢通道 + G6 异步 `fitView` 竞态 | 纳入 `isFastSync` **40ms 极速通道**，零异步布局竞态 |
| **几何不变量门禁（Build + CI）** | `test:flow` (206 项) + `test:fishbone` (67 项) | 新增 **`test:relation`（G1–G6）** + **`test:pdpc`（G1–G6）**，全量串入 `npm run build` 与 GitHub Actions |
| **卡片 SSOT 同步** | 4 张卡片 `renderEngine` 误标 `'g6'` / `'canvas'` | 114 个衍生文件重生成并通过 `check:cards-fresh` 与 `validate:cards` |

---

## 2. 实施前代码深度审计与规划书勘误台账（AUD-188..194）

在按照 `docs/IQS_MIGRATION_PLAN_SVG_DE_G6.md` 启动编码前，对全仓代码进行了穿透式预检，识别并同步解决了规划书中未覆盖的 **7 项架构断点与存量缺陷**：

| 编号 | 级别 | 模块 / 位置 | 根因诊断 | 处置方案与闭环状态 |
|:--:|:--:|:--|:--|:--|
| **AUD-188** | P0 | **MCP Tier-1 打包链路断层**<br>`scripts/flow_lint_core.ts`<br>`mcp-server/index.js` | `mcp-server/index.js` 运行在纯 Node ESM 下，通过 `loadCoreBundle()` 消费由 esbuild 打包的 `mcp-server/lib/flow_lint.mjs`。规划书仅提修改 `index.js`，且 R29 虽编写了 `utils/fishboneSvg.ts` 却未接入 `flow_lint_core.ts` 与 `index.js`。 | ✅ 在 `scripts/flow_lint_core.ts` 统一封装并导出 `renderFishboneSVG`、`renderRelationSVG`、`renderPDPCSVG`，重编 `flow_lint.mjs`，并在 `mcp-server/index.js` 一次性打通四大拓扑图的 Tier-1 通道。 |
| **AUD-189** | P1 | **鱼骨图 SVG 直出缺箭头**<br>`utils/fishboneSvg.ts:22` | R29 十八订在 `FishboneDiagram.tsx` 中补上了指向脊椎的几何三角箭头 `<polygon>`，但 `utils/fishboneSvg.ts` 仍只输出 `<line>` 且无 tight `viewBox` 与背景底板。 | ✅ 重构 `utils/fishboneSvg.ts`，补齐定向三角箭头 `<polygon>`、紧致包围盒 `viewBox` 计算与背景色矩形，与前端组件 100% 像素级对齐。 |
| **AUD-190** | P1 | **关联图缺失主标题渲染**<br>`components/RelationDiagram.tsx` | `parseRelationDSL` 解析了 `styles.title` 且 L0 卡片声明 `Title:` 必填，但原 `RelationDiagram.tsx` 既无 DOM 标题也未在 G6 画布内渲染标题，导出图片完全丢失标题。 | ✅ 在 `computeRelationGeometry` 中将 `title` 纳入几何清单与顶部 `bbox` 扩展，前端与 MCP SVG 统一在画布顶部居中直出标题。 |
| **AUD-191** | P1 | **关联图与 PDPC 节点尺寸失真**<br>`utils/relationGraph.ts:561`<br>`components/PDPCDiagram.tsx:201` | ① `relationGraph.ts` 刚体防碰撞固定取 `160×60`，在 Central/Free 模式下遇到 12 字以上长标签（宽 ~290px）仍会发生水平重叠；<br>② `PDPCDiagram.tsx` 用 `label.length * 12 + 20` 粗算宽度，未区分中英文字符。 | ✅ 全面接入 `utils/textMetrics.ts` 的 `estimateTextWidth`：关联图 `measureRelationNodeSize` 对椭圆做 $\times 1.18$ 内接补偿并在 Central/Free 模式按真实宽高排斥；PDPC `measurePDPCNodeSize` 按四类图元精确度量。 |
| **AUD-192** | P1 | **PDPC 链式语法标记丢失 & 解析器耦合**<br>`components/PDPCEditor.tsx:156` | ① L0 卡片 `pdpc.card.ts` 规定链式直写 `a--b--c [OK]` 标记作用于全链，但原解析器写成 `i === sequence.length - 2 ? marker : 'None'`（仅末段生效）；<br>② `parseRelationDSL` 与 `parsePDPCDSL` 写在 `.tsx` 组件内，Node 端无法脱离 React 直接调用。 | ✅ 将两个解析器下沉至 `utils/relationGraph.ts` 与 `utils/pdpcGraph.ts`（原 Editor 保留 re-export 兼容），并修正链式语法使 `[OK]`/`[NG]` 作用于全链。 |
| **AUD-193** | P2 | **Node 22+ `strip-types` 枚举报错**<br>`types.ts:2` (`export enum QCToolType`) | Node 原生 `--experimental-strip-types` 不支持运行时导入含 TypeScript `enum` 的模块。若 `utils/*.ts` 以值形式 `import { DEFAULT_* } from '../types.ts'`，门禁脚本直跑会抛 `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`。 | ✅ 沿用 `FlowParser.ts` 与 `fishboneGraph.ts` 规范：`utils/` 下仅使用 `import type { ... } from '../types.ts'`，默认样式常量内联于各自算法模块，确保 Node 原生零编译秒跑测试。 |
| **AUD-194** | P2 | **卡片真源 `renderEngine` 漂移**<br>`dsl/cards/iqs_native/*.card.ts` | `relation`、`pdpc`、`arrow`、`affinity` 的 `meta.renderEngine` 仍为 `'g6'`，`fishbone` 仍为 `'canvas'`。 | ✅ 将 `fishbone` / `relation` / `pdpc` / `arrow` 订正为 `'svg'`，`affinity` 订正为 `'canvas'`，执行 `npm run build:cards` 同步全仓 114 个产物文件。 |

---

## 3. 分阶段技术实现详解

### 3.1 Phase 1：关联图（Relation Diagram）几何清单与原生 SVG 引擎

1. **三模态真实尺寸防碰撞升级（`utils/relationGraph.ts`）**：
   - **方向型（Directional）**：在最长链分层（Longest-Path Layering）与 Barycenter 质心重排基础上，统计每一列 `layer[r]` 的最大真实节点宽度 $\max_{v \in L_r} W(v)$，列步长动态满足 $\Delta X_r = \max\big(\Delta X_{\text{default}},\ \frac{W_{r-1}+W_r}{2} + 88\big)$；
   - **中央型（Centralized）**：针对椭圆极坐标展开（$k_x = 1.3, k_y = 0.92$），同时施加**切向弧长约束** $R_d \ge \frac{m \cdot (W_{\max} + 32)}{2\pi}$ 与**径向水平跨环防叠约束** $\Delta R_d \ge \frac{(W_{d-1} + W_d)/2 + 48}{1.3}$，并在投影后执行轻量刚体 AABB 微调（固定圆心核心症结不动），在 30 节点长文本高压测试下实现 **0 重叠**；
   - **自由型（Free）**：在 45 轮同步 Stress Majorization（Kamada-Kawai Jacobi 迭代）收敛后，以每个节点的真实盒子尺寸 $(W_i, H_i)$ 执行刚体排斥。
2. **精确外框射线求交（`intersectNodeBoundary`）**：
   - **椭圆节点（末端原因 `source` / 中间因素 `middle`）**：设半轴 $(a, b) = (W/2, H/2)$，单位方向向量 $(u_x, u_y)$，由椭圆参数方程求得精确射线距离：
     $$t = \frac{1}{\sqrt{(u_x / a)^2 + (u_y / b)^2}}, \qquad P_{\text{hit}} = (c_x + t u_x,\ c_y + t u_y)$$
   - **圆角矩形节点（主要症结 `sink`）**：由射线与 AABB 求交：
     $$t = \min\left(\frac{a}{|u_x|},\ \frac{b}{|u_y|}\right), \qquad P_{\text{hit}} = (c_x + t u_x,\ c_y + t u_y)$$
3. **双向边曲率分离与跨层避障**：
   - 若检测到互为因果边 $(u, v) \in E \land (v, u) \in E$，自动沿有向边法向量 $\vec{n} = (-u_y, u_x)$ 偏移 $+26\text{px}$ 生成二次贝塞尔控制点 `controlPoint`，使来回两条弧线对称分离；
   - 若单向长边穿过非端点节点的中心安全半径，自动向法向推开生成绕行控制点 `findObstacleAvoidControlPoint`。

---

### 3.2 Phase 2：过程决策程序图（PDPC Diagram）阶段凝聚分层与正交路由引擎

1. **阶段凝聚拓扑分层（Group-Cohesive K-Rank，`utils/pdpcGraph.ts`）**：
   - 传统 Dagre 将 `Group`（Combo）视为事后弱约束，常导致不同阶段的节点在主轴上交错、阶段虚线框互相重叠。
   - 新算法采用**两级分层**：先在每个 `Group` 内部对同组有向边求解局部最长链 $\operatorname{rank}_{\text{local}}(v)$，再按 `Group` 阶段桶顺序严格累加全局主轴阶数 $\operatorname{rank}(v)$。由此在代数上保证了**不同阶段框在主轴方向严格互斥**（G2 阶段框 100% 包裹且框间零交叠）。
2. **主干与异常对策支线分流（Mainline vs Contingency）**：
   - 自动识别異常支线节点（`type === 'countermeasure'` 或全部入边均为 `[NG]`）；
   - 正常主线节点锚定在主轴基线，异常与对策节点向副轴正方向偏移 $\Delta_{\text{cont}} = 105\text{px}$，天然形成「主线直通 + 侧枝风险对策回流」的清晰工程视图。
3. **四类语义节点工业造型（`utils/pdpcSvg.ts`）**：
   - `start`（起点）：全圆角药丸胶囊（`shape: 'pill', rx = 22`）；
   - `step`（步骤）：标准圆角矩形（`shape: 'rect', rx = 6`）；
   - `countermeasure`（对策）：**六边形切角决策框（`shape: 'hexagon'`）**——相比原 G6 菱形（内部文字可用宽度仅 50%，极易溢出斜边），六边形将中文长标签容纳率提升至 $85\%$ 以上且保持鲜明几何辨识度；
   - `end`（终点）：双层边框圆角矩形（`shape: 'double-rect'`，外框 2px + 内缩 3.5px 内框 1px）。
4. **正交圆角走线与避障走廊（Orthogonal Routing）**：
   - 支持 `Directional`（LR 从左到右）与 `Standard`（TB 从上到下）双模态正交折线；
   - 在候选折线通道中自动执行 `segmentHitsBox` 碰撞检测，若层间走廊被中间节点（如 `n4 -> n7` 跨越同层的 `n5`）阻挡，自动切换无碰撞折线点或抬升至外围安全走廊绕行，确保 **100% 零节点穿刺（G4）**；
   - 在所有 $90^\circ$ 正交拐角处生成 $r = 6\text{px}$ 的二次贝塞尔圆角指令 `Q`；`[NG]` 边自动渲染为 `#DC2626` 红色虚线 `stroke-dasharray="6,4"` 并附带带描边的胶囊徽章。

---

### 3.3 Phase 3：MCP Tier-1 原生直出与前置 Linter 深度加固

1. **Tier-1 四大拓扑图直出矩阵（`mcp-server/index.js` + `scripts/flow_lint_core.ts`）**：
   - `renderChart` 的 Tier-1 快速通道从单一 `flow` 扩展为 `flow | fishbone | relation | pdpc`；
   - 调用链：`DSL 文本` → `flow_lint.mjs` 进程内纯函数布局与 SVG 合成 → `@resvg/resvg-js` 原生 Rust 3x 光栅化 → `PNG Base64 / URL`；
   - **彻底摆脱对 `:12000` 前端开发服务器和 Puppeteer Chromium 实例的依赖**。
2. **前置 Linter 拓扑自愈能力升级（`scripts/flow_lint_core.ts`）**：
   - `lintCoreKind('relation')`：直接调用 `parseRelationDSL` 与 `validateRelationLinks`，在渲染前精准拦截**未定义悬空节点、自引用边、重复边、有向环回路**，并返回针对性 `fixHints`；
   - `lintCoreKind('pdpc')`：调用 `parsePDPCDSL` 校验所有 `--` 连线两端节点是否均已由 `Item:` 声明。

---

## 4. 变更文件清单（File Inventory）

### 4.1 新增文件（5 个）

| 文件路径 | 行数 | 职责说明 |
|:--|:--:|:--|
| `utils/relationSvg.ts` | 140 | 关联图纯函数 SVG 渲染器（箭头多边形计算、二次贝塞尔弧线、椭圆/矩形节点、标题内嵌） |
| `utils/pdpcGraph.ts` | 645 | PDPC 纯函数 DSL 解析器、阶段凝聚 K-Rank 分层、正交避障路由与 `PDPCGeometrySpec` 解算器 |
| `utils/pdpcSvg.ts` | 215 | PDPC 纯函数 SVG 渲染器（阶段虚线框、圆角正交路径、四类语义节点、OK/NG 胶囊标签） |
| `scripts/assert_relation_math.ts` | 212 | 关联图几何不变量门禁脚本（G1–G6：3 模式全检 + 边界误差 $<1.5\text{px}$ + 双向边 + 30 节点高压） |
| `scripts/assert_pdpc_math.ts` | 195 | PDPC 几何不变量门禁脚本（G1–G6：LR/TB 双模式 + 阶段包裹性 + 零穿刺 + 链式语法回归） |

### 4.2 重构与更新文件（23 个）

| 文件路径 | 核心改动摘要 |
|:--|:--|
| `utils/relationGraph.ts` | 下沉 `parseRelationDSL`；新增 `measureRelationNodeSize`、`intersectNodeBoundary`、`computeRelationGeometry`；升级三模态真实尺寸防碰撞 |
| `utils/fishboneSvg.ts` | 补齐鱼骨图连线末端定向三角箭头 `<polygon>`、紧致 `viewBox` 与底色矩形 |
| `components/RelationDiagram.tsx` | 移除 `@antv/g6`；改用原生 `<svg>` + `ResizeObserver` + 滚轮缩放/拖拽平移 + `svgToDataURL` |
| `components/PDPCDiagram.tsx` | 移除 `@antv/g6` 与二次 Canvas 标题合成；改用原生 `<svg>` 响应式自绘 |
| `components/RelationEditor.tsx` | 改为从 `utils/relationGraph.ts` 导入并重导出 `parseRelationDSL` |
| `components/PDPCEditor.tsx` | 改为从 `utils/pdpcGraph.ts` 导入并重导出 `parsePDPCDSL` |
| `scripts/flow_lint_core.ts` | 导出 `renderFishboneSVG` / `renderRelationSVG` / `renderPDPCSVG`；增强 `relation` 与 `pdpc` 拓扑 Linter |
| `mcp-server/index.js` | Tier-1 通道扩展支持 `flow`、`fishbone`、`relation`、`pdpc` |
| `App.tsx` | `isFastSync` 纳入 `QCToolType.RELATION` 与 `QCToolType.PDPC` |
| `package.json` / `package-lock.json` | 卸载 `@antv/g6`（移除 92 个包）；新增 `test:relation`、`test:pdpc` 并串入 `build` |
| `.github/workflows/ci.yml` | 新增关联图与 PDPC 几何不变量 CI 门禁步骤 |
| `dsl/cards/iqs_native/*.card.ts` | 更新 `relation`、`pdpc`、`fishbone`、`arrow`、`affinity` 的 `renderEngine` 并重生成 `mcp_tools.json` / `cardDocs.ts` |
| `docs/IQS_DIAGRAM_MATHEMATICAL_LAYOUT_SPEC.md` | 升版至 v1.2，新增第 4 章 PDPC 阶段凝聚分层与正交路由数学规范 |
| `docs/PROJECT_INDEX.md` | 登记 R30 里程碑与文档索引 |
| `docs/软著与发行/07_第三方组件与开源声明.md` | 移除 `@antv/g6`，更新为 `@resvg/resvg-js` |

---

## 5. 复现与验证命令（全绿基线）

```bash
# 1. TypeScript 全仓类型检查
npx tsc --noEmit

# 2. 四大拓扑图几何不变量门禁
npm run test:fishbone          # 鱼骨图 G1–G7 (67 项断言)
npm run test:relation          # 关联图 G1–G6 (3 模态 + 双向边 + 30 节点高压)
npm run test:pdpc              # PDPC 图 G1–G6 (LR/TB 双模态 + 阶段框包裹 + 正交零穿刺)
npm run test:flow              # 流程图 7 段 206 项断言

# 3. 卡片单一真源（SSOT）与 MCP 内核新鲜度门禁
npm run check:cards-fresh && npm run validate:cards
npm run validate:dsl
npm run check:mcp-lint-fresh

# 4. 生产全量构建
npm run build
```
