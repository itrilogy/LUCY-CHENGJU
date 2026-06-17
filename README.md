# IQS (Intelligent QC Studio) — DSL 图表引擎系统

> 🏆 面向烟草商业 QC 活动的领域特定语言与 AI 融合制图平台 | v3.5.2-ildr

[![TypeScript](https://img.shields.io/badge/TypeScript-20,931行-blue)](./)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF)](https://vitejs.dev)
[![MCP](https://img.shields.io/badge/MCP-52_tools-orange)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/license-Proprietary-red)](./LICENSE)

---

## 📖 项目简介

IQS 是一款面向质量管理（QC）小组活动的 Web 端智能化图表生成与分析工作站。系统通过**自研 DSL（领域特定语言）语法引擎**与大语言模型推理技术的融合，实现了「自然语言描述业务需求 → 自动生成专业 QC 图表」的 Vibe Coding 体验。

系统严格遵循 **T/CAQ 10201-2024《质量管理小组活动准则》**，覆盖 PDCA 全流程 **15 种**图表类型，内置 QC 专业统计逻辑（控制图 Nelson/Western-Electric 双判异引擎、排列图二八分析、直方图过程能力指数 Cp/Cpk 计算等）。

---

## 🎯 核心创新

| 创新点 | 说明 |
|:---|:---|
| **自研 DSL 语言体系** | 15 种图表类型的统一 DSL 语法——每种图表以「专家逻辑 + 语法约束 + 范式示例」三元组锁定于单一真实源（52 工具定义、104KB JSON） |
| **MCP Server 标准化服务** | 基于 Model Context Protocol（Anthropic 开源标准，已捐赠 Linux Foundation）的 52 工具图表渲染微服务，支持 Stdio/SSE 双传输 |
| **Vibe Coding 行业首次验证** | 「自然语言 → LLM 生成 DSL → MCP render() 校验 → Puppeteer 无头渲染」闭环，秒级生成专业 QC 图表 |
| **Canvas/SVG 双引擎自适应** | 统计图表走 ECharts 5 Canvas（高性能），逻辑图表走 G6 SVG（可缩放交互） |

---

## 📊 工程规模

| 模块 | 指标 | 数值 |
|:---|:---|:---|
| Web 前端 | TypeScript/TSX 源文件 | **39 个** |
| | 代码行数 | **20,931 行** |
| | 核心组件 | 15 Diagram + 15 Editor + 3 Layout |
| MCP Server | 核心服务 | **475 行** JS |
| | 工具定义 | **1,259 行** JSON（**104KB**） |
| | 注册工具 | **52 个** MCP tools |
| 协议规范 | 协议段文件 | **15 个** Markdown |
| 用户文档 | 图表手册 | **15 个** Markdown |

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────┐
│        Industrial Light OS UI 框架       │
│    Vite 5 + React 18 + Tailwind CSS      │
├─────────────────────────────────────────┤
│   DSL Parser → AST → Render Router      │
│   15 个 parseXxxDSL() 类型安全解析函数    │
├──────────────────┬──────────────────────┤
│  Canvas 引擎      │  SVG 引擎             │
│  ECharts 5        │  G6                   │
│  统计型图表（7种）  │  逻辑型图表（8种）     │
├──────────────────┴──────────────────────┤
│   BaseDiagramRef 统一导出接口             │
│   PNG / JPG / PDF / SVG                  │
├─────────────────────────────────────────┤
│   MCP Server（52 tools, Stdio + SSE）    │
│   + Puppeteer Headless Render            │
├─────────────────────────────────────────┤
│   AI Inference（DeepSeek / Qwen3-VL-8B） │
└─────────────────────────────────────────┘
```

---

## 🚀 快速开始

### Docker 部署（推荐）

```bash
git clone https://github.com/itrilogy/smart-qc-studio.git
cd smart-qc-studio
docker-compose up -d
# 浏览器打开 http://localhost:5173
```

### 开发模式

```bash
npm install
npm run dev
```

### MCP Server 启动

```bash
# Stdio 模式（Claude Desktop / VS Code Copilot）
cd mcp-server && node index.js --transport=stdio

# SSE 模式（远程 HTTP）
cd mcp-server && node index.js --transport=sse --port=3000
```

---

## 📂 项目结构

```
smart-qc-studio/
├── App.tsx                    # 主应用入口（1,005行）
├── types.ts                   # 类型系统（830行，QCToolType 16枚举+15套接口）
├── constants.tsx              # 工具配置+默认DSL预设（954行）
├── components/
│   ├── *Diagram.tsx           # 15个图表渲染组件
│   ├── *Editor.tsx            # 15个编辑器组件
│   └── layout/                # 布局框架
├── services/aiService.ts      # AI推理服务
├── utils/exportUtils.ts       # 多格式导出工具
├── mcp-server/
│   ├── index.js               # MCP Server核心（475行）
│   ├── mcp_tools.json         # 52工具定义（104KB）
│   └── renders/               # 无头渲染验证截图（20+张）
├── protocol/segments/         # 15个协议段规范文件
├── docs/                      # 15个用户手册
└── docker-compose.yml         # Docker部署配置
```

---

## 📖 文档

| 文档 | 说明 |
|:---|:---|
| [DSL 全量语法手册](./DSL_SYNTAX_MANUAL.md) | 15 种图表类型完整 DSL 语法参考 |
| [Agent 交互准则宣示录](./IQS_DSL_AGENT_MANIFESTO.md) | AI Agent 调用规范 v3.0 |
| [协议全局治理规则](./protocol/governance.md) | 权威性等级协议与冲突处理准则 |
| [用户手册](./docs/) | 15 个图表类型操作手册 |

---

## 📄 知识产权

| 类型 | 内容 | 状态 |
|:---|:---|:---|
| 软件著作权 ×2 | IQS DSL 图表引擎系统 V3.5 + IQS MCP Server V2.7 | 拟申报（2026.05） |
| 发明专利 ×2 | DSL 图表生成方法及系统 + LLM 自纠正生成方法 | 技术交底书已备妥（2026.05） |
| 团体标准草案 ×1 | 工业质量管理小组活动数字化表达标准 | 起草中 |

---

## ⚖️ 许可证

本项目为**江西省上饶市烟草专卖局（公司）信息中心**自主研发成果。源代码当前为私有（Private），知识产权归单位所有。未经授权不得复制、分发或使用。

---

© 2026 江西省上饶市烟草专卖局（公司）信息中心 | 洪光华 | IQS v3.5.2-ildr
