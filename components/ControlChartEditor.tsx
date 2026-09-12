import React, { useState, useEffect } from 'react';
import { ControlSeries,
    ControlChartStyles,
    DEFAULT_CONTROL_STYLES,
    INITIAL_CONTROL_DSL,
    ControlChartType,
    ControlRule } from '../types';
import {
    Activity,
    Sparkles,
    HelpCircle,
    X,
    Loader2,
    Play,
    Database,
    Code,
    ChevronRight,
    Settings2,
    Ruler,
    RotateCcw,
    Cpu,
    Zap,
    AlertTriangle,
} from 'lucide-react';
import {generateControlDSL} from '../services/aiService';
import { CardDocModal } from './CardDocModal';
import { Switch } from './ui/Switch';
import { useAIEngine } from '../hooks/useAIEngine';
import { ConfirmInline } from './ui/ConfirmInline';

interface ControlEditorProps {
    dsl: string;
    onDslChange: (dsl: string) => void;
}

// 独立的 DSL 解析函数
export function parseControlDSL(dsl: string): { series: ControlSeries[]; styles: Partial<ControlChartStyles> } {
    const lines = dsl.split('\n').map(l => l.trimEnd());
    const styles: Partial<ControlChartStyles> = {};
    const series: ControlSeries[] = [];

    let currentSeries: ControlSeries | null = null;
    let isDataBlock = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || (trimmed.startsWith('//') && !isDataBlock)) continue;

        // Header configs
        if (trimmed.startsWith('Title:')) {
            styles.title = trimmed.substring(6).trim();
            continue;
        }
        if (trimmed.startsWith('Type:')) {
            styles.type = trimmed.substring(5).trim() as ControlChartType;
            continue;
        }
        if (trimmed.startsWith('Size:')) {
            styles.subgroupSize = parseInt(trimmed.substring(5).trim());
            continue;
        }
        if (trimmed.startsWith('Rules:')) {
            styles.rules = trimmed.substring(6).split(',').map(r => r.trim() as ControlRule);
            continue;
        }
        if (trimmed.startsWith('UCL:')) {
            styles.ucl = parseFloat(trimmed.substring(4).trim());
            continue;
        }
        if (trimmed.startsWith('LCL:')) {
            styles.lcl = parseFloat(trimmed.substring(4).trim());
            continue;
        }
        if (trimmed.startsWith('CL:')) {
            styles.cl = parseFloat(trimmed.substring(3).trim());
            continue;
        }
        if (trimmed.startsWith('Decimals:')) {
            styles.decimals = parseInt(trimmed.substring(9).trim());
            continue;
        }
        if (trimmed.startsWith('ShowValues:')) {
            styles.showValues = trimmed.substring(11).trim().toLowerCase() === 'true';
            continue;
        }

        // Colors
        const colorMatch = trimmed.match(/^Color\[(\w+)\]:\s*(#[0-9A-Fa-f]{6})/);
        if (colorMatch) {
            const [, key, val] = colorMatch;
            if (key === 'Line') styles.lineColor = val;
            if (key === 'UCL') styles.uclColor = val;
            if (key === 'CL') styles.clColor = val;
            if (key === 'Point') styles.pointColor = val;
            continue;
        }

        // Series Block
        if (trimmed.startsWith('[series]:')) {
            isDataBlock = true;
            currentSeries = {
                name: trimmed.substring(9).trim(),
                data: []
            };
            continue;
        }
        if (trimmed === '[/series]') {
            if (currentSeries) series.push(currentSeries);
            currentSeries = null;
            isDataBlock = false;
            continue;
        }

        if (isDataBlock && currentSeries) {
            const values = trimmed.split(/[,;\s]+/).map(v => parseFloat(v));
            values.forEach(val => {
                if (!isNaN(val)) {
                    currentSeries!.data.push(val);
                }
            });
            continue;
        }
    }

    return { series, styles };
}

