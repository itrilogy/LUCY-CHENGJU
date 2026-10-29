---
doc_id: IQS-FISHBONE-ENGINEERING-LOG-R29
title: 鱼骨图引擎工程记录（R29 全轮次）—— 改动、决策、失败与范式重构建议
project: 澄矩 · ChengJu (IQS)
version: v1.0
domain: LAYOUT
type: LOG
authority: L2
freshness: 🟢现行
first_commit: 2026-10-28
last_commit: 2026-10-28
supersedes: []
superseded_by: []
related:
  - docs/IQS_DIAGRAM_MATHEMATICAL_LAYOUT_SPEC.md
  - docs/IQS_FISHBONE_LAYOUT_MATH_AUDIT_R29.md
  - utils/fishboneGraph.ts
  - scripts/assert_fishbone_math.ts
  - mcp-server/index.js
---

# 鱼骨图引擎工程记录（R29 全轮次）

> **用途**：为后续「整体代码重审」提供**单一事实来源**。记录本轮所有改动、决策依据、失败尝试与回退、以及**建议的范式重构**。
> **原则**：不修修补补；遗留问题集中到 §7「待审计清单」，由重构而非局部补丁解决。

---

## 1. 一句话现状

| 维度 | 状态 |
|:--|:--|
| 门禁 | `tsc` exit 0 · `test:fishbone` **66 项 PASS** · `validate:dsl` PASS×3 · `test:flow` 15 pass · `node --check mcp-server/index.js` ok |
| 布局 | 4 骨 3 层 @1200×800：内容 **1174×390**，fit **91.5%**，最小字号 **9.15px（可读）** |
| 6 骨 4 层 | @1200×800 不可读（7.0px，按设计给 warning）→ @1600×1000 **可读**（升档策略生效） |
| 已知缺陷 | **纵向标签的"刺尖外偏移"在 G6 上不生效**（见 §5.2）；文字渲染仍走 G6 的 `labelText` 机制 |
| 未完成 | 标签独立成 `text` 节点（G6 支持该类型，但上一版实现导致"文字全消失"，已回退，见 §5.3） |

---

## 2. 本轮落地的能力（按依赖顺序）

| # | 能力 | 关键实现 | 文档 |
|:--:|:--|:--|:--|
| 1 | **间隔弹性化** | `gapScale = clamp(1/deficit, .65, .9)` 逐轮压缩；`G_ℓ=clamp(70·s,24,96)`、`G_r=clamp(10·s,4,16)` | 规范 §3.1 Pass 4 |
| 2 | **倾角参数化** | 全局 `ANGLE`（60–75° 四档扫描取 fit 最优）；`dx = dy·cot α` | 规范 §3.1 Pass 4b |
| 3 | **画布自动升档** | `mcp-server/index.js` `autoScaleFishboneCanvas`：>4 骨或 >3 层 → 1600×1000；>6 骨或 >4 层 → 1920×1200 | R29 §14 |
| 4 | **分类修补器** | `resolveConflicts` 四类动作：同父兄弟/同族跨父/跨族（含跨半区）/无动作；检测覆盖「文本×文本」与「线段×文本」 | 规范 §3.1 Pass 2b |
| 5 | **断言审计与收紧** | G6 改用**最小字号**基准（原用大骨 12.5px，虚高 25–32%）；G4a 容差 2px→1px；6 层上限 400→150px²；用例 45→66 项 | R29 §15 |
| 6 | **文字盒 SSOT** | 导出 `textBoxOfNode(style)`；布局判定、断言、审计共用 | R29 §19 |
| 7 | **行按需求集中** | 需求 <150 的族向内集中（行距=真实需求），≥150 才铺满 | R29 §19 |
| 8 | **重复计算清理** | 删除 `heightReq` 里与「铺满归一化」重复的端点约束；`seg×text` 不再无效扩高；扩高加 `cap=1.35×rawNeed` | R29 §17/§18 |
| 9 | **横向按需求铺满** | 深层子项区间按**子项类型**选（60° 子项用 0.12–0.88）—— 此前按父骨类型选，取反导致右半段空白 | R29 §21 |
| 10 | **分形层级衰减** | 分支长度 `0.82^(level-3)`（原 0.94 太弱，深层看起来同一层） | R29 §18 |

