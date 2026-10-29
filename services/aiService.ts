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

const STORAGE_KEY = "iqs_ai_providers_v1";
export const AI_CONFIG_CHANGED_EVENT = "iqs:ai-config-changed";

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
 * 获取合并后的完整大模型配置状态（localStorage 持久化覆盖 > public/config.json 默认预设）
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

    if (stored && stored.profiles) {
        // 若用户已保存自定义配置表，以用户保存的列表为准
        const userProfiles: Record<string, AIProfile> = {};
        for (const [k, v] of Object.entries(stored.profiles)) {
            userProfiles[k] = {
                protocol: "openai",
                max_tokens: 8192,
                ...v,
                id: k,
            };
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
 * 保存大模型配置状态并广播全局变更事件（使所有编辑器的引擎徽章实时刷新）
 */
export function saveAIConfigState(state: AIConfigState): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(AI_CONFIG_CHANGED_EVENT, { detail: state }));
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
 * 解析当前生效的 API Key（提供商专属 Key > .env API_KEY > window.APP_CONFIG.API_KEY）
 */
function resolveApiKey(profile: AIProfile): string {
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
        // 支持原生 Gemini v1beta 或 OpenAI 兼容端点
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

    // 默认 openai 兼容协议
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
 * 从远端提供商拉取可用模型列表（支持 OpenAI `/v1/models`、Anthropic `/v1/models`、Gemini `/v1beta/models`）
 */
export async function fetchProviderModels(profile: Pick<AIProfile, "endpoint" | "protocol" | "apiKey" | "model">): Promise<string[]> {
    const protocol = profile.protocol || "openai";
    const apiKey = resolveApiKey(profile as AIProfile);
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
        // OpenAI / Anthropic / NewAPI / LiteLLM / LMStudio 标准格式: { data: [{ id: "..." }] }
        for (const item of data.data) {
            const id = item?.id || item?.name;
            if (typeof id === "string" && id.trim()) list.push(id.trim());
        }
    } else if (Array.isArray(data?.models)) {
        // Gemini / Ollama 格式: { models: [{ name: "models/gemini-..." }] }
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

/**
 * Build a prompt to help the AI select the best tool sub_type from the catalog.
 */
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

/**
 * Dynamic Prompt Builder using ILDR 2.0 Architecture (Intent + Spliced Protocol)
 */
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
    const configState = await loadAIConfigState();
    const activeProfileName = configState.active_profile;
    const profile = configState.profiles[activeProfileName];
    if (!profile) throw new Error(`未找到激活的大模型配置方案: ${activeProfileName}`);

    const protocol: AIProtocolType = profile.protocol || "openai";
    const apiKey = resolveApiKey(profile);
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

        // OpenAI 兼容协议 & Custom 自定义协议
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

/**
 * Generates DSL for Logic Tools (Fishbone/Affinity/VChart/Mermaid/etc.)
 */
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
 * Retrieves the name and active model of the currently active AI engine
 */
export const getAIStatus = async (): Promise<string> => {
    try {
        const state = await loadAIConfigState();
        const profile = state.profiles[state.active_profile];
        if (!profile) return "未激活服务";
        return profile.model ? `${profile.name} · ${profile.model}` : profile.name;
    } catch (e) {
        return "未激活服务";
    }
};
