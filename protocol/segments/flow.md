# flow (企业流程图/泳道图) 协议切片

## 1. 专家灵魂 (The Soul)

### 企业流程图（Flow / BPMN 子集）

流程图定义「**谁（泳道）× 做什么（活动）× 什么条件下走哪条路（网关）**」，面向企业体系文件中的程序文件（CX）建模。语义定界为 **BPMN 2.0 子集**：保留开始/结束/任务/子流程/排他与并行网关/标注/数据对象，裁掉边界事件、补偿、多实例等体系文件中不用的元素。

#### 字典-索引范式（核心）

- **数据层（Dict）**：所有可变内容（部门/阶段/岗位/动作/属性值）集中成数组；`D`（部门）`P`（阶段）`R`（岗位）为**保留字**，其余自定义。
- **结构层**：只写**索引引用**（`D[0]`、`worker[2]`），渲染时展开为字典值（图上显示「信息中心」而非 `D[0]`）。一处定义、多处引用、修改全局生效。

#### 专家建议

- **默认顺序流**：可流转节点（S/T/SUB）按声明顺序自动连；判断/并行节点不出自动序，其出口必须显式分支行声明并以 `End` 闭合。结束节点与 N/DATA 不作默认流出源。
- **禁止 Mermaid 冒充**：体系文件/部门泳道/BPMN 子集终稿必须用本 kind（MCP `render_flow`），禁止 `flowchart TD` / `graph LR`。
- **岗位图例**：从节点实际 `Role` 属性值去重提取，按出现次数定字体粗细（非渲染 `R` 数组本身）。
- **属性边栏**：`Attr active` 激活后从全部节点提取聚合视图（Role/SOP 计数、Lv 区间评分、Time 最小时长、KPI 清单、M 色卡）。

> [!IMPORTANT]
> 网格**只按 `Lane from` 的定义产生**；节点坐标的多余维度**自动清洗**；图上必须显示字典展开值。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — flow (FlowGraph)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 形如 `<文本>` **必填** | `Title: 采购审批流程` |
| `Layout:` | 整体方向（H / V） | `Layout: H` |
| `Color[Slot]` | #HEX 颜色；Slot 取 meta.colorSlots 中的键（Start/End/Task/Gateway/Parallel/Subprocess/Annotation/Data/Lane/Axis/Line/Text/Panel） | `Color[Start]: #0D5E42` |
| `Grid:` | 泳道网格线型（**线型**，非开关）（dashed / solid） | `Grid: dashed` |
| `Dict:` | 字典定义（数据层，必须**先于**一切引用出现） 形如 `<名>[<值>,<值>,…]` **必填** | `Dict: D[信息中心,综合计划科,办公室]` |
| `Lane:` | 批量画泳道（结构层，网格只由此产生） 形如 `Lane from <字典>[<索引>,…] Layout H\|V` **必填** | `Lane from D[0,1,2] Layout H` |
| `AxisX:` | 横轴标题 形如 `<标题> Align L\|R\|C` | `AxisX: 职能部门 Align C` |
| `AxisY:` | 纵轴坐标标题（文字保持水平；真正旋转 -90° 的是各 Y 泳道标题） 形如 `<标题> Align L\|R\|C` | `AxisY: 推进阶段 Align C` |
| `Axis:` | 整图标题（挂在所选轴的最外围） 形如 `<整图标题> AxisX\|AxisY [Align L\|R\|C]` | `Axis: 采购审批 AxisX` |
| `Attr:` | 属性边栏提取开关 形如 `Attr active [<键>,…]` | `Attr active [Role,SOP,Lv,Time]` |
| `W:` | 节点定义 形如 `[<id>:] <标签> [Type[…]] [Location(…)] [属性(…)]* [Attach(#id)] [V\|H\|D]` **必填** | `W: w1: worker[0] Type[S] Location(D[0],P[0])` |
| `Type:` | 节点类型（S / E / T / ? / + / SUB / N / DATA） | `W: q1: worker[2] Type[?] Location(D[0],P[1])` |
| `Location:` | 节点落格坐标 形如 `Location(<字典名>[索引], …)` | `Location(D[0],P[1])` |
| `→:` | 显式边（源在左、目标在右，目标必须已定义） 形如 `<源id> → #<目标id>` ⚠️部分支持 | `w5 → #w6` |
| `分支行:` | 网关出口声明（Type[?]/Type[+] 必须写） 形如 `<标签> [(<出口名>)] [<条件>] → #<目标>[, #<目标>]*` **必填** ⚠️部分支持 | `   合格 (pass) → #w2` |
| `End:` | 显式闭合分支块 / 子流程块 形如 `End` **必填** | `   End` |
| `SUB:` | 子流程块（内嵌子图） 形如 `W: <id>: <标签> Type[SUB] …\n   W: <内嵌节点>…\n   End` ⚠️部分支持 | `W: q2: worker[4] Type[SUB] Location(D[0])\n   W: s1: worker[5] Type[S]\n   W: s2: worker[6] Type[E]\n   End` |
| `Attach:` | N/DATA 依附目标节点（仅修饰类可用） 形如 `Attach(#id) \| Attach(id)` ⚠️部分支持 | `W: n1: 评审记录 Type[N] Attach(#w10)` |
| `SOP:` | 标准编号（如体系文件号） 形如 `SOP(<值>)` | `SOP(XX-CX-04)` |
| `Role:` | 岗位（**不占格**，用于节点右下角标注与岗位图例） 形如 `Role(<R[i]> \| <字典引用> \| <字面量>)` | `Role(R[0])` |
| `Lv:` | 重要度（重大 / 重要 / 一般 / 1 / 2 / 3） | `Lv(重要)` |
| `Time:` | 时限 形如 `Time(24h)` | `Time(24h)` |
| `KPI:` | 考核指标 形如 `KPI(<文本>)` | `KPI(及时率≥98%)` |
| `M:` | 成熟度/等级（BPM / 1 / 2 / 3 / 4） | `M(BPM)` |

