import React, { useState, useEffect } from 'react';
import {
    AlertTriangle,
    BarChart2,
    ChevronRight,
    Code,
    Cpu,
    Database,
    HelpCircle,
    Loader2,
    Plus,
    RotateCcw,
    Sparkles,
    Trash2,
    X,
    Zap
} from 'lucide-react';
import { HistogramChartStyles, DEFAULT_HISTOGRAM_STYLES } from '../types';
import {generateHistogramDSL} from '../services/aiService';
import { INITIAL_HISTOGRAM_DATA, INITIAL_HISTOGRAM_DSL } from '../constants';
import { CardDocModal } from './CardDocModal';
import { Switch } from './ui/Switch';
import { useAIEngine } from '../hooks/useAIEngine';

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
    const [error, setError] = useState<string | null>(null);
    // R-UI-08：破坏性操作自有确认
    const [pendingReset, setPendingReset] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);   // R-UI-10
    const [dsl, setDsl] = useState('');
    const [aiInput, setAiInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [rawDataInput, setRawDataInput] = useState('');
    const engineName = useAIEngine();


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
        setAiError(null);
        try {
            const result = await generateHistogramDSL(aiInput);
            setDsl(result);
            handleParseDSL(result);
            setActiveTab('dsl');
        } catch (e) {
            // R-UI-10：失败必须界面可见，且给出可操作建议
            setAiError(`AI 推演失败：${e instanceof Error ? e.message : '未知错误'}。可改用「DSL 编辑器」手工录入。`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
            setDsl(INITIAL_HISTOGRAM_DSL);
            handleParseDSL(INITIAL_HISTOGRAM_DSL);
        setPendingReset(false);
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
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">直方图分析</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Histogram Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPendingReset(true)}
                            className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--border-line-r)] shadow-sm"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            onClick={() => setShowDocs(true)}
                            className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--border-line-r)] shadow-sm"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex gap-2 p-1.5 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)]">
                    {[
                        { id: 'manual', label: '手动录入', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleTabChange(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--card-bg)]'}`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>

                {/* R-UI-08：破坏性操作自有确认条 */}
                {pendingReset && (
                    <div className="flex items-center gap-3 p-3 rounded-md bg-[var(--input-bg)] border border-[var(--alert-red)]">
                        <AlertTriangle size={16} className="text-[var(--text-danger)] shrink-0" />
                        <span className="text-[11px] flex-1">恢复示例将丢弃当前直方图的全部修改，确定继续？</span>
                        <button type="button" onClick={handleReset}
                            className="px-3 py-1.5 rounded-sm bg-[var(--alert-red)] text-white text-[11px] font-bold shrink-0">确定恢复</button>
                        <button type="button" onClick={() => setPendingReset(false)}
                            className="px-3 py-1.5 rounded-sm border border-[var(--input-border)] text-[11px] font-bold shrink-0">取消</button>
                    </div>
                )}
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
                {activeTab === 'manual' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Chart Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图表基本信息</span>
                            </div>
                            <input
                                value={styles.title || ''}
                                onChange={e => onUpdate(data, { ...styles, title: e.target.value })}
                                className="iqs-input h-11"
                                placeholder="例如：产品直径分布图"
                            />
                        </div>

                        {/* Specs */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">规格限配置</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[var(--text-danger)] uppercase">USL (上限)</label>
                                    <input
                                        type="number"
                                        value={styles.usl ?? ''}
                                        onChange={e => onUpdate(data, { ...styles, usl: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="iqs-input h-9 !text-[var(--text-danger)]"
                                        placeholder="--"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[var(--text-danger)] uppercase">LSL (下限)</label>
                                    <input
                                        type="number"
                                        value={styles.lsl ?? ''}
                                        onChange={e => onUpdate(data, { ...styles, lsl: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="iqs-input h-9 !text-[var(--text-danger)]"
                                        placeholder="--"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[var(--text-ok)] uppercase">Target (目标)</label>
                                    <input
                                        type="number"
                                        value={styles.target ?? ''}
                                        onChange={e => onUpdate(data, { ...styles, target: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="iqs-input h-9 !text-[var(--text-ok)]"
                                        placeholder="--"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Config */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">显示配置</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[var(--sidebar-text)]">显示正态曲线</span>
                                <Switch checked={!!styles.showCurve} onChange={v => onUpdate(data, { ...styles, showCurve: v })} ariaLabel="显示正态曲线" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[var(--sidebar-text)]">显示数值标签</span>
                                <Switch checked={!!styles.showValues} onChange={v => onUpdate(data, { ...styles, showValues: v })} ariaLabel="显示数值标签" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-muted)]">分组数量 (Bins)</span>
                                    <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.bins === 'auto' ? 'AUTO' : styles.bins}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onUpdate(data, { ...styles, bins: 'auto' })}
                                        className={`px-3 py-1 text-[11px] font-black rounded-md border transition-all ${styles.bins === 'auto' ? 'bg-primary border-primary text-white' : 'bg-[var(--card-bg)] border-[var(--border-line-r)] text-[var(--sidebar-text)] hover:text-primary'}`}
                                    >
                                        AUTO
                                    </button>
                                    <input
                                        type="range" min="5" max="50"
                                        value={typeof styles.bins === 'number' ? styles.bins : 10}
                                        onChange={e => onUpdate(data, { ...styles, bins: parseInt(e.target.value) })}
                                        className="flex-1 h-2 bg-[var(--sidebar-border)] rounded-md appearance-none cursor-pointer self-center"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Styles */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">颜色方案</span>
                            </div>
                            {[
                                { key: 'barColor', label: '柱形颜色' },
                                { key: 'curveColor', label: '曲线颜色' },
                                { key: 'uslColor', label: 'USL 颜色' },
                                { key: 'targetColor', label: 'Target 颜色' }
                            ].map(c => (
                                <div key={c.key} className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-muted)]">{c.label}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-mono text-[var(--sidebar-text)] uppercase">{(styles as any)[c.key]}</span>
                                        <input
                                            type="color"
                                            value={(styles as any)[c.key] || '#FFFFFF'}
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
                                <Database size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">原始数据录入</span>
                            </div>
                            <textarea
                                value={rawDataInput}
                                onChange={e => handleRawDataChange(e.target.value)}
                                className="iqs-input"
                                placeholder="输入数值，每行一个..."
                                spellCheck={false}
                            />
                            <div className="text-right text-[11px] font-mono text-[var(--sidebar-muted)]">
                                Count: {data.length}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'dsl' && (
                    <div className="h-full flex flex-col gap-6">
                    <textarea
                        value={dsl}
                        onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }}
                        className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                        spellCheck={false}
                        placeholder="输入 Histogram DSL..."
                    />
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能分布场景模拟</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiInput}
                                onChange={e => setAiInput(e.target.value)}
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="例如：生成一组均值10.0，标准差0.05的正态分布数据，规格上10.15，下限9.85..."
                            />

                            <button
                                onClick={generateAiData}
                                disabled={isGenerating || !aiInput.trim()}
                                className={`shrink-0 ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在执行统计推推演...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>
                            {aiError && (
                                <div className="px-4 py-3 bg-[var(--alert-red)]/10 border border-[var(--alert-red)]/30 rounded-md flex items-start gap-2 shrink-0">
                                    <AlertTriangle size={14} className="text-[var(--text-danger)] mt-0.5 shrink-0" />
                                    <span className="text-[11px] text-[var(--text-danger)] leading-relaxed">{aiError}</span>
                                </div>
                            )}

                            <div className="p-8 iqs-note rounded-md space-y-4">
                                <p className="text-[11px] font-black text-primary uppercase tracking-widest">推理提示</p>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed">
                                    您可以输入业务场景描述（如“活塞环厚度测量数据”）或具体统计参数。AI 将为您模拟符合业务逻辑的数据分布，并自动配置合适的规格限与均值线。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && (
                <CardDocModal kind="histogram" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
        
    );
};
