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

    // ===== 计算每个格子中心坐标 =====
    // 行 = H lanes（部门），列 = V lanes（阶段）
    function cellCx(ci: number): number { return AXIS_HEAD + ci * (CELL_W + X_GAP) + CELL_W / 2; }
    function cellCy(ri: number): number { return AXIS_HEAD + ri * (CELL_H + Y_GAP) + CELL_H / 2; }
    // 行名：H lane 对应字典按索引取名
    const rowNames: string[] = rows.map((rk, ri) => {
      const dict = data.dicts[rk];
      if (!dict) return rk;
      const l = hLanes.find((x) => x.dict === rk);
      const idx = l ? l.indices[ri % (l.indices.length || 1)] : parseInt(rowIdx[ri] || '0', 10);
      return dict[idx] !== undefined ? dict[idx] : String(idx);
    });
    // 列名：V lane（阶段）对应字典按索引取名
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

    // ===== 泳道格子衬底（独立 rect 节点，固定尺寸，不可交互） =====
    const g6Nodes: any[] = [];
    const cellNodeId = new Map<string, string>();
    for (let ri = 0; ri < rows.length; ri++) {
      for (let ci = 0; ci < cols.length; ci++) {
        const cellKey = `${rows[ri]}${rowIdx[ri] || 0}${cols[ci]}`;
        const bgId = `bg_${ri}_${ci}`;
        cellNodeId.set(cellKey, bgId);
        g6Nodes.push({
          id: bgId,
          type: 'rect',
          style: {
            x: cellCx(ci),
            y: cellCy(ri),
            size: [CELL_W, CELL_H],
            fill: finalStyles.laneColor,
            fillOpacity: 0.3,
            stroke: '#cbd5e1',
            lineWidth: 1,
            radius: 8,
            pointerEvents: 'none',
            cursor: 'default',
          }
        });
      }
    }

    // ===== 行（部门）标签节点 =====
    for (let ri = 0; ri < rows.length; ri++) {
      g6Nodes.push({
        id: `rowh_${ri}`,
        type: 'text',
        style: {
          x: AXIS_HEAD - 8,
          y: cellCy(ri),
          text: rowNames[ri] || '',
          fontSize: 13,
          fontWeight: 'bold',
          fill: finalStyles.axisColor,
          textAlign: 'right',
          textBaseline: 'middle',
        }
      });
    }

    // ===== 列（阶段）标签节点 =====
    for (let ci = 0; ci < cols.length; ci++) {
      g6Nodes.push({
        id: `colh_${ci}`,
        type: 'text',
        style: {
          x: cellCx(ci),
          y: AXIS_HEAD - 8,
          text: colNameAt(ci) || '',
          fontSize: 12,
          fontWeight: 'bold',
          fill: finalStyles.axisColor,
          textAlign: 'center',
          textBaseline: 'bottom',
        }
      });
    }

    // ===== 任务/BPMN 节点 → 坐标（叠加在格子中心） =====
    for (const n of data.nodes) {
      const cellKey = cellKeyOf(n);
      let x: number, y: number;
      const bgId = cellNodeId.get(cellKey || '');
      const m = bgId ? bgId.match(/bg_(\d+)_(\d+)/) : null;
      if (m) {
        const ri = parseInt(m[1], 10);
        const ci = parseInt(m[2], 10);
        x = cellCx(ci);
        y = cellCy(ri);
      } else {
        const ord = orderOf(n, data);
        x = 80 + ord * (CELL_W + X_GAP - 180);
        y = height / 2;
      }
      const shape = flowShape(n.type, finalStyles);
      const label = dictExpandLabel(n, data);
      g6Nodes.push({
        id: n.id,
        type: flowNodeType(n.type),
        style: {
          x,
          y,
          fill: shape.fill,
          stroke: shape.stroke,
          lineWidth: shape.lineWidth,
          radius: shape.radius,
          size: [shape.w, shape.h],
          labelText: label,
          labelFontSize: finalStyles.nodeFontSize,
          labelFill: '#ffffff',
          labelPlacement: 'center',
          labelBackground: false,
        }
      });
    }

    // ===== 边（只连任务节点，不连衬底） =====
    const g6Edges = data.edges.filter((e) => !e.parent).map((e) => {
      const label = e.label || '';
      return {
        id: e.id,
        source: e.from,
        target: e.to,
        style: {
          lineWidth: finalStyles.lineWidth,
          stroke: finalStyles.lineColor,
          radius: 14,
          endArrow: true,
          labelText: label,
          labelFontSize: 11,
          labelFill: '#64748b',
          labelBackground: true,
          labelBackgroundFill: '#ffffff',
          labelBackgroundRadius: 4,
        }
      };
    });

    const buildGraph = (g: Graph) => {
      // G6 v5: 节点/边自带 style.x/y，不跑布局以免覆盖坐标；无 combo
      g.setData({ nodes: g6Nodes, edges: g6Edges });
      g.render();
    };

    if (!graphRef.current) {
      const graph = new Graph({
        container: containerRef.current,
        width,
        height,
        data: { nodes: g6Nodes, edges: g6Edges },
        behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
        autoFit: { type: 'view', options: { padding: 40 } } as any,
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
  // 统一返回 {g6type, fill, stroke, lineWidth, radius, w, h}
  // radius 仅对 rect 有效（圆角）；circle/diamond 大小由 w/h 决定
  const base = { g6type: 'rect' };
  switch (type) {
    case 'start':
      return { ...base, g6type: 'circle', fill: st.startColor, stroke: 'none', lineWidth: 1, radius: 0, w: 48, h: 48 };
    case 'end':
      return { ...base, g6type: 'circle', fill: st.endColor, stroke: '#ffffff', lineWidth: 4, radius: 0, w: 48, h: 48 };
    case 'exclusiveGateway':
      return { ...base, g6type: 'diamond', fill: st.gatewayColor, stroke: 'none', lineWidth: 1, radius: 0, w: 64, h: 64 };
    case 'parallelGateway':
      return { ...base, g6type: 'diamond', fill: st.parallelColor, stroke: 'none', lineWidth: 1, radius: 0, w: 64, h: 64 };
    case 'subprocess':
      return { ...base, g6type: 'rect', fill: st.subprocessColor, stroke: '#f8fafc', lineWidth: 2, radius: 6, w: 120, h: 48 };
    case 'annotation':
      return { ...base, g6type: 'rect', fill: st.annotationColor, stroke: 'none', lineWidth: 1, radius: 2, w: 140, h: 40 };
    case 'dataObject':
      return { ...base, g6type: 'rect', fill: st.dataColor, stroke: 'none', lineWidth: 1, radius: 4, w: 110, h: 40 };
    case 'task':
    default:
      return { ...base, g6type: 'rect', fill: st.taskColor, stroke: '#f8fafc', lineWidth: 1, radius: 6, w: 120, h: 44 };
  }
}

/** G6 节点 type → 顶层 type 字段 */
function flowNodeType(type: string): string {
  switch (type) {
    case 'start':
    case 'end':
      return 'circle';
    case 'exclusiveGateway':
    case 'parallelGateway':
      return 'diamond';
    default:
      return 'rect';
  }
}

export default FlowDiagram;