### 边界说明

- **`Layout`**：注意与 affinity/pdpc/relation 的 `Layout: Horizontal` 全称写法不同。
- **`Grid`**：缺省 `dashed`。⚠️ 与 basic 的 `Grid: true`（开关）语义不同。
- **`Dict`**：`D` / `P` / `R` 为保留字（部门/阶段/岗位）；其余自定义（如 `worker`）。值之间用**半角逗号**；值内部若需逗号请用全角「，」。同名 `Dict` 重复定义会报错。
- **`Lane`**：`H` = 行（横向泳道），`V` = 列（纵向泳道）。索引支持 `D[0]` / `D[0,1,3]` / `D[*]`（全部）。**行/列顺序 = 索引列表顺序，与字典声明顺序无关**。无 `Lane from` 则无网格（`Location` 会失效）。
- **`Attr`**：缺省（不写）= 只标 Role。写入后，节点**右下角**按此顺序渲染该节点**有值**的项，多行右对齐，**至多 4 行**；空键不占行。可提取的键即六属性：`Role` `SOP` `Lv` `Time` `KPI` `M`。
- **`W`**：① `id` 可省略（自动 `w1,w2,…`），用于 `#引用`；② `标签` 为字典引用（`worker[0]`）或字面量（`提交申请`），二选一；③ 行尾 `V`/`H`/`D` 指定**格内相对上一节点**的方位：下 / 右 / 对角右下。
- **`Type`**：`S`开始 `E`结束 `T`任务（缺省）`?`排他网关 `+`并行网关 `SUB`子流程 `N`标注 `DATA`数据对象。⚠️ 实测未声明的 `Type[XX]` 会**静默降级为 T**，不报错——请只用上表取值（AUD-005/C7）。
- **`Location`**：**参数按字典名索引，与 `Layout H/V` 无关**：`Location(D[0],P[1])` 恒表示「D 字典第 0 项」×「P 字典第 1 项」；哪个是行、哪个是列由对应的 `Lane from … Layout` 决定。实测 canonical 输出为 `cell:{D:0,P:1}`。坐标维度必须已由某条 `Lane from` 定义；**多余维度自动清洗**（不报错）；缺省 `Location` = 按声明顺序自动落格。
- **`→`**：✅ 无标签形式可用。❌ **标签形式不可用**：spec §7.2 曾文档化 `w1 → #w5 [超时]`，实测报错「显式边目标 w5 [超时] 未定义」（AUD-117）——**不要在显式边上写标签**；需要连线文字时改用分支行（分支行的标签是支持的）。⚠️ 箭头为**全角 `→`**；目标必须带 `#`；目标需先于该行定义。
- **`分支行`**：✅ `标签`（连线文字）、`(出口名)`（稳定 id，缺省自动 `{节点id}-Y`/`-N`）、`[条件]`（BPMN conditionExpression）、多目标 `→ #a, #b`（自动拆并行边）、`否则 → #w5`（默认出口，渲染为带斜杠实线）。⚠️ 多目标拆分时会因标签重名产生 warning「分支出口标签「是」重复（应唯一）」——多目标时请给**不同标签**或省略标签（AUD-121）。❌ **目标不可省略**：spec §7.3 曾写「可省略 = 接声明顺序下一节点」，实测 `是 →` 被**静默丢弃**、不产生任何边（AUD-118）——必须写 `#目标`。
- **`End`**：缩进仅为视觉辅助，不参与解析；但**每个分支块与子流程块都必须以 `End` 闭合**。
- **`SUB`**：⚠️ **子流程内嵌的 `W` 行会打断默认顺序流**：实测 SUB 节点**不会**自动连到其后的节点（AUD-119 同源机制）——**必须显式写 `SUBid → #下一节点`**，否则后续节点会报「孤立」。（这正是旧版正例 B 的失败原因，AUD-122，已修正。）
- **`Attach`**：① N/DATA **不占交叉格**，渲染在网格最右侧的 `DOC` 虚拟列，与 `Attach` 目标同行；② 连线用虚线（`condition=__doc__`）；③ 目标必须存在且非 N/DATA；④ ❌ **已知缺陷（AUD-119）**：若把 N/DATA 直接排在主流节点的**相邻声明位置**，默认顺序流会产出 `w1 → n1` 这样的违规边，进而报错「连线目标 n1 为修饰类节点」。**规避写法：把 `Type[N]`/`Type[DATA]` 的 `W` 行写在所有主流节点之后**，不要插入主流声明序列中间。
- **`SOP`**：值可为字面量或字典引用。
- **`Role`**：三种写法等价：`Role(R[1])` / `Role(岗位[2])` / `Role(部门经理)`。**不强制绑定 `R` 数组**。
- **`Lv`**：文字与数字两种写法均可（1=重大 3=一般）。
- **`Time`**：体系文件常用时长写法，如 `24h` / `3d`。
- **`M`**：`BPM` 表示已纳入流程管理，数字表示等级。

