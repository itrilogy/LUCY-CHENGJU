# IQS-Flow DSL 规范（企业体系文件流程图）

> **状态**: 设计落盘 v1（语法完备，尚未实现）
> **版本**: 0.5.0
> **适用范围**: 新增 IQS-DSL v1 第 14 个 core kind —— `flow`
> **作者**: 洪光华 / 鹿溪联合创新实验室
> **落盘日期**: 2026-08-25

---

## 0. 背景与定位

信息中心日常管理 665 个体系文件，其中大量程序文件含"谁（泳道）× 做什么（活动）× 什么条件下走哪条路（网关）"的流程图需求。现有 13 个 core kind 中 **PDPC 与 arrow 是最相近的流程图形态**，但二者均**不支持泳道、无 BPMN 语义元素、无默认顺序流**，难以支撑体系文件的快速起草与全生命周期重构。

本规范定义第 14 个 core kind —— `flow`，一套**面向企业非技术员工、同时具备强机器可读性**的流程图 DSL。语义定界为 **BPMN 2.0 子集**，渲染**自研 SVG**（零新增第三方依赖）。

### 0.1 设计三原则

1. **默认顺序流**：同一泳道内按书写顺序自动连线，省去约 80% 的显式连线书写。
2. **泳道即节**：`Lane:` 开启一段，其下所有节点自动归属该泳道；泳道可声明语义轴。
3. **放宽 → 归一**：解析器将人写 DSL 归一为 **canonical JSON**，`#id` 全局强制保证可审计与机器可读。

### 0.2 产品分层（沿用治理）

| 层级 | 语言 | 用途 |
|:---|:---|:---|
| **CORE** | IQS-Flow DSL（本 spec） | 体系文件流程图、成果报告、可审计、机器可读 |
| **RELIEF** | Mermaid | 仅类型外制图；`flow` 已覆盖不可用 Mermaid 充当终稿 |

### 0.3 三层机器输出

| 输出 | 用途 |
|:---|:---|
| **canonical JSON** | 校验、图谱抽取、版本 diff、跨文档审计 |
| **BPMN 2.0 XML** | 可导入第三方 BPMN 专业工具交换 |
| **自研 SVG** | 渲染与终端展示 |

---

## 1. 语法概览（BNF 骨架）

```
flow          := shell* axisDecl* (lane | pool | subprocess)*
shell         := "Title:" text | "Layout:" layoutWord | 注释
axisDecl      := "axis:" ("D" "[" title "]" | "P" "[" title "]" | "R" "[" roles "]")
lane          := "Lane:[" name "," display? "," hv "," ord "]" (属性)* newline nodeOrBlock*
pool          := "Pool:" name newline (lane)*
nodeOrBlock   := nodeLine | branchBlock | subprocess
nodeLine      := id "[" mark "," label "]" coord? forDecl? (属性)*
coord         := "@[" name ("," name)? "]"
forDecl       := "for" "R" "[" index "]"
branchBlock   := gatewayLine branchLine* "End"
subprocess    := nodeLine "[" "SUB" ... "]" coord? newline nodeOrBlock* "End"
```

核心语法模型：**显式 id + 显式块 + 坐标标记 + 文档级轴**。`axis:D[标题]`/`axis:P[标题]` 声明横/纵坐标轴语义标题，`axis:R[岗位清单]` 声明岗位图例；每个节点 `id [标记, 标签] @[泳道name,…] [for R[i]]` 一行；分支块与子流程块用 **`End`** 显式闭合；泳道用 `Lane:[name, 显示名, H/V, 序号]` 坐标标记，`H`/`V` 决定行列轴。

---

## 2. 语义子集（BPMN 2.0 子集）

面向企业体系文件，仅保留以下**8 种节点 + 3 种连线 + 3 种修饰**（裁掉边界事件、补偿、多实例、消息/定时/信号事件；保留**子流程**以满足"程序文件互相引用"刚需）。

