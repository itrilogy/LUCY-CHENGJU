import { QCToolType } from "../types";
import { QC_TOOL_TO_KIND } from "../dsl/registry";

export type AIProtocolType = "openai" | "anthropic" | "gemini" | "custom";

export interface AIProfile {
    id?: string;
    /** 提供商名称，如 "DeepSeek 官方推理"、"阿里百炼"、"本地 LMStudio" */
    name: string;
    /** 协议类型：OpenAI 兼容 / Anthropic Claude / Google Gemini / 自定义端点 */
    protocol?: AIProtocolType;
    /** 接入地址（支持根地址如 https://api.openai.com/v1 或完整路径 /v1/chat/completions） */
    endpoint: string;
    /** 专属 API Key（可选；留空时回退使用 ENV 全局 API_KEY） */
    apiKey?: string;
    /** 当前选中的模型名称 */
    model: string;
    /** 已拉取或缓存的可用模型列表 */
    models?: string[];
    /** 最大输出 Token 上限（默认 8192） */
    max_tokens?: number;
}

export interface AIConfigState {
    active_profile: string;
    profiles: Record<string, AIProfile>;
}

/**
 * 客户端本地浏览器（Cookie）存储的大模型配置结构
 * 核心连接字段写入 `document.cookie`（~300B，严格控制在 4KB 限制以内），
 * 候选模型列表 `models[]` 分流缓存在 localStorage 以避免 Cookie 膨胀溢出。
 */
export interface ClientCookieLLMConfig {
    enabled: boolean;
    id: string;
    name: string;
    protocol: AIProtocolType;
    endpoint: string;
    apiKey: string;
    model: string;
    max_tokens: number;
    models?: string[];
}

export const CLIENT_COOKIE_PROFILE_ID = "client_cookie";
const CLIENT_COOKIE_NAME = "iqs_client_llm_v1";
const CLIENT_MODELS_CACHE_KEY = "iqs_client_llm_models_v1";
const STORAGE_KEY = "iqs_ai_providers_v1";
export const AI_CONFIG_CHANGED_EVENT = "iqs:ai-config-changed";

