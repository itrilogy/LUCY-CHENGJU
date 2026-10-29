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
    Hash,
    Cookie,
    Laptop,
    Check,
} from 'lucide-react';
import {
    loadAIConfigState,
    saveAIConfigState,
    resetAIConfigState,
    renameAIProfileId,
    fetchProviderModels,
    verifyAdminPassword,
    resolveProtocolEndpoints,
    loadClientCookieConfig,
    saveClientCookieConfig,
    clearClientCookieConfig,
    hasConfiguredClientCookie,
    CLIENT_COOKIE_PROFILE_ID,
    type AIProfile,
    type AIProtocolType,
    type AIConfigState,
    type ClientCookieLLMConfig,
} from '../services/aiService';
import { ConfirmInline } from './ui/ConfirmInline';
import { Switch } from './ui/Switch';

interface AIModelManagerModalProps {
    open: boolean;
    /**
     * - `'admin'`：管理端全局配置模式（从版权弹窗「模型」按钮进入，需 ENV 管理密码鉴权，可配置多服务商或指定使用客户端 Cookie 模型）
     * - `'client'`：本地客户端配置模式（从主页面顶栏「本地模型」按钮进入，免管理密码，配置直接写入当前浏览器 `document.cookie`）
     */
    mode?: 'admin' | 'client';
    onClose: () => void;
    isDark: boolean;
    onOpenClientModal?: () => void;
}

const PROTOCOL_OPTIONS: Array<{ value: AIProtocolType; label: string }> = [
    { value: 'openai', label: 'OpenAI 兼容 (v1/chat/completions)' },
    { value: 'anthropic', label: 'Anthropic Claude (v1/messages)' },
    { value: 'gemini', label: 'Google Gemini (v1beta/models)' },
    { value: 'custom', label: '自定义直连端点 (Custom URL)' },
];

const CLIENT_QUICK_PRESETS: Array<{
    label: string;
    id: string;
    name: string;
    protocol: AIProtocolType;
    endpoint: string;
    model: string;
}> = [
    {
        label: '本地 LMStudio (:1234)',
        id: 'local_lmstudio',
        name: '本地 LMStudio',
        protocol: 'openai',
        endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
        model: 'qwen/qwen3.6-35b-a3b',
    },
    {
        label: '本地 Ollama (:11434)',
        id: 'local_ollama',
        name: '本地 Ollama',
        protocol: 'openai',
        endpoint: 'http://127.0.0.1:11434/v1/chat/completions',
        model: 'qwen2.5:14b',
    },
    {
        label: 'DeepSeek 云端',
        id: 'client_deepseek',
        name: '个人 DeepSeek',
        protocol: 'openai',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat',
    },
    {
        label: 'SiliconFlow 硅基流动',
        id: 'client_siliconflow',
        name: '个人 SiliconFlow',
        protocol: 'openai',
        endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
        model: 'Qwen/Qwen2.5-72B-Instruct',
    },
];

const SESSION_AUTH_KEY = 'iqs_admin_unlocked_v1';

