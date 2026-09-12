# mermaid_master (Mermaid 渲染引擎总纲) 协议切片

## 1. 专家灵魂 (The Soul)

### 救济层定位（最重要的前提）

Mermaid 覆盖「逻辑流转 / 时序交互 / 结构建模 / 计划追踪 / 多维认知」五类。它**只能用于标准 QC 工具无法表达的场景** —— 凡是能映射到 CORE（控制图、排列图、直方图、鱼骨图、关联图、矢线图、矩阵图、PDPC、亲和图、基础统计图、散点图、雷达图、图矩阵、流程图）的，**必须**用 CORE。

> [!IMPORTANT]
> 体系文件 / 部门泳道 / BPMN 子集终稿**必须**用 `render_flow`（IQS-Flow DSL），禁止用 Mermaid 的 `flowchart` / `graph` 冒充。

#### 五类用途

- **逻辑流转类**：业务流转、决策树、闭环逻辑（flowchart、stateDiagram-v2）。
- **时序交互类**：组件协作、调用链、消息传递（sequenceDiagram）。
- **结构建模类**：系统架构、数据模型、组织关系（erDiagram、classDiagram、architecture、block-beta）。
- **计划与追踪类**：时间维度、进度管理、任务分配（gantt、kanban、timeline）。
- **多维认知类**：发散思维、体验感知、比例展示（mindmap、journey、pie、quadrantChart、xychart-beta、packet-beta、requirementDiagram、sankey-beta、gitGraph）。

#### 公共输出规则（全 sub_type 适用）

- **纯净 DSL**：直接输出 Mermaid 原生指令，**不要** `Spec:` 外壳，**不要**包在 `{}` 里，**不要** Markdown 围栏。
- **符号冲突防御**：中文描述里必须用**中文全角标点**（，、；：）。**禁止**在未加引号的文本中出现的半角逗号 `,` 或分号 `;` —— 它们会被解析器当作语法分隔符。
- **复杂内容包裹**：含空格、特殊符号或多行的节点文字，必须用 `["内容"]`（矩形）、`("内容")`（圆角）等显式包裹。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — mermaid_master (Foreign)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `初始化指令:` | 渲染前的主题/外观配置（可选，置于首行） 形如 `%%{init: {…}}%%` | `%%{init: {"theme": "neutral", "look": "handDrawn"}}%%` |
| `图类型声明:` | 每个 sub_type 的第一行关键字（graph / flowchart / sequenceDiagram / classDiagram / stateDiagram-v2 / erDiagram / journey / gantt / pie / quadrantChart / requirementDiagram / gitGraph / mindmap / timeline / kanban / block-beta / packet-beta / architecture-beta / sankey-beta / xychart-beta） **必填** | `graph TD` |
| `节点包裹:` | 含空格 / 特殊符号 / 多行 的节点文字必须显式包裹 形如 `A["内容"] / A("内容") / A{"内容"}` | `A["提交申请（含附件）"]` |
| `注释:` | Mermaid 自身用 `%%` 作行注释 形如 `%% <注释>` | `%% 审批主路径` |

### 边界说明

- **`图类型声明`**：完整的 sub_type 列表；每个的细节见同目录的 `<slug>.card.ts`。
- **`节点包裹`**：矩形 `[]`、圆角 `()`、菱形 `{}`、圆 `(())`。不包裹时含半角标点的文字会被截断。
- **`注释`**：⚠️ 与 IQS-DSL 的 `//` 不同 —— 本族使用 Mermaid 原生注释语法。

### 反例（错 → 对）

- 错：`（用 flowchart TD 画部门审批泳道图作为体系文件终稿）`
  对：`Title: 采购申请审批流程\nLayout: H\nDict: D[…\nLane from D[0,1] Layout H\nW: w1: 提交申请 Type[S] Location(D[0])`
  因：体系文件 / 部门泳道 / BPMN 子集终稿必须用 IQS-Flow（`render_flow`）。
- 错：`A[提交申请, 含附件]`
  对：`A["提交申请（含附件）"]`
  因：未包裹的半角逗号会被当作节点语法分隔符；中文内容请用全角标点并显式包裹。
- 错：`Title: xxx\ngraph TD\nA --> B`
  对：`graph TD\nA --> B`
  因：Mermaid 不使用 `Title:` 外壳 —— 直接输出原生指令。
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

### 场景：graph TD（逻辑流转类代表）

```dsl
%%{init: {"theme": "neutral", "look": "handDrawn"}}%%
graph TD
    A[提交申请] --> B{经理审批}
    B -- "通过" --> C[财务放款]
    B -- "驳回" --> D[退回修改]
    D --> A
    C --> E[流程结束]
```

> 仅作本族的语法形态示意；具体 sub_type 请读对应卡片。禁止用本 sub_type 冒充体系文件泳道图。

---

**权威性声明**：本切片由 `dsl/cards/mermaid_master.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。