### 2.1 节点

| 元素 | 主标记 | 兼容别名 | BPMN 视觉 |
|:---|:---|:---|:---|
| 开始 | `[S]` | `start` `开始` `[*]` | ○ 细圆 |
| 结束 | `[E]` | `end` `结束` `[#]` | ● 粗圆 |
| 任务 | `[T]`（可省） | `[task]` `[任务]` | 圆角矩形 |
| 子流程 | `[SUB]` | `[@]` `subprocess` `子流程` | 圆角矩形＋ |
| 排他网关 | `[?]` | `[G]` `gateway` `判断` | ◇ 菱形 |
| 并行网关 | `[+]` | `[P]` `parallel` `并行` | ◇＋ |
| 文本标注 | `[N]` | `[note]` `[注]` | 折角纸 |
| 数据对象 | `[D]` | `[data]` `[数据]` | 纸带 |

**标记放置**：`id [<标记>, <标签>] @[name,…]`。任务标记可省略；`[SUB]`/`[?]` 等纯标记即 `[SUB, …]`/`[?, …]` 元组中省略标签的退化写法，语义等价。坐标 `@[...]` 见 §3.4。

### 2.2 连线

| 连线 | 视觉 | 用途 |
|:---|:---|:---|
| 序列流 | 实线箭头 | 主流程流转（隐式自动连 + 显式补充） |
| 消息流 | 虚线箭头 | 跨泳池传递（v0 预留） |
| 关联 | 点线 | 修饰物挂接节点 |

---

## 3. 泳道模型（坐标标记 × 矩阵布局 + 文档级轴语义）

### 3.1 泳道坐标标记（`Lane:[name, displayText, H/V, order]`）

每个泳道用**方括号四元组**声明，其 `name`（定位标记）是节点落格的唯一坐标锚：

```
Lane:[<name>, <显示文字>, <H|V>, <序号>]
```

| 位 | 含义 | 示例 |
|:---|:---|:---|:---|
| `name` | 唯一标识（Locator），供 `@[name,…]` 锚定 | `sales` |
| 显示文字 | 泳道/格子显示名（可省，默认取 name） | `营销部` |
| `H`/`V` | 排列方向：**H=横向泳道（行）** / **V=纵向泳道（列）** | `H` |
| 序号 | 同方向泳道中的排列序号（1 起） | `1` |

```dsl
Lane:[sales, 营销部, H, 1]     // 第1个横向泳道（行）
Lane:[step1, 预售, V, 1]       // 第1个纵向泳道（列）
Pool: 采购协同
Lane:[office, 综合办, H, 2]
```

> **`name` 即坐标**：`[sales, …, H, 1]` 表明"营销部"占 H 方向第 1 行；`[step1, …, V, 1]` 占 V 方向第 1 列。交叉格即行列交集。

### 3.2 文档级轴语义（axis:D / axis:P / axis:R）

axis **不再挂 Lane**，改为**文档级声明**，放在 `Title/Layout` 之后、`Lane:` 之前。它不决定行列（行列全由 H/V + 序号管），而是给矩阵坐标轴加**语义标题/图例**——类似图纸的坐标轴名与右下角图例栏：

```dsl
Title: 采购申请审批流程
Layout: H
axis:D[职能部门]                 // 横轴标题：作为 H 泳道集合的语义名
axis:P[推进阶段]                 // 纵轴标题：作为 V 泳道集合的语义名
axis:R[申请员, 部门经理, 财务岗, 仓管员]   // 岗位图例清单（索引 0 起）
```

| axis | 含义 | 作用 |
|:---|:---|:---|
| `axis:D[标题]` | 职能部门轴标注 | 给横轴（H 泳道集合）一个语义标题，渲染为坐标轴标签 |
| `axis:P[标题]` | 阶段轴标注 | 给纵轴（V 泳道集合）一个语义标题，渲染为坐标轴标签 |
| `axis:R[岗位,...]` | 岗位图例清单 | **索引表**（0 起）；节点用 `for R[i]` 引用，渲染为节点右下角岗位标注 + 图纸式图例栏 |

