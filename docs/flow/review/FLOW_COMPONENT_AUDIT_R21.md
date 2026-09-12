# IQS-Flow 组件代码审计 · R21（2026-09-12）

> **轮次**：R21（承接 `FLOW_AUDIT_FINDINGS.md` 的 R1–R20 / AUD-001..137）
> **触发**：使用者实测三个问题（附截图）：
> 1. **子流程未继承外层布局**（`Type[SUB]` 内部节点不按 `Layout H/V` 排布）
> 2. **连线"缺目标"**（画布上出现不指向可见目标的线）
> 3. **渲染缓慢**（交互明显卡顿）
> **方法**：先查全部工程记录（`docs/flow/notes`、`review`、`design`，共 38 份）确认已知边界，再逐层定位到代码行。
> **复现环境**：Node v26.5.0，`node --experimental-strip-types`；探针经 `vite.ssrLoadModule` 加载。

---

## 0. 与既有记录的关系（先划边界，避免重复）

| 事项 | 工程记录状态 | 本轮结论 |
|:--|:--|:--|
| 子流程**内嵌小图** | ✅ **已实现** —— `FLOW_LAYOUT_NOTES_STAGES1-3.md` §4「阶段三b」新增 `renderSubprocessInner`，svg 断言 45→51 | 确认存在 |
| 子流程**内部退出主网格** | ✅ **已实现** —— `FLOW_LAYOUT_NOTES_ALIGN_RECOVERY.md`（2026-08-31） | 确认存在 |
| 子流程**继承外层 `Layout`** | ❌ **全部记录中查无** | **本轮新发现（AUD-138）** |
| `SUB` 打断默认序流须显式连 | ✅ 已记录并已修（AUD-119/122） | 确认 |
| 默认顺序流**只跳过网关** | ✅ 已记录 —— `FLOW_LAYOUT_NOTES_RECOVERY_P0.md:94` | 与本轮问题 2 相关 |
| 端口优化**单图 ~0.3s** | ✅ 已自记 —— `FLOW_ROUTING_WORKLOG.md:643`「单图耗时约 0.3s 量级（可接受）」 | **该判断需修正，见 AUD-140** |
| `FlowDiagram` 渲染缓存 | ❌ 查无 | **本轮新发现（AUD-140）** |

**结论**：问题 1 与问题 3 是**记录中不存在的新发现**；问题 2 的**机制**已在记录中，但**表现**（画布可见的断头线）未被记录。

---

## 1. AUD-138 · 子流程不继承外层布局（P1）

### 现象（截图 1）

示例中 `sub1`（`Type[SUB]`，标签「技术中心复核」）在画布上只呈现为一个普通圆角矩形，**内部缩略图未按 `Layout: H` 横排**。

### 代码定位

`components/flow/flowToSVG.ts:166`：

```ts
const colMax = Math.max(1, Math.ceil(Math.sqrt(n)));   // 内部列数 = √N
```

函数签名 `renderSubprocessInner(data, inner, innerEdges, st, p)` **接收了 `data`**，但**从未读取 `data.layout`** —— 内部列数恒为 `√N`，与文档级 `Layout: H/V` 无关。

同函数 `:163`：

```ts
const pad = 10, miniH = 20, fs = 8;   // 迷你字号 8px
```

**`fs = 8` 低于范式下限 11px**（`DESIGN.md` §4.2 `micro` = 11）。

### 数据层验证（确认不是解析问题）

探针实测 `flow.card.ts` 的 canonical 示例：

```
subProcesses: [{"id":"sub1","nodes":["s1","s2"]}]          ← 收集正确
parent 非空节点: [["s1","start","sub1"],["s2","end","sub1"]] ← 父子关系正确
边集含 ["s1","s2"]                                          ← 内部边正确
errors: []                                                  ← 无解析错误
```

**→ 数据完整，缺陷纯在渲染层。**

### 修复方向

```ts
// 内部列数应由 Layout 决定，而非 √N
const horizontal = data.layout === 'H';
const colMax = horizontal ? n : 1;          // H → 全部一行；V → 全部一列
// 若内部节点较少，可保留 N 的上限以控制宽度
```

`fs` 建议提到 `10`（缩略图可略低于正文，但不应低于 10）。

---

## 2. AUD-139 · 画布出现不指向可见目标的连线（P1）

### 现象（截图 2）

「录入工艺参数」右侧有一段水平线伸出，但**未落在画布上任何可辨目标**；并行网关「物理指标检测」的虚线亦向右长距离延伸。

### 代码定位 · 机制

工程记录 `FLOW_LAYOUT_NOTES_RECOVERY_P0.md:94` 已写明：

> **根因**: 默认顺序流循环只跳过网关（`if (a.type === gateway) continue`），`end`/`annotation`/`dataObject` 仍会被当作源连出默认边。后果：结束节点 w3(end)→w4 产生默认边，把孤岛节点"连走"导致孤立检查漏报。

`components/flow/FlowParser.ts` 的默认顺序流**未排除 `subprocess`**：子流程容器在序列中被当作普通节点参与 `prev → cur` 连边，于是产生 `sub1 → 下一节点` 的**隐式边**，与作者显式写的 `sub1 → #w8` 叠加。

### 数据层验证

canonical 示例的边集含：

