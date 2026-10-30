import React, { Suspense, lazy, useState, useRef } from 'react';
import { QCToolType } from './types';
import {
  TOOL_CONFIGS,
  INITIAL_FISHBONE_DSL,
  INITIAL_PARETO_DSL,
  INITIAL_PARETO_DATA,
  INITIAL_HISTOGRAM_DSL,
  INITIAL_SCATTER_DATA,
  INITIAL_SCATTER_DSL,
  INITIAL_AFFINITY_DATA,
  INITIAL_AFFINITY_DSL,
  INITIAL_CONTROL_DSL,
  INITIAL_RELATION_DSL,
  INITIAL_RELATION_DATA,
  INITIAL_MATRIX_DSL,
  INITIAL_MATRIX_PLOT_DSL,
  INITIAL_PDPC_DSL,
  INITIAL_PDPC_DATA,
  INITIAL_ARROW_DSL,
  INITIAL_BASIC_DSL,
  INITIAL_BASIC_DATA,
  INITIAL_RADAR_DATA,
  INITIAL_RADAR_DSL,
  INITIAL_MERMAID_DSL,
  INITIAL_VCHART_DSL,
  INITIAL_FLOW_DSL,
  INITIAL_FLOW_DATA
} from './constants';
import {
  DEFAULT_PARETO_STYLES,
  DEFAULT_FISHBONE_STYLES,
  DEFAULT_HISTOGRAM_STYLES,
  DEFAULT_SCATTER_STYLES,
  DEFAULT_AFFINITY_STYLES,
  DEFAULT_RELATION_STYLES,
  DEFAULT_MATRIX_PLOT_STYLES,
  DEFAULT_PDPC_STYLES,
  DEFAULT_ARROW_STYLES,
  DEFAULT_BASIC_STYLES,
  DEFAULT_RADAR_STYLES,
  DEFAULT_MERMAID_STYLES,
  DEFAULT_VCHART_STYLES,
  DEFAULT_FLOW_STYLES,
  DEFAULT_CONTROL_STYLES,
  ScatterChartStyles,
  AffinityChartStyles,
  RelationNode,
  RelationLink,
  RelationChartStyles,
  MatrixData,
  MatrixChartStyles,
  MatrixPlotData,
  MatrixPlotStyles,
  PDPCData,
  PDPCChartStyles,
  ArrowData,
  ArrowChartStyles,
  FishboneNode,
  ParetoItem,
  ScatterPoint,
  AffinityItem,
  BasicChartData,
  BasicChartStyles,
  RadarData,
  RadarChartStyles,
  MermaidChartStyles,
  VChartData,
  VChartChartStyles
} from './types';
import type { FlowData, FlowChartStyles } from './types';
import { Workspace } from './components/layout/Workspace';
import { DashboardView } from './components/DashboardView';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import {
  parseFishboneDSL,
  parseParetoDSL,
  parseHistogramDSL,
  parseScatterDSL,
  parseAffinityDSL,
  parseRelationDSL,
  parseControlDSL,
  parseMatrixDSL,
  updateMatrixDSL,
  parseMatrixPlotDSL,
  parsePDPCDSL,
  parseArrowDSL,
  parseBasicDSL,
  parseFlowDSL,
  parseRadarDSL,
  parseVChartDSL
} from './dsl/parsers';

import { LayoutGrid, Download, FileText, Image, Cpu, Loader2, X, Sliders } from 'lucide-react';

// --- R33 / AUD-200: Route-level Code Splitting for 16 Diagrams + 16 Editors ---
const FishboneDiagram = lazy(() => import('./components/FishboneDiagram'));
const ParetoDiagram = lazy(() => import('./components/ParetoDiagram').then(m => ({ default: m.ParetoDiagram })));
const HistogramDiagram = lazy(() => import('./components/HistogramDiagram').then(m => ({ default: m.HistogramDiagram })));
const ScatterDiagram = lazy(() => import('./components/ScatterDiagram').then(m => ({ default: m.ScatterDiagram })));
const AffinityDiagram = lazy(() => import('./components/AffinityDiagram').then(m => ({ default: m.AffinityDiagram })));
const RelationDiagram = lazy(() => import('./components/RelationDiagram'));
const ControlChart = lazy(() => import('./components/ControlChart'));
const MatrixDiagram = lazy(() => import('./components/MatrixDiagram').then(m => ({ default: m.MatrixDiagram })));
const MatrixPlotDiagram = lazy(() => import('./components/MatrixPlotDiagram').then(m => ({ default: m.MatrixPlotDiagram })));
const PDPCDiagram = lazy(() => import('./components/PDPCDiagram'));
const ArrowDiagram = lazy(() => import('./components/ArrowDiagram').then(m => ({ default: m.ArrowDiagram })));
const BasicDiagram = lazy(() => import('./components/BasicDiagram'));
const FlowDiagram = lazy(() => import('./components/flow/FlowDiagram'));
const RadarDiagram = lazy(() => import('./components/RadarDiagram'));
const MermaidDiagram = lazy(() => import('./components/MermaidDiagram').then(m => ({ default: m.MermaidDiagram })));
const VChartDiagram = lazy(() => import('./components/VChartDiagram'));

const ParetoEditor = lazy(() => import('./components/ParetoEditor').then(m => ({ default: m.ParetoEditor })));
const HistogramEditor = lazy(() => import('./components/HistogramEditor').then(m => ({ default: m.HistogramEditor })));
const FishboneEditor = lazy(() => import('./components/FishboneEditor'));
const ScatterEditor = lazy(() => import('./components/ScatterEditor'));
const AffinityEditor = lazy(() => import('./components/AffinityEditor'));
const RelationEditor = lazy(() => import('./components/RelationEditor'));
const ControlChartEditor = lazy(() => import('./components/ControlChartEditor'));
const MatrixEditor = lazy(() => import('./components/MatrixEditor'));
const MatrixPlotEditor = lazy(() => import('./components/MatrixPlotEditor'));
const PDPCEditor = lazy(() => import('./components/PDPCEditor'));
const ArrowDiagramEditor = lazy(() => import('./components/ArrowDiagramEditor').then(m => ({ default: m.ArrowDiagramEditor })));
const BasicEditor = lazy(() => import('./components/BasicEditor'));
const FlowEditor = lazy(() => import('./components/flow/FlowEditor'));
const RadarEditor = lazy(() => import('./components/RadarEditor'));
const MermaidEditor = lazy(() => import('./components/MermaidEditor'));
const VChartEditor = lazy(() => import('./components/VChartEditor'));

