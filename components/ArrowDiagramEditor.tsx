
import React, { useState, useEffect } from 'react';
import {
    ArrowData,
    ArrowChartStyles,
    DEFAULT_ARROW_STYLES,
    QCToolType,
    ArrowNode,
    ArrowLink
} from '../types';
import { INITIAL_ARROW_DSL } from '../constants';
import {
    Settings2,
    LayoutGrid,
    Workflow,
    Sparkles,
    HelpCircle,
    X,
    Loader2,
    Database,
    Code,
    Network,
    Activity,
    Maximize,
    GitFork,
    Plus,
    Trash2,
    Edit3,
    ArrowRight,
    Save,
    RotateCcw,
    Cpu,
    Zap,
    AlertTriangle,
} from 'lucide-react';
import {generateLogicDSL} from '../services/aiService';
import { CardDocModal } from './CardDocModal';
import { Switch } from './ui/Switch';
import { useAIEngine } from '../hooks/useAIEngine';
import { ConfirmInline } from './ui/ConfirmInline';

// --- Logic Implementation (Inline) ---

const calculateCPM = (nodes: ArrowNode[], links: ArrowLink[]): { nodes: ArrowNode[], links: ArrowLink[], duration: number } => {
    // 1. Build Adjacency List & Maps
    const nodeMap = new Map<string, ArrowNode>();
    nodes.forEach(n => {
        n.es = 0; n.ls = Infinity;
        nodeMap.set(n.id, n);
    });

    const adj = new Map<string, ArrowLink[]>();
    const reverseAdj = new Map<string, ArrowLink[]>();

    nodes.forEach(n => {
        adj.set(n.id, []);
        reverseAdj.set(n.id, []);
    });

    links.forEach(l => {
        const u = l.source;
        const v = l.target;
        if (adj.has(u)) adj.get(u)!.push(l);
        if (reverseAdj.has(v)) reverseAdj.get(v)!.push(l);
    });

    // 2. Topological Sort (Kahn's)
    const inDegree = new Map<string, number>();
    nodes.forEach(n => inDegree.set(n.id, 0));
    links.forEach(l => inDegree.set(l.target, (inDegree.get(l.target) || 0) + 1));

    const queue: string[] = [];
    nodes.forEach(n => {
        if ((inDegree.get(n.id) || 0) === 0) queue.push(n.id);
    });

    const topoOrder: string[] = [];
    while (queue.length > 0) {
        const u = queue.shift()!;
        topoOrder.push(u);
        const neighbors = adj.get(u) || [];
        neighbors.forEach(l => {
            const v = l.target;
            inDegree.set(v, (inDegree.get(v) || 0) - 1);
            if (inDegree.get(v) === 0) queue.push(v);
        });
    }

    // 3. Forward Pass (ES)
    topoOrder.forEach(uId => {
        const u = nodeMap.get(uId)!;
        const outEdges = adj.get(uId) || [];
        outEdges.forEach(l => {
            l.ef = (u.es || 0) + l.duration;
            const v = nodeMap.get(l.target)!;
            if (l.ef > (v.es || 0)) {
                v.es = l.ef;
            }
        });
    });

    // Project Duration
    let projectDuration = 0;
    nodes.forEach(n => {
        if ((n.es || 0) > projectDuration) projectDuration = n.es || 0;
    });

    // 4. Backward Pass (LS)
    nodes.forEach(n => {
        const outDegree = (adj.get(n.id) || []).length;
        if (outDegree === 0) {
            n.ls = projectDuration; // Sink node LS = Total Project Duration to calculate slack correctly
        } else {
            n.ls = projectDuration;
        }
    });

    for (let i = topoOrder.length - 1; i >= 0; i--) {
        const uId = topoOrder[i];
        const u = nodeMap.get(uId)!;
        const outEdges = adj.get(uId) || [];

        let minLS = Infinity;
        if (outEdges.length > 0) {
            outEdges.forEach(l => {
                const v = nodeMap.get(l.target)!;
                const linkLS = (v.ls || projectDuration) - l.duration;
                if (linkLS < minLS) minLS = linkLS;

                l.lf = v.ls;
                l.ef = (u.es || 0) + l.duration;
                l.tf = (v.ls || 0) - l.duration - (u.es || 0);
                if (Math.abs(l.tf!) < 0.0001) l.tf = 0;
                l.isCritical = l.tf === 0;
            });
            u.ls = minLS;
        }
    }

    // 5. Shortest Path Calculation
    const minDist = new Map<string, number>();
    const prevNode = new Map<string, string>();
    const prevLink = new Map<string, ArrowLink>();

    nodes.forEach(n => minDist.set(n.id, Infinity));
    topoOrder.forEach(uId => {
        const inDeg = (reverseAdj.get(uId) || []).length;
        if (inDeg === 0) minDist.set(uId, 0);
    });

    topoOrder.forEach(uId => {
        const dU = minDist.get(uId)!;
        if (dU === Infinity) return;
        const outEdges = adj.get(uId) || [];
        outEdges.forEach(l => {
            const vId = l.target;
            const newDist = dU + l.duration;
            if (newDist < minDist.get(vId)!) {
                minDist.set(vId, newDist);
                prevNode.set(vId, uId);
                prevLink.set(vId, l);
            }
        });
    });

    // Find best sink
    let minSinkId: string | null = null;
    let minSinkDist = Infinity;
    nodes.forEach(n => {
        const outDeg = (adj.get(n.id) || []).length;
        if (outDeg === 0) {
            const d = minDist.get(n.id)!;
            if (d < minSinkDist) {
                minSinkDist = d;
                minSinkId = n.id;
            }
        }
    });

    // Mark links
    links.forEach(l => l.isShortest = false);
    if (minSinkId) {
        let curr = minSinkId;
        while (prevLink.has(curr)) {
            const l = prevLink.get(curr)!;
            l.isShortest = true;
            curr = prevNode.get(curr)!;
        }
    }

    return { nodes, links, duration: projectDuration };
};

