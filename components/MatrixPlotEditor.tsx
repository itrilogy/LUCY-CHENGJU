import React, { useState, useEffect } from 'react';
import { MatrixPlotData,
    MatrixPlotStyles,
    DEFAULT_MATRIX_PLOT_STYLES,
    QCToolType } from '../types';
import { INITIAL_MATRIX_PLOT_DSL } from '../constants';
import { Grid3X3,
    Sparkles,
    HelpCircle,
    X,
    Loader2,
    Database,
    Code,
    RotateCcw,
    Cpu,
    AlertTriangle,
} from 'lucide-react';
import {generateLogicDSL} from '../services/aiService';
import { CardDocModal } from './CardDocModal';
import { Switch } from './ui/Switch';
import { useAIEngine } from '../hooks/useAIEngine';
import { ConfirmInline } from './ui/ConfirmInline';

interface MatrixPlotEditorProps {
    data: MatrixPlotData;
    styles: MatrixPlotStyles;
    onDataChange: (data: MatrixPlotData) => void;
    onStylesChange: (styles: MatrixPlotStyles) => void;
}

export const parseMatrixPlotDSL = (content: string): { data: MatrixPlotData, styles: MatrixPlotStyles } => {
    const lines = content.split('\n');
    const newStyles: MatrixPlotStyles = { ...DEFAULT_MATRIX_PLOT_STYLES };
    const newData: MatrixPlotData = {
        title: '图矩阵相关性分析',
        mode: 'matrix',
        yDimensions: [],
        xDimensions: [],
        showSmoother: false,
        smootherMethod: 'Lowess',
        data: []
    };

    let isDataBlock = false;
    let isStylesBlock = false;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        // Block switches
        if (trimmed.startsWith('Data:')) {
            isDataBlock = true;
            isStylesBlock = false;
            return;
        }
        if (trimmed.startsWith('Styles:')) {
            isDataBlock = false;
            isStylesBlock = true;
            return;
        }

        // Styles Block Parsing
        if (isStylesBlock && trimmed.startsWith('-')) {
            const content = trimmed.substring(1).trim();
            const [key, ...valParts] = content.split(':').map(s => s.trim());
            const val = valParts.join(':').trim();
            if (key && val) {
                switch (key) {
                    case 'DisplayMode': newStyles.displayMode = val as any; break;
                    case 'Diagonal': newStyles.diagonal = val as any; break;
                    case 'PointSize': newStyles.pointSize = parseFloat(val); break;
                    case 'PointOpacity': newStyles.pointOpacity = parseFloat(val); break;
                    case 'ColorPalette': newStyles.colorPalette = val as any; break;
                }
            }
            return;
        }

        // Data Block Parsing (Fixed)
        if (isDataBlock && trimmed.startsWith('-')) {
            const content = trimmed.substring(1).trim();
            if (content.startsWith('{')) {
                // YAML-lite object
                try {
                    const obj: any = {};
                    const pairs = content.replace(/[{}]/g, '').split(',');
                    pairs.forEach(p => {
                        const [k, v] = p.split(':').map(s => s.trim());
                        if (k && v) {
                            const num = parseFloat(v);
                            obj[k] = isNaN(num) ? v.replace(/['"]/g, '') : num;
                        }
                    });
                    newData.data.push(obj);
                } catch (e) {
                    console.warn('Failed to parse data object:', content);
                }
            } else {
                // CSV-like
                const vals = content.split(',').map(s => s.trim());
                const obj: any = {};
                const dims = newData.mode === 'matrix' ? newData.xDimensions : [...newData.yDimensions, ...newData.xDimensions];
                vals.forEach((v, i) => {
                    if (dims[i]) {
                        const num = parseFloat(v);
                        obj[dims[i]] = isNaN(num) ? v : num;
                    }
                });
                if (Object.keys(obj).length > 0) newData.data.push(obj);
            }
            return;
        }

        // Top-level Metadata
        if (trimmed.includes(':') && !trimmed.startsWith('-')) {
            const [keyPart, ...valParts] = trimmed.split(':');
            const key = keyPart.trim();
            const val = valParts.join(':').trim();

            switch (key) {
                case 'Title':
                    newData.title = val;
                    newStyles.title = val;
                    break;
                case 'Mode':
                    newData.mode = val.toLowerCase() === 'yvsx' ? 'yvsx' : 'matrix';
                    break;
                case 'Dimensions':
                    const dims = val.replace(/[\[\]]/g, '').split(',').map(s => s.trim());
                    newData.xDimensions = dims;
                    newData.yDimensions = dims;
                    break;
                case 'X-Dimensions':
                    newData.xDimensions = val.replace(/[\[\]]/g, '').split(',').map(s => s.trim());
                    break;
                case 'Y-Dimensions':
                    newData.yDimensions = val.replace(/[\[\]]/g, '').split(',').map(s => s.trim());
                    break;
                case 'Group':
                    newData.groupVariable = val;
                    break;
                case 'Smoother':
                    const sVal = val.toLowerCase();
                    if (sVal === 'true') {
                        newData.showSmoother = true;
                        newData.smootherMethod = 'Lowess';
                    } else if (sVal === 'false') {
                        newData.showSmoother = false;
                    } else if (sVal === 'lowess') {
                        newData.showSmoother = true;
                        newData.smootherMethod = 'Lowess';
                    } else if (sVal === 'movingaverage') {
                        newData.showSmoother = true;
                        newData.smootherMethod = 'MovingAverage';
                    }
                    break;
            }
        }
    });

    return { data: newData, styles: newStyles };
};

