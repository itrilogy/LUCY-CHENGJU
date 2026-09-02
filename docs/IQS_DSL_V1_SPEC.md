# IQS-DSL v1 统一语言规范（概要权威）

> **状态**: 现行架构权威（Architecture Authority）  
> **版本**: 1.1.0  
> **适用范围**: IQS Native 核心图表（`tier: core`）  
> **非适用范围**: Mermaid / VChart 救济通道仅遵守「信封约定」，母语语法见各自 master 协议  

## 文档分工（落盘结构）

| 文档 | 角色 | 颗粒度 |
|:---|:---|:---|
| **[IQS_DSL_V1_MANUAL.md](./IQS_DSL_V1_MANUAL.md)** | **完整语法手册**（指令表 / Body / 示例 / 反例 / 消歧） | **最高** — AI 与工程师首选 |
| **本文 SPEC** | 设计原则、分层、代数、权威序、工程映射 | 中 |
| `dsl/kinds.json` | 机器可读 kind 注册表 | 结构化 |
| `components/*Editor.tsx` | 运行时解析真相 | 实现 |

当本文与 Editor 内联说明、历史手册、`mcp_tools.json` 文案冲突时：  
**完整手册 + 运行时解析器 > 本文 > 旧 DSL_SYNTAX_MANUAL**。
---

## 0. 设计目标与分层

### 0.1 产品分层

| 层级 | 代号 | 职责 | 语言 |
|:---|:---|:---|:---|
| **核心** | `tier: core` | QC 标准工具、成果报告可审计 | **IQS-DSL v1** |
| **救济** | `tier: relief` | 类型外制图、临场表达 | Mermaid 母语 / VChart `Title+Spec` |

**选用红线**

1. 能映射到 PDCA / T/CAQ 标准 QC 工具 → **必须**走核心 IQS-DSL。  
2. 仅当需求超出核心类型表 → 才允许救济通道。  
3. 禁止用 VChart/Mermaid「仿造」控制图、排列图等专业统计图充作成果报告终稿。

### 0.2 语言结构（三层）

```text
IQSDocument
├── Shell      全局外壳（Title / 注释 / Color / Font / Show* / Decimals）
├── Directives 按 kind 白名单的领域指令（禁止跨 kind 同名异义）
└── Body       有限代数类型之一（见 §3）
```

### 0.3 字符与注释（强制）

| 规则 | 说明 |
|:---|:---|
| **行注释** | 仅 `//` 开头的整行（推荐）；非 TreeBody 中历史 `#` 行视为注释（兼容，不推荐新增） |
| **`#` / `##` / `###`** | **仅** `TreeBody`（鱼骨图）的层级语法；其它 kind **不得**用 `#` 表达结构 |
| **大小写** | 指令键 **PascalCase**，解析器应大小写不敏感（实现逐步对齐） |
| **输出红线** | 禁止 Markdown 代码围栏；禁止解释性前后缀；禁止把整个文档包成 JSON 对象 |

---

## 1. 场景覆盖矩阵（业务 → kind）

| PDCA / QC 场景 | 推荐 kind | Body | 说明 |
|:---|:---|:---|:---|
| 选题 / 头脑风暴归类 | `affinity` | ItemTree | KJ 法卡片/标签 |
| 原因展开（5M1E/4P） | `fishbone` | Tree | 鱼骨层级 |
| 要因确认 / 多重因果 | `relation` | Graph | 出度入度分析 |
| 现状调查（关键少数） | `pareto` | Pairs | 二八 / ABC |
| 分布与工序能力 | `histogram` | ScalarList | Cp/Cpk、规格限 |
| 过程稳定性 | `control` | Series | SPC、Nelson/WE |
| 相关与回归 | `scatter` | TupleList | 含可选 3D/趋势 |
| 多维综合对比 | `radar` | AxisSeries | 面积分/标准化 |
| 对策关联（多对多） | `matrix` | Matrix | L/T/Y/X/C |
| 多因子相关矩阵 | `matrixPlot` | Table | 图矩阵 / YvsX |
| 风险预案 | `pdpc` | ProcessGraph | OK/NG 分支 |
| 进度与关键路径 | `arrow` | Network | CPM 矢线 |
| 通用统计小图 | `basic` | Dataset | bar/line/pie |
| 企业体系文件流程图（泳道/BPMN） | `flow` | FlowGraph | **Core（BPMN 子集）** |
| 流程/时序/架构（复杂自由绘图） | `mermaid.*` | Foreign | **救济** |
| 桑基/漏斗等复杂可视 | `vchart.*` | Foreign | **救济** |

