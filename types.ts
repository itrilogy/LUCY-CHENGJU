
export enum QCToolType {
  DASHBOARD = 'DASHBOARD',
  FISHBONE = 'FISHBONE',
  PARETO = 'PARETO',
  CONTROL = 'CONTROL',
  AFFINITY = 'AFFINITY',
  HISTOGRAM = 'HISTOGRAM',
  SCATTER = 'SCATTER',
  RELATION = 'RELATION',
  MATRIX = 'MATRIX',
  MATRIX_PLOT = 'MATRIX_PLOT',
  PDPC = 'PDPC',
  ARROW = 'ARROW',
  BASIC = 'BASIC',
  RADAR = 'RADAR',
  MERMAID = 'MERMAID',
  VCHART = 'VCHART',
  FLOW = 'FLOW'
}

/**
 * 核心图表组件引用接口 (用于无头渲染与批量导出)
 */
export interface BaseDiagramRef {
  /**
   * 获取图表的内容 DataURL (Base64)
   * @param options 导出选项 (pixelRatio, backgroundColor)
   */
  getDataURL: (options?: { 
    pixelRatio?: number; 
    backgroundColor?: string;
    width?: number;
    height?: number;
  }) => Promise<string>;
  
  /**
   * 触发 PNG 下载 (交互模式使用)
   */
  exportPNG: (transparent?: boolean, scale?: number) => void;
  
  /**
   * 触发 PDF 导出 (交互模式使用)
   */
  exportPDF: (transparent?: boolean) => void;

  /**
   * 整理布局 (可选，主要用于 G6/SVG 系列)
   */
  tidyLayout?: () => void;
}

export interface RadarAxis {
  name: string;
  max: number;
  min?: number;
}

export interface RadarSeries {
  name: string;
  values: number[];
  color?: string;
  fillOpacity?: number;
}

export interface RadarData {
  title: string;
  axes: RadarAxis[];
  series: RadarSeries[];
  // 分析结果 (由 Diagram 计算并回传或内部使用)
  analysis?: {
    scores?: Record<string, number>; // 系列名称 -> 面积/综合得分
    similarities?: Record<string, number>; // 与首个系列的欧式距离相似度
  };
}

export interface RadarChartStyles {
  title: string;
  titleFontSize: number;
  labelFontSize: number;
  gridColor: string;
  showGrid: boolean;
  gridLevels: number;
  showLabels: boolean;
  showValues: boolean;
  // 极坐标特性
  startAngle: number;
  clockwise: boolean;
  isClosed: boolean;
  // 高级分析与显示
  standardize: boolean; // 是否数据标准化 (0-1)
  showAreaScore: boolean; // 是否显示面积得分
  showSimilarity: boolean; // 是否显示相似度 (欧式距离)
  compareMode: boolean; // 比较模式 (突出差异)
}

export const DEFAULT_RADAR_STYLES: Required<RadarChartStyles> = {
  title: '雷达图分析',
  titleFontSize: 20,
  labelFontSize: 12,
  gridColor: '#cbd5e1',
  showGrid: true,
  gridLevels: 5,
  showLabels: true,
  showValues: true,
  startAngle: -90,
  clockwise: true,
  isClosed: true,
  standardize: false,
  showAreaScore: false,
  showSimilarity: false,
  compareMode: false
};

export interface FishboneNode {
  id: string;
  label: string;
  type: 'root' | 'main' | 'sub' | 'detail' | 'anchor' | 'tail';
  children?: FishboneNode[];
}

export interface FishboneChartStyles {
  boneLine?: string;
  caseLine?: string;
  caseColor?: string;
  endColor?: string;
  rootColor?: string;
  rootTextColor?: string;
  mainColor?: string;
  mainTextColor?: string;
}

export const DEFAULT_FISHBONE_STYLES: Required<FishboneChartStyles> = {
  boneLine: '#334155',
  caseLine: '#64748b',
  caseColor: '#1e293b',
  endColor: '#94a3b8',
  rootColor: '#2563eb',
  rootTextColor: '#ffffff',
  mainColor: '#3b82f6',
  mainTextColor: '#ffffff'
};

export interface RelationNode {
  id: string;
  label: string;
  type?: 'root' | 'middle' | 'end';
}

export interface RelationLink {
  source: string;
  target: string;
}