### 反例（错 → 对）

- 错：`flowchart TD\n  A[提交申请] --> B{经理审批}`
  对：`Title: 采购申请审批流程\nLayout: H\nDict: D[…]…\nLane from D[0,1] Layout H\nW: w1: 提交申请 Type[S] Location(D[0])`
  因：体系文件/部门泳道/BPMN 子集终稿必须用 IQS-Flow DSL（`render_flow`），禁止 Mermaid `flowchart`/`graph` 冒充。
- 错：`Lane from D[0,1] Layout H\nDict: D[部门A,部门B]`
  对：`Dict: D[部门A,部门B]\nLane from D[0,1] Layout H`
  因：`Dict` 必须先于一切引用（Lane / W / Location / Role）出现。
- 错：`W: q1: 超限? Type[?] Location(D[0],P[0])\nW: w2: 处理`
  对：`W: q1: 超限? Type[?] Location(D[0],P[0])\n   是 → #w2\n   否则 → #w3\n   End`
  因：排他/并行网关**禁止依赖自动出边**，必须写分支行并以 `End` 闭合。
- 错：`W: w1: 开始 Type[S] Location(D[0],P[0])\nW: n1: 备注 Type[N] Attach(#w1)\nW: w2: 处理 Location(D[1],P[1])`
  对：`W: w1: 开始 Type[S] Location(D[0],P[0])\nW: w2: 处理 Location(D[1],P[1])\nW: n1: 备注 Type[N] Attach(#w1)`
  因：N/DATA 插在主流声明序列中间会被默认顺序流串入主流并报错（AUD-119）；应把所有修饰类节点写在主流之后。
- 错：`w1 → #w5 [超时]`
  对：`（显式边写标签不被支持）改用分支行：`超时 → #w5``
  因：spec §7.2 曾承诺显式边标签，实测报错「显式边目标 w5 [超时] 未定义」（AUD-117）。连线文字请走分支行。
- 错：`  是 →\n  否 → #w3`
  对：`  是 → #w2\n  否 → #w3`
  因：分支目标不可省略——省略会被静默丢弃、不产生任何边（AUD-118）。
- 错：````dsl\nTitle: xxx\n````
  对：`Title: xxx`
  因：禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。
- 错：`{"Title": "xxx"}`
  对：`Title: xxx`
  因：`dsl` 必须是纯文本字符串，不是 JSON 对象。
- 错：`这是根据您的需求生成的图表：\nTitle: xxx`
  对：`Title: xxx`
  因：禁止解释性前后缀。

---

## 3. 官方示例 (The Seed)

### 场景：采购申请审批（二维矩阵泳道）

```dsl
Title: 采购申请审批流程
Layout: H
Dict: D[信息中心,综合计划科,办公室]
Dict: P[申请阶段,审批阶段,执行阶段,归档阶段]
Dict: R[申请员,部门经理,财务岗]
Dict: worker[提交采购申请,填写申请单,金额超过5000?,部门经理审批,直接执行,财务付款,归档]
Lane from D[0,1,2] Layout H
Lane from P[0,1,2,3] Layout V
AxisX: 职能部门 Align C
AxisY: 推进阶段 Align C
Attr active [Role,SOP,Lv,Time]
W: w1: worker[0] Type[S] Location(D[0],P[0])
W: w2: worker[1] Location(D[0],P[0]) SOP(XX-CX-04) Role(R[0]) Lv(重要)
W: q1: worker[2] Type[?] Location(D[0],P[1])
   是 → #w4
   否 → #w5
   End
W: w4: worker[3] Location(D[1],P[1]) Role(R[1]) Time(24h)
W: w5: worker[4] Location(D[0],P[2])
W: w6: worker[5] Location(D[2],P[2]) Role(R[2])
W: w7: worker[6] Type[E] Location(D[1],P[3])
w4 → #w6
w5 → #w6
w6 → #w7
```

> 2 条 `Lane from` 构成行×列网格；`q1` 为排他网关，两个出口显式声明；`w4` 与 `w5` 为并列分支目标，各自显式连到 `w6`（**已修正旧版 w4 断链**）。

---

**权威性声明**：本切片由 `dsl/cards/flow.card.ts` 生成（卡片版本 0.8），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。