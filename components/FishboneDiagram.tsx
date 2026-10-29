import React, { useMemo, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { FishboneNode, FishboneChartStyles, DEFAULT_FISHBONE_STYLES, BaseDiagramRef } from '../types';
import { computeDeterministicFishboneLayout, textBoxOfNode } from '../utils/fishboneGraph';
import { svgToDataURL } from '../utils/exportUtils';

export interface FishboneDiagramRef extends BaseDiagramRef {}

interface FishboneDiagramProps {
  data: FishboneNode;
  styles?: FishboneChartStyles;
  className?: string;
}

const MARGIN = 24;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

/**
 * 鱼骨图自绘 SVG。
 * 文字位置取 textBoxOfNode 的盒子中心，不经过任何图库的 label placement，
 * 因此与布局断言使用的坐标完全一致。
 */
const FishboneDiagram = forwardRef<FishboneDiagramRef, FishboneDiagramProps>(({ data, styles, className }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const finalStyles = { ...DEFAULT_FISHBONE_STYLES, ...styles };

  const scene = useMemo(() => {
    const { nodes, edges, meta } = computeDeterministicFishboneLayout(
      data, finalStyles, viewport.w || 1600, viewport.h || 1000,
    );
    if (meta.warnings.length) console.warn('[Fishbone]', meta.warnings.join(' | '));

    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of nodes) {
      const b = textBoxOfNode(n.style);
      if (b) { x1 = Math.min(x1, b.x1); y1 = Math.min(y1, b.y1); x2 = Math.max(x2, b.x2); y2 = Math.max(y2, b.y2); }
      x1 = Math.min(x1, n.style.x); y1 = Math.min(y1, n.style.y);
      x2 = Math.max(x2, n.style.x); y2 = Math.max(y2, n.style.y);
    }
    if (!Number.isFinite(x1)) { x1 = 0; y1 = 0; x2 = 800; y2 = 600; }
    return { nodes, edges, viewBox: `${x1 - MARGIN} ${y1 - MARGIN} ${x2 - x1 + MARGIN * 2} ${y2 - y1 + MARGIN * 2}` };
  }, [data, styles, viewport]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    getDataURL: async (options) => {
      if (!svgRef.current) return '';
      return svgToDataURL(svgRef.current, {
        width: options?.width,
        height: options?.height,
        pixelRatio: options?.pixelRatio ?? 3,
        backgroundColor: options?.backgroundColor ?? '#FFFFFF',
        padding: 0,
      });
    },
    exportPNG: async (transparent = false, scale = 3) => {
      if (!svgRef.current) return;
      const url = await svgToDataURL(svgRef.current, {
        pixelRatio: scale,
        backgroundColor: transparent ? 'transparent' : (finalStyles.background || '#FFFFFF'),
        padding: 0,
      });
      const link = document.createElement('a');
      link.download = `鱼骨图_${Date.now()}.png`;
      link.href = url;
      link.click();
    },
    exportPDF: async () => {
      if (!svgRef.current) return;
      const url = await svgToDataURL(svgRef.current, { pixelRatio: 3, backgroundColor: finalStyles.background || '#FFFFFF', padding: 0 });
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<html><head><title>导出 PDF - 澄矩 · ChengJu</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#F5F7FA;"><img src="${url}" style="max-width:95%;max-height:95%;object-fit:contain;"/></body></html>`);
      win.document.close();
      setTimeout(() => { win.print(); win.close(); }, 800);
    },
    tidyLayout: () => {
      /* 布局是确定性闭式解，没有可整理的残留状态；视口由 viewBox 固定。 */
    },
  }));

  const byId = new Map<string, { id: string; type?: string; style: any }>(scene.nodes.map(n => [n.id, n]));

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', backgroundColor: 'var(--card-bg)' }}>
      <svg ref={svgRef} width="100%" height="100%" viewBox={scene.viewBox} xmlns="http://www.w3.org/2000/svg">
        {scene.edges.map(e => {
          const s = byId.get(e.source), t = byId.get(e.target);
          if (!s || !t) return null;
          const color = e.style?.stroke ?? '#334155';
          const x1 = s.style.x, y1 = s.style.y, x2 = t.style.x, y2 = t.style.y;
          const len = Math.hypot(x2 - x1, y2 - y1) || 1;
          const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
          const size = Math.max(6, (e.style?.lineWidth ?? 1) * 3);
          const ax = x1 + ux * size, ay = y1 + uy * size;
          const px = -uy * size * 0.55, py = ux * size * 0.55;
          return (
            <g key={e.id}>
              <line x1={ax} y1={ay} x2={x2} y2={y2} stroke={color} strokeWidth={e.style?.lineWidth ?? 1} />
              <polygon points={`${x1},${y1} ${ax + px},${ay + py} ${ax - px},${ay - py}`} fill={color} />
            </g>
          );
        })}
        {scene.nodes.map(n => {
          const st = n.style;
          const box = textBoxOfNode(st);
          const isRect = n.type === 'rect' && Array.isArray(st.size);
          return (
            <g key={n.id}>
              {isRect && (
                <rect x={st.x - st.size[0] / 2} y={st.y - st.size[1] / 2} width={st.size[0]} height={st.size[1]} rx={st.radius ?? 0} fill={st.fill ?? 'none'} stroke={st.stroke ?? 'none'} strokeWidth={st.lineWidth ?? 0} />
              )}
              {box && st.labelText && String(st.labelText).split('\n').map((line, i, arr) => {
                const fs = st.labelFontSize ?? (isRect ? 14 : 12);
                const lh = st.labelLineHeight ?? fs * 1.25;
                const y = (box.y1 + box.y2) / 2 - ((arr.length - 1) * lh) / 2 + i * lh;
                return <text key={i} x={(box.x1 + box.x2) / 2} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={fs} fontWeight={st.labelFontWeight ?? 'normal'} fill={st.labelFill ?? '#1e293b'}>{esc(line)}</text>;
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
});

export default FishboneDiagram;
