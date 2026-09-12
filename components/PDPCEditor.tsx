import React, { useState, useEffect } from 'react';
import {
    PDPCNode,
    PDPCLink,
    PDPCGroup,
    PDPCChartStyles,
    DEFAULT_PDPC_STYLES,
    PDPCNodeType,
    PDPCMarkerType,
    PDPCData
} from '../types';
import { INITIAL_PDPC_DSL } from '../constants';
import {
    ChevronRight,
    Save,
    Trash2,
    Plus,
    Edit3,
    Settings2,
    ArrowRight,
    LayoutGrid,
    Circle,
    Workflow,
    Sparkles,
    HelpCircle,
    X,
    Loader2,
    Database,
    Code,
    GitFork,
    Layers,
    LogOut,
    RotateCcw,
    Cpu,
    Zap,
    AlertTriangle,
} from 'lucide-react';
import {generateLogicDSL} from '../services/aiService';
import { QCToolType } from '../types';
import { CardDocModal } from './CardDocModal';
import { useAIEngine } from '../hooks/useAIEngine';
import { ConfirmInline } from '../components/ui/ConfirmInline';

interface PDPCEditorProps {
    data: PDPCData;
    styles: PDPCChartStyles;
    onDataChange: (data: PDPCData) => void;
    onStylesChange: (styles: PDPCChartStyles) => void;
}

export const parsePDPCDSL = (content: string): { data: PDPCData, styles: PDPCChartStyles } => {
    const lines = content.split('\n');
    const styles: any = { ...DEFAULT_PDPC_STYLES };
    const nodes: PDPCNode[] = [];
    const links: PDPCLink[] = [];
    const groups: PDPCGroup[] = [];

    let currentGroupId: string | undefined = undefined;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        // Styles
        if (trimmed.startsWith('Title:')) {
            styles.title = trimmed.replace('Title:', '').trim();
            return;
        }
        if (trimmed.startsWith('Layout:')) {
            const layoutVal = trimmed.replace('Layout:', '').trim();
            if (['Directional', 'Standard'].includes(layoutVal)) {
                styles.layout = layoutVal as any;
            }
            return;
        }

        const colorMatch = trimmed.match(/Color\[(Start|StartText|End|EndText|Step|StepText|Countermeasure|CountermeasureText|Line)\]:\s*(#[0-9a-fA-F]+)/i);
        if (colorMatch) {
            const keyMap: any = {
                'Start': 'startColor',
                'StartText': 'startTextColor',
                'End': 'endColor',
                'EndText': 'endTextColor',
                'Step': 'stepColor',
                'StepText': 'stepTextColor',
                'Countermeasure': 'countermeasureColor',
                'CountermeasureText': 'countermeasureTextColor',
                'Line': 'lineColor'
            };
            styles[keyMap[colorMatch[1]]] = colorMatch[2];
            return;
        }

        const fontMatch = trimmed.match(/Font\[(Title|Node)\]:\s*(\d+)/i);
        if (fontMatch) {
            if (fontMatch[1] === 'Title') styles.titleFontSize = parseInt(fontMatch[2]);
            if (fontMatch[1] === 'Node') styles.nodeFontSize = parseInt(fontMatch[2]);
            return;
        }

        const lineWidthMatch = trimmed.match(/Line\[Width\]:\s*(\d+)/i);
        if (lineWidthMatch) {
            styles.lineWidth = parseInt(lineWidthMatch[1]);
            return;
        }

        // Groups
        if (trimmed.startsWith('Group:')) {
            const parts = trimmed.replace('Group:', '').split(',').map(s => s.trim());
            if (parts.length >= 2) {
                currentGroupId = parts[0];
                groups.push({
                    id: parts[0],
                    label: parts[1],
                    parentId: parts[2] || null
                });
            }
            return;
        }
        if (trimmed.startsWith('EndGroup')) {
            currentGroupId = undefined;
            return;
        }

        // Items
        if (trimmed.startsWith('Item:')) {
            const parts = trimmed.replace('Item:', '').split(',').map(s => s.trim());
            if (parts.length >= 2) {
                const id = parts[0];
                const label = parts[1];
                let type: PDPCNodeType = 'step';

                if (parts[2]) {
                    const typeStr = parts[2].toLowerCase();
                    if (typeStr.includes('start')) type = 'start';
                    else if (typeStr.includes('end')) type = 'end';
                    else if (typeStr.includes('countermeasure')) type = 'countermeasure';
                }

                nodes.push({ id, label, type, groupId: currentGroupId });
            }
            return;
        }

        // Chains: id1--id2 [OK/NG]
        if (trimmed.includes('--')) {
            const markerMatch = trimmed.match(/\[(OK|NG)\]/i);
            const marker: PDPCMarkerType = markerMatch ? (markerMatch[1].toUpperCase() as PDPCMarkerType) : 'None';
            const cleanLine = trimmed.replace(/\[(OK|NG)\]/i, '').trim();
            const sequence = cleanLine.split('--').map(s => s.trim());

            for (let i = 0; i < sequence.length - 1; i++) {
                links.push({
                    source: sequence[i],
                    target: sequence[i + 1],
                    marker: i === sequence.length - 2 ? marker : 'None' // Only apply marker to the last segment if multiple? 
                    // Actually, usually it's just id1--id2. If id1--id2--id3 [OK], we might need better logic.
                    // For now, simplify to pair-wise or end-of-chain marker.
                });
            }
            return;
        }
    });

    return {
        data: { title: styles.title, nodes, links, groups },
        styles
    };
};

