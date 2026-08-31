# IQS-Flow DSL 规范（企业体系文件流程图）

> **状态**: 已实现（解析器 FlowParser + 渲染引擎 flowToSVG + 视图 FlowDiagram；parser 40 项 + svg 41 项断言全通过）
> **版本**: 0.7.0
> **适用范围**: 新增 IQS-DSL v1 第 14 个 core kind —— `flow`
> **作者**: 洪光华 / 鹿溪联合创新实验室
> **落盘日期**: 2026-08-25

---

## 0. 背景与定位

信息中心日常管理 665 个体系文件，其中大量程序文件含"谁（泳道）× 做什么（活动）× 什么条件下走哪条路（网关）"的流程图需求。现有 13 个 core kind 中 **PDPC 与 arrow 是最相近的流程图形态**，但二者均**不支持泳道、无 BPMN 语义元素、无默认顺序流**，难以支撑体系文件的快速起草与全生命周期重构。

本规范定义第 14 个 core kind —— `flow`，一套**面向企业非技术员工、同时具备强机器可读性**的流程图 DSL。语义定界为 **BPMN 2.0 子集**，渲染**自研 SVG**（零新增第三方依赖）。

### 0.1 设计原则（v0.6 更新）

1. **数据与结构分离（字典-索引范式）**：所有可变内容（部门/阶段/岗位/节点标签/属性值）集中在 `Dict` 字典数组定义，结构层（`Lane`/`W`/连线）只写**索引引用**。一处定义、多处引用、修改全局生效。
2. **索引即引用**：`D[0]`、`P[1]`、`worker[0]` 是无歧义的稳定引用，越界可校验、canonical JSON 直接落索引——机器可读性优先于书写直觉；**渲染时索引全部展开为字典值**（图上显示"信息中心"而非 `D[0]`）。
3. **默认顺序流**：W 节点按声明顺序自动连线，省去约 80% 显式连线书写；判断/并行节点的出口必须显式声明。
4. **放宽 → 归一**：解析器将人写 DSL 归一为 **canonical JSON**，节点 id 可省略（自动编号 `w1,w2,...`）可显式（`W: w1: ...`），保证可审计与机器可读。

### 0.2 产品分层（沿用治理）

| 层级 | 语言 | 用途 |
|:---|:---|:---|
| **CORE** | IQS-Flow DSL（本 spec） | 体系文件流程图、成果报告、可审计、机器可读 |
| **RELIEF** | Mermaid | 仅类型外制图；`flow` 已覆盖不可用 Mermaid 充当终稿 |

### 0.3 三层机器输出

DSL → 解析 → **canonical JSON**（校验/图谱抽取）→ **BPMN 2.0 XML**（专业工具交换）→ **自研 SVG**（渲染）。

### 0.4 与上一版（v0.5）的范式变化

| v0.5（命名直写） | v0.6（字典-索引） |
|:---|:---|
| `Lane:[sales,营销部,H,1]` 逐行声明 | `Lane from D[0,1,2,5] Layout H` 批量声明 |
| 节点 `@[sales,step1]` 交叉格定位 | 节点 `Location(D[0],P[1])` 坐标引用字典索引 |
| `axis:D[标题]` / `axis:P[标题]` | `AxisX: 职能部门 Align C` / `AxisY: ...` |
| `axis:R[岗位清单]` + `for R[i]` | `Dict: R[...]` 岗位字典 + 属性 `Role(R[1])` |
| 标签直写 | `W: worker[0]`（字典引用）或字面量 |
| `[SOP 编号]` 方括号属性 | `SOP(编号)` 圆括号属性，值可字典引用 |

---

## 1. 语言总览（文档结构与 BNF）

### 1.1 文档结构

```text
flowDoc := header* dict+ lane* axis* attrPanel* node* edge*
header  := "Title:" str | "Layout:" ("H"|"V")
dict    := "Dict:" name "[" value ("," value)* "]"
lane    := "Lane from" dictRef "Layout" ("H"|"V")
axis    := "AxisX:" str "Align" ("L"|"R"|"C")
         | "AxisY:" str "Align" ("L"|"R"|"C")
         | "Axis:" str ("AxisX"|"AxisY") ["Align" ("L"|"R"|"C")]
attrPanel:= "Attr active" ["[" key ("," key)* "]"]  // 属性边栏提取（见 §6.4）
node    := "W:" [id ":"] label [typeMark] [location] attr*
label   := dictRef | str                 // 节点标签：字典引用或字面量
typeMark:= "Type[" ("S"|"E"|"?"|"+"|"SUB"|"N"|"DATA") "]"   // 缺省=任务
location:= "Location(" dictRef ("," dictRef)* ")"           // 如 Location(D[0],P[1])
attr    := key "(" value ("," value)* ")"  // key ∈ {SOP,Role,Lv,Time,KPI,M}；值可列表
dictRef := name "[" index ("," index)* "]"  // 索引引用；"*"=全部
branch  := label [ "(" exitName ")" ] [ "[" cond "]" ] "→" target ["," target]*
         | "否则 →" target ["," target]*
target  := "#" id
edge    := id "→" "#" id [label]         // 显式边
blockEnd:= "End"                         // 闭合分支块/子流程块
```

