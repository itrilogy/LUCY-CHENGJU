# histogram (分布分析/直方图) 协议切片

## 1. 专家灵魂 (The Soul)

### 正态分布分析 (Normal Distribution)

直方图通过对大量随机样本的观察，识别生产过程是否受控。稳定的生产过程通常呈现对称的「钟形」曲线。

- **均值 (μ)**：反映加工的中心位置。
- **标准差 (σ)**：反映加工的散差大小。
- **形态**：双峰说明数据可能来自两个班次/设备/供应商；偏斜说明中心偏移或单边截尾。

#### 工序能力指标 (Process Capability)

当定义了规格限（`USL` / `LSL`）时，引擎自动评估工序能力：

- **Cp**：仅看散布宽度与规格宽度的比值，假设中心对齐。
- **Cpk**：同时考虑散布与中心偏移 —— **实际决策应看 Cpk**。
- **1.33**：工业级「合格」门槛；**1.67**：优秀。

> [!TIP]
> 样本量建议 ≥ 50（QC 惯例 100 以上）再解读 Cp/Cpk；样本太少时直方图形状与控制限都不可靠。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — histogram (ScalarList)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 形如 `<文本>` **必填** | `Title: 钢管直径分布` |
| `USL:` | 规格上限 (Upper Specification Limit) 形如 `<数值>` | `USL: 10.5` |
| `LSL:` | 规格下限 (Lower Specification Limit) 形如 `<数值>` | `LSL: 9.5` |
| `Target:` | 目标值（渲染为规格区内的目标线） 形如 `<数值>` | `Target: 10.0` |
| `Bins:` | 分组数（直方柱个数）（auto） | `Bins: auto` |
| `ShowCurve:` | 是否叠加正态拟合曲线（true / false） | `ShowCurve: true` |
| `ShowValues:` | 是否显示柱顶数值（true / false） | `ShowValues: true` |
| `Color[Bar | Curve | USL | LSL | Target]` | #HEX 颜色：柱体 / 拟合曲线 / 规格上限线 / 规格下限线 / 目标线 | `Color[USL]: #E74C3C` |
| `Font[Title | Base]` | px 字号（标题 / 正文） | `Font[Title]: 18` |
| `数据行:` | 原始测量数据，**一行一个数值**（本 kind 唯一的数据录入方式） 形如 `- <数值>` **必填** | `- 9.8` |

### 边界说明

- **`USL`**：与 `LSL` 同时给出才会计算 Cp / Cpk；只给一个时只能评估单侧能力。
- **`Target`**：目标值用于观察中心偏移方向，不参与 Cp/Cpk 计算。
- **`Bins`**：可写整数（如 `Bins: 20`）或 `auto`（按样本量自动，缺省）。
- **`数据行`**：必须是**逐条原始观测值**，不要预先把数据分箱或写成 `频数: 值`。

### 反例（错 → 对）

- 错：`- 9.8: 5   （把频数写进数据行）`
  对：`- 9.8\n- 9.8\n- 9.8\n- 9.8\n- 9.8`
  因：本 kind 录入的是**原始观测值**（一行一个），不是「值: 频数」的预统计表。
- 错：`Bins: 3   （用于 30 个样本）`
  对：`Bins: auto`
  因：分组数过少会掩盖分布形态；样本量 30 时建议 6–8 组，或直接用 `auto`。
- 错：`LSL: 10.5\nUSL: 9.5`
  对：`LSL: 9.5\nUSL: 10.5`
  因：下限必须小于上限，否则工序能力指标无意义。
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

### 场景：产品直径分布分析

```dsl
Title: 产品直径分布分析
USL: 10.5
LSL: 9.5
Target: 10.0
Color[Bar]: #0D5E42
Color[Curve]: #F1C40F
Color[USL]: #E74C3C
Color[LSL]: #E74C3C
Color[Target]: #22c55e
Font[Title]: 18
Font[Base]: 12
Bins: auto
ShowCurve: true

// 原始测量数据（一行一个数值）
- 9.8
- 10.2
- 10.1
- 9.9
- 10.0
- 10.3
- 9.7
- 10.1
- 9.9
- 10.0
- 10.2
- 9.8
- 10.4
- 9.6
- 10.1
- 9.9
- 10.0
- 10.2
- 9.8
- 10.1
- 10.5
- 9.5
- 10.0
- 10.3
- 9.7
- 10.1
- 9.9
- 10.2
- 10.0
- 9.8
```

> 30 个原始测量值；USL/LSL 齐全，引擎据此计算 Cp / Cpk 并叠加正态曲线。

---

**权威性声明**：本切片由 `dsl/cards/histogram.card.ts` 生成（卡片版本 1.1），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。