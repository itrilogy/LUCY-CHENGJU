import React, { useMemo, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { BasicChartData, BasicChartStyles, DEFAULT_BASIC_STYLES, BaseDiagramRef } from '../types';

export interface BasicDiagramRef extends BaseDiagramRef {}

interface Props {
    data: BasicChartData;
    styles?: BasicChartStyles;
}

// Helper: Derived colors based on seed
const deriveColors = (seed: string, count: number) => {
    let base = seed;
    if (!base || !base.startsWith('#')) base = '#0D5E42';

    const colors: string[] = [base];
    if (count <= 1) return colors;

    const r = parseInt(base.slice(1, 3), 16);
    const g = parseInt(base.slice(3, 5), 16);
    const b = parseInt(base.slice(5, 7), 16);

    // Convert to HSL
    let r1 = r / 255, g1 = g / 255, b1 = b / 255;
    let max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
    let h = 0, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r1: h = (g1 - b1) / d + (g1 < b1 ? 6 : 0); break;
            case g1: h = (b1 - r1) / d + 2; break;
            case b1: h = (r1 - g1) / d + 4; break;
        }
        h /= 6;
    }

    for (let i = 1; i < count; i++) {
        // Distribute hue
        let nh = (h + (i / count)) % 1;
        // Adjust lightness slightly for contrast
        let nl = l > 0.6 ? l - 0.1 : l + 0.1;

        // Convert back to RGB
        let nr, ng, nb;
        if (s === 0) {
            nr = ng = nb = nl;
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            let q = nl < 0.5 ? nl * (1 + s) : nl + s - nl * s;
            let p = 2 * nl - q;
            nr = hue2rgb(p, q, nh + 1 / 3);
            ng = hue2rgb(p, q, nh);
            nb = hue2rgb(p, q, nh - 1 / 3);
        }
        colors.push(`rgb(${Math.round(nr * 255)}, ${Math.round(ng * 255)}, ${Math.round(nb * 255)})`);
    }
    return colors;
};