### 1.2 词法约定

| 规则 | 说明 |
|:---|:---|
| 行注释 | `//`（沿用 v1 全局约定） |
| `#` 字符 | **仅用于节点引用**（`#w1`），不作注释、不作层级 |
| 结构分隔符 | Dict 数组内、Location 坐标内、分支多目标内用**半角逗号** `,` |
| 内容标点 | 标签/字典值内的文字标点一律用**中文全角**（`，` `；` `：`），避免与结构分隔符冲突 |
| 大小写 | 关键字 `Type`/`Location`/`Layout`/`Align`/`End`/`Dict`/`Lane` 大小写不敏感；字典名区分大小写 |

### 1.3 依赖顺序（强制）

`Dict` 定义必须先于 `Lane from` / `W` / `Location` 中的引用（**绘制泳道必须提前定义好 Dict 数组**），解析器对未定义字典报错。

---

## 2. 字典层（Dict）——数据源

### 2.1 语法

```
Dict: <字典名>[<值1>,<值2>,<值3>,...]
```

| 项 | 规则 |
|:---|:---|
| 字典名 | 字母/数字/下划线；**D / P / R 为常设固定命名**，分别代表**部门、阶段、岗位**；其余为自定义字典 |
| 值 | 任意文本（推荐中文），元素内可用全角标点；值不可含半角逗号（如需用 `，` 全角） |
| 索引 | 从 **0** 开始；`D[0]` 指第一个值 |
| 重复定义 | 同一字典名不得重复定义（解析器报错） |

### 2.2 常设固定字典

```dsl
Dict: D[信息中心,综合计划科,办公室]      // 部门字典 → D[0]=信息中心, D[1]=综合计划科, D[2]=办公室
Dict: P[阶段一,阶段二,阶段三]           // 阶段字典 → P[0],P[1],P[2]
Dict: R[岗位一,岗位二,岗位三]           // 岗位字典 → R[0],R[1],R[2]（岗位标注/图例栏数据源）
```

> **D / P / R 为数组保留关键字**：作为字典名具有固定语义（部门/阶段/岗位），自定义字典名不得与其冲突（校验 error）。

### 2.3 自定义字典

```dsl
Dict: worker[动作一,动作二,动作三,动作四]   // 节点标签字典
Dict: 标准[XX-CX-04,XX-GF-01]              // 属性值字典（SOP 值来源）
```

> **节点标签不强制走字典**：W 行支持**非字典直接命名**（字面量），如 `W: 提交采购申请`；字典引用（`worker[0]`）与字面量两种模式并存，按需选用（见 §5.1）。

### 2.4 索引引用（全文档统一形式）

| 形式 | 含义 | 示例 |
|:---|:---|:---|
| `名[i]` | 单个索引 | `D[0]`、`worker[2]` |
| `名[i,j,k]` | 索引列表（Lane from 批量用） | `D[0,1,2,5]`（支持非连续/乱序） |
| `名[*]` | 全部索引（便捷糖） | `P[*]` |

---

## 3. 泳道声明（Lane from）——结构层

### 3.1 批量语法

```
Lane from <字典引用> Layout <H|V>
```

| 项 | 含义 |
|:---|:---|
| 字典引用 | 引用固定字典（D/P）或自定义字典，索引列表决定画哪些泳道及顺序 |
| `Layout H` | 该组泳道**横向排列**（行） |
| `Layout V` | 该组泳道**纵向排列**（列） |

```dsl
Lane from D[0,1,2,5] Layout H   // 从部门字典批量画 4 条横向泳道（行），跳过索引 3,4
Lane from P[1,3,4]  Layout V   // 从阶段字典批量画 3 条纵向泳道（列）
```

### 3.2 三种形态

| 形态 | 写法 | 网格 |
|:---|:---|:---|
| **二维交叉矩阵** | 一条 `Lane from D[...] Layout H` + 一条 `Lane from P[...] Layout V` | 行=部门 × 列=阶段，交叉成格 |
| **单维泳道** | 仅一条 `Lane from` | 行或列单向泳道 |
| **无泳道** | 无 `Lane from` | 纯流程图，节点按 `Layout` 方向排布 |

泳道宽度/高度由格子内节点数自动撑开（自研渲染）。

### 3.3 网格坐标模型