export const generateMatrixPlotDSL = (data: MatrixPlotData, styles: MatrixPlotStyles): string => {
    let dsl = `Title: ${data.title}\n`;
    dsl += `Mode: ${data.mode === 'yvsx' ? 'YvsX' : 'Matrix'}\n`;

    if (data.mode === 'matrix') {
        dsl += `Dimensions: [${data.xDimensions.join(', ')}]\n`;
    } else {
        dsl += `Y-Dimensions: [${data.yDimensions.join(', ')}]\n`;
        dsl += `X-Dimensions: [${data.xDimensions.join(', ')}]\n`;
    }

    if (data.groupVariable) dsl += `Group: ${data.groupVariable}\n`;
    if (data.showSmoother) {
        dsl += `Smoother: ${data.smootherMethod || 'Lowess'}\n`;
    } else {
        dsl += `Smoother: false\n`;
    }

    dsl += `Data:\n`;
    data.data.forEach(row => {
        const fields = Object.entries(row)
            .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
            .join(', ');
        dsl += `- { ${fields} }\n`;
    });

    dsl += `\nStyles:\n`;
    dsl += `- DisplayMode: ${styles.displayMode}\n`;
    dsl += `- Diagonal: ${styles.diagonal}\n`;
    dsl += `- PointSize: ${styles.pointSize}\n`;
    dsl += `- PointOpacity: ${styles.pointOpacity}\n`;
    dsl += `- ColorPalette: ${styles.colorPalette}\n`;

    return dsl;
};

// SAMPLES removed as requested

