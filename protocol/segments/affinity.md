# Affinity (亲和图) 协议切片

## 1. 专家灵魂 (The Soul)

### KJ 法 (Affinity Diagram)
亲和图法，又称 KJ 法，由川喜田二郎发明。它是将收集到的事实、意见、想法等语言信息，按其相互亲和性（相近性）归纳整理，使问题条理化的方法。

#### 核心步骤：
- **发散 (Divergence)**: 收集尽可能多的原始想法、反馈或观测值。
- **收敛 (Convergence)**: 寻找想法间的内在亲和逻辑，形成分组并提炼标题。
- **层级化**: 建立多级归纳，从具体到抽象，理清思路。

### 专家建议
> [!IMPORTANT]
> 当多个想法无法归入现有分组时，不要强行塞入。这可能意味着存在一个新的观察维度，或者是未被识别的根本问题。

---

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表主标题 | `Title: 市场调研整理` |
| `Type:` | 渲染模式 (`Card` / `Label`) | `Type: Card` |
| `Layout:` | 布局方向 (`Horizontal` / `Vertical`) | `Layout: Horizontal` |

### 样式定义
- `Color[TitleBg | TitleText]`: #HEX 标题背景与文字。
- `Color[GroupHeaderBg | GroupHeaderText]`: #HEX 分组（根节点）样式。
- `Color[ItemBg | ItemText]`: #HEX 常规项目（卡片）样式。
- `Font[Title | GroupHeader | Item]`: px 数字字号。
- `Color[Line]`: #HEX 连线颜色 (Tree 模式)。
- `Color[Border]`: #HEX 边框颜色。

### 数据项录入语法（ItemTree — 强制）
格式为 `Item: [ID], [Label], [ParentID]`
- `ID`: 节点唯一标识。
- `Label`: 显示文字。
- `ParentID`: 父级节点 ID (顶级项目指向 `root` 或 `null`)。

> [!CAUTION]
> **禁止**用 `# / ## / ###` 建亲和图树（那是鱼骨图 TreeBody）。  
> 解析器只认 `Item:`。行注释使用 `//`。详见 [IQS-DSL v1](../../docs/IQS_DSL_V1_SPEC.md)。

---

## 3. 官方示例 (The Seed)

### 场景：改善办公环境的想法整理 (KJ 法)
```dsl
Title: 办公环境改善方案 (KJ法)
Type: Card
Layout: Horizontal

Color[TitleBg]: #4f46e5
Color[TitleText]: #ffffff
Color[GroupHeaderBg]: #e0e7ff
Color[ItemBg]: #ffffff
Color[ItemText]: #1e293b

# 节点定义
Item: root, 核心目标: 提升员工幸福感, null
Item: g1, 空间布局, root
Item: g2, 行政服务, root
Item: g3, 数字化工具, root

# 空间布局子项
Item: sub1, 增加绿植覆盖, g1
Item: sub2, 设立静默专注区, g1
Item: sub3, 升级人体工学椅, g1

# 行政服务子项
Item: sub4, 现磨咖啡无限供应, g2
Item: sub5, 每周五下午茶, g2

# 数字化工具子项
Item: sub6, 引入智能看板系统, g3
Item: sub7, 简化报销流程, g3
```

---
**权威性声明**: 本文档内容与 `AffinityEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
