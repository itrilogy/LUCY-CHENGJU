# basic (基础统计图 (DSL)) 协议切片

## 1. 专家灵魂 (The Soul)

### 基础图表分析 (Bar / Line / Pie)

- **柱状图 (Bar)**：强调个体之间的横向比较，适合分类数据的离散分析。
- **折线图 (Line)**：专注于随时间或连续维度的趋势演变；`Smooth: true` 提升视觉连续性。
- **饼图 (Pie)**：表达组成部分与整体的比例分配；多层用 `Y`/`Y2`/`Y3` 做同心圆环。
- **混合多轴 (Multi-Axis)**：通过 `Y2` / `Y3` 绑定副轴，可在同一画布对比量级差异巨大的数据（如产量 vs 百分比）。

#### 核心规则

- **分类标签必填**：无论何种图型，都必须有一个含 `X` 轴匹配的 `Dataset:` 作为分类维，否则数值失去语义。
- **混合渲染**：重复声明 `Type:` 会切换**其后** `Dataset` 的渲染类型 —— 这是 bar/line 混排的唯一方式。
- **叠层顺序**：`Y` 为最内层，`Y2` 中层，`Y3` 最外层。

> [!IMPORTANT]
> **分类限制**：单一图表避免超过 7 个分类。分类过多时应合并为「其他」项，或改用水平柱状图（`View: h`）。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — basic (Dataset)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 形如 `<文本>` **必填** | `Title: 2024年产线效能` |
| `Type:` | 渲染模式；**重复声明可切换其后 Dataset 的类型**（混合渲染）（bar / line / pie） | `Type: bar` |
| `View:` | 布局方向（v / h） | `View: v` |
| `Stacked:` | 启用堆叠（分量与总量的累计分析）（true / false） | `Stacked: true` |
| `Smooth:` | 平滑折线（仅 line 有效）（true / false） | `Smooth: true` |
| `ShowLegend:` | 是否显示图例（true / false） | `ShowLegend: true` |
| `ShowValues:` | 是否显示数值标签（true / false） | `ShowValues: true` |
| `Grid:` | 是否显示网格线（**开关**，非线型）（true / false） | `Grid: true` |
| `Decimals:` | 小数位精度 形如 `<整数>` | `Decimals: 1` |
| `Color[Title | Bg]` | #HEX 标题色 / 背景色 | `Color[Title]: #1A2428` |
| `Font[Title | Base]` | px 字号（标题 / 正文） | `Font[Title]: 20` |
| `Dataset:` | 数据序列定义（本 kind 的唯一数据录入方式） 形如 `<名称>, [<值列表>], <颜色或 null>, <轴匹配>` **必填** | `Dataset: 入库合格量, [12000, 14500, 13800], #0D5E42, Y` |

### 边界说明

- **`Type`**：取值**小写**；`Type: Bar` 不生效。
- **`View`**：`v` 垂直（缺省）、`h` 水平。
- **`Grid`**：⚠️ 与 flow 的 `Grid:` 同名异义 —— flow 的取值为 `dashed` / `solid`（线型）。
- **`Dataset`**：① 轴匹配取值 `X`（分类标签，**必须恰好一个**）/ `Y`（主轴）/ `Y2` `Y3`（副轴或同心环层）；② 颜色写 `null` 时使用内置色板；③ 值列表用**半角逗号**分隔，元素个数应与 X 轴分类数一致。

### 反例（错 → 对）

- 错：`Dataset: 月份, [7月, 8月], #0D5E42, Y`
  对：`Dataset: 月份, [7月, 8月], null, X`
  因：缺少 `X` 轴分类定义时数值将失去语义标签；必须**恰好有一个** Dataset 用 `X`。
- 错：`Type: Bar`
  对：`Type: bar`
  因：`Type` 取值小写，大写不生效。
- 错：`Dataset: 产量, [{x:1,y:2}], null, Y`
  对：`Dataset: 产量, [12, 15, 9], null, Y`
  因：`Dataset` 的值是**纯数组文本**，不是 JSON 对象数组。
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

### 场景：2024年三季度产线效能对冲分析

```dsl
Title: 2024年三季度产线效能对冲分析
Type: bar
ShowLegend: true
Grid: true

// 1. 分类标签（必填：必须有一个 X 轴 Dataset）
Dataset: 月份, [7月, 8月, 9月], null, X

// 2. 主轴产量（柱状）
Dataset: 入库合格量, [12000, 14500, 13800], #0D5E42, Y

// 3. 副轴稼动率：重新声明 Type 切换后续 Dataset 的渲染类型为折线
Type: line
Smooth: true
Dataset: 设备稼动率(%), [88.5, 92.1, 91.4], #E74C3C, Y2
```

> X 轴分类 + 主轴柱状 + 副轴折线（通过重复声明 `Type: line` 切换）的典型双轴对冲。

---

**权威性声明**：本切片由 `dsl/cards/basic.card.ts` 生成（卡片版本 1.2），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。