import React, { useState, useEffect, useCallback } from 'react';
import { FishboneNode,
    FishboneChartStyles,
    DEFAULT_FISHBONE_STYLES } from '../types';
import { INITIAL_FISHBONE_DSL } from '../constants';
import { GitBranch,
    Sparkles,
    HelpCircle,
    Loader2,
    Database,
    Plus,
    Trash2,
    ChevronRight,
    ChevronDown,
    Code,
    RotateCcw,
    GripVertical,
    Check,
    Cpu,
    AlertTriangle,
    ArrowUpDown
} from 'lucide-react';
import {generateLogicDSL} from '../services/aiService';
import { QCToolType } from '../types';
import { CardDocModal } from './CardDocModal';
import { genId } from '../utils/id';
import { useAIEngine } from '../hooks/useAIEngine';
import { X } from 'lucide-react';

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
                id: genId('node'),
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

/* ────────────────────────────────────────────────────────────────────────────
   层级树编辑（R-UI-11）
   因果树属「层级型数据」——由结构化卡片承担增删改拖拽，
   不让用户手写 `# 主骨` / `## 子因` 语法糖；语法糖只保留在 DSL 编辑器 tab。
   ──────────────────────────────────────────────────────────────────────────── */

const BRAND = 'var(--luxi-green)';

