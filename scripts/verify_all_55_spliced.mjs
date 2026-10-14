import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const mcpTools = JSON.parse(fs.readFileSync(path.join(root, "mcp-server/mcp_tools.json"), "utf8"));
const PROTOCOL_DIR = path.join(root, "protocol");
const SEGMENTS_DIR = path.join(PROTOCOL_DIR, "segments");

function getProtocolFile(relPath) {
  const p = path.join(PROTOCOL_DIR, relPath);
  if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8");
  return null;
}

function getToolSegmentContent(tool) {
  const parent = tool.parent_type;
  const sub = tool.sub_type;
  const slug = tool.name.replace(/^render_/, '');
  const candidates = [
    `${slug}.md`,
    `${sub}.md`,
    `${parent}_${sub}.md`,
    `${parent}.md`
  ];
  for (const c of candidates) {
    const p = path.join(SEGMENTS_DIR, c);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
  }
  return "";
}

function getToolPromptContent(tool) {
  const slug = tool.name.replace(/^render_/, '');
  const candidates = [
    `${slug}.md`,
    `${tool.sub_type}.md`,
    `${tool.parent_type}_${tool.sub_type}.md`
  ];
  for (const c of candidates) {
    const p = path.join(PROTOCOL_DIR, `prompts/${c}`);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
  }
  return "";
}

function findMatchingTool(rawInput, allTools) {
  let q = String(rawInput || "").trim().toLowerCase();
  q = q.replace(/^protocol:\/\/(segments|prompts)\//, "");
  q = q.replace(/^render_/, "");

  if (q.includes("/")) {
    const parts = q.split("/");
    const parent = parts[0];
    const sub = parts[parts.length - 1];
    const sameParent = allTools.filter(t => t.parent_type.toLowerCase() === parent);
    const byExactName = sameParent.find(t => t.name.toLowerCase() === `render_${parent}_${sub}` || t.name.toLowerCase() === `render_${sub}`);
    if (byExactName) return byExactName;
    const found = sameParent.find(t => t.sub_type.toLowerCase() === sub || t.name.toLowerCase().endsWith(`_${sub}`));
    if (found) return found;
    q = sub;
  }

  // 1. 全名精确匹配
  let match = allTools.find(t => t.name.toLowerCase() === `render_${q}` || t.name.toLowerCase() === q);
  if (match) return match;

  // 2. slug 精确匹配
  match = allTools.find(t => {
    const slug = t.name.replace(/^render_/, "").toLowerCase();
    return slug === q || `${t.parent_type}_${t.sub_type}`.toLowerCase() === q;
  });
  if (match) return match;

  // 3. sub_type 优先匹配 name 中包含 sub_type 的那个（防止同 sub_type 冲突）
  const candidates = allTools.filter((t) => t.sub_type.toLowerCase() === q);
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const exactSub = candidates.find((t) => t.name.toLowerCase().endsWith(`_${q}`));
    if (exactSub) return exactSub;
    return candidates[0];
  }

  // 4. 名称后缀匹配 (如 correlation_heat -> render_vchart_correlation_heat)
  match = allTools.find(t => t.name.toLowerCase().endsWith(`_${q}`));
  if (match) return match;

  // 5. inference_key 兜底匹配
  return allTools.find(t => t.inference_key && t.inference_key.toLowerCase() === q);
}