---

## 2. Shell（全局外壳）

### 2.1 通用形式

```ebnf
document        = { line } ;
line            = comment | shell_line | directive_line | body_line | empty ;
comment         = "//" text ;
shell_line      = title | color | font | show | decimals ;
title           = "Title:" text ;
color           = "Color[" slot "]:" color_value ;
font            = "Font[" slot "]:" integer ;
show            = "Show" Ident ":" boolean ;   (* 推荐统一 Show* 前缀 *)
decimals        = "Decimals:" integer ;
boolean         = "true" | "false" ;
color_value     = "#" hex{6} ;
```

### 2.2 全局推荐键

| 键 | 含义 | 备注 |
|:---|:---|:---|
| `Title:` | 图表主标题 | **建议首行**；渲染与导出文件名依据 |
| `Color[Slot]:` | 颜色槽 | Slot **按 kind 闭集**（见各 kind 表） |
| `Font[Slot]:` | 字号槽 | 常见 `Title` / `Base` / `Node` |
| `ShowValues:` | 是否显示数值标记 | 多图共享语义 |
| `Decimals:` | 小数位 | 统计类图 |

### 2.3 历史兼容（逐步废弃）

| 旧写法 | v1 推荐 | 状态 |
|:---|:---|:---|
| `Grid: true` | `ShowGrid: true` | 兼容读写 |
| `3D: true` | `Show3D: true` | 兼容读写 |
| 非树图用 `# 注释` | `// 注释` | 兼容 |
| 中途二次 `Type:`（basic） | 单次 header + 多 Dataset | 兼容但建议避免 |

---

## 3. Body 代数（有限集合）

| Body 类型 | 使用 kind | 结构要点 |
|:---|:---|:---|
| **Tree** | `fishbone` | `#` / `##` / `###` 层级 |
| **ItemTree** | `affinity` | `Item: id, label, parentId`（**不是** `#` 树） |
| **Pairs** | `pareto` | `- name: number` |
| **ScalarList** | `histogram` | `- number` |
| **TupleList** | `scatter` | `- x, y [, z]` |
| **Series** | `control` | `[series]: name` … `[/series]` |
| **AxisSeries** | `radar` | `Axis:` + `Series:` |
| **Graph** | `relation` | `Node:` + `Rel:` |
| **Network** | `arrow` | `Event:` + `a -> b:` / `..>` |
| **ProcessGraph** | `pdpc` | `Group`/`Item`/`EndGroup` + `a--b [OK\|NG]` |
| **Matrix** | `matrix` | `Axis` + `Matrix` 块 |
| **Table** | `matrixPlot` | `Data:` 行 + 可选 `Styles:` |
| **Dataset** | `basic` | `Dataset: name, [values], color, axis` |
| **Foreign** | mermaid/vchart | 救济层，不属 IQS-DSL 核心文法 |

新增核心图表时：**优先复用已有 Body**，禁止无必要新增代数类型。

---

## 4. 指令消歧（v1 冻结语义）

下列键在历史上曾「同名异义」。v1 **按 kind 锁定语义**；跨 kind 禁止混用取值。

