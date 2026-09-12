import React, { useState } from 'react';
import { TOOL_CONFIGS } from '../constants';
import { QCToolType } from '../types';
import { ArrowUpRight, Cpu, ShieldCheck, LayoutGrid, Sun, Moon, Info, X, ChevronRight } from 'lucide-react';

interface Props {
  onSelectTool: (type: QCToolType) => void;
  cols: number;
  setCols: (cols: number) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const DashboardView: React.FC<Props> = ({ onSelectTool, cols, setCols, theme, setTheme }) => {
  const [showInfo, setShowInfo] = useState(false);

  const gridColsClass = {
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6'
  }[cols as 3 | 4 | 5 | 6] || 'md:grid-cols-5';

  const isDark = theme === 'dark';

  return (
    <div className={`w-screen h-screen ${isDark ? 'bg-[#020617]' : 'bg-slate-50'} stripe-grid overflow-y-auto custom-scrollbar transition-colors duration-500 relative`}>
      <div className="max-w-[1600px] mx-auto w-full p-16 space-y-16 relative z-10">
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

          <div className="flex items-center gap-6">
            <div className={`${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/40 border-white/50'} backdrop-blur-xl px-8 py-4 rounded-[2rem] border shadow-xl flex items-center gap-6 transition-all border-b-2 border-b-blue-500/10`}>
              <LayoutGrid size={24} className="text-blue-500" />
              <div className="flex flex-col min-w-[140px]">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em] leading-none`}>网格跨度</span>
                  <span className={`text-[11px] font-black ${isDark ? 'text-blue-400' : 'text-blue-600'} tracking-tighter`}>{cols} COLUMNS</span>
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

            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`relative flex items-center ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/40 border-white/50'} backdrop-blur-xl p-1.5 rounded-[2rem] border shadow-xl transition-all w-48 h-12 overflow-hidden cursor-pointer`}
              title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
            >
              {/* Sliding Background Indicator */}
              <div 
                className={`absolute inset-y-1.5 w-[calc(50%-6px)] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0`}
                style={{
                  transform: isDark ? 'translateX(calc(100% + 6px))' : 'translateX(0)',
                  backgroundColor: isDark ? '#42525C' : '#FFFFFF'
                }}
              />
              
              <div className={`relative z-10 flex-1 flex justify-center items-center gap-2 text-[11px] font-black uppercase tracking-wider transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-amber-500 drop-shadow-sm'}`}>
                <Sun size={14} />
                <span>Light</span>
              </div>
              
              <div className={`relative z-10 flex-1 flex justify-center items-center gap-2 text-[11px] font-black uppercase tracking-wider transition-colors duration-500 ${isDark ? 'text-blue-400 drop-shadow-sm' : 'text-slate-400'}`}>
                <Moon size={14} />
                <span>Dark</span>
              </div>
            </button>

            <button
              onClick={() => setShowInfo(true)}
              className={`${isDark ? 'bg-slate-800/40 border-slate-700/50 text-slate-300' : 'bg-white/40 border-white/50 text-slate-600'} backdrop-blur-xl p-4 rounded-full border shadow-xl hover:scale-110 active:scale-95 transition-all group flex items-center justify-center min-w-[56px] min-h-[56px]`}
              title="版权与说明"
            >
              <Info size={24} />
            </button>
          </div>
        </header>

        <section className={`grid grid-cols-1 ${gridColsClass} gap-8`}>
          {TOOL_CONFIGS.map((tool) => (
            <button
              key={tool.type}
              onClick={() => onSelectTool(tool.type)}
              className={`group ${isDark ? 'bg-slate-900 text-slate-200 border-slate-800 hover:border-blue-500/50' : 'bg-white text-slate-800 border-slate-200 hover:border-blue-500/50'} rounded-[2.5rem] p-10 border shadow-xl hover:shadow-[0_20px_50px_-10px_rgba(37,99,235,0.2)] transition-all duration-700 relative overflow-hidden flex flex-col h-[320px] text-left active:scale-[0.98]`}
            >
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className={`w-14 h-14 rounded-lg ${tool.bg} flex items-center justify-center mb-6 transition-all duration-700 group-hover:scale-110 group-hover:rotate-[6deg] ring-1 ${isDark ? 'ring-white/10' : 'ring-slate-200/50'} shadow-lg`}>
                    {React.cloneElement(tool.icon as React.ReactElement<any>, { size: 26, className: tool.color })}
                  </div>
                  <h3 className={`text-2xl font-[900] ${isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'} tracking-tight transition-colors uppercase leading-none`}>
                    {tool.name}
                  </h3>
                  <div className={`mt-2 text-[11px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-[0.2em]`}>{tool.enName}</div>
                  <p className={`text-[12px] ${isDark ? 'text-slate-400 opacity-80' : 'text-slate-500 opacity-90'} mt-6 font-medium leading-relaxed line-clamp-3`}>{tool.desc ? (tool.desc.length > 50 ? tool.desc.substring(0, 47) + '...' : tool.desc) : ''}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className={`text-[20px] font-black ${isDark ? 'text-slate-700 group-hover:text-slate-600' : 'text-slate-300 group-hover:text-slate-400'} transition-colors duration-700 select-none`}>
                    0{TOOL_CONFIGS.indexOf(tool) + 1}
                  </div>
                  <div className={`w-11 h-11 rounded-lg ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} border flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-500 shadow-sm`}>
                    <ArrowUpRight size={22} />
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
          <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-[2.5rem] shadow-lg overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} animate-in zoom-in-95 duration-300`}>
            {/* Modal Header */}
            <div className={`p-8 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between shrink-0 bg-transparent`}>
              <div className="flex items-center gap-4">
                <img src="/brand/iqs-mark.svg" alt="澄矩 · ChengJu" className="w-12 h-12 rounded-[12px] object-contain" />
                <div>
                  <h2 className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>澄矩 · ChengJu</h2>
                  <p className={`text-[11px] font-black tracking-widest mt-1 ${isDark ? 'text-[#00D2FF]' : 'text-[#0D5E42]'}`}>源清流澈，行止应矩</p>
                  <div className="mt-2 flex items-center gap-2">
                    <img src={isDark ? '/brand/luxi-lab-inverse.svg' : '/brand/luxi-lab.svg'} alt="LUXI LAB" className="w-6 h-6 object-contain" />
                    <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>鹿溪联合创新实验室出品</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowInfo(false)}
                className={`p-3 rounded-full transition-all ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
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
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-emerald-500" /> 前端基座：React 18 + Vite 5 高性能渲染</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-emerald-500" /> 图表引擎：ECharts 5 深度定制 + 原生 Canvas/SVG</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-emerald-500" /> 交互设计：Industrial OS 视觉套件 + Tailwind</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-emerald-500" /> 内核解析：TypeScript 强类型 DSL 正则词法引擎</li>
                    <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-emerald-500" /> AI 集成：支持 GPT-4o / DeepSeek / Claude 等推理补全</li>
                  </ul>
                </div>
              </div>

              <section className="space-y-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>版本发布记录 (Release History)</h3>
                  <span className={`text-[11px] font-mono shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>按工程阶段归档 · 详见 docs/PROJECT_INDEX.md</span>
                </div>
<div className={`p-6 rounded-lg border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-5 font-mono text-[11px]`}>
                  <div className="pt-2 first:pt-0">
                    <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>P6 · 单一真源（SSOT）与 UI 范式 · 未发布</p>
                    <div className="space-y-2.5">
                      <div className="flex gap-4">
                        <span className="text-blue-500 font-bold shrink-0 w-16 text-right">v3.5.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>feat(flow): 初始示例扩为 14 节点 / 5 部门 / 5 阶段 / 2 网关 / 6 属性；AI 推理选项卡对齐范式；核查 Color 样式语句在 BNF、L0 spec、flow.card.ts 与编辑器四处一致。 (Today)</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-blue-500 font-bold shrink-0 w-16 text-right">v3.4.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>fix: 指定问题修复——PDPC 初始配色改浅底深字（原对比度最低 2.54:1）、矢线图连线标号自适应字号、雷达图数值标签改深墨、VChart 示例扩为多系列。 (Today)</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-blue-500 font-bold shrink-0 w-16 text-right">v3.3.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>refactor: 全项目 UI 范式归位（语义类与令牌统一、开关收敛为 Switch 组件、字号与色族终检归零）；代码审计修复拓扑-配色脱节、手工路径零校验、DSL 往返截断、ID 碰撞等 15 项。 (Today)</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 first:pt-0">
                    <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>P5 · 品牌化与发行</p>
                    <div className="space-y-2.5">
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v3.2.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>feat: 引入 MCP SSE 远程调用与 Docker 混合编排，支持运行时配置注入。 (Today)</span>
                      </div>
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v3.1.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>IQS 品牌全域升级：斜纹背景、全新 LOGO 与 UI 深度精进。</span>
                      </div>
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v3.0.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>feat: 实现深色模式并增加图表数值显示开关。 (3 days ago)</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 first:pt-0">
                    <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>P2–P4 · MCP 化 / 语言规范 / FLOW / 工程化</p>
                    <div className="space-y-2.5">
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v2.9.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>chore: 优化文件系统结构并清理冗余资源。 (1 week ago)</span>
                      </div>
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v2.8.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>feat: 新增 Mermaid 图表组件与相关文档，并更新核心配置。 (3 weeks ago)</span>
                      </div>
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v2.5.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>feat: 集成 Tailwind CSS 和 PostCSS 进行本地构建，移除 CDN 依赖。 (5 weeks ago)</span>
                      </div>
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v2.1.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>feat: 引入 Docker 入口脚本支持运行时环境变量。 (5 weeks ago)</span>
                      </div>
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v2.0.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>feat: 项目容器化部署支持及 package.json 依赖项升级。 (6 weeks ago)</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 first:pt-0">
                    <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>P1 · 项目起步（QC 图表组件 + AI 服务）</p>
                    <div className="space-y-2.5">
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v1.8.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>feat: 新增雷达图 (Radar Chart) 功能及相关配置。 (2 months ago)</span>
                      </div>
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v1.5.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>refactor: 将仪表盘核心状态提升至顶层进行集中管理。 (2 months ago)</span>
                      </div>
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v1.2.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>feat: 添加基础图表 (Basic Chart) 功能，支持 DSL 编辑与 AI 生成。 (3 months ago)</span>
                      </div>
                      <div className="flex gap-4 opacity-70">
                        <span className="text-slate-500 font-bold shrink-0 w-16 text-right">v1.0.0</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>feat: 初始化智能质量控制工作室项目，集成核心 QC 图表与 AI 服务。 (4 months ago)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Modal Footer */}
            <div className={`p-6 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'} flex justify-between items-center shrink-0`}>
              <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <span className="inline-flex items-center gap-2">
                  <img src={isDark ? '/brand/luxi-lab-inverse.svg' : '/brand/luxi-lab.svg'} alt="" className="w-5 h-5 object-contain" />
                  © 2026 澄矩 · ChengJu · 鹿溪联合创新实验室 LUXI LAB
                </span>
              </p>
              <button 
                onClick={() => setShowInfo(false)}
                className={`px-8 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-lg ${isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                进入工位
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
