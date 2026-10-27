import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { getToolLinter, formatLinterError, formatLinterDiag } from "./linters.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import { networkInterfaces } from 'os';
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.IQS_BASE_URL || "http://localhost:12000";
const PROTOCOL_DIR = path.join(__dirname, "../protocol");
const SEGMENTS_DIR = path.join(PROTOCOL_DIR, "segments");

function getProtocolFile(relPath) {
  try {
    const fullPath = path.join(PROTOCOL_DIR, relPath);
    if (!fs.existsSync(fullPath)) return "";
    return fs.readFileSync(fullPath, "utf-8");
  } catch (e) {
    console.error(`Error reading protocol file ${relPath}:`, e);
    return "";
  }
}

const RENDERS_DIR = path.join(__dirname, "renders");
if (!fs.existsSync(RENDERS_DIR)) {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
}

// --- Browser Utils ---

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const SERVER_IP = getLocalIP();
let PUBLIC_URL = "";

/**
 * 解析客户端可达的 MCP 基准地址（用于拼接 /renders 图片链接）。
 * 优先级：IQS_SERVER_PUBLIC_URL ＞ 受信代理的 X-Forwarded-* ／ Host ＞ 本机网卡地址。
 * 协议与主机交由 Express 的 req.protocol / req.host 解析：二者遵循 `trust proxy` 设置，
 * 且多级代理的逗号分隔值只取第一个（AUD-157）。
 */
function resolveBaseUrl(req) {
  if (process.env.IQS_SERVER_PUBLIC_URL) {
    return process.env.IQS_SERVER_PUBLIC_URL.replace(/\/$/, "");
  }
  if (req) {
    const proto = req.protocol || "http";
    const host = req.host || req.get("host");
    let prefix = "";
    const trustFn = req.app?.get("trust proxy fn");
    const fromTrustedProxy = typeof trustFn === "function" && trustFn(req.socket?.remoteAddress, 0);
    if (fromTrustedProxy) {
      const rawPrefix = String(req.get("x-forwarded-prefix") || "").split(",")[0].trim();
      if (rawPrefix.startsWith("/")) prefix = rawPrefix;
    }
    if (host) {
      return `${proto}://${host}${prefix}`.replace(/\/$/, "");
    }
  }
  return (PUBLIC_URL || `http://${SERVER_IP}:${process.env.PORT || 12001}`).replace(/\/$/, "");
}

// --- Path Configuration ---
const CHART_SPEC_PATH = path.join(__dirname, "../public/config.json");

const tools = JSON.parse(fs.readFileSync(path.join(__dirname, "./mcp_tools.json"), "utf8"));

function checkChartSpec() {
  try {
    if (!fs.existsSync(CHART_SPEC_PATH)) {
      console.warn(`Warning: config.json not found at ${CHART_SPEC_PATH}`);
      return;
    }
    const spec = JSON.parse(fs.readFileSync(CHART_SPEC_PATH, "utf8"));
    console.log(`[MCP Server] Linked to IQS Project: ${spec.project} v${spec.version}`);
  } catch (e) {
    console.error(`Error reading config.json:`, e);
  }
}

async function getExecutablePath() {
  const commonPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];
  for (const path of commonPaths) {
    if (fs.existsSync(path)) return path;
  }
  return undefined;
}

