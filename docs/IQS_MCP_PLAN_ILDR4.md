# MCP 架构进化：ILDR 4.0 (子类型增强的声明式清单)

## 1. 核心愿景：全链路子类型对齐 (Sub-type Alignment)
针对 Mermaid 和 VChart 等具备多种变体（子类型）的工具，通过在清单中显式声明 `parent_type` 和 `sub_type`，确保 **“AI 指令 -> 推理逻辑 -> 前端组件”** 三位一体的精确指向。

## 2. 核心修订路径 (ILDR 4.0 Sub-type)

### 第一步：清单 Schema 升级 (`mcp_tools.json`)
- **新增字段**:
    - `parent_type`: 顶级类别（如 `mermaid`, `vchart`, `iqs_native`）。
    - `sub_type`: 细分子类（如 `flowchart`, `gantt`, `bar`, `sankey`）。
    - `inference_key`: 对应 `chart_spec.json` 中的语法键名。
    - `render_engine`: 指定渲染引擎（`echarts`, `vchart`, `g6`, `mermaid`）。
- **目标**: 为每个原子化工具提供完整的“身份准考证”。

### 第二步：同构推理路由 (Inference Routing)
- **重构 `aiService.ts`**:
    - 实现通用的 `generateDSL(prompt, parentType, subType)` 函数。
    - 根据清单中的 `inference_key` 自动抓取 `chart_spec.json` 中的专项规则和 Examples。
- **目标**: 将硬编码的 `if/else` 逻辑转换为基于配置的动态路由。

### 第三步：渲染参数透传 (Render Parameterization)
- **`index.js` 逻辑升级**:
    - 在调用 Puppeteer 时，URL 参数由单维变的更为立体：`?type=${parent_type}&subType=${sub_type}&dsl=${encodedDSL}`。
- **前端 `App.tsx` 适配**:
    - 接收 `subType` 参数，并将其透传给对应的 React 组件（如 `VChartDiagram`），使其能够通过 `subType` 切换内部渲染配置。

## 3. 典型的清单项设计示例
```json
{
  "name": "render_vchart_sankey",
  "parent_type": "vchart",
  "sub_type": "sankey",
  "display_name": "桑基图流向专家",
  "description": "智能流程/能量/资金流向渲染器。输入节点与流量数据，自动生成比例合理的桑基路径。",
  "expertise": "能源流向分析, 供应链价值流建模",
  "inference_key": "vchart_sankey",
  "render_engine": "vchart"
}
```

---
*IQS Protocol Council - 2026.03*
 Riverside,
