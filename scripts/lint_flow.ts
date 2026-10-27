/**
 * IQS-Flow DSL 诊断：stdin → JSON { errors, warnings, nodes, edges, lanes }
 * 诊断逻辑见 scripts/flow_lint_core.ts（MCP 服务使用其打包产物 mcp-server/lib/flow_lint.mjs）。
 * 运行: node --experimental-strip-types scripts/lint_flow.ts
 */
import { lintFlow } from './flow_lint_core.ts';

const chunks: string[] = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { chunks.push(String(c)); });
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify(lintFlow(chunks.join(''))));
});
