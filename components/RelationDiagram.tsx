import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Graph } from '@antv/g6';
import { RelationNode, RelationLink, RelationChartStyles, DEFAULT_RELATION_STYLES, BaseDiagramRef } from '../types';
import { estimateTextWidth } from '../utils/textMetrics';
import { computeDeterministicRelationLayout } from '../utils/relationGraph';

export interface RelationDiagramRef extends BaseDiagramRef {}

interface RelationDiagramProps {
    nodes: RelationNode[];
    links: RelationLink[];
    styles?: RelationChartStyles;
    className?: string;
}

const RelationDiagram = forwardRef<RelationDiagramRef, RelationDiagramProps>(({ nodes, links, styles, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<Graph | null>(null);
    const rafRef = useRef<number | null>(null);

    const finalStyles = { ...DEFAULT_RELATION_STYLES, ...styles };

    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            if (!graphRef.current) return '';
            if (options?.width && options?.height) {
                graphRef.current.setSize(options.width, options.height);
            }
            await graphRef.current.fitView({ padding: 60, duration: 0 } as any);
            // 等待至少一帧 Canvas 重绘提交
            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => resolve());
                });
            });
            return await graphRef.current.toDataURL({
                pixelRatio: options?.pixelRatio || 3,
                backgroundColor: options?.backgroundColor || '#FFFFFF'
            } as any);
        },
        exportPNG: async (transparent = false, scale = 3) => {
            if (!graphRef.current) return;
            const rawDataURL = await graphRef.current.toDataURL({ pixelRatio: scale });

            if (transparent) {
                const link = document.createElement('a');
                link.download = `关联图_透明_${new Date().getTime()}.png`;
                link.href = rawDataURL;
                link.click();
                return;
            }

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#FFFFFF'; // Default white background
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    const link = document.createElement('a');
                    link.download = `关联图_${new Date().getTime()}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
            };
            img.src = rawDataURL;
        },
        exportPDF: async (transparent = false) => {
            if (!graphRef.current) return;
            const dataURL = await graphRef.current.toDataURL({
                backgroundColor: '#FFFFFF'
            } as any);

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
            if (graphRef.current) {
                const isHeadless = typeof window !== 'undefined' && window.location.search.includes('mode=headless');
                graphRef.current.fitView({ padding: 60, duration: isHeadless ? 0 : 300 } as any);
            }
        }
    }));

    useEffect(() => {
        if (!containerRef.current || !nodes.length) return;

        const isHeadless = typeof window !== 'undefined' && window.location.search.includes('mode=headless');
        const animDuration = isHeadless ? 0 : 300;

        const width = containerRef.current.clientWidth || 800;
        const height = containerRef.current.clientHeight || 600;

        // Transform data for G6
        // --- MULTI-ROOT LOGIC ---
        // 1. Calculate Out-Degree to identify Symptoms (Sinks: Out-Degree = 0)
        // Filter out 'root' which is now reserved for title only
        const validNodes = nodes.filter(n => n.id !== 'root');
        const outDegree = new Map<string, number>();
        validNodes.forEach(n => outDegree.set(n.id, 0));
        
        links.forEach(l => {
            if (l.source !== l.target && l.source !== 'root' && l.target !== 'root') {
                outDegree.set(l.source, (outDegree.get(l.source) || 0) + 1);
            }
        });

        // 2. 纯数学确定性因果拓扑坐标计算（<2ms 闭式解，无异步力导向迭代）
        const layoutCoords = computeDeterministicRelationLayout(
            validNodes,
            links,
            finalStyles.layout,
            width,
            height
        );

        // 3. Create G6 Nodes
        const g6Nodes = validNodes.map(node => {
            const isSymptom = (outDegree.get(node.id) || 0) === 0;
            const coord = layoutCoords.get(node.id) || { x: width / 2, y: height / 2 };
            
            let fill = finalStyles.middleColor;
            let stroke = finalStyles.middleColor;
            let labelFill = finalStyles.middleTextColor;
            let fontWeight = 'normal' as any;
            let shape = 'rect';
            let fontSize = finalStyles.nodeFontSize;

            if (node.type === 'end') {
                fill = finalStyles.endColor;
                stroke = finalStyles.endColor;
                labelFill = finalStyles.endTextColor;
                shape = 'ellipse';
            } else if (isSymptom) {
                // Style as Root/Symptom (Rectangle)
                fill = finalStyles.rootColor;
                stroke = finalStyles.rootColor;
                labelFill = finalStyles.rootTextColor;
                fontWeight = 'bold';
                shape = 'rect';
            } else {
                // Middle nodes (Ellipse)
                shape = 'ellipse';
            }

            // 按**实际字宽**估算（汉字 1em / 拉丁 0.56em）
            const textW = estimateTextWidth(node.label, fontSize);
            const size: number | [number, number] = shape === 'rect'
                ? [Math.max(120, textW + 40), 50]
                : [Math.max(100, textW + 20), 40];

            return {
                id: node.id,
                type: shape,
                data: { ...node },
                x: coord.x,
                y: coord.y,
                style: {
                    x: coord.x,
                    y: coord.y,
                    fill,
                    stroke,
                    lineWidth: 1,
                    radius: 8,
                    labelText: node.label,
                    labelFill,
                    labelFontSize: fontSize,
                    labelFontWeight: fontWeight,
                    labelPlacement: 'center',
                    size,
                    cursor: 'pointer'
                }
            };
        });

        // 4. Transform User Links (Filter out self-references and title nodes)
        const g6Edges = links
            .filter(link => link.source !== link.target && link.source !== 'root' && link.target !== 'root')
            .map(link => ({
                source: link.source,
                target: link.target,
                style: {
                    stroke: finalStyles.lineColor,
                    lineWidth: 2,
                    endArrow: true
                }
            }));

        if (!graphRef.current) {
            const graph = new Graph({
                container: containerRef.current,
                width,
                height,
                data: { nodes: g6Nodes, edges: g6Edges },
                behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
                autoFit: 'view',
                padding: [60, 60, 60, 60],
                animation: !isHeadless,
            });

            graphRef.current = graph;
            graph.render().then(() => {
                graph.fitView({ padding: 60, duration: animDuration } as any);
            });
        } else {
            graphRef.current.setData({ nodes: g6Nodes, edges: g6Edges });
            graphRef.current.render().then(() => {
                graphRef.current?.fitView({ padding: 60, duration: animDuration } as any);
            });
        }

        const resizeObserver = new ResizeObserver((entries) => {
            if (!containerRef.current || !graphRef.current) return;
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) {
                graphRef.current.setSize(width, height);
                graphRef.current.fitView({ padding: 60, duration: 0 } as any);
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };

    }, [nodes, links, styles]);

    return (
        <div className={`w-full h-full bg-[var(--card-bg)] transition-background-color 0.5s ease ${className}`}>
            {/* Drawing Area */}
            <div className="w-full h-full relative overflow-hidden">
                <div ref={containerRef} className="w-full h-full" />
            </div>
        </div>
    );
});

export default RelationDiagram;
