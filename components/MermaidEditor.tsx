import React, { useState, useEffect } from 'react';
import { MermaidChartStyles, DEFAULT_MERMAID_STYLES, QCToolType } from '../types';
import {
    Cpu, Edit3, Code, Sparkles, Settings2, HelpCircle, X, RotateCcw,
    Loader2, Zap, LayoutGrid, ChevronRight, Palette, Type,
    Database, GitBranch,
    AlertTriangle,
} from 'lucide-react';
import {generateLogicDSL} from '../services/aiService';
import { INITIAL_MERMAID_DSL } from '../constants';
import { CardDocModal } from './CardDocModal';
import { Switch } from './ui/Switch';
import { useAIEngine } from '../hooks/useAIEngine';
import { ConfirmInline } from './ui/ConfirmInline';

interface MermaidEditorProps {
    data: string;
    styles: MermaidChartStyles;
    onDataChange: (data: string) => void;
    onStylesChange: (styles: MermaidChartStyles) => void;
}

const MermaidEditor: React.FC<MermaidEditorProps> = ({
    data,
    styles = DEFAULT_MERMAID_STYLES,
    onDataChange,
    onStylesChange
}) => {
    const [activeTab, setActiveTab] = useState<'style' | 'dsl' | 'ai'>('style');
    const [confirmReset, setConfirmReset] = useState(false);
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'syntax' | 'examples'>('syntax');
    const [error, setError] = useState<string | null>(null);

    // Sync styles into DSL (Directives)
    useEffect(() => {
        if (!data) return;

        // Check if we have an init directive
        const initRegex = /^%%{init:\s*({[\s\S]*?})\s*}%%/;
        const match = data.match(initRegex);

        const newConfig = {
            theme: styles.theme,
            themeVariables: {
                fontSize: `${styles.fontSize}px`,
                titleFontSize: `${styles.titleFontSize}px`
            }
        };

        const directive = `%%{init: ${JSON.stringify(newConfig)}}%%`;

        if (match) {
            // Update existing directive if content changed (to avoid infinite loop, only update if different)
            if (match[0] !== directive) {
                onDataChange(data.replace(initRegex, directive));
            }
        } else {
            // Prepend new directive
            onDataChange(`${directive}\n${data}`);
        }
    }, [styles.theme, styles.fontSize, styles.titleFontSize]);

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const engineName = useAIEngine();


    const doReset = () => {
            onDataChange(INITIAL_MERMAID_DSL);
            onStylesChange(DEFAULT_MERMAID_STYLES);
        setConfirmReset(false);
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        try {
            const dslResult = (await generateLogicDSL(aiPrompt, QCToolType.MERMAID)) as string;
            onDataChange(dslResult);
            setActiveTab('dsl');
        } catch (err) {
            console.error('AI Generation failed:', err), setError(`AI Generation failed: ${err instanceof Error ? err.message : String(err)}`);
            alert('AI 生成失败，请检查网络连接或 API 配置。');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative">
            {/* Header Area */}
            <div className="p-6 border-b border-[var(--border-line-r)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
                            <Cpu size={22} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">Mermaid 流程图分析</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Mermaid Engine | LUXI LAB</p>
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
                            className="p-3 bg-[var(--input-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--input-border)]"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            onClick={() => setShowDocs(true)}
                            className="p-3 bg-[var(--input-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--input-border)]"
                            title="帮助文档"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex gap-2 p-1.5 bg-[var(--nav-bg)] rounded-md border border-[var(--border-line-r)]">
                    {[
                        { id: 'style', label: '面板配置', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--input-bg)]'
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
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
                {activeTab === 'style' ? (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图表核心信息</span>
                            </div>
                            <input
                                value={styles.title}
                                onChange={e => onStylesChange({ ...styles, title: e.target.value })}
                                className="iqs-input h-11"
                                placeholder="图表标题"
                            />
                        </div>

                        <div className="p-8 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            <div className="flex items-center gap-3 border-b border-[var(--border-line-r)] pb-3">
                                <Palette size={14} className="text-primary" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">颜色方案与样式</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <span className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">内置主题</span>
                                    <select
                                        value={styles.theme}
                                        onChange={e => onStylesChange({ ...styles, theme: e.target.value as any })}
                                        className="w-full h-12 px-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-sm font-bold text-[var(--sidebar-text)] outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="default">默认主题 (Default)</option>
                                        <option value="forest">森林草木 (Forest)</option>
                                        <option value="dark">暗黑视界 (Dark)</option>
                                        <option value="neutral">中性简约 (Neutral)</option>
                                        <option value="base">工业基座 (Base)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">背景颜色</span>
                                    <div className="flex items-center gap-1.5 bg-[var(--input-bg)] p-2 rounded-md border border-[var(--input-border)]">
                                        <input
                                            type="color"
                                            value={styles.backgroundColor}
                                            onChange={e => onStylesChange({ ...styles, backgroundColor: e.target.value })}
                                            className="w-5 h-5 rounded bg-transparent cursor-pointer border-none p-0"
                                        />
                                        <span className="text-[11px] font-mono text-[var(--sidebar-text)] leading-none">画布背景</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">外观风格 (手绘模式)</span>
                                    <Switch checked={styles.look === 'handDrawn'} onChange={v => onStylesChange({ ...styles, look: v ? 'handDrawn' : 'classic' })} ariaLabel="外观风格（手绘模式）" />
                                </div>
                                <p className="text-[11px] text-[var(--sidebar-muted)] font-medium tracking-wider leading-relaxed px-1">开启手绘模式 (Hand-drawn) 将展示更具艺术感的草描效果。</p>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">高级布局引擎 (ELK)</span>
                                    <Switch checked={!!styles.useElk} onChange={v => onStylesChange({ ...styles, useElk: v })} ariaLabel="高级布局引擎（ELK）" />
                                </div>
                                <p className="text-[11px] text-[var(--sidebar-muted)] font-medium tracking-wider leading-relaxed px-1">启用 ELK 布局引擎可获得更优化的复杂图表排列方案。</p>
                            </div>

                            {styles.useElk && (
                                <div className="space-y-4 pt-4 border-t border-[var(--border-line-r)] animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">合并平行边 (Merge Edges)</span>
                                        <Switch checked={!!styles.elkMergeEdges} onChange={v => onStylesChange({ ...styles, elkMergeEdges: v })} ariaLabel="合并重复边" />
                                    </div>

                                    <div className="space-y-2">
                                        <span className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">节点放置策略</span>
                                        <select
                                            value={styles.elkNodePlacementStrategy}
                                            onChange={e => onStylesChange({ ...styles, elkNodePlacementStrategy: e.target.value as any })}
                                            className="w-full h-10 px-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-[11px] font-bold text-[var(--sidebar-text)] outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="SIMPLE">简单策略 (SIMPLE)</option>
                                            <option value="NETWORK_SIMPLE">网络简单 (NETWORK_SIMPLE)</option>
                                            <option value="LINEAR_SEGMENTS">线性段 (LINEAR_SEGMENTS)</option>
                                            <option value="BRANDES_KOEPF">最优对齐 (BRANDES_KOEPF)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            <div className="flex items-center gap-3 border-b border-[var(--border-line-r)] pb-3">
                                <Type size={14} className="text-primary" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">排版设置</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <span className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">标题字号</span>
                                    <input
                                        type="number"
                                        value={styles.titleFontSize}
                                        onChange={e => onStylesChange({ ...styles, titleFontSize: parseInt(e.target.value) })}
                                        className="w-full h-10 px-3 text-[11px] font-bold bg-[var(--input-bg)] text-[var(--sidebar-text)] border border-[var(--input-border)] rounded-md"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">内部字号</span>
                                    <input
                                        type="number"
                                        value={styles.fontSize}
                                        onChange={e => onStylesChange({ ...styles, fontSize: parseInt(e.target.value) })}
                                        className="w-full h-10 px-3 text-[11px] font-bold bg-[var(--input-bg)] text-[var(--sidebar-text)] border border-[var(--input-border)] rounded-md"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between pl-2">
                            <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">Mermaid 脚本指令</span>
                        </div>
                        <textarea
                            value={data}
                            onChange={(e) => onDataChange(e.target.value)}
                            className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                            placeholder="输入 Mermaid 脚本..."
                            spellCheck={false}
                        />
                    </div>
                ) : activeTab === 'ai' ? (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">AI 智能逻辑推演</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse " />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="例如：画一个电商购物流程图，包含浏览、下单、支付、发货等环节..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`shrink-0 ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-primary" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在解析图形结构...</span>
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
                                    您可以输入原始文本、逻辑流程描述或业务规则。AI 会自动识别**节点关系**与**流程走向**，并依据“逻辑建模”为您配置好分析视角与架构。
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {showDocs && (
                <CardDocModal kind="mermaid" open={showDocs} onClose={() => setShowDocs(false)} />
            )}

        </div >
        
    );
};

export default MermaidEditor;
