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
import { fileURLToPath } from "url";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import { networkInterfaces } from 'os';
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.IQS_BASE_URL || "http://localhost:5173";
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

async function renderChart(type, dsl, width = 1200, height = 800, saveToFile = false) {
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
      
      const fileUrl = `${PUBLIC_URL}/renders/${filename}`;
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

function createServer() {
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
    if (tool.name === "render_flow") {
      return [
        "[CORE] IQS 企业流程图/泳道图",
        "面向体系文件（CX）：谁×做什么×走哪条路。字典-索引 DSL（Dict / Lane from / W），自研 SVG。",
        "intents: 流程图, 泳道图, 程序文件, 跨部门流程, BPMN, swimlane",
        "NOT mermaid: 企业泳道/审批/程序文件必须用本工具，禁止 render_mermaid_flowchart。",
        "must: Dict 先于 Lane 与 W；Type[?]/[+] 必须分支行并以 End 闭合；纯文本非 JSON。",
        "read: protocol://segments/iqs_native/flow",
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
      `read: protocol://segments/${tool.parent_type}/${tool.sub_type}`,
      tier === 'core' ? 'dsl: IQS-DSL v1 pure text (not JSON)' : 'dsl: dialect text (not bare JSON object)'
    ].filter(Boolean).join(' | ');
  }

  function lintFlowDsl(dsl) {
    try {
      const script = path.join(__dirname, "../scripts/lint_flow.ts");
      const r = spawnSync(process.execPath, ["--experimental-strip-types", script], {
        input: String(dsl ?? ""),
        encoding: "utf8",
        timeout: 8000,
        maxBuffer: 2 * 1024 * 1024,
      });
      const out = (r.stdout || "").trim();
      if (!out) return { errors: [r.stderr || "lint_flow 无输出"], warnings: [], nodes: 0, edges: 0, lanes: 0 };
      const line = out.split("\n").filter(Boolean).pop();
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
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
    const uri = request.params.uri;
    const governance = getProtocolFile("governance.md");
    const dslV1 = getProtocolFile("DSL_V1.md");

    if (uri === "protocol://governance") {
      return { contents: [{ uri, mimeType: "text/markdown", text: governance }] };
    }

    if (uri === "protocol://dsl/v1") {
      const text = [
        dslV1 || "# IQS-DSL v1",
        "\n---\n",
        "Full document path in repo: docs/IQS_DSL_V1_SPEC.md",
        "Kind registry: dsl/kinds.json"
      ].join("\n");
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }

    if (uri === "protocol://segments") {
      const files = fs.existsSync(SEGMENTS_DIR) ? fs.readdirSync(SEGMENTS_DIR) : [];
      const allTools = getMCPTools();
      let allContent = "# IQS Protocol Segments Index\n\n## File segments\n\n";
      files.forEach((file) => {
        if (file.endsWith(".md")) {
          allContent += `- [${file.replace(".md", "")}](protocol://segments/${file.replace(".md", "")})\n`;
        }
      });
      allContent += "\n## Kind resources (prefer these for generation)\n\n";
      allTools
        .filter((t) => t.sub_type !== "master")
        .forEach((t) => {
          allContent += `- [${t.name}](protocol://segments/${t.parent_type}/${t.sub_type}) tier=${t.tier || "?"}\n`;
        });
      return { contents: [{ uri, mimeType: "text/markdown", text: allContent }] };
    }

    // Kind-spliced resource: protocol://segments/{parent}/{sub}
    const kindMatch = uri.match(/^protocol:\/\/segments\/([^/]+)\/([^/]+)$/);
    if (kindMatch) {
      const [, parent, sub] = kindMatch;
      if (parent === "iqs_native" && sub === "flow") {
        const agent = getProtocolFile("segments/flow.agent.md");
        const segment = getProtocolFile("segments/flow.md");
        const text = [agent || "# IQS-Flow", "\n---\n", "## 人读协议切片", segment || ""].join("\n");
        return { contents: [{ uri, mimeType: "text/markdown", text }] };
      }
      const allTools = getMCPTools();
      const master = allTools.find((t) => t.parent_type === parent && t.sub_type === "master");
      const tool = allTools.find((t) => t.parent_type === parent && t.sub_type === sub);
      if (!tool) throw new Error(`Resource not found: ${uri}`);

      const content = [
        `# ${tool.display_name} (Spliced Protocol)`,
        `tier: ${tool.tier || (parent === "iqs_native" ? "core" : "relief")}`,
        master
          ? `\n## 1. Master Protocol\n${master.expert_logic}\n\n${master.syntax_rules}`
          : "",
        `\n## 2. Expert Logic\n${tool.expert_logic || ""}`,
        `\n## 3. Syntax Rules\n${tool.syntax_rules || ""}`,
        `\n## 4. Official Example\n\`\`\`dsl\n${tool.official_example || ""}\n\`\`\``,
        `\n## 5. Output Controls\n1. CoT self-check against syntax before emit.\n2. Pure text only — no markdown fences, no prose.`,
        parent === "iqs_native"
          ? `\n## 6. Language\nFollow IQS-DSL v1 (protocol://dsl/v1).`
          : `\n## 6. Language\nRelief dialect — do not use for core QC SPC/Pareto final reports when native tools exist.`
      ].join("\n");

      return { contents: [{ uri, mimeType: "text/markdown", text: content }] };
    }

    // Legacy single-segment file: protocol://segments/{key}
    if (uri.startsWith("protocol://segments/")) {
      const key = uri.replace("protocol://segments/", "");
      if (key.includes("/")) throw new Error(`Resource not found: ${uri}`);
      const segment = getProtocolFile(`segments/${key}.md`);
      if (!segment) throw new Error(`Segment [${key}] not found`);
      // flow：L2 只给切片全文，不再拼接 governance（避免重复吞 token）
      if (key === "flow") {
        return { contents: [{ uri, mimeType: "text/markdown", text: segment }] };
      }
      const combined = [
        `# IQS Segment Knowledge: ${key}`,
        `\n## 1. Governance\n${governance}`,
        `\n## 2. Segment\n${segment}`
      ].join("\n");
      return { contents: [{ uri, mimeType: "text/markdown", text: combined }] };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  newServer.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = getMCPTools();
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
              description: "Pure-text DSL string (not a JSON object). See tool resource for grammar."
            },
            width: { type: "number", default: 1200 },
            height: { type: "number", default: 800 }
          },
          required: ["dsl"]
        }
      }));

    return { tools: published };
  });

  newServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const isSse = !!PUBLIC_URL;

    let type = "";
    let dsl = args.dsl;

    if (name.startsWith("render_mermaid_")) {
      type = "mermaid";
    } else if (name.startsWith("render_vchart_")) {
      type = "vchart";
    } else if (name.startsWith("render_")) {
      type = name.replace("render_", "");
    }

    // ILDR 2.0: 增强型 JSON 检测。
    const isJsonLike = (typeof dsl === 'object' && dsl !== null) || 
                       (typeof dsl === 'string' && dsl.trim().startsWith('{'));

    if (isJsonLike) {
      const allTools = getMCPTools();
      const tool = allTools.find(t => t.parent_type === type && (t.sub_type === args.sub_type || name.includes(t.sub_type)));
      const example = name === "render_flow"
        ? "Title: 采购申请审批流程\nLayout: H\nDict: D[部门A,部门B]\nDict: P[申请,审批]\nLane from D[0,1] Layout H\nLane from P[0,1] Layout V\nW: w1: 提交 Type[S] Location(D[0],P[0])\nW: w2: 结束 Type[E] Location(D[1],P[1])"
        : (tool?.official_example || "Title: 标题\nSpec: { ... }");
      
      return {
        content: [{
          type: "text",
          text: [
            `🔴【格式错误】严禁在 dsl 字段传导 JSON！该字段必须为【纯文本字符串】。`,
            `请立即按照以下范式重写（注意没有外层括号）：`,
            `\n${example}\n`,
            `🔴 严禁输出任何 Markdown 代码块，严禁输出任何解释性描述。`
          ].join('\n')
        }],
        isError: true
      };
    }
    
    let flowLint = null;
    if (name === "render_flow") {
      flowLint = lintFlowDsl(dsl);
      if (flowLint && Array.isArray(flowLint.errors) && flowLint.errors.length) {
        return {
          content: [{
            type: "text",
            text: [
              "error: true",
              "parser_errors:",
              ...flowLint.errors.map((e) => `  - ${e}`),
              flowLint.warnings?.length ? "parser_warnings:\n" + flowLint.warnings.map((w) => `  - ${w}`).join("\n") : "",
              "hint: Dict 必须先于 Lane/W；Type[?]/[+] 必须分支行并以 End 闭合。见 protocol://segments/iqs_native/flow"
            ].filter(Boolean).join("\n")
          }],
          isError: true
        };
      }
    }

    try {
      const result = await renderChart(type, dsl, args.width, args.height, isSse);
      const diag = name === "render_flow" && flowLint
        ? [
            "error: false",
            `nodes: ${flowLint.nodes}`,
            `edges: ${flowLint.edges}`,
            `lanes: ${flowLint.lanes}`,
            flowLint.warnings?.length ? `warnings:\n${flowLint.warnings.map((w) => `  - ${w}`).join("\n")}` : "warnings: []"
          ].join("\n")
        : "";
      if (isSse && result.url) {
        return {
          content: [
            {
              type: "text",
              text: [diag, `【系统强制指令：必须显示图片】图表已生成。请务必在最终回复中包含以下内容：\n\n![IQS Chart](${result.url})\n\n(查看链接: ${result.url})`].filter(Boolean).join("\n\n")
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
      const extra = name === "render_flow" && flowLint?.errors?.length
        ? "\nparser_errors:\n" + flowLint.errors.map((e) => `  - ${e}`).join("\n")
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
    app.use(cors());
    app.use('/renders', express.static(RENDERS_DIR));

    app.get("/sse", async (req, res) => {
      console.error("New SSE connection established");
      const transport = new SSEServerTransport("/messages", res);
      const server = createServer();
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

    const port = process.env.PORT || 3000;
    PUBLIC_URL = process.env.IQS_SERVER_PUBLIC_URL || `http://${SERVER_IP}:${port}`;

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
