# affinity (核心归类/亲和图) 协议切片

## 1. 专家灵魂 (The Soul)

### KJ 法 (Affinity Diagram)

亲和图法，又称 KJ 法，由川喜田二郎发明。它是将收集到的事实、意见、想法等语言信息，按其相互亲和性（相近性）归纳整理，使问题条理化的方法。

#### 核心步骤

- **发散 (Divergence)**：收集尽可能多的原始想法、反馈或观测值。
- **收敛 (Convergence)**：寻找想法间的内在亲和逻辑，形成分组并提炼标题。
- **层级化**：建立多级归纳，从具体到抽象，理清思路。

#### 逻辑构建

通过层级化的定义，亲和图可以帮助团队从混乱的信息中理出头绪。一个好的亲和图应具有清晰的因果或从属逻辑——上级是下级共同性质的提炼，而不是简单的时间顺序。

> [!IMPORTANT]
> 当多个想法无法归入现有分组时，**不要强行塞入**。这可能意味着存在一个新的观察维度，或者是未被识别的根本问题。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — affinity (ItemTree)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表主标题 形如 `<文本>` **必填** | `Title: 市场调研整理` |
| `Type:` | 渲染模式（Card / Label） | `Type: Card` |
| `Layout:` | 布局方向（Horizontal / Vertical） | `Layout: Horizontal` |
| `Color[TitleBg | TitleText]` | #HEX 标题背景与文字色 | `Color[TitleBg]: #4f46e5` |
| `Color[GroupHeaderBg | GroupHeaderText]` | #HEX 分组（一级节点）样式 | `Color[GroupHeaderBg]: #e0e7ff` |
| `Color[ItemBg | ItemText]` | #HEX 常规条目（卡片）样式 | `Color[ItemBg]: #ffffff` |
| `Color[Line]` | #HEX 连线颜色 | `Color[Line]: #64748b` |
| `Color[Border]` | #HEX 边框颜色 | `Color[Border]: rgba(13,94,66,0.18)` |
| `Font[Title | GroupHeader | Item]` | px 数字字号 | `Font[Title]: 24` |
| `Item:` | 数据项（ItemTree 唯一录入方式） 形如 `[ID], [Label], [ParentID]` **必填** | `Item: g1, 空间布局, root` |

### 边界说明

- **`Type`**：Card = 卡片形态；Label = 纯文字标签形态。缺省 Card。
- **`Layout`**：注意与 flow 的 `Layout: H|V` 写法不同（此处为全称）。
- **`Item`**：① `ID` 唯一，供 `ParentID` 引用；② `Label` 为显示文字，**内容中若需冒号请用全角「：」**，因为分隔符是半角逗号；③ `ParentID` 写上级 ID（一级节点写 `root` 或 `null`）；④ **被解析器作为虚拟根吸收**：`Item: root, …` 这一行本身不出现在图上，其 children 即为顶层——这是 affinity 独有行为，与 `#` 树无关。

### 反例（错 → 对）

- 错：`# 一级分类\n## 二级原因`
  对：`Item: g1, 一级分类, root\nItem: i1, 二级原因, g1`
  因：亲和图是 ItemTree，不是 Tree；`#` 层级仅鱼骨图可用。
- 错：`Item: root, 公司目标, null\nItem: a, 降本, root\nItem: b, 增效, a\nItem: c, 提效, root`
  对：`每个条目只写一次，层级由 ParentID 单一指定`
  因：同一 ID 重复出现或层级自相矛盾会导致树结构不确定。
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

### 场景：改善办公环境的想法整理（KJ 法）

```dsl
Title: 办公环境改善方案（KJ 法）
Type: Card
Layout: Horizontal

// 样式
Color[TitleBg]: #4f46e5
Color[TitleText]: #ffffff
Color[GroupHeaderBg]: #e0e7ff
Color[GroupHeaderText]: #1A2428
Color[ItemBg]: #ffffff
Color[ItemText]: #1A2428
Font[Title]: 24
Font[GroupHeader]: 16
Font[Item]: 14
Color[Line]: #64748b
Color[Border]: rgba(13,94,66,0.18)

// 核心主题（parentId 写 null 或不写；写 root 时该节点会被解析器作为虚拟根吸收，图上不显示）
Item: root, 核心目标: 提升员工幸福感, null

// 一级分组
Item: g1, 空间布局, root
Item: g2, 行政服务, root
Item: g3, 数字化工具, root

// 二级条目
Item: sub1, 增加绿植覆盖, g1
Item: sub2, 设立静默专注区, g1
Item: sub3, 升级人体工学椅, g1
Item: sub4, 现磨咖啡无限供应, g2
Item: sub5, 每周五下午茶, g2
Item: sub6, 引入智能看板系统, g3
Item: sub7, 简化报销流程, g3
```

> 一级分组 + 二级条目两层；`root` 作虚拟根不显示。

---

**权威性声明**：本切片由 `dsl/cards/affinity.card.ts` 生成（卡片版本 2.2），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。