- **网格只按照 `Lane from` 的定义产生**：每一条 `Lane from` 生成一个轴（行或列）；没有 `Lane from` 就没有网格（无泳道）。
- **`Lane from` 不限于 D/P 数组**：可引用任意已定义字典（固定 D/P/R 或自定义），如 `Lane from 部门组[0,1,2] Layout H`、`Lane from worker[0,1] Layout V`。轴语义（部门/阶段/岗位…）由所引用数组决定。
- 每个格子由**各轴索引组合**唯一确定：二维时如 `(D[0],P[1])` = 信息中心行 × 阶段二列；单维时如 `(D[0])`。
- 节点落格用 `Location(...)` 显式坐标（见 §5.3）；坐标引用**必须**是已定义字典的合法索引，且**与 `Lane from` 使用的数组对齐**（多余维度自动清洗，见 §5.3）。
- 行/列顺序 = 索引列表顺序，与字典声明顺序无关。

---

## 4. 轴标题（AxisX / AxisY / Axis）

### 4.1 语法

```
AxisX: <标题> Align L|R|C     // 横轴标题，文字横向排列；L/R/C = 左/右/中
AxisY: <标题> Align L|R|C     // 纵轴坐标标题，文字横向排列（保持水平，不旋转）；L/R/C = 左/右/中
Axis: <整图标题> AxisX|AxisY [Align L|R|C]   // 整图标题：AxisX/AxisY 决定挂横轴或纵轴外围；Align 可选（缺省 C）
```

> 注：**AxisY 坐标标题保持水平**（不旋转）；真正旋转 -90° 的是**各 Y 泳道标题（行标签）**。

### 4.2 示例

```dsl
AxisX: 职能部门 Align C
AxisY: 推进阶段 Align C
Axis: 采购申请审批流程 AxisX
```

渲染位置：AxisX 位于横向泳道组上方（或格子区域上方）；AxisY 位于纵向泳道组左侧（文字保持水平）；各 Y 泳道标题（行标签）旋转 -90° 竖向排列；Axis 整图标题置于所选轴的最外围——`AxisX` 挂顶部通栏，`AxisY` 挂左侧**竖向标题带**（旋转 -90°，带宽 = 字号+32 不横排超宽，带高与列标签行+X轴泳道网格齐平）。全部表头格子化、默认居中。

---

## 5. 节点（W 行）

### 5.1 W 行完整语法

```
W: [<id>:] <标签> [Type[<类型>]] [Location(<坐标>)] [<属性>...]
```

| 部分 | 说明 |
|:---|:---|
| `W:` | 节点行标识（Worker） |
| `<id>:` | **可选** id；省略时解析器按声明顺序自动编号 `w1, w2, w3, ...`（稳定、可审计）；显式 id 用于分支/连线引用 |
| `<标签>` | **字典引用**（`worker[0]`）或**字面量**（`提交采购申请`），二选一 |
| `Type[...]` | 节点类型标记，**缺省 = 任务**（见 §5.2） |
| `Location(...)` | 格子坐标（见 §5.3），缺省 = 自动顺序落格 |
| `<属性>` | 六属性（见 §6），任意组合、可缺省 |

```dsl
W: w1: worker[0] Type[S] Location(D[0],P[0])        // 显式 id + 开始
W: worker[1] Location(D[0],P[1]) SOP(XX-CX-04)      // 自动编号 w2 + 任务（Type 缺省）
W: q1: worker[2] Type[?] Location(D[0],P[2])        // 判断
W: 直接执行 Location(D[0],P[3])                      // 字面量标签（自动编号）
```

### 5.2 节点类型（Type 关键字）

| 类型 | 写法 | BPMN 语义 | 视觉 |
|:---|:---|:---|:---|
| 开始 | `Type[S]` | startEvent | ○ 细圆 |
| 结束 | `Type[E]` | endEvent | ● 粗圆 |
| 任务 | （缺省）或 `Type[T]` | task | 圆角矩形 |
| 判断 | `Type[?]` | exclusiveGateway | ◇ 菱形 |
| 并行 | `Type[+]` | parallelGateway | ◇＋ |
| 子流程 | `Type[SUB]` | subProcess | 圆角矩形＋（内嵌子图，见 §7.4） |
| 文本标注 | `Type[N]` | textAnnotation | 折角纸（不占格，见 §5.5） |
| 数据对象 | `Type[DATA]` | dataObject | 纸带（不占格，见 §5.5） |

> 注：数据对象用 `Type[DATA]` 而非 `Type[D]`，避免与固定部门字典名 `D` 混淆。

### 5.3 Location 坐标

```
Location(<D索引>, <P索引>)    // 二维：行×列交叉格
Location(<D索引>)             // 单维：仅行（或列）泳道
Location(<P索引>)
```