// Layout with Adaptive Scaling for labels
const performLayout = (nodes: ArrowNode[], links: ArrowLink[]): { nodes: ArrowNode[], pixelsPerTime: number } => {
    // 1. Calculate optimal pixelsPerTime based on label density
    let maxRatio = 0;
    links.forEach(l => {
        if (l.duration > 0) {
            // Approx width + padding, assume 8px per char + 40px base padding
            const labelLen = (l.label || '').length * 8 + 40;
            const ratio = labelLen / l.duration;
            if (ratio > maxRatio) maxRatio = ratio;
        }
    });

    // Default 24, typically 30-50 covers most needs. Cap at 120.
    let pixelsPerTime = Math.max(24, maxRatio);
    if (pixelsPerTime > 120) pixelsPerTime = 120;

    const padding = 100;
    const yStep = 180;

    // X: Time Scaled
    nodes.forEach(n => {
        n.x = padding + (n.es || 0) * pixelsPerTime;
    });

    // Y: Simple heuristics (Lane assignment)
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    nodes.forEach(n => n.y = 0); // Reset

    // Identify Start Nodes
    const starts = nodes.filter(n => n.es === 0);
    const assigned = new Set<string>();

    const assignY = (uId: string, currentY: number) => {
        if (assigned.has(uId)) return;

        const u = nodeMap.get(uId);
        if (!u) return;

        u.y = currentY;
        assigned.add(uId);

        // Outgoing links
        const outLinks = links.filter(l => l.source === uId);
        if (outLinks.length === 0) return;

        // Sort: Critical first (to keep straight), then others
        outLinks.sort((a, b) => {
            if (a.isCritical && !b.isCritical) return -1;
            if (!a.isCritical && b.isCritical) return 1;
            return 0;
        });

        // Distribute children
        const children = outLinks.map(l => l.target);
        const unassignedChildren = children.filter(c => !assigned.has(c));

        if (unassignedChildren.length === 0) return;

        const totalH = (unassignedChildren.length - 1) * yStep;
        let startChildY = currentY - totalH / 2;

        unassignedChildren.forEach((childId, idx) => {
            assignY(childId, startChildY + idx * yStep);
        });
    };

    starts.forEach((n, i) => {
        // Distribute multiple start nodes vertically
        assignY(n.id, 300 + i * yStep * 1.5);
    });

    // Ensure all assigned
    nodes.forEach(n => {
        if (!assigned.has(n.id)) n.y = 300;
    });

    return { nodes, pixelsPerTime };
};

