# IQS MCP Server Token 消耗优化方案 (ILDR 2.0 预研) 🚀

## 1. 背景与问题诊断 (Context & Diagnosis)

目前在 MCP 会话中，单次生成图表的 Token 消耗维持在 **250,000 (25w)** 左右，这已达到甚至超过了主流模型（如 GPT-4 / Gemini Pro）单次会话的上下文容量上限。

### 1.1 核心病因：元数据“指数级”堆叠
在 `mcp-server/index.js` 的 `ListToolsRequestSchema` 处理器中，系统为 50+ 个工具（Core/Mermaid/VChart）分别注入了完整的专家知识与治理协议。

- **冗余因子 1**: 全局治理文件 (`governance.md`) 在 50 个工具中各出现一次。
- **冗余因子 2**: 针对 Mermaid 和 VChart 分别对应的约 20 个子工具，重复注入了巨大的 `mermaid.md` 或 `vchart.md` 段落文件。
- **冗余因子 3**: 全量 DSL 实战示例（Few-shot）在每个工具描述中全额展示。

### 1.2 消耗模型 (Token Inflation Model)
```text
单次 list_tools 响应体积 ≈ N_tools * (Size_Gov + Size_Segment + Size_Examples)
≈ 54 * (5KB - 8KB) ≈ 270KB - 400KB (约 250,000 Tokens)
```
这导致 AI 会话在初始化阶段就已达到了上下文限制边缘，直接造成对话崩溃、响应缓慢且单次生成成本极高。

## 2. 优化方案：从“全量嵌入”到“按需获取”

本方案遵循 **“无损性能” (Lossless)** 原则，通过重构 MCP 的元数据下发策略，将 Token 消耗降低 80% 以上。

### 项目 A：全局治理规范 (Governance) 原子化
- **现状**: 嵌入在 50+ 个 `tools.description` 中。
- **优化**: 
    1. 从所有工具描述中移除 `fullDescription` 中的治理内容。
    2. 仅在 `ListResources` 中保留 `protocol://governance` 资源。
    3. 工具描述缩减为：“遵循 IQS 全局治理规范 [protocol://governance]”。

### 项目 B：子类型描述的“父级依赖” (Parent-Child Referencing)
- **现状**: 40 个子工具重复携带主 Segment。
- **优化**: 
    1. **Mermaid/VChart 主工具**: 仅在 `render_mermaid` 和 `render_vchart` 工具中保留全量语法与专家逻辑描述。
    2. **专用子工具**: 仅保留“子类型专属指令”描述，通过引导语指引 AI：“对于公共语法，请参考主工具或 protocol://segments 资源”。

### 项目 C：实战示例裁剪 (Few-shot Pruning)
- **优化**: 
    1. `list_tools` 仅下发 1 个基础 Example 确保 AI 明白基本格式。
    2. 全量 Few-shot 示例移至 `ReadResource` 的 `protocol://segments` 中，供 AI 遇到复杂场景时按需读取。

### 项目 D：报错逻辑下沉 (Logic-layer Interception)
- **优化**: 将“禁止传 JSON”等大段防呆警告从描述中移除。在 `CallTool` 后端增加逻辑拦截，若检测到 JSON 输入，动态返回详细的修正建议，而非提前占用 Context 槽位。

## 3. 实施路径 (Implementation Roadmap)

1. **[Phase 1] 元数据瘦身**: 修改 `mcp-server/index.js`，应用引用模式替代嵌入模式。
2. **[Phase 2] 资源增强**: 确保 `protocol://governance` 和 `protocol://segments` 包含完整的专家逻辑、语法规则和 3-5 个进阶 Sample。
3. **[Phase 3] 意图引导**: 在 MCP 服务器的 `README` 或 Prompt 指示中告知 AI：“优先通过阅读资源来获取语法详情，而非依赖工具描述”。

## 4. 预期收益 (Expected Outcomes)

- **Token 降幅**: 单次会话初始消耗预计从 250k 降至 **3k - 5k** (降低约 98%)。
- **响应速度**: `list_tools` 响应数据包缩小 90%，客户端加载显著加快。
- **稳定性**: 减少因 Context 溢出导致的 AI 忽略治理规则的问题。

---
*IQS Protocol Council - 2026.03*
