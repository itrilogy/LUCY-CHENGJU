/**
 * IQS-Flow 编辑面板（DSL 源驱动）
 * - 左侧/上方 DSL 输入 → parseFlowDSL → onDataChange(data)/onStylesChange
 * - 支持 AI 生成（复用 generateLogicDSL 通道，kind=flow）
 * - 支持从 data 序列化回 DSL（reverse）
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FlowData, FlowChartStyles, FlowNode, FlowEdge } from '../../types';
import { INITIAL_FLOW_DSL } from '../../constants';
import { parseFlowDSL } from './FlowParser';
import { getAIStatus } from '../../services/aiService';
import {
  Sparkles, Code, Save, Settings2, HelpCircle, X, Loader2, Database, ChevronRight, Circle
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

export function flowToDsl(data: FlowData): string {
  const lines: string[] = [];
  lines.push(`Title: ${data.title}`);
  lines.push(`Layout: ${data.layout}`);
  lines.push('');
  // dicts
  const known = ['D', 'P', 'R'];
  const keys = Object.keys(data.dicts);
  const ordered = [...known.filter((k) => keys.includes(k)), ...keys.filter((k) => !known.includes(k))];
  lines.push('// ===== 数据层：字典 =====');
  for (const k of ordered) {
    lines.push(`Dict: ${k}[${data.dicts[k].join(',')}]`);
  }
  lines.push('');
  // lanes
  lines.push('// ===== 结构层：泳道 =====');
  for (const l of data.lanes) {
    const keysIdx: number[] = l.indices;
    lines.push(`Lane from ${l.dict}[${keysIdx.join(',')}] Layout ${l.layout}`);
  }
  lines.push('');
  // axes
  if (data.axes.x.title) lines.push(`AxisX: ${data.axes.x.title} Align ${data.axes.x.align}`);
  if (data.axes.y.title) lines.push(`AxisY: ${data.axes.y.title} Align ${data.axes.y.align}`);
  if (data.axes.page.title) lines.push(`Axis: ${data.axes.page.title} ${data.axes.page.place} Align ${data.axes.page.align}`);
  lines.push('');
  // attr
  if (data.attrPanel?.active?.length) lines.push(`Attr active [${data.attrPanel.active.map((a) => a.toUpperCase()).join(',')}]`);
  lines.push('');
  // nodes + 网关分支块（分支出口紧随网关节点，End 闭合）+ 普通显式边置文末
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
  // 输出单个节点行；若为网关则在行后输出其分支块；若为子流程则在行后输出内部子块（深度≤1）
  function emitNode(n: FlowData['nodes'][0], indent: string) {
    if (printed.has(n.id)) return;
    printed.add(n.id);
    const pad = ' '.repeat(indent.length);
    const typeTag = n.type !== 'task' ? ` Type[${TYPEMAP[n.type] || 'T'}]` : '';
    const loc = n.cell ? ` Location(${Object.entries(n.cell).map(([k, v]) => `${k}[${v}]`).join(',')})` : '';
    const attrs = Object.entries(n.attrs).map(([k, v]) => `${k.toUpperCase()}(${v})`).join(' ');
    const attachTag = n.attach ? ` Attach(#${n.attach})` : '';
    // P1：编辑器导出契约——回写格内 vh 标注（V/H/D），保证同格多节点 round-trip 位置完备
    const vhTag = n.vh ? ` ${n.vh}` : '';
    lines.push(`${pad}W: ${n.id}: ${n.labelRef || n.label}${typeTag}${loc}${attrs ? ' ' + attrs : ''}${attachTag}${vhTag}`);
    // 网关：就地输出缩进分支行 + End（保留块级上下文）
    if (gatewayNodes.has(n.id)) {
      const branches = data.edges.filter((e) => e.from === n.id && !e.parent);
      for (const e of branches) {
        const tag = e.label || e.condition || '';
        const exitName = e.id.includes('-') ? e.id.split('-').pop() : '';
        // 出口名：条件分支在 DSL 用 `标签 (名)` 或 `标签` 表达——仅输出标签，出口名可由 label 表达
        lines.push(`${pad}   ${tag} → #${e.to}`);
      }
      lines.push(`${pad}   End`);
    }
    // 子流程：输出内部节点块（缩进一级）
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
  // 普通显式边（非网关出边、非子流程内部节点的边）置文末；跳过 parser 自动生成且未在节点段显式的默认边
  lines.push('// ===== 连线 =====');
  const innerNodes = new Set(data.nodes.filter((n) => n.parent).map((n) => n.id));
  for (const e of data.edges) {
    if (e.parent) continue;
    if (gatewayNodes.has(e.from)) continue; // 已在网关块内输出
    if (innerNodes.has(e.from) && !subNodes.has(e.from) && data.nodes.find((x) => x.id === e.from)?.parent) continue; // 内部节点边在块内
    // 子流程容器 → 外部节点、或外部 → 子流程容器：保留为显式边
    const dup = data.edges.some((x) => x !== e && x.from === e.from && x.to === e.to);
    if (dup) continue;
    lines.push(`${e.from} → #${e.to}`);
  }
  return lines.join('\n');
}

const FlowEditor: React.FC<FlowEditorProps> = ({ data, styles, onDataChange, onStylesChange }) => {
  const [dsl, setDsl] = useState(INITIAL_FLOW_DSL);
  const [activeTab, setActiveTab] = useState<'dsl' | 'ai'>('dsl');
  const [showDocs, setShowDocs] = useState(false);
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

  const sinkFromData = () => {
    // 从 data 反序列化为 DSL（保留当前编辑，供外部修改 data 后同步）
    const out = flowToDsl(data);
    setDsl(out);
    applyDsl(out);
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) { setError('请输入需求描述'); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const gen = await generateFlowDsl(aiPrompt);
      setDsl(gen);
      applyDsl(gen);
    } catch (e: any) {
      setError('AI 生成失败: ' + (e?.message || String(e)));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      {/* 左侧工具栏 */}
      <div className="w-10 border-r flex flex-col items-center py-2 gap-2 bg-[var(--card-bg)]" style={{ borderColor: 'var(--border-light)' }}>
        <button onClick={() => setActiveTab('dsl')} title="DSL 编辑"
          className={`p-1.5 rounded-lg ${activeTab === 'dsl' ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
          <Code size={16} />
        </button>
        <button onClick={() => setActiveTab('ai')} title="AI 生成"
          className={`p-1.5 rounded-lg ${activeTab === 'ai' ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
          <Sparkles size={16} />
        </button>
        <button onClick={sinkFromData} title="从数据同步 DSL"
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><Save size={16} /></button>
        <button onClick={() => setShowDocs(true)} title="语法帮助"
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><HelpCircle size={16} /></button>
        <div className="flex-1" />
        <button onClick={() => setShowDocs(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 opacity-0" tabIndex={-1}></button>
      </div>

      {/* 主编辑区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTab === 'dsl' ? (
          <textarea
            value={dsl}
            onChange={(e) => handleDslChange(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full resize-none p-3 text-[13px] leading-relaxed font-mono outline-none"
            style={{ background: 'transparent', color: 'var(--text-primary, #0f172a)' }}
          />
        ) : (
          <div className="flex-1 p-4 flex flex-col gap-3">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={`描述你想要的流程图，例如：\n"采购审批流程，涉及信息中心/综合计划科/办公室三个部门，分为申请/审批/执行/归档阶段，金额超5000需部门经理审批，否则直接执行，付款后归档"`}
              className="flex-1 w-full resize-none p-3 text-[13px] rounded-lg border outline-none"
              style={{ borderColor: 'var(--border-light)', background: 'transparent' }}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 rounded-lg text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#3b82f6' }}
            >
              {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              生成流程图 DSL（{engineName}）
            </button>
          </div>
        )}

        {/* 状态栏 */}
        <div className="border-t px-3 py-2 flex gap-2 items-center text-[12px]" style={{ borderColor: 'var(--border-light)' }}>
          <span className={error ? 'text-rose-500' : 'text-emerald-500'}>
            {error ? '✗ ' + error.slice(0, 80) : '✓ 已解析'}
          </span>
          <span className="text-slate-400">节点 {data.nodes.length} · 边 {data.edges.length} · 泳道 {data.lanes.length}</span>
          {warnings.length > 0 && <span className="text-amber-500 ml-1 truncate" title={warnings.join('\n')}>⚠ {warnings.length}</span>}
        </div>
      </div>

      {/* 语法帮助弹层 */}
      {showDocs && createPortal(
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => setShowDocs(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[620px] max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">IQS-Flow 语法速查</h3>
              <button className="text-slate-400 hover:text-slate-700" onClick={() => setShowDocs(false)}><X size={18} /></button>
            </div>
            <pre className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed">{HELP}</pre>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

/** AI 生成（复用既有 generateLogicDSL 通道） */
async function generateFlowDsl(prompt: string): Promise<string> {
  const ai = await import('../../services/aiService');
  const { QCToolType } = await import('../../types');
  if (typeof ai.generateLogicDSL === 'function') {
    try {
      const gen = await ai.generateLogicDSL(prompt, QCToolType.FLOW as any, 'flow');
      if (gen && typeof gen === 'string') return gen;
    } catch { /* fallthrough */ }
  }
  // 兜底模板——交给用户自行编辑
  return `Title: ${prompt.slice(0, 20) || '新流程'}
Layout: H
Dict: D[部门A,部门B]
Dict: P[阶段一]
Dict: worker[开始,处理,结束]
Lane from D[0,1] Layout H
Lane from P[0] Layout V
W: w1: worker[0] Type[S] Location(D[0],P[0])
W: w2: worker[1] Location(D[0],P[0])
W: w3: worker[2] Type[E] Location(D[1],P[0])`;
}

const HELP = `# IQS-Flow DSL 速查

# 结构分两层：Dict（数据）+ 结构（Lane/W/Axis）

# 1. 字典（数据源）
Dict: D[部门1,部门2]          # 部门（保留字 D）
Dict: P[阶段1,阶段2]          # 阶段（保留字 P）
Dict: R[岗位1,岗位2]          # 岗位（保留字 R）
Dict: worker[动作1,动作2]     # 自定义字典（节点标签）

# 2. 泳道（从字典批量画）
Lane from D[0,1] Layout H     # 横向泳道（行）
Lane from P[0,1] Layout V     # 纵向泳道（列）

# 3. 轴标题
AxisX: 职能部门 Align C       # 横轴标题（L/R/C 对齐）
AxisY: 推进阶段 Align C       # 纵轴标题（文字纵向）
Axis: 整图标题 AxisX          # 整图标题挂横轴

# 4. 属性边栏提取
Attr active [Role,SOP,Lv,Time]  # 提取到边栏

# 5. 节点
W: w1: worker[0] Type[S] Location(D[0],P[0])   # 开始
W: w2: worker[1] Location(D[0],P[1]) SOP(..) Role(R[0])
W: q1: worker[2] Type[?]                       # 判断
   是 → #w4                                    # 分支出口
   否 → #w5
   End
W: w5: worker[4] Type[E]                       # 结束

# 6. 显式边（跨泳道/回边）
w1 → #w5

# 类型标记
# Type[S]=开始 Type[E]=结束 Type[?]=判断 Type[+]=并行
# Type[SUB]=子流程 Type[N]=标注 Type[DATA]=数据对象

# 属性
# SOP(标准编号) Role(R[i]/岗位名) Lv(重大|重要|一般|1|2|3)
# Time(24h) KPI(指标) M(BPM|1|2|3|4)`;

export default FlowEditor;