const ControlChartEditor: React.FC<ControlEditorProps> = ({ dsl, onDslChange }) => {
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [error, setError] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [series, setSeries] = useState<ControlSeries[]>([]);
    const [styles, setStyles] = useState<ControlChartStyles>(DEFAULT_CONTROL_STYLES);
    const [aiInput, setAiInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const engineName = useAIEngine();

    const handleParseDSL = (val: string) => {
        try {
            const result = parseControlDSL(val);
            setSeries(result.series);
            setStyles(prev => ({ ...DEFAULT_CONTROL_STYLES, ...result.styles }));
        } catch (e) {
            console.error('DSL Parse Error:', e), setError(`DSL Parse Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    // 解析 DSL 到 State
    useEffect(() => {
        handleParseDSL(dsl);
    }, [dsl]);

    // 初始化默认 DSL
    useEffect(() => {
        if (!dsl) {
            onDslChange(INITIAL_CONTROL_DSL);
        }
    }, []);

    // State 到 DSL 生成器
    const generateDSL = (s: ControlSeries[], st: ControlChartStyles) => {
        let lines: string[] = [];

        if (st.title) lines.push(`Title: ${st.title}`);
        if (st.type) lines.push(`Type: ${st.type}`);
        if (st.subgroupSize) lines.push(`Size: ${st.subgroupSize}`);
        if (st.rules && st.rules.length > 0) lines.push(`Rules: ${st.rules.join(',')}`);
        if (st.decimals !== undefined) lines.push(`Decimals: ${st.decimals}`);
        lines.push(`ShowValues: ${st.showValues || false}`);

        if (st.ucl !== undefined) lines.push(`UCL: ${st.ucl}`);
        if (st.lcl !== undefined) lines.push(`LCL: ${st.lcl}`);
        if (st.cl !== undefined) lines.push(`CL: ${st.cl}`);

        if (st.lineColor) lines.push(`Color[Line]: ${st.lineColor}`);
        if (st.pointColor) lines.push(`Color[Point]: ${st.pointColor}`);
        if (st.uclColor) lines.push(`Color[UCL]: ${st.uclColor}`);
        if (st.clColor) lines.push(`Color[CL]: ${st.clColor}`);

        lines.push('');

        s.forEach(se => {
            lines.push(`[series]: ${se.name}`);
            const chunkSize = 5;
            for (let i = 0; i < se.data.length; i += chunkSize) {
                const chunk = se.data.slice(i, i + chunkSize);
                lines.push(chunk.join(', '));
            }
            lines.push('[/series]');
            lines.push('');
        });

        return lines.join('\n');
    };

    const handleUpdate = (newSeries: ControlSeries[], newStyles: ControlChartStyles) => {
        setSeries(newSeries);
        setStyles(newStyles);
        const newDSL = generateDSL(newSeries, newStyles);
        onDslChange(newDSL);
    };

    const handleTabChange = (tab: 'manual' | 'dsl' | 'ai') => {
        setActiveTab(tab);
    };

    const handleSmartOptimize = async () => {
        if (!aiInput.trim()) return;
        setIsThinking(true);
        try {
            const result = await generateControlDSL(aiInput);
            onDslChange(result);
            setActiveTab('dsl');
        } catch (e) {
            console.error(e);
        } finally {
            setIsThinking(false);
        }
    };

    const doReset = () => {
            onDslChange(INITIAL_CONTROL_DSL);
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
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">SPC 控制图分析</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Control Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setConfirmReset(true)} disabled={confirmReset}
                            className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--border-line-r)] shadow-sm"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button onClick={() => setShowDocs(true)} className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--border-line-r)] shadow-sm">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex gap-2 p-1.5 bg-[var(--input-bg)] rounded-md border border-[var(--border-line-r)]">
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
                    <div className="space-y-6">
                        {/* 1. Basic Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-[var(--text-ok)]" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图表基本信息</span>
                            </div>
                            <input
                                value={styles.title || ''}
                                onChange={e => handleUpdate(series, { ...styles, title: e.target.value })}
                                className="iqs-input h-11"
                                placeholder="例如：关键尺寸控制图"
                            />
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-[11px] font-black uppercase text-[var(--sidebar-text)] tracking-widest mb-2 block">图表类型</label>
                                    <select
                                        value={styles.type}
                                        onChange={e => handleUpdate(series, { ...styles, type: e.target.value as ControlChartType })}
                                        className="w-full h-10 px-3 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] text-[11px] font-bold text-[var(--sidebar-text)] outline-none/50 appearance-none"
                                    >
                                        <option value="I-MR">I-MR (单维 | 单值)</option>
                                        <option value="X-bar-R">X-bar-R (单维 | 均值-极差)</option>
                                        <option value="X-bar-S">X-bar-S (单维 | 均值-标准差)</option>
                                        <option value="P">P Chart (单维 | 不合格率)</option>
                                        <option value="NP">NP Chart (单维 | 不合格数)</option>
                                        <option value="C">C Chart (单维 | 缺陷数)</option>
                                        <option value="U">U Chart (单维 | 单位缺陷数)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 2. SPC Params */}
                        <div className="p-8 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] space-y-6 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <Ruler size={16} className="text-[var(--text-ok)]" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">SPC 参数配置</span>
                            </div>

                            {/* Sliders */}
                            <div className="flex gap-8">
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between items-center text-[11px] font-black uppercase text-[var(--sidebar-text)] tracking-widest">
                                        <span>子组大小 (Size)</span>
                                        <span className="text-[var(--text-ok)]">{styles.subgroupSize || 1}</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="10"
                                        value={styles.subgroupSize || 1}
                                        onChange={e => handleUpdate(series, { ...styles, subgroupSize: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-[var(--sidebar-border)] rounded-md appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between items-center text-[11px] font-black uppercase text-[var(--sidebar-text)] tracking-widest">
                                        <span>小数精度</span>
                                        <span className="text-[var(--text-ok)]">{styles.decimals ?? 2} 位</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="4"
                                        value={styles.decimals ?? 2}
                                        onChange={e => handleUpdate(series, { ...styles, decimals: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-[var(--sidebar-border)] rounded-md appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between items-center text-[11px] font-black uppercase text-[var(--sidebar-text)] tracking-widest">
                                        <span>显示数值标签</span>
                                        <Switch checked={!!styles.showValues} onChange={v => handleUpdate(series, { ...styles, showValues: v })} ariaLabel="显示数值标签" />
                                    </div>
                                </div>
                            </div>

                            {/* Rules */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase text-[var(--sidebar-text)] tracking-widest block">判异规则 (Rules)</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'Basic', label: '基础' },
                                        { id: 'Western-Electric', label: 'WE 规则' },
                                        { id: 'Nelson', label: 'Nelson 增强' }
                                    ].map(rule => {
                                        const isActive = styles.rules.includes(rule.id as ControlRule);
                                        return (
                                            <button
                                                key={rule.id}
                                                onClick={() => {
                                                    const newRules = isActive
                                                        ? styles.rules.filter(r => r !== rule.id)
                                                        : [...styles.rules, rule.id as ControlRule];
                                                    handleUpdate(series, { ...styles, rules: newRules });
                                                }}
                                                className={`flex-1 h-9 rounded-md text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 ${isActive
                                                    ? 'bg-[var(--state-up)]/20 border-[var(--state-up)] text-[var(--text-ok)]'
                                                    : 'bg-[var(--card-bg)] border-[var(--input-border)] text-[var(--sidebar-text)] hover:border-[var(--state-up)]/30'
                                                    }`}
                                            >
                                                <div className={`w-2 h-2 rounded-full border ${isActive ? 'bg-[var(--state-up)] border-[var(--state-up)]' : 'border-slate-600'}`} />
                                                {rule.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* 3. Data Entry */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <Database size={14} className="text-[var(--text-ok)]" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">观测数据序列</span>
                            </div>
                            {series.map((s, idx) => (
                                <div key={idx} className="space-y-2">
                                    <input
                                        value={s.name}
                                        onChange={e => {
                                            const newSeries = [...series];
                                            newSeries[idx].name = e.target.value;
                                            handleUpdate(newSeries, styles);
                                        }}
                                        className="w-full bg-transparent text-[11px] font-bold text-[var(--sidebar-text)] outline-none placeholder:text-[var(--sidebar-muted)]"
                                        placeholder="系列名称"
                                    />
                                    <textarea
                                        value={s.data.join(', ')}
                                        onChange={e => {
                                            const newSeries = [...series];
                                            const valStr = e.target.value;
                                            const newData = valStr.split(/[,;\s]+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
                                            newSeries[idx].data = newData;
                                            handleUpdate(newSeries, styles);
                                        }}
                                        className="iqs-input min-h-[160px] resize-y"
                                        placeholder="输入观测值，用逗号分隔..."
                                    />
                                </div>
                            ))}
                            {series.length === 0 && (
                                <button
                                    onClick={() => handleUpdate([{ name: '新数据系列', data: [] }], styles)}
                                    className="w-full py-3 border border-dashed border-[var(--border-line-r)] rounded-md text-[11px] font-black uppercase tracking-widest text-[var(--sidebar-text)] hover:text-[var(--text-ok)] hover:border-[var(--state-up)]/50 transition-all"
                                >
                                    + 添加数据系列
                                </button>
                            )}
                        </div>

                        {/* 4. Color Config */}
                        <div className="p-8 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] space-y-6 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <Settings2 size={16} className="text-[var(--text-ok)]" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">视觉样式配置</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                {[
                                    { key: 'lineColor', label: '折线颜色' },
                                    { key: 'pointColor', label: '数据点色' },
                                    { key: 'clColor', label: '中心线色' },
                                    { key: 'uclColor', label: '控制线色' }
                                ].map(c => (
                                    <div key={c.key} className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-[var(--sidebar-text)]">{c.label}</span>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded-md border border-slate-600/50 shadow-sm"
                                                style={{ backgroundColor: (styles as any)[c.key] || '#000' }}
                                            />
                                            <input
                                                type="color"
                                                value={(styles as any)[c.key] || '#000000'}
                                                onChange={e => handleUpdate(series, { ...styles, [c.key]: e.target.value })}
                                                className="w-6 h-6 opacity-0 absolute cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'dsl' && (
                    <div className="h-full flex flex-col gap-6">
                        <textarea
                            value={dsl}
                            onChange={(e) => onDslChange(e.target.value)}
                            className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                            placeholder="// 在此输入控制图 DSL 代码..."
                            spellCheck={false}
                        />
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能 SPC 逻辑推演</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiInput}
                                onChange={e => setAiInput(e.target.value)}
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="例如：分析过去25组活塞销直径测量数据，每组5个样本。请自动判断控制限..."
                            />

                            <button
                                onClick={handleSmartOptimize}
                                disabled={isThinking || !aiInput.trim()}
                                className={`shrink-0 ${isThinking ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isThinking ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在执行 SPC 建模推演...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            <div className="iqs-note space-y-3 shrink-0">
                                <p className="text-[11px] font-black text-[var(--text-ok)] uppercase tracking-widest">推理提示</p>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以直接粘贴原始测量数据（如 Excel 复制内容），AI 将自动识别子组结构，并根据 SPC 理论推荐合适的控制图类型（I-MR, X-bar 等）并自动计算控制限。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {showDocs && (
                <CardDocModal kind="control" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
        
    );
};

export default ControlChartEditor;
