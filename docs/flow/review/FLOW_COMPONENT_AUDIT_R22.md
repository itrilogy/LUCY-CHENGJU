# IQS-Flow 组件代码审计 · R22（2026-09-12）

> **轮次**：R22（承接 `FLOW_AUDIT_FINDINGS.md` 的 R1–R21 / AUD-001..140）
> **触发**：使用者对 R21 修复结果**复测**后重提同样两项（附截图 `.reasonix/attachments/clipboard-20260912-2139/2141*.png`）：
> ① **连线目标缺失**（画布上出现不指向可见目标的线，含"上方"那条）；② **子流程未按范式/数学/布局/落点缩放规则显示**。
> **方法**：先查全部工程记录（`docs/flow/{spec,design,math,notes,review}` 共 38 份）划定已知边界与**判据来源**，
> 再用探针把「渲染所用的那条路径」逐条打出来，定位到函数与行。
> **复现环境**：Node **v26.5.0**，`node --experimental-strip-types`。
> **本轮定位**：R21 的三项修复中 **1 项正确、2 项不完整/判错机制**（见 §1），已全部补完并加固门禁。

---

## 0. TL;DR（给后续审计者的最短路径）

| # | 结论 | 证据 |
|:--:|:--|:--|
| 1 | **AUD-140（渲染缓慢）R21 修得正确** —— memo 化 + `<g ref>` 单次写入，属根治 | 代码直读；本轮未改动 |
| 2 | **AUD-138（子流程）R21 只修了渲染层** —— 布局层 `ExcelLayout` 仍用 `√N` 方阵，**两层数学分叉**，故现象未消 | §3；`subprocessInnerGrid` 单一真源修复 |
| 3 | **AUD-139（连线缺目标）机制判错** —— 其归因「默认顺序流未跳过 `subprocess`」对 canonical 示例**不成立**（实测边集 13 显式 + 1 默认，`sub1` 无隐式出边）；真因是**端口背向 + 路径回折穿自身盒** | §2；`AUD-141/142/143` |
| 4 | 新增几何门禁 `assert_flow_geometry.ts`（G1–G5，12 断言），并做**注入回归**证明其能拦住上述缺陷 | §5 |
| 5 | 发现并修正 3 处**断言口径缺陷**（按颜色计数边路径 / A1 断言测错对象 / 交叉色断言绑死色值） | §6 |
| 6 | `PortOptimizer` 与 `flowToSVG` **各自复制**混合内核编排 → 口径分叉风险，已收敛为 `solveRouteHybrid` 单一真源 | §4 |

**门禁**（本轮末态）：

```
npx tsc --noEmit          EXIT=0
npm run test:flow         EXIT=0   203 pass / 0 fail（7 段，新增 assert_flow_geometry）
npm run validate:dsl      EXIT=0   3 段 PASS
npm run check:cards-fresh EXIT=0   PASS（重生成前后一致）
```

---

## 1. 与既有记录的关系（先划边界，再判定"此前方法"的正确性）

| 事项 | 既有记录 | 本轮复核结论 |
|:--|:--|:--|
| 子流程**内嵌小图** | ✅ 已实现（`FLOW_LAYOUT_NOTES_STAGES1-3.md` §4 阶段三b） | 确认存在 |
| 子流程**退出主网格** | ✅ 已实现（`FLOW_LAYOUT_NOTES_ALIGN_RECOVERY.md`） | 确认存在 |
| 子流程**继承外层 `Layout`** | R21 记为「新发现 AUD-138」并**已修复** | ⚠️ **修复不完整**：只改渲染层，布局层未同步 → 见 §3 |
| 连线**缺目标** | R21 记为「AUD-139，与 AUD-119 同源：默认流跳过集合未含 `subprocess`」并**已修复** | ❌ **机制判错**：对 canonical 示例不成立 → 见 §2 |
|  `FlowDiagram` 渲染缓存 | R21 记为「AUD-140」并**已修复** | ✅ 修复正确（memo 边界 + DOM 写入解耦） |
| 端口优化单图 ~0.3s | `FLOW_ROUTING_WORKLOG.md:643`「可接受」 | R21 已修正该判断（交互循环前提不成立），本轮确认 |
| M4「两趟端口分配」/ M5「整列整行腾挪」未按文档实现 | AUD-061/062/063（P1，未闭环） | 与本轮 AUD-141/142 **同域**；本轮走了「端口朝向 + 代价函数」路线，未动 M4/M5 机制 |
| 折弯/回折判据的其余同源处 | R21 列为 **P0 未完成**：`083 / 107 余项` | ✅ **本轮完成该余项**（`countBends` 补符号项）→ AUD-142 |

