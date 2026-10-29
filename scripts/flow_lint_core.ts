/**
 * IQS MCP 共享核心包（纯函数，无 I/O，零 React/DOM 依赖）。
 *
 * 两处使用：
 *  1. scripts/lint_flow.ts —— 命令行包装（stdin → JSON）
 *  2. mcp-server/lib/flow_lint.mjs —— 由 `npm run build:mcp-lint` 经 esbuild 打包，
 *     提供：
 *       • lintFlow(dsl)           —— IQS-Flow 深度拓扑与语法诊断
 *       • lintCoreKind(kind, dsl) —— 全部 14 个 CORE 图表的统一前置语法与必填项诊断
 *       • renderFlowSVG(dsl)      —— Tier-1 极速进程内 SVG 矢量直出（无需无头浏览器）
 */
import { parseFlowDSL } from '../components/flow/FlowParser.ts';
import { flowToSVG, getSvgSize } from '../components/flow/flowToSVG.ts';
import { lintDsl } from '../dsl/index.ts';
import { computeDeterministicFishboneLayout } from '../utils/fishboneGraph.ts';
import { renderFishboneSVG as renderFishboneNodesToSVG } from '../utils/fishboneSvg.ts';
import { parseRelationDSL } from '../utils/relationGraph.ts';
import { renderRelationSVG as renderRelationDataToSVG } from '../utils/relationSvg.ts';
import { parsePDPCDSL } from '../utils/pdpcGraph.ts';
import { renderPDPCSVG as renderPDPCDataToSVG } from '../utils/pdpcSvg.ts';
import type { FishboneNode, FishboneChartStyles } from '../types.ts';

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

