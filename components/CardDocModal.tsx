/**
 * CardDocModal · 帮助弹窗共享组件（单一渲染范式）
 *
 * 背景：此前 14 个 Editor 各自硬编码弹窗 JSX —— 实测出 4 个维度不统一：
 *   弹窗宽度（800px ×11 / 900px ×3）、tab 命名（`DSL 规范说明` ×14 vs `语法规范说明` vs `DSL编辑器` vs `JSON 脚本`）、
 *   主题色（blue-600 ×13 / indigo-600 ×2）、排版实现（`<table>` 与 `grid-cols` 混用）。
 *
 * 现统一由本组件渲染，数据来自 `dsl/generated/cardDocs.ts`
 * （该文件由 `dsl/cards/*.card.ts` 生成 —— 与 MCP 下发、`constants.tsx` 的示例同源）。
 *
 * 用法：
 *   import { CardDocModal } from './CardDocModal';
 *   <CardDocModal kind="affinity" open={showDocs} onClose={() => setShowDocs(false)} />
 *
 * `kind` 取 `cardDocs` 的键 = mcpName 去掉 `render_` 前缀（master 卡去掉 `_master`）：
 *   affinity / arrow / basic / control / fishbone / histogram / matrix / matrix_plot /
 *   pareto / pdpc / radar / relation / scatter / flow / mermaid / vchart / …
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Boxes, Database, Plus, Zap, ShieldAlert } from 'lucide-react';
import { CARD_DOCS } from '../dsl/generated/cardDocs.ts';
import type { SoulBlock, Counterexample } from '../dsl/cards/_types.ts';

/** 帮助弹窗的数据契约（由 dsl/cards 生成） */
export interface CardDocSyntaxRow {
  name: string;
  meaning: string;
  values: string[];
  argShape: string;
  example: string;
  status: 'supported' | 'partial' | 'unsupported';
  required: boolean;
  notes: string;
}

export interface CardDocEntry {
  meta: {
    id: string;
    tier: 'core' | 'relief';
    family: string;
    body: string;
    mcpName: string;
    qcTool: string;
    version: string;
    displayName: string;
    intents: string[];
    expertise: string[];
    colorSlots: string[];
    typeDirective?: { name: string; values: string[]; meaning: string };
    [k: string]: unknown;
  };
  soul: { title: string; summary: string; blocks: SoulBlock[] };
  syntaxRows: CardDocSyntaxRow[];
  example: { title: string; dsl: string; notes: string };
  counterexamples: Counterexample[];
  outputControls: string[];
  promptNotes: string[];
}

export interface CardDocModalProps {
  /** cardDocs 的键（mcpName 去 `render_` 前缀） */
  kind: string;
  open: boolean;
  onClose: () => void;
}

/** 统一设计令牌 —— 全项目弹窗的唯一定义处 */
const UI = {
  overlay: 'fixed inset-0 z-[900] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md',
  // 浮层语义（范式 §surface · raised）：弹窗不是侧栏，不得沿用 --sidebar-bg
  panel:
    'bg-[var(--card-bg)] w-[880px] max-w-[92vw] max-h-[86vh] rounded-md border border-[var(--border-line-r)] flex flex-col overflow-hidden shadow-lg animate-in zoom-in-95 duration-300',
  header: 'px-8 py-6 flex flex-col border-b border-[var(--border-line-r)] shrink-0 gap-6',
  body: 'flex-1 overflow-y-auto p-8 space-y-8',
  footer: 'px-8 py-5 border-t border-[var(--border-line-r)] bg-[var(--input-bg)] flex justify-center shrink-0',
} as const;

const STATUS_BADGE: Record<CardDocSyntaxRow['status'], { text: string; cls: string }> = {
  supported: { text: '', cls: '' },
  partial: { text: '部分支持', cls: 'text-[var(--text-warn)] border-[var(--luxi-gold)]/40' },
  unsupported: { text: '不支持', cls: 'text-[var(--text-danger)] border-[var(--alert-red)]/40' },
};

function SectionTitle({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: string }) {
  return (
    <div className={`flex items-center gap-3 ${tone} border-b border-current/20 pb-4 opacity-90`}>
      {icon}
      <span className="text-[12px] font-black uppercase tracking-widest">{label}</span>
    </div>
  );
}