export const BasicDiagram = forwardRef<BasicDiagramRef, Props>(({ data, styles }, ref) => {
    const echartsRef = useRef<any>(null);
    const [hiddenLegends, setHiddenLegends] = useState<Record<string, boolean>>({});

    const finalStyles = useMemo(() => ({
        ...DEFAULT_BASIC_STYLES, ...styles
    }), [JSON.stringify(styles)]);

    const onChartEvents = {
        'legendselectchanged': (params: any) => {
            setHiddenLegends(params.selected);
        }
    };

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
                backgroundColor: options?.backgroundColor || '#FFFFFF'
            });
        },
        exportPNG: (transparent = false, scale = 3) => {
            if (!echartsRef.current) return;
            const echartsInstance = echartsRef.current.getEchartsInstance();
            const dataURL = echartsInstance.getDataURL({
                type: 'png',
                pixelRatio: 2,
                backgroundColor: transparent ? 'transparent' : '#fff'
            });
            const link = document.createElement('a');
            link.download = `${finalStyles.title || '图表'}_${new Date().getTime()}.png`;
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
                win.document.write(`<html><head><title>图表导出</title></head><body style="margin:0;padding:20px;"><img src="${dataURL}" style="max-width:100%" /><script>window.print();</script></body></html>`);
                win.document.close();
            }
        }
    }));

    const option = useMemo(() => {
        if (!data || !data.datasets || data.datasets.length === 0) return {};

        const { datasets, title } = data;
        const type = finalStyles.type || data.type;
        const isHorizontal = finalStyles.view === 'h' && type !== 'pie';
        const isPie = type === 'pie';

        // Extract category labels (X-axis)
        const xDataset = datasets.find(d => d.axisMatch === 'X');
        let categories = xDataset ? [...xDataset.values] : [];

        // Extract numerical datasets (Y, Y2, Y3...)
        let numericalDatasets = datasets.filter(d => d.axisMatch !== 'X');

        // Sorting Logic
        if (finalStyles.sortMode !== 'none' && !isPie) {
            // Find first visible numerical dataset
            const sortKeyDataset = numericalDatasets.find(ds =>
                hiddenLegends[ds.name] !== false
            ) || numericalDatasets[0];

            if (sortKeyDataset) {
                // Create indices for sorting
                const indices = categories.map((_, i) => i);
                indices.sort((a, b) => {
                    const valA = Number(sortKeyDataset.values[a]) || 0;
                    const valB = Number(sortKeyDataset.values[b]) || 0;
                    return finalStyles.sortMode === 'asc' ? valA - valB : valB - valA;
                });

                // Reorder categories and all numerical data
                categories = indices.map(i => categories[i]);
                numericalDatasets = numericalDatasets.map(ds => ({
                    ...ds,
                    values: indices.map(i => ds.values[i])
                }));
            }
        }

        // Map Axis labels
        // In this simplified version, we'll use the names of the datasets associated with each Y axis for the axis name
        const yAxisLabels: Record<string, string> = {};
        numericalDatasets.forEach(ds => {
            if (!yAxisLabels[ds.axisMatch]) {
                yAxisLabels[ds.axisMatch] = ds.name;
            } else {
                yAxisLabels[ds.axisMatch] += ` / ${ds.name}`;
            }
        });

        const series: any[] = [];
        const yAxes: any[] = [];
        const yAxisMap: Record<string, number> = {};

        if (isPie) {
            // Multi-level Pie logic
            const ringCount = numericalDatasets.length;
            numericalDatasets.forEach((ds, idx) => {
                const step = 70 / ringCount;
                const innerRadius = idx * step + (idx === 0 ? 0 : 2);
                const outerRadius = (idx + 1) * step;

                const sliceColors = deriveColors(ds.color || '', categories.length);

                series.push({
                    name: ds.name,
                    type: 'pie',
                    radius: [`${innerRadius}%`, `${outerRadius}%`],
                    label: {
                        show: finalStyles.showValues && idx === ringCount - 1,
                        position: 'outside',
                        formatter: '{b}: {c} ({d}%)'
                    },
                    data: categories.map((cat, i) => ({
                        name: cat as string,
                        value: ds.values[i],
                        itemStyle: { color: sliceColors[i % sliceColors.length] }
                    }))
                });
            });
        } else {
            // Bar / Line logic
            const axisKeys = Array.from(new Set(numericalDatasets.map(ds => ds.axisMatch))).sort();

            axisKeys.forEach((key, idx) => {
                const sKey = String(key);
                yAxisMap[sKey] = idx;
                yAxes.push({
                    type: 'value',
                    name: yAxisLabels[sKey] || '',
                    position: idx === 0 ? 'left' : 'right',
                    offset: idx > 1 ? (idx - 1) * 60 : 0,
                    splitLine: { show: finalStyles.grid && idx === 0 },
                    axisLabel: { color: '#64748b' },
                    nameTextStyle: { color: '#1A2428', fontWeight: 'bold' }
                });
            });

            numericalDatasets.forEach(ds => {
                series.push({
                    name: ds.name,
                    type: type === 'line' ? 'line' : 'bar',
                    smooth: finalStyles.smooth,
                    stack: finalStyles.stacked ? 'total' : undefined,
                    label: {
                        show: finalStyles.showValues,
                        position: isHorizontal ? 'right' : 'top',
                        formatter: '{c}'
                    },
                    [isHorizontal ? 'xAxisIndex' : 'yAxisIndex']: yAxisMap[String(ds.axisMatch)] || 0,
                    data: ds.values,
                    itemStyle: ds.color ? { color: ds.color } : undefined,
                    emphasis: { focus: 'series' }
                });
            });
        }

        const baseOption: any = {
            backgroundColor: finalStyles.backgroundColor,
            title: {
                text: title || finalStyles.title,
                left: 'center',
                top: 20,
                textStyle: {
                    color: finalStyles.titleColor,
                    fontSize: finalStyles.titleFontSize,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: isPie ? 'item' : 'axis',
                axisPointer: { type: 'shadow' }
            },
            legend: {
                show: finalStyles.showLegend,
                bottom: 10,
                left: 'center',
                selected: hiddenLegends
            },
            grid: {
                top: 80,
                left: 80,
                right: (isHorizontal ? 40 : (yAxes.length > 1 ? 80 + (yAxes.length - 2) * 60 : 40)),
                bottom: 60,
                containLabel: true
            },
            series
        };

        if (!isPie) {
            const categoryAxis = {
                type: 'category',
                data: categories,
                axisLabel: { color: '#64748b', fontSize: finalStyles.baseFontSize },
                axisLine: { lineStyle: { color: 'rgba(13,94,66,0.10)' } }
            };

            if (isHorizontal) {
                baseOption.xAxis = yAxes; // Numerical axes move to X
                baseOption.yAxis = categoryAxis; // Category axis moves to Y
            } else {
                baseOption.xAxis = categoryAxis;
                baseOption.yAxis = yAxes;
            }
        }

        return baseOption;
    }, [data, finalStyles]);

    return (
        <div className="w-full h-full bg-white rounded-3xl overflow-hidden p-4">
            <ReactECharts
                ref={echartsRef}
                option={option}
                onEvents={onChartEvents}
                notMerge={true}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
            />
        </div>
    );
});

export default BasicDiagram;