### 1.1 「此前方法」正确性审核（逐条）

- **R18–R19（L4 内核换代）**：方法正确、且是本轮能修好的前提（`countBends`/混合内核/端口坐标下降均在位）。其遗留的**口径不统一**（渲染与端口评估各写一遍编排）在本轮暴露为风险，已收敛。
- **R21 的 AUD-139 归因**：方法上"先查记录再定位"是对的，但**定位层级偏了**——它停在解析层（默认流跳过集合），而使用者看到的缺陷在**渲染层的路径几何**。其补丁（源侧跳过集合加 `subprocess`）语义上应当保留（正确性无害），但**不是该现象的成因**。
- **R21 的 AUD-138 归因**：定位到 `renderSubprocessInner` 正确，但**只改一层**（渲染），未核对该尺寸来源在布局层（`ExcelLayout`），因此"框"与"框内小图"各按一套数学排布。
- **R21 的门禁判据**：`191 断言`全部通过却漏掉两处使用者肉眼可见的缺陷 —— 原因是断言只校验「端点是否贴节点边界」，**不校验路径是否穿盒/回折、端口是否朝向来向、子流程两层尺寸是否同构**。这是本轮新增 G1–G5 的直接动机。

---

## 2. 缺陷 A · 连线"缺目标"（AUD-141/142/143，P1）

### 2.1 现象与初查

截图（21:39/21:41）：「录入工艺参数」右侧伸出一段线随即消失；「物理/化学并行检测」网关右侧有长虚线；指向观感"没有目标"。

**先排除**（复算 canonical 示例，`dsl/cards/iqs_native/flow.card.ts` 的 `EXAMPLE_DSL`）：

```
errors: []   warnings: []
edges: 12 显式/分支 + 1 默认（w1→w2）   ← R21 所称「默认流生成 sub1→下一节点」不存在
nodes: 15（含 sub1 的 s1/s2、N/DATA 各 1）
```

→ **默认顺序流不是本现象成因**（`sub1` 的下一节点 `w5` 是分支目标，已被 `branchTargets` 拦住）。

### 2.2 定位（打「渲染所用的那条路径」）

探针（已落库：`node --experimental-strip-types scripts/_flow_probe_routes.ts`）复算 `flowToSVG` 的端口分配 + 混合内核，
得到**修复前**的边路径（单位 px）：

| 边 | 修复前路径 | 折弯 | 缺陷 |
|:--|:--|:--:|:--|
| `w2 → g1` | `[[451,134],[485,134],[290,134],[290,547],[324,547]]` | 4 | 第 2 段 `y=134, x:485→290` **横穿 w2 自身盒（331–451）** → 即截图右侧"伸出即消失"的那条线 |
| `p1 → w4` | `[[391,240],[391,206],[391,480],[666,480],[666,525]]` | 4 | 第 2 段 `x=391, y:206→480` **纵穿 p1 自身盒（240–294）** → 截图网关上下穿线 |
| `d1 → p1` | `[[1260,267],[329,267]]` | 0 | 源在 d1 的 **L** 端口，却进 p1 的 **L** 端口，而来向在右侧 → 箭头层按 `tp='L'` 把三角尖端画在 `b.x-W/2-al`，**指向背离来向**；931px 水平线横贯 4 列 |
| `w3 → w8` | `[[666,435],[666,480],[934,480],[934,603],[934,569]]` | 4 | 末段原地折返 34px（回折） |
| `g1 → p1` | `[[324,547],[290,547],[290,267],[329,267]]` | 2 | `sp=L, tp=L`（同 x 垂直位移）→ 端口正交于来向，绕左外侧进入 |

### 2.3 根因（三层，各有范式锚点）

