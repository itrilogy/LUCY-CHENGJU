# IQS 意图路由目录（intents）

> 本文件由 `dsl/cards/*.card.ts` 的 `meta.intents` 生成。
> **用法**：先在此按用户意图定位 kind，再 `read` 对应的 `protocol://segments/<parent>/<sub>` 取语法，
> 最后 `read` `protocol://prompts/<kind>` 取生成提示词，然后调用 `render_<kind>`。

## 输出红线（全局，适用于所有 kind）

1. 纯文本 DSL；**禁止** Markdown 代码围栏、禁止把 `dsl` 写成 JSON 对象、禁止解释性前后缀。
2. 能映射标准 QC 工具时**必须**用 CORE（`render_control` / `render_pareto` 等）。
3. 仅当类型表外才用 RELIEF（Mermaid / VChart）。
4. **有 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。**
5. 体系文件 / 部门泳道 / BPMN 子集终稿**必须**用 `render_flow`，禁止 `render_mermaid_flowchart`。

## 核心（CORE · iqs_native）

| kind | 工具 | 意图关键词 | 语法资源 | 提示词资源 |
| :--- | :--- | :--- | :--- | :--- |
| `affinity` | `render_affinity` | 亲和图 · KJ法 · 系统图 · affinity diagram · 卡片分组 · 语言资料归纳 | `protocol://segments/iqs_native/affinity` | `protocol://prompts/affinity` |
| `arrow` | `render_arrow` | 矢线图 · 双代号网络图 · 关键路径 · arrow diagram · 网络计划 · CPM | `protocol://segments/iqs_native/arrow` | `protocol://prompts/arrow` |
| `basic` | `render_basic` | 基础图表 · 饼图 · 折线图 · 柱状图 · 占比图 · 趋势对冲 · 环形图 · bar · line · pie | `protocol://segments/iqs_native/basic` | `protocol://prompts/basic` |
| `control` | `render_control` | 控制图 · SPC · 稳定性分析 · control chart · 判异 · 过程受控 | `protocol://segments/iqs_native/control` | `protocol://prompts/control` |
| `fishbone` | `render_fishbone` | 鱼骨图 · 因果图 · 石川图 · fishbone · 根因分析 · ishikawa · 5M1E · 4P · 5Why | `protocol://segments/iqs_native/fishbone` | `protocol://prompts/fishbone` |
| `flow` | `render_flow` | 流程图 · 泳道图 · 流程 · 程序文件 · 跨部门流程 · BPMN · flow · swimlane · 审批流程 | `protocol://segments/iqs_native/flow` | `protocol://prompts/flow` |
| `histogram` | `render_histogram` | 直方图 · 分布分析 · Cp · Cpk · histogram · 正态性 · 工序能力 | `protocol://segments/iqs_native/histogram` | `protocol://prompts/histogram` |
| `iqs_native_master` | `render_iqs_native_master` | IQS 原生 · CORE · QC 核心图 · 质量工具 | `protocol://segments/iqs_native/master` | `protocol://prompts/iqs_native_master` |
| `matrix` | `render_matrix` | 矩阵图 · L型矩阵 · T型矩阵 · Y型矩阵 · matrix diagram · 相关矩阵 · 决策矩阵 | `protocol://segments/iqs_native/matrix` | `protocol://prompts/matrix` |
| `matrixPlot` | `render_matrix_plot` | 矩阵散点图 · 散点图矩阵 · 多变量关联 · matrix plot · pairs plot · 相关矩阵图 | `protocol://segments/iqs_native/matrixPlot` | `protocol://prompts/matrixPlot` |
| `pareto` | `render_pareto` | 排列图 · 帕累托图 · pareto chart · 二八定律 · 80/20 · ABC分析 · 关键少数 | `protocol://segments/iqs_native/pareto` | `protocol://prompts/pareto` |
| `pdpc` | `render_pdpc` | PDPC · 过程决策 · 风险对策 · 应急预案 · 风险预演 | `protocol://segments/iqs_native/pdpc` | `protocol://prompts/pdpc` |
| `radar` | `render_radar` | 雷达图 · 多维对比 · radar · 综合评分 · 蜘蛛图 · 能力评估 | `protocol://segments/iqs_native/radar` | `protocol://prompts/radar` |
| `relation` | `render_relation` | 关联图 · 交叉因果 · relationship diagram · 网状因果 · 多症结 | `protocol://segments/iqs_native/relation` | `protocol://prompts/relation` |
| `scatter` | `render_scatter` | 散点图 · 相关分析 · 回归 · scatter · 相关性 · X-Y确认 | `protocol://segments/iqs_native/scatter` | `protocol://prompts/scatter` |

## 救济（RELIEF）

| family | 入口 | sub_type 数 | 用途 |
| :--- | :--- | :---: | :--- |
| **mermaid** | `render_mermaid_*` | 19 | 基于文本的通用建模工具；**仅用于 CORE 类型表以外的图**，不得替代 QC 统计终稿。 |
| **vchart** | `render_vchart_*` | 19 | 基于 VisActor JSON Spec 的复杂可视化；**有 Native 等价时必须改走 CORE**。 |

### 救济层 sub_type 索引（按需 read 语法）

**mermaid**