- 坐标引用**与 `Lane from` 对齐的数组索引**（通常为 D/P，也可为自定义数组，见 §3.3）；缺省 `Location` = **自动顺序落格**（按声明顺序从首个格子起填充，canonical 输出实际坐标，可审计）。
- **维度自动清洗（兼容性）**：若书写了**未被任何 `Lane from` 定义**的坐标维度（如单维泳道却写 `Location(D[0],P[1])`），解析器**自动丢弃该坐标分量**（不报错，warn 提示），canonical 输出清洗后的坐标——允许员工按二维习惯书写、按实际网格自适应。
- `Type[N]` / `Type[DATA]` 修饰类**不占格子**：Location 可省略（缺省依附声明顺序前驱节点），也可写坐标强制占格显示。
- 语义上：**一个动作节点只归属一个格子**（单归属），跨泳道流转用连线表达，不复制节点。

### 5.4 岗位标注

- 岗位通过属性 `Role(<值>)` 标注在节点上（见 §6.2），渲染为**节点右下角一行小字**——如同图纸标注。岗位不参与格子坐标（岗位不占格）。
- **`Role` 值不强制绑定 R 数组**：`Role(R[1])` 只是"接受数组值"的一种写法；同样接受任意自定义字典引用（`Role(岗位[2])`）与**正常自定义字面量**（`Role(部门经理)`）。
- **岗位图例栏（渲染侧）**：提取**节点中实际出现的 `Role` 属性值**（去重），按**首次出现顺序**排列，并按**出现次数**决定字体粗细（次数越多越粗）；而非渲染 `Dict: R[...]` 数组本身。R 字典仅作可选数据源，无 `Role` 引用的岗位不进入图例栏。

---

## 6. 属性（六属性规范化集）

### 6.1 语法

```
<键>(<值>)
```

值 = **字面量** 或 **字典引用**（`R[1]`、`标准[0]`）。圆括号与 `Type[...]`（节点类型）、`Dict[...]`（数组定义）三种容器**词法可区分**：`键(...)` = 属性，`Type[...]` = 类型，`名[索引]` = 字典引用。

### 6.2 六属性表

| 键 | 含义 | 企业管理落点 | 示例 |
|:---|:---|:---|:---|
| `SOP` | 依据标准 | 绑定 GF/CX/GW 标准编号 | `SOP(XX-CX-04)`、`SOP(标准[0])` |
| `Role` | 责任人/授权岗位 | 岗位标注；值可为 R 数组引用/任意字典引用/字面量 | `Role(R[1])`、`Role(部门经理)` |
| `Lv` | 管控程度/风险等级 | 重大/重要/一般 或 1/2/3 | `Lv(重要)` |
| `Time` | 时效/SLA | 完成时限 | `Time(24h)`、`Time(2026-08-25)` |
| `KPI` | 成效度量 | 质量目标/衡量指标 | `KPI(≤1‰)` |
| `M` | 管理成熟度 | BPA/BPM/BPI、数字化档；支持数值 `1/2/3/4` 指代 | `M(BPM)`、`M(3)` |

> 使用强度阶梯：`SOP`/`Role`/`Lv` 高优先（体系文件几乎每步标依据/责任人/重要性），`Time`/`KPI` 中优先（程序文件），`M` 低优先（改进场景）。

### 6.3 canonical 键映射

属性键在 canonical JSON 中统一**小驼峰**：`SOP→sop`、`Role→role`、`Lv→lv`、`Time→time`、`KPI→kpi`、`M→m`；属性值保留 DSL 原文（字面量或引用串），渲染时引用串查字典展开。

### 6.4 属性边栏提取（Attr active）——全局指令

```
Attr active [<键>,<键>,...]     // 键 ∈ {SOP,Role,Lv,Time,KPI,M}；缺省清单 = 全部六属性
```

文档级全局指令（与 Title/Layout 同层，至多一条）。激活后，解析器从**全部节点**的对应属性中提取**聚合视图**（canonical 输出 `attrPanel` 字段，见 §9），渲染为**图纸边栏面板**（图纸右下角图例栏的扩展）。

**提取业务逻辑（按属性键界定）**：

| 键 | 提取逻辑 |
|:---|:---|
| `Role` | **去重列出**岗位值 → 按出现次数**降序排列**；次数决定**字体粗细**（次数多者粗）；序号标注 |
| `SOP` | 同 `Role`：去重 + 计数 + 排序 + 字体粗细（依据文件清单） |
| `Lv` | **重要程度区间计数**（重大/重要/一般 各计几处）并给出**评分**（如 重大×3 + 重要×2 → 总分）；映射 RAG **色卡** |
| `Time` | 计算**整体最小时长**（沿关键路径求和），并给出**时间计算公式明细**（如 `24h + 2h = 26h`） |
| `KPI` | 提供**指标清单**（全部 KPI 值逐条列出） |
| `M` | 成熟度档位计数；与 `Lv` 类似加入**色卡**与必要**文本标记**。支持 BPA/BPM/BPI 三档或数值 `1/2/3/4`（映射见附录 A，色卡：红/黄/蓝/绿） |

```dsl
Attr active [Role,SOP,Lv,Time]     // 只提取这四项到边栏
Attr active                        // 全部六属性提取
```