| 层 | 位置 | 问题 | 范式锚点 |
|:--|:--|:--|:--|
| **路径层** | `AlgebraicFlowRouter.solveAlgebraicRoute.hitsObstacle` / `VisibleGraphRouter.blocked` | 两内核都写了 `if (id === from.id \|\| id === to.id) continue;` —— **把源/目标自身盒整体豁免**，于是"绕出去再折回、穿过自己盒子"的畸形路径被判为无碰撞，凭折弯数更少而胜出 | `FLOW_OPTIMALITY_FRAMEWORK.md` A4/A6（不穿节点盒；A4 实为软约束，AUD-027） |
| **代价层** | `VisibleGraphRouter.countBends` | 判据只按轴向（`d1x!==0 && d2y!==0`），**漏计 180° 回折**；`solveAlgebraicRoute.computeCost` 在 R19 已补符号项，但 `countBends` 未补 → 端口评估与混合内核择优仍低估回折路 | AUD-083/107（R21 列为 P0 余项）+ `FLOW_ROUTING_MATH_AND_IMPLEMENTATION.md` |
| **端口层** | `PortOptimizer.optimizePorts` | 代价函数**只看折弯数**；目标端口"背向"不受罚 → 0 折弯的背向解（`d1: L → p1: L`）压过方向正确但折弯更多的解 | `FLOW_ROUTING_ENGINE_DESIGN.md` §1.2「入口端口首选**面向源一侧**」/ §2.1「禁止落到背向目标的端口」 |

### 2.4 修法

1. **`hitsObstacle` / `blocked`：自身盒仍须检测**，只把判定盒**收缩 3px**（`segmentIntersectsBox(..., self ? -3 : 4)`）——
   出线 stub 自盒边界出发不会进入收缩盒，而任何真正穿回盒体的段必然命中。
2. **`countBends` 补符号项**：`else if (d1x*d2x + d1y*d2y < 0) b += 2;`（与 `computeCost` 同口径）；新增 `pathLength` 供次关键字使用。
3. **`costOf = 折弯数 + BACK_FACING_PENALTY(1000) × 背向数`**，背向 = 源端口法向背离目标 + 目标端口法向背离来源
   （**软惩罚**：端口耗尽时仍可退化为背向，不会无解 —— 与 §2.1 的"降级"语义一致）。
4. **A1 白名单化（AUD-143）**：`optimizePorts({ relaxNodes })` 对**网关**（汇聚/发散）放宽入/出互斥。
   依据 `FLOW_ROUTING_ENGINE_DESIGN.md` §1.2「`in(n) ∩ out(n) = ∅`，**除非汇聚/发散节点允许复用**」+ §5.1「默认**允许**（white-list）」。
   必要性经实测：`g1` 在 `p1` 正下方、而 `p1` 的出边也朝下，硬互斥会把 `g1→p1` 逼成"背向进入 + 反向箭头"。
5. **A4 兜底（AUD-144）**：新增 `solveRouteHybrid()` —— 严格档（自身盒收缩判定）优先，
   严格档**不可达时**自动以 `selfBoxStrict:false` 放宽重试（**宁可穿盒，不可缺线**）。
   依据：A4 是软约束（AUD-027）；缺线是硬缺陷，穿盒是软缺陷。

### 2.5 修复后（同一探针、同一示例）

| 边 | 修复后路径 | 折弯 | 说明 |
|:--|:--|:--:|:--|
| `g1 → p1` | `[[391,520],[391,294]]` | **0** | `T→B` 竖直直连，箭头迎向来向 |
| `d1 → p1` | `[[1260,267],[453,267]]` | **0** | `L→R` 水平直连，箭头贴 p1 右缘**指向节点**（观感"落到目标上"） |
| `w2 → g1` | `[[451,134],[492,134],[492,547],[458,547]]` | 2 | 不穿 w2；绕 `p1` 左外侧（`p1` 挡在同列中间，必须绕行） |
| `p1 → w4` | `[[391,294],[391,480],[666,480],[666,525]]` | 2 | 从 `p1` 底部出，不穿 p1 |
| `w3 → w8` | `[[726,413],[840,413],[840,547],[874,547]]` | 2 | 回折消失（原 4 弯 5 点） |

---

## 3. 缺陷 B · 子流程未按范式/数学/落点缩放显示（AUD-138 续）

### 3.1 现象与「两层数学分叉」

| 层 | 位置 | 规则（修复前） |
|:--|:--|:--|
| **布局层**（框尺寸 / 落格） | `ExcelLayout.computeExcelLayout` 子流程分支 | `innerCols = Math.ceil(Math.sqrt(childCount))` → 框 = `cols×140 × rows×48` |
| **渲染层**（框内小图） | `flowToSVG.renderSubprocessInner`（R21 改动） | 改按 `data.layout` 决定列数：`H`→一行 / `V`→一列 |

R21 只动了第二行 ⇒ **框按 √N 方阵、内部小图按 Layout 排**，两者不自洽。