export interface RelationChartStyles {
  title: string;
  titleFontSize: number;
  // Node Styles
  rootColor: string;
  rootTextColor: string;
  middleColor: string;
  middleTextColor: string;
  endColor: string;
  endTextColor: string;
  // Line Styles
  lineColor: string;
  // Font Sizes (Consistent with others)
  // Font Sizes (Consistent with others)
  nodeFontSize: number;
  layout: RelationLayoutType;
}

export type RelationLayoutType = 'Centralized' | 'Directional' | 'Free';

export const DEFAULT_RELATION_STYLES: RelationChartStyles = {
  title: '关联图分析',
  titleFontSize: 24,
  rootColor: '#2563eb',
  rootTextColor: '#ffffff',
  middleColor: '#3b82f6',
  middleTextColor: '#ffffff',
  endColor: '#93c5fd',
  endTextColor: '#1e3a8a',
  lineColor: '#64748b',
  nodeFontSize: 14,
  layout: 'Directional'
};

export interface HistogramChartStyles {
  title?: string;
  usl?: number;
  lsl?: number;
  target?: number;
  bins?: number | 'auto';
  showCurve?: boolean;
  barColor?: string;
  curveColor?: string;
  uslColor?: string;
  lslColor?: string;
  targetColor?: string;
  titleColor?: string;
  titleFontSize?: number;
  baseFontSize?: number;
  barFontSize?: number;
  showValues?: boolean;
}

export const DEFAULT_HISTOGRAM_STYLES: Required<HistogramChartStyles> = {
  title: '质量分布直方图',
  usl: undefined as any,
  lsl: undefined as any,
  target: undefined as any,
  bins: 'auto',
  showCurve: true,
  barColor: '#3b82f6',
  curveColor: '#f97316',
  uslColor: '#ef4444',
  lslColor: '#ef4444',
  targetColor: '#22c55e',
  titleColor: '#1e293b',
  titleFontSize: 18,
  baseFontSize: 12,
  barFontSize: 10,
  showValues: true
};

export interface ParetoItem {
  id: string;
  name: string;
  value: number;
}

export interface ParetoChartStyles {
  title?: string;
  titleColor?: string;
  titleFontSize?: number;
  barColor?: string;
  lineColor?: string;
  markLineColor?: string;
  barFontSize?: number;
  lineFontSize?: number;
  baseFontSize?: number;
  decimals?: number;
  showValues?: boolean;
}

export const DEFAULT_PARETO_STYLES: ParetoChartStyles = {
  title: '排列图 (Pareto Chart)',
  titleColor: '#0f172a',
  titleFontSize: 20,
  barColor: '#3b82f6',
  lineColor: '#f59e0b',
  markLineColor: '#ef4444',
  barFontSize: 12,
  lineFontSize: 12,
  baseFontSize: 12,
  decimals: 1,
  showValues: true
};

export interface ScatterPoint {
  id: string;
  x: number;
  y: number;
  z?: number;
}

export interface ScatterChartStyles {
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  zAxisLabel?: string;
  pointColor?: string;
  trendColor?: string;
  baseSize?: number;
  opacity?: number;
  showTrend?: boolean;
  titleFontSize?: number;
  baseFontSize?: number;
  is3D?: boolean;
  renderMode3D?: 'scatter' | 'surface' | 'wireframe';
  showValues?: boolean;
}

export const DEFAULT_SCATTER_STYLES: Required<ScatterChartStyles> = {
  title: '散点图分析',
  xAxisLabel: 'X轴',
  yAxisLabel: 'Y轴',
  zAxisLabel: 'Z轴',
  pointColor: '#3b82f6',
  trendColor: '#f97316',
  baseSize: 10,
  opacity: 0.8,
  showTrend: false,
  titleFontSize: 16,
  baseFontSize: 12,
  is3D: false,
  renderMode3D: 'scatter',
  showValues: false
};

// --- Affinity Diagram Types (Legacy Compatible) ---
export interface AffinityItem {
  id: string;
  label: string;
  children?: AffinityItem[];
  parentId?: string; // For flat DSL parsing
}

export type AffinityType = 'Card' | 'Label';
export type AffinityLayout = 'Horizontal' | 'Vertical';

export interface AffinityChartStyles {
  title: string;
  type: AffinityType;
  layout: AffinityLayout;

  // New Strict Style Keys
  titleBackgroundColor: string;
  titleTextColor: string;
  titleFontSize: number;

  groupHeaderBackgroundColor: string;
  groupHeaderTextColor: string;
  groupHeaderFontSize: number;

  itemBackgroundColor: string;
  itemTextColor: string;
  itemFontSize: number;