export type AICompletionMeta = {
    finishReason: string | null;
    chars: number;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

let lastAICompletion: AICompletionMeta | null = null;
export function getLastAICompletion(): AICompletionMeta | null {
    return lastAICompletion;
}

interface ChartSpec {
    ai_config: AIConfigState;
}

let cachedSpec: ChartSpec | null = null;

/**
 * Runtime configuration interface
 */
declare global {
    interface Window {
        APP_CONFIG?: {
            API_KEY?: string;
            AI_ACTIVE_PROFILE?: string;
            IQS_ADMIN_PASSWORD?: string;
        };
    }
}

/**
 * 获取管理密码（优先读取 ENV / window.APP_CONFIG，默认回退为 'luxi2026'）
 */
export function getAdminPassword(): string {
    const candidates = [
        typeof window !== "undefined" ? window.APP_CONFIG?.IQS_ADMIN_PASSWORD : undefined,
        process.env.IQS_ADMIN_PASSWORD,
    ];
    for (const c of candidates) {
        if (typeof c === "string" && c.trim().length > 0) {
            return c.trim();
        }
    }
    return "luxi2026";
}

export function verifyAdminPassword(input: string): boolean {
    return String(input ?? "").trim() === getAdminPassword();
}

/* ────────────────────── 客户端 Cookie 模型配置读写与管理 ────────────────────── */

export function getDefaultClientCookieConfig(): ClientCookieLLMConfig {
    return {
        enabled: false,
        id: "local_client",
        name: "客户端本地模型",
        protocol: "openai",
        endpoint: "",
        apiKey: "",
        model: "",
        max_tokens: 8192,
        models: [],
    };
}

/**
 * 从浏览器 `document.cookie` 读取客户端本地模型配置
 */
export function loadClientCookieConfig(): ClientCookieLLMConfig {
    const fallback = getDefaultClientCookieConfig();
    if (typeof document === "undefined") return fallback;

    try {
        const prefix = `${CLIENT_COOKIE_NAME}=`;
        const cookieRow = document.cookie
            .split("; ")
            .find(row => row.startsWith(prefix));
        if (!cookieRow) return fallback;

        const rawVal = decodeURIComponent(cookieRow.slice(prefix.length));
        const parsed = JSON.parse(rawVal);
        let cachedModels: string[] = [];
        if (typeof window !== "undefined" && window.localStorage) {
            try {
                const mRaw = window.localStorage.getItem(CLIENT_MODELS_CACHE_KEY);
                if (mRaw) cachedModels = JSON.parse(mRaw);
            } catch { }
        }
        return {
            ...fallback,
            ...parsed,
            models: Array.isArray(cachedModels) && cachedModels.length > 0
                ? cachedModels
                : (Array.isArray(parsed?.models) ? parsed.models : []),
        };
    } catch (e) {
        console.warn("[Client Cookie LLM] Failed to parse cookie:", e);
        return fallback;
    }
}

/**
 * 判断客户端是否已在浏览器 Cookie 中配置了有效的模型端点与模型名
 */
export function hasConfiguredClientCookie(): boolean {
    if (typeof document === "undefined") return false;
    const prefix = `${CLIENT_COOKIE_NAME}=`;
    const exists = document.cookie.split("; ").some(row => row.startsWith(prefix));
    if (!exists) return false;
    const cfg = loadClientCookieConfig();
    return Boolean(cfg.endpoint && cfg.endpoint.trim().length > 0 && cfg.model && cfg.model.trim().length > 0);
}

/**
 * 将客户端本地模型配置写入浏览器 `document.cookie`（有效期 365 天，SameSite=Lax）
 */
export function saveClientCookieConfig(config: ClientCookieLLMConfig): void {
    if (typeof document === "undefined") return;

    // 仅将核心连接配置写入 Cookie（约 250 Bytes，规避 4KB 上限）
    const cookiePayload = {
        enabled: Boolean(config.enabled),
        id: String(config.id || "local_client").trim(),
        name: String(config.name || "客户端本地模型").trim(),
        protocol: config.protocol || "openai",
        endpoint: String(config.endpoint || "").trim(),
        apiKey: String(config.apiKey || "").trim(),
        model: String(config.model || "").trim(),
        max_tokens: Number(config.max_tokens) || 8192,
    };

    const encoded = encodeURIComponent(JSON.stringify(cookiePayload));
    document.cookie = `${CLIENT_COOKIE_NAME}=${encoded}; path=/; max-age=31536000; SameSite=Lax`;

    if (typeof window !== "undefined" && window.localStorage && Array.isArray(config.models)) {
        try {
            window.localStorage.setItem(CLIENT_MODELS_CACHE_KEY, JSON.stringify(config.models));
        } catch { }
    }

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(AI_CONFIG_CHANGED_EVENT, { detail: { clientCookie: cookiePayload } }));
    }
}

/**
 * 清除浏览器中的客户端模型 Cookie 配置
 */