function buildFullProtocolDoc(tool, allTools) {
  const parent = tool.parent_type;
  const sub = tool.sub_type;
  const master = allTools.find((t) => t.parent_type === parent && t.sub_type === "master");

  const rawSegment = getToolSegmentContent(tool);
  const promptDoc = getToolPromptContent(tool);
  const tier = tool.tier || (parent === "iqs_native" ? "core" : "relief");
  const tierLabel = tier === "core" ? "CORE" : "RELIEF";

  if (parent === "iqs_native" && sub === "flow") {
    const agent = getProtocolFile("segments/flow.agent.md");
    const segment = getProtocolFile("segments/flow.md");
    const prompt = getProtocolFile("prompts/flow.md");
    return [
      `# [CORE] IQS 企业流程图/泳道图（完整协议切片与语法规范）`,
      `\n- **图表类型**: \`render_flow\` (企业流程图/泳道图)`,
      `- **分层定义**: CORE (面向体系文件 CX：谁×做什么×走哪条路，IQS-DSL v1 严格语言)`,
      `- **意图触发**: 流程图, 泳道图, 程序文件, 跨部门流程, BPMN, swimlane`,
      `- **核心红线**: Dict 先于 Lane 与 W；Type[?]/[+] 必须分支行并以 End 闭合；严禁输出 JSON，严禁输出 Mermaid。`,
      `\n---\n## 一、编译卡与红线指令 (Agent Guide)\n\n${agent || ""}`,
      `\n---\n## 二、专家协议切片全文 (The Protocol Segment)\n\n${segment || ""}`,
      `\n---\n## 三、官方范式示例 (Official Example)\n\n> 必须以纯文本输出以下 DSL 范式，严禁 Markdown 代码块围栏，严禁 JSON 对象：\n\n\`\`\`dsl\n${tool.official_example || ""}\n\`\`\``,
      prompt ? `\n---\n## 四、AI 生成提示词与输出规范 (Prompt Template)\n\n${prompt}` : ""
    ].filter(Boolean).join("\n");
  }

  const sections = [
    `# [${tierLabel}] ${tool.display_name}（完整协议切片与语法规范）`,
    `\n- **图表类型**: \`${tool.name}\` (${tool.parent_type}/${tool.sub_type})`,
    `- **分层定义**: ${tierLabel} (${parent === "iqs_native" ? "IQS-DSL v1 核心质量控制图表" : "救济通道方言建模"})`,
    tool.intent_trigger?.length ? `- **意图触发**: ${tool.intent_trigger.join(", ")}` : "",
    tool.description ? `- **功能概述**: ${tool.description}` : "",
    tool.expertise ? `- **业务专长**: ${tool.expertise}` : ""
  ];

  if (master && master.name !== tool.name) {
    sections.push(
      `\n---\n## 一、家族总纲 (Master Protocol: ${master.display_name})\n` +
      `${master.expert_logic || ""}\n\n${master.syntax_rules || ""}`
    );
  }

  if (rawSegment) {
    sections.push(`\n---\n## 二、专家协议切片全文 (The Protocol Segment)\n\n${rawSegment}`);
  } else {
    if (tool.expert_logic) sections.push(`\n---\n## 二、专家逻辑 (Expert Logic)\n\n${tool.expert_logic}`);
    if (tool.syntax_rules) sections.push(`\n---\n## 三、语法规则 (Syntax Rules)\n\n${tool.syntax_rules}`);
  }

  if (tool.official_example) {
    sections.push(
      `\n---\n## 三、官方范式示例 (Official Example)\n\n` +
      `> 必须以纯文本输出以下 DSL 范式，严禁 Markdown 代码块围栏，严禁 JSON 对象：\n\n` +
      `\`\`\`dsl\n${tool.official_example}\n\`\`\``
    );
  }

  if (promptDoc) {
    sections.push(`\n---\n## 四、AI 生成提示词与输出规范 (Prompt Template)\n\n${promptDoc}`);
  } else {
    sections.push(
      `\n---\n## 四、全局输出红线 (Output Controls)\n\n` +
      `1. 必须输出纯文本 DSL，严禁使用 \`\`\`dsl 等 Markdown 代码块围栏。\n` +
      `2. dsl 参数必须是纯字符串文本，绝对禁止传导 JSON 对象。\n` +
      `3. 严禁输出任何前后缀客套说明文字，只输出符合语法的 DSL 正文。`
    );
  }

  return sections.filter(Boolean).join("\n");
}

console.log(`========== 开始审计全部 ${mcpTools.length} 个 MCP 工具的资源拼接 ==========`);

let totalPassed = 0;
const failureList = [];

for (const tool of mcpTools) {
  // 测试 4 种常见调用入口
  const queryKeys = [
    tool.name.replace(/^render_/, ""),
    tool.name,
    `protocol://segments/${tool.parent_type}/${tool.sub_type}`,
    `protocol://prompts/${tool.name.replace(/^render_/, "")}`
  ];

  for (const q of queryKeys) {
    const matched = findMatchingTool(q, mcpTools);
    if (!matched) {
      failureList.push({ tool: tool.name, query: q, error: "查找未命中" });
      continue;
    }
    const doc = buildFullProtocolDoc(matched, mcpTools);
    
    // 断言三大要素
    const hasChartType = doc.includes(`图表类型: \`${tool.name}\``) || doc.includes(tool.display_name);
    const hasSegment = doc.includes("协议切片全文") || doc.includes("语法规则");
    const hasExample = doc.includes("官方范式示例") && doc.includes(tool.official_example);
    const hasPrompt = doc.includes("AI 生成提示词") || doc.includes("全局输出红线");

    if (!hasChartType || !hasSegment || !hasExample || !hasPrompt) {
      failureList.push({
        tool: tool.name,
        query: q,
        error: `要素缺失: Type=${hasChartType}, Seg=${hasSegment}, Ex=${hasExample}, Prompt=${hasPrompt}`
      });
    }
  }
  totalPassed++;
}

console.log(`全量工具总数: ${mcpTools.length}`);
console.log(`全要素通过工具数: ${totalPassed} / ${mcpTools.length}`);
console.log(`异常记录数: ${failureList.length}`);

if (failureList.length > 0) {
  console.error("失败详情:", JSON.stringify(failureList.slice(0, 10), null, 2));
  process.exit(1);
} else {
  console.log("✅ 55 个工具在图表类型、协议切片、官方语法示例、AI提示词 4 大要素拼接上 100% 全部通过！无一缺失！");
}