const SoulBlockView: React.FC<{ b: SoulBlock }> = ({ b }) => {
  if (b.kind === 'h') {
    return (
      <h4
        className={
          b.level === 3
            ? 'text-sm font-black text-[var(--sidebar-text)] uppercase tracking-widest border-b border-[var(--sidebar-border)] pb-2'
            : 'text-[13px] font-black text-[var(--sidebar-text)] mt-2'
        }
      >
        {b.text}
      </h4>
    );
  }
  if (b.kind === 'p') {
    return <p className="text-[11px] leading-relaxed text-[var(--sidebar-text)]">{b.text}</p>;
  }
  if (b.kind === 'ul') {
    return (
      <ul className="list-disc list-inside space-y-2 text-[11px] leading-relaxed text-[var(--sidebar-text)]">
        {b.items.map((it, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: mdInline(it) }} />
        ))}
      </ul>
    );
  }
  const tone =
    b.type === 'IMPORTANT'
      ? 'border-primary/30 bg-primary/10'
      : b.type === 'TIP'
        ? 'border-[var(--state-up)]/30 bg-[var(--state-up)]/10'
        : 'border-slate-500/30 bg-slate-500/10';
  return (
    <div className={`rounded-md border p-6 ${tone}`}>
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} className="opacity-70" />
        <span className="text-[11px] font-black uppercase tracking-widest opacity-80">{b.type}</span>
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--sidebar-text)] font-medium" dangerouslySetInnerHTML={{ __html: mdInline(b.text) }} />
    </div>
  );
};

/** 极简行内 Markdown：**粗体** / `代码` —— 避免引入第三方渲染器 */
function mdInline(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1 rounded font-mono text-[11px]" style="background:var(--input-bg);color:var(--text-main)">$1</code>');
}

