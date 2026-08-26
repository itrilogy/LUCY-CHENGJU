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
    // 阻止浏览器原生拖拽/文本选择/图片拖拽，避免拖动时页面白掉
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, tx: view.tx, ty: view.ty };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    setView((v) => ({
      ...v,
      tx: dragRef.current!.tx + (e.clientX - dragRef.current!.startX),
      ty: dragRef.current!.ty + (e.clientY - dragRef.current!.startY),
    }));
  };
  const handlePointerUp = () => { dragRef.current = null; };

  // 整理布局：高宽自适应（按比例选其一——宽优先/高优先）
  const [fitMode, setFitMode] = useState<'width' | 'height'>('width');
  const fitView = (mode: 'width' | 'height' = fitMode) => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    // 宽优先：按容器宽度等比缩放（可能纵向滚动）；高优先：按容器高度等比缩放
    const scale = mode === 'width'
      ? cw / size.width
      : ch / size.height;
    const applied = Math.max(0.05, Math.min(3, scale));
    setView({
      scale: applied,
      tx: (cw - size.width * applied) / 2,
      ty: (ch - size.height * applied) / 2,
    });
  };
  const toggleFitMode = () => {
    const next = fitMode === 'width' ? 'height' : 'width';
    setFitMode(next);
    fitView(next);
  };

  useEffect(() => {
    fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  // 导出当前 SVG 为字符串（供无头/测试）
  const svgString = svg;

  return (
    <div className={className} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ minHeight: 0, userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDragStart={(e) => e.preventDefault()}
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
            userSelect: 'none',
          }}
          dangerouslySetInnerHTML={{ __html: svgString.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') }}
        />
      </div>
      <div className="shrink-0 flex items-center justify-center gap-3 text-[11px] text-slate-400 py-1" style={{ borderTop: '1px solid var(--border-light)' }}>
        <button
          type="button"
          onClick={() => fitView(fitMode)}
          className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100"
          title="按当前模式重新适配画布"
        >
          整理布局
        </button>
        <button
          type="button"
          onClick={toggleFitMode}
          className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100"
          title="切换宽优先/高优先"
        >
          {fitMode === 'width' ? '宽优先' : '高优先'}
        </button>
        <span>滚轮缩放 · 拖拽平移</span>
      </div>
    </div>
  );
});

export default FlowDiagram;
