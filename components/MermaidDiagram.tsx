import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import mermaid from 'mermaid';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { MermaidChartStyles, DEFAULT_MERMAID_STYLES, BaseDiagramRef } from '../types';
import { ZoomIn, ZoomOut, RefreshCw, Move } from 'lucide-react';
import { INITIAL_MERMAID_DSL } from '../constants';
import { genId } from '../utils/id';

export interface MermaidDiagramRef extends BaseDiagramRef {}

interface Props {
    data: string;
    styles?: MermaidChartStyles;
}

export const MermaidDiagram = forwardRef<MermaidDiagramRef, Props>(({ data, styles }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartOuterRef = useRef<HTMLDivElement>(null);
    const chartInnerRef = useRef<HTMLDivElement>(null);
    const finalStyles = { ...DEFAULT_MERMAID_STYLES, ...styles };

    const [scale, setScale] = useState(1);
    const [translateX, setTranslateX] = useState(0);
    const [translateY, setTranslateY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [lastPinchDist, setLastPinchDist] = useState<number | null>(null);
    const isFirstRender = useRef(true);
    const lastDataRef = useRef(data);
    const lastStylesRef = useRef(finalStyles);

    const stripInit = (dsl: string) => {
        return dsl.replace(/^%%{init:\s*({[\s\S]*?})\s*}%%\n?/, '').trim();
    };

    const fitToView = () => {
        const svgElement = containerRef.current?.querySelector('svg') as SVGSVGElement | null;
        if (!svgElement || !chartOuterRef.current) return;

        // Force a small delay to ensure styles and font-size are fully applied to elements
        // before measuring the BBox.
        setTimeout(() => {
            try {
                // Get the actual bounding box of the diagram content
                const bBox = svgElement.getBBox();

                // NORMALIZATION STRATEGY:
                // Force the SVG viewBox to exactly match its content bounds.
                // This eliminates any internal coordinate offset (bBox.x/y) from the scaling logic.
                svgElement.setAttribute('viewBox', `${bBox.x} ${bBox.y} ${bBox.width} ${bBox.height}`);
                svgElement.setAttribute('width', bBox.width.toString());
                svgElement.setAttribute('height', bBox.height.toString());

                // Since viewBox now matches bBox, we can treat the SVG as a 0,0-based rectangle.
                const containerWidth = chartOuterRef.current.clientWidth;
                const containerHeight = chartOuterRef.current.clientHeight;

                if (containerWidth === 0 || containerHeight === 0) return;

                // Calculate scale with a forced 5% safety margin for arrowheads/shadows
                // Reducing marginFactor slightly to 0.92 for more comfortable padding
                // Calculate scale with a forced 5% safety margin
                const marginFactor = 0.92;
                const scaleW = (containerWidth * marginFactor) / bBox.width;
                const scaleH = (containerHeight * marginFactor) / bBox.height;
                
                // ASPECT RATIO OPTIMIZATION:
                // For extremely wide diagrams (like Gantt), prioritize height but allow some horizontal clipping 
                // or use a more generous scale if it's too tiny.
                let newScale = Math.min(scaleW, scaleH, 10);
                
                const isVeryWide = bBox.width / bBox.height > 4;
                if (isVeryWide && newScale < 0.2) {
                    // Boost the scale for tiny wide charts to ensure they are at least somewhat readable,
                    // even if it means some horizontal overflow (user can pan).
                    newScale = Math.max(newScale, Math.min(scaleH, 0.4));
                }

                setScale(newScale);

                // Absolute Precision Centering
                const targetX = (containerWidth - bBox.width * newScale) / 2;
                const targetY = (containerHeight - bBox.height * newScale) / 2;

                setTranslateX(targetX);
                setTranslateY(targetY);
            } catch (e) {
                console.error("fitToView error", e);
            }
        }, 10);
    };

    // Auto-layout trigger on style/configuration changes
    useEffect(() => {
        // Skip the very first render as it's handled by the renderChart useEffect
        if (isFirstRender.current) return;

        // Small delay to ensure Mermaid has finished re-rendering if the change triggered a render
        const timer = setTimeout(fitToView, 150);
        return () => clearTimeout(timer);
    }, [
        finalStyles.fontSize,
        finalStyles.look,
        finalStyles.useElk,
        finalStyles.elkMergeEdges,
        finalStyles.elkNodePlacementStrategy,
        finalStyles.theme,
        data // Also trigger on any data change (Tidy Layout is better than manual)
    ]);

    useEffect(() => {
        const renderChart = async () => {
            if (containerRef.current && data) {
                try {
                    // Initialize mermaid with current styles
                    const config: any = {
                        startOnLoad: false,
                        theme: finalStyles.theme,
                        securityLevel: 'loose',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: finalStyles.fontSize,
                    };

                    if (finalStyles.look === 'handDrawn') {
                        config.look = 'handDrawn';
                    }

                    if (finalStyles.useElk) {
                        config.layout = 'elk';
                        config.elk = {
                            mergeEdges: finalStyles.elkMergeEdges,
                            nodePlacementStrategy: finalStyles.elkNodePlacementStrategy,
                        };
                    }

                    mermaid.initialize(config);

                    containerRef.current.innerHTML = '';
                    const id = genId('mermaid');
                    const { svg } = await mermaid.render(id, data);
                    containerRef.current.innerHTML = svg;

                    const svgElement = containerRef.current.querySelector('svg');
                    if (svgElement) {
                        svgElement.style.maxWidth = 'none';

                        let viewBox = svgElement.getAttribute('viewBox');
                        if (!viewBox) {
                            const width = svgElement.getAttribute('width');
                            const height = svgElement.getAttribute('height');
                            if (width && height) {
                                viewBox = `0 0 ${width} ${height}`;
                                svgElement.setAttribute('viewBox', viewBox);
                            }
                        }

                        // Auto-fit Logic: 
                        // 1. Initial render
                        // 2. Data reset (compare with INITIAL_MERMAID_DSL)
                        const isDataReset = data === INITIAL_MERMAID_DSL && lastDataRef.current !== INITIAL_MERMAID_DSL;

                        if (isFirstRender.current || isDataReset) {
                            // Two-phase fit to ensure stability
                            setTimeout(fitToView, 50);
                            setTimeout(fitToView, 150);
                            isFirstRender.current = false;
                        }

                        lastDataRef.current = data;
                        lastStylesRef.current = finalStyles;
                    }
                } catch (error) {
                    console.error('Mermaid render error:', error);
                    containerRef.current.innerHTML = `<div class="p-8 text-[var(--text-danger)] font-mono text-sm bg-red-50 rounded-md border border-[var(--alert-red)]">
            <p className="font-bold mb-2">渲染错误:</p>
            <pre className="whitespace-pre-wrap">${error instanceof Error ? error.message : String(error)}</pre>
          </div>`;
                }
            }
        };

        renderChart();
    }, [data, finalStyles.theme, finalStyles.fontSize, finalStyles.look, finalStyles.useElk, finalStyles.elkMergeEdges, finalStyles.elkNodePlacementStrategy]);

    const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 5));
    const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.2));
    const handleReset = () => {
        fitToView();
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        setIsDragging(true);
        setStartPos({ x: e.clientX - translateX, y: e.clientY - translateY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setTranslateX(e.clientX - startPos.x);
        setTranslateY(e.clientY - startPos.y);
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey || e.deltaMode === 0) {
            e.preventDefault();
            const zoomFactor = e.deltaMode === 0 ? 0.05 : 0.5;
            const delta = e.deltaY > 0 ? (1 - zoomFactor) : (1 + zoomFactor);
            setScale(prev => Math.max(0.01, Math.min(50, prev * delta)));
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            setLastPinchDist(dist);
        } else if (e.touches.length === 1) {
            setIsDragging(true);
            setStartPos({ x: e.touches[0].clientX - translateX, y: e.touches[0].clientY - translateY });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && lastPinchDist !== null) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = dist / lastPinchDist;
            const factor = delta > 1 ? 1.05 : 0.95;
            setScale(prev => Math.max(0.01, Math.min(50, prev * factor)));
            setLastPinchDist(dist);
        } else if (e.touches.length === 1 && isDragging) {
            setTranslateX(e.touches[0].clientX - startPos.x);
            setTranslateY(e.touches[0].clientY - startPos.y);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setLastPinchDist(null);
    };

    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            const svg = containerRef.current?.querySelector('svg');
            if (!svg) return '';
            try {
                const bBox = (svg as any).getBBox?.() || { x: 0, y: 0, width: 800, height: 600 };
                const padding = 16;
                const horizontalPadding = 40;
                const pixelRatio = options?.pixelRatio || 3;
                const backgroundColor = options?.backgroundColor || '#FFFFFF';
                const transparent = backgroundColor === 'transparent';

                const exportWidth = options?.width || (bBox.width + horizontalPadding * 2);
                const exportHeight = options?.height || (bBox.height + padding * 2);

                return await toPng(svg, {
                    backgroundColor: transparent ? 'transparent' : backgroundColor,
                    pixelRatio: pixelRatio,
                    width: exportWidth,
                    height: exportHeight,
                    style: {
                        transform: 'none',
                        margin: '0',
                        padding: options?.width ? '0' : `${padding}px ${horizontalPadding}px`,
                        background: transparent ? 'transparent' : backgroundColor,
                        backgroundColor: transparent ? 'transparent' : backgroundColor,
                    }
                });
            } catch (err) {
                console.error('getDataURL error:', err);
                return '';
            }
        },
        exportPNG: async (transparent = false, scale = 3) => {
            const svg = containerRef.current?.querySelector('svg');
            if (!svg) return;
            try {
                const bBox = (svg as any).getBBox?.() || { x: 0, y: 0, width: 800, height: 600 };
                const padding = 16;
                const horizontalPadding = 40;
                const isDark = finalStyles.theme === 'dark';

                // Inject temporary export style tag for visibility
                const styleId = 'mermaid-export-force-visibility';
                let styleTag = svg.querySelector(`#${styleId}`) as HTMLStyleElement;
                if (!styleTag) {
                    styleTag = document.createElementNS('http://www.w3.org/2000/svg', 'style') as any;
                    styleTag.id = styleId;
                    svg.appendChild(styleTag);
                }

                if (isDark && transparent) {
                    // Force white text and high-contrast lines for dark theme transparent exports
                    // Targeting standard text tags + HTML tags used in foreignObject (div, span, etc.)
                    styleTag.innerHTML = `
                        .node text, .label text, .edgeLabel, .markdown-embed text, 
                        .node div, .node span, .label div, .label span, tspan, p, h1, h2, h3, h4, 
                        .node-label, .label-box { 
                            fill: #FFFFFF !important; 
                            color: #FFFFFF !important; 
                            font-weight: 500 !important; 
                            -webkit-text-fill-color: #FFFFFF !important;
                        }
                        .edgePath path, .arrowheadPath, .edge-thickness-normal, .edge-thickness-thick { 
                            stroke: #FFFFFF !important; 
                            stroke-width: 1.5px !important; 
                            opacity: 1 !important;
                        }
                        .node rect, .node circle, .node ellipse, .node polygon, .node path { 
                            stroke: #FFFFFF !important; 
                        }
                    `;
                } else {
                    styleTag.innerHTML = '';
                }

                const dataUrl = await toPng(svg, {
                    backgroundColor: transparent ? 'transparent' : (finalStyles.backgroundColor || '#FFFFFF'),
                    pixelRatio: scale,
                    width: bBox.width + horizontalPadding * 2,
                    height: bBox.height + padding * 2,
                    style: {
                        transform: 'none',
                        margin: '0',
                        padding: `${padding}px ${horizontalPadding}px`,
                        background: transparent ? 'transparent' : (finalStyles.backgroundColor || '#FFFFFF'),
                        backgroundColor: transparent ? 'transparent' : (finalStyles.backgroundColor || '#FFFFFF'),
                    }
                });

                // Cleanup temporary style
                styleTag.remove();

                const link = document.createElement('a');
                link.download = `mermaid-diagram-${new Date().getTime()}.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error('PNG export error:', err);
            }
        },
        exportPDF: async (transparent = false) => {
            const svg = containerRef.current?.querySelector('svg');
            if (!svg) return;
            try {
                const bBox = (svg as any).getBBox?.() || { x: 0, y: 0, width: 800, height: 600 };
                const padding = 16;
                const horizontalPadding = 40;
                const isDark = finalStyles.theme === 'dark';

                // Inject temporary style tag for visibility
                const styleId = 'mermaid-pdf-export-force-visibility';
                let styleTag = svg.querySelector(`#${styleId}`) as HTMLStyleElement;
                if (!styleTag) {
                    styleTag = document.createElementNS('http://www.w3.org/2000/svg', 'style') as any;
                    styleTag.id = styleId;
                    svg.appendChild(styleTag);
                }

                if (isDark && transparent) {
                    styleTag.innerHTML = `
                        .node text, .label text, .edgeLabel, .node div, .node span, .label div, .label span, tspan, p { 
                            fill: #FFFFFF !important; 
                            color: #FFFFFF !important; 
                            -webkit-text-fill-color: #FFFFFF !important;
                        }
                        .edgePath path, .arrowheadPath { stroke: #FFFFFF !important; }
                        .node rect, .node circle, .node ellipse, .node polygon, .node path { stroke: #FFFFFF !important; }
                    `;
                } else {
                    styleTag.innerHTML = '';
                }

                const dataUrl = await toPng(svg, {
                    backgroundColor: transparent ? 'transparent' : (finalStyles.backgroundColor || '#FFFFFF'),
                    pixelRatio: scale,
                    width: bBox.width + horizontalPadding * 2,
                    height: bBox.height + padding * 2,
                    style: {
                        transform: 'none',
                        margin: '0',
                        padding: `${padding}px ${horizontalPadding}px`,
                        background: transparent ? 'transparent' : (finalStyles.backgroundColor || '#FFFFFF'),
                        backgroundColor: transparent ? 'transparent' : (finalStyles.backgroundColor || '#FFFFFF'),
                    }
                });

                styleTag.remove();

                const img = new Image();
                img.src = dataUrl;
                img.onload = () => {
                    const pdf = new jsPDF({
                        orientation: img.width > img.height ? 'landscape' : 'portrait',
                        unit: 'px',
                        format: [img.width, img.height]
                    });
                    pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
                    pdf.save(`mermaid-diagram-${new Date().getTime()}.pdf`);
                };
            } catch (err) {
                console.error('PDF export error:', err);
            }
        },
        tidyLayout: () => {
            fitToView();
        }
    }));

    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            fitToView();
        });
        if (chartOuterRef.current) resizeObserver.observe(chartOuterRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div className="w-full h-full relative overflow-hidden transition-colors duration-500" style={{ backgroundColor: finalStyles.backgroundColor }} onWheel={handleWheel}>
            <div
                ref={chartOuterRef}
                className="w-full h-full relative cursor-grab active:cursor-grabbing p-0 touch-none overflow-hidden"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    ref={chartInnerRef}
                    className="absolute top-0 left-0"
                    style={{
                        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                        transformOrigin: '0 0',
                        backgroundColor: finalStyles.backgroundColor,
                        padding: '0',
                        borderRadius: '0'
                    }}
                >
                    <div
                        ref={containerRef}
                        className="mermaid-container"
                        style={{
                            background: 'transparent',
                            fontSize: `${finalStyles.fontSize}px`
                        }}
                    />
                </div>
            </div>
        </div>
    );
});

MermaidDiagram.displayName = 'MermaidDiagram';
