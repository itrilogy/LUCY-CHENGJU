import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Graph } from '@antv/g6';
import { Workflow } from 'lucide-react';
import { PDPCData, PDPCChartStyles, DEFAULT_PDPC_STYLES, PDPCNode, PDPCLink, PDPCGroup, BaseDiagramRef } from '../types';

export interface PDPCDiagramRef extends BaseDiagramRef {}

interface PDPCDiagramProps {
    data: PDPCData;
    styles?: PDPCChartStyles;
    onStylesChange?: (styles: PDPCChartStyles) => void;
    className?: string;
}

const PDPCDiagram = forwardRef<PDPCDiagramRef, PDPCDiagramProps>(({ data, styles, onStylesChange, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<Graph | null>(null);

    const finalStyles = { ...DEFAULT_PDPC_STYLES, ...styles };

    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            if (!graphRef.current) return '';
            const pixelRatio = options?.pixelRatio || 3;
            const backgroundColor = options?.backgroundColor || '#FFFFFF';

            if (options?.width && options?.height) {
                graphRef.current.setSize(options.width, options.height);
                graphRef.current.fitView({ padding: 40 } as any);
            }
            
            const graphCanvasData = await graphRef.current.toDataURL({ 
                backgroundColor: backgroundColor,
                pixelRatio: pixelRatio
            } as any);
            if (!data.title) return graphCanvasData;

            // 如果有标题，需要合成
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { resolve(graphCanvasData); return; }

                    const titleHeight = 80 * pixelRatio; // 预留标题高度
                    canvas.width = img.width;
                    canvas.height = img.height + titleHeight;

                    // 背景
                    if (backgroundColor !== 'transparent') {
                        ctx.fillStyle = backgroundColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }

                    // 绘制标题
                    ctx.fillStyle = '#1A2428';
                    ctx.font = `bold ${finalStyles.titleFontSize * pixelRatio}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(data.title || '', canvas.width / 2, titleHeight / 2);

                    // 绘制图形
                    ctx.drawImage(img, 0, titleHeight);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.src = graphCanvasData;
            });
        },
        exportPNG: async (transparent = false, scale = 3) => {
            if (!graphRef.current || !containerRef.current) return;

            const graphCanvas = await graphRef.current.toDataURL({ 
                backgroundColor: transparent ? 'transparent' : '#FFFFFF',
                pixelRatio: scale
            });
            const uiWidth = containerRef.current.clientWidth;
            const uiTitleHeight = titleRef.current?.offsetHeight || 0;

            // Create a temporary canvas for compositing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const img = new Image();
            img.onload = () => {
                // Calculate scale factor between G6 export and UI
                const g6Scale = img.width / uiWidth;
                const exportTitleHeight = uiTitleHeight * g6Scale;

                canvas.width = img.width;
                canvas.height = img.height + exportTitleHeight;

                // Fill background
                if (!transparent) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                // Draw Title with proportional scaling
                if (data.title) {
                    const scaledFontSize = finalStyles.titleFontSize * g6Scale;
                    ctx.fillStyle = '#1A2428';
                    ctx.font = `bold ${scaledFontSize}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    // Center vertically within the title area
                    ctx.fillText(data.title, canvas.width / 2, exportTitleHeight / 2);
                }

                // Draw Graph
                ctx.drawImage(img, 0, exportTitleHeight);

                const link = document.createElement('a');
                link.download = `PDPC_${new Date().getTime()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            };
            img.src = graphCanvas;
        },
        exportPDF: async (transparent = false) => {
            if (!graphRef.current) return;
            const dataURL = await graphRef.current.toDataURL({ backgroundColor: '#FFFFFF' });
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <div style="text-align:center; padding: 2rem; font-family: sans-serif;">
                        <h1 style="font-size: ${finalStyles.titleFontSize}px; margin-bottom: 2rem; color: #1A2428;">${data.title || ''}</h1>
                        <img src="${dataURL}" style="max-width:100%; border: 1px solid rgba(13,94,66,0.10);"/>
                    </div>
                `);
                win.document.close();
                win.print();
            }
        },
        tidyLayout: () => {
            if (graphRef.current) {
                graphRef.current.layout();
                graphRef.current.fitView({
                    padding: 40,
                    duration: 500
                } as any);
            }
        }
    }));

    useEffect(() => {
        if (!containerRef.current || !data.nodes.length) return;

        const width = containerRef.current.clientWidth || 800;
        const height = containerRef.current.clientHeight || 600;

        // 1. Transform Nodes
        const g6Nodes = data.nodes.map(node => {
            let fill = finalStyles.stepColor;
            let labelFill = finalStyles.stepTextColor;
            let shape = 'rect';
            let radius = 4;

            if (node.type === 'start') {
                fill = finalStyles.startColor;
                labelFill = finalStyles.startTextColor;
            }
            if (node.type === 'end') {
                fill = finalStyles.endColor;
                labelFill = finalStyles.endTextColor;
                radius = 16;
            }
            if (node.type === 'countermeasure') {
                fill = finalStyles.countermeasureColor;
                labelFill = finalStyles.countermeasureTextColor;
                shape = 'diamond';
            }

            return {
                id: node.id,
                type: shape,
                combo: node.groupId,
                style: {
                    fill,
                    stroke: fill,
                    lineWidth: 0,
                    radius,
                    labelText: node.label,
                    labelFill,
                    labelFontSize: finalStyles.nodeFontSize,
                    labelPlacement: 'center',
                    size: [Math.max(100, node.label.length * 12 + 20), 40],
                    cursor: 'pointer'
                }
            };
        });

        // 2. Transform Links
        const g6Edges = data.links.map(link => {
            const isOK = link.marker === 'OK';
            const isNG = link.marker === 'NG';

            return {
                source: link.source,
                target: link.target,
                style: {
                    stroke: isNG ? '#E74C3C' : (isOK ? '#00D2FF' : finalStyles.lineColor),
                    lineWidth: finalStyles.lineWidth,
                    endArrow: true,
                    labelText: link.marker !== 'None' ? link.marker : '',
                    labelFill: isNG ? '#E74C3C' : (isOK ? '#00D2FF' : '#64748b'),
                    labelFontSize: 10,
                    labelFontWeight: 'bold',
                    labelBackground: true,
                    labelBackgroundFill: '#FFFFFF',
                    labelBackgroundRadius: 4,
                    labelPadding: [2, 4]
                }
            };
        });

        // 3. Transform Groups (Combos)
        const g6Combos = data.groups.map(group => ({
            id: group.id,
            type: 'rect',
            style: {
                labelText: group.label,
                labelFill: '#64748b',
                labelFontSize: 12,
                labelFontWeight: 'bold',
                labelPlacement: 'top',
                fill: '#F5F7FA',
                fillOpacity: 0.5,
                stroke: 'rgba(13,94,66,0.10)',
                lineWidth: 1,
                lineDash: [4, 4],
                radius: 8,
                padding: [40, 20, 20, 20]
            }
        }));

        const layoutConfig = {
            type: 'dagre',
            rankdir: finalStyles.layout === 'Directional' ? 'LR' : 'TB',
            nodesep: 50,
            ranksep: finalStyles.layout === 'Standard' ? 100 : 80,
            comboPadding: 40
        };

        if (!graphRef.current) {
            const graph = new Graph({
                container: containerRef.current,
                width,
                height,
                data: { nodes: g6Nodes, edges: g6Edges, combos: g6Combos },
                layout: layoutConfig,
                behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element', 'drag-combo'],
                autoFit: {
                    type: 'view',
                    options: {
                        padding: 40
                    }
                } as any,
            });

            graphRef.current = graph;
            graph.render();
        } else {
            graphRef.current.setData({ nodes: g6Nodes, edges: g6Edges, combos: g6Combos });
            graphRef.current.setLayout(layoutConfig);
            graphRef.current.render();
            graphRef.current.fitView({
                padding: 40,
                duration: 500
            } as any);
        }

        const resizeObserver = new ResizeObserver((entries) => {
            if (!containerRef.current || !graphRef.current) return;
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) {
                graphRef.current.setSize(width, height);
                graphRef.current.fitView({ padding: 40 } as any);
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, [data, styles]);

    return (
        <div className={`flex flex-col h-full bg-white ${className}`}>
            {data.title && (
                <div
                    ref={titleRef}
                    className="p-8 text-center shrink-0"
                    style={{
                        fontSize: finalStyles.titleFontSize,
                        fontWeight: 'bold',
                        color: '#1A2428'
                    }}
                >
                    {data.title}
                </div>
            )}
            <div
                ref={containerRef}
                className="flex-1 min-h-0 w-full relative"
            />
        </div>
    );
});

export default PDPCDiagram;