---

## 3. 关键量化结果（可复现）

| 用例 | 起点（本会话初） | 现在 |
|:--|:--:|:--:|
| 经典 4 骨内容 | 1558×607 | **1174×390**（高 −36%） |
| 经典 4 骨可读性 | 61.6% / 7.94px（不可读） | **91.5% / 9.15px（可读）** |
| 「料」族两中骨间距 | ~300px | **55px** |
| 「机」族两中骨间距 | 223px | **50px** |
| 中骨长度（4 子项） | 237px | **158px** |
| 6 骨 @1600×1000 | 8.68px | **89% / 8.90px** |

---

## 4. 失败尝试与回退（重要，避免重走）

| 尝试 | 结果 | 根因 | 结论 |
|:--|:--|:--|:--|
| **全局谐波等长**（所有大骨等高） | 低负载族被拉出大片空骨、行距被顶到 2 倍 | 等长忽略各族需求差异 | 作废，改回按需不等高 |
| **顺序生长 + 富余铺满**（三次） | 每次都能把高度降 46%，但都在最后一公里翻车 | 骨高被修补器动态修改，与铺满互相放大；链内相对位置固定 | 需先「解除骨高耦合」（已做）再逐步上 |
| **整行羽向翻转** | 羽状分布被打散（同级子骨全同向） | 翻转破坏了"行内交替" | 回退 |
| **需求小的族向内集中**（早期） | 机族行距 223→23（正是需求） | 但深层分支贴近大骨斜线 → 穿刺 | 等 bbox 口径统一后才可重启（现已具备条件，尚未重开） |
| **标签改独立 text 节点** | **页面上文字全部消失** | G6 v5 支持 `type:'text'`，但上一版实现未渲染（原因未定位） | **已回退**，列 §7 待审计 |
| **退火 / 随机搜索**（评估后未实施） | — | 违背项目确定性基线（R26/R28 已批判） | 用「确定性坐标下降 + 目标函数单调断言」替代 |

---

## 5. 三个"改了很多轮都没变化"的教训（本轮最大价值）

### 5.1 字段名错了：G6 v5 用 `labelOffsetX/Y`，不是 `labelDx/Dy`

源码依据：`@antv/g6/lib/elements/nodes/base-node.js`
```js
const { placement, maxWidth, offsetX, offsetY } = subStyleProps(this.getGraphicStyle(attributes), 'label');
```
v4 的 `labelDx/labelDy` 在 v5 **完全不识别**。这解释了为什么"改了几轮标签位置都没变化"。

### 5.2 但即使字段对了，`center` 下 offset 仍不生效

实测：`placement:'center'` + `labelOffsetY:+13.5` → 下半区标签仍贴端点。
（`top`/`bottom` 有反应但语义不对称，导致上半区居中、下半区偏移。）
**结论：G6 的 label 机制不足以承担"精确排版"** —— 这是 §7 范式重构的根本动因。

### 5.3 离线探针正确 ≠ 页面正确

离线渲染脚本（resvg）自己实现文字定位，**永远显示"数学定义上的位置"**。
凡是"探针对、页面错"，优先怀疑**渲染层的字段/语义**，而不是布局数学 —— 本轮在这上面浪费了数轮。

---

## 6. 代码结构现状（供审计）

```
utils/fishboneGraph.ts  (~1500 行，单一文件)
├── 常量 T（30+ 项，含历史遗留 inlineLift / inlineLeafLabels / maxPasses）
├── 角度 ANGLE（模块级可变，单线程同步）
├── measureLabel / wrapAtMidpoint        排版阶梯（三阶）
├── buildBranch                           自底向上：length + arcs + textOut
├── verticalReach / horizontalReach       包络估算（按层级方向）
├── buildClusterShape / materializeCluster 骨高 / 行位 / 包络
├── placeWithConflicts                    元素级冲突驱动推进（允许交叉）
├── resolveConflicts                      四类动作修补 + 复检
├── emitAll                               几何生成（含 resolveLabel 文字定位）
├── textBoxOfNode                         文字盒 SSOT（导出）
└── computeDeterministicFishboneLayout    倾角扫描 → 布局 → 缩放闭环
```

