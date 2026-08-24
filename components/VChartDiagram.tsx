import React, { useImperativeHandle, forwardRef, useRef, useState, useEffect, useLayoutEffect } from 'react';
// 切换至 vchart-all 引擎，自动包含所有图表类、组件、标记和布局 Riverside,
import { VChart } from '@visactor/vchart/esm/vchart-all';
// registerTheme 是 VChart 的独立导出函数，非类的静态方法 Riverside,
import { registerTheme } from '@visactor/vchart/esm/theme/builtin';

import { VChartData, VChartChartStyles, DEFAULT_VCHART_STYLES, BaseDiagramRef } from '../types';
import { VCHART_COLOR_PALETTES } from '../constants';

export interface VChartDiagramRef extends BaseDiagramRef { }

interface Props {
    data: VChartData;
    styles?: VChartChartStyles;
    theme: 'light' | 'dark';
}

// 全局主题注册 (Idempotent) Riverside,
let isThemesRegistered = false;
const ensureVChartThemes = () => {
    if (isThemesRegistered) return;
    try {
        // 仅注册有自定义颜色的主题 (light/dark 是 VChart 内置的，跳过)
        VCHART_COLOR_PALETTES.filter(p => p.colors.length > 0).forEach(palette => {
            registerTheme(palette.id, {
                colorScheme: {
                    default: {
                        dataScheme: palette.colors
                    }
                }
            } as any);
        });
        isThemesRegistered = true;
    } catch (e) {
        console.warn('[VChart Theme Registry Warn]', e);
        // 即使注册失败，也允许后续渲染使用内置主题
        isThemesRegistered = true;
    }
};

/**
 * VChartDiagram: 业务增强型渲染器 Riverside,
 * 核心逻辑：基于 VChart 原生主题引擎进行配色与标题管理。
 */
