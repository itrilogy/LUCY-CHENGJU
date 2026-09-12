# IQS-DSL v1 协议入口（MCP Resource）

## 生成前的标准流程（推荐）

```
① read  protocol://intents            ← 按用户意图定位 kind（含关键词与资源 URI）
② read  protocol://segments/<parent>/<sub>   ← 取该 kind 的完整语法
③ read  protocol://prompts/<kind>     ← 取该 kind 的具体生成提示词
④ call  render_<kind>(dsl)            ← 渲染
```

> `<kind>` = 工具名去掉 `render_` 前缀（master 卡去掉 `_master`）：`flow` / `affinity` / `matrix_plot` / `mermaid` / `vchart` …
> 三个入口的数据**同源**（均由 `dsl/cards/*.card.ts` 生成），不会互相矛盾。

## 权威文档（请按序阅读）

| 优先级 | 路径 | 内容 |
|:---:|:---|:---|
| 1 | `protocol://intents` | **意图路由目录**（先读这个） |
| 2 | **docs/IQS_DSL_V1_MANUAL.md** | **完整细粒度语法手册**（14 kind 全指令表 / Body / 示例 / 反例） |
| 3 | docs/IQS_DSL_V1_SPEC.md | 架构、分层、代数、权威序 |
| 4 | dsl/kinds.json | 机器可读 kind 表 |
| 5 | protocol/governance.md | Core vs Relief |

## 快速红线

1. **核心** (`iqs_native`) 使用 IQS-DSL v1；**救济** (Mermaid / VChart) 仅类型外制图。  
2. 行注释用 `//`；`#/##` 层级 **仅鱼骨图**。  
3. 亲和图用 `Item: id, label, parent`，**不要**用 `#` 建树。  
4. `Type:` 按 kind 解释（SPC / 矩阵几何 / Card|Label / bar|line|pie）。  
5. 输出纯文本，禁止 Markdown 围栏与整包 JSON。  
6. 散点/雷达有 **Native CORE** 工具：`render_scatter` / `render_radar`。  
7. 企业体系文件流程图终稿用 `render_flow`（IQS-Flow DSL），禁止用 Mermaid `flowchart TD` 冒充。

## 14 核心 kind

`fishbone` `affinity` `pareto` `histogram` `control` `scatter` `radar`  
`relation` `arrow` `pdpc` `matrix` `matrixPlot` `basic` `flow`

## 校验

```bash
npm run validate:dsl
```