const HEADLESS_TYPE_MAP: Record<string, QCToolType> = {
  fishbone: QCToolType.FISHBONE,
  pareto: QCToolType.PARETO,
  control: QCToolType.CONTROL,
  spc: QCToolType.CONTROL,
  affinity: QCToolType.AFFINITY,
  histogram: QCToolType.HISTOGRAM,
  scatter: QCToolType.SCATTER,
  relation: QCToolType.RELATION,
  matrix: QCToolType.MATRIX,
  matrix_plot: QCToolType.MATRIX_PLOT,
  matrixplot: QCToolType.MATRIX_PLOT,
  pdpc: QCToolType.PDPC,
  arrow: QCToolType.ARROW,
  basic: QCToolType.BASIC,
  radar: QCToolType.RADAR,
  flow: QCToolType.FLOW,
  mermaid: QCToolType.MERMAID,
  vchart: QCToolType.VCHART
};

const ModuleLoadingFallback: React.FC<{ label?: string }> = ({ label = '正在按需加载引擎模块...' }) => (
  <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
    <Loader2 size={20} className="animate-spin text-primary" />
    <span className="text-[11px] font-black tracking-widest uppercase">{label}</span>
  </div>
);

// --- Unified DSL Initializers (100% delegating to canonical Editor parsers) ---

const parseInitialFishbone = (customDsl?: string) => {
  try {
    return parseFishboneDSL(customDsl || INITIAL_FISHBONE_DSL);
  } catch (e) {
    console.error('Fishbone Init Error:', e);
    return { data: { id: 'root', label: '核心问题', type: 'root' as const, children: [] }, styles: DEFAULT_FISHBONE_STYLES };
  }
};

const parseInitialPareto = (customDsl?: string) => {
  try {
    const { items, styles } = parseParetoDSL(customDsl || INITIAL_PARETO_DSL);
    return { items: items.length > 0 ? items : INITIAL_PARETO_DATA, styles };
  } catch {
    return { items: INITIAL_PARETO_DATA, styles: DEFAULT_PARETO_STYLES };
  }
};

const parseInitialHistogram = (customDsl?: string) => {
  try {
    return parseHistogramDSL(customDsl || INITIAL_HISTOGRAM_DSL);
  } catch {
    return { data: [], styles: DEFAULT_HISTOGRAM_STYLES };
  }
};

const parseInitialScatter = (customDsl?: string) => {
  try {
    const { data, styles } = parseScatterDSL(customDsl || INITIAL_SCATTER_DSL);
    return { data: data.length > 0 ? data : INITIAL_SCATTER_DATA, styles };
  } catch {
    return { data: INITIAL_SCATTER_DATA, styles: DEFAULT_SCATTER_STYLES };
  }
};

const parseInitialAffinity = (customDsl?: string) => {
  try {
    const { data, styles } = parseAffinityDSL(customDsl || INITIAL_AFFINITY_DSL);
    return { data: data.length > 0 ? data : INITIAL_AFFINITY_DATA, styles };
  } catch {
    return { data: INITIAL_AFFINITY_DATA, styles: DEFAULT_AFFINITY_STYLES };
  }
};

const parseInitialRelation = (customDsl?: string) => {
  try {
    const { nodes, links, styles } = parseRelationDSL(customDsl || INITIAL_RELATION_DSL);
    return { nodes, links, styles };
  } catch (e) {
    console.error('Relation Init Error:', e);
    return { nodes: INITIAL_RELATION_DATA.nodes as RelationNode[], links: INITIAL_RELATION_DATA.links, styles: DEFAULT_RELATION_STYLES };
  }
};

const parseInitialPDPC = () => {
  try {
    return parsePDPCDSL(INITIAL_PDPC_DSL);
  } catch {
    return { data: INITIAL_PDPC_DATA, styles: DEFAULT_PDPC_STYLES };
  }
};

const parseInitialBasic = () => {
  try {
    return parseBasicDSL(INITIAL_BASIC_DSL);
  } catch {
    return { data: INITIAL_BASIC_DATA, styles: DEFAULT_BASIC_STYLES };
  }
};

const parseInitialFlow = () => {
  try {
    return parseFlowDSL(INITIAL_FLOW_DSL);
  } catch {
    return { data: INITIAL_FLOW_DATA, styles: DEFAULT_FLOW_STYLES };
  }
};

const parseInitialRadar = () => {
  try {
    return parseRadarDSL(INITIAL_RADAR_DSL);
  } catch {
    return { data: INITIAL_RADAR_DATA, styles: DEFAULT_RADAR_STYLES };
  }
};

const parseInitialVChart = (customDsl?: string) => {
  try {
    return parseVChartDSL(customDsl || INITIAL_VCHART_DSL);
  } catch {
    return { data: { title: 'VChart', spec: {} }, styles: DEFAULT_VCHART_STYLES };
  }
};

