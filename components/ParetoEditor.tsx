import React, { useState } from 'react';
import {
    AlertTriangle,
    BarChart3,
    ChevronRight,
    Code,
    Cpu,
    Database,
    HelpCircle,
    Loader2,
    Plus,
    RotateCcw,
    Sliders,
    Sparkles,
    Trash2,
    X,
    Zap
} from 'lucide-react';
import { ParetoItem, ParetoChartStyles, DEFAULT_PARETO_STYLES } from '../types';
import {generateParetoDSL} from '../services/aiService';
import { INITIAL_PARETO_DATA, INITIAL_PARETO_DSL } from '../constants';
import { CardDocModal } from './CardDocModal';
import { Switch } from './ui/Switch';
import { genId } from '../utils/id';
import { useAIEngine } from '../hooks/useAIEngine';

interface Props {
    data: ParetoItem[];
    styles: ParetoChartStyles;
    onUpdate: (data: ParetoItem[], styles: ParetoChartStyles) => void;
    showLine: boolean;
    onShowLineChange: (val: boolean) => void;
}

export const parseParetoDSL = (content: string, baseStyles: ParetoChartStyles = DEFAULT_PARETO_STYLES) => {
    const lines = content.split('\n');
    const newItems: ParetoItem[] = [];
    const newStyles: ParetoChartStyles = { ...baseStyles };

    lines.forEach(line => {
        const trimmed = line.trim();
        // IQS-DSL v1 comments
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        const titleMatch = trimmed.match(/^Title:\s*(.+)/);
        if (titleMatch) { newStyles.title = titleMatch[1]; return; }

        const decimalMatch = trimmed.match(/^Decimals:\s*(\d+)/);
        if (decimalMatch) { newStyles.decimals = parseInt(decimalMatch[1]); return; }

        const showValuesMatch = trimmed.match(/^ShowValues:\s*(true|false)/i);
        if (showValuesMatch) { newStyles.showValues = showValuesMatch[1].toLowerCase() === 'true'; return; }

        const colorMatch = trimmed.match(/Color\[(Bar|Line|MarkLine|Title)\]:\s*(#[0-9a-fA-F]+)/);
        if (colorMatch) {
            const key = colorMatch[1].charAt(0).toLowerCase() + colorMatch[1].slice(1) + 'Color';
            (newStyles as any)[key] = colorMatch[2];
            return;
        }

        const fontMatch = trimmed.match(/Font\[(Title|Base|Bar|Line)\]:\s*(\d+)/);
        if (fontMatch) {
            const key = fontMatch[1].charAt(0).toLowerCase() + fontMatch[1].slice(1) + 'FontSize';
            (newStyles as any)[key] = parseInt(fontMatch[2]);
            return;
        }

        const itemMatch = trimmed.match(/^-\s*(.+):\s*(\d+)/);
        if (itemMatch) {
            newItems.push({ id: genId('item'), name: itemMatch[1].trim(), value: parseInt(itemMatch[2]) });
        }
    });

    return { items: newItems, styles: newStyles };
};

export const ParetoEditor: React.FC<Props> = ({
    data, styles, onUpdate, showLine, onShowLineChange
}) => {
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
    const engineName = useAIEngine();


    // 初始同步 DSL
    React.useEffect(() => {
        setDsl(generateDSL(data, styles));
    }, []);

    function generateDSL(items: ParetoItem[], s: ParetoChartStyles) {
        if (!Array.isArray(items)) return '';
        let lines: string[] = [];
        if (s.title) lines.push(`Title: ${s.title}`);
        if (s.titleColor) lines.push(`Color[Title]: ${s.titleColor}`);
        if (s.barColor) lines.push(`Color[Bar]: ${s.barColor}`);
        if (s.lineColor) lines.push(`Color[Line]: ${s.lineColor}`);
        if (s.markLineColor) lines.push(`Color[MarkLine]: ${s.markLineColor}`);
        if (s.decimals !== undefined) lines.push(`Decimals: ${s.decimals}`);
        lines.push(`ShowValues: ${s.showValues}`);
        if (s.titleFontSize) lines.push(`Font[Title]: ${s.titleFontSize}`);
        if (s.baseFontSize) lines.push(`Font[Base]: ${s.baseFontSize}`);
        if (s.barFontSize) lines.push(`Font[Bar]: ${s.barFontSize}`);
        if (s.lineFontSize) lines.push(`Font[Line]: ${s.lineFontSize}`);

        lines.push(''); // 空行分隔

        items.forEach(i => lines.push(`- ${i.name}: ${i.value}`));
        return lines.join('\n');
    }

    const handleTabChange = (tab: 'manual' | 'dsl' | 'ai') => {
        if (tab === 'dsl') setDsl(generateDSL(data, styles));
        setActiveTab(tab);
    };

    const handleParseDSL = (content: string) => {
        const { items: newItems, styles: newStyles } = parseParetoDSL(content, styles);
        if (newItems.length > 0) {
            onUpdate(newItems, newStyles);
        } else {
            onUpdate(data, newStyles);
        }
    };

    const generateAiData = async () => {
        if (!aiInput.trim()) return;
        setIsGenerating(true);
        setAiError(null);
        try {
            const result = await generateParetoDSL(aiInput);
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
            setDsl(INITIAL_PARETO_DSL);
            handleParseDSL(INITIAL_PARETO_DSL);
        setPendingReset(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative transition-colors">
            <div className="p-6 border-b border-[var(--border-line-r)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
                            <Cpu size={22} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">排列图分析 (Pareto)</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Pareto Engine | LUXI LAB</p>
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
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--card-bg)]'
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>

                {/* R-UI-08：破坏性操作自有确认条 */}
                {pendingReset && (
                    <div className="flex items-center gap-3 p-3 rounded-md bg-[var(--input-bg)] border border-[var(--alert-red)]">
                        <AlertTriangle size={16} className="text-[var(--text-danger)] shrink-0" />
                        <span className="text-[11px] flex-1">恢复示例将丢弃当前排列图的全部修改，确定继续？</span>
                        <button type="button" onClick={handleReset}
                            className="px-3 py-1.5 rounded-sm bg-[var(--alert-red)] text-white text-[11px] font-bold shrink-0">确定恢复</button>
                        <button type="button" onClick={() => setPendingReset(false)}
                            className="px-3 py-1.5 rounded-sm border border-[var(--input-border)] text-[11px] font-bold shrink-0">取消</button>
                    </div>
                )}
            </div>

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
                    <div className="space-y-6">
                        {!Array.isArray(data) ? (
                            <div className="p-10 text-center text-[var(--sidebar-text)] text-[11px] uppercase font-black tracking-widest">
                                同步矩阵数据中...
                            </div>
                        ) : (
                            <>
                                {/* 图表基本信息 */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 pl-2">
                                        <ChevronRight size={14} className="text-primary" />
                                        <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图表基本信息</span>
                                    </div>
                                    <input
                                        value={styles.title || ''}
                                        onChange={e => onUpdate(data, { ...styles, title: e.target.value })}
                                        className="iqs-input h-11"
                                        placeholder="例如：故障频数排列图"
                                    />
                                </div>

                                {/* 统计指标录入 */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between pl-2">
                                        <div className="flex items-center gap-3">
                                            <ChevronRight size={14} className="text-primary" />
                                            <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">统计指标录入</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {data.map((item, idx) => (
                                            <div key={item.id} className="flex gap-3 group">
                                                <div className="flex-1 h-11 flex items-center bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] overflow-hidden px-4 group-hover:border-primary transition-colors">
                                                    <span className="text-[11px] font-black text-[var(--sidebar-muted)] mr-4">0{idx + 1}</span>
                                                    <input
                                                        value={item.name}
                                                        onChange={e => {
                                                            const newData = [...data];
                                                            newData[idx].name = e.target.value;
                                                            onUpdate(newData, styles);
                                                        }}
                                                        className="bg-transparent border-none outline-none text-sm font-bold w-full text-[var(--sidebar-text)] placeholder:opacity-20"
                                                        placeholder="项目名称"
                                                    />
                                                </div>
                                                <div className="iqs-input-shell">
                                                    <input
                                                        type="number"
                                                        value={item.value}
                                                        onChange={e => {
                                                            const newData = [...data];
                                                            newData[idx].value = parseInt(e.target.value) || 0;
                                                            onUpdate(newData, styles);
                                                        }}
                                                        className="bg-transparent border-none outline-none text-sm font-black w-full text-[var(--text-ok)] text-center"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => onUpdate(data.filter(i => i.id !== item.id), styles)}
                                                    className="w-11 h-11 flex items-center justify-center bg-[var(--card-bg)] border border-[var(--border-line-r)] rounded-md text-[var(--sidebar-muted)] hover:text-[var(--text-danger)] hover:bg-[var(--alert-red)]/10 transition-all opacity-60 focus-visible:opacity-100 hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => onUpdate([...data, { id: Math.random().toString(), name: '新统计项', value: 0 }], styles)}
                                            className="w-full h-14 border border-dashed border-[var(--border-line-r)] rounded-md flex items-center justify-center gap-3 text-[var(--sidebar-text)] hover:text-primary hover:border-primary/50 transition-all group bg-[var(--card-bg)] shadow-sm"
                                        >
                                            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                                            <span className="text-[11px] font-black uppercase tracking-widest">添加统计项</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* 图表高级配置 */}
                        <div className="p-8 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] space-y-8 shadow-sm">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">图表高级配置</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[12px] font-bold text-[var(--sidebar-text)]">80% 关键线</span>
                                <Switch checked={showLine} onChange={onShowLineChange} ariaLabel="80% 关键线" />
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[12px] font-bold text-[var(--sidebar-text)]">显示数值标签</span>
                                <Switch checked={!!styles.showValues} onChange={v => onUpdate(data, { ...styles, showValues: v })} ariaLabel="显示数值标签" />
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center text-[11px] font-black uppercase text-[var(--sidebar-text)] tracking-widest">
                                    <span>小数点保留位数</span>
                                    <span className="text-primary">{styles.decimals ?? 1} 位</span>
                                </div>
                                <input
                                    type="range" min="0" max="4"
                                    value={styles.decimals ?? 1}
                                    onChange={e => onUpdate(data, { ...styles, decimals: parseInt(e.target.value) })}
                                    className="w-full h-1.5 bg-[var(--sidebar-border)] rounded-md appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* 颜色方案配置 */}
                        <div className="p-8 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] space-y-6 shadow-sm">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">颜色方案配置</span>
                            </div>
                            {[
                                { key: 'barColor', label: '柱形颜色' },
                                { key: 'lineColor', label: '折线颜色' },
                                { key: 'markLineColor', label: '关键线颜色' }
                            ].map(c => (
                                <div key={c.key} className="flex items-center justify-between">
                                    <span className="text-[12px] font-bold text-[var(--sidebar-text)]">{c.label}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-mono text-[var(--sidebar-muted)] uppercase">{(styles as any)[c.key]}</span>
                                        <input
                                            type="color"
                                            value={(styles as any)[c.key] || '#000000'}
                                            onChange={e => onUpdate(data, { ...styles, [c.key]: e.target.value })}
                                            className="w-8 h-8 rounded-md cursor-pointer bg-transparent border-none"
                                        />
                                    </div>
                                </div>
                            ))}
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
                            placeholder="输入排列图 DSL..."
                        />
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3 shrink-0">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能频率分布推演</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiInput}
                                onChange={e => setAiInput(e.target.value)}
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="例如：描述2024年客户投诉的主要类别及其频数，模型将自动转化为 DSL 脚本并生成图表..."
                            />

                            <button
                                onClick={generateAiData}
                                disabled={isGenerating || !aiInput.trim()}
                                className={`shrink-0 ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在执行帕累托分析...</span>
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

                            <div className="iqs-note space-y-3 shrink-0">
                                <p className="text-[11px] font-black text-[var(--text-info)] uppercase tracking-widest">推理提示</p>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed">
                                    您可以输入原始文本、统计报表摘要 or 口语化描述。AI 会自动识别**分类项目**与**频数/金额**，并依据“二八准则”为您配置好分析视角与色系。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* Docs Modal */}
            {showDocs && (
                <CardDocModal kind="pareto" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
        
    );
};
