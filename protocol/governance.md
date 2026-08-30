# IQS 协议全局治理规则 (IQS Protocol Governance)

## 1. 核心目标 (Objective)

建立分布式、可机器消费的知识体系：核心 QC 语言严格、救济通道受控、声明层 token 最小化。

## 2. 产品分层 (Core vs Relief)

| 层级 | parent_type | 语言 | 用途 |
|:---|:---|:---|:---|
| **CORE** | `iqs_native` | **IQS-DSL v1** | 成果报告、专业 QC 图、可审计 |
| **RELIEF** | `mermaid`, `vchart` | 各方言 | 类型外制图；不得替代核心统计终稿 |

**选用红线**

1. 能映射标准 QC 工具 → 必须使用 CORE（`render_control` / `render_pareto` 等）。
2. 仅当类型表外 → 使用 RELIEF。
3. 存在 Native 散点/雷达时，禁止默认走 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。

完整语法：**[IQS-DSL v1](../docs/IQS_DSL_V1_SPEC.md)** · 资源 `protocol://dsl/v1`

## 3. 权威性等级 (Hierarchy of Authority)

冲突时按以下顺序裁决（高 → 低）：

1. **Level 0: Language Spec** — `docs/IQS_DSL_V1_SPEC.md` + `dsl/kinds.json`
2. **Level 1: Runtime Parser** — `components/*Editor` 中 `parse*DSL`（与 Spec 应对齐；漂移时修解析器或升版 Spec）
3. **Level 2: MCP Kind Resource** — `protocol://segments/{parent}/{sub}`（由 mcp_tools 动态拼接）
4. **Level 3: Segment Files** — `protocol/segments/*.md`
5. **Level 4: Seed Docs** — `docs/USER_MANUAL_*.md` 等说明性文档

## 4. MCP 声明策略 (Token)

- `list_tools` 仅发布瘦描述（tier + 一句话 + intents + resource URI）。
- 完整 Soul/Grammar/Example **仅**通过 `ReadResource` 按需获取。
- Master 工具不作为可调用 tool 发布，仅用于拼接。
- 校验失败时用短错误 + skeleton 回执，不在 description 堆防呆长文。

## 5. 切片管理原则

- 物理独立：组件可有 `protocol/segments/{id}.md`。
- Kind 资源优先：`protocol://segments/{parent_type}/{sub_type}`。
- 命名：`sub_type` 与 `dsl/kinds.json` 的 `id`、前端 kind 对齐。
- 变更语法：先改 Spec 版本 → registry → parser → mcp example → `npm run validate:dsl`。

## 6. 输出全局红线

1. 纯文本 DSL，禁止 Markdown 代码围栏。
2. 禁止把 `dsl` 参数设为 JSON 对象（VChart 亦须 `Title` + `Spec:` 文本外壳）。
3. 禁止解释性前后缀。

---
*IQS Protocol Council — 2026.08 (aligned with DSL v1)*
