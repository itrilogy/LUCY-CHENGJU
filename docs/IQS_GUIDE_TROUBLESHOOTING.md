# 故障排查记录 (Troubleshooting Log)

本文档记录项目中遇到的关键技术问题及其解决方案，作为开发团队的经验沉淀与调试指引。

---

## 📅 2026-01-30: 直方图组件切换白屏 (Histogram Blank Screen)

### 🔴 问题描述
在主导航栏从其他图表（如鱼骨图、排列图）切换点击 **“直方图 (Histogram)”** 卡片时，页面出现白屏（Crash），DOM 中仅剩 `<div id="root"></div>`。

- **现象**: 点击后页面空白，控制台报错 `An error occurred in the <HistogramDiagram> component`。
- **复现路径**: Home -> Fishbone -> Home -> Histogram (Crash)。

### 🧐 原因分析
**数据结构不匹配 (Data Type Mismatch)**
1. `App.tsx` 使用单一状态 `qcData` 存储当前图表数据。
2. 鱼骨图的数据结构为 `Object` (树形)，而直方图的数据结构为 `Array<number>`。
3. 当切换 `selectedTool` 为 `HISTOGRAM` 时，React 触发重新渲染。
   - `App.tsx` 中的 `useEffect` 尚未执行完毕（状态更新是异步的），此时 `qcData` 仍保留着上一个图表（鱼骨图）的 Object 数据。
   - `HistogramDiagram` 组件被挂载，接收到了旧的 Object 数据。
   - 组件内部尝试对 `data` 调用 `.reduce` 或 `.length`，导致 `TypeError: data.reduce is not a function`，引发整个应用崩溃。

### 🟢 解决方案
**断路器模式 (Circuit Breaker) & 类型守卫**

在 `App.tsx` 的渲染层添加严格的类型检查，确保只有当 `qcData` 为合法数组时才渲染直方图组件，否则显示加载占位符。

```typescript
// App.tsx 修改前
case QCToolType.HISTOGRAM: 
    return <HistogramDiagram data={qcData} styles={histogramStyles} />;

// App.tsx 修改后 (Fix)
case QCToolType.HISTOGRAM: 
    return Array.isArray(qcData) 
        ? <HistogramDiagram data={qcData} styles={histogramStyles} /> 
        : <LoadingPlaceholder />;
```

同时，在组件内部 (`HistogramDiagram.tsx`, `HistogramEditor.tsx`) 也增加了防御性编程：
```typescript
if (!Array.isArray(data)) return defaultState;
```

### 💡 经验总结
在多态数据结构（Polymorphic Data）共用同一 State 的场景下，**必须在父级渲染层做类型隔离**。不要假设子组件挂载时 State 已经更新完毕，React 的并发渲染机制可能导致“新组件 + 旧数据”的即使状态。

---

## 📅 2026-01-30: 直方图参考线重影与曲线开关失效 (Histogram Ghost Lines & Missing Lines)

### 🔴 问题描述
用户反馈：
1. **开关失效**: 点击 "显示正态曲线" 开关无反应。
2. **参考线重影**: 拖动分组滑块后，出现多条 LSL/Target 线条。
3. **参考线丢失**: 关闭曲线后，只显示 LSL/Target，USL 丢失（因为超出 Category 范围）。

### 🧐 原因分析
1. **重影**: ECharts `setOption` 默认 `merge`导致旧 Series 残留。
2. **丢失**: 原逻辑在关闭曲线时，试图将 MarkLine 映射到 Category 轴（Bar Series）。如果 USL 值（如 13.5）超出了当前分组的范围（如 10-12），`findIndex` 返回 -1，导致线条无法渲染。

### 🟢 解决方案
1. **启用 `notMerge`**: 强制全量重绘，清除残余。
2. **独立 MarkLine Series**: 无论曲线是否显示，始终在 `xAxisIndex: 1` (Value Axis) 上挂载一个透明的 Line Series 专门用于绘制 MarkLine。这样利用数值轴的连续性，确保所有规格线都能精确显示，不再依赖 Category 分箱。

```typescript
// HistogramDiagram.tsx
const commonMarkLine = { ... };
if (!showCurve) {
    series.push({
        type: 'line',
        xAxisIndex: 1, // Always use Value Axis
        markLine: commonMarkLine,
        // ... transparent style
    });
}
```

---

## 📅 2026-01-30: 散点图组件切换白屏 (Scatter Chart Blank Screen)

### 🔴 问题描述
从鱼骨图切换到 **散点图 (Scatter Plot)** 时，应用白屏崩溃。
- **原因**: 
    1. **数据结构不匹配**: `App.tsx` 中的 `qcData` 状态在切换瞬间仍保留鱼骨图的 Object 数据，而 `ScatterDiagram` 尝试调用 `.map()` 方法。
    2. **Fallback UI 渲染错误**: 为解决上述问题添加了 `Array.isArray` 断路器与 Loading 状态，但引入了未定义的 `Loader2` 组件，导致 `ReferenceError`，使得防御性代码本身成为崩溃源。
- **解决方案**: 
    1. 在 `App.tsx` 增加类型守卫 (`Array.isArray`)。
    2. 确保 `Loader2` 图标正确导入。

```typescript
// App.tsx
import { ..., Loader2 } from 'lucide-react'; // Fix: Ensure import exists

// Inside component
case QCToolType.SCATTER: 
    return Array.isArray(qcData) ? <ScatterDiagram ... /> : (
        <div className="flex ...">
            <Loader2 className="animate-spin mr-2" />
            ...
        </div>
    );
```

### 💡 关于 echarts-gl 版本依赖
用户曾怀疑 `echarts-gl` 与 `echarts` 版本不兼容。
- **验证**: 当前 `echarts` (v5.6.0) 与 `echarts-gl` (v2.0.9) 配合正常。
- **结论**: 白屏问题与 GL 库无关，纯粹是 React 渲染逻辑中的 Runtime Error。无需降级或更改依赖。