> **D/P/R 管理词汇映射**（语义注解，非渲染约束）：D=职能部门 / GF-CX 管业务；P=推进阶段 / BPA-BPM-BPI、PDCA；R=岗位 / GW 管人。这些语义由 axis 标题与岗位清单表达，不再与 H/V 行列绑定。

### 3.3 二维交叉矩阵布局

- **行轴** = 所有 `H` 泳道（`Lane:[…, H, 序]`），**列轴** = 所有 `V` 泳道（`Lane:[…, V, 序]`）。
- 只有 H 泳道 → 单维横泳道；只有 V → 单维竖泳道。
- 节点落在 `(H泳道, V泳道)` 交叉单元格。axis:D/P 的 `[标题]` 作为横/纵坐标轴标签。

### 3.4 坐标锚定与岗位标注（`@[...]` + `for R[i]`）

节点用 `@[<H泳道name>, <V泳道name>]` 锚定到交叉单元格；用 `for R[i]` 在**节点右下角**附加岗位说明（索引指向 `axis:R` 清单，0 起）：

```dsl
s1 [S, 处理预售] @[sales, step1] for R[0]    // 落"营销行×预售列"，右下角标注"申请员"
b1 [ , 审批]     @[mgr,  step2] for R[1] [Time 24h]   // 右下角标注"部门经理"
t2 [ , 返工]     @[qc,   check]             // 无 for，不标注岗位
```

表格：写法定（省略规则）

| 写法 | 锚定 |
|:---|:---|
| 节点写在某 H 泳道段内，省略 `@` | 行 = 该泳道，列 = 当前 V 泳道上下文 |
| 省略 `for R[i]` | 无岗位右下角标注 |
| 显式 `@[name1,name2]` | 完全按坐标，可跨行列放置 |
| `for R[i]` | 索引引用 `axis:R` 清单，寄出越界则报校验错 |

> `@[name]` 单参数 = 只锚一维；两参 = 交叉格。旧 `@P:step1` 写法保留兼容。`for R[i]` 是 `Role` 属性的语法糖（见 §5）。

---

## 4. 节点行语法

```
<id> [<标记>, <标签>] @[泳道name, …] [for R[i]] [<属性>]*
```

- **id 全局强制唯一**（字母/数字/下划线，如 `s1`、`b1`、`L1-check`）。
- **标记 + 标签**：按 §2.1，用 `[标记, 标签]` 一元组内置（任务可省略标记）。也可用旧式 `id [标记] 标签`。
- **坐标定位 `@[name1, name2]`**：锚到行列泳道交叉格（见 §3.4）；省略则继承当前泳道上下文。
- **岗位标注 `for R[i]`**：索引引用 `axis:R` 岗位清单（0 起），渲染为节点**右下角**岗位说明（见 §3.2 / §3.4）；等价于 `[Role …]` 属性，详见 §5。
- 属性：`[键 值]`，见 §5。多个属性依次排列。`for R[i]` 在属性之前优先解析。

**示例**
```dsl
s1 [S, 提交采购申请] @[sales, step1] for R[0] [Time 2h]
s2 [ , 填写申请单] @[sales, step1] for R[0]    // 无标记 → 任务
q1 [?, 金额超过5000?] @[sales, step2]         // 无 for，不标注
```

---

## 5. 节点业务属性（六属性规范化集）

| 属性键 | 含义 | 企业管理落点 | 常用度 |
|:---|:---|:---|:---:|
| `SOP` | **依据标准**（标准编号） | 绑定 GF/CX/GW，回溯依据 | ★★★ |
| `Role` | **责任人/授权** | 岗位/角色 | ★★★ |
| `Lv` | **管控级别/风险** | 重大/重要/一般（RAG） | ★★★ |
| `Time` | **时限/SLA** | 完成时限 | ★★ |
| `KPI` | **成效度量** | 质量目标 | ★★ |
| `M` | **管理成熟度** | BPM/BPI、数字化等级 | ★ |

