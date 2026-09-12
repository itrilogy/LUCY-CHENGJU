# VChart 渲染故障排查计划 (IQS-VCHART-DEBUG)

针对 VChart 渲染空白（白屏）问题，我将执行以下排查与加固方案：

## 1. 语法规范性评估
我之前提供的“组合分析看板”案例在 VChart 2.0 中虽然逻辑正确，但在某些极简环境下可能因 `data` 声明方式（对象 vs 数组）导致推导失败。
- **修正方向**：提供符合 VChart 2.0 最佳实践的 `data` 定义（外层 `data` 为数组，各系列引用 `dataId`）。

## 2. 增强组件鲁棒性 (VChartDiagram.tsx)
- **Error Boundary**：在渲染函数中使用 `try/catch` 包裹 `VChart` 组件。
- **状态监测**：当 `spec` 解析失败或为空时，输出详细的错误信息到 UI，而非仅显示“等待数据”。
- **容器检查**：确保 `vchart-container` 具有显式的尺寸，防止因 0x0 导致的视觉“空白”。

## 3. 增强 DSL 语义提取 (VChartEditor.tsx)
- **标签切换**：在遇到任何新标签（如 `Title:`）时，自动将 `inSpec` 设为 `false`，支持乱序输入。
- **JSON 清洗**：增强对 JSON 字符串中非法尾随字符（如逗号、Markdown 结束符）的过滤。

## 4. 验证案例 (最稳健版本)
提供一个不依赖复杂 `common` 类型的单系列柱状图作为联试：
```dsl
Title: 基础验证
Spec: {
  "type": "bar",
  "data": [{ "values": [{"x":"A","y":10}, {"x":"B","y":20}] }],
  "xField": "x",
  "yField": "y"
}
```

## 下一步行动
1. 修改 `VChartDiagram.tsx` 增加错误捕捉与详尽状态显示。
2. 修改 `VChartEditor.tsx` 增加标签状态自动机逻辑。
3. 请用户再次测试最简验证案例。
