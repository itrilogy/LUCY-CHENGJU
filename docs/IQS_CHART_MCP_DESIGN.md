# IQS Chart Rendering MCP Server Design Scheme 🎨🛠️

## 1. 目标 (Objective)
通过 MCP (Model Context Protocol) 协议，使 AI 代理能够精准调用 IQS 的 14 种核心组件及扩展的 Mermaid/VChart 图表类型。实现工具级别的物理隔离，并提供极致的渲染兼容性。

## 2. 核心架构 (Enhanced Architecture)

本方案采用 **“渲染增强桥接” (Enhanced Rendering Bridge)** 模式。

```mermaid
graph TD
    User[用户/AI] -- "1. render_vchart_bar(dsl, w, h)" --> MCP[MCP Server (Node.js)]
    MCP -- "2. Launch Headless" --> Chrome[Puppeteer]
    Chrome -- "3. Render & Bridge" --> Vite[App.tsx]
    Vite -- "4. captureIQSChart(w, h, ratio)" --> Chrome
    Chrome -- "5. Return Base64 (Internal)" --> MCP
    
    subgraph SSE_Optimization [SSE 渲染优化]
        MCP -- "6a. Save File" --> Disk[(renders/ folder)]
        Disk -- "6b. Static Serve" --> Express[Express Server]
    end
    
    MCP -- "7. Response: Mode-based (Stdio: Base64 / SSE: URL Link)" --> User
```

### 2.1 渲染增强机制 (ILDR)
- **内部逻辑驱动 (ILDR)**: 废弃了不可控的“视口截图”，通过无头浏览器桥接函数直接从 React 组件内部导出 DataURL。
- **强制尺寸对齐**: 支持在导出瞬间强制执行引擎（ECharts / VChart / G6）的 `resize()`，确保导出画幅与逻辑请求尺寸 100% 对齐。
- **3X 高清采样**: 启用 `deviceScaleFactor: 3` 并配合 `pixelRatio: 3` 导出协议，确保极致清晰度。
- **单模返回 (URL Only)**: 在 SSE 模式下，系统**仅返回**外链文本，解决大体积 Base64 的兼容性痛点。

## 3. 工具规格 (Tool Specifications)

现已实现 **50 个专项工具**，分为三大类：

### 3.1 核心组件 (Core) - 14 种 IQS Native
- `render_fishbone`, `render_pareto`, `render_spc`, `render_affinity`, `render_histogram`, `render_scatter`, `render_relation`, `render_matrix`, `render_matrix_data`, `render_pdpc`, `render_arrow`, `render_basic`, `render_radar`, `render_flow`

> **勘误（2026-09-02）**：`render_vchart` 属救济层（§3.3），不计入 Core。企业体系文件流程图终稿用 `render_flow`，禁止用 `render_mermaid_flowchart` 冒充。

### 3.2 Mermaid 扩展 - 18 种
- 支持 `flowchart`, `sequence`, `gantt`, `class`, `state`, `er`, `journey`, `pie`, `mindmap`, `timeline`, `kanban`, `git`, `requirement`, `quadrant`, `xychart`, `block`, `architecture`, `packet`

### 3.3 VChart 扩展 (AI 友好) - 18 种
- 支持 `bar`, `line`, `pie`, `scatter`, `radar`, `sankey`, `funnel`, `treemap`, `gauge`, `wordcloud`, `sunburst`, `combination`, `waterfall`, `boxplot`, `heatmap`, `liquid`, `rangecolumn`, `circlepacking`

---
*Smart QC Studio - MCP 架构组 归档*