> 封闭词表，扩展走 Spec 升版；值域见附录 A。

### 5.1 属性语法与继承

```dsl
Lane:[sales, 营销部, H, 1] [SOP XX-GF-03]   // 泳道级默认属性（四元组 + 属性）
s1 [S, 提交采购申请] @[sales, step1] [Time 2h]   // 节点级属性
f1 [D, 付款记录] @[finance, settle] [KPI 退款率≤1‰] [M 已数字化]  // [D] 数据对象标记
```

> **`[]` 区分**：`[标记, 标签]`（含逗号）= 节点类型区；`[键 值]`（空格）= 属性；`Lane:[name, text, H/V, 序]`（`Lane:` 前缀）= 泳道坐标标记。三者容器不同、首 token 区分。

**继承**：泳道属性扩展至其下所有节点，节点可覆盖。粒度：泳道 > 泳池 > 文档 > 默认。

**`for R[i]` 与 `Role` 的统一**：`for R[i]` 是 `[Role 岗位名]` 的**语法糖**——解析时从 `axis:R[岗位清单]` 取第 `i` 位，写入节点 `attrs.role`；同时把该岗位渲染到节点**右下角**标注。等价写法：

```dsl
s1 [S, 提交申请] @[sales,step1] for R[0]      // 语法糖 → role=申请员
s2 [S, 提交申请] @[sales,step1] [Role 申请员]  // 等价底层属性
```

> 未声明 `axis:R` 时 `for R[i]` 视为错误；`[Role 岗位名]` 则不依赖清单，直接赋岗位名。二者共存时以节点级为准。

### 5.2 canonical 属性键约定

canonical JSON 属性键统一改**小写驼峰**（避免 `SOP` 大写 vs `role` 小写错位）：

| DSL 键 | canonical 键 | 值 |
|:---|:---|:---|
| `SOP` | `sop` | 标准编号 |
| `Role` / `for R[i]` | `role` | 岗位名（`for R[i]` 由 `axis:R` 清单解析） |
| `Lv` | `level` | `major`/`important`/`common` |
| `Time` | `time` | SLA 时限 |
| `KPI` | `kpi` | 指标 |
| `M` | `maturity` | 成熟度档 |

**图谱抽取价值**：`sop` 用于"流程 → 依据文件(GF/CX) → 责任人(role)"三层追溯，与体系文件 `[[wiki-link]]` 双链联动。

---

## 6. 分支块（网关出口，显式 `End` 闭合）

排他/并行网关的出口以**分支块**表达，用 **`End`** 显式结束（不依赖缩进）。

### 6.1 语法

```
<网关卡id> [?] 标签
  <标签> <(出口标记)> [<条件>] → <目标>
  ...
End
```

| 部分 | 语法 | 说明 |
|:---|:---|:---|
| 分支标签 | `是` `否` `通过`… | 连线标签 |
| 出口标记 | `(pass)` | 可选命名，边 id 稳定；缺省自动编号 |
| 条件 | `[金额>5000]` | 可选，输出 `condition` |
| 目标 | `→ #b1` | **强制 `#id`**；多目标 `→ #w2, #w4`（自动拆并行边） |
| 结束 | `End` | **必需**，闭合分支块 |

**四档弹性**：
① 命名出口 `合格 (pass) → #w1`
② 带条件　`返工 (rework) [缺陷≤3] → #q3`
③ 默认出口 `否则 → #w3`
④ 多目标　`报废 → #w2, #w4`

**合并收敛**：多条分支指向同一节点 = 隐式合并，无需额外语法。

### 6.2 示例

