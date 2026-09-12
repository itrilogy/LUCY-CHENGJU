# architecture (架构拓扑/Architecture) 协议切片

## 1. 专家灵魂 (The Soul)

### 专家灵魂 (The Soul)

- **核心分类**: 结构建模类图表。用于刻画现代云原生或微服务架构的逻辑层级与物理拓扑。

### 分类图表注意事项 (Diagram-Specific Precautions)

- **拓扑语法 (Critical)**: 连线方向必须遵循 `源节点:方向 --> 方向:目标节点`（例如 `gateway:R --> L:auth`）。
- **命名建议**: Label 建议优先使用英文以确保持续兼容性。

---

## 2. 语法血肉 (The Flesh)

### IQS-DSL v1 — architecture (Unknown)

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `architecture-beta:` | 定义架构图起始。 | `architecture-beta: <值>` |
| `group [ID](图标)[Label]:` | 定义逻辑层级组。 | `group [ID](图标)[Label]: <值>` |
| `service [ID](图标)[Label]:` | 定义具体服务节点。 | `service [ID](图标)[Label]: <值>` |


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

### 场景：architecture-beta

```dsl
architecture-beta
    group api(cloud)[API Layer]
    group services(server)[Service Layer]
    group db(database)[Database Layer]

    service gateway(internet)[API Gateway] in api
    service auth(server)[Auth Service] in services
    service user(server)[User Service] in services
    service mysql(database)[MySQL] in db

    gateway:R --> L:auth
    gateway:B --> T:user
    auth:R --> L:mysql
    user:R --> L:mysql
```

---

**权威性声明**：本切片由 `dsl/cards/architecture.card.ts` 生成（卡片版本 1.0），请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。