实测（修复前）：`sub1` 框 `W=280.0 H=48.0`（=2×140 × 1×48，按 √2→2 列算），内部 2 个迷你节点按 `H` 排一行只占约 172px。
**V 布局更严重**：框仍是 `2×140 × 1×48`，而内部按一列排 2 个需 `2×(20+8)=56px`，可用高仅 `48-20-6=22px` → **必然溢出框体**。

范式依据：
- `FLOW_NDATA_LANE_DESIGN.md` §二：子流程维持「**整数倍标准格**」（140×48 基础），与邻格无缝对齐；
- `FLOW_ROUTING_ENGINE_DESIGN.md` 前提②：子流程是**等比例缩放的流程节点**，影响泳道/交叉格高宽；
- `ExcelLayout.ts` 原注释亦写「内部也按同款格子数学排布」——实现与该注释不符。

### 3.2 修法（收敛为单一真源）

```ts
// ExcelLayout.ts —— 导出唯一真源
export const SUBPROCESS_INNER = { w: 140, h: 48, maxCols: 4 };
export function subprocessInnerGrid(data, childCount): { cols, rows } {
  const n = Math.max(1, childCount);
  const cols = data.layout !== 'V' ? Math.min(n, SUBPROCESS_INNER.maxCols) : 1;  // H 横排 / V 竖排
  return { cols, rows: Math.ceil(n / cols) };
}
```

- **布局层**：`halfW = max(m.halfW, cols×140/2)`、`halfH = max(m.halfH, rows×48/2)`（同一 `cols/rows`）。
- **渲染层**：`renderSubprocessInner` 调同一 `subprocessInnerGrid`，并把内部节点放在**第 (r,c) 格心** `(x0+(c+0.5)cellW, y0+(r+0.5)cellH)` ——
  即"内部小图 = 框内整数倍格"，与框的 `cols×140/rows×48` **同构**；空间不足时等比缩放（格 < 32×12 则放弃缩略图，**宁缺勿溢出**）。
- 迷你字号 `8 → 10(R21) → **≥11**`（范式可读下限；`docs/design` §4.2 `micro=11`）。

### 3.3 修复后

| 用例 | 期望（范式） | 实测 |
|:--|:--|:--|
| canonical `sub1`（`Layout: H`，2 子节点） | 框 `2×140 × 1×48` | `W=280.0 H=48.0` ✅ 且内部两节点落于两格心 |
| `Layout: V`，3 子节点 | 框 `1×140 × 3×48 = 140×144` | `W=140.0 H=144.0` ✅（不再溢出） |
| 迷你字号 | ≥ 11 | 11 ✅ |

---

## 4. 顺带收敛：`solveRouteHybrid` 单一真源（AUD-145）

修复前 `flowToSVG`（渲染）与 `PortOptimizer.bendsOf`（端口评估）**各自复制**了同一段编排：

```ts
const pathOld = solveAlgebraicRoute(...);
const pathVg  = solveVisibleGraphRoute(...);
const path    = pickShorter(pathOld, pathVg) ?? pathOld;
```

一旦两处口径分叉（例如只在渲染侧加兜底/惩罚），端口选择就会按**与最终渲染不同**的代价做决定 —— 这正是 AUD-141 排查中出现过的风险。
现统一为 `VisibleGraphRouter.solveRouteHybrid(...)`：**混合内核（取折弯更少者）+ A4 软约束兜底**，渲染与端口评估共用。

---

## 5. 门禁增补：`scripts/assert_flow_geometry.ts`（G1–G5，12 断言）

| 断言 | 不变量 | 范式锚点 |
|:--|:--|:--|
| `g1-zero-pierce` | 边路径**零穿盒**（含源/目标自身盒；自身盒按 −3px 收缩判定，stub 段自然豁免） | `FLOW_OPTIMALITY_FRAMEWORK.md` A4/A6 |
| `g2-no-reversal` | **零 180° 回折**（独立几何判据）+ `countBends` 口径自洽（`= rawBends + 2×回折`） | `FLOW_ROUTING_MATH_AND_IMPLEMENTATION.md`、AUD-083/107 |
| `g3-port-facing` | **端口无背向**（源朝目标、目标迎来源） | `FLOW_ROUTING_ENGINE_DESIGN.md` §1.2 / §2.1 |
| `g4-*`（6 条） | 子流程框 `= cols×140 × rows×48`、`H→一行 / V→一列`、迷你字号 ≥ 11、空子流程不放大 | `FLOW_NDATA_LANE_DESIGN.md` §二 + 前提② |
| `g5-a1-whitelist` | A1：**非网关**节点入/出端口互斥（校验**实际使用的** `optimizePorts`） | `FLOW_ROUTING_ENGINE_DESIGN.md` §1.2 / §5.1 |

