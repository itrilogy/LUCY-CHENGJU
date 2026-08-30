import React, { useState, useEffect } from 'react';
import {
    createPortal } from 'react-dom';
import { FishboneNode,
    FishboneChartStyles,
    DEFAULT_FISHBONE_STYLES } from '../types';
import { INITIAL_FISHBONE_DSL } from '../constants';
import { GitBranch,
    Sparkles,
    HelpCircle,
    X,
    Loader2,
    Database,
    Send,
    Plus,
    Trash2,
    ChevronRight,
    Code,
    RotateCcw,
    Activity,
    Cpu,
    Zap
} from 'lucide-react';
import { generateLogicDSL, getAIStatus } from '../services/aiService';
import { QCToolType } from '../types';

interface FishboneEditorProps {
    data: FishboneNode;
    styles: FishboneChartStyles;
    onDataChange: (data: FishboneNode) => void;
    onStylesChange: (styles: FishboneChartStyles) => void;
}

export const parseFishboneDSL = (content: string, baseStyles: FishboneChartStyles = DEFAULT_FISHBONE_STYLES) => {
    const lines = content.split('\n');
    const newStyles: FishboneChartStyles = { ...baseStyles };
    let title = '鱼骨图分析';
    const nodes: FishboneNode[] = [];
    const stack: { node: FishboneNode, level: number }[] = [];

    lines.forEach((line) => {
        const trimmed = line.trim();
        // IQS-DSL v1: // comments; # headers are Tree structure (do not skip)
        if (!trimmed || trimmed.startsWith('//')) return;

        // Parse Colors
        const colorMatch = trimmed.match(/Color\[(Root|RootText|Main|MainText|Bone|Line|Text|End)\]:\s*(#[0-9a-fA-F]+)/i);
        if (colorMatch) {
            let key = colorMatch[1].toLowerCase();
            if (key === 'root') key = 'rootColor';
            if (key === 'roottext') key = 'rootTextColor';
            if (key === 'main') key = 'mainColor';
            if (key === 'maintext') key = 'mainTextColor';
            if (key === 'bone') key = 'boneLine';
            if (key === 'line') key = 'caseLine';
            if (key === 'text') key = 'caseColor';
            (newStyles as any)[key] = colorMatch[2];
            return;
        }

        // Parse Title
        if (trimmed.startsWith('Title:')) {
            title = trimmed.replace('Title:', '').trim();
            return;
        }

        // Parse Hierarchy
        const headerMatch = trimmed.match(/^(#+)\s+(.+)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const label = headerMatch[2].trim();
            const newNode: FishboneNode = {
                id: `node-${Math.random().toString(36).substr(2, 9)}`,
                label: label,
                type: level === 1 ? 'main' : 'sub',
                children: []
            };

            if (level === 1) {
                nodes.push(newNode);
                stack.length = 0;
                stack.push({ node: newNode, level });
            } else {
                while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                    stack.pop();
                }
                if (stack.length > 0) {
                    const parent = stack[stack.length - 1].node;
                    if (!parent.children) parent.children = [];
                    parent.children.push(newNode);
                    stack.push({ node: newNode, level });
                }
            }
        }
    });

    const root: FishboneNode = { id: 'root', label: title, type: 'root', children: nodes };
    return { data: root, styles: newStyles };
};

const FishboneEditor: React.FC<FishboneEditorProps> = ({ data, styles, onDataChange, onStylesChange }) => {
    const [dsl, setDsl] = useState(() => generateDSLFromData(data, styles));
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [error, setError] = useState<string | null>(null);

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiConfig, setAiConfig] = useState<any>(null);
    const [engineName, setEngineName] = useState('DeepSeek');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    // Load AI Config
    useEffect(() => {
        fetch('/chart_spec.json')
            .then(res => res.json())
            .then(config => setAiConfig(config))
            .catch(err => console.error('Failed to load AI config:', err));
    }, []);

    function generateDSLFromData(root: FishboneNode, s: FishboneChartStyles) {
        let lines: string[] = [];
        if (root.label) lines.push(`Title: ${root.label}`);

        const styleMap: any = {
            rootColor: 'Root',
            rootTextColor: 'RootText',
            mainColor: 'Main',
            mainTextColor: 'MainText',
            boneLine: 'Bone',
            caseLine: 'Line',
            caseColor: 'Text', // Standard text color
            endColor: 'End'
        };
        Object.entries(styleMap).forEach(([key, dslKey]) => {
            if ((s as any)[key]) lines.push(`Color[${dslKey}]: ${(s as any)[key]}`);
        });

        lines.push('');

        const traverse = (nodes: FishboneNode[], level: number) => {
            nodes.forEach(node => {
                lines.push(`${'#'.repeat(level)} ${node.label}`);
                if (node.children && node.children.length > 0) {
                    traverse(node.children, level + 1);
                }
            });
        };
        if (root.children) traverse(root.children, 1);
        return lines.join('\n');
    }

    const handleTabChange = (tab: 'manual' | 'dsl' | 'ai') => {
        if (tab === 'dsl') setDsl(generateDSLFromData(data, styles));
        setActiveTab(tab);
    };

    const handleParseDSL = (content: string) => {
        try {
            const { data: newData, styles: newStyles } = parseFishboneDSL(content, styles);
            onDataChange(newData);
            onStylesChange(newStyles);
            setError(null);
        } catch (e) {
            setError('DSL 解析错误');
        }
    };

    const handleDSLChange = (val: string) => {
        setDsl(val);
        handleParseDSL(val);
    };

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？当前所有修改将丢失。')) {
            setDsl(INITIAL_FISHBONE_DSL);
            handleParseDSL(INITIAL_FISHBONE_DSL);
        }
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        try {
            const dslResult = (await generateLogicDSL(aiPrompt, QCToolType.FISHBONE)) as string;

            // Direct DSL Injection
            setDsl(dslResult);
            handleParseDSL(dslResult);

            setActiveTab('dsl');
        } catch (err) {
            console.error('AI Generation failed:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative">
                {/* Header Area */}
                <div className="p-6 border-b border-[var(--sidebar-border)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                            <Cpu size={22} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">鱼骨图分析推演</h2>
                            <p className="text-[8px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Fishbone Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="p-3 bg-[var(--input-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-blue-400 transition-all border border-[var(--input-border)]"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            onClick={() => setShowDocs(true)}
                            className="p-3 bg-[var(--input-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-white transition-all border border-[var(--input-border)]"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex bg-[var(--nav-bg)] p-1.5 rounded-lg border border-[var(--sidebar-border)] gap-1">
                    {[
                        { id: 'manual', label: '手动录入', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleTabChange(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-xl' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--input-bg)]'
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'manual' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Title Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">分析课题 (鱼头)</span>
                            </div>
                            <input
                                value={data.label}
                                onChange={e => onDataChange({ ...data, label: e.target.value })}
                                className="w-full h-14 px-6 logic-terminal-input text-sm font-bold bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--sidebar-text)] rounded-lg focus:border-blue-500 outline-none transition-all shadow-sm"
                                placeholder="输入核心分析问题..."
                            />
                        </div>

                        {/* Hierarchical Structure - Line-based DSL Entry (Single Input) */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between pl-2">
                                <div className="flex items-center gap-3">
                                    <ChevronRight size={14} className="text-blue-500" />
                                    <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">快速语法录入 (# 主骨 / ## 子因)</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {(() => {
                                    const lines = dsl.split('\n');
                                    const dataLineIndices: number[] = [];
                                    lines.forEach((line, idx) => {
                                        if (line.trim().startsWith('#')) {
                                            dataLineIndices.push(idx);
                                        }
                                    });

                                    if (dataLineIndices.length === 0) {
                                        return (
                                            <div className="p-8 text-center text-[var(--sidebar-muted)] text-xs border border-dashed border-[var(--sidebar-border)] rounded-lg">
                                                暂无数据。请点击下方按钮添加节点。
                                            </div>
                                        );
                                    }

                                    return dataLineIndices.map((lineIdx, index) => (
                                        <div key={lineIdx} className="flex gap-3 group items-center animate-in fade-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                            <div className="flex-1 h-12 flex items-center bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 group-hover:border-blue-500/30 transition-all focus-within:border-blue-500/60 focus-within:bg-[var(--input-bg)]/80 shadow-sm">
                                                <div className="flex items-center gap-2 w-full">
                                                    <span className="text-[9px] font-black text-[var(--sidebar-muted)] w-6 font-mono opacity-50">{(index + 1).toString().padStart(2, '0')}</span>
                                                    <input
                                                        value={lines[lineIdx]}
                                                        onChange={e => {
                                                            const newLines = [...lines];
                                                            newLines[lineIdx] = e.target.value;
                                                            const newContent = newLines.join('\n');
                                                            setDsl(newContent);
                                                            handleParseDSL(newContent);
                                                        }}
                                                        className="bg-transparent border-none outline-none text-xs font-mono font-bold w-full text-[var(--sidebar-text)] placeholder:opacity-20 flex-1"
                                                        placeholder="# 分类 / ## 原因..."
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newLines = [...lines];
                                                    newLines.splice(lineIdx, 1);
                                                    const newContent = newLines.join('\n');
                                                    setDsl(newContent);
                                                    handleParseDSL(newContent);
                                                }}
                                                className="w-10 h-10 flex items-center justify-center bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--sidebar-muted)] hover:text-red-400 hover:border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ));
                                })()}
                                <button
                                    onClick={() => {
                                        const newLines = [...dsl.split('\n')];
                                        let insertIdx = newLines.length;
                                        for (let i = newLines.length - 1; i >= 0; i--) {
                                            if (newLines[i].trim().startsWith('#')) {
                                                insertIdx = i + 1;
                                                break;
                                            }
                                        }
                                        newLines.splice(insertIdx, 0, '# 新分类');
                                        const newContent = newLines.join('\n');
                                        setDsl(newContent);
                                        handleParseDSL(newContent);
                                    }}
                                    className="w-full h-14 border border-dashed border-[var(--sidebar-border)] rounded-lg flex items-center justify-center gap-3 text-[var(--sidebar-text)] hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group shadow-sm"
                                >
                                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">添加新行 (支持 # 语法)</span>
                                </button>
                            </div>
                        </div>

                        {/* Styles Configuration */}
                        <div className="p-8 bg-[var(--card-bg)] rounded-lg border border-[var(--sidebar-border)] space-y-6 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">颜色方案与样式</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                {[
                                    { key: 'rootColor', label: '鱼头背景' },
                                    { key: 'rootTextColor', label: '鱼头文字' },
                                    { key: 'mainColor', label: '大骨背景' },
                                    { key: 'mainTextColor', label: '大骨文字' },
                                    { key: 'boneLine', label: '主骨架线' },
                                    { key: 'caseLine', label: '鱼刺线' },
                                    { key: 'caseColor', label: '普通文字' },
                                    // { key: 'endColor', label: '鱼尾颜色' } // Optional
                                ].map(c => (
                                    <div key={c.key} className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-[var(--sidebar-muted)]">{c.label}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-6 rounded bg-[var(--input-bg)] flex items-center justify-center border border-[var(--input-border)] shadow-inner">
                                                <span className="text-[9px] font-mono text-[var(--sidebar-text)] uppercase">{(styles as any)[c.key]}</span>
                                            </div>
                                            <input
                                                type="color"
                                                value={(styles as any)[c.key] || '#ffffff'}
                                                onChange={e => onStylesChange({ ...styles, [c.key]: e.target.value })}
                                                className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-none p-0 overflow-hidden"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <textarea
                            value={dsl}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="flex-1 w-full bg-[var(--input-bg)] text-[var(--sidebar-text)] p-8 font-mono text-[11px] leading-relaxed border border-[var(--input-border)] rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none custom-scrollbar shadow-inner"
                            placeholder="输入 DSL 指令..."
                            spellCheck={false}
                        />
                        {error && (
                            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-[9px] font-black text-red-500 uppercase">{error}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-[var(--card-bg)] rounded-lg border border-[var(--sidebar-border)] space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能因果分析描述</span>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full  rounded-lg "
                                placeholder="输入异常现象描述，例如：'分析注塑车间生产节拍变慢的原因，并按 5M1E 展开'..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-lg flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-[var(--sidebar-border)]' : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.98]'}`}
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

                            <div className="p-8 bg-blue-900/10 border border-blue-800/20 rounded-lg space-y-4 shadow-sm">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">推理提示</p>
                                <p className="text-xs text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以输入如“注塑机温度过高”、“客户投诉率上升”等核心问题。AI 将自动应用 **5M1E** 或 **4P** 等分析模型，为您生成的具备深度层级的因果关系。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Docs Modal */}
            {showDocs && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md">
                    <div className="bg-[var(--sidebar-bg)] w-[900px] h-[800px] rounded-lg border border-[var(--sidebar-border)] flex flex-col overflow-hidden shadow-2xl relative">
                        {/* Modal Header */}
                        <div className="px-10 py-8 flex flex-col border-b border-[var(--sidebar-border)] shrink-0 gap-6 bg-[var(--sidebar-bg)]/80 backdrop-blur-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <HelpCircle size={24} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--sidebar-text)] uppercase tracking-tighter">鱼骨图知识库</h3>
                                        <p className="text-[10px] text-[var(--sidebar-muted)] font-bold uppercase tracking-widest mt-1">Version 3.0 • Ishikawa Processor</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDocs(false)} className="p-3 hover:bg-[var(--input-bg)] rounded-lg transition-all text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Tab Navigation */}
                            <nav className="flex bg-[var(--nav-bg)] p-1 rounded-lg border border-[var(--sidebar-border)] w-fit">
                                {[
                                    { id: 'dsl', label: 'DSL 规范说明' },
                                    { id: 'logic', label: '因果分析指南' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setDocTab(t.id as any)}
                                        className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'
                                            }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10 text-[var(--sidebar-muted)]">
                            {docTab === 'dsl' ? (
                                <div className="space-y-12 animate-in fade-in duration-300">
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-blue-400 border-b border-blue-500/20 pb-4">
                                            <Database size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">1. 基础配置说明</span>
                                        </div>
                                        <div className="space-y-4">
                                            <table className="w-full text-xs font-mono border-collapse text-left bg-[var(--input-bg)] rounded-lg overflow-hidden shadow-sm">
                                                <thead>
                                                    <tr className="text-[var(--sidebar-text)] bg-blue-500/10">
                                                        <th className="p-4 font-black uppercase w-32">语法</th>
                                                        <th className="p-4 font-black uppercase">说明</th>
                                                        <th className="p-4 font-black uppercase">示例</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--sidebar-border)]">
                                                    <tr>
                                                        <td className="p-4 text-blue-400 font-bold">Title:</td>
                                                        <td className="p-4 text-[var(--sidebar-muted)]">定义图表核心标题</td>
                                                        <td className="p-4 text-[var(--sidebar-text)]">Title: 售后投诉根因分析</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-4 text-emerald-400 font-bold">Color[Root]:</td>
                                                        <td className="p-4 text-[var(--sidebar-muted)]">鱼头背景颜色</td>
                                                        <td className="p-4 text-[var(--sidebar-text)]">Color[Root]: #1e40af</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-4 text-amber-400 font-bold">Color[Main]:</td>
                                                        <td className="p-4 text-[var(--sidebar-muted)]">大骨分类背景色</td>
                                                        <td className="p-4 text-[var(--sidebar-text)]">Color[Main]: #2563eb</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-amber-400 border-b border-amber-500/20 pb-4">
                                            <ChevronRight size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">2. 颜色键值语法</span>
                                        </div>
                                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--sidebar-border)] space-y-4 font-mono text-xs shadow-inner">
                                            {[
                                                { key: 'Color[Root]', desc: '鱼头背景 (Root Node)', color: 'text-amber-500' },
                                                { key: 'Color[RootText]', desc: '鱼头文字 (Root Text)', color: 'text-amber-500' },
                                                { key: 'Color[Main]', desc: '大骨背景 (Main Category)', color: 'text-blue-400' },
                                                { key: 'Color[MainText]', desc: '大骨文字 (Main Text)', color: 'text-blue-400' },
                                                { key: 'Color[Bone]', desc: '主脊椎线 (Spine Line)', color: 'text-emerald-400' },
                                                { key: 'Color[Line]', desc: '子因连接线 (Sub-cause Line)', color: 'text-purple-400' },
                                                { key: 'Color[Text]', desc: '原因文字 (General Text)', color: 'text-purple-400' },
                                            ].map(item => (
                                                <div key={item.key} className="flex justify-between border-b border-[var(--sidebar-border)] pb-2">
                                                    <span className={item.color}>{item.key}: ...</span>
                                                    <span className="text-[var(--sidebar-text)]">{item.desc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-emerald-400 border-b border-emerald-500/20 pb-4">
                                            <Code size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">3. 层级定义语法</span>
                                        </div>
                                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-4 font-mono text-[11px] leading-relaxed relative shadow-inner">
                                            <div className="text-[11px] font-bold text-[var(--sidebar-text)] mb-2">Markdown 风格语法</div>
                                            <div className="text-blue-400"># 人 (Man) <span className="text-[var(--sidebar-muted)] ml-4 font-sans opacity-60">// 一级分类（大骨）</span></div>
                                            <div className="text-[var(--sidebar-text)] pl-4">## 培训不足 <span className="text-[var(--sidebar-muted)] ml-4 font-sans opacity-60">// 二级原因（中骨）</span></div>
                                            <div className="text-[var(--sidebar-text)] pl-8">### 新员工缺乏上岗培训 <span className="text-[var(--sidebar-muted)] ml-4 font-sans opacity-60">// 三级原因（小骨）</span></div>
                                            <div className="text-blue-400 mt-4"># 机 (Machine)</div>
                                            <div className="text-[var(--sidebar-text)] pl-4">## 模具老化</div>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-12 animate-in fade-in duration-300">
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-blue-400 border-b border-blue-500/20 pb-4">
                                            <Activity size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">石川图 (Ishikawa) 因果分析原理</span>
                                        </div>
                                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-6 text-sm leading-relaxed text-[var(--sidebar-text)] font-sans shadow-sm">
                                            <p>
                                                鱼骨图，又称因果图，由石川馨博士发明。它是整理<b>问题与原因</b>之间关系的一种极佳工具。
                                            </p>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-3 bg-[var(--card-bg)] p-5 rounded-lg border border-[var(--sidebar-border)] shadow-sm">
                                                    <h5 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">1. 5M1E 模型 (制造业)</h5>
                                                    <p className="text-[11px]">最常用的分类方法，涵盖：</p>
                                                    <ul className="list-disc pl-4 text-[11px] text-[var(--sidebar-muted)] space-y-1">
                                                        <li><b>人 (Man):</b> 操作员、技术、意识</li>
                                                        <li><b>机 (Machine):</b> 设备稳定性、精度、润滑</li>
                                                        <li><b>料 (Material):</b> 原材料、品质、规格</li>
                                                        <li><b>法 (Method):</b> 工艺标准、操作流程</li>
                                                        <li><b>环 (Environment):</b> 温湿度、照明、噪音</li>
                                                        <li><b>测 (Measurement):</b> 测量工具、抽样方法</li>
                                                    </ul>
                                                </div>
                                                <div className="space-y-3 bg-[var(--card-bg)] p-5 rounded-lg border border-[var(--sidebar-border)] shadow-sm">
                                                    <h5 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">2. 4P 模型 (服务业/管理)</h5>
                                                    <p className="text-[11px]">适用于非制造流程：</p>
                                                    <ul className="list-disc pl-4 text-[11px] text-[var(--sidebar-muted)] space-y-1 flex-1">
                                                        <li><b>策略 (Policies):</b> 规章制度、管理流程</li>
                                                        <li><b>程序 (Procedures):</b> 具体作业步骤</li>
                                                        <li><b>人员 (People):</b> 能力、态度、协作</li>
                                                        <li><b>场所 (Plant):</b> 办公环境、系统工具</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            <div className="space-y-3 bg-blue-900/10 p-5 rounded-lg border border-blue-500/20 shadow-sm">
                                                <h5 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">3. 分析步骤要领</h5>
                                                <div className="text-[11px] text-[var(--sidebar-text)] space-y-2">
                                                    <p>① <b>界定问题：</b>在鱼头处明确定义发生的异常或目标。</p>
                                                    <p>② <b>脑力激荡：</b>通过调查和沟通，由表及里，从大骨推导至小骨。</p>
                                                    <p>③ <b>标记重点：</b>分析完成后，应圈出影响最大的 3-5 个核心因素。</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="p-6 bg-blue-900/10 border border-blue-800/20 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-black uppercase text-blue-500">专家建议</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--sidebar-text)] font-medium italic">
                                            "鱼骨图的深度决定了解决问题的深度。当您推导出某个原因时，请连续追问 '为什么'，直到找到那个如果不采取行动就会导致全盘失败的实质节点。"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-10 border-t border-[var(--sidebar-border)] bg-[var(--input-bg)] flex justify-center shrink-0">
                            <button
                                onClick={() => setShowDocs(false)}
                                className="px-16 py-4 bg-blue-600 text-white font-black rounded-lg text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all font-sans"
                            >
                                我理解了分析原理
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
        
    );
};

export default FishboneEditor;