export interface CoreLintResult {
  kind: string;
  errors: string[];
  warnings: string[];
  annotatedErrors: AnnotatedError[];
  fixHints: string[];
  items?: number;
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

/**
 * 14 个 CORE 图表的通用前置语法与结构必填项校验
 */
export function lintCoreKind(kindRaw: string, dslRaw: string): CoreLintResult | FlowLintResult {
  const kind = kindRaw === 'matrix_plot' ? 'matrixPlot' : kindRaw;
  if (kind === 'flow') {
    return lintFlow(dslRaw);
  }

  const text = String(dslRaw ?? '');
  const lines = text.split(/\r?\n/);
  const base = lintDsl(kind, text);
  const errors = [...base.errors];
  const warnings = base.warnings.map((w) => `Line ${w.line}: ${w.message}`);
  const fixHints: string[] = [];
  let items = 0;

  const nonCommentLines = lines.map((l) => l.trim()).filter((l) => l && !l.startsWith('//'));

  switch (kind) {
    case 'fishbone': {
      const headers = nonCommentLines.filter((l) => /^#+\s+\S+/.test(l));
      items = headers.length;
      if (headers.length === 0) {
        errors.push('鱼骨图缺少层级骨行（必须使用 # 一级大骨、## 二级中骨、### 三级小骨）');
        fixHints.push('【鱼骨图语法】请使用 `# 人 (Man)`、`## 具体原因`、`### 根本原因` 声明层级，禁止使用 `-` 列表或 `Item:`。');
        break;
      }

      /* ── 语义门禁：执行 dsl/cards/iqs_native/fishbone.card.ts 已声明的建模约束 ──
         大骨 4–6（软 1–8）、每族中骨 2–8、层级 ≤ 4、Title 必填、单标签 ≤ 16 字 */
      const hasTitle = lines.some((l) => /^\s*Title\s*[:：]\s*\S+/.test(l));
      const baseAlreadyFlagsTitle = errors.some((e) => /title/i.test(e));
      if (!hasTitle && !baseAlreadyFlagsTitle) {
        errors.push('鱼骨图缺少 `Title:` 问题陈述（鱼头）');
        fixHints.push('【鱼骨图语法】`Title: 待分析的问题` 承载鱼头；`#` 只能写原因分类，不要把原因提到大骨层。');
      }

      const bones: { level: number; label: string; line: number }[] = [];
      lines.forEach((raw, i) => {
        const m = raw.trim().match(/^(#+)\s+(.+)$/);
        if (m) bones.push({ level: m[1].length, label: m[2].trim(), line: i + 1 });
      });

      const mains = bones.filter((b) => b.level === 1);
      if (mains.length > 8) {
        warnings.push(`大骨 ${mains.length} 个，超出建议上限 8：族数越多整图缩放比越低，` +
          `实测 6 大骨 + 三层深钻在 1200×800 下有效字号仅 ~6px，建议合并同类或增大画布`);
      } else if (mains.length > 6) {
        warnings.push(`大骨 ${mains.length} 个，略多于推荐的 4–6 个（5M1E 标准为 6）：注意输出画布宽度需随之增大`);
      }

      const maxDepth = bones.reduce((a, b) => Math.max(a, b.level), 0);
      if (maxDepth > 4) {
        warnings.push(`层级深度 ${maxDepth} 超过 4 级：引擎支持多级嵌套，但超过四级会显著压缩可读性，建议用 5 Whys 归并到 3–4 级`);
      }

      /* 每族中骨数量：按最近一次 level-1 归组 */
      let currentMain = '';
      const perMain = new Map<string, number>();
      for (const b of bones) {
        if (b.level === 1) {
          currentMain = b.label;
          perMain.set(currentMain, 0);
        } else if (b.level === 2 && currentMain) {
          perMain.set(currentMain, (perMain.get(currentMain) || 0) + 1);
        }
      }
      for (const [main, count] of perMain) {
        if (count > 8) {
          warnings.push(`大骨「${main}」下 ${count} 个中骨，超过推荐上限 8：该族垂直需求会顶高整图，建议归并同类原因`);
        }
      }

      const longMains = mains.filter((b) => b.label.length > 16);
      if (longMains.length) {
        warnings.push(`大骨标签过长：${longMains.map((b) => `「${b.label}」(${b.label.length} 字)`).join('、')}，` +
          `标题框会横向撑宽族群，建议 ≤ 16 字`);
      }
      break;
    }
    case 'affinity': {
      const itemLines = nonCommentLines.filter((l) => /^Item\s*:/i.test(l));
      items = itemLines.length;
      if (itemLines.length === 0) {
        errors.push('亲和图缺少 `Item: id, 标签, 父ID` 数据行');
        fixHints.push('【亲和图语法】请使用 `Item: root, 核心主题, null` 与 `Item: g1, 分组名, root` 声明节点，禁止使用 `#` 建树。');
      }
      break;
    }
    case 'pareto': {
      const pairLines = nonCommentLines.filter((l) => /^-\s*.+:\s*[\d.]+/.test(l));
      items = pairLines.length;
      if (pairLines.length === 0) {
        errors.push('排列图缺少 `- 缺陷名称: 频数` 数据行（注意不要写 `Data:` 块外壳）');
        fixHints.push('【排列图语法】数据行格式为 `- 物流破损: 420`，直接逐行列出，不要包裹在 `Data:` 下。');
      }
      break;
    }
    case 'histogram': {
      const numLines = nonCommentLines.filter((l) => /^-\s*[\d.-]+/.test(l));
      items = numLines.length;
      if (numLines.length === 0) {
        errors.push('直方图缺少 `- 测量数值` 数据行');
        fixHints.push('【直方图语法】每行一个样本值，格式为 `- 10.02`。');
      }
      break;
    }
    case 'control': {
      const hasSeries = /\[series\]\s*:/i.test(text) && /\[\/series\]/i.test(text);
      items = hasSeries ? 1 : 0;
      if (!hasSeries) {
        errors.push('控制图缺少 `[series]: 系列名 ... [/series]` 数据块（严禁使用 `Data:`）');
        fixHints.push('【控制图语法】必须使用 `[series]: 测量值` 开始数据行，并以 `[/series]` 闭合。');
      }
      break;
    }
    case 'scatter': {
      const tupleLines = nonCommentLines.filter((l) => /^-\s*[\d.-]+\s*,\s*[\d.-]+/.test(l));
      items = tupleLines.length;
      if (tupleLines.length < 2) {
        errors.push('散点图至少需要 2 行 `- x, y` 坐标数据');
        fixHints.push('【散点图语法】每行一个坐标点，格式为 `- 195.5, 85.2`（3D 模式为 `- x, y, z`）。');
      }
      break;
    }
    case 'radar': {
      const axes = nonCommentLines.filter((l) => /^Axis\s*:/i.test(l));
      const series = nonCommentLines.filter((l) => /^Series\s*:/i.test(l));
      items = series.length;
      if (axes.length < 3 || series.length < 1) {
        errors.push(`雷达图至少需要 3 条 \`Axis: 维度名, 满分\`（当前 ${axes.length} 条）与 1 条 \`Series: 名称, [v1, v2, ...]\`（当前 ${series.length} 条）`);
        fixHints.push('【雷达图语法】先写多行 `Axis: 维度, 100`，再写 `Series: 改善前, [70, 80, 65]`。');
      }
      break;
    }
    case 'relation': {
      const nodes = nonCommentLines.filter((l) => /^Node\s*:/i.test(l));
      const rels = nonCommentLines.filter((l) => /^Rel\s*:/i.test(l));
      items = nodes.length;
      if (nodes.length === 0 || rels.length === 0) {
        errors.push('关联图必须同时包含 `Node: id, 标签` 与 `Rel: src -> tgt`');
        fixHints.push('【关联图语法】使用 `Node: n1, 原因描述` 定义节点，`Rel: n1 -> n2` 定义因果指向。');
      } else {
        try {
          parseRelationDSL(text);
        } catch (err: any) {
          errors.push(err?.message || '关联图连线拓扑不合法');
          fixHints.push('【关联图拓扑约束】每个 `Rel: a -> b` 的两端 ID 必须已由 `Node:` 定义，且严禁自环、重复连线与逻辑循环回路。');
        }
      }
      break;
    }
    case 'arrow': {
      const events = nonCommentLines.filter((l) => /^Event\s*:/i.test(l));
      const tasks = nonCommentLines.filter((l) => /^\w+\s*(?:->|\.\.>)\s*\w+/.test(l));
      items = events.length;
      if (events.length === 0 || tasks.length === 0) {
        errors.push('矢线图必须同时包含 `Event: id, 名称` 节点与 `1 -> 2: 作业名, 工期` 边');
        fixHints.push('【矢线图语法】先写 `Event: 1, 开始`，再写 `1 -> 2: 基础施工, 5`（虚工作用 `..>`）。');
      }
      break;
    }
    case 'pdpc': {
      const itemsCount = nonCommentLines.filter((l) => /^Item\s*:/i.test(l)).length;
      const linksCount = nonCommentLines.filter((l) => /--/.test(l)).length;
      items = itemsCount;
      if (itemsCount === 0 || linksCount === 0) {
        errors.push('PDPC 图必须包含 `Item: id, 描述, [类型]` 节点与 `a--b [OK|NG]` 连线');
        fixHints.push('【PDPC 语法】使用 `Group:` / `Item:` / `EndGroup` 声明节点，并用 `s1--c1 [OK]` 连接。');
      } else {
        const parsedPdpc = parsePDPCDSL(text);
        const knownIds = new Set(parsedPdpc.data.nodes.map((n) => n.id));
        for (const lk of parsedPdpc.data.links) {
          if (!knownIds.has(lk.source) || !knownIds.has(lk.target)) {
            errors.push(`PDPC 连线引用了未定义的节点 ID：${lk.source}--${lk.target}`);
            fixHints.push('【PDPC 连通约束】所有 `--` 连线两端的节点 ID 必须先通过 `Item: id, 描述` 定义。');
            break;
          }
        }
      }
      break;
    }
    case 'matrix': {
      const axes = nonCommentLines.filter((l) => /^Axis\s+/i.test(l) || /^Axis\s*:/i.test(l));
      items = axes.length;
      if (axes.length < 2) {
        errors.push('矩阵图至少需要定义 2 个 `Axis` 维度块');
        fixHints.push('【矩阵图语法】请调用 read_protocol("matrix") 查阅标准 `Axis` 与 `Matrix` 块定义。');
      }
      break;
    }
    case 'matrixPlot': {
      const hasData = nonCommentLines.some((l) => /^Data\s*:/i.test(l));
      items = hasData ? 1 : 0;
      if (!hasData) {
        errors.push('矩阵散点图缺少 `Data:` 表头与数据块');
        fixHints.push('【图矩阵语法】必须包含 `Dimensions: ...` 与 `Data:` CSV 数据行。');
      }
      break;
    }
    case 'basic': {
      const datasets = nonCommentLines.filter((l) => /^Dataset\s*:/i.test(l));
      items = datasets.length;
      if (datasets.length === 0) {
        errors.push('基础图表缺少 `Dataset: 系列名, [数值...]` 行');
        fixHints.push('【基础图语法】必须包含 `Categories: [A, B, C]` 与 `Dataset: 系列1, [10, 20, 30]`。');
      }
      break;
    }
  }

  if (errors.length > 0 && fixHints.length === 0) {
    fixHints.push(`【语法指南】请调用 read_protocol("${kindRaw}") 获取该图表的标准 DSL 规范与官方示例。`);
  }

  return {
    kind,
    errors,
    warnings,
    annotatedErrors: errors.map((message) => ({ message })),
    fixHints,
    items,
  };
}

let lastFlowSvgKey = "";
let lastFlowSvgVal: { svg: string; width: number; height: number } | null = null;

/**
 * Tier-1 极速进程内直出：将 IQS-Flow DSL 直接编译为确定性 SVG 字符串与几何尺寸
 */
export function renderFlowSVG(dsl: string): {
  svg: string;
  width: number;
  height: number;
} {
  const key = String(dsl ?? "");
  if (key === lastFlowSvgKey && lastFlowSvgVal) {
    return lastFlowSvgVal;
  }
  const parsed = parseFlowDSL(key);
  const svg = flowToSVG(parsed.data, parsed.styles);
  const size = getSvgSize(parsed.data, parsed.styles);
  const out = {
    svg,
    width: size.width,
    height: size.height,
  };
  lastFlowSvgKey = key;
  lastFlowSvgVal = out;
  return out;
}

/**
 * 纯函数解析鱼骨图 DSL（无 React 依赖）
 */
function parseFishboneDSLCore(content: string): { data: FishboneNode; styles: Required<FishboneChartStyles> } {
  const lines = String(content ?? '').split('\n');
  const newStyles: Required<FishboneChartStyles> = {
    boneLine: '#334155',
    caseLine: '#64748b',
    caseColor: '#1e293b',
    endColor: '#94a3b8',
    rootColor: '#2563eb',
    rootTextColor: '#ffffff',
    mainColor: '#3b82f6',
    mainTextColor: '#ffffff',
  };
  let title = '鱼骨图分析';
  const nodes: FishboneNode[] = [];
  const stack: { node: FishboneNode; level: number }[] = [];
  let seq = 0;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) return;

    const colorMatch = trimmed.match(/Color\[(Root|RootText|Main|MainText|Bone|Line|Text|End)\]:\s*(#[0-9a-fA-F]+)/i);
    if (colorMatch) {
      let key = colorMatch[1].toLowerCase();
      if (key === 'root') key = 'rootColor';
      if (key === 'roottext') key = 'rootTextColor';
      if (key === 'main') key = 'mainColor';
      if (key === 'maintext') key = 'mainTextColor';
      if (key === 'bone') key = 'boneLine';
      if (key === 'line') key = 'caseLine';
      if (key === 'text') key = 'caseColor';
      (newStyles as any)[key] = colorMatch[2];
      return;
    }

    if (trimmed.startsWith('Title:')) {
      title = trimmed.replace('Title:', '').trim();
      return;
    }

    const headerMatch = trimmed.match(/^(#+)\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const label = headerMatch[2].trim();
      seq++;
      const newNode: FishboneNode = {
        id: `fb_node_${seq}`,
        label,
        type: level === 1 ? 'main' : 'sub',
        children: [],
      };
      if (level === 1) {
        nodes.push(newNode);
        stack.length = 0;
        stack.push({ node: newNode, level });
      } else {
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }
        if (stack.length > 0) {
          const parent = stack[stack.length - 1].node;
          if (!parent.children) parent.children = [];
          parent.children.push(newNode);
          stack.push({ node: newNode, level });
        }
      }
    }
  });

  return {
    data: { id: 'root', label: title, type: 'root', children: nodes },
    styles: newStyles,
  };
}

/**
 * Tier-1 极速进程内直出：将鱼骨图 DSL 直接编译为确定性 SVG 字符串与几何尺寸
 */
export function renderFishboneSVG(
  dsl: string,
  width = 1600,
  height = 1000
): { svg: string; width: number; height: number } {
  const { data, styles } = parseFishboneDSLCore(dsl);
  const { nodes, edges } = computeDeterministicFishboneLayout(data, styles, width, height);
  const rendered = renderFishboneNodesToSVG(nodes, edges, width, height, '#ffffff');
  return {
    svg: rendered.svg,
    width: rendered.width,
    height: rendered.height,
  };
}

/**
 * Tier-1 极速进程内直出：将关联图 DSL 直接编译为确定性 SVG 字符串与几何尺寸
 */
export function renderRelationSVG(
  dsl: string,
  width = 1200,
  height = 800
): { svg: string; width: number; height: number } {
  const { nodes, links, styles } = parseRelationDSL(dsl);
  const rendered = renderRelationDataToSVG(nodes, links, styles, width, height);
  return {
    svg: rendered.svg,
    width: rendered.width,
    height: rendered.height,
  };
}

/**
 * Tier-1 极速进程内直出：将 PDPC DSL 直接编译为确定性 SVG 字符串与几何尺寸
 */
export function renderPDPCSVG(
  dsl: string
): { svg: string; width: number; height: number } {
  const { data, styles } = parsePDPCDSL(dsl);
  const rendered = renderPDPCDataToSVG(data, styles);
  return {
    svg: rendered.svg,
    width: rendered.width,
    height: rendered.height,
  };
}
