import React, { useState, useRef } from 'react';
import { QCToolType } from './types';
import {
  TOOL_CONFIGS,
  INITIAL_FISHBONE_DSL,
  INITIAL_PARETO_DSL,
  INITIAL_PARETO_DATA,
  INITIAL_CONTROL_DATA,
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
  INITIAL_VCHART_DSL
} from './constants';
import {
  DEFAULT_PARETO_STYLES,
  DEFAULT_FISHBONE_STYLES,
  DEFAULT_HISTOGRAM_STYLES,
  DEFAULT_SCATTER_STYLES,
  DEFAULT_AFFINITY_STYLES,
  DEFAULT_RELATION_STYLES,
  DEFAULT_MATRIX_STYLES,
  ScatterChartStyles,
  AffinityChartStyles,
  RelationNode,
  RelationLink,
  RelationChartStyles,
  MatrixData,
  MatrixChartStyles,
  MatrixPlotData,
  MatrixPlotStyles,
  DEFAULT_MATRIX_PLOT_STYLES,
  PDPCData,
  PDPCChartStyles,
  DEFAULT_PDPC_STYLES,
  ArrowData,
  ArrowChartStyles,
  DEFAULT_ARROW_STYLES,
  FishboneNode,
  ParetoItem,
  ScatterPoint,
  AffinityItem,
  BasicChartData,
  BasicChartStyles,
  DEFAULT_BASIC_STYLES,
  RadarData,
  RadarChartStyles,
  DEFAULT_RADAR_STYLES,
  MermaidChartStyles,
  DEFAULT_MERMAID_STYLES,
  VChartData,
  VChartChartStyles,
  DEFAULT_VCHART_STYLES
} from './types';
import { Workspace } from './components/layout/Workspace';
import { DashboardView } from './components/DashboardView';
import { EditorPanel } from './components/EditorPanel';
import FishboneDiagram, { FishboneDiagramRef } from './components/FishboneDiagram';
import { ParetoDiagram, ParetoDiagramRef } from './components/ParetoDiagram';
import { HistogramDiagram } from './components/HistogramDiagram';
import { ScatterDiagram } from './components/ScatterDiagram';
import { AffinityDiagram } from './components/AffinityDiagram';
import { ParetoEditor } from './components/ParetoEditor';
import { HistogramEditor } from './components/HistogramEditor';
import FishboneEditor from './components/FishboneEditor';
import ScatterEditor from './components/ScatterEditor';
import AffinityEditor from './components/AffinityEditor';
import RelationEditor, { parseRelationDSL } from './components/RelationEditor';
import RelationDiagram from './components/RelationDiagram';
import ControlChartEditor, { parseControlDSL } from './components/ControlChartEditor';
import ControlChart from './components/ControlChart';
import MatrixEditor, { parseMatrixDSL, updateMatrixDSL } from './components/MatrixEditor';
import { MatrixDiagram } from './components/MatrixDiagram';
import MatrixPlotEditor, { parseMatrixPlotDSL } from './components/MatrixPlotEditor';
import { MatrixPlotDiagram } from './components/MatrixPlotDiagram';
import PDPCEditor, { parsePDPCDSL } from './components/PDPCEditor';
import PDPCDiagram from './components/PDPCDiagram';
import { ArrowDiagram } from './components/ArrowDiagram';
import { ArrowDiagramEditor, parseArrowDSL } from './components/ArrowDiagramEditor';
import BasicEditor, { parseBasicDSL } from './components/BasicEditor';
import BasicDiagram from './components/BasicDiagram';
import FlowEditor from './components/flow/FlowEditor';
import FlowDiagram from './components/flow/FlowDiagram';
import { parseFlowDSL } from './components/flow/FlowParser';
import { INITIAL_FLOW_DSL, INITIAL_FLOW_DATA } from './constants';
import type { FlowData, FlowChartStyles } from './types';
import { DEFAULT_FLOW_STYLES } from './types';
import RadarEditor, { parseRadarDSL } from './components/RadarEditor';
import RadarDiagram from './components/RadarDiagram';
import { MermaidDiagram, MermaidDiagramRef } from './components/MermaidDiagram';
import MermaidEditor from './components/MermaidEditor';
import VChartEditor, { parseVChartDSL } from './components/VChartEditor';
import VChartDiagram from './components/VChartDiagram';

import { Zap, Settings, Globe, LayoutGrid, Download, FileText, Image, Cpu, Loader2, LineChart, BarChart3, X, Sliders } from 'lucide-react';

