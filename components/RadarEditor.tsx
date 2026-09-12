import React, { useState, useEffect, useRef } from 'react';
import {
    RadarData, RadarChartStyles, DEFAULT_RADAR_STYLES, QCToolType } from '../types';
import { INITIAL_RADAR_DSL } from '../constants';
import {
    Cpu, Sparkles, HelpCircle, X, Loader2, Database, Code,
    ChevronRight, Save, Trash2, Plus, Edit3, Target, RotateCcw,
    Layout, Zap,
    AlertTriangle,
} from 'lucide-react';
import {generateLogicDSL} from '../services/aiService';
import { CardDocModal } from './CardDocModal';
import { Switch } from './ui/Switch';
import { useAIEngine } from '../hooks/useAIEngine';
import { ConfirmInline } from './ui/ConfirmInline';

interface RadarEditorProps {
    data: RadarData;
    styles: RadarChartStyles;
    onDataChange: (data: RadarData) => void;
    onStylesChange: (styles: RadarChartStyles) => void;
}

export const parseRadarDSL = (content: string, baseStyles: RadarChartStyles = DEFAULT_RADAR_STYLES) => {
    const lines = content.split('\n');
    const newStyles: RadarChartStyles = { ...baseStyles };
    const axes: any[] = [];
    const series: any[] = [];
    let title = baseStyles.title;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (trimmed.includes(':')) {
            const [keyPart, ...valParts] = trimmed.split(':');
            const key = keyPart.trim();
            const val = valParts.join(':').trim();

            if (key === 'Title') {
                title = val;
            } else if (key === 'StartAngle') {
                newStyles.startAngle = parseFloat(val);
            } else if (key === 'Clockwise') {
                newStyles.clockwise = val.toLowerCase() === 'true';
            } else if (key === 'Closed') {
                newStyles.isClosed = val.toLowerCase() === 'true';
            } else if (key === 'Standardize') {
                newStyles.standardize = val.toLowerCase() === 'true';
            } else if (key === 'ShowAreaScore') {
                newStyles.showAreaScore = val.toLowerCase() === 'true';
            } else if (key === 'ShowSimilarity') {
                newStyles.showSimilarity = val.toLowerCase() === 'true';
            } else if (key === 'ShowValues') {
                newStyles.showValues = val.toLowerCase() === 'true';
            } else if (key === 'Axis') {
                const parts = val.split(',').map(s => s.trim());
                if (parts.length >= 2) {
                    axes.push({
                        name: parts[0],
                        max: parseFloat(parts[1]),
                        min: parts[2] ? parseFloat(parts[2]) : 0
                    });
                }
            } else if (key === 'Series') {
                const parts = val.split(/,(?![^\[]*\])/).map(s => s.trim());
                if (parts.length >= 2) {
                    const name = parts[0];
                    const valuesStr = parts[1].replace(/[\[\]]/g, '');
                    const values = valuesStr.split(',').map(v => parseFloat(v.trim()));
                    const color = parts[2] && parts[2] !== 'null' ? parts[2] : undefined;
                    const opacity = parts[3] ? parseFloat(parts[3]) : undefined;
                    series.push({ name, values, color, fillOpacity: opacity });
                }
            }
        }
    });

    return {
        data: { title, axes, series },
        styles: { ...newStyles, title }
    };
};

