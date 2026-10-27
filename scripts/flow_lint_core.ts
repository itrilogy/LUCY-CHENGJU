/**
 * IQS-Flow DSL 诊断核心（纯函数，无 I/O）。
 *
 * 两处使用：
 *  1. scripts/lint_flow.ts —— 命令行包装（stdin → JSON）
 *  2. mcp-server/lib/flow_lint.mjs —— 由 `npm run build:mcp-lint` 经 esbuild 打包，
 *     MCP 服务进程内直接 import，不再依赖仓库中的 scripts/ 与 components/ 源码目录。
 */
import { parseFlowDSL } from '../components/flow/FlowParser.ts';

export interface AnnotatedError {
  line?: number;
  snippet?: string;
  message: string;
}

export interface FlowLintResult {
  errors: string[];
  warnings: string[];
  nodes: number;
  edges: number;
  lanes: number;
  gateways: number;
  subprocesses: number;
  annotatedErrors: AnnotatedError[];
  fixHints: string[];
}

export function looksLikeMermaid(dsl: string): boolean {
  const head = dsl.trim().split('\n').slice(0, 8).join('\n');
  return /\b(flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/i.test(head)
    || /^\s*flowchart\b/im.test(dsl)
    || /^\s*graph\s+(TD|LR)\b/im.test(dsl);
}

/**
 * 根据错误描述，在 DSL 源码中寻找最相关的行号与代码切片（行号 1-indexed）
 */
function annotateErrors(lines: string[], errors: string[]): AnnotatedError[] {
  return errors.map((msg) => {
    // 1. 尝试匹配节点 ID，如 "节点 w3 ...", "分支源 w2 ..."
    const nodeMatch = msg.match(/(?:节点|分支源|分支目标|显式边源|显式边目标)\s*([a-zA-Z0-9_-]+)/);
    if (nodeMatch) {
      const nodeId = nodeMatch[1];
      const foundIdx = lines.findIndex((l) => {
        const trimmed = l.trim();
        return trimmed.startsWith(`W: ${nodeId}:`) ||
               trimmed.startsWith(`W:${nodeId}:`) ||
               new RegExp(`\\b${nodeId}\\b`).test(trimmed);
      });
      if (foundIdx >= 0) {
        return { line: foundIdx + 1, snippet: lines[foundIdx].trim(), message: msg };
      }
    }

    // 2. 尝试匹配字典，如 "字典 D 重复定义", "引用了未定义字典 D"
    const dictMatch = msg.match(/字典\s*([a-zA-Z0-9_]+)/);
    if (dictMatch) {
      const dictName = dictMatch[1];
      const foundIdx = lines.findIndex((l) => {
        const trimmed = l.trim();
        return trimmed.startsWith(`Dict: ${dictName}[`) ||
               trimmed.startsWith(`Dict:${dictName}[`) ||
               trimmed.includes(`Lane from ${dictName}`);
      });
      if (foundIdx >= 0) {
        return { line: foundIdx + 1, snippet: lines[foundIdx].trim(), message: msg };
      }
    }

    // 3. 意外的 End 或缺少 End
    if (msg.includes('End')) {
      const foundIdx = lines.findIndex((l) => l.trim() === 'End');
      if (foundIdx >= 0) {
        return { line: foundIdx + 1, snippet: lines[foundIdx].trim(), message: msg };
      }
    }

    // 4. 缺少开始/结束节点
    if (msg.includes('开始节点') || msg.includes('结束节点')) {
      const foundIdx = lines.findIndex((l) => /Type\[[SE]\]/i.test(l));
      if (foundIdx >= 0) {
        return { line: foundIdx + 1, snippet: lines[foundIdx].trim(), message: msg };
      }
    }

    return { message: msg };
  });
}

/**
 * 根据具体的错误分类，动态派发针对性的自愈修复建议（Actionable Fix Hints）
 */
function deriveFixHints(errors: string[], warnings: string[], rawDsl: string): string[] {
  const hints: string[] = [];
  const errText = errors.join(' ');
  const warnText = warnings.join(' ');

  if (errText.includes('越界') || errText.includes('未定义字典')) {
    hints.push('【字典与索引】Dict 必须先于 Lane/W 声明。坐标形如 Location(D[0],P[1])，索引从 0 开始且不可超出字典长度。');
  }

  if (errText.includes('End') || errText.includes('闭合')) {
    hints.push('【块作用域】每个分支网关（Type[?] / Type[+]）与子流程必须单独一行以 End 闭合，顶层主干末尾不应有多余的 End。');
  }

  if (errText.includes('开始节点') || errText.includes('结束节点')) {
    hints.push('【起止规范】顶层流程必须有且仅有 1 个开始节点（Type[S]），且至少有 1 个结束节点（Type[E]）。');
  }

  if (errText.includes('孤立') || errText.includes('无入边且无出边')) {
    hints.push('【连通性保障】流程图中每个工作节点必须接入流转通路，确保有入边或出边，严禁孤岛节点。');
  }

  if (errText.includes('修饰类节点') || errText.includes('Attach')) {
    hints.push('【修饰类规范】N（注释）和 DATA（数据）节点不可作为连线（→）的流转目标，必须使用 Attach(主节点ID) 附着。');
  }

  if (warnText.includes('不含判断节点的环路')) {
    hints.push('【环路合规】检测到流程闭环，业务流转回退/返工边应从判断网关（Type[?]）引出或经过判断网关。');
  }

  if (errText.includes('Mermaid')) {
    hints.push('【DSL 语法】请使用 IQS-Flow 字典-泳道语法（Dict/Lane from/W: id: 标签 Type[...] Location(...)）。见 protocol://segments/iqs_native/flow。');
  }

  if (hints.length === 0 && errors.length > 0) {
    hints.push('【语法指南】请调用 read_protocol("flow") 获取标准 DSL 规范与官方示例。');
  }

  return hints;
}

export function lintFlow(dsl: string): FlowLintResult {
  const text = String(dsl ?? '');
  const lines = text.split('\n');

  if (looksLikeMermaid(text)) {
    const err = '检测到 Mermaid flowchart/graph 语法。体系文件泳道图必须使用 IQS-Flow DSL，并调用 render_flow。见 protocol://segments/iqs_native/flow';
    return {
      errors: [err],
      warnings: [],
      nodes: 0,
      edges: 0,
      lanes: 0,
      gateways: 0,
      subprocesses: 0,
      annotatedErrors: [{ line: 1, snippet: lines[0]?.trim() || '', message: err }],
      fixHints: ['请调用 read_protocol("flow") 参考官方 DSL 标准范式，严禁输出 Mermaid 语法。']
    };
  }

  const r = parseFlowDSL(text);
  const errors = r.errors || [];
  const warnings = r.warnings || [];
  const nodes = r.data?.nodes || [];
  const edges = r.data?.edges || [];
  const lanes = r.data?.lanes || [];

  const gateways = nodes.filter((n) => n.type === 'exclusiveGateway' || n.type === 'parallelGateway').length;
  const subprocesses = r.data?.subProcesses?.length ?? 0;

  return {
    errors,
    warnings,
    nodes: nodes.length,
    edges: edges.length,
    lanes: lanes.length,
    gateways,
    subprocesses,
    annotatedErrors: annotateErrors(lines, errors),
    fixHints: deriveFixHints(errors, warnings, text)
  };
}