// --- DSL Parsing Functions (Move outside to support Lazy Initialization) ---

const parseInitialFishbone = (customDsl?: string) => {
  try {
    const lines = (customDsl || INITIAL_FISHBONE_DSL).split('\n');
    let title = '生产线停产原因分析';
    const mainBranches: FishboneNode[] = [];
    const newStyles = { ...DEFAULT_FISHBONE_STYLES };

    let currentMain: FishboneNode | null = null;
    let currentSub: FishboneNode | null = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) return;

      if (trimmed.startsWith('Title:')) {
        title = trimmed.split(':')[1].trim();
        return;
      }

      const colorMatch = trimmed.match(/Color\[(\w+)\]:\s*(#[0-9a-fA-F]{6})/);
      if (colorMatch) {
        const keyMap: any = {
          'Bone': 'boneLine',
          'Line': 'boneLine',
          'Root': 'rootColor',
          'RootText': 'rootTextColor',
          'Main': 'mainColor',
          'MainText': 'mainTextColor',
          'Text': 'caseColor',
          'End': 'endColor'
        };
        const key = keyMap[colorMatch[1]];
        if (key) newStyles[key] = colorMatch[2];
        return;
      }

      if (trimmed.startsWith('###')) {
        if (currentSub) {
          currentSub.children.push({
            id: Math.random().toString(36).substr(2, 9),
            label: trimmed.substring(3).trim(),
            type: 'sub',
            children: []
          });
        }
      } else if (trimmed.startsWith('##')) {
        if (currentMain) {
          currentSub = {
            id: Math.random().toString(36).substr(2, 9),
            label: trimmed.substring(2).trim(),
            type: 'sub',
            children: []
          };
          currentMain.children.push(currentSub);
        }
      } else if (trimmed.startsWith('#')) {
        currentMain = {
          id: Math.random().toString(36).substr(2, 9),
          label: trimmed.substring(1).trim(),
          type: 'main',
          children: []
        };
        mainBranches.push(currentMain);
        currentSub = null;
      }
    });

    return { data: { id: 'root', label: title, type: 'root', children: mainBranches }, styles: newStyles };
  } catch (e) {
    console.error('Fishbone Init Error:', e);
    return { data: { id: 'root', label: '核心问题', type: 'root', children: [] }, styles: DEFAULT_FISHBONE_STYLES };
  }
};

const parseInitialPareto = (customDsl?: string) => {
  const lines = (customDsl || INITIAL_PARETO_DSL).split('\n');
  const newItems: any[] = [];
  const newStyles: any = { ...DEFAULT_PARETO_STYLES };
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const titleMatch = trimmed.match(/^Title:\s*(.+)/);
    if (titleMatch) { newStyles.title = titleMatch[1]; return; }
    const colorMatch = trimmed.match(/Color\[(Bar|Line|MarkLine|Title)\]:\s*(#[0-9a-fA-F]+)/);
    if (colorMatch) {
      const key = colorMatch[1].charAt(0).toLowerCase() + colorMatch[1].slice(1) + 'Color';
      newStyles[key] = colorMatch[2]; return;
    }
    const decimalMatch = trimmed.match(/^Decimals:\s*(\d+)/);
    if (decimalMatch) { newStyles.decimals = parseInt(decimalMatch[1]); return; }
    const itemMatch = trimmed.match(/^-\s*(.+):\s*(\d+)/);
    if (itemMatch) {
      newItems.push({ id: Math.random().toString(36).substr(2, 9), name: itemMatch[1].trim(), value: parseInt(itemMatch[2]) });
    }
  });
  return { items: newItems.length > 0 ? newItems : INITIAL_PARETO_DATA, styles: newStyles };
};

const parseInitialHistogram = (customDsl?: string) => {
  const lines = (customDsl || INITIAL_HISTOGRAM_DSL).split('\n');
  const newData: number[] = [];
  const newStyles: any = { ...DEFAULT_HISTOGRAM_STYLES };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const titleMatch = trimmed.match(/^Title:\s*(.+)/);
    if (titleMatch) { newStyles.title = titleMatch[1].trim(); return; }
    const colorMatch = trimmed.match(/Color\[(Bar|Curve|USL|LSL|Target)\]:\s*(#[0-9a-fA-F]+)/i);
    if (colorMatch) { newStyles[colorMatch[1].toLowerCase() + 'Color'] = colorMatch[2]; return; }
    const specMatch = trimmed.match(/^(USL|LSL|Target):\s*([\d\.-]+)/);
    if (specMatch) { newStyles[specMatch[1].toLowerCase()] = parseFloat(specMatch[2]); return; }
    const curveMatch = trimmed.match(/^ShowCurve:\s*(true|false)/i);
    if (curveMatch) { newStyles.showCurve = curveMatch[1].toLowerCase() === 'true'; return; }
    const binsMatch = trimmed.match(/^Bins:\s*(auto|\d+)/i);
    if (binsMatch) { newStyles.bins = binsMatch[1].toLowerCase() === 'auto' ? 'auto' : parseInt(binsMatch[1]); return; }
    const dataMatch = trimmed.match(/^-\s*([\d\.-]+)/);
    if (dataMatch) newData.push(parseFloat(dataMatch[1]));
  });
  return { data: newData, styles: newStyles };
};