### 5.1 注入回归（门禁须自证有效 —— R21 范式增量）

用 `scripts/_flow_gate_injection.py`（R22 **落库版**，`python3 scripts/_flow_gate_injection.py`）注入缺陷 → 跑门禁 → 还原并校验哈希（三例全部还原）：

| 用例 | 注入内容 | 门禁反应 |
|:--|:--|:--|
| **A · 碰撞检测失效** | 两内核 `hitsObstacle`/`blocked` 直接 `return false` | ✅ 报红 `g1-zero-pierce — p1→w4 穿 w3 \| w2→g1 穿 p1 \| w3→w8 穿 w4` |
| **B · 回退 R21 旧配置** | 自身盒整体豁免 + 去掉背向罚 + `relaxNodes` 置空 | ✅ 报红 `g1-zero-pierce — d1→p1 穿 p1`、`g3-port-facing — d1→p1(L>L)`（**正是截图缺陷**） |
| **C · 子流程 √N 方阵** | 列数改回 `Math.ceil(Math.sqrt(n))` | ✅ 报红 `g4-grid`、`g4-V: 框高 = 96`、`g4-V: 框宽 = 280` |

> **自查发现并修正的断言设计缺陷**：G2 最初写成 `countBends(pts) - rawBends(pts) > 0`，即**借用被测实现自身**做判据 ——
> 注入"删掉 `countBends` 回折项"时该断言**恒真**（形同虚设）。已改为**独立几何判据** `reversalCount()`（共线且点积 < 0）+ 一条口径自洽断言。

---

## 6. 断言口径勘误（AUD-146）

| 断言 | 原口径 | 问题 | 现口径 |
|:--|:--|:--|:--|
| `边路径数 === 解析边数` / `连线折线数 === 边数` / `全部边为正交折线` | 按 `stroke="#64748b"`（连线本色）正则计数 | 被判定为**交叉反差**的边用另一种颜色 → **计数漏 1**（本轮即成假红） | 渲染层新增语义锚点 **`data-edge="1"`**，断言按锚点计数（颜色不再是判据） |
| `cross: 差异色不是连线本色` | 断言 SVG 含 `contrastStroke('#334155','#f8fafc')` 的字面值 | 绑死具体色值，随交叉位置变化即误报 | 从实际渲染的 `data-flow="cross-over"` 元素上取 `stroke`，断言其 **≠ 该图连线本色** |
| `a1-wsad: 入出端口互斥` | 校验 `solveAlgebraicPorts`（**贪心初值**） | 与实际渲染所用的 `optimizePorts` 口径脱节（白名单/迭代结果都看不到） | 保留原断言（初值仍应互斥），**新增** `g5-a1-whitelist` 校验实际端口 |

---

## 7. 验证记录（本轮末态，命令即证据）

```
npx tsc --noEmit                        EXIT=0
npm run test:flow                       EXIT=0
   parser 66 / svg 85 / bpmn 17 / mainline 8 / cell_order 8 / alignment 7 / geometry 12
   = 203 pass / 0 fail（7 段）
npm run validate:dsl                    EXIT=0   3 段 PASS（lint_examples + assert_card_contracts）
npm run check:cards-fresh               EXIT=0   PASS（重生成前后完全一致）
```

**改动文件**（本轮）：

| 文件 | 变更 |
|:--|:--|
| `components/flow/ExcelLayout.ts` | 新增 `SUBPROCESS_INNER` / `subprocessInnerGrid`（唯一真源）；子流程框改用 `cols×140 / rows×48` |
| `components/flow/flowToSVG.ts` | `renderSubprocessInner` 改用同一真源 + 格心铺排 + 缩放（`fs ≥ 11`）；`relaxNodes` 传入；边路径加 `data-edge` 语义锚点；改用 `solveRouteHybrid` |
| `components/flow/VisibleGraphRouter.ts` | `countBends` 补回折符号项；新增 `pathLength`；`blocked` 自身盒收缩判定 + `selfBoxStrict`；新增 `solveRouteHybrid` |
| `components/flow/AlgebraicFlowRouter.ts` | `solveAlgebraicRoute` 支持 `selfBoxStrict`；`hitsObstacle` 自身盒收缩判定 |
| `components/flow/PortOptimizer.ts` | `costOf = 折弯 + 背向罚`；`relaxNodes`（A1 网关白名单）；改用 `solveRouteHybrid` |
| `scripts/assert_flow_svg.ts` | 三处断言口径勘误（§6） |
| `scripts/assert_flow_geometry.ts` | **新增**（G1–G5 / 12 断言） |
| `scripts/_flow_probe_routes.ts` | **新增**（连线路径诊断探针：端口 / 路径点 / 折弯 / 穿盒标记） |
| `scripts/_flow_gate_injection.py` | **新增**（门禁注入回归：A/B/C 三例 + 哈希还原校验） |
| `package.json` | `test:flow` 链入 `assert_flow_geometry.ts` |

