# sequenceDiagram (系统协作/时序图) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 时序交互类图表。专注于刻画参与者（Participants）之间的消息传递顺序与调用逻辑。

### 公共事项及说明 (Common Instructions)

1. **纯净 DSL 范式**: AI 必须生成纯文本 DSL 指令。严禁将代码块包裹在 JSON 结构中或附加冗余解释。

2. **符号冲突防御**: 中文描述必须优先使用全角标点，或用引号包裹。例：`Alice ->> Bob: "处理中，请稍候"`。

3. **角色定义**: 使用 `actor` 定义人工角色，`participant` 定义系统组件。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — sequenceDiagram (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `sequenceDiagram:` | 定义时序图起始。 | `sequenceDiagram: <值>` |
| `activate:` | 开启/关闭生命线。 | `activate: <值>` |
| `deactivate:` | 开启/关闭生命线。 | `deactivate: <值>` |
| `loop:` | 控制流结构。 | `loop: <值>` |
| `alt:` | 控制流结构。 | `alt: <值>` |
| `opt:` | 控制流结构。 | `opt: <值>` |


### 反例（错 → 对）

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

### 场景：%%{init: {"theme": "forest"}}%%

```dsl
%%{init: {"theme": "forest"}}%%
sequenceDiagram
    actor 用户
    participant Web as Web端
    participant Srv as 服务端
    
    用户 ->> Web: 点击登录
    Web ->> Srv: 发送鉴权请求
    Srv -->> Web: 返回 Token
    Web -->> 用户: 显示主界面
```

---

**权威性声明**：本切片由 `dsl/cards/sequenceDiagram.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。