const App: React.FC = () => {
  // --- Headless Mode Logic ---
  const { isHeadless, headlessType, headlessDsl } = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const typeStr = params.get('type')?.toLowerCase() || '';

    return {
      isHeadless: params.get('mode') === 'headless',
      headlessType: HEADLESS_TYPE_MAP[typeStr] || QCToolType.FLOW,
      headlessDsl: params.get('dsl')
    };
  }, []);

  const [selectedTool, setSelectedTool] = useState<QCToolType>(() => {
    if (isHeadless && headlessType) return headlessType;
    return QCToolType.DASHBOARD;
  });

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTransparent, setExportTransparent] = useState(false);
  const [exportScale, setExportScale] = useState(3);

  const [fishboneData, setFishboneData] = useState<FishboneNode>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.FISHBONE && headlessDsl) ? headlessDsl : undefined;
    return parseInitialFishbone(dsl).data;
  });
  const [fishboneStyles, setFishboneStyles] = useState<any>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.FISHBONE && headlessDsl) ? headlessDsl : undefined;
    return parseInitialFishbone(dsl).styles;
  });

  const [paretoData, setParetoData] = useState<ParetoItem[]>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.PARETO && headlessDsl) ? headlessDsl : undefined;
    return parseInitialPareto(dsl).items;
  });
  const [paretoStyles, setParetoStyles] = useState<any>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.PARETO && headlessDsl) ? headlessDsl : undefined;
    return parseInitialPareto(dsl).styles;
  });

  const [histogramData, setHistogramData] = useState<number[]>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.HISTOGRAM && headlessDsl) ? headlessDsl : undefined;
    return parseInitialHistogram(dsl).data;
  });
  const [histogramStyles, setHistogramStyles] = useState<any>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.HISTOGRAM && headlessDsl) ? headlessDsl : undefined;
    return parseInitialHistogram(dsl).styles;
  });

  const [scatterData, setScatterData] = useState<ScatterPoint[]>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.SCATTER && headlessDsl) ? headlessDsl : undefined;
    return parseInitialScatter(dsl).data as ScatterPoint[];
  });
  const [scatterStyles, setScatterStyles] = useState<ScatterChartStyles>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.SCATTER && headlessDsl) ? headlessDsl : undefined;
    return parseInitialScatter(dsl).styles;
  });

  const [affinityData, setAffinityData] = useState<AffinityItem[]>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.AFFINITY && headlessDsl) ? headlessDsl : undefined;
    return parseInitialAffinity(dsl).data;
  });
  const [affinityStyles, setAffinityStyles] = useState<AffinityChartStyles>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.AFFINITY && headlessDsl) ? headlessDsl : undefined;
    return parseInitialAffinity(dsl).styles;
  });

  const [relationNodes, setRelationNodes] = useState<RelationNode[]>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.RELATION && headlessDsl) ? headlessDsl : undefined;
    return parseInitialRelation(dsl).nodes;
  });
  const [relationLinks, setRelationLinks] = useState<RelationLink[]>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.RELATION && headlessDsl) ? headlessDsl : undefined;
    return parseInitialRelation(dsl).links;
  });
  const [relationStyles, setRelationStyles] = useState<RelationChartStyles>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.RELATION && headlessDsl) ? headlessDsl : undefined;
    return parseInitialRelation(dsl).styles;
  });

  const [matrixDsl, setMatrixDsl] = useState<string>(() => (isHeadless && headlessType === QCToolType.MATRIX && headlessDsl) ? headlessDsl : INITIAL_MATRIX_DSL);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(() => parseMatrixDSL((isHeadless && headlessType === QCToolType.MATRIX && headlessDsl) ? headlessDsl : INITIAL_MATRIX_DSL).data);
  const [matrixStyles, setMatrixStyles] = useState<MatrixChartStyles>(() => parseMatrixDSL((isHeadless && headlessType === QCToolType.MATRIX && headlessDsl) ? headlessDsl : INITIAL_MATRIX_DSL).styles);

  const [matrixPlotDsl, setMatrixPlotDsl] = useState<string>(() => (isHeadless && headlessType === QCToolType.MATRIX_PLOT && headlessDsl) ? headlessDsl : INITIAL_MATRIX_PLOT_DSL);
  const [matrixPlotData, setMatrixPlotData] = useState<MatrixPlotData | null>(() => parseMatrixPlotDSL((isHeadless && headlessType === QCToolType.MATRIX_PLOT && headlessDsl) ? headlessDsl : INITIAL_MATRIX_PLOT_DSL).data);
  const [matrixPlotStyles, setMatrixPlotStyles] = useState<MatrixPlotStyles>(() => parseMatrixPlotDSL((isHeadless && headlessType === QCToolType.MATRIX_PLOT && headlessDsl) ? headlessDsl : INITIAL_MATRIX_PLOT_DSL).styles);

  const [pdpcDsl, setPdpcDsl] = useState<string>(() => (isHeadless && headlessType === QCToolType.PDPC && headlessDsl) ? headlessDsl : INITIAL_PDPC_DSL);
  const [pdpcData, setPdpcData] = useState<PDPCData>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.PDPC && headlessDsl) ? headlessDsl : INITIAL_PDPC_DSL;
    try { return parsePDPCDSL(dsl).data; } catch { return INITIAL_PDPC_DATA as PDPCData; }
  });
  const [pdpcStyles, setPdpcStyles] = useState<PDPCChartStyles>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.PDPC && headlessDsl) ? headlessDsl : INITIAL_PDPC_DSL;
    try { return parsePDPCDSL(dsl).styles; } catch { return DEFAULT_PDPC_STYLES; }
  });

  const [arrowData, setArrowData] = useState<ArrowData | null>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.ARROW && headlessDsl) ? headlessDsl : INITIAL_ARROW_DSL;
    try { return parseArrowDSL(dsl).data; } catch { return null; }
  });
  const [arrowStyles, setArrowStyles] = useState<ArrowChartStyles>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.ARROW && headlessDsl) ? headlessDsl : INITIAL_ARROW_DSL;
    try { return parseArrowDSL(dsl).styles; } catch { return DEFAULT_ARROW_STYLES; }
  });

  const [basicData, setBasicData] = useState<BasicChartData>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.BASIC && headlessDsl) ? headlessDsl : INITIAL_BASIC_DSL;
    try { return parseBasicDSL(dsl).data; } catch { return INITIAL_BASIC_DATA; }
  });
  const [basicStyles, setBasicStyles] = useState<BasicChartStyles>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.BASIC && headlessDsl) ? headlessDsl : INITIAL_BASIC_DSL;
    try { return parseBasicDSL(dsl).styles; } catch { return parseInitialBasic().styles; }
  });

  const [flowData, setFlowData] = useState<FlowData>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.FLOW && headlessDsl) ? headlessDsl : INITIAL_FLOW_DSL;
    try { return parseFlowDSL(dsl).data; } catch { return parseInitialFlow().data; }
  });
  const [flowStyles, setFlowStyles] = useState<FlowChartStyles>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.FLOW && headlessDsl) ? headlessDsl : INITIAL_FLOW_DSL;
    try { return parseFlowDSL(dsl).styles; } catch { return DEFAULT_FLOW_STYLES; }
  });

  const [radarData, setRadarData] = useState<RadarData>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.RADAR && headlessDsl) ? headlessDsl : INITIAL_RADAR_DSL;
    try { return parseRadarDSL(dsl).data; } catch { return INITIAL_RADAR_DATA; }
  });
  const [radarStyles, setRadarStyles] = useState<RadarChartStyles>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.RADAR && headlessDsl) ? headlessDsl : INITIAL_RADAR_DSL;
    try { return parseRadarDSL(dsl).styles; } catch { return DEFAULT_RADAR_STYLES; }
  });

  const [mermaidData, setMermaidData] = useState<string>(() => (isHeadless && headlessType === QCToolType.MERMAID && headlessDsl) ? headlessDsl : INITIAL_MERMAID_DSL);
  const [mermaidStyles, setMermaidStyles] = useState<MermaidChartStyles>(DEFAULT_MERMAID_STYLES);

  const [vchartData, setVchartData] = useState<VChartData>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.VCHART && headlessDsl) ? headlessDsl : INITIAL_VCHART_DSL;
    return parseInitialVChart(dsl).data;
  });
  const [vchartStyles, setVchartStyles] = useState<VChartChartStyles>(() => {
    const dsl = (isHeadless && headlessType === QCToolType.VCHART && headlessDsl) ? headlessDsl : INITIAL_VCHART_DSL;
    return parseInitialVChart(dsl).styles;
  });

  const [dashboardCols, setDashboardCols] = useState(6);

  const [controlDsl, setControlDsl] = useState<string>(() => (isHeadless && headlessType === QCToolType.CONTROL && headlessDsl) ? headlessDsl : INITIAL_CONTROL_DSL);
  const [showParetoLine, setShowParetoLine] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('theme');
    if (t === 'light' || t === 'dark') return t;
    return 'light';
  });
  // Apply theme to document
  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Derived Control Chart Data
  const { series: controlSeries, styles: controlStyles } = React.useMemo(() => {
    const parsed = parseControlDSL(controlDsl);
    return {
      series: parsed.series,
      styles: { ...DEFAULT_CONTROL_STYLES, ...parsed.styles }
    };
  }, [controlDsl]);

  // 引用图表组件的方法 (如导出)
  const diagramRef = useRef<any>(null);
  const selectedToolRef = useRef<QCToolType>(selectedTool);
  selectedToolRef.current = selectedTool;

  // 移除部分冗余的内部解析函数...


  // 移除部分冗余的内部解析函数 (Histogram & Scatter)...


  // 移除最后剩下的冗余内部解析函数 (Affinity, Relation & PDPC)...


  // 移除 redundant useEffect，因为所有状态都已通过 Lazy Initialization 初始化且状态持久化
  // 仅在需要响应特定工具切换逻辑时添加 useEffect
  React.useEffect(() => {
    if (selectedTool === QCToolType.MATRIX) {
      // 保持 Matrix 进入时重置 DSL 的逻辑（如果这是预期行为）
      // setMatrixDsl(INITIAL_MATRIX_DSL); 
    }
  }, [selectedTool]);

  // Interactive Matrix Handling
  const handleMatrixCellClick = (rowId: string, colId: string, currentSymbol: any, rowAxisId?: string, colAxisId?: string) => {
    const newDsl = updateMatrixDSL(matrixDsl, rowId, colId, currentSymbol, rowAxisId, colAxisId);
    setMatrixDsl(newDsl);
    // Auto-update data
    try {
      const { data: d, styles: s } = parseMatrixDSL(newDsl);
      setMatrixData(d);
      // setMatrixStyles(s); // Optional: keep style edits separate or sync
    } catch (e) {
      console.error("Auto-sync error", e);
    }
  };

  // --- ILDR Headless Bridge (Warm-Page IPC + URL Fallback) ---
  const applyHeadlessPayload = React.useCallback((typeRaw: string, dsl: string) => {
    const t = String(typeRaw || '').toLowerCase();
    const tool = HEADLESS_TYPE_MAP[t] || QCToolType.FLOW;
    if (selectedToolRef.current !== tool) {
      // AUD-200: 切换至不同懒加载图表分包前主动清空旧句柄，确保轮询等待新分包挂载完毕
      diagramRef.current = null;
    }
    selectedToolRef.current = tool;
    setSelectedTool(tool);
    switch (tool) {
      case QCToolType.FISHBONE: {
        const r = parseInitialFishbone(dsl);
        setFishboneData(r.data);
        setFishboneStyles(r.styles);
        break;
      }
      case QCToolType.PARETO: {
        const r = parseInitialPareto(dsl);
        setParetoData(r.items);
        setParetoStyles(r.styles);
        break;
      }
      case QCToolType.CONTROL:
        setControlDsl(dsl);
        break;
      case QCToolType.HISTOGRAM: {
        const r = parseInitialHistogram(dsl);
        setHistogramData(r.data);
        setHistogramStyles(r.styles);
        break;
      }
      case QCToolType.SCATTER: {
        const r = parseInitialScatter(dsl);
        setScatterData(r.data as ScatterPoint[]);
        setScatterStyles(r.styles);
        break;
      }
      case QCToolType.AFFINITY: {
        const r = parseInitialAffinity(dsl);
        setAffinityData(r.data);
        setAffinityStyles(r.styles);
        break;
      }
      case QCToolType.RELATION: {
        const r = parseInitialRelation(dsl);
        setRelationNodes(r.nodes);
        setRelationLinks(r.links);
        setRelationStyles(r.styles);
        break;
      }
      case QCToolType.MATRIX: {
        setMatrixDsl(dsl);
        const r = parseMatrixDSL(dsl);
        setMatrixData(r.data);
        setMatrixStyles(r.styles);
        break;
      }
      case QCToolType.MATRIX_PLOT: {
        setMatrixPlotDsl(dsl);
        const r = parseMatrixPlotDSL(dsl);
        setMatrixPlotData(r.data);
        setMatrixPlotStyles(r.styles);
        break;
      }
      case QCToolType.PDPC: {
        setPdpcDsl(dsl);
        try {
          const r = parsePDPCDSL(dsl);
          setPdpcData(r.data);
          setPdpcStyles(r.styles);
        } catch { }
        break;
      }
      case QCToolType.ARROW: {
        try {
          const r = parseArrowDSL(dsl);
          setArrowData(r.data);
          setArrowStyles(r.styles);
        } catch { }
        break;
      }
      case QCToolType.BASIC: {
        try {
          const r = parseBasicDSL(dsl);
          setBasicData(r.data);
          setBasicStyles(r.styles);
        } catch { }
        break;
      }
      case QCToolType.FLOW: {
        try {
          const r = parseFlowDSL(dsl);
          setFlowData(r.data);
          setFlowStyles(r.styles);
        } catch { }
        break;
      }
      case QCToolType.RADAR: {
        try {
          const r = parseRadarDSL(dsl);
          setRadarData(r.data);
          setRadarStyles(r.styles);
        } catch { }
        break;
      }
      case QCToolType.MERMAID:
        setMermaidData(dsl);
        break;
      case QCToolType.VCHART: {
        const r = parseInitialVChart(dsl);
        setVchartData(r.data);
        setVchartStyles(r.styles);
        break;
      }
    }
    return tool;
  }, []);

  React.useEffect(() => {
    if (isHeadless) {
      let cancelled = false;
      const waitForDiagramMount = async (timeoutMs = 5000) => {
        const deadline = Date.now() + timeoutMs;
        while (!diagramRef.current && !cancelled && Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 25));
        }
        return Boolean(diagramRef.current);
      };

      // 1. Expose the capture function
      (window as any).captureIQSChart = async (options?: { pixelRatio?: number; backgroundColor?: string; width?: number; height?: number }) => {
        const mounted = await waitForDiagramMount(5000);
        if (!mounted || !diagramRef.current) {
          console.error('[IQS Bridge] No diagramRef found after lazy chunk wait');
          return '';
        }
        try {
          return await diagramRef.current.getDataURL({
            pixelRatio: options?.pixelRatio || 3,
            backgroundColor: options?.backgroundColor || '#FFFFFF',
            width: options?.width,
            height: options?.height
          });
        } catch (err) {
          console.error('[IQS Bridge] getDataURL failed:', err);
          return '';
        }
      };

      // 2. Expose Warm-Page In-Memory Render Bridge (eliminates URL length limits & page reload overhead)
      (window as any).renderIQSChart = async (payload: {
        type: string;
        dsl: string;
        width?: number;
        height?: number;
        pixelRatio?: number;
        backgroundColor?: string;
      }) => {
        const tool = applyHeadlessPayload(payload.type, payload.dsl);
        // AUD-200: Wait for React.lazy diagram chunk download + Suspense commit + ref binding
        await waitForDiagramMount(5000);
        // Wait two animation frames for React state commit + DOM layout
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        // Fast SVG/Canvas tools need minimal settle; Mermaid/VChart async layout gets 220ms settle
        const isFastSync = [
          QCToolType.FLOW,
          QCToolType.MATRIX,
          QCToolType.MATRIX_PLOT,
          QCToolType.RADAR,
          QCToolType.ARROW,
          QCToolType.CONTROL,
          QCToolType.AFFINITY,
          QCToolType.FISHBONE,
          QCToolType.RELATION,
          QCToolType.PDPC
        ].includes(tool);
        const settleMs = isFastSync ? 40 : 220;
        window.dispatchEvent(new Event('resize'));
        await new Promise(r => setTimeout(r, settleMs));
        return await (window as any).captureIQSChart({
          pixelRatio: payload.pixelRatio || 3,
          backgroundColor: payload.backgroundColor || '#FFFFFF',
          width: payload.width,
          height: payload.height
        });
      };

      // 3. Signal readiness after initial lazy diagram chunk mounts & settles
      (async () => {
        await waitForDiagramMount(5000);
        await new Promise(r => setTimeout(r, 150));
        if (!cancelled) {
          (window as any).IQS_READY = true;
        }
      })();

      return () => {
        cancelled = true;
        delete (window as any).captureIQSChart;
        delete (window as any).renderIQSChart;
        delete (window as any).IQS_READY;
      };
    }
  }, [isHeadless, selectedTool, diagramRef, applyHeadlessPayload]);

  if (isHeadless) {
    return (
      <div className="w-full h-full min-h-screen bg-white">
        <ErrorBoundary resetKey={selectedTool} fallbackTitle="Headless 渲染组件异常">
          <Suspense fallback={<div className="w-full h-screen bg-white" />}>
            {(() => {
              switch (selectedTool) {
                case QCToolType.FISHBONE: return <FishboneDiagram ref={diagramRef} data={fishboneData} styles={fishboneStyles} />;
                case QCToolType.PARETO: return <ParetoDiagram ref={diagramRef} data={paretoData} styles={paretoStyles} showLine={showParetoLine} />;
                case QCToolType.CONTROL: return <ControlChart ref={diagramRef} series={controlSeries} styles={controlStyles} />;
                case QCToolType.HISTOGRAM: return <HistogramDiagram ref={diagramRef} data={histogramData} styles={histogramStyles} />;
                case QCToolType.SCATTER: return <ScatterDiagram ref={diagramRef} data={scatterData} styles={scatterStyles} />;
                case QCToolType.AFFINITY: return <AffinityDiagram ref={diagramRef} data={affinityData} styles={affinityStyles} />;
                case QCToolType.RELATION: return <RelationDiagram ref={diagramRef} nodes={relationNodes} links={relationLinks} styles={relationStyles} />;
                case QCToolType.MATRIX: return matrixData ? <MatrixDiagram ref={diagramRef} data={matrixData} styles={matrixStyles} onCellClick={handleMatrixCellClick} /> : null;
                case QCToolType.MATRIX_PLOT: return matrixPlotData ? <MatrixPlotDiagram ref={diagramRef} data={matrixPlotData} styles={matrixPlotStyles} /> : null;
                case QCToolType.PDPC: return <PDPCDiagram ref={diagramRef} data={pdpcData} styles={pdpcStyles} onStylesChange={setPdpcStyles} />;
                case QCToolType.ARROW: return arrowData ? <ArrowDiagram ref={diagramRef} data={arrowData} styles={arrowStyles} /> : null;
                case QCToolType.BASIC: return <BasicDiagram ref={diagramRef} data={basicData} styles={basicStyles} />;
                case QCToolType.FLOW: return <FlowDiagram ref={diagramRef as any} data={flowData} styles={flowStyles} />;
                case QCToolType.RADAR: return <RadarDiagram ref={diagramRef} data={radarData} styles={radarStyles} />;
                case QCToolType.MERMAID: return <MermaidDiagram ref={diagramRef} data={mermaidData} styles={mermaidStyles} />;
                case QCToolType.VCHART: return <VChartDiagram ref={diagramRef} data={vchartData} styles={vchartStyles} theme={theme} />;
                default: return <div className="p-20 text-slate-400 font-black uppercase tracking-widest">Unknown Chart Type</div>;
              }
            })()}
          </Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  if (selectedTool === QCToolType.DASHBOARD) {
    return <DashboardView onSelectTool={setSelectedTool} cols={dashboardCols} setCols={setDashboardCols} theme={theme} setTheme={setTheme} />;
  }

  const currentTool = TOOL_CONFIGS.find(t => t.type === selectedTool);

  return (
    <div className="flex h-screen bg-[var(--bg-page)] text-[var(--text-main)] overflow-hidden font-sans transition-colors duration-500">
      <Workspace
        sidebarContent={
          <div className="flex flex-col h-full bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]">
            <div className="p-8 h-20 flex items-center justify-between border-b border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] shrink-0">
              <button
                onClick={() => setSelectedTool(QCToolType.DASHBOARD)}
                className="flex items-center gap-4 active:scale-95 transition-all group"
              >
                <img
                  src="/brand/iqs-mark.svg"
                  alt="澄矩 · ChengJu"
                  className="w-10 h-10 rounded-md shadow-md ring-1 ring-black/5 group-hover:scale-105 transition-all"
                />
                <div className="text-left">
                  <h1 className="font-black text-[var(--sidebar-text)] text-lg tracking-tighter leading-none">澄矩 · ChengJu</h1>
                  <p className="text-[11px] text-primary font-black tracking-[0.12em] mt-1 opacity-85">源清流澈，行止应矩</p>
                </div>
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <ErrorBoundary resetKey={selectedTool} fallbackTitle="编辑器模块加载失败">
                <Suspense fallback={<ModuleLoadingFallback label="正在加载编辑器..." />}>
                  {selectedTool === QCToolType.PARETO ? (
                    <ParetoEditor
                      data={paretoData}
                      styles={paretoStyles}
                      showLine={showParetoLine}
                      onShowLineChange={setShowParetoLine}
                      onUpdate={(d, s) => { setParetoData(d); setParetoStyles(s); }}
                    />
                  ) : selectedTool === QCToolType.CONTROL ? (
                    <ControlChartEditor
                      dsl={controlDsl}
                      onDslChange={setControlDsl}
                    />
                  ) : selectedTool === QCToolType.FISHBONE ? (
                    <FishboneEditor
                      data={fishboneData}
                      styles={fishboneStyles}
                      onDataChange={setFishboneData}
                      onStylesChange={setFishboneStyles}
                    />
                  ) : selectedTool === QCToolType.HISTOGRAM ? (
                    <HistogramEditor
                      data={histogramData}
                      styles={histogramStyles}
                      onUpdate={(d, s) => {
                        setHistogramData(d);
                        setHistogramStyles(s);
                      }}
                    />
                  ) : selectedTool === QCToolType.SCATTER ? (
                    <ScatterEditor
                      data={scatterData}
                      styles={scatterStyles}
                      onDataChange={setScatterData}
                      onStylesChange={setScatterStyles}
                    />
                  ) : selectedTool === QCToolType.AFFINITY ? (
                    <AffinityEditor
                      data={affinityData}
                      styles={affinityStyles}
                      onDataChange={setAffinityData}
                      onStylesChange={setAffinityStyles}
                    />
                  ) : selectedTool === QCToolType.RELATION ? (
                    <RelationEditor
                      nodes={relationNodes}
                      links={relationLinks}
                      styles={relationStyles}
                      onDataChange={(n, l) => { setRelationNodes(n); setRelationLinks(l); }}
                      onStylesChange={setRelationStyles}
                    />
                  ) : selectedTool === QCToolType.MATRIX ? (
                    matrixData ? (
                      <MatrixEditor
                        data={matrixData}
                        styles={matrixStyles}
                        dsl={matrixDsl}
                        onDataChange={setMatrixData}
                        onStylesChange={setMatrixStyles}
                        onDslChange={setMatrixDsl}
                      />
                    ) : <div className="text-slate-500 p-8">Initializing Matrix...</div>
                  ) : selectedTool === QCToolType.MATRIX_PLOT ? (
                    matrixPlotData ? (
                      <MatrixPlotEditor
                        data={matrixPlotData}
                        styles={matrixPlotStyles}
                        onDataChange={setMatrixPlotData}
                        onStylesChange={setMatrixPlotStyles}
                      />
                    ) : <div className="text-slate-500 p-8">Initializing Matrix Plot...</div>
                  ) : selectedTool === QCToolType.PDPC ? (
                    <PDPCEditor
                      data={pdpcData}
                      styles={pdpcStyles}
                      onDataChange={setPdpcData}
                      onStylesChange={setPdpcStyles}
                    />
                  ) : selectedTool === QCToolType.ARROW ? (
                    arrowData ? (
                      <ArrowDiagramEditor
                        data={arrowData}
                        styles={arrowStyles}
                        onDataChange={setArrowData}
                        onStylesChange={setArrowStyles}
                      />
                    ) : <div className="text-slate-500 p-8">Initializing Arrow Diagram...</div>
                  ) : selectedTool === QCToolType.BASIC ? (
                    <BasicEditor
                      data={basicData}
                      styles={basicStyles}
                      onDataChange={setBasicData}
                      onStylesChange={setBasicStyles}
                    />
                  ) : selectedTool === QCToolType.FLOW ? (
                    <FlowEditor
                      data={flowData}
                      styles={flowStyles}
                      onDataChange={setFlowData}
                      onStylesChange={setFlowStyles}
                    />
                  ) : selectedTool === QCToolType.RADAR ? (
                    <RadarEditor
                      data={radarData}
                      styles={radarStyles}
                      onDataChange={setRadarData}
                      onStylesChange={setRadarStyles}
                    />
                  ) : selectedTool === QCToolType.MERMAID ? (
                    <MermaidEditor
                      data={mermaidData}
                      styles={mermaidStyles}
                      onDataChange={setMermaidData}
                      onStylesChange={setMermaidStyles}
                    />
                  ) : selectedTool === QCToolType.VCHART ? (
                    <VChartEditor
                      data={vchartData}
                      styles={vchartStyles}
                      theme={theme}
                      onDataChange={setVchartData}
                      onStylesChange={setVchartStyles}
                    />
                  ) : null}
                </Suspense>
              </ErrorBoundary>
            </div>

          </div>
        }
        canvasContent={
          <div className="w-full h-full flex flex-col relative bg-[var(--bg-page)]">
            <header className="h-24 bg-[var(--header-bg)] backdrop-blur-2xl border-b border-[var(--border-light)] flex items-center justify-between px-12 shrink-0 z-40 transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-1.5 h-12 bg-primary rounded-full" />
                <div>
                  <h2 className="font-black text-[var(--text-main)] text-2xl tracking-tighter uppercase">{currentTool?.name}</h2>
                  <div className="px-3 py-1 bg-primary/10 text-primary rounded-md text-[11px] font-black tracking-widest border border-primary/20 uppercase mt-1 inline-block">Live Engine</div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex gap-2 bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)] items-center">
                  <span className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-3 mr-1">画布操作</span>
                  <button
                    onClick={() => diagramRef.current?.tidyLayout?.()}
                    className="p-2.5 bg-[var(--card-bg)] shadow-sm rounded-md text-[var(--text-main)] hover:text-primary hover:shadow-md transition-all flex items-center gap-2 group border border-[var(--border-light)]"
                  >
                    <LayoutGrid size={16} />
                    <span className="text-[11px] font-black uppercase tracking-widest">整理布局</span>
                  </button>
                  <div className="w-px h-6 bg-[var(--border-light)] mx-1" />
                  <span className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 mr-1">导出</span>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="p-2.5 bg-[var(--card-bg)] shadow-sm rounded-md text-[var(--text-main)] hover:text-primary hover:shadow-md transition-all flex items-center gap-2 group border border-[var(--border-light)]"
                  >
                    <Image size={16} />
                    <span className="text-[11px] font-black uppercase tracking-widest">导出 PNG</span>
                  </button>
                  <button
                    onClick={() => diagramRef.current?.exportPDF?.(false)}
                    className="p-2.5 bg-[var(--card-bg)] shadow-sm rounded-md text-[var(--text-main)] hover:text-primary hover:shadow-md transition-all flex items-center gap-2 border border-[var(--border-light)]"
                  >
                    <FileText size={16} />
                    <span className="text-[11px] font-black uppercase tracking-widest">有底 PDF</span>
                  </button>
                  <button
                    onClick={() => diagramRef.current?.exportPDF?.(true)}
                    className="p-2.5 bg-[var(--card-bg)] shadow-sm rounded-md text-[var(--text-main)] hover:text-primary hover:shadow-md transition-all flex items-center gap-2 border border-[var(--border-light)]"
                  >
                    <Download size={16} />
                    <span className="text-[11px] font-black uppercase tracking-widest">透明 PDF</span>
                  </button>
                </div>
                <div className="w-11 h-11 bg-[var(--card-bg)] rounded-md overflow-hidden shadow-md border border-[var(--border-light)] flex items-center justify-center p-1.5" title="鹿溪联合创新实验室 · LUXI LAB">
                  <img src={theme === 'dark' ? '/brand/luxi-lab-inverse.svg' : '/brand/luxi-lab.svg'} alt="LUXI LAB" className="w-full h-full object-contain" />
                </div>
              </div>
            </header>

            <div className="flex-1 relative min-h-0 bg-[var(--card-bg)] transition-colors">
              <ErrorBoundary resetKey={selectedTool} fallbackTitle="图表引擎渲染异常">
                <Suspense fallback={<ModuleLoadingFallback label="正在加载图表渲染引擎..." />}>
                  {(() => {
                    switch (selectedTool) {
                      case QCToolType.FISHBONE: return <FishboneDiagram ref={diagramRef} data={fishboneData} styles={fishboneStyles} />;
                      case QCToolType.PARETO: return (
                        <ParetoDiagram
                          ref={diagramRef}
                          data={paretoData}
                          styles={paretoStyles}
                          showLine={showParetoLine}
                        />
                      );
                      case QCToolType.CONTROL: return <ControlChart ref={diagramRef} series={controlSeries} styles={controlStyles} />;
                      case QCToolType.HISTOGRAM:
                        return <HistogramDiagram ref={diagramRef} data={histogramData} styles={histogramStyles} />;
                      case QCToolType.SCATTER:
                        return <ScatterDiagram ref={diagramRef} data={scatterData} styles={scatterStyles} />;
                      case QCToolType.AFFINITY:
                        return <AffinityDiagram ref={diagramRef} data={affinityData} styles={affinityStyles} />;
                      case QCToolType.RELATION:
                        return <RelationDiagram ref={diagramRef} nodes={relationNodes} links={relationLinks} styles={relationStyles} />;
                      case QCToolType.MATRIX:
                        return matrixData ? <MatrixDiagram ref={diagramRef} data={matrixData} styles={matrixStyles} onCellClick={handleMatrixCellClick} /> : null;
                      case QCToolType.MATRIX_PLOT:
                        return matrixPlotData ? <MatrixPlotDiagram ref={diagramRef} data={matrixPlotData} styles={matrixPlotStyles} /> : null;
                      case QCToolType.PDPC:
                        return <PDPCDiagram ref={diagramRef} data={pdpcData} styles={pdpcStyles} onStylesChange={setPdpcStyles} />;
                      case QCToolType.ARROW:
                        return arrowData ? <ArrowDiagram ref={diagramRef} data={arrowData} styles={arrowStyles} /> : null;
                      case QCToolType.BASIC:
                        return <BasicDiagram ref={diagramRef} data={basicData} styles={basicStyles} />;
                      case QCToolType.FLOW:
                        return <FlowDiagram ref={diagramRef as any} data={flowData} styles={flowStyles} />;
                      case QCToolType.RADAR:
                        return <RadarDiagram ref={diagramRef} data={radarData} styles={radarStyles} />;
                      case QCToolType.MERMAID:
                        return <MermaidDiagram ref={diagramRef} data={mermaidData} styles={mermaidStyles} />;
                      case QCToolType.VCHART:
                        return <VChartDiagram ref={diagramRef} data={vchartData} styles={vchartStyles} theme={theme} />;

                      default: return (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-page)]">
                          <Cpu className="w-32 h-32 text-[var(--border-light)] mb-8" />
                          <p className="text-3xl font-black text-[var(--border-light)] uppercase tracking-[0.4em]">Unit Offline</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-4 font-black uppercase tracking-[0.2em]">Logic injection required from terminal</p>
                        </div>
                      );
                    }
                  })()}
                </Suspense>
              </ErrorBoundary>
            </div>

            <footer className="h-20 border-t border-[var(--border-light)] px-12 flex items-center justify-between shrink-0 bg-[var(--header-bg)] backdrop-blur-xl transition-colors">
              <div className="flex items-center gap-10">
                <p className="text-[11px] text-[var(--text-muted)] font-black uppercase tracking-[0.25em] flex items-center gap-4">
                  <span className="w-2.5 h-2.5 bg-[var(--state-up)] rounded-full" />
                  Precision Computing Active
                </p>
                <div className="h-5 w-px bg-[var(--border-light)]" />
                <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Sample Rate: 60Hz</p>
              </div>
              <div className="flex gap-6">
                <button
                  onClick={() => diagramRef.current?.exportPDF?.(false)}
                  className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-main)] transition-all"
                >
                  导出分析报告 (PDF)
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="text-[11px] font-black text-primary uppercase tracking-widest hover:opacity-80 transition-all"
                >
                  配置高清导出 (PNG)
                </button>
              </div>
            </footer>
          </div>
        }
      />

      {/* Export Settings Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-[var(--card-bg)] border border-[var(--border-line-r)] rounded-md shadow-md w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-line-r)] bg-[var(--bg-main)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Sliders size={18} className="text-primary" />
                </div>
                <h3 className="text-sm font-black text-[var(--text-main)] tracking-widest uppercase">配置导出参数</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-[var(--border-light)] rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[var(--text-main)]">渲染倍率 (Resolution Scale)</label>
                  <span className="text-[11px] font-black text-primary">{exportScale} 倍画幅</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={exportScale}
                  onChange={(e) => setExportScale(parseInt(e.target.value))}
                  className="w-full h-2 bg-[var(--border-light)] rounded-md appearance-none cursor-pointer"
                />
                <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed">较高的倍率可以生成更清晰的图片用于印刷或大屏展示，但文件体积也会相应增加。建议日常使用维持在默认 3 倍。</p>
              </div>

              <div className="p-4 bg-[var(--bg-main)] rounded-md border border-[var(--border-line-r)]">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[11px] font-bold text-[var(--text-main)] group-hover:text-primary transition-colors">透明背景 (Transparent Background)</span>
                  <input
                    type="checkbox"
                    checked={exportTransparent}
                    onChange={(e) => setExportTransparent(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-light)] bg-[var(--card-bg)] cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-[var(--border-line-r)] bg-[var(--bg-main)] flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-5 py-2.5 rounded-md text-[11px] font-bold text-[var(--text-muted)] hover:bg-[var(--border-light)] transition-all"
              >
                取消
              </button>
              <button
                onClick={() => {
                  diagramRef.current?.exportPNG?.(exportTransparent, exportScale);
                  setShowExportModal(false);
                }}
                className="px-5 py-2.5 bg-primary hover:opacity-90 text-white rounded-md text-[11px] font-black tracking-widest uppercase shadow-md transition-all flex items-center gap-2"
              >
                <Download size={14} />
                确认生成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