> 未激活的属性键不参与提取；边栏内容与节点右下角标注（§5.4）独立——边栏是聚合视图，节点标注是单点视图。

---

## 7. 连线与分支

### 7.1 默认顺序流（声明顺序自动连）

普通节点（S/T/E/SUB/N/DATA）按**声明顺序**自动生成顺序边 `w1→w2→w3...`。断点规则：

1. **`Type[?]` / `Type[+]` 节点不参与默认顺序流**——其出口必须用分支行显式声明（见 §7.3），否则校验报错。
2. **判断/并行节点的显式出口目标节点**，其默认入边被抑制（该节点是分支起点，如两个分支目标之间不自动连线）。
3. 普通节点之间的显式边（如回边 `b3 → #s2`）**不抑制**目标的默认入边（`s2` 保留默认入边 + 回边，形成合并汇聚）。

canonical 输出中默认边全部展开为显式边（id 自动编号 `e1,e2,...`），校验可查。

### 7.2 显式边

```
<源id> → #<目标id> [<标签>]
```

```dsl
b3 → #s2            // 回边
w1 → #w5 [超时]      // 带标签显式边
```

### 7.3 分支块（判断/并行节点出口）

分支行紧跟所属节点，`End` 显式闭合（缩进仅为视觉辅助，不参与解析）：

```
W: <id>: <标签> Type[?] Location(...)
   <标签> [(<出口名>)] [<条件>] → #<目标>[, #<目标>]*
   否则 → #<目标>
   End
```

| 分支行部分 | 语法 | 说明 |
|:---|:---|:---|
| 标签 | `是` `否` `通过` `报废`… | 任意文本，连线标签 |
| 出口名 | `(pass)` | **可选**，分支线稳定 id；缺省自动 `{节点id}-Y`/`-N`/`-{序号}` |
| 条件 | `[缺陷≤3]` | 可选，BPMN conditionExpression，输出 canonical `condition` |
| 目标 | `#w4` | 强制 `#id`；**可省略** = 接声明顺序下一节点 |
| 多目标 | `→ #w2, #w4` | 自动拆为多条并行边（语义等价并行扇出） |
| 默认出口 | `否则 → #w5` | BPMN default flow，渲染为带斜杠实线箭头；每节点至多一条 |

```dsl
W: q2: worker[2] Type[?] Location(D[0],P[2])
   合格 (pass) → #w3
   返工 [缺陷≤3] → #q3
   否则 → #w3
   End
```

### 7.4 子流程块（内嵌子图）

```
W: <id>: <标签> Type[SUB] Location(...)
   <内部 W 行>...          // 内部节点省略 Location，按声明顺序在子图内自动排布
   End
```

- 内嵌一层（体系文件场景一层足够）；块内节点 id 全局唯一（自动编号顺延全局序，显式 id 亦可）。
- canonical 中内部节点带 `parent` 字段归属子流程。
- 程序文件互相引用（"按《XX程序》执行"）由此表达，DSL 内闭环。

### 7.5 合并收敛（隐式）

多条边指向同一节点 = BPMN 隐式合并，无需额外语法（分支目标与默认入边自动汇聚）。

---

## 8. 完整示例

### 8.1 采购申请审批（二维矩阵泳道 + 岗位图例 + 回边）

```dsl
Title: 采购申请审批流程
Layout: H

// ===== 数据层：字典 =====
Dict: D[信息中心,综合计划科,办公室]
Dict: P[申请阶段,审批阶段,执行阶段,归档阶段]
Dict: R[申请员,部门经理,财务岗]
Dict: worker[提交采购申请,填写申请单,金额超过5000?,部门经理审批,直接执行,财务付款,归档,退回修改]

// ===== 结构层：泳道 =====
Lane from D[0,1,2] Layout H
Lane from P[0,1,2,3] Layout V

// ===== 轴标题 =====
AxisX: 职能部门 Align C
AxisY: 推进阶段 Align C
Axis: 采购申请审批流程 AxisX

// ===== 属性边栏提取 =====
Attr active [Role,SOP,Lv,Time]

// ===== 节点 =====
W: w1: worker[0] Type[S] Location(D[0],P[0])
W: w2: worker[1] Location(D[0],P[0]) SOP(XX-CX-04) Role(R[0]) Lv(重要)
W: q1: worker[2] Type[?] Location(D[0],P[1])
   是 → #w4
   否 → #w5
   End
W: w4: worker[3] Location(D[1],P[1]) Role(R[1]) Time(24h)
W: q2: 审批是否通过? Type[?] Location(D[1],P[1])
   通过 → #w6
   驳回 → #w2
   End
W: w5: worker[4] Location(D[0],P[2])
W: w6: worker[5] Location(D[2],P[2]) Role(R[2]) KPI(≤1‰)
W: w7: worker[6] Type[E] Location(D[1],P[3])

// 显式边：补齐分支汇聚，理顺流转
w5 → #w6          // 直接执行（否分支）→ 付款
w6 → #w7          // 付款 → 归档
```