const parseInitialScatter = (customDsl?: string) => {
  const lines = (customDsl || INITIAL_SCATTER_DSL).split('\n');
  const newStyles: any = { ...DEFAULT_SCATTER_STYLES };
  const newPoints: any[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    if (trimmed.includes(':') && !trimmed.startsWith('-')) {
      const [key, ...vals] = trimmed.split(':');
      const val = vals.join(':').trim();
      switch (key.trim()) {
        case 'Title': newStyles.title = val; break;
        case 'XAxis': newStyles.xAxisLabel = val; break;
        case 'YAxis': newStyles.yAxisLabel = val; break;
        case 'Color[Point]': newStyles.pointColor = val; break;
        case 'Color[Trend]': newStyles.trendColor = val; break;
        case 'ShowTrend': newStyles.showTrend = val.toLowerCase() === 'true'; break;
        case 'ZAxis': newStyles.zAxisLabel = val; break;
        case '3D': newStyles.is3D = val.toLowerCase() === 'true'; break;
        case 'Size[Base]': newStyles.baseSize = parseFloat(val); break;
        case 'Opacity': newStyles.opacity = parseFloat(val); break;
      }
      return;
    }
    if (trimmed.startsWith('-')) {
      const parts = trimmed.substring(1).split(',').map(s => parseFloat(s.trim()));
      if (parts.length >= 2) newPoints.push({ id: Math.random().toString(36).substr(2, 9), x: parts[0], y: parts[1], z: parts[2] });
    }
  });
  const finalData = newPoints.length > 0 ? newPoints : INITIAL_SCATTER_DATA;
  return { data: finalData, styles: newStyles };
};

