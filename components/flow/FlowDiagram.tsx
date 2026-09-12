/**
 * IQS-Flow 自研 SVG 视图组件
 * 内部用 flowToSVG(纯函数) 生成确定性 SVG；支持 pan/zoom、导出 PNG。
 * 保留 props/ref/getDataURL/exportPNG 接口（对齐 BaseDiagramRef）。
 */
import React, { useEffect, useMemo, useRef, useImperativeHandle, forwardRef, useState } from 'react';
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

  /**
   * `finalStyles` 必须先 memo：它原本每次 render 都新建对象，
   * 若直接拿它当依赖，下游 useMemo 会永远失效。
   */
  const finalStyles = useMemo(() => ({ ...DEFAULT_FLOW_STYLES, ...styles }), [styles]);
  /**
   * `flowToSVG` 含布局 + 端口优化路由（实测单图 ~0.3s）。
   * 原为裸调用 —— 拖拽画布时 setView 会触发 render，于是每帧重算一次，
   * 而 data/styles 根本未变。这是「渲染缓慢」的第一层根因。
   */
  const svg = useMemo(() => flowToSVG(data, finalStyles), [data, finalStyles]);
  const size = useMemo(() => getSvgSize(data, finalStyles), [data, finalStyles]);
  /** 去外壳后的内联 SVG —— 与 view 无关，只随 svg 变化 */
  const innerSvg = useMemo(
    () => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''),
    [svg],
  );

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

  // 整理布局：整体绘制内容"尽可能占据画布"（按容器与内容比例自适应缩放，居中）
  const fitView = () => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw <= 0 || ch <= 0 || size.width <= 0 || size.height <= 0) return;
    // 等比缩放至完全容纳（contain）；再向上取"尽可能占据"比例
    const scale = Math.min(cw / size.width, ch / size.height);
    const applied = Math.max(0.05, Math.min(3, scale));
    // 居中：内容约等于容器时几乎为 0，内容明显更小时为正值居中
    const w = size.width * applied;
    const h = size.height * applied;
    setView({
      scale: applied,
      tx: (cw - w) / 2,
      ty: (ch - h) / 2,
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
      const background = options?.backgroundColor || '#FFFFFF';
      return buildPNG(pixelRatio, background, options?.width, options?.height);
    },
    exportPNG: async (transparent = false, scale = 3) => {
      const url = await buildPNG(scale, transparent ? 'transparent' : '#FFFFFF');
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

  /**
   * 第二层根因：原用 `dangerouslySetInnerHTML` 把整段 SVG 写进 <svg>。
   * 该属性在**每次 render 都会重新解析并写入 DOM** —— 拖拽画布（setView）
   * 时每帧一次，与 view 无关的内容被反复重写。
   * 改为仅当 `innerSvg` 变化时用 ref 写入一次；view 变化只剩一个 CSS transform。
   */
  const innerRef = useRef<SVGGElement>(null);
  useEffect(() => {
    if (innerRef.current) innerRef.current.innerHTML = innerSvg;
  }, [innerSvg]);

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
        >
          {/* 内容只由 innerSvg 驱动写入，不随 view 变化 */}
          <g ref={innerRef} />
        </svg>
      </div>
    </div>
  );
});

export default FlowDiagram;
