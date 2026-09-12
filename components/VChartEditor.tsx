import React, { useState, useEffect, useRef } from 'react';
import { VChartData, VChartChartStyles, DEFAULT_VCHART_STYLES, VChartAnimationMode, QCToolType } from '../types';
import { INITIAL_VCHART_DSL, VCHART_COLOR_PALETTES } from '../constants';
import { 
    Cpu, Sparkles, RotateCcw, Database, Code, 
    ChevronRight, Loader2, HelpCircle, X, BarChart3, Zap,
    AlertTriangle,
} from 'lucide-react';
import {generateLogicDSL} from '../services/aiService';
import { CardDocModal } from './CardDocModal';
import { Switch } from './ui/Switch';
import { useAIEngine } from '../hooks/useAIEngine';
import { ConfirmInline } from './ui/ConfirmInline';

interface VChartEditorProps {
    data: VChartData;
    styles: VChartChartStyles;
    theme: 'light' | 'dark';
    onDataChange: (data: VChartData) => void;
    onStylesChange: (styles: VChartChartStyles) => void;
}

export const parseVChartDSL = (content: string, baseStyles: VChartChartStyles = DEFAULT_VCHART_STYLES) => {
    const lines = content.split('\n');
    let title = baseStyles.title;
    let colorPalette = baseStyles.colorPalette;
    let titleFontSize = baseStyles.titleFontSize;
    let showTitle = baseStyles.showTitle;
    let showLabel = baseStyles.showLabel;
    let animation = baseStyles.animation;
    let animationMode = baseStyles.animationMode;
    let specStr = '';
    let inSpec = false;

    lines.forEach(line => {
        let trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        // 自动剔除 Markdown 代码块标记，防止解析崩溃
        if (trimmed.startsWith('```')) {
            trimmed = trimmed.replace(/`{3,}(dsl|json|vchart)?/i, '').trim();
            if (!trimmed) return;
        }

        const upperTrimmed = trimmed.toUpperCase();
        
        // 检查是否遇到新标签，如果是，则结束当前 Spec 解析状态
        const isNewTag = ['TITLE:', 'COLORPALETTE:', 'FONT[TITLE]:', 'SHOWTITLE:', 'SHOWLABEL:', 'ANIMATION:', 'ANIMATIONMODE:', 'SPEC:'].some(tag => upperTrimmed.startsWith(tag));
        if (isNewTag && upperTrimmed.indexOf('SPEC:') === -1) {
            inSpec = false;
        }

        if (upperTrimmed.startsWith('TITLE:')) {
            title = trimmed.substring(6).trim();
        } else if (upperTrimmed.startsWith('COLORPALETTE:')) {
            colorPalette = trimmed.substring(13).trim();
        } else if (upperTrimmed.startsWith('FONT[TITLE]:')) {
            titleFontSize = parseInt(trimmed.split(':')[1]) || titleFontSize;
        } else if (upperTrimmed.startsWith('SHOWTITLE:')) {
            showTitle = trimmed.substring(10).trim().toLowerCase() !== 'false';
        } else if (upperTrimmed.startsWith('SHOWLABEL:')) {
            showLabel = trimmed.substring(10).trim().toLowerCase() !== 'false';
        } else if (upperTrimmed.startsWith('ANIMATION:')) {
            animation = trimmed.substring(10).trim().toLowerCase() === 'true';
        } else if (upperTrimmed.startsWith('ANIMATIONMODE:')) {
            animationMode = trimmed.substring(14).trim() as VChartAnimationMode;
        } else if (upperTrimmed.startsWith('SPEC:')) {
            inSpec = true;
            const colonIndex = trimmed.indexOf(':');
            specStr = trimmed.substring(colonIndex + 1).trim();
        } else if (inSpec) {
            specStr += ' ' + trimmed;
        }
    });

    // 清理 specStr 尾部的 Markdown 结束符
    specStr = specStr.replace(/`{3,}.*$/g, '').trim();

    let spec = {};
    let parseError = '';
    try {
        if (specStr) {
            spec = JSON.parse(specStr.trim());
        }
    } catch (e: any) {
        console.warn('VChart Spec JSON Parse Error:', e);
        parseError = e.message;
    }

    return {
        data: { title, spec, error: parseError },
        styles: { 
            ...baseStyles, 
            title, 
            colorPalette, 
            titleFontSize, 
            showTitle,
            showLabel,
            animation,
            animationMode
        }
    };
};



const ANIMATION_MODES: { id: VChartAnimationMode; label: string }[] = [
    { id: 'scale',   label: '缩放 (Scale)' },
    { id: 'fadeIn',  label: '淡入 (Fade In)' },
    { id: 'appear',  label: '出现 (Appear)' },
    { id: 'move',    label: '移动 (Move)' },
];

const VChartEditor: React.FC<VChartEditorProps> = ({ data, styles, theme, onDataChange, onStylesChange }) => {
    const [dsl, setDsl] = useState(INITIAL_VCHART_DSL);
    const [error, setError] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const engineName = useAIEngine();
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');


    const isInitialized = useRef(false);
    useEffect(() => {
        if (!isInitialized.current) {
            if (!data.spec || Object.keys(data.spec).length === 0) {
                handleParseDSL(INITIAL_VCHART_DSL);
            } else {
                setDsl(generateDSLFromState(data, styles));
            }
            isInitialized.current = true;
        }
    }, [data]);

    const generateDSLFromState = (currData: VChartData, currStyles: VChartChartStyles) => {
        let dslLines = [`Title: ${currData.title}`];
        if (currStyles.colorPalette) dslLines.push(`ColorPalette: ${currStyles.colorPalette}`);
        if (currStyles.titleFontSize) dslLines.push(`Font[Title]: ${currStyles.titleFontSize}`);
        dslLines.push(`ShowTitle: ${currStyles.showTitle}`);
        dslLines.push(`ShowLabel: ${currStyles.showLabel}`);
        dslLines.push(`Animation: ${currStyles.animation}`);
        if (currStyles.animation) dslLines.push(`AnimationMode: ${currStyles.animationMode}`);
        
        dslLines.push('');
        dslLines.push(`Spec: ${JSON.stringify(currData.spec, null, 2)}`);
        
        return dslLines.join('\n');
    };

    const handleParseDSL = (content: string) => {
        try {
            const { data: newData, styles: newStyles } = parseVChartDSL(content, styles);
            onDataChange(newData);
            onStylesChange(newStyles);
        } catch (e) {
            console.error('Failed to parse DSL', e), setError(`Failed to parse DSL ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const doReset = () => {
            setDsl(INITIAL_VCHART_DSL);
            handleParseDSL(INITIAL_VCHART_DSL);
        setConfirmReset(false);
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateLogicDSL(aiPrompt, QCToolType.VCHART);
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
            <div className="p-6 border-b border-[var(--border-line-r)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
                            <Cpu size={22} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">VChart 全能引擎</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">VisActor Chart Engine | IQS Core</p>
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
                        <button onClick={() => setConfirmReset(true)} disabled={confirmReset} className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-[var(--text-warn)] transition-all border border-[var(--border-line-r)] shadow-sm" title="恢复示例">
                            <RotateCcw size={18} />
                        </button>
                        <button onClick={() => setShowDocs(true)} className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--border-line-r)] shadow-sm" title="配置帮助">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)] gap-1">
                    {[
                        { id: 'manual', label: '全局配置', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'JSON 脚本', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--card-bg)]'}`}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
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
                {activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <textarea
                            value={dsl}
                            onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }}
                            className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                            placeholder='{"type": "bar", ...}'
                            spellCheck={false}
                        />
                    </div>
                ) : activeTab === 'manual' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* === 标题控制 === */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">标题</span>
                            </div>
                            <div className="space-y-3 bg-[var(--input-bg)] p-4 rounded-md border border-[var(--input-border)]">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase pl-1">图表标题文字</label>
                                    <input
                                        value={data.title}
                                        onChange={e => onDataChange({ ...data, title: e.target.value })}
                                        className="w-full h-10 px-4 bg-[var(--card-bg)] border border-[var(--input-border)] rounded-md text-[11px] font-bold focus:outline-none text-[var(--sidebar-text)]"
                                    />
                                </div>
                            <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase pl-1">标题字号: {styles.titleFontSize}px</label>
                                    <input type="range" min="12" max="48" value={styles.titleFontSize}
                                        onChange={e => onStylesChange({ ...styles, titleFontSize: parseInt(e.target.value) })}
                                        className="w-full h-1 bg-[var(--input-border)] rounded-md appearance-none cursor-pointer" />
                                </div>
                            </div>
                        </div>

                        {/* === 主题与配色 === */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">主题与配色</span>
                            </div>
                            <div className="bg-[var(--input-bg)] p-4 rounded-md border border-[var(--input-border)]">
                                <div className="grid grid-cols-1 gap-1.5">
                                    {VCHART_COLOR_PALETTES.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => onStylesChange({ ...styles, colorPalette: p.id })}
                                            className={`flex items-center justify-between p-2.5 rounded-md border transition-all ${styles.colorPalette === p.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-[var(--card-bg)] border-[var(--input-border)] text-[var(--sidebar-text)] hover:border-primary/30'}`}
                                        >
                                            <span className="text-[11px] font-bold">{p.name}</span>
                                            <div className="flex gap-1">
                                                {p.colors.length > 0
                                                    ? p.colors.slice(0, 5).map((c, idx) => (
                                                        <div key={idx} className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                                                    ))
                                                    : <span className="text-[11px] text-[var(--sidebar-muted)] italic">VChart 原生</span>
                                                }
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* === 显示控制 + 动画控制 (合并到同一块) === */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">显示与动画</span>
                            </div>
                            <div className="bg-[var(--input-bg)] p-4 rounded-md border border-[var(--input-border)] grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <Switch checked={!!(styles.showTitle)} onChange={v => onStylesChange({ ...styles, showTitle: v })} ariaLabel="显示标题" />
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider">显示标题</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <Switch checked={!!(styles.showLabel)} onChange={v => onStylesChange({ ...styles, showLabel: v })} ariaLabel="显示数值" />
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider">显示数值</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group col-span-2">
                                    <Switch checked={!!(styles.animation)} onChange={v => onStylesChange({ ...styles, animation: v })} ariaLabel="开启动画（默认关闭，适合大数据）" />
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] group-hover:text-[var(--text-ok)] uppercase tracking-wider">开启动画（默认关闭，适合大数据）</span>
                                </label>
                            </div>
                        </div>


                        {styles.animation && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3 pl-2">
                                    <ChevronRight size={14} className="text-primary" />
                                    <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">动画类型</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {ANIMATION_MODES.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => onStylesChange({ ...styles, animationMode: m.id })}
                                            className={`py-2 px-3 rounded-md border text-[11px] font-black uppercase tracking-wide transition-all ${
                                                styles.animationMode === m.id
                                                    ? 'bg-primary border-primary text-white'
                                                    : 'bg-[var(--card-bg)] border-[var(--input-border)] text-[var(--sidebar-muted)] hover:border-primary/30'
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] space-y-8 relative overflow-hidden group">
                           <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">AI 智能生成</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                className="iqs-input min-h-[160px] resize-y"
                                placeholder="描述你想要生成的复杂图表，例如：'绘制一张展示 2024 年各产品线由于质量问题导致的成本损失与月度趋势的组合图'..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-md flex items-center justify-center gap-4 transition-all relative overflow-hidden group ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-primary" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在解析 Spec...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">AI 生成图表脚本</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && (
                <CardDocModal kind="vchart" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
    );
};

export default VChartEditor;
