/**
 * MCP 核心校验包新鲜度门禁（Freshness Sentinel）
 *
 * 验证 scripts/flow_lint_core.ts 的最新打包产物是否与
 * mcp-server/lib/flow_lint.mjs 保持 100% 同步。
 *
 * 运行方式：
 *   node --experimental-strip-types scripts/check_mcp_lint_fresh.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const BUNDLE_PATH = path.join(repoRoot, 'mcp-server/lib/flow_lint.mjs');
const CORE_SOURCE = path.join(repoRoot, 'scripts/flow_lint_core.ts');

if (!fs.existsSync(CORE_SOURCE)) {
  console.error(`❌ 未找到源码: ${CORE_SOURCE}`);
  process.exit(1);
}

if (!fs.existsSync(BUNDLE_PATH)) {
  console.error(`❌ 未找到目标产物: ${BUNDLE_PATH}。请先执行 npm run build:mcp-lint`);
  process.exit(1);
}

// 临时打包至内存对比
const res = spawnSync('npx', [
  'esbuild',
  'scripts/flow_lint_core.ts',
  '--bundle',
  '--platform=node',
  '--format=esm',
  '--target=node22',
  '--log-level=warning'
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024
});

if (res.status !== 0) {
  console.error(`❌ 临时构建失败:\n${res.stderr || res.error}`);
  process.exit(1);
}

const freshOutput = (res.stdout || '').trim();
const currentBundle = fs.readFileSync(BUNDLE_PATH, 'utf8').trim();

if (freshOutput !== currentBundle) {
  console.error(`❌ [FRESHNESS CHECK FAILED] mcp-server/lib/flow_lint.mjs 已过时！`);
  console.error(`   检测到 scripts/flow_lint_core.ts 或其依赖发生了变动，但产物未同步。`);
  console.error(`   👉 请立即执行: npm run build:mcp-lint 并将更新后的产物一并提交。`);
  process.exit(1);
}

console.log(`✅ [FRESHNESS PASS] mcp-server/lib/flow_lint.mjs 与 scripts/flow_lint_core.ts 完全同步。`);
process.exit(0);
