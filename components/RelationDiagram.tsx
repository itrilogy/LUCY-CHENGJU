import React, { useMemo, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { RelationNode, RelationLink, RelationChartStyles, DEFAULT_RELATION_STYLES, BaseDiagramRef } from '../types';
import { computeRelationGeometry } from '../utils/relationGraph';
import { computeEdgeArrowGeometry } from '../utils/relationSvg';
import { svgToDataURL } from '../utils/exportUtils';

export interface RelationDiagramRef extends BaseDiagramRef {}

interface RelationDiagramProps {
    nodes: RelationNode[];
    links: RelationLink[];
    styles?: RelationChartStyles;
    className?: string;
}

const MARGIN = 32;

/**
 * 关联图（Relation Diagram）原生自绘 SVG 组件
 *
 * 彻底剥离 @antv/g6，直接消费 `computeRelationGeometry` 产出的几何清单（Geometry Spec SSOT），
 * 实现与 MCP Tier-1 进程内直出 100% 像素级一致。
 */
const RelationDiagram = forwardRef<RelationDiagramRef, RelationDiagramProps>(({ nodes, links, styles, className }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = useState({ w: 0, h: 0 });
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });

    const finalStyles = useMemo(() => ({ ...DEFAULT_RELATION_STYLES, ...styles }), [styles]);

    const scene = useMemo(() => {
        const spec = computeRelationGeometry(
            nodes,
            links,
            finalStyles,
            viewport.w || 1200,
            viewport.h || 800
        );
        const { bbox } = spec;
        const vx = bbox.x1 - MARGIN;
        const vy = bbox.y1 - MARGIN;
        const vw = Math.max(200, bbox.x2 - bbox.x1 + MARGIN * 2);
        const vh = Math.max(150, bbox.y2 - bbox.y1 + MARGIN * 2);
        return {
            spec,
            viewBox: `${vx} ${vy} ${vw} ${vh}`,
        };
    }, [nodes, links, finalStyles, viewport]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const apply = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
        apply();
        const observer = new ResizeObserver(apply);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // 数据或布局切换时自动归位视口
    useEffect(() => {
        setTransform({ x: 0, y: 0, k: 1 });
    }, [nodes, links, finalStyles.layout]);

    const buildCleanSvgForExport = (): SVGSVGElement | null => {
        if (!svgRef.current) return null;
        const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
        const contentGroup = clone.querySelector('#relation-content-group');
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
            link.download = `关联图_${transparent ? '透明_' : ''}${Date.now()}.png`;
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
                    id="relation-content-group"
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

                    {spec.edges.map(edge => {
                        const { lineEndX, lineEndY, arrowPoints } = computeEdgeArrowGeometry(edge);
                        return (
                            <g key={edge.id}>
                                {edge.controlPoint ? (
                                    <path
                                        d={`M ${edge.x1} ${edge.y1} Q ${edge.controlPoint.cx} ${edge.controlPoint.cy} ${lineEndX} ${lineEndY}`}
                                        fill="none"
                                        stroke={edge.stroke}
                                        strokeWidth={edge.lineWidth}
                                        strokeLinecap="round"
                                    />
                                ) : (
                                    <line
                                        x1={edge.x1}
                                        y1={edge.y1}
                                        x2={lineEndX}
                                        y2={lineEndY}
                                        stroke={edge.stroke}
                                        strokeWidth={edge.lineWidth}
                                        strokeLinecap="round"
                                    />
                                )}
                                <polygon points={arrowPoints} fill={edge.stroke} />
                            </g>
                        );
                    })}

                    {spec.nodes.map(nd => (
                        <g key={nd.id}>
                            {nd.shape === 'rect' ? (
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
                            ) : (
                                <ellipse
                                    cx={nd.x}
                                    cy={nd.y}
                                    rx={nd.width / 2}
                                    ry={nd.height / 2}
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
                                fontWeight={nd.fontWeight}
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

export default RelationDiagram;
