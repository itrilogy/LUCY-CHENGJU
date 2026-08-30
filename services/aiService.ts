import { QCToolType } from "../types";
import { QC_TOOL_TO_KIND } from "../dsl/registry";

interface AIProfile {
    name: string;
    endpoint: string;
    model: string;
}

interface ChartSpec {
    ai_config: {
        active_profile: string;
        profiles: Record<string, AIProfile>;
    };
}

let cachedSpec: ChartSpec | null = null;

async function getChartSpec(): Promise<ChartSpec> {
    if (cachedSpec) return cachedSpec;
    try {
        const res = await fetch('/config.json');
        if (!res.ok) throw new Error("Failed to load config.json");
        cachedSpec = await res.json();
        return cachedSpec!;
    } catch (e) {
        console.error("Config Load Error:", e);
        throw e;
    }
}

/**
 * Runtime configuration interface
 */
declare global {
    interface Window {
        APP_CONFIG?: {
            API_KEY?: string;
            AI_ACTIVE_PROFILE?: string;
        };
    }
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

    // 1. Master Protocol Soul (Global Redlines)
    if (master) {
        prompt += `### 🟢 全局专家内核 (Master Protocol)\n${master.expert_logic}\n\n`;
    }

    // 2. Logic Layer: Specific Tool Protocol
    if (specific) {
        prompt += `### 🔵 专项专家逻辑 (Expert Logic - ${subType})\n${specific.expert_logic}\n\n`;
        prompt += `### 📘 语法约束与范式 (Syntax & Examples)\n${specific.syntax_rules}\n\n`;
        prompt += `#### 💡 标准 DSL 范式示例:\n\`\`\`dsl\n${specific.official_example}\n\`\`\`\n\n`;
    }

    // 3. Global Wrapper Rules
    if (master) {
        prompt += `${master.syntax_rules}\n\n`;
    }

    const isJsonBased = parentType === 'vchart';
    
    const getConstraint5 = () => {
        if (parentType === 'vchart') return `5. **严禁外层 JSON**: 必须直接以 "Title:" 或 "Spec:" 开头输出纯文本。严禁将最终结果包裹在 {} 中。`;
        if (parentType === 'mermaid') return `5. **直接输出语法**: 严禁输出 "Spec:"。必须直接输出 Mermaid 原生指令（如 flowchart TD, pie 等）。严禁包裹在 {} 中。`;
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

async function callAI(systemPrompt: string, userPrompt: string) {
    const spec = await getChartSpec();

    // 1. Check runtime config (window.APP_CONFIG), then build-time env
    const envProfile = window.APP_CONFIG?.AI_ACTIVE_PROFILE || process.env.AI_ACTIVE_PROFILE;

    // 2. Fallback to chart_spec.json active_profile if no env var
    const activeProfileName = envProfile || spec.ai_config.active_profile;

    const profile = spec.ai_config.profiles[activeProfileName];
    if (!profile) throw new Error(`Invalid AI Profile: ${activeProfileName}`);

    // Check runtime API_KEY first
    const apiKey = window.APP_CONFIG?.API_KEY || process.env.API_KEY;

    try {
        const response = await fetch(profile.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: profile.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.1,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`AI API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (error) {
        console.error("AI Inference Failed:", error);
        throw error;
    }
}

/**
 * Generates DSL for Logic Tools (Fishbone/Affinity/VChart/Mermaid/etc.)
 * Dynamically looks up tool definitions from mcp_tools.json with Master Logic injection.
 */
export const generateLogicDSL = async (prompt: string, toolType: QCToolType, subType?: string) => {
    try {
        const tools = await getMCPTools();

        // 1. Determine Parent Type
        const parentType = toolType === QCToolType.VCHART ? 'vchart' :
                           toolType === QCToolType.MERMAID ? 'mermaid' : 
                           'iqs_native';

        // 2. Dynamic Tooling Lookup (Master + SubType) — IQS-DSL v1 registry
        let finalSubType = subType || QC_TOOL_TO_KIND[toolType];

        // 2. Stage 1: Intent Discovery (if subType is unknown)
        if (!finalSubType && (parentType === 'vchart' || parentType === 'mermaid')) {
            const intentPrompt = buildIntentDiscoveryPrompt(parentType, tools);
            const rawIntent = await callAI(intentPrompt, prompt);
            // Cleanup intent string (remove markdown, dots, etc.)
            finalSubType = rawIntent.replace(/['"`\.\s]/g, '').toLowerCase().trim();
            console.log(`[DEBUG] Intent Discovered: ${finalSubType}`);
        }

        // 3. Stage 2: Protocol Generation with CoT
        if (parentType) {
            const systemPrompt = buildSmartPrompt(parentType, finalSubType, tools);
            console.log("--- [DEBUG] LIVE SYSTEM PROMPT (Stage 2) ---");
            console.log(systemPrompt);
            console.log("----------------------------------");
            const text = await callAI(systemPrompt, prompt);
            return text.replace(/```\w*/g, '').replace(/```/g, '').trim();
        }

        return `Title: 生成失败\n- Error: Unsupported tool type`;
    } catch (error: any) {
        console.error("Logic DSL Gen Error:", error);
        return `Title: 生成失败\n- Error: ${error.message || error}`;
    }
};

/**
 * Generates DSL for Pareto Chart
 */
export const generateParetoDSL = async (prompt: string) => {
    return generateLogicDSL(prompt, QCToolType.PARETO, "pareto");
};

/**
 * Generates DSL for Histogram
 */
export const generateHistogramDSL = async (prompt: string) => {
    return generateLogicDSL(prompt, QCToolType.HISTOGRAM, "histogram");
};

/**
 * Generates DSL for Control Chart
 */
export const generateControlDSL = async (prompt: string) => {
    return generateLogicDSL(prompt, QCToolType.CONTROL, "control");
};

/**
 * Generates DSL for Scatter Chart
 */
export const generateScatterDSL = async (prompt: string) => {
    return generateLogicDSL(prompt, QCToolType.SCATTER);
};

export const generateBasicDSL = async (prompt: string) => {
    return generateLogicDSL(prompt, QCToolType.BASIC);
};

/**
 * Retrieves the name of the currently active AI engine
 */
export const getAIStatus = async (): Promise<string> => {
    try {
        const spec = await getChartSpec();
        const envProfile = window.APP_CONFIG?.AI_ACTIVE_PROFILE || process.env.AI_ACTIVE_PROFILE;
        const activeProfileName = envProfile || spec.ai_config.active_profile;
        const profile = spec.ai_config.profiles[activeProfileName];
        return profile?.name || "未激活服务";
    } catch (e) {
        return "未激活服务";
    }
};
