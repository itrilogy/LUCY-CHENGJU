# Flow (企业流程图 / BPMN 子集) 协议切片

## 1. 专家灵魂 (The Soul)

### 面向企业体系文件的泳道流程图
Flow 图定义"**谁（泳道）× 做什么（活动）× 什么条件下走哪条路（网关）**"，是程序文件（CX）与流程构建的标准形态。语义定界为 **BPMN 2.0 子集**：保留开始/结束/任务/子流程/排他与并行网关/标注/数据对象，裁掉边界事件、补偿、多实例等体系文件中不用的元素。

#### 字典-索引范式（核心）
- **数据层（Dict）**：所有可变内容（部门/阶段/岗位/动作/属性值）集中成数组；`D`（部门）`P`（阶段）`R`（岗位）为**保留字**，其余自定义。
- **结构层**：只写**索引引用**（`D[0]`、`worker[2]`），渲染时展开为字典值（图上显示"信息中心"而非 `D[0]`）。一处定义、多处引用、修改全局生效。

> [!IMPORTANT]
> 网格**只按 `Lane from` 的定义产生**；节点坐标的多余维度**自动清洗**；图上必须显示字典展开值。

### 专家建议
- **默认顺序流**：W 节点按声明顺序自动连；判断/并行节点不出自动序，其出口必须显式分支行声明。
- **岗位图例**：从节点实际 `Role` 属性值去重提取，按出现次数定字体粗细（非渲染 R 数组本身）。
- **属性边栏**：`Attr active` 激活后从全部节点提取聚合视图（Role/SOP 计数、Lv 区间评分、Time 最小时长、KPI 清单、M 色卡）。

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 | `Title: 采购审批流程` |
| `Layout:` | 方向 (`H` / `V`) | `Layout: H` |
| `Color[Slot]:` | 节点样式色 | `Color[Start]: #2563eb` |

### 数据层（字典）
| 语法 | 说明 |
| :--- | :--- |
| `Dict: D[部门,...]` | 部门字典（保留字 D），索引 0 起 |
| `Dict: P[阶段,...]` | 阶段字典（保留字 P） |
| `Dict: R[岗位,...]` | 岗位字典（保留字 R） |
| `Dict: <自定义>[值,...]` | 自定义字典（动作/属性值） |

索引引用形式：`D[0]`（单索引）、`D[0,1,3]`（列表，Lane 批量用）、`D[*]`（全部）。

### 结构层
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Lane from <字典>[索引] Layout H\|V` | 批量画泳道（H=行,V=列） | `Lane from D[0,1,2] Layout H` |
| `AxisX: <标题> Align L\|R\|C` | 横轴标题 | `AxisX: 职能部门 Align C` |
| `AxisY: <标题> Align L\|R\|C` | 纵轴标题（文字纵向） | `AxisY: 推进阶段 Align C` |
| `Axis: <整图> AxisX\|AxisY [Align]` | 整图标题 | `Axis: 采购审批 AxisX` |
| `Attr active [<键>,...]` | 属性边栏提取（缺省=全部） | `Attr active [Role,SOP,Lv]` |

### 节点
```
W: [<id>:] <标签> [Type[<类型>]] [Location(<坐标>)] [<属性>(<值>)]*
```
- `标签`：字典引用（`worker[0]`）或字面量（`提交申请`），二选一。
- `id` 可选（省略自动 `w1,w2,...`），用于 `#引用`。
- `Location(D[0],P[1])`：锚到行列交叉格；多余维度自动清洗。
- 类型（Type）：`S`开始 `E`结束 `T`任务(缺省) `?`排他网关 `+`并行网关 `SUB`子流程 `N`标注 `DATA`数据对象。

### 分支块（判断/并行出口）
```
W: q1: worker[2] Type[?] Location(D[0],P[1])
   是 → #w4
   否 → #w5
   End
```
- 分支行：`<标签> [(<出口名>)] [<条件>] → #目标[, #目标]*`；多目标自动拆并行边。
- `否则 → #w5` 为默认出口；多分支指向同节点=隐式合并。
- `End` 显式闭合分支块/子流程块。

### 显式边
```
<源id> → #<目标id> [<标签>]
```

### 子流程块
```
W: a: worker[0] Type[SUB] Location(D[0],P[0])
   W: s1: worker[1] Type[S]
   W: s2: worker[2] Type[E]
   End
```

### 节点属性（六属性规范化集）
`SOP(标准编号)` / `Role(R[0] 或 岗位字面量)` / `Lv(重大|重要|一般|1|2|3)` / `Time(24h)` / `KPI(指标)` / `M(BPM|1|2|3|4)`。值可为字面量或字典引用。

## 3. 官方示例 (The Seed)

### 采购申请审批（二维矩阵泳道）
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
w5 → #w6
w6 → #w7
```

### 来料检验（单维纵泳道 + 子流程 + 多出口）
```dsl
Title: 来料检验
Layout: V
Dict: D[质检科,仓库,采购科]
Dict: R[检验员,仓管员,采购员]
Dict: worker[来料检验,检验结果?,合格入库,让步接收,不合格评审,复检,记录归档]
Lane from D[0,1,2] Layout V
W: w1: worker[0] Location(D[0]) Role(R[0])
W: q1: worker[1] Type[?] Location(D[0])
   合格 (pass) → #w2
   不合格 → #q2
   End
W: w2: worker[2] Type[E] Location(D[1])
W: q2: worker[4] Type[SUB] Location(D[0])
   W: s1: worker[5] Type[S]
   W: s2: worker[6] Type[E]
   End
W: w3: worker[6] Type[E] Location(D[2])
```

---
**权威性声明**: 本文档内容与 `components/flow/FlowParser.ts`、`FlowDiagram.tsx` 及 spec `docs/IQS_FLOW_DSL_SPEC.md` 保持同步。Riverside,