**已知结构问题**（重构时应处理）：

| # | 问题 | 影响 |
|:--:|:--|:--|
| 1 | 单文件 1500 行，职责 7 类混在一起 | 难审、难测 |
| 2 | 模块级可变 `ANGLE` | 隐式全局状态（虽单线程安全，但不利于并行/测试） |
| 3 | 历史遗留常量（`inlineLift`/`inlineLeafLabels`/`maxPasses` 语义已变） | 误导 |
| 4 | 几何生成与文字定位耦合在 `emitAll` 内（闭包 `boneSeg`/`currentIsTop`） | 隐式依赖 |
| 5 | 两套推进逻辑（`placeWithConflicts` 探针 + `resolveConflicts` 实际坐标） | 口径漂移风险 |
| 6 | 层级规则散落（字号/长度衰减/区间/文字范式 4 处） | 深层行为难预测 |
| 7 | 无「几何输出契约」类型（`any[]` 的 nodes/edges） | 渲染层与布局层靠约定 |

---

## 7. 建议的范式重构（不做局部修补）

### 7.1 核心主张：**几何清单（Geometry Spec）与渲染彻底分离**

```ts
// 布局只输出"要画什么"，不输出 G6 的 style
interface FishboneGeometry {
  segments: { id: string; x1: number; y1: number; x2: number; y2: number; width: number; kind: 'spine'|'main'|'branch' }[];
  texts:    { id: string; x: number; y: number; text: string; fontSize: number; anchor: 'start'|'middle'|'end'; baseline: 'top'|'middle'|'bottom'; weight?: 'bold' }[];
  boxes:    { id: string; x: number; y: number; w: number; h: number; radius: number; label: string; fill: string; labelFill: string }[];
  meta:     FishboneLayoutMeta;
}
```

- **前端 G6 渲染**：把这些几何映射为**自定义节点/边**（或 SVG overlay），文字用 `text` 图元按 `x/y/anchor/baseline` 直接绘制；
- **MCP Tier-1**：同一份几何 → SVG 字符串 → resvg 光栅化；
- **断言**：直接对 `geometry.texts` / `boxes` 做 AABB 检测。

**收益**：
1. 文字位置 100% 由布局决定 → "数学即渲染"，彻底消灭 §5 的三类问题；
2. 前端与 MCP 出图**逐像素一致**（同一份几何）；
3. 断言不再依赖"渲染库口径"（`textBoxOfNode` 可退役）；
4. 布局可独立做单元测试（纯数据）。

### 7.2 若暂不改渲染层的最小路径

1. **确认 G6 `text` 节点用法**（`type:'text'` + `style.text` + `style.textAlign/textBaseline`），用最小用例验证后再接入；
2. 或退回 `labelText` + `labelPlacement:'right'/'left'`（水平外挂）+ 对 60° 骨统一 `'top'`（接受语义偏差，保证"存在且可读"）；
3. **不在渲染受限的前提下继续调几何**——收益会被渲染层吃掉。

### 7.3 布局内部的结构化（与 7.1 可并行）

| 动作 | 目标 |
|:--|:--|
| 拆文件：`fishbone/{measure,branch,cluster,place,resolve,emit,index}.ts` | 单文件 1500 → 6×200 |
| 层级规则收敛为 `LEVEL_STYLE[]`（字号/长度衰减/区间/文字范式） | 深层行为可预测、可测 |
| `ANGLE` 改为显式参数（贯穿调用链或 Context 对象） | 去隐式全局 |
| 合并两套推进为一个「迭代修补器」 | 单一口径 |
| 删除历史遗留常量 | 减少误导 |
| 输出 `FishboneGeometry`（§7.1） | 契约化 |

---

## 8. 待审计清单（用户重审时按此顺序）

