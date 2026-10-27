import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FLOW_LINT_BUNDLE = path.join(__dirname, "lib/flow_lint.mjs");
const FLOW_LINT_SCRIPT = path.join(__dirname, "../scripts/lint_flow.ts");
let flowLinterPromise = null;

function lintFlowViaSubprocess(dsl) {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", FLOW_LINT_SCRIPT], {
    input: String(dsl ?? ""),
    encoding: "utf8",
    timeout: 8000,
    maxBuffer: 2 * 1024 * 1024,
  });
  const out = (r.stdout || "").trim();
  if (!out) {
    console.error(`[MCP] Flow lint subprocess produced no output: ${String(r.stderr || r.error || "").slice(0, 300)}`);
    return null;
  }
  return JSON.parse(out.split("\n").filter(Boolean).pop());
}

function loadFlowLinter() {
  if (!flowLinterPromise) {
    flowLinterPromise = (async () => {
      if (fs.existsSync(FLOW_LINT_BUNDLE)) {
        try {
          const mod = await import(pathToFileURL(FLOW_LINT_BUNDLE).href);
          if (typeof mod.lintFlow === "function") {
            return (dsl) => mod.lintFlow(String(dsl ?? ""));
          }
        } catch (e) {
          console.error(`[MCP] Flow lint bundle load failed: ${e.message}`);
        }
      }
      if (fs.existsSync(FLOW_LINT_SCRIPT)) {
        return lintFlowViaSubprocess;
      }
      console.error("[MCP] Flow lint unavailable: 诊断跳过，正常放行");
      return null;
    })();
  }
  return flowLinterPromise;
}

/**
 * 通用 Linter 注册表
 * 未来如需扩展 pareto, control 等图表的校验器，只需在此处挂载对应的 linter 函数
 */
const linterRegistry = {
  render_flow: async (dsl) => {
    const linter = await loadFlowLinter();
    if (!linter) return null;
    try {
      return linter(dsl);
    } catch (e) {
      console.error(`[MCP] Flow lint execution error: ${e.message}`);
      return null;
    }
  }
};

/**
 * 获取指定图表工具的前置校验器
 * @param {string} toolName - 工具名称，如 "render_flow"
 * @returns {Function|null} 校验函数
 */
export function getToolLinter(toolName) {
  return linterRegistry[toolName] || null;
}

/**
 * 格式化校验失败时的返回内容（强化对 LLM 的自愈引导）
 */
export function formatLinterError(lintResult) {
  const lines = ["error: true", "\n【DSL 语法错误定位】"];

  if (Array.isArray(lintResult.annotatedErrors) && lintResult.annotatedErrors.length) {
    lintResult.annotatedErrors.forEach((item) => {
      if (item.line && item.snippet) {
        lines.push(`- 第 ${item.line} 行 \`${item.snippet}\`\n  └─ 错误: ${item.message}`);
      } else {
        lines.push(`- 错误: ${item.message}`);
      }
    });
  } else if (Array.isArray(lintResult.errors)) {
    lintResult.errors.forEach((e) => lines.push(`- ${e}`));
  }

  if (Array.isArray(lintResult.warnings) && lintResult.warnings.length) {
    lines.push("\n【潜在警告】");
    lintResult.warnings.forEach((w) => lines.push(`- ${w}`));
  }

  if (Array.isArray(lintResult.fixHints) && lintResult.fixHints.length) {
    lines.push("\n【针对性修复建议】");
    lintResult.fixHints.forEach((h) => lines.push(`- ${h}`));
  }

  return lines.join("\n");
}

/**
 * 格式化校验成功时的轻量诊断报告
 */
export function formatLinterDiag(lintResult) {
  if (!lintResult) return "";
  const parts = [
    "error: false",
    `nodes: ${lintResult.nodes ?? 0}`,
    `edges: ${lintResult.edges ?? 0}`,
    `lanes: ${lintResult.lanes ?? 0}`
  ];

  if (lintResult.gateways != null) parts.push(`gateways: ${lintResult.gateways}`);
  if (lintResult.subprocesses != null) parts.push(`subprocesses: ${lintResult.subprocesses}`);

  if (lintResult.warnings?.length) {
    parts.push(`warnings:\n${lintResult.warnings.map((w) => `  - ${w}`).join("\n")}`);
  } else {
    parts.push("warnings: []");
  }

  return parts.join("\n");
}
