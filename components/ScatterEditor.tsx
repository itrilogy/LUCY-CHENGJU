import React, { useState, useEffect, useRef } from 'react';
import {
    createPortal } from 'react-dom';
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
    Zap
} from 'lucide-react';
import { generateScatterDSL, getAIStatus } from '../services/aiService';

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
                    id: Math.random().toString(36).substr(2, 9),
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
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [manualInput, setManualInput] = useState('');

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiConfig, setAiConfig] = useState<any>(null);
    const [engineName, setEngineName] = useState('DeepSeek');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

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

    // Load AI Config
    useEffect(() => {
        fetch('/chart_spec.json')
            .then(res => res.json())
            .then(config => setAiConfig(config))
            .catch(err => console.error('Failed to load AI config:', err));
    }, []);

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
                    id: Math.random().toString(36).substr(2, 9),
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

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？当前所有修改将丢失。')) {
            setDsl(INITIAL_SCATTER_DSL);
            handleParseDSL(INITIAL_SCATTER_DSL);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative transition-colors">
            {/* Header */}
            <div className="p-6 border-b border-[var(--sidebar-border)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                            <Cpu size={22} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">相关性散点图分析</h2>
                            <p className="text-[8px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Scatter Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="p-3 bg-[var(--card-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-amber-400 transition-all border border-[var(--sidebar-border)] shadow-sm"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button onClick={() => setShowDocs(true)} className="p-3 bg-[var(--card-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-blue-600 transition-all border border-[var(--sidebar-border)] shadow-sm">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>
                <nav className="flex bg-[var(--input-bg)] p-1.5 rounded-lg border border-[var(--input-border)] gap-1">
                    {[{ id: 'manual', label: '手动录入', icon: <Database size={14} /> }, { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> }, { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }].map(t => (
                        <button key={t.id} onClick={() => handleTabChange(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-amber-600 text-white shadow-xl' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'}`}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'manual' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Title & Axes */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-amber-500" />
                                <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图表元数据</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <input value={styles.title || ''} onChange={e => onStylesChange({ ...styles, title: e.target.value })} className="w-full h-10 px-4 logic-terminal-input text-xs font-bold bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--sidebar-text)]" placeholder="图表标题" />
                                <div className="grid grid-cols-3 gap-3">
                                    <input value={styles.xAxisLabel || ''} onChange={e => onStylesChange({ ...styles, xAxisLabel: e.target.value })} className="w-full h-10 px-4 logic-terminal-input text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--sidebar-text)]" placeholder="X轴标签" />
                                    <input value={styles.yAxisLabel || ''} onChange={e => onStylesChange({ ...styles, yAxisLabel: e.target.value })} className="w-full h-10 px-4 logic-terminal-input text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--sidebar-text)]" placeholder="Y轴标签" />
                                    <input value={styles.zAxisLabel || ''} onChange={e => onStylesChange({ ...styles, zAxisLabel: e.target.value })} className="w-full h-10 px-4 logic-terminal-input text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--sidebar-text)]" placeholder="Z轴标签" />
                                </div>
                            </div>
                        </div>

                        {/* Data Input */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pl-2">
                                <div className="flex items-center gap-3">
                                    <ChevronRight size={14} className="text-amber-500" />
                                    <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">坐标数据 (X, Y, [Z])</span>
                                </div>
                                <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">N={data.length}</span>
                            </div>
                            <textarea
                                value={manualInput}
                                onChange={e => handleManualChange(e.target.value)}
                                className="w-full h-96 bg-[var(--input-bg)] text-[var(--sidebar-text)] p-4 font-mono text-xs border border-[var(--input-border)] rounded-lg resize-none focus:border-amber-500/50 focus:outline-none"
                                placeholder={"10.5, 20.3\n15.2, 25.1\n..."}
                                spellCheck={false}
                            />
                        </div>

                        {/* Configuration */}
                        <div className="p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-4">
                            <div className="flex items-center gap-4 border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">样式配置</span>
                            </div>

                            {/* Switches Row */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => onStylesChange({ ...styles, showValues: !styles.showValues })}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${styles.showValues ? 'bg-amber-600 border-amber-500 text-white' : 'bg-[var(--sidebar-bg)] border-[var(--input-border)] text-[var(--sidebar-muted)]'}`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">{styles.showValues ? '显示数值' : '隐藏数值'}</span>
                                </button>
                                <button
                                    onClick={() => onStylesChange({ ...styles, showTrend: !styles.showTrend })}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${styles.showTrend ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[var(--sidebar-bg)] border-[var(--input-border)] text-[var(--sidebar-muted)]'}`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">{styles.showTrend ? '趋势线开' : '趋势线关'}</span>
                                </button>
                            </div>

                            {/* Compact Control Row */}
                            <div className="flex items-center justify-between bg-[var(--sidebar-bg)] p-4 rounded-lg border border-[var(--input-border)]">
                                {/* Point Color */}
                                <div className="flex flex-col gap-2 items-center">
                                    <span className="text-[10px] font-bold text-[var(--sidebar-text)]">点色</span>
                                    <input type="color" value={styles.pointColor} onChange={e => onStylesChange({ ...styles, pointColor: e.target.value })} className="w-8 h-5 rounded bg-transparent cursor-pointer" />
                                </div>
                                <div className="w-[1px] h-8 bg-[var(--sidebar-border)]" />

                                {/* Trend Line */}
                                <div className="flex flex-col gap-2 items-center">
                                    <span className="text-[10px] font-bold text-[var(--sidebar-text)]">趋势色</span>
                                    <input type="color" value={styles.trendColor} onChange={e => onStylesChange({ ...styles, trendColor: e.target.value })} className="w-8 h-5 rounded bg-transparent cursor-pointer" />
                                </div>
                                <div className="w-[1px] h-8 bg-[var(--sidebar-border)]" />

                                {/* 3D Mode */}
                                <div className="flex flex-col gap-2 items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-[var(--sidebar-text)]">3D视图</span>
                                        <input type="checkbox" checked={styles.is3D} onChange={e => onStylesChange({ ...styles, is3D: e.target.checked })} className="w-4 h-4 rounded border-[var(--input-border)] text-amber-600 focus:ring-amber-500" />
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
                                            : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 active:scale-95 shadow-sm'
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
                                    <span className="text-[10px] font-bold text-[var(--sidebar-text)] uppercase">大小 ({styles.baseSize})</span>
                                    <input type="range" min="2" max="20" value={styles.baseSize} onChange={e => onStylesChange({ ...styles, baseSize: parseInt(e.target.value) })} className="w-full h-1 bg-[var(--sidebar-border)] rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-[var(--sidebar-text)] uppercase">透明度 ({styles.opacity})</span>
                                    <input type="range" min="0.1" max="1" step="0.05" value={styles.opacity} onChange={e => onStylesChange({ ...styles, opacity: parseFloat(e.target.value) })} className="w-full h-1 bg-[var(--sidebar-border)] rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <textarea value={dsl} onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }} className="w-full h-full bg-[var(--input-bg)] text-[var(--sidebar-text)] p-6 font-mono text-xs border border-[var(--input-border)] rounded-lg resize-none focus:outline-none" spellCheck={false} />
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能相关性推演</span>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                className="w-full  rounded-lg "
                                placeholder="输入描述，例如：'分析广告投入与销售额的关系，生成模拟数据'..."
                            />

                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-lg flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-[var(--sidebar-muted)]' : 'bg-amber-600 hover:bg-amber-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-amber-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在执行相关性分析...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            <div className="p-8 bg-amber-900/10 border border-amber-800/20 rounded-lg space-y-4">
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">推理提示</p>
                                <p className="text-xs text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以输入变量间的因果猜想（如“温度对粘度的影响”）或具体的数据分布特征。AI 将为您模拟符合科学规律的点集，并自动计算初步的回归趋势。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Docs Modal */}
            {showDocs && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md transition-all">
                    <div className="bg-[var(--sidebar-bg)] w-[800px] max-h-[85vh] rounded-lg border border-[var(--sidebar-border)] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="px-10 py-8 flex flex-col border-b border-[var(--sidebar-border)] shrink-0 gap-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-600/20 rounded-lg border border-amber-500/30">
                                        <ScatterIcon size={24} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--sidebar-text)] uppercase tracking-tighter">散点图知识库</h3>
                                        <p className="text-[10px] text-[var(--sidebar-muted)] font-bold uppercase tracking-widest mt-1">Correlation Knowledge Base V1.2</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDocs(false)} className="p-3 hover:bg-[var(--card-bg)] rounded-lg transition-all text-[var(--sidebar-text)] hover:text-amber-500">
                                    <X size={24} />
                                </button>
                            </div>

                            <nav className="flex bg-[var(--input-bg)] p-1 rounded-lg border border-[var(--input-border)] w-fit">
                                {[
                                    { id: 'dsl', label: 'DSL 规范说明' },
                                    { id: 'logic', label: '分析逻辑与指南' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setDocTab(t.id as any)}
                                        className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-amber-600 text-white shadow-lg' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar text-[var(--sidebar-muted)]">
                            {docTab === 'dsl' ? (
                                <div className="space-y-12 font-mono text-xs">
                                    <section className="space-y-4">
                                        <h4 className="text-amber-500 font-bold uppercase tracking-wider text-[10px] mb-2">基础元数据</h4>
                                        <div className="grid grid-cols-1 gap-3 p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)]">
                                            <p className="text-[var(--sidebar-text)]"><span className="text-amber-400 font-bold">Title:</span> 图表标题</p>
                                            <p className="text-[var(--sidebar-text)]"><span className="text-amber-400 font-bold">XAxis:</span> X轴标签</p>
                                            <p className="text-[var(--sidebar-text)]"><span className="text-amber-400 font-bold">YAxis:</span> Y轴标签</p>
                                            <p className="text-[var(--sidebar-text)]"><span className="text-amber-400 font-bold">ZAxis:</span> Z轴标签 (用于3D视图及气泡大小)</p>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-blue-500 font-bold uppercase tracking-wider text-[10px] mb-2">样式控制</h4>
                                        <div className="grid grid-cols-1 gap-3 p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)]">
                                            <p className="text-[var(--sidebar-text)]"><span className="text-blue-400 font-bold">Color[Point]:</span> #HEX (点颜色)</p>
                                            <p className="text-[var(--sidebar-text)]"><span className="text-blue-400 font-bold">Color[Trend]:</span> #HEX (趋势线颜色)</p>
                                            <p className="text-[var(--sidebar-text)]"><span className="text-blue-400 font-bold">Size[Base]:</span> Number (基准点大小, 默认10)</p>
                                            <p className="text-[var(--sidebar-text)]"><span className="text-blue-400 font-bold">Opacity:</span> 0.1-1.0 (点透明度)</p>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-emerald-500 font-bold uppercase tracking-wider text-[10px] mb-2">功能开关</h4>
                                        <div className="grid grid-cols-1 gap-3 p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)]">
                                            <p className="text-[var(--sidebar-text)]"><span className="text-emerald-400 font-bold">ShowTrend:</span> true/false (显示回归线)</p>
                                            <p className="text-[var(--sidebar-text)]"><span className="text-emerald-400 font-bold">ShowValues:</span> true/false (显示数据标记)</p>
                                            <p className="text-[var(--sidebar-text)]"><span className="text-emerald-400 font-bold">3D:</span> true/false (启用3D模式)</p>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-[var(--sidebar-text)] font-bold uppercase tracking-wider text-[10px] mb-2">数据格式</h4>
                                        <div className="p-6 bg-[var(--card-bg)] rounded-lg border border-[var(--input-border)] space-y-4">
                                            <p className="text-[var(--sidebar-muted)] mb-2">使用 "- " 开头定义数据点，格式为 X, Y, [Z]</p>
                                            <code className="block p-4 bg-[var(--sidebar-bg)] rounded-lg space-y-1">
                                                <p className="text-[var(--sidebar-muted)]/60"># 格式示例</p>
                                                <p>- <span className="text-amber-400">10.5</span>, <span className="text-blue-400">20.2</span> <span className="text-[var(--sidebar-muted)]/60">// X, Y (2D)</span></p>
                                                <p>- <span className="text-amber-400">15.0</span>, <span className="text-blue-400">30.5</span>, <span className="text-emerald-400">50</span> <span className="text-[var(--sidebar-muted)]/60">// X, Y, Z (3D/Bubble)</span></p>
                                            </code>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest border-b border-amber-500/20 pb-2">相关性分析 (Correlation)</h4>
                                        <div className="p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-4 text-xs leading-relaxed text-[var(--sidebar-text)]">
                                            <p>散点图是判断两个（或三个）变量之间是否存在相关关系的数学工具。通过观察点集的分布形态，可以得出以下结论：</p>
                                            <ul className="list-disc list-inside space-y-2">
                                                <li><strong>正相关</strong>: X 增加，Y 也随之增加。</li>
                                                <li><strong>负相关</strong>: X 增加，Y 随之减少。</li>
                                                <li><strong>不相关</strong>: 点集呈杂乱分布，无明显趋势。</li>
                                            </ul>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-blue-500 uppercase tracking-widest border-b border-blue-500/20 pb-2">回归分析 (Regression)</h4>
                                        <div className="p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-4 text-xs leading-relaxed text-[var(--sidebar-text)]">
                                            <p>系统自动计算线性回归线，作为预测模型的基础。通过趋势线，我们可以对未知的 X 值预测其对应的 Y 值位置。</p>
                                        </div>
                                    </section>

                                    <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap size={14} className="text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase text-indigo-500">专家提示</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--sidebar-text)] font-medium italic mb-2">
                                            "相关性并不等同于因果关系。两个变量表现出强相关，可能是因为它们共同受第三个隐藏变量的影响。"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-10 border-t border-[var(--sidebar-border)] bg-[var(--input-bg)] flex justify-center shrink-0">
                            <button
                                onClick={() => setShowDocs(false)}
                                className="px-16 py-4 bg-amber-600 text-white font-black rounded-lg text-[10px] uppercase tracking-widest shadow-xl hover:bg-amber-500 transition-all font-sans"
                            >
                                已阅读规范
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
        
    );
};

export default ScatterEditor;
