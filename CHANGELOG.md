# Changelog

本文件记录面向发行的用户可见变更。格式参考 Keep a Changelog。

## [Unreleased]

### 新增

- 第 14 个 CORE kind **IQS-Flow**（泳道 / BPMN 子集 / 自研 SVG）：字典-索引、正交走线、A1 全节点硬互斥、MCP `render_flow`
- Flow 编辑器：LUXI LAB 侧栏、配色方案、`Grid: dashed|solid`、Attr active 右下角有值标注
- `npm run test:flow` 解析 / SVG / BPMN / 主干序 / 格内序回归
- `npm run test:fishbone` 鱼骨图几何不变量 G1–G7（44 项断言），已串入 `npm run build` 与 CI

### 变更

- Flow 打开示例：端口下降改用代数核+缓存，折弯≤2 不再跑可见图 Dijkstra（canonical SVG ~5.5s → ~150ms）
- AI：本地 `.env` 的 `API_KEY` 优先于 `public/config.js`；仓库内 `config.js` 不再放置密钥
- README 与 14 kind / Flow / AI / MCP 现状对齐
- 默认端口 Web **12000** / MCP **12001**（`npm run dev|preview|mcp:*` 与 Docker 一致）
- 外部模型 `deepseek-v4-flash`；内网模型 `qwen3.5-9b`

### 修复

- **鱼骨图布局数学重构：族间距、可读性与几何不变量**（R29 / AUD-175~183）：
  - **五遍闭式解重写**（`utils/fishboneGraph.ts`）：Pass 0 排版阶梯 → Pass 1 行距必要式反解骨高 → Pass 2 半区自治保序串联 → Pass 3 剪刀错位 → Pass 4 缩放闭环（3 档族距重排 + warning）。彻底取代「脊椎均分 + 线性骨长 + 成对绑定」的旧范式；
  - **族包络两遍解算**（AUD-177）：族跨度改用实际骨长（`dx = H·cot60°`），消除假定骨长导致的系统性低估，族间净空不再依赖 70px 缓冲兜底；
  - **垂直自洽**（AUD-178）：`H` 由「相邻行子骨垂距 + 行高 + 净距」的必要条件反解，并按需动态收窄行分布（`tSpan ∈ [0.20, 0.60]`）。旧线性式 `140+48n+30g` 在每行挂子骨时必然违反行距（实测 rows=3..8 全部违反）；
  - **半区自治 + 剪刀错位**（AUD-179）：上下半区各自按 DSL 顺序做保序前缀和，共轭族在脊椎上错开 $\delta\in[40,90]$px，永不共点；
  - **under-line 内嵌范式**（AUD-180，**默认关闭**）：无子骨的水平骨可把文字居中压线作下划线（`labelPlacement: 'top'`），族宽下降 26%–38%；为保持与初始版本一致的「末梢背外侧块状文字」分形观感，默认关闭，仅保留 `T.inlineLeafLabels` 开关；
  - **分形观感回归**（R29 复盘的二次校订）：中骨恢复左右交替羽状（`side = (-1)^j`）、行在骨上严格等距、大骨**全局谐波等长**（四骨末端标题框齐平），并修正「族包络用权重 t、渲染用均分 t」的口径漂移与「剪刀错位未按对校正」；
  - **初始渲染溢出画布修复**：撤销 `fitView({ when: 'overflow' })` —— 该参数会让初次渲染不缩放（内容溢出，需点「整理布局」才恢复），恢复 `always`；
  - **缩放闭环**（AUD-176）：`fitView` 等价缩放比反查有效字号，低于 9px 时逐档收紧族距重排（≤3 轮），仍不达标则输出 `meta.warnings`；`fitView` 增加 `when: 'overflow'`，小图不再被放大成巨型字号；
  - **门禁落地**（AUD-175 / AUD-181）：`test:fishbone` 由 7 项弱断言升级为 G1–G7 共 44 项（结构完整性 / 半区保序 / 族净空 / 行距必要式 / 零文本重叠 / 零穿刺 / 剪刀错位 / 缩放可读 / 确定性 / 分形保真 / 鱼头禁入 / 边界），文本度量统一走 `estimateTextWidth`，并纳入 `build` 与 CI；
  - **Linter 语义门禁**（AUD-182）：`fishbone` 前置校验执行卡片真源已声明的建模约束（`Title` 必填、大骨 >8/>6 分级告警、层级 >4、单族中骨 >8、大骨标签 >16 字）；
  - **文档与仓库卫生**（AUD-183）：数学规范第三章整体重写为现行口径（消除编号重复与拼接残缺）、`PROJECT_INDEX` 补登 R28/R29、清理 `scratch/` 探针；
  - **实测收益**（1200×800，回归分形观感后的最终值）：经典 4 大骨 61.6%→**72.1%**（有效字号 8.00→**9.02px**）、长文本 4 大骨 66.8%→**69.3%**（8.30→**8.66px**）、5M1E 6 大骨 36.6%→38.6%（仍不可读，按设计 warning 并建议更大画布）；三用例文本重叠 0 / 连线穿刺 0 / 鱼头越界 0，四根大骨等长 360.2px。