### 8.2 质检流程（单维纵泳道 + 多出口扇出 + 子流程）

```dsl
Title: 来料检验与处置
Layout: V

Dict: D[质检科,采购科,生产车间]
Dict: R[检验员,采购员,车间主任]
Dict: worker[来料检验,检验结果?,合格入库,退货处理,让步接收,不合格评审,复检,可接收?,记录归档]
Dict: 标准[GB/T 2828.1-2012]

Lane from D[0,1,2] Layout V

AxisX: 处置流向 Align L
AxisY: 责任部门 Align C

W: w1: worker[0] Location(D[0]) SOP(标准[0]) Role(R[0])
W: q1: worker[1] Type[?] Location(D[0])
   合格 (pass) → #w2
   不合格 → #q2
   否则 → #w2
   End
W: w2: worker[2] Type[E] Location(D[1]) Role(R[1])
W: q2: worker[5] Type[SUB] Location(D[0])   // 子流程：不合格评审
   W: s1: worker[6] Type[S]
   W: s2: worker[7] Type[?]
      可接收 → #s3
      不可接收 → #s4
      End
   W: s3: worker[3]
   W: s4: worker[8] Type[E]
   End
W: w3: worker[8] Type[E] Location(D[2])

// 显式边：子流程结束后汇聚到记录归档
q2 → #w3
```

---

## 9. canonical JSON

### 9.1 结构

```json
{
  "kind": "flow",
  "version": "0.7.0",
  "title": "采购申请审批流程",
  "layout": "horizontal",
  "dicts": {
    "D": ["信息中心", "综合计划科", "办公室"],
    "P": ["申请阶段", "审批阶段", "执行阶段", "归档阶段"],
    "R": ["申请员", "部门经理", "财务岗"],
    "worker": ["提交采购申请", "填写申请单", "金额超过5000?", "部门经理审批", "直接执行", "财务付款", "归档", "退回修改"]
  },
  "lanes": [
    {"dict": "D", "indices": [0, 1, 2], "layout": "H"},
    {"dict": "P", "indices": [0, 1, 2, 3], "layout": "V"}
  ],
  "axes": {
    "x":  {"title": "职能部门", "align": "C"},
    "y":  {"title": "推进阶段", "align": "C"},
    "page": {"title": "采购申请审批流程", "place": "AxisX", "align": "C"}
  },
  "nodes": [
    {"id": "w1", "type": "start", "label": "提交采购申请", "labelRef": "worker[0]",
     "cell": {"D": 0, "P": 0}, "attrs": {}},
    {"id": "w2", "type": "task", "label": "填写申请单", "labelRef": "worker[1]",
     "cell": {"D": 0, "P": 0},
     "attrs": {"sop": "XX-CX-04", "role": "R[0]", "lv": "重要"}},
    {"id": "q1", "type": "exclusiveGateway", "label": "金额超过5000?", "labelRef": "worker[2]",
     "cell": {"D": 0, "P": 1}, "attrs": {}},
    {"id": "q2", "type": "exclusiveGateway", "label": "审批是否通过?", "labelRef": null,
     "cell": {"D": 1, "P": 1}, "attrs": {}},
    {"id": "w7", "type": "end", "label": "归档", "labelRef": "worker[6]",
     "cell": {"D": 1, "P": 3}, "attrs": {}}
  ],
  "edges": [
    {"id": "e1", "from": "w1", "to": "w2", "type": "sequence", "label": null,
     "condition": null, "default": false},
    {"id": "e2", "from": "q1", "to": "w4", "type": "sequence", "label": "是",
     "condition": null, "default": false},
    {"id": "e3", "from": "q1", "to": "w5", "type": "sequence", "label": "否",
     "condition": null, "default": false},
    {"id": "e4", "from": "w5", "to": "w6", "type": "sequence", "label": null,
     "condition": null, "default": false},
    {"id": "e5", "from": "q2", "to": "w6", "type": "sequence", "label": "通过",
     "condition": null, "default": false},
    {"id": "e6", "from": "w6", "to": "w7", "type": "sequence", "label": null,
     "condition": null, "default": false},
    {"id": "e7", "from": "q2", "to": "w2", "type": "sequence", "label": "驳回",
     "condition": null, "default": false}
  ],
  "subProcesses": [],
  "attrPanel": {
    "active": ["role", "sop", "lv", "time"],
    "role": {"计数降序": [{"值": "部门经理", "次数": 1}, {"值": "申请员", "次数": 1}, {"值": "财务岗", "次数": 1}]},
    "sop":  {"计数": [{"值": "XX-CX-04", "次数": 1}]},
    "lv":   {"区间计数": {"重大": 0, "重要": 1, "一般": 0}, "评分": 2},
    "time": {"关键路径最小时长": "26h", "公式明细": "24h + 2h = 26h"}
  },
  "artifacts": [
    {"id": "n1", "type": "annotation", "label": "依据《XX制度》", "attach": "w2"}
  ]
}
```

