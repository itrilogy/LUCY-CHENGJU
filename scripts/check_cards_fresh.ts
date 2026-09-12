/**
 * 产物新鲜度门禁（S1）
 *
 * 语义：**「重生成前后是否变化」**，而不是「与 HEAD 是否一致」。
 *
 * 为什么不能用 `git diff --exit-code`：
 *   生产产物（`mcp-server/mcp_tools.json`、`protocol/segments/*`…）在正常工作流里
 *   **本来就处于未提交状态**，`git diff` 永远非空 —— 那样门禁恒红，等于没有。
 *
 * 正确的判据是：
 *   若 L0 真源（`dsl/cards/*.card.ts`）与当前产物**已经一致**，那么重跑生成器
 *   **不应该改变任何字节**；一旦变了，就说明产物被手工改过（或生成器有非确定性），
 *   两者都必须红灯。
 *
 * 运行：node --experimental-strip-types scripts/check_cards_fresh.ts
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** 受真源驱动的产物（与 build_cards.ts 的写入目标一致） */
const TARGETS = [
  'mcp-server/mcp_tools.json',
  'protocol/intents.md',
  'constants.tsx',
];

/** 目录级产物：逐文件取 hash */
const DIRS = ['protocol/segments', 'protocol/prompts'];

function hashFile(p: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);
}

function snapshot(): Map<string, string> {
  const m = new Map<string, string>();
  for (const rel of TARGETS) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) m.set(rel, hashFile(full));
  }
  for (const dir of DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full).sort()) {
      const fp = path.join(full, f);
      if (fs.statSync(fp).isFile()) m.set(`${dir}/${f}`, hashFile(fp));
    }
  }
  return m;
}

console.log('=== 产物新鲜度检查 ===');
const before = snapshot();
console.log(`快照：${before.size} 个产物文件`);

console.log('重生成中…');
execFileSync(process.execPath, ['--experimental-strip-types', path.join(__dirname, 'build_cards.ts')], {
  cwd: ROOT, stdio: 'pipe',
});

const after = snapshot();

const changed: string[] = [];
for (const [k, v] of before) {
  if (after.get(k) !== v) changed.push(k);
}
for (const k of after.keys()) {
  if (!before.has(k)) changed.push(`${k}（新增）`);
}

console.log('---');
if (changed.length === 0) {
  console.log('PASS —— 重生成前后完全一致，产物与 L0 真源同步');
  process.exit(0);
}
console.error(`FAIL: ${changed.length} 个产物与 L0 真源不同步（产物被手工改过，或生成器非确定性）`);
for (const c of changed.slice(0, 20)) console.error(`   · ${c}`);
if (changed.length > 20) console.error(`   …另有 ${changed.length - 20} 个`);
process.exit(1);
