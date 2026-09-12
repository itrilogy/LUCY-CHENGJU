# iqs_native_master (原生组件总纲) 协议切片

## 1. 专家灵魂 (The Soul)

### 分层与选用

- **CORE（本层）**：`iqs_native` 的 14 个 kind —— 成果报告、专业 QC 图、可审计，**严格语言**。
- **RELIEF**：Mermaid / VChart —— 仅作类型外制图，**不得冒充** SPC / 排列图等终稿。
- **选用红线**：能映射标准 QC 工具 → 必须 CORE；仅当类型表外 → 才用 RELIEF。

#### 共同外壳

- **首行 `Title:`**（推荐必写）：承载图表主标题或待分析的问题。
- **样式指令**：`Color[Slot]: #RRGGBB` / `Font[Slot]: <px>` / `Show*: true|false` / `Decimals: <整数>`。
- 槽位名（`Slot`）因 kind 而异，取值见各 kind 卡片——**不要跨 kind 混用**。

#### 注释与 `#` 规则（最易误用）

- **行注释统一用 `//`**。
- **`#` / `##` / `###` 仅鱼骨图（fishbone，body = Tree）可用**，作层级结构。其余 13 个 kind 中 `#` 行只是历史兼容注释，**不要模仿**。
- **亲和图必须用 `Item:`** 建树，禁止用 `#`。

#### `Type:` 消歧（**同名不同义**）

- `control`：SPC 图种（`I-MR` / `X-bar-R` / …）。
- `matrix`：矩阵几何（`L` / `T` / `Y` / `X` / `C`）。
- `affinity`：渲染模式（`Card` / `Label`）。
- `basic`：图表类型（`bar` / `line` / `pie`）。
- **禁止跨 kind 混用取值**（引擎不校验时会静默降级）。

> [!IMPORTANT]
> **代码块禁令**：严禁 Markdown 围栏与解释性前后缀，只输出纯文本 DSL；`dsl` 参数不得写成 JSON 对象。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — iqs_native_master (Family)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 首行标题（推荐必写） 形如 `<文本>` **必填** | `Title: 售后投诉根因分析` |
| `Color[Slot]` | #HEX 颜色；Slot 名因 kind 而异，取值见对应卡片 | `Color[Bar]: #0D5E42` |
| `Font[Slot]` | px 字号；Slot 名因 kind 而异 | `Font[Title]: 20` |
| `Show*:` | 显示开关族（`ShowValues` / `ShowLegend` / `ShowCurve` / `ShowScores` / `ShowCritical` …）（true / false） | `ShowValues: true` |
| `Decimals:` | 数值显示精度（小数位） 形如 `<整数>` | `Decimals: 2` |
| `注释:` | 行注释，**统一用 `//`** 形如 `// <注释>` | `// 主轴产量` |
| `正文结构:` | 各 kind 的正文形态（Body）不同，必须严格匹配对应卡片的范式（Tree / ItemTree / Pairs / ScalarList / Series / TupleList / Dataset / AxisSeries / Graph / Network / Matrix / Table / ProcessGraph / FlowGraph） | `// 见示例中的逐 kind 结构对照` |

### 边界说明

- **`Show*`**：具体有哪些开关因 kind 而异；取值为小写布尔。
- **`正文结构`**：**不要混用**：如 `Item:` 属 ItemTree（affinity）与 ProcessGraph（pdpc）但第三参语义不同；`- ` 列表属 Pairs / ScalarList / TupleList，但取值形态不同。

### 反例（错 → 对）

- 错：`用 `# 人 (Man)` 在亲和图里建层级`
  对：`Item: g1, 人员因素, root`
  因：`#` 层级仅鱼骨图可用；亲和图是 ItemTree，必须用 `Item:`。
- 错：`Type: X-bar-R   （写在 matrix 图里）`
  对：`Type: L        （matrix 的 Type 取 L/T/Y/X/C）`
  因：`Type:` 同名不同义 —— 跨 kind 混用取值不会被接受（或静默降级）。
- 错：````dsl\nTitle: xxx\n````
  对：`Title: xxx`
  因：禁止 Markdown 围栏。
- 错：`{"Title": "xxx"}`
  对：`Title: xxx`
  因：`dsl` 必须是纯文本字符串，不是 JSON 对象。
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

### 场景：共同外壳 + 14 个 kind 的正文结构对照

```dsl
Title: 2024年三季度产线效能
Color[Title]: #1A2428
Font[Title]: 20
Decimals: 2

// 以下为各 kind 的正文结构示意（实际只写一种）
// Tree      → # 一级  /  ## 二级            （fishbone）
// ItemTree  → Item: id, label, parentId      （affinity）
// Pairs     → - 名称: 数值                    （pareto）
// ScalarList→ - 数值                          （histogram）
// Series    → [series]: 标题 … [/series]      （control）
// TupleList → - x, y [, z]                    （scatter）
// Dataset   → Dataset: 名称, [值], 色, 轴      （basic）
// AxisSeries→ Axis: 名, 最大 … / Series: 名, [值]（radar）
// Graph     → Node: id, 标签 / Rel: a -> b    （relation）
// Network   → Event: id, 名 / a -> b: 工期, 名 （arrow）
// Matrix    → Axis: A, 名 / Matrix: A x B     （matrix）
// Table     → Data: / Styles:                 （matrixPlot）
// ProcessGraph → Group: … EndGroup / a--b [NG]（pdpc）
// FlowGraph → Dict: / Lane from / W:          （flow）
```

> 仅作外层与结构的对照示意；实际生成时**只写一种** kind 的正文，并遵循其卡片。

---

**权威性声明**：本切片由 `dsl/cards/iqs_native_master.card.ts` 生成（卡片版本 1.2），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。