- **MCP 容器内 Flow 诊断缺失阻断出图**（R25 / AUD-155）：通过 esbuild 将 FlowParser 诊断逻辑打包为独立产物 `mcp-server/lib/flow_lint.mjs`，消除对开发目录的硬性依赖；诊断异常时自动降级放行，保证主图表渲染链路通畅
- **MCP JSON 拦截示例误匹配**（R25 / AUD-156）：修复图表匹配逻辑，原生图表误传 JSON 时正确返回本类型 DSL 示例，避免误导为 VChart 外壳
- **MCP 反向代理地址解析与持久化**（R25 / AUD-157）：规范多级反代头（`X-Forwarded-*`）解析，防止逗号分隔非法 URL；收紧 `trust proxy` 默认信任域；图表标题采用 `display_name`；挂载 `iqs-renders` 命名卷保障历史图片访问稳定
- **PDPC 全景截图残缺根治、关联图因果代数纯数学重构与确定性布局**（R28 / AUD-170~174）：
  - PDPC 图 Dagre 异步布局与 fitView 时序脱节根治（AUD-170）：消除 `graph.render()` 与 `fitView` 异步竞争，等待布局 Promise 完成并在无头模式下瞬发 `duration: 0`；
  - G6 截帧双帧同步刷新（AUD-171）：`PDPCDiagram` 与 `RelationDiagram` 在 `getDataURL` 导出前等待渲染管线双帧刷新，杜绝导出未提交的脏帧与放大残缺帧；
  - ECharts 无头动画清零（AUD-172）：`ParetoDiagram`、`HistogramDiagram`、`ScatterDiagram`、`BasicDiagram` 在 `mode=headless` 时统一关闭 1000ms 入场缓动，消除抓取到生长中途残缺帧风险；
  - 关联图纯数学因果代数拓扑算法重构（AUD-173~174）：彻底废除收敛漫长且不可预测的异步物理退火力导向（Fruchterman）与 Radial 插件，基于因果净通量 $C(v) = \deg^+(v) - \deg^-(v)$ 建立**方向型最长链因果分层+质心降交叉算法**与**中央型自适应无碰撞同心椭圆因果极坐标投影算法**，计算耗时 $<2\text{ms}$，坐标确定性直出注入 G6，全景无截断、无重叠。
- **MCP 渲染引擎稳定性加固与确定性渲染**（R27 / AUD-165~169）：
  - 进程信号捕获与优雅退出（AUD-165）：监听 `SIGINT` / `SIGTERM` / `SIGHUP` 信号主动注销常驻 Chromium，彻底杜绝孤儿进程与内存泄漏；
  - Tier-2 内存桥接 12s 硬超时与熔断自愈（AUD-166）：为 `page.evaluate(renderIQSChart)` 增加超时机制，超时自动重置 `warmPagePromise` 并释放串行队列，防止单任务挂死引发全服务雪崩；
  - 无头模式绝对确定性渲染（AUD-167）：注入全局 CSS 强制动画与过渡清零（`animation-duration: 0s`），鱼骨图等 G6 图表在无头模式下 `fitView` 动画时长强制归零，彻底消灭中间过渡帧截取抖动；
  - Tier-1 引入 `@resvg/resvg-js` 可选依赖（AUD-168）：在兼容单页 Canvas 的基础上支持 Rust 原生纯 CPU 毫秒级直出；
  - 新增 MCP 核心包新鲜度校验门禁 `npm run check:mcp-lint-fresh`（AUD-169），并在 CI 流水线与 `npm run build` 中强制执行。