const PDPCEditor: React.FC<PDPCEditorProps> = ({
    data,
    styles,
    onDataChange,
    onStylesChange
}) => {
    const [dsl, setDsl] = useState(INITIAL_PDPC_DSL);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [error, setError] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const engineName = useAIEngine();


    const handleParseDSL = (val: string) => {
        try {
            const { data: newData, styles: newStyles } = parsePDPCDSL(val);
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

    const generateDSLFromData = () => {
        let content = `Title: ${data.title}\nLayout: ${styles.layout}\n\n`;
        content += `Color[Start]: ${styles.startColor}\n`;
        content += `Color[StartText]: ${styles.startTextColor}\n`;
        content += `Color[Step]: ${styles.stepColor}\n`;
        content += `Color[StepText]: ${styles.stepTextColor}\n`;
        content += `Color[Countermeasure]: ${styles.countermeasureColor}\n`;
        content += `Color[CountermeasureText]: ${styles.countermeasureTextColor}\n`;
        content += `Color[End]: ${styles.endColor}\n`;
        content += `Color[EndText]: ${styles.endTextColor}\n`;
        content += `Color[Line]: ${styles.lineColor}\n`;
        content += `Line[Width]: ${styles.lineWidth}\n\n`;

        // Groups and Items
        const groupedNodes = new Map<string, PDPCNode[]>();
        const orphanNodes: PDPCNode[] = [];

        data.nodes.forEach(n => {
            if (n.groupId) {
                if (!groupedNodes.has(n.groupId)) groupedNodes.set(n.groupId, []);
                groupedNodes.get(n.groupId)?.push(n);
            } else {
                orphanNodes.push(n);
            }
        });

        data.groups.forEach(g => {
            content += `Group: ${g.id}, ${g.label}${g.parentId ? `, [${g.parentId}]` : ''}\n`;
            groupedNodes.get(g.id)?.forEach(n => {
                content += `  Item: ${n.id}, ${n.label}${n.type !== 'step' ? `, [${n.type}]` : ''}\n`;
            });
            content += `EndGroup\n\n`;
        });

        orphanNodes.forEach(n => {
            content += `Item: ${n.id}, ${n.label}${n.type !== 'step' ? `, [${n.type}]` : ''}\n`;
        });

        content += `\n`;

        // Links
        data.links.forEach(l => {
            content += `${l.source}--${l.target}${l.marker !== 'None' ? ` [${l.marker}]` : ''}\n`;
        });

        return content;
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const dslResult = (await generateLogicDSL(aiPrompt, QCToolType.PDPC)) as string;
            setDsl(dslResult);
            handleParseDSL(dslResult);
            setActiveTab('dsl');
        } catch (err) {
            console.error('AI Generation failed:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const doReset = () => {
            try {
                setDsl(INITIAL_PDPC_DSL);
                handleParseDSL(INITIAL_PDPC_DSL);
            } catch (e) {
                console.error(e);
            }
        setConfirmReset(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative">
            <div className="p-6 border-b border-[var(--border-line-r)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
                            <Cpu size={22} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">过程决策程序图分析 (PDPC)</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS PDPC Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setConfirmReset(true)} disabled={confirmReset}
                            className="p-3 bg-[var(--input-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--input-border)]"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button onClick={() => setShowDocs(true)} className="p-3 bg-[var(--input-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--input-border)]">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex gap-2 p-1.5 bg-[var(--nav-bg)] rounded-md border border-[var(--border-line-r)]">
                    {[
                        { id: 'manual', label: '手动录入', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => {
                                if (t.id === 'dsl' && activeTab !== 'dsl') setDsl(generateDSLFromData());
                                setActiveTab(t.id as any);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-muted)]/10'}`}
                        >
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
                {activeTab === 'manual' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        {/* Layout Section */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-4 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <LayoutGrid size={16} className="text-[var(--text-ok)]" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">全局布局构建</span>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <span className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">图表标题与布局</span>
                                    <div className="flex gap-4">
                                        <input
                                            value={data.title}
                                            onChange={e => onDataChange({ ...data, title: e.target.value })}
                                            className="iqs-input"
                                            placeholder="输入图表标题..."
                                        />
                                        <button
                                            onClick={() => {
                                                const newLayout = styles.layout === 'Directional' ? 'Standard' : 'Directional';
                                                onStylesChange({ ...styles, layout: newLayout });
                                            }}
                                            className="w-12 h-12 flex items-center justify-center bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-[var(--sidebar-text)] hover:text-[var(--text-ok)] hover:border-[var(--state-up)]/50 transition-all group shadow-lg"
                                            title="切换排版方向"
                                        >
                                            <Workflow size={18} className={`transition-transform duration-500 ${styles.layout === 'Standard' ? 'rotate-90' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Style Section */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-4 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <Settings2 size={16} className="text-[var(--text-ok)]" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">视觉配置</span>
                            </div>

                            <div className="space-y-4">
                                {/* BG Colors Row */}
                                <div className="flex flex-col gap-2 p-4 bg-[var(--input-bg)]/30 rounded-md border border-[var(--border-line-r)]/50">
                                    <span className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">背景颜色 (起点/过程/对策/终点)</span>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { key: 'startColor', label: 'Start' },
                                            { key: 'stepColor', label: 'Step' },
                                            { key: 'countermeasureColor', label: 'Counter' },
                                            { key: 'endColor', label: 'End' }
                                        ].map(c => (
                                            <div key={c.key} className="flex items-center gap-2 bg-[var(--input-bg)]/50 p-2 rounded-md border border-[var(--input-border)]">
                                                <input
                                                    type="color"
                                                    value={(styles as any)[c.key]}
                                                    onChange={e => onStylesChange({ ...styles, [c.key]: e.target.value })}
                                                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                                                />
                                                <span className="text-[11px] font-mono text-[var(--sidebar-text)] uppercase">{(styles as any)[c.key]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Text Colors Row */}
                                <div className="flex flex-col gap-2 p-4 bg-[var(--input-bg)]/30 rounded-md border border-[var(--border-line-r)]/50">
                                    <span className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">文字颜色 (起点/过程/对策/终点)</span>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { key: 'startTextColor', label: 'Start' },
                                            { key: 'stepTextColor', label: 'Step' },
                                            { key: 'countermeasureTextColor', label: 'Counter' },
                                            { key: 'endTextColor', label: 'End' }
                                        ].map(c => (
                                            <div key={c.key} className="flex items-center gap-2 bg-[var(--input-bg)]/50 p-2 rounded-md border border-[var(--input-border)]">
                                                <input
                                                    type="color"
                                                    value={(styles as any)[c.key]}
                                                    onChange={e => onStylesChange({ ...styles, [c.key]: e.target.value })}
                                                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                                                />
                                                <span className="text-[11px] font-mono text-[var(--sidebar-text)] uppercase">{(styles as any)[c.key]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Line Row */}
                                <div className="flex flex-col gap-2 p-4 bg-[var(--input-bg)]/30 rounded-md border border-[var(--border-line-r)]/50">
                                    <span className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">连接设置 (颜色 & 粗细)</span>
                                    <div className="flex items-center gap-4">
                                        {/* Line Picker aligned with first column (roughly 1/4 of width) */}
                                        <div className="w-[calc(25%-9px)] flex items-center gap-2 bg-[var(--input-bg)]/50 p-2 rounded-md border border-[var(--input-border)]">
                                            <input
                                                type="color"
                                                value={styles.lineColor}
                                                onChange={e => onStylesChange({ ...styles, lineColor: e.target.value })}
                                                className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                                            />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)] uppercase">{styles.lineColor}</span>
                                        </div>

                                        {/* Slider taking the rest of the space */}
                                        <div className="flex-1 flex items-center gap-4 bg-[var(--input-bg)]/50 p-2 rounded-md border border-[var(--input-border)] h-[38px] px-4">
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                value={styles.lineWidth}
                                                onChange={e => onStylesChange({ ...styles, lineWidth: parseInt(e.target.value) })}
                                                className="flex-1 h-1.5 bg-[var(--sidebar-muted)]/20 rounded-md appearance-none cursor-pointer"
                                            />
                                            <span className="text-[11px] font-mono text-[var(--text-ok)] w-8 text-right">{styles.lineWidth}px</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Elements Management Section */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <div className="flex items-center gap-4">
                                    <Database size={16} className="text-[var(--text-ok)]" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">要素管理</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const newId = `n${data.nodes.length + 1}`;
                                            onDataChange({
                                                ...data,
                                                nodes: [...data.nodes, { id: newId, label: '新节点', type: 'step' }]
                                            });
                                        }}
                                        className="px-3 py-1 bg-primary/15 text-primary text-[11px] font-black rounded-md border border-primary/30 hover:bg-primary hover:text-white transition-all"
                                    >
                                        + 节点
                                    </button>
                                    <button
                                        onClick={() => {
                                            const newId = `g${data.groups.length + 1}`;
                                            onDataChange({
                                                ...data,
                                                groups: [...data.groups, { id: newId, label: '新阶段', parentId: null }]
                                            });
                                        }}
                                        className="px-3 py-1 bg-primary/20 text-primary text-[11px] font-black rounded-md border border-primary/30 hover:bg-primary hover:text-white transition-all"
                                    >
                                        + 分组
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {data.groups.map(group => (
                                    <div key={group.id} className="p-4 bg-[var(--input-bg)]/30 rounded-md border border-primary/20 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <input
                                                value={group.label}
                                                onChange={e => {
                                                    onDataChange({
                                                        ...data,
                                                        groups: data.groups.map(g => g.id === group.id ? { ...g, label: e.target.value } : g)
                                                    });
                                                }}
                                                className="iqs-field iqs-field--plain text-[11px] font-black focus: w-full"
                                                placeholder="分组名称..."
                                            />
                                            <select
                                                value={group.parentId || ''}
                                                onChange={e => {
                                                    onDataChange({
                                                        ...data,
                                                        groups: data.groups.map(g => g.id === group.id ? { ...g, parentId: e.target.value || null } : g)
                                                    });
                                                }}
                                                className="iqs-field text-[11px] p-1 rounded max-w-[80px] focus:"
                                            >
                                                <option value="">顶级分组</option>
                                                {data.groups.filter(g => g.id !== group.id).map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                                            </select>
                                            <button
                                                onClick={() => {
                                                    onDataChange({
                                                        ...data,
                                                        groups: data.groups.filter(g => g.id !== group.id),
                                                        nodes: data.nodes.map(n => n.groupId === group.id ? { ...n, groupId: undefined } : n)
                                                    });
                                                }}
                                                className="p-1 text-[var(--sidebar-muted)] hover:text-[var(--text-danger)] transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div className="pl-4 border-l-2 border-[var(--border-line-r)] space-y-2">
                                            {data.nodes.filter(n => n.groupId === group.id).map(node => (
                                                <div key={node.id} className="flex items-center gap-2 bg-[var(--sidebar-bg)]/20 p-2 rounded-md group/node">
                                                    <select
                                                        value={node.type}
                                                        onChange={e => {
                                                            onDataChange({
                                                                ...data,
                                                                nodes: data.nodes.map(n => n.id === node.id ? { ...n, type: e.target.value as any } : n)
                                                            });
                                                        }}
                                                        className="iqs-field text-[11px] font-black p-1 rounded uppercase"
                                                    >
                                                        <option value="start">起点</option>
                                                        <option value="step">步骤</option>
                                                        <option value="countermeasure">对策</option>
                                                        <option value="end">终点</option>
                                                    </select>
                                                    <input
                                                        value={node.label}
                                                        onChange={e => {
                                                            onDataChange({
                                                                ...data,
                                                                nodes: data.nodes.map(n => n.id === node.id ? { ...n, label: e.target.value } : n)
                                                            });
                                                        }}
                                                        className="iqs-field iqs-field--plain text-[11px] focus: flex-1"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            onDataChange({
                                                                ...data,
                                                                nodes: data.nodes.map(n => n.id === node.id ? { ...n, groupId: undefined } : n)
                                                            });
                                                        }}
                                                        className="opacity-0 group-hover/node:opacity-100 p-1 text-[var(--sidebar-muted)] hover:text-[var(--text-ok)] transition-all"
                                                        title="移出分组"
                                                    >
                                                        <LogOut size={10} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            onDataChange({
                                                                ...data,
                                                                nodes: data.nodes.filter(n => n.id !== node.id),
                                                                links: data.links.filter(l => l.source !== node.id && l.target !== node.id)
                                                            });
                                                        }}
                                                        className="opacity-0 group-hover/node:opacity-100 p-1 text-[var(--sidebar-muted)] hover:text-[var(--text-danger)] transition-all"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Orphan Nodes */}
                                <div className="space-y-2">
                                    <div className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-2">未分组节点</div>
                                    {data.nodes.filter(n => !n.groupId).map(node => (
                                        <div key={node.id} className="flex items-center gap-2 bg-[var(--input-bg)]/50 p-2 rounded-md border border-[var(--border-line-r)] group/node">
                                            <select
                                                value={node.type}
                                                onChange={e => {
                                                    onDataChange({
                                                        ...data,
                                                        nodes: data.nodes.map(n => n.id === node.id ? { ...n, type: e.target.value as any } : n)
                                                    });
                                                }}
                                                className="iqs-field text-[11px] font-black p-1 rounded uppercase"
                                            >
                                                <option value="start">起点</option>
                                                <option value="step">步骤</option>
                                                <option value="countermeasure">对策</option>
                                                <option value="end">终点</option>
                                            </select>
                                            <input
                                                value={node.label}
                                                onChange={e => {
                                                    onDataChange({
                                                        ...data,
                                                        nodes: data.nodes.map(n => n.id === node.id ? { ...n, label: e.target.value } : n)
                                                    });
                                                }}
                                                className="iqs-field iqs-field--plain text-[11px] focus: flex-1"
                                            />
                                            {data.groups.length > 0 && (
                                                <select
                                                    value=""
                                                    onChange={e => {
                                                        onDataChange({
                                                            ...data,
                                                            nodes: data.nodes.map(n => n.id === node.id ? { ...n, groupId: e.target.value } : n)
                                                        });
                                                    }}
                                                    className="iqs-field opacity-0 group-hover/node:opacity-100 text-[11px] p-1 rounded max-w-[60px]"
                                                >
                                                    <option value="" disabled>加入分组</option>
                                                    {data.groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                                                </select>
                                            )}
                                            <button
                                                onClick={() => {
                                                    onDataChange({
                                                        ...data,
                                                        nodes: data.nodes.filter(n => n.id !== node.id),
                                                        links: data.links.filter(l => l.source !== node.id && l.target !== node.id)
                                                    });
                                                }}
                                                className="opacity-0 group-hover/node:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)] transition-all"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Logical Connections Section */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <div className="flex items-center gap-4">
                                    <GitFork size={16} className="text-[var(--text-ok)]" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">逻辑连接</span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (data.nodes.length < 2) return;
                                        onDataChange({
                                            ...data,
                                            links: [...data.links, { source: data.nodes[0].id, target: data.nodes[1].id, marker: 'None' }]
                                        });
                                    }}
                                    className="px-3 py-1 bg-primary/15 text-primary text-[11px] font-black rounded-md border border-primary/30 hover:bg-primary hover:text-white transition-all"
                                >
                                    + 连接
                                </button>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {data.links.map((link, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-[var(--input-bg)]/50 p-3 rounded-md border border-[var(--border-line-r)] group/link">
                                        <select
                                            value={link.source}
                                            onChange={e => {
                                                const newLinks = [...data.links];
                                                newLinks[idx] = { ...link, source: e.target.value };
                                                onDataChange({ ...data, links: newLinks });
                                            }}
                                            className="iqs-field text-[11px] p-1 rounded flex-1 max-w-[80px]"
                                        >
                                            {data.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                        </select>
                                        <div className="text-[var(--text-muted)]">→</div>
                                        <select
                                            value={link.target}
                                            onChange={e => {
                                                const newLinks = [...data.links];
                                                newLinks[idx] = { ...link, target: e.target.value };
                                                onDataChange({ ...data, links: newLinks });
                                            }}
                                            className="iqs-field text-[11px] p-1 rounded flex-1 max-w-[80px]"
                                        >
                                            {data.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                        </select>
                                        <select
                                            value={link.marker}
                                            onChange={e => {
                                                const newLinks = [...data.links];
                                                newLinks[idx] = { ...link, marker: e.target.value as any };
                                                onDataChange({ ...data, links: newLinks });
                                            }}
                                            className={`iqs-field text-[11px] font-black p-1 rounded uppercase ${link.marker === 'OK' ? 'bg-primary/15 text-primary border-primary/30' : link.marker === 'NG' ? 'bg-[var(--alert-red)]/15 text-[var(--text-danger)] border-[var(--alert-red)]/30' : ''}`}
                                        >
                                            <option value="None">无标记</option>
                                            <option value="OK">OK</option>
                                            <option value="NG">NG</option>
                                        </select>
                                        <button
                                            onClick={() => {
                                                onDataChange({
                                                    ...data,
                                                    links: data.links.filter((_, i) => i !== idx)
                                                });
                                            }}
                                            className="opacity-0 group-hover/link:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)] transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {data.links.length === 0 && (
                                    <div className="text-center py-8 text-[var(--text-muted)] text-[11px] italic">暂无逻辑连接</div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
                        <textarea
                            value={dsl}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                            placeholder="输入 PDPC DSL..."
                            spellCheck={false}
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 flex flex-col flex-1 min-h-0 overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能风险推演描述</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="描述您的计划和可能的风险，例如：'分析新药研发流程，识别临床试验失败的风险并制定补救措施'..."
                            />

                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-md flex items-center justify-center gap-4 transition-all relative overflow-hidden group ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-[var(--text-ok)]" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在神经网络中推演...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            <div className="iqs-note space-y-3 shrink-0 shadow-sm">
                                <p className="text-[11px] font-black text-[var(--text-ok)] uppercase tracking-widest">推理提示</p>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以输入如“实验室火灾应急”、“支付系统故障应急”等场景描述。AI 将自动为您推演完整的 PDPC 决策路径，包含正常路径 (OK) 与异常对策 (NG)。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && (
                <CardDocModal kind="pdpc" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
        
    );
};

export default PDPCEditor;
