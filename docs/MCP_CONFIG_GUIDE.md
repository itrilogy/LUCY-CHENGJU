# IQS Chart Rendering MCP Server 配置指南 🛠️

本指南将指导您如何在支持 Model Context Protocol (MCP) 的 AI 客户端中集成 Smart QC Studio 的图表渲染服务。新版本支持 **40+ 个专项工具**，并提供 SSE 渲染增强方案。

## 1. 准备环境

- **Node.js**: v18.0.0+
- **Google Chrome**: 需安装在默认路径。
- **运行中的 Web 服务**: 默认 `http://localhost:12000`。

## 2. 客户端配置 (Claude Desktop)

### 2.1 Stdio 模式 (本地)
编辑 `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "iqs-chart-server": {
      "command": "node",
      "args": ["/绝对路径/mcp-server/index.js"],
      "env": {
        "IQS_BASE_URL": "http://localhost:12000"
      }
    }
  }
}
```

### 2.2 SSE 模式 (推荐，远程/兼容性更佳)
SSE 模式能够解决部分软件（如某些 IDE 插件或客户端）无法渲染 Base64 图片的问题。

1. **服务端启动**:
   ```bash
   PORT=12001 npm run start:sse
   ```
2. **客户端配置**:
   ```json
   {
     "mcpServers": {
       "iqs-remote": {
         "url": "http://服务器IP:12001/sse"
       }
     }
   }
   ```

## 3. 工具矩阵

AI 客户端将识别到以下工具分类：

- **`render_[core_type]`**: 14 种 QC 核心组件（如 `render_fishbone`, `render_spc`）。
- **`render_mermaid_[type]`**: Mermaid 专用工具（如 `render_mermaid_flowchart`, `render_mermaid_gantt`）。
- **`render_vchart_[type]`**: VChart 专用工具（如 `render_vchart_sankey`, `render_vchart_bar`）。

## 4. 渲染特性与兼容性 (ILDR 架构)

新版本引入了 **ILDR (Internal Logic Driven Rendering)** 架构，针对渲染质量与布局精准度进行了重大升级：
1. **3X 高清渲染**: 默认启用 `deviceScaleFactor: 3` 并配合组件内部的高清导出逻辑，渲染结果极其清晰。
2. **解决布局塌陷**: 废弃了不可预测的“视口截图”模式，改为通过 `captureIQSChart` 协议触发组件内部渲染。这彻底解决了散点图、排列图等复杂组件在 Puppeteer 下内容缩在一起（100px 问题）的顽疾。
3. **尺寸 100% 对齐**: 支持显式指定 `width` 和 `height`，组件会在导出瞬间自动 Resize 到目标画幅，确保图片比例与请求完全一致。
4. **SSE 单模返回 (URL Only)**: 
   - 行为变更：在 SSE 模式下，AI **仅返回**封装了远程图片外链的文本消息。
   - 优势：彻底避免了部分 AI 客户端无法解析大体积 Base64 的缺陷。

## 5. 环境变量说明

- `IQS_BASE_URL`: 指定 Smart QC Studio 的网页访问地址（默认 localhost:12000）。
- `IQS_SERVER_PUBLIC_URL`: (可选) 手动指定 SSE 服务器的对外访问根地址，用于生成 Markdown 外链。如果不指定，系统将尝试自动探测本机 IP。

---
*Smart QC Studio - 运维文档*
t)

为了简化生产环境的部署，推荐将 Web 应用与 MCP Server 打包在同一个 Docker 容器中。

### 6.1 镜像构建 (镜像是统一的)
```bash
docker build -t smart-qc-studio .
```

### 6.2 生产级部署与逻辑
项目支持通过 **Docker Compose** 实现一键混合编排部署。

1. **一键启动**:
   ```bash
   # 确保项目根目录有 .env 文件
   docker compose up -d --build
   ```

2. **动态配置**:
   如果您需要更换 API Key，只需修改 `.env` 并运行 `docker compose up -d`。系统将通过 **运行时注入 (Runtime Injection)** 技术自动重写配置并即时生效。

3. **端口说明**:
   - **12000 端口**: 网页分析界面访问地址。
   - **12001 端口**: MCP SSE 专家服务接入点。

4. **内部逻辑**:
   - **混合编排**: 容器内部同时运行前端预览与 MCP SSE 服务，环境完全一致。
   - **闭环通信**: MCP Server 直接通过容器内网地址 `http://localhost:12000` 访问前端，性能极佳。

---

## 🙋 技术解答：推理与输出逻辑

**问题：** 逻辑推理是本项目 AI 引擎完成，还是客户端 AI 完成？

**解答：**
根据目前的架构（基于 MCP 协议），**推理工作由客户端 AI（即您正在对话的 Claude/GPT 等）完成**，而**本项目提供的是执行绘图的“渲染引擎”**。

具体流程如下：
1. **意图识别**: 您向客户端 AI 提出要求（例如：“帮我画个质量异常的鱼骨图”）。
2. **DSL 生成 (推理阶段)**: 客户端 AI 基于 `IQS_DSL_AGENT_MANIFESTO.md` 定义的规则，**自行推理**并生成符合语法的 DSL 字符串。
3. **工具调用**: 客户端 AI 通过 MCP 协议调用本项目提供的 `render_fishbone` 工具。
4. **渲染输出 (本项目工作)**: 项目中的 MCP Server 启动 Puppeteer，将 DSL 传入无头浏览器，利用项目内置的 React 组件渲染出图并返回给客户端。

**结论：** 
- **客户端 AI** = “大脑”（负责思考、决定画什么、写代码）。
- **本项目 MCP Server** = “手”（负责精准执行、渲染视觉成果）。
