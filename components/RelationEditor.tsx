import React, { useState, useEffect, useMemo } from 'react';
import { RelationNode,
    RelationLink,
    RelationChartStyles,
    DEFAULT_RELATION_STYLES,
    RelationLayoutType } from '../types';
import {
    ChevronRight,
    Trash2,
    Plus,
    Edit3,
    ArrowRight,
    LayoutGrid,
    Sparkles,
    HelpCircle,
    Loader2,
    Code,
    RotateCcw,
    Cpu,
    AlertTriangle,
} from 'lucide-react';
import {generateLogicDSL} from '../services/aiService';
import { QCToolType } from '../types';
import { INITIAL_RELATION_DSL } from '../constants';
import { CardDocModal } from './CardDocModal';
import { X } from 'lucide-react';
import { useAIEngine } from '../hooks/useAIEngine';
import {
    analyzeRelation,
    validateRelationLinks,
    nextRelationNodeId,
    pickUnlinkedPair
} from '../utils/relationGraph';

/** Color[Slot] → RelationChartStyles 字段名 */
const COLOR_KEY_MAP: Record<string, keyof RelationChartStyles> = {
    Root: 'rootColor',
    RootText: 'rootTextColor',
    Middle: 'middleColor',
    MiddleText: 'middleTextColor',
    End: 'endColor',
    EndText: 'endTextColor',
    Line: 'lineColor'
};

export const parseRelationDSL = (content: string, currentStyles: RelationChartStyles = DEFAULT_RELATION_STYLES): { nodes: RelationNode[], links: RelationLink[], styles: RelationChartStyles } => {
    const newStyles: RelationChartStyles = { ...currentStyles };
    const newNodes: RelationNode[] = [];
    const newLinks: RelationLink[] = [];

    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        if (trimmed.startsWith('Title:')) {
            newStyles.title = trimmed.slice('Title:'.length).trim();
            return;
        }

        if (trimmed.startsWith('Layout:')) {
            const layoutVal = trimmed.slice('Layout:'.length).trim();
            if (['Centralized', 'Directional', 'Free'].includes(layoutVal)) {
                newStyles.layout = layoutVal as RelationLayoutType;
            }
            return;
        }

        const colorMatch = trimmed.match(/Color\[(Root|RootText|Middle|MiddleText|End|EndText|Line)\]\s*:\s*(#[0-9a-fA-F]{3,8})/i);
        if (colorMatch) {
            const key = COLOR_KEY_MAP[colorMatch[1]];
            if (key) (newStyles as unknown as Record<string, unknown>)[key] = colorMatch[2];
            return;
        }

        const fontMatch = trimmed.match(/Font\[(Title|Node)\]\s*:\s*(\d+)/i);
        if (fontMatch) {
            if (fontMatch[1].toLowerCase() === 'title') newStyles.titleFontSize = parseInt(fontMatch[2], 10);
            if (fontMatch[1].toLowerCase() === 'node') newStyles.nodeFontSize = parseInt(fontMatch[2], 10);
            return;
        }

        // Node: id, label —— label 自身可能含逗号，故**只在首个逗号处切分**
        if (trimmed.startsWith('Node:')) {
            const body = trimmed.slice('Node:'.length).trim();
            const comma = body.indexOf(',');
            if (comma > 0) {
                newNodes.push({ id: body.slice(0, comma).trim(), label: body.slice(comma + 1).trim() });
            }
            return;
        }

        if (trimmed.startsWith('Rel:')) {
            const parts = trimmed.slice('Rel:'.length).trim().split('->').map(t => t.trim());
            if (parts.length === 2 && parts[0] && parts[1]) {
                newLinks.push({ source: parts[0], target: parts[1] });
            }
        }
    });

    // 自引用 / 重复边 / 环路 —— 与手工编辑路径共用同一实现
    const invalid = validateRelationLinks(newNodes, newLinks);
    if (invalid) throw new Error(invalid);

    // 角色判定；度数统计同样来自单一真源
    const graph = analyzeRelation(newNodes, newLinks);
    newNodes.forEach(n => {
        const role = graph.roleOf(n.id);
        n.type = role === 'sink' ? 'root' : role === 'source' ? 'end' : 'middle';
    });

    return { nodes: newNodes, links: newLinks, styles: newStyles };
};

interface RelationEditorProps {
    nodes: RelationNode[];
    links: RelationLink[];
    styles: RelationChartStyles;
    onDataChange: (nodes: RelationNode[], links: RelationLink[]) => void;
    onStylesChange: (styles: RelationChartStyles) => void;
}

