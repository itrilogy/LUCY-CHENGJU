# IQS-DSL v1 协议入口（MCP Resource）

## 权威文档（请按序阅读）

| 优先级 | 路径 | 内容 |
|:---:|:---|:---|
| 1 | **docs/IQS_DSL_V1_MANUAL.md** | **完整细粒度语法手册**（13 kind 全指令表 / Body / 示例 / 反例） |
| 2 | docs/IQS_DSL_V1_SPEC.md | 架构、分层、代数、权威序 |
| 3 | dsl/kinds.json | 机器可读 kind 表 |
| 4 | protocol/governance.md | Core vs Relief |

URI：`protocol://dsl/v1` 返回本摘要；Agent 生成 DSL 前应 `read` 对应  
`protocol://segments/iqs_native/{kind}`。

## 快速红线

1. **核心** (`iqs_native`) 使用 IQS-DSL v1；**救济** (Mermaid / VChart) 仅类型外制图。  
2. 行注释用 `//`；`#/##` 层级 **仅鱼骨图**。  
3. 亲和图用 `Item: id, label, parent`，**不要**用 `#` 建树。  
4. `Type:` 按 kind 解释（SPC / 矩阵几何 / Card|Label / bar|line|pie）。  
5. 输出纯文本，禁止 Markdown 围栏与整包 JSON。  
6. 散点/雷达有 **Native CORE** 工具：`render_scatter` / `render_radar`。

## 13 核心 kind

`fishbone` `affinity` `pareto` `histogram` `control` `scatter` `radar`  
`relation` `arrow` `pdpc` `matrix` `matrixPlot` `basic`

## 校验

```bash
npm run validate:dsl
```
