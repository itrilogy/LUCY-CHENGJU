# pdpc (风险预研/PDPC图) 协议切片

## 1. 专家灵魂 (The Soul)

### 过程决策程序图 (Process Decision Program Chart)

PDPC 法是在制定计划阶段，对预期可能出现的问题预先设计好各种对策的方法。它把每条「正常路径」与「异常路径」都画出来，从而在纸面上完成风险演练。

#### 核心逻辑

- **目标设定**：明确计划的起点与理想终点。
- **路径推演**：识别所需的各个步骤 (Step)。
- **风险识别**：预测可能导致中断的异常情况，用 `[NG]` 标记。
- **对策制定**：针对每个 `NG` 预设补救措施 (Countermeasure)，并连回主线。

> [!IMPORTANT]
> PDPC 的价值在于「思维的深度」而非图的厚度。重点标注那些**可能导致毁灭性失败**的关键环节，并为其配置 `[NG]` 与对策。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — pdpc (ProcessGraph)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 形如 `<文本>` **必填** | `Title: 应急预案` |
| `Layout:` | 布局方向（Directional / Standard） | `Layout: Directional` |
| `Color[Start | Step | Countermeasure | End | Line]` | #HEX 颜色：起点 / 步骤 / 对策 / 终点 / 连线 | `Color[Countermeasure]: #ECFDF5` |
| `Color[StartText | StepText | CountermeasureText | EndText]` | #HEX 各类型节点的**文字**颜色 | `Color[StepText]: #1D4ED8` |
| `Line[Width]` | 连线像素粗细 | `Line[Width]: 2` |
| `Group:` | 分组（阶段）定义 形如 `<ID>, <标签>[, <父组ID>]` | `Group: g1, 异常发现` |
| `EndGroup:` | 分组结束 形如 `EndGroup` | `EndGroup` |
| `Item:` | 数据项（步骤/对策/起终点） 形如 `<ID>, <标签>[, [<类型>]]` **必填** | `Item: n5, 灭火系统失效, [countermeasure]` |
| `逻辑链条:` | 用 `--` 连接两个节点 ID 形如 `<id1>--<id2> [OK\|NG]` **必填** | `n4--n5 [NG]` |

### 边界说明

- **`Layout`**：注意是**全称**（`Directional` / `Standard`），与 flow 的 `H` / `V` 写法不同。
- **`Group`**：与 `EndGroup` 成对；组内 `Item:` 建议缩进两格（仅视觉，不参与解析）。
- **`Item`**：① 类型取值 `start` / `step`（缺省）/ `countermeasure` / `end`，写在**方括号**内；② ⚠️ 与**亲和图**的 `Item:` 同名异义 —— 亲和图的第三参是 `ParentID`（树父节点），此处是节点类型；③ 贴在组外也可以（如全局终点）。
- **`逻辑链条`**：三种形态：① 普通 `a--b`；② 带标记 `a--b [OK]` 或 `a--b [NG]`；③ **链式直写** `a--b--c--d [OK]`（一次声明整条链，标记作用于全链）。`[NG]` 表示该环节出现异常，应连向对策节点；`[OK]` 表示顺利通过。

### 反例（错 → 对）

- 错：`Group: g1, 异常发现\n  Item: n1, 烟雾报警器触发, start`
  对：`Group: g1, 异常发现\n  Item: n1, 烟雾报警器触发, [start]`
  因：节点类型**必须写在方括号内**（`[start]`）；裸写 `start` 会被当作标签的一部分。
- 错：`Group: g1, 异常发现\n  Item: n1, 报警\n  （缺 EndGroup）`
  对：`Group: g1, 异常发现\n  Item: n1, 报警\nEndGroup`
  因：每个 `Group:` 都必须由 `EndGroup` 闭合，否则后续 `Item:` 的归属不确定。
- 错：`Item: g1, 异常发现, root   （把 Group 写成 Item 并用 parentId 关联）`
  对：`Group: g1, 异常发现\n  Item: n1, 报警, [start]`
  因：PDPC 用 `Group:` / `EndGroup` 表达阶段；`Item:` 的第三参是**节点类型**（方括号），不是父节点 ID（那是亲和图）。
- 错：`a--b [NG]   （但 b 是普通 step，无对策承接）`
  对：`a--b [NG]\nb--c [OK]      （c 为 countermeasure）`
  因：`[NG]` 必须引出对策或明确的异常处置路径，否则只标记了风险而没给答案。
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

### 场景：实验室火灾应急 PDPC 演练

```dsl
Title: 实验室火灾应急 PDPC 演练
Layout: Directional

Color[Start]: #DBEAFE
Color[Step]: #EFF6FF
Color[Countermeasure]: #ECFDF5
Color[End]: #FEF2F2
Color[StartText]: #1E40AF
Color[StepText]: #1D4ED8
Color[CountermeasureText]: #047857
Color[EndText]: #B91C1C
Color[Line]: #64748B
Line[Width]: 2

// 阶段 1：发现
Group: g1, 异常发现
  Item: n1, 烟雾报警器触发, [start]
  Item: n2, 确认火情真实性
EndGroup

// 阶段 2：处置
Group: g2, 应急处置
  Item: n3, 拨打 119 报警
  Item: n4, 启动自动灭火系统
  Item: n5, 灭火系统失效, [countermeasure]
  Item: n6, 使用手持灭火器补救, [countermeasure]
EndGroup

// 阶段 3：疏散
Group: g3, 人员疏散
  Item: n7, 全员依序撤离
  Item: n8, 清点人数, [end]
EndGroup

// 逻辑链条：id1--id2 [OK|NG]
n1--n2
n2--n3 [OK]
n2--n4 [OK]
n4--n7 [OK]
n4--n5 [NG]
n5--n6
n6--n7 [OK]
n7--n8
```

> 3 个阶段组，8 个节点；`n4--n5 [NG]` 引出「灭火系统失效」对策链后回到主线。

---

**权威性声明**：本切片由 `dsl/cards/pdpc.card.ts` 生成（卡片版本 1.1），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。