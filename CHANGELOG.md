# Changelog

本文件记录面向发行的用户可见变更。格式参考 Keep a Changelog。

## [Unreleased]

### 新增

- 第 14 个 CORE kind **IQS-Flow**（泳道 / BPMN 子集 / 自研 SVG）：字典-索引、正交走线、T2 守护位移、MCP `render_flow`
- Flow 编辑器：LUXI LAB 侧栏、配色方案、`Grid: dashed|solid`、Attr active 右下角有值标注
- `npm run test:flow` 解析 / SVG / BPMN / 主干序 / 格内序回归

### 变更

- Flow 打开示例：端口下降改用代数核+缓存，折弯≤2 不再跑可见图 Dijkstra（canonical SVG ~5.5s → ~150ms）
- AI：本地 `.env` 的 `API_KEY` 优先于 `public/config.js`；仓库内 `config.js` 不再放置密钥
- README 与 14 kind / Flow / AI / MCP 现状对齐
- 默认端口 Web **12000** / MCP **12001**（`npm run dev|preview|mcp:*` 与 Docker 一致）
- 外部模型 `deepseek-v4-flash`；内网模型 `qwen3.5-9b`

### 修复

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