| 键 | 允许 kind | 取值域 |
|:---|:---|:---|
| `Type` | `control` | `I-MR` \| `X-bar-R` \| `X-bar-S` \| `P` \| `NP` \| `C` \| `U` |
| `Type` | `matrix` | `L` \| `T` \| `Y` \| `X` \| `C` |
| `Type` | `affinity` | `Card` \| `Label`（渲染模式，非数据型） |
| `Type` | `basic` | `bar` \| `line` \| `pie` |
| `Layout` | `affinity` | `Horizontal` \| `Vertical` |
| `Layout` | `relation` | `Directional` \| `Centralized` \| `Free` |
| `Layout` | `pdpc` | `Directional` \| `Standard` |
| `Size` | `control` | 子组样本容量 n（整数） |
| `Group` | `matrixPlot` | 分层变量**列名** |
| `Group` | `pdpc` | 流程分组容器（与 `EndGroup` 成对） |
| `Item` | `affinity` | 树节点 `id, label, parent` |
| `Item` | `pdpc` | 步骤节点 `id, label, [role]` |
| `Mode` | `matrixPlot` | `Matrix` \| `YvsX` |

> **实现约定**: 解析器必须结合当前 `kind` 解释上述键；MCP 调用时 kind 由 tool name 决定，**不得**依赖 DSL 内自描述 kind 字段（可选未来扩展 `Kind:` 元指令）。

---

## 5. 核心 kind 规范（逐类型）

下列每节结构：场景 → Shell/Directives → Body → Color 闭集 → 最小合法示例。

---

### 5.1 `fishbone` — 鱼骨图（因果）

- **场景**: 分析原因；5M1E / 4P  
- **Body**: Tree  
- **Directives**: （无强制；标题即鱼头）  
- **Color**: `Root`, `RootText`, `Main`, `MainText`, `Bone`, `Line`, `Text`, `End`  
- **规则**: `#` 一级大骨，`##` 中骨，`###+` 更细；**禁止** `Item:` 表格式  

```dsl
Title: 注塑件表面缩水故障分析
Color[Root]: #ef4444
Color[Main]: #3b82f6

# 人 (Man)
## 调机参数设置不当
### 保压压力过低
# 机 (Machine)
## 料筒加热温度偏移
```

---

### 5.2 `affinity` — 亲和图（KJ）

- **场景**: 选题理由、信息归类  
- **Body**: ItemTree  
- **Directives**: `Type: Card|Label`，`Layout: Horizontal|Vertical`  
- **Color**: `TitleBg`, `TitleText`, `GroupHeaderBg`, `GroupHeaderText`, `ItemBg`, `ItemText`, `Line`, `Border`  
- **规则**: **仅** `Item: id, label, parentId`；`parentId` 可省略/`null`；**禁止**用 `#` 建树  

```dsl
Title: 办公环境改善方案
Type: Card
Layout: Horizontal
// 节点
Item: root, 核心目标, null
Item: g1, 空间布局, root
Item: sub1, 增加绿植, g1
```

---

### 5.3 `pareto` — 排列图

- **场景**: 现状调查、关键少数  
- **Body**: Pairs  
- **Directives**: `Decimals`, `ShowValues`  
- **Color**: `Title`, `Bar`, `Line`, `MarkLine`  
- **Font**: `Title`, `Base`, `Bar`, `Line`  
- **规则**: 引擎内强制降序；值为非负频数/成本  

```dsl
Title: 售后质量问题分布
Decimals: 1
ShowValues: true
Color[Bar]: #3b82f6
Color[MarkLine]: #ef4444

- 物流破损: 420
- 零件缺失: 215
- 包装老化: 89
```

---

### 5.4 `histogram` — 直方图

- **场景**: 分布、工序能力  
- **Body**: ScalarList  
- **Directives**: `USL`, `LSL`, `Target`, `Bins` (`auto`\|整数), `ShowCurve`, `ShowValues`  
- **Color**: `Bar`, `Curve`, `USL`, `LSL`, `Target`  

