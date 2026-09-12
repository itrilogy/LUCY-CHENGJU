# IQS-Flow 流程图模块 P0 正确性修复日志

> **文档状态**: 执行记录 / 归档
> **归档时点**: 文中断言数字以当时为准；现行口径见 `FLOW_NEXT_PHASE_PLAN.md`（154 = 60+61+17+8+8）
> **修复日期**: 2026-09
> **覆盖范围**: `components/flow/FlowParser.ts`、`components/flow/flowToSVG.ts`、`scripts/_flow_probe.ts`
> **关联文档**: `docs/flow/spec/IQS_FLOW_DSL_SPEC.md`（规范）、`docs/flow/review/FLOW_ENGINEERING_AUDIT_NOTES.md`（审计）、`docs/flow/design/FLOW_LAYOUT_ENGINE_DESIGN.md`（布局算法）、`docs/flow/review/FLOW_RENDER_REVIEW_QA.md`（渲染 QA）
> **提交**: `a540fc8`（P0 四修复）、`964b1d6`（探针脚本）、`42b413f`（审计笔记 §5 结项）

---

## 1. 本轮整体修正意图

本轮在**保留「流程图高度整齐对齐」这一设计核心意图**的前提下，对 flow 模块做一次 P0 正确性修复。它不是新增渲染功能，而是修正审计（`FLOW_ENGINEERING_AUDIT_NOTES.md` + 一次独立深度复核）所暴露的、会直接导致**画错、被裁掉、节点错位/重叠**的四类正确性问题。

**最高原则（用户明示）**: 一切改动不得破坏流程图已有的整齐对齐（XY 矩阵统一扩展、节点居中、行列齐平等设计）。修复只补正确性，不引入会打乱网格对齐的副作用。

**修复范围 = P0 四项正确性**（报告「阶段 A」起点，经 `scripts/_flow_probe.ts` 逐项实证）：

| 编号 | 问题 | 现象 | 严重级 |
|:---|:---|:---|:---:|
| P0-1 | `getSvgSize` 未计入 AttrPanel，视口裁图例 | 画布/整理布局/PNG 导出把图例裁掉 | 高 |
| P0-2 | 单维泳道非连续索引越界 | `Lane from D[0,2]` + `Location(D[2])` → `y:NaN` | 高 |
| P0-3 | 缺省 `Location` 节点全部堆叠 `(0,0)` | 节点重叠 | 高 |
| P0-4 | 结束/注解/数据对象被默认流当作源 | 结束节点出默认边，孤岛被误连而漏报 | 高 |

**不在本次范围（后续阶段）**: P1（子流程内嵌、否则斜杠、并行＋、N/DATA 占格转 artifacts）、P2（§10 校验 8/18、flowToDsl 往返细节）、P3（走线通道化、折行按字宽、Align/Color 尊重）。这些在探针里已作为「已知视角」标注，未改动。

---

## 2. 修正前的实测基线（`scripts/_flow_probe.ts`）

逐项记录了修复前的错误行为（探针 8 场景全跑）：

```
==== AttrPanel vs getSvgSize ====
getSvgSize { width: 764, height: 663 }     ← 不含图例高
svg attr   { w: '764', h: '793' }          ← 含图例高（差 130 = panelH）
→ viewBox 用 663 → 图例被裁

==== single-dim skip indices D[0,2] ====
rows [ {dict:'D',idx:0}, {dict:'D',idx:2} ]   ← 2 条泳道
w2 Location(D[2]) → ri:2, x:204, y:NaN        ← ri 越界 → y:NaN
nR(=2) vs max ri(=2) → 越界

==== missing Location auto-fill 2D ====
cells [ {w1,cell:null}, {w2,cell:null}, {w3,cell:null} ]
pos   w1:(0,0)  w2:(0,0)  w3:(0,0)            ← 全部重叠

==== isolated node ====
isolated errors [] warns []                   ← 孤岛无警告
edges e3: w3(end) → w4（默认边）                ← 结束节点被当源
```

---

## 3. 详细修正过程

### 3.1 P0-1：`getSvgSize` 计入 AttrPanel（文件 `flowToSVG.ts`）

**根因**: `getSvgSize()` 返回 `computeExcelLayout` 的 `L.height`，而 AttrPanel 图例高在 `flowToSVG` 内局部计算并加在 `outHeight` 上。两者不一致 → 外部用 `getSvgSize` 做 viewBox 时把图例裁掉。

**做法**:
1. 抽出纯函数 `attrPanelHeight(data)`（按 `attrPanel.active` 聚合 `nodes.attrs` 去重，计算面板高）。
2. `getSvgSize` 改为 `{ width: L.width, height: L.height + attrPanelHeight(data) }`。
3. `flowToSVG` 内 `panelH` 改为复用 `attrPanelHeight(data)`，消除两套重复逻辑，保证单一事实来源。

**验证**: 探针 `getSvgSize {764,793}` == `svg attr {764,793}`，一致；`has 属性图例 true`、`hasSOP true`。

### 3.2 P0-2：单维泳道非连续索引落格（文件 `flowToSVG.ts` `computeExcelLayout`）

