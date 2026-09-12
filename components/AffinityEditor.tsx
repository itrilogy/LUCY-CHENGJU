import React, { useState, useEffect, useCallback } from 'react';
import { AffinityItem,
    AffinityChartStyles,
    DEFAULT_AFFINITY_STYLES } from '../types';
import {
    Boxes,
    Sparkles,
    HelpCircle,
    X,
    Loader2,
    Database,
    Code,
    ChevronRight,
    Save,
    Trash2,
    Plus,
    Edit3,
    Grid,
    Layers,
    AlignHorizontalJustifyCenter,
    AlignVerticalJustifyCenter,
    Type,
    Settings2,
    RotateCcw,
    Cpu,
    Zap,
    AlertTriangle,
} from 'lucide-react';
import {generateLogicDSL} from '../services/aiService';
import { QCToolType } from '../types';
import { INITIAL_AFFINITY_DATA, INITIAL_AFFINITY_DSL } from '../constants';
import { CardDocModal } from './CardDocModal';
import { genId } from '../utils/id';
import { useAIEngine } from '../hooks/useAIEngine';
import { ConfirmInline } from './ui/ConfirmInline';

interface AffinityEditorProps {
    data: AffinityItem[];
    styles: AffinityChartStyles;
    onDataChange: (data: AffinityItem[]) => void;
    onStylesChange: (styles: AffinityChartStyles) => void;
}

export const parseAffinityDSL = (content: string, baseStyles: AffinityChartStyles = DEFAULT_AFFINITY_STYLES) => {
    const lines = content.split('\n');
    const newStyles: any = { ...baseStyles };
    const items: AffinityItem[] = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Properties
        if (trimmed.startsWith('Title:')) { newStyles.title = trimmed.replace('Title:', '').trim(); return; }
        if (trimmed.startsWith('Type:')) { newStyles.type = trimmed.replace('Type:', '').trim(); return; }
        if (trimmed.startsWith('Layout:')) { newStyles.layout = trimmed.replace('Layout:', '').trim(); return; }

        // Colors - Strict Keys
        const colorMatch = trimmed.match(/Color\[(TitleBg|TitleText|GroupHeaderBg|GroupHeaderText|ItemBg|ItemText|Line|Border)\]:\s*(#[0-9a-fA-F]+)/i);
        if (colorMatch) {
            const keyMap: any = {
                'TitleBg': 'titleBackgroundColor',
                'TitleText': 'titleTextColor',
                'GroupHeaderBg': 'groupHeaderBackgroundColor',
                'GroupHeaderText': 'groupHeaderTextColor',
                'ItemBg': 'itemBackgroundColor',
                'ItemText': 'itemTextColor',
                'Line': 'lineColor',
                'Border': 'borderColor'
            };
            newStyles[keyMap[colorMatch[1]]] = colorMatch[2];
            return;
        }

        // Fonts - Strict Keys
        const fontMatch = trimmed.match(/Font\[(Title|GroupHeader|Item)\]:\s*(\d+)/i);
        if (fontMatch) {
            const keyMap: any = {
                'Title': 'titleFontSize',
                'GroupHeader': 'groupHeaderFontSize',
                'Item': 'itemFontSize'
            };
            newStyles[keyMap[fontMatch[1]]] = parseInt(fontMatch[2]);
            return;
        }

        // Items: Item: ID, Label, ParentID
        if (trimmed.startsWith('Item:')) {
            const parts = trimmed.replace('Item:', '').split(',').map(s => s.trim());
            if (parts.length >= 2) {
                items.push({
                    id: parts[0],
                    label: parts[1],
                    parentId: parts[2] || undefined,
                    children: []
                });
            }
        }
    });

    // Reconstruct Tree
    const rootItems: AffinityItem[] = [];
    const itemMap = new Map<string, AffinityItem>();
    items.forEach(i => itemMap.set(i.id, i));

    items.forEach(item => {
        if (item.parentId && itemMap.has(item.parentId)) {
            const parent = itemMap.get(item.parentId)!;
            parent.children = parent.children || [];
            parent.children.push(item);
        } else {
            rootItems.push(item);
        }
    });

    const realRootNode = items.find(i => i.id === 'root');
    const finalData = realRootNode && realRootNode.children ? realRootNode.children : rootItems.filter(i => i.id !== 'root');

    return { data: finalData, styles: newStyles };
};

