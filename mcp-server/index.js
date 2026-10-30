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
import { getToolLinter, formatLinterError, formatLinterDiag, loadCoreBundle } from "./linters.js";
import { createIqsApiMiddleware } from "./api.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import { networkInterfaces } from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const BASE_URL = process.env.IQS_BASE_URL || `http://localhost:${process.env.WEB_PORT || 12000}`;
const PROTOCOL_DIR = path.join(ROOT_DIR, "protocol");
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
    const trustFn = req.app?.get("trust proxy fn");
    const fromTrustedProxy = typeof trustFn === "function" && trustFn(req.socket?.remoteAddress, 0);
    const fwdHost = fromTrustedProxy
      ? String(req.get("x-forwarded-host") || "").split(",")[0].trim()
      : "";
    const host = fwdHost || req.get("host") || req.host;
    let prefix = "";
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
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const commonPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

// ============================================================
// 双模分层渲染引擎 (Dual-Mode Tiered Rendering Engine)
//   Tier-1: 进程内原生 SVG 计算 (renderFlowSVG) + 极速光栅化 (无需 Web 端 :12000)
//   Tier-2: 常驻 Browser 连接池 + 预热 Warm-Page + window.renderIQSChart 内存桥接
// ============================================================

let sharedBrowserPromise = null;
let warmPagePromise = null;
let rasterPagePromise = null;
let renderQueue = Promise.resolve();
let isShuttingDown = false;
const activeHttpServers = [];
let rendersSinceLastPrune = 0;

/**
 * R33 / AUD-201：自动清理过期的 MCP 渲染快照（仅匹配 `render_*.png`，绝不触碰 `.gitkeep` 或 `audit_*.png`）
 */
function pruneRendersDir() {
  try {
    const ttlHours = Math.max(Number(process.env.IQS_RENDER_TTL_HOURS) || 24, 1);
    const maxFiles = Math.max(Number(process.env.IQS_RENDER_MAX_FILES) || 500, 10);
    const cutoff = Date.now() - ttlHours * 3600 * 1000;

    if (!fs.existsSync(RENDERS_DIR)) return;
    const entries = fs.readdirSync(RENDERS_DIR);
    const candidates = [];

    for (const name of entries) {
      if (!/^render_.*\.png$/.test(name)) continue;
      const fullPath = path.join(RENDERS_DIR, name);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) continue;
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(fullPath);
        } else {
          candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
        }
      } catch { }
    }

    if (candidates.length > maxFiles) {
      candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
      for (const stale of candidates.slice(maxFiles)) {
        try {
          fs.unlinkSync(stale.fullPath);
        } catch { }
      }
    }
  } catch (err) {
    console.warn(`[MCP GC] Failed to prune renders dir: ${err.message}`);
  }
}

async function closeSharedBrowser() {
  if (sharedBrowserPromise) {
    try {
      const b = await sharedBrowserPromise;
      if (b && b.connected) {
        await b.close();
      }
    } catch (e) {
      console.error(`[MCP] Error closing shared browser: ${e.message}`);
    }
    sharedBrowserPromise = null;
    warmPagePromise = null;
    rasterPagePromise = null;
  }
}

const handleShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.error(`[MCP] Received ${signal}, gracefully closing HTTP servers & browser...`);
  await Promise.all([
    closeSharedBrowser(),
    ...activeHttpServers.map(
      (srv) => new Promise((resolve) => srv.close(() => resolve()))
    ),
  ]);
  process.exit(0);
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGHUP", () => handleShutdown("SIGHUP"));