export const AIModelManagerModal: React.FC<AIModelManagerModalProps> = ({
    open,
    mode = 'admin',
    onClose,
    isDark,
    onOpenClientModal,
}) => {
    const isClientMode = mode === 'client';

    const [unlocked, setUnlocked] = useState<boolean>(() => {
        if (typeof window === 'undefined' || !window.sessionStorage) return false;
        return window.sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
    });
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);

    // Admin Mode State
    const [configState, setConfigState] = useState<AIConfigState>({
        active_profile: 'deepseek_public',
        profiles: {},
    });
    const [selectedKey, setSelectedKey] = useState<string>('deepseek_public');
    const [editableId, setEditableId] = useState<string>('deepseek_public');

    // Client Cookie Mode State
    const [clientConfig, setClientConfig] = useState<ClientCookieLLMConfig>(() => loadClientCookieConfig());
    const [cookieConfigured, setCookieConfigured] = useState<boolean>(() => hasConfiguredClientCookie());

    const [showApiKey, setShowApiKey] = useState(false);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [statusBanner, setStatusBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setAuthError(null);
        setStatusBanner(null);
        setConfirmReset(false);
        setConfirmDeleteKey(null);
        setClientConfig(loadClientCookieConfig());
        setCookieConfigured(hasConfiguredClientCookie());

        loadAIConfigState().then(state => {
            setConfigState(state);
            const initKey = state.active_profile || Object.keys(state.profiles)[0] || '';
            setSelectedKey(initKey);
            setEditableId(initKey);
        });
    }, [open, mode]);

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

    /* ────────────────────── Admin 模式操作逻辑 ────────────────────── */

    const currentAdminProfile: AIProfile | undefined = configState.profiles[selectedKey];
    const isBuiltinClientSlot = selectedKey === CLIENT_COOKIE_PROFILE_ID;

    const updateAdminProfile = (patch: Partial<AIProfile>) => {
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

    const handleCommitRenameId = () => {
        if (!selectedKey || isBuiltinClientSlot) return;
        const res = renameAIProfileId(configState, selectedKey, editableId);
        if (res.ok === false) {
            setStatusBanner({ type: 'err', text: res.error });
            setEditableId(selectedKey);
            return;
        }
        setConfigState(res.nextState);
        setSelectedKey(res.newId);
        setEditableId(res.newId);
        if (res.newId !== selectedKey) {
            setStatusBanner({ type: 'ok', text: `已将提供商标识 ID 从「${selectedKey}」更新为「${res.newId}」。` });
        }
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
        if (key === CLIENT_COOKIE_PROFILE_ID) {
            setStatusBanner({
                type: 'ok',
                text: '已将全局策略设为「使用本地客户端模型 (Browser Cookie)」，内部大模型服务已解耦。',
            });
        } else {
            setStatusBanner({
                type: 'ok',
                text: `已激活提供商「${p.name}」（当前模型：${p.model || '未指定'}）`,
            });
        }
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
        setEditableId(newKey);
        saveAIConfigState(nextState);
        setStatusBanner({ type: 'ok', text: `已新增提供商「${newProfile.name}」，可自定义其 ID、接入地址与密钥。` });
    };

    const handleDeleteProvider = (key: string) => {
        if (key === CLIENT_COOKIE_PROFILE_ID) {
            setStatusBanner({ type: 'err', text: '内置「本地客户端模型 (Browser Cookie)」选项不可删除。' });
            setConfirmDeleteKey(null);
            return;
        }
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
        if (selectedKey === key) {
            setSelectedKey(nextActive);
            setEditableId(nextActive);
        }
        saveAIConfigState(nextState);
        setConfirmDeleteKey(null);
        setStatusBanner({ type: 'ok', text: `已删除提供商「${removedName}」` });
    };

    /* ────────────────────── Client Cookie 模式操作逻辑 ────────────────────── */

    const updateClientCookie = (patch: Partial<ClientCookieLLMConfig>, quiet = false) => {
        const next: ClientCookieLLMConfig = {
            ...clientConfig,
            ...patch,
        };
        setClientConfig(next);
        saveClientCookieConfig(next);
        setCookieConfigured(hasConfiguredClientCookie());
        if (!quiet) {
            setStatusBanner({ type: 'ok', text: '客户端模型配置已实时写入浏览器 Cookie (iqs_client_llm_v1)。' });
        }
    };

    const handleClearClientCookie = () => {
        const fresh = clearClientCookieConfig();
        setClientConfig(fresh);
        setCookieConfigured(false);
        setConfirmReset(false);
        setStatusBanner({ type: 'ok', text: '已清除浏览器中的客户端模型 Cookie 配置。' });
    };

    /* ────────────────────── 共用模型拉取逻辑（Admin & Client 复用） ────────────────────── */

    const activeTargetProfile: AIProfile | ClientCookieLLMConfig | undefined = isClientMode
        ? clientConfig
        : currentAdminProfile;

    const handleFetchModels = async () => {
        if (!activeTargetProfile) return;
        setIsFetchingModels(true);
        setStatusBanner(null);
        try {
            const models = await fetchProviderModels(activeTargetProfile, isClientMode);
            const nextModel = models.includes(activeTargetProfile.model)
                ? activeTargetProfile.model
                : models[0];

            if (isClientMode) {
                updateClientCookie({ models, model: nextModel }, true);
            } else {
                updateAdminProfile({ models, model: nextModel });
            }
            setStatusBanner({
                type: 'ok',
                text: `成功从远端拉取 ${models.length} 个可用模型，可在下拉框或胶囊标签中直接选择。`,
            });
        } catch (err: any) {
            setStatusBanner({
                type: 'err',
                text:
                    err?.message ||
                    '拉取模型列表失败，请检查接入地址、协议类型、API Key 或本地服务是否已开启 CORS 跨域。',
            });
        } finally {
            setIsFetchingModels(false);
        }
    };

    const handleResetAdminDefaults = async () => {
        const fresh = await resetAIConfigState();
        setConfigState(fresh);
        setSelectedKey(fresh.active_profile);
        setEditableId(fresh.active_profile);
        setConfirmReset(false);
        setStatusBanner({ type: 'ok', text: '已恢复系统默认大模型配置方案（config.json）。' });
    };

    const resolvedEndpoints = activeTargetProfile
        ? resolveProtocolEndpoints(
              activeTargetProfile.endpoint,
              activeTargetProfile.protocol || 'openai',
              activeTargetProfile.model
          )
        : { chatUrl: '', modelsUrl: '' };

    const adminForcesClientCookie = configState.active_profile === CLIENT_COOKIE_PROFILE_ID;

    /* ────────────────────── 共用配置表单渲染器（Admin 与 Client 100% 复用） ────────────────────── */

    const renderProfileFormFields = (
        prof: AIProfile | ClientCookieLLMConfig,
        onPatch: (patch: Partial<AIProfile & ClientCookieLLMConfig>) => void,
        isClientForm: boolean
    ) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 提供商唯一标识 ID（可编辑与可管理） */}
            <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Hash size={13} className="text-primary" />
                    <span>提供商标识 ID (Provider ID · 可编辑)</span>
                </label>
                {isClientForm ? (
                    <input
                        type="text"
                        value={prof.id || 'local_client'}
                        onChange={e => onPatch({ id: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                        placeholder="例如：local_lmstudio / my_deepseek"
                        className="iqs-input h-11 font-mono"
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={editableId}
                            onChange={e => setEditableId(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCommitRenameId();
                                }
                            }}
                            placeholder="字母/数字/下划线，如 deepseek_prod"
                            className="iqs-input h-11 flex-1 font-mono"
                        />
                        <button
                            type="button"
                            onClick={handleCommitRenameId}
                            disabled={editableId.trim() === selectedKey}
                            className="h-11 px-3.5 rounded-md border border-primary/40 bg-primary/10 text-primary text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-primary hover:text-white transition-all shrink-0 cursor-pointer disabled:opacity-40"
                            title="应用并保存新 ID"
                        >
                            <Check size={14} />
                            <span>应用 ID</span>
                        </button>
                    </div>
                )}
            </div>

            {/* 提供商名称 */}
            <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Server size={13} className="text-primary" />
                    <span>提供商名称 (Provider Name)</span>
                </label>
                <input
                    type="text"
                    value={prof.name}
                    onChange={e => onPatch({ name: e.target.value })}
                    placeholder="例如：DeepSeek 官方 / 本地 LMStudio / 阿里百炼"
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
                    value={prof.protocol || 'openai'}
                    onChange={e => onPatch({ protocol: e.target.value as AIProtocolType })}
                    className="iqs-input h-11"
                >
                    {PROTOCOL_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* API Key */}
            <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Key size={13} className="text-primary" />
                    <span>API 密钥 (API Key)</span>
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type={showApiKey ? 'text' : 'password'}
                        value={prof.apiKey || ''}
                        onChange={e => onPatch({ apiKey: e.target.value })}
                        placeholder={
                            isClientForm
                                ? 'sk-... （本地 LMStudio / Ollama 可留空或任意填写）'
                                : 'sk-... （留空则回退读取服务端环境变量 API_KEY）'
                        }
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

            {/* 接入地址 */}
            <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Globe size={13} className="text-primary" />
                    <span>接入地址 (Endpoint / Base URL)</span>
                </label>
                <input
                    type="text"
                    value={prof.endpoint}
                    onChange={e => onPatch({ endpoint: e.target.value })}
                    placeholder="http://127.0.0.1:1234/v1/chat/completions 或 https://api.deepseek.com/v1"
                    className="iqs-input h-11 font-mono"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-muted)]">
                    <span>对话端点：{resolvedEndpoints.chatUrl || '—'}</span>
                    <span>模型拉取端点：{resolvedEndpoints.modelsUrl || '—'}</span>
                </div>
            </div>

            {/* 模型拉取与选择 */}
            <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-[var(--text-muted)]">
                        <Cpu size={13} className="text-primary" />
                        <span>模型名称与远端拉取 (Model Selection)</span>
                    </label>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        已拉取模型：{(prof.models || []).length} 个
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                        type="text"
                        value={prof.model}
                        onChange={e => onPatch({ model: e.target.value })}
                        placeholder="输入或从右侧下拉选择模型名，如 deepseek-chat / qwen3.5-9b"
                        className="iqs-input h-11 flex-1 font-mono"
                    />

                    {(prof.models || []).length > 0 && (
                        <select
                            value={(prof.models || []).includes(prof.model) ? prof.model : ''}
                            onChange={e => {
                                if (e.target.value) {
                                    onPatch({ model: e.target.value });
                                }
                            }}
                            className="iqs-input h-11 sm:w-56 font-mono"
                            title="从已拉取的模型列表中选择"
                        >
                            <option value="" disabled>
                                — 选择已拉取模型 ({prof.models?.length}) —
                            </option>
                            {(prof.models || []).map(m => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        type="button"
                        onClick={handleFetchModels}
                        disabled={isFetchingModels || !prof.endpoint.trim()}
                        className="h-11 px-4 rounded-md border border-primary/40 bg-primary/10 text-primary text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shrink-0 cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={isFetchingModels ? 'animate-spin' : ''} />
                        <span>{isFetchingModels ? '拉取中...' : '拉取模型'}</span>
                    </button>
                </div>

                {(prof.models || []).length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                        {(prof.models || []).map(m => {
                            const active = m === prof.model;
                            return (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => onPatch({ model: m })}
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
    );

    return (
        <div className="fixed inset-0 z-[950] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className={`w-full ${
                    isClientMode ? 'max-w-3xl' : 'max-w-5xl'
                } max-h-[88vh] flex flex-col rounded-2xl shadow-lg overflow-hidden border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                } animate-in zoom-in-95 duration-300`}
            >
                {/* Header */}
                <div
                    className={`p-6 md:px-8 border-b ${
                        isDark ? 'border-slate-800' : 'border-slate-100'
                    } flex items-center justify-between shrink-0`}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                            {isClientMode ? <Cookie size={22} /> : <Server size={22} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {isClientMode ? '本地客户端模型配置 (Browser Cookie)' : '大模型配置与接入管理中心'}
                                </h2>
                                <span className="iqs-badge">
                                    <span className="w-2 h-2 rounded-full bg-[var(--state-up)] animate-pulse" />
                                    {isClientMode
                                        ? cookieConfigured
                                            ? `Cookie 已配置 · ${clientConfig.model}`
                                            : 'Cookie 待配置'
                                        : configState.profiles[configState.active_profile]?.name || '未激活'}
                                </span>
                            </div>
                            <p className={`text-[11px] font-bold tracking-[0.12em] uppercase mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {isClientMode
                                    ? 'Client-Side BYOK & Local LLM · 配置存储于本地浏览器 Cookie，与服务端算力彻底解耦'
                                    : 'Admin LLM Gateway Hub · 管理全局模型提供商、自定义 ID 或指派使用客户端本地 Cookie 模型'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isClientMode && unlocked && (
                            <button
                                onClick={handleLock}
                                className={`h-9 px-3 rounded-md border text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
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
                            className={`p-2.5 rounded-lg transition-all cursor-pointer ${
                                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {/* Body 分支 1：Client 模式（免管理密码，直接读写浏览器 Cookie） */}
                {isClientMode ? (
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

                        {/* 客户端激活控制与快速预设 */}
                        <div className="iqs-note flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Laptop size={15} className="text-primary" />
                                    <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        启用本机浏览器 Cookie 模型连接
                                    </span>
                                    {adminForcesClientCookie && (
                                        <span className="iqs-badge">管理端已强制指定客户端模式</span>
                                    )}
                                </div>
                                <p className="text-[11px] text-[var(--text-muted)]">
                                    开启后，AI 推理将直接使用当前浏览器 Cookie（<code className="font-mono">iqs_client_llm_v1</code>）中的地址与密钥发起连接，不依赖内部服务端配置。
                                </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-3">
                                <Switch
                                    checked={adminForcesClientCookie || clientConfig.enabled}
                                    onChange={val => updateClientCookie({ enabled: val })}
                                />
                            </div>
                        </div>

                        {/* 一键快速模板 */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] mr-1">
                                快速填入预设：
                            </span>
                            {CLIENT_QUICK_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() =>
                                        updateClientCookie({
                                            enabled: true,
                                            id: preset.id,
                                            name: preset.name,
                                            protocol: preset.protocol,
                                            endpoint: preset.endpoint,
                                            model: preset.model,
                                        })
                                    }
                                    className={`h-8 px-3 rounded-md border text-[11px] font-bold transition-all cursor-pointer ${
                                        isDark
                                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-primary'
                                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-primary'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        {/* 复用模型配置表单 */}
                        {renderProfileFormFields(clientConfig, patch => updateClientCookie(patch), true)}

                        {/* 清除 Cookie 按钮 */}
                        <div className="pt-4 border-t border-[var(--border-line-r)] flex items-center justify-between">
                            <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                存储位置：Browser Cookie (`iqs_client_llm_v1`, SameSite=Lax, Max-Age=365d)
                            </span>
                            {confirmReset ? (
                                <ConfirmInline
                                    message="确认清除本机浏览器 Cookie 模型配置？"
                                    onConfirm={handleClearClientCookie}
                                    onCancel={() => setConfirmReset(false)}
                                />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirmReset(true)}
                                    className="h-9 px-3.5 rounded-md border border-[var(--border-line-r)] text-[var(--text-danger)] hover:bg-[var(--alert-red)]/10 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                    <Trash2 size={13} />
                                    <span>清除浏览器 Cookie 配置</span>
                                </button>
                            )}
                        </div>
                    </div>
                ) : !unlocked ? (
                    /* Body 分支 2：Admin 模式未解锁 → ENV 管理密码门禁 */
                    <form onSubmit={handleUnlock} className="p-12 flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-6">
                        <div className="w-16 h-16 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
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
                    /* Body 分支 3：Admin 模式已解锁 → 双栏管理工作台 */
                    <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
                        {/* 左栏：提供商列表 */}
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
                                    const isClientSlot = key === CLIENT_COOKIE_PROFILE_ID;
                                    return (
                                        <div
                                            key={key}
                                            onClick={() => {
                                                setSelectedKey(key);
                                                setEditableId(key);
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
                                                <span className={`text-[13px] font-bold truncate flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    {isClientSlot && <Cookie size={14} className="text-primary shrink-0" />}
                                                    <span className="truncate">{prof.name}</span>
                                                </span>
                                                {isActive && <span className="iqs-badge shrink-0">当前激活</span>}
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                                                <span>ID: {key}</span>
                                                <span className="truncate max-w-[110px]">
                                                    {isClientSlot ? 'Browser Cookie' : prof.model || '未选模型'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-3 border-t border-[var(--border-line-r)] space-y-2">
                                {confirmReset ? (
                                    <ConfirmInline
                                        message="确认恢复默认 config.json 预设？"
                                        onConfirm={handleResetAdminDefaults}
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

                        {/* 右栏：选中提供商详情或客户端策略说明 */}
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

                            {currentAdminProfile ? (
                                <>
                                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-line-r)]">
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    {currentAdminProfile.name}
                                                </h3>
                                                <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--input-bg)] text-[var(--text-muted)]">
                                                    ID: {selectedKey}
                                                </code>
                                            </div>
                                            <p className="text-[11px] text-[var(--text-muted)] mt-1">
                                                {isBuiltinClientSlot
                                                    ? '激活此项后，系统将与内部大模型服务解耦，强制使用各客户端浏览器 Cookie 中配置的模型参数进行连接。'
                                                    : '支持直接修改提供商 ID、接入地址、协议类型与模型；点击右侧「设为当前激活」即可全局生效。'}
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

                                            {!isBuiltinClientSlot && Object.keys(configState.profiles).length > 1 && (
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
                                            message={`确认删除提供商「${currentAdminProfile.name}」？`}
                                            onConfirm={() => handleDeleteProvider(selectedKey)}
                                            onCancel={() => setConfirmDeleteKey(null)}
                                        />
                                    )}

                                    {isBuiltinClientSlot ? (
                                        <div className="space-y-6">
                                            <div className="iqs-note space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-primary font-black text-sm">
                                                        <Cookie size={18} />
                                                        <span>客户端浏览器 Cookie 解耦模式说明</span>
                                                    </div>
                                                    <span className="iqs-badge">
                                                        {cookieConfigured ? '当前浏览器已配置 Cookie' : '当前浏览器未配置 Cookie'}
                                                    </span>
                                                </div>
                                                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                                                    当管理员将全局激活方案切换为 <strong>「本地客户端模型 (Browser Cookie)」</strong> 时，平台不再调用内部固定大模型，而是读取每位用户浏览器本地 Cookie（<code className="font-mono">iqs_client_llm_v1</code>）中的接入地址、协议、API Key 与模型。用户可在主页面右上角点击「本地模型配置」图标自助完成配置。
                                                </p>
                                                {cookieConfigured && (
                                                    <div className="p-4 rounded-md bg-[var(--card-bg)] border border-[var(--border-line-r)] font-mono text-[11px] space-y-1.5">
                                                        <div className="font-bold text-primary">当前浏览器已检出的 Cookie 模型配置预览：</div>
                                                        <div>提供商 ID：{clientConfig.id} · 名称：{clientConfig.name}</div>
                                                        <div>协议类型：{clientConfig.protocol} · 模型：{clientConfig.model}</div>
                                                        <div>接入地址：{clientConfig.endpoint}</div>
                                                    </div>
                                                )}
                                                {onOpenClientModal && (
                                                    <button
                                                        type="button"
                                                        onClick={onOpenClientModal}
                                                        className="h-11 px-5 rounded-md border border-primary/40 bg-primary/10 text-primary text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 hover:bg-primary hover:text-white transition-all cursor-pointer"
                                                    >
                                                        <Laptop size={15} />
                                                        <span>立即前往配置当前浏览器的客户端模型 (Cookie)</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        renderProfileFormFields(currentAdminProfile, patch => updateAdminProfile(patch), false)
                                    )}
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
                        {isClientMode ? (
                            <>
                                本地 Cookie 状态：
                                <strong className="text-primary ml-1">
                                    {cookieConfigured
                                        ? `${clientConfig.name} (${clientConfig.model})`
                                        : '未配置'}
                                </strong>
                            </>
                        ) : (
                            <>
                                当前全局激活方案：
                                <strong className="text-primary ml-1">
                                    {configState.profiles[configState.active_profile]?.name}
                                </strong>
                                （{configState.active_profile === CLIENT_COOKIE_PROFILE_ID ? '读取客户端 Cookie' : configState.profiles[configState.active_profile]?.model}）
                            </>
                        )}
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-8 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                            isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                    >
                        确定
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIModelManagerModal;
