# IQS-Flow 编译卡（给大模型 · 一次读完即可写对）

tier: core · body: FlowGraph · tool: `render_flow` · engine: svg  
**禁止** `render_mermaid_flowchart` / `flowchart TD` / `graph LR`。体系文件、部门泳道、审批、BPMN 子集终稿只用本工具。

排版（格子、走线、扩展格）由引擎完成。你只写语义：谁 × 做什么 × 走哪条路。不要手算像素坐标。

---

## 1. 最小 BNF

```
Title: <标题>
Layout: H | V
Dict: <名>[<值>,<值>,...]          # D=部门 P=阶段 R=岗位（保留字）；可自定义 worker
Lane from <名>[<索引>,...] Layout H|V
AxisX: <标题> Align L|R|C
AxisY: <标题> Align L|R|C
Axis: <整图标题> AxisX|AxisY
Attr active [Role,SOP,Lv,Time]
W: [<id>:] <标签> [Type[S|E|T|?|+|SUB|N|DATA]] [Location(<名>[i],...)] [属性] [Attach(#id)] [V|H|D]
   <分支标签> → #<id>
   否则 → #<id>
   End
<id> → #<id>
```

`#` 只用于节点引用（`#w1`），不作注释、不作标题层级。注释用 `//`。结构分隔用半角逗号；标签内用中文全角标点。

---

## 2. 非协商红线

1. **Dict 必须先定义**再被 Lane / W / Location / Role 引用。
2. **D / P / R 是保留字典名**（部门 / 阶段 / 岗位）。
3. **结构半角逗号，内容全角标点**。
4. 普通节点按声明序自动连；**Type[?] / Type[+] 禁止依赖自动出边**，必须写分支行。
5. 分支块与子流程块必须 **End** 闭合。
6. 开始、结束各至少 1 个（子流程内部 start 不计顶层）。
7. N/DATA 用 `Attach(#id)`，**不得作为流转目标**。
8. 输出 **纯文本 DSL**：禁止 Markdown 围栏、禁止 JSON、禁止 `flowchart TD`。

---

## 3. 节点类型

| Type | 含义 | 形状 |
|:---|:---|:---|
| S | 开始 | 细圆 |
| E | 结束 | 粗圆 |
| T 或缺省 | 任务 | 圆角矩形 |
| ? | 排他判断 | 菱形 |
| + | 并行 | 菱形＋ |
| SUB | 子流程 | 内嵌小图 |
| N | 标注 | 折角纸 |
| DATA | 数据对象 | 纸带 |

属性：`SOP()` `Role()` `Lv()` `Time()` `KPI()` `M()`。格内方位：`V` 下、`H` 右、`D` 对角右下。

---

## 4. 正例 A · 二维矩阵审批

```
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

## 5. 正例 B · 单维 + 子流程

```
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

## 6. 反例（错 → 对）

错：`flowchart TD` / `graph LR`  
对：本卡 BNF，调用 `render_flow`

错：`W: q1: 超限? Type[?]` 后无分支、无 End  
对：缩进 `是 → #w2` / `否则 → #w3` / `End`

错：先写 `Lane from D[0,1]` 再写 `Dict: D[...]`  
对：Dict 全部写在 Lane / W 之前

---

## 7. 输出控制

1. 对照红线自检后再 emit。
2. 只输出纯文本 DSL。
3. 调用 `render_flow`；二维矩阵建议 `height` 900–1200。
4. 若返回 `parser_errors`，按提示改，最多两轮。