### 9.2 要点

- `labelRef` 保留原始字典引用，`label` 为展开值；attrs 值保留 DSL 原文（引用串渲染时查字典展开）。
- 默认顺序流与显式边/分支边统一展开进 `edges`，`type` 恒为 `sequence`（BPMN XML 映射见附录 B）。
- 子流程内部节点带 `parent` 字段（如 `"parent": "q2"`）；修饰类节点进 `artifacts`。
- `attrPanel` 记录 `Attr active` 激活的键与提取结果（§6.4）；未激活该指令时 `attrPanel` 为 `null`。

---

## 10. 内置校验

| # | 规则 | 级别 |
|:---|:---|:---|
| 1 | 字典名唯一（含固定 D/P/R，不得重复定义） | error |
| 2 | `Lane from` / `Location` / 属性引用必须指向**已定义**字典（先 Dict 后使用） | error |
| 3 | 字典索引越界（`D[5]` 而字典仅 3 项） | error |
| 4 | W id 唯一（显式 id 与自动编号不冲突） | error |
| 5 | `Type[?]` / `Type[+]` 节点必须有分支出口（至少一行分支行） | error |
| 6 | 默认出口 `否则 →` 每节点至多一条 | error |
| 7 | 分支目标 `#id` 必须存在；目标为修饰类节点报错 | error |
| 8 | 开始节点 ≥ 1、结束节点 ≥ 1 | error |
| 9 | 无孤立节点（无入边且非开始、或无出边且非结束） | error |
| 10 | 分支块 / 子流程块 `End` 配对闭合 | error |
| 11 | 子流程嵌套深度 ≤ 1 | error |
| 12 | 分支出口标签在同一节点内唯一 | warn |
| 13 | 回边（环路）允许，但环路须含至少一个判断节点 | warn |
| 14 | 修饰类节点（N/DATA）存在性检查（依附目标存在） | error |
| 15 | 自定义字典名不得与保留字 D/P/R 冲突 | error |
| 16 | 坐标维度自动清洗（存在未被 `Lane from` 定义的维度） | warn |
| 17 | `Attr active` 清单项 ∈ {SOP,Role,Lv,Time,KPI,M}，至多一条 | error |
| 18 | `Role` 值有 `Role(R[k])` 形式时 `k` 必须在 R 字典界内 | error |

---

## 11. 渲染规格（自研 SVG，零新依赖）

1. **网格构建**：`Lane from` 先建行（H）与列（V），行高/列宽由格子内节点数撑开；无 `Lane from` 时按 `Layout` 方向单轨排布。
2. **节点落格**：按 `cell` 放入交叉格（多余维度已清洗，见 §5.3）；缺省 Location 的节点按声明顺序自动填充，canonical 记录实际坐标。
3. **格子内排布**：节点沿 `vh` 链式标识相对上一节点排布（V=下方[默认]、H=右侧、D=对角右下——A6 扩展格算子，数学性质见 `FLOW_OPTIMALITY_FRAMEWORK.md` §2）；格子间节点用**正交连线**（曼哈顿路径）。
4. **索引展开**：图上所有文字均为字典展开值（"信息中心"而非 `D[0]`）。
5. **标题**：AxisX 横轴标题（水平）、AxisY 纵轴坐标标题（水平）、Axis 整图标题挂最外围；各 Y 泳道标题旋转 -90° 竖向排列。
6. **岗位图例栏**：从**节点实际出现的 `Role` 属性值**去重提取，按**首次出现顺序**排列、按**出现次数**定字体粗细（非渲染 R 数组本身）；节点右下角显示其 `Role` 值小字。
7. **属性边栏（Attr active）**：按 §6.4 提取逻辑渲染聚合面板（Role/SOP 计数排序、Lv 区间评分+色卡、Time 最小时长+公式、KPI 清单、M 色卡+标记），置于图纸边栏。
8. **元素形状**：见 §5.2 视觉列（BPMN 标准形状）。
9. **颜色槽**（对齐 kinds.json 机制）：`Color[Start|End|Task|Gateway|Parallel|Subprocess|Lane|Annotation|Data|Axis|Line|Text|Panel]`。

---

## 12. 落地路径（沿用既有治理，零新依赖）

1. `dsl/kinds.json` 注册 `flow`（第 14 个 core kind）：`body=FlowGraph`、`mcpName=render_flow`、`renderType=flow`、intents（流程图/泳道图/BPMN/流程/程序文件）、colorSlots（§11.8）。
2. `components/FlowEditor.tsx`（宽松解析 → canonical）+ `components/FlowDiagram.tsx`（自研 SVG 渲染）。
3. `protocol/segments/flow.md`（Soul/Grammar/Seed 三段式协议切片，同步本 spec）。
4. MCP `render_flow` + 校验器（§10 规则表）。
5. `npm run validate:dsl` 集成；变更语法顺序：Spec → kinds.json → parser → mcp example → validate（governance.md §5）。

