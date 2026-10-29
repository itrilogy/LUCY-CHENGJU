import React, { useMemo, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { PDPCData, PDPCChartStyles, DEFAULT_PDPC_STYLES, BaseDiagramRef } from '../types';
import { computePDPCGeometry } from '../utils/pdpcGraph';
import { buildOrthogonalPathAndArrow, getHexagonPoints } from '../utils/pdpcSvg';
import { svgToDataURL } from '../utils/exportUtils';

export interface PDPCDiagramRef extends BaseDiagramRef {}

interface PDPCDiagramProps {
    data: PDPCData;
    styles?: PDPCChartStyles;
    onStylesChange?: (styles: PDPCChartStyles) => void;
    className?: string;
}

const MARGIN = 32;

/**
 * 过程决策程序图（PDPC Diagram）原生自绘 SVG 组件
 *
 * 彻底剥离 @antv/g6 与异步 Dagre 布局，直接消费 `computePDPCGeometry` 确定性分层正交几何清单，
 * 并将主标题原生内嵌于 SVG 视口中，消灭二次 Canvas 标题拼接。
 */
const PDPCDiagram = forwardRef<PDPCDiagramRef, PDPCDiagramProps>(({ data, styles, className }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });

    const finalStyles = useMemo(() => ({ ...DEFAULT_PDPC_STYLES, ...styles }), [styles]);

    const scene = useMemo(() => {
        const spec = computePDPCGeometry(data, finalStyles);
        const { bbox } = spec;
        const vx = bbox.x1 - MARGIN;
        const vy = bbox.y1 - MARGIN;
        const vw = Math.max(200, bbox.x2 - bbox.x1 + MARGIN * 2);
        const vh = Math.max(150, bbox.y2 - bbox.y1 + MARGIN * 2);
        return {
            spec,
            viewBox: `${vx} ${vy} ${vw} ${vh}`,
        };
    }, [data, finalStyles]);

    useEffect(() => {
        setTransform({ x: 0, y: 0, k: 1 });
    }, [data, finalStyles.layout]);

    const buildCleanSvgForExport = (): SVGSVGElement | null => {
        if (!svgRef.current) return null;
        const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
        const contentGroup = clone.querySelector('#pdpc-content-group');
        if (contentGroup) {
            contentGroup.removeAttribute('transform');
        }
        return clone;
    };

    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            const cleanSvg = buildCleanSvgForExport();
            if (!cleanSvg) return '';
            return svgToDataURL(cleanSvg, {
                width: options?.width,
                height: options?.height,
                pixelRatio: options?.pixelRatio ?? 3,
                backgroundColor: options?.backgroundColor ?? '#FFFFFF',
                padding: 0,
            });
        },
        exportPNG: async (transparent = false, scale = 3) => {
            const cleanSvg = buildCleanSvgForExport();
            if (!cleanSvg) return;
            const url = await svgToDataURL(cleanSvg, {
                pixelRatio: scale,
                backgroundColor: transparent ? 'transparent' : '#FFFFFF',
                padding: 0,
            });
            const link = document.createElement('a');
            link.download = `PDPC_${transparent ? '透明_' : ''}${Date.now()}.png`;
            link.href = url;
            link.click();
        },
        exportPDF: async () => {
            const cleanSvg = buildCleanSvgForExport();
            if (!cleanSvg) return;
            const dataURL = await svgToDataURL(cleanSvg, {
                pixelRatio: 3,
                backgroundColor: '#FFFFFF',
                padding: 0,
            });
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <html>
                        <head><title>导出 PDF - 澄矩 · ChengJu</title></head>
                        <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#F5F7FA;">
                            <img src="${dataURL}" style="max-width:95%; max-height:95%; object-fit:contain; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);" />
                        </body>
                    </html>
                `);
                win.document.close();
                setTimeout(() => {
                    win.print();
                    win.close();
                }, 800);
            }
        },
        tidyLayout: () => {
            setTransform({ x: 0, y: 0, k: 1 });
        },
    }));

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        setTransform(prev => ({
            ...prev,
            k: Math.min(Math.max(0.25, prev.k * factor), 4),
        }));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    };

    const handleMouseUp = () => setIsDragging(false);

    const { spec, viewBox } = scene;
    const hasTransform = transform.x !== 0 || transform.y !== 0 || transform.k !== 1;

    return (
        <div
            ref={containerRef}
            className={`w-full h-full bg-[var(--card-bg)] transition-background-color 0.5s ease relative overflow-hidden ${className || ''}`}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={viewBox}
                xmlns="http://www.w3.org/2000/svg"
            >
                <g
                    id="pdpc-content-group"
                    transform={hasTransform ? `translate(${transform.x}, ${transform.y}) scale(${transform.k})` : undefined}
                >
                    {spec.title && spec.title.text && (
                        <text
                            x={spec.title.x}
                            y={spec.title.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={spec.title.fontSize}
                            fontWeight="bold"
                            fill={spec.title.color}
                        >
                            {spec.title.text}
                        </text>
                    )}

                    {/* 1. 阶段分组框（Combos/Groups） */}
                    {spec.groups.map(grp => (
                        <g key={grp.id}>
                            <rect
                                x={grp.x}
                                y={grp.y}
                                width={grp.width}
                                height={grp.height}
                                rx={10}
                                fill={grp.fill}
                                fillOpacity={0.7}
                                stroke={grp.stroke}
                                strokeWidth={1.5}
                                strokeDasharray="6,4"
                            />
                            <text
                                x={grp.x + grp.width / 2}
                                y={grp.y + 18}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize={12}
                                fontWeight="bold"
                                fill={grp.labelColor}
                            >
                                {grp.label}
                            </text>
                        </g>
                    ))}

                    {/* 2. 正交连线与 [OK]/[NG] 标签 */}
                    {spec.edges.map(edge => {
                        const { pathD, arrowPoints } = buildOrthogonalPathAndArrow(edge);
                        if (!pathD) return null;
                        return (
                            <g key={edge.id}>
                                <path
                                    d={pathD}
                                    fill="none"
                                    stroke={edge.stroke}
                                    strokeWidth={edge.lineWidth}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray={edge.dashed ? '6,4' : undefined}
                                />
                                <polygon points={arrowPoints} fill={edge.stroke} />
                                {edge.label && (
                                    <g>
                                        <rect
                                            x={edge.label.x - edge.label.width / 2}
                                            y={edge.label.y - edge.label.height / 2}
                                            width={edge.label.width}
                                            height={edge.label.height}
                                            rx={4}
                                            fill={edge.label.bgColor}
                                            stroke={edge.label.borderColor}
                                            strokeWidth={1}
                                        />
                                        <text
                                            x={edge.label.x}
                                            y={edge.label.y}
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fontSize={10}
                                            fontWeight="bold"
                                            fill={edge.label.color}
                                        >
                                            {edge.label.text}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}

                    {/* 3. 四类语义节点 */}
                    {spec.nodes.map(nd => (
                        <g key={nd.id}>
                            {nd.shape === 'hexagon' ? (
                                <polygon
                                    points={getHexagonPoints(nd)}
                                    fill={nd.fill}
                                    stroke={nd.stroke}
                                    strokeWidth={1.5}
                                />
                            ) : nd.shape === 'double-rect' ? (
                                <>
                                    <rect
                                        x={nd.x - nd.width / 2}
                                        y={nd.y - nd.height / 2}
                                        width={nd.width}
                                        height={nd.height}
                                        rx={nd.rx}
                                        fill={nd.fill}
                                        stroke={nd.stroke}
                                        strokeWidth={2}
                                    />
                                    <rect
                                        x={nd.x - nd.width / 2 + 3.5}
                                        y={nd.y - nd.height / 2 + 3.5}
                                        width={nd.width - 7}
                                        height={nd.height - 7}
                                        rx={Math.max(4, nd.rx - 3)}
                                        fill="none"
                                        stroke={nd.stroke}
                                        strokeWidth={1}
                                    />
                                </>
                            ) : (
                                <rect
                                    x={nd.x - nd.width / 2}
                                    y={nd.y - nd.height / 2}
                                    width={nd.width}
                                    height={nd.height}
                                    rx={nd.rx}
                                    fill={nd.fill}
                                    stroke={nd.stroke}
                                    strokeWidth={1.5}
                                />
                            )}
                            <text
                                x={nd.x}
                                y={nd.y}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={nd.fontSize}
                                fontWeight={600}
                                fill={nd.textColor}
                            >
                                {nd.label}
                            </text>
                        </g>
                    ))}
                </g>
            </svg>
        </div>
    );
});

export default PDPCDiagram;