async function getSharedBrowser() {
  if (isShuttingDown) {
    throw new Error("[MCP] Server is shutting down, refusing browser operations");
  }
  if (sharedBrowserPromise) {
    try {
      const b = await sharedBrowserPromise;
      if (b && b.connected) return b;
    } catch { }
    sharedBrowserPromise = null;
    warmPagePromise = null;
    rasterPagePromise = null;
  }
  sharedBrowserPromise = (async () => {
    const executablePath = await getExecutablePath();
    // AUD-199: 允许宿主机具备 seccomp/userns 条件时通过 IQS_CHROMIUM_NO_SANDBOX=false 开启完整沙箱
    const noSandboxEnv = String(process.env.IQS_CHROMIUM_NO_SANDBOX || "").trim().toLowerCase();
    const useNoSandbox = noSandboxEnv
      ? noSandboxEnv !== "false" && noSandboxEnv !== "0"
      : process.platform === "linux";
    const browserArgs = ["--disable-dev-shm-usage", "--disable-gpu"];
    if (useNoSandbox) {
      browserArgs.unshift("--no-sandbox", "--disable-setuid-sandbox");
    }
    const launchOptions = {
      headless: true,
      args: browserArgs
    };
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    const browser = await puppeteer.launch(launchOptions);
    browser.on("disconnected", () => {
      sharedBrowserPromise = null;
      warmPagePromise = null;
      rasterPagePromise = null;
    });
    return browser;
  })();
  return sharedBrowserPromise;
}

async function getRasterPage() {
  if (rasterPagePromise) {
    try {
      const p = await rasterPagePromise;
      if (p && !p.isClosed()) return p;
    } catch { }
    rasterPagePromise = null;
  }
  rasterPagePromise = (async () => {
    const browser = await getSharedBrowser();
    return await browser.newPage();
  })();
  return rasterPagePromise;
}

/**
 * Tier-1 专用：将进程内生成的确定性 SVG 字符串光栅化为 3x 高清 PNG Base64。
 * 优先尝试 @resvg/resvg-js（若环境已装），否则复用常驻 Browser 的单页 Canvas 光栅化（无需访问 :12000 Web 服务，零新建 Page 开销）。
 */
async function rasterizeSvgString(svgString, width, height) {
  try {
    const resvgMod = await import("@resvg/resvg-js").catch(() => null);
    if (resvgMod && resvgMod.Resvg) {
      const resvg = new resvgMod.Resvg(svgString, {
        background: "#ffffff",
        fitTo: width ? { mode: "width", value: width * 3 } : { mode: "zoom", value: 3 },
        font: { loadSystemFonts: true }
      });
      return Buffer.from(resvg.render().asPng()).toString("base64");
    }
  } catch { }

  const page = await getRasterPage();
  try {
    const dataURL = await page.evaluate(async (svg, w, h) => {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      try {
        const img = await new Promise((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = url;
        });
        const outW = w || img.naturalWidth || 1200;
        const outH = h || img.naturalHeight || 800;
        const scale = 3;
        const canvas = document.createElement("canvas");
        canvas.width = outW * scale;
        canvas.height = outH * scale;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/png");
      } finally {
        URL.revokeObjectURL(url);
      }
    }, svgString, width, height);
    return String(dataURL || "").replace(/^data:image\/png;base64,/, "");
  } catch (e) {
    rasterPagePromise = null;
    throw e;
  }
}

async function getWarmPage() {
  if (warmPagePromise) {
    try {
      const p = await warmPagePromise;
      if (p && !p.isClosed()) return p;
    } catch { }
    warmPagePromise = null;
  }
  warmPagePromise = (async () => {
    const browser = await getSharedBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 3 });
    await page.evaluateOnNewDocument(() => {
      const style = document.createElement("style");
      style.id = "iqs-headless-style";
      style.textContent = `
        #root, body, html { height: 100vh !important; width: 100vw !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: white !important; }
        #root > div { height: 100% !important; width: 100% !important; overflow: hidden !important; }
        #pareto-chart-container, #vchart-container, .mermaid, .echarts-for-react { height: 100% !important; width: 100% !important; position: absolute !important; top: 0 !important; left: 0 !important; }
        .p-8, .p-4 { padding: 0 !important; }
        *, *::before, *::after {
          animation-delay: -1ms !important;
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
        }
      `;
      document.head.appendChild(style);
    });
    const url = `${BASE_URL}/?mode=headless&theme=light`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForFunction(() => window.IQS_READY === true, { timeout: 15000 });
    return page;
  })();
  return warmPagePromise;
}

