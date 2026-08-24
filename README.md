<p align="center">
  <img src="./docs/assets/readme-banner.svg" alt="Intelligent QC Studio — IQS" width="920" />
</p>

<p align="center">
  <img src="./docs/assets/iqs-mark.svg" width="72" height="72" alt="IQS 产品标识" />
  &nbsp;&nbsp;&nbsp;
  <img src="./docs/assets/luxi-lab.svg" width="72" height="72" alt="鹿溪联合创新实验室 LUXI LAB" />
</p>

<h1 align="center">澄矩 · ChengJu（IQS）</h1>

<p align="center">
  <strong>澄矩 · 工业智能质量控制工作站</strong><br/>
  <em>源清流澈，行止应矩</em><br/>
  自研 <strong>IQS-DSL</strong> + AI 推理 + MCP 渲染 · 工业级 QC 图表平台
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.5.3--ildr-0D5E42?style=flat-square" alt="version" />
  <img src="https://img.shields.io/badge/IQS--DSL-v1.1-00D2FF?style=flat-square" alt="dsl" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="react" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" alt="vite" />
  <img src="https://img.shields.io/badge/MCP-CORE%20%2B%20RELIEF-orange?style=flat-square" alt="mcp" />
  <img src="https://img.shields.io/badge/license-Proprietary-red?style=flat-square" alt="license" />
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-产品标识">产品标识</a> ·
  <a href="#-核心能力">核心能力</a> ·
  <a href="#-文档">文档</a> ·
  <a href="#-知识产权与版权">版权</a>
</p>

---

## 产品标识

| | 标识 | 路径 |
|:---:|:---|:---|
| **产品** | <img src="./docs/assets/iqs-mark.svg" width="48" alt="IQS" /> | [`public/brand/iqs-mark.svg`](./public/brand/iqs-mark.svg) · favicon：[`public/favicon.svg`](./public/favicon.svg) |
| **出品方** | <img src="./docs/assets/luxi-lab.svg" width="48" alt="LUXI LAB" /> | [`public/brand/luxi-lab.svg`](./public/brand/luxi-lab.svg)（官方源：`鹿溪联合实验室/LUXI LAB.svg`） |
| **横版字锁** | <img src="./docs/assets/iqs-logo.svg" width="280" alt="IQS Logo" /> | [`public/brand/iqs-logo.svg`](./public/brand/iqs-logo.svg) |

**色板（与见鹿 / 听默对齐）**

| 名称 | 色值 | 用途 |
|:---|:---|:---|
| 鹿溪绿 | `#0D5E42` | 产品标底、品牌主色 |
| 源启白 | `#F5F7FA` | 面板反白 |
| 进化蓝 | `#00D2FF` | 溪流、源启星、强调 |

**IQS 方标语义**：控制图折线 + 限线（QC/SPC）· S 形溪流（数据流动）· 源启星（智能生成）。

品牌说明：[`public/brand/README.md`](./public/brand/README.md) · Obsidian 平行归档：`departments/lab/智控-IQS/`

---

## 项目简介

**澄矩 · ChengJu（Intelligent QC Studio / IQS）** 是面向质量管理（QC）小组活动的 Web 端智能化图表工作站。通过 **自研领域特定语言 IQS-DSL** 与大语言模型推理，将「自然语言 / 专业 DSL」转化为符合 QC 方法论的图表成果，并支持 MCP 标准化工具调用与无头高清导出。

- 业务遵循 **T/CAQ 10201** 质量管理小组活动相关准则与 **PDCA** 图种覆盖  
- **CORE**：13 类原生专业图（鱼骨、排列、直方、控制、散点、雷达、关联、矢线、PDPC、矩阵、图矩阵、亲和、基础图）  
- **RELIEF**：Mermaid / VChart 类型外救济（不替代 QC 终稿专业图）  
- 出品标识：**鹿溪联合创新实验室** · 著作权人见文末  

---

## 核心能力

