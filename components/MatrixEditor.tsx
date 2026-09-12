import React, { useState, useEffect } from 'react';
import { MatrixData,
    MatrixChartStyles,
    DEFAULT_MATRIX_STYLES,
    MatrixAxis,
    MatrixSymbolType } from '../types';
import { INITIAL_MATRIX_DSL,
    MATRIX_SAMPLE_TEMPLATES } from '../constants';
import {
    AlertTriangle,
    Code,
    Cpu,
    Database,
    HelpCircle,
    Loader2,
    RotateCcw,
    Sparkles,
    Table,
    Trash2,
    X,
    Zap
} from 'lucide-react';
import {generateLogicDSL} from '../services/aiService';
import { QCToolType } from '../types';
import { CardDocModal } from './CardDocModal';
import { Switch } from './ui/Switch';
import { useAIEngine } from '../hooks/useAIEngine';

interface MatrixEditorProps {
    data: MatrixData;
    styles: MatrixChartStyles;
    // We pass the raw DSL string for persistence if needed, or handle it internally
    dsl?: string;
    onDataChange: (data: MatrixData) => void;
    onStylesChange: (styles: MatrixChartStyles) => void;
    onDslChange?: (dsl: string) => void;
}

export const parseMatrixDSL = (content: string): { data: MatrixData, styles: MatrixChartStyles } => {
    const lines = content.split('\n');
    const newStyles: MatrixChartStyles = { ...DEFAULT_MATRIX_STYLES };
    const axes: MatrixAxis[] = [];
    const matrices: any[] = [];
    let title = '矩阵图分析';

    // Relation mapping logic
    // Default shorthands: S->Strong, M->Medium, W->Weak, 9->Strong, 3->Medium, 1->Weak
    const symbolMap: Record<string, MatrixSymbolType> = {
        'S': 'Strong', '9': 'Strong', '◎': 'Strong',
        'M': 'Medium', '3': 'Medium', '○': 'Medium',
        'W': 'Weak', '1': 'Weak', '△': 'Weak'
    };

    let currentAxisId = '';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        // 1. Meta & Styling
        if (trimmed.startsWith('Title:')) { title = trimmed.replace('Title:', '').trim(); return; }

        // Flexible Type handling: L-Type, L-type, L, etc -> normalized L
        if (trimmed.startsWith('Type:')) {
            const val = trimmed.replace('Type:', '').trim().toUpperCase();
            if (val.startsWith('L')) newStyles.type = 'L';
            else if (val.startsWith('T')) newStyles.type = 'T';
            else if (val.startsWith('Y')) newStyles.type = 'Y';
            else if (val.startsWith('X')) newStyles.type = 'X';
            else if (val.startsWith('C')) newStyles.type = 'C';
            return;
        }

        // Color[Key]: hex
        if (trimmed.startsWith('Color[')) {
            const match = trimmed.match(/Color\[(Axis|Grid|Strong|Medium|Weak)\]:\s*(#\w+)/i);
            if (match) {
                const key = match[1].toLowerCase();
                if (key === 'axis') newStyles.axisColor = match[2];
                else if (key === 'grid') newStyles.gridColor = match[2];
                else if (key === 'strong') newStyles.symbolColorStrong = match[2];
                else if (key === 'medium') newStyles.symbolColorMedium = match[2];
                else if (key === 'weak') newStyles.symbolColorWeak = match[2];
            }
            return;
        }

        // Font[Key]: size
        if (trimmed.startsWith('Font[')) {
            const match = trimmed.match(/Font\[(Title|Base)\]:\s*(\d+)/i);
            if (match) {
                const key = match[1].toLowerCase();
                if (key === 'title') newStyles.titleFontSize = parseInt(match[2]);
                else if (key === 'base') newStyles.fontSize = parseInt(match[2]);
            }
            return;
        }

        // CellSize: num
        if (trimmed.startsWith('CellSize:')) {
            const val = parseInt(trimmed.replace('CellSize:', '').trim());
            if (!isNaN(val)) newStyles.cellSize = val;
            return;
        }

        // ShowScores: true/false
        if (trimmed.startsWith('ShowScores:')) {
            const val = trimmed.replace('ShowScores:', '').trim().toLowerCase();
            newStyles.showScores = (val === 'true');
            return;
        }

        // Weight[Key]: num
        if (trimmed.startsWith('Weight[')) {
            const match = trimmed.match(/Weight\[(Strong|Medium|Weak)\]:\s*(\d+)/i);
            if (match) {
                const key = match[1].toLowerCase();
                if (key === 'strong') newStyles.weightStrong = parseInt(match[2]);
                else if (key === 'medium') newStyles.weightMedium = parseInt(match[2]);
                else if (key === 'weak') newStyles.weightWeak = parseInt(match[2]);
            }
            return;
        }

        // Relation Mapping (Optional): Relation: Strong(S:9:◎)
        if (trimmed.startsWith('Relation:')) {
            const rules = trimmed.replace('Relation:', '').split(',');
            rules.forEach(rule => {
                const m = rule.match(/\((.*?)\)/);
                if (m) {
                    const parts = m[1].split(':');
                    // We only care about the shorthand -> Symbol mapping for parsing
                    // parts: 0:shorthand, 1:weight, 2:symbol_char
                    if (parts.length >= 2) {
                        const shorthand = parts[0].trim();
                        const typeName = rule.split('(')[0].trim();
                        if (typeName.includes('Strong')) symbolMap[shorthand] = 'Strong';
                        else if (typeName.includes('Medium')) symbolMap[shorthand] = 'Medium';
                        else if (typeName.includes('Weak')) symbolMap[shorthand] = 'Weak';
                    }
                }
            });
            return;
        }

        // 2. Axis Definition
        if (trimmed.startsWith('Axis:')) {
            const parts = trimmed.replace('Axis:', '').split(',');
            if (parts.length >= 1) {
                currentAxisId = parts[0].trim();
                const label = parts[1] ? parts[1].trim() : currentAxisId;
                axes.push({ id: currentAxisId, label, items: [] });
            }
            return;
        }

        // Axis Items (starting with -)
        if (trimmed.startsWith('-') && currentAxisId) {
            const axis = axes.find(a => a.id === currentAxisId);
            if (axis) {
                const parts = trimmed.substring(1).split(',');
                const id = parts[0].trim();
                let label = parts[1] ? parts[1].trim() : id;
                let weight = parts[2] ? parseFloat(parts[2]) : undefined;

                // Robustness: If weight column is missing, try to extract from label like "Item [5]"
                if (weight === undefined) {
                    const weightMatch = label.match(/\[(\d+(?:\.\d+)?)\]/);
                    if (weightMatch) {
                        weight = parseFloat(weightMatch[1]);
                        label = label.replace(weightMatch[0], '').trim();
                    }
                }
                axis.items.push({ id, label, weight });
            }
            return;
        }

        // 3. Matrix Relation Definition: Matrix: A x B
        if (trimmed.startsWith('Matrix:')) {
            const parts = trimmed.replace('Matrix:', '').split('x');
            if (parts.length >= 2) {
                matrices.push({
                    rowAxisId: parts[0].trim(),
                    colAxisId: parts[1].trim(),
                    cells: []
                });
            }
            return;
        }

        // Matrix Cells: a1: b1:S, b2:◎
        if (trimmed.includes(':') && !trimmed.startsWith('Title') && !trimmed.startsWith('Type') && !trimmed.startsWith('Axis') && !trimmed.startsWith('Matrix')) {
            const lastMatrix = matrices[matrices.length - 1];
            if (lastMatrix) {
                const [rowId, relations] = trimmed.split(/:(.+)/);
                if (rowId && relations) {
                    const relParts = relations.split(',');
                    relParts.forEach(rel => {
                        const [colId, symKey] = rel.split(':').map(s => s.trim());
                        if (colId && symKey) {
                            const symbol = symbolMap[symKey] || symbolMap[symKey.toUpperCase()] || 'None';
                            lastMatrix.cells.push({
                                rowId: rowId.trim(),
                                colId: colId.trim(),
                                symbol
                            });
                        }
                    });
                }
            }
        }
    });

    return {
        data: { title, type: newStyles.type, axes, matrices },
        styles: newStyles
    };
};

