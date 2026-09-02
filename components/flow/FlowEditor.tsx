/**
 * IQS-Flow 编辑面板（DSL 源驱动）
 * - 对齐其它组件的 LUXI LAB 侧栏骨架：Header + 三 Tab + 深色令牌
 * - DSL 输入 → parseFlowDSL → onDataChange / onStylesChange
 * - 支持 AI 生成（generateLogicDSL，kind=flow）
 * - 支持从 data 序列化回 DSL（flowToDsl）
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FlowData, FlowChartStyles, QCToolType, DEFAULT_FLOW_STYLES } from '../../types';
import { INITIAL_FLOW_DSL } from '../../constants';
import { parseFlowDSL } from './FlowParser';
import { generateLogicDSL, getAIStatus } from '../../services/aiService';
import { COLOR_SLOT_MAP, FLOW_PALETTES, applyPalette, paletteOf } from './FlowThemes';
import {
  Sparkles, Code, HelpCircle, X, Loader2, Database, ChevronRight,
  Cpu, RotateCcw, Plus, Trash2
} from 'lucide-react';

interface FlowEditorProps {
  data: FlowData;
  styles: FlowChartStyles;
  onDataChange: (data: FlowData) => void;
  onStylesChange: (styles: FlowChartStyles) => void;
}

const TYPEMAP: Record<string, string> = {
  start: 'S', end: 'E', task: 'T', exclusiveGateway: '?',
  parallelGateway: '+', subprocess: 'SUB', annotation: 'N', dataObject: 'DATA'
};

const TYPE_OPTS: { code: keyof typeof TYPEMAP | 'task'; mark: string; label: string }[] = [
  { code: 'start', mark: 'S', label: '开始' },
  { code: 'end', mark: 'E', label: '结束' },
  { code: 'task', mark: 'T', label: '任务' },
  { code: 'exclusiveGateway', mark: '?', label: '判断' },
  { code: 'parallelGateway', mark: '+', label: '并行' },
  { code: 'subprocess', mark: 'SUB', label: '子流程' },
  { code: 'annotation', mark: 'N', label: '标注' },
  { code: 'dataObject', mark: 'DATA', label: '数据' },
];

function emitWLine(n: FlowData['nodes'][0], indent = ''): string {
  const typeTag = n.type !== 'task' ? ` Type[${TYPEMAP[n.type] || 'T'}]` : '';
  const loc = n.cell && Object.keys(n.cell).length
    ? ` Location(${Object.entries(n.cell).map(([k, v]) => `${k}[${v}]`).join(',')})`
    : '';
  const attrs = Object.entries(n.attrs || {}).filter(([, v]) => v != null && String(v).length).map(([k, v]) => `${k.toUpperCase()}(${v})`).join(' ');
  const attachTag = n.attach ? ` Attach(#${n.attach})` : '';
  const vhTag = n.vh ? ` ${n.vh}` : '';
  return `${indent}W: ${n.id}: ${n.labelRef || n.label}${typeTag}${loc}${attrs ? ' ' + attrs : ''}${attachTag}${vhTag}`;
}

function replaceWLine(src: string, n: FlowData['nodes'][0]): string {
  const re = new RegExp(`^( *)W:\\s*${n.id}:.*$`, 'm');
  if (!re.test(src)) return src;
  return src.replace(re, (_, pad) => emitWLine(n, pad));
}

function replaceLaneLine(src: string, oldL: FlowData['lanes'][0], next: FlowData['lanes'][0]): string {
  const a = `Lane from ${oldL.dict}[${oldL.indices.join(',')}] Layout ${oldL.layout}`;
  const b = `Lane from ${next.dict}[${next.indices.join(',')}] Layout ${next.layout}`;
  return src.includes(a) ? src.replace(a, b) : src;
}

const COLOR_SLOTS: { key: keyof FlowChartStyles; label: string }[] = [
  { key: 'startColor', label: '开始' },
  { key: 'endColor', label: '结束' },
  { key: 'taskColor', label: '任务' },
  { key: 'gatewayColor', label: '判断' },
  { key: 'parallelColor', label: '并行' },
  { key: 'subprocessColor', label: '子流程' },
  { key: 'annotationColor', label: '标注' },
  { key: 'dataColor', label: '数据' },
  { key: 'laneColor', label: '泳道' },
  { key: 'axisColor', label: '轴' },
  { key: 'lineColor', label: '连线' },
  { key: 'textColor', label: '文字' },
  { key: 'panelColor', label: '面板' },
];

function upsertKv(src: string, re: RegExp, line: string): string {
  if (re.test(src)) return src.replace(re, line);
  const lines = src.split('\n');
  let at = -1;
  lines.forEach((l, i) => { if (/^(Color\[|Grid\s*:|Layout\s*:)/i.test(l.trim())) at = i; });
  if (at >= 0) { lines.splice(at + 1, 0, line); return lines.join('\n'); }
  return `${line}\n${src}`;
}

function upsertColorSlot(src: string, slot: string, hex: string): string {
  return upsertKv(src, new RegExp(`^Color\\[${slot}\\]:\\s*.*$`, 'mi'), `Color[${slot}]: ${hex}`);
}

function upsertGridLine(src: string, kind: 'dashed' | 'solid'): string {
  return upsertKv(src, /^Grid\s*:.*$/mi, `Grid: ${kind}`);
}

function upsertPaletteColors(src: string, colors: Partial<FlowChartStyles>): string {
  let out = src;
  for (const { styleKey, slot } of COLOR_SLOT_MAP) {
    const v = colors[styleKey];
    if (typeof v === 'string' && v) out = upsertColorSlot(out, slot, v);
  }
  return out;
}

export function flowToDsl(data: FlowData, styles?: FlowChartStyles): string {
  const lines: string[] = [];
  lines.push(`Title: ${data.title}`);
  lines.push(`Layout: ${data.layout}`);
  lines.push('');
  const known = ['D', 'P', 'R'];
  const keys = Object.keys(data.dicts);
  const ordered = [...known.filter((k) => keys.includes(k)), ...keys.filter((k) => !known.includes(k))];
  lines.push('// ===== 数据层：字典 =====');
  for (const k of ordered) {
    lines.push(`Dict: ${k}[${data.dicts[k].join(',')}]`);
  }
  lines.push('');
  lines.push('// ===== 结构层：泳道 =====');
  for (const l of data.lanes) {
    const keysIdx: number[] = l.indices;
    lines.push(`Lane from ${l.dict}[${keysIdx.join(',')}] Layout ${l.layout}`);
  }
  lines.push('');
  if (data.axes.x.title) lines.push(`AxisX: ${data.axes.x.title} Align ${data.axes.x.align}`);
  if (data.axes.y.title) lines.push(`AxisY: ${data.axes.y.title} Align ${data.axes.y.align}`);
  if (data.axes.page.title) lines.push(`Axis: ${data.axes.page.title} ${data.axes.page.place} Align ${data.axes.page.align}`);
  lines.push('');
  if (data.attrPanel?.active?.length) lines.push(`Attr active [${data.attrPanel.active.map((a) => a.toUpperCase()).join(',')}]`);
  lines.push('');
  lines.push('// ===== 节点 =====');
  const gatewayNodes = new Set(data.nodes.filter((n) => n.type === 'exclusiveGateway' || n.type === 'parallelGateway').map((n) => n.id));
  const subNodes = new Set(data.nodes.filter((n) => n.type === 'subprocess').map((n) => n.id));
  const printed = new Set<string>();
  const childrenOf = new Map<string, FlowData['nodes']>();
  for (const n of data.nodes) {
    if (n.parent) {
      if (!childrenOf.has(n.parent)) childrenOf.set(n.parent, []);
      childrenOf.get(n.parent)!.push(n);
    }
  }
  function emitNode(n: FlowData['nodes'][0], indent: string) {
    if (printed.has(n.id)) return;
    printed.add(n.id);
    const pad = ' '.repeat(indent.length);
    const typeTag = n.type !== 'task' ? ` Type[${TYPEMAP[n.type] || 'T'}]` : '';
    const loc = n.cell ? ` Location(${Object.entries(n.cell).map(([k, v]) => `${k}[${v}]`).join(',')})` : '';
    const attrs = Object.entries(n.attrs).map(([k, v]) => `${k.toUpperCase()}(${v})`).join(' ');
    const attachTag = n.attach ? ` Attach(#${n.attach})` : '';
    const vhTag = n.vh ? ` ${n.vh}` : '';
    lines.push(`${pad}W: ${n.id}: ${n.labelRef || n.label}${typeTag}${loc}${attrs ? ' ' + attrs : ''}${attachTag}${vhTag}`);
    if (gatewayNodes.has(n.id)) {
      const branches = data.edges.filter((e) => e.from === n.id && !e.parent);
      for (const e of branches) {
        const tag = e.label || e.condition || '';
        lines.push(`${pad}   ${tag} → #${e.to}`);
      }
      lines.push(`${pad}   End`);
    }
    if (subNodes.has(n.id)) {
      const kids = childrenOf.get(n.id) || [];
      for (const k of kids) emitNode(k, indent + '   ');
      lines.push(`${pad}   End`);
    }
  }
  for (const n of data.nodes) {
    if (!n.parent) emitNode(n, '');
  }
  lines.push('');
  lines.push('// ===== 连线 =====');
  const innerNodes = new Set(data.nodes.filter((n) => n.parent).map((n) => n.id));
  const siblingsOf = (id: string) => {
    const parent = data.nodes.find((x) => x.id === id)?.parent;
    return data.nodes.filter((n) => n.parent === parent);
  };
  const isAutoSeq = (e: { from: string; to: string; label: string | null; condition: string | null; default: boolean; parent?: string }) => {
    if (e.parent) return false;
    if (e.label || e.condition) return false;
    if (e.default) return false;
    if (gatewayNodes.has(e.from)) return false;
    const sib = siblingsOf(e.from);
    const i = sib.findIndex((n) => n.id === e.from);
    return i >= 0 && sib[i + 1]?.id === e.to;
  };
  for (const e of data.edges) {
    if (e.parent) continue;
    if (gatewayNodes.has(e.from)) continue;
    if (innerNodes.has(e.from) && !subNodes.has(e.from) && data.nodes.find((x) => x.id === e.from)?.parent) continue;
    const dup = data.edges.some((x) => x !== e && x.from === e.from && x.to === e.to);
    if (dup) continue;
    if (isAutoSeq(e)) continue; // parser 会按声明序再生，避免往返膨胀
    lines.push(`${e.from} → #${e.to}`);
  }
  if (styles) {
    const styleLines: string[] = [];
    if (styles.gridLine) styleLines.push(`Grid: ${styles.gridLine}`);
    for (const { styleKey, slot } of COLOR_SLOT_MAP) {
      const v = styles[styleKey];
      const def = DEFAULT_FLOW_STYLES[styleKey];
      if (typeof v === 'string' && v && String(v).toLowerCase() !== String(def || '').toLowerCase()) {
        styleLines.push(`Color[${slot}]: ${v}`);
      }
    }
    if (styleLines.length) {
      lines.push('');
      lines.push('// ===== 样式 =====');
      lines.push(...styleLines);
    }
  }
  return lines.join('\n');
}

const FlowEditor: React.FC<FlowEditorProps> = ({ data, styles, onDataChange, onStylesChange }) => {
  const [dsl, setDsl] = useState(INITIAL_FLOW_DSL);
  const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
  const [showDocs, setShowDocs] = useState(false);
  const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [engineName, setEngineName] = useState('DeepSeek');

  useEffect(() => {
    getAIStatus().then(setEngineName).catch(() => {});
  }, []);

  const applyDsl = (val: string) => {
    const { data: d, styles: s, errors, warnings: warns } = parseFlowDSL(val);
    onDataChange(d);
    onStylesChange(s);
    setError(errors.length ? errors.join('；') : null);
    setWarnings(warns);
  };

  const handleDslChange = (val: string) => {
    setDsl(val);
    applyDsl(val);
  };

  const upsertHeader = (src: string, key: 'Title' | 'Layout', value: string) => {
    const re = new RegExp(`^${key}:.*$`, 'mi');
    if (re.test(src)) return src.replace(re, `${key}: ${value}`);
    return `${key}: ${value}\n${src}`;
  };

  const replaceDictLine = (src: string, name: string, values: string[]) => {
    const re = new RegExp(`^Dict:\\s*${name}\\[[^\\]]*\\]\\s*$`, 'm');
    const line = `Dict: ${name}[${values.join(',')}]`;
    if (re.test(src)) return src.replace(re, line);
    const lines = src.split('\n');
    let last = -1;
    lines.forEach((l, i) => { if (/^Dict:/i.test(l.trim())) last = i; });
    if (last >= 0) { lines.splice(last + 1, 0, line); return lines.join('\n'); }
    return `${line}\n${src}`;
  };

  const commitDsl = (next: string) => { setDsl(next); applyDsl(next); };

  const handleReset = () => {
    setDsl(INITIAL_FLOW_DSL);
    applyDsl(INITIAL_FLOW_DSL);
    setActiveTab('manual');
  };

  const handleTabChange = (tab: 'manual' | 'dsl' | 'ai') => {
    if (tab === 'dsl' && activeTab === 'manual') {
      // 从手动页进入 DSL 时按导出契约回写，保证 Location/vh/Attach 可见
      const out = flowToDsl(data, styles);
      setDsl(out);
    }
    setActiveTab(tab);
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) { setError('请输入需求描述'); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const gen = await generateLogicDSL(aiPrompt, QCToolType.FLOW, 'flow');
      const text = (typeof gen === 'string' ? gen : '').replace(/```\w*/g, '').replace(/```/g, '').trim();
      if (!text) throw new Error('空响应');
      setDsl(text);
      applyDsl(text);
      setActiveTab('dsl');
    } catch (e: any) {
      setError('AI 生成失败: ' + (e?.message || String(e)));
    } finally {
      setIsGenerating(false);
    }
  };

  const dictKeys = Object.keys(data.dicts || {});
  const topNodes = (data.nodes || []).filter((n) => !n.parent);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative">
      <div className="p-6 border-b border-[var(--sidebar-border)] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center border border-teal-500/30">
              <Cpu size={22} className="text-teal-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">企业流程图分析</h2>
              <p className="text-[8px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Flow Engine | LUXI LAB</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="p-3 bg-[var(--input-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-teal-400 transition-all border border-[var(--input-border)]"
              title="恢复示例"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={() => setShowDocs(true)}
              className="p-3 bg-[var(--input-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-white transition-all border border-[var(--input-border)]"
              title="语法帮助"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </div>

        <nav className="flex bg-[var(--nav-bg)] p-1.5 rounded-lg border border-[var(--sidebar-border)] gap-1">
          {[
            { id: 'manual' as const, label: '手动录入', icon: <Database size={14} /> },
            { id: 'dsl' as const, label: 'DSL 编辑器', icon: <Code size={14} /> },
            { id: 'ai' as const, label: 'AI 推理', icon: <Sparkles size={14} /> }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === t.id
                  ? 'bg-teal-600 text-white shadow-xl'
                  : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--input-bg)]'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 min-h-0">
        {activeTab === 'manual' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <div className="flex items-center gap-3 pl-2">
                <ChevronRight size={14} className="text-teal-500" />
                <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">分析课题</span>
              </div>
              <input
                value={data.title || ''}
                onChange={(e) => commitDsl(upsertHeader(dsl, 'Title', e.target.value))}
                className="w-full h-14 px-6 logic-terminal-input text-sm font-bold bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--sidebar-text)] rounded-lg focus:border-teal-500 outline-none shadow-sm"
                placeholder="流程标题…"
              />
              <div className="flex gap-2">
                {(['H', 'V'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => commitDsl(upsertHeader(dsl, 'Layout', dir))}
                    className={`flex-1 h-10 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                      (data.layout || 'H') === dir
                        ? 'bg-teal-600 text-white border-teal-500'
                        : 'bg-[var(--input-bg)] text-[var(--sidebar-muted)] border-[var(--input-border)]'
                    }`}
                  >
                    Layout {dir} {dir === 'H' ? '横向' : '纵向'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between pl-2">
                <div className="flex items-center gap-3">
                  <ChevronRight size={14} className="text-teal-500" />
                  <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">数据层 Dict</span>
                </div>
                <button
                  onClick={() => handleTabChange('dsl')}
                  className="text-[9px] font-black uppercase tracking-widest text-teal-400 hover:text-teal-300"
                >
                  在 DSL 中编辑 →
                </button>
              </div>
              {dictKeys.length === 0 ? (
                <div className="p-8 text-center text-[var(--sidebar-muted)] text-xs border border-dashed border-[var(--sidebar-border)] rounded-lg">
                  尚无字典。请到 DSL 编辑器添加 Dict: D[…] / P[…] / R[…]
                </div>
              ) : (
                dictKeys.map((k) => (
                  <div key={k} className="p-4 bg-[var(--card-bg)] rounded-lg border border-[var(--sidebar-border)] space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--sidebar-muted)]">
                      Dict: {k}{k === 'D' ? ' · 部门' : k === 'P' ? ' · 阶段' : k === 'R' ? ' · 岗位' : ''}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(data.dicts[k] || []).map((v, i) => (
                        <span key={`${k}-${i}`} className="group flex items-center gap-1 px-2 py-1 rounded bg-[var(--input-bg)] border border-[var(--input-border)] text-[11px] font-mono text-[var(--sidebar-text)]">
                          <span className="text-[var(--sidebar-muted)]">{i}</span>
                          <input
                            value={v}
                            onChange={(e) => {
                              const vals = [...(data.dicts[k] || [])];
                              vals[i] = e.target.value;
                              commitDsl(replaceDictLine(dsl, k, vals));
                            }}
                            className="bg-transparent outline-none w-24 text-[var(--sidebar-text)]"
                          />
                          <button
                            title="删除此项"
                            onClick={() => {
                              const vals = (data.dicts[k] || []).filter((_, j) => j !== i);
                              commitDsl(replaceDictLine(dsl, k, vals));
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[var(--sidebar-muted)] hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => commitDsl(replaceDictLine(dsl, k, [...(data.dicts[k] || []), '新项']))}
                        className="px-2 py-1 rounded border border-dashed border-[var(--sidebar-border)] text-[10px] font-black uppercase tracking-widest text-[var(--sidebar-muted)] hover:text-teal-400 hover:border-teal-500/50"
                      >
                        <Plus size={12} className="inline mr-1" />添加
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 pl-2">
                <ChevronRight size={14} className="text-teal-500" />
                <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">结构层 泳道 / 节点</span>
              </div>
              <div className="p-4 bg-[var(--card-bg)] rounded-lg border border-[var(--sidebar-border)] space-y-3 text-[11px]">
                {(data.lanes || []).length === 0 && (
                  <p className="text-[var(--sidebar-muted)]">无泳道（ROOT 占位）。在 DSL 写 Lane from …</p>
                )}
                {(data.lanes || []).map((l, i) => {
                  const vals = data.dicts[l.dict] || [];
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between font-mono text-[var(--sidebar-text)]">
                        <span>Lane {l.dict} · {l.layout === 'H' ? '行' : '列'}</span>
                        <button
                          onClick={() => commitDsl(replaceLaneLine(dsl, l, { ...l, layout: l.layout === 'H' ? 'V' : 'H' }))}
                          className="text-[9px] font-black uppercase tracking-widest text-teal-400"
                        >
                          切 {l.layout === 'H' ? 'V' : 'H'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {vals.map((v, idx) => {
                          const on = l.indices.includes(idx);
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                const next = on ? l.indices.filter((x) => x !== idx) : [...l.indices, idx].sort((a, b) => a - b);
                                if (!next.length) return;
                                commitDsl(replaceLaneLine(dsl, l, { ...l, indices: next }));
                              }}
                              className={`px-2 py-1 rounded border text-[10px] ${
                                on
                                  ? 'bg-teal-600 text-white border-teal-500'
                                  : 'bg-[var(--input-bg)] text-[var(--sidebar-muted)] border-[var(--input-border)]'
                              }`}
                            >
                              {idx} {v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                {topNodes.length === 0 && (
                  <div className="p-8 text-center text-[var(--sidebar-muted)] text-xs border border-dashed border-[var(--sidebar-border)] rounded-lg">
                    暂无节点。请到 DSL 用 W: 行声明活动。
                  </div>
                )}
                {topNodes.map((n, index) => {
                  const hLane = (data.lanes || []).find((l) => l.layout === 'H');
                  const vLane = (data.lanes || []).find((l) => l.layout === 'V');
                  const axisLane = hLane || vLane;
                  return (
                    <div key={n.id} className="space-y-2 p-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg">
                      <div className="flex gap-2 items-center">
                        <span className="text-[9px] font-black text-[var(--sidebar-muted)] w-6 font-mono opacity-50">{(index + 1).toString().padStart(2, '0')}</span>
                        <input
                          value={n.label}
                          onChange={(e) => commitDsl(replaceWLine(dsl, { ...n, label: e.target.value, labelRef: null }))}
                          className="flex-1 bg-transparent outline-none text-xs font-mono font-bold text-[var(--sidebar-text)]"
                        />
                        <span className="text-[9px] font-mono text-[var(--sidebar-muted)]">{n.id}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={n.type}
                          onChange={(e) => commitDsl(replaceWLine(dsl, { ...n, type: e.target.value as FlowData['nodes'][0]['type'] }))}
                          className="h-8 px-2 rounded bg-[var(--card-bg)] border border-[var(--input-border)] text-[10px] text-[var(--sidebar-text)]"
                        >
                          {TYPE_OPTS.map((t) => (
                            <option key={t.code} value={t.code}>{t.label}</option>
                          ))}
                        </select>
                        {(['V', 'H', 'D'] as const).map((dir) => (
                          <button
                            key={dir}
                            onClick={() => commitDsl(replaceWLine(dsl, { ...n, vh: dir }))}
                            className={`h-8 px-2 rounded text-[10px] font-black border ${
                              n.vh === dir ? 'bg-teal-600 text-white border-teal-500' : 'border-[var(--input-border)] text-[var(--sidebar-muted)]'
                            }`}
                          >
                            {dir}
                          </button>
                        ))}
                      </div>
                      {(hLane || vLane) && (
                        <div className="flex flex-wrap gap-2">
                          {hLane && (
                            <select
                              value={n.cell?.[hLane.dict] ?? ''}
                              onChange={(e) => {
                                const cell = { ...(n.cell || {}) };
                                if (e.target.value === '') delete cell[hLane.dict];
                                else cell[hLane.dict] = Number(e.target.value);
                                commitDsl(replaceWLine(dsl, { ...n, cell: Object.keys(cell).length ? cell : null }));
                              }}
                              className="h-8 px-2 rounded bg-[var(--card-bg)] border border-[var(--input-border)] text-[10px] text-[var(--sidebar-text)]"
                            >
                              <option value="">行 · 自动</option>
                              {(data.dicts[hLane.dict] || []).map((v, idx) => (
                                <option key={idx} value={idx}>{hLane.dict}[{idx}] {v}</option>
                              ))}
                            </select>
                          )}
                          {vLane && (
                            <select
                              value={n.cell?.[vLane.dict] ?? ''}
                              onChange={(e) => {
                                const cell = { ...(n.cell || {}) };
                                if (e.target.value === '') delete cell[vLane.dict];
                                else cell[vLane.dict] = Number(e.target.value);
                                commitDsl(replaceWLine(dsl, { ...n, cell: Object.keys(cell).length ? cell : null }));
                              }}
                              className="h-8 px-2 rounded bg-[var(--card-bg)] border border-[var(--input-border)] text-[10px] text-[var(--sidebar-text)]"
                            >
                              <option value="">列 · 自动</option>
                              {(data.dicts[vLane.dict] || []).map((v, idx) => (
                                <option key={idx} value={idx}>{vLane.dict}[{idx}] {v}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          placeholder="SOP"
                          value={n.attrs?.sop || ''}
                          onChange={(e) => commitDsl(replaceWLine(dsl, { ...n, attrs: { ...n.attrs, sop: e.target.value } }))}
                          className="flex-1 h-8 px-2 rounded bg-[var(--card-bg)] border border-[var(--input-border)] text-[10px] text-[var(--sidebar-text)] outline-none"
                        />
                        <input
                          placeholder="Role"
                          value={n.attrs?.role || ''}
                          onChange={(e) => commitDsl(replaceWLine(dsl, { ...n, attrs: { ...n.attrs, role: e.target.value } }))}
                          className="flex-1 h-8 px-2 rounded bg-[var(--card-bg)] border border-[var(--input-border)] text-[10px] text-[var(--sidebar-text)] outline-none"
                        />
                      </div>
                      {(n.type === 'annotation' || n.type === 'dataObject') && (
                        <input
                          placeholder="Attach(#id)"
                          value={n.attach || ''}
                          onChange={(e) => commitDsl(replaceWLine(dsl, { ...n, attach: e.target.value || undefined }))}
                          className="w-full h-8 px-2 rounded bg-[var(--card-bg)] border border-[var(--input-border)] text-[10px] text-[var(--sidebar-text)] outline-none"
                        />
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    const used = new Set((data.nodes || []).map((n) => n.id));
                    let i = used.size + 1;
                    while (used.has(`w${i}`)) i++;
                    commitDsl(`${dsl.replace(/\s+$/, '')}\nW: w${i}: 新活动`);
                  }}
                  className="w-full h-12 border border-dashed border-[var(--sidebar-border)] rounded-lg flex items-center justify-center gap-2 text-[var(--sidebar-muted)] hover:text-teal-400 hover:border-teal-500/50 text-[10px] font-black uppercase tracking-widest"
                >
                  <Plus size={16} /> 添加节点（W 行）
                </button>
                <button
                  onClick={() => {
                    let n = 1;
                    while (data.dicts[`extra${n}`]) n++;
                    commitDsl(replaceDictLine(dsl, `extra${n}`, ['项1']));
                  }}
                  className="w-full h-10 text-[10px] font-black uppercase tracking-widest text-[var(--sidebar-muted)] hover:text-teal-400"
                >
                  + 添加自定义字典
                </button>
              </div>
            </div>

            <div className="p-8 bg-[var(--card-bg)] rounded-lg border border-[var(--sidebar-border)] space-y-6 shadow-2xl">
              <div className="flex items-center gap-4 border-b border-[var(--sidebar-border)] pb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">颜色方案与样式</span>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--sidebar-muted)]">配色方案</span>
                <div className="flex flex-wrap gap-2">
                  {FLOW_PALETTES.map((p) => {
                    const on = paletteOf(styles) === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const next = applyPalette(styles, p);
                          onStylesChange(next);
                          commitDsl(upsertPaletteColors(dsl, p.colors));
                        }}
                        className={`h-8 px-3 rounded-lg text-[10px] font-black tracking-widest border flex items-center gap-2 ${
                          on
                            ? 'bg-teal-600 text-white border-teal-500'
                            : 'bg-[var(--input-bg)] text-[var(--sidebar-muted)] border-[var(--input-border)] hover:text-[var(--sidebar-text)]'
                        }`}
                        title={`应用「${p.name}」到全部色槽`}
                      >
                        <span className="flex -space-x-0.5">
                          {[p.colors.taskColor, p.colors.lineColor, p.colors.panelColor].map((hex, i) => (
                            <span key={i} className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ background: hex }} />
                          ))}
                        </span>
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--sidebar-muted)]">泳道线型</span>
                <div className="flex gap-2">
                  {([
                    { id: 'dashed' as const, label: '虚线' },
                    { id: 'solid' as const, label: '实线' },
                  ]).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        onStylesChange({ ...styles, gridLine: g.id });
                        commitDsl(upsertGridLine(dsl, g.id));
                      }}
                      className={`flex-1 h-10 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        (styles.gridLine || 'dashed') === g.id
                          ? 'bg-teal-600 text-white border-teal-500'
                          : 'bg-[var(--input-bg)] text-[var(--sidebar-muted)] border-[var(--input-border)]'
                      }`}
                    >
                      {g.label} Grid
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {COLOR_SLOTS.map((c) => (
                  <div key={c.key} className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--sidebar-muted)]">{c.label}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-6 rounded bg-[var(--input-bg)] flex items-center justify-center border border-[var(--input-border)] shadow-inner">
                        <span className="text-[9px] font-mono text-[var(--sidebar-text)] uppercase">{String(styles[c.key] || '')}</span>
                      </div>
                      <input
                        type="color"
                        value={String(styles[c.key] || '#ffffff')}
                        onChange={(e) => {
                          const slot = COLOR_SLOT_MAP.find((s) => s.styleKey === c.key)?.slot;
                          onStylesChange({ ...styles, [c.key]: e.target.value });
                          if (slot) commitDsl(upsertColorSlot(dsl, slot, e.target.value));
                        }}
                        className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-none p-0 overflow-hidden"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--sidebar-muted)] leading-relaxed">
                连线交叉处自动用连线色相对面板色的反差色标出过桥。配色方案会写入 <code className="font-mono">Color[Slot]</code>；泳道线型写入 <code className="font-mono">Grid: dashed|solid</code>。
              </p>
            </div>
          </div>
        )}

        {activeTab === 'dsl' && (
          <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <textarea
              value={dsl}
              onChange={(e) => handleDslChange(e.target.value)}
              className="flex-1 w-full bg-[var(--input-bg)] text-[var(--sidebar-text)] p-8 font-mono text-[11px] leading-relaxed border border-[var(--input-border)] rounded-lg focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all resize-none custom-scrollbar shadow-inner min-h-[280px]"
              placeholder="输入 IQS-Flow DSL…"
              spellCheck={false}
            />
            {error && (
              <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                <span className="w-1.5 h-1.5 mt-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                <span className="text-[11px] font-medium text-red-400 leading-relaxed">{error}</span>
              </div>
            )}
            {warnings.length > 0 && !error && (
              <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-400 whitespace-pre-wrap">
                {warnings.join('\n')}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="p-8 bg-[var(--card-bg)] rounded-lg border border-[var(--sidebar-border)] space-y-8 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] pb-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能流程描述</span>
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                </div>
              </div>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full min-h-40 p-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-sm text-[var(--sidebar-text)] outline-none focus:border-teal-500"
                placeholder={'描述跨部门流程，例如：\n「采购审批，信息中心/综合计划科/办公室三个部门，申请/审批/执行/归档四阶段。金额超 5000 需部门经理审批，否则直接执行。」'}
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !aiPrompt.trim()}
                className={`w-full h-16 rounded-lg flex items-center justify-center gap-4 transition-all shadow-2xl ${
                  isGenerating ? 'bg-[var(--sidebar-border)]' : 'bg-teal-600 hover:bg-teal-500 active:scale-[0.98]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-teal-200" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在精准推演...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="text-white" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                  </>
                )}
              </button>
              <div className="p-8 bg-teal-900/10 border border-teal-800/20 rounded-lg space-y-3 shadow-sm">
                <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">推理提示 · IQS-Flow 红线</p>
                <ul className="text-xs text-[var(--sidebar-text)] leading-relaxed font-medium space-y-1.5 list-disc pl-4">
                  <li>必须先写 <code className="font-mono">Dict</code>，再写 <code className="font-mono">Lane from</code> 与 <code className="font-mono">W:</code></li>
                  <li>判断 / 并行必须有分支行，并以 <code className="font-mono">End</code> 闭合</li>
                  <li>禁止输出 Mermaid <code className="font-mono">flowchart TD</code> / <code className="font-mono">graph LR</code></li>
                  <li>标签优先字典引用；图上会展开为字典值</li>
                  <li>只输出纯文本 DSL，不要 Markdown 围栏或 JSON</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t px-4 py-2 flex gap-2 items-center text-[11px] shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
        <span className={error ? 'text-rose-400' : 'text-emerald-400'}>
          {error ? '✗ 解析失败' : '✓ 已解析'}
        </span>
        <span className="text-[var(--sidebar-muted)]">节点 {data.nodes.length} · 边 {data.edges.length} · 泳道 {data.lanes.length}</span>
        {warnings.length > 0 && (
          <span className="text-amber-400 ml-1 truncate" title={warnings.join('\n')}>⚠ {warnings.length}</span>
        )}
      </div>

      {showDocs && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md" onClick={() => setShowDocs(false)}>
          <div
            className="bg-[var(--sidebar-bg)] w-[900px] h-[800px] max-h-[90vh] rounded-lg border border-[var(--sidebar-border)] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-10 py-8 flex flex-col border-b border-[var(--sidebar-border)] shrink-0 gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-teal-500/20 rounded-lg">
                    <HelpCircle size={24} className="text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[var(--sidebar-text)] uppercase tracking-tighter">流程图知识库</h3>
                    <p className="text-[10px] text-[var(--sidebar-muted)] font-bold uppercase tracking-widest mt-1">IQS-Flow · BPMN 子集 · Dict-Index</p>
                  </div>
                </div>
                <button onClick={() => setShowDocs(false)} className="p-3 hover:bg-[var(--input-bg)] rounded-lg text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]">
                  <X size={24} />
                </button>
              </div>
              <nav className="flex bg-[var(--nav-bg)] p-1 rounded-lg border border-[var(--sidebar-border)] w-fit">
                {[
                  { id: 'dsl' as const, label: 'DSL 规范' },
                  { id: 'logic' as const, label: 'BPMN 子集 / 对齐原理' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDocTab(t.id)}
                    className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      docTab === t.id ? 'bg-teal-600 text-white shadow-lg' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10 text-[var(--sidebar-muted)]">
              {docTab === 'dsl' ? (
                <div className="space-y-8">
                  <table className="w-full text-xs font-mono border-collapse text-left bg-[var(--input-bg)] rounded-lg overflow-hidden">
                    <thead>
                      <tr className="text-[var(--sidebar-text)] bg-teal-500/10">
                        <th className="p-4 font-black uppercase w-40">语法</th>
                        <th className="p-4 font-black uppercase">说明</th>
                        <th className="p-4 font-black uppercase">示例</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--sidebar-border)]">
                      {[
                        ['Title:', '图表标题', 'Title: 采购审批流程'],
                        ['Layout:', '方向 H / V', 'Layout: H'],
                        ['Color[Slot]:', '节点 / 连线 / 面板色', 'Color[Line]: #64748b'],
                        ['Grid:', '泳道网格虚线或实线', 'Grid: dashed'],
                        ['Dict:', '数据层数组，D/P/R 保留字', 'Dict: D[信息中心,综合计划科]'],
                        ['Lane from', '批量泳道 H=行 V=列', 'Lane from D[0,1] Layout H'],
                        ['AxisX / AxisY', '坐标标题，文字保持水平', 'AxisY: 推进阶段 Align C'],
                        ['W:', '节点。Type[S E T ? + SUB N DATA]', 'W: w1: 提交申请 Type[S] Location(D[0],P[0])'],
                        ['Attach(#id)', '仅 N/DATA 依附目标', 'W: n1: 依据 Type[N] Attach(#w2)'],
                        ['V / H / D', '格内相对方位：下 / 右 / 对角', 'W: w3: 复核 Location(D[0],P[0]) H'],
                        ['分支 + End', '判断/并行必须闭合', '   是 → #w4'],
                        ['显式边', '跨格 / 回边', 'w5 → #w6'],
                      ].map(([a, b, c]) => (
                        <tr key={a}>
                          <td className="p-4 text-teal-400 font-bold whitespace-nowrap">{a}</td>
                          <td className="p-4">{b}</td>
                          <td className="p-4 text-[var(--sidebar-text)]">{c}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs leading-relaxed">
                    权威切片：<code className="font-mono text-teal-400">protocol/segments/flow.md</code>。禁止用 Mermaid <code className="font-mono">flowchart TD</code> 冒充本 DSL。
                  </p>
                </div>
              ) : (
                <div className="space-y-6 text-sm leading-relaxed">
                  <p>语义定界为 <strong className="text-[var(--sidebar-text)]">BPMN 2.0 子集</strong>：开始 / 结束 / 任务 / 子流程 / 排他与并行网关 / 标注 / 数据对象。</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong className="text-[var(--sidebar-text)]">3×3 绘制格</strong>：中心放节点并严格居中，四周为连线走廊。</li>
                    <li><strong className="text-[var(--sidebar-text)]">WSAD</strong>：同一侧不既入又出；箭头只画在 IN 端口，贴边中点。</li>
                    <li><strong className="text-[var(--sidebar-text)]">默认顺序流</strong>：普通节点按声明序自动连；判断 / 并行必须显式分支 + End。结束与 N/DATA 不作默认流出源。</li>
                    <li><strong className="text-[var(--sidebar-text)]">DOC 列</strong>：N/DATA 不占交叉格，落在右侧虚拟列并与 Attach 目标横向对齐。</li>
                    <li>排版是引擎的数学问题（几何对齐 / 对角扩展格 / 正交走线）。作者只写谁、做什么、走哪条路。</li>
                  </ul>
                </div>
              )}
            </div>
            <div className="px-10 py-6 border-t border-[var(--sidebar-border)] shrink-0">
              <button
                onClick={() => setShowDocs(false)}
                className="w-full h-12 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-black uppercase tracking-widest"
              >
                我理解了，开始建模
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FlowEditor;