```dsl
q2 [?, 检验结果?] @[qc, check]
  合格 (pass) → #w1
  返工 (rework) [缺陷≤3] → #q3
  否则 → #w3
  报废 → #w2, #w4
End
```

> 分支块**必须**紧跟网关节点之后；`End` 后继续平级节点。分支块与 `End` 同属节点流，不充当节点 id。网关节点可用 `@[...]` 显式锚格；分支出口不重复标坐标（分支连线跟随网关格）。

---

## 7. 子流程（内嵌子图，显式 `End` 闭合）

子流程是块级容器，内部可再含节点与分支块。**支持一层嵌套**。

### 7.1 语法

```
<id> [SUB, <标签>] @[name1, name2]   // 容器节点可带坐标（见 §3.4），内部节点坐标相对容器
  <子流程内节点/分支块>
End
```

### 7.2 示例

```dsl
a2 [SUB, 按《合同评审程序》执行] @[purchase, review]
  c1 [S, 初审]                        // 内部节点，坐标继承容器
  c2 [?, 合规?]
    是 → #c3
    否 → #s2
  End
  c3 [E, 盖章]
End
```

> `[SUB, 标签]` 后是其内部节点；内部 `End` 结束内层分支块，外层 `End` 结束子流程容器。**子流程内节点 id 全局唯一**（不得与外层重复）。内部节点缺省继承容器格，也可显式 `@[...]` 覆盖（仍在容器边界内）。

---

## 8. 完整示例

### 8.1 二维矩阵 + 分支 + 属性（典型 CX 程序文件）

```dsl
Title: 采购申请审批流程
Layout: H
axis:D[职能部门]                       // 横轴标题
axis:P[推进阶段]                       // 纵轴标题
axis:R[申请员, 部门经理, 财务岗]        // 岗位图例清单（索引 0 起）
Pool: 采购协同

Lane:[step1, 申请阶段, V, 1]
Lane:[step2, 审批阶段, V, 2]
Lane:[step3, 结算阶段, V, 3]

Lane:[sales, 申请人, H, 1] [SOP XX-GF-03]
  s1 [S, 提交采购申请] @[sales, step1] for R[0] [Time 2h]
  s2 [ , 填写申请单] @[sales, step1] for R[0] [Lv 一般]
  s3 [?, 金额超过5000?] @[sales, step1]
    是 → #b1
    否 → #s4
  End
  s4 [ , 直接执行] @[sales, step1] for R[0]
  s5 [E, 归档] @[sales, step3] for R[0]

Lane:[mgr, 部门经理, H, 2]
  b1 [ , 审批] @[mgr, step2] for R[1] [Lv 重要] [Time 24h]
  b2 [?, 是否通过?] @[mgr, step2]
    是 → #f1
    否 → #b3
  End
  b3 [ , 退回修改] @[mgr, step2] for R[1]
  b3 → #s2

Lane:[finance, 财务, H, 3]
  f1 [ , 付款] @[finance, step3] for R[2] [KPI 退款率≤1‰] [M 已数字化]
  f2 [E, 完成] @[finance, step3] for R[2]
```

### 8.2 纵泳道 + 多出口 + 子流程

```dsl
Title: 合同评审
Layout: V
axis:D[经办部门]
axis:P[评审节点]
axis:R[采购员, 法务专员, 质检员, 仓管员]
Lane:[review, 评审阶段, V, 1]
Lane:[sign, 会签阶段, V, 2]

Lane:[purchase, 采购, H, 1]
  a1 [S, 提交合同] @[purchase, review] for R[0]
  a2 [SUB, 按《合同评审程序》执行] @[purchase, review]
    c1 [S, 初审] for R[0]
    c2 [?, 合规?]
      是 → #c3
      否 → #a4
    End
    c3 [E, 盖章] for R[0]
  End
  a3 [ , 归档] @[purchase, sign] for R[0]
  a4 [E, 驳回] @[purchase, review]

Lane:[legal, 法务, H, 2]
  l1 [ , 法律审查] @[legal, review] for R[1]

Lane:[qc, 质检, H, 3]
  q1 [S, 来料检验] @[qc, review] for R[2]
  q2 [?, 检验结果?] @[qc, review]
    合格 (pass) → #w1
    返工 (rework) [缺陷≤3] → #q3
    否则 → #w3
    报废 → #w2, #w4
  End
  q3 [ , 返工处理] @[qc, review] for R[2]
  q3 → #q1

Lane:[warehouse, 仓库, H, 4]
  w1 [ , 入库] @[warehouse, sign] for R[3]
  w4 [ , 报废登记] @[warehouse, sign]

Lane:[purchase2, 采购供应商, H, 5]
  w2 [ , 联系供应商换货] @[purchase2, review]
  w3 [ , 让步接收] @[purchase2, review]
```

