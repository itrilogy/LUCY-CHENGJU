import React, { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { ParetoItem, ParetoChartStyles, DEFAULT_PARETO_STYLES, BaseDiagramRef } from '../types';

export interface ParetoDiagramRef extends BaseDiagramRef {}

interface Props {
    data: ParetoItem[];
    styles?: ParetoChartStyles;
    showLine?: boolean;
}

export const ParetoDiagram = forwardRef<ParetoDiagramRef, Props>(({ data, styles, showLine = true }, ref) => {
    const echartsRef = useRef<any>(null);
    const finalStyles = useMemo(() => ({ ...DEFAULT_PARETO_STYLES, ...styles }), [styles]);

    // 暴露方法给外部
    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            if (!echartsRef.current) return '';
            const echartsInstance = echartsRef.current.getEchartsInstance();
            
            // 🚨 Mandatory Resize for ILDR to prevent squashing
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
            link.download = `排列图_${new Date().getTime()}.png`;
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
                win.document.write(`
          <html>
            <head><title>导出 PDF - 澄矩 · ChengJu</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8fafc; font-family: -apple-system, sans-serif;">
              <div style="padding: 40px; background: #fff; box-shadow: 0 40px 100px rgba(0,0,0,0.05); border-radius: 20px; text-align: center;">
                <img src="${dataURL}" style="max-width:100%; height:auto;" />
                <div style="margin-top: 20px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; tracking-widest: 0.1em;">
                  Industrial Logic Report | 澄矩 · ChengJu
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
        }
    }));

    const processedData = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) return [];
        const sorted = [...data].sort((a, b) => b.value - a.value);
        const total = sorted.reduce((sum, item) => sum + item.value, 0);
        let currentSum = 0;

        return sorted.map((item) => {
            currentSum += item.value;
            return {
                ...item,
                ratio: total > 0 ? (item.value / total) * 100 : 0,
                cumulativeRatio: total > 0 ? (currentSum / total) * 100 : 0
            };
        });
    }, [data]);

    const option = useMemo(() => {
        if (processedData.length === 0) return null;
        const xData = processedData.map(i => i.name);
        const total = processedData.reduce((sum, item) => sum + item.value, 0);
        const yBarData = processedData.map((i, idx) => [idx + 0.5, i.value, i.cumulativeRatio]);
        const yLineData = [
            [0, 0],
            ...processedData.map((i, idx) => [idx + 1, i.cumulativeRatio])
        ];
        const decimals = finalStyles.decimals ?? 1;

        return {
            title: {
                text: finalStyles.title || '排列图 (Pareto Chart)',
                left: 'center',
                top: 20,
                textStyle: {
                    fontSize: finalStyles.titleFontSize,
                    color: finalStyles.titleColor,
                    fontWeight: '900'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e2e8f0',
                padding: [12, 16],
                textStyle: { color: '#0f172a', fontSize: 13 },
                formatter: (params: any[]) => {
                    const barParam = params.find(p => p.seriesType === 'custom');
                    if (!barParam) return '';
                    const idx = Math.floor(barParam.value[0]);
                    const item = processedData[idx];
                    if (!item) return '';
                    return `
            <div style="font-weight: 900; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">${item.name}</div>
            <div style="display: flex; justify-content: space-between; gap: 32px; margin-bottom: 4px;">
              <span style="color: #64748b; font-size: 12px;">频数:</span>
              <span style="font-weight: 700; color: #2563eb">${item.value}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 32px;">
              <span style="color: #64748b; font-size: 12px;">累计频率:</span>
              <span style="font-weight: 700; color: ${finalStyles.lineColor}">${item.cumulativeRatio.toFixed(decimals)}%</span>
            </div>
          `;
                }
            },
            grid: { top: 140, bottom: 80, left: 100, right: 100 },
            xAxis: {
                type: 'value',
                min: 0,
                max: processedData.length,
                interval: 0.5,
                axisLabel: {
                    show: true,
                    color: '#64748b',
                    fontSize: finalStyles.baseFontSize,
                    rotate: 30,
                    fontWeight: '500',
                    formatter: (val: number) => {
                        const idx = Math.floor(val);
                        // Show name at the center of the bar (x.5)
                        if (val === idx + 0.5 && processedData[idx]) return processedData[idx].name;
                        return '';
                    }
                },
                axisLine: { lineStyle: { color: '#cbd5e1' } },
                axisTick: {
                    show: true,
                    interval: (idx: number, val: number) => val === Math.floor(val) // Only show ticks at integer boundaries
                },
                splitLine: { show: false }
            },
            yAxis: [
                {
                    type: 'value',
                    name: '频数',
                    nameGap: 30, // Move title higher
                    min: 0,
                    max: total,
                    interval: total / 5,
                    axisLine: { show: true, onZero: false, lineStyle: { color: '#cbd5e1' } },
                    nameTextStyle: { color: '#64748b', fontWeight: 'bold' },
                    splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
                    axisLabel: { color: '#64748b', fontSize: finalStyles.baseFontSize }
                },
                {
                    type: 'value',
                    name: '累计频率 (%)',
                    nameGap: 30, // Move title higher
                    min: 0, max: 100,
                    interval: 20,
                    axisLine: { show: true, onZero: false, lineStyle: { color: '#cbd5e1' } },
                    nameTextStyle: { color: '#64748b', fontWeight: 'bold' },
                    splitLine: { show: false },
                    axisLabel: { formatter: '{value}%', color: '#64748b', fontSize: finalStyles.baseFontSize }
                }
            ],
            series: [
                {
                    name: '频数',
                    type: 'custom',
                    renderItem: (params: any, api: any) => {
                        const val0 = api.value(0);
                        const val1 = api.value(1);
                        const idx = Math.floor(val0);
                        const start = api.coord([idx, 0]);
                        const size = api.size([1, val1]);
                        return {
                            type: 'rect',
                            shape: {
                                x: start[0],
                                y: start[1] - size[1],
                                width: size[0],
                                height: size[1]
                            },
                            style: api.style()
                        };
                    },
                    data: yBarData,
                    itemStyle: {
                        color: finalStyles.barColor,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: finalStyles.showValues,
                        position: 'top',
                        formatter: (p: any) => p.value[1],
                        color: finalStyles.barColor,
                        fontWeight: '900',
                        fontSize: finalStyles.barFontSize
                    }
                },
                {
                    name: '累计频率',
                    type: 'line',
                    yAxisIndex: 1,
                    data: yLineData,
                    symbol: 'circle',
                    symbolSize: (val: any) => (val[0] === 0 ? 0 : 8),
                    lineStyle: { width: 4, color: finalStyles.lineColor, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)' },
                    itemStyle: { color: finalStyles.lineColor, borderColor: '#fff', borderWidth: 2 },
                    label: {
                        show: finalStyles.showValues,
                        position: 'top',
                        formatter: (p: any) => p.value[0] > 0 ? `${p.value[1].toFixed(decimals)}%` : '',
                        color: finalStyles.lineColor,
                        fontWeight: '900',
                        fontSize: finalStyles.lineFontSize
                    },
                    markLine: showLine ? {
                        silent: true,
                        symbol: 'none',
                        label: { show: false }, // Hide the 80% text
                        lineStyle: { color: finalStyles.markLineColor, type: 'dashed', width: 2 },
                        data: [{ yAxis: 80 }]
                    } : null
                }
            ],
            backgroundColor: 'transparent'
        };
    }, [processedData, finalStyles, showLine]);

    if (processedData.length === 0 || !option) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/30">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">初始化数据矩阵...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-8" id="pareto-chart-container">
            <ReactECharts
                ref={echartsRef}
                option={option}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
            />
        </div>
    );
});

ParetoDiagram.displayName = 'ParetoDiagram';