/** 主骨（level-1）与子因（level-2+）的结构化编辑区 */
const HierarchyTree: React.FC<{
    root: FishboneNode;
    onChange: (next: FishboneNode) => void;
}> = ({ root, onChange }) => {
    const mains = root.children ?? [];
    const [drag, setDrag] = useState<{ kind: 'main' | 'sub'; mi: number; si?: number } | null>(null);
    const [over, setOver] = useState<{ kind: 'main' | 'sub'; mi: number; si?: number } | null>(null);

    const commit = useCallback((next: FishboneNode) => onChange(next), [onChange]);

    const M = (list: FishboneNode[]) => ({ ...root, children: list });
    const clone = () => JSON.parse(JSON.stringify(mains)) as FishboneNode[];

    const renameMain = (mi: number, label: string) => {
        const l = clone(); l[mi].label = label; commit(M(l));
    };
    const addMain = () => {
        const l = clone();
        l.push({ id: genId('main'), label: '新主骨', type: 'main', children: [] });
        commit(M(l));
    };
    const removeMain = (mi: number) => {
        const l = clone(); l.splice(mi, 1); commit(M(l));
    };
    const renameSub = (mi: number, si: number, label: string) => {
        const l = clone(); l[mi].children![si].label = label; commit(M(l));
    };
    const addSub = (mi: number) => {
        const l = clone();
        l[mi].children = l[mi].children ?? [];
        l[mi].children!.push({ id: genId('sub'), label: '新子因', type: 'sub', children: [] });
        commit(M(l));
    };
    const removeSub = (mi: number, si: number) => {
        const l = clone(); l[mi].children!.splice(si, 1); commit(M(l));
    };

    const dropOnMain = (to: number) => {
        if (!drag || drag.kind !== 'main' || drag.mi === to) { setDrag(null); setOver(null); return; }
        const l = clone();
        const [moved] = l.splice(drag.mi, 1);
        l.splice(to, 0, moved);
        commit(M(l)); setDrag(null); setOver(null);
    };
    const dropOnSub = (mi: number, to: number) => {
        if (!drag || drag.kind !== 'sub' || drag.mi !== mi || drag.si === to) { setDrag(null); setOver(null); return; }
        const l = clone();
        const arr = l[mi].children!;
        const [moved] = arr.splice(drag.si!, 1);
        arr.splice(to, 0, moved);
        commit(M(l)); setDrag(null); setOver(null);
    };

    /* 控件尺寸分档（R-UI-16）——鱼骨图即基准：
         depth 0 主骨  → lg  h-11 (44px)  图标 16
         depth 1 子因  → md  h-9  (36px)  图标 14
         depth ≥2 孙因 → sm  h-8  (32px)  图标 12
       铁律：同一行内输入框与按钮必须等高。 */
    const TIER = ['h-11', 'h-9', 'h-8'];
    const ICON = [16, 14, 12];
    const tierOf = (d: number) => TIER[Math.min(d, TIER.length - 1)];
    const iconOf = (d: number) => ICON[Math.min(d, ICON.length - 1)];

    const RowAction: React.FC<{
        title: string; onClick: () => void; danger?: boolean;
        size: string; children: React.ReactNode;
    }> = ({ title, onClick, danger, size, children }) => (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            /* R-UI-09：行内操作不得只靠 hover 显示，键盘聚焦同样可见 */
            className={`${size} w-auto aspect-square shrink-0 flex items-center justify-center
                        rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)]
                        text-[var(--sidebar-muted)] transition-colors
                        opacity-60 focus-visible:opacity-100 hover:opacity-100
                        ${danger ? 'hover:text-[var(--text-danger)] hover:border-[var(--alert-red)]' : 'hover:text-primary hover:border-primary'}`}
        >
            {children}
        </button>
    );

    /* ── 按 path 递归定位：path = [主骨序号, 子因序号, ...] ── */
    const nodeAt = (root0: FishboneNode, path: number[]): FishboneNode | null => {
        let cur: FishboneNode | undefined = root0;
        for (const i of path) {
            cur = cur?.children?.[i];
            if (!cur) return null;
        }
        return cur ?? null;
    };
    const mutate = (path: number[], fn: (node: FishboneNode) => void) => {
        const root2 = { ...root, children: clone() };
        const target = nodeAt(root2, path);
        if (!target) return;
        fn(target);
        commit(root2);
    };
    const addChild = (path: number[]) => mutate(path, (n) => {
        n.children = n.children ?? [];
        n.children.push({ id: genId('n'), label: '新节点', type: 'sub', children: [] });
    });
    const removeNode = (path: number[]) => {
        if (path.length <= 1) { removeMain(path[0]); return; }
        const root2 = { ...root, children: clone() };
        const parent = nodeAt(root2, path.slice(0, -1));
        if (!parent?.children) return;
        parent.children.splice(path[path.length - 1], 1);
        commit(root2);
    };
    const renameNode = (path: number[], label: string) =>
        mutate(path, (n) => { n.label = label; });

    /* ── 递归渲染任意层级 ── */
    const renderLevel = (nodes: FishboneNode[], depth: number, path: number[]): React.ReactNode =>
        nodes.map((node, idx) => {
            const p = [...path, idx];
            const sz = tierOf(depth);
            const ic = iconOf(depth);
            const isOver = over?.kind === 'main' && over.mi === p[0] && depth === 0;
            const canDrag = depth === 0;
            return (
                <div
                    key={node.id}
                    className={depth === 0
                        ? `rounded-md border bg-[var(--card-bg)] transition-colors ${isOver ? 'border-[var(--luxi-cyan)]' : 'border-[var(--border-line-r)]'}`
                        : ''}
                >
                    <div
                        draggable={canDrag}
                        onDragStart={canDrag ? () => setDrag({ kind: 'main', mi: idx }) : undefined}
                        onDragOver={canDrag ? (e) => { e.preventDefault(); setOver({ kind: 'main', mi: idx }); } : undefined}
                        onDrop={canDrag ? () => dropOnMain(idx) : undefined}
                        onDragEnd={canDrag ? () => { setDrag(null); setOver(null); } : undefined}
                        className={`flex items-center gap-2 ${depth === 0 ? 'p-2.5' : 'py-1.5 pr-2'}`}
                        style={{ paddingLeft: depth === 0 ? undefined : depth * 22 }}
                    >
                        {canDrag
                            ? <GripVertical size={16} className="text-[var(--text-muted)] cursor-grab shrink-0" />
                            : <ChevronRight size={13} className="text-[var(--text-muted)] shrink-0" />}
                        {depth === 0 && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: BRAND }} aria-hidden />}
                        <input
                            value={node.label}
                            onChange={(e) => renameNode(p, e.target.value)}
                            className={`iqs-input ${sz} flex-1 !font-sans ${depth > 0 ? '!text-[11px]' : ''}`}
                            placeholder={depth === 0 ? '主骨名称，如「人」' : depth === 1 ? '子因名称' : '下一级原因'}
                        />
                        <RowAction size={sz} title="新增下一级" onClick={() => addChild(p)}>
                            <Plus size={ic} />
                        </RowAction>
                        <RowAction size={sz} title="删除" onClick={() => removeNode(p)} danger>
                            <Trash2 size={ic} />
                        </RowAction>
                    </div>
                    {node.children && node.children.length > 0 && (
                        <div className={depth === 0 ? 'pr-2.5 pb-2.5 space-y-1.5' : 'space-y-1.5'}>
                            {renderLevel(node.children, depth + 1, p)}
                        </div>
                    )}
                </div>
            );
        });

    return (
        <div className="space-y-3">
            {mains.length === 0 && (
                <div className="p-6 border border-dashed border-[var(--border-line-r)] rounded-md text-center space-y-3">
                    <p className="text-[11px] text-[var(--text-muted)]">暂无主骨。鱼骨图至少需要一根主骨（如「人 / 机 / 料 / 法 / 环 / 测」）。</p>
                    <button type="button" onClick={addMain} className="iqs-btn-primary mx-auto !w-auto px-6">
                        <Plus size={16} /> 新增第一根主骨
                    </button>
                </div>
            )}

            {renderLevel(mains, 0, [])}

            {mains.length > 0 && (
                <button type="button" onClick={addMain} className="iqs-btn-primary">
                    <Plus size={16} /> 新增主骨
                </button>
            )}
        </div>
    );
};