```dsl
Title: 产品直径分布
USL: 10.5
LSL: 9.5
Target: 10.0
Bins: auto
ShowCurve: true

// 原始测量值
- 9.8
- 10.2
- 10.1
```

---

### 5.5 `control` — 控制图（SPC）

- **场景**: 过程稳定性、效果检查  
- **Body**: Series  
- **Directives**:  
  - `Type`: SPC 图种  
  - `Size`: 子组 n  
  - `Rules`: `Basic` / `Western-Electric` / `Nelson`（可组合）  
  - `UCL` / `LCL` / `CL`: 可选覆盖自动限  
  - `ShowValues`, `Decimals`  
- **Color**: `Line`, `Point`, `UCL`, `CL`, `LCL`  

```dsl
Title: 缸盖螺栓孔径 X-bar-R
Type: X-bar-R
Size: 5
Rules: Nelson
Decimals: 3

[series]: 孔径测量值 (mm)
12.01, 12.02, 11.99, 12.00, 12.01
12.03, 11.98, 12.01, 12.02, 11.99
[/series]
```

---

### 5.6 `scatter` — 散点图

- **场景**: 原因确认、相关分析  
- **Body**: TupleList  
- **Directives**: `XAxis`, `YAxis`, `ZAxis`, `ShowTrend`, `ShowValues`, `Show3D`（兼容 `3D`）, `Size[Base]`, `Opacity`  
- **Color**: `Point`, `Trend`  

```dsl
Title: 温度与压力相关分析
XAxis: 模具温度(℃)
YAxis: 注射压力(MPa)
ShowTrend: true
Color[Point]: #3b82f6

- 195.5, 85.2
- 192.0, 82.5
- 198.5, 88.0
```

---

### 5.7 `radar` — 雷达图

- **场景**: 多维效果对比  
- **Body**: AxisSeries  
- **Directives**: `Standardize`, `ShowAreaScore`, `ShowSimilarity`, `ShowValues`, `StartAngle`, `Clockwise`, `Closed`  
- **行式**: `Axis: name, max [, min]`；`Series: name, [v1,v2,...] [, color [, opacity]]`  

```dsl
Title: 方案多维对比
Standardize: true
ShowAreaScore: true

Axis: 质量, 100, 0
Axis: 成本, 100, 0
Axis: 交期, 100, 0
Series: 方案A, [80, 70, 90], #3b82f6, 0.4
Series: 方案B, [70, 85, 75], #ef4444, 0.3
```

---

### 5.8 `relation` — 关联图

- **场景**: 复杂因果、症结梳理  
- **Body**: Graph  
- **Directives**: `Layout`  
- **节点**: `Node: id, label`  
- **边**: `Rel: source -> target`  
- **Color**: `Root`, `RootText`, `Middle`, `MiddleText`, `End`, `EndText`, `Line`  
- **Font**: `Title`, `Node`  

```dsl
Title: 交付延期关联分析
Layout: Directional
Node: r1, 交付延期
Node: m1, 需求变更
Rel: m1 -> r1
```

---

### 5.9 `arrow` — 矢线图（网络计划）

- **场景**: 实施对策进度、关键路径  
- **Body**: Network  
- **Directives**: `ShowCritical`, `ShowShortest`  
- **节点**: `Event: id, label`  
- **实箭线**: `src -> tgt: duration, label`  
- **虚箭线**: `src ..> tgt: 0, label`  
- **Color**: `Node`, `Line`, `Critical`, `Shortest`  
- **注释**: 使用 `//`；`#` 行按兼容注释丢弃（**不是**层级）  

```dsl
Title: 产线改造计划
ShowCritical: true
Event: 1, 立项
Event: 2, 施工
1 -> 2: 10, 土建
```

---

### 5.10 `pdpc` — 过程决策程序图