- `architecture` → `protocol://segments/mermaid/architecture` · 意图：架构图 · 拓扑图 · 系统架构 · architecture
- `block-beta` → `protocol://segments/mermaid/block-beta` · 意图：块图 · 分层组件图 · block diagram
- `classDiagram` → `protocol://segments/mermaid/classDiagram` · 意图：类图 · UML类图 · 系统结构图 · class diagram
- `erDiagram` → `protocol://segments/mermaid/erDiagram` · 意图：ER图 · 实体关系图 · 数据库模型 · er diagram
- `flowchart` → `protocol://segments/mermaid/flowchart` · 意图：流程图 · flowchart · 业务流 · 决策图
- `gantt` → `protocol://segments/mermaid/gantt` · 意图：甘特图 · 进度计划 · 项目排期 · gantt
- `gitGraph` → `protocol://segments/mermaid/gitGraph` · 意图：git图 · 分支图 · 代码提交记录 · gitgraph
- `journey` → `protocol://segments/mermaid/journey` · 意图：旅程图 · 用户旅程 · 体验路径 · journey board
- `kanban` → `protocol://segments/mermaid/kanban` · 意图：看板 · kanban · 任务流
- `mindmap` → `protocol://segments/mermaid/mindmap` · 意图：脑图 · 思维导图 · mindmap
- `packet-beta` → `protocol://segments/mermaid/packet-beta` · 意图：报文图 · 协议解析 · packet structure
- `pie` → `protocol://segments/mermaid/pie` · 意图：极简饼图 · Mermaid 饼图 · mermaid pie
- `quadrantChart` → `protocol://segments/mermaid/quadrantChart` · 意图：象限图 · 四象限 · 优先级分析 · quadrant chart
- `requirementDiagram` → `protocol://segments/mermaid/requirementDiagram` · 意图：需求图 · requirement diagram · 规格限制
- `sankey-beta` → `protocol://segments/mermaid/sankey-beta` · 意图：桑基图 · sankey · 流向图 · 分配图
- `sequenceDiagram` → `protocol://segments/mermaid/sequenceDiagram` · 意图：时序图 · 顺序图 · 调用链 · sequence diagram
- `stateDiagram-v2` → `protocol://segments/mermaid/stateDiagram-v2` · 意图：状态图 · 状态迁移图 · 生命周期图 · state diagram
- `timeline` → `protocol://segments/mermaid/timeline` · 意图：时间线 · 年表 · 迭代记录 · timeline
- `xychart-beta` → `protocol://segments/mermaid/xychart-beta` · 意图：xy图 · 组合图 · 双轴图 · xychart

**vchart**

- `area` → `protocol://segments/vchart/area` · 意图：面积图 · 堆叠面积图 · area chart
- `bar` → `protocol://segments/vchart/bar` · 意图：柱状图 · 条形图 · bar chart · 堆叠柱状图
- `boxPlot` → `protocol://segments/vchart/boxPlot` · 意图：箱线图 · 分位数图 · boxplot · 离散度分析
- `circularProgress` → `protocol://segments/vchart/circularProgress` · 意图：进度环 · 环形进度 · circular progress · 达成追踪
- `common` → `protocol://segments/vchart/common` · 意图：组合图 · 双轴图 · 混合图 · common chart
- `heatmap` → `protocol://segments/vchart/heatmap` · 意图：相关性矩阵 · 矩阵热力图 · correlation heatmap · 替换韦恩图
- `funnel` → `protocol://segments/vchart/funnel` · 意图：漏斗图 · 转化图 · funnel chart · 流失率分析
- `gauge` → `protocol://segments/vchart/gauge` · 意图：仪表盘 · 刻度盘 · gauge chart · 达成率监控
- `heatmap` → `protocol://segments/vchart/heatmap` · 意图：热力图 · 颜色映射图 · heatmap · 矩阵分析
- `line` → `protocol://segments/vchart/line` · 意图：折线图 · 趋势图 · line chart · 良率趋势
- `pie` → `protocol://segments/vchart/pie` · 意图：工业级饼图 · 高精占比图 · VChart 饼图 · complex pie
- `radar` → `protocol://segments/vchart/radar` · 意图：雷达图 · 能力雷达 · 绩效分析 · radar chart
- `rose` → `protocol://segments/vchart/rose` · 意图：玫瑰图 · 南丁格尔图 · rose chart
- `sankey` → `protocol://segments/vchart/sankey` · 意图：桑基图 · 能量流图 · sankey graph · 流转分析
- `scatter` → `protocol://segments/vchart/scatter` · 意图：散点图 · 相关性分析 · 回归分析 · scatter
- `sunburst` → `protocol://segments/vchart/sunburst` · 意图：旭日图 · 多层饼图 · sunburst chart · 层级穿透
- `treemap` → `protocol://segments/vchart/treemap` · 意图：树图 · 矩形树图 · treemap · 空间比例
- `waterfall` → `protocol://segments/vchart/waterfall` · 意图：瀑布图 · 变动归因图 · waterfall chart · 成本拆解
- `wordCloud` → `protocol://segments/vchart/wordCloud` · 意图：词云 · 字符图 · wordcloud · 关键词热力

> 全部 54 张卡片均已迁入真源；`protocol://segments/<parent>/<sub>` 覆盖所有 kind。