export const generateMatrixDSL = (data: MatrixData, styles: MatrixChartStyles): string => {
    let dsl = `Title: ${data.title}\n`;
    dsl += `Type: ${styles.type}\n`;
    dsl += `CellSize: ${styles.cellSize}\n`;
    dsl += `ShowScores: ${styles.showScores}\n`;
    dsl += `Font[Title]: ${styles.titleFontSize}\n`;
    dsl += `Font[Base]: ${styles.fontSize}\n`;
    dsl += `Weight[Strong]: ${styles.weightStrong}\n`;
    dsl += `Weight[Medium]: ${styles.weightMedium}\n`;
    dsl += `Weight[Weak]: ${styles.weightWeak}\n`;
    dsl += `Color[Strong]: ${styles.symbolColorStrong}\n`;
    dsl += `Color[Medium]: ${styles.symbolColorMedium}\n`;
    dsl += `Color[Weak]: ${styles.symbolColorWeak}\n`;
    dsl += `Color[Axis]: ${styles.axisColor}\n`;
    dsl += `Color[Grid]: ${styles.gridColor}\n\n`;

    data.axes.forEach(axis => {
        dsl += `Axis: ${axis.id}, ${axis.label}\n`;
        axis.items.forEach(item => {
            dsl += `- ${item.id}, ${item.label}${item.weight !== undefined ? `, ${item.weight}` : ''}\n`;
        });
        dsl += `\n`;
    });

    data.matrices.forEach(matrix => {
        dsl += `Matrix: ${matrix.rowAxisId} x ${matrix.colAxisId}\n`;
        // Group cells by rowId
        const rows: Record<string, { colId: string, char: string }[]> = {};
        (matrix.cells || []).forEach(cell => {
            if (cell.symbol === 'None') return;
            if (!rows[cell.rowId]) rows[cell.rowId] = [];
            let char = '◎';
            if (cell.symbol === 'Medium') char = '○';
            else if (cell.symbol === 'Weak') char = '△';
            rows[cell.rowId].push({ colId: cell.colId, char });
        });

        Object.entries(rows).forEach(([rowId, rels]) => {
            dsl += `${rowId}: ${rels.map(r => `${r.colId}:${r.char}`).join(', ')}\n`;
        });
        dsl += `\n`;
    });

    return dsl.trim();
};