---

## 13. 与既有 kind 的关系

| kind | 关系 |
|:---|:---|
| `pdpc` | **保留**：PDPC 是风险对策图（目标-路径-NG-对策），语义与 flow 不同；flow 不替代 |
| `arrow` | 保留：箭头图（逻辑链）轻量场景仍可用 |
| `mermaid`（relief） | flow 覆盖后，流程图场景禁止用 Mermaid 充当终稿（governance 红线） |

---

## 附录 A：属性值域

| 键 | 值域 | 示例 |
|:---|:---|:---|
| `SOP` | 标准编号（`SRYC/<部门码>-<类型码>-<序号>-<年份>-<版本>` 或自定义）或字典引用 | `SOP(XX-CX-04)`、`SOP(标准[0])` |
| `Role` | 任意岗位值；可 `R[0..n]`（R 字典引用）、其他字典引用、或字面量；可多个 `Role(R[0],R[2])` | `Role(R[1])`、`Role(部门经理)` |
| `Lv` | `重大\|重要\|一般` 或 `1\|2\|3`（映射 RAG 红黄绿） | `Lv(重大)` |
| `Time` | `\d+h`、`YYYY-MM-DD`、`D+N` 相对时限 | `Time(24h)` |
| `KPI` | 指标文本（可含全角 `≤` `≥` `‰`） | `KPI(≤1‰)` |
| `M` | `BPA\|BPM\|BPI` 或 `已数字化\|半数字化\|未数字化` 或数值 `1\|2\|3\|4` | `M(BPM)`、`M(3)` |

`M` 数值档位映射（BPMM 五级精简为四级）：

| 数值 | 档位 | 管理量化 | 色卡 |
|:---:|:---|:---|:---|
| `1` | 未数字化 | 初始/无量化 | 红 |
| `2` | 半数字化 | 可复现，部分量化 | 黄 |
| `3` | 已数字化 | 已定义，可度量 | 蓝（默认） |
| `4` | 可监控/已优化 | 量化管理/持续优化 | 绿 |

### 全局指令：`Attr active`（属性边栏提取）

```
Attr active [<键>,<键>,...]    // 键 ∈ {SOP,Role,Lv,Time,KPI,M}；缺省 = 全部
```

文档级、至多一条。激活后从全部节点的对应属性提取**聚合边栏面板**，canonical 输出 `attrPanel`，渲染逻辑：

| 键 | 提取 → 呈现 |
|:---|:---|
| `Role` | 去重 → 按出现次数降序 → 次数定字体粗细 |
| `SOP` | 同 Role：依据文件清单 + 计数排序 |
| `Lv` | 区间计数（重大/重要/一般）+ 评分 + RAG 色卡 |
| `Time` | 关键路径最小时长 + 时间公式明细 |
| `KPI` | 指标清单逐条 |
| `M` | 成熟度计数 + 色卡 + 文本标记 |

详见 §6.4。

## 附录 B：BPMN 2.0 XML 映射

| canonical | BPMN XML |
|:---|:---|
| node type=start | `<bpmn:startEvent id="w1" name="提交采购申请"/>` |
| node type=end | `<bpmn:endEvent id="w7" name="归档"/>` |
| node type=task | `<bpmn:task id="w2" name="填写申请单"><bpmn:documentation>SOP=...; Role=...</bpmn:documentation></bpmn:task>` |
| node type=exclusiveGateway | `<bpmn:exclusiveGateway id="q1" name="金额超过5000?"/>` |
| node type=parallelGateway | `<bpmn:parallelGateway id="..." name="..."/>` |
| node type=subprocess | `<bpmn:subProcess id="q2" name="不合格评审">…子节点…</bpmn:subProcess>` |
| edge（sequence） | `<bpmn:sequenceFlow id="e1" sourceRef="w1" targetRef="w2"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">是</bpmn:conditionExpression></bpmn:sequenceFlow>`（default 出口的边设 `default` 属性于网关） |
| lane | `<bpmn:laneSet><bpmn:lane id="D0" name="信息中心"><bpmn:flowNodeRef>…</bpmn:flowNodeRef></bpmn:lane></bpmn:laneSet>` |
| 修饰 | `<bpmn:textAnnotation id="n1"><bpmn:text>依据《XX制度》</bpmn:text></bpmn:textAnnotation>` + `<bpmn:association>` |
| attrs | 写入 `<bpmn:documentation>`（结构化键值），供机器回读 |

---

*IQS Protocol Council — 2026.08（aligned with DSL v1 governance）*