| 能力 | 说明 |
|:---|:---|
| **IQS-DSL v1.1** | 统一 Shell + Body 代数；细粒度手册与 `dsl/kinds.json` 注册表 |
| **双引擎渲染** | 统计图 ECharts；逻辑图 G6 / Canvas 等 |
| **AI 生成 DSL** | 配置驱动（DeepSeek 等 OpenAI 兼容 API） |
| **MCP 服务** | Stdio / SSE；瘦声明 + 按需 `protocol://` 资源；Puppeteer ILDR 无头渲染 |
| **导出** | PNG / PDF；无头桥接 `captureIQSChart` |
| **发行与软著材料** | [`docs/软著与发行/`](./docs/软著与发行/00_文档索引.md) 全套说明书与检查清单 |

### 架构一览

```text
┌──────────────────────────────────────────────────┐
│  UI  Vite 6 · React 19 · Tailwind · IQS / LUXI 标识 │
├──────────────────────────────────────────────────┤
│  IQS-DSL v1  解析 · kinds 注册表 · lint / validate   │
├─────────────────────┬────────────────────────────┤
│  统计图 ECharts      │  逻辑图 G6 / Canvas / …      │
├─────────────────────┴────────────────────────────┤
│  AI  aiService  ·  导出  BaseDiagramRef             │
├──────────────────────────────────────────────────┤
│  MCP Server  CORE/RELIEF tools · Puppeteer ILDR    │
└──────────────────────────────────────────────────┘
```

### 图种（CORE）

| 场景 | kind |
|:---|:---|
| 根因 / 5M1E | `fishbone` |
| 关键少数 | `pareto` |
| 分布 / Cp·Cpk | `histogram` |
| SPC 稳定性 | `control` |
| 相关回归 | `scatter` |
| 多维对比 | `radar` |
| 多重因果 | `relation` |
| 关键路径 | `arrow` |
| 预案分支 | `pdpc` |
| 多对多矩阵 | `matrix` |
| 多因子图矩阵 | `matrixPlot` |
| KJ 亲和 | `affinity` |
| 柱线饼 | `basic` |

完整语法 → [**IQS-DSL v1 手册**](./docs/IQS_DSL_V1_MANUAL.md)

---

## 快速开始

### 环境

- **Node.js 20+**
- 现代浏览器（Chrome / Edge 推荐）
- （可选）Docker · 大模型 API Key

### Docker（推荐）

```bash
git clone https://github.com/itrilogy/smart-qc-studio.git
cd smart-qc-studio
cp .env.example .env          # 填写 API_KEY、AI_ACTIVE_PROFILE
docker compose up -d --build
```

| 端口 | 服务 |
|:---|:---|
| **5173** | Web 工作站 |
| **3000** | MCP SSE |

浏览器打开：<http://localhost:5173>

### 开发模式

```bash
npm install
npm run validate:dsl    # DSL / MCP 清单门禁
npm run dev             # http://localhost:5173
```

若提示 `Port 5173 is in use`：使用终端给出的备用端口（如 5174），或结束旧 Vite 进程后重启。

### MCP Server

```bash
# 需先保证 Web 引擎可访问（默认 IQS_BASE_URL=http://localhost:5173）
npm run mcp:stdio       # 本地 AI 客户端
npm run mcp:sse         # http://localhost:3000/sse
```

| MCP 资源 | 说明 |
|:---|:---|
| `protocol://dsl/v1` | 语言红线摘要 |
| `protocol://governance` | CORE / RELIEF |
| `protocol://segments/iqs_native/{kind}` | 单图完整语法 + 示例 |

### 常用脚本

