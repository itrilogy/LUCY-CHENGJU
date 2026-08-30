import React, { useState, useEffect, useRef } from 'react';
import {
    createPortal } from 'react-dom';
import { BasicChartData,
    BasicChartStyles,
    DEFAULT_BASIC_STYLES,
    BasicChartDataset } from '../types';
import { INITIAL_BASIC_DSL,
    INITIAL_BASIC_DATA } from '../constants';
import { BarChart3,
    Sparkles,
    HelpCircle,
    X,
    Loader2,
    Database,
    Code,
    ChevronRight,
    Layout,
    Palette,
    Settings2,
    RotateCcw,
    ArrowUpDown,
    ArrowUpAZ,
    ArrowDownAZ,
    Cpu,
    Zap
} from 'lucide-react';
import { generateBasicDSL, getAIStatus } from '../services/aiService';

interface BasicEditorProps {
    data: BasicChartData;
    styles: BasicChartStyles;
    onDataChange: (data: BasicChartData) => void;
    onStylesChange: (styles: BasicChartStyles) => void;
}

export const parseBasicDSL = (content: string, baseStyles: BasicChartStyles = DEFAULT_BASIC_STYLES) => {
    const lines = content.split('\n');
    const newStyles: BasicChartStyles = { ...baseStyles };
    const newDatasets: BasicChartDataset[] = [];
    let titleFromDSL = '';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (trimmed.includes(':')) {
            const [keyPart, ...valParts] = trimmed.split(':');
            const key = keyPart.trim();
            const val = valParts.join(':').trim();

            if (key === 'Title') {
                titleFromDSL = val;
                newStyles.title = val;
            } else if (key === 'Type') {
                newStyles.type = val.toLowerCase() as any;
            } else if (key === 'View') {
                newStyles.view = val.toLowerCase() as any;
            } else if (key === 'Stacked') {
                newStyles.stacked = val.toLowerCase() === 'true';
            } else if (key === 'Smooth') {
                newStyles.smooth = val.toLowerCase() === 'true';
            } else if (key === 'ShowValues') {
                newStyles.showValues = val.toLowerCase() === 'true';
            } else if (key === 'ShowLegend') {
                newStyles.showLegend = val.toLowerCase() !== 'false';
            } else if (key === 'Grid' || key === 'ShowGrid') {
                newStyles.grid = val.toLowerCase() !== 'false';
            } else if (key.startsWith('Color[')) {
                const subKey = key.match(/Color\[(.*?)\]/)?.[1];
                if (subKey === 'Title') newStyles.titleColor = val;
                if (subKey === 'Bg') newStyles.backgroundColor = val;
            } else if (key.startsWith('Font[')) {
                const subKey = key.match(/Font\[(.*?)\]/)?.[1];
                if (subKey === 'Title') newStyles.titleFontSize = parseInt(val);
                if (subKey === 'Base') newStyles.baseFontSize = parseInt(val);
            } else if (key === 'Axis') {
                // Axis: Label, X/Y/Y2...
                // We mainly use AxisMatch in Dataset, but we can store these labels if needed.
                // For this implementation, we mostly rely on Dataset name and match.
            } else if (key === 'Dataset') {
                // Dataset: Name, [Values], Color, AxisMatch
                const parts = val.split(/,(?![^\[]*\])/).map(s => s.trim());
                if (parts.length >= 2) {
                    const name = parts[0];
                    const valuesStr = parts[1].replace(/[\[\]]/g, '');
                    const values = valuesStr.split(',').map(v => {
                        const num = parseFloat(v.trim());
                        return isNaN(num) ? v.trim() : num;
                    });
                    const color = parts[2] && parts[2] !== 'null' ? parts[2] : undefined;
                    const axisMatch = (parts[3] || 'Y').toUpperCase() as any;

                    newDatasets.push({ name, values, color, axisMatch });
                }
            }
        }
    });

    return {
        data: { title: titleFromDSL || baseStyles.title || '图表', type: newStyles.type || 'bar', datasets: newDatasets },
        styles: newStyles
    };
};