const parseInitialAffinity = (customDsl?: string) => {
  const lines = (customDsl || INITIAL_AFFINITY_DSL).split('\n');
  const newStyles: any = { ...DEFAULT_AFFINITY_STYLES };
  const items: AffinityItem[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return;

    if (trimmed.startsWith('Title:')) {
      newStyles.title = trimmed.split(':')[1].trim();
    } else if (trimmed.startsWith('Type:')) {
      newStyles.type = trimmed.split(':')[1].trim() as any;
    } else if (trimmed.startsWith('Layout:')) {
      newStyles.layout = trimmed.split(':')[1].trim() as any;
    } else if (trimmed.startsWith('Color[')) {
      const match = trimmed.match(/Color\[(TitleBg|TitleText|GroupHeaderBg|GroupHeaderText|ItemBg|ItemText|Line|Border)\]:\s*(#[0-9a-fA-F]+)/i);
      if (match) {
        const keyMap: any = {
          'TitleBg': 'titleBackgroundColor',
          'TitleText': 'titleTextColor',
          'GroupHeaderBg': 'groupHeaderBackgroundColor',
          'GroupHeaderText': 'groupHeaderTextColor',
          'ItemBg': 'itemBackgroundColor',
          'ItemText': 'itemTextColor',
          'Line': 'lineColor',
          'Border': 'borderColor'
        };
        newStyles[keyMap[match[1]]] = match[2];
      }
    } else if (trimmed.startsWith('Font[')) {
      const match = trimmed.match(/Font\[(Title|GroupHeader|Item)\]:\s*(\d+)/i);
      if (match) {
        const keyMap: any = {
          'Title': 'titleFontSize',
          'GroupHeader': 'groupHeaderFontSize',
          'Item': 'itemFontSize'
        };
        newStyles[keyMap[match[1]]] = parseInt(match[2]);
      }
    } else if (trimmed.startsWith('Item:')) {
      const parts = trimmed.replace('Item:', '').split(',').map(s => s.trim());
      if (parts.length >= 2) {
        items.push({
          id: parts[0],
          label: parts[1],
          parentId: parts[2] || undefined,
          children: []
        });
      }
    }
  });

  // Reconstruct Tree
  const rootItems: AffinityItem[] = [];
  const itemMap = new Map<string, AffinityItem>();
  items.forEach(i => itemMap.set(i.id, i));

  items.forEach(item => {
    if (item.parentId && itemMap.has(item.parentId)) {
      const parent = itemMap.get(item.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(item);
    } else {
      rootItems.push(item);
    }
  });

  // Find the explicit 'root' node and use its children as the data provider
  // for AffinityDiagram (which adds its own virtual root from styles.title).
  const realRootNode = items.find(i => i.id === 'root');
  const finalData = realRootNode && realRootNode.children ? realRootNode.children : rootItems.filter(i => i.id !== 'root');

  return { data: finalData.length > 0 ? finalData : INITIAL_AFFINITY_DATA, styles: newStyles };
};



const parseInitialRelation = (customDsl?: string) => {
  try {
    const { nodes, links, styles } = parseRelationDSL(customDsl || INITIAL_RELATION_DSL);
    return { nodes, links, styles };
  } catch (e) {
    console.error('Relation Init Error:', e);
    return { nodes: INITIAL_RELATION_DATA.nodes, links: INITIAL_RELATION_DATA.links, styles: DEFAULT_RELATION_STYLES };
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
    const TYPE_MAP: Record<string, QCToolType> = {
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
      pdpc: QCToolType.PDPC,
      arrow: QCToolType.ARROW,
      basic: QCToolType.BASIC,
      radar: QCToolType.RADAR,
      flow: QCToolType.FLOW,
      mermaid: QCToolType.MERMAID,
      vchart: QCToolType.VCHART
    };

    return {
      isHeadless: params.get('mode') === 'headless',
      headlessType: TYPE_MAP[typeStr] || null,
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
    try { return parsePDPCDSL(dsl).data; } catch { return INITIAL_PDPC_DATA; }
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
  const { series: controlSeries, styles: controlStyles } = React.useMemo(() => parseControlDSL(controlDsl), [controlDsl]);

  // 引用图表组件的方法 (如导出)
  const diagramRef = useRef<any>(null);

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

  // --- ILDR Headless Bridge ---
  React.useEffect(() => {
    if (isHeadless) {
      // 1. Expose the capture function
      (window as any).captureIQSChart = async (options?: { pixelRatio?: number; backgroundColor?: string; width?: number; height?: number }) => {
        if (!diagramRef.current) {
          console.error('[IQS Bridge] No diagramRef found');
          return '';
        }
        try {
          console.log('[IQS Bridge] Calling getDataURL with options:', options);
          return await diagramRef.current.getDataURL({
            pixelRatio: options?.pixelRatio || 3,
            backgroundColor: options?.backgroundColor || '#ffffff',
            width: options?.width,
            height: options?.height
          });
        } catch (err) {
          console.error('[IQS Bridge] getDataURL failed:', err);
          return '';
        }
      };

      // 2. Signal readiness after a safe settling time
      const timer = setTimeout(() => {
        console.log('[IQS Bridge] Setting IQS_READY = true');
        (window as any).IQS_READY = true;
      }, 500); // Give charts (ECharts/G6) some time to finish initial animations

      return () => {
        clearTimeout(timer);
        delete (window as any).captureIQSChart;
        delete (window as any).IQS_READY;
      };
    }
  }, [isHeadless, selectedTool, diagramRef]);

  if (isHeadless && headlessType) {
    return (
      <div className="w-full h-full min-h-screen bg-white">
        {(() => {
          switch (headlessType) {
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
                  className="w-10 h-10 rounded-2xl shadow-lg ring-1 ring-black/5 group-hover:shadow-xl group-hover:scale-105 transition-all"
                />
                <div className="text-left">
                  <h1 className="font-black text-[var(--sidebar-text)] text-lg tracking-tighter leading-none">澄矩 · ChengJu</h1>
                  <p className="text-[8px] text-[#0D5E42] dark:text-[#00D2FF] font-black tracking-[0.12em] mt-1 opacity-80">源清流澈，行止应矩</p>
                </div>
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
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
              ) : (
                <EditorPanel
                  toolType={selectedTool}
                  onDataUpdate={() => { }} // TODO: 针对 fallback 工具实现具体的更新逻辑
                  currentData={null}
                />
              )}
            </div>

          </div>
        }
        canvasContent={
          <div className="w-full h-full flex flex-col relative bg-[var(--bg-page)]">
            <header className="h-24 bg-[var(--header-bg)] backdrop-blur-2xl border-b border-[var(--border-light)] flex items-center justify-between px-12 shrink-0 z-40 transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-1.5 h-12 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)]" />
                <div>
                  <h2 className="font-black text-[var(--text-main)] text-2xl tracking-tighter uppercase">{currentTool?.name}</h2>
                  <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black tracking-widest border border-blue-100 dark:border-blue-800 uppercase mt-1">Live Engine</div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex gap-2 bg-[var(--input-bg)] p-1.5 rounded-2xl border border-[var(--input-border)] items-center">
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-3 mr-1">画布操作</span>
                  <button
                    onClick={() => diagramRef.current?.tidyLayout?.()}
                    className="p-3 bg-[var(--card-bg)] shadow-sm rounded-xl text-[var(--text-main)] hover:text-blue-600 hover:shadow-md transition-all flex items-center gap-2 group border border-[var(--border-light)]"
                  >
                    <LayoutGrid size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">整理布局</span>
                  </button>
                  <div className="w-px h-6 bg-[var(--border-light)] mx-1" />
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 mr-1">导出</span>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="p-3 bg-[var(--card-bg)] shadow-sm rounded-xl text-[var(--text-main)] hover:text-blue-600 hover:shadow-md transition-all flex items-center gap-2 group border border-[var(--border-light)]"
                  >
                    <Image size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">导出 PNG</span>
                  </button>
                  <button
                    onClick={() => diagramRef.current?.exportPDF?.(false)}
                    className="p-3 bg-[var(--card-bg)] shadow-sm rounded-xl text-[var(--text-main)] hover:text-red-600 hover:shadow-md transition-all flex items-center gap-2 border border-[var(--border-light)]"
                  >
                    <FileText size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">有底 PDF</span>
                  </button>
                  <button
                    onClick={() => diagramRef.current?.exportPDF?.(true)}
                    className="p-3 bg-[var(--card-bg)] shadow-sm rounded-xl text-[var(--text-main)] hover:text-indigo-600 hover:shadow-md transition-all flex items-center gap-2 border border-[var(--border-light)]"
                  >
                    <Download size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">透明 PDF</span>
                  </button>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-[var(--card-bg)] ring-8 ring-[var(--border-light)]">
                  <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${selectedTool}`} alt="avatar" />
                </div>
              </div>
            </header>

            <div className="flex-1 relative min-h-0 bg-[var(--card-bg)] transition-colors">
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
            </div>

            <footer className="h-20 border-t border-[var(--border-light)] px-12 flex items-center justify-between shrink-0 bg-[var(--header-bg)] backdrop-blur-xl transition-colors">
              <div className="flex items-center gap-10">
                <p className="text-[11px] text-[var(--text-muted)] font-black uppercase tracking-[0.25em] flex items-center gap-4">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_12px_#10b981]" />
                  Precision Computing Active
                </p>
                <div className="h-5 w-px bg-[var(--border-light)]" />
                <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Sample Rate: 60Hz</p>
              </div>
              <div className="flex gap-6">
                <button className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-main)] transition-all">导出原始数据 (CSV)</button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="text-[12px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:text-blue-700 transition-all"
                >
                  导出分析报告
                </button>
              </div>
            </footer>
          </div>
        }
      />

      {/* Export Settings Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl shadow-2xl w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-light)] bg-[var(--bg-main)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Sliders size={18} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-black text-[var(--text-main)] tracking-widest uppercase">配置导出参数</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-[var(--border-light)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-main)]">渲染倍率 (Resolution Scale)</label>
                  <span className="text-xs font-black text-blue-600">{exportScale} 倍画幅</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={exportScale}
                  onChange={(e) => setExportScale(parseInt(e.target.value))}
                  className="w-full h-2 bg-[var(--border-light)] rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[10px] text-[var(--text-muted)] font-medium">较高的倍率可以生成更清晰的图片用于印刷或大屏展示，但文件体积也会相应增加。建议日常使用维持在默认 3 倍。</p>
              </div>

              <div className="p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-light)]">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-blue-600 transition-colors">透明背景 (Transparent Background)</span>
                  <input
                    type="checkbox"
                    checked={exportTransparent}
                    onChange={(e) => setExportTransparent(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-light)] text-blue-600 focus:ring-blue-500 bg-[var(--card-bg)] cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-[var(--border-light)] bg-[var(--bg-main)] flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--border-light)] transition-all"
              >
                取消
              </button>
              <button
                onClick={() => {
                  diagramRef.current?.exportPNG?.(exportTransparent, exportScale);
                  setShowExportModal(false);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
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
