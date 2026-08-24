import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Graph } from '@antv/g6';
import { FishboneNode, FishboneChartStyles, DEFAULT_FISHBONE_STYLES, BaseDiagramRef } from '../types';

export interface FishboneDiagramRef extends BaseDiagramRef {}

interface FishboneDiagramProps {
  data: FishboneNode;
  styles?: FishboneChartStyles;
  className?: string;
}

const FishboneDiagram = forwardRef<FishboneDiagramRef, FishboneDiagramProps>(({ data, styles, className }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const finalStyles = { ...DEFAULT_FISHBONE_STYLES, ...styles };

  useImperativeHandle(ref, () => ({
    getDataURL: async (options) => {
      if (!graphRef.current) return '';
      
      if (options?.width && options?.height) {
        graphRef.current.setSize(options.width, options.height);
        graphRef.current.fitView({ padding: 120 } as any);
      }

      return await graphRef.current.toDataURL({
        backgroundColor: options?.backgroundColor || '#ffffff',
        pixelRatio: options?.pixelRatio || 3
      } as any);
    },
    exportPNG: async (transparent = false, scale = 3) => {
      if (!graphRef.current) return;
      const rawDataURL = await graphRef.current.toDataURL({ pixelRatio: scale });

      if (transparent) {
        const link = document.createElement('a');
        link.download = `鱼骨图_透明_${new Date().getTime()}.png`;
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
          ctx.fillStyle = finalStyles.background || '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const link = document.createElement('a');
          link.download = `鱼骨图_${new Date().getTime()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      };
      img.src = rawDataURL;
    },
    exportPDF: async (transparent = false) => {
      if (!graphRef.current) return;
      const dataURL = await graphRef.current.toDataURL({
        backgroundColor: finalStyles.background || '#ffffff'
      } as any);

      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
                    <html>
                        <head><title>导出 PDF - 澄矩 · ChengJu</title></head>
                        <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#f8fafc;">
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
        graphRef.current.fitView({ duration: 500 } as any);
      }
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const {
      boneLine: boneLineColor = DEFAULT_FISHBONE_STYLES.boneLine,
      caseLine: caseLineColor = DEFAULT_FISHBONE_STYLES.caseLine,
      caseColor: caseTextColor = DEFAULT_FISHBONE_STYLES.caseColor, // General text color for sub-items
      endColor = DEFAULT_FISHBONE_STYLES.endColor,
      rootColor = DEFAULT_FISHBONE_STYLES.rootColor,
      rootTextColor = DEFAULT_FISHBONE_STYLES.rootTextColor,
      mainColor = DEFAULT_FISHBONE_STYLES.mainColor,
      mainTextColor = DEFAULT_FISHBONE_STYLES.mainTextColor
    } = finalStyles;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    const cy = height / 2;

    const nodes: any[] = [];
    const edges: any[] = [];

    // --- 鱼头 (Root) ---
    const rootX = width - 150;
    const rootY = cy;
    nodes.push({
      id: 'root',
      type: 'rect',
      data: { label: data.label, type: 'root' },
      style: {
        x: rootX,
        y: rootY,
        labelText: data.label,
        fill: rootColor,
        labelFill: rootTextColor,
        labelFontSize: 16,
        labelFontWeight: 'bold',
        labelPlacement: 'center',
        size: [140, 50],
        radius: 4,
        stroke: 'none',
      }
    });

    // --- 鱼尾 (Tail) ---
    const tailX = 50;
    nodes.push({
      id: 'tail',
      type: 'rect',
      data: { type: 'tail' },
      style: {
        x: tailX,
        y: cy,
        size: [20, 60],
        fill: endColor,
        stroke: 'none',
      }
    });

    // --- 脊椎 (Spine) ---
    edges.push({
      id: 'edge-spine',
      source: 'tail',
      target: 'root',
      style: {
        stroke: boneLineColor,
        lineWidth: 4,
        endArrow: {
          path: 'M 0,0 L 10,5 L 10,-5 Z',
          fill: boneLineColor
        }
      }
    });

    const calcWeight = (node: FishboneNode): number => {
      if (!node.children || node.children.length === 0) return 1;
      return node.children.reduce((acc, child) => acc + calcWeight(child), 0) + 0.4;
    };

    if (data.children) {
      const mainWeights = data.children.map(calcWeight);
      const totalMainWeight = mainWeights.reduce((a, b) => a + b, 0);
      const availableSpine = rootX - tailX - 100;

      data.children.forEach((mainNode, i) => {
        const isTop = i % 2 === 0;
        const prevWeights = mainWeights.slice(0, i).reduce((a, b) => a + b, 0);

        // Safety guard for totalMainWeight to avoid division by zero
        const weightFactor = totalMainWeight > 0 ? (prevWeights + mainWeights[i] / 2) / totalMainWeight : 0.5;
        const baseX = tailX + 60 + weightFactor * availableSpine;

        const dynamicLen = 140 + mainWeights[i] * 65;
        const dx = dynamicLen * Math.cos(60 * Math.PI / 180);
        const dy = dynamicLen * Math.sin(60 * Math.PI / 180);
        const mainX = baseX - dx;
        const mainY = isTop ? cy - dy : cy + dy;

        nodes.push({
          id: mainNode.id,
          type: 'rect',
          data: { label: mainNode.label, type: 'main' },
          style: {
            x: mainX, y: mainY,
            labelText: mainNode.label,
            fill: mainColor,
            stroke: boneLineColor,
            lineWidth: 2,
            labelFill: mainTextColor,
            labelFontWeight: 'bold',
            labelPlacement: 'center',
            size: [Math.max(100, mainNode.label.length * 15), 30],
            radius: 4,
          }
        });

        const anchorId = `anchor-${mainNode.id}`;
        nodes.push({
          id: anchorId,
          type: 'circle',
          data: { type: 'anchor' },
          style: { x: baseX, y: cy, size: 4, fill: boneLineColor, stroke: 'none' }
        });

        edges.push({
          id: `edge-${anchorId}`,
          source: mainNode.id,
          target: anchorId,
          style: {
            stroke: boneLineColor,
            lineWidth: 3,
            endArrow: {
              path: 'M 0,0 L 8,4 L 8,-4 Z',
              fill: boneLineColor
            }
          }
        });

        const renderBranches = (
          pNodeId: string, pEndX: number, pEndY: number, pStartX: number, pStartY: number,
          children: FishboneNode[], level: number, isUpBase: boolean
        ) => {
          if (!children || children.length === 0) return;
          const childWeights = children.map(calcWeight);
          const totalChildWeight = childWeights.reduce((a, b) => a + b, 0);
          const pDirX = pEndX - pStartX;

          children.forEach((child, idx) => {
            const prevWeights = childWeights.slice(0, idx).reduce((a, b) => a + b, 0);
            const weightRatio = totalChildWeight > 0 ? (prevWeights + childWeights[idx] / 2) / totalChildWeight : 0.5;
            const startX = pStartX + (pEndX - pStartX) * weightRatio;
            const startY = pStartY + (pEndY - pStartY) * weightRatio;
            const side = (idx % 2 === 0) ? 1 : -1;

            const branchLen = (50 + childWeights[idx] * 35) * Math.pow(0.88, level - 1);

            let endX, endY;
            if (level % 2 !== 0) {
              endX = startX + side * branchLen;
              endY = startY;
            } else {
              const angle = 60;
              const dx = branchLen * Math.cos(angle * Math.PI / 180);
              const dy = branchLen * Math.sin(angle * Math.PI / 180);
              const dirFactor = pDirX >= 0 ? 1 : -1;
              endX = startX + dirFactor * dx;
              endY = startY + side * dy;
            }

            nodes.push({
              id: child.id,
              type: 'circle',
              data: { label: child.label, type: child.type },
              style: {
                x: endX, y: endY,
                labelText: child.label,
                labelFill: caseTextColor,
                labelFontSize: Math.max(10, 14 - (level - 1) * 1.2),
                labelFontWeight: level === 1 ? 'bold' : 'normal',
                labelPlacement: side === 1 ? 'right' : 'left',
                size: level === 1 ? 4 : 2,
                fill: caseLineColor,
                stroke: 'none',
              } // Correctly using caseLineColor for the point and caseTextColor for the label
            });

            const branchAnchorId = `ba-${child.id}`;
            nodes.push({
              id: branchAnchorId,
              type: 'circle',
              style: { x: startX, y: startY, size: 2, fill: caseLineColor, stroke: 'none' } // Correctly using caseLineColor for anchors
            });

            edges.push({
              id: `edge-${child.id}`,
              source: child.id,
              target: branchAnchorId,
              style: {
                stroke: caseLineColor,
                lineWidth: Math.max(0.5, 1.5 / Math.pow(1.2, level - 1)),
                endArrow: {
                  path: 'M 0,0 L 6,3 L 6,-3 Z',
                  fill: caseLineColor
                }
              }
            });

            if (child.children) {
              renderBranches(child.id, endX, endY, startX, startY, child.children, level + 1, isUpBase);
            }
          });
        };

        renderBranches(mainNode.id, mainX, mainY, baseX, cy, mainNode.children || [], 1, isTop);
      });
    }

    if (!graphRef.current) {
      graphRef.current = new Graph({
        container: containerRef.current,
        width,
        height,
        autoFit: 'view',
        data: { nodes, edges },
        behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
        background: '#ffffff',
      });
      graphRef.current.render().then(() => {
        graphRef.current?.fitView({ duration: 500, padding: 120 } as any);
      });
    } else {
      graphRef.current.setOptions({ background: '#ffffff' });
      graphRef.current.setData({ nodes, edges });
      graphRef.current.render().then(() => {
        graphRef.current?.fitView({ duration: 500, padding: 120 } as any);
      });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!containerRef.current || !graphRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        graphRef.current.setSize(width, height);
        graphRef.current.fitView({ duration: 300, padding: 120 } as any);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [data, styles]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--card-bg)',
        transition: 'background-color 0.5s ease'
      }}
    >
    </div>
  );
});

export default FishboneDiagram;
