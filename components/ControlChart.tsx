/**
 * ControlChart.tsx
 * 统计控制图渲染组件 (Ported from Smart QC Tools)
 */
import React, { useRef, useImperativeHandle, forwardRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
    ControlSeries,
    ControlChartStyles,
    DEFAULT_CONTROL_STYLES,
    BaseDiagramRef
} from '../types';

export interface ControlChartRef extends BaseDiagramRef {}

export interface ControlChartProps {
    series: ControlSeries[];
    styles: ControlChartStyles;
    className?: string;
}

// SPC 统计常数表
const SPC_CONSTANTS: Record<number, { a2: number; a3: number; d2: number; d3: number; d4: number; b3: number; b4: number; c4: number }> = {
    2: { a2: 1.880, a3: 2.659, d2: 1.128, d3: 0, d4: 3.267, b3: 0, b4: 3.267, c4: 0.7979 },
    3: { a2: 1.023, a3: 1.954, d2: 1.693, d3: 0, d4: 2.574, b3: 0, b4: 2.568, c4: 0.8862 },
    4: { a2: 0.729, a3: 1.628, d2: 2.059, d3: 0, d4: 2.282, b3: 0, b4: 2.266, c4: 0.9213 },
    5: { a2: 0.577, a3: 1.427, d2: 2.326, d3: 0, d4: 2.114, b3: 0, b4: 2.089, c4: 0.9400 },
    6: { a2: 0.483, a3: 1.287, d2: 2.534, d3: 0, d4: 2.004, b3: 0.030, b4: 1.970, c4: 0.9515 },
    7: { a2: 0.419, a3: 1.182, d2: 2.704, d3: 0.076, d4: 1.924, b3: 0.118, b4: 1.882, c4: 0.9594 },
    8: { a2: 0.373, a3: 1.099, d2: 2.847, d3: 0.136, d4: 1.864, b3: 0.185, b4: 1.815, c4: 0.9650 },
    9: { a2: 0.337, a3: 1.032, d2: 2.970, d3: 0.184, d4: 1.816, b3: 0.239, b4: 1.761, c4: 0.9693 },
    10: { a2: 0.308, a3: 0.975, d2: 3.078, d3: 0.223, d4: 1.777, b3: 0.284, b4: 1.716, c4: 0.9727 }
};