const RelationEditor: React.FC<RelationEditorProps> = ({
    nodes,
    links,
    styles = DEFAULT_RELATION_STYLES,
    onDataChange,
    onStylesChange
}) => {
    const [dsl, setDsl] = useState(INITIAL_RELATION_DSL);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const engineName = useAIEngine();
    const [showDocs, setShowDocs] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // --- LOGIC: DSL Parsing ---
    const handleParseDSL = (content: string) => {
        try {
            const { nodes: newNodes, links: newLinks, styles: newStyles } = parseRelationDSL(content, styles);
            onStylesChange(newStyles);
            onDataChange(newNodes, newLinks);
            setError(null);
        } catch (e: any) {
            setError(e.message || 'DSL 解析错误');
        }
    };

    const handleDSLChange = (val: string) => {
        setDsl(val);
        handleParseDSL(val);
    };

    // --- LOGIC: DSL Generation ---
    const generateDSLFromData = () => {
        let dslContent = `Title: ${styles.title || '关联图'}\n\n`;

        dslContent += `Layout: ${styles.layout || 'Directional'}\n`;
        dslContent += `Color[Root]: ${styles.rootColor}\n`;
        dslContent += `Color[RootText]: ${styles.rootTextColor}\n`;
        dslContent += `Color[Middle]: ${styles.middleColor}\n`;
        dslContent += `Color[MiddleText]: ${styles.middleTextColor}\n`;
        dslContent += `Color[End]: ${styles.endColor}\n`;
        dslContent += `Color[EndText]: ${styles.endTextColor}\n`;
        dslContent += `Color[Line]: ${styles.lineColor}\n\n`;

        nodes.forEach(n => {
            // Filter out any accidentally left 'root' node just in case
            if (n.id !== 'root') {
                dslContent += `Node: ${n.id}, ${n.label}\n`;
            }
        });
        dslContent += `\n`;

        links.forEach(l => {
            dslContent += `Rel: ${l.source} -> ${l.target}\n`;
        });

        return dslContent;
    };

    /**
     * 连线拓扑变化后重算每个节点的角色。
     * 渲染层（RelationDiagram）读 `node.type` 决定节点配色，因此 type 必须与
     * 拓扑保持同步 —— 否则手工改线后颜色会停在旧状态。
     */
    const withRecomputedTypes = (ns: RelationNode[], ls: RelationLink[]): RelationNode[] => {
        const graph = analyzeRelation(ns, ls);
        return ns.map(n => {
            const role = graph.roleOf(n.id);
            const type = (role === 'sink' ? 'root' : role === 'source' ? 'end' : 'middle') as RelationNode['type'];
            return n.type === type ? n : { ...n, type };
        });
    };

    // --- LOGIC: Manual Editor Actions ---
    const addNode = () => {
        setError(null);
        onDataChange([...nodes, { id: nextRelationNodeId(nodes), label: '新节点' }], links);
    };

    const updateNode = (id: string, label: string) => {
        onDataChange(nodes.map(n => n.id === id ? { ...n, label } : n), links);
    };

    const deleteNode = (id: string) => {
        const ns = nodes.filter(n => n.id !== id);
        const ls = links.filter(l => l.source !== id && l.target !== id);
        setError(null);
        onDataChange(withRecomputedTypes(ns, ls), ls);
    };

    const addLink = () => {
        if (nodes.length < 2) { setError('至少需要两个节点才能建立因果关系。'); return; }
        const pair = pickUnlinkedPair(nodes, links);
        if (!pair) { setError('所有节点对之间都已存在连线。'); return; }
        const next = [...links, { source: pair[0], target: pair[1] }];
        const invalid = validateRelationLinks(nodes, next);
        if (invalid) { setError(invalid); return; }
        setError(null);
        onDataChange(withRecomputedTypes(nodes, next), next);
    };

    const updateLink = (idx: number, field: 'source' | 'target', value: string) => {
        const newLinks = [...links];
        newLinks[idx] = { ...newLinks[idx], [field]: value };
        // 手工改线同样要过校验，否则可造出自引用 / 重复 / 环路
        const invalid = validateRelationLinks(nodes, newLinks);
        if (invalid) { setError(invalid); return; }
        setError(null);
        onDataChange(withRecomputedTypes(nodes, newLinks), newLinks);
    };

    const deleteLink = (idx: number) => {
        const newLinks = [...links];
        newLinks.splice(idx, 1);
        setError(null);
        onDataChange(withRecomputedTypes(nodes, newLinks), newLinks);
    };


    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        try {
            const dslResult = (await generateLogicDSL(aiPrompt, QCToolType.RELATION)) as string;
            setDsl(dslResult);
            handleParseDSL(dslResult);
            setActiveTab('dsl');
        } catch (err: any) {
            setError(err?.message || 'AI 推演失败，请稍后重试，或改用 DSL 编辑器手工录入。');
        } finally {
            setIsGenerating(false);
        }
    };

    const doReset = () => {
        setDsl(INITIAL_RELATION_DSL);
        handleParseDSL(INITIAL_RELATION_DSL);
        setConfirmReset(false);
    };

    const analysis = useMemo(() => analyzeRelation(nodes, links), [nodes, links]);

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative transition-colors">
            {/* Header Area */}
            <div className="p-6 border-b border-[var(--border-line-r)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
                            <Cpu size={22} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">关联度逻辑分析</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Relation Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {confirmReset && (
                            <div className="flex items-center gap-2 px-3 h-11 bg-[var(--alert-red)]/10 border border-[var(--alert-red)]/30 rounded-md">
                                <span className="text-[11px] font-bold text-[var(--text-danger)] whitespace-nowrap">恢复示例？当前修改将丢失</span>
                                <button type="button" onClick={doReset}
                                    className="px-2.5 py-1 text-[11px] font-black uppercase rounded text-white bg-[var(--alert-red)] hover:opacity-90 transition-opacity">
                                    确认
                                </button>
                                <button type="button" onClick={() => setConfirmReset(false)}
                                    className="px-2.5 py-1 text-[11px] font-black uppercase rounded text-[var(--text-secondary)] hover:text-[var(--sidebar-text)] transition-colors">
                                    取消
                                </button>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setConfirmReset(true)}
                            disabled={confirmReset}
                            className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--border-line-r)] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="恢复示例"
                            aria-label="恢复示例数据"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowDocs(true)}
                            className="p-3 bg-[var(--card-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--border-line-r)] shadow-sm"
                            title="DSL 规范说明"
                            aria-label="查看 DSL 规范说明"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex gap-2 p-1.5 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)]">
                    {[
                        { id: 'manual', label: '手工录入', icon: <Edit3 size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => {
                                if (t.id === 'dsl') setDsl(generateDSLFromData());
                                setActiveTab(t.id as any);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--card-bg)]'
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
                {activeTab === 'manual' ? (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Global Settings */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 pl-2">
                                        <ChevronRight size={14} className="text-primary" />
                                        <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图形标题</span>
                                    </div>
                                    <input
                                        value={styles.title || ''}
                                        onChange={e => onStylesChange({ ...styles, title: e.target.value })}
                                        className="iqs-input h-11"
                                        placeholder="图名称（用于导出文件命名）"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 pl-2">
                                        <LayoutGrid size={14} className="text-primary" />
                                        <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">布局模式</span>
                                    </div>
                                    <select
                                        value={styles.layout || 'Directional'}
                                        onChange={e => onStylesChange({ ...styles, layout: e.target.value as any })}
                                        className="iqs-field w-full h-12 px-4 text-[11px] font-bold rounded-md appearance-none"
                                    >
                                        <option value="Directional">单项汇集型</option>
                                        <option value="Centralized">中央集中型</option>
                                        <option value="Free">关系自由型</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Nodes Editor */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">节点列表</span>
                                <button
                                    onClick={addNode}
                                    className="text-[11px] font-black uppercase tracking-wider text-primary hover:text-primary flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md border border-primary/20 transition-all hover:bg-primary/20 shadow-sm"
                                >
                                    <Plus size={10} /> 添加节点
                                </button>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {nodes.length === 0 && (
                                    <p className="iqs-hint">尚无节点 —— 点击右上角「添加节点」开始搭建因果链。</p>
                                )}
                                {nodes.map(node => {
                                    const role = analysis.roleOf(node.id);
                                    return (
                                        <div key={node.id} className="flex items-center gap-2 bg-[var(--sidebar-bg)] p-2 rounded-md border border-[var(--border-line-r)]">
                                            <div className="w-16 px-2 py-1 bg-[var(--input-bg)] rounded text-[11px] font-mono text-[var(--text-muted)] truncate" title={node.id}>{node.id}</div>
                                            <input
                                                value={node.label}
                                                onChange={e => updateNode(node.id, e.target.value)}
                                                className="iqs-field iqs-field--plain flex-1 text-[11px]"
                                                placeholder="节点名称"
                                                aria-label={`节点 ${node.id} 的名称`}
                                            />
                                            {role === 'sink' && (
                                                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-[var(--alert-red)]/15 text-[var(--text-danger)] whitespace-nowrap"
                                                      title="所有因果汇聚于此 —— 主要症结">症结</span>
                                            )}
                                            {role === 'source' && (
                                                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-[var(--state-up)]/15 text-[var(--text-ok)] whitespace-nowrap"
                                                      title="因果链起点 —— 末端因素">起点</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => deleteNode(node.id)}
                                                aria-label={`删除节点 ${node.label || node.id}`}
                                                title="删除节点"
                                                className="p-1.5 hover:bg-[var(--alert-red)]/20 text-[var(--text-muted)] hover:text-[var(--text-danger)] rounded transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Links Editor */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">关系列表 (From {'->'} To)</span>
                                <button
                                    onClick={addLink}
                                    className="text-[11px] font-black uppercase tracking-wider text-primary hover:text-primary flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md border border-primary/20 transition-all hover:bg-primary/20 shadow-sm"
                                >
                                    <Plus size={10} /> 添加连线
                                </button>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {links.length === 0 && (
                                    <p className="iqs-hint">尚无连线 —— 点击「添加连线」建立因果方向。</p>
                                )}
                                {links.map((link, idx) => (
                                    <div key={`${link.source}->${link.target}`} className="flex items-center gap-2 bg-[var(--sidebar-bg)] p-2 rounded-md border border-[var(--border-line-r)]">
                                        <select
                                            value={link.source}
                                            onChange={e => updateLink(idx, 'source', e.target.value)}
                                            className="iqs-field flex-1 text-[11px] rounded p-1"
                                        >
                                            {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                        </select>
                                        <ArrowRight size={12} className="text-[var(--sidebar-muted)]" />
                                        <select
                                            value={link.target}
                                            onChange={e => updateLink(idx, 'target', e.target.value)}
                                            className="iqs-field flex-1 text-[11px] rounded p-1"
                                        >
                                            {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => deleteLink(idx)}
                                            aria-label={`删除连线 ${link.source} 到 ${link.target}`}
                                            title="删除连线"
                                            className="p-1.5 hover:bg-[var(--alert-red)]/20 text-[var(--text-muted)] hover:text-[var(--text-danger)] rounded transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Styles */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">样式配置</span>
                            </div>
                            <div className="space-y-2">
                                {/* Root Styles */}
                                <div className="space-y-1">
                                    <span className="text-[11px] font-black text-[var(--text-danger)] uppercase tracking-widest pl-1">主要症结 (Root)</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-md border border-[var(--border-line-r)]">
                                            <input type="color" value={styles.rootColor} onChange={e => onStylesChange({ ...styles, rootColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)] leading-none">背景</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-md border border-[var(--border-line-r)]">
                                            <input type="color" value={styles.rootTextColor} onChange={e => onStylesChange({ ...styles, rootTextColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)] leading-none">文字</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle Styles */}
                                <div className="space-y-1">
                                    <span className="text-[11px] font-black text-[var(--text-warn)] uppercase tracking-widest pl-1">中间因素 (Middle)</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-md border border-[var(--border-line-r)]">
                                            <input type="color" value={styles.middleColor} onChange={e => onStylesChange({ ...styles, middleColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)] leading-none">背景</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-md border border-[var(--border-line-r)]">
                                            <input type="color" value={styles.middleTextColor} onChange={e => onStylesChange({ ...styles, middleTextColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)] leading-none">文字</span>
                                        </div>
                                    </div>
                                </div>

                                {/* End Styles */}
                                <div className="space-y-1">
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase tracking-widest pl-1">末端因素 (End)</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-md border border-[var(--border-line-r)]">
                                            <input type="color" value={styles.endColor} onChange={e => onStylesChange({ ...styles, endColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)] leading-none">背景</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-md border border-[var(--border-line-r)]">
                                            <input type="color" value={styles.endTextColor} onChange={e => onStylesChange({ ...styles, endTextColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)] leading-none">文字</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Line Style */}
                                <div className="space-y-1 pt-1 border-t border-[var(--border-line-r)]">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[11px] text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">连线 (Line)</span>
                                            <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-md border border-[var(--border-line-r)]">
                                                <input type="color" value={styles.lineColor} onChange={e => onStylesChange({ ...styles, lineColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                                <span className="text-[11px] font-mono text-[var(--sidebar-text)] leading-none">Line</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <textarea
                            value={dsl}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                            placeholder="输入 DSL 指令..."
                            spellCheck={false}
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 flex flex-col flex-1 min-h-0 overflow-hidden shadow-md group">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能关联分析描述</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="输入复杂因果关系描述，例如：'分析导致项目延期的根本原因，包括人员流失、需求变更频繁、技术债务等'..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`shrink-0 ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-white" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在推演因果链...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并生成</span>
                                    </>
                                )}
                            </button>

                            <div className="iqs-note space-y-3 shrink-0">
                                <p className="text-[11px] font-black text-primary uppercase tracking-widest">推理提示</p>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以输入复杂的因果描述，例如：“导致项目延期的原因包括人员流失、需求变更频繁等，其中需求变更频繁又导致了技术债务堆积”。AI 将自动梳理出逻辑链条并生成关联图。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && (
                <CardDocModal kind="relation" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
        
    );
};

export default RelationEditor;