export const CardDocModal: React.FC<CardDocModalProps> = ({ kind, open, onClose }) => {
  const [tab, setTab] = React.useState<'dsl' | 'logic'>('dsl');
  if (!open) return null;

  const doc: CardDocEntry | undefined = CARD_DOCS[kind];
  if (!doc) {
    return createPortal(
      <div className={UI.overlay} onClick={onClose}>
        <div className={UI.panel}>
          <div className={UI.header}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-[var(--sidebar-text)] uppercase tracking-tighter">未登记的知识卡</h3>
              <button onClick={onClose} className="p-3 rounded-md text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]">
                <X size={24} />
              </button>
            </div>
            <p className="text-[11px] text-[var(--sidebar-muted)] font-mono">
              cardDocs 中不存在 kind = <code>{kind}</code>。请在 <code>dsl/cards/</code> 下补齐卡片后重跑 <code>npm run build:cards</code>。
            </p>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const m = doc.meta;

  return createPortal(
    <div className={UI.overlay} onClick={onClose}>
      <div className={UI.panel} onClick={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className={UI.header}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={'p-3 bg-primary/20 rounded-md border border-primary/30'}>
                <BookOpen size={24} className={'text-primary'} />
              </div>
              <div>
                <h3 className="text-xl font-black text-[var(--sidebar-text)] uppercase tracking-tighter">
                  {m.displayName}
                </h3>
                <p className="text-[11px] text-[var(--sidebar-muted)] font-bold uppercase tracking-widest mt-1">
                  {m.family} · {m.body} · Card V{m.version} · {m.tier === 'core' ? 'CORE' : 'RELIEF'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-[var(--input-bg)] rounded-md transition-all text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex bg-[var(--nav-bg)] p-1 rounded-md border border-[var(--sidebar-border)] w-fit">
            {[
              { id: 'dsl', label: 'DSL 规范说明' },
              { id: 'logic', label: '分析逻辑与指南' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as 'dsl' | 'logic')}
                className={`px-8 py-2 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${
                  tab === t.id ? 'bg-primary text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--sidebar-text)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <p className="text-[11px] text-[var(--sidebar-muted)] leading-relaxed">{doc.soul.summary}</p>
        </div>

        {/* ── Body ── */}
        <div className={UI.body}>
          {tab === 'dsl' ? (
            <>
              <section className="space-y-6">
                <SectionTitle icon={<Database size={18} />} label={`语法全量（${doc.syntaxRows.length} 条）`} tone="text-[var(--accent-blue)]" />
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono border-collapse">
                    <thead>
                      <tr className="text-[var(--sidebar-text)] text-left border-b border-[var(--sidebar-border)]">
                        <th className="py-3 pr-4 font-black uppercase whitespace-nowrap">语法</th>
                        <th className="py-3 pr-4 font-black uppercase">说明</th>
                        <th className="py-3 font-black uppercase">示例</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--sidebar-border)]/50">
                      {doc.syntaxRows.map((s, i) => {
                        const badge = STATUS_BADGE[s.status];
                        return (
                          <tr key={i} className="align-top">
                            <td className="py-3 pr-4 font-bold text-primary whitespace-nowrap">{s.name}</td>
                            <td className="py-3 pr-4 text-[var(--sidebar-text)]">
                              {s.meaning}
                              {s.values.length > 0 && (
                                <span className="text-[var(--sidebar-muted)]">（{s.values.join(' / ')}）</span>
                              )}
                              {s.argShape && (
                                <span className="text-[var(--sidebar-muted)]"> 形如 <code className="font-mono">{s.argShape}</code></span>
                              )}
                              {s.required && <span className="ml-2 text-[11px] font-black text-[var(--text-danger)]">必填</span>}
                              {badge.text && (
                                <span className={`ml-2 text-[11px] font-black border px-1.5 py-0.5 rounded ${badge.cls}`}>
                                  {badge.text}
                                </span>
                              )}
                              {s.notes && (
                                <div className="mt-2 text-[11px] leading-relaxed text-[var(--sidebar-muted)] border-l-2 border-[var(--sidebar-border)] pl-3">
                                  {s.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-3 text-[var(--sidebar-text)] whitespace-pre-wrap">{s.example}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-6">
                <SectionTitle icon={<Plus size={18} />} label="范式示例" tone="text-[var(--text-ok)]" />
                <div className="p-6 bg-[var(--input-bg)] rounded-md border border-[var(--sidebar-border)] space-y-4">
                  <div className="text-[11px] font-bold text-[var(--sidebar-text)]">{doc.example.title}</div>
                  <pre className="iqs-input iqs-code text-[var(--text-main)] p-4 overflow-x-auto whitespace-pre">
                    {doc.example.dsl}
                  </pre>
                  {doc.example.notes && (
                    <p className="text-[11px] text-[var(--sidebar-muted)] leading-relaxed">{doc.example.notes}</p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-5">
                {doc.soul.blocks.map((b, i) => (
                  <SoulBlockView key={i} b={b} />
                ))}
              </section>

              {doc.counterexamples.length > 0 && (
                <section className="space-y-5">
                  <SectionTitle icon={<ShieldAlert size={18} />} label="反例（错 → 对）" tone="text-[var(--text-danger)]" />
                  {doc.counterexamples.map((c, i) => (
                    <div key={i} className="p-6 bg-[var(--input-bg)] rounded-md border border-[var(--sidebar-border)] space-y-3">
                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[11px] font-mono">
                        <span className="text-[var(--text-danger)] font-black">错</span>
                        <span className="text-[var(--sidebar-text)] whitespace-pre-wrap">{c.bad}</span>
                        <span className="text-[var(--text-ok)] font-black">对</span>
                        <span className="text-[var(--sidebar-text)] whitespace-pre-wrap">{c.good}</span>
                      </div>
                      <p className="text-[11px] text-[var(--sidebar-muted)] leading-relaxed border-t border-[var(--sidebar-border)]/50 pt-3">
                        {c.reason}
                      </p>
                    </div>
                  ))}
                </section>
              )}

              {doc.promptNotes.length > 0 && (
                <section className="space-y-5">
                  <SectionTitle icon={<Boxes size={18} />} label="生成要点" tone="text-[var(--text-warn)]" />
                  <ol className="list-decimal list-inside space-y-2 text-[11px] leading-relaxed text-[var(--sidebar-text)]">
                    {doc.promptNotes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ol>
                </section>
              )}

              <section className="space-y-5">
                <SectionTitle icon={<ShieldAlert size={18} />} label="输出红线" tone="text-primary" />
                <ul className="list-disc list-inside space-y-2 text-[11px] leading-relaxed text-[var(--sidebar-text)]">
                  {doc.outputControls.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={UI.footer}>
          <button
            onClick={onClose}
            className={'px-16 py-4 bg-primary text-white font-black rounded-md text-[11px] uppercase tracking-widest shadow-lg hover:bg-primary-hover transition-all font-sans'}
          >
            已阅读规范
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CardDocModal;
