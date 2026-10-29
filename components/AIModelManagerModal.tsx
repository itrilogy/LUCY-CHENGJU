import React, { useState, useEffect } from 'react';
import {
    X,
    Lock,
    Server,
    Key,
    Globe,
    Cpu,
    RefreshCw,
    CheckCircle2,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    AlertTriangle,
    RotateCcw,
    ShieldCheck,
    Layers,
} from 'lucide-react';
import {
    loadAIConfigState,
    saveAIConfigState,
    resetAIConfigState,
    fetchProviderModels,
    verifyAdminPassword,
    resolveProtocolEndpoints,
    type AIProfile,
    type AIProtocolType,
    type AIConfigState,
} from '../services/aiService';
import { ConfirmInline } from './ui/ConfirmInline';

interface AIModelManagerModalProps {
    open: boolean;
    onClose: () => void;
    isDark: boolean;
}

const PROTOCOL_OPTIONS: Array<{ value: AIProtocolType; label: string; hint: string }> = [
    { value: 'openai', label: 'OpenAI 兼容 (v1/chat/completions)', hint: '适配 DeepSeek / 百炼 / SiliconFlow / LMStudio / LiteLLM / NewAPI' },
    { value: 'anthropic', label: 'Anthropic Claude (v1/messages)', hint: '适配 Claude 官方或 Anthropic 兼容网关' },
    { value: 'gemini', label: 'Google Gemini (v1beta/models)', hint: '适配 Gemini 原生接口或 OpenAI 兼容模式' },
    { value: 'custom', label: '自定义直连端点 (Custom URL)', hint: '不做路径补全，按所填完整 URL 直接请求' },
];

const SESSION_AUTH_KEY = 'iqs_admin_unlocked_v1';