- **场景**: 对策制定、风险预案  
- **Body**: ProcessGraph  
- **Directives**: `Layout`  
- **分组**: `Group: id, label` … `EndGroup`  
- **步骤**: `Item: id, label [, [start|step|countermeasure|end]]`  
- **边**: `id1--id2` 或 `id1--id2 [OK|NG]`  
- **Color**: `Start`, `StartText`, `Step`, `StepText`, `Countermeasure`, `CountermeasureText`, `End`, `EndText`, `Line`  
- **扩展**: `Line[Width]:`（兼容；推荐未来 `StrokeWidth:`）  

```dsl
Title: 应急预案 PDPC
Layout: Directional
Group: g1, 发现
  Item: n1, 报警触发, [start]
  Item: n2, 确认火情
EndGroup
n1--n2
n2--n3 [OK]
```

---

### 5.11 `matrix` — 矩阵图

- **场景**: 对策关联、多对多评价  
- **Body**: Matrix  
- **Directives**: `Type` (L/T/Y/X/C), `ShowScores`, `Weight[Strong|Medium|Weak]`  
- **轴**: `Axis: axisId, label` 后接 `- itemId, label [, weight]`  
- **关系块**: `Matrix: RowAxis x ColAxis` 后接 `rowId: colId:S|M|W, ...`  

```dsl
Title: 零部件-故障模式矩阵
Type: L
ShowScores: true
Weight[Strong]: 9
Weight[Medium]: 3
Weight[Weak]: 1

Axis: A, 零部件
- a1, 活塞销
Axis: B, 故障
- b1, 磨损
Matrix: A x B
a1: b1:S
```

---

### 5.12 `matrixPlot` — 图矩阵

- **场景**: 多变量相关、分层散点  
- **Body**: Table  
- **Directives**: `Mode` (`Matrix`\|`YvsX`), `Dimensions` / `X-Dimensions` / `Y-Dimensions`, `Group`, `Smoother`  
- **数据**: `Data:` 块内 `- { k: v, ... }`（现行）或未来 `Row:` CSV  
- **样式块**: `Styles:` 下 `- DisplayMode:` / `Diagonal:` / `ColorPalette:` 等  

```dsl
Title: 工艺参数相关矩阵
Mode: Matrix
Dimensions: [压力, 温度, 良率]
Group: 批次
Smoother: Lowess

Data:
- { 压力: 102, 温度: 185, 良率: 98.2, 批次: "A" }
```

---

### 5.13 `basic` — 基础统计图

- **场景**: 通用对比（非 SPC 专用）  
- **Body**: Dataset  
- **Directives**: `Type` (bar/line/pie), `View` (v/h), `Stacked`, `Smooth`, `ShowLegend`, `ShowValues`, `ShowGrid`（兼容 `Grid`）  
- **数据**: `Dataset: name, [v1, v2, ...], color|null, AxisMatch`  
  - `AxisMatch`: `X` 分类 / `Y` 主值 / `Y2` 副轴  

```dsl
Title: 季度产量对比
Type: bar
ShowLegend: true
ShowGrid: true

Dataset: 月份, [1月, 2月, 3月], null, X
Dataset: 产量, [120, 145, 138], #3b82f6, Y
```

---

### 5.14 `flow` — 企业体系文件流程图（泳道 / BPMN 子集）

- **场景**: 程序文件（CX）「谁 × 做什么 × 走哪条路」；成果报告中的跨部门审批图  
- **Body**: FlowGraph  
- **MCP**: `render_flow`（core）。体系文件终稿禁止用 Mermaid `flowchart TD` 冒充  
- **Directives**: `Title`, `Layout` (H/V), `Dict`, `Lane from`, `AxisX`/`AxisY`/`Axis`, `Attr active`, `Color[Slot]`, `W:` 节点（`Type[S|E|T|?|+|SUB|N|DATA]`、`Location`、`Attach`、`V|H|D`）  
- **红线**: Dict 必须先于 Lane/W；判断/并行必须分支行 + `End`；N/DATA 不作流转目标  

完整文法：`docs/IQS_FLOW_DSL_SPEC.md`；协议切片：`protocol/segments/flow.md`。