const RadarEditor: React.FC<RadarEditorProps> = ({ data, styles, onDataChange, onStylesChange }) => {
    const [dsl, setDsl] = useState(INITIAL_RADAR_DSL);
    const [error, setError] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const engineName = useAIEngine();


    const isInitialized = useRef(false);
    useEffect(() => {
        if (!isInitialized.current) {
            if (data.axes.length === 0) {
                handleParseDSL(INITIAL_RADAR_DSL);
            } else {
                setDsl(generateDSLFromState(data, styles));
            }
            isInitialized.current = true;
        }
    }, [data]);

    const generateDSLFromState = (currData: RadarData, currStyles: RadarChartStyles) => {
        const lines: string[] = [];
        lines.push(`Title: ${currData.title}`);
        lines.push(``);
        lines.push(`// 统计分析控制`);
        lines.push(`Standardize: ${currStyles.standardize}`);
        lines.push(`ShowAreaScore: ${currStyles.showAreaScore}`);
        lines.push(`ShowSimilarity: ${currStyles.showSimilarity}`);
        lines.push(`ShowValues: ${currStyles.showValues}`);
        lines.push(``);
        lines.push(`// 极坐标控制`);
        lines.push(`StartAngle: ${currStyles.startAngle}`);
        lines.push(`Clockwise: ${currStyles.clockwise}`);
        lines.push(`Closed: ${currStyles.isClosed}`);
        lines.push(``);
        lines.push(`// 轴定义`);
        currData.axes.forEach(axis => {
            lines.push(`Axis: ${axis.name}, ${axis.max}${axis.min !== undefined ? `, ${axis.min}` : ''}`);
        });
        lines.push(``);
        lines.push(`// 数据系列`);
        currData.series.forEach(s => {
            lines.push(`Series: ${s.name}, [${s.values.join(', ')}], ${s.color || 'null'}, ${s.fillOpacity || 'null'}`);
        });
        return lines.join('\n');
    };

    const handleParseDSL = (content: string) => {
        const { data: newData, styles: newStyles } = parseRadarDSL(content, styles);
        onDataChange(newData);
        onStylesChange(newStyles);
    };

    const doReset = () => {
            setDsl(INITIAL_RADAR_DSL);
            handleParseDSL(INITIAL_RADAR_DSL);
        setConfirmReset(false);
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateLogicDSL(aiPrompt, QCToolType.RADAR);
            setDsl(result);
            handleParseDSL(result);
            setActiveTab('dsl');
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
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
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">雷达图多维分析</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Radar Engine | LUXI LAB</p>
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
                        <button onClick={() => setConfirmReset(true)} disabled={confirmReset} className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-[var(--text-warn)] transition-all border border-[var(--border-line-r)] shadow-sm">
                            <RotateCcw size={18} />
                        </button>
                        <button onClick={() => setShowDocs(true)} className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--border-line-r)] shadow-sm">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>
                <nav className="flex bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)] gap-1">
                    {[
                        { id: 'manual', label: '手动编辑', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--card-bg)]'}`}>
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
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">基础配置</span>
                            </div>
                            <input
                                value={data.title}
                                onChange={e => {
                                    onDataChange({ ...data, title: e.target.value });
                                    onStylesChange({ ...styles, title: e.target.value });
                                }}
                                className="w-full h-10 px-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-[11px] font-bold focus:outline-none text-[var(--sidebar-text)]"
                                placeholder="图表标题"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[var(--sidebar-text)] uppercase pl-1">网格层级: {styles.gridLevels}</label>
                                    <input type="range" min="1" max="10" value={styles.gridLevels} onChange={e => onStylesChange({ ...styles, gridLevels: parseInt(e.target.value) })} className="w-full h-1 bg-[var(--input-border)] rounded-md appearance-none cursor-pointer" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[var(--sidebar-text)] uppercase pl-1">起始角度: {styles.startAngle}°</label>
                                    <input type="range" min="-360" max="360" value={styles.startAngle} onChange={e => onStylesChange({ ...styles, startAngle: parseInt(e.target.value) })} className="w-full h-1 bg-[var(--input-border)] rounded-md appearance-none cursor-pointer" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">统计分析算子</span>
                            </div>
                            <div className="p-4 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] grid grid-cols-1 gap-4">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider transition-colors">自动数据标准化</span>
                                    <Switch checked={!!(styles.standardize)} onChange={v => onStylesChange({ ...styles, standardize: v })} ariaLabel="自动数据标准化" />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider transition-colors">展示面积评分</span>
                                    <Switch checked={!!(styles.showAreaScore)} onChange={v => onStylesChange({ ...styles, showAreaScore: v })} ariaLabel="展示面积评分" />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider transition-colors">相似性分析</span>
                                    <Switch checked={!!(styles.showSimilarity)} onChange={v => onStylesChange({ ...styles, showSimilarity: v })} ariaLabel="相似性分析" />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">坐标与显示</span>
                            </div>
                            <div className="p-4 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] grid grid-cols-1 gap-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <Switch checked={!!(styles.isClosed)} onChange={v => onStylesChange({ ...styles, isClosed: v })} ariaLabel="多边形坐标系" />
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider transition-colors">多边形坐标系</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <Switch checked={!!(styles.clockwise)} onChange={v => onStylesChange({ ...styles, clockwise: v })} ariaLabel="顺时针方向" />
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider transition-colors">顺时针方向</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <Switch checked={!!(styles.showValues)} onChange={v => onStylesChange({ ...styles, showValues: v })} ariaLabel="显示数值标签" />
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider transition-colors">显示数值标签</span>
                                </label>
                            </div>
                        </div>

                        {/* Axis Management */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pl-2">
                                <div className="flex items-center gap-3">
                                    <ChevronRight size={14} className="text-primary" />
                                    <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">维度指标定义</span>
                                </div>
                                <button
                                    onClick={() => {
                                        const newAxes = [...data.axes, { name: `新指标 ${data.axes.length + 1}`, max: 100, min: 0 }];
                                        const newSeries = data.series.map(s => ({ ...s, values: [...s.values, 0] }));
                                        onDataChange({ ...data, axes: newAxes, series: newSeries });
                                    }}
                                    className="p-1.5 hover:bg-[var(--card-bg)] rounded-md text-[var(--text-main)] transition-colors border border-transparent hover:border-[var(--border-line-r)]"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {data.axes.map((axis, idx) => (
                                    <div key={idx} className="group flex items-center gap-2 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <div className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md px-3 h-10 flex items-center gap-2 group-hover:border-[var(--luxi-gold)]/30 transition-all">
                                            <input
                                                value={axis.name}
                                                onChange={e => {
                                                    const newAxes = [...data.axes];
                                                    newAxes[idx] = { ...newAxes[idx], name: e.target.value };
                                                    onDataChange({ ...data, axes: newAxes });
                                                }}
                                                className="bg-transparent text-[11px] font-bold text-[var(--sidebar-text)] outline-none flex-1"
                                                placeholder="指标名称"
                                            />
                                            <div className="h-4 w-px bg-[var(--sidebar-border)]" />
                                            <input
                                                type="number"
                                                value={axis.min || 0}
                                                onChange={e => {
                                                    const newAxes = [...data.axes];
                                                    newAxes[idx] = { ...newAxes[idx], min: parseFloat(e.target.value) };
                                                    onDataChange({ ...data, axes: newAxes });
                                                }}
                                                className="bg-transparent text-[11px] font-bold text-[var(--sidebar-text)] outline-none w-10 text-center"
                                                placeholder="MIN"
                                            />
                                            <div className="h-4 w-px bg-[var(--sidebar-border)]" />
                                            <input
                                                type="number"
                                                value={axis.max}
                                                onChange={e => {
                                                    const newAxes = [...data.axes];
                                                    newAxes[idx] = { ...newAxes[idx], max: parseFloat(e.target.value) };
                                                    onDataChange({ ...data, axes: newAxes });
                                                }}
                                                className="bg-transparent text-[11px] font-bold text-[var(--text-main)] outline-none w-10 text-center"
                                                placeholder="MAX"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (data.axes.length <= 3) return;
                                                const newAxes = data.axes.filter((_, i) => i !== idx);
                                                const newSeries = data.series.map(s => ({ ...s, values: s.values.filter((_, i) => i !== idx) }));
                                                onDataChange({ ...data, axes: newAxes, series: newSeries });
                                            }}
                                            className="w-10 h-10 flex items-center justify-center bg-[var(--card-bg)] border border-[var(--border-line-r)] rounded-md text-[var(--sidebar-muted)] hover:text-[var(--text-danger)] group-hover:opacity-100 transition-all shadow-sm"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Series Management */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pl-2">
                                <div className="flex items-center gap-3">
                                    <ChevronRight size={14} className="text-primary" />
                                    <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">数据系列管理</span>
                                </div>
                                <button
                                    onClick={() => {
                                        const newSeries = [...data.series, {
                                            name: `新系列 ${data.series.length + 1}`,
                                            values: data.axes.map(() => 0),
                                            color: '#fbbf24',
                                            fillOpacity: 0.3
                                        }];
                                        onDataChange({ ...data, series: newSeries });
                                    }}
                                    className="p-1.5 hover:bg-[var(--card-bg)] rounded-md text-[var(--text-main)] transition-colors border border-transparent hover:border-[var(--border-line-r)]"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {data.series.map((s, idx) => (
                                    <div key={idx} className="flex flex-col bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] overflow-hidden group transition-all hover:border-[var(--luxi-gold)]/30">
                                        <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--border-line-r)]">
                                            <div className="flex items-center gap-3">
                                                <input type="color" value={s.color || '#0D5E42'} onChange={e => {
                                                    const newSeries = [...data.series];
                                                    newSeries[idx] = { ...newSeries[idx], color: e.target.value };
                                                    onDataChange({ ...data, series: newSeries });
                                                }} className="w-6 h-6 bg-transparent cursor-pointer rounded overflow-hidden border-none" />
                                                <input
                                                    value={s.name}
                                                    onChange={e => {
                                                        const newSeries = [...data.series];
                                                        newSeries[idx] = { ...newSeries[idx], name: e.target.value };
                                                        onDataChange({ ...data, series: newSeries });
                                                    }}
                                                    className="bg-transparent text-[11px] font-bold text-[var(--sidebar-text)] outline-none"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 mr-4">
                                                <span className="text-[11px] text-[var(--sidebar-muted)] font-black">透明度</span>
                                                <input type="range" min="0" max="1" step="0.1" value={s.fillOpacity || 0.3} onChange={e => {
                                                    const newSeries = [...data.series];
                                                    newSeries[idx] = { ...newSeries[idx], fillOpacity: parseFloat(e.target.value) };
                                                    onDataChange({ ...data, series: newSeries });
                                                }} className="w-12 h-1 bg-[var(--sidebar-border)] rounded-md appearance-none cursor-pointer" />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newSeries = data.series.filter((_, i) => i !== idx);
                                                    onDataChange({ ...data, series: newSeries });
                                                }}
                                                className="p-2 text-[var(--sidebar-muted)] hover:text-[var(--text-danger)] transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="p-3 grid grid-cols-3 gap-2 bg-[var(--card-bg)]/50">
                                            {data.axes.map((axis, aIdx) => (
                                                <div key={aIdx} className="space-y-1">
                                                    <label className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase truncate block">{axis.name}</label>
                                                    <input
                                                        type="number"
                                                        value={s.values[aIdx]}
                                                        onChange={e => {
                                                            const newSeries = [...data.series];
                                                            const newValues = [...newSeries[idx].values];
                                                            newValues[aIdx] = parseFloat(e.target.value);
                                                            newSeries[idx] = { ...newSeries[idx], values: newValues };
                                                            onDataChange({ ...data, series: newSeries });
                                                        }}
                                                        className="w-full h-7 px-2 bg-[var(--card-bg)] border border-[var(--border-line-r)] rounded-md text-[11px] font-bold text-[var(--text-main)] outline-none/50"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="iqs-note">
                            <p className="text-[11px] text-[var(--text-warn)] font-bold leading-relaxed uppercase">
                                💡 进阶提示：当变量超过 15 个时，雷达图可能会显得拥挤，建议精简指标或关注前 5 个关键特征。
                            </p>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <textarea
                            value={dsl}
                            onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }}
                            className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                            placeholder="输入 DSL 指令..."
                            spellCheck={false}
                        />
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] space-y-8 relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能评估描述</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                                placeholder="输入评估指标和数值，例如：'对比 A 和 B 产品的 5 个维度性能，维度包括：价格、功能、美观度、易用性、稳定性'..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-md flex items-center justify-center gap-4 transition-all relative overflow-hidden group ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-white" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在精准推演...</span>
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
                                <p className="text-[11px] text-[var(--text-main)] leading-relaxed font-medium">
                                    您可以输入如“对比两款手机的硬件参数”或“部门月度 KPI 达成情况”等核心描述。AI 将自动识别维度轴与数值序列，为您生成具备专业配色的雷达图 DSL 配置。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && (
                <CardDocModal kind="radar" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
        
    );
};

export default RadarEditor;