async function renderChart(type, dsl, width = 1200, height = 800, saveToFile = false, baseUrlOverride = "") {
  const executablePath = await getExecutablePath();

  const launchOptions = {
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  await page.setViewport({ width, height, deviceScaleFactor: 3 });
  const encodedDsl = encodeURIComponent(dsl);
  const url = `${BASE_URL}/?mode=headless&type=${type}&dsl=${encodedDsl}&theme=light`;

  try {
    await page.evaluateOnNewDocument((w, h) => {
      const style = document.createElement('style');
      style.textContent = `
        #root, body, html { height: ${h}px !important; width: ${w}px !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: white !important; }
        #root > div { height: 100% !important; width: 100% !important; overflow: hidden !important; }
        #pareto-chart-container, #vchart-container, .mermaid, .echarts-for-react { height: 100% !important; width: 100% !important; position: absolute !important; top: 0 !important; left: 0 !important; }
        .p-8, .p-4 { padding: 0 !important; }
      `;
      document.head.appendChild(style);
    }, width, height);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    
    // 1. Wait for our custom readiness signal
    console.error(`[MCP] Waiting for IQS_READY...`);
    await page.waitForFunction(() => window.IQS_READY === true, { timeout: 20000 });
    
    // 2. Trigger a final resize just in case
    await page.evaluate(() => { window.dispatchEvent(new Event('resize')); });
    await new Promise(r => setTimeout(r, 500));

    // 3. Call the bridge capture function
    console.error(`[MCP] Invoking captureIQSChart with resolution: ${width}x${height}`);
    const dataURL = await page.evaluate(async (w, h) => {
      if (typeof window.captureIQSChart === 'function') {
        return await window.captureIQSChart({ 
          pixelRatio: 3, 
          backgroundColor: '#ffffff',
          width: w,
          height: h
        });
      }
      return '';
    }, width, height);

    if (!dataURL) {
      throw new Error("Failed to capture chart via captureIQSChart bridge");
    }

    const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");

    if (saveToFile) {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
      const hash = Math.random().toString(36).substring(7);
      const filename = `render_${timestamp}_${hash}.png`;
      const filePath = path.join(RENDERS_DIR, filename);
      
      fs.writeFileSync(filePath, base64Data, 'base64');
      
      const activeBaseUrl = (baseUrlOverride || PUBLIC_URL || `http://${SERVER_IP}:${process.env.PORT || 12001}`).replace(/\/$/, "");
      const fileUrl = `${activeBaseUrl}/renders/${filename}`;
      await browser.close();
      return { url: fileUrl };
    } else {
      await browser.close();
      return { base64: base64Data };
    }
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// --- MCP Server Factory ---

function createServer(context = {}) {
  const newServer = new Server(
    {
      name: "iqs-expert-chart-server",
      version: "2.7.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  const MCP_TOOLS_PATH = path.join(__dirname, "mcp_tools.json");

  function getMCPTools() {
    try {
      return JSON.parse(fs.readFileSync(MCP_TOOLS_PATH, "utf-8"));
    } catch (e) {
      console.error(`Error reading mcp_tools.json:`, e);
      return [];
    }
  }

  /** ILDR thin catalog — minimize list_tools tokens; full grammar via resources */
  function buildThinDescription(tool) {
    const slug = String(tool.name).replace(/^render_/, '');
    if (tool.name === "render_flow") {
      return [
        "[CORE] IQS 企业流程图/泳道图",
        "面向体系文件（CX）：谁×做什么×走哪条路。字典-索引 DSL（Dict / Lane from / W），自研 SVG。",
        "intents: 流程图, 泳道图, 程序文件, 跨部门流程, BPMN, swimlane",
        "NOT mermaid: 企业泳道/审批/程序文件必须用本工具，禁止 render_mermaid_flowchart。",
        "must: Dict 先于 Lane 与 W；Type[?]/[+] 必须分支行并以 End 闭合；纯文本非 JSON。",
        `语法详查: read_protocol("flow") | read: protocol://segments/iqs_native/flow`,
        "dsl: IQS-DSL v1 pure text (not JSON)"
      ].join(" | ");
    }
    const tier = tool.tier || (tool.parent_type === 'iqs_native' ? 'core' : 'relief');
    const tierLabel = tier === 'core' ? 'CORE' : 'RELIEF';
    const intents = (tool.intent_trigger || []).slice(0, 6).join(', ');
    const extra = tool.name === "render_mermaid_flowchart"
      ? "RELIEF only. 体系文件/部门泳道/BPMN 子集请改用 render_flow."
      : "";
    return [
      `[${tierLabel}] ${tool.display_name}`,
      tool.description,
      intents ? `intents: ${intents}` : '',
      extra,
      `语法详查: read_protocol("${slug}") | read: protocol://segments/${tool.parent_type}/${tool.sub_type}`,
      tier === 'core' ? 'dsl: IQS-DSL v1 pure text (not JSON)' : 'dsl: dialect text (not bare JSON object)'
    ].filter(Boolean).join(' | ');
  }

  function getToolDslDescription(tool) {
    const kind = tool.sub_type;
    const parent = tool.parent_type;
    const readHint = `【完整语法规范调用 read_protocol("${tool.name.replace(/^render_/, '')}")】`;

    if (parent === "mermaid") {
      return `纯文本 Mermaid 代码（严禁 Markdown 代码块围栏 \`\`\` ）。例如: graph TD\\n  A --> B。${readHint}`;
    }
    if (parent === "vchart") {
      return `纯文本外壳（严禁直接传裸 JSON）。格式必须为: Title: 标题\\nSpec: { ... }。${readHint}`;
    }

    switch (kind) {
      case "fishbone":
        return `纯文本 DSL。层级必须严格使用 # 一级大骨、## 二级中骨、### 三级小骨（严禁 - 列表，严禁 JSON）。范式: Title: 问题\\n# 分类名\\n## 原因\\n### 根因。${readHint}`;
      case "flow":
        return `纯文本 DSL（严禁 JSON/Mermaid）。体系文件字典-泳道图。范式: Title: 标题\\nDict: D[...]\\nLane from D[...] Layout H\\nW: w1: 节点 Type[S]... ${readHint}`;
      case "pareto":
        return `纯文本 DSL。二八定律排列图。范式: Title: 标题\\nData:\\n  缺陷A: 40\\n  缺陷B: 20。${readHint}`;
      case "control":
        return `纯文本 DSL。SPC 控制图。范式: Title: 标题\\nType: I-MR\\nData: 10, 12, 11, ... ${readHint}`;
      case "affinity":
        return `纯文本 DSL。KJ法亲和图。范式: Title: 标题\\nItem: id, 标签, 父ID。${readHint}`;
      case "histogram":
        return `纯文本 DSL。直方图。范式: Title: 标题\\n- 10.2\\n- 10.5\\nUSL: 12\\nLSL: 8。${readHint}`;
      case "radar":
        return `纯文本 DSL。雷达图。范式: Title: 标题\\nAxis: 维度1, 100\\nSeries: 样本A, [80, 90]。${readHint}`;
      case "scatter":
        return `纯文本 DSL。散点图。范式: Title: 标题\\n- 1.2, 3.4\\n- 2.3, 4.5。${readHint}`;
      default:
        return `纯文本 DSL 字符串（严禁 JSON，严禁 Markdown 围栏）。${readHint}`;
    }
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

  /**
   * 工具通用查找器：支持简写、工具全名、单层与双层 URI、以及各种下划线/驼峰别名
   */
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
    let match = allTools.find((t) => t.name.toLowerCase() === `render_${q}` || t.name.toLowerCase() === q);
    if (match) return match;

    // 2. slug 精确匹配
    match = allTools.find((t) => {
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
    match = allTools.find((t) => t.name.toLowerCase().endsWith(`_${q}`));
    if (match) return match;

    // 5. inference_key 兜底匹配
    return allTools.find((t) => t.inference_key && t.inference_key.toLowerCase() === q);
  }

  /**
   * 核心装配流水线：全量无缝拼接【图表类型 + 家族总纲 + 专家协议切片 + 官方标准语法示例 + AI提示词与输出红线】
   */
  function buildFullProtocolDoc(tool, allTools) {
    const parent = tool.parent_type;
    const sub = tool.sub_type;
    const master = allTools.find((t) => t.parent_type === parent && t.sub_type === "master");
    const slug = tool.name.replace(/^render_/, '');
    const agentDoc = getProtocolFile(`segments/${sub}.agent.md`) || 
                     getProtocolFile(`segments/${slug}.agent.md`);
    const rawSegment = getToolSegmentContent(tool);
    const promptDoc = getToolPromptContent(tool);
    const tier = tool.tier || (parent === "iqs_native" ? "core" : "relief");
    const tierLabel = tier === "core" ? "CORE" : "RELIEF";

    const sections = [
      `# [${tierLabel}] ${tool.display_name}（完整协议切片与语法规范）`,
      `\n- **图表类型**: \`${tool.name}\` (${tool.parent_type}/${tool.sub_type})`,
      `- **分层定义**: ${tierLabel} (${parent === "iqs_native" ? "IQS-DSL v1 核心质量控制图表" : "救济通道方言建模"})`,
      tool.intent_trigger?.length ? `- **意图触发**: ${tool.intent_trigger.join(", ")}` : "",
      tool.description ? `- **功能概述**: ${tool.description}` : "",
      tool.expertise ? `- **业务专长**: ${tool.expertise}` : ""
    ];

    // 0. 若存在该图表专属的编译卡 (Agent Guide)，作为核心红线指令优先引入
    if (agentDoc) {
      sections.push(`\n---\n## 一、编译卡与红线指令 (Agent Guide)\n\n${agentDoc}`);
    }

    // 1. 家族总纲 (Master Protocol)
    if (master && master.name !== tool.name) {
      sections.push(
        `\n---\n## 二、家族总纲 (Master Protocol: ${master.display_name})\n` +
        `${master.expert_logic || ""}\n\n${master.syntax_rules || ""}`
      );
    }

    // 2. 专家协议切片全文 (Segment: Soul & Flesh，含正反例、参数与语法约束)
    if (rawSegment) {
      sections.push(`\n---\n## 二、专家协议切片全文 (The Protocol Segment)\n\n${rawSegment}`);
    } else {
      if (tool.expert_logic) sections.push(`\n---\n## 二、专家逻辑 (Expert Logic)\n\n${tool.expert_logic}`);
      if (tool.syntax_rules) sections.push(`\n---\n## 三、语法规则 (Syntax Rules)\n\n${tool.syntax_rules}`);
    }

    // 3. 官方范式示例 (Official Example)
    if (tool.official_example) {
      sections.push(
        `\n---\n## 三、官方范式示例 (Official Example)\n\n` +
        `> 必须以纯文本输出以下 DSL 范式，严禁 Markdown 代码块围栏，严禁 JSON 对象：\n\n` +
        `\`\`\`dsl\n${tool.official_example}\n\`\`\``
      );
    }

    // 4. AI 生成提示词与全局输出红线 (Prompt & Output Controls)
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

  /** 统一资源解析逻辑：支持 protocol:// URI 与简写名称（如 "flow", "fishbone", "intents"） */
  function resolveResourceContent(uri) {
    const raw = String(uri || "").trim();
    if (!raw) throw new Error("资源 URI 不能为空");

    const governance = getProtocolFile("governance.md");
    const dslV1 = getProtocolFile("DSL_V1.md");
    const allTools = getMCPTools();

    const lower = raw.toLowerCase().replace(/^render_/, '');

    // 1. 系统级特殊文档
    if (raw === "protocol://governance" || lower === "governance" || lower === "治理") {
      return { uri: "protocol://governance", mimeType: "text/markdown", text: governance };
    }

    if (raw === "protocol://intents" || lower === "intents" || lower === "router" || lower === "路由") {
      const intents = getProtocolFile("intents.md");
      if (!intents) throw new Error("protocol/intents.md 不存在 —— 请先运行 npm run build:cards");
      return { uri: "protocol://intents", mimeType: "text/markdown", text: intents };
    }

    if (raw === "protocol://dsl/v1" || lower === "dsl" || lower === "v1" || lower === "dsl_v1") {
      const text = [
        dslV1 || "# IQS-DSL v1",
        "\n---\n",
        "Full document path in repo: docs/IQS_DSL_V1_SPEC.md",
        "Kind registry: dsl/kinds.json"
      ].join("\n");
      return { uri: "protocol://dsl/v1", mimeType: "text/markdown", text };
    }

    if (raw === "protocol://segments" || lower === "segments" || lower === "index") {
      const files = fs.existsSync(SEGMENTS_DIR) ? fs.readdirSync(SEGMENTS_DIR) : [];
      let allContent = "# IQS Protocol Segments Index\n\n## File segments\n\n";
      files.forEach((file) => {
        if (file.endsWith(".md")) {
          allContent += `- [${file.replace(".md", "")}](protocol://segments/${file.replace(".md", "")})\n`;
        }
      });
      allContent += "\n## Kind resources (prefer these for generation)\n\n";
      allContent += "> 每行给出该 kind 的**语法切片**与**生成提示词**两个 URI。路由入口见 `protocol://intents`。\n\n";
      allTools
        .filter((t) => t.sub_type !== "master")
        .forEach((t) => {
          const slug = t.name.replace(/^render_/, "");
          allContent +=
            `- [${t.name}](protocol://segments/${t.parent_type}/${t.sub_type}) tier=${t.tier || "?"}` +
            ` · prompt: \`protocol://prompts/${slug}\`\n`;
        });
      return { uri: "protocol://segments", mimeType: "text/markdown", text: allContent };
    }

    // 2. 通用组件匹配与四合一全景拼接（图表类型 + 协议切片 + 语法示例 + 提示词）
    const matchedTool = findMatchingTool(raw, allTools);
    if (matchedTool) {
      const targetUri = `protocol://segments/${matchedTool.parent_type}/${matchedTool.sub_type}`;
      const text = buildFullProtocolDoc(matchedTool, allTools);
      return { uri: targetUri, mimeType: "text/markdown", text };
    }

    // 3. 兜底未挂载工具的切片物理文件直接读取
    const segMatch = raw.match(/^protocol:\/\/segments\/(.+)$/);
    if (segMatch) {
      const key = segMatch[1].replace(/\.md$/, "");
      const segment = getProtocolFile(`segments/${key}.md`);
      if (segment) {
        return {
          uri: raw,
          mimeType: "text/markdown",
          text: `# IQS Segment Knowledge: ${key}\n\n${segment}`
        };
      }
    }

    // 4. 兜底未挂载工具的 Prompt 物理文件直接读取
    const promptMatch = raw.match(/^protocol:\/\/prompts\/(.+)$/);
    if (promptMatch) {
      const key = promptMatch[1].replace(/\.md$/, "");
      const prompt = getProtocolFile(`prompts/${key}.md`);
      if (prompt) {
        return { uri: raw, mimeType: "text/markdown", text: prompt };
      }
    }

    throw new Error(`未知协议资源: ${raw}。可用图表名称例如: flow, fishbone, pareto, control 等，或查看 protocol://intents`);
  }

  // --- Resources (single registration; governance + dsl + kind segments) ---
  newServer.setRequestHandler(ListResourcesRequestSchema, async () => {
    const allTools = getMCPTools();
    const resources = [
      {
        uri: "protocol://governance",
        name: "IQS Protocol Governance",
        mimeType: "text/markdown",
        description: "Authority hierarchy, core vs relief tiers, conflict rules."
      },
      {
        uri: "protocol://dsl/v1",
        name: "IQS-DSL v1 Language Spec (summary)",
        mimeType: "text/markdown",
        description: "Unified IQS-DSL v1 shell/body rules for core kinds."
      },
      {
        uri: "protocol://segments",
        name: "IQS Segment Index",
        mimeType: "text/markdown",
        description: "Index of protocol segment files and kind URIs."
      },
      {
        uri: "protocol://intents",
        name: "IQS 意图路由目录 (Intent Router)",
        mimeType: "text/markdown",
        description:
          "ROUTING ENTRY. 按用户意图定位 kind（含关键词与资源 URI），并给出全局输出红线。生成前建议先读本文。"
      }
    ];

    allTools
      .filter((t) => t.sub_type !== "master")
      .forEach((tool) => {
        resources.push({
          uri: `protocol://segments/${tool.parent_type}/${tool.sub_type}`,
          name: `${tool.display_name} (Master + Kind)`,
          mimeType: "text/markdown",
          description: `Grammar + example for ${tool.display_name}`
        });
      });

    return { resources };
  });

  newServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const res = resolveResourceContent(request.params.uri);
    return { contents: [res] };
  });

  newServer.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = getMCPTools();

    // 核心桥梁工具：让任何 LLM 客户端均能主动调取语法资源，彻底消除协议割裂
    const readProtocolTool = {
      name: "read_protocol",
      description: [
        "[CORE-TOOL] IQS 协议与语法规范读取工具",
        "【必须调用的语法查询工具】在调用任何 render_* 图表工具前，若对 DSL 语法格式、关键字或正例不确定，必须先调用本工具获取语法规范与官方示例。",
        "支持参数: 完整协议 URI (如 protocol://segments/iqs_native/fishbone、protocol://prompts/flow、protocol://intents) 或直接传入图表名称 (如 fishbone, flow, pareto, control 等)。"
      ].join(" | "),
      inputSchema: {
        type: "object",
        properties: {
          uri: {
            type: "string",
            description: "协议 URI 或图表名。例如: 'protocol://segments/iqs_native/fishbone', 'flow', 'pareto', 'control', 'protocol://intents'"
          }
        },
        required: ["uri"]
      }
    };

    // Core tools first (routing priority for agents), then relief
    const published = allTools
      .filter((t) => t.sub_type !== "master")
      .sort((a, b) => {
        const ta = a.tier === "relief" ? 1 : 0;
        const tb = b.tier === "relief" ? 1 : 0;
        if (ta !== tb) return ta - tb;
        return (a.name || "").localeCompare(b.name || "");
      })
      .map((tool) => ({
        name: tool.name,
        description: buildThinDescription(tool),
        inputSchema: {
          type: "object",
          properties: {
            dsl: {
              type: "string",
              description: getToolDslDescription(tool)
            },
            width: { type: "number", default: 1200 },
            height: { type: "number", default: 800 }
          },
          required: ["dsl"]
        }
      }));

    return { tools: [readProtocolTool, ...published] };
  });

  newServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const isSse = !!PUBLIC_URL;

    // 1. 处理协议语法读取工具调用
    if (name === "read_protocol") {
      const uriArg = args?.uri || args?.name || args?.kind || "";
      if (!uriArg) {
        return {
          content: [{
            type: "text",
            text: "错误: 请指定要读取的协议 URI 或图表名（例如 'flow', 'fishbone', 'pareto', 'protocol://intents'）"
          }],
          isError: true
        };
      }
      try {
        const res = resolveResourceContent(uriArg);
        return {
          content: [{
            type: "text",
            text: res.text
          }]
        };
      } catch (err) {
        return {
          content: [{
            type: "text",
            text: `协议资源读取失败: ${err.message}\n提示: 可用图表名称例如: flow, fishbone, pareto, control, matrix, arrow, basic 等，或查看 protocol://intents`
          }],
          isError: true
        };
      }
    }

    let type = "";
    let dsl = args.dsl;

    if (name.startsWith("render_mermaid_")) {
      type = "mermaid";
    } else if (name.startsWith("render_vchart_")) {
      type = "vchart";
    } else if (name.startsWith("render_")) {
      type = name.replace("render_", "");
    }

    // ILDR 2.0: 增强型 JSON 检测
    const isJsonLike = (typeof dsl === 'object' && dsl !== null) || 
                       (typeof dsl === 'string' && dsl.trim().startsWith('{'));

    if (isJsonLike) {
      // AUD-156：按工具全名查找。原实现按 parent_type === type 匹配，原生图表（parent_type=iqs_native）
      // 永远匹配不上，回落到 VChart 外壳示例，误导模型。
      const tool = getMCPTools().find(t => t.name === name);
      const example = tool?.official_example || "Title: 标题";
      
      const slug = name.replace(/^render_/, '');
      return {
        content: [{
          type: "text",
          text: [
            `🔴【格式错误】严禁在 dsl 字段传导 JSON！该字段必须为【纯文本字符串】。`,
            `可调用 read_protocol("${slug}") 查询该图表的官方 DSL 规范。`,
            `请立即按照以下范式重写（注意没有外层括号）：`,
            `\n${example}\n`,
            `🔴 严禁输出任何 Markdown 代码块，严禁输出任何解释性描述。`
          ].join('\n')
        }],
        isError: true
      };
    }

    // 通用前置校验管道：若该图表注册了专用 Linter（如 render_flow），优先执行离线语义与语法诊断
    const linter = getToolLinter(name);
    let lintResult = null;
    if (linter) {
      lintResult = await linter(dsl);
      if (lintResult && Array.isArray(lintResult.errors) && lintResult.errors.length) {
        return {
          content: [{
            type: "text",
            text: formatLinterError(lintResult)
          }],
          isError: true
        };
      }
    }

    try {
      const result = await renderChart(type, dsl, args.width, args.height, isSse, context.clientBaseUrl);
      const diag = formatLinterDiag(lintResult);
      if (isSse && result.url) {
        const displayName = getMCPTools().find(t => t.name === name)?.display_name;
        const chartTitle = (displayName || (type ? `${type} 图表` : "IQS 图表")).replace(/[\[\]]/g, "");
        const mdImage = `![${chartTitle}](${result.url})`;

        return {
          content: [
            {
              type: "text",
              text: [
                mdImage,
                diag,
                "---",
                `【系统指令：图片渲染规约】图表已成功生成。\n请务必在最终回复中直接使用下方 Markdown 图片语法进行内嵌渲染，严禁将其降级或改写为普通纯文本超链接：\n\n${mdImage}`
              ].filter(Boolean).join("\n\n")
            }
          ]
        };
      } else {
        const content = [];
        if (diag) content.push({ type: "text", text: diag });
        content.push({ type: "image", data: result.base64, mimeType: "image/png" });
        return { content };
      }
    } catch (error) {
      const extra = lintResult?.errors?.length
        ? "\nparser_errors:\n" + lintResult.errors.map((e) => `  - ${e}`).join("\n")
        : "";
      return {
        content: [{ type: "text", text: `渲染错误: ${error.message}${extra}` }],
        isError: true
      };
    }
  });

  return newServer;
}

// --- Main ---

const sseTransports = new Map();

async function main() {
  const transportType = process.argv.find(arg => arg.startsWith("--transport="))?.split("=")[1] || "stdio";

  if (transportType === "sse") {
    const app = express();
    // AUD-157：默认只信任本机与私网来源（含 Docker 桥接网段）的 X-Forwarded-* 头；
    // 可用 IQS_TRUST_PROXY 覆盖（Express trust proxy 语法：true / false / 跳数 / 网段列表）。
    const trustProxyEnv = (process.env.IQS_TRUST_PROXY || "").trim();
    let trustProxy = "loopback, linklocal, uniquelocal";
    if (trustProxyEnv === "true") trustProxy = true;
    else if (trustProxyEnv === "false") trustProxy = false;
    else if (/^\d+$/.test(trustProxyEnv)) trustProxy = Number(trustProxyEnv);
    else if (trustProxyEnv) trustProxy = trustProxyEnv;
    app.set("trust proxy", trustProxy);
    app.use(cors());
    app.use('/renders', express.static(RENDERS_DIR));

    const port = process.env.PORT || 12001;
    PUBLIC_URL = (process.env.IQS_SERVER_PUBLIC_URL || `http://${SERVER_IP}:${port}`).replace(/\/$/, "");

    app.get("/sse", async (req, res) => {
      const clientBaseUrl = resolveBaseUrl(req);
      console.error(`New SSE connection established (clientBaseUrl: ${clientBaseUrl})`);
      const transport = new SSEServerTransport("/messages", res);
      const server = createServer({ clientBaseUrl });
      await server.connect(transport);

      const sessionId = transport.sessionId;
      if (sessionId) {
        sseTransports.set(sessionId, transport);
      }

      res.on("close", () => {
        console.error(`SSE connection ${sessionId || 'unknown'} closed`);
        if (sessionId) sseTransports.delete(sessionId);
        server.close().catch(console.error);
      });
    });

    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId;
      const transport = sseTransports.get(sessionId);
      if (!transport) {
        return res.status(404).send(`Session ${sessionId} not found`);
      }
      await transport.handlePostMessage(req, res);
    });

    app.listen(port, () => {
      console.error(`IQS Expert Chart MCP Server (SSE) running on port ${port}`);
      console.error(`- Public URL: ${PUBLIC_URL}`);
      console.error(`- SSE endpoint: ${PUBLIC_URL}/sse`);
    });
  } else {
    const transport = new StdioServerTransport();
    const server = createServer();
    await server.connect(transport);
    console.error("IQS Expert Chart MCP Server (Stdio) running with full knowledge injection");
  }
}

main().catch(console.error);
