# Changelog

本文件记录面向发行的用户可见变更。格式参考 Keep a Changelog。

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