  borderColor: string;
  lineColor: string; // Tree only

  // Layout
  itemGap: number;

  // Legacy support keys (optional, for backward compat if needed, but we prefer new keys)
  background?: string;
}

export const DEFAULT_AFFINITY_STYLES: AffinityChartStyles = {
  title: '亲和图分析',
  type: 'Card',
  layout: 'Horizontal',

  titleBackgroundColor: '#ffffff',
  titleTextColor: '#1e293b',
  titleFontSize: 24,

  groupHeaderBackgroundColor: '#eff6ff', // Was headerColor/cardColor mix
  groupHeaderTextColor: '#1e293b',
  groupHeaderFontSize: 16,

  itemBackgroundColor: '#ffffff',
  itemTextColor: '#334155',
  itemFontSize: 14,

  borderColor: '#cbd5e1',
  lineColor: '#64748b',

  itemGap: 16,
  background: '#ffffff'
};

// --- Control Chart Types (New) ---

export type ControlChartType =
  | 'I-MR'
  | 'X-bar-R'
  | 'X-bar-S'
  | 'P'
  | 'NP'
  | 'C'
  | 'U';

export type ControlRule = 'Basic' | 'Western-Electric' | 'Nelson';

export interface ControlSeries {
  name: string;
  data: number[];
}

export interface ControlChartStyles {
  title: string;
  type: ControlChartType;
  subgroupSize: number; // Size: N
  rules: ControlRule[];

  // 限制线 (可选)
  ucl?: number;
  lcl?: number;
  cl?: number;

  // 视觉配置
  titleColor: string;
  lineColor: string;
  uclColor: string;
  clColor: string;
  pointColor: string;
  background: string;

  titleFontSize: number;
  baseFontSize: number;
  labelFontSize: number;

  decimals: number;
  showValues: boolean;
}

export const DEFAULT_CONTROL_STYLES: Required<ControlChartStyles> = {
  title: '控制图 (Control Chart)',
  type: 'I-MR',
  subgroupSize: 1,
  rules: ['Basic'],
  ucl: 0,
  lcl: 0,
  cl: 0,
  titleColor: '#1e293b',
  lineColor: '#3b82f6',
  uclColor: '#ef4444',
  clColor: '#22c55e',
  pointColor: '#1d4ed8',
  background: '#ffffff',
  titleFontSize: 20,
  baseFontSize: 12,
  labelFontSize: 10,
  decimals: 2,
  showValues: true
};

export const INITIAL_CONTROL_DSL = `// 示例：轴类零件外径加工过程监控
// 包含 25 个连续观测值，若子组大小为 5，则自动计算 5 个子组的均值与极差
Title: 活塞销外径加工过程监控（高频采样）
Type: X-bar-R
Size: 5
Rules: Western-Electric,Nelson
Decimals: 3
Color[Line]: #3b82f6
Color[Point]: #1d4ed8

[series]: 测量观测值
12.012, 11.985, 12.053, 12.001, 11.974
12.022, 11.991, 12.035, 12.011, 12.042
11.988, 12.005, 12.021, 11.995, 12.018
12.031, 11.978, 11.999, 12.015, 12.024
12.008, 12.026, 11.984, 12.041, 11.992
[/series]`;
// --- Matrix Diagram Types ---

export type MatrixType = 'L' | 'T' | 'Y' | 'X' | 'C';
export type MatrixSymbolType = 'Strong' | 'Medium' | 'Weak' | 'None';

export interface MatrixAxisItem {
  id: string;
  label: string;
  weight?: number;
}

export interface MatrixDiagramProps {
  data: MatrixData;
  styles: MatrixChartStyles;
  onCellClick?: (rowId: string, colId: string, currentSymbol: MatrixSymbolType, rowAxisId?: string, colAxisId?: string) => void;
}

export interface MatrixAxis {
  id: string;
  label: string;
  items: MatrixAxisItem[];
}

export interface MatrixCell {
  rowId: string;
  colId: string;
  symbol: MatrixSymbolType;
}

export interface MatrixData {
  title: string;
  type: MatrixType;
  axes: MatrixAxis[];
  matrices: {
    rowAxisId: string;
    colAxisId: string;
    cells: MatrixCell[];
  }[];
}

export interface MatrixChartStyles {
  title: string;
  titleFontSize: number;
  type: MatrixType;

  // Colors
  axisColor: string;
  gridColor: string;
  symbolColorStrong: string;
  symbolColorMedium: string;
  symbolColorWeak: string;

