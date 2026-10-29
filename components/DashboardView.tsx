import React, { useState, useMemo, useEffect } from 'react';
import { TOOL_CONFIGS } from '../constants';
import { QCToolType } from '../types';
import { ArrowUpRight, Cpu, ShieldCheck, LayoutGrid, Sun, Moon, Info, X, ChevronRight, Settings2, Laptop, AlertTriangle } from 'lucide-react';
import { parseProjectIndexReleases } from '../utils/projectIndexParser';
import { AIModelManagerModal } from './AIModelManagerModal';
import { hasConfiguredClientCookie, checkNeedsClientCookieSetup, AI_CONFIG_CHANGED_EVENT } from '../services/aiService';
import { Switch } from './ui/Switch';

interface Props {
  onSelectTool: (type: QCToolType) => void;
  cols: number;
  setCols: (cols: number) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const DashboardView: React.FC<Props> = ({ onSelectTool, cols, setCols, theme, setTheme }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [modelModalMode, setModelModalMode] = useState<'admin' | 'client' | null>(null);
  const [clientCookieReady, setClientCookieReady] = useState<boolean>(() => hasConfiguredClientCookie());
  const [needsClientSetup, setNeedsClientSetup] = useState<boolean>(false);

  useEffect(() => {
    const syncCookieBadge = () => {
      setClientCookieReady(hasConfiguredClientCookie());
      checkNeedsClientCookieSetup().then(setNeedsClientSetup);
    };
    syncCookieBadge();
    window.addEventListener(AI_CONFIG_CHANGED_EVENT, syncCookieBadge);
    return () => window.removeEventListener(AI_CONFIG_CHANGED_EVENT, syncCookieBadge);
  }, []);

  // 直接从 docs/PROJECT_INDEX.md 单一真源解析版本与工程历程表
  const releaseMeta = useMemo(() => parseProjectIndexReleases(), []);

  const gridColsClass = {
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6'
  }[cols as 3 | 4 | 5 | 6] || 'md:grid-cols-5';

  const isDark = theme === 'dark';

  return (
    <div className={`w-screen h-screen ${isDark ? 'bg-[#020617]' : 'bg-slate-50'} stripe-grid overflow-y-auto custom-scrollbar transition-colors duration-500 relative`}>
      <div className="max-w-[1600px] mx-auto w-full p-16 space-y-12 relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-12">
          <div className="flex items-center gap-8">
            {/* 双标并排 · 等大 64×64（范式 §1.3 / DESIGN.md：README、官网、关于页必须等大并排） */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <img
                  src="/brand/luxi-lab.svg"
                  alt="鹿溪联合创新实验室 LUXI LAB"
                  className="w-16 h-16 object-contain"
                />
                <div className={`font-mono text-[11px] mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>LUXI LAB</div>
              </div>
              <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>×</span>
              <div className="text-center">
                <img
                  src="/brand/iqs-mark.svg"
                  alt="澄矩 · ChengJu"
                  className="w-16 h-16 object-contain"
                />
                <div className={`font-mono text-[11px] mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>CHENGJU</div>
              </div>
            </div>
            <div>
              <h1 className={`text-5xl font-[900] ${isDark ? 'text-white' : 'text-slate-900'} tracking-tighter leading-none transition-colors`}>澄矩 · <span className="text-[#0D5E42] dark:text-[#00D2FF] font-[400] italic">ChengJu</span></h1>
              <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-bold tracking-[0.2em] text-[11px] mt-3 pl-1 transition-colors`}>源清流澈，行止应矩</p>
              <p className={`text-[11px] mt-2 pl-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                鹿溪联合创新实验室 · LUXI Joint Innovation Lab
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 网格跨度控制舱 */}
            <div className={`${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/60 border-slate-200/80'} backdrop-blur-xl px-5 h-12 rounded-xl border shadow-sm flex items-center gap-4 transition-all`}>
              <LayoutGrid size={20} className="text-blue-500 shrink-0" />
              <div className="flex flex-col min-w-[124px]">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-[0.15em] leading-none`}>网格跨度</span>
                  <span className={`text-[11px] font-black ${isDark ? 'text-blue-400' : 'text-blue-600'} tracking-tighter font-mono`}>{cols} COLS</span>
                </div>
                <input
                  type="range"
                  min="3" max="6" step="1"
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value))}
                  className={`w-full h-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all`}
                />
              </div>
            </div>

            {/* 亮色 / 暗色模式：统一使用标准开关式控件（Switch），消除外壳圆角与胶囊叠加突兀感 */}
            <div
              className={`${
                isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/60 border-slate-200/80'
              } backdrop-blur-xl px-4 h-12 rounded-xl border shadow-sm flex items-center gap-3 transition-all`}
              title={isDark ? '当前为暗色模式，点击切换亮色' : '当前为亮色模式，点击切换暗色'}
            >
              <Sun
                size={16}
                className={`transition-colors ${!isDark ? 'text-amber-500' : 'text-slate-500'}`}
              />
              <Switch
                checked={isDark}
                onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                ariaLabel="切换亮色或暗色主题"
              />
              <Moon
                size={16}
                className={`transition-colors ${isDark ? 'text-blue-400' : 'text-slate-400'}`}
              />
            </div>

            {/* 本地客户端模型配置弹窗按钮 */}
            <button
              onClick={() => setModelModalMode('client')}
              className={`relative ${
                needsClientSetup
                  ? 'bg-[var(--luxi-gold)]/15 border-[var(--luxi-gold)]/60 text-[var(--text-warn)]'
                  : isDark
                  ? 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:border-blue-500/50'
                  : 'bg-white/60 border-slate-200/80 text-slate-700 hover:border-blue-500/50'
              } backdrop-blur-xl px-4 h-12 rounded-xl border shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer`}
              title="配置个人本地或云端模型（保存在当前浏览器 Cookie 中）"
            >
              <Laptop size={18} className="text-primary" />
              <span className="text-[11px] font-black uppercase tracking-wider hidden sm:inline">本地模型</span>
              {clientCookieReady ? (
                <span
                  className="w-2 h-2 rounded-full bg-[var(--state-up)] animate-pulse"
                  title="当前浏览器已配置个人模型"
                />
              ) : needsClientSetup ? (
                <span
                  className="w-2 h-2 rounded-full bg-[var(--alert-red)] animate-ping"
                  title="系统当前要求使用本地模型，请点击完成配置"
                />
              ) : null}
            </button>

            <button
              onClick={() => setShowInfo(true)}
              className={`${isDark ? 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:border-blue-500/50' : 'bg-white/60 border-slate-200/80 text-slate-600 hover:border-blue-500/50'} backdrop-blur-xl w-12 h-12 rounded-xl border shadow-sm hover:scale-105 active:scale-95 transition-all group flex items-center justify-center cursor-pointer`}
              title="版权与说明"
            >
              <Info size={20} />
            </button>
          </div>
        </header>

        {/* 当管理端已将全局激活项设为「本地客户端模型」，但当前浏览器尚未配置时，在主页面展示醒目引导提示条 */}
        {needsClientSetup && (
          <div className="p-4 rounded-xl border border-[var(--luxi-gold)]/50 bg-[var(--luxi-gold)]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-[var(--text-warn)] shrink-0" />
              <span className="text-xs font-bold text-[var(--text-warn)]">
                系统当前已切换为「个人本地模型」模式，检测到您的浏览器尚未配置模型参数。使用 AI 推理前请先完成本地模型配置。
              </span>
            </div>
            <button
              type="button"
              onClick={() => setModelModalMode('client')}
              className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-black uppercase tracking-wider shrink-0 hover:opacity-90 transition-all cursor-pointer"
            >
              立即配置本地模型
            </button>
          </div>
        )}

        <section className={`grid grid-cols-1 ${gridColsClass} gap-6`}>
          {TOOL_CONFIGS.map((tool) => (
            <button
              key={tool.type}
              onClick={() => onSelectTool(tool.type)}
              className={`group ${isDark ? 'bg-slate-900 text-slate-200 border-slate-800 hover:border-blue-500/50' : 'bg-white text-slate-800 border-slate-200 hover:border-blue-500/50'} rounded-2xl p-8 border shadow-md hover:shadow-[0_16px_40px_-10px_rgba(13,94,66,0.18)] transition-all duration-500 relative overflow-hidden flex flex-col h-[300px] text-left active:scale-[0.98] cursor-pointer`}
            >
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className={`w-13 h-13 rounded-lg ${tool.bg} flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-105 ring-1 ${isDark ? 'ring-white/10' : 'ring-slate-200/50'} shadow-sm`}>
                    {React.cloneElement(tool.icon as React.ReactElement<any>, { size: 24, className: tool.color })}
                  </div>
                  <h3 className={`text-xl font-[900] ${isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'} tracking-tight transition-colors uppercase leading-none`}>
                    {tool.name}
                  </h3>
                  <div className={`mt-2 text-[11px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-[0.18em]`}>{tool.enName}</div>
                  <p className={`text-[12px] ${isDark ? 'text-slate-400 opacity-80' : 'text-slate-500 opacity-90'} mt-5 font-medium leading-relaxed line-clamp-3`}>{tool.desc ? (tool.desc.length > 50 ? tool.desc.substring(0, 47) + '...' : tool.desc) : ''}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className={`text-[18px] font-black ${isDark ? 'text-slate-700 group-hover:text-slate-600' : 'text-slate-300 group-hover:text-slate-400'} transition-colors duration-500 select-none font-mono`}>
                    {String(TOOL_CONFIGS.indexOf(tool) + 1).padStart(2, '0')}
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} border flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300 shadow-sm`}>
                    <ArrowUpRight size={20} />
                  </div>
                </div>
              </div>

              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-all duration-700 pointer-events-none bg-gradient-to-br from-transparent to-[var(--accent-color)]`}
                style={{ '--accent-color': tool.accent } as React.CSSProperties}
              ></div>
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-all duration-1000 pointer-events-none`}
                style={{ 
                  background: `radial-gradient(circle at bottom right, ${tool.accent}, transparent 70%)` 
                }}
              ></div>
            </button>
          ))}
        </section>

        <footer className={`py-10 border-t ${isDark ? 'border-slate-800/60 text-slate-600' : 'border-slate-200/60 text-slate-400'} flex flex-col items-center justify-center gap-4 transition-colors`}>
          <img
            src={isDark ? '/brand/luxi-lab-inverse.svg' : '/brand/luxi-lab.svg'}
            alt="鹿溪联合创新实验室 LUXI LAB"
            className="h-14 w-14 object-contain"
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-center">
            鹿溪联合创新实验室 · 澄矩 · ChengJu
          </p>
        </footer>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-lg overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} animate-in zoom-in-95 duration-300`}>
            {/* Modal Header */}
            <div className={`p-8 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between shrink-0 bg-transparent`}>
              <div className="flex items-center gap-4">
                <img src="/brand/iqs-mark.svg" alt="澄矩 · ChengJu" className="w-12 h-12 rounded-[12px] object-contain" />
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>澄矩 · ChengJu</h2>
                    <span className="iqs-badge">{releaseMeta.softwareVersion}</span>
                  </div>
                  <p className={`text-[11px] font-black tracking-widest mt-1 ${isDark ? 'text-[#00D2FF]' : 'text-[#0D5E42]'}`}>源清流澈，行止应矩</p>
                  <div className="mt-2 flex items-center gap-2">
                    <img src={isDark ? '/brand/luxi-lab-inverse.svg' : '/brand/luxi-lab.svg'} alt="LUXI LAB" className="w-6 h-6 object-contain" />
                    <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>鹿溪联合创新实验室出品</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowInfo(false)}
                className={`p-2.5 rounded-lg transition-all cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className={`p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <section className="space-y-4">
                <p className="text-sm leading-relaxed font-medium">
                  <strong className={isDark ? "text-white" : "text-slate-900"}>澄矩 · ChengJu（Intelligent QC Studio / IQS）</strong> 是一款面向工业工程、质量管理（QC）及系统分析领域的绘图工作站。它通过自研的 <strong className={isDark ? "text-blue-400" : "text-blue-600"}>DSL (Domain Specific Language)</strong> 引擎与 <strong className={isDark ? "text-blue-400" : "text-blue-600"}>LLM (大语言模型)</strong> 推理技术，将传统的繁琐绘图流程简化为“语言即图表”的极简体验。本版本采用了全新的 <strong className={isDark ? "text-blue-400" : "text-blue-600"}>Industrial OS</strong> 视觉规范，提供更为沉浸、专业的分析环境。
                </p>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'} group hover:border-blue-500/50 transition-colors`}>
                  <h3 className={`text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    <Cpu size={16} className="text-blue-500" /> 核心特性
                  </h3>
                  <ul className="space-y-3 text-xs">
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-blue-500" /> 无限级联的智能因果分析与鱼骨推演</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-blue-500" /> 支持 Nelson 与 WE 规则的实时 SPC 控制图</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-blue-500" /> 正态拟合、分布可视化的制程直方图引擎</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-blue-500" /> 基于 KJ 法的智能亲和归类与多级脑图展示</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-blue-500" /> 从基础统计到多元矩阵关联的全域数据图形库</li>
                  </ul>
                </div>

                <div className={`p-6 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'} group hover:border-emerald-500/50 transition-colors`}>
                  <h3 className={`text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
                    <ShieldCheck size={16} className="text-emerald-500" /> 技术架构底座
                  </h3>
                  <ul className="space-y-3 text-xs">
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-emerald-500" /> 前端基座：React 19 + Vite 6 高性能渲染</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-emerald-500" /> 图表引擎：全量自研确定性 SVG 拓扑引擎 + ECharts 5</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-emerald-500" /> 交互设计：LUXI Design System v1.0 视觉套件</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-emerald-500" /> 内核解析：IQS-DSL v1 强类型词法与卡片单一真源（SSOT）</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-emerald-500" /> AI 集成：支持服务端预设与客户端 Cookie 双模解耦接入</li>
                  </ul>
                </div>
              </div>

              {/* 版本发布记录：保持既有排版形态，数据实时源自 docs/PROJECT_INDEX.md §1 表格 */}
              <section className="space-y-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>版本发布记录 (Release History)</h3>
                  <span className={`text-[11px] font-mono shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    单一真源直读 · docs/PROJECT_INDEX.md §1（共 {releaseMeta.totalMilestones} 个里程碑）
                  </span>
                </div>
                <div className={`p-6 rounded-lg border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-5 font-mono text-[11px]`}>
                  {releaseMeta.groups.map((grp) => (
                    <div key={grp.id} className="pt-2 first:pt-0">
                      <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {grp.title}
                      </p>
                      <div className="space-y-2.5">
                        {grp.entries.map((entry, idx) => (
                          <div
                            key={`${grp.id}_${entry.version}_${idx}`}
                            className={`flex gap-4 ${grp.isHighlight ? '' : 'opacity-75'}`}
                          >
                            <span
                              className={`${
                                grp.isHighlight ? 'text-blue-500' : 'text-slate-500'
                              } font-bold shrink-0 w-16 text-right`}
                            >
                              {entry.version}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                {entry.summary}
                              </span>
                              <span className={`ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                ({entry.date})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Modal Footer：左侧两行版权标识，右侧「模型」按钮 + 「确定」按钮 */}
            <div className={`p-6 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'} flex justify-between items-center gap-4 shrink-0`}>
              <div className="flex items-center gap-3">
                <img src={isDark ? '/brand/luxi-lab-inverse.svg' : '/brand/luxi-lab.svg'} alt="LUXI LAB" className="w-7 h-7 object-contain shrink-0" />
                <div className="flex flex-col space-y-0.5">
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    © 2026 澄矩 · ChengJu ({releaseMeta.softwareVersion})
                  </span>
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    鹿溪联合创新实验室 LUXI LAB
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowInfo(false);
                    setModelModalMode('admin');
                  }}
                  className={`px-6 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-blue-500/60 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-500/60 hover:text-slate-900'
                  }`}
                  title="管理大模型提供商、API 密钥与激活模型（需 ENV 管理密码）"
                >
                  <Settings2 size={15} className="text-primary" />
                  <span>模型</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className={`px-8 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer ${isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 大模型配置与接入管理弹窗（复用同一组件：mode='admin' 管理全局配置 / mode='client' 管理本地浏览器 Cookie 配置） */}
      <AIModelManagerModal
        open={modelModalMode !== null}
        mode={modelModalMode || 'admin'}
        onClose={() => setModelModalMode(null)}
        isDark={isDark}
        onOpenClientModal={() => setModelModalMode('client')}
      />
    </div>
  );
};
