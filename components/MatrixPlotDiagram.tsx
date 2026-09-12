import React, { useMemo, useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Grid3X3 } from 'lucide-react';
import { MatrixPlotData, MatrixPlotStyles, BaseDiagramRef } from '../types';
import { svgToDataURL } from '../utils/exportUtils';

/**
 * Single Subplot Component (Scatter or Histogram)
 */
const Subplot: React.FC<{
    data: Array<{ x: number; y: number; group?: string | number }>;
    width: number;
    height: number;
    styles: MatrixPlotStyles;
    type: 'scatter' | 'histogram' | 'boxplot' | 'label';
    label?: string;
    showSmoother?: boolean;
    smootherMethod?: 'MovingAverage' | 'Lowess';
    groupColors?: Record<string | number, string>;
    groupShapes?: Record<string | number, number>; // index for shapes
}> = ({ data, width, height, styles, type, label, showSmoother, smootherMethod = 'Lowess', groupColors = {}, groupShapes = {} }) => {
    const padding = 12; // Adjusted padding for rectangular display
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    const xValues = data.map(d => d.x);
    const yValues = data.map(d => d.y);

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    const getX = (v: number) => padding + ((v - xMin) / (xMax - xMin || 1)) * plotW;
    const getY = (v: number) => padding + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

    if (type === 'label') {
        return (
            <g>
                <rect width={width} height={height} fill="#F5F7FA" stroke={styles.gridColor} strokeWidth={0.5} />
                <text
                    x={width / 2}
                    y={height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={styles.baseFontSize + 2}
                    fontWeight="black"
                    fill={styles.axisColor}
                >
                    {label}
                </text>
            </g>
        );
    }

    const renderShape = (d: { x: number; y: number; group?: string | number }, i: number) => {
        const cx = getX(d.x);
        const cy = getY(d.y);
        const r = styles.pointSize / 2;
        const color = d.group !== undefined ? groupColors[d.group] : styles.axisColor;
        const shapeIdx = d.group !== undefined ? groupShapes[d.group] : 0;

        switch (shapeIdx % 4) {
            case 1: // Square
                return <rect key={i} x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={color} opacity={styles.pointOpacity} />;
            case 2: // Diamond
                return <path key={i} d={`M ${cx} ${cy - r * 1.2} L ${cx + r * 1.2} ${cy} L ${cx} ${cy + r * 1.2} L ${cx - r * 1.2} ${cy} Z`} fill={color} opacity={styles.pointOpacity} />;
            case 3: // Triangle
                return <path key={i} d={`M ${cx} ${cy - r * 1.2} L ${cx + r * 1.2} ${cy + r} L ${cx - r * 1.2} ${cy + r} Z`} fill={color} opacity={styles.pointOpacity} />;
            default: // Circle
                return <circle key={i} cx={cx} cy={cy} r={r} fill={color} opacity={styles.pointOpacity} />;
        }
    };

    if (type === 'histogram') {
        const bins = 12;
        const binCounts = new Array(bins).fill(0);
        const range = xMax - xMin || 1;
        xValues.forEach(v => {
            const b = Math.min(Math.floor(((v - xMin) / range) * bins), bins - 1);
            binCounts[b]++;
        });
        const maxCount = Math.max(...binCounts, 1);
        const binW = plotW / bins;

        return (
            <g>
                <rect width={width} height={height} fill="#FFFFFF" stroke={styles.gridColor} strokeWidth={0.5} />
                {binCounts.map((count, i) => (
                    <rect
                        key={i}
                        x={padding + i * binW}
                        y={padding + plotH - (count / maxCount) * plotH}
                        width={binW - 1}
                        height={(count / maxCount) * plotH}
                        fill="#42525C"
                        opacity={0.15}
                    />
                ))}
            </g>
        );
    }

    const renderSmootherLine = () => {
        if (!showSmoother || data.length < 3) return null;
        const sorted = [...data].sort((a, b) => a.x - b.x);
        const points: string[] = [];

        if (smootherMethod === 'MovingAverage') {
            const windowSize = Math.max(2, Math.floor(sorted.length * 0.4));
            for (let i = 0; i <= sorted.length - windowSize; i++) {
                const window = sorted.slice(i, i + windowSize);
                const avgX = window.reduce((sum, p) => sum + p.x, 0) / windowSize;
                const avgY = window.reduce((sum, p) => sum + p.y, 0) / windowSize;
                points.push(`${getX(avgX)},${getY(avgY)}`);
            }
        } else {
            // Lowess Implementation (Locally Weighted Scatterplot Smoothing)
            const bandwidth = 0.5; // smoothing parameter
            const iterations = 1; // simple version
            const n = sorted.length;

            // Calculate a point every few pixels for performance, or at every x-location
            // For now, let's do 30 points across the x-range for a smooth curve
            const steps = 30;
            const xStep = (xMax - xMin) / steps;

            for (let s = 0; s <= steps; s++) {
                const targetX = xMin + s * xStep;

                // 1. Calculate distances and find weight for each point
                const distances = sorted.map(p => Math.abs(p.x - targetX));
                const maxDist = Math.max(...distances) || 1;
                const scaledDistances = distances.map(d => d / maxDist);

                // Tri-cube weight function: (1 - |d|^3)^3
                const weights = scaledDistances.map(d => d < bandwidth ? Math.pow(1 - Math.pow(d / bandwidth, 3), 3) : 0);

                // 2. Perform Weighted Linear Regression (WLS)
                let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
                for (let i = 0; i < n; i++) {
                    const w = weights[i];
                    if (w <= 0) continue;
                    const px = sorted[i].x;
                    const py = sorted[i].y;
                    sumW += w;
                    sumWX += w * px;
                    sumWY += w * py;
                    sumWXX += w * px * px;
                    sumWXY += w * px * py;
                }

                if (sumW > 0) {
                    const denom = (sumW * sumWXX - sumWX * sumWX);
                    if (Math.abs(denom) > 1e-10) {
                        const slope = (sumW * sumWXY - sumWX * sumWY) / denom;
                        const intercept = (sumWY - slope * sumWX) / sumW;
                        const targetY = slope * targetX + intercept;

                        // Only add point if it's within y-bounds to prevent wild lines
                        if (targetY >= yMin - (yMax - yMin) * 0.5 && targetY <= yMax + (yMax - yMin) * 0.5) {
                            points.push(`${getX(targetX)},${getY(targetY)}`);
                        }
                    } else {
                        // fallback to mean if slope is unstable
                        const avgY = sumWY / sumW;
                        points.push(`${getX(targetX)},${getY(avgY)}`);
                    }
                }
            }
        }

        if (points.length < 2) return null;

        return (
            <path
                d={`M ${points.join(' L ')}`}
                stroke={styles.smootherColor}
                strokeWidth={styles.smootherWeight}
                fill="none"
                opacity={0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        );
    };

    return (
        <g>
            <rect width={width} height={height} fill="white" stroke={styles.gridColor} strokeWidth={0.5} />
            {data.map((d, i) => renderShape(d, i))}
            {renderSmootherLine()}
        </g>
    );
};

export interface MatrixPlotDiagramRef extends BaseDiagramRef {}

export const MatrixPlotDiagram = forwardRef<MatrixPlotDiagramRef, { data: MatrixPlotData; styles: MatrixPlotStyles }>(({ data, styles }, ref) => {
    const { mode, xDimensions, yDimensions, data: rawData, groupVariable } = data;
    const nX = xDimensions.length;
    const nY = yDimensions.length;

    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [viewState, setViewState] = useState({ scale: 1, offset: { x: 0, y: 0 } });
    const [isDragging, setIsDragging] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

    const labelSize = 80;
    const titleHeight = 100;
    const padding = 40;
    const legendWidth = groupVariable ? 160 : 0;
    const industrialPalette = ['#0D5E42', '#CF3A2B', '#16a34a', '#D0A50A', '#3498DB', '#0891b2'];

    // Dynamic Cell Sizing
    const { cellW, cellH, gridTotalW, gridTotalH } = useMemo(() => {
        if (!dimensions.width || !dimensions.height) {
            return { cellW: 180, cellH: 120, gridTotalW: nX * 180, gridTotalH: nY * 120 };
        }

        const availW = dimensions.width - labelSize - legendWidth - padding;
        const availH = dimensions.height - titleHeight - labelSize - padding;

        const cw = Math.max(120, (availW - (nX - 1) * styles.subplotGap) / nX);
        const ch = Math.max(80, (availH - (nY - 1) * styles.subplotGap) / nY);

        return {
            cellW: cw,
            cellH: ch,
            gridTotalW: nX * (cw + styles.subplotGap),
            gridTotalH: nY * (ch + styles.subplotGap)
        };
    }, [dimensions, nX, nY, styles.subplotGap, legendWidth]);

    // Total bounds: must account for title width and calculated grid
    const totalW = useMemo(() => {
        const estimatedTitleW = data.title.length * 16 + 100;
        return Math.max(gridTotalW + labelSize + legendWidth + padding, estimatedTitleW);
    }, [gridTotalW, legendWidth, data.title]);

    const totalH = gridTotalH + titleHeight + labelSize + padding;

    // Auto-fit Logic: now only calculates the scale/offset to center the dynamic layout
    const calculateAutoFit = useCallback((containerW: number, containerH: number) => {
        if (!containerW || !containerH) return { scale: 1, offset: { x: 0, y: 0 } };

        // Since cellW/cellH are already fitting the available space, 
        // scale is usually 1 unless the content exceeds the screen (min-size constraints)
        const scaleW = containerW / totalW;
        const scaleH = containerH / totalH;
        const scale = Math.min(scaleW, scaleH, 1); // Only scale down if it doesn't fit

        // Center the content
        const offsetX = (containerW - totalW * scale) / 2;
        const offsetY = (containerH - totalH * scale) / 2;

        return { scale, offset: { x: offsetX, y: offsetY } };
    }, [totalW, totalH]);

    const handleTidyLayout = useCallback(() => {
        const fit = calculateAutoFit(dimensions.width, dimensions.height);
        setViewState(fit);
    }, [dimensions, calculateAutoFit]);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Initial fit
    useEffect(() => {
        if (dimensions.width > 0 && dimensions.height > 0) {
            setViewState(calculateAutoFit(dimensions.width, dimensions.height));
        }
    }, [dimensions.width, dimensions.height, calculateAutoFit]);

    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            if (!svgRef.current) return '';
            return await svgToDataURL(svgRef.current, {
                pixelRatio: options?.pixelRatio || 3,
                backgroundColor: options?.backgroundColor || '#FFFFFF',
                width: options?.width,
                height: options?.height,
                padding: 0 // SVG 已经包含了标题和边距
            });
        },
        tidyLayout: handleTidyLayout,
        exportPNG: (transparent = false, scale = 3) => {
            if (!svgRef.current) return;
            const svgData = new XMLSerializer().serializeToString(svgRef.current);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const img = new Image();
            img.onload = () => {
                canvas.width = totalW * scale;
                canvas.height = totalH * scale;
                if (!transparent) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);
                const link = document.createElement('a');
                link.download = `矩阵图_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        },
        exportPDF: (transparent = false) => {
            window.print();
        }
    }));

    // Interactivity Handlers
    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setLastPos({ x: e.clientX, y: e.clientY });
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastPos.x;
        const dy = e.clientY - lastPos.y;
        setViewState(prev => ({ ...prev, offset: { x: prev.offset.x + dx, y: prev.offset.y + dy } }));
        setLastPos({ x: e.clientX, y: e.clientY });
    };
    const onMouseUp = () => setIsDragging(false);
    const onWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setViewState(prev => ({ ...prev, scale: Math.max(0.2, Math.min(5, prev.scale * delta)) }));
    };

    // Statistics for numeric scales
    const dimStats = useMemo(() => {
        const stats: Record<string, { min: number; max: number }> = {};
        const allDims = Array.from(new Set([...xDimensions, ...yDimensions]));
        allDims.forEach(dim => {
            const vals = rawData.map(d => Number(d[dim])).filter(n => !isNaN(n));
            if (vals.length > 0) {
                stats[dim] = {
                    min: Math.min(...vals),
                    max: Math.max(...vals)
                };
            } else {
                stats[dim] = { min: 0, max: 100 };
            }
        });
        return stats;
    }, [rawData, xDimensions, yDimensions]);

    // Group analysis
    const groups = useMemo(() => {
        if (!groupVariable) return [];
        const unique = new Set(rawData.map(d => d[groupVariable]));
        return Array.from(unique);
    }, [rawData, groupVariable]);

    const groupColors = useMemo(() => {
        const mapping: Record<string | number, string> = {};
        groups.forEach((g, i) => {
            mapping[g as any] = industrialPalette[i % industrialPalette.length];
        });
        return mapping;
    }, [groups]);

    const groupShapes = useMemo(() => {
        const mapping: Record<string | number, number> = {};
        groups.forEach((g, i) => {
            mapping[g as any] = i;
        });
        return mapping;
    }, [groups]);

    const renderMatrixGrid = () => {
        const subplots = [];
        for (let r = 0; r < nY; r++) {
            for (let c = 0; c < nX; c++) {
                const varY = yDimensions[r];
                const varX = xDimensions[c];
                let isVisible = true;
                if (mode === 'matrix') {
                    if (styles.displayMode === 'Lower' && c > r) isVisible = false;
                    if (styles.displayMode === 'Upper' && c < r) isVisible = false;
                }
                if (!isVisible) continue;
                const isDiagonal = mode === 'matrix' && r === c;
                const plotType = isDiagonal ? (styles.diagonal.toLowerCase() as any) : 'scatter';
                const plotData = rawData.map(d => ({
                    x: Number(d[varX]) || 0,
                    y: Number(d[varY]) || 0,
                    group: d[groupVariable || ''] as string | number
                }));
                subplots.push(
                    <g key={`${r}-${c}`} transform={`translate(${labelSize + c * (cellW + styles.subplotGap)}, ${titleHeight + r * (cellH + styles.subplotGap)})`}>
                        <Subplot
                            data={plotData}
                            width={cellW}
                            height={cellH}
                            styles={styles}
                            type={isDiagonal ? styles.diagonal.toLowerCase() as any : 'scatter'}
                            label={isDiagonal ? varX : undefined}
                            showSmoother={data.showSmoother && !isDiagonal}
                            smootherMethod={data.smootherMethod}
                            groupColors={groupColors}
                            groupShapes={groupShapes}
                        />
                    </g>
                );
            }
        }
        return subplots;
    };

    const renderOuterLabels = () => {
        const tickSize = 6;
        const numXTicks = Math.floor(cellW / 120);
        const numYTicks = Math.floor(cellH / 60);

        return (
            <g>
                {/* Y Labels & Scales (Left) */}
                {yDimensions.map((dim, i) => {
                    const yTop = titleHeight + i * (cellH + styles.subplotGap);
                    const yMid = yTop + cellH / 2;
                    const yBot = yTop + cellH;
                    const stats = dimStats[dim];
                    const range = stats.max - stats.min;

                    const intermediateTicks = [];
                    if (numYTicks > 0) {
                        for (let j = 1; j <= numYTicks; j++) {
                            const val = stats.min + (range * j) / (numYTicks + 1);
                            const y = yBot - ((val - stats.min) / range) * cellH;
                            intermediateTicks.push({ val, y });
                        }
                    }

                    return (
                        <g key={`y-${i}`}>
                            <text
                                x={labelSize - 35}
                                y={yMid}
                                textAnchor="end"
                                dominantBaseline="middle"
                                fontSize={styles.baseFontSize + 2}
                                fontWeight="black"
                                fill={styles.axisColor}
                                transform={mode === 'yvsx' ? `rotate(-90, ${labelSize - 35}, ${yMid})` : ""}
                            >
                                {dim}
                            </text>

                            {/* Numeric Scales for Y */}
                            <text x={labelSize - 8} y={yTop + 12} textAnchor="end" fontSize={styles.baseFontSize - 2} fill={styles.axisColor} opacity={0.6}>{stats.max.toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>
                            <text x={labelSize - 8} y={yBot - 5} textAnchor="end" fontSize={styles.baseFontSize - 2} fill={styles.axisColor} opacity={0.6}>{stats.min.toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>

                            <line x1={labelSize - tickSize} y1={yTop + 12} x2={labelSize} y2={yTop + 12} stroke={styles.axisColor} strokeWidth={1} opacity={0.3} />
                            <line x1={labelSize - tickSize} y1={yBot - 5} x2={labelSize} y2={yBot - 5} stroke={styles.axisColor} strokeWidth={1} opacity={0.3} />

                            {intermediateTicks.map((t, idx) => (
                                <g key={idx}>
                                    <text x={labelSize - 8} y={t.y} textAnchor="end" fontSize={styles.baseFontSize - 2} fill={styles.axisColor} opacity={0.4} dominantBaseline="middle">{t.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>
                                    <line x1={labelSize - tickSize / 2} y1={t.y} x2={labelSize} y2={t.y} stroke={styles.axisColor} strokeWidth={0.5} opacity={0.2} />
                                </g>
                            ))}
                        </g>
                    );
                })}

                {/* X Labels & Scales (Bottom) */}
                {xDimensions.map((dim, i) => {
                    const xLeft = labelSize + i * (cellW + styles.subplotGap);
                    const xMid = xLeft + cellW / 2;
                    const xRight = xLeft + cellW;
                    const y = titleHeight + gridTotalH;
                    const stats = dimStats[dim];
                    const range = stats.max - stats.min;

                    const intermediateTicks = [];
                    if (numXTicks > 0) {
                        for (let j = 1; j <= numXTicks; j++) {
                            const val = stats.min + (range * j) / (numXTicks + 1);
                            const x = xLeft + ((val - stats.min) / range) * cellW;
                            intermediateTicks.push({ val, x });
                        }
                    }

                    return (
                        <g key={`x-${i}`}>
                            <text
                                x={xMid}
                                y={y + 35}
                                textAnchor="middle"
                                fontSize={styles.baseFontSize + 2}
                                fontWeight="black"
                                fill={styles.axisColor}
                            >
                                {dim}
                            </text>

                            {/* Numeric Scales for X */}
                            <text x={xLeft + 12} y={y + 15} textAnchor="start" fontSize={styles.baseFontSize - 2} fill={styles.axisColor} opacity={0.6}>{stats.min.toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>
                            <text x={xRight - 12} y={y + 15} textAnchor="end" fontSize={styles.baseFontSize - 2} fill={styles.axisColor} opacity={0.6}>{stats.max.toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>

                            <line x1={xLeft + 12} y1={y} x2={xLeft + 12} y2={y + tickSize} stroke={styles.axisColor} strokeWidth={1} opacity={0.3} />
                            <line x1={xRight - 12} y1={y} x2={xRight - 12} y2={y + tickSize} stroke={styles.axisColor} strokeWidth={1} opacity={0.3} />

                            {intermediateTicks.map((t, idx) => (
                                <g key={idx}>
                                    <text x={t.x} y={y + 15} textAnchor="middle" fontSize={styles.baseFontSize - 2} fill={styles.axisColor} opacity={0.4}>{t.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>
                                    <line x1={t.x} y1={y} x2={t.x} y2={y + tickSize / 2} stroke={styles.axisColor} strokeWidth={0.5} opacity={0.2} />
                                </g>
                            ))}
                        </g>
                    );
                })}
            </g>
        );
    };

    const renderLegend = () => {
        if (!groupVariable || groups.length === 0) return null;
        const legendX = labelSize + gridTotalW + 40;
        const legendY = titleHeight;

        return (
            <g transform={`translate(${legendX}, ${legendY})`}>
                <text x={0} y={-10} fontSize={styles.baseFontSize} fontWeight="black" fill={styles.axisColor} opacity={0.5}>{groupVariable}</text>
                {groups.map((g, i) => {
                    const color = groupColors[g as any];
                    const shapeIdx = groupShapes[g as any];
                    const r = 4;
                    const y = i * 20;

                    let shape;
                    switch (shapeIdx % 4) {
                        case 1: shape = <rect x={-r} y={-r} width={r * 2} height={r * 2} fill={color} />; break;
                        case 2: shape = <path d={`M 0 ${-r * 1.2} L ${r * 1.2} 0 L 0 ${r * 1.2} L ${-r * 1.2} 0 Z`} fill={color} />; break;
                        case 3: shape = <path d={`M 0 ${-r * 1.2} L ${r * 1.2} ${r} L ${-r * 1.2} ${r} Z`} fill={color} />; break;
                        default: shape = <circle cx={0} cy={0} r={r} fill={color} />;
                    }

                    return (
                        <g key={i} transform={`translate(10, ${y + 10})`}>
                            {shape}
                            <text x={15} y={0} dominantBaseline="middle" fontSize={styles.baseFontSize} fill={styles.axisColor}>{String(g)}</text>
                        </g>
                    );
                })}
            </g>
        );
    };

    if (!nX || !nY) return (
        <div className="flex flex-col items-center justify-center p-20 text-[var(--sidebar-text)] gap-4">
            <Grid3X3 size={48} opacity={0.2} />
            <p className="text-[11px] font-bold uppercase tracking-widest">请在编辑器中定义分析维度</p>
        </div>
    );


    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-hidden bg-white flex items-center justify-center custom-scrollbar cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
        >
            <svg
                ref={svgRef}
                width={totalW}
                height={totalH}
                viewBox={`0 0 ${totalW} ${totalH}`}
                style={{
                    filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.05))',
                    transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.scale})`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                {/* Background Rect for the Grid Area */}
                <rect
                    x={labelSize}
                    y={titleHeight}
                    width={gridTotalW}
                    height={gridTotalH}
                    fill="#F5F7FA"
                    opacity={0.5}
                    rx={8}
                />

                <text
                    x={totalW / 2}
                    y={titleHeight / 2 + 10}
                    textAnchor="middle"
                    fontSize={styles.titleFontSize + 6}
                    fontWeight="black"
                    fill={styles.axisColor}
                    className="uppercase tracking-tighter"
                >
                    {data.title}
                </text>

                {renderMatrixGrid()}
                {renderOuterLabels()}
                {renderLegend()}
            </svg>
        </div>
    );
});

MatrixPlotDiagram.displayName = 'MatrixPlotDiagram';
export default MatrixPlotDiagram;
