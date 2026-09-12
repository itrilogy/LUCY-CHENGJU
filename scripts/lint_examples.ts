/**
 * DSL 官方示例门禁 —— 走**真实解析链路**
 *
 * 背景（审计 AUD-134）：
 * `scripts/validate_dsl.mjs` 对官方示例只做**正则浅校验**（`Title:` 存在 / 无 markdown
 * 围栏 / affinity 用 `Item:` / fishbone 用 `#`），**不跑解析链路**。因此一类
 * **语义缺陷完全检测不出来**：
 *   · AUD-120 —— 官方正例产出多余边（`w4 → w5`，二者本是并列分支目标）
 *   · AUD-123 —— 示例引用了**从未定义**的节点（`Rel: m1 -> root`）
 *
 * 本脚本补上这一层：
 *   1. 对每个 core kind 的官方示例调用 `lintDsl()`（跨 kind shell 校验）
 *   2. 追加**引用完整性**检查 —— 提取 ID 定义集，扫描边/引用中的目标是否都存在
 *
 * 运行：node --experimental-strip-types scripts/lint_examples.ts
 * 已串入 `npm run validate:dsl`（在 validate_dsl.mjs 之后执行）。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';

/*
 * ⚠️ 为什么用 vite.ssrLoadModule 而不是直接 import
 *
 * `dsl/index.ts` 内部的 import 写成 `'./types'` / `'./registry'`（**不带扩展名**）——
 * Vite 能解析，但 Node 的 ESM 解析器不行，直接 import 会抛
 * `ERR_MODULE_NOT_FOUND: Cannot find module '.../dsl/types'`。
 *
 * 这正是一直没有人能把这个校验接进门禁的技术原因（审计 AUD-134）。
 * 采用审计报告（`FLOW_AGENT_CARD_AUDIT.md`）已验证的同一做法：经 Vite 的
 * SSR 模块加载器载入，绕开 Node 的原生解析限制。
 */
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const dslModule = await vite.ssrLoadModule('/dsl/index.ts');
const regModule = await vite.ssrLoadModule('/dsl/registry.ts');
const lintDsl = dslModule.lintDsl as (kind: string, content: string) => {
  kind: string; ok: boolean; warnings: unknown[]; errors: string[];
};
const QC_TOOL_TO_KIND = regModule.QC_TOOL_TO_KIND as Record<string, string>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

interface McpTool {
  name: string;
  parent_type?: string;
  sub_type?: string;
  official_example?: string;
}

let errors = 0;
let warnings = 0;
let checked = 0;

const fail = (m: string) => { console.error(`✗ ${m}`); errors++; };
const warn = (m: string) => { console.warn(`⚠ ${m}`); warnings++; };

const tools: McpTool[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mcp-server/mcp_tools.json'), 'utf8'),
);

const natives = tools.filter(t => t.parent_type === 'iqs_native' && t.sub_type !== 'master');

console.log('=== DSL 示例门禁（lintDsl + 引用完整性）===');

/**
 * 收集示例中「被定义」的标识符。
 * 覆盖各 kind 的定义行形态：
 *   Node: id, label        （relation）
 *   W: id: ...             （flow）
 *   Item: id, label, [..]  （affinity / pdpc）
 *   形如 `xxx: ...` 的独立行首标识符
 */
function collectDefinedIds(dsl: string): Set<string> {
  const ids = new Set<string>();
  for (const raw of dsl.split('\n')) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^Node\s*:\s*([\w.-]+)/i))) ids.add(m[1]);
    else if ((m = line.match(/^W\s*:\s*([\w.-]+)\s*:/i))) ids.add(m[1]);
    else if ((m = line.match(/^Item\s*:\s*([\w.-]+)/i))) ids.add(m[1]);
    else if ((m = line.match(/^Rel\s*:\s*([\w.-]+)\s*->\s*([\w.-]+)/i))) { ids.add(m[1]); ids.add(m[2]); }
    else if ((m = line.match(/^([A-Za-z_][\w.-]*)\s*:\s*[^:]+\s*\(/))) ids.add(m[1]);
  }
  return ids;
}

/** 收集示例中「被引用」的标识符（#id、-> id、→ #id） */
function collectReferencedIds(dsl: string): Array<{ id: string; where: string }> {
  const refs: Array<{ id: string; where: string }> = [];
  dsl.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('//')) return;
    // flow 风格：`是 → #w4` / `w2 → #g1`
    for (const m of line.matchAll(/[→>-]+\s*#([\w.-]+)/g)) refs.push({ id: m[1], where: `L${i + 1}: ${line}` });
    // relation 风格：`Rel: a -> b`
    const rel = line.match(/^Rel\s*:\s*([\w.-]+)\s*->\s*([\w.-]+)/i);
    if (rel) refs.push({ id: rel[2], where: `L${i + 1}: ${line}` });
    // Attach(#id)
    for (const m of line.matchAll(/Attach\s*\(\s*#([\w.-]+)\s*\)/gi)) refs.push({ id: m[1], where: `L${i + 1}: ${line}` });
  });
  return refs;
}

for (const t of natives) {
  const ex = (t.official_example || '').trim();
  if (!ex || ex === 'N/A') continue;

  const kindId = QC_TOOL_TO_KIND[t.sub_type || ''] || t.sub_type;
  if (!kindId) { warn(`${t.name}: 无法确定 kind，跳过 lint`); continue; }

  checked++;

  // ① 真实 lintDsl
  try {
    const r = lintDsl(kindId, ex);
    if (!r.ok) {
      fail(`${t.name} (kind=${kindId}): lintDsl 失败 → ${r.errors.join(' | ')}`);
    }
    for (const w of r.warnings || []) warn(`${t.name}: ${typeof w === 'string' ? w : JSON.stringify(w)}`);
  } catch (e) {
    fail(`${t.name} (kind=${kindId}): lintDsl 抛异常 → ${(e as Error).message}`);
  }

  // ② 引用完整性（只对有显式 ID 定义的 kind 生效）
  const defined = collectDefinedIds(ex);
  if (defined.size > 0) {
    const refs = collectReferencedIds(ex);
    const dangling = refs.filter(r => !defined.has(r.id));
    const seen = new Set<string>();
    for (const d of dangling) {
      const key = `${d.id}@${d.where}`;
      if (seen.has(key)) continue;
      seen.add(key);
      fail(`${t.name}: 引用未定义标识符 #${d.id} —— ${d.where}`);
    }
  }
}

console.log('---');
console.log(`已校验示例 ${checked} 份`);
await vite.close();

if (errors === 0) {
  console.log(`PASS (${warnings} warnings)`);
  process.exit(0);
} else {
  console.error(`FAIL: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
}
