
import React, { useState } from 'react';
import { Sparkles, Code, TerminalSquare, Zap, Loader2, Save, Trash2 } from 'lucide-react';
import { QCToolType } from '../types';
import { generateLogicDSL } from '../services/aiService';

interface Props {
  toolType: QCToolType;
  onDataUpdate: (data: any) => void;
  currentData: any;
}

export const EditorPanel: React.FC<Props> = ({ toolType, onDataUpdate, currentData }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'source'>('ai');

  const handleRunAi = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const result = await generateLogicDSL(prompt, toolType);
      onDataUpdate(result);
      setActiveTab('source');
    } catch (e) {
      alert("Neural logic engine offline.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1A2428] text-white">
      <div className="p-10 border-b border-slate-800 flex flex-col gap-10">
        <div className="flex items-center gap-4">
          <TerminalSquare size={24} className="text-blue-400" />
          <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-[var(--sidebar-text)]">Logic Terminal v2.1</h2>
        </div>

        <div className="flex gap-2 p-1.5 bg-slate-800/50 rounded-md border border-slate-700/50">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'ai' ? 'bg-blue-600 text-white shadow-xl' : 'text-[var(--text-muted)] hover:text-[var(--sidebar-text)]'
              }`}
          >
            <Sparkles size={16} /> AI Inference
          </button>
          <button
            onClick={() => setActiveTab('source')}
            className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'source' ? 'bg-blue-600 text-white shadow-xl' : 'text-[var(--text-muted)] hover:text-[var(--sidebar-text)]'
              }`}
          >
            <Code size={16} /> Source
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12">
        {activeTab === 'ai' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-2">Case Parameters</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="INPUT LOGIC PARAMETERS..."
                className="w-full h-80 p-8 logic-terminal-input text-base leading-relaxed placeholder:opacity-30"
              />
            </div>

            <button
              onClick={handleRunAi}
              disabled={isGenerating}
              className="w-full h-16 flex items-center justify-center gap-4 text-sm font-black tracking-[0.3em] uppercase bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-900/40 rounded-[1.8rem] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} className="fill-current" />}
              {isGenerating ? 'Synthesizing...' : 'Run Logic Hub'}
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-2">Raw Logic Matrix</label>
            <div className="flex-1 mono text-[13px] p-8 bg-black/40 text-emerald-400 rounded-[2.5rem] overflow-auto whitespace-pre border border-slate-800 shadow-inner">
              {JSON.stringify(currentData, null, 2)}
            </div>
          </div>
        )}
      </div>

      <div className="p-10 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl flex gap-4">
        <button className="flex-1 h-14 bg-slate-800 border border-slate-700 rounded-md text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-white transition-all">
          <Trash2 className="w-4 h-4 mr-2 inline" /> Purge
        </button>
        <button className="flex-1 h-14 bg-blue-600 text-white rounded-md text-[11px] font-black uppercase tracking-[0.2em] shadow-lg hover:-translate-y-0.5 transition-all">
          <Save className="w-4 h-4 mr-2 inline" /> Commit
        </button>
      </div>
    </div>
  );
};