**根因**: `laneIdx = Object.values(n.cell)[0]` 用**字典原始下标**直接当 `ri`/`ci`。而 `rows`/`cols` 数组是按 `Lane from` 声明展开的**泳道列表**，二者元素数/位置可能不同。`Lane from D[0,2]` 时 `rows` 只有 2 项，`Location(D[2])` 却取 `ri=2` → 越界。

**做法**:
- 新增 `lanePosOf(dict, idx)`：用 `rows`/`cols` 数组的 `findIndex(r => r.dict===dict && r.idx===idx)` 得到该泳道在列表中的**真实位置**。
- 单维横向 `ri = lanePosOf(单维dict, cell值)`；单维纵向 `ci = lanePosOf(...)`（与现有 `BUG-01` 修复保留的同泳道内序号 `laneSeq` 逻辑兼容）。

**验证**: `D[2]` 现在映射到泳道列表位置 1 → `w2 ri:1, y:242`，不再 `y:NaN`；`rowHpx [112,112]` 两泳道等高，**保持整齐对齐**。

### 3.3 P0-3：缺省 `Location` 自动落格（文件 `flowToSVG.ts` `computeExcelLayout`）

**根因**: `cell:null` 的节点在 `else if (!rc) rc = {ri:0,ci:0}` 里全部落 `(0,0)`，重叠。类型注释已声明 `cell: null = 自动顺序落格`，但实现缺失。

**做法**（重构 classify 阶段，两遍）:
- **第一遍**：显式 `cell` 节点归类并标记 `usedCell`（已占用格）。
- **第二遍**：缺省节点按声明序填入**第一个未占用交叉格**：
  - 单维横向 → 放第 0 泳道下一个空位；纵向同理。
  - 二维 → **行优先扫描第一个空位**（保持整齐的读取顺序），网格满则溢出 `(0,0)` 兜底。

**验证**: 三缺省节点落 `w1:(0,0) w2:(0,1) w3:(1,0)`，互不重叠、顺序整齐。

### 3.4 P0-4：结束/注解/数据对象不再当默认流出源（文件 `FlowParser.ts`）

**根因**: 默认顺序流循环只跳过网关（`if (a.type === gateway) continue`），`end`/`annotation`/`dataObject` 仍会被当作源连出默认边。后果：结束节点 w3(end)→w4 产生默认边，把孤岛节点"连走"导致孤立检查漏报。

**做法**: 默认流出源判断扩展为跳过 `exclusiveGateway | parallelGateway | end | annotation | dataObject`：
```typescript
if (a.type === 'exclusiveGateway' || a.type === 'parallelGateway'
  || a.type === 'end' || a.type === 'annotation' || a.type === 'dataObject') continue;
```
孤立检查（`FlowParser.ts` §孤立节点检查）本就跳过这些类型，与之一致。

**验证**:
- 默认边 `e3 (w3→w4)` 消失；
- 孤岛节点 `w4` 现被识别并报 warning `孤立（无入边且无出边）`；
- 对 `start/end/annotation/dataObject` 的孤立检查跳过逻辑保持，不误报游离的注解/数据对象。

---

## 4. 回归与质量护栏

- ✅ `npx tsc --noEmit` 零错。
- ✅ `npm run build` 成功（20.05s，仅既有 chunk 体积警告，非回归）。
- ✅ 既有断言全绿（无回归）：
  - `scripts/assert_flow_parser.ts` → **40 / 40 pass**
  - `scripts/assert_flow_svg.ts` → 35 / 35 pass
- ✅ 探针 `scripts/_flow_probe.ts` 8 场景复扫：P0 四项全部修复，其余场景（子流程/默认流/字典/校验/双开始/网关无End）行为不回归。

---

## 5. 提交记录

| commit | 内容 |
|:---|:---|
| `a540fc8` | fix(flow): P0 四修复（getSvgSize尺寸 / 单维lanes映射 / 缺省自动落格 / 结束·注解·数据对象不出默认流） |
| `964b1d6` | test(flow): 新增 `scripts/_flow_probe.ts` 探针（修复验证基线） |
| `42b413f` | docs(flow): AUDIT_NOTES 补录 §5 验收结项章节（上轮中断遗留） |

推送后 `main == origin/main`，工作区干净。

---

## 6. 遗留与后续（不在本轮）

- **P1**: 子流程内部节点仍铺主网格（解析有 `parent`、渲染未内嵌）；`否则` 默认流 `def:true` 但无斜杠虚线；并行网关元 `＋` 未绘；`annotation`/`dataObject` 仍占格并参与排序，未改为 artifacts 依附。
- **P2**: 字典重复定义覆盖无警告；`Attr active` 非法键被接受；孤立节点为 warning 非 error（部分条目已在 P0-4 改善）；flowToDsl 往返丢条件/出口名。
- **P3**: 连线仍是端口几何正交（Liang-Barsky 避节点盒），非沿泳道/格子通道走线；折行按字符计数（会切断数字）；单维按全图节点数扩列（空列过多）。

> 对齐/工整续修见 `docs/flow/notes/FLOW_LAYOUT_NOTES_ALIGN_RECOVERY.md`（2026-08-31）：单维按最大链长扩格、子流程内部退出主网格、N/DATA 不占格、按字宽折行、连线拐点吸附格子通道。

---

*记录人: 智能体辅助修复（含独立复核）*
*状态: P0 已闭环，P1/P2/P3 待续*
