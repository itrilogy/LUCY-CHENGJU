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

  // 整理布局：整体绘制内容"尽可能占据画布"（按容器与内容比例自适应缩放）
  const fitView = () => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw <= 0 || ch <= 0 || size.width <= 0 || size.height <= 0) return;
    // 等比缩放至完全容纳（contain）；如需"尽可能占据"可再乘放大系数
    const scale = Math.min(cw / size.width, ch / size.height);
    const applied = Math.max(0.05, Math.min(3, scale));
    // 软边界：平移范围钳制在 [容器 - 内容×缩放, 0]，避免拖出画布空白
    const minTx = cw - size.width * applied;
    const minTy = ch - size.height * applied;
    setView({
      scale: applied,
      tx: Math.min(0, Math.max(minTx, (cw - size.width * applied) / 2)),
      ty: Math.min(0, Math.max(minTy, (ch - size.height * applied) / 2)),
    });
  };

  const clampView = (scale: number, tx: number, ty: number): { scale: number; tx: number; ty: number } => {
    const el = containerRef.current;
    if (!el) return { scale, tx, ty };
    const cw = el.clientWidth, ch = el.clientHeight;
    const w = size.width * scale, h = size.height * scale;
    // 平移钳制：内容小于容器时居中，大于容器时可滚动到边缘但不能滑出太多（留 40% 余量防白屏）
    const minTx = Math.min(0, cw - w);
    const minTy = Math.min(0, ch - h);
    const maxTx = Math.max(0, cw - w);
    const maxTy = Math.max(0, ch - h);
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    return {
      scale,
      tx: clamp(tx, minTx - cw * 0.1, maxTx + cw * 0.1),
      ty: clamp(ty, minTy - ch * 0.1, maxTy + ch * 0.1),
    };
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
    },
    tidyLayout: fitView,
  }));

  // 键盘 pan/zoom（wheel 缩放，拖拽平移）
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setView((v) => {
      const scale = Math.max(0.2, Math.min(4, v.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
      // 以中心缩放
      const el = containerRef.current;
      const cx = el ? el.clientWidth / 2 : 0;
      const cy = el ? el.clientHeight / 2 : 0;
      const tx = cx - (cx - v.tx) * (scale / v.scale);
      const ty = cy - (cy - v.ty) * (scale / v.scale);
      return clampView(scale, tx, ty);
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
    const tx = dragRef.current!.tx + (e.clientX - dragRef.current!.startX);
    const ty = dragRef.current!.ty + (e.clientY - dragRef.current!.startY);
    setView((v) => clampView(v.scale, tx, ty));
  };
  const handlePointerUp = () => { dragRef.current = null; };

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
    </div>
  );
});

export default FlowDiagram;