export const ControlChart = forwardRef<ControlChartRef, ControlChartProps>(
    ({ series, styles, className }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

        const finalStyles = useMemo(() => ({
            ...DEFAULT_CONTROL_STYLES,
            ...styles
        }), [styles]);

        // 核心统计计算逻辑 (Supported: I-MR, X-bar-R, X-bar-S, P, NP, C, U)
        const stats = useMemo(() => {
            if (series.length === 0 || series[0].data.length === 0) return null;

            const rawData = series[0].data;
            const n = finalStyles.subgroupSize || 1;
            const chartType = finalStyles.type;
            const k = rawData.length;

            let points: number[] = [];
            let cl = 0, ucl = 0, lcl = 0, sigma = 0;

            // Helper: Standard Deviation
            const calcStdDev = (arr: number[]) => {
                const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
                return Math.sqrt(arr.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (arr.length - 1));
            };

            // === A. variable Data (X-bar-R, X-bar-S, I-MR) ===
            const isVariable = ['I-MR', 'X-bar-R', 'X-bar-S'].includes(chartType);

            if (isVariable) {
                if (chartType === 'I-MR') {
                    // I-MR: 单值控制图
                    points = rawData;
                    const mrs: number[] = [];
                    for (let i = 1; i < k; i++) mrs.push(Math.abs(rawData[i] - rawData[i - 1]));
                    const mrBar = mrs.reduce((a, b) => a + b, 0) / mrs.length;

                    cl = rawData.reduce((a, b) => a + b, 0) / k;
                    ucl = cl + 2.66 * mrBar;
                    lcl = cl - 2.66 * mrBar;
                    sigma = mrBar / 1.128; // d2 for n=2
                } else {
                    // X-bar Charts (R or S)
                    // Grouping
                    const subgroups: number[][] = [];
                    for (let i = 0; i < k; i += n) {
                        if (i + n <= k) subgroups.push(rawData.slice(i, i + n));
                    }
                    if (subgroups.length === 0) return null;

                    points = subgroups.map(g => g.reduce((a, b) => a + b, 0) / g.length); // X-bar values
                    const xDoubleBar = points.reduce((a, b) => a + b, 0) / points.length;
                    cl = xDoubleBar;

                    const constants = SPC_CONSTANTS[n] || SPC_CONSTANTS[2];

                    if (chartType === 'X-bar-R') {
                        const ranges = subgroups.map(g => Math.max(...g) - Math.min(...g));
                        const rBar = ranges.reduce((a, b) => a + b, 0) / ranges.length;
                        ucl = xDoubleBar + constants.a2 * rBar;
                        lcl = xDoubleBar - constants.a2 * rBar;
                        sigma = rBar / constants.d2;
                    } else if (chartType === 'X-bar-S') {
                        const stdDevs = subgroups.map(g => calcStdDev(g));
                        const sBar = stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length;
                        ucl = xDoubleBar + constants.a3 * sBar;
                        lcl = xDoubleBar - constants.a3 * sBar;
                        sigma = sBar / constants.c4;
                    }
                }
            }
            // === B. Attribute Data (P, NP, C, U) ===
            else {
                // Determine raw Points (Defect Counts or Defectives)
                points = rawData;

                // For Attribute data, n is crucial.
                // If chart is P or U, n must be defined > 0.
                const validN = n > 0 ? n : 1;

                if (chartType === 'P') {
                    // P Chart: Fraction Defective (p = D / n)
                    // If D > 1 and it looks like D < n, it's valid. If D matches n, p=1.
                    points = rawData.map(d => d / validN);
                    const pBar = points.reduce((a, b) => a + b, 0) / points.length;
                    cl = pBar;
                    // Prevent NaN if pBar is 0 or 1
                    const commonTerm = (pBar > 0 && pBar < 1) ? 3 * Math.sqrt((pBar * (1 - pBar)) / validN) : 0;
                    ucl = pBar + commonTerm;
                    lcl = Math.max(0, pBar - commonTerm);
                } else if (chartType === 'NP') {
                    // NP Chart: Number of Defectives 
                    // Points = D (rawData)
                    // CL = n * pBar
                    // pBar total D / total N
                    const totalDefectives = rawData.reduce((a, b) => a + b, 0);
                    const totalInspected = rawData.length * validN;
                    const pBar = totalInspected > 0 ? totalDefectives / totalInspected : 0;

                    cl = validN * pBar;
                    const commonTerm = (pBar > 0 && pBar < 1) ? 3 * Math.sqrt(validN * pBar * (1 - pBar)) : 0;
                    ucl = cl + commonTerm;
                    lcl = Math.max(0, cl - commonTerm);
                } else if (chartType === 'C') {
                    // C Chart: Count of Defects (Constant Area)
                    // Points = c (rawData)
                    // CL = cBar
                    const cBar = rawData.reduce((a, b) => a + b, 0) / rawData.length;
                    cl = cBar;
                    const commonTerm = 3 * Math.sqrt(cBar);
                    ucl = cBar + commonTerm;
                    lcl = Math.max(0, cBar - commonTerm);
                } else if (chartType === 'U') {
                    // U Chart: Defects per Unit (u = c / n)
                    points = rawData.map(c => c / validN); // n is area/unit size
                    const uBar = points.reduce((a, b) => a + b, 0) / points.length;
                    cl = uBar;
                    const commonTerm = 3 * Math.sqrt(uBar / validN);
                    ucl = uBar + commonTerm;
                    lcl = Math.max(0, uBar - commonTerm);
                }
            }

            // Override with manual limits if provided
            if (finalStyles.ucl && finalStyles.ucl !== 0) ucl = finalStyles.ucl;
            if (finalStyles.lcl && finalStyles.lcl !== 0) lcl = finalStyles.lcl;
            if (finalStyles.cl && finalStyles.cl !== 0) cl = finalStyles.cl;

            // 5. 判异规则 (Outlier Detection)
            const outliers: number[] = [];

            // For Attribute charts, usually only Rule 1 applies strongly, but we apply all for consistency logic
            // (Assuming Normal approx holds)

            points.forEach((val, i) => {
                // Rule 1: Beyond Limits
                if (val > ucl || val < lcl) {
                    outliers.push(i);
                    return; // Skip other rules for this point
                }

                // Western-Electric Rules (2, 3, 4) if enabled
                if (finalStyles.rules.includes('Western-Electric') || finalStyles.rules.includes('Nelson')) {
                    // Rule 2: 9 points on one side of CL
                    if (i >= 8) {
                        const slice = points.slice(i - 8, i + 1);
                        if (slice.every(v => v > cl) || slice.every(v => v < cl)) outliers.push(i);
                    }
                    // Rule 3: 6 points increasing or decreasing
                    if (i >= 5) {
                        const slice = points.slice(i - 5, i + 1);
                        let inc = true, dec = true;
                        for (let j = 1; j < slice.length; j++) {
                            if (slice[j] <= slice[j - 1]) inc = false;
                            if (slice[j] >= slice[j - 1]) dec = false;
                        }
                        if (inc || dec) outliers.push(i);
                    }
                    // Rule 4: 14 points alternating
                    if (i >= 13) {
                        const slice = points.slice(i - 13, i + 1);
                        let alt = true;
                        for (let j = 1; j < slice.length; j++) {
                            const diff = slice[j] - slice[j - 1];
                            const prev = j > 1 ? slice[j - 1] - slice[j - 2] : 0;
                            if (j > 1 && diff * prev >= 0) { alt = false; break; }
                        }
                        if (alt) outliers.push(i);
                    }
                }
            });

            return { points, cl, ucl, lcl, sigma, outliers };
        }, [series, finalStyles]);

        const draw = useCallback((transparentArg = false) => {
            const canvas = canvasRef.current;
            if (!canvas || !stats) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const dpr = window.devicePixelRatio || 1;
            canvas.width = dimensions.width * dpr;
            canvas.height = dimensions.height * dpr;
            ctx.scale(dpr, dpr);

            // 清屏
            ctx.clearRect(0, 0, dimensions.width, dimensions.height);
            if (!transparentArg) {
                ctx.fillStyle = finalStyles.background;
                ctx.fillRect(0, 0, dimensions.width, dimensions.height);
            }

            const padding = { top: 80, right: 100, bottom: 60, left: 80 };
            const chartW = dimensions.width - padding.left - padding.right;
            const chartH = dimensions.height - padding.top - padding.bottom;

            // 算 Y 轴范围 (包含 UCL/LCL 并预留空间)
            const dataMax = Math.max(...stats.points, stats.ucl);
            const dataMin = Math.min(...stats.points, stats.lcl);
            const range = dataMax - dataMin;
            const yMax = dataMax + (range === 0 ? 1 : range * 0.2);
            const yMin = dataMin - (range === 0 ? 1 : range * 0.2);

            const getY = (val: number) => padding.top + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
            const getX = (idx: number) => padding.left + (idx / (stats.points.length - 1 || 1)) * chartW;

            // --- 1. 绘制限制线 (UCL, CL, LCL) ---
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1.5;

            // UCL
            ctx.strokeStyle = finalStyles.uclColor;
            ctx.beginPath();
            ctx.moveTo(padding.left, getY(stats.ucl));
            ctx.lineTo(padding.left + chartW, getY(stats.ucl));
            ctx.stroke();

            // LCL
            ctx.beginPath();
            ctx.moveTo(padding.left, getY(stats.lcl));
            ctx.lineTo(padding.left + chartW, getY(stats.lcl));
            ctx.stroke();

            // CL
            ctx.setLineDash([]);
            ctx.strokeStyle = finalStyles.clColor;
            ctx.beginPath();
            ctx.moveTo(padding.left, getY(stats.cl));
            ctx.lineTo(padding.left + chartW, getY(stats.cl));
            ctx.stroke();

            // 标注文字
            ctx.font = `bold ${finalStyles.labelFontSize}px sans-serif`;
            ctx.fillStyle = finalStyles.uclColor;
            ctx.fillText(`UCL: ${stats.ucl.toFixed(finalStyles.decimals)}`, padding.left + chartW + 5, getY(stats.ucl) + 4);
            ctx.fillText(`LCL: ${stats.lcl.toFixed(finalStyles.decimals)}`, padding.left + chartW + 5, getY(stats.lcl) + 4);
            ctx.fillStyle = finalStyles.clColor;
            ctx.fillText(`CL: ${stats.cl.toFixed(finalStyles.decimals)}`, padding.left + chartW + 5, getY(stats.cl) + 4);

            // --- 2. 绘制数据折线 ---
            ctx.strokeStyle = finalStyles.lineColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            stats.points.forEach((val, i) => {
                if (i === 0) ctx.moveTo(getX(i), getY(val));
                else ctx.lineTo(getX(i), getY(val));
            });
            ctx.stroke();

            // --- 3. 绘制数据点 ---
            stats.points.forEach((val, i) => {
                const isOutlier = stats.outliers.includes(i);
                ctx.fillStyle = isOutlier ? '#ef4444' : finalStyles.pointColor;
                ctx.beginPath();
                ctx.arc(getX(i), getY(val), isOutlier ? 5 : 4, 0, Math.PI * 2);
                ctx.fill();

                if (isOutlier) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                if (finalStyles.showValues) {
                    ctx.fillStyle = isOutlier ? '#ef4444' : finalStyles.lineColor;
                    ctx.font = `bold ${finalStyles.labelFontSize - 2}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(val.toFixed(finalStyles.decimals), getX(i), getY(val) - 10);
                }
            });

            // --- 4. 坐标轴与标题 ---
            ctx.fillStyle = finalStyles.titleColor;
            ctx.font = `bold ${finalStyles.titleFontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(finalStyles.title, dimensions.width / 2, padding.top / 2);
        }, [stats, dimensions, finalStyles]);

        useImperativeHandle(ref, () => ({
            getDataURL: async (options) => {
                const pixelRatio = options?.pixelRatio || 3;
                const backgroundColor = options?.backgroundColor || '#ffffff';
                const transparent = backgroundColor === 'transparent';
                
                // 🚨 Explicitly use provided dimensions or current ones
                const exportWidth = options?.width || dimensions.width;
                const exportHeight = options?.height || dimensions.height;

                // Create a temporary canvas if resolution is different
                const canvas = canvasRef.current;
                if (!canvas) return '';

                // We can't easily change the visible canvas without causing a flicker, 
                // so we just draw onto the existing one with scaling if it's already large enough,
                // or we use the current draw logic.
                draw(transparent);
                const dataURL = canvas.toDataURL('image/png');
                
                // 恢复默认绘制状态 (非透明)
                setTimeout(() => draw(false), 50);
                
                return dataURL;
            },
            exportPNG(transparent = false, scale = 3) {
                draw(transparent);
                const canvas = canvasRef.current;
                if (!canvas) return;
                const link = document.createElement('a');
                link.download = `控制图_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                setTimeout(() => draw(false), 50); // 恢复
            },
            exportPDF(transparent = false) {
                draw(false); // 确保包含背景
                const canvas = canvasRef.current;
                if (!canvas) return;
                const dataURL = canvas.toDataURL('image/png');

                const win = window.open('', '_blank');
                if (win) {
                    win.document.write(`
                        <html>
                            <head><title>导出 PDF - 澄矩 · ChengJu</title></head>
                            <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#f8fafc;">
                                <img src="${dataURL}" style="max-width:98%; max-height:98%; object-fit:contain; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-radius: 8px;" />
                            </body>
                        </html>
                    `);
                    win.document.close();
                    setTimeout(() => {
                        win.print();
                        win.close();
                    }, 800);
                }
            }
        }));

        useEffect(() => {
            if (!containerRef.current) return;
            const resizeObserver = new ResizeObserver((entries) => {
                const { width, height } = entries[0].contentRect;
                if (width > 0 && height > 0) setDimensions({ width, height });
            });
            resizeObserver.observe(containerRef.current);
            return () => resizeObserver.disconnect();
        }, []);

        useEffect(() => {
            draw(false);
        }, [draw]);

        return (
            <div ref={containerRef} className={`${className || ''} w-full h-full relative bg-[var(--card-bg)] rounded-lg overflow-hidden transition-colors duration-500`}>
                {!stats ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2">No Valid Data</p>
                        <p className="text-xs">请在左侧侧边栏录入数据</p>
                    </div>
                ) : (
                    <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full block"
                    />
                )}
            </div>
        );
    }
);

ControlChart.displayName = 'ControlChart';
export default ControlChart;