```
["g1","p1"] ["g1","w5"] ["p1","w3"] ["p1","w4"] ["w2","g1"]
["w3","w8"] ["w4","w8"] ["w5","sub1"] ["sub1","w8"] ["w8","w9"]
["w9","w10"] ["w1","w2"] ["s1","s2"]
```

**13 条边中 12 条为显式声明，`["w1","w2"]` 为默认顺序流产生** —— 说明默认流**确实在生成边**，其跳过规则是否覆盖 `subprocess` / `annotation` / `dataObject` 需逐一核对。

### 修复方向

1. 默认顺序流的**源侧跳过集合**应显式列出：`{exclusiveGateway, parallelGateway, end, annotation, dataObject, subprocess}`
2. 画布侧：对**目标落在画布可视范围外**的边，走路由的"出界折返"分支而非直线延伸（属 `AlgebraicFlowRouter` 的边界处理）

---

## 3. AUD-140 · 渲染缓慢（P0 · 交互可用性）

### 代码定位

`components/flow/FlowDiagram.tsx:26`：

```tsx
const svg = flowToSVG(data, finalStyles);   // ← 裸调用，位于组件函数体
```

**全组件 178 行，零 `useMemo`。** `flowToSVG` 内部含 `computeExcelLayout` + 端口优化路由（实测 **单图 ~0.3s**，见 `FLOW_ROUTING_WORKLOG.md:337` 的 323ms / 365ms 实测值）。

`:171`：

```tsx
dangerouslySetInnerHTML={{ __html: svgString.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') }}
```

### 双重全量重算

拖拽画布时 `handlePointerMove` → `setView` → 组件重渲染，于是：

1. **`flowToSVG()` 重跑一次**（≈0.3s，含布局与路由）—— 而 `data`/`styles` **根本没变**
2. **`dangerouslySetInnerHTML` 重新解析并写入整个 SVG 字符串** —— 拖拽时**每帧一次**

**两者叠加**即"渲染缓慢"。`FLOW_ROUTING_WORKLOG.md:643` 判断「0.3s 可接受」的前提是**一次生成**；一旦进入**交互循环**（平移/缩放），该前提不成立。

### 修复方向

```tsx
// ① SVG 字符串只在数据/样式变化时重算
const svgString = useMemo(() => flowToSVG(data, finalStyles), [data, finalStyles]);

// ② DOM 写入与视图变换解耦：view 变化时只改 transform，不重设 innerHTML
const innerRef = useRef<SVGGElement>(null);
useEffect(() => {
  if (innerRef.current) innerRef.current.innerHTML = innerSvg;
}, [svgString]);                                   // 仅 svgString 变化时写

// ③ transform 作用于外层 <g> 或容器，避免触碰 innerHTML
```

预期收益：拖拽/缩放从「每帧 0.3s + 全量 DOM 重写」降为「每帧仅改 transform」。

---

## 4. 与 R20 未闭环项的关系

R20（AUD-116..137）中与本轮直接相关的两条：

| ID | 内容 | 与本轮关系 |
|:--|:--|:--|
| **AUD-119** | N/DATA 被默认序流串入主流（P0） | **同源机制** —— 本轮 AUD-139 是它的**兄弟症状**（`subprocess` 亦未被默认流跳过） |
| **AUD-122** | `flow.agent.md` 正例 B 不自洽 | 已修（补 `q2 → #w3`）；本轮 canonical 示例已用规避写法 |

**AUD-119 的修复若只针对 `N`/`DATA`，则 `subprocess` 与 `end`/`annotation` 仍在同一处逻辑上暴露** —— 建议**一次性收敛跳过集合**，而非逐个类型打补丁。

---

## 5. 修复优先级建议

| 序 | 项 | 理由 | 风险 |
|:--|:--|:--|:--|
| 1 | **AUD-140**（渲染缓存） | 交互可用性问题，影响每一次操作；改动局限在 `FlowDiagram`（178 行） | 低 |
| 2 | **AUD-138**（子流程继承 Layout） | 纯渲染决定，不触解析语义 | 低 |
| 3 | **AUD-139**（默认流跳过集合） | 涉及解析契约，需重跑 `npm run test:flow`（191 断言）+ `validate:dsl` | **中** |

**门禁**：三项修完须同时通过
```
npm run test:flow          # 191 pass / 0 fail
npm run validate:dsl       # 3 段 PASS（含 lint_examples + assert_card_contracts）
npm run check:cards-fresh  # 产物与真源同步
npx tsc --noEmit           # 0 errors
```

---

## 6. 附：本轮新发现汇总

| ID | 级别 | 位置 | 一句话 |
|:--|:--:|:--|:--|
| **AUD-138** | P1 | `flowToSVG.ts:166` | 子流程内部列数用 `√N`，**不读 `data.layout`**；且 `fs=8` 低于范式下限 |
| **AUD-139** | P1 | `FlowParser.ts` 默认顺序流 | 跳过集合未含 `subprocess`，与 AUD-119 同源 |
| **AUD-140** | **P0** | `FlowDiagram.tsx:26/171` | `flowToSVG` 裸调用（零 `useMemo`）+ `dangerouslySetInnerHTML` 每帧重写 → 拖拽时双重全量重算 |

---

*本报告由使用者实测截图触发，所有数据均可在本仓库复现。*
