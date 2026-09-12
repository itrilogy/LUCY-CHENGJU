
import React, { useMemo, useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ArrowData, ArrowChartStyles, DEFAULT_ARROW_STYLES, BaseDiagramRef } from '../types';
import { svgToDataURL } from '../utils/exportUtils';
import { fitText } from '../utils/textMetrics';

export interface ArrowDiagramRef extends BaseDiagramRef {
    resetView: () => void;
}

interface ArrowDiagramProps {
    data: ArrowData;
    styles: ArrowChartStyles;
}

export const ArrowDiagram = forwardRef<ArrowDiagramRef, ArrowDiagramProps>(({ data, styles = DEFAULT_ARROW_STYLES }, ref) => {
    const {
        nodeRadius, lineWidth, fontSize,
        nodeColor, nodeTextColor,
        lineColor, criticalLineColor, shortestLineColor, textColor,
        showCriticalPath, showShortestPath
    } = styles;

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

    // Draggable Label State
    // Map of linkIndex -> {x, y} offset
    const [labelOffsets, setLabelOffsets] = useState<Record<number, { x: number, y: number }>>({});
    const [draggingLabel, setDraggingLabel] = useState<{ index: number, startX: number, startY: number, initialOffsetX: number, initialOffsetY: number } | null>(null);

    /** 连线标号自适应：未超宽用原字号，超宽则同比缩字号（下限 9px），底板贴合文字 */
    const fitLabel = (text: string, baseSize: number) =>
        fitText(text, baseSize, 96, 9, 14);

    const lastPos = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Calculate bounding box
    const bounds = useMemo(() => {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        if (data.nodes.length === 0) return { minX: 0, maxX: 800, minY: 0, maxY: 600, width: 800, height: 600, centerX: 400, centerY: 300 };

        data.nodes.forEach(n => {
            const x = n.x || 0;
            const y = n.y || 0;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });

        // Reduced padding for tighter layout
        const padding = nodeRadius * 3;
        return {
            minX: minX - padding,
            maxX: maxX + padding,
            minY: minY - padding - 30, // Reduced extra top space for Title
            maxY: maxY + padding,
            width: (maxX - minX) + padding * 2,
            height: (maxY - minY) + padding * 2 + 30,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2 - 15 // Shift center to account for title space
        };
    }, [data.nodes, nodeRadius]);

    const performAutoFit = () => {
        if (containerRef.current && bounds.width > 0 && bounds.height > 0) {
            const { clientWidth, clientHeight } = containerRef.current;
            const scaleX = clientWidth / bounds.width;
            const scaleY = clientHeight / bounds.height;
            // Fit either width or height to edge (contain)
            let newScale = Math.min(scaleX, scaleY);
            if (newScale > 1.5) newScale = 1.5;

            setScale(newScale);
            setOffset({ x: 0, y: 0 });
        }
    };

    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            if (!svgRef.current) return '';
            // ArrowDiagram 比较特殊，它的内容容器是 #diagram-content
            // 我们需要临时克隆并调整 viewBox
            const contentGroup = svgRef.current.querySelector('#diagram-content');
            if (!contentGroup) return '';

            // 创建一个临时的 SVG 容器来承载内容
            const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            tempSvg.setAttribute('width', bounds.width.toString());
            tempSvg.setAttribute('height', bounds.height.toString());
            tempSvg.setAttribute('viewBox', `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
            
            // 复制 Defs (包含箭头等)
            const defs = svgRef.current.querySelector('defs')?.cloneNode(true);
            if (defs) tempSvg.appendChild(defs);

            // 复制内容
            const clone = contentGroup.cloneNode(true) as SVGGElement;
            clone.removeAttribute('transform'); // 移除缩放平移
            tempSvg.appendChild(clone);

            return await svgToDataURL(tempSvg, {
                pixelRatio: options?.pixelRatio || 3,
                backgroundColor: options?.backgroundColor || '#FFFFFF',
                width: options?.width,
                height: options?.height,
                padding: 0 // 已经有 bounds 逻辑了
            });
        },
        resetView: performAutoFit,
        tidyLayout: performAutoFit,
        exportPNG: async (transparent = false, scale = 3) => {
            if (!svgRef.current) return;

            const serializer = new XMLSerializer();
            // We clone the SVG to remove current transform (viewing) for the export, 
            // OR we rely on a clean 'export' construction.
            // Since we put everything inside SVG now, we can just serialize it, 
            // BUT we want to ensure the viewBox matches the content, not the container.

            // Create a temporary SVG string with correct viewBox
            const innerContent = svgRef.current.innerHTML;
            // Removed the main transform group for export, but we need the labels to stay relative?
            // Actually our main 'g' has the transform. 
            // We want to export the 'untransformed' coordinate system (the logic coordinates).

            // Let's reconstruct the export SVG manually to ensure it's clean and "Whole Diagram"
            // We need to bake the labelOffsets into it?
            // The labelOffsets are applied in the render loop.
            // So if we just grab the innerHTML of the content group, it contains the transforms!
            // Wait, the content group `g` has the `scale` and `translate` for ZOOM/PAN.
            // We DON'T want that for export. We want the identity transform.

            // However, the `labelOffsets` are applied to the label `<g>`.
            // So we can grasp the content inside the main `g`, but STRIP the parent transform.

            const contentGroup = svgRef.current.querySelector('#diagram-content');
            if (!contentGroup) return;

            const exportWidth = bounds.width;
            const exportHeight = bounds.height;

            // We wrap the content in a new SVG with the bounds as viewBox
            // Note: The contentGroup (id=diagram-content) currently has the Zoom Transform.
            // We need to clone it and REMOVE the transform attribute.

            const clonedNode = contentGroup.cloneNode(true) as SVGGElement;
            clonedNode.removeAttribute('transform');
            // We need to shift it so (minX, minY) is at (0,0)? 
            // Bounding box logic: minX, minY are top-left.
            // If viewBox is set to `${bounds.minX} ${bounds.minY} ...`, we don't need to shift content.

            const svgStr = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}" viewBox="${bounds.minX} ${bounds.minY} ${exportWidth} ${exportHeight}">
                    <defs>${svgRef.current.querySelector('defs')?.innerHTML || ''}</defs>
                    <style>
                        text { font-family: sans-serif; }
                    </style>
                    ${clonedNode.outerHTML}
                </svg>
            `;

            const img = new Image();
            const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Export at 2x resolution
                canvas.width = exportWidth * scale;
                canvas.height = exportHeight * scale;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                if (!transparent) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const link = document.createElement('a');
                link.download = `ArrowDiagram_${new Date().getTime()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                URL.revokeObjectURL(url);
            };
            img.src = url;
        },
        exportPDF: (transparent = false) => {
            if (!svgRef.current) return;
            const contentGroup = svgRef.current.querySelector('#diagram-content');
            if (!contentGroup) return;

            const clonedNode = contentGroup.cloneNode(true) as SVGGElement;
            clonedNode.removeAttribute('transform');

            const svgStr = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}" style="max-width:100%; height:auto;">
                    <defs>${svgRef.current.querySelector('defs')?.innerHTML || ''}</defs>
                    ${clonedNode.outerHTML}
                </svg>
            `;

            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <html>
                    <head><title>${data.title}</title></head>
                    <body style="text-align:center;">
                        ${svgStr}
                    </body>
                    </html>
                `);
                win.document.close();
                setTimeout(() => win.print(), 500);
            }
        }
    }));

    // Initial Auto Fit
    useEffect(() => {
        const timer = setTimeout(() => { performAutoFit(); }, 50);
        return () => clearTimeout(timer);
    }, [data, bounds]);

    // Handle Window Resize
    useEffect(() => {
        const handleResize = () => performAutoFit();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [bounds]);

    // --- Interactive Handlers ---

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey || e.deltaMode === 0) {
            e.preventDefault();
            const zoomSensitivity = 0.002;
            const delta = -e.deltaY * zoomSensitivity;
            const newScale = Math.min(Math.max(0.1, scale + delta), 10);
            setScale(newScale);
        }
    };

    // Canvas Dragging
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        // Only drag canvas if not dragging a label
        if (draggingLabel) return;
        setIsDraggingCanvas(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (draggingLabel) {
            e.stopPropagation();
            const dx = (e.clientX - draggingLabel.startX) / scale; // Adjust for scale
            const dy = (e.clientY - draggingLabel.startY) / scale;

            setLabelOffsets(prev => ({
                ...prev,
                [draggingLabel.index]: {
                    x: draggingLabel.initialOffsetX + dx,
                    y: draggingLabel.initialOffsetY + dy
                }
            }));
            return;
        }

        if (isDraggingCanvas) {
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            lastPos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleCanvasMouseUp = () => {
        setIsDraggingCanvas(false);
        setDraggingLabel(null);
    };

    // Label Dragging Start
    const handleLabelMouseDown = (e: React.MouseEvent, index: number) => {
        e.stopPropagation(); // Stop canvas drag
        const currentOffset = labelOffsets[index] || { x: 0, y: 0 };
        setDraggingLabel({
            index,
            startX: e.clientX,
            startY: e.clientY,
            initialOffsetX: currentOffset.x,
            initialOffsetY: currentOffset.y
        });
    };

    const markerW = 10 + lineWidth;
    const markerH = 7 + lineWidth * 0.5;

    return (
        <div className="flex flex-col h-full bg-white">
            <div
                ref={containerRef}
                className="flex-1 w-full h-full overflow-hidden relative bg-white cursor-grab active:cursor-grabbing"
                onWheel={handleWheel}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
            >
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    className="pointer-events-none"
                // Important: Make svg pass events to div, but children with pointer-events:auto will catch them
                >
                    <defs>
                        <marker id="arrow-head" markerWidth={markerW} markerHeight={markerH} refX={nodeRadius + markerW - 2} refY={markerH / 2} orient="auto" markerUnits="userSpaceOnUse">
                            <polygon points={`0 0, ${markerW} ${markerH / 2}, 0 ${markerH}`} fill={lineColor} />
                        </marker>
                        <marker id="arrow-head-critical" markerWidth={markerW} markerHeight={markerH} refX={nodeRadius + markerW - 2} refY={markerH / 2} orient="auto" markerUnits="userSpaceOnUse">
                            <polygon points={`0 0, ${markerW} ${markerH / 2}, 0 ${markerH}`} fill={criticalLineColor} />
                        </marker>
                        <marker id="arrow-head-shortest" markerWidth={markerW} markerHeight={markerH} refX={nodeRadius + markerW - 2} refY={markerH / 2} orient="auto" markerUnits="userSpaceOnUse">
                            <polygon points={`0 0, ${markerW} ${markerH / 2}, 0 ${markerH}`} fill={shortestLineColor} />
                        </marker>
                        <marker id="arrow-head-dummy" markerWidth={markerW} markerHeight={markerH} refX={nodeRadius + markerW - 2} refY={markerH / 2} orient="auto" markerUnits="userSpaceOnUse">
                            <polygon points={`0 0, ${markerW} ${markerH / 2}, 0 ${markerH}`} fill={lineColor} fillOpacity="0.5" />
                        </marker>
                    </defs>

                    <g
                        id="diagram-content"
                        transform={`translate(${containerRef.current ? containerRef.current.clientWidth / 2 + offset.x : 0}, ${containerRef.current ? containerRef.current.clientHeight / 2 + offset.y : 0}) scale(${scale}) translate(${-bounds.centerX}, ${-bounds.centerY})`}
                    >
                        {/* Title inside SVG */}
                        {data.title && (
                            <text
                                x={bounds.centerX}
                                y={bounds.minY + 25}
                                textAnchor="middle"
                                fontSize={24}
                                fontWeight="bold"
                                fill="#1A2428"
                            >
                                {data.title}
                            </text>
                        )}

                        {/* Links */}
                        {data.links.map((link, idx) => {
                                    const fit = fitLabel(link.label || '', fontSize);
                            const src = data.nodes.find(n => n.id === link.source);
                            const tgt = data.nodes.find(n => n.id === link.target);

                            if (!src || !tgt) return null;

                            const isCrit = styles.showCriticalPath && link.isCritical;
                            const isShort = styles.showShortestPath && link.isShortest;

                            let stroke = lineColor;
                            if (isCrit) stroke = criticalLineColor;
                            else if (isShort) stroke = shortestLineColor;

                            let strokeWidth = lineWidth;
                            if (isCrit) strokeWidth = lineWidth * 1.5;
                            else if (isShort) strokeWidth = lineWidth * 1.3;

                            let markerEnd = link.isDummy
                                ? 'url(#arrow-head-dummy)'
                                : (isCrit ? 'url(#arrow-head-critical)' : (isShort ? 'url(#arrow-head-shortest)' : 'url(#arrow-head)'));

                            const x1 = src.x || 0;
                            const y1 = src.y || 0;
                            const x2 = tgt.x || 0;
                            const y2 = tgt.y || 0;

                            const midX = (x1 + x2) / 2;
                            const midY = (y1 + y2) / 2;

                            const lblOffset = labelOffsets[idx] || { x: 0, y: 0 };

                            return (
                                <g key={`link-${idx}`}>
                                    <line
                                        x1={x1} y1={y1}
                                        x2={x2} y2={y2}
                                        stroke={stroke}
                                        strokeWidth={strokeWidth}
                                        strokeDasharray={link.isDummy ? "6,4" : undefined}
                                        markerEnd={markerEnd}
                                        opacity={link.isDummy ? 0.6 : 1}
                                    />
                                    {/* Draggable Label Group */}
                                    <g
                                        transform={`translate(${midX + lblOffset.x}, ${midY + lblOffset.y})`}
                                        className="cursor-move pointer-events-auto"
                                        onMouseDown={(e) => handleLabelMouseDown(e, idx)}
                                    >
                                        <rect x={-fit.boxWidth / 2} y="-18" width={fit.boxWidth} height="36" fill="white" opacity="0.85" rx="4" />
                                        <text y="-4" textAnchor="middle" fill={textColor} fontSize={fit.size} fontWeight={isCrit ? 'bold' : 'normal'} className="select-none">
                                            {link.label}
                                        </text>
                                        <text y={fit.size} textAnchor="middle" fill={textColor} fontSize={Math.max(8, fit.size * 0.85)} opacity={0.8} fontStyle="italic" className="select-none">
                                            {link.isDummy ? '(dummy)' : `t=${link.duration}`}
                                        </text>

                                        {/* 可拖拽热区（与底板同步） */}
                                        <rect x={-fit.boxWidth / 2 - 2} y="-20" width={fit.boxWidth + 4} height="40" fill="transparent" stroke="transparent" className="hover:stroke-blue-400 stroke-1 border-dashed" />
                                    </g>
                                </g>
                            );
                        })}

                        {/* Nodes */}
                        {data.nodes.map((node) => {
                            const x = node.x || 0;
                            const y = node.y || 0;

                            return (
                                <g key={`node-${node.id}`} transform={`translate(${x}, ${y})`}>
                                    <circle r={nodeRadius} fill={nodeColor} stroke={lineColor} strokeWidth={lineWidth} className="drop-shadow-sm" />
                                    <line x1={-nodeRadius} y1={0} x2={nodeRadius} y2={0} stroke={lineColor} strokeWidth={1} opacity="0.3" />
                                    <line x1={0} y1={0} x2={0} y2={nodeRadius} stroke={lineColor} strokeWidth={1} opacity="0.3" />
                                    <text x={0} y={-nodeRadius * 0.25} textAnchor="middle" dominantBaseline="middle" fill={nodeTextColor} fontSize={fontSize * 1.2} fontWeight="bold" className="select-none">
                                        {node.id}
                                    </text>
                                    <text x={-nodeRadius * 0.4} y={nodeRadius * 0.55} textAnchor="middle" dominantBaseline="middle" fill={nodeTextColor} fontSize={fontSize * 0.85} className="font-mono select-none">
                                        {node.es}
                                    </text>
                                    <text x={nodeRadius * 0.4} y={nodeRadius * 0.55} textAnchor="middle" dominantBaseline="middle" fill={nodeTextColor} fontSize={fontSize * 0.85} className="font-mono select-none">
                                        {node.ls !== Infinity ? node.ls : '-'}
                                    </text>
                                    {node.label !== node.id && (
                                        <text x={0} y={nodeRadius + fontSize + 4} textAnchor="middle" fill={textColor} fontSize={fontSize} fontWeight="500" className="select-none text-shadow-sm">
                                            {node.label}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>
        </div>
    );
});

ArrowDiagram.displayName = 'ArrowDiagram';
