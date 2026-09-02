/**
 * IQS-Flow DSL 诊断：stdin → JSON { errors, warnings, nodes, edges, lanes }
 * 供 MCP CallTool 在渲染前/失败时把 parser 诊断还给模型。
 * 运行: node --experimental-strip-types scripts/lint_flow.ts
 */
import { parseFlowDSL } from '../components/flow/FlowParser.ts';

function looksLikeMermaid(dsl: string): boolean {
  const head = dsl.trim().split('\n').slice(0, 8).join('\n');
  return /\b(flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/i.test(head)
    || /^\s*flowchart\b/im.test(dsl)
    || /^\s*graph\s+(TD|LR)\b/im.test(dsl);
}

const chunks: string[] = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { chunks.push(String(c)); });
process.stdin.on('end', () => {
  const dsl = chunks.join('');
  if (looksLikeMermaid(dsl)) {
    process.stdout.write(JSON.stringify({
      errors: ['检测到 Mermaid flowchart/graph 语法。体系文件泳道图必须使用 IQS-Flow DSL，并调用 render_flow。见 protocol://segments/iqs_native/flow'],
      warnings: [],
      nodes: 0,
      edges: 0,
      lanes: 0,
    }));
    return;
  }
  const r = parseFlowDSL(dsl);
  process.stdout.write(JSON.stringify({
    errors: r.errors || [],
    warnings: r.warnings || [],
    nodes: r.data?.nodes?.length ?? 0,
    edges: r.data?.edges?.length ?? 0,
    lanes: r.data?.lanes?.length ?? 0,
  }));
});
