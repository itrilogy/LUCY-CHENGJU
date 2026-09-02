# Changelog

本文件记录面向发行的用户可见变更。格式参考 Keep a Changelog。

## [Unreleased]

### 新增

- 第 14 个 CORE kind **IQS-Flow**（泳道 / BPMN 子集 / 自研 SVG）：字典-索引、正交走线、T2 守护位移、MCP `render_flow`
- Flow 编辑器：LUXI LAB 侧栏、配色方案、`Grid: dashed|solid`、Attr active 右下角有值标注
- `npm run test:flow` 解析 / SVG / BPMN / 主干序 / 格内序回归

### 变更

- AI：本地 `.env` 的 `API_KEY` 优先于 `public/config.js`；仓库内 `config.js` 不再放置密钥
- README 与 14 kind / Flow / AI / MCP 现状对齐
- 默认端口 Web **12000** / MCP **12001**（`npm run dev|preview|mcp:*` 与 Docker 一致）
- 外部模型 `deepseek-v4-flash`；内网模型 `qwen3.5-9b`

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

- 根目录 `DSL_SYNTAX_MANUAL.md` 改为 v1 手册入口  
- `package.json` 版权声明与专有软件定位对齐（见 COPYRIGHT）  

## [3.5.2] — 更早

- 关联图、基础图、矩阵布局规范与导出倍率等（详见 Git 历史）

---

[3.5.3-ildr]: https://github.com/itrilogy/smart-qc-studio
