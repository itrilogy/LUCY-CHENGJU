import React, { useState, useEffect, useRef } from 'react';
import { ScatterPoint,
    ScatterChartStyles,
    DEFAULT_SCATTER_STYLES } from '../types';
import { INITIAL_SCATTER_DSL,
    INITIAL_SCATTER_DATA } from '../constants';
import { ScatterChart as ScatterIcon,
    Sparkles,
    HelpCircle,
    X,
    Loader2,
    Database,
    Code,
    ChevronRight,
    Box,
    Waves,
    Grid3X3,
    RotateCcw,
    Cpu,
    Zap,
    AlertTriangle,
} from 'lucide-react';
import {generateScatterDSL} from '../services/aiService';
import { CardDocModal } from './CardDocModal';
import { Switch } from './ui/Switch';
import { genId } from '../utils/id';
import { useAIEngine } from '../hooks/useAIEngine';
import { ConfirmInline } from '../components/ui/ConfirmInline';

interface ScatterEditorProps {
    data: ScatterPoint[];
    styles: ScatterChartStyles;
    onDataChange: (data: ScatterPoint[]) => void;
    onStylesChange: (styles: ScatterChartStyles) => void;
}

export const parseScatterDSL = (content: string, baseStyles: ScatterChartStyles = DEFAULT_SCATTER_STYLES) => {
    const lines = content.split('\n');
    const newStyles: ScatterChartStyles = { ...baseStyles };
    const newPoints: ScatterPoint[] = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        // IQS-DSL v1: // canonical comment; # legacy comment (non-Tree kinds)
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        // Computed Properties
        if (trimmed.includes(':') && !trimmed.startsWith('-')) {
            const [key, ...vals] = trimmed.split(':');
            const val = vals.join(':').trim();

            switch (key.trim()) {
                case 'Title': newStyles.title = val; break;
                case 'XAxis': newStyles.xAxisLabel = val; break;
                case 'YAxis': newStyles.yAxisLabel = val; break;
                case 'ZAxis': newStyles.zAxisLabel = val; break;
                case 'Color[Point]': newStyles.pointColor = val; break;
                case 'Color[Trend]': newStyles.trendColor = val; break;
                case 'ShowTrend': newStyles.showTrend = val.toLowerCase() === 'true'; break;
                case '3D':
                case 'Show3D': newStyles.is3D = val.toLowerCase() === 'true'; break;
                case 'Size[Base]': newStyles.baseSize = parseFloat(val); break;
                case 'Opacity': newStyles.opacity = parseFloat(val); break;
                case 'ShowValues': newStyles.showValues = val.toLowerCase() === 'true'; break;
            }
            return;
        }

        // Data Points
        if (trimmed.startsWith('-')) {
            const parts = trimmed.substring(1).split(',').map(s => parseFloat(s.trim()));
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                newPoints.push({
                    id: genId('pt'),
                    x: parts[0],
                    y: parts[1],
                    z: parts[2]
                });
            }
        }
    });

    return { data: newPoints, styles: newStyles };
};

