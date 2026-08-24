import React, { useImperativeHandle, forwardRef, useRef, useState, useMemo } from 'react';
import { RadarData, RadarChartStyles, BaseDiagramRef } from '../types';
import { svgToDataURL } from '../utils/exportUtils';

export interface RadarDiagramRef extends BaseDiagramRef {}

interface RadarDiagramProps {
    data: RadarData;
    styles: RadarChartStyles;
}

export const RadarDiagram = forwardRef<RadarDiagramRef, RadarDiagramProps>(({ data, styles }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { axes, series, title } = data;
    const {
        titleFontSize,
        labelFontSize,
        gridColor,
        showGrid,
        gridLevels,
        showLabels,
        showValues,
        startAngle,
        clockwise,
        isClosed,
        standardize,
        showAreaScore,
        showSimilarity,
        compareMode
    } = styles;

    // --- Zoom & Pan State ---
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleFactor = 1.1;
        const delta = e.deltaY > 0 ? 1 / scaleFactor : scaleFactor;
        const newK = Math.min(Math.max(transform.k * delta, 0.5), 5);

        // Zoom towards mouse position (local to SVG)
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate new x, y to keep mouse position stable
        const newX = mouseX - (mouseX - transform.x) * delta;
        const newY = mouseY - (mouseY - transform.y) * delta;

        setTransform({ x: newX, y: newY, k: newK });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const width = 1100;
    const height = 800;
    const centerX = 680;
    const centerY = 420;
    const radius = 340;

    const getCoordinates = (angleDegrees: number, r: number) => {
        const angleRadians = (angleDegrees * Math.PI) / 180;
        return {
            x: centerX + r * Math.cos(angleRadians),
            y: centerY + r * Math.sin(angleRadians)
        };
    };

    const axisCount = axes.length;
    const angleStep = 360 / axisCount;
    const direction = clockwise ? 1 : -1;

    // --- Analysis Calculations ---
    const analysisResults = React.useMemo(() => {
        if (axisCount < 3 || series.length === 0) return { scores: {}, similarities: {} };

        const scores: Record<string, number> = {};
        const similarities: Record<string, number> = {};
        const angleRadStep = (angleStep * Math.PI) / 180;

        series.forEach((s, sIdx) => {
            // 1. Area calculation (Vector Cross Product in polar coordinates/triangles)
            // Area = 1/2 * sum(r_i * r_{i+1} * sin(theta))
            let area = 0;
            const normalizedValues = s.values.map((v, i) => {
                const axis = axes[i];
                if (!axis) return 0;
                return (v - (axis.min || 0)) / (axis.max - (axis.min || 0));
            });

            for (let i = 0; i < axisCount; i++) {
                const r1 = normalizedValues[i] * radius;
                const r2 = normalizedValues[(i + 1) % axisCount] * radius;
                area += 0.5 * r1 * r2 * Math.sin(angleRadStep);
            }
            // Score normalized to 0-100 based on total possible area (circle radius R)
            const maxArea = Math.PI * radius * radius;
            scores[s.name] = (area / maxArea) * 1000; // Use a relative scale

            // 2. Similarity to first series (Euclidean Distance)
            if (sIdx > 0) {
                const firstSeriesNorm = series[0].values.map((v, i) => {
                    const axis = axes[i];
                    return axis ? (v - (axis.min || 0)) / (axis.max - (axis.min || 0)) : 0;
                });
                let distSq = 0;
                normalizedValues.forEach((v, i) => {
                    distSq += Math.pow(v - (firstSeriesNorm[i] || 0), 2);
                });
                const maxDist = Math.sqrt(axisCount); // Max possible distance for normalized [0,1]^N
                similarities[s.name] = (1 - Math.sqrt(distSq) / maxDist) * 100;
            }
        });

        return { scores, similarities };
    }, [axes, series, axisCount, radius]);

    const axisPoints = axes.map((_, i) => {
        const angle = startAngle + i * angleStep * direction;
        return getCoordinates(angle, radius);
    });

    const exportPNG = (transparent = false, scale = 3) => {
        if (!svgRef.current) return;

        const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
        const exportWidth = width + 100; // Extra padding
        const exportHeight = height + 100;
        svgClone.setAttribute('width', exportWidth.toString());
        svgClone.setAttribute('height', exportHeight.toString());
        svgClone.setAttribute('viewBox', `-50 -50 ${exportWidth} ${exportHeight}`);
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        const mainGroup = svgClone.querySelector('g');
        if (mainGroup) {
            mainGroup.setAttribute('transform', 'translate(0, 0) scale(1)');
        }

        const svgData = new XMLSerializer().serializeToString(svgClone);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            canvas.width = exportWidth * scale;
            canvas.height = exportHeight * scale;
            if (ctx) {
                ctx.scale(scale, scale);
                if (!transparent) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, exportWidth, exportHeight);
                }
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `${title || 'radar-chart'}.png`;
                link.href = dataURL;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        };
        img.src = url;
    };

    const exportPDF = (transparent = false) => {
        if (!svgRef.current) return;

        const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
        const exportWidth = width + 100;
        const exportHeight = height + 100;
        svgClone.setAttribute('width', exportWidth.toString());
        svgClone.setAttribute('height', exportHeight.toString());
        svgClone.setAttribute('viewBox', `-50 -50 ${exportWidth} ${exportHeight}`);
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        const mainGroup = svgClone.querySelector('g');
        if (mainGroup) {
            mainGroup.setAttribute('transform', 'translate(0, 0) scale(1)');
        }

        const svgData = new XMLSerializer().serializeToString(svgClone);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            canvas.width = exportWidth * 2;
            canvas.height = exportHeight * 2;
            if (ctx) {
                ctx.scale(2, 2);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, exportWidth, exportHeight);
                ctx.drawImage(img, 0, 0);
                const imgData = canvas.toDataURL('image/png');

                const win = window.open('', '_blank');
                if (win) {
                    win.document.write(`
            <html>
              <head><title>Export PDF - 澄矩 · ChengJu</title></head>
              <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8fafc; font-family: -apple-system, sans-serif;">
                <div style="padding: 40px; background: #fff; box-shadow: 0 40px 100px rgba(0,0,0,0.05); border-radius: 20px; text-align: center;">
                  <img src="${imgData}" style="max-width:100%; height:auto;" />
                  <div style="margin-top: 20px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">
                    Radar Chart Report | 澄矩 · ChengJu
                  </div>
                </div>
                <script>
                  window.onload = () => {
                    setTimeout(() => {
                      window.print();
                      window.close();
                    }, 800);
                  }
                </script>
              </body>
            </html>
          `);
                    win.document.close();
                }
                URL.revokeObjectURL(url);
            }
        };
        img.src = url;
    };

    const tidyLayout = () => {
        setTransform({ x: 0, y: 0, k: 1 });
    };

    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            if (!svgRef.current) return '';
            return await svgToDataURL(svgRef.current, {
                pixelRatio: options?.pixelRatio || 3,
                backgroundColor: options?.backgroundColor || '#ffffff',
                width: options?.width,
                height: options?.height
            });
        },
        exportPNG,
        exportPDF,
        tidyLayout
    }));

    return (
        <div className="w-full h-full flex items-center justify-center bg-white p-4 overflow-auto">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                className="max-w-full max-h-full drop-shadow-2xl cursor-grab active:cursor-grabbing touch-none overflow-visible"
                style={{ background: 'transparent' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Content Group with Zoom/Pan Transformation */}
                <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                    {/* Title */}
                    <text
                        x={centerX}
                        y={40}
                        textAnchor="middle"
                        style={{ fontSize: titleFontSize, fontWeight: '900', fill: '#1e293b', fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                        {title}
                    </text>

                    {/* Legend / Stats Panel */}
                    {(showAreaScore || showSimilarity) && (
                        <g transform={`translate(70, 70)`}>
                            <rect
                                width={showAreaScore && showSimilarity ? 240 : 160}
                                height={series.length * 20 + 35}
                                rx="12"
                                fill="#f8fafc"
                                stroke="#e2e8f0"
                            />
                            <text x="12" y="20" style={{ fontSize: 10, fontWeight: '900', fill: '#64748b', letterSpacing: '0.05em' }}>统计分析报告</text>
                            {series.map((s, idx) => (
                                <g key={idx} transform={`translate(12, ${idx * 20 + 40})`}>
                                    <circle r="4" fill={s.color} cx="4" cy="-3" />
                                    <text x="15" style={{ fontSize: 10, fontWeight: '700', fill: '#1e293b' }}>
                                        {s.name.substring(0, 12)}: {showAreaScore ? `得分 ${Math.round(analysisResults.scores[s.name] || 0)}` : ''}
                                        {showSimilarity && idx > 0 ? ` | 相似度 ${Math.round(analysisResults.similarities[s.name] || 0)}%` : ''}
                                    </text>
                                </g>
                            ))}
                        </g>
                    )}

                    {/* Grid Circles/Polygons */}
                    {showGrid && Array.from({ length: gridLevels }).map((_, level) => {
                        const r = (radius / gridLevels) * (level + 1);
                        if (isClosed) {
                            const points = axisPoints.map((_, i) => {
                                const angle = startAngle + i * angleStep * direction;
                                const coord = getCoordinates(angle, r);
                                return `${coord.x},${coord.y}`;
                            }).join(' ');
                            return (
                                <polygon
                                    key={level}
                                    points={points}
                                    fill="none"
                                    stroke={gridColor}
                                    strokeWidth="1"
                                    strokeOpacity="0.3"
                                />
                            );
                        } else {
                            return (
                                <circle
                                    key={level}
                                    cx={centerX}
                                    cy={centerY}
                                    r={r}
                                    fill="none"
                                    stroke={gridColor}
                                    strokeWidth="1"
                                    strokeOpacity="0.3"
                                />
                            );
                        }
                    })}

                    {/* Axis Lines */}
                    {axisPoints.map((point, i) => (
                        <line
                            key={i}
                            x1={centerX}
                            y1={centerY}
                            x2={point.x}
                            y2={point.y}
                            stroke={gridColor}
                            strokeWidth="1"
                            strokeOpacity="0.5"
                        />
                    ))}

                    {/* Series polygons */}
                    {series.map((s, idx) => {
                        const points = s.values.map((val, i) => {
                            const axis = axes[i];
                            if (!axis) return `${centerX},${centerY}`;

                            // Standardize to 0-1 based on Max/Min
                            const normVal = (val - (axis.min || 0)) / (axis.max - (axis.min || 0));
                            // In compare mode, if there are exactly 2 series, we could visualize difference.
                            // For now, simple radius scaling:
                            const r = normVal * radius;

                            const angle = startAngle + i * angleStep * direction;
                            const coord = getCoordinates(angle, r);
                            return `${coord.x},${coord.y}`;
                        }).join(' ');

                        return (
                            <g key={idx}>
                                <polygon
                                    points={points}
                                    fill={s.color || '#3b82f6'}
                                    fillOpacity={s.fillOpacity || 0.3}
                                    stroke={s.color || '#3b82f6'}
                                    strokeWidth="2"
                                    className="transition-all duration-500"
                                />
                                {/* Data Points */}
                                {showValues && s.values.map((val, i) => {
                                    const axis = axes[i];
                                    if (!axis) return null;
                                    const r = ((val - (axis.min || 0)) / (axis.max - (axis.min || 0))) * radius;
                                    const angle = startAngle + i * angleStep * direction;
                                    const coord = getCoordinates(angle, r);

                                    // Offset for text to avoid overlap with dot
                                    const textCoord = getCoordinates(angle, r + 15);

                                    return (
                                        <g key={i}>
                                            <circle
                                                cx={coord.x}
                                                cy={coord.y}
                                                r="3"
                                                fill={s.color || '#3b82f6'}
                                            />
                                            <text
                                                x={textCoord.x}
                                                y={textCoord.y}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                style={{ fontSize: 9, fontWeight: '700', fill: s.color || '#3b82f6', paintOrder: 'stroke', stroke: '#fff', strokeWidth: 2 }}
                                            >
                                                {val}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}

                    {/* Labels */}
                    {showLabels && axes.map((axis, i) => {
                        const angle = startAngle + i * angleStep * direction;
                        const coord = getCoordinates(angle, radius + 25);
                        let textAnchor = "middle";
                        if (coord.x > centerX + 10) textAnchor = "start";
                        if (coord.x < centerX - 10) textAnchor = "end";

                        return (
                            <text
                                key={i}
                                x={coord.x}
                                y={coord.y}
                                textAnchor={textAnchor}
                                dominantBaseline="middle"
                                style={{ fontSize: labelFontSize, fontWeight: '700', fill: '#475569', fontFamily: 'system-ui' }}
                            >
                                {axis.name}
                            </text>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
});

RadarDiagram.displayName = 'RadarDiagram';

export default RadarDiagram;