export const parseArrowDSL = (content: string): { data: ArrowData, styles: ArrowChartStyles } => {
    const lines = content.split('\n');
    const newStyles = { ...DEFAULT_ARROW_STYLES };
    const nodes: ArrowNode[] = [];
    const links: ArrowLink[] = [];
    let title = '矢线图';

    const nodeMap = new Map<string, ArrowNode>();
    const getOrCreateNode = (id: string, label?: string) => {
        if (!nodeMap.has(id)) {
            const newNode = { id, label: label || id };
            nodeMap.set(id, newNode);
            nodes.push(newNode);
        } else if (label) {
            nodeMap.get(id)!.label = label;
        }
        return nodeMap.get(id)!;
    };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (trimmed.startsWith('Title:')) { title = trimmed.substring(6).trim(); return; }
        if (trimmed.startsWith('ShowCritical:')) { newStyles.showCriticalPath = trimmed.substring(13).trim() === 'true'; return; }
        if (trimmed.startsWith('ShowShortest:')) { newStyles.showShortestPath = trimmed.substring(13).trim() === 'true'; return; }
        if (trimmed.startsWith('Color[Node]:')) { newStyles.nodeColor = trimmed.substring(12).trim(); return; }
        if (trimmed.startsWith('Color[Line]:')) { newStyles.lineColor = trimmed.substring(12).trim(); return; }
        if (trimmed.startsWith('Color[Critical]:')) { newStyles.criticalLineColor = trimmed.substring(16).trim(); return; }
        if (trimmed.startsWith('Color[Shortest]:')) { newStyles.shortestLineColor = trimmed.substring(16).trim(); return; }

        if (trimmed.startsWith('Event:')) {
            const parts = trimmed.substring(6).split(',').map(s => s.trim());
            if (parts.length > 0) getOrCreateNode(parts[0], parts[1]);
            return;
        }

        const isDummy = trimmed.includes('..>');
        const separator = isDummy ? '..>' : '->';
        if (trimmed.includes(separator)) {
            const [relPart, metaPart] = trimmed.split(':').map(s => s.trim());
            const [srcId, tgtId] = relPart.split(separator).map(s => s.trim());
            let duration = 0, label = '';
            if (metaPart) {
                const metaParts = metaPart.split(',').map(s => s.trim());
                duration = parseFloat(metaParts[0]) || 0;
                label = metaParts[1] || '';
            }
            if (srcId && tgtId) {
                getOrCreateNode(srcId);
                getOrCreateNode(tgtId);
                links.push({ source: srcId, target: tgtId, duration, label, isDummy });
            }
        }
    });

    const cpmResult = calculateCPM(nodes, links);
    const layout = performLayout(cpmResult.nodes, cpmResult.links);

    return {
        data: { title, nodes: layout.nodes, links: cpmResult.links },
        styles: newStyles
    };
};

const generateDSLFromData = (data: ArrowData, styles: ArrowChartStyles): string => {
    let dsl = `Title: ${data.title}\n`;
    dsl += `ShowCritical: ${styles.showCriticalPath}\n`;
    dsl += `ShowShortest: ${styles.showShortestPath}\n`;
    dsl += `Color[Node]: ${styles.nodeColor}\n`;
    dsl += `Color[Line]: ${styles.lineColor}\n`;
    dsl += `Color[Critical]: ${styles.criticalLineColor}\n`;
    dsl += `Color[Shortest]: ${styles.shortestLineColor}\n\n`;

    dsl += `// Nodes\n`;
    data.nodes.forEach(n => {
        dsl += `Event: ${n.id}, ${n.label}\n`;
    });
    dsl += `\n// Links\n`;
    data.links.forEach(l => {
        const dummy = l.isDummy ? '..>' : '->';
        dsl += `${l.source}${dummy}${l.target}: ${l.duration}, ${l.label}\n`;
    });

    return dsl;
};


// --- Editor Component ---

interface ArrowDiagramEditorProps {
    data: ArrowData;
    styles: ArrowChartStyles;
    onDataChange: (data: ArrowData) => void;
    onStylesChange: (styles: ArrowChartStyles) => void;
}

