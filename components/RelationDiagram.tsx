import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Graph } from '@antv/g6';
import { RelationNode, RelationLink, RelationChartStyles, DEFAULT_RELATION_STYLES, BaseDiagramRef } from '../types';
import { estimateTextWidth } from '../utils/textMetrics';

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
                graphRef.current.fitView({ padding: 120 } as any);
            }
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
                graphRef.current.layout();
                graphRef.current.fitView({ duration: 500 } as any);
            }
        }
    }));

    useEffect(() => {
        if (!containerRef.current || !nodes.length) return;

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

        // 2. Create G6 Nodes
        const g6Nodes = validNodes.map(node => {
            const isSymptom = (outDegree.get(node.id) || 0) === 0;
            
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

            // 按**实际字宽**估算（汉字 1em / 拉丁 0.56em），旧实现用 label.length
            // 会把中文算窄（溢出）把英文算宽（留白过大）
            const textW = estimateTextWidth(node.label, fontSize);
            const size: number | [number, number] = shape === 'rect'
                ? [Math.max(120, textW + 40), 50]
                : [Math.max(100, textW + 20), 40];

            return {
                id: node.id,
                type: shape,
                data: { ...node },
                style: {
                    fill,
                    stroke,
                    lineWidth: 1,          // 原为 0：同色相邻节点会糊成一片，细描边提供轮廓
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

        // 3. Transform User Links (Filter out self-references and title nodes)
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
                layout: getLayoutConfig(finalStyles.layout || 'Directional'),
                behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
                autoFit: 'view',
                padding: [40, 40, 40, 40],
                animation: true,
            });

            graphRef.current = graph;
            graph.render();
        } else {
            graphRef.current.setData({ nodes: g6Nodes, edges: g6Edges });
            // Update Layout dynamically
            graphRef.current.setLayout(getLayoutConfig(finalStyles.layout || 'Directional'));
            graphRef.current.render();
            // 数据变化后重新布局并自适应。用 requestAnimationFrame 双帧替代
            // 硬编码 100ms 定时器（原实现既不精确、又无清理，卸载后仍会执行）
            rafRef.current && cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = requestAnimationFrame(() => {
                    if (!graphRef.current) return;
                    graphRef.current.layout();
                    graphRef.current.fitView();
                });
            });
        }

        function getLayoutConfig(type: string): any {
            switch (type) {
                case 'Directional':
                    return {
                        type: 'dagre',
                        rankdir: 'LR',
                        nodesep: 50,
                        ranksep: 100,
                        controlPoints: true,
                    };
                case 'Centralized':
                    // Radial Layout
                    return {
                        type: 'radial',
                        center: [width / 2, height / 2],
                        unitRadius: 180,
                        linkDistance: 150,
                        preventOverlap: true,
                        nodeSize: 80,
                        strict: true,
                    };
                case 'Free':
                    return {
                        type: 'fruchterman',
                        gravity: 0.5,
                        speed: 10,
                        linkDistance: 200,
                        nodeSpacing: 30,
                        preventOverlap: true,
                        nodeSize: 120,
                        gpuEnabled: true,
                        workerEnabled: true,
                    };
                default:
                    return {
                        type: 'dagre',
                        rankdir: 'LR',
                    };
            }
        }

        const resizeObserver = new ResizeObserver((entries) => {
            if (!containerRef.current || !graphRef.current) return;
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) {
                graphRef.current.setSize(width, height);
                graphRef.current.fitView();
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