---

## 9. canonical JSON

```json
{
  "kind": "flow",
  "version": "0.5.0",
  "title": "采购申请审批流程",
  "layout": "horizontal",
  "axes": [
    {"type": "D", "title": "职能部门", "axis": "H"},
    {"type": "P", "title": "推进阶段", "axis": "V"},
    {"type": "R", "roles": ["申请员", "部门经理", "财务岗"]}
  ],
  "pools": [{"id": "P1", "name": "采购协同"}],
  "lanes": [
    {"name": "step1", "displayName": "申请阶段", "hv": "V", "order": 1, "pool": "P1"},
    {"name": "sales", "displayName": "申请人", "hv": "H", "order": 1,
     "pool": "P1", "defaults": {"sop": "XX-GF-03"}}
  ],
  "nodes": [
    {"id": "s1", "type": "start", "label": "提交采购申请",
     "cell": ["sales", "step1"], "attrs": {"time": "2h", "role": "申请员"}},
    {"id": "s3", "type": "exclusiveGateway", "label": "金额超过5000?",
     "cell": ["sales", "step1"], "attrs": null}
  ],
  "edges": [
    {"id": "pass", "from": "q2", "to": "w1", "type": "sequence", "label": "合格",
     "condition": null, "default": false},
    {"id": "rework", "from": "q2", "to": "q3", "type": "sequence", "label": "返工",
     "condition": "缺陷≤3", "default": false},
    {"id": "q2-D", "from": "q2", "to": "w3", "type": "sequence", "label": "否则",
     "condition": null, "default": true},
    {"id": "q2-4a", "from": "q2", "to": "w2", "type": "sequence", "label": "报废", "condition": null, "default": false},
    {"id": "q2-4b", "from": "q2", "to": "w4", "type": "sequence", "label": "报废", "condition": null, "default": false}
  ],
  "artifact": [
    {"id": "n1", "type": "annotation", "label": "依据《XX制度》", "attach": "s2"}
  ],
  "subProcesses": [
    {"id": "a2", "cell": ["purchase", "review"], "nodes": ["c1", "c2", "c3"]}
  ]
}
```

**坐标落格**：`axes` 是文档级轴声明——`D[职能标题]`/`P[阶段标题]` 作横/纵坐标轴标签，`R[岗位清单]` 供 `for R[i]` 索引用。节点用 `cell: [<H泳道name>, <V泳道name>]` 表达交叉格；泳道 `hv`+`order` 决定行列序。

> **图例落格与岗位标注**：渲染器先按全部泳道 `hv`+`order` 建二维网格，再把每个节点按 `cell` 放入交叉格；`for R[i]`（或 `role` 属性）渲染为节点**右下角岗位标注**，`axes` 的 `R[清单]` 作为**图纸式图例栏**列在右下角。跨泳道/跨阶段动作用 `→ #id` 引到目标格，不复制节点。

**边 id 规则**：显式 `(out)` 用该名；缺省自动编号 `<源id>-<出口序>`（`q2-N`）或 `<源id>-<档位><序>`（多目标 `q2-4a`）。

---

## 10. 内置校验

