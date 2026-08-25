/**
 * IQS-Flow 泳道矩阵渲染（G6）
 * 自研：手动计算矩阵坐标 → G6 preset 布局 + combos（泳道格）+ 正交边。
 */
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Graph } from '@antv/g6';
import { Workflow } from 'lucide-react';
import { FlowData, FlowChartStyles, DEFAULT_FLOW_STYLES, BaseDiagramRef } from '../../types';

export interface FlowDiagramRef extends BaseDiagramRef {}

interface FlowDiagramProps {
  data: FlowData;
  styles?: FlowChartStyles;
  onStylesChange?: (styles: FlowChartStyles) => void;
  className?: string;
}

/** 泳道网格布局参数 */
const CELL_W = 220;
const CELL_H = 140;
const X_GAP = 60;
const Y_GAP = 80;
const AXIS_HEAD = 46;

/** 计算矩阵坐标：行=H lanes，列=V lanes */
function computeMatrix(data: FlowData) {
  const hLanes = data.lanes.filter((l) => l.layout === 'H');
  const vLanes = data.lanes.filter((l) => l.layout === 'V');

  // 行索引：H lane dict → 位置顺序
  const rows: string[] = [];   // 行轴 key（如 D）
  const rowIdx: string[] = []; // 该行对应 lane 字典名
  const cols: string[] = [];

  for (const l of hLanes) {
    for (const idx of l.indices) {
      rows.push(`${l.dict}`);      // 行字典
      rowIdx.push(String(idx));    // 行索引
    }
  }
  for (const l of vLanes) {
    for (const idx of l.indices) {
      cols.push(`${l.dict}${idx}`); // 列坐标键
    }
  }

  return { rows, cols, hLanes, vLanes, rowIdx };
}

function cellKeyOf(node: { cell: FlowData['nodes'][0]['cell'] }): string | null {
  if (!node.cell) return null;
  const keys = Object.keys(node.cell);
  if (keys.length === 0) return null;
  // 假定 cell 形如 { D: 0, P: 1 }；可含 1-2 维
  const first = keys[0];
  const second = keys[1];
  if (second === undefined) return `${first}${node.cell[first]}`;
  return `${first}${node.cell[first]}${second}${node.cell[second]}`;
}