const BasicEditor: React.FC<BasicEditorProps> = ({ data, styles, onDataChange, onStylesChange }) => {
    const [dsl, setDsl] = useState(INITIAL_BASIC_DSL);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [manualInput, setManualInput] = useState('');

    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [engineName, setEngineName] = useState('DeepSeek');
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    const isInitialized = useRef(false);
    useEffect(() => {
        if (!isInitialized.current) {
            if (data.datasets.length === 0) {
                handleParseDSL(INITIAL_BASIC_DSL);
            } else {
                setDsl(generateDSLFromState(data, styles));
            }
            isInitialized.current = true;
        }
    }, [data]);

    function generateDSLFromState(currentData: BasicChartData, currentStyles: BasicChartStyles) {
        let lines: string[] = [];
        lines.push(`Title: ${currentStyles.title || currentData.title}`);
        lines.push(`Type: ${currentStyles.type}`);
        if (currentStyles.view) lines.push(`View: ${currentStyles.view}`);
        if (currentStyles.stacked) lines.push(`Stacked: ${currentStyles.stacked}`);
        if (currentStyles.smooth && currentStyles.type === 'line') lines.push(`Smooth: ${currentStyles.smooth}`);
        lines.push(`ShowValues: ${currentStyles.showValues}`);

        lines.push('');
        currentData.datasets.forEach(ds => {
            lines.push(`Dataset: ${ds.name}, [${ds.values.join(', ')}], ${ds.color || 'null'}, ${ds.axisMatch}`);
        });

        return lines.join('\n');
    }

    const handleTabChange = (tab: 'manual' | 'dsl' | 'ai') => {
        if (tab === 'dsl') setDsl(generateDSLFromState(data, styles));
        setActiveTab(tab);
    };

    const handleParseDSL = (content: string) => {
        const { data: newData, styles: newStyles } = parseBasicDSL(content, styles);
        onDataChange(newData);
        onStylesChange(newStyles);
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateBasicDSL(aiPrompt);
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
            setDsl(INITIAL_BASIC_DSL);
            handleParseDSL(INITIAL_BASIC_DSL);
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
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">基础图表分析</h2>
                            <p className="text-[8px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Basic Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleReset} className="p-3 bg-[var(--card-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-blue-400 transition-all border border-[var(--sidebar-border)] shadow-sm" title="恢复示例">
                            <RotateCcw size={18} />
                        </button>
                        <button onClick={() => setShowDocs(true)} className="p-3 bg-[var(--card-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-blue-600 transition-all border border-[var(--sidebar-border)] shadow-sm">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>
                <nav className="flex bg-[var(--input-bg)] p-1.5 rounded-lg border border-[var(--input-border)] gap-1">
                    {[{ id: 'manual', label: '快捷配置', icon: <Settings2 size={14} /> }, { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> }, { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }].map(t => (
                        <button key={t.id} onClick={() => handleTabChange(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-xl' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'}`}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'manual' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Title & Metadata */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">基础样式</span>
                            </div>
                            <div className="space-y-3">
                                <input
                                    value={styles.title || ''}
                                    onChange={e => {
                                        const newTitle = e.target.value;
                                        onStylesChange({ ...styles, title: newTitle });
                                        onDataChange({ ...data, title: newTitle });
                                    }}
                                    className="w-full h-10 px-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs font-bold focus:outline-none focus:border-blue-500 text-[var(--sidebar-text)]"
                                    placeholder="图表标题"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-3 bg-[var(--input-bg)] px-3 h-10 rounded-lg border border-[var(--input-border)]">
                                        <Palette size={14} className="text-[var(--sidebar-muted)]" />
                                        <input type="color" value={styles.titleColor || '#0f172a'} onChange={e => onStylesChange({ ...styles, titleColor: e.target.value })} className="w-6 h-4 bg-transparent cursor-pointer" />
                                        <span className="text-[10px] font-bold text-[var(--sidebar-text)] uppercase">标题颜色</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-[var(--input-bg)] px-3 h-10 rounded-lg border border-[var(--input-border)]">
                                        <Layout size={14} className="text-[var(--sidebar-muted)]" />
                                        <input type="color" value={styles.backgroundColor || '#ffffff'} onChange={e => onStylesChange({ ...styles, backgroundColor: e.target.value })} className="w-6 h-4 bg-transparent cursor-pointer" />
                                        <span className="text-[10px] font-bold text-[var(--sidebar-text)] uppercase">画布背景</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Type & View & Sort */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图表与排序</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">图表类型</label>
                                    <select
                                        value={styles.type}
                                        onChange={e => {
                                            const newType = e.target.value as any;
                                            onStylesChange({ ...styles, type: newType });
                                            onDataChange({ ...data, type: newType });
                                        }}
                                        className="w-full h-10 px-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs font-bold focus:outline-none focus:border-blue-500 text-[var(--sidebar-text)]"
                                    >
                                        <option value="bar">柱状图 (Bar)</option>
                                        <option value="line">折线图 (Line)</option>
                                        <option value="pie">饼图 (Pie)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">视图与排序</label>
                                    <div className="flex gap-1 bg-[var(--input-bg)] p-1 rounded-lg border border-[var(--input-border)] h-10">
                                        <div className="flex flex-1 gap-1">
                                            <button
                                                onClick={() => onStylesChange({ ...styles, view: 'v' })}
                                                className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${styles.view === 'v' ? 'bg-blue-600 text-white' : 'text-[var(--sidebar-muted)]'}`}
                                                disabled={styles.type === 'pie'}
                                            >垂直</button>
                                            <button
                                                onClick={() => onStylesChange({ ...styles, view: 'h' })}
                                                className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${styles.view === 'h' ? 'bg-blue-600 text-white' : 'text-[var(--sidebar-muted)]'}`}
                                                disabled={styles.type === 'pie'}
                                            >水平</button>
                                        </div>
                                        <div className="w-px h-4 bg-[var(--sidebar-border)] self-center mx-0.5" />
                                        <button
                                            onClick={() => {
                                                const modes: ('none' | 'asc' | 'desc')[] = ['none', 'asc', 'desc'];
                                                const next = modes[(modes.indexOf(styles.sortMode || 'none') + 1) % 3];
                                                onStylesChange({ ...styles, sortMode: next });
                                            }}
                                            className={`w-8 rounded-lg flex items-center justify-center transition-all ${styles.sortMode !== 'none' ? 'text-blue-400 bg-blue-400/10' : 'text-[var(--sidebar-muted)]'}`}
                                            title="排序循环"
                                        >
                                            {styles.sortMode === 'asc' ? <ArrowUpAZ size={14} /> :
                                                styles.sortMode === 'desc' ? <ArrowDownAZ size={14} /> :
                                                    <ArrowUpDown size={14} className="opacity-40" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="p-4 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={styles.stacked} onChange={e => onStylesChange({ ...styles, stacked: e.target.checked })} className="w-4 h-4 rounded border-[var(--input-border)] bg-[var(--sidebar-bg)] text-blue-600 focus:ring-blue-500" />
                                <span className="text-[10px] font-bold text-[var(--sidebar-text)] group-hover:text-blue-500 uppercase tracking-wider">堆叠模式</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={styles.smooth} onChange={e => onStylesChange({ ...styles, smooth: e.target.checked })} className="w-4 h-4 rounded border-[var(--input-border)] bg-[var(--sidebar-bg)] text-blue-600 focus:ring-blue-500" />
                                <span className="text-[10px] font-bold text-[var(--sidebar-text)] group-hover:text-blue-500 uppercase tracking-wider">平滑曲线</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={styles.showLegend} onChange={e => onStylesChange({ ...styles, showLegend: e.target.checked })} className="w-4 h-4 rounded border-[var(--input-border)] bg-[var(--sidebar-bg)] text-blue-600 focus:ring-blue-500" />
                                <span className="text-[10px] font-bold text-[var(--sidebar-text)] group-hover:text-blue-500 uppercase tracking-wider">显示图例</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={styles.grid} onChange={e => onStylesChange({ ...styles, grid: e.target.checked })} className="w-4 h-4 rounded border-[var(--input-border)] bg-[var(--sidebar-bg)] text-blue-600 focus:ring-blue-500" />
                                <span className="text-[10px] font-bold text-[var(--sidebar-text)] group-hover:text-blue-500 uppercase tracking-wider">网格线</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={styles.showValues} onChange={e => onStylesChange({ ...styles, showValues: e.target.checked })} className="w-4 h-4 rounded border-[var(--input-border)] bg-[var(--sidebar-bg)] text-blue-600 focus:ring-blue-500" />
                                <span className="text-[10px] font-bold text-[var(--sidebar-text)] group-hover:text-blue-500 uppercase tracking-wider">显示数值</span>
                            </label>
                        </div>

                        {/* Dynamic Series Color Pickers */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图例颜色配置及排序</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 px-1">
                                {data.datasets.filter(ds => ds.axisMatch !== 'X').map((ds, idx) => (
                                    <div
                                        key={idx}
                                        draggable
                                        onDragStart={() => setDraggedIdx(idx)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            if (draggedIdx === null || draggedIdx === idx) return;

                                            // Reorder logic
                                            const xDataset = data.datasets.find(d => d.axisMatch === 'X');
                                            const numericals = data.datasets.filter(d => d.axisMatch !== 'X');
                                            const newNumericals = [...numericals];
                                            const [moved] = newNumericals.splice(draggedIdx, 1);
                                            newNumericals.splice(idx, 0, moved);

                                            const newDatasets = xDataset ? [xDataset, ...newNumericals] : newNumericals;
                                            const newData = { ...data, datasets: newDatasets };
                                            onDataChange(newData);
                                            setDsl(generateDSLFromState(newData, styles));
                                            setDraggedIdx(null);
                                        }}
                                        className={`flex flex-col items-center gap-1.5 p-2 bg-[var(--input-bg)] rounded-lg border transition-all group cursor-move ${draggedIdx === idx ? 'opacity-40 border-blue-500' : 'border-[var(--input-border)] hover:border-blue-500/50'}`}
                                    >
                                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[var(--input-border)] flex-shrink-0 pointer-events-none">
                                            <div
                                                className="absolute inset-0 cursor-pointer"
                                                style={{ backgroundColor: ds.color || '#3b82f6' }}
                                            />
                                            <input
                                                type="color"
                                                value={ds.color || '#3b82f6'}
                                                onChange={e => {
                                                    const newColor = e.target.value;
                                                    const newDatasets = data.datasets.map(item =>
                                                        item.name === ds.name ? { ...item, color: newColor } : item
                                                    );
                                                    const newData = { ...data, datasets: newDatasets };
                                                    onDataChange(newData);
                                                    setDsl(generateDSLFromState(newData, styles));
                                                }}
                                                className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer opacity-0"
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-[var(--sidebar-text)] truncate w-full text-center group-hover:text-blue-500 transition-colors uppercase pointer-events-none" title={ds.name}>
                                            {ds.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-blue-900/10 border border-blue-800/20 rounded-lg">
                            <p className="text-[9px] text-blue-400 font-bold leading-relaxed uppercase">
                                💡 提示：高级数据及多轴配置建议通过 DSL 编辑器进行精确调整。
                            </p>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <textarea
                        value={dsl}
                        onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }}
                        className="w-full h-96 bg-[var(--input-bg)] text-[var(--sidebar-text)] p-6 font-mono text-xs border border-[var(--input-border)] rounded-lg resize-none focus:outline-none focus:border-blue-500/50 shadow-inner"
                        spellCheck={false}
                    />
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能图表分析描述</span>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                className="w-full  rounded-lg "
                                placeholder="输入数据或趋势描述，例如：'对比2023和2024四个季度的营收情况，23年分别是100,120,150,180，24年同比增长20%'..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-lg flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-[var(--sidebar-muted)]' : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-blue-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在精准推演...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            <div className="p-8 bg-blue-900/10 border border-blue-800/20 rounded-lg space-y-4">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">推理提示</p>
                                <p className="text-xs text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以输入自然语言描述的数据序列或分析需求。AI 将自动解析时间维度与数值维度，为您生成包含合适颜色、轴绑定以及标题的完整 DSL 配置。支持多系列与双轴逻辑识别。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md transition-all">
                    <div className="bg-[var(--sidebar-bg)] w-[800px] max-h-[85vh] rounded-lg border border-[var(--sidebar-border)] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="px-10 py-8 flex flex-col border-b border-[var(--sidebar-border)] shrink-0 gap-6 bg-[var(--sidebar-bg)]/80 backdrop-blur-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-600/20 rounded-lg border border-blue-500/30">
                                        <BarChart3 size={24} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--sidebar-text)] uppercase tracking-tighter">基础图表知识库</h3>
                                        <p className="text-[10px] text-[var(--sidebar-muted)] font-bold uppercase tracking-widest mt-1">Basic Chart Logic Base V1.2</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDocs(false)} className="p-3 hover:bg-slate-800 rounded-lg transition-all text-slate-200 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <nav className="flex bg-[var(--card-bg)] p-1 rounded-lg border border-[var(--sidebar-border)] w-fit">
                                {[
                                    { id: 'dsl', label: 'DSL 规范说明' },
                                    { id: 'logic', label: '分析逻辑与指南' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setDocTab(t.id as any)}
                                        className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-200 hover:text-slate-300'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar text-[var(--sidebar-muted)]">
                            {docTab === 'dsl' ? (
                                <div className="space-y-12">
                                    <div className="font-mono text-xs space-y-6">
                                        <section>
                                            <h4 className="text-blue-500 font-bold uppercase tracking-wider text-[10px] mb-3">关键配置</h4>
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px]">
                                                <p><span className="text-blue-400 font-bold">Type:</span> bar | line | pie</p>
                                                <p><span className="text-blue-400 font-bold">View:</span> v | h (柱状图/折线图方向)</p>
                                                <p><span className="text-blue-400 font-bold">Stacked:</span> true | false (堆叠模式)</p>
                                                <p><span className="text-blue-400 font-bold">Smooth:</span> true | false (平滑曲线)</p>
                                                <p><span className="text-blue-400 font-bold">ShowMarkers:</span> true | false (显示数据标记)</p>
                                                <p><span className="text-blue-400 font-bold">ShowLegend:</span> true | false (图例开关)</p>
                                                <p><span className="text-blue-400 font-bold">Grid:</span> true | false (网格线开关)</p>
                                            </div>
                                        </section>
                                        <section className="border-t border-slate-800 pt-6">
                                            <h4 className="text-indigo-500 font-bold uppercase tracking-wider text-[10px] mb-3">样式控制</h4>
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px]">
                                                <p><span className="text-indigo-400 font-bold">Color[Title]:</span> #HEX</p>
                                                <p><span className="text-indigo-400 font-bold">Color[Bg]:</span> #HEX</p>
                                                <p><span className="text-indigo-400 font-bold">Font[Title]:</span> [Size]</p>
                                                <p><span className="text-indigo-400 font-bold">Font[Base]:</span> [Size]</p>
                                            </div>
                                        </section>
                                        <section className="border-t border-slate-800 pt-6">
                                            <h4 className="text-emerald-500 font-bold uppercase tracking-wider text-[10px] mb-3">数据与轴映射 (Dataset)</h4>
                                            <div className="bg-[var(--card-bg)] p-4 rounded-lg border border-[var(--input-border)] text-[var(--sidebar-text)] text-[11px] font-mono leading-relaxed">
                                                <p className="text-blue-400 mb-2">// 语法: Dataset: 名称, [值列表], 颜色, 轴绑定</p>
                                                <p>Dataset: 季度, [Q1, Q2, Q3], null, X</p>
                                                <p>Dataset: 销售, [100, 200, 300], #3b82f6, Y</p>
                                                <p>Dataset: 增长, [10, 20, 30], null, Y2</p>
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-blue-900/50 pb-2">图表类型选择</h4>
                                        <div className="p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-4 text-xs leading-relaxed text-[var(--sidebar-text)]">
                                            <p>根据数据特性和分析目标选择合适的图表：</p>
                                            <ul className="list-disc list-inside space-y-2">
                                                <li><strong>柱状图 (Bar)</strong>: 强调个体之间的比较。</li>
                                                <li><strong>折线图 (Line)</strong>: 展示随时间或其他连续维度的变化趋势。</li>
                                                <li><strong>饼图 (Pie)</strong>: 反映组成部分与整体的比例关系。</li>
                                            </ul>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-900/50 pb-2">多维对比逻辑</h4>
                                        <div className="p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-4 text-xs leading-relaxed text-[var(--sidebar-text)]">
                                            <p>利用双轴 (Y2) 和堆叠模式，可以实现在同一画布上对不同量级或不同性质的数据进行综合分析。</p>
                                        </div>
                                    </section>

                                    <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap size={14} className="text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase text-indigo-500">专家建议</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--sidebar-text)] font-medium italic mb-2">
                                            "避免在同一个柱状图中展示超过 7 个分类，以免造成视觉拥挤和理解困难。"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-10 border-t border-[var(--sidebar-border)] bg-[var(--input-bg)] flex justify-center shrink-0">
                            <button
                                onClick={() => setShowDocs(false)}
                                className="px-16 py-4 bg-blue-600 text-white font-black rounded-lg text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all font-sans"
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

export default BasicEditor;