export const ArrowDiagramEditor: React.FC<ArrowDiagramEditorProps> = ({
    data,
    styles,
    onDataChange,
    onStylesChange
}) => {
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [error, setError] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [dslContent, setDslContent] = useState(() => generateDSLFromData(data, styles));
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const aiStatus = useAIEngine('Checking...');
    const [showHelp, setShowHelp] = useState(false);

    const handleParseDSL = (val: string) => {
        try {
            const { data: parsedData, styles: parsedStyles } = parseArrowDSL(val);
            onDataChange(parsedData);
            onStylesChange(parsedStyles);
        } catch (e) {
            console.error('Arrow DSL Parse Error:', e), setError(`Arrow DSL Parse Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const handleDSLChange = (newDsl: string) => {
        setDslContent(newDsl);
        handleParseDSL(newDsl);
    };

    const updateFromManual = (newData: ArrowData, newStyles: ArrowChartStyles) => {
        const newDsl = generateDSLFromData(newData, newStyles);
        setDslContent(newDsl);
        onDataChange(newData);
        onStylesChange(newStyles);
    };

    // --- Manual Actions ---
    const addNode = () => {
        const id = (data.nodes.length + 1).toString();
        const newNode: ArrowNode = { id, label: `Node ${id}`, es: 0, ls: 0 }; // temporary values
        const newData = { ...data, nodes: [...data.nodes, newNode] };
        updateFromManual(newData, styles);
    };

    const updateNode = (idx: number, field: keyof ArrowNode, value: string) => {
        const newNodes = [...data.nodes];
        newNodes[idx] = { ...newNodes[idx], [field]: value };
        const newData = { ...data, nodes: newNodes };
        updateFromManual(newData, styles);
    };

    const deleteNode = (idx: number) => {
        const nodeId = data.nodes[idx].id;
        const newNodes = data.nodes.filter((_, i) => i !== idx);
        // Also remove related links
        const newLinks = data.links.filter(l => l.source !== nodeId && l.target !== nodeId);
        const newData = { ...data, nodes: newNodes, links: newLinks };
        updateFromManual(newData, styles);
    };

    const addLink = () => {
        if (data.nodes.length < 2) return;
        const src = data.nodes[data.nodes.length - 2].id;
        const tgt = data.nodes[data.nodes.length - 1].id;
        const newLink: ArrowLink = { source: src, target: tgt, duration: 5, label: 'Task', isDummy: false };
        const newData = { ...data, links: [...data.links, newLink] };
        updateFromManual(newData, styles);
    };

    const updateLink = (idx: number, field: keyof ArrowLink, value: any) => {
        const newLinks = [...data.links];
        newLinks[idx] = { ...newLinks[idx], [field]: value };
        const newData = { ...data, links: newLinks };
        updateFromManual(newData, styles);
    };

    const deleteLink = (idx: number) => {
        const newLinks = data.links.filter((_, i) => i !== idx);
        const newData = { ...data, links: newLinks };
        updateFromManual(newData, styles);
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const dsl = await generateLogicDSL(aiPrompt, QCToolType.ARROW);
            setDslContent(dsl);
            handleParseDSL(dsl);
            setActiveTab('dsl');
        } catch (error) {
            console.error('AI Generation Failed:', error), setError(`AI Generation Failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const doReset = () => {
            setDslContent(INITIAL_ARROW_DSL);
            handleParseDSL(INITIAL_ARROW_DSL);
        setConfirmReset(false);
    };

    const updateStyle = <K extends keyof ArrowChartStyles>(key: K, value: ArrowChartStyles[K]) => {
        const newStyles = { ...styles, [key]: value };
        updateFromManual(data, newStyles); // Also update DSL
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
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">双代号网络图分析</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Arrow Engine | LUXI LAB</p>
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
                        <button
                            onClick={() => setShowHelp(true)}
                            className="p-3 bg-[var(--input-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--input-border)]"
                            title="DSL Specification"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <nav className="flex gap-2 p-1.5 bg-[var(--nav-bg)] rounded-md border border-[var(--border-line-r)]">
                    {[
                        { id: 'manual', label: '手动录入', icon: <Settings2 size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id
                                ? 'bg-primary text-white shadow-md'
                                : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--input-bg)]'
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
                {activeTab === 'manual' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        {/* Global Settings */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-4 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <LayoutGrid size={16} className="text-primary" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">全局布局与显示</span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-col gap-2">
                                    <span className="text-[11px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest">项目标题</span>
                                    <input
                                        value={data.title || ''}
                                        onChange={(e) => updateFromManual({ ...data, title: e.target.value }, styles)}
                                        className="iqs-field w-full rounded-md px-3 py-2 text-[11px] font-bold focus: shadow-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 p-4 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] flex flex-col gap-3 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest pl-1">显示关键路径</span>
                                            <Switch checked={!!styles.showCriticalPath} onChange={v => updateStyle('showCriticalPath', v)} ariaLabel="显示关键路径" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest pl-1">显示最短路径</span>
                                            <Switch checked={!!styles.showShortestPath} onChange={v => updateStyle('showShortestPath', v)} ariaLabel="显示最短路径" />
                                        </div>
                                    </div>
                                    <div className="flex-1 p-4 bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] space-y-2 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">节点半径</span>
                                            <span className="text-[11px] font-mono text-primary">{styles.nodeRadius}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="10" max="40"
                                            value={styles.nodeRadius}
                                            onChange={(e) => updateStyle('nodeRadius', Number(e.target.value))}
                                            className="w-full h-1.5 bg-[var(--sidebar-muted)] rounded-md appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Node Management */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-4 shadow-md">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <div className="flex items-center gap-4">
                                    <Database size={16} className="text-[var(--text-ok)]" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">节点定义 (Nodes)</span>
                                </div>
                                <button onClick={addNode} className="p-1.5 bg-[var(--state-up)]/20 text-[var(--text-ok)] rounded-md hover:bg-[var(--state-up)] hover:text-white transition-all"><Plus size={14} /></button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {data.nodes.map((node, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-[var(--input-bg)] p-2 rounded-md border border-[var(--border-line-r)]/50">
                                        <div className="w-8 shrink-0 flex items-center justify-center text-[11px] font-mono text-[var(--sidebar-text)]">{idx + 1}</div>
                                        <input
                                            value={node.id}
                                            onChange={(e) => updateNode(idx, 'id', e.target.value)}
                                            placeholder="ID"
                                            className="iqs-field w-16 rounded-md px-2 py-1 text-[11px] font-mono text-[var(--text-ok)] focus:"
                                        />
                                        <input
                                            value={node.label || ''}
                                            onChange={(e) => updateNode(idx, 'label', e.target.value)}
                                            placeholder="Label"
                                            className="iqs-field flex-1 rounded-md px-2 py-1 text-[11px] focus:"
                                        />
                                        <button onClick={() => deleteNode(idx)} className="p-1 text-[var(--sidebar-muted)] hover:text-[var(--text-danger)] transition-colors"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Link Management */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-4 shadow-md">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <div className="flex items-center gap-4">
                                    <Activity size={16} className="text-[var(--text-info)]" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">任务逻辑 (Tasks)</span>
                                </div>
                                <button onClick={addLink} className="p-1.5 bg-[var(--luxi-cyan)]/15 text-[var(--text-info)] rounded-md hover:bg-[var(--text-info)] hover:text-white transition-all"><Plus size={14} /></button>
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                {data.links.map((link, idx) => (
                                    <div key={idx} className="flex flex-col gap-2 bg-[var(--input-bg)] p-3 rounded-md border border-[var(--border-line-r)]/50">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 flex-1">
                                                <select
                                                    value={link.source}
                                                    onChange={(e) => updateLink(idx, 'source', e.target.value)}
                                                    className="iqs-field w-20 rounded-md px-1 py-1 text-[11px] font-mono text-primary focus: appearance-none"
                                                >
                                                    <option value="" disabled>From</option>
                                                    {data.nodes.map(n => (
                                                        <option key={n.id} value={n.id}>{n.id}: {n.label}</option>
                                                    ))}
                                                </select>
                                                <ArrowRight size={10} className="text-[var(--sidebar-muted)]" />
                                                <select
                                                    value={link.target}
                                                    onChange={(e) => updateLink(idx, 'target', e.target.value)}
                                                    className="iqs-field w-20 rounded-md px-1 py-1 text-[11px] font-mono text-primary focus: appearance-none"
                                                >
                                                    <option value="" disabled>To</option>
                                                    {data.nodes.map(n => (
                                                        <option key={n.id} value={n.id}>{n.id}: {n.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button onClick={() => deleteLink(idx)} className="p-1 text-[var(--sidebar-muted)] hover:text-[var(--text-danger)] transition-colors"><Trash2 size={12} /></button>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                value={link.label || ''}
                                                onChange={(e) => updateLink(idx, 'label', e.target.value)}
                                                placeholder="Task Name"
                                                className="iqs-field flex-1 rounded-md px-2 py-1 text-[11px] focus:"
                                            />
                                            <div className="flex items-center gap-1 bg-[var(--input-bg)] px-2 rounded-md border border-[var(--border-line-r)]/50">
                                                <span className="text-[11px] text-[var(--sidebar-text)] font-bold uppercase">Time</span>
                                                <input
                                                    type="number"
                                                    value={link.duration}
                                                    onChange={(e) => updateLink(idx, 'duration', Number(e.target.value))}
                                                    className="iqs-field w-8 bg-transparent text-right text-[11px] font-mono text-primary focus:"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pl-1">
                                            <input
                                                type="checkbox"
                                                checked={link.isDummy}
                                                onChange={(e) => updateLink(idx, 'isDummy', e.target.checked)}
                                                className="w-3 h-3 rounded bg-[var(--sidebar-muted)] border-[var(--border-line-r)]"
                                            />
                                            <span className="text-[11px] font-bold text-[var(--sidebar-text)] uppercase tracking-widest">虚任务 (Dummy)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-4 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <Sparkles size={16} className="text-primary" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">色彩风格配置</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-[var(--input-bg)] rounded-md border border-[var(--border-line-r)]/50 space-y-3">
                                    <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">节点样式</span>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] text-[var(--sidebar-text)]">背景色</span>
                                            <input type="color" value={styles.nodeColor} onChange={e => updateStyle('nodeColor', e.target.value)} className="w-4 h-4 rounded bg-transparent border-0 cursor-pointer" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] text-[var(--sidebar-text)]">文字色</span>
                                            <input type="color" value={styles.nodeTextColor} onChange={e => updateStyle('nodeTextColor', e.target.value)} className="w-4 h-4 rounded bg-transparent border-0 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-[var(--input-bg)] rounded-md border border-[var(--border-line-r)]/50 space-y-3">
                                    <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">连线样式</span>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] text-[var(--sidebar-text)]">常规连线</span>
                                            <input type="color" value={styles.lineColor} onChange={e => updateStyle('lineColor', e.target.value)} className="w-4 h-4 rounded bg-transparent border-0 cursor-pointer" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] text-[var(--text-danger)] font-bold">关键路径</span>
                                            <input type="color" value={styles.criticalLineColor} onChange={e => updateStyle('criticalLineColor', e.target.value)} className="w-4 h-4 rounded bg-transparent border-0 cursor-pointer" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] text-[var(--text-ok)] font-bold">最短路径</span>
                                            <input type="color" value={styles.shortestLineColor} onChange={e => updateStyle('shortestLineColor', e.target.value)} className="w-4 h-4 rounded bg-transparent border-0 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'dsl' && (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center px-2">
                            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--sidebar-muted)]">Arrow DSL Script</span>
                            <span className={`text-[11px] font-mono ${dslContent.length > 500 ? 'text-[var(--text-warn)]' : 'text-[var(--sidebar-muted)]'}`}>
                                {dslContent.length} CHARS
                            </span>
                        </div>
                        <textarea
                            value={dslContent}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                            spellCheck={false}
                            placeholder="Enter Arrow Diagram DSL..."
                        />
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">AI 智能助手</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse " />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine: {aiStatus}</span>
                                </div>
                            </div>
                            <textarea
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="请输入您的项目描述，例如：'我们需要在这周内完成新办公室的搬迁，包含打包、运输、网络布线和设备调试，打包和网络布线可以同时开始...'"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                            />
                            <button
                                onClick={handleGenerateAI}
                                disabled={!aiPrompt.trim() || isGenerating}
                                className={`shrink-0 ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-[var(--text-ok)]" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在构建网络逻辑...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            {/* Inference Hint Card */}
                            <div className="bg-[var(--input-bg)] rounded-md p-6 border border-[var(--input-border)] space-y-3 shadow-sm">
                                <h4 className="text-[11px] font-black text-[var(--text-ok)] uppercase tracking-widest">推理提示</h4>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed">
                                    您可以输入如“某新产品研发流程，包含立项、研发、测试、市场推广及发布，其中研发和市场推广并行...”等自然语言描述。
                                    <br /><br />
                                    AI 将自动为您推演完整的网络图逻辑，识别关键路径，并生成符合 Arrow Diagram 语法的 DSL 代码。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {showHelp && (
                <CardDocModal kind="arrow" open={showHelp} onClose={() => setShowHelp(false)} />
            )}
        </div>
        
    );
};