  // Weights (Symbols)
  weightStrong: number;
  weightMedium: number;
  weightWeak: number;

  // Layout
  cellSize: number;
  fontSize: number;
  showScores: boolean;
}

export const DEFAULT_MATRIX_STYLES: MatrixChartStyles = {
  title: '矩阵图分析',
  titleFontSize: 14,
  type: 'L',

  axisColor: '#1e293b',
  gridColor: '#cbd5e1',
  symbolColorStrong: '#2563eb', // Blue
  symbolColorMedium: '#475569', // Slate
  symbolColorWeak: '#94a3b8',   // Light Slate

  weightStrong: 5,
  weightMedium: 3,
  weightWeak: 1,

  cellSize: 40,
  fontSize: 10,
  showScores: true
};

// --- Matrix Plot (Graph Matrix) Types ---

export interface MatrixPlotData {
  title: string;
  mode: 'matrix' | 'yvsx';
  yDimensions: string[];
  xDimensions: string[];
  groupVariable?: string;
  showSmoother: boolean;
  smootherMethod?: 'MovingAverage' | 'Lowess';
  data: Array<Record<string, number | string>>;
}

export interface MatrixPlotStyles {
  title: string;
  titleFontSize: number;
  baseFontSize: number;
  pointSize: number;
  pointOpacity: number;
  colorPalette: 'Industrial' | 'Vibrant' | 'Pastel';
  displayMode: 'Lower' | 'Upper' | 'Full';
  diagonal: 'Histogram' | 'Boxplot' | 'Label' | 'None';
  subplotGap: number;
  showTicks: 'Outer' | 'All' | 'None';
  smootherColor: string;
  smootherWeight: number;
  axisColor: string;
  gridColor: string;
}

export const DEFAULT_MATRIX_PLOT_STYLES: MatrixPlotStyles = {
  title: '图矩阵相关性分析',
  titleFontSize: 14,
  baseFontSize: 10,
  pointSize: 4,
  pointOpacity: 0.7,
  colorPalette: 'Industrial',
  displayMode: 'Full',
  diagonal: 'Label',
  subplotGap: 2,
  showTicks: 'Outer',
  smootherColor: '#ef4444',
  smootherWeight: 2,
  axisColor: '#1e293b',
  gridColor: '#cbd5e1'
};


// --- PDPC (Process Decision Program Chart) Types ---

export type PDPCNodeType = 'start' | 'end' | 'step' | 'countermeasure';
export type PDPCMarkerType = 'OK' | 'NG' | 'None';

export interface PDPCNode {
  id: string;
  label: string;
  type: PDPCNodeType;
  groupId?: string;
}

export interface PDPCLink {
  source: string;
  target: string;
  marker: PDPCMarkerType;
}

export interface PDPCGroup {
  id: string;
  label: string;
  parentId?: string | null;
}

export interface PDPCData {
  title: string;
  nodes: PDPCNode[];
  links: PDPCLink[];
  groups: PDPCGroup[];
}

export interface PDPCChartStyles {
  title: string;
  titleFontSize: number;
  layout: 'Directional' | 'Standard';

  // Colors
  startColor: string;
  startTextColor: string;
  endColor: string;
  endTextColor: string;
  stepColor: string;
  stepTextColor: string;
  countermeasureColor: string;
  countermeasureTextColor: string;
  lineColor: string;
  lineWidth: number;

  // Font Sizes
  nodeFontSize: number;
}

export const DEFAULT_PDPC_STYLES: PDPCChartStyles = {
  title: '过程决策程序图 (PDPC)',
  layout: 'Directional',

  // 浅色主题正确做法：**浅底 + 同色系深字**。
  // 原值（饱和底 + 白字）多处不达 4.5:1 —— Step 3.68:1、Countermeasure 2.54:1、End 3.76:1。
  // 下列组合均在 5.5:1 以上，且保留四类的色相辨识。
  startColor: '#DBEAFE',            // 起点：浅蓝底
  startTextColor: '#1E40AF',        //       深蓝字 (8.2:1)
  stepColor: '#EFF6FF',             // 步骤：极浅蓝底
  stepTextColor: '#1D4ED8',         //       深蓝字 (7.4:1)
  countermeasureColor: '#ECFDF5',   // 对策：浅绿底
  countermeasureTextColor: '#047857', //     深绿字 (5.5:1)
  endColor: '#FEF2F2',              // 终点：浅红底
  endTextColor: '#B91C1C',          //       深红字 (6.4:1)
  lineColor: '#64748B',
  lineWidth: 2,

  nodeFontSize: 12,
  titleFontSize: 20
};

