# IQS-DSL v1 完整语法手册（Detailed Language Manual）

> **产品正式命名**：澄矩 · ChengJu（Intelligent QC Studio / IQS）  
> 出品：**鹿溪联合创新实验室**（LUXI Joint Innovation Lab）  
> 标语：**源清流澈，行止应矩**

| 项 | 值 |
|:---|:---|
| **文档角色** | 人类工程师 + AI Agent 共用的**细粒度语法手册**（颗粒度最高） |
| **语言版本** | IQS-DSL **v1.1.0** |
| **权威序** | 本手册描述 **应然语法**；与解析器冲突时以 `components/*Editor.tsx` 运行时为准，并应回修本手册 |
| **配套** | 概要权威：`docs/IQS_DSL_V1_SPEC.md` · 注册表：`dsl/kinds.json` · 治理：`protocol/governance.md` |
| **落盘日期** | 2026-08-11 |

> **落盘声明**：本文是 IQS-DSL v1 范式的**完整落盘修订稿**。旧文档 `DSL_SYNTAX_MANUAL.md` / `docs/DSL_SYNTAX_MANUAL.md` 仅作历史参考；冲突一律以 **本手册 + 解析器** 为准。

---

## 目录

1. [阅读约定与符号](#1-阅读约定与符号)
2. [语言总架构](#2-语言总架构)
3. [词法与行类型](#3-词法与行类型)
4. [全局 Shell 规范](#4-全局-shell-规范)
5. [Body 代数总表](#5-body-代数总表)
6. [指令消歧总表](#6-指令消歧总表)
7. [场景 → kind 选用指南](#7-场景--kind-选用指南)
8. [核心 kind 细目（13）](#8-核心-kind-细目13)
9. [救济层信封（Mermaid / VChart）](#9-救济层信封mermaid--vchart)
10. [交叉对照与常见错误](#10-交叉对照与常见错误)
11. [AI 生成红线与自检清单](#11-ai-生成红线与自检清单)
12. [工程映射与变更流程](#12-工程映射与变更流程)

---

## 1. 阅读约定与符号

### 1.1 字段表列含义

| 列 | 含义 |
|:---|:---|
| **键** | DSL 行左侧指令名（PascalCase） |
| **类型** | `string` / `number` / `boolean` / `enum` / `hex` / `list` … |
| **必填** | R=必填 · O=可选 · C=条件必填 |
| **默认** | 解析器或样式默认值 |
| **闭集** | 允许取值列表；未列则自由文本 |
| **解析器** | 实现文件 |

### 1.2 形式化记号

```ebnf
document     = { line NL } ;
line         = comment | kv | body_line | empty ;
comment      = "//" { any_except_nl } ;
kv           = key ":" SP* value ;
key          = Ident | "Color[" Ident "]" | "Font[" Ident "]" | "Weight[" Ident "]" | "Line[" Ident "]" ;
body_line    = tree_header | list_item | block_marker | graph_line | freeform ;
```

### 1.3 编码与空白

| 规则 | 说明 |
|:---|:---|
| 编码 | UTF-8 |
| 换行 | `\n` 或 `\r\n` |
| 键值分隔 | 第一个 `:` 分割 key/value（值内可再含 `:`） |
| 空行 | 允许；不改变语义 |
| 缩进 | 一般忽略；PDPC 的 `Item` 缩进仅供人类阅读 |

### 1.4 输出红线（生成侧强制）

1. **禁止** Markdown 代码围栏（\`\`\`）。  
2. **禁止**解释性前后缀（「如下所示」「好的」）。  
3. **禁止**把整个文档包成 JSON 对象交给 `dsl` 参数。  
4. 推荐 **首行** `Title:`。  
5. 颜色优先 `#RRGGBB` 六位十六进制。

---

## 2. 语言总架构

### 2.1 产品分层

| 层级 | `parent_type` | 语言 | 用途 |
|:---|:---|:---|:---|
| **CORE** | `iqs_native` | **IQS-DSL v1** | 成果报告、QC 专业图、可审计 |
| **RELIEF** | `mermaid` / `vchart` | 各方言 + 薄信封 | 类型外制图 |

### 2.2 文档三层结构

```text
IQSDocument
├── Shell        Title / //注释 / Color[*] / Font[*] / Show* / Decimals
├── Directives   按 kind 白名单的领域键（Type/Layout/USL/…）
└── Body         有限代数：Tree | ItemTree | Pairs | ScalarList | TupleList
                 | Series | AxisSeries | Graph | Network | ProcessGraph
                 | Matrix | Table | Dataset
```

### 2.3 kind 身份卡（注册表摘要）

| kind | Body | MCP 工具名 | 渲染 type | QC 场景关键词 |
|:---|:---|:---|:---|:---|
| `fishbone` | Tree | `render_fishbone` | fishbone | 因果、5M1E、根因 |
| `affinity` | ItemTree | `render_affinity` | affinity | KJ、亲和、归类 |
| `pareto` | Pairs | `render_pareto` | pareto | 二八、排列、ABC |
| `histogram` | ScalarList | `render_histogram` | histogram | 分布、Cp/Cpk |
| `control` | Series | `render_control` | control | SPC、稳定性 |
| `scatter` | TupleList | `render_scatter` | scatter | 相关、回归 |
| `radar` | AxisSeries | `render_radar` | radar | 多维对比 |
| `relation` | Graph | `render_relation` | relation | 关联、症结 |
| `arrow` | Network | `render_arrow` | arrow | 关键路径、CPM |
| `pdpc` | ProcessGraph | `render_pdpc` | pdpc | 预案、OK/NG |
| `matrix` | Matrix | `render_matrix` | matrix | L/T/Y 矩阵 |
| `matrixPlot` | Table | `render_matrix_plot` | matrix_plot | 图矩阵 |
| `basic` | Dataset | `render_basic` | basic | 柱/线/饼 |

完整机器可读：`dsl/kinds.json`。

---

## 3. 词法与行类型

### 3.1 注释

| 写法 | 适用范围 | 状态 |
|:---|:---|:---|
| `// 任意文字` | **全部 kind** | **规范（Canonical）** |
| `# 任意`（非 `# 标题` 结构） | 非 Tree 的 kind | 兼容：当注释丢弃 |
| `# 标题` / `##` / `###` | **仅 fishbone** | **结构语法**，不是注释 |

**致命混淆**：在亲和图 / 矢线 / 矩阵里用 `# 阶段一` 当结构 → 解析器当注释丢掉 → **空图**。

### 3.2 键值行（KV）

```text
Key: value
Color[Slot]: #RRGGBB
Font[Slot]: 14
Weight[Strong]: 9
Line[Width]: 2
```

### 3.3 列表行

```text
- 名称: 420          # Pairs
- 10.2               # ScalarList
- 1.0, 2.0, 3.0      # TupleList
- a1, 活塞销, 0.8    # Matrix 轴项
- { k: v, ... }      # matrixPlot 对象行
- DisplayMode: Lower # matrixPlot Styles 子项
```

### 3.4 块标记

| 标记 | kind | 作用 |
|:---|:---|:---|
| `[series]: 名称` … `[/series]` | control | 序列数据块 |
| `Data:` | matrixPlot | 进入数据区 |
| `Styles:` | matrixPlot | 进入样式子键区 |
| `Group: …` / `EndGroup` | pdpc | 流程分组 |
| `Matrix: A x B` | matrix | 关系矩阵块开始 |

### 3.5 图论行

| 形态 | kind | 示例 |
|:---|:---|:---|
| `Node: id, label` | relation | `Node: m1, 需求变更` |
| `Rel: a -> b` | relation | `Rel: m1 -> r1` |
| `Event: id, label` | arrow | `Event: 1, 立项` |
| `a -> b: dur, label` | arrow | `1 -> 2: 10, 施工` |
| `a ..> b: 0, label` | arrow | 虚活动 |
| `a--b` / `a--b [OK\|NG]` | pdpc | `n2--n3 [OK]` |
| `Item: id, label, parent` | affinity | 树节点 |
| `Item: id, label, [role]` | pdpc | 步骤（role 可选） |

---

## 4. 全局 Shell 规范

### 4.1 Title

| 属性 | 值 |
|:---|:---|
| 键 | `Title:` |
| 类型 | string |
| 必填 | **强烈建议 R**（缺失时各图有本地默认标题） |
| 位置 | 推荐文档**第一行** |
| 示例 | `Title: 缸盖螺栓孔径 X-bar-R 控制图` |

### 4.2 Color[Slot]

```text
Color[SlotName]: #RRGGBB
```

- Slot **按 kind 闭集**（见各节）。  
- 未知 Slot：多数解析器**静默忽略**（未来 lint 会警告）。  
- 同一 Slot 名跨 kind **语义不同**（如 `Color[Line]`）。

### 4.3 Font[Slot]

```text
Font[Title]: 20
Font[Base]: 12
Font[Node]: 14
```

常见 Slot：`Title` · `Base` · `Bar` · `Line` · `Node` · `GroupHeader` · `Item`。

### 4.4 布尔开关

| 规范键 | 兼容旧键 | 类型 |
|:---|:---|:---|
| `ShowValues` | — | boolean |
| `ShowTrend` | — | boolean |
| `ShowCurve` | — | boolean |
| `ShowLegend` | — | boolean |
| `ShowGrid` | `Grid` | boolean |
| `Show3D` | `3D` | boolean |
| `ShowCritical` | — | boolean |
| `ShowShortest` | — | boolean |
| `ShowScores` | — | boolean |
| `ShowAreaScore` | — | boolean |
| `ShowSimilarity` | — | boolean |

布尔字面量：`true` / `false`（大小写不敏感，推荐小写）。

### 4.5 Decimals

```text
Decimals: 2
```

用于排列图百分比、控制图刻度等统计显示精度。

### 4.6 Shell 推荐文档骨架

```dsl
Title: 示例标题
// 可选样式
Color[...]: #......
Font[Title]: 20
ShowValues: true
Decimals: 2

// ---- Body 从这里开始 ----
...
```

---

## 5. Body 代数总表

| Body | 结构直觉 | 使用 kind | 禁止混用 |
|:---|:---|:---|:---|
| **Tree** | Markdown 标题树 | fishbone | 禁止 `Item:` 建树 |
| **ItemTree** | 扁平父子表 | affinity | 禁止 `#` 建树 |
| **Pairs** | 名:值列表 | pareto | — |
| **ScalarList** | 纯数值列表 | histogram | — |
| **TupleList** | 坐标元组 | scatter | — |
| **Series** | 命名序列块 | control | — |
| **AxisSeries** | 轴 + 系列指令 | radar | — |
| **Graph** | Node+Rel | relation | 勿用 Event/裸箭头 |
| **Network** | Event+工期边 | arrow | 勿用 Rel: 前缀 |
| **ProcessGraph** | Group+Item+OK/NG | pdpc | Item 语义≠亲和 |
| **Matrix** | Axis+矩阵块 | matrix | — |
| **Table** | Data/Styles 块 | matrixPlot | — |
| **Dataset** | Dataset 行 | basic | — |
| **Foreign** | 外方言 | mermaid/vchart | 非 CORE 终稿 |

---

## 6. 指令消歧总表

| 键 | kind | 语义 | 合法值 |
|:---|:---|:---|:---|
| `Type` | control | SPC 图种 | `I-MR` `X-bar-R` `X-bar-S` `P` `NP` `C` `U` |
| `Type` | matrix | 矩阵几何 | `L` `T` `Y` `X` `C`（支持 `L-Type` 前缀匹配） |
| `Type` | affinity | 渲染皮肤 | `Card` `Label` |
| `Type` | basic | 图表几何 | `bar` `line` `pie` |
| `Layout` | affinity | 生长方向 | `Horizontal` `Vertical` |
| `Layout` | relation | 布局算法 | `Directional` `Centralized` `Free` |
| `Layout` | pdpc | 流程排版 | `Directional` `Standard` |
| `Size` | control | 子组容量 n | 正整数 |
| `Group` | matrixPlot | 分层**列名** | 字符串 |
| `Group` | pdpc | 流程分组容器 | `id, label` + `EndGroup` |
| `Item` | affinity | 树节点 | `id, label, parentId` |
| `Item` | pdpc | 步骤节点 | `id, label [, [role]]` |
| `Mode` | matrixPlot | 布局模式 | `Matrix` `YvsX` |
| `Axis` | radar | 维度轴 | `name, max [, min]` |
| `Axis` | matrix | 矩阵轴定义 | `axisId, label` |
| `Series` | radar | 数据系列 | `name, [v...], color, opacity` |

---

## 7. 场景 → kind 选用指南

| PDCA 阶段 | 业务问题 | kind | 不要选 |
|:---|:---|:---|:---|
| 选题 | 杂乱意见归类 | affinity | fishbone（未结构化时） |
| 现状调查 | 哪个问题最大 | pareto | basic bar（缺累计/ABC） |
| 现状调查 | 分布是否正态 | histogram | control |
| 分析原因 | 5M1E 展开 | fishbone | relation（多重因果再转） |
| 分析原因 | 交织因果 | relation | fishbone |
| 原因确认 | X-Y 相关 | scatter | radar |
| 对策 | 多对多关联 | matrix | matrixPlot |
| 对策 | 风险预案 | pdpc | mermaid flowchart（终稿慎用） |
| 实施 | 进度关键路径 | arrow | mermaid gantt（终稿慎用） |
| 效果 | 过程是否受控 | control | scatter |
| 效果 | 多维对比 | radar | basic |
| 深挖 | 多因子两两相关 | matrixPlot | scatter 单张 |
| 汇报附件 | 简单柱线饼 | basic | vchart（有 basic 时） |
| 类型外 | 架构/时序 | mermaid.* | 冒充 SPC |
| 类型外 | 桑基/漏斗 | vchart.* | 冒充 QC 终稿 |

---

## 8. 核心 kind 细目（14）

以下每一节结构统一为：

**场景 · 身份 · 指令表 · Color/Font · Body · 约束 · 完整示例 · 反例 · 解析器**

---

### 8.1 `fishbone` — 鱼骨图

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **Tree** |
| MCP | `render_fishbone` |
| 解析器 | `components/FishboneEditor.tsx` → `parseFishboneDSL` |
| 场景 | 根因分析、5M1E/4P、头脑风暴结构化 |

#### 指令表

| 键 | 类型 | 必填 | 默认 | 说明 |
|:---|:---|:---:|:---|:---|
| `Title` | string | O | 本地默认 | 鱼头文字（问题陈述） |
| `Color[Root]` | hex | O | 样式默认 | 鱼头背景 |
| `Color[RootText]` | hex | O | | 鱼头文字 |
| `Color[Main]` | hex | O | | 大骨背景 |
| `Color[MainText]` | hex | O | | 大骨文字 |
| `Color[Bone]` | hex | O | | 主脊椎线 |
| `Color[Line]` | hex | O | | 支线 |
| `Color[Text]` | hex | O | | 一般原因文字 |
| `Color[End]` | hex | O | | 末端色 |

#### Body：Tree

```ebnf
tree_line = "#" { "#" } SP+ label ;
(* # = 大骨, ## = 中骨, ###+ = 更深 *)
```

| 层级 | 写法 | 语义 |
|:---|:---|:---|
| 1 | `# 人 (Man)` | 大骨 / 主分类 |
| 2 | `## 调机不当` | 中骨 |
| 3+ | `### 保压不足` | 小骨 / 末端因素 |

#### 约束

- **禁止**用 `Item:` 建鱼骨。  
- **`#` 是结构**，不要当注释。  
- 注释只用 `//`。

#### 完整示例

```dsl
Title: 注塑件表面缩水故障分析
Color[Root]: #ef4444
Color[RootText]: #ffffff
Color[Main]: #3b82f6
Color[MainText]: #ffffff
Color[Bone]: #475569
Color[Line]: #cbd5e1
Color[Text]: #1e293b

// 5M1E
# 人 (Man)
## 调机参数设置不当
### 保压压力过低
### 保压时间不足
## 巡检意识淡薄

# 机 (Machine)
## 料筒加热温度偏移
## 模具冷却水道阻塞
### 冷却水流量不足

# 料 (Material)
## 材料缩水率不均匀
## 回料比例过高

# 法 (Method)
## 工艺标准不完善
## 注射速度过快

# 环 (Environment)
## 车间湿度波动

# 测 (Measurement)
## 量具未校准
```

#### 反例

```dsl
// 错误：亲和图式 Item —— 鱼骨解析不会建树
Item: g1, 人, root
```

---

### 8.2 `affinity` — 亲和图（KJ）

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **ItemTree** |
| MCP | `render_affinity` |
| 解析器 | `AffinityEditor.tsx` → `parseAffinityDSL` |

#### 指令表

| 键 | 类型 | 必填 | 闭集 | 说明 |
|:---|:---|:---:|:---|:---|
| `Title` | string | O | | 图题 |
| `Type` | enum | O | `Card` \| `Label` | 渲染模式（**不是**数据型） |
| `Layout` | enum | O | `Horizontal` \| `Vertical` | 布局方向 |
| `Color[TitleBg]` | hex | O | | 标题底 |
| `Color[TitleText]` | hex | O | | 标题字 |
| `Color[GroupHeaderBg]` | hex | O | | 分组头底 |
| `Color[GroupHeaderText]` | hex | O | | 分组头字 |
| `Color[ItemBg]` | hex | O | | 卡片底 |
| `Color[ItemText]` | hex | O | | 卡片字 |
| `Color[Line]` | hex | O | | 连线 |
| `Color[Border]` | hex | O | | 边框 |
| `Font[Title]` | number | O | | |
| `Font[GroupHeader]` | number | O | | |
| `Font[Item]` | number | O | | |

#### Body：ItemTree

```text
Item: <id>, <label>, <parentId>
```

| 字段 | 规则 |
|:---|:---|
| `id` | 唯一；常用 `root` / `g1` / `i1` |
| `label` | 显示文本（可含中文、冒号） |
| `parentId` | 父节点 id；根可用 `null` 或省略后解析为根 |

系统用 parent 指针重建树；存在 `id=root` 时以其 children 为展示根。

#### 约束

- **禁止** `#/##` 建亲和树（解析器不认）。  
- `Type: Card|Label` 仅影响皮肤。

#### 完整示例

```dsl
Title: 办公环境改善方案 (KJ法)
Type: Card
Layout: Horizontal

Color[TitleBg]: #4f46e5
Color[TitleText]: #ffffff
Color[GroupHeaderBg]: #e0e7ff
Color[GroupHeaderText]: #1e293b
Color[ItemBg]: #ffffff
Color[ItemText]: #1e293b
Color[Line]: #64748b
Color[Border]: #cbd5e1
Font[Title]: 24
Font[GroupHeader]: 16
Font[Item]: 14

// 节点定义（ItemTree）
Item: root, 核心目标: 提升员工幸福感, null
Item: g1, 空间布局, root
Item: g2, 行政服务, root
Item: g3, 数字化工具, root
Item: sub1, 增加绿植覆盖, g1
Item: sub2, 设立静默专注区, g1
Item: sub3, 升级人体工学椅, g1
Item: sub4, 现磨咖啡无限供应, g2
Item: sub5, 每周五下午茶, g2
Item: sub6, 引入智能看板系统, g3
Item: sub7, 简化报销流程, g3
```

#### 反例

```dsl
// 错误：当成鱼骨写
# 空间布局
## 增加绿植
```

---

### 8.3 `pareto` — 排列图

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **Pairs** |
| MCP | `render_pareto` |
| 解析器 | `ParetoEditor.tsx` → `parseParetoDSL` |
| 引擎行为 | **强制降序** + 累计百分比 + 80% 线 |

#### 指令表

| 键 | 类型 | 必填 | 默认 | 说明 |
|:---|:---|:---:|:---|:---|
| `Title` | string | O | | |
| `Decimals` | int | O | 样式默认 | 百分比小数位 |
| `ShowValues` | bool | O | | 柱顶数值 |
| `Color[Title]` | hex | O | | |
| `Color[Bar]` | hex | O | | 频数柱 |
| `Color[Line]` | hex | O | | 累计曲线 |
| `Color[MarkLine]` | hex | O | | 80% 参考线 |
| `Font[Title]` | int | O | | |
| `Font[Base]` | int | O | | |
| `Font[Bar]` | int | O | | |
| `Font[Line]` | int | O | | |

#### Body：Pairs

```text
- <项目名称>: <非负整数频数>
```

解析正则语义：`- 名称: 数字`。名称可含空格；值当前实现偏整数频数。

#### 完整示例

```dsl
Title: 售后质量问题分布分析
Color[Title]: #1e293b
Color[Bar]: #3b82f6
Color[Line]: #f59e0b
Color[MarkLine]: #ef4444
Decimals: 1
ShowValues: true
Font[Title]: 20
Font[Base]: 12
Font[Bar]: 12
Font[Line]: 12

// 无需手动排序
- 物流破损: 420
- 零件缺失: 215
- 包装老化: 89
- 标签错误: 56
- 其他细项: 23
```

#### 业务语义（引擎）

| 累计占比 | 类别 |
|:---|:---|
| 0–80% | A 类关键少数 |
| 80–90% | B 类 |
| 90–100% | C 类 |

---

### 8.4 `histogram` — 直方图

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **ScalarList** |
| MCP | `render_histogram` |
| 解析器 | `HistogramEditor.tsx` → `parseHistogramDSL` |

#### 指令表

| 键 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| `Title` | string | O | |
| `USL` | number | O | 规格上限 |
| `LSL` | number | O | 规格下限 |
| `Target` | number | O | 目标值 |
| `Bins` | `auto` \| int | O | 分组数；`auto` 用 Sturges |
| `ShowCurve` | bool | O | 正态拟合曲线 |
| `ShowValues` | bool | O | 数值标记 |
| `Color[Bar]` | hex | O | |
| `Color[Curve]` | hex | O | |
| `Color[USL]` | hex | O | |
| `Color[LSL]` | hex | O | |
| `Color[Target]` | hex | O | |

#### Body：ScalarList

```text
- <number>
```

建议样本 ≥ 30 才有工序能力解释意义。

#### 完整示例

```dsl
Title: 产品直径分布分析
USL: 10.5
LSL: 9.5
Target: 10.0
Bins: auto
ShowCurve: true
ShowValues: false
Color[Bar]: #3b82f6
Color[Curve]: #f97316
Color[USL]: #ef4444
Color[LSL]: #ef4444
Color[Target]: #22c55e

// 原始测量值
- 9.8
- 10.2
- 10.1
- 9.9
- 10.0
- 10.3
- 9.7
- 10.1
- 9.9
- 10.0
- 10.2
- 9.8
- 10.4
- 9.6
- 10.1
```

#### 解读提示

| 形态 | 可能含义 |
|:---|:---|
| 双峰 | 混批/混班次/混设备 |
| 偏心 | 均值漂移，调中心 |
| 过宽 | 波动过大，Cp/Cpk 偏低 |

---

### 8.5 `control` — 控制图（SPC）

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **Series** |
| MCP | `render_control` |
| 解析器 | `ControlChartEditor.tsx` → `parseControlDSL` |
| 渲染 | `ControlChart.tsx`（SPC 常数表 + Nelson/WE） |

#### 指令表

| 键 | 类型 | 必填 | 闭集/说明 |
|:---|:---|:---:|:---|
| `Title` | string | O | |
| `Type` | enum | **R 推荐** | `I-MR` `X-bar-R` `X-bar-S` `P` `NP` `C` `U` |
| `Size` | int | C | 子组 n；X-bar 系列关键 |
| `Rules` | list | O | 逗号分隔：`Basic` `Western-Electric` `Nelson` |
| `UCL` | number | O | 覆盖自动上限 |
| `LCL` | number | O | 覆盖自动下限 |
| `CL` | number | O | 覆盖中心线 |
| `Decimals` | int | O | |
| `ShowValues` | bool | O | |
| `Color[Line]` | hex | O | 过程折线 |
| `Color[Point]` | hex | O | 点 |
| `Color[UCL]` | hex | O | |
| `Color[CL]` | hex | O | |
| `Color[LCL]` | hex | O | 若实现支持 |

#### Body：Series

```text
[series]: <序列名>
v1, v2, v3, ...
v4, v5, ...
[/series]
```

- 块内可用逗号/分号/空白分隔数值。  
- 可多段 `[series]` 块（实现支持多序列收集）。  
- `//` 在块外为注释；块内以数据优先。

#### 选型速查

| 数据 | n | Type |
|:---|:---|:---|
| 计量、单值 | 1 | `I-MR` |
| 计量、子组 | 2–10 | `X-bar-R` |
| 计量、较大子组 | ≥10 倾向 | `X-bar-S` |
| 不合格品率 | — | `P` |
| 不合格品数 | 恒定 n | `NP` |
| 缺陷数 | — | `C` / `U` |

#### 完整示例

```dsl
Title: 缸盖螺栓孔径 X-bar-R 控制图
Type: X-bar-R
Size: 5
Rules: Nelson
Decimals: 3
ShowValues: false
Color[Line]: #2563eb
Color[Point]: #1d4ed8
Color[UCL]: #ef4444

[series]: 孔径测量值 (mm)
12.01, 12.02, 11.99, 12.00, 12.01
12.03, 11.98, 12.01, 12.02, 11.99
12.00, 12.01, 12.04, 11.97, 12.02
12.01, 11.99, 12.00, 12.03, 12.01
11.98, 12.02, 12.01, 11.99, 12.00
[/series]
```

#### 反例

```dsl
// 错误：把 Type 写成 bar（那是 basic）
Type: bar
```

```dsl
// 错误：VChart Spec 冒充控制图
Spec: { "type": "line" }
```

---

### 8.6 `scatter` — 散点图

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **TupleList** |
| MCP | `render_scatter`（**CORE Native**，非 `render_vchart_scatter`） |
| 解析器 | `ScatterEditor.tsx` → `parseScatterDSL` |

#### 指令表

| 键 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| `Title` | string | O | |
| `XAxis` | string | O | X 轴标签 |
| `YAxis` | string | O | Y 轴标签 |
| `ZAxis` | string | O | Z/气泡维度标签 |
| `ShowTrend` | bool | O | 回归趋势线 |
| `ShowValues` | bool | O | |
| `Show3D` | bool | O | 3D；兼容键 `3D` |
| `Size[Base]` | number | O | 点基准尺寸 |
| `Opacity` | number | O | 0.1–1.0 |
| `Color[Point]` | hex | O | |
| `Color[Trend]` | hex | O | |

#### Body：TupleList

```text
- <x>, <y>
- <x>, <y>, <z>
```

至少两维数值；第三维可选。

#### 完整示例

```dsl
Title: 注塑工艺参数相关分析
XAxis: 模具温度(℃)
YAxis: 注射压力(MPa)
ZAxis: 收缩率%
Color[Point]: #3b82f6
Color[Trend]: #f97316
ShowTrend: true
Show3D: false
ShowValues: false
Size[Base]: 10
Opacity: 0.85

// 数据点
- 195.5, 85.2, 2.4
- 192.0, 82.5, 2.5
- 198.5, 88.0, 2.2
- 215.0, 105.0, 0.6
- 218.5, 108.2, 0.55
- 212.0, 102.5, 0.7
- 235.0, 125.0, 1.2
- 238.5, 128.5, 1.3
```

#### 约束

- 成果报告用 **Native** `render_scatter`，不要默认 VChart 救济。  
- 注释用 `//`；`#` 当兼容注释。

---

### 8.7 `radar` — 雷达图

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **AxisSeries** |
| MCP | `render_radar`（CORE Native） |
| 解析器 | `RadarEditor.tsx` → `parseRadarDSL` |

#### 指令表

| 键 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| `Title` | string | O | |
| `Standardize` | bool | O | 量纲标准化 |
| `ShowAreaScore` | bool | O | 面积综合分 |
| `ShowSimilarity` | bool | O | 与首系列相似度 |
| `ShowValues` | bool | O | |
| `StartAngle` | number | O | 默认约 -90 |
| `Clockwise` | bool | O | |
| `Closed` | bool | O | 闭合多边形网格 |

#### Body 行

```text
Axis: <name>, <max> [, <min>]
Series: <name>, [<v1>, <v2>, ...], <color?>, <opacity?>
```

- `Series` 的值列表长度应与 `Axis` 个数一致。  
- 颜色可用 `#hex`；可写 `null` 占位。

#### 完整示例

```dsl
Title: 方案多维效果对比
Standardize: true
ShowAreaScore: true
ShowSimilarity: true
ShowValues: false
StartAngle: -90
Clockwise: true
Closed: true

// 轴定义（顺序即 Series 值下标）
Axis: 质量, 100, 0
Axis: 成本, 100, 0
Axis: 交期, 100, 0
Axis: 安全, 100, 0
Axis: 可维护性, 100, 0

// 系列
Series: 方案A, [85, 70, 90, 80, 75], #3b82f6, 0.4
Series: 方案B, [70, 85, 75, 88, 80], #ef4444, 0.3
Series: 方案C, [78, 78, 78, 78, 78], #10b981, 0.25
```

---

### 8.8 `relation` — 关联图

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **Graph** |
| MCP | `render_relation` |
| 解析器 | `RelationEditor.tsx` → `parseRelationDSL` |

#### 指令表

| 键 | 类型 | 必填 | 闭集 |
|:---|:---|:---:|:---|
| `Title` | string | O | |
| `Layout` | enum | O | `Directional` `Centralized` `Free` |
| `Color[Root]` … `Color[EndText]` `Color[Line]` | hex | O | 见下 |
| `Font[Title]` `Font[Node]` | int | O | |

**Color 闭集**：`Root` `RootText` `Middle` `MiddleText` `End` `EndText` `Line`。

#### Body：Graph

```text
Node: <id>, <label>
Rel: <sourceId> -> <targetId>
```

| 规则 | 说明 |
|:---|:---|
| 禁止自环 | `a -> a` 抛错 |
| 节点类型 | 可由拓扑推导 root/middle/end |
| 边方向 | 因果箭头方向按业务约定书写 |

#### 完整示例

```dsl
Title: 多症结系统问题关联分析
Layout: Free
Color[Root]: #dc2626
Color[RootText]: #ffffff
Color[Middle]: #f97316
Color[MiddleText]: #ffffff
Color[End]: #fbbf24
Color[EndText]: #92400e
Color[Line]: #a1a1aa
Font[Title]: 24
Font[Node]: 14

// 节点
Node: root1, 症结A：项目交付延期
Node: root2, 症结B：团队士气低落
Node: m1, 需求频繁变更
Node: m2, 跨部门沟通不畅
Node: e1, 客户决策链过长
Node: e2, 缺乏统一协作平台

// 关系
Rel: m1 -> root1
Rel: m2 -> root1
Rel: m2 -> root2
Rel: e1 -> m1
Rel: e2 -> m2
Rel: root1 -> root2
```

#### 与矢线差异

| | relation | arrow |
|:---|:---|:---|
| 节点关键字 | `Node` | `Event` |
| 边 | `Rel: a -> b` | `a -> b: dur, label` |
| 边属性 | 无工期 | 有 duration / dummy |

---

### 8.9 `arrow` — 矢线图（网络计划）

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **Network** |
| MCP | `render_arrow` |
| 解析器 | `ArrowDiagramEditor.tsx` → `parseArrowDSL` |
| 算法 | CPM 关键路径 |

#### 指令表

| 键 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| `Title` | string | O | |
| `ShowCritical` | bool | O | 高亮关键路径 |
| `ShowShortest` | bool | O | 最短路径显示 |
| `Color[Node]` | hex | O | |
| `Color[Line]` | hex | O | 普通箭线 |
| `Color[Critical]` | hex | O | 关键路径 |
| `Color[Shortest]` | hex | O | |

#### Body：Network

```text
Event: <id>, <label>
<src> -> <tgt>: <duration>, <label>
<src> ..> <tgt>: 0, <label>     // 虚活动 Dummy
```

| 注意 | 说明 |
|:---|:---|
| `#` 行 | 当**注释丢弃**（兼容）；不要用 `#` 定义节点 |
| 边解析 | `src->tgt: dur, label` 以第一个 `:` 分边与元数据 |
| 虚活动 | `..>` 时长通常 0 |

#### 完整示例

```dsl
Title: 办公软件 V1.0 开发计划
ShowCritical: true
ShowShortest: false
Color[Node]: #1e293b
Color[Line]: #6366f1
Color[Critical]: #ef4444
Color[Shortest]: #22c55e

// 节点
Event: 1, 立项完成
Event: 2, 需求评审
Event: 3, 架构设计
Event: 4, 模块 A 开发
Event: 5, 模块 B 开发
Event: 6, 集成测试
Event: 7, 交付

// 实活动 / 虚活动
1 -> 2: 3, 需求分析
2 -> 3: 2, 架构方案
3 -> 4: 10, A逻辑实现
3 -> 5: 8, B逻辑实现
5 ..> 4: 0, 依赖同步
4 -> 6: 5, 系统集成
6 -> 7: 2, 验收发布
```

---

### 8.10 `pdpc` — 过程决策程序图

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **ProcessGraph** |
| MCP | `render_pdpc` |
| 解析器 | `PDPCEditor.tsx` → `parsePDPCDSL` |

#### 指令表

| 键 | 类型 | 必填 | 闭集 |
|:---|:---|:---:|:---|
| `Title` | string | O | |
| `Layout` | enum | O | `Directional` `Standard` |
| `Line[Width]` | int | O | 线宽 |
| Color 闭集 | hex | O | `Start` `StartText` `Step` `StepText` `Countermeasure` `CountermeasureText` `End` `EndText` `Line` |
| `Font[Title]` `Font[Node]` | int | O | |

#### Body：ProcessGraph

```text
Group: <id>, <label>
  Item: <id>, <label>
  Item: <id>, <label>, [start|step|countermeasure|end]
EndGroup

<id1>--<id2>
<id1>--<id2> [OK]
<id1>--<id2> [NG]
```

| 元素 | 语义 |
|:---|:---|
| `Group`/`EndGroup` | 阶段容器（**不是** matrixPlot 的分层变量） |
| `Item` 第三字段 | 节点角色；可写 `[start]` 等 |
| `--` | 步骤连线（注意不是 `->`） |
| `[OK]`/`[NG]` | 判定分支 |

#### 完整示例

```dsl
Title: 实验室火灾应急 PDPC 演练
Layout: Directional
Color[Start]: #4f46e5
Color[Step]: #f0f9ff
Color[Countermeasure]: #fef2f2
Color[End]: #ecfdf5
Color[Line]: #64748b
Line[Width]: 2

Group: g1, 异常发现
  Item: n1, 烟雾报警器触发, [start]
  Item: n2, 确认火情真实性
EndGroup

Group: g2, 应急处置
  Item: n3, 拨打 119 报警
  Item: n4, 启动自动灭火系统
  Item: n5, 灭火系统失效, [countermeasure]
  Item: n6, 使用手持灭火器补救, [countermeasure]
EndGroup

Group: g3, 人员疏散
  Item: n7, 全员依序撤离
  Item: n8, 清点人数, [end]
EndGroup

// 逻辑链
n1--n2
n2--n3 [OK]
n2--n4 [OK]
n4--n7 [OK]
n4--n5 [NG]
n5--n6
n6--n7 [OK]
n7--n8
```

#### 与 affinity 的 Item 差异

| | affinity `Item` | pdpc `Item` |
|:---|:---|:---|
| 第三字段 | **parentId** | **role** `[start]`… |
| 成树方式 | parent 指针 | Group 容器 + 边 |

---

### 8.11 `matrix` — 矩阵图

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **Matrix** |
| MCP | `render_matrix` |
| 解析器 | `MatrixEditor.tsx` → `parseMatrixDSL` |

#### 指令表

| 键 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| `Title` | string | O | |
| `Type` | enum | **R 推荐** | `L` `T` `Y` `X` `C`（`L-Type` 可） |
| `ShowScores` | bool | O | 加权得分 |
| `CellSize` | int | O | 单元格像素 |
| `Weight[Strong]` | int | O | 默认常用 9 |
| `Weight[Medium]` | int | O | 3 |
| `Weight[Weak]` | int | O | 1 |
| `Color[Axis]` | hex | O | |
| `Color[Grid]` | hex | O | |
| `Color[Strong/Medium/Weak]` | hex | O | 符号色 |
| `Font[Title]` `Font[Base]` | int | O | |
| `Relation:` | 映射 | O | 自定义缩写→强度 |

#### Body：Matrix

```text
Axis: <axisId>, <label>
- <itemId>, <label> [, <weight>]

Matrix: <RowAxisId> x <ColAxisId>
<rowItemId>: <colItemId>:<S|M|W|9|3|1|◎|○|△>, ...
```

**符号映射（内置）**

| 写法 | 强度 |
|:---|:---|
| `S` `9` `◎` | Strong |
| `M` `3` `○` | Medium |
| `W` `1` `△` | Weak |

#### 完整示例

```dsl
Title: 零部件与故障模式关联分析
Type: L
ShowScores: true
Weight[Strong]: 9
Weight[Medium]: 3
Weight[Weak]: 1
CellSize: 48

Axis: A, 零部件
- a1, 活塞销, 0.8
- a2, 连杆, 0.9
- a3, 轴瓦, 1.0

Axis: B, 故障模式
- b1, 磨损
- b2, 裂纹
- b3, 泄漏
- b4, 异响

Matrix: A x B
a1: b1:S, b2:M
a2: b2:S, b4:W
a3: b1:M, b3:S, b4:S
```

#### Type 几何含义（简述）

| Type | 用途 |
|:---|:---|
| L | 二元行列关系 |
| T | 三轴 T 型 |
| Y | 三轴 Y 型 |
| X | 四向 |
| C | 相关屋顶型 |

---

### 8.12 `matrixPlot` — 图矩阵

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **Table** |
| MCP | `render_matrix_plot` |
| 解析器 | `MatrixPlotEditor.tsx` → `parseMatrixPlotDSL` |

#### 指令表（元数据区）

| 键 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| `Title` | string | O | |
| `Mode` | enum | O | `Matrix`（全矩阵）\| `YvsX` |
| `Dimensions` | list | C | Matrix 模式共用维度 |
| `X-Dimensions` | list | C | YvsX 的 X 维 |
| `Y-Dimensions` | list | C | YvsX 的 Y 维 |
| `Group` | string | O | 分层变量**列名**（≠ PDPC Group） |
| `Smoother` | enum/bool | O | `true`/`false`/`Lowess`/`MovingAverage` |

#### Body：Data / Styles

```text
Data:
- { 压力: 102, 温度: 185, 良率: 98.2, 批次: "A" }
- 102, 185, 98.2, A

Styles:
- DisplayMode: Full | Lower | Upper
- Diagonal: Histogram | Boxplot | Label | None
- PointSize: 4
- PointOpacity: 0.7
- ColorPalette: Industrial
```

**注意**：对象行用 `split(',')` 解析，值内应避免未转义逗号。

#### 完整示例

```dsl
Title: 封装工艺参数相关性研究
Mode: Matrix
Dimensions: [压力, 温度, 固化时间, 剥离强度]
Group: 晶圆批次
Smoother: Lowess

Data:
- { 压力: 102, 温度: 185, 固化时间: 45, 剥离强度: 8.2, 晶圆批次: "W-01" }
- { 压力: 105, 温度: 188, 固化时间: 46, 剥离强度: 7.9, 晶圆批次: "W-01" }
- { 压力: 98, 温度: 192, 固化时间: 42, 剥离强度: 9.1, 晶圆批次: "W-02" }
- { 压力: 110, 温度: 190, 固化时间: 48, 剥离强度: 7.5, 晶圆批次: "W-02" }

Styles:
- DisplayMode: Lower
- Diagonal: Histogram
- ColorPalette: Industrial
- PointSize: 5
```

---

### 8.13 `basic` — 基础统计图

#### 身份

| 项 | 值 |
|:---|:---|
| Body | **Dataset** |
| MCP | `render_basic` |
| 解析器 | `BasicEditor.tsx` → `parseBasicDSL` |

#### 指令表

| 键 | 类型 | 必填 | 闭集 |
|:---|:---|:---:|:---|
| `Title` | string | O | |
| `Type` | enum | **R 推荐** | `bar` `line` `pie` |
| `View` | enum | O | `v` `h` |
| `Stacked` | bool | O | 堆叠 |
| `Smooth` | bool | O | 折线平滑 |
| `ShowValues` | bool | O | |
| `ShowLegend` | bool | O | 默认倾向 true |
| `ShowGrid` / `Grid` | bool | O | |
| `Color[Title]` `Color[Bg]` | hex | O | |
| `Font[Title]` `Font[Base]` | int | O | |

#### Body：Dataset

```text
Dataset: <name>, [<v1>, <v2>, ...], <color|null>, <AxisMatch>
```

| AxisMatch | 含义 |
|:---|:---|
| `X` | 分类标签轴 |
| `Y` | 主值轴 |
| `Y2` `Y3`… | 副轴 / 多层 |

列表内可用字符串或数字；`color` 为 `null` 表示默认。

#### 完整示例

```dsl
Title: 2024年三季度产线效能对冲分析
Type: bar
ShowLegend: true
ShowGrid: true
ShowValues: false
Color[Title]: #0f172a

// 分类轴
Dataset: 月份, [7月, 8月, 9月], null, X

// 主轴
Dataset: 入库合格量, [12000, 14500, 13800], #3b82f6, Y

// 副轴（折线语义由渲染/二次 Type 影响；推荐单 Type 明确）
Dataset: 设备稼动率(%), [88.5, 92.1, 91.4], #ef4444, Y2
```

#### 注意

- 中途再次写 `Type: line` 属于**流式状态**写法，兼容但不利于 AI；v1 推荐**单一 Type + 多 Dataset**。  
- 不要用 basic 替代 control/pareto/histogram 的专业结论图。

---

### 8.14 `flow` — 企业流程图（泳道 / BPMN 子集）

**身份卡**：`tier: core` · `body: FlowGraph` · `mcpName: render_flow` · `qcTool: FLOW`  
**面向**：企业体系文件的程序文件（CX），定义"谁（泳道）× 做什么（动作）× 什么条件走哪条路（网关）"。

#### 核心范式：字典-索引
- **数据层（Dict）**：`Dict: D[部门,...]` / `Dict: P[阶段,...]` / `Dict: R[岗位,...]`（**D/P/R 为保留字**），及自定义 `Dict: worker[...]`。可变内容全部进数组。
- **结构层**：只写索引引用（`D[0]`、`worker[2]`），渲染展开为字典值。
- 一处定义、多处引用、修改全局生效；网格**只按 Lane from 产生**。

#### 泳道
```
Lane from D[0,1,2] Layout H      // 横向泳道（行）
Lane from P[0,1,2,3] Layout V    // 纵向泳道（列）
```

#### 轴标题 / 属性边栏
```
AxisX: 职能部门 Align C
AxisY: 推进阶段 Align C
Axis: 采购审批流程 AxisX
Attr active [Role,SOP,Lv,Time]
```

#### 节点
```
W: w1: worker[0] Type[S] Location(D[0],P[0])   // 开始
W: w2: worker[1] Location(D[0],P[1]) SOP(XX-CX-04) Role(R[0])
W: q1: worker[2] Type[?]                        // 判断
   是 → #w4
   否 → #w5
   End
```
- 类型：`S`开始 `E`结束 `T`任务(缺省) `?`排他 `+`并行 `SUB`子流程 `N`标注 `DATA`数据对象。
- 属性：`SOP` `Role` `Lv` `Time` `KPI` `M`（值可为字面量或字典引用；`Role` 可为 `R[i]` 或岗位字面量；`Lv`/`M` 支持数值）。
- 默认顺序流按声明顺序；分支目标抑制默认入边；多出口 `→ #a,#b` 自动拆并行。

#### 反例（Avoid）
- 节点直接写名字而不走字典（允许但削弱一致性与全局改动的受益）。
- `Lane from worker[...]` 未先定义字典 → 报错。
- 坐标写多余维度（如单维却写双维）——解析器自动清洗（warn），合法但建议省略。
- 判断节点无分支出口 → 校验 error。

---

## 9. 救济层信封（Mermaid / VChart）

### 9.1 总则

| 规则 | 说明 |
|:---|:---|
| 何时用 | **仅** CORE 类型表无法表达时 |
| 终稿 | QC 成果书专业图仍应 CORE |
| token | MCP 上标记 `[RELIEF]`，子类型按需读 resource |

### 9.2 Mermaid

- 输入：原生 Mermaid 文本（如 `flowchart TD`）。  
- 无强制 `Title:` IQS 外壳（前端可另套展示）。  
- 工具族：`render_mermaid_*`。

### 9.3 VChart

```dsl
Title: 示例
ColorPalette: tech
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "bar",
  "data": [{ "values": [ ... ] }],
  "xField": "...",
  "yField": "..."
}
```

| 红线 | 说明 |
|:---|:---|
| 禁止裸 JSON | 必须有文本外壳 + `Spec:` |
| Spec 静态 | 禁止 JS 函数 |
| 与 Native 重叠 | 雷达/散点有 Native 时优先 CORE |

解析器：`VChartEditor.tsx` → `parseVChartDSL`。

---

## 10. 交叉对照与常见错误

### 10.1 图论三兄弟

| 需求 | kind | 节点 | 边 |
|:---|:---|:---|:---|
| 因果网络 | relation | `Node:` | `Rel: a -> b` |
| 工期网络 | arrow | `Event:` | `a -> b: d, lab` |
| 预案分支 | pdpc | `Item:` | `a--b [OK]` |

### 10.2 列表三兄弟

| 数据形态 | kind | 行 |
|:---|:---|:---|
| 名-频数 | pareto | `- 名: 数` |
| 单值序列 | histogram | `- 数` |
| 点坐标 | scatter | `- x, y [, z]` |

### 10.3 高频故障

| 症状 | 原因 | 修复 |
|:---|:---|:---|
| 亲和图空白 | 用了 `#` 树 | 改 `Item:` |
| 矢线缺节点 | 只用了 `# 说明` | `Event:` + 边 |
| 控制图不像 SPC | Type 写 bar 或走了 vchart | `Type: X-bar-R` + series |
| 散点走错引擎 | 调了 vchart scatter | `render_scatter` |
| 颜色不生效 | Slot 写错 | 查闭集表 |
| 矩阵无格 | 未写 `Matrix:` 块 | 补关系块 |
| AI 输出带 \`\`\` | 违反红线 | 剥除围栏 |

### 10.4 `Type` 误用速查

| 错误写法 | 实际想表达 | 正确 kind+键 |
|:---|:---|:---|
| control 写 `Type: bar` | 柱状对比 | basic + `Type: bar` |
| affinity 写 `Type: L` | 矩阵 | matrix + `Type: L` |
| basic 写 `Type: X-bar-R` | SPC | control |

---

## 11. AI 生成红线与自检清单

### 11.1 生成前

- [ ] 场景是否映射到 **CORE kind**？  
- [ ] 是否误入 RELIEF？  
- [ ] Body 代数是否匹配（Tree vs ItemTree 等）？  

### 11.2 生成后

- [ ] 首行 `Title:`？  
- [ ] 无 Markdown 围栏？  
- [ ] 无解释性散文？  
- [ ] Color Slot 在闭集内？  
- [ ] `Type`/`Layout` 取值属于**当前 kind**？  
- [ ] 数据行格式匹配 Body？  
- [ ] 注释仅为 `//`（鱼骨结构 `#` 除外）？  

### 11.3 MCP 调用

```text
1) list_tools → 选 [CORE] render_*
2) read protocol://segments/iqs_native/{kind}
3) 可选 read protocol://dsl/v1
4) call_tool({ dsl: "<纯文本>" })
```

工程校验：`npm run validate:dsl`  
程序化 lint：`dsl/index.ts` → `lintDsl(kind, text)`。

---

## 12. 工程映射与变更流程

### 12.1 资产地图

| 资产 | 路径 | 角色 |
|:---|:---|:---|
| **本手册（细粒度）** | `docs/IQS_DSL_V1_MANUAL.md` | 人类/AI 完整语法 |
| 概要权威 | `docs/IQS_DSL_V1_SPEC.md` | 架构与原则 |
| 注册表 | `dsl/kinds.json` | 机器可读 kind 表 |
| Shell 工具 | `dsl/shell.ts` | 行分类/抽取 |
| 治理 | `protocol/governance.md` | Core/Relief 权威序 |
| MCP 摘要 | `protocol/DSL_V1.md` | 资源入口 |
| 工具+示例 | `mcp-server/mcp_tools.json` | list/read 素材 |
| 解析器 | `components/*Editor.tsx` | 运行时真相 |

### 12.2 变更流程（强制）

```text
1. 修订本手册 + SPEC 版本号
2. 更新 dsl/kinds.json
3. 改解析器（若语法变）
4. 改 mcp_tools official_example / syntax_rules
5. npm run validate:dsl
6. 同步 public/mcp_tools.json（npm run sync-tools）
```

### 12.3 版本

| 版本 | 日期 | 说明 |
|:---|:---|:---|
| 1.0.0 | 2026-08-08 | SPEC 初版落盘 |
| **1.1.0** | **2026-08-11** | **本手册完整细粒度落盘；与 13 核心解析器对齐** |

---

## 附录 A — 最小可渲染骨架（每 kind 一行级）

```dsl
// fishbone
Title: T
# 大骨
## 中骨

// affinity
Title: T
Type: Card
Item: root, 根, null
Item: a, 子, root

// pareto
Title: T
- A: 10
- B: 5

// histogram
Title: T
- 1.0
- 1.1

// control
Title: T
Type: I-MR
[series]: s
1,2,3,4,5
[/series]

// scatter
Title: T
- 1, 2
- 2, 3

// radar
Title: T
Axis: A, 100, 0
Axis: B, 100, 0
Series: S1, [50, 60]

// relation
Title: T
Node: a, A
Node: b, B
Rel: a -> b

// arrow
Title: T
Event: 1, 开始
Event: 2, 结束
1 -> 2: 5, 任务

// pdpc
Title: T
Item: n1, 开始, [start]
Item: n2, 结束, [end]
n1--n2

// matrix
Title: T
Type: L
Axis: A, 行
- a1, r1
Axis: B, 列
- b1, c1
Matrix: A x B
a1: b1:S

// matrixPlot
Title: T
Mode: Matrix
Dimensions: [x, y]
Data:
- { x: 1, y: 2 }

// basic
Title: T
Type: bar
Dataset: cat, [A, B], null, X
Dataset: v, [1, 2], #3b82f6, Y
```

---

## 附录 B — 文档废弃说明

| 旧路径 | 状态 |
|:---|:---|
| `DSL_SYNTAX_MANUAL.md`（根） | **Redirect 到本手册** |
| `docs/DSL_SYNTAX_MANUAL.md` | 历史 V2.0；冲突以本手册为准 |
| Editor 内联 Docs 弹窗 | 应逐步与本手册对齐 |

---

*IQS Protocol Council · LUXI Lab · IQS-DSL v1.1.0 Detailed Manual*