export const clearMatrixRelations = (currentDSL: string): string => {
    const lines = currentDSL.split('\n');
    const newLines: string[] = [];
    let isSkipping = false;

    for (const line of lines) {
        const trimmed = line.trim();

        // If we encounter a new Matrix header, store it and start skipping subsequent lines (the data)
        if (trimmed.startsWith('Matrix:')) {
            newLines.push(line);
            isSkipping = true;
            continue;
        }

        // If we represent a new section, stop skipping
        if (trimmed.startsWith('Title:') ||
            trimmed.startsWith('Type:') ||
            trimmed.startsWith('Relation:') ||
            trimmed.startsWith('Axis:') ||
            trimmed.startsWith('# ')) { // Comments or Section Headers often start with #
            isSkipping = false;
        }

        if (!isSkipping) {
            newLines.push(line);
        }
    }

    return newLines.join('\n');
};

export const updateMatrixDSL = (currentDSL: string, rowId: string, colId: string, currentSymbolName: any, targetRowAxisId?: string, targetColAxisId?: string): string => {
    const lines = currentDSL.split('\n');

    // 1. Define Cycle: Name -> Next Name
    const transition: Record<string, string> = {
        'None': 'Strong',
        'Strong': 'Medium',
        'Medium': 'Weak',
        'Weak': 'None'
    };
    const nextName = transition[currentSymbolName] || 'Strong';

    // 2. Define Name -> DSL Char
    const symbolChar: Record<string, string> = {
        'Strong': '◎',
        'Medium': '○',
        'Weak': '△'
    };

    let matrixStartIndex = -1;
    let matrixEndIndex = -1;
    let targetRowIndex = -1;

    // 1. Locate the CORRECT Matrix Section
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('Matrix:')) {
            // Check if this matrix matches the requested axes (if provided)
            let isMatch = true;
            if (targetRowAxisId && targetColAxisId) {
                const parts = line.replace('Matrix:', '').split('x');
                if (parts.length >= 2) {
                    const r = parts[0].trim();
                    const c = parts[1].trim();
                    if (r !== targetRowAxisId || c !== targetColAxisId) {
                        isMatch = false;
                    }
                }
            }

            if (isMatch) {
                matrixStartIndex = i;
                // Find end of this block
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].trim() === '' || lines[j].startsWith('Title:') || lines[j].startsWith('Axis:') || lines[j].startsWith('Matrix:')) {
                        matrixEndIndex = j;
                        break;
                    }
                }
                if (matrixEndIndex === -1) matrixEndIndex = lines.length;
                break; // Found the target matrix
            }
        }
    }

    if (matrixStartIndex === -1) {
        // If we have specific axes but didn't find the block, maybe we need to create it?
        // For now, assume block exists or fail.
        return currentDSL;
    }

    // 2. Find row
    for (let i = matrixStartIndex + 1; i < matrixEndIndex; i++) {
        if (lines[i].trim().startsWith(`${rowId}:`)) {
            targetRowIndex = i;
            break;
        }
    }

    // 3. Apply Change
    if (targetRowIndex !== -1) {
        const line = lines[targetRowIndex];
        let newLine = line;

        if (line.includes(`${colId}:`)) {
            // Update Or Delete
            if (nextName === 'None') {
                // Remove logic
                newLine = line.replace(new RegExp(`${colId}:[^,\\s]+`), '')
                    .replace(/,\s*,/g, ',')
                    .replace(/:\s*,/g, ': ')
                    .replace(/,\s*$/, '').trim();
            } else {
                // Update char
                newLine = line.replace(new RegExp(`${colId}:[^,\\s]+`), `${colId}:${symbolChar[nextName]}`);
            }
        } else {
            // Append
            if (nextName !== 'None') {
                // If line ends with ':', just pad space. Else add comma.
                if (line.trim().endsWith(':')) {
                    newLine = `${line} ${colId}:${symbolChar[nextName]}`;
                } else {
                    newLine = `${line}, ${colId}:${symbolChar[nextName]}`;
                }
            }
        }
        lines[targetRowIndex] = newLine;
    } else {
        // Insert new row line
        if (nextName !== 'None') {
            const newLine = `${rowId}: ${colId}:${symbolChar[nextName]}`;
            // Find best place to insert: usually after Matrix line or at end of block
            lines.splice(matrixEndIndex, 0, newLine);
        }
    }

    return lines.join('\n');
};