const AffinityEditor: React.FC<AffinityEditorProps> = ({
    data,
    styles = DEFAULT_AFFINITY_STYLES,
    onDataChange,
    onStylesChange
}) => {
    // Guard against invalid data types from other tools during switching
    const isValidData = Array.isArray(data) && (data.length === 0 || (typeof data[0] === 'object' && 'label' in data[0]));

    if (!isValidData) {
        return <div className="h-full flex items-center justify-center text-[var(--sidebar-text)] font-mono text-[11px]">initializing affinity engine...</div>;
    }

    const [dsl, setDsl] = useState(INITIAL_AFFINITY_DSL);
    const [confirmReset, setConfirmReset] = useState(false);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [error, setError] = useState<string | null>(null);

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const engineName = useAIEngine();


    const handleParseDSL = (content: string) => {
        try {
            const { data: finalData, styles: newStyles } = parseAffinityDSL(content, styles);
            onDataChange(finalData);
            setError(null);
            onStylesChange(newStyles);
        } catch (e) {
            setError('DSL 解析错误');
        }
    };

    const handleDSLChange = (val: string) => {
        setDsl(val);
        handleParseDSL(val);
    };

    // --- LOGIC: DSL Generation ---
    const generateDSLFromData = () => {
        let dslContent = `Title: ${styles.title || '亲和图'}\nType: ${styles.type}\nLayout: ${styles.layout}\n\n`;

        dslContent += `Color[TitleBg]: ${styles.titleBackgroundColor}\n`;
        dslContent += `Color[TitleText]: ${styles.titleTextColor}\n`;
        dslContent += `Font[Title]: ${styles.titleFontSize}\n\n`;

        dslContent += `Color[GroupHeaderBg]: ${styles.groupHeaderBackgroundColor}\n`;
        dslContent += `Color[GroupHeaderText]: ${styles.groupHeaderTextColor}\n`;
        dslContent += `Font[GroupHeader]: ${styles.groupHeaderFontSize}\n\n`;

        dslContent += `Color[ItemBg]: ${styles.itemBackgroundColor}\n`;
        dslContent += `Color[ItemText]: ${styles.itemTextColor}\n`;
        dslContent += `Font[Item]: ${styles.itemFontSize}\n\n`;

        dslContent += `Color[Line]: ${styles.lineColor}\n`;
        dslContent += `Color[Border]: ${styles.borderColor}\n\n`;

        // We need to generate a full item list. We'll start with a virtual root.
        dslContent += `Item: root, ${styles.title}\n`;

        const traverse = (items: AffinityItem[], pId: string) => {
            items.forEach(item => {
                dslContent += `Item: ${item.id}, ${item.label}, ${pId}\n`;
                if (item.children) traverse(item.children, item.id);
            });
        };
        traverse(data, 'root');

        return dslContent;
    };

    // --- LOGIC: Manual Editor Actions ---
    const updateItem = (id: string, newLabel: string) => {
        const updateRecursive = (items: AffinityItem[]): AffinityItem[] => {
            return items.map(item => {
                if (item.id === id) return { ...item, label: newLabel };
                if (item.children) return { ...item, children: updateRecursive(item.children) };
                return item;
            });
        };
        onDataChange(updateRecursive(data));
    };

    const addItem = (parentId?: string) => {
        const newItem: AffinityItem = { id: genId('item'), label: '新项目', children: [] };
        if (!parentId) {
            onDataChange([...data, newItem]);
        } else {
            const addRecursive = (items: AffinityItem[]): AffinityItem[] => {
                return items.map(item => {
                    if (item.id === parentId) return { ...item, children: [...(item.children || []), newItem] };
                    if (item.children) return { ...item, children: addRecursive(item.children) };
                    return item;
                });
            };
            onDataChange(addRecursive(data));
        }
    };

    const deleteItem = (id: string) => {
        const deleteRecursive = (items: AffinityItem[]): AffinityItem[] => {
            return items.filter(i => i.id !== id).map(item => ({
                ...item,
                children: item.children ? deleteRecursive(item.children) : []
            }));
        };
        onDataChange(deleteRecursive(data));
    };

    // --- RENDER HELPERS ---
    /* 层级树渲染 · 对齐鱼骨图基准（R-UI-11 / R-UI-16 / R-UI-18）
       尺寸随深度递减；行内按钮与同行输入框等高；缩进 22px；按钮键盘可达。 */
    const TIER = ['h-11', 'h-9', 'h-8'];
    const ICON = [16, 14, 12];
    const renderTreeItem = (item: AffinityItem, depth: number) => {
        const sz = TIER[Math.min(depth, TIER.length - 1)];
        const ic = ICON[Math.min(depth, ICON.length - 1)];
        const RowAction: React.FC<{ title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }> =
          ({ title, onClick, danger, children }) => (
            <button
                type="button" title={title} aria-label={title} onClick={onClick}
                className={`${sz} w-auto aspect-square shrink-0 flex items-center justify-center rounded-sm
                            border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--sidebar-muted)]
                            transition-colors opacity-60 focus-visible:opacity-100 hover:opacity-100
                            ${danger ? 'hover:text-[var(--text-danger)] hover:border-[var(--alert-red)]' : 'hover:text-primary hover:border-primary'}`}
            >
                {children}
            </button>
          );
        return (
            <div key={item.id} className="space-y-1.5" style={{ paddingLeft: depth * 22 }}>
                <div className={`flex items-center gap-2 ${depth === 0 ? 'bg-[var(--card-bg)] border border-[var(--border-line-r)] p-2.5 rounded-md' : ''}`}>
                    {depth === 0
                        ? <Database size={ic} className="text-primary shrink-0" aria-hidden />
                        : <ChevronRight size={ic - 2} className="text-[var(--text-muted)] shrink-0" aria-hidden />}
                    <input
                        value={item.label}
                        onChange={(e) => updateItem(item.id, e.target.value)}
                        className={`iqs-input ${sz} flex-1 !font-sans ${depth > 0 ? '!text-[11px]' : ''}`}
                        placeholder={depth === 0 ? '主组名称' : '子项名称'}
                    />
                    <RowAction title="新增下一级" onClick={() => addItem(item.id)}><Plus size={ic} /></RowAction>
                    <RowAction title="删除" onClick={() => deleteItem(item.id)} danger><Trash2 size={ic} /></RowAction>
                </div>
                {item.children && item.children.map(c => renderTreeItem(c, depth + 1))}
            </div>
        );
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        try {
            // New Strict Logic: AI returns exact DSL string matches Help Spec
            const dslResult = (await generateLogicDSL(aiPrompt, QCToolType.AFFINITY)) as string;

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

    const doReset = () => {
            setDsl(INITIAL_AFFINITY_DSL);
            handleParseDSL(INITIAL_AFFINITY_DSL);
        setConfirmReset(false);
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
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">亲和图分析</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Affinity Engine | LUXI LAB</p>
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
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex gap-2 p-1.5 bg-[var(--nav-bg)] rounded-md border border-[var(--border-line-r)]">
                    {[
                        { id: 'manual', label: '手动录入', icon: <Edit3 size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => {
                                if (t.id === 'dsl') setDsl(generateDSLFromData());
                                setActiveTab(t.id as any);
                            }}
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
                {activeTab === 'manual' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Global Settings */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-primary" />
                                <span className="text-[11px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图表基本信息</span>
                            </div>
                            <input
                                value={styles.title || ''}
                                onChange={e => onStylesChange({ ...styles, title: e.target.value })}
                                className="iqs-input h-11"
                                placeholder="例如：市场环境亲和图分析"
                            />
                        </div>

                        {/* Display Config */}
                        <div className="p-8 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">显示配置</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-[var(--sidebar-text)]">渲染模式 (Card/Label)</span>
                                        <span className="text-[11px] text-[var(--sidebar-muted)] font-mono mt-0.5">TYPE: {styles.type.toUpperCase()}</span>
                                    </div>
                                    <div className="flex bg-[var(--input-bg)] rounded-md p-1 border border-[var(--input-border)] items-center">
                                        <button
                                            onClick={() => onStylesChange({ ...styles, type: 'Card' })}
                                            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${styles.type === 'Card' ? 'bg-primary text-white shadow-lg' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'}`}
                                        >
                                            <Layers size={12} />
                                            <span className="text-[11px] font-black uppercase">Card</span>
                                        </button>
                                        <button
                                            onClick={() => onStylesChange({ ...styles, type: 'Label' })}
                                            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${styles.type === 'Label' ? 'bg-primary text-white shadow-lg' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'}`}
                                        >
                                            <Grid size={12} />
                                            <span className="text-[11px] font-black uppercase">Label</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-[var(--sidebar-text)]">布局方向 (Layout)</span>
                                        <span className="text-[11px] text-[var(--sidebar-muted)] font-mono mt-0.5">DIR: {styles.layout.toUpperCase()}</span>
                                    </div>
                                    <div className="flex bg-[var(--input-bg)] rounded-md p-1 border border-[var(--input-border)] items-center">
                                        <button
                                            onClick={() => onStylesChange({ ...styles, layout: 'Horizontal' })}
                                            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${styles.layout === 'Horizontal' ? 'bg-primary text-white shadow-lg' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'}`}
                                        >
                                            <AlignHorizontalJustifyCenter size={12} />
                                            <span className="text-[11px] font-black uppercase">Horz</span>
                                        </button>
                                        <button
                                            onClick={() => onStylesChange({ ...styles, layout: 'Vertical' })}
                                            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${styles.layout === 'Vertical' ? 'bg-primary text-white shadow-lg' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'}`}
                                        >
                                            <AlignVerticalJustifyCenter size={12} />
                                            <span className="text-[11px] font-black uppercase">Vert</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between">
                                        <span className="text-[11px] font-bold text-[var(--sidebar-text)]">元素间距 (Gap)</span>
                                        <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.itemGap}px</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="100"
                                        value={styles.itemGap}
                                        onChange={e => onStylesChange({ ...styles, itemGap: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-[var(--sidebar-muted)] rounded-md appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tree Editor */}
                        <div className="p-8 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md min-h-[300px]">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">数据层级结构</span>
                                <button
                                    onClick={() => addItem()}
                                    className="text-[11px] font-black uppercase tracking-wider text-primary hover:text-primary flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md border border-primary/20 transition-all hover:bg-primary/20"
                                >
                                    <Plus size={10} /> ADD ROOT
                                </button>
                            </div>
                            <div className="space-y-1">
                                {data.map(item => renderTreeItem(item, 0))}
                            </div>
                        </div>

                        {/* Style Configuration (Paired Layout like Fishbone) */}
                        <div className="p-8 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-8 shadow-md">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">样式布局配置</span>
                            </div>

                            {/* Section 1: Title */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] uppercase tracking-wider">标题样式 (Title)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[11px] text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">背景色</span>
                                        <div className="flex items-center gap-2 bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)]">
                                            <input type="color" value={styles.titleBackgroundColor} onChange={e => onStylesChange({ ...styles, titleBackgroundColor: e.target.value })} className="w-6 h-6 rounded-md bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.titleBackgroundColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[11px] text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">文字颜色</span>
                                        <div className="flex items-center gap-2 bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)]">
                                            <input type="color" value={styles.titleTextColor} onChange={e => onStylesChange({ ...styles, titleTextColor: e.target.value })} className="w-6 h-6 rounded-md bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.titleTextColor}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1 pt-1">
                                    <div className="flex justify-between px-1">
                                        <span className="text-[11px] text-[var(--sidebar-text)] uppercase tracking-widest">字号 (px)</span>
                                        <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.titleFontSize}px</span>
                                    </div>
                                    <input type="range" min="12" max="48" value={styles.titleFontSize} onChange={e => onStylesChange({ ...styles, titleFontSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-[var(--sidebar-muted)] rounded-full appearance-none" />
                                </div>
                            </div>

                            {/* Section 2: Group Header (Root) */}
                            <div className="space-y-3 pt-4 border-t border-[var(--border-line-r)]/50">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] uppercase tracking-wider">分组头/根节点 (Root)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[11px] text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">背景色</span>
                                        <div className="flex items-center gap-2 bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)]">
                                            <input type="color" value={styles.groupHeaderBackgroundColor} onChange={e => onStylesChange({ ...styles, groupHeaderBackgroundColor: e.target.value })} className="w-6 h-6 rounded-md bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.groupHeaderBackgroundColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[11px] text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">文字颜色</span>
                                        <div className="flex items-center gap-2 bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)]">
                                            <input type="color" value={styles.groupHeaderTextColor} onChange={e => onStylesChange({ ...styles, groupHeaderTextColor: e.target.value })} className="w-6 h-6 rounded-md bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.groupHeaderTextColor}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1 pt-1">
                                    <div className="flex justify-between px-1">
                                        <span className="text-[11px] text-[var(--sidebar-text)] uppercase tracking-widest">字号 (px)</span>
                                        <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.groupHeaderFontSize}px</span>
                                    </div>
                                    <input type="range" min="10" max="32" value={styles.groupHeaderFontSize} onChange={e => onStylesChange({ ...styles, groupHeaderFontSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-[var(--sidebar-muted)] rounded-full appearance-none" />
                                </div>
                            </div>

                            {/* Section 3: Items (Other Nodes) */}
                            <div className="space-y-3 pt-4 border-t border-[var(--border-line-r)]/50">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--state-up)]" />
                                    <span className="text-[11px] font-bold text-[var(--sidebar-text)] uppercase tracking-wider">其他节点 (Items)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[11px] text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">背景色</span>
                                        <div className="flex items-center gap-2 bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)]">
                                            <input type="color" value={styles.itemBackgroundColor} onChange={e => onStylesChange({ ...styles, itemBackgroundColor: e.target.value })} className="w-6 h-6 rounded-md bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.itemBackgroundColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[11px] text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">文字颜色</span>
                                        <div className="flex items-center gap-2 bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)]">
                                            <input type="color" value={styles.itemTextColor} onChange={e => onStylesChange({ ...styles, itemTextColor: e.target.value })} className="w-6 h-6 rounded-md bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.itemTextColor}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1 pt-1">
                                    <div className="flex justify-between px-1">
                                        <span className="text-[11px] text-[var(--sidebar-text)] uppercase tracking-widest">字号 (px)</span>
                                        <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.itemFontSize}px</span>
                                    </div>
                                    <input type="range" min="8" max="24" value={styles.itemFontSize} onChange={e => onStylesChange({ ...styles, itemFontSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-[var(--sidebar-muted)] rounded-full appearance-none" />
                                </div>
                            </div>

                            {/* Section 4: Lines & Borders */}
                            <div className="space-y-3 pt-4 border-t border-[var(--border-line-r)]">
                                <span className="text-[11px] font-bold text-[var(--sidebar-text)] uppercase tracking-wider block mb-2">连接与边框</span>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[11px] text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">边框颜色</span>
                                        <div className="flex items-center gap-2 bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)]">
                                            <input type="color" value={styles.borderColor} onChange={e => onStylesChange({ ...styles, borderColor: e.target.value })} className="w-6 h-6 rounded-md bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.borderColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[11px] text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">连线颜色 (Tree)</span>
                                        <div className="flex items-center gap-2 bg-[var(--input-bg)] p-1.5 rounded-md border border-[var(--input-border)]">
                                            <input type="color" value={styles.lineColor} onChange={e => onStylesChange({ ...styles, lineColor: e.target.value })} className="w-6 h-6 rounded-md bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[11px] font-mono text-[var(--sidebar-text)]">{styles.lineColor}</span>
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
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能亲和分析描述</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="输入待整理的信息或想法，例如：'整理关于提升团队效率的头脑风暴想法，包括简化流程、工具引入等'..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`shrink-0 ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在执行归纳整理...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能归纳并生成</span>
                                    </>
                                )}
                            </button>

                            <div className="iqs-note space-y-3 shrink-0">
                                <p className="text-[11px] font-black text-primary uppercase tracking-widest">推理提示</p>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以输入一堆杂乱的观点、反馈或想法，AI 将自动使用 **KJ法 (亲和图)** 对其进行归纳、分类和层级整理，并生成结构化的亲和图。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && (
                <CardDocModal kind="affinity" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
        
    );
};

export default AffinityEditor;
