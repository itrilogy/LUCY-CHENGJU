import React, { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { HistogramChartStyles, DEFAULT_HISTOGRAM_STYLES, BaseDiagramRef } from '../types';

export interface HistogramDiagramRef extends BaseDiagramRef {}

interface Props {
    data: number[];
    styles?: HistogramChartStyles;
}

// 计算统计指标
function calculateStats(data: number[]) {
    if (data.length === 0) return { mean: 0, std: 0, min: 0, max: 0 };
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const std = Math.sqrt(data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length);
    const min = Math.min(...data);
    const max = Math.max(...data);
    return { mean, std, min, max };
}

// 自动计算分组数 (Sturges 公式)
function calculateBins(n: number): number {
    return Math.ceil(1 + 3.322 * Math.log10(n));
}

// 正态分布概率密度函数
function normalPDF(x: number, mean: number, std: number): number {
    if (std === 0) return 0;
    const coefficient = 1 / (std * Math.sqrt(2 * Math.PI));
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(std, 2));
    return coefficient * Math.exp(exponent);
}

export const HistogramDiagram = forwardRef<HistogramDiagramRef, Props>(({ data, styles }, ref) => {
    const echartsRef = useRef<any>(null);
    const finalStyles = useMemo(() => ({
        ...DEFAULT_HISTOGRAM_STYLES, ...styles
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
            link.download = `直方图_${new Date().getTime()}.png`;
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
                win.document.write(`<html><head><title>直方图导出</title></head><body style="margin:0;padding:20px;"><img src="${dataURL}" /><script>window.print();</script></body></html>`);
                win.document.close();
            }
        }
    }));

    // 数据处理：计算直方图分组
    const processedData = useMemo(() => {
        if (!data || data.length === 0) {
            return { bins: [], categories: [], curveData: [], stats: { mean: 0, std: 0, min: 0, max: 0 }, binWidth: 0 };
        }

        const stats = calculateStats(data);
        const numBins = finalStyles.bins === 'auto' ? calculateBins(data.length) : (finalStyles.bins || 10);

        // 计算区间宽度
        const range = stats.max - stats.min;
        const binWidth = range / numBins || 1;

        // 初始化频数数组
        const bins: number[] = new Array(numBins).fill(0);
        const categories: string[] = [];

        // 生成区间标签
        for (let i = 0; i < numBins; i++) {
            const lower = (stats.min + i * binWidth).toFixed(2);
            const upper = (stats.min + (i + 1) * binWidth).toFixed(2);
            categories.push(`${lower}-${upper}`);
        }

        // 分配数据到各区间
        data.forEach(value => {
            let binIndex = Math.floor((value - stats.min) / binWidth);
            if (binIndex >= numBins) binIndex = numBins - 1;
            if (binIndex < 0) binIndex = 0;
            bins[binIndex]++;
        });

        // 生成正态曲线数据
        const curveData: [number, number][] = [];
        if (finalStyles.showCurve && stats.std > 0) {
            const step = range / 50;
            for (let x = stats.min - range * 0.1; x <= stats.max + range * 0.1; x += step) {
                const y = normalPDF(x, stats.mean, stats.std) * data.length * binWidth;
                curveData.push([x, y]);
            }
        }

        return { bins, categories, curveData, stats, binWidth };
    }, [data, finalStyles.bins, finalStyles.showCurve]);

    const option = useMemo(() => {
        const { bins, categories, curveData, stats } = processedData;

        // 构建 markLine 数据
        const markLineData: any[] = [];
        if (finalStyles.usl !== undefined) {
            markLineData.push({
                xAxis: finalStyles.usl,
                label: { formatter: `USL\n${finalStyles.usl}`, position: 'end', color: finalStyles.uslColor },
                lineStyle: { color: finalStyles.uslColor, type: 'solid', width: 2 }
            });
        }
        if (finalStyles.lsl !== undefined) {
            markLineData.push({
                xAxis: finalStyles.lsl,
                label: { formatter: `LSL\n${finalStyles.lsl}`, position: 'end', color: finalStyles.lslColor },
                lineStyle: { color: finalStyles.lslColor, type: 'solid', width: 2 }
            });
        }
        if (finalStyles.target !== undefined) {
            markLineData.push({
                xAxis: finalStyles.target,
                label: { formatter: `Target\n${finalStyles.target}`, position: 'end', color: finalStyles.targetColor },
                lineStyle: { color: finalStyles.targetColor, type: 'dashed', width: 2 }
            });
        }

        const series: any[] = [
            {
                name: '频数',
                type: 'bar',
                data: bins,
                barWidth: '90%',
                itemStyle: {
                    color: finalStyles.barColor,
                    borderRadius: [4, 4, 0, 0]
                },
                label: {
                    show: finalStyles.showValues,
                    position: 'top',
                    color: finalStyles.barColor,
                    fontSize: finalStyles.barFontSize,
                    fontWeight: 'bold',
                    formatter: (params: any) => params.value > 0 ? params.value : ''
                }
            }
        ];

        // 添加正态曲线
        // 添加正态曲线或辅助线容器
        // 始终使用 xAxisIndex: 1 (数值轴) 来绘制 MarkLine，以确保精度（避免 snap 到 Category）
        const commonMarkLine = markLineData.length > 0 ? {
            silent: true,
            symbol: 'none',
            data: markLineData,
            label: { fontSize: 10, fontWeight: 'bold' }
        } : undefined;

        if (finalStyles.showCurve && curveData.length > 0) {
            series.push({
                name: '正态曲线',
                type: 'line',
                xAxisIndex: 1,
                data: curveData,
                smooth: true,
                symbol: 'none',
                lineStyle: {
                    color: finalStyles.curveColor,
                    width: 3
                },
                markLine: commonMarkLine
            });
        } else if (commonMarkLine) {
            // 如果只有规格线没有曲线，使用一个透明的辅助 Series 挂载 MarkLine
            series.push({
                name: 'Specs',
                type: 'line',
                xAxisIndex: 1,
                data: [],
                showSymbol: false,
                markLine: commonMarkLine,
                tooltip: { show: false }
            });
        }

        return {
            title: {
                text: finalStyles.title || '直方图',
                subtext: `Mean: ${stats.mean.toFixed(3)} | StdDev: ${stats.std.toFixed(3)} | N: ${data.length}`,
                left: 'center',
                top: 0,
                textStyle: {
                    fontSize: finalStyles.titleFontSize,
                    fontWeight: 'bold',
                    color: finalStyles.titleColor
                },
                subtextStyle: {
                    fontSize: finalStyles.baseFontSize || 12,
                    color: '#64748b'
                }
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: 'rgba(13,94,66,0.10)',
                borderWidth: 1,
                padding: [10, 14],
                textStyle: { color: '#1A2428', fontSize: 12 },
                formatter: (params: any[]) => {
                    const bar = params.find(p => p.seriesType === 'bar');
                    if (!bar) return '';
                    return `
                        <div style="font-weight: 700; margin-bottom: 6px; color: #1A2428">区间: ${bar.name}</div>
                        <div style="display: flex; justify-content: space-between; gap: 20px;">
                            <span style="color: #64748b">频数:</span>
                            <span style="font-weight: 600">${bar.value}</span>
                        </div>
                    `;
                }
            },
            grid: {
                top: 80,
                bottom: 40,
                left: 40,
                right: 40,
                containLabel: true
            },
            xAxis: [
                {
                    type: 'category',
                    data: categories,
                    axisTick: { alignWithLabel: true },
                    axisLabel: {
                        interval: 0,
                        rotate: 45,
                        color: '#64748b',
                        fontSize: finalStyles.baseFontSize
                    },
                    axisLine: { lineStyle: { color: 'rgba(13,94,66,0.18)' } }
                },
                // 隐藏的数值轴，用于正态曲线与规格线的高精度绘制
                {
                    type: 'value',
                    min: stats.min - (stats.max - stats.min) * 0.1,
                    max: stats.max + (stats.max - stats.min) * 0.1,
                    show: false
                }
            ],
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                splitLine: { show: true, lineStyle: { type: 'dashed', color: '#EEF2F5' } },
                axisLabel: { color: '#64748b', fontSize: finalStyles.baseFontSize }
            },
            series,
            backgroundColor: 'transparent'
        };
    }, [data, finalStyles]);

    return (
        <div className="w-full h-full">
            <ReactECharts
                ref={echartsRef}
                option={option}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
            />
        </div>
    );
});