| 命令 | 说明 |
|:---|:---|
| `npm run dev` | 开发服务器 |
| `npm run build` | 校验 + 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run validate:dsl` | 语法手册 / MCP 覆盖校验 |
| `npm run sync-tools` | 同步 `mcp_tools.json` → `public/` |
| `npm run mcp:stdio` / `mcp:sse` | 启动 MCP |

---

## 项目结构

```text
smart-qc-studio/
├── App.tsx / index.tsx          # 应用入口与编排
├── components/                  # *Diagram + *Editor
├── dsl/                         # kinds 注册表 · Shell · lint
├── services/aiService.ts        # AI 生成 DSL
├── public/
│   ├── favicon.svg              # 浏览器图标
│   ├── brand/                   # IQS + 鹿溪实验室标识（运行时）
│   ├── config.json / config.js  # AI 与运行时配置
│   └── mcp_tools.json           # 工具清单（由 sync-tools 同步）
├── mcp-server/                  # MCP 服务 V2.7
├── protocol/                    # governance · DSL_V1 · segments
├── docs/
│   ├── assets/                  # README 插图与 LOGO 副本
│   ├── IQS_DSL_V1_MANUAL.md     # DSL 细粒度手册 ★
│   ├── 软著与发行/               # 软著 + 发行文档包 ★
│   └── USER_MANUAL_*.md         # 分图操作手册
├── COPYRIGHT.md · NOTICE.md · CHANGELOG.md
├── Dockerfile · docker-compose.yml
└── package.json                 # 3.5.3-ildr · UNLICENSED
```

---

## 文档

| 文档 | 说明 |
|:---|:---|
| **[软著与发行 · 索引](./docs/软著与发行/00_文档索引.md)** | 登记表、设计/用户说明书、安装发行、检查清单 |
| **[IQS-DSL v1 完整手册](./docs/IQS_DSL_V1_MANUAL.md)** | 13 kind 指令表 / Body / 示例 / 反例 |
| [IQS-DSL 架构 SPEC](./docs/IQS_DSL_V1_SPEC.md) | 分层与权威序 |
| [安装部署与发行指南](./docs/软著与发行/04_安装部署与发行指南.md) | 源码 / Docker / 验收 |
| [DSL 入口](./DSL_SYNTAX_MANUAL.md) | 重定向至 v1 手册 |
| [协议治理](./protocol/governance.md) | CORE / RELIEF |
| [分图用户手册](./docs/) | `USER_MANUAL_*.md` |
| [CHANGELOG](./CHANGELOG.md) | 版本变更 |
| [COPYRIGHT](./COPYRIGHT.md) · [NOTICE](./NOTICE.md) | 版权与第三方 |

---

## 配置摘要

```bash
# .env（勿提交真实密钥）
API_KEY=your-key
AI_ACTIVE_PROFILE=deepseek_public
```

`public/config.json` 中配置模型 `endpoint` / `model` profiles。  
Docker 启动时由 `docker-entrypoint.sh` 注入 `dist/config.js`。

---

## 知识产权与版权

| 类型 | 内容 | 状态 |
|:---|:---|:---|
| 软著 ×2 | ① DSL 图表引擎 **V3.5** ② MCP 服务 **V2.7** | 材料见 `docs/软著与发行/` |
| 发明专利 ×2 | DSL 生成方法 · LLM 自纠正等 | 技术交底另册 |

**著作权人：江西省上饶市烟草专卖局（公司）**  
开发：信息中心 · 品牌协作标识：鹿溪联合创新实验室  

本软件为 **专有软件（Proprietary / UNLICENSED）**。未经书面授权，不得复制、分发或用于约定外用途。  
第三方开源组件见 [`NOTICE.md`](./NOTICE.md)。

---

## 贡献与支持

内部项目：需求与缺陷请通过单位既定流程反馈至 **信息中心 / IQS 项目组**。  
发行验收清单：[`docs/软著与发行/09_发行检查清单.md`](./docs/软著与发行/09_发行检查清单.md)。

---

<p align="center">
  <img src="./docs/assets/iqs-mark.svg" width="40" alt="IQS" />
  &nbsp;
  <img src="./docs/assets/luxi-lab.svg" width="40" alt="LUXI LAB" />
</p>

<p align="center">
  <sub>
    © 2026 江西省上饶市烟草专卖局（公司）信息中心<br/>
    澄矩 · ChengJu v3.5.3-ildr · 鹿溪联合创新实验室 · 源清流澈，行止应矩
  </sub>
</p>
