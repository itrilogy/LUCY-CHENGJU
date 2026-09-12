import React, { useState, useEffect, useRef } from 'react';
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
    Zap,
    AlertTriangle,
} from 'lucide-react';
import {generateBasicDSL} from '../services/aiService';
import { CardDocModal } from './CardDocModal';
import { Switch } from './ui/Switch';
import { useAIEngine } from '../hooks/useAIEngine';
import { ConfirmInline } from '../components/ui/ConfirmInline';

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
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [manualInput, setManualInput] = useState('');

    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const engineName = useAIEngine();
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);


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

    const doReset = () => {
            setDsl(INITIAL_BASIC_DSL);
            handleParseDSL(INITIAL_BASIC_DSL);
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
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">基础图表分析</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Basic Engine | LUXI LAB</p>
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
                        <button onClick={() => setConfirmReset(true)} disabled={confirmReset} className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--border-line-r)] shadow-sm" title="恢复示例">
                            <RotateCcw size={18} />
                        </button>
                        <button onClick={() => setShowDocs(true)} className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--border-line-r)] shadow-sm">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>
                <nav className="flex bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)] gap-1">
                    {[{ id: 'manual', label: '快捷配置', icon: <Settings2 size={14} /> }, { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> }, { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }].map(t => (
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
                        {/* Title & Metadata */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">基础样式</span>
                            </div>
                            <div className="space-y-3">
                                <input
                                    value={styles.title || ''}
                                    onChange={e => {
                                        const newTitle = e.target.value;
                                        onStylesChange({ ...styles, title: newTitle });
                                        onDataChange({ ...data, title: newTitle });
                                    }}
                                    className="w-full h-10 px-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-[11px] font-bold focus:outline-none text-[var(--sidebar-text)]"
                                    placeholder="图表标题"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-3 bg-[var(--input-bg)] px-3 h-10 rounded-md border border-[var(--input-border)]">
                                        <Palette size={14} className="text-[var(--sidebar-muted)]" />
                                        <input type="color" value={styles.titleColor || '#1A2428'} onChange={e => onStylesChange({ ...styles, titleColor: e.target.value })} className="w-6 h-4 bg-transparent cursor-pointer" />
                                        <span className="text-[11px] font-bold text-[var(--sidebar-text)] uppercase">标题颜色</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-[var(--input-bg)] px-3 h-10 rounded-md border border-[var(--input-border)]">
                                        <Layout size={14} className="text-[var(--sidebar-muted)]" />
                                        <input type="color" value={styles.backgroundColor || '#FFFFFF'} onChange={e => onStylesChange({ ...styles, backgroundColor: e.target.value })} className="w-6 h-4 bg-transparent cursor-pointer" />
                                        <span className="text-[11px] font-bold text-[var(--sidebar-text)] uppercase">画布背景</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Type & View & Sort */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图表与排序</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">图表类型</label>
                                    <select
                                        value={styles.type}
                                        onChange={e => {
                                            const newType = e.target.value as any;
                                            onStylesChange({ ...styles, type: newType });
                                            onDataChange({ ...data, type: newType });
                                        }}
                                        className="w-full h-10 px-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-[11px] font-bold focus:outline-none text-[var(--sidebar-text)]"
                                    >
                                        <option value="bar">柱状图 (Bar)</option>
                                        <option value="line">折线图 (Line)</option>
                                        <option value="pie">饼图 (Pie)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">视图与排序</label>
                                    <div className="flex gap-1 bg-[var(--input-bg)] p-1 rounded-md border border-[var(--input-border)] h-10">
                                        <div className="flex flex-1 gap-1">
                                            <button
                                                onClick={() => onStylesChange({ ...styles, view: 'v' })}
                                                className={`flex-1 rounded-md text-[11px] font-black uppercase transition-all ${styles.view === 'v' ? 'bg-primary text-white' : 'text-[var(--sidebar-muted)]'}`}
                                                disabled={styles.type === 'pie'}
                                            >垂直</button>
                                            <button
                                                onClick={() => onStylesChange({ ...styles, view: 'h' })}
                                                className={`flex-1 rounded-md text-[11px] font-black uppercase transition-all ${styles.view === 'h' ? 'bg-primary text-white' : 'text-[var(--sidebar-muted)]'}`}
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
                                            className={`w-8 rounded-md flex items-center justify-center transition-all ${styles.sortMode !== 'none' ? 'text-primary bg-primary/10' : 'text-[var(--sidebar-muted)]'}`}
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
                        <div className="p-4 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <Switch checked={!!(styles.stacked)} onChange={v => onStylesChange({ ...styles, stacked: v })} ariaLabel="堆叠模式" />
                                <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider">堆叠模式</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <Switch checked={!!(styles.smooth)} onChange={v => onStylesChange({ ...styles, smooth: v })} ariaLabel="平滑曲线" />
                                <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider">平滑曲线</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <Switch checked={!!(styles.showLegend)} onChange={v => onStylesChange({ ...styles, showLegend: v })} ariaLabel="显示图例" />
                                <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider">显示图例</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <Switch checked={!!(styles.grid)} onChange={v => onStylesChange({ ...styles, grid: v })} ariaLabel="网格线" />
                                <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider">网格线</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <Switch checked={!!(styles.showValues)} onChange={v => onStylesChange({ ...styles, showValues: v })} ariaLabel="显示数值" />
                                <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider">显示数值</span>
                            </label>
                        </div>

                        {/* Dynamic Series Color Pickers */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图例颜色配置及排序</span>
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
                                        className={`flex flex-col items-center gap-1.5 p-2 bg-[var(--input-bg)] rounded-md border transition-all group cursor-move ${draggedIdx === idx ? 'opacity-40 border-primary' : 'border-[var(--input-border)] hover:border-primary/50'}`}
                                    >
                                        <div className="relative w-8 h-8 rounded-md overflow-hidden border border-[var(--input-border)] flex-shrink-0 pointer-events-none">
                                            <div
                                                className="absolute inset-0 cursor-pointer"
                                                style={{ backgroundColor: ds.color || '#0D5E42' }}
                                            />
                                            <input
                                                type="color"
                                                value={ds.color || '#0D5E42'}
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
                                        <span className="text-[11px] font-bold text-[var(--sidebar-text)] truncate w-full text-center group-hover:text-primary transition-colors uppercase pointer-events-none" title={ds.name}>
                                            {ds.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 iqs-note rounded-md">
                            <p className="text-[11px] text-primary font-bold leading-relaxed uppercase">
                                💡 提示：高级数据及多轴配置建议通过 DSL 编辑器进行精确调整。
                            </p>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <textarea
                        value={dsl}
                        onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }}
                        className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                        spellCheck={false}
                    />
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] space-y-8 relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能图表分析描述</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                                placeholder="输入数据或趋势描述，例如：'对比2023和2024四个季度的营收情况，23年分别是100,120,150,180，24年同比增长20%'..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-md flex items-center justify-center gap-4 transition-all relative overflow-hidden group ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-primary" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在精准推演...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            <div className="iqs-note space-y-4">
                                <p className="text-[11px] font-black text-[var(--text-info)] uppercase tracking-widest">推理提示</p>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以输入自然语言描述的数据序列或分析需求。AI 将自动解析时间维度与数值维度，为您生成包含合适颜色、轴绑定以及标题的完整 DSL 配置。支持多系列与双轴逻辑识别。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && (
                <CardDocModal kind="basic" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
        
    );
};

export default BasicEditor;