const VChartDiagram = forwardRef<VChartDiagramRef, Props>(({ data, styles = DEFAULT_VCHART_STYLES, theme = 'light' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const vchartInstanceRef = useRef<any>(null);
    const [renderError, setRenderError] = useState<string | null>(null);

    // 1. 导出接口 Riverside,
    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            if (!vchartInstanceRef.current) return '';
            return vchartInstanceRef.current.getDataURL({
                pixelRatio: options?.pixelRatio || 3,
                bgColor: options?.transparent ? 'transparent' : (theme === 'dark' ? '#1a1a1a' : '#fff')
            });
        },
        exportPNG: async (transparent = false, scale = 3) => {
            if (!vchartInstanceRef.current) return;
            const dataUrl = await vchartInstanceRef.current.getDataURL({
                pixelRatio: scale,
                bgColor: transparent ? 'transparent' : (theme === 'dark' ? '#1a1a1a' : '#fff')
            });
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `VChart_Export_${Date.now()}.png`;
            link.click();
        },
        exportPDF: async (isTransparent) => {
            if (!vchartInstanceRef.current) return;
            const dataUrl = await vchartInstanceRef.current.getDataURL({
                pixelRatio: 3,
                bgColor: isTransparent ? 'transparent' : (theme === 'dark' ? '#1a1a1a' : '#fff')
            });
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
          <html>
            <head><title>导出 PDF - 澄矩 · ChengJu</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8fafc; font-family: -apple-system, sans-serif;">
              <div style="padding: 40px; background: #fff; box-shadow: 0 40px 100px rgba(0,0,0,0.05); border-radius: 20px; text-align: center;">
                <img src="${dataUrl}" style="max-width:100%; height:auto;" />
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

    // 2. 核心渲染逻辑 Riverside,
    const renderChart = async (isUpdate = false) => {
        if (!containerRef.current || !data.spec || !(data.spec as any).type) return;

        ensureVChartThemes();
        setRenderError(null);

        try {
            // 深度克隆以隔离引用 Riverside,
            const spec = JSON.parse(JSON.stringify(data.spec));

            // --- 全局标题控制 Riverside, ---
            if (styles.showTitle && data.title && !spec.title) {
                spec.title = {
                    visible: true,
                    text: data.title,
                    style: {
                        fontSize: styles.titleFontSize || 20,
                        fontWeight: 'bold'
                    }
                };
            } else if (!styles.showTitle) {
                spec.title = { visible: false };
            }

            // --- 主题驱动配色 Riverside, ---
            // colorPalette 取自 styles，优先级高于 spec 内嵌的 theme 字段
            spec.theme = styles.colorPalette || 'light';

            // --- 类型规范化 (VChart 2.x 严格要求 CamelCase) Riverside, ---
            const typeMapping: Record<string, string> = {
                'wordcloud': 'wordCloud',
                'boxplot': 'boxPlot',
                'circularprogress': 'circularProgress',
                'linearprogress': 'linearProgress',
            };
            if (spec.type && typeMapping[spec.type.toLowerCase()]) {
                spec.type = typeMapping[spec.type.toLowerCase()];
            }

            // --- 全局标签控制 Riverside, ---
            if (styles.showLabel) {
                // 特定高阶图表需要在图表级注入 label Riverside,
                if (['boxPlot', 'sankey', 'sunburst', 'treemap', 'wordCloud'].includes(spec.type) && !spec.label) {
                    spec.label = { visible: true };
                }
                // sankey 的节点标签单独配置 Riverside,
                if (spec.type === 'sankey') {
                    if (!spec.node) spec.node = {};
                    if (!spec.node.label) spec.node.label = { visible: true };
                }
            } else {
                // 关闭所有标签 Riverside,
                spec.label = { visible: false };
                if (spec.series && Array.isArray(spec.series)) {
                    spec.series = spec.series.map((s: any) => ({ ...s, label: { visible: false } }));
                }
            }

            // --- 动画控制 Riverside, ---
            if (!styles.animation) {
                spec.animation = false;
            } else {
                spec.animation = true;
                // animationMode 通过系列级别设置 Riverside,
                const animConfig = { type: styles.animationMode || 'scale', duration: 600 };
                if (spec.series && Array.isArray(spec.series)) {
                    spec.series = spec.series.map((s: any) => ({
                        ...s,
                        animationAppear: animConfig
                    }));
                } else {
                    spec.animationAppear = animConfig;
                }
            }

            if (isUpdate && vchartInstanceRef.current) {
                if (vchartInstanceRef.current.getSpec()?.type === spec.type) {
                    await vchartInstanceRef.current.updateSpec(spec);
                } else {
                    vchartInstanceRef.current.release();
                    vchartInstanceRef.current = new VChart(spec, { dom: containerRef.current });
                    await vchartInstanceRef.current.renderAsync();
                }
            } else {
                if (vchartInstanceRef.current) vchartInstanceRef.current.release();
                vchartInstanceRef.current = new VChart(spec, { dom: containerRef.current });
                await vchartInstanceRef.current.renderAsync();
            }
        } catch (err: any) {
            console.error('[VChart Render Engine Error]', err);
            setRenderError(err?.message || '渲染引擎发生故障');
        }
    };

    // 3. 响应式布局侦听 Riverside,
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(() => {
            if (vchartInstanceRef.current && vchartInstanceRef.current.updateSize) {
                try { vchartInstanceRef.current.updateSize(); } catch { /*ignore*/ }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // 4. 生命周期管理 Riverside,
    useLayoutEffect(() => {
        const timer = setTimeout(() => {
            renderChart(!!vchartInstanceRef.current);
        }, 0);
        return () => clearTimeout(timer);
    }, [data.spec, theme, styles.colorPalette, styles.showTitle, styles.showLabel, styles.animation, styles.animationMode, styles.titleFontSize]);

    // 彻底释放 Riverside,
    useEffect(() => {
        return () => {
            if (vchartInstanceRef.current) {
                vchartInstanceRef.current.release();
                vchartInstanceRef.current = null;
            }
        };
    }, []);

    if (renderError) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-rose-50/50 dark:bg-rose-900/10 transition-colors">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-xl max-w-2xl w-full">
                    <div className="text-rose-500 font-black mb-3 uppercase text-[10px] tracking-widest">渲染引擎异常</div>
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-600 dark:text-rose-400 font-mono text-[11px] leading-relaxed whitespace-pre-wrap overflow-auto max-h-[200px]">
                        {renderError}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col p-6 overflow-hidden bg-[var(--card-bg)]">
            <div
                ref={containerRef}
                className="flex-1 w-full min-h-0"
                id="vchart-main-container"
                style={{ height: data.spec?.height ? `${data.spec.height}px` : '100%' }}
            />
        </div>
    );
});

VChartDiagram.displayName = 'VChartDiagram';
export default VChartDiagram;