export function clearClientCookieConfig(): ClientCookieLLMConfig {
    if (typeof document !== "undefined") {
        document.cookie = `${CLIENT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    }
    if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(CLIENT_MODELS_CACHE_KEY);
    }
    const fresh = getDefaultClientCookieConfig();
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(AI_CONFIG_CHANGED_EVENT, { detail: { clientCookie: null } }));
    }
    return fresh;
}

/* ────────────────────── 管理端全局配置读写与 ID 重命名 ────────────────────── */

const BUILTIN_CLIENT_PROFILE: AIProfile = {
    id: CLIENT_COOKIE_PROFILE_ID,
    name: "本地客户端模型 (Browser Cookie)",
    protocol: "openai",
    endpoint: "http://127.0.0.1:1234/v1/chat/completions",
    model: "client-cookie-model",
    models: [],
    max_tokens: 8192,
};

async function getChartSpec(): Promise<ChartSpec> {
    if (cachedSpec) return cachedSpec;
    try {
        const res = await fetch("/config.json");
        if (!res.ok) throw new Error("Failed to load config.json");
        cachedSpec = await res.json();
        return cachedSpec!;
    } catch (e) {
        console.error("Config Load Error:", e);
        return {
            ai_config: {
                active_profile: "deepseek_public",
                profiles: {
                    deepseek_public: {
                        name: "DeepSeek 官方推理",
                        protocol: "openai",
                        endpoint: "https://api.deepseek.com/v1/chat/completions",
                        model: "deepseek-chat",
                        models: ["deepseek-chat", "deepseek-reasoner"],
                        max_tokens: 8192,
                    },
                    [CLIENT_COOKIE_PROFILE_ID]: BUILTIN_CLIENT_PROFILE,
                },
            },
        };
    }
}

function readStoredConfig(): AIConfigState | null {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.profiles && typeof parsed.profiles === "object") {
            return parsed as AIConfigState;
        }
    } catch (e) {
        console.warn("[AI Config] Failed to parse localStorage config:", e);
    }
    return null;
}

/**
 * 获取合并后的完整大模型配置状态（确保始终包含 `client_cookie` 客户端模型选项）
 */
export async function loadAIConfigState(): Promise<AIConfigState> {
    const spec = await getChartSpec();
    const stored = readStoredConfig();
    const envActive =
        (typeof window !== "undefined" ? window.APP_CONFIG?.AI_ACTIVE_PROFILE : undefined) ||
        process.env.AI_ACTIVE_PROFILE;

    const mergedProfiles: Record<string, AIProfile> = {};
    for (const [k, v] of Object.entries(spec.ai_config.profiles || {})) {
        mergedProfiles[k] = {
            protocol: "openai",
            max_tokens: 8192,
            ...v,
            id: k,
        };
    }
    if (!mergedProfiles[CLIENT_COOKIE_PROFILE_ID]) {
        mergedProfiles[CLIENT_COOKIE_PROFILE_ID] = { ...BUILTIN_CLIENT_PROFILE };
    }

    if (stored && stored.profiles) {
        const userProfiles: Record<string, AIProfile> = {};
        for (const [k, v] of Object.entries(stored.profiles)) {
            userProfiles[k] = {
                protocol: "openai",
                max_tokens: 8192,
                ...v,
                id: k,
            };
        }
        // 确保「本地客户端模型 (Browser Cookie)」选项始终存在于管理列表中
        if (!userProfiles[CLIENT_COOKIE_PROFILE_ID]) {
            userProfiles[CLIENT_COOKIE_PROFILE_ID] = { ...BUILTIN_CLIENT_PROFILE };
        }
        const activeKey =
            stored.active_profile && userProfiles[stored.active_profile]
                ? stored.active_profile
                : Object.keys(userProfiles)[0] || spec.ai_config.active_profile;
        return {
            active_profile: activeKey,
            profiles: userProfiles,
        };
    }

    const defaultActive =
        envActive && mergedProfiles[envActive]
            ? envActive
            : spec.ai_config.active_profile;

    return {
        active_profile: defaultActive,
        profiles: mergedProfiles,
    };
}

/**
 * 保存大模型配置状态并广播全局变更事件
 */
export function saveAIConfigState(state: AIConfigState): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(AI_CONFIG_CHANGED_EVENT, { detail: state }));
}

/**
 * 重命名提供商 ID（保持字典顺序与 active_profile 引用同步，校验格式与唯一性）
 */
export function renameAIProfileId(
    state: AIConfigState,
    oldId: string,
    rawNewId: string
): { ok: true; nextState: AIConfigState; newId: string } | { ok: false; error: string } {
    if (oldId === CLIENT_COOKIE_PROFILE_ID) {
        return { ok: false, error: `内置策略项「${CLIENT_COOKIE_PROFILE_ID}」为客户端 Cookie 绑定槽位，不支持修改 ID。` };
    }
    const newId = String(rawNewId ?? "").trim();
    if (!newId) {
        return { ok: false, error: "提供商 ID 不能为空。" };
    }
    if (!/^[a-zA-Z0-9_-]{2,40}$/.test(newId)) {
        return { ok: false, error: "ID 仅支持字母、数字、下划线(_)与短横线(-)，长度 2–40 位。" };
    }
    if (newId === oldId) {
        return { ok: true, nextState: state, newId };
    }
    if (state.profiles[newId]) {
        return { ok: false, error: `提供商 ID「${newId}」已存在，请使用其他唯一标识。` };
    }

    const nextProfiles: Record<string, AIProfile> = {};
    for (const [k, v] of Object.entries(state.profiles)) {
        if (k === oldId) {
            nextProfiles[newId] = { ...v, id: newId };
        } else {
            nextProfiles[k] = v;
        }
    }

    const nextState: AIConfigState = {
        active_profile: state.active_profile === oldId ? newId : state.active_profile,
        profiles: nextProfiles,
    };
    saveAIConfigState(nextState);
    return { ok: true, nextState, newId };
}

/**
 * 重置大模型配置为默认 config.json 状态
 */
export async function resetAIConfigState(): Promise<AIConfigState> {
    if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
    }
    const fresh = await loadAIConfigState();
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(AI_CONFIG_CHANGED_EVENT, { detail: fresh }));
    }
    return fresh;
}

/**
 * 解析当前最终生效的推理 Profile（处理管理端 `client_cookie` 指派或客户端本地优先覆盖）
 */
export async function resolveEffectiveAIProfile(): Promise<{
    source: "admin" | "client_cookie";
    profile: AIProfile;
}> {
    const configState = await loadAIConfigState();
    const clientCfg = loadClientCookieConfig();

    // 情况 1：管理员将全局激活项设为 `client_cookie`（强制解耦内部服务，走客户端各自的 Cookie）
    if (configState.active_profile === CLIENT_COOKIE_PROFILE_ID) {
        if (!hasConfiguredClientCookie()) {
            throw new Error(
                "当前系统已设置为「使用本地客户端模型」，请先点击主页面右上角的「本地模型配置」按钮配置您的浏览器模型接入参数（写入 Cookie）。"
            );
        }
        return {
            source: "client_cookie",
            profile: {
                id: clientCfg.id || CLIENT_COOKIE_PROFILE_ID,
                name: clientCfg.name || "本地客户端模型",
                protocol: clientCfg.protocol || "openai",
                endpoint: clientCfg.endpoint,
                apiKey: clientCfg.apiKey,
                model: clientCfg.model,
                models: clientCfg.models || [],
                max_tokens: clientCfg.max_tokens || 8192,
            },
        };
    }

    // 情况 2：客户端在「本地模型配置」中主动勾选了 `enabled: true`（本地浏览器覆盖优先）
    if (clientCfg.enabled && hasConfiguredClientCookie()) {
        return {
            source: "client_cookie",
            profile: {
                id: clientCfg.id || CLIENT_COOKIE_PROFILE_ID,
                name: clientCfg.name || "本地客户端模型",
                protocol: clientCfg.protocol || "openai",
                endpoint: clientCfg.endpoint,
                apiKey: clientCfg.apiKey,
                model: clientCfg.model,
                models: clientCfg.models || [],
                max_tokens: clientCfg.max_tokens || 8192,
            },
        };
    }

    // 情况 3：走管理端当前激活的服务商配置
    const activeProfile = configState.profiles[configState.active_profile];
    if (!activeProfile) {
        throw new Error(`未找到激活的大模型配置方案: ${configState.active_profile}`);
    }
    return {
        source: "admin",
        profile: activeProfile,
    };
}

/**
 * 解析当前生效的 API Key
 */
function resolveApiKey(profile: AIProfile, source: "admin" | "client_cookie" = "admin"): string {
    if (source === "client_cookie") {
        // 客户端 Cookie 模式严格使用客户端自己填写的 Key，不混用服务端内部 Key
        return String(profile.apiKey || "").trim();
    }
    const candidates = [
        profile.apiKey,
        process.env.API_KEY,
        typeof window !== "undefined" ? window.APP_CONFIG?.API_KEY : undefined,
    ];
    const found = candidates.find(k => typeof k === "string" && k.trim().length > 0);
    return found ? found.trim() : "";
}

/**
 * 根据协议类型与用户填写的接入地址，推导实际的对话请求 URL 与模型列表拉取 URL
 */
export function resolveProtocolEndpoints(
    rawEndpoint: string,
    protocol: AIProtocolType = "openai",
    model = ""
): { chatUrl: string; modelsUrl: string } {
    const trimmed = String(rawEndpoint || "").trim().replace(/\/+$/, "");
    if (!trimmed) {
        return { chatUrl: "", modelsUrl: "" };
    }

    if (protocol === "anthropic") {
        const base = trimmed.replace(/\/v1\/messages$/i, "").replace(/\/messages$/i, "");
        const withV1 = base.endsWith("/v1") ? base : `${base}/v1`;
        return {
            chatUrl: trimmed.endsWith("/messages") ? trimmed : `${withV1}/messages`,
            modelsUrl: `${withV1}/models`,
        };
    }

    if (protocol === "gemini") {
        if (trimmed.includes("/chat/completions")) {
            return {
                chatUrl: trimmed,
                modelsUrl: trimmed.replace(/\/chat\/completions$/i, "/models"),
            };
        }
        const base = trimmed.replace(/\/models\/.*$/i, "").replace(/\/models$/i, "");
        const v1beta = base.includes("/v1") ? base : `${base}/v1beta`;
        return {
            chatUrl: `${v1beta}/models/${encodeURIComponent(model || "gemini-2.0-flash")}:generateContent`,
            modelsUrl: `${v1beta}/models`,
        };
    }

    if (protocol === "custom") {
        const modelsUrl = trimmed.includes("/chat/completions")
            ? trimmed.replace(/\/chat\/completions$/i, "/models")
            : `${trimmed.replace(/\/v1$/i, "")}/v1/models`;
        return {
            chatUrl: trimmed,
            modelsUrl,
        };
    }

    if (trimmed.endsWith("/chat/completions")) {
        return {
            chatUrl: trimmed,
            modelsUrl: trimmed.replace(/\/chat\/completions$/i, "/models"),
        };
    }
    if (trimmed.endsWith("/v1")) {
        return {
            chatUrl: `${trimmed}/chat/completions`,
            modelsUrl: `${trimmed}/models`,
        };
    }
    return {
        chatUrl: `${trimmed}/v1/chat/completions`,
        modelsUrl: `${trimmed}/v1/models`,
    };
}

/**
 * 从远端提供商拉取可用模型列表
 */
export async function fetchProviderModels(
    profile: Pick<AIProfile, "endpoint" | "protocol" | "apiKey" | "model">,
    isClientMode = false
): Promise<string[]> {
    const protocol = profile.protocol || "openai";
    const apiKey = resolveApiKey(profile as AIProfile, isClientMode ? "client_cookie" : "admin");
    const { modelsUrl } = resolveProtocolEndpoints(profile.endpoint, protocol, profile.model);
    if (!modelsUrl) {
        throw new Error("请先填写有效的接入地址 (Endpoint)");
    }

    const headers: Record<string, string> = {
        Accept: "application/json",
    };

    let targetUrl = modelsUrl;
    if (protocol === "anthropic") {
        if (apiKey) headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
    } else if (protocol === "gemini" && !modelsUrl.includes("/v1/models")) {
        if (apiKey) {
            targetUrl = `${modelsUrl}${modelsUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`;
        }
    } else if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(targetUrl, {
        method: "GET",
        headers,
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`拉取模型失败 (HTTP ${res.status}): ${errText.slice(0, 160) || res.statusText}`);
    }

    const data = await res.json();
    const list: string[] = [];

    if (Array.isArray(data?.data)) {
        for (const item of data.data) {
            const id = item?.id || item?.name;
            if (typeof id === "string" && id.trim()) list.push(id.trim());
        }
    } else if (Array.isArray(data?.models)) {
        for (const item of data.models) {
            const rawName = typeof item === "string" ? item : item?.id || item?.name;
            if (typeof rawName === "string" && rawName.trim()) {
                list.push(rawName.trim().replace(/^models\//, ""));
            }
        }
    } else if (Array.isArray(data)) {
        for (const item of data) {
            const id = typeof item === "string" ? item : item?.id || item?.name;
            if (typeof id === "string" && id.trim()) list.push(id.trim());
        }
    }

    const unique = Array.from(new Set(list));
    if (unique.length === 0) {
        throw new Error("接口返回成功，但未解析到任何模型 ID，请检查端点或手动输入模型名");
    }
    return unique;
}

interface ToolDefinition {
    name: string;
    parent_type: string;
    sub_type: string;
    display_name: string;
    expertise: string;
    intent_trigger?: string[];
    description: string;
    expert_logic: string;
    syntax_rules: string;
    official_example: string;
}

let cachedTools: ToolDefinition[] | null = null;

async function getMCPTools(): Promise<ToolDefinition[]> {
    if (cachedTools) return cachedTools;
    try {
        const res = await fetch('/mcp_tools.json');
        if (!res.ok) throw new Error("Failed to load mcp_tools.json");
        cachedTools = await res.json();
        return cachedTools!;
    } catch (e) {
        console.error("MCP Tools Load Error:", e);
        return [];
    }
}

function buildIntentDiscoveryPrompt(parentType: string, allTools: ToolDefinition[]): string {
    const sameCategoryTools = allTools.filter(t => t.parent_type === parentType && t.sub_type !== 'master');
    let prompt = `You are a chart expert analyzer. Analyze the user's requirement and select the MOST MATCHING tool sub_type from the list below.\n\n`;
    prompt += `### Available Tool Catalog for Category: ${parentType}\n`;
    sameCategoryTools.forEach(t => {
        prompt += `- **${t.sub_type}**: ${t.display_name}. Expertise: ${t.expertise}. Intent: ${t.intent_trigger?.join(', ') || 'General'}\n`;
    });
    prompt += `\n### 🔴 OUTPUT RULE:\n`;
    prompt += `Return ONLY the name of the sub_type (e.g. "sankey" or "fishbone"). DO NOT add any explanation. If unsure, return "master".`;
    return prompt;
}

function buildSmartPrompt(parentType: string, subType: string | undefined, allTools: ToolDefinition[]): string {
    const master = allTools.find(t => t.parent_type === parentType && t.sub_type === 'master');
    const specific = subType ? allTools.find(t => t.parent_type === parentType && t.sub_type === subType) : null;

    const role = specific?.expertise || master?.expertise || "Expert Analyst";
    let prompt = `You are an expert ${role}.\n\n`;

    if (master) {
        prompt += `### 🟢 全局专家内核 (Master Protocol)\n${master.expert_logic}\n\n`;
    }

    if (specific) {
        prompt += `### 🔵 专项专家逻辑 (Expert Logic - ${subType})\n${specific.expert_logic}\n\n`;
        prompt += `### 📘 语法约束与范式 (Syntax & Examples)\n${specific.syntax_rules}\n\n`;
        prompt += `#### 💡 标准 DSL 范式示例:\n\`\`\`dsl\n${specific.official_example}\n\`\`\`\n\n`;
    }

    if (master) {
        prompt += `${master.syntax_rules}\n\n`;
    }

    const getConstraint5 = () => {
        if (parentType === 'vchart') return `5. **严禁外层 JSON**: 必须直接以 "Title:" 或 "Spec:" 开头输出纯文本。严禁将最终结果包裹在 {} 中。`;
        if (parentType === 'mermaid') return `5. **直接输出语法**: 严禁输出 "Spec:"。必须直接输出 Mermaid 原生指令（如 flowchart TD, pie 等）。严禁包裹在 {} 中。`;
        if (subType === 'flow') return `5. **IQS-Flow**：必须 Dict → Lane from → W；Type[?]/[+] 必须分支行并以 End 闭合；严禁 flowchart TD / graph LR / JSON / Markdown 围栏。标签优先字典引用。`;
        return `5. **标准 DSL 分级**: 必须使用 "Title:"、"# 分类"、"- 项目" 的分级结构。严禁输出任何 JSON 对象。`;
    };

    prompt += `### 🔴 输出红线 (Output Constraints):
1. 严禁返回任何 JavaScript 函数（如 formatter），必须是 100% 静态内容。
2. 仅返回纯文本内容，严禁包裹 Markdown 代码块 (\`\`\`)。
3. 严禁输出任何解释性描述。
4. **自问自答 (CoT)**: 在生成最终输出前，请先核对上述红线约束，确保 nodeKey 与层级结构完全符合示例。
${getConstraint5()}`;

    return prompt;
}

async function callAI(systemPrompt: string, userPrompt: string, maxTokens?: number) {
    const { source, profile } = await resolveEffectiveAIProfile();

    const protocol: AIProtocolType = profile.protocol || "openai";
    const apiKey = resolveApiKey(profile, source);
    const { chatUrl } = resolveProtocolEndpoints(profile.endpoint, protocol, profile.model);
    const cap = profile.max_tokens ?? maxTokens ?? 8192;

    try {
        if (protocol === "anthropic") {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
            };
            if (apiKey) headers["x-api-key"] = apiKey;

            const response = await fetch(chatUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    model: profile.model,
                    system: systemPrompt,
                    messages: [{ role: "user", content: userPrompt }],
                    max_tokens: cap,
                    temperature: 0.1,
                }),
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Anthropic API Error: ${response.status} - ${err}`);
            }
            const data = await response.json();
            const text = Array.isArray(data?.content)
                ? data.content.map((c: any) => c?.text || "").join("")
                : String(data?.completion || "");
            lastAICompletion = {
                finishReason: data?.stop_reason ?? null,
                chars: text.length,
                usage: data?.usage,
            };
            return text;
        }

        if (protocol === "gemini" && !chatUrl.includes("/chat/completions")) {
            const urlWithKey = apiKey
                ? `${chatUrl}${chatUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`
                : chatUrl;
            const response = await fetch(urlWithKey, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: cap,
                    },
                }),
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Gemini API Error: ${response.status} - ${err}`);
            }
            const data = await response.json();
            const parts = data?.candidates?.[0]?.content?.parts || [];
            const text = parts.map((p: any) => p?.text || "").join("");
            lastAICompletion = {
                finishReason: data?.candidates?.[0]?.finishReason ?? null,
                chars: text.length,
            };
            return text;
        }

        const body: Record<string, unknown> = {
            model: profile.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.1
        };
        if (typeof cap === 'number' && cap > 0) body.max_tokens = cap;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(chatUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`AI API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const msg = choice?.message || {};
        const text = String(msg.content || msg.reasoning_content || "");
        lastAICompletion = {
            finishReason: choice?.finish_reason ?? data.finish_reason ?? null,
            chars: text.length,
            usage: data.usage
        };
        if (lastAICompletion.finishReason === 'length') {
            console.warn('[AI] finish_reason=length，输出被本次请求上限截断', lastAICompletion);
        }
        return text;
    } catch (error) {
        console.error("AI Inference Failed:", error);
        throw error;
    }
}

export const generateLogicDSL = async (prompt: string, toolType: QCToolType, subType?: string) => {
    try {
        const tools = await getMCPTools();

        const parentType = toolType === QCToolType.VCHART ? 'vchart' :
                           toolType === QCToolType.MERMAID ? 'mermaid' : 
                           'iqs_native';

        let finalSubType = subType || QC_TOOL_TO_KIND[toolType];

        if (!finalSubType && (parentType === 'vchart' || parentType === 'mermaid')) {
            const intentPrompt = buildIntentDiscoveryPrompt(parentType, tools);
            const rawIntent = await callAI(intentPrompt, prompt);
            finalSubType = rawIntent.replace(/['"`\.\s]/g, '').toLowerCase().trim();
        }

        if (parentType) {
            const systemPrompt = buildSmartPrompt(parentType, finalSubType, tools);
            const text = await callAI(systemPrompt, prompt);
            return text.replace(/```\w*/g, '').replace(/```/g, '').trim();
        }

        return `Title: 生成失败\n- Error: Unsupported tool type`;
    } catch (error: any) {
        console.error("Logic DSL Gen Error:", error);
        return `Title: 生成失败\n- Error: ${error.message || error}`;
    }
};