// --- Arrow Diagram (AoA/PERT) Types ---

export interface ArrowNode {
  id: string;
  label: string;
  // CPM Calculated Fields
  es?: number; // Earliest Start
  ls?: number; // Latest Start
  rank?: number; // Topological Rank
  // Layout
  x?: number;
  y?: number;
}

export interface ArrowLink {
  source: string;
  target: string;
  duration: number;
  label: string;
  isDummy: boolean;
  // CPM Calculated Fields
  ef?: number; // Earliest Finish
  lf?: number; // Latest Finish
  tf?: number; // Total Float
  ff?: number; // Free Float
  isCritical?: boolean;
  isShortest?: boolean;
}

export interface ArrowData {
  title: string;
  nodes: ArrowNode[];
  links: ArrowLink[];
}

export interface ArrowChartStyles {
  title: string;
  titleFontSize: number;
  showCriticalPath: boolean;
  showShortestPath: boolean;

  // Colors
  nodeColor: string;
  nodeTextColor: string;
  lineColor: string;
  criticalLineColor: string;
  shortestLineColor: string;
  textColor: string;

  // Sizes
  nodeRadius: number;
  lineWidth: number;
  fontSize: number;
}

export const DEFAULT_ARROW_STYLES: ArrowChartStyles = {
  title: '矢线图 (PERT/CPM)',
  titleFontSize: 24,
  showCriticalPath: true,
  showShortestPath: true,

  nodeColor: '#ffffff',
  nodeTextColor: '#0f172a',
  lineColor: '#64748b',
  criticalLineColor: '#ef4444',
  shortestLineColor: '#10b981', // Emerald Green for shortest
  textColor: '#475569',

  nodeRadius: 30, // Increased from 18
  lineWidth: 3,   // Increased from 2
  fontSize: 14    // Increased from 12
};
// --- Basic Chart Types (Bar/Line/Pie) ---

export interface BasicChartDataset {
  name: string;
  values: (number | string)[];
  color?: string;
  axisMatch: 'X' | 'Y' | 'Y2' | 'Y3' | 'Y4';
}

export interface BasicChartData {
  title: string;
  type: 'bar' | 'line' | 'pie';
  datasets: BasicChartDataset[];
}

export interface BasicChartStyles {
  title?: string;
  type?: 'bar' | 'line' | 'pie';
  view?: 'v' | 'h';
  stacked?: boolean;
  smooth?: boolean;
  sortMode?: 'none' | 'asc' | 'desc';
  showLegend?: boolean;
  grid?: boolean;

  // Colors
  titleColor?: string;
  backgroundColor?: string;

  // Font Sizes
  titleFontSize?: number;
  baseFontSize?: number;
  showValues?: boolean;
}

export const DEFAULT_BASIC_STYLES: Required<BasicChartStyles> = {
  title: '基础图表分析',
  type: 'bar',
  view: 'v',
  stacked: false,
  smooth: false,
  sortMode: 'none',
  showLegend: true,
  grid: true,
  titleColor: '#0f172a',
  backgroundColor: '#ffffff',
  titleFontSize: 18,
  baseFontSize: 12,
  showValues: true
};

// --- Mermaid Diagram Types ---

export interface MermaidChartStyles {
  title: string;
  titleFontSize: number;
  theme: 'default' | 'forest' | 'dark' | 'neutral' | 'base';
  fontSize: number;
  backgroundColor: string;
  look?: 'classic' | 'handDrawn';
  useElk?: boolean;
  elkMergeEdges?: boolean;
  elkNodePlacementStrategy?: 'SIMPLE' | 'NETWORK_SIMPLE' | 'LINEAR_SEGMENTS' | 'BRANDES_KOEPF';
}

export const DEFAULT_MERMAID_STYLES: Required<MermaidChartStyles> = {
  title: 'Mermaid 绘图分析',
  titleFontSize: 20,
  theme: 'default',
  fontSize: 14,
  backgroundColor: '#ffffff',
  look: 'classic',
  useElk: false,
  elkMergeEdges: false,
  elkNodePlacementStrategy: 'BRANDES_KOEPF'
};

// --- VChart Diagram Types ---

export interface VChartData {
  title: string;
  spec: any;
  error?: string;
}

export type VChartAnimationMode = 'scale' | 'fadeIn' | 'appear' | 'move';