const FlowDiagram = forwardRef<FlowDiagramRef, FlowDiagramProps>(({ data, styles, className }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const finalStyles = { ...DEFAULT_FLOW_STYLES, ...styles };

  useImperativeHandle(ref, () => ({
    getDataURL: async (options) => {
      if (!graphRef.current) return '';
      const pixelRatio = options?.pixelRatio || 3;
      const backgroundColor = options?.backgroundColor || '#ffffff';
      if (options?.width && options?.height) {
        graphRef.current.setSize(options.width, options.height);
        graphRef.current.fitView({ padding: 40 } as any);
      }
      const graphCanvasData = await graphRef.current.toDataURL({
        backgroundColor,
        pixelRatio
      } as any);
      if (!data.title) return graphCanvasData;
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(graphCanvasData); return; }
          const titleHeight = 60 * pixelRatio;
          canvas.width = img.width;
          canvas.height = img.height + titleHeight;
          if (backgroundColor !== 'transparent') {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.fillStyle = finalStyles.axisColor;
          ctx.font = `bold ${finalStyles.titleFontSize * pixelRatio}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(data.title || '', canvas.width / 2, titleHeight / 2);
          ctx.drawImage(img, 0, titleHeight);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = graphCanvasData;
      });
    },
    exportPNG: async (transparent = false, scale = 3) => {
      if (!graphRef.current || !containerRef.current) return;
      const graphCanvas = await graphRef.current.toDataURL({
        backgroundColor: transparent ? 'transparent' : '#ffffff',
        pixelRatio: scale
      });
      const a = document.createElement('a');
      a.href = graphCanvas;
      a.download = `${data.title || 'flow'}.png`;
      a.click();
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 900;
    const height = containerRef.current.clientHeight || 700;

    const { hLanes, vLanes, cols, rows, rowIdx } = computeMatrix(data);

    // ===== 构建矩阵 cell → combo =====
    const combos: any[] = [];
    const combosByCell = new Map<string, string>();

    // 阶段列名
    function colNameAt(j: number): string {
      const cls = cols[j];
      const l = vLanes.length ? vLanes[0] : null;
      const dict = l && cls ? data.dicts[l.dict] : undefined;
      if (l && cls) {
        const num = cls.replace(l.dict, '');
        const n = parseInt(num, 10);
        if (dict && dict[n] !== undefined) return dict[n];
      }
      return cls || '';
    }

    // 创建格子 combo
    for (let ri = 0; ri < rows.length; ri++) {
      for (let ci = 0; ci < cols.length; ci++) {
        const cellKey = `${rows[ri]}${rowIdx[ri] || 0}${cols[ci]}`;
        const cid = `cell_${ri}_${ci}`;
        combosByCell.set(cellKey, cid);
        combos.push({
          id: cid,
          data: {
            x: AXIS_HEAD + ci * (CELL_W + X_GAP),
            y: AXIS_HEAD + ri * (CELL_H + Y_GAP),
            size: [CELL_W, CELL_H],
          }
        });
      }
    }

    // ===== 节点 → 坐标 =====
    const g6Nodes = data.nodes.map((n) => {
      const cellKey = cellKeyOf(n);
      let x: number, y: number;
      // 尝试定位到格子
      let comboId: string | undefined;
      if (cellKey) {
        comboId = combosByCell.get(cellKey);
      }
      if (comboId) {
        const [ri, ci] = comboId.replace('cell_', '').split('_').map(Number);
        const gx = AXIS_HEAD + ci * (CELL_W + X_GAP);
        const gy = AXIS_HEAD + ri * (CELL_H + Y_GAP);
        // 格子内节点偏移 —— 由 preset 布局处理，这里给粗略位置
        x = gx + 30;
        y = gy + 20;
      } else {
        // 无泳道坐标：按顺序排布
        const ord = orderOf(n, data);
        x = 80 + ord * (CELL_W + X_GAP - 180);
        y = height / 2;
      }
      const shape = flowShape(n.type, finalStyles);
      const label = dictExpandLabel(n, data);
      return {
        id: n.id,
        combo: comboId,
        data: {
          x,
          y,
          ...shape,
          labelText: label,
          labelFontSize: finalStyles.nodeFontSize,
          labelFill: finalStyles.textColor,
          labelBackground: true,
          labelBackgroundFill: '#ffffff',
        },
        style: shape.style
      };
    });

    // ===== 边 =====
    const g6Edges = data.edges.filter((e) => !e.parent).map((e) => {
      const label = e.label || '';
      return {
        id: e.id,
        source: e.from,
        target: e.to,
        data: {
          labelText: label,
          labelFontSize: 11,
          labelFill: '#64748b',
          endArrow: true,
        },
        style: {
          lineWidth: finalStyles.lineWidth,
          stroke: finalStyles.lineColor,
          radius: 16,
          lineAppendWidth: 12,
          ...(label ? {} : { endArrow: true })
        }
      };
    });

    const buildGraph = (g: Graph) => {
      g.setData({ nodes: g6Nodes, edges: g6Edges, combos });
      g.setLayout({ type: 'preset' } as any);
      g.render();
    };

    if (!graphRef.current) {
      const graph = new Graph({
        container: containerRef.current,
        width,
        height,
        data: { nodes: g6Nodes, edges: g6Edges, combos },
        layout: { type: 'preset' } as any,
        behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
        autoFit: { type: 'view', options: { padding: 40 } } as any,
        node: {
          style: {
            labelText: (d: any) => d.data?.labelText || '',
            labelFontSize: finalStyles.nodeFontSize,
            labelFill: finalStyles.textColor,
            labelBackground: true,
            labelBackgroundFill: '#ffffff',
            labelBackgroundRadius: 4,
            size: 44,
          }
        },
        edge: {
          style: {
            radius: 14,
            lineWidth: finalStyles.lineWidth,
            stroke: finalStyles.lineColor,
            endArrow: true,
          }
        },
        combo: {
          style: {
            fill: finalStyles.laneColor,
            fillOpacity: 0.35,
            stroke: '#cbd5e1',
            lineWidth: 1,
            radius: 8,
            // 加大小以容纳节点
          }
        }
      });
      graphRef.current = graph;
      graph.render();
    } else {
      buildGraph(graphRef.current);
      graphRef.current.fitView({ padding: 40, duration: 500 } as any);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!containerRef.current || !graphRef.current) return;
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0 && h > 0) {
        graphRef.current.setSize(w, h);
        graphRef.current.fitView({ padding: 40 } as any);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [data, JSON.stringify(data)]);

  return (
    <div className={className} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {data.axes.page?.title ? (
        <div ref={titleRef} className="text-center font-bold py-1" style={{ color: finalStyles.axisColor, fontSize: finalStyles.titleFontSize }}>
          {data.title}
        </div>
      ) : null}
      <div ref={containerRef} className="flex-1" style={{ minHeight: 0 }} />
    </div>
  );
});

// —— 辅助函数 ——

function orderOf(n: { id: string }, data: FlowData): number {
  const idx = data.nodes.findIndex((x) => x.id === n.id);
  return idx < 0 ? 0 : idx;
}

function dictExpandLabel(n: FlowData['nodes'][0], data: FlowData): string {
  if (n.label) return n.label;
  return n.labelRef || n.id;
}

function flowShape(type: string, st: any) {
  switch (type) {
    case 'start':
      return { style: { shape: 'circle', r: 16, fill: st.startColor, stroke: 'none', origin: 'center' } };
    case 'end':
      return { style: { shape: 'circle', r: 16, fill: st.endColor, stroke: '#ffffff', lineWidth: 4, origin: 'center' } };
    case 'exclusiveGateway':
      return { style: { shape: 'diamond', r: 20, fill: st.gatewayColor, stroke: 'none', origin: 'center' } };
    case 'parallelGateway':
      return { style: { shape: 'diamond', r: 20, fill: st.parallelColor, stroke: 'none', origin: 'center' } };
    case 'subprocess':
      return { style: { shape: 'rect', r: 6, fill: st.subprocessColor, stroke: '#f8fafc', lineWidth: 2, size: [100, 48] } };
    case 'annotation':
      return { style: { shape: 'rect', r: 2, fill: st.annotationColor, stroke: 'none', size: [120, 40] } };
    case 'dataObject':
      return { style: { shape: 'rect', r: 4, fill: st.dataColor, stroke: 'none', size: [90, 40] } };
    case 'task':
    default:
      return { style: { shape: 'rect', r: 6, fill: st.taskColor, stroke: '#f8fafc', lineWidth: 1, size: [100, 44] } };
  }
}

export default FlowDiagram;