export const generateParetoDSL = async (prompt: string) => {
    return generateLogicDSL(prompt, QCToolType.PARETO, "pareto");
};

export const generateHistogramDSL = async (prompt: string) => {
    return generateLogicDSL(prompt, QCToolType.HISTOGRAM, "histogram");
};

export const generateControlDSL = async (prompt: string) => {
    return generateLogicDSL(prompt, QCToolType.CONTROL, "control");
};

export const generateScatterDSL = async (prompt: string) => {
    return generateLogicDSL(prompt, QCToolType.SCATTER);
};

export const generateBasicDSL = async (prompt: string) => {
    return generateLogicDSL(prompt, QCToolType.BASIC);
};

/**
 * 检查当前是否处于「管理端已要求使用客户端模型，但本地浏览器尚未配置有效 Cookie」的待配置状态
 */
export async function checkNeedsClientCookieSetup(): Promise<boolean> {
    try {
        const state = await loadAIConfigState();
        return state.active_profile === CLIENT_COOKIE_PROFILE_ID && !hasConfiguredClientCookie();
    } catch {
        return false;
    }
}

/**
 * Retrieves the name and active model of the currently active AI engine
 */
export const getAIStatus = async (): Promise<string> => {
    try {
        const state = await loadAIConfigState();
        const clientCfg = loadClientCookieConfig();
        if (state.active_profile === CLIENT_COOKIE_PROFILE_ID || (clientCfg.enabled && hasConfiguredClientCookie())) {
            if (!hasConfiguredClientCookie()) {
                return "客户端模型 (待配置 Cookie)";
            }
            return `[Cookie] ${clientCfg.name || "本地客户端"} · ${clientCfg.model || "默认"}`;
        }
        const profile = state.profiles[state.active_profile];
        if (!profile) return "未激活服务";
        return profile.model ? `${profile.name} · ${profile.model}` : profile.name;
    } catch (e) {
        return "未激活服务";
    }
};
