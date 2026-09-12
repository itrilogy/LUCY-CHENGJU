# radar (多维评价/雷达图) 协议切片

## 1. 专家灵魂 (The Soul)

### 雷达图综合评价

雷达图把对象在多个维度上的得分画成闭合多边形。**尖角**暴露短板，**面积大且圆润**表示均衡且综合实力强。

#### 三个分析算子

- **Standardize（标准化）**：消除量纲后比较形态。当各轴量纲不一致（一个是百分比、一个是金额）时必须开启。
- **ShowAreaScore（面积得分）**：多边形面积反映综合实力，比平均分更能体现「短板效应」。
- **ShowSimilarity（相似度）**：计算各系列与**首个系列**的形态相似度，用于对标。

> [!TIP]
> 看雷达图先看**形状**再看面积：极度不规则说明资源分配失衡，可能存在局部优势掩盖系统性缺陷。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — radar (AxisSeries)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 形如 `<文本>` **必填** | `Title: 产品竞品对比分析` |
| `Standardize:` | 按各轴最大值归一后比较（**量纲不一致时必须开启**）（true / false） | `Standardize: true` |
| `ShowAreaScore:` | 显示多边形面积综合得分（true / false） | `ShowAreaScore: true` |
| `ShowSimilarity:` | 显示各系列与**首个系列**的形态相似度（true / false） | `ShowSimilarity: true` |
| `ShowValues:` | 在数据点旁显示原始数值（true / false） | `ShowValues: false` |
| `StartAngle:` | 首个轴的起始角度（`-90` = 12 点钟方向） 形如 `<角度>` | `StartAngle: -90` |
| `Clockwise:` | 轴排列方向是否为顺时针（true / false） | `Clockwise: true` |
| `Closed:` | 网格样式：`true` 多边形，`false` 圆形（true / false） | `Closed: true` |
| `Axis:` | 定义一条维度轴 形如 `<名称>, <最大值>[, <最小值>]` **必填** | `Axis: 质量, 100, 0` |
| `Series:` | 定义一个对比系列 形如 `<名称>, [<值列表>][, <颜色>[, <透明度>]]` **必填** | `Series: 方案A, [85, 70, 90, 80, 75], #0D5E42, 0.4` |

### 边界说明

- **`Axis`**：最小值可省略（默认 0）。轴的**声明顺序**即雷达图的轴顺序。
- **`Series`**：① 值列表元素个数必须**等于轴数量**，且与轴顺序一一对应；② 颜色可省略（用内置色板）或写 `null`；③ 透明度取 0–1，多系列重叠时建议 ≤ 0.4。

### 反例（错 → 对）

- 错：`Axis: 质量, 100\nAxis: 成本, 100\nSeries: 方案A, [85]`
  对：`Axis: 质量, 100\nAxis: 成本, 100\nSeries: 方案A, [85, 70]`
  因：每个系列的值个数必须**等于轴数量**，否则无法闭合多边形。
- 错：`Standardize: true   （但所有轴量纲相同，都是评分）`
  对：`Standardize: false（同量纲时无需归一）`
  因：同量纲时归一反而会扭曲真实差距；标准化应当只在量纲不一致时开启。
- 错：`Axis: 年化回报(%), 25\nAxis: 夏普比率, 3.0\nSeries: A, [12, 1.8]   （未开 Standardize）`
  对：`同上，但加 `Standardize: true``
  因：各轴量纲差异巨大（% 与比率）却不归一，小量纲的轴会被压成一条直线，看不出形态。
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

### 场景：方案多维效果对比

```dsl
Title: 方案多维效果对比
Standardize: true
ShowAreaScore: true
ShowSimilarity: true
ShowValues: false
StartAngle: -90
Clockwise: true
Closed: true

// 轴定义：Axis: <名称>, <最大值>[, <最小值>]
Axis: 质量, 100, 0
Axis: 成本, 100, 0
Axis: 交期, 100, 0
Axis: 安全, 100, 0
Axis: 可维护性, 100, 0

// 系列：Series: <名称>, [<值列表>][, <颜色>[, <透明度>]]
Series: 方案A, [85, 70, 90, 80, 75], #0D5E42, 0.4
Series: 方案B, [70, 85, 75, 88, 80], #E74C3C, 0.3
```

> 5 条轴 × 2 个系列；开启标准化、面积得分与相似度。

---

**权威性声明**：本切片由 `dsl/cards/radar.card.ts` 生成（卡片版本 1.1），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。