```dsl
Title: 采购申请审批流程
Layout: H
Dict: D[信息中心,综合计划科]
Dict: P[申请,审批]
Lane from D[0,1] Layout H
Lane from P[0,1] Layout V
W: w1: 提交申请 Type[S] Location(D[0],P[0])
W: q1: 金额超限? Type[?] Location(D[0],P[1])
   是 → #w2
   否则 → #w2
   End
W: w2: 归档 Type[E] Location(D[1],P[1])
```

---

## 6. 救济层信封（非核心文法）

### 6.1 Mermaid（`tier: relief`）

- 输入：**纯 Mermaid 文本**（如 `flowchart TD`），无 IQS `Title:` 强制（前端可包一层展示标题）。  
- 禁止把 Mermaid 当控制图/直方图使用。

### 6.2 VChart（`tier: relief`）

```dsl
Title: 示例
ColorPalette: tech
Spec: {
  "type": "bar",
  "data": [{ "values": [ ... ] }]
}
```

- `Spec` 内 **100% 静态 JSON**（禁止函数）。  
- 雷达/散点等若存在 **Native 核心 kind**，成果报告优先 Native，不走 VChart 仿制。

---

## 7. MCP 声明约定（与语言配套）

### 7.1 工具身份

| 字段 | 含义 |
|:---|:---|
| `parent_type` | `iqs_native` \| `mermaid` \| `vchart` |
| `sub_type` | kind 名（master 除外） |
| `tier` | `core` \| `relief`（catalog 扩展字段） |

### 7.2 list_tools 最小化

工具 `description` **只含**：显示名、一句话场景、intent 关键词、resource URI。  
**禁止**嵌入完整 expert_logic / syntax_rules / few-shot。  
完整语法通过：

```text
protocol://segments/{parent_type}/{sub_type}
protocol://dsl/v1
protocol://governance
```

### 7.3 核心 kind 必须在 MCP 可调用

`iqs_native` 至少包含：  
`affinity, arrow, basic, control, fishbone, flow, histogram, matrix, matrixPlot, pareto, pdpc, relation, scatter, radar`。

---

## 8. 权威性与变更流程

1. **语法变更**必须先改本文档版本号，再改 `dsl/registry.ts` 与解析器，最后改 `mcp_tools.json` 示例。  
2. **官方示例**必须满足 round-trip：`parse → 非空有效 AST`（CI：`npm run validate:dsl`）。  
3. 未知指令键：解析器应 **忽略并收集警告**（未来 UI/MCP 回传），不得静默导致整图失败。  
4. 废弃键保留 ≥ 一个次要版本的读写兼容。

---

## 9. 工程映射

| 资产 | 路径 |
|:---|:---|
| 本规范 | `docs/IQS_DSL_V1_SPEC.md` |
| Kind 注册表 | `dsl/registry.ts` / `dsl/kinds.json` |
| Shell 工具 | `dsl/shell.ts` |
| 统一入口 | `dsl/index.ts` |
| 校验脚本 | `scripts/validate_dsl.mjs` |
| 治理 | `protocol/governance.md` |
| 工具清单 | `mcp-server/mcp_tools.json` |

---

## 10. 版本历史

| 版本 | 日期 | 说明 |
|:---|:---|:---|
| 1.0.0 | 2026-08-08 | 首版：统一 Shell/Body/场景矩阵；冻结消歧表；明确 core/relief |
| 1.1.0 | 2026-08-11 | 拆分细粒度手册 `IQS_DSL_V1_MANUAL.md` 完整落盘；与 13 核心解析器对齐 |

---

## 11. 强制阅读

**编写或生成任何 IQS-DSL 前，请打开细粒度手册：**

→ **[docs/IQS_DSL_V1_MANUAL.md](./IQS_DSL_V1_MANUAL.md)**

---

*IQS Protocol Council — Language Spec v1.1*