- **MCP 通用 Linter 解耦与 14 CORE 全量诊断 + 双模分层渲染引擎**（R25 / AUD-158）：主调度器彻底移除硬编码特判；多段协议通用化自动合并 `.agent.md`、去重并修正章节序号；`getToolDslDescription` 100% 源自 L0 真源（消除 `pareto`/`control` 错误 `Data:` 引导）；抽象 `linters.js` 覆盖全部 14 个 CORE 图表前置校验；升级双模分层渲染引擎（Tier-1 `flow` 进程内原生 SVG 直出 + Tier-2 常驻 Browser 连接池与 `window.renderIQSChart` 内存桥接）；收敛 `App.tsx` 重复内联解析器与 `FlowEditor` 动态 `Attr active` 属性面板
- **Flow 子流程框底色**与画布 `panelColor` 一致；标题用 `textColor`；超宽时衬底也用面板色+子流程描边，不再用深色底板配白字
- **Flow 走廊假合并**：A1 前瞻（朝向侧占用预留），合规不再抢并行网关底边；物理/化学同出共干
- **Flow N/DATA 水平原则**：虚线先分配、锁定依附节点**右入口**，0 折弯水平对接（`g7-doc-horizontal`）
- **Flow 扩展格**：恢复垂直射线松弛（同列挡点右移一格）+ 贯穿行列至少 2 绘制格；通道含列内/行内格缝与节点四周走廊中线
- **Flow 出入口既入又出**（R23 / AUD-147·148）：A1 全节点硬互斥；同向复用共几何中点（A3/M8）

- **Flow 子流程未走同一套 3×3 范式**（R23 / AUD-149·150·151）：内部按 CellOrder + 迷你绘制格（节点 + 走廊）+ 独立标题带 + 混合内核布线，不再用文档级 Layout 横排、不再中心穿心
- **Flow 连线"缺目标"**（R22 / AUD-141·142·143）：目标端口背向 + 路径回折**穿过源节点自身盒** —— 现把源/目标自身盒纳入碰撞判定（收缩 3px，stub 段自然豁免）、`countBends` 补 180° 回折符号项、端口代价加**背向罚**
- **Flow 子流程框尺寸**（R22 / AUD-138 续）：布局层与渲染层共用内部格数真源；R23 起改为 3×3 绘制格而非 `cols×140` 空壳
- **Flow 路径缺线风险**（R22 / AUD-144·145）：新增 `solveRouteHybrid` 两级求解 —— 严格档优先、不可达时按 **A4 软约束**放宽兜底（宁可穿盒，不可缺线）；渲染与端口评估共用同一编排，消除代价口径分叉
- **Flow 门禁与断言口径**（R22 / AUD-146）：新增 `assert_flow_geometry.ts`（G1–G5 / 12 断言，含**注入回归**自证）；边路径加语义锚点 `data-edge`，修正 3 处按颜色计数 / 绑死色值 / 测错对象的断言

## [3.5.3-ildr] — 2026-08-11

### 新增

- IQS-DSL v1.1 完整细粒度语法手册（`docs/IQS_DSL_V1_MANUAL.md`）与注册表/校验门禁  
- 软著与发行文档包（`docs/软著与发行/**`）  
- 产品品牌：IQS favicon/方标；实验室主 LOGO 同步官方 `LUXI LAB.svg`  
- Obsidian 平行归档：`智控-IQS`  
- MCP：Native `render_scatter` / `render_radar`；瘦声明与 CORE/RELIEF；修复资源双重注册  
- Docker 多阶段构建、`.env` 示例与入口默认值  

### 修复

- Headless BASIC 忽略传入 DSL  
- AI 生成 Pareto/Histogram/Control 错误挂到 BASIC 子类型  
- 散点/直方/排列等注释与 `Show3D`/`ShowGrid` 对齐  

### 变更

- 根目录 `IQS_DSL_MANUAL_LEGACY.md` 改为 v1 手册入口  
- `package.json` 版权声明与专有软件定位对齐（见 COPYRIGHT）  

## [3.5.2] — 更早

- 关联图、基础图、矩阵布局规范与导出倍率等（详见 Git 历史）

---

[3.5.3-ildr]: https://github.com/itrilogy/smart-qc-studio