const MatrixEditor: React.FC<MatrixEditorProps> = ({ data, styles, onDataChange, onStylesChange, onDslChange, dsl: propDsl }) => {
    const [localDsl, setLocalDsl] = useState(INITIAL_MATRIX_DSL);
    const [activeTab, setActiveTab] = useState<'dsl' | 'manual' | 'ai'>('manual');
    // R-UI-08：破坏性操作自有确认（替代 window.confirm）
    const [pendingAction, setPendingAction] = useState<{ label: string; run: () => void } | null>(null);
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [error, setError] = useState<string | null>(null);

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const engineName = useAIEngine();


    // Use prop DSL if available, otherwise local
    const currentDsl = propDsl !== undefined ? propDsl : localDsl;

    // Initial Parse (only if not controlled or first load)
    useEffect(() => {
        if (!propDsl) {
            try {
                const { data: d, styles: s } = parseMatrixDSL(INITIAL_MATRIX_DSL);
                onDataChange(d);
                onStylesChange(s);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    // Also sync propDsl changes to data if needed (usually handled by parent, but for safety)
    useEffect(() => {
        if (propDsl) {
            try {
                const { data: d, styles: s } = parseMatrixDSL(propDsl);
                onDataChange(d);
                onStylesChange(s);
            } catch (e) {
                // Silent error on prop update
            }
        }
    }, [propDsl]);

    const handleParseDSL = (val: string) => {
        try {
            const { data: d, styles: s } = parseMatrixDSL(val);
            onDataChange(d);
            onStylesChange(s);
            setError(null);
        } catch (e) {
            console.error(e);
            // setError('DSL 解析错误'); 
        }
    };

    const handleDSLChange = (val: string) => {
        if (propDsl === undefined) setLocalDsl(val);
        if (onDslChange) onDslChange(val);
        handleParseDSL(val);
    };

    const handleDataChange = (newData: MatrixData) => {
        // Cleanup relations if axes/items were deleted
        const validAxisIds = new Set(newData.axes.map(a => a.id));
        const validItemIds = new Set(newData.axes.flatMap(a => a.items.map(i => i.id)));

        const cleanedMatrices = newData.matrices
            .filter(m => validAxisIds.has(m.rowAxisId) && validAxisIds.has(m.colAxisId))
            .map(m => ({
                ...m,
                cells: m.cells.filter(c => validItemIds.has(c.rowId) && validItemIds.has(c.colId))
            }));

        const finalData = { ...newData, matrices: cleanedMatrices };

        onDataChange(finalData);
        const newDsl = generateMatrixDSL(finalData, styles);
        if (propDsl === undefined) setLocalDsl(newDsl);
        if (onDslChange) onDslChange(newDsl);
    };

    const handleStylesChange = (newStyles: MatrixChartStyles) => {
        onStylesChange(newStyles);
        // Sync title back to data if changed
        const newData = { ...data, title: newStyles.title };
        if (newStyles.title !== data.title) {
            onDataChange(newData);
        }
        const newDsl = generateMatrixDSL(newData, newStyles);
        if (propDsl === undefined) setLocalDsl(newDsl);
        if (onDslChange) onDslChange(newDsl);
    };

    const handleLoadSample = () => {
        const type = styles.type;
        const template = (MATRIX_SAMPLE_TEMPLATES as any)[type];
        if (template) {
            setPendingAction({
                label: `加载 ${type} 型矩阵的示例结构？这会覆盖当前的维度定义。`,
                run: () => handleDSLChange(template),
            });
        }
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateLogicDSL(aiPrompt, QCToolType.MATRIX);
            handleDSLChange(result);
            setActiveTab('dsl');
        } catch (err) {
            console.error(err);
            setError(`AI 生成失败：${err instanceof Error ? err.message : '未知错误'}。可改用「DSL编辑器」手工录入。`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => setPendingAction({
        label: '恢复到示例数据？当前所有修改将丢失。',
        run: () => {
            try {
                const { data: d, styles: s } = parseMatrixDSL(INITIAL_MATRIX_DSL);
                onDataChange(d);
                onStylesChange(s);
                if (propDsl === undefined) setLocalDsl(INITIAL_MATRIX_DSL);
                if (onDslChange) onDslChange(INITIAL_MATRIX_DSL);
            } catch (e) {
                console.error(e);
            }
        },
    });

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative">
            <div className="p-6 border-b border-[var(--sidebar-border)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
                            <Cpu size={22} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">矩阵图分析</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Matrix Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            className="p-3 bg-[var(--input-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--input-border)]"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            onClick={() => setPendingAction({
                                label: '清空所有矩阵关系？此操作无法撤销。',
                                run: () => handleDSLChange(clearMatrixRelations(currentDsl)),
                            })}
                            className="p-3 bg-[var(--alert-red)]/10 rounded-md text-[var(--text-danger)] hover:bg-[var(--alert-red)] hover:text-white transition-all border border-[var(--alert-red)]/20"
                            title="清空所有关系"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button
                            onClick={() => setShowDocs(true)}
                            className="p-3 bg-[var(--input-bg)] rounded-md text-[var(--sidebar-text)] hover:text-primary transition-all border border-[var(--input-border)]"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>
                <nav className="flex bg-[var(--nav-bg)] p-1.5 rounded-md border border-[var(--sidebar-border)] gap-1">
                    {[
                        { id: 'manual', label: '手工录入', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> },
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

                {/* R-UI-08：破坏性操作自有确认条（替代 window.confirm） */}
                {pendingAction && (
                    <div className="flex items-center gap-3 p-3 rounded-md bg-[var(--input-bg)] border border-[var(--alert-red)]">
                        <AlertTriangle size={16} className="text-[var(--text-danger)] shrink-0" />
                        <span className="text-[11px] flex-1">{pendingAction.label}</span>
                        <button
                            type="button"
                            onClick={() => { pendingAction.run(); setPendingAction(null); }}
                            className="px-3 py-1.5 rounded-sm bg-[var(--alert-red)] text-white text-[11px] font-bold shrink-0"
                        >
                            确定
                        </button>
                        <button
                            type="button"
                            onClick={() => setPendingAction(null)}
                            className="px-3 py-1.5 rounded-sm border border-[var(--input-border)] text-[11px] font-bold shrink-0"
                        >
                            取消
                        </button>
                    </div>
                )}
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
                {/* AI Inference Tab */}
                {activeTab === 'ai' && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3 shrink-0">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能矩阵分析描述</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="输入您想分析的维度及其关系描述，例如：'分析零件(齿轮、轴承)与故障模式(磨损、泄漏)的强弱相关性'..."
                            />
                            <button
                                onClick={handleGenerateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-md flex items-center justify-center gap-4 transition-all relative overflow-hidden group ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-primary" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在推演矩阵关系...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并生成</span>
                                    </>
                                )}
                            </button>

                            <div className="p-8 bg-primary/10 border border-primary/20 rounded-md space-y-4 shadow-sm">
                                <p className="text-[11px] font-black text-primary uppercase tracking-widest">推理提示</p>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以描述多个维度及其交叉点关系，AI 将自动识别轴和项目，并填充矩阵。例如：“分析部门 A、B 与考核指标 X、Y 的关系，其中 A 与 X 强相关”。
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* DSL Configuration Tab */}
                {activeTab === 'dsl' && (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <textarea
                            value={currentDsl}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                            placeholder="输入 DSL 指令..."
                            spellCheck={false}
                        />
                    </div>
                )}

                {/* Manual Entry Tab */}
                {activeTab === 'manual' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 shadow-md">
                            {/* Global & Layout Section */}
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">全局与布局</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[11px] font-bold text-[var(--sidebar-muted)]">矩阵图类型</span>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={styles.type}
                                                onChange={e => handleStylesChange({ ...styles, type: e.target.value as any })}
                                                className="iqs-input h-9 w-auto min-w-[150px]"
                                            >
                                                <option value="L">L 型 (2轴)</option>
                                                <option value="T">T 型 (3轴)</option>
                                                <option value="Y">Y 型 (3轴闭环)</option>
                                                <option value="X">X 型 (4轴)</option>
                                                <option value="C">C 型 (自相关)</option>
                                            </select>
                                            <button
                                                onClick={handleLoadSample}
                                                className="h-9 px-3 shrink-0 bg-primary/15 text-[var(--text-ok)] text-[11px] font-bold rounded-sm border border-primary/30 hover:bg-primary hover:text-white transition-colors whitespace-nowrap"
                                                title="加载该类型的标准示例结构"
                                            >
                                                取示例
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-bold text-[var(--sidebar-muted)]">数值计算</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <Switch checked={!!styles.showScores} onChange={v => handleStylesChange({ ...styles, showScores: v })} ariaLabel="数值计算" />
                                        </label>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-muted)] shrink-0">项目标题</span>
                                    <input
                                        type="text"
                                        value={styles.title}
                                        onChange={e => handleStylesChange({ ...styles, title: e.target.value })}
                                        className="iqs-input h-9"
                                    />
                                </div>
                            </div>

                            {/* Data Structure Section */}
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3 mt-8">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">数据结构 (Axes & Items)</span>
                            </div>
                            <div className="space-y-4">
                                {data.axes.map((axis, aIdx) => (
                                    <div key={axis.id} className="p-4 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <input
                                                className="iqs-input h-9 w-16 !text-[11px] !font-mono font-black text-primary text-center"
                                                value={axis.id}
                                                onChange={e => {
                                                    const newAxes = [...data.axes];
                                                    newAxes[aIdx] = { ...axis, id: e.target.value };
                                                    handleDataChange({ ...data, axes: newAxes });
                                                }}
                                            />
                                            <input
                                                className="iqs-input h-9"
                                                value={axis.label}
                                                onChange={e => {
                                                    const newAxes = [...data.axes];
                                                    newAxes[aIdx] = { ...axis, label: e.target.value };
                                                    handleDataChange({ ...data, axes: newAxes });
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newAxes = data.axes.filter((_, i) => i !== aIdx);
                                                    handleDataChange({ ...data, axes: newAxes });
                                                }}
                                                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--sidebar-muted)] opacity-60 hover:opacity-100 hover:text-[var(--text-danger)] hover:border-[var(--alert-red)] transition-colors"
                                                title="删除维度轴" aria-label="删除维度轴"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="pl-4 space-y-2 border-l border-[var(--sidebar-border)]">
                                            {axis.items.map((item, iIdx) => (
                                                <div key={item.id} className="flex items-center gap-2">
                                                    <input
                                                        className="iqs-input h-8 w-12 !text-[11px] !font-mono text-center"
                                                        value={item.id}
                                                        onChange={e => {
                                                            const newAxes = [...data.axes];
                                                            const newItems = [...axis.items];
                                                            newItems[iIdx] = { ...item, id: e.target.value };
                                                            newAxes[aIdx] = { ...axis, items: newItems };
                                                            handleDataChange({ ...data, axes: newAxes });
                                                        }}
                                                    />
                                                    <input
                                                        className="iqs-input h-8 flex-1 !text-[11px]"
                                                        value={item.label}
                                                        onChange={e => {
                                                            const newAxes = [...data.axes];
                                                            const newItems = [...axis.items];
                                                            newItems[iIdx] = { ...item, label: e.target.value };
                                                            newAxes[aIdx] = { ...axis, items: newItems };
                                                            handleDataChange({ ...data, axes: newAxes });
                                                        }}
                                                    />
                                                    <input
                                                        type="number"
                                                        className="iqs-input h-8 w-12 !text-[11px] !text-[var(--text-warn)] text-center"
                                                        placeholder="W"
                                                        value={item.weight ?? ''}
                                                        onChange={e => {
                                                            const newAxes = [...data.axes];
                                                            const newItems = [...axis.items];
                                                            newItems[iIdx] = { ...item, weight: e.target.value ? parseFloat(e.target.value) : undefined };
                                                            newAxes[aIdx] = { ...axis, items: newItems };
                                                            handleDataChange({ ...data, axes: newAxes });
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newAxes = [...data.axes];
                                                            const newItems = axis.items.filter((_, i) => i !== iIdx);
                                                            newAxes[aIdx] = { ...axis, items: newItems };
                                                            handleDataChange({ ...data, axes: newAxes });
                                                        }}
                                                        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--sidebar-muted)] opacity-60 hover:opacity-100 hover:text-[var(--text-danger)] hover:border-[var(--alert-red)] transition-colors"
                                                        title="删除项目" aria-label="删除项目"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    const newAxes = [...data.axes];
                                                    const newId = `${axis.id.toLowerCase()}${axis.items.length + 1}`;
                                                    newAxes[aIdx] = { ...axis, items: [...axis.items, { id: newId, label: '新项目' }] };
                                                    handleDataChange({ ...data, axes: newAxes });
                                                }}
                                                className="h-8 px-3 rounded-sm border border-dashed border-[var(--border-line-r)] text-[11px] font-bold text-[var(--text-ok)] hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-1 mt-2 w-fit"
                                            >
                                                + 添加项目
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const nextId = String.fromCharCode(65 + data.axes.length);
                                        handleDataChange({ ...data, axes: [...data.axes, { id: nextId, label: `维度轴 ${nextId}`, items: [] }] });
                                    }}
                                    className="w-full h-11 bg-[var(--input-bg)] rounded-md border border-dashed border-[var(--border-line-r)] text-[11px] font-black uppercase tracking-widest text-[var(--sidebar-muted)] hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors"
                                >
                                    + 新增维度轴
                                </button>
                            </div>

                            {/* Symbol Weight Configuration */}
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3 mt-8">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">符号权重配置</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { key: 'weightStrong', label: '强 (◎)' },
                                    { key: 'weightMedium', label: '中 (○)' },
                                    { key: 'weightWeak', label: '弱 (△)' }
                                ].map(w => (
                                    <div key={w.key} className="space-y-2">
                                        <div className="text-[11px] font-bold text-[var(--sidebar-muted)] uppercase tracking-wider text-center">{w.label}</div>
                                        <input
                                            type="number"
                                            className="iqs-input h-8 text-center"
                                            value={(styles as any)[w.key]}
                                            onChange={e => handleStylesChange({ ...styles, [w.key]: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Visual Configuration */}
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3 mt-8">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">视觉配置</span>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                {[
                                    { key: 'symbolColorStrong', label: '强相关 (◎)' },
                                    { key: 'symbolColorMedium', label: '中相关 (○)' },
                                    { key: 'symbolColorWeak', label: '弱相关 (△)' },
                                    { key: 'axisColor', label: '轴标签颜色' },
                                    { key: 'gridColor', label: '网格线颜色' }
                                ].map(c => (
                                    <div key={c.key} className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-[var(--sidebar-muted)]">{c.label}</span>
                                        <input
                                            type="color"
                                            value={(styles as any)[c.key] || '#000000'}
                                            onChange={e => handleStylesChange({ ...styles, [c.key]: e.target.value })}
                                            className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-none p-0"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Size Configuration */}
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3 mt-8">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">尺寸配置</span>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-muted)]">单元格尺寸</span>
                                    <input
                                        type="range"
                                        min="30"
                                        max="80"
                                        step="5"
                                        value={styles.cellSize}
                                        onChange={e => handleStylesChange({ ...styles, cellSize: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-[var(--input-bg)] rounded-md appearance-none cursor-pointer"
                                    />
                                    <div className="text-[11px] text-[var(--sidebar-muted)] text-right">{styles.cellSize}px</div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-muted)]">标题字号</span>
                                    <input
                                        type="range"
                                        min="12"
                                        max="48"
                                        step="1"
                                        value={styles.titleFontSize}
                                        onChange={e => handleStylesChange({ ...styles, titleFontSize: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-[var(--input-bg)] rounded-md appearance-none cursor-pointer"
                                    />
                                    <div className="text-[11px] text-[var(--sidebar-muted)] text-right">{styles.titleFontSize}px</div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-muted)]">内容字号</span>
                                    <input
                                        type="range"
                                        min="8"
                                        max="24"
                                        step="1"
                                        value={styles.fontSize}
                                        onChange={e => handleStylesChange({ ...styles, fontSize: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-[var(--input-bg)] rounded-md appearance-none cursor-pointer"
                                    />
                                    <div className="text-[11px] text-[var(--sidebar-muted)] text-right">{styles.fontSize}px</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Docs Modal */}
            {showDocs && (
                <CardDocModal kind="matrix" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
    
    );
};

export default MatrixEditor;