| 校验项 | 规则 |
|:---|:---|
| 开始点 | 全局仅一个 `start`；结束至少一个 `end` |
| 节点 id | 全局唯一；`#id` 引用必须存在 |
| **泳道 name** | 全局唯一；`@[...]` 引用的泳道 name 必须已定义 |
| **axis 声明** | axis ∈ {D,P,R}；`D`/`P` 各至多一个带标题，`R` 为岗位清单 |
| **for R[i] 索引** | `for R[i]` 的 `i` 必须在 `axis:R[清单]` 长度内；未声明 `axis:R` 时禁用 |
| **坐标锚定** | `@[name]`/`@[name1,name2]` 两参数必须分别命中 H/V 泳道；仅单维时允许单参 |
| 块闭合 | 每个分支块/子流程块必须有配对的 `End`，不交叉嵌套 |
| 网关出入度 | 排他/并行：1 入 ≥1 出；默认出口仅一个 |
| 孤立节点 | 无孤立（除开始/结束） |
| 分支合法性 | 分支行仅能出现在网关之后的分支块内 |
| 属性合法性 | 属性键 ∈ 规范化集；值 ∈ 值域（附录 A）；未知键报错并建议 |
| 子图边界 | 子流程内嵌一层，不递归穿越 |

校验失败返回短错误 + 骨架回执（沿用治理 §4）。

---

## 11. 落地路径

按现有 IQS 治理新增 core kind 标准流程：

1. **注册**：`dsl/kinds.json` 新增 `flow`（`tier: core`、`family: iqs_native`、`body: FlowGraph`、`mcpName: render_flow`、colorSlots）。
2. **组件**：`components/FlowEditor.tsx`（宽松解析 → canonical）+ `components/FlowDiagram.tsx`（**自研 SVG**：矩阵泳道网格 + 正交连线 + 块内步进布局）。
3. **协议切片**：`protocol/segments/flow.md`（Soul / Grammar / Seed）。
4. **MCP**：发布 `render_flow`。
5. **校验集成**：解析器 + validator + `npm run validate:dsl`。
6. **文档闭环**：本 SPEC 升版 1.0 并登记进 `protocol/DSL_V1.md` 权威链。

**变更流程**：改语法 → 升 Spec 版本 → 改 `kinds.json` → 改 `FlowEditor` 解析器 → 改 MCP example → `npm run validate:dsl`。

---

## 12. 与现有 kind 的关系

| 既有 kind | 与本 flow 的关系 |
|:---|:---|
| `pdpc`（过程决策程序图） | PDPC 面向**风险对策推演**，flow 面向**岗位×活动流程**。互补不替代。 |
| `arrow`（箭头/因果链） | arrow 单向因果链无泳道无网关；flow 完整流程建模。互补不重叠。 |
| `mermaid`（救济） | flow 已覆盖时禁止用 Mermaid flowchart 充当成果终稿（治理红线 2/3）。 |

---

## 附录 A：属性值域（规范化封闭集）

| 键 | canonical 键 | 值域 | 说明 |
|:---|:---|:---|:---|
| `SOP` | `sop` | `<部门码>-<类型码>-<序号>`（如 `XX-CX-04`） | 标准编号 |
| `Role` | `role` | 岗位/角色名（建议对照 GW 手册） | 与人岗体系对应 |
| `Lv` | `level` | `重大`/`重要`/`一般`（或 `1`/`2`/`3`） | RAG：重大=红/重要=黄/一般=绿 |
| `Time` | `time` | `24h`/`1d`/`3w`… | SLA 时限（h/d/w/m 后缀） |
| `KPI` | `kpi` | 指标名+量值+单位 | 质量目标 |
| `M` | `maturity` | `手工`/`已数字化`/`可监控`/`已优化` | BPM/BPI 成熟度 |

---

*备案：鹿溪联合创新实验室 · 澄矩 ChengJu · 2026-08-25*