| # | 位置 | 疑点 | 建议 |
|:--:|:--|:--|:--|
| A1 | `emitAll` 的 `resolveLabel` | 60° 骨的"刺尖外偏移"在 G6 上不生效（字段已对，语义仍不符） | 走 §7.1 / §7.2 |
| A2 | 标签渲染 | 当前仍用 `circle.labelText` + `top/bottom`，上下语义不对称 | 同上 |
| A3 | `resolveConflicts` | 四类动作是否完备？跨族 seg×text 的 need 计算是否过粗 | 单测每种冲突 |
| A4 | `verticalReach` / `horizontalReach` | 只算一层（孙项由 G4 兜底），深层是否漏净空 | 用 6 层用例做 fuzz |
| A5 | `heightReq = max(rawNeed, 180)` | 180 下限是否仍是"需求小族被撑大"的残留 | 用真实数据分布标定 |
| A6 | 倾角扫描 | 4 档是否够？`fit` 目标函数是否应加入"标签可读性"权重 | 与 7.1 一起 |
| A7 | `gapScale` 闭环 | 压缩与"零叠优先"回退是否互相干扰 | 加断言：任意画布下重叠 = 0 |
| A8 | 6 层 known-issue | `≤1 对 / ≤150px²` 是否掩盖退化 | 记录基线并断言"不退化" |
| A9 | `mcp-server/index.js` `autoScaleFishboneCanvas` | 按结构预估 vs 按 `meta.readable` 实判 | 桥接回传 meta |
| A10 | 历史常量 | `inlineLift` / `inlineLeafLabels` / `maxPasses` | 清理 |

---

## 9. 复现命令

```bash
npx tsc --noEmit
npm run test:fishbone          # 66 项几何不变量
npm run validate:dsl           # 55 卡 + 14 示例 + 14 契约
npm run test:flow              # 206 项（7 段）
npm run check:cards-fresh && npm run check:mcp-lint-fresh
node --check mcp-server/index.js
```

离线出图（不依赖浏览器）：`/tmp/fb-svg.ts`（resvg 直出，读 `computeDeterministicFishboneLayout` 的坐标）；
审计图输出到 `mcp-server/renders/`。

---

*本记录随 R29 一并提交。后续重构请以 §7 的「几何清单 + 渲染分离」为主线，§8 为验收清单。*

---

## 10. 抛弃 G6 的可行性（**仅限鱼骨图**）

> 范围声明：本节只讨论**鱼骨图**。其它 kind（PDPC / Relation 仍用 G6，ECharts / VChart / Mermaid 各有依赖）不在讨论范围。

### 10.1 鱼骨图对 G6 的依赖面（穷举，6 处）

`components/FishboneDiagram.tsx` 全文 165 行，对 G6 的依赖只有：

| # | 依赖 | 用途 | 可替代性 |
|:--:|:--|:--|:--|
| 1 | `new Graph({container, data, background})` | 承载画布 | ✅ 直接换 `<svg>` |
| 2 | `behaviors: ['drag-canvas','zoom-canvas','drag-element']` | 平移/缩放/拖节点 | ✅ 平移缩放可用 viewBox/CSS；**拖节点对只读图无意义，可去掉** |
| 3 | `graph.render()` / `setData()` / `setSize()` | 提交数据 | ✅ 纯 React 渲染 |
| 4 | `graph.fitView({padding: 120})` | 适配视口 | ✅ 布局已产出 bbox，`viewBox` 精确等价（更准） |
| 5 | `graph.toDataURL({pixelRatio})` ×3（getDataURL / exportPNG / exportPDF） | 导出位图 | ✅ `svgToDataURL`（`utils/exportUtils.ts`，6 个自绘组件已在用） |
| 6 | Canvas 渲染文字 | 标签 | ✅ **改 SVG `<text>`，位置由布局给出** |

**结论：没有任何一项是只有 G6 能做的。** 且第 6 项正是本轮所有渲染层问题的根源。

### 10.2 仓内已有 6 个"自绘 SVG"范式

| 组件 | 行数 | 渲染方式 |
|:--|:--:|:--|
| `ArrowDiagram.tsx` | 453 | `<svg>` + `viewBox` + `svgToDataURL` |
| `AffinityDiagram.tsx` | 554 | 同上 |
| `MatrixDiagram.tsx` | 1206 | 同上 |
| `MatrixPlotDiagram.tsx` / `RadarDiagram.tsx` / `ControlChart.tsx` | — | 同上 |

即：**鱼骨图改用自绘 SVG 不是新范式，而是向仓内主流范式回归**。

### 10.3 迁移的"已有资产"