/* ──────────────────────────────────────────────────────────────────────────── */

const FishboneEditor: React.FC<FishboneEditorProps> = ({ data, styles, onDataChange, onStylesChange }) => {
    const [dsl, setDsl] = useState(() => generateDSLFromData(data, styles));
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);          // R-UI-10
    const [pendingReset, setPendingReset] = useState(false);              // R-UI-08 自有确认

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const engineName = useAIEngine();


    function generateDSLFromData(root: FishboneNode, s: FishboneChartStyles) {
        let lines: string[] = [];
        if (root.label) lines.push(`Title: ${root.label}`);

        const styleMap: any = {
            rootColor: 'Root', rootTextColor: 'RootText',
            mainColor: 'Main', mainTextColor: 'MainText',
            boneLine: 'Bone', caseLine: 'Line', caseColor: 'Text', endColor: 'End'
        };
        Object.entries(styleMap).forEach(([key, dslKey]) => {
            if ((s as any)[key]) lines.push(`Color[${dslKey}]: ${(s as any)[key]}`);
        });
        lines.push('');

        const traverse = (nodes: FishboneNode[], level: number) => {
            nodes.forEach(node => {
                lines.push(`${'#'.repeat(level)} ${node.label}`);
                if (node.children && node.children.length > 0) traverse(node.children, level + 1);
            });
        };
        if (root.children) traverse(root.children, 1);
        return lines.join('\n');
    }

    /** 数据/样式变更 → 同步 DSL 文本（保持两个 tab 一致） */
    const pushData = (next: FishboneNode) => {
        onDataChange(next);
        setDsl(generateDSLFromData(next, styles));
    };

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
        } catch {
            setError('DSL 解析错误');
        }
    };

    const handleDSLChange = (val: string) => {
        setDsl(val);
        handleParseDSL(val);
    };

    const handleReset = () => {
        setDsl(INITIAL_FISHBONE_DSL);
        handleParseDSL(INITIAL_FISHBONE_DSL);
        setPendingReset(false);
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        setAiError(null);
        try {
            const dslResult = (await generateLogicDSL(aiPrompt, QCToolType.FISHBONE)) as string;
            setDsl(dslResult);
            handleParseDSL(dslResult);
            setActiveTab('dsl');
        } catch (err) {
            // R-UI-10：失败必须界面可见，不得只 console.error
            const msg = err instanceof Error ? err.message : '未知错误';
            setAiError(`AI 推演失败：${msg}。请检查网络或稍后重试，也可改用「DSL 编辑器」手工录入。`);
        } finally {
            setIsGenerating(false);
        }
    };

    const hasContent = !!(data.children && data.children.length > 0);

    return (
        <div className="flex flex-col h-full bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative">
            {/* ── Header ── */}
            <div className="p-6 border-b border-[var(--sidebar-border)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
                            <Cpu size={22} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">鱼骨图分析推演</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Fishbone Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setPendingReset(true)}
                            className="p-3 bg-[var(--input-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-colors border border-[var(--input-border)]"
                            title="恢复示例"
                            aria-label="恢复示例数据"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowDocs(true)}
                            className="p-3 bg-[var(--input-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-colors border border-[var(--input-border)]"
                            title="DSL 规范说明"
                            aria-label="打开 DSL 规范说明"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                {/* R-UI-08：破坏性操作自有确认条（替代 window.confirm） */}
                {pendingReset && (
                    <div className="flex items-center gap-3 p-3 rounded-md bg-[var(--input-bg)] border border-[var(--alert-red)]">
                        <AlertTriangle size={16} className="text-[var(--text-danger)] shrink-0" />
                        <span className="text-[11px] flex-1">恢复示例将丢弃当前全部修改，确定继续？</span>
                        <button type="button" onClick={handleReset} className="px-3 py-1.5 rounded-sm bg-[var(--alert-red)] text-white text-[11px] font-bold">确定恢复</button>
                        <button type="button" onClick={() => setPendingReset(false)} className="px-3 py-1.5 rounded-sm border border-[var(--input-border)] text-[11px] font-bold">取消</button>
                    </div>
                )}

                <nav className="flex bg-[var(--nav-bg)] p-1.5 rounded-md border border-[var(--sidebar-border)] gap-1">
                    {[
                        { id: 'manual', label: '手动录入', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => handleTabChange(t.id as any)}
                            aria-selected={activeTab === t.id}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-colors ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--input-bg)]'}`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* ── Content ── */}
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
                    <div className="space-y-6">
                        {/* 鱼头 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">分析课题（鱼头）</span>
                            </div>
                            <input
                                value={data.label}
                                onChange={e => pushData({ ...data, label: e.target.value })}
                                className="iqs-input h-11"
                                placeholder="输入核心分析问题，如「注塑件表面缩水」"
                            />
                        </div>

                        {/* 层级树 */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pl-2">
                                <div className="flex items-center gap-3">
                                    <ChevronRight size={14} className="text-primary" />
                                    <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">
                                        因果结构（主骨 → 子因）
                                    </span>
                                </div>
                                <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                                    <ArrowUpDown size={12} /> 可拖拽排序
                                </span>
                            </div>
                            <HierarchyTree root={data} onChange={pushData} />
                        </div>

                        {/* 配色 */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-5 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">颜色方案与样式</span>
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
                                ].map(c => (
                                    <div key={c.key} className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-bold text-[var(--sidebar-muted)]">{c.label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)] uppercase">{(styles as any)[c.key]}</span>
                                            <input
                                                type="color"
                                                aria-label={c.label}
                                                value={(styles as any)[c.key] || '#FFFFFF'}
                                                onChange={e => onStylesChange({ ...styles, [c.key]: e.target.value })}
                                                className="w-6 h-6 rounded-sm cursor-pointer bg-transparent border border-[var(--input-border)] p-0 overflow-hidden"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4">
                        <textarea
                            value={dsl}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                            placeholder="输入 DSL 指令..."
                            spellCheck={false}
                        />
                        {!hasContent && !error && (
                            <p className="text-[11px] text-[var(--text-muted)]">
                                提示：以 <code>#</code> 开头 = 主骨，<code>##</code> = 子因。也可切到「手动录入」用结构化编辑。
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3 shrink-0">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能因果分析描述</span>
                                <div className="iqs-badge flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            {/* R-UI-02：AI 自由文本框可换行，非代码区 */}
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="输入异常现象描述，例如：'分析注塑车间生产节拍变慢的原因，并按 5M1E 展开'..."
                            />

                            {aiError && (
                                <div className="px-4 py-3 bg-[var(--alert-red)]/10 border border-[var(--alert-red)]/30 rounded-md flex items-start gap-2 shrink-0">
                                    <AlertTriangle size={14} className="text-[var(--text-danger)] mt-0.5 shrink-0" />
                                    <span className="text-[11px] text-[var(--text-danger)] leading-relaxed">{aiError}</span>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                aria-disabled={isGenerating || !aiPrompt.trim()}
                                className={`shrink-0 ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">正在精准推演...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            {!aiPrompt.trim() && !isGenerating && (
                                <p className="iqs-hint shrink-0">
                                    <AlertTriangle size={12} /> 请先输入异常现象描述，按钮方可启用
                                </p>
                            )}

                            <div className="iqs-note space-y-3 shrink-0">
                                <p className="text-[11px] font-black text-[var(--text-info)] uppercase tracking-widest">推理提示</p>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed">
                                    可输入如「注塑机温度过高」「客户投诉率上升」等核心问题。AI 将自动应用 <strong>5M1E</strong> 或 <strong>4P</strong> 等分析模型，生成具备深度层级的因果关系。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && (
                <CardDocModal kind="fishbone" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
    );
};

export default FishboneEditor;
