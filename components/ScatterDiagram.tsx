import React, { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';
import { ScatterPoint, ScatterChartStyles, DEFAULT_SCATTER_STYLES, BaseDiagramRef } from '../types';

export interface ScatterDiagramRef extends BaseDiagramRef {}

interface Props {
    data: ScatterPoint[];
    styles?: ScatterChartStyles;
}

export const ScatterDiagram = forwardRef<ScatterDiagramRef, Props>(({ data, styles }, ref) => {
    const echartsRef = useRef<any>(null);
    const finalStyles = useMemo(() => ({
        ...DEFAULT_SCATTER_STYLES, ...styles
    }), [JSON.stringify(styles)]);

    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            if (!echartsRef.current) return '';
            const echartsInstance = echartsRef.current.getEchartsInstance();

            if (options?.width && options?.height) {
                echartsInstance.resize({
                    width: options.width,
                    height: options.height,
                    silent: true
                });
            }

            return echartsInstance.getDataURL({
                type: 'png',
                pixelRatio: options?.pixelRatio || 3,
                backgroundColor: options?.backgroundColor || '#fff'
            });
        },
        exportPNG: (transparent = false, scale = 3) => {
            if (!echartsRef.current) return;
            const echartsInstance = echartsRef.current.getEchartsInstance();
            const dataURL = echartsInstance.getDataURL({
                type: 'png',
                pixelRatio: scale,
                backgroundColor: transparent ? 'transparent' : '#fff'
            });
            const link = document.createElement('a');
            link.download = `散点图_${new Date().getTime()}.png`;
            link.href = dataURL;
            link.click();
        },
        exportPDF: (transparent = false) => {
            if (!echartsRef.current) return;
            const echartsInstance = echartsRef.current.getEchartsInstance();
            const dataURL = echartsInstance.getDataURL({
                type: 'png',
                pixelRatio: 2,
                backgroundColor: '#fff'
            });
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`<html><head><title>散点图导出</title></head><body style="margin:0;padding:20px;"><img src="${dataURL}" /><script>window.print();</script></body></html>`);
                win.document.close();
            }
        }
    }));

    // Circuit Breaker for Data Type Mismatch
    if (!Array.isArray(data)) return null;

    const option = useMemo(() => {
        if (!data || data.length === 0) return {};

        // Prepare data: [[x, y, z, id]]
        const seriesData = data.map(p => [p.x, p.y, p.z || 0, p.id]);

        // Calculate regression if needed
        let regressionSeries: any[] = [];
        if (finalStyles.showTrend && data.length > 1) {
            let n = data.length;
            let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
            data.forEach(p => {
                sumX += p.x;
                sumY += p.y;
                sumXY += (p.x * p.y);
                sumXX += (p.x * p.x);
            });

            const denominator = (n * sumXX - sumX * sumX);
            if (denominator !== 0) {
                const slope = (n * sumXY - sumX * sumY) / denominator;
                const intercept = (sumY - slope * sumX) / n;

                const minX = Math.min(...data.map(d => d.x));
                const maxX = Math.max(...data.map(d => d.x));

                // Add some padding to regression line
                const xPad = (maxX - minX) * 0.1;

                regressionSeries.push({
                    name: '趋势线',
                    type: 'line',
                    data: [[minX - xPad, (minX - xPad) * slope + intercept], [maxX + xPad, (maxX + xPad) * slope + intercept]],
                    showSymbol: false,
                    lineStyle: {
                        color: finalStyles.trendColor,
                        width: 2,
                        type: 'dashed'
                    },
                    z: 1,
                    tooltip: { show: false }
                });
            }
        }

        // 3D Regression Logic
        let regressionSeries3D: any[] = [];
        if (finalStyles.is3D && finalStyles.showTrend && data.length > 1) {
            let n = data.length;
            let sumX = 0, sumY = 0, sumZ = 0;
            let sumXY = 0, sumXZ = 0, sumXX = 0;

            data.forEach(p => {
                const z = p.z || 0;
                sumX += p.x;
                sumY += p.y;
                sumZ += z;
                sumXY += (p.x * p.y);
                sumXZ += (p.x * z);
                sumXX += (p.x * p.x);
            });

            const denominator = (n * sumXX - sumX * sumX);
            if (denominator !== 0) {
                // Y vs X
                const slopeXY = (n * sumXY - sumX * sumY) / denominator;
                const interceptXY = (sumY - slopeXY * sumX) / n;

                // Z vs X
                const slopeXZ = (n * sumXZ - sumX * sumZ) / denominator;
                const interceptXZ = (sumZ - slopeXZ * sumX) / n;

                const minX = Math.min(...data.map(d => d.x));
                const maxX = Math.max(...data.map(d => d.x));
                const rangeX = maxX - minX;

                // Extend line slightly
                const xStart = minX - rangeX * 0.1;
                const xEnd = maxX + rangeX * 0.1;

                regressionSeries3D.push({
                    type: 'line3D',
                    name: '趋势线',
                    data: [
                        [xStart, xStart * slopeXY + interceptXY, xStart * slopeXZ + interceptXZ],
                        [xEnd, xEnd * slopeXY + interceptXY, xEnd * slopeXZ + interceptXZ]
                    ],
                    lineStyle: {
                        width: 4,
                        color: finalStyles.trendColor,
                        opacity: 0.8
                    }
                });
            }
        }

        // 3D Mode Logic
        if (finalStyles.is3D) {
            return {
                title: {
                    text: finalStyles.title,
                    left: 'center',
                    top: 20,
                    textStyle: {
                        fontSize: finalStyles.titleFontSize,
                        fontWeight: 'bold',
                        color: '#1A2428'
                    }
                },
                tooltip: {},
                grid3D: {
                    boxWidth: 200,
                    boxDepth: 80,
                    viewControl: {
                        // Auto-rotate for better visibility
                        autoRotate: false,
                        beta: 10
                    },
                    light: {
                        main: {
                            intensity: 1.2,
                            shadow: true
                        },
                        ambient: {
                            intensity: 0.3
                        }
                    }
                },
                xAxis3D: { name: finalStyles.xAxisLabel, type: 'value' },
                yAxis3D: { name: finalStyles.yAxisLabel, type: 'value' },
                zAxis3D: { name: finalStyles.zAxisLabel || 'Z', type: 'value' },
                series: [{
                    type: finalStyles.renderMode3D === 'scatter' ? 'scatter3D' : 'surface',
                    data: seriesData,
                    // Specific props for Surface/Wireframe
                    wireframe: {
                        show: finalStyles.renderMode3D === 'wireframe' || finalStyles.renderMode3D === 'surface' ? (finalStyles.renderMode3D === 'wireframe') : false,
                        lineStyle: { width: 1, color: finalStyles.pointColor }
                    },
                    shading: finalStyles.renderMode3D === 'wireframe' ? 'color' : 'lambert',

                    // Scatter props (only apply if scatter3D)
                    symbolSize: finalStyles.renderMode3D === 'scatter' ? (val: any) => {
                        const z = val[2];
                        if (!z) return finalStyles.baseSize;
                        const zMin = Math.min(...data.map(d => d.z || 0));
                        const zMax = Math.max(...data.map(d => d.z || 0));
                        if (zMax === zMin) return finalStyles.baseSize;
                        return finalStyles.baseSize * (1 + (z - zMin) / (zMax - zMin) * 2);
                    } : undefined,

                    itemStyle: {
                        color: finalStyles.pointColor,
                        opacity: finalStyles.renderMode3D === 'wireframe' ? 0 : finalStyles.opacity
                    },
                    label: {
                        show: finalStyles.showValues,
                        formatter: (params: any) => {
                            const val = params.value;
                            return `(${val[0]}, ${val[1]}${val[2] ? `, ${val[2]}` : ''})`;
                        },
                        textStyle: {
                            color: finalStyles.pointColor,
                            fontSize: 10
                        }
                    },
                    emphasis: {
                        label: {
                            show: true
                        }
                    }
                }, ...regressionSeries3D]
            };
        }

        // 2D Mode (Existing Logic)
        return {
            title: {
                text: finalStyles.title,
                left: 'center',
                top: 20,
                textStyle: {
                    fontSize: finalStyles.titleFontSize,
                    fontWeight: 'bold',
                    color: '#1A2428'
                }
            },
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: 'rgba(13,94,66,0.10)',
                borderWidth: 1,
                padding: [10, 14],
                textStyle: { color: '#1A2428', fontSize: 12 },
                formatter: (params: any) => {
                    if (params.seriesType === 'line') return '';
                    const [x, y, z] = params.value;
                    return `
                        <div style="font-weight:bold; margin-bottom:6px; color:#1A2428;">数据点详情</div>
                        <div style="display:flex; justify-content:space-between; gap:20px;">
                            <span style="color:#64748b">${finalStyles.xAxisLabel || 'X'}:</span>
                            <span style="font-weight:600">${x}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; gap:20px;">
                            <span style="color:#64748b">${finalStyles.yAxisLabel || 'Y'}:</span>
                            <span style="font-weight:600">${y}</span>
                        </div>
                        ${z > 0 ? `
                        <div style="display:flex; justify-content:space-between; gap:20px;">
                            <span style="color:#64748b">${finalStyles.zAxisLabel || 'Z'}:</span>
                            <span style="font-weight:600">${z}</span>
                        </div>` : ''}
                    `;
                }
            },
            grid: {
                top: 80,
                left: '10%',
                right: '10%',
                bottom: 80,
                containLabel: true
            },
            xAxis: {
                name: finalStyles.xAxisLabel,
                nameLocation: 'center',
                nameGap: 35,
                type: 'value',
                scale: true,
                axisLine: { lineStyle: { color: 'rgba(13,94,66,0.10)' } },
                axisLabel: { color: '#64748b', fontSize: finalStyles.baseFontSize || 12 },
                nameTextStyle: { color: '#1A2428', fontSize: (finalStyles.baseFontSize || 12) + 2, fontWeight: 'bold' },
                splitLine: { lineStyle: { color: '#EEF2F5', type: 'dashed' } }
            },
            yAxis: {
                name: finalStyles.yAxisLabel,
                nameLocation: 'center',
                nameGap: 50,
                type: 'value',
                scale: true,
                axisLine: { lineStyle: { color: 'rgba(13,94,66,0.10)' } },
                axisLabel: { color: '#64748b', fontSize: finalStyles.baseFontSize || 12 },
                nameTextStyle: { color: '#1A2428', fontSize: (finalStyles.baseFontSize || 12) + 2, fontWeight: 'bold' },
                splitLine: { lineStyle: { color: '#EEF2F5', type: 'dashed' } }
            },
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: 0,
                    filterMode: 'none'
                },
                {
                    type: 'inside',
                    yAxisIndex: 0,
                    filterMode: 'none'
                }
            ],
            series: [
                {
                    name: '散点',
                    type: 'scatter',
                    data: seriesData,
                    symbolSize: (val: any) => {
                        const z = val[2];
                        if (!z) return finalStyles.baseSize;

                        const zMin = Math.min(...data.map(d => d.z || 0));
                        const zMax = Math.max(...data.map(d => d.z || 0));
                        if (zMax === zMin) return finalStyles.baseSize;

                        // Scale z to reasonable visual range (1x to 3x baseSize)
                        return finalStyles.baseSize * (1 + (z - zMin) / (zMax - zMin) * 2);
                    },
                    itemStyle: {
                        color: finalStyles.pointColor,
                        opacity: finalStyles.opacity,
                        borderColor: '#fff',
                        borderWidth: 1
                    },
                    label: {
                        show: finalStyles.showValues,
                        position: 'top',
                        formatter: (params: any) => {
                            const val = params.value;
                            return `(${val[0]}, ${val[1]}${val[2] ? `, ${val[2]}` : ''})`;
                        },
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: finalStyles.pointColor
                    },
                    emphasis: {
                        itemStyle: {
                            opacity: 1,
                            shadowBlur: 10,
                            shadowColor: 'rgba(0,0,0,0.3)'
                        },
                        label: {
                            show: true,
                            fontWeight: 'bold'
                        }
                    },
                    z: 2
                },
                ...regressionSeries
            ],

        };
    }, [data, finalStyles]);

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-full">
                <ReactECharts
                    ref={echartsRef}
                    option={option}
                    notMerge={true}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                />
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            <ReactECharts
                ref={echartsRef}
                option={option}
                notMerge={true}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
            />
        </div>
    );
});