本轮为离线审计写的 resvg 渲染器（约 200 行）**已经是一份可用的鱼骨图 SVG 渲染器**：
它消费 `computeDeterministicFishboneLayout()` 的 `{nodes, edges}`，按 `text` / `line` / `rect` / `circle` + 箭头绘制，
并按 `padding=120` 复现 `fitView`。产品化只需把它搬进 `components/`，**不需要重新设计**。

### 10.4 可行性判断：**可行，且是当前最优解**

| 维度 | 评估 |
|:--|:--|
| 技术可行性 | ✅ 布局已是纯数学（无物理模拟），渲染只需"按坐标画线/画字" |
| 工作量 | **组件 ~250 行 + Tier-1 ~30 行 + MCP 分支 ~15 行**（有原型可搬） |
| 风险 | 低。失去的只有"拖拽节点"（只读图不需要）与"G6 现成的 fitView"，两者都有更简单的等价物 |
| 收益 | ① 文字位置 100% 由布局决定（消灭 §5 三类问题）② 前端与 MCP 逐像素一致 ③ 与 6 个自绘组件统一 ④ 出图不再依赖 Canvas 生命周期（无"截帧残缺"类缺陷） |
| 代价 | 失去 G6 的动画/交互生态（鱼骨图当前也没用到动画，`duration` 恒为 0 或 500） |

### 10.5 建议的迁移路径（三步，每步可独立验收）

| 步骤 | 内容 | 验收 |
|:--:|:--|:--|
| S1 | 新增 `renderFishboneSVG(nodes, edges, styles)`（纯函数，输入布局输出 SVG 字符串） | 单测：SVG 里文字坐标 = 布局 `texts[].x/y`；resvg 出图与审计图一致 |
| S2 | `FishboneDiagram.tsx` 改用它：去掉 `Graph` 实例，改 `<svg>` + `viewBox` + `svgToDataURL` | 页面观感与当前一致；导出 PNG/PDF 正常；**纵向标签 8px 对称生效** |
| S3 | 断言把 `textBoxOfNode` 改为读**几何清单**（不再依赖节点 style） | `test:fishbone` 66 项全绿，且新增"文字坐标 = 布局坐标"断言 |

> S2 完成后，§8 的 A1/A2（渲染层疑点）**自动消失**——因为不再有"渲染层重新解释几何"这一环。

### 10.6 不建议做的事

- ❌ **不要在 G6 上继续调 label**（`labelOffsetX/Y` + `center` 已实测无效，`top/bottom` 语义不对称）；
- ❌ **不要为鱼骨图引入第三方 SVG 图库**（d3/svg.js 等）——现有 6 个组件都是裸 SVG，保持一致；
- ❌ **不要顺带改其它 kind**（PDPC/Relation 的 G6 用法与鱼骨图不同，另案评估）。

---

## 11. 抛弃 G6 与 MCP 渲染链路的关系（**仅限鱼骨图**）

### 11.1 当前 MCP 双模分工

| Tier | 覆盖 kind | 实现 | 典型耗时 |
|:--|:--|:--|:--|
| **Tier-1**（进程内 SVG 直出） | **仅 `flow`** | `scripts/flow_lint_core.ts` → `renderFlowSVG()` → `flowToSVG()` → `rasterizeSvgString()`（resvg） | ~60–150ms |
| **Tier-2**（无头浏览器） | 其余 13 个（**含鱼骨图**） | puppeteer 常驻热页 + `window.renderIQSChart` 内存桥接 → `captureIQSChart` | 冷启 3–8s / 热页 ~300ms |

### 11.2 鱼骨图改自绘后的链路

```
render_fishbone(dsl)
   └─ Tier-1: renderFishboneSVG(dsl)  →  SVG 字符串  →  resvg 光栅化  →  PNG base64
        （进程内，零 Web 服务、零 Chromium）
```

- **鱼骨图完全不需要无头浏览器** —— 与 `flow` 完全同构（都是"布局闭式解 → SVG 字符串 → resvg"）。
- 也不需要 `:12000` 前端服务在线（当前 Tier-2 依赖它）。

### 11.3 但 MCP **整体**仍需要无头浏览器