export interface VChartChartStyles {
  title: string;
  theme: 'light' | 'dark';
  colorPalette: string;
  titleFontSize: number;
  // 全局显示控制
  showTitle: boolean;
  showLabel: boolean;
  // 动画控制
  animation: boolean;
  animationMode: VChartAnimationMode;
}

export const DEFAULT_VCHART_STYLES: Required<VChartChartStyles> = {
  title: 'VChart 全能图表',
  theme: 'light',
  colorPalette: 'light',
  titleFontSize: 20,
  showTitle: true,
  showLabel: true,
  animation: false,
  animationMode: 'scale',
};

// --- Flow (企业体系文件流程图 / BPMN 子集) Types ---

export type FlowNodeType =
  | 'start'      // Type[S]
  | 'end'        // Type[E]
  | 'task'       // Type 缺省 / Type[T]
  | 'exclusiveGateway' // Type[?]
  | 'parallelGateway'  // Type[+]
  | 'subprocess' // Type[SUB]
  | 'annotation' // Type[N]
  | 'dataObject' // Type[DATA]

export interface FlowDict {
  name: string;
  values: string[];
}

export interface FlowLane {
  dict: string;
  indices: number[];
  layout: 'H' | 'V';
}

export interface FlowAxis {
  title: string;
  align: 'L' | 'R' | 'C';
}
export interface FlowPageAxis {
  title: string;
  place: 'AxisX' | 'AxisY';
  align: 'L' | 'R' | 'C';
}

export type FlowAxisSet = {
  x: FlowAxis;
  y: FlowAxis;
  page: FlowPageAxis;
};

/** 单节点格子坐标（已清洗维度后） */
export interface FlowCell {
  [axisKey: string]: number;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  labelRef?: string | null;   // 原始 "worker[0]" 引用；字面量为 null
  cell: FlowCell | null;      // 显式坐标（已清洗）；null = 自动顺序落格
  attrs: Record<string, string>;  // 已小驼峰键（sop/role/lv/time/kpi/m）
  parent?: string;            // 子流程内部节点归属
  attach?: string;            // 修饰类节点（N/DATA）依附的前驱目标 id（spec §7.4/§10#14）
  vh?: 'V' | 'H' | 'D';       // 格内链式排布：与上一节点 V(下方)/H(右侧)/D(对角右下，A6 扩展格算子)
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  type: 'sequence';
  label: string | null;
  condition: string | null;
  default: boolean;
  parent?: string;
}

export interface FlowAttrPanel {
  active: string[];
  sections?: Record<string, unknown>;
}

export interface FlowData {
  title: string;
  layout: 'H' | 'V';
  dicts: Record<string, string[]>;
  lanes: FlowLane[];
  axes: FlowAxisSet;
  nodes: FlowNode[];
  edges: FlowEdge[];
  subProcesses: { id: string; nodes: string[] }[];
  artifacts: { id: string; type: string; label: string; attach: string }[];
  attrPanel: FlowAttrPanel | null;
}

export interface FlowChartStyles {
  title: string;
  titleFontSize: number;
  layout: 'H' | 'V';
  // 节点颜色槽（对齐 spec §11 色卡）
  startColor: string;
  endColor: string;
  taskColor: string;
  gatewayColor: string;
  parallelColor: string;
  subprocessColor: string;
  annotationColor: string;
  dataColor: string;
  laneColor: string;
  axisColor: string;
  lineColor: string;
  textColor: string;
  panelColor: string;
  /** 泳道网格线：虚线（默认，避与连线抢视觉）| 实线 */
  gridLine: 'dashed' | 'solid';
  labelFontSize: number;
  nodeFontSize: number;
  lineWidth: number;
}

export const DEFAULT_FLOW_STYLES: FlowChartStyles = {
  title: '流程图',
  titleFontSize: 20,
  layout: 'H',
  startColor: '#2563eb',
  endColor: '#ef4444',
  taskColor: '#3b82f6',
  gatewayColor: '#10b981',
  parallelColor: '#8b5cf6',
  subprocessColor: '#0ea5e9',
  annotationColor: '#f59e0b',
  dataColor: '#64748b',
  laneColor: '#e2e8f0',
  axisColor: '#334155',
  lineColor: '#64748b',
  textColor: '#1e293b',
  panelColor: '#f8fafc',
  gridLine: 'dashed',
  labelFontSize: 14,
  nodeFontSize: 13,
  lineWidth: 2
};