export const AIModelManagerModal: React.FC<AIModelManagerModalProps> = ({ open, onClose, isDark }) => {
    const [unlocked, setUnlocked] = useState<boolean>(() => {
        if (typeof window === 'undefined' || !window.sessionStorage) return false;
        return window.sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
    });
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);

    const [configState, setConfigState] = useState<AIConfigState>({
        active_profile: 'deepseek_public',
        profiles: {},
    });
    const [selectedKey, setSelectedKey] = useState<string>('deepseek_public');
    const [showApiKey, setShowApiKey] = useState(false);

    // 模型拉取与交互反馈状态
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [statusBanner, setStatusBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setAuthError(null);
        setStatusBanner(null);
        loadAIConfigState().then(state => {
            setConfigState(state);
            setSelectedKey(state.active_profile || Object.keys(state.profiles)[0] || '');
        });
    }, [open]);

    if (!open) return null;

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (verifyAdminPassword(passwordInput)) {
            setUnlocked(true);
            setAuthError(null);
            setPasswordInput('');
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
            }
        } else {
            setAuthError('管理密码校验未通过，请核对环境变量 IQS_ADMIN_PASSWORD 配置。');
        }
    };

    const handleLock = () => {
        setUnlocked(false);
        if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.removeItem(SESSION_AUTH_KEY);
        }
    };

    const currentProfile: AIProfile | undefined = configState.profiles[selectedKey];

    const updateCurrentProfile = (patch: Partial<AIProfile>) => {
        if (!selectedKey || !configState.profiles[selectedKey]) return;
        const nextProfiles = {
            ...configState.profiles,
            [selectedKey]: {
                ...configState.profiles[selectedKey],
                ...patch,
            },
        };
        const nextState: AIConfigState = {
            ...configState,
            profiles: nextProfiles,
        };
        setConfigState(nextState);
        saveAIConfigState(nextState);
    };

    const handleActivateProfile = (key: string) => {
        if (!configState.profiles[key]) return;
        const nextState: AIConfigState = {
            ...configState,
            active_profile: key,
        };
        setConfigState(nextState);
        saveAIConfigState(nextState);
        const p = configState.profiles[key];
        setStatusBanner({
            type: 'ok',
            text: `已激活提供商「${p.name}」（当前模型：${p.model || '未指定'}）`,
        });
    };

    const handleAddProvider = () => {
        const idx = Object.keys(configState.profiles).length + 1;
        let newKey = `provider_${idx}`;
        while (configState.profiles[newKey]) {
            newKey = `provider_${idx}_${Math.random().toString(36).slice(2, 5)}`;
        }
        const newProfile: AIProfile = {
            id: newKey,
            name: `新模型服务商 #${idx}`,
            protocol: 'openai',
            endpoint: 'https://api.openai.com/v1/chat/completions',
            apiKey: '',
            model: 'gpt-4o-mini',
            models: ['gpt-4o-mini'],
            max_tokens: 8192,
        };
        const nextState: AIConfigState = {
            ...configState,
            profiles: {
                ...configState.profiles,
                [newKey]: newProfile,
            },
        };
        setConfigState(nextState);
        setSelectedKey(newKey);
        saveAIConfigState(nextState);
        setStatusBanner({ type: 'ok', text: `已新增提供商「${newProfile.name}」，请配置接入地址与密钥。` });
    };

    const handleDeleteProvider = (key: string) => {
        const keys = Object.keys(configState.profiles);
        if (keys.length <= 1) {
            setStatusBanner({ type: 'err', text: '系统至少需保留 1 个大模型配置方案。' });
            setConfirmDeleteKey(null);
            return;
        }
        const nextProfiles = { ...configState.profiles };
        const removedName = nextProfiles[key]?.name || key;
        delete nextProfiles[key];
        const remainingKeys = Object.keys(nextProfiles);
        const nextActive =
            configState.active_profile === key ? remainingKeys[0] : configState.active_profile;
        const nextState: AIConfigState = {
            active_profile: nextActive,
            profiles: nextProfiles,
        };
        setConfigState(nextState);
        if (selectedKey === key) setSelectedKey(nextActive);
        saveAIConfigState(nextState);
        setConfirmDeleteKey(null);
        setStatusBanner({ type: 'ok', text: `已删除提供商「${removedName}」` });
    };

    const handleFetchModels = async () => {
        if (!currentProfile) return;
        setIsFetchingModels(true);
        setStatusBanner(null);
        try {
            const models = await fetchProviderModels(currentProfile);
            const nextModel = models.includes(currentProfile.model)
                ? currentProfile.model
                : models[0];
            updateCurrentProfile({
                models,
                model: nextModel,
            });
            setStatusBanner({
                type: 'ok',
                text: `成功从远端拉取 ${models.length} 个可用模型，可在下拉框中直接选择或激活。`,
            });
        } catch (err: any) {
            setStatusBanner({
                type: 'err',
                text: err?.message || '拉取模型列表失败，请检查接入地址、协议类型、API Key 或跨域策略。',
            });
        } finally {
            setIsFetchingModels(false);
        }
    };

    const handleResetDefaults = async () => {
        const fresh = await resetAIConfigState();
        setConfigState(fresh);
        setSelectedKey(fresh.active_profile);
        setConfirmReset(false);
        setStatusBanner({ type: 'ok', text: '已恢复系统默认大模型配置方案（config.json）。' });
    };

    const resolvedEndpoints = currentProfile
        ? resolveProtocolEndpoints(currentProfile.endpoint, currentProfile.protocol || 'openai', currentProfile.model)
        : { chatUrl: '', modelsUrl: '' };

    return (
        <div className="fixed inset-0 z-[950] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className={`w-full max-w-5xl max-h-[88vh] flex flex-col rounded-[2.5rem] shadow-lg overflow-hidden border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                } animate-in zoom-in-95 duration-300`}
            >
                {/* Header */}
                <div
                    className={`p-8 border-b ${
                        isDark ? 'border-slate-800' : 'border-slate-100'
                    } flex items-center justify-between shrink-0`}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                            <Server size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    大模型配置与接入管理中心
                                </h2>
                                <span className="iqs-badge">
                                    <span className="w-2 h-2 rounded-full bg-[var(--state-up)] animate-pulse" />
                                    {configState.profiles[configState.active_profile]?.name || '未激活'}
                                </span>
                            </div>
                            <p className={`text-[11px] font-bold tracking-[0.15em] uppercase mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                IQS LLM Gateway & Provider Hub · 支持多协议接入、远端模型拉取与即时热切换
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {unlocked && (
                            <button
                                onClick={handleLock}
                                className={`h-9 px-3 rounded-md border text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                    isDark
                                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                                }`}
                                title="锁定管理会话"
                            >
                                <Lock size={13} />
                                <span>锁定</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`p-3 rounded-full transition-all ${
                                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body: 未解锁时展示 ENV 管理密码门禁，已解锁展示双栏管理工作台 */}
                {!unlocked ? (
                    <form onSubmit={handleUnlock} className="p-12 flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-6">
                        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                            <Lock size={28} />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                管理员安全鉴权
                            </h3>
                            <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                大模型接入与密钥管理受环境变量 <code className="font-mono text-primary">IQS_ADMIN_PASSWORD</code> 保护，请输入管理密码解锁配置中心。
                            </p>
                        </div>

                        <div className="w-full space-y-3">
                            <input
                                type="password"
                                value={passwordInput}
                                onChange={e => setPasswordInput(e.target.value)}
                                placeholder="输入管理密码 (IQS_ADMIN_PASSWORD)..."
                                autoFocus
                                className="iqs-input h-11 w-full"
                            />
                            {authError && (
                                <div className="p-3 rounded-md bg-[var(--alert-red)]/10 border border-[var(--alert-red)]/30 text-[var(--text-danger)] text-[11px] flex items-center gap-2">
                                    <AlertTriangle size={14} className="shrink-0" />
                                    <span>{authError}</span>
                                </div>
                            )}
                            <button type="submit" className="iqs-btn-primary h-11">
                                <ShieldCheck size={16} />
                                <span>验证并进入大模型管理</span>
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
                        {/* 左栏：提供商列表与激活状态 */}
                        <div
                            className={`w-full md:w-72 border-r ${
                                isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
                            } p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    服务提供商 ({Object.keys(configState.profiles).length})
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAddProvider}
                                    className="h-8 px-2.5 rounded-md bg-primary text-white text-[11px] font-black flex items-center gap-1 hover:opacity-90 transition-all cursor-pointer"
                                >
                                    <Plus size={13} />
                                    <span>新增</span>
                                </button>
                            </div>

                            <div className="space-y-2.5 flex-1">
                                {(Object.entries(configState.profiles) as Array<[string, AIProfile]>).map(([key, prof]) => {
                                    const isSelected = key === selectedKey;
                                    const isActive = key === configState.active_profile;
                                    return (
                                        <div
                                            key={key}
                                            onClick={() => {
                                                setSelectedKey(key);
                                                setStatusBanner(null);
                                            }}
                                            className={`p-3.5 rounded-md border transition-all cursor-pointer space-y-2 ${
                                                isSelected
                                                    ? isDark
                                                        ? 'bg-slate-800 border-primary shadow-sm'
                                                        : 'bg-white border-primary shadow-sm'
                                                    : isDark
                                                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                                                    : 'bg-white/70 border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`text-[13px] font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    {prof.name}
                                                </span>
                                                {isActive && (
                                                    <span className="iqs-badge shrink-0">
                                                        当前激活
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                                                <span className="uppercase">{prof.protocol || 'openai'}</span>
                                                <span className="truncate max-w-[130px]">{prof.model || '未选模型'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 恢复默认配置 */}
                            <div className="pt-3 border-t border-[var(--border-line-r)] space-y-2">
                                {confirmReset ? (
                                    <ConfirmInline
                                        message="确认恢复默认 config.json 预设？"
                                        onConfirm={handleResetDefaults}
                                        onCancel={() => setConfirmReset(false)}
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmReset(true)}
                                        className={`w-full h-9 rounded-md border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                            isDark
                                                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                                                : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        }`}
                                    >
                                        <RotateCcw size={13} />
                                        <span>重置为系统默认预设</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 右栏：当前选中提供商的详细表单 */}
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-6">
                            {statusBanner && (
                                <div
                                    className={`p-3.5 rounded-md border text-[12px] flex items-center justify-between gap-3 ${
                                        statusBanner.type === 'ok'
                                            ? 'bg-[var(--state-up)]/10 border-[var(--state-up)]/30 text-[var(--text-ok)]'
                                            : 'bg-[var(--alert-red)]/10 border-[var(--alert-red)]/30 text-[var(--text-danger)]'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {statusBanner.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                        <span>{statusBanner.text}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setStatusBanner(null)}
                                        className="text-[11px] underline opacity-75 hover:opacity-100"
                                    >
                                        关闭
                                    </button>
                                </div>
                            )}

                            {currentProfile ? (
                                <>
                                    {/* 顶部动作栏：激活切换与删除 */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-line-r)]">
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    {currentProfile.name}
                                                </h3>
                                                <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--input-bg)] text-[var(--text-muted)]">
                                                    ID: {selectedKey}
                                                </code>
                                            </div>
                                            <p className="text-[11px] text-[var(--text-muted)] mt-1">
                                                配置变更将自动持久化保存；点击右侧「设为当前激活」即可切换全局 AI 推理引擎。
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2.5">
                                            {configState.active_profile === selectedKey ? (
                                                <div className="h-11 px-4 rounded-md bg-[var(--state-up)]/15 border border-[var(--state-up)]/30 text-[var(--text-ok)] text-xs font-black flex items-center gap-2">
                                                    <CheckCircle2 size={16} />
                                                    <span>当前已激活</span>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleActivateProfile(selectedKey)}
                                                    className="iqs-btn-primary h-11 px-5 w-auto"
                                                >
                                                    <CheckCircle2 size={16} />
                                                    <span>设为当前激活</span>
                                                </button>
                                            )}

                                            {Object.keys(configState.profiles).length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteKey(selectedKey)}
                                                    className="h-11 w-11 aspect-square rounded-md border border-[var(--border-line-r)] text-[var(--text-danger)] hover:bg-[var(--alert-red)]/10 flex items-center justify-center transition-all cursor-pointer"
                                                    title="删除该提供商"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {confirmDeleteKey === selectedKey && (
                                        <ConfirmInline
                                            message={`确认删除提供商「${currentProfile.name}」？`}
                                            onConfirm={() => handleDeleteProvider(selectedKey)}
                                            onCancel={() => setConfirmDeleteKey(null)}
                                        />
                                    )}

                                    {/* 表单网格 */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* 提供商名称 */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-[var(--text-muted)]">
                                                <Server size={13} className="text-primary" />
                                                <span>提供商名称 (Provider Name)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={currentProfile.name}
                                                onChange={e => updateCurrentProfile({ name: e.target.value })}
                                                placeholder="例如：DeepSeek 官方 / 阿里百炼 / 内网 Qwen"
                                                className="iqs-input h-11"
                                            />
                                        </div>

                                        {/* 协议类型 */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-[var(--text-muted)]">
                                                <Layers size={13} className="text-primary" />
                                                <span>接口协议类型 (Protocol)</span>
                                            </label>
                                            <select
                                                value={currentProfile.protocol || 'openai'}
                                                onChange={e => updateCurrentProfile({ protocol: e.target.value as AIProtocolType })}
                                                className="iqs-input h-11"
                                            >
                                                {PROTOCOL_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 接入地址 */}
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-[var(--text-muted)]">
                                                <Globe size={13} className="text-primary" />
                                                <span>接入地址 (Endpoint / Base URL)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={currentProfile.endpoint}
                                                onChange={e => updateCurrentProfile({ endpoint: e.target.value })}
                                                placeholder="https://api.deepseek.com/v1 或 https://api.openai.com/v1/chat/completions"
                                                className="iqs-input h-11 font-mono"
                                            />
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-muted)]">
                                                <span>对话端点：{resolvedEndpoints.chatUrl || '—'}</span>
                                                <span>模型拉取端点：{resolvedEndpoints.modelsUrl || '—'}</span>
                                            </div>
                                        </div>

                                        {/* API Key */}
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-[var(--text-muted)]">
                                                <Key size={13} className="text-primary" />
                                                <span>API 密钥 (API Key)</span>
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type={showApiKey ? 'text' : 'password'}
                                                    value={currentProfile.apiKey || ''}
                                                    onChange={e => updateCurrentProfile({ apiKey: e.target.value })}
                                                    placeholder="sk-... （若留空则自动回退读取环境变量 API_KEY）"
                                                    className="iqs-input h-11 flex-1 font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKey(v => !v)}
                                                    className="h-11 w-11 aspect-square rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-primary flex items-center justify-center transition-all cursor-pointer"
                                                    title={showApiKey ? '隐藏密钥' : '显示密钥'}
                                                >
                                                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* 模型拉取与模型选择 */}
                                        <div className="space-y-2 md:col-span-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-[var(--text-muted)]">
                                                    <Cpu size={13} className="text-primary" />
                                                    <span>模型名称与远端拉取 (Model Selection)</span>
                                                </label>
                                                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                                    已缓存模型：{(currentProfile.models || []).length} 个
                                                </span>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                {/* 模型直接输入 */}
                                                <input
                                                    type="text"
                                                    value={currentProfile.model}
                                                    onChange={e => updateCurrentProfile({ model: e.target.value })}
                                                    placeholder="输入或从右侧下拉选择模型名，如 deepseek-chat / qwen3.5-9b"
                                                    className="iqs-input h-11 flex-1 font-mono"
                                                />

                                                {/* 已拉取模型快速选择下拉框 */}
                                                {(currentProfile.models || []).length > 0 && (
                                                    <select
                                                        value={
                                                            (currentProfile.models || []).includes(currentProfile.model)
                                                                ? currentProfile.model
                                                                : ''
                                                        }
                                                        onChange={e => {
                                                            if (e.target.value) {
                                                                updateCurrentProfile({ model: e.target.value });
                                                            }
                                                        }}
                                                        className="iqs-input h-11 sm:w-56 font-mono"
                                                        title="从已拉取的模型列表中选择"
                                                    >
                                                        <option value="" disabled>
                                                            — 选择已拉取模型 ({currentProfile.models?.length}) —
                                                        </option>
                                                        {(currentProfile.models || []).map(m => (
                                                            <option key={m} value={m}>
                                                                {m}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}

                                                {/* 远端拉取模型按钮 */}
                                                <button
                                                    type="button"
                                                    onClick={handleFetchModels}
                                                    disabled={isFetchingModels || !currentProfile.endpoint.trim()}
                                                    className="h-11 px-4 rounded-md border border-primary/40 bg-primary/10 text-primary text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shrink-0 cursor-pointer disabled:opacity-50"
                                                >
                                                    <RefreshCw size={15} className={isFetchingModels ? 'animate-spin' : ''} />
                                                    <span>{isFetchingModels ? '拉取中...' : '拉取模型'}</span>
                                                </button>
                                            </div>

                                            {/* 已拉取模型胶囊云（点击即选） */}
                                            {(currentProfile.models || []).length > 0 && (
                                                <div className="pt-2 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                                                    {(currentProfile.models || []).map(m => {
                                                        const active = m === currentProfile.model;
                                                        return (
                                                            <button
                                                                key={m}
                                                                type="button"
                                                                onClick={() => updateCurrentProfile({ model: m })}
                                                                className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                                                                    active
                                                                        ? 'bg-primary text-white border-primary font-bold'
                                                                        : 'bg-[var(--input-bg)] text-[var(--text-muted)] border-[var(--input-border)] hover:border-primary/50'
                                                                }`}
                                                            >
                                                                {m}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div
                    className={`p-6 border-t ${
                        isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'
                    } flex justify-between items-center shrink-0`}
                >
                    <p className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        当前全局激活方案：<strong className="text-primary">{configState.profiles[configState.active_profile]?.name}</strong>（{configState.profiles[configState.active_profile]?.model}）
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-8 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                            isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                    >
                        完成并返回
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIModelManagerModal;