| kind 族 | 渲染依赖 | 能否进程内直出 |
|:--|:--|:--:|
| flow、**fishbone（改造后）** | 自研 SVG | ✅ |
| affinity / arrow / matrix / matrixPlot / radar / control | 自研 SVG（React `<svg>`） | ⚠️ 原理可行，但需先抽出"数据→SVG"纯函数 |
| pareto / histogram / scatter / basic | **ECharts**（Canvas/SVG renderer） | ❌ 需浏览器或 headless canvas |
| vchart | **VChart** | ❌ 同上 |
| pdpc / relation | **G6** | ⚠️ G6 有 SSR/SVG 能力但未验证 |
| mermaid | **Mermaid**（DOM 依赖） | ❌ 需 DOM |

**结论（三句话）**：

1. **鱼骨图抛弃 G6 ⇒ 鱼骨图不再需要无头浏览器**（可进 Tier-1，与 flow 同构）；
2. **但 MCP 引擎整体仍保留 Tier-2** —— ECharts / VChart / Mermaid 这 3 类共 7 个 kind 离不开浏览器；
3. 因此这是"**逐 kind 下沉 Tier-1**"的收敛过程，而非"MCP 去浏览器化"。鱼骨图是第 2 个可下沉的 kind（第 1 个是 flow）。

### 11.4 顺带解决的运维问题（仅鱼骨图受益）

| 现存问题 | 抛弃 G6 后 |
|:--|:--|
| Tier-2 冷启 3–8s、需常驻热页 | 鱼骨图降到 ~60–150ms，无热页 |
| 12s 熔断与孤页清理（R27 AUD-165/166） | 鱼骨图不涉及 |
| 截帧残缺（R26/R28 的 Dagre 异步、Canvas 帧同步） | 鱼骨图不涉及（SVG 无生命周期） |
| `IQS_BASE_URL` 不通则无法出图 | 鱼骨图不依赖前端服务 |
| G6 版本升级导致的 label/behavior 语义漂移 | 不再受影响 |

---

## 24. 范式归位与自绘 SVG 落地（R29 · 十八订）

针对图面实测中反馈的「文字未居中、箭头丢失、视口留白过大」三项问题，追溯至底层并实施闭环重构：

### 24.1 核心修复项与台账 (AUD-184~187)

| 编号 | 属性 | 根因定位 | 处置方案 |
|:---|:---:|:---|:---|
| **AUD-184** | 渲染层 | G6 5.0 的 `label` 偏移对小尺寸节点（2px）存在基线反向拉扯与截断 | **彻底移除 G6 渲染承载**：`FishboneDiagram.tsx` 改为完全自主的轻量级 SVG 渲染；文字基于 `textBoxOfNode` 的 SSOT 坐标直接居中投影；端点连线补充精确几何定向的三角箭头（`polygon` 矢量流）。 |
| **AUD-185** | 布局层 | `resolveLabel` 避让斜骨时单向退化为左右外挂，导致同层节点排版不统一 | 采用基于骨刺方向的**两阶段微步外移探针**（`dy` 随垂直生长侧向外推移），且严格受控于脊椎中线禁入约束（防越界穿刺主骨），保持深层节点语义严格居中。 |
| **AUD-186** | 视口层 | 视口固定为 `1600×1000` 虚拟尺寸 + 静态 `PAD=120`，导致视口四周大量空白 | 引入 `ResizeObserver` 捕获真实容器尺寸反馈给布局引擎，`viewBox` 收紧至真实内容包围盒并赋予紧致安全边距 `MARGIN=24`（实现宽高先达者满贴边缘）。 |
| **AUD-187** | 稳态层 | `extractClusterElements` 重复计算文字盒；`materializeCluster` 存在 150px 突变阈值与单侧钳位 | 统一走 `textBoxOfNode` SSOT 提取；消除硬阈值，骨高超量时按各行需求等比例缩放分配；门禁新增随机树深度回归测试（67 项断言全绿）。 |

### 24.2 现状结论
- 鱼骨图组件与工具链完全脱离 G6，前端与无头直出（`utils/fishboneSvg.ts`）实现 100% 像素级一致；
- 门禁脚本 `npm run test:fishbone` 扩展至 67 项不变量测试，全量 PASS；
- `npm run test:flow` 与 `npx tsc --noEmit` 全绿通过。
