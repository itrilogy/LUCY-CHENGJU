/**
 * IQS-Flow 自研 SVG 视图组件
 * 内部用 flowToSVG(纯函数) 生成确定性 SVG；支持 pan/zoom、导出 PNG。
 * 保留 props/ref/getDataURL/exportPNG 接口（对齐 BaseDiagramRef）。
 */
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { FlowData, FlowChartStyles, DEFAULT_FLOW_STYLES, BaseDiagramRef } from '../../types';
import { flowToSVG, getSvgSize } from './flowToSVG';

export interface FlowDiagramRef extends BaseDiagramRef {}

interface FlowDiagramProps {
  data: FlowData;
  styles?: FlowChartStyles;
  onStylesChange?: (styles: FlowChartStyles) => void;
  className?: string;
}

const FlowDiagram = forwardRef<FlowDiagramRef, FlowDiagramProps>(({ data, styles, className }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

  const finalStyles = { ...DEFAULT_FLOW_STYLES, ...styles };
  const svg = flowToSVG(data, finalStyles);
  const size = getSvgSize(data);

  const buildPNG = async (pixelRatio: number, background: string, width?: number, height?: number): Promise<string> => {
    const outW = width || size.width;
    const outH = height || size.height;
    // SVG 字符串 → Blob URL → Image → canvas
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = outW * pixelRatio;
      canvas.height = outH * pixelRatio;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  useImperativeHandle(ref, () => ({
    getDataURL: async (options) => {
      const pixelRatio = options?.pixelRatio || 3;
      const background = options?.backgroundColor || '#ffffff';
      return buildPNG(pixelRatio, background, options?.width, options?.height);
    },
    exportPNG: async (transparent = false, scale = 3) => {
      const url = await buildPNG(scale, transparent ? 'transparent' : '#ffffff');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.title || 'flow'}.png`;
      a.click();
    }
  }));

  // 键盘 pan/zoom（wheel 缩放，拖拽平移）
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setView((v) => {
      const scale = Math.max(0.2, Math.min(4, v.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
      return { ...v, scale };
    });
  };
  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, tx: view.tx, ty: view.ty };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setView((v) => ({
      ...v,
      tx: dragRef.current!.tx + (e.clientX - dragRef.current!.startX),
      ty: dragRef.current!.ty + (e.clientY - dragRef.current!.startY),
    }));
  };
  const handlePointerUp = () => { dragRef.current = null; };

  const fitView = () => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    const scale = Math.min(cw / size.width, ch / size.height, 1.2);
    setView({ scale, tx: (cw - size.width * scale) / 2, ty: (ch - size.height * scale) / 2 });
  };

  useEffect(() => {
    fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  // 导出当前 SVG 为字符串（供无头/测试）
  const svgString = svg;

  return (
    <div className={className} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {data.title && (
        <div className="text-center font-bold py-2 shrink-0" style={{ color: finalStyles.axisColor, fontSize: finalStyles.titleFontSize }}>
          {data.title}
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ minHeight: 0 }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg
          ref={svgRef}
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={{
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
            transformOrigin: '0 0',
            cursor: dragRef.current ? 'grabbing' : 'grab',
          }}
          dangerouslySetInnerHTML={{ __html: svgString.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') }}
        />
      </div>
      <div className="shrink-0 text-center text-[11px] text-slate-400 py-1" style={{ borderTop: '1px solid var(--border-light)' }}>
        滚轮缩放 · 拖拽平移
      </div>
    </div>
  );
});

export default FlowDiagram;
