# relation (交叉分析/关联图) 协议切片

## 1. 专家灵魂 (The Soul)

### 关联图 (Relationship Diagram)

关联图把问题及其各种因素之间的复杂因果关系用箭头连成网状。适用于因素交织、互为因果的场景 —— 这正是鱼骨图的层级结构无法表达的部分。

#### 核心推演逻辑

- **多症结支持**：识别系统中并列或递进的多个问题症结 (Sink)，它们作为最终的**结果点**呈现在图中。
- **禁止自引用**：严禁 `Rel: A -> A`。
- **交叉网状**：鼓励跨分支连接 —— 因素间的交叉影响正是关联图相对鱼骨图的价值所在。

#### 角色识别（由引擎按出入度自动推断，无需显式标注）

- **主要症结 (Root/Sink)**：只有入边、没有出边 → 渲染为**矩形**。
- **末端根因 (End/Source)**：只有出边、没有入边 → 渲染为**椭圆**。
- **中间因素 (Middle)**：既有入边也有出边 → 渲染为**椭圆**。

> [!IMPORTANT]
> **出入度分析**：入度极高 = 核心矛盾的汇聚点；出度极高 = 问题的根源所在。先解决高**出度**的末端根因，通常能同时松动多个症结。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — relation (Graph)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表主标题 形如 `<文本>` **必填** | `Title: 2024年三季度质量波动分析` |
| `Layout:` | 布局模式（Directional / Centralized / Free） | `Layout: Free` |
| `Color[Root | RootText | Middle | MiddleText | End | EndText | Line]` | #HEX 颜色：症结底 / 症结字 / 中间因素底 / 中间因素字 / 末端根因底 / 末端根因字 / 连线 | `Color[Root]: #CF3A2B` |
| `Node:` | 节点定义（ID, 标签） 形如 `<ID>, <标签>` **必填** | `Node: m1, 需求频繁变更` |
| `Rel:` | 关系（有向边）定义 形如 `<源ID> -> <目标ID>` **必填** | `Rel: m1 -> root1` |

### 边界说明

- **`Layout`**：`Directional` = 有向分层（因果方向感最强）；`Centralized` = 中心辐射（围绕单一核心症结）；`Free` = 自由力导向（因素多、交叉多时最易读）。注意是**全称**，与 flow 的 `H`/`V` 不同。
- **`Node`**：**节点类型不需显式标注** —— 引擎按拓扑（出入度）自动推断 Root / Middle / End 并赋予对应形状与颜色。标签内如需冒号请用全角「：」。
- **`Rel`**：① 箭头为**半角** `->`（与 flow 的全角 `→` 不同）；② 两端 ID **必须**已由 `Node:` 定义，否则产生悬空边；③ 源与目标不得相同；④ 同一对节点可有多条不同方向的边（互为因果），但不鼓励。

### 反例（错 → 对）

- 错：`Rel: m1 -> root\n（而未定义 Node: root）`
  对：`Node: root1, 症结A：交付延期\nRel: m1 -> root1`
  因：`Rel:` 引用的 ID 必须先由 `Node:` 定义。**注意**：`protocol/segments/relation.md` 旧示例恰好犯了这个错误（引用未定义的 `root`，产生悬空边）—— 本卡的真源示例已修正。
- 错：`Rel: m1 -> m1`
  对：`（删除该自环，或改为两个不同节点）`
  因：禁止自引用；自环不表达任何因果关系。
- 错：`Node: root1, 症结A   （并期望它渲染成矩形）`
  对：`让 root1 只有入边、没有出边 —— 引擎会自动把它识别为 Sink 并渲染为矩形`
  因：节点角色由**拓扑**决定，不能通过命名或声明指定；若 root1 也有出边，它会被判为 Middle（椭圆）。
- 错：`Rel: a -> b   （全角箭头 →）`
  对：`Rel: a -> b   （半角 ->）`
  因：relation 的箭头是半角 `->`；全角 `→` 是 flow 的显式边写法。
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

### 场景：多症结系统问题关联分析

```dsl
Title: 多症结系统问题关联分析
Layout: Free

Color[Root]: #CF3A2B
Color[RootText]: #ffffff
Color[Middle]: #F1C40F
Color[MiddleText]: #ffffff
Color[End]: #fbbf24
Color[EndText]: #92400e
Color[Line]: #a1a1aa

// 节点定义（ID, 标签）——所有被 Rel 引用的 ID 都必须在此定义
Node: root1, 症结A：项目交付延期
Node: root2, 症结B：团队士气低落
Node: root3, 症结C：客户投诉增加
Node: m1, 需求频繁变更
Node: m2, 跨部门沟通不畅
Node: m3, 核心人员流失
Node: m4, 技术债务累积
Node: m5, 质量监控缺失
Node: e1, 客户决策链过长
Node: e2, 缺乏统一协作平台
Node: e3, 薪酬竞争力不足
Node: e4, 代码评审流程形同虚设
Node: e5, 自动化测试覆盖率低
Node: e6, 市场竞品压力传导
Node: e7, 历史遗留系统架构
Node: e8, 培训体系不完善

// 关系定义：源 -> 目标（类型由引擎按拓扑自动推断）
Rel: m1 -> root1
Rel: m2 -> root1
Rel: m4 -> root1
Rel: m3 -> root2
Rel: m2 -> root2
Rel: m5 -> root3
Rel: m1 -> root3
Rel: root1 -> root2
Rel: root1 -> root3
Rel: e1 -> m1
Rel: e6 -> m1
Rel: e2 -> m2
Rel: e8 -> m2
Rel: e3 -> m3
Rel: e7 -> m4
Rel: e4 -> m5
Rel: e5 -> m5
Rel: e8 -> m3
```

> 16 个节点 / 18 条关系；3 个症结（root1–3）、5 个中间因素、8 个末端根因。

---

**权威性声明**：本切片由 `dsl/cards/relation.card.ts` 生成（卡片版本 1.1），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。