function evaluateWithTimeout(page, fn, arg, timeoutMs = 12000) {
  return Promise.race([
    page.evaluate(fn, arg),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Tier-2 render timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

function finalizeRenderOutput(base64Data, saveToFile, baseUrlOverride) {
  if (!saveToFile) {
    return { base64: base64Data };
  }
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19).replace("T", "_");
  const hash = Math.random().toString(36).substring(2, 8);
  const filename = `render_${timestamp}_${hash}.png`;
  const filePath = path.join(RENDERS_DIR, filename);
  fs.writeFileSync(filePath, base64Data, "base64");
  rendersSinceLastPrune += 1;
  if (rendersSinceLastPrune >= 20) {
    rendersSinceLastPrune = 0;
    setImmediate(pruneRendersDir);
  }
  const activeBaseUrl = (baseUrlOverride || PUBLIC_URL || `http://${SERVER_IP}:${process.env.PORT || 12001}`).replace(/\/$/, "");
  return { url: `${activeBaseUrl}/renders/${filename}` };
}

/**
 * 鱼骨图按结构复杂度自动升档画布（③）：
 * 5M1E 六骨、三层以上深钻在 1200×800 下有效字号只有 5–7px（几何必然，见 R29 §12/§13）。
 * 这里按「大骨数 / 最大层级」预估所需画布，避免出图后字太小还要重跑。
 */
function autoScaleFishboneCanvas(dsl, width, height) {
  const lines = String(dsl || "").split(/\r?\n/);
  let mains = 0;
  let maxDepth = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || /^Color\[/i.test(line) || /^Title\s*[:：]/i.test(line)) continue;
    const m = line.match(/^(#+)\s+\S+/);
    if (!m) continue;
    const lv = m[1].length;
    if (lv === 1) mains++;
    if (lv > maxDepth) maxDepth = lv;
  }
  let w = width;
  let h = height;
  if (mains > 6 || maxDepth > 4) { w = Math.max(w, 1920); h = Math.max(h, 1200); }
  else if (mains > 4 || maxDepth > 3) { w = Math.max(w, 1600); h = Math.max(h, 1000); }
  return { width: w, height: h, mains, maxDepth, scaled: w !== width || h !== height };
}

async function renderChart(type, dsl, width = 1200, height = 800, saveToFile = false, baseUrlOverride = "") {
  if (type === "fishbone") {
    const fit = autoScaleFishboneCanvas(dsl, width, height);
    if (fit.scaled) {
      console.error(
        `[MCP] 鱼骨图结构较复杂（大骨 ${fit.mains} 个 / 最深层级 ${fit.maxDepth}），` +
        `画布自动升档为 ${fit.width}×${fit.height} 以保证可读性`
      );
      width = fit.width;
      height = fit.height;
    }
  }
  // ── Tier-1: 进程内原生 SVG 直出（Flow / Fishbone / Relation / PDPC 零 Web 服务依赖，~30ms–120ms）──
  if (type === "flow" || type === "fishbone" || type === "relation" || type === "pdpc") {
    try {
      const coreMod = await loadCoreBundle();
      if (coreMod) {
        let rendered = null;
        if (type === "flow" && typeof coreMod.renderFlowSVG === "function") {
          rendered = coreMod.renderFlowSVG(dsl);
        } else if (type === "fishbone" && typeof coreMod.renderFishboneSVG === "function") {
          rendered = coreMod.renderFishboneSVG(dsl, width, height);
        } else if (type === "relation" && typeof coreMod.renderRelationSVG === "function") {
          rendered = coreMod.renderRelationSVG(dsl, width, height);
        } else if (type === "pdpc" && typeof coreMod.renderPDPCSVG === "function") {
          rendered = coreMod.renderPDPCSVG(dsl);
        }
        if (rendered && rendered.svg) {
          const base64Data = await rasterizeSvgString(rendered.svg, rendered.width || width, rendered.height || height);
          if (base64Data) {
            return finalizeRenderOutput(base64Data, saveToFile, baseUrlOverride);
          }
        }
      }
    } catch (e) {
      console.error(`[MCP Tier-1] Native ${type} render fallback to Tier-2: ${e.message}`);
    }
  }

  // ── Tier-2: 常驻热页池 IPC 渲染（串行复用单页或降级新建页，避免并发 OOM）──
  const runTier2 = async () => {
    try {
      const page = await getWarmPage();
      await page.setViewport({ width, height, deviceScaleFactor: 3 });
      const hasWarmBridge = await page.evaluate(() => typeof window.renderIQSChart === "function");
      if (hasWarmBridge) {
        const dataURL = await evaluateWithTimeout(
          page,
          async (params) => await window.renderIQSChart(params),
          { type, dsl, width, height, pixelRatio: 3, backgroundColor: "#ffffff" },
          12000
        );
        if (dataURL) {
          const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
          return finalizeRenderOutput(base64Data, saveToFile, baseUrlOverride);
        }
      }
    } catch (warmErr) {
      console.warn(`[MCP Tier-2] Warm page render failed (${warmErr.message}), resetting warm page...`);
      warmPagePromise = null;
    }

    // 兜底：若目标 Web 服务为旧版前端（尚未暴露 window.renderIQSChart）或热页异常，走单页冷加载
    const browser = await getSharedBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport({ width, height, deviceScaleFactor: 3 });
      const encodedDsl = encodeURIComponent(dsl);
      const url = `${BASE_URL}/?mode=headless&type=${type}&dsl=${encodedDsl}&theme=light`;
      await page.evaluateOnNewDocument((w, h) => {
        const style = document.createElement("style");
        style.textContent = `
          #root, body, html { height: ${h}px !important; width: ${w}px !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: white !important; }
          #root > div { height: 100% !important; width: 100% !important; overflow: hidden !important; }
          #pareto-chart-container, #vchart-container, .mermaid, .echarts-for-react { height: 100% !important; width: 100% !important; position: absolute !important; top: 0 !important; left: 0 !important; }
          .p-8, .p-4 { padding: 0 !important; }
          *, *::before, *::after {
            animation-delay: -1ms !important;
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
            transition-delay: 0s !important;
            transition-duration: 0s !important;
          }
        `;
        document.head.appendChild(style);
      }, width, height);
      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
      await page.waitForFunction(() => window.IQS_READY === true, { timeout: 20000 });
      await page.evaluate(() => { window.dispatchEvent(new Event("resize")); });
      await new Promise((r) => setTimeout(r, 250));
      const dataURL = await evaluateWithTimeout(
        page,
        async (w, h) => {
          if (typeof window.captureIQSChart === "function") {
            return await window.captureIQSChart({ pixelRatio: 3, backgroundColor: "#ffffff", width: w, height: h });
          }
          return "";
        },
        [width, height],
        12000
      );
      if (!dataURL) {
        throw new Error("Failed to capture chart via captureIQSChart bridge");
      }
      const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
      return finalizeRenderOutput(base64Data, saveToFile, baseUrlOverride);
    } finally {
      await page.close().catch(() => { });
    }
  };

  const next = renderQueue.then(runTier2, runTier2);
  renderQueue = next.catch(() => { });
  return next;
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
    const parent = tool.parent_type;
    const slug = String(tool.name).replace(/^render_/, '');
    const readHint = `【完整语法规范调用 read_protocol("${slug}")】`;
    const sampleLines = String(tool.official_example || '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('//'))
      .slice(0, 4)
      .join('\\n');
    const sampleHint = sampleLines ? `范式: ${sampleLines}。` : '';

    if (parent === "mermaid") {
      return `纯文本 Mermaid 代码（严禁 Markdown 代码块围栏 \`\`\` ）。${sampleHint}${readHint}`;
    }
    if (parent === "vchart") {
      return `纯文本外壳（严禁直接传裸 JSON）。格式必须为: Title: 标题\\nSpec: { ... }。${readHint}`;
    }
    return `纯文本 IQS-DSL v1（严禁 JSON 对象，严禁 Markdown 代码块围栏）。${sampleHint}${readHint}`;
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
   * 自动对重复段落（如 promptDoc 中与 rawSegment 重复的范式和语法表）去重，并保证中文大章节序号严格递增。
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

    const CN_NUM = ["一", "二", "三", "四", "五", "六"];
    let secIdx = 0;
    const nextSec = () => CN_NUM[secIdx++] || String(secIdx);

    const sections = [
      `# [${tierLabel}] ${tool.display_name}（完整协议切片与语法规范）`,
      `\n- **图表类型**: \`${tool.name}\` (${tool.parent_type}/${tool.sub_type})`,
      `- **分层定义**: ${tierLabel} (${parent === "iqs_native" ? "IQS-DSL v1 核心质量控制图表" : "救济通道方言建模"})`,
      tool.intent_trigger?.length ? `- **意图触发**: ${tool.intent_trigger.join(", ")}` : "",
      tool.description ? `- **功能概述**: ${tool.description}` : "",
      tool.expertise ? `- **业务专长**: ${tool.expertise}` : ""
    ];

    // 1. 若存在该图表专属的编译卡 (Agent Guide)，作为核心红线指令优先引入
    if (agentDoc) {
      sections.push(`\n---\n## ${nextSec()}、编译卡与红线指令 (Agent Guide)\n\n${agentDoc}`);
    }

    // 2. 家族总纲 (Master Protocol)
    if (master && master.name !== tool.name) {
      sections.push(
        `\n---\n## ${nextSec()}、家族总纲 (Master Protocol: ${master.display_name})\n` +
        `${master.expert_logic || ""}\n\n${master.syntax_rules || ""}`
      );
    }

    // 3. 专家协议切片全文 (Segment: Soul & Flesh，含正反例、参数与语法约束)
    if (rawSegment) {
      const cleanSegment = rawSegment.replace(/\n---\n\n\*\*权威性声明\*\*[\s\S]*$/, "").trim();
      sections.push(`\n---\n## ${nextSec()}、专家协议切片全文 (The Protocol Segment)\n\n${cleanSegment}`);
    } else {
      if (tool.expert_logic) sections.push(`\n---\n## ${nextSec()}、专家逻辑 (Expert Logic)\n\n${tool.expert_logic}`);
      if (tool.syntax_rules) sections.push(`\n---\n## ${nextSec()}、语法规则 (Syntax Rules)\n\n${tool.syntax_rules}`);
    }

    // 4. 官方范式示例 (Official Example) —— 若 rawSegment 未含示例才完整输出，否则输出精简指引以消除三倍重复
    if (tool.official_example) {
      if (!rawSegment || !rawSegment.includes("## 3. 官方示例")) {
        sections.push(
          `\n---\n## ${nextSec()}、官方范式示例 (Official Example)\n\n` +
          `> 必须以纯文本输出以下 DSL 范式，严禁 Markdown 代码块围栏，严禁 JSON 对象：\n\n` +
          `\`\`\`dsl\n${tool.official_example}\n\`\`\``
        );
      } else {
        sections.push(
          `\n---\n## ${nextSec()}、官方范式示例 (Official Example)\n\n` +
          `> 标准 DSL 范式已包含于上方「3. 官方示例 (The Seed)」小节；调用工具时必须以纯文本输出，严禁 Markdown 代码块围栏，严禁 JSON 对象。`
        );
      }
    }

    // 5. AI 生成提示词与全局输出红线 (Prompt & Output Controls) —— 剥离与 rawSegment 重复的 `## 范式` 和 `## 语法` 块
    if (promptDoc) {
      const compactPrompt = promptDoc.split(/\n## 范式/)[0].trim();
      sections.push(`\n---\n## ${nextSec()}、AI 生成提示词与输出规范 (Prompt Template)\n\n${compactPrompt}`);
    } else {
      sections.push(
        `\n---\n## ${nextSec()}、全局输出红线 (Output Controls)\n\n` +
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

function resolveTrustProxySetting() {
  const trustProxyEnv = (process.env.IQS_TRUST_PROXY || "").trim();
  if (trustProxyEnv === "true") return true;
  if (trustProxyEnv === "false") return false;
  if (/^\d+$/.test(trustProxyEnv)) return Number(trustProxyEnv);
  if (trustProxyEnv) return trustProxyEnv;
  return "loopback, linklocal, uniquelocal";
}

/**
 * R33 / AUD-195：单进程内嵌生产级静态 Web + API 服务 (:12000)，彻底取代运行期 `npx vite preview`
 */
function startEmbeddedWebServer({ webPort, trustProxy, apiMiddleware, strict }) {
  const indexHtmlPath = path.join(DIST_DIR, "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    if (strict) {
      console.error(`[IQS Web] dist/index.html not found at ${indexHtmlPath}. Run 'npm run build' first.`);
      process.exit(1);
    }
    return Promise.resolve(null);
  }

  const webApp = express();
  webApp.disable("x-powered-by");
  webApp.set("trust proxy", trustProxy);
  webApp.use(apiMiddleware);

  // Vite 带哈希构建产物开启 1 年强缓存；入口 HTML 与 config.js 保持协商验证
  webApp.use(
    "/assets",
    express.static(path.join(DIST_DIR, "assets"), {
      maxAge: "365d",
      immutable: true,
    })
  );
  webApp.use(
    express.static(DIST_DIR, {
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html") || filePath.endsWith("config.js") || filePath.endsWith("config.json")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );

  // SPA History Fallback（Express 5 兼容写法：中间件兜底非静态/非 API 的 GET 请求）
  webApp.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api/")) return next();
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexHtmlPath);
  });

  return new Promise((resolve, reject) => {
    const srv = webApp.listen(webPort, "0.0.0.0", () => {
      activeHttpServers.push(srv);
      console.error(`IQS Production Web & API Server running on http://0.0.0.0:${webPort}`);
      resolve(srv);
    });
    srv.on("error", (err) => {
      if (!strict && err && err.code === "EADDRINUSE") {
        console.error(
          `[IQS Web] Port ${webPort} already served externally (e.g. Vite dev server), skipping embedded static server.`
        );
        resolve(null);
        return;
      }
      reject(err);
    });
  });
}

async function main() {
  const transportType = process.argv.find(arg => arg.startsWith("--transport="))?.split("=")[1] || "stdio";
  const forceServeWeb =
    process.argv.includes("--serve-web") ||
    String(process.env.SERVE_WEB || "").toLowerCase() === "true";
  const disableServeWeb =
    process.argv.includes("--no-serve-web") ||
    String(process.env.SERVE_WEB || "").toLowerCase() === "false";

  if (transportType === "sse") {
    setImmediate(pruneRendersDir);
    const gcTimer = setInterval(pruneRendersDir, 60 * 60 * 1000);
    if (typeof gcTimer.unref === "function") gcTimer.unref();

    const trustProxy = resolveTrustProxySetting();
    const apiMiddleware = createIqsApiMiddleware({ rootDir: ROOT_DIR });
    const webPort = Number(process.env.WEB_PORT) || 12000;

    if (!disableServeWeb) {
      await startEmbeddedWebServer({
        webPort,
        trustProxy,
        apiMiddleware,
        strict: forceServeWeb,
      });
    }

    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", trustProxy);
    app.use(cors());
    app.use(apiMiddleware);
    app.use('/renders', express.static(RENDERS_DIR, { maxAge: "7d", immutable: true }));

    const port = Number(process.env.PORT) || 12001;
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

    const mcpHttpServer = app.listen(port, "0.0.0.0", () => {
      activeHttpServers.push(mcpHttpServer);
      console.error(`IQS Expert Chart MCP Server (SSE) running on port ${port}`);
      console.error(`- Public URL: ${PUBLIC_URL}`);
      console.error(`- SSE endpoint: ${PUBLIC_URL}/sse`);
      console.error(`- Health check: http://127.0.0.1:${port}/healthz`);
    });
  } else {
    const transport = new StdioServerTransport();
    const server = createServer();
    await server.connect(transport);
    console.error("IQS Expert Chart MCP Server (Stdio) running with full knowledge injection");
  }
}

main().catch(console.error);
