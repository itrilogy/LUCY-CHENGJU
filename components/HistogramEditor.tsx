import React, { useState, useEffect } from 'react';
import {
    createPortal } from 'react-dom';
import {
    Plus,
    Trash2,
    Sparkles,
    Database,
    Code,
    ChevronRight,
    BarChart2,
    HelpCircle,
    X,
    Loader2,
    RotateCcw,
    Cpu,
    Zap
} from 'lucide-react';
import { HistogramChartStyles, DEFAULT_HISTOGRAM_STYLES } from '../types';
import { generateHistogramDSL, getAIStatus } from '../services/aiService';
import { INITIAL_HISTOGRAM_DATA, INITIAL_HISTOGRAM_DSL } from '../constants';

interface Props {
    data: number[];
    styles: HistogramChartStyles;
    onUpdate: (data: number[], styles: HistogramChartStyles) => void;
}

export const parseHistogramDSL = (content: string, baseStyles: HistogramChartStyles = DEFAULT_HISTOGRAM_STYLES) => {
    const lines = content.split('\n');
    const newData: number[] = [];
    const newStyles: HistogramChartStyles = { ...baseStyles };

    lines.forEach(line => {
        const trimmed = line.trim();
        // IQS-DSL v1: // canonical; # legacy comment outside TreeBody
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        const titleMatch = trimmed.match(/^Title:\s*(.+)/);
        if (titleMatch) { newStyles.title = titleMatch[1].trim(); return; }

        const colorMatch = trimmed.match(/Color\[(Bar|Curve|USL|LSL|Target)\]:\s*(#[0-9a-fA-F]+)/i);
        if (colorMatch) {
            const key = colorMatch[1].toLowerCase() + 'Color';
            (newStyles as any)[key] = colorMatch[2];
            return;
        }

        const uslMatch = trimmed.match(/^USL:\s*([\d\.-]+)/);
        if (uslMatch) { newStyles.usl = parseFloat(uslMatch[1]); return; }
        const lslMatch = trimmed.match(/^LSL:\s*([\d\.-]+)/);
        if (lslMatch) { newStyles.lsl = parseFloat(lslMatch[1]); return; }
        const targetMatch = trimmed.match(/^Target:\s*([\d\.-]+)/);
        if (targetMatch) { newStyles.target = parseFloat(targetMatch[1]); return; }

        const binsMatch = trimmed.match(/^Bins:\s*(auto|\d+)/i);
        if (binsMatch) {
            newStyles.bins = binsMatch[1].toLowerCase() === 'auto' ? 'auto' : parseInt(binsMatch[1]);
            return;
        }

        const curveMatch = trimmed.match(/^ShowCurve:\s*(true|false)/i);
        if (curveMatch) { newStyles.showCurve = curveMatch[1].toLowerCase() === 'true'; return; }

        const showValuesMatch = trimmed.match(/^ShowValues:\s*(true|false)/i);
        if (showValuesMatch) { newStyles.showValues = showValuesMatch[1].toLowerCase() === 'true'; return; }

        const dataMatch = trimmed.match(/^-\s*([\d\.-]+)/);
        if (dataMatch) {
            const v = parseFloat(dataMatch[1]);
            if (!isNaN(v)) newData.push(v);
        }
    });

    return { data: newData, styles: newStyles };
};

export const HistogramEditor: React.FC<Props> = ({ data, styles, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [dsl, setDsl] = useState('');
    const [aiInput, setAiInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [rawDataInput, setRawDataInput] = useState('');
    const [engineName, setEngineName] = useState('DeepSeek');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    // Sync raw input when data changes externally
    useEffect(() => {
        setRawDataInput(data.join('\n'));
    }, [data]);

    // Initial DSL sync
    useEffect(() => {
        setDsl(generateDSL(data, styles));
    }, []);

    function generateDSL(currentData: number[], currentStyles: HistogramChartStyles) {
        if (!Array.isArray(currentData)) return '';
        let lines: string[] = [];
        if (currentStyles.title) lines.push(`Title: ${currentStyles.title}`);
        if (currentStyles.usl !== undefined) lines.push(`USL: ${currentStyles.usl}`);
        if (currentStyles.lsl !== undefined) lines.push(`LSL: ${currentStyles.lsl}`);
        if (currentStyles.target !== undefined) lines.push(`Target: ${currentStyles.target}`);

        if (currentStyles.barColor) lines.push(`Color[Bar]: ${currentStyles.barColor}`);
        if (currentStyles.curveColor) lines.push(`Color[Curve]: ${currentStyles.curveColor}`);
        if (currentStyles.uslColor) lines.push(`Color[USL]: ${currentStyles.uslColor}`);
        if (currentStyles.lslColor) lines.push(`Color[LSL]: ${currentStyles.lslColor}`);
        if (currentStyles.targetColor) lines.push(`Color[Target]: ${currentStyles.targetColor}`);

        if (currentStyles.bins) lines.push(`Bins: ${currentStyles.bins}`);
        if (currentStyles.showCurve !== undefined) lines.push(`ShowCurve: ${currentStyles.showCurve}`);
        lines.push(`ShowValues: ${currentStyles.showValues}`);

        lines.push('');
        lines.push('# 原始数据');
        currentData.forEach(val => lines.push(`- ${val}`));
        return lines.join('\n');
    }

    const handleTabChange = (tab: 'manual' | 'dsl' | 'ai') => {
        if (tab === 'dsl') setDsl(generateDSL(data, styles));
        setActiveTab(tab);
    };

    const handleParseDSL = (content: string) => {
        const { data: newData, styles: newStyles } = parseHistogramDSL(content, styles);
        if (newData.length > 0) {
            onUpdate(newData, newStyles);
        } else {
            onUpdate(data, newStyles);
        }
    };

    const handleRawDataChange = (val: string) => {
        setRawDataInput(val);
        const nums = val.split(/[\n,;\s]+/)
            .map(v => parseFloat(v.trim()))
            .filter(v => !isNaN(v));
        onUpdate(nums, styles);
    };

    const generateAiData = async () => {
        if (!aiInput.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateHistogramDSL(aiInput);
            setDsl(result);
            handleParseDSL(result);
            setActiveTab('dsl');
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？当前所有修改将丢失。')) {
            setDsl(INITIAL_HISTOGRAM_DSL);
            handleParseDSL(INITIAL_HISTOGRAM_DSL);
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
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">直方图分析</h2>
                            <p className="text-[8px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Histogram Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="p-3 bg-[var(--card-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-blue-400 transition-all border border-[var(--sidebar-border)] shadow-sm"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            onClick={() => setShowDocs(true)}
                            className="p-3 bg-[var(--card-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-blue-600 transition-all border border-[var(--sidebar-border)] shadow-sm"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex gap-2 p-1.5 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)]">
                    {[
                        { id: 'manual', label: '手动录入', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleTabChange(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--card-bg)]'}`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'manual' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Chart Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-indigo-500" />
                                <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图表基本信息</span>
                            </div>
                            <input
                                value={styles.title || ''}
                                onChange={e => onUpdate(data, { ...styles, title: e.target.value })}
                                className="w-full h-14 px-6 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-sm font-bold shadow-inner focus:outline-none focus:border-indigo-500 transition-all text-[var(--sidebar-text)]"
                                placeholder="例如：产品直径分布图"
                            />
                        </div>

                        {/* Specs */}
                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-6 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">规格限配置</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-red-400 uppercase">USL (上限)</label>
                                    <input
                                        type="number"
                                        value={styles.usl ?? ''}
                                        onChange={e => onUpdate(data, { ...styles, usl: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="w-full h-10 px-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs font-mono text-red-200"
                                        placeholder="--"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-red-400 uppercase">LSL (下限)</label>
                                    <input
                                        type="number"
                                        value={styles.lsl ?? ''}
                                        onChange={e => onUpdate(data, { ...styles, lsl: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="w-full h-10 px-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs font-mono text-red-200"
                                        placeholder="--"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase">Target (目标)</label>
                                    <input
                                        type="number"
                                        value={styles.target ?? ''}
                                        onChange={e => onUpdate(data, { ...styles, target: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="w-full h-10 px-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs font-mono text-emerald-200"
                                        placeholder="--"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Config */}
                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-6 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">显示配置</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300">显示正态曲线</span>
                                <button
                                    onClick={() => onUpdate(data, { ...styles, showCurve: !styles.showCurve })}
                                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${styles.showCurve ? 'bg-indigo-600' : 'bg-[var(--sidebar-muted)]'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${styles.showCurve ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300">显示数值标签</span>
                                <button
                                    onClick={() => onUpdate(data, { ...styles, showValues: !styles.showValues })}
                                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${styles.showValues ? 'bg-indigo-600' : 'bg-[var(--sidebar-muted)]'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${styles.showValues ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-xs font-bold text-[var(--sidebar-muted)]">分组数量 (Bins)</span>
                                    <span className="text-[10px] font-mono text-[var(--sidebar-text)]">{styles.bins === 'auto' ? 'AUTO' : styles.bins}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onUpdate(data, { ...styles, bins: 'auto' })}
                                        className={`px-3 py-1 text-[10px] font-black rounded-lg border transition-all ${styles.bins === 'auto' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[var(--card-bg)] border-[var(--sidebar-border)] text-[var(--sidebar-text)] hover:text-indigo-400'}`}
                                    >
                                        AUTO
                                    </button>
                                    <input
                                        type="range" min="5" max="50"
                                        value={typeof styles.bins === 'number' ? styles.bins : 10}
                                        onChange={e => onUpdate(data, { ...styles, bins: parseInt(e.target.value) })}
                                        className="flex-1 h-2 bg-[var(--sidebar-border)] rounded-lg appearance-none cursor-pointer accent-indigo-500 self-center"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Styles */}
                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-6 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">颜色方案</span>
                            </div>
                            {[
                                { key: 'barColor', label: '柱形颜色' },
                                { key: 'curveColor', label: '曲线颜色' },
                                { key: 'uslColor', label: 'USL 颜色' },
                                { key: 'targetColor', label: 'Target 颜色' }
                            ].map(c => (
                                <div key={c.key} className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[var(--sidebar-muted)]">{c.label}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-mono text-[var(--sidebar-text)] uppercase">{(styles as any)[c.key]}</span>
                                        <input
                                            type="color"
                                            value={(styles as any)[c.key] || '#ffffff'}
                                            onChange={e => onUpdate(data, { ...styles, [c.key]: e.target.value })}
                                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Raw Data */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <Database size={14} className="text-indigo-500" />
                                <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">原始数据录入</span>
                            </div>
                            <textarea
                                value={rawDataInput}
                                onChange={e => handleRawDataChange(e.target.value)}
                                className="w-full h-64 p-6 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs font-mono leading-relaxed text-[var(--sidebar-text)] shadow-inner focus:outline-none focus:border-indigo-500 transition-all resize-none"
                                placeholder="输入数值，每行一个..."
                                spellCheck={false}
                            />
                            <div className="text-right text-[10px] font-mono text-[var(--sidebar-muted)]">
                                Count: {data.length}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'dsl' && (
                    <textarea
                        value={dsl}
                        onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }}
                        className="w-full h-full min-h-[500px] p-8 bg-[var(--input-bg)] text-[var(--sidebar-text)] font-mono text-sm leading-relaxed border border-[var(--input-border)] rounded-lg shadow-inner focus:outline-none focus:border-indigo-500 transition-all whitespace-pre overflow-auto resize-none"
                        spellCheck={false}
                        placeholder="输入 Histogram DSL..."
                    />
                )}

                {activeTab === 'ai' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能分布场景模拟</span>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiInput}
                                onChange={e => setAiInput(e.target.value)}
                                className="w-full  rounded-lg "
                                placeholder="例如：生成一组均值10.0，标准差0.05的正态分布数据，规格上10.15，下限9.85..."
                            />

                            <button
                                onClick={generateAiData}
                                disabled={isGenerating || !aiInput.trim()}
                                className={`w-full h-16 rounded-lg flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-[var(--sidebar-muted)]' : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-indigo-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在执行统计推推演...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            <div className="p-8 bg-indigo-900/10 border border-indigo-800/20 rounded-lg space-y-4">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">推理提示</p>
                                <p className="text-xs text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以输入业务场景描述（如“活塞环厚度测量数据”）或具体统计参数。AI 将为您模拟符合业务逻辑的数据分布，并自动配置合适的规格限与均值线。
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
                        <div className="px-10 py-8 flex flex-col border-b border-[var(--sidebar-border)] shrink-0 gap-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-600/20 rounded-lg border border-indigo-500/30">
                                        <BarChart2 size={24} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--sidebar-text)] uppercase tracking-tighter">直方图知识库</h3>
                                        <p className="text-[10px] text-[var(--sidebar-muted)] font-bold uppercase tracking-widest mt-1">Histogram Knowledge Base V2.1</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDocs(false)} className="p-3 hover:bg-[var(--card-bg)] rounded-lg transition-all text-[var(--sidebar-text)] hover:text-indigo-400">
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
                                        className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar text-slate-300">
                            {docTab === 'dsl' ? (
                                <div className="space-y-12">
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-indigo-400 border-b border-indigo-500/20 pb-4">
                                            <Database size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">1. 基础配置说明</span>
                                        </div>
                                        <div className="space-y-4">
                                            <table className="w-full text-xs font-mono border-collapse">
                                                <thead>
                                                    <tr className="text-[var(--sidebar-text)] text-left border-b border-[var(--sidebar-border)]">
                                                        <th className="py-3 font-black uppercase">语法</th>
                                                        <th className="py-3 font-black uppercase">说明</th>
                                                        <th className="py-3 font-black uppercase">示例</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--input-border)]">
                                                    <tr>
                                                        <td className="py-3 text-indigo-400 font-bold">Title:</td>
                                                        <td className="py-3">图表标题</td>
                                                        <td className="py-3 text-slate-200">Title: 钢管直径分布</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 text-emerald-400 font-bold">USL:</td>
                                                        <td className="py-3">规格上限 (Upper Limit)</td>
                                                        <td className="py-3 text-slate-200">USL: 12.5</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 text-rose-400 font-bold">LSL:</td>
                                                        <td className="py-3">规格下限 (Lower Limit)</td>
                                                        <td className="py-3 text-slate-200">LSL: 10.0</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 text-blue-400 font-bold">Target:</td>
                                                        <td className="py-3">目标值 (Target Value)</td>
                                                        <td className="py-3 text-slate-200">Target: 11.25</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 text-amber-400 font-bold">Bins:</td>
                                                        <td className="py-3">分组数量 (auto 或 数字)</td>
                                                        <td className="py-3 text-slate-200">Bins: 20</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 text-purple-400 font-bold">ShowCurve:</td>
                                                        <td className="py-3">显示正态分布曲线</td>
                                                        <td className="py-3 text-slate-200">ShowCurve: true</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-amber-400 border-b border-amber-500/20 pb-4">
                                            <BarChart2 size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">2. 视觉样式定义</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 font-mono text-xs">
                                            <div className="p-6 bg-[var(--card-bg)] rounded-lg border border-[var(--input-border)] space-y-3">
                                                <div className="flex justify-between border-b border-[var(--sidebar-border)]/50 pb-2">
                                                    <span className="text-amber-500">Color[Bar]:</span>
                                                    <span className="text-slate-100">#HEX 直方柱颜色</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[var(--sidebar-border)]/50 pb-2">
                                                    <span className="text-indigo-400">Color[Curve]:</span>
                                                    <span className="text-slate-100">#HEX 正态曲线颜色</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[var(--sidebar-border)]/50 pb-2">
                                                    <span className="text-emerald-400">Color[USL]:</span>
                                                    <span className="text-slate-100">#HEX 上限线颜色</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[var(--sidebar-border)]/50 pb-2">
                                                    <span className="text-rose-400">Color[LSL]:</span>
                                                    <span className="text-slate-100">#HEX 下限线颜色</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-blue-400">Color[Target]:</span>
                                                    <span className="text-slate-100">#HEX 目标线颜色</span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-emerald-400 border-b border-emerald-500/20 pb-4">
                                            <Plus size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">3. 数据项录入语法</span>
                                        </div>
                                        <div className="p-6 bg-[var(--card-bg)] rounded-lg border border-[var(--input-border)] space-y-4">
                                            <div className="text-[11px] font-bold text-[var(--sidebar-text)] mb-2">语法格式：- [数值]</div>
                                            <code className="block text-xs text-blue-200 leading-relaxed bg-[var(--sidebar-bg)]/30 p-4 rounded-lg">
                                                # 原始测量数据<br />
                                                - 10.5<br />
                                                - 10.2<br />
                                                - 9.8<br />
                                                - 11.0
                                            </code>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-500/20 pb-2">正态分布分析 (Normal Distribution)</h4>
                                        <div className="p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-4 text-xs leading-relaxed text-[var(--sidebar-text)]">
                                            <p>直方图通过对大量随机样本的观察，识别生产过程是否受控。完美的生产过程通常呈现对称的“钟形”曲线。</p>
                                            <ul className="list-disc list-inside space-y-2">
                                                <li><strong>均值 (μ)</strong>: 反映了加工的中心位置。</li>
                                                <li><strong>标准差 (σ)</strong>: 反映了加工的散差大小。</li>
                                            </ul>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest border-b border-emerald-500/20 pb-2">工序能力指标 (Process Capability)</h4>
                                        <div className="p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-4 text-xs leading-relaxed text-[var(--sidebar-text)]">
                                            <p>当定义了规格限 (USL/LSL) 时，系统会自动评估工序能力：</p>
                                            <div className="bg-[var(--card-bg)] p-4 rounded-lg font-mono text-[10px] space-y-2">
                                                <div>Cp / Cpk: 指标越大，代表工序的质量保证能力越强。</div>
                                                <div>1.33: 视为工业级的“合格”门槛。</div>
                                                <div>1.67: 优秀水平。</div>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap size={14} className="text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase text-indigo-500">统计洞察</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--sidebar-text)] font-medium italic mb-2">
                                            "双峰直方图通常意味着数据来源于两个不同的班次、设备或供应商，需要深入分析波动源。"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-10 border-t border-[var(--sidebar-border)] bg-[var(--input-bg)] flex justify-center shrink-0">
                            <button
                                onClick={() => setShowDocs(false)}
                                className="px-16 py-4 bg-indigo-600 text-white font-black rounded-lg text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all"
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