---

## 8. 与范式文档的逐条对照（审核结论）

| 范式条款 | 出处 | 本轮实现 | 判定 |
|:--|:--|:--|:--|
| 入口端口"面向源一侧"，禁止背向 | `FLOW_ROUTING_ENGINE_DESIGN.md` §1.2/§2.1 | `backFacing × 1000` 罚（软约束，端口耗尽时可降级） | ✅ 一致（文档 §2.1 亦允许"沿当前朝向降级"） |
| `in(n) ∩ out(n) = ∅`，**除非汇聚/发散复用** | 同上 §1.2 + §5.1 | `relaxNodes` = 网关白名单 | ⚠️ **取舍**：文档 §3 的 P3-a 主张"硬约束"，§5.1 同时承认复用需求；实测"源与出边同侧"的企业流程图在硬约束下**无解**（必背向），故取软约束 + 白名单，并在 §9 记为未决 |
| A4 无碰撞（**软约束**） | `FLOW_OPTIMALITY_FRAMEWORK.md` / AUD-027 | 严格档优先 + `selfBoxStrict:false` 兜底 | ✅ 一致（且把"软"落实为可执行的两级） |
| A6 不穿节点盒 | 同上 | 自身盒也纳入判定（收缩 3px） | ✅ 一致（修正了此前"自身盒豁免"） |
| 折弯判据须含方向符号（回折 ≈ 两转） | `FLOW_ROUTING_MATH_AND_IMPLEMENTATION.md` / AUD-083/107 | `countBends` 补符号项；G2 断言 | ✅ 一致（R21 P0 余项本轮闭环） |
| 子流程 = 等比例缩放节点、整数倍格、影响交叉格高宽 | `FLOW_NDATA_LANE_DESIGN.md` §二 + 前提② | `subprocessInnerGrid` 单一真源 + 格心铺排 | ✅ 一致 |
| "混合内核取折弯更少者 ⇒ 不劣于任一" | `FLOW_ROUTING_MATH_DIRECTIONS.md` §3.1 | `solveRouteHybrid` 保留该择优，仅追加兜底 | ✅ 一致（不劣性质未被破坏） |

---

## 9. 遗留与未决（交给后续审计者）

1. **A1 硬约束 vs 白名单**：本轮取"软约束 + 网关白名单"。若后续要求回到硬约束，须先给出"网关同侧汇聚"场景的可解构造（否则必然产生背向解）。
2. **G2 判别力边界**：几何判据 `reversalCount` 只覆盖 180° 原位回折；**"绕远再折回"（非共线的大回环）** 不判回折，仅由 `g1-zero-pierce`/折弯数间接约束。建议后续以"折弯数上界"或"路径长度相对下界"补一条。
3. **兜底档的可见性**：`solveRouteHybrid` 放宽档触发时**当前不产生告警**（只是保证有解）。建议给 `flowToSVG` 加一条 `data-flow="route-fallback"` 标记 + lint warn，避免"穿盒"静默发生。
4. **AUD-061/062/063（M4 两趟端口分配 / M5 整列整行腾挪）** 仍未按文档实现；本轮未触碰其机制（走的是代价函数 + 朝向前）。
5. **AUD-083/107 的其余同源处**：`getTheoreticalBends`（`AlgebraicFlowRouter.ts`）仍按"0/1/2 弯"粗粒度分档、**不看符号**，是下一处可审计点。
6. **文档漂移**：`FLOW_COMPONENT_AUDIT_R21.md` 与台账 R21 段的「AUD-138/139 已修复」表述**未标注不完整**，本轮已在台账 R22 段补注（R21 报告本身保持历史原样，不覆盖）。

---

*本报告由「使用者实测复测」驱动；所有数据可在本仓库用 `scripts/_flow_probe_routes.ts`（路径）、`scripts/assert_flow_geometry.ts`（不变量）与 `scripts/_flow_gate_injection.py`（门禁自证）复现。*