const MatrixPlotEditor: React.FC<MatrixPlotEditorProps> = ({ data, styles, onDataChange, onStylesChange }) => {
    const [localDsl, setLocalDsl] = useState(INITIAL_MATRIX_PLOT_DSL);
    const [confirmReset, setConfirmReset] = useState(false);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const engineName = useAIEngine();


    // Sync DSL from data/styles when in manual tab
    useEffect(() => {
        if (activeTab !== 'dsl') {
            setLocalDsl(generateMatrixPlotDSL(data, styles));
        }
    }, [data, styles, activeTab]);

    const handleDSLChange = (val: string) => {
        setLocalDsl(val);
        try {
            const { data: d, styles: s } = parseMatrixPlotDSL(val);
            onDataChange(d);
            onStylesChange(s);
            setError(null);
        } catch (e) {
            setError('DSL 解析错误');
        }
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateLogicDSL(aiPrompt, QCToolType.MATRIX_PLOT);
            handleDSLChange(result);
            setActiveTab('dsl');
        } catch (err) {
            setError('AI 生成失败');
        } finally {
            setIsGenerating(false);
        }
    };

    const doReset = () => {
            try {
                const { data: d, styles: s } = parseMatrixPlotDSL(INITIAL_MATRIX_PLOT_DSL);
                onDataChange(d);
                onStylesChange(s);
                setLocalDsl(INITIAL_MATRIX_PLOT_DSL);
            } catch (e) {
                console.error(e);
            }
        setConfirmReset(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-line-r)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
                            <Cpu size={22} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">矩阵散点图分析</h2>
                            <p className="text-[11px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Matrix Plot Engine | LUXI LAB</p>
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

                <nav className="flex bg-[var(--nav-bg)] p-1.5 rounded-md border border-[var(--border-line-r)] gap-1">
                    {[
                        { id: 'manual', label: '配置参数', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--sidebar-text)]'
                                }`}
                        >
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
                {activeTab === 'manual' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Basic Config */}
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] space-y-6 text-[var(--sidebar-text)]">
                            <div className="flex items-center gap-4 border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">核心配置</span>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center gap-4">
                                    <div className="flex-1">
                                        <span className="text-[11px] font-bold text-[var(--sidebar-muted)] uppercase block mb-1.5">图表标题</span>
                                        <input
                                            value={data.title}
                                            onChange={e => onDataChange({ ...data, title: e.target.value })}
                                            className="iqs-input"
                                        />
                                    </div>
                                    <div className="self-end pb-[2px]">
                                        <button
                                            onClick={() => {
                                                const modes: any[] = ['Full', 'Lower', 'Upper'];
                                                const idx = modes.indexOf(styles.displayMode);
                                                onStylesChange({ ...styles, displayMode: modes[(idx + 1) % modes.length] });
                                            }}
                                            className="h-[38px] px-4 bg-[var(--sidebar-muted)]/20 hover:bg-[var(--sidebar-muted)]/30 text-[var(--sidebar-text)] rounded-md border border-[var(--border-line-r)] transition-all flex items-center gap-2 whitespace-nowrap shadow-lg active:scale-95"
                                        >
                                            <span className="text-[11px] font-black uppercase tracking-widest">范围:</span>
                                            <span className="text-[11px] font-bold text-primary">
                                                {styles.displayMode === 'Full' ? '全矩阵' : styles.displayMode === 'Lower' ? '下三角' : '上三角'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-muted)] uppercase">矩阵模式</span>
                                    <select
                                        value={data.mode}
                                        onChange={e => onDataChange({ ...data, mode: e.target.value as any })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md px-4 py-2 text-sm text-[var(--sidebar-text)] focus:outline-none"
                                    >
                                        <option value="matrix">变量矩阵</option>
                                        <option value="yvsx">每个 Y 对每个 X</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-[var(--sidebar-muted)] uppercase">趋势线</span>
                                    <div className="flex items-center justify-between h-10 px-4 bg-[var(--input-bg)]/50 border border-[var(--border-line-r)]/50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Switch checked={!!(data.showSmoother)} onChange={v => onDataChange({ ...data, showSmoother: v })} ariaLabel="拟合" />
                                            <span className="text-[11px] text-[var(--sidebar-text)]">拟合</span>
                                        </div>
                                        {data.showSmoother && (
                                            <button
                                                onClick={() => {
                                                    const methods = ['Lowess', 'MovingAverage'];
                                                    const idx = methods.indexOf(data.smootherMethod || 'Lowess');
                                                    onDataChange({ ...data, smootherMethod: methods[(idx + 1) % methods.length] as any });
                                                }}
                                                className="text-[11px] bg-[var(--input-bg)] hover:bg-[var(--input-bg)]/80 text-primary/80 px-1.5 py-0.5 rounded border border-[var(--input-border)]/50 transition-colors uppercase font-bold"
                                            >
                                                {data.smootherMethod === 'MovingAverage' ? '滑动平均' : 'Lowess'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {(() => {
                            const allKeys = new Set<string>();
                            data.data.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
                            const keys = Array.from(allKeys);

                            const toggleDim = (dim: string, type: 'x' | 'y') => {
                                if (data.mode === 'matrix') {
                                    const newDims = data.xDimensions.includes(dim)
                                        ? data.xDimensions.filter(d => d !== dim)
                                        : [...data.xDimensions, dim];
                                    onDataChange({ ...data, xDimensions: newDims, yDimensions: newDims });
                                } else {
                                    if (type === 'x') {
                                        const newDims = data.xDimensions.includes(dim)
                                            ? data.xDimensions.filter(d => d !== dim)
                                            : [...data.xDimensions, dim];
                                        onDataChange({ ...data, xDimensions: newDims });
                                    } else {
                                        const newDims = data.yDimensions.includes(dim)
                                            ? data.yDimensions.filter(d => d !== dim)
                                            : [...data.yDimensions, dim];
                                        onDataChange({ ...data, yDimensions: newDims });
                                    }
                                }
                            };

                            return (
                                <div className="space-y-4">
                                    {data.mode === 'matrix' ? (
                                        <div className="space-y-2">
                                            <span className="text-[11px] font-bold text-[var(--sidebar-muted)] uppercase">分析变量</span>
                                            <div className="flex flex-wrap gap-2 p-3 bg-[var(--input-bg)]/10 border border-[var(--border-line-r)]/40 rounded-md min-h-[50px]">
                                                {keys.map(k => (
                                                    <button
                                                        key={k}
                                                        onClick={() => toggleDim(k, 'x')}
                                                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all border ${data.xDimensions.includes(k)
                                                            ? 'bg-primary border-primary text-white shadow-lg shadow-blue-900/20'
                                                            : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'
                                                            }`}
                                                    >
                                                        {k}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-2">
                                                <span className="text-[11px] font-bold text-[var(--text-ok)] uppercase">Y 变量</span>
                                                <div className="flex flex-wrap gap-2 p-3 bg-[var(--input-bg)]/10 border border-[var(--border-line-r)]/40 rounded-md min-h-[50px]">
                                                    {keys.map(k => (
                                                        <button
                                                            key={k}
                                                            onClick={() => toggleDim(k, 'y')}
                                                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all border ${data.yDimensions.includes(k)
                                                                ? 'bg-primary border-primary text-white shadow-lg shadow-emerald-900/20'
                                                                : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'
                                                                }`}
                                                        >
                                                            {k}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[11px] font-bold text-[var(--text-ok)] uppercase">X 变量</span>
                                                <div className="flex flex-wrap gap-2 p-3 bg-[var(--input-bg)]/10 border border-[var(--border-line-r)]/40 rounded-md min-h-[50px]">
                                                    {keys.map(k => (
                                                        <button
                                                            key={k}
                                                            onClick={() => toggleDim(k, 'x')}
                                                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all border ${data.xDimensions.includes(k)
                                                                ? 'bg-primary border-primary text-white shadow-lg shadow-blue-900/20'
                                                                : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'
                                                                }`}
                                                        >
                                                            {k}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {data.mode === 'matrix' && (
                                        <div className="space-y-2">
                                            <span className="text-[11px] font-bold text-[var(--sidebar-text)] uppercase">对角线展示</span>
                                            <div className="flex flex-wrap gap-2 p-3 bg-[var(--input-bg)]/10 border border-[var(--border-line-r)]/40 rounded-md min-h-[50px]">
                                                {/* Analysis Modes */}
                                                {[
                                                    { id: 'Histogram', label: '直方图' },
                                                    { id: 'Boxplot', label: '箱线图' },
                                                    { id: 'Label', label: '变量名' },
                                                    { id: 'None', label: '无' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => onStylesChange({ ...styles, diagonal: opt.id as any })}
                                                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all border ${styles.diagonal === opt.id
                                                            ? 'bg-primary border-primary text-white shadow-lg shadow-amber-900/20'
                                                            : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'dsl' && (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <textarea
                            value={localDsl}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="iqs-input iqs-code flex-1 min-h-[400px] resize-y"
                            spellCheck={false}
                        />
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-[var(--card-bg)] rounded-md border border-[var(--border-line-r)] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[var(--border-line-r)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能图矩阵推演</span>
                                <div className="px-3 py-1 iqs-badge rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--state-up)] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-[var(--text-ok)] uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="iqs-input flex-1 min-h-[200px] resize-none"
                                placeholder="输入分析需求，例如：'分析温度、压力与产量的关系，区分高/低速两组数据'..."
                            />

                            <button
                                onClick={handleGenerateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`shrink-0 ${isGenerating ? 'iqs-btn-pending' : 'iqs-btn-primary'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-primary" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">AI 推理中...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            <div className="iqs-note space-y-4 shadow-sm">
                                <p className="text-[11px] font-black text-[var(--text-info)] uppercase tracking-widest">推理提示</p>
                                <p className="text-[11px] text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以描述多个变量及其数据样本，AI 将自动识别分析维度并推荐合适的布局模式（全矩阵或 Y 对 X）。例如：“对比分析 10 组产品的厚度与强度关系”。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Docs Modal */}
            {showDocs && (
                <CardDocModal kind="matrix_plot" open={showDocs} onClose={() => setShowDocs(false)} />
            )}
        </div>
        
    );
};

export default MatrixPlotEditor;