const ScatterEditor: React.FC<ScatterEditorProps> = ({ data, styles, onDataChange, onStylesChange }) => {
    const [dsl, setDsl] = useState(INITIAL_SCATTER_DSL);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [manualInput, setManualInput] = useState('');

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const engineName = useAIEngine();


    // Initial Sync
    const isInitialized = useRef(false);
    useEffect(() => {
        const isInvalidData = data.length > 0 && typeof (data[0] as any).x === 'undefined';

        if (!isInitialized.current || isInvalidData) {
            if (data.length === 0 || isInvalidData) {
                handleParseDSL(INITIAL_SCATTER_DSL);
            } else {
                setManualInput(data.map(p => `${p.x}, ${p.y}${p.z ? `, ${p.z}` : ''}`).join('\n'));
            }
            if (!isInvalidData) {
                isInitialized.current = true;
            }
        }
    }, [data]);

    function generateDSLFromState(currentData: ScatterPoint[], currentStyles: ScatterChartStyles) {
        let lines: string[] = [];
        if (currentStyles.title) lines.push(`Title: ${currentStyles.title}`);
        if (currentStyles.xAxisLabel) lines.push(`XAxis: ${currentStyles.xAxisLabel}`);
        if (currentStyles.yAxisLabel) lines.push(`YAxis: ${currentStyles.yAxisLabel}`);
        if (currentStyles.zAxisLabel) lines.push(`ZAxis: ${currentStyles.zAxisLabel}`);
        if (currentStyles.pointColor) lines.push(`Color[Point]: ${currentStyles.pointColor}`);
        if (currentStyles.trendColor) lines.push(`Color[Trend]: ${currentStyles.trendColor}`);
        if (currentStyles.showTrend !== undefined) lines.push(`ShowTrend: ${currentStyles.showTrend}`);
        if (currentStyles.is3D !== undefined) lines.push(`Show3D: ${currentStyles.is3D}`);
        lines.push(`ShowValues: ${currentStyles.showValues || false}`);

        lines.push('');
        lines.push('# 数据 (X, Y, [Z])');
        currentData.forEach(p => {
            lines.push(`- ${p.x}, ${p.y}${p.z ? `, ${p.z}` : ''}`);
        });
        return lines.join('\n');
    }

    const handleTabChange = (tab: 'manual' | 'dsl' | 'ai') => {
        if (tab === 'dsl') setDsl(generateDSLFromState(data, styles));
        setActiveTab(tab);
    };

    const handleParseDSL = (content: string) => {
        const { data: newPoints, styles: newStyles } = parseScatterDSL(content, styles);
        onDataChange(newPoints);
        onStylesChange(newStyles);
        setManualInput(newPoints.map(p => `${p.x}, ${p.y}${p.z ? `, ${p.z}` : ''}`).join('\n'));
    };

    const handleManualChange = (val: string) => {
        setManualInput(val);
        const lines = val.split('\n');
        const newPoints: ScatterPoint[] = [];
        lines.forEach(line => {
            const parts = line.split(',').map(s => parseFloat(s.trim()));
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                newPoints.push({
                    id: genId('pt'),
                    x: parts[0],
                    y: parts[1],
                    z: parts[2]
                });
            }
        });
        onDataChange(newPoints);
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateScatterDSL(aiPrompt);
            setDsl(result);
            handleParseDSL(result);
            setActiveTab('dsl');
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const doReset = () => {
            setDsl(INITIAL_SCATTER_DSL);
            handleParseDSL(INITIAL_SCATTER_DSL);
        setConfirmReset(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative transition-colors">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-line-r)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
                            <Cpu size={22} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">相关性散点图分析</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Scatter Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {confirmReset && (
                            <ConfirmInline
                                message="恢复示例？当前修改将丢失"
                                onConfirm={doReset}
                                onCancel={() => setConfirmReset(false)}
                            />
                        )}
                        <button
                            onClick={() => setConfirmReset(true)} disabled={confirmReset}
                            className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-[var(--text-warn)] transition-all border border-[var(--border-line-r)] shadow-sm"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button onClick={() => setShowDocs(true)} className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--border-line-r)] shadow-sm">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>
                <nav className="flex bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)] gap-1">
                    {[{ id: 'manual', label: '手动录入', icon: <Database size={14} /> }, { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> }, { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }].map(t => (
                        <button key={t.id} onClick={() => handleTabChange(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--sidebar-text)]'}`}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {error && (
                    <div role="alert" className="p-4 rounded-md bg-[var(--alert-red)]/10 border border-[var(--alert-red)]/30 flex items-start gap-3">
                        <AlertTriangle size={16} className="text-[var(--text-danger)] shrink-0 mt-0.5" />
                        <p className="text-[11px] font-bold text-[var(--text-danger)] leading-relaxed flex-1">{error}</p>
                        <button type="button" onClick={() => setError(null)} aria-label="关闭错误提示"
                            className="text-[var(--text-muted)] hover:text-[var(--text-danger)] transition-colors shrink-0">
                            <X size={14} />
                        </button>
                    </div>
                )}
                {activeTab === 'manual' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Title & Axes */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-[var(--text-warn)]" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图表元数据</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <input value={styles.title || ''} onChange={e => onStylesChange({ ...styles, title: e.target.value })} className="iqs-input h-11" placeholder="图表标题" />
                                <div className="grid grid-cols-3 gap-3">
                                    <input value={styles.xAxisLabel || ''} onChange={e => onStylesChange({ ...styles, xAxisLabel: e.target.value })} className="iqs-input h-11" placeholder="X轴标签" />
                                    <input value={styles.yAxisLabel || ''} onChange={e => onStylesChange({ ...styles, yAxisLabel: e.target.value })} className="iqs-input h-11" placeholder="Y轴标签" />
                                    <input value={styles.zAxisLabel || ''} onChange={e => onStylesChange({ ...styles, zAxisLabel: e.target.value })} className="iqs-input h-11" placeholder="Z轴标签" />
                                </div>
                            </div>
                        </div>

                        {/* Data Input */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pl-2">
                                <div className="flex items-center gap-3">
                                    <ChevronRight size={14} className="text-[var(--text-warn)]" />
                                    <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">坐标数据 (X, Y, [Z])</span>
                                </div>
                                <span className="text-[11px] font-mono text-[var(--text-warn)] bg-[var(--luxi-gold)]/10 px-2 py-0.5 rounded">N={data.length}</span>
                            </div>
                            <textarea
                                value={manualInput}
                                onChange={e => handleManualChange(e.target.value)}
                                className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                                placeholder={"10.5, 20.3\n15.2, 25.1\n..."}
                                spellCheck={false}
                            />
                        </div>

                        {/* Configuration */}
                        <div className="p-6 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] space-y-4">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">样式配置</span>
                            </div>

                            {/* Switches Row */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => onStylesChange({ ...styles, showValues: !styles.showValues })}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md border transition-all ${styles.showValues ? 'bg-primary border-primary text-white' : 'bg-[var(--sidebar-bg)] border-[var(--input-border)] text-[var(--sidebar-muted)]'}`}
                                >
                                    <span className="text-[11px] font-black uppercase tracking-widest">{styles.showValues ? '显示数值' : '隐藏数值'}</span>
                                </button>
                                <button
                                    onClick={() => onStylesChange({ ...styles, showTrend: !styles.showTrend })}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md border transition-all ${styles.showTrend ? 'bg-primary border-primary text-white' : 'bg-[var(--sidebar-bg)] border-[var(--input-border)] text-[var(--sidebar-muted)]'}`}
                                >
                                    <span className="text-[11px] font-black uppercase tracking-widest">{styles.showTrend ? '趋势线开' : '趋势线关'}</span>
                                </button>
                            </div>

                            {/* Compact Control Row */}
                            <div className="flex items-center justify-between bg-[var(--sidebar-bg)] p-4 rounded-md border border-[var(--input-border)]">
                                {/* Point Color */}
                                <div className="flex flex-col gap-2 items-center">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)]">点色</span>
                                    <input type="color" value={styles.pointColor} onChange={e => onStylesChange({ ...styles, pointColor: e.target.value })} className="w-8 h-5 rounded bg-transparent cursor-pointer" />
                                </div>
                                <div className="w-[1px] h-8 bg-[var(--sidebar-border)]" />

                                {/* Trend Line */}
                                <div className="flex flex-col gap-2 items-center">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)]">趋势色</span>
                                    <input type="color" value={styles.trendColor} onChange={e => onStylesChange({ ...styles, trendColor: e.target.value })} className="w-8 h-5 rounded bg-transparent cursor-pointer" />
                                </div>
                                <div className="w-[1px] h-8 bg-[var(--sidebar-border)]" />

                                {/* 3D Mode */}
                                <div className="flex flex-col gap-2 items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-[var(--sidebar-text)]">3D视图</span>
                                        <Switch checked={!!(styles.is3D)} onChange={v => onStylesChange({ ...styles, is3D: v })} ariaLabel="3D视图" />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const modes: ('scatter' | 'surface')[] = ['scatter', 'surface'];
                                            const currentIdx = modes.indexOf((styles.renderMode3D as any) || 'scatter');
                                            const nextMode = modes[(currentIdx + 1) % modes.length];
                                            onStylesChange({ ...styles, renderMode3D: nextMode });
                                        }}
                                        disabled={!styles.is3D}
                                        className={`p-1.5 rounded-md border transition-all ${!styles.is3D
                                            ? 'bg-[var(--sidebar-bg)] border-[var(--input-border)] text-[var(--sidebar-muted)] cursor-not-allowed'
                                            : 'bg-primary border-primary text-white hover:bg-primary active:scale-95 shadow-sm'
                                            }`}
                                        title={styles.renderMode3D === 'surface' ? '3D曲面模式' : '3D散点模式'}
                                    >
                                        {styles.renderMode3D === 'surface' ? <Waves size={14} /> : <Box size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Sliders Row */}
                            <div className="grid grid-cols-2 gap-4 pt-1">
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] uppercase">大小 ({styles.baseSize})</span>
                                    <input type="range" min="2" max="20" value={styles.baseSize} onChange={e => onStylesChange({ ...styles, baseSize: parseInt(e.target.value) })} className="w-full h-1 bg-[var(--sidebar-border)] rounded-md appearance-none cursor-pointer" />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] uppercase">透明度 ({styles.opacity})</span>
                                    <input type="range" min="0.1" max="1" step="0.05" value={styles.opacity} onChange={e => onStylesChange({ ...styles, opacity: parseFloat(e.target.value) })} className="w-full h-1 bg-[var(--sidebar-border)] rounded-md appearance-none cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col gap-6">
                        <textarea value={dsl} onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }} className="iqs-input iqs-code flex-1 min-h-[400px] resize-y" spellCheck={false} />
                    </div>
                ) : (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能相关性推演</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="输入描述，例如：'分析广告投入与销售额的关系，生成模拟数据'..."
                            />

                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`shrink-0 ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-[var(--text-warn)]" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在执行相关性分析...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            <div className="iqs-note space-y-3 shrink-0">
                                <p className="text-[11px] font-black text-[var(--text-warn)] uppercase tracking-widest">推理提示</p>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以输入变量间的因果猜想（如“温度对粘度的影响”）或具体的数据分布特征。AI 将为您模拟符合科学规律的点集，并自动计算初步的回归趋势。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Docs Modal */}
            {showDocs && (
                <CardDocModal kind="scatter" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
        
    );
};

export default ScatterEditor;
