#!/usr/bin/env node
/**
 * IQS-DSL v1 validation gate
 * - kinds.json core kinds complete
 * - mcp_tools.json covers all core mcpName
 * - official examples exist, start with Title, no fence markers
 * - affinity example must use Item: not only #
 * - fishbone example must use # tree
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const kinds = JSON.parse(fs.readFileSync(path.join(root, 'dsl/kinds.json'), 'utf8'));
const tools = JSON.parse(fs.readFileSync(path.join(root, 'mcp-server/mcp_tools.json'), 'utf8'));

let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  errors++;
}
function warn(msg) {
  console.warn(`⚠ ${msg}`);
  warnings++;
}
function ok(msg) {
  console.log(`✓ ${msg}`);
}

const toolByName = new Map(tools.map((t) => [t.name, t]));
const native = tools.filter((t) => t.parent_type === 'iqs_native' && t.sub_type !== 'master');

console.log('=== IQS-DSL v1 validate ===');
console.log(`kinds.json v${kinds.version} core=${kinds.coreKinds.length}`);
console.log(`mcp native tools=${native.length} total tools=${tools.length}`);

// 1. Core MCP coverage
for (const k of kinds.coreKinds) {
  if (!k.mcpName) {
    fail(`kind ${k.id} missing mcpName`);
    continue;
  }
  const t = toolByName.get(k.mcpName);
  if (!t) {
    fail(`MCP missing tool ${k.mcpName} (kind ${k.id})`);
    continue;
  }
  if (t.parent_type !== 'iqs_native') {
    fail(`${k.mcpName} parent_type should be iqs_native, got ${t.parent_type}`);
  }
  if (t.sub_type !== k.id && !(k.id === 'matrixPlot' && t.sub_type === 'matrixPlot')) {
    warn(`${k.mcpName} sub_type=${t.sub_type} expected ${k.id}`);
  }
  ok(`MCP has ${k.mcpName}`);
}

// 2. Example quality
for (const t of native) {
  const ex = (t.official_example || '').trim();
  if (!ex || ex === 'N/A') {
    fail(`${t.name}: empty official_example`);
    continue;
  }
  if (!/^Title\s*:/im.test(ex)) {
    fail(`${t.name}: official_example must contain Title:`);
  }
  if (/```/.test(ex)) {
    fail(`${t.name}: official_example must not contain markdown fences`);
  }
  if (t.sub_type === 'affinity') {
    if (!/Item\s*:/i.test(ex)) fail(`${t.name}: affinity example must use Item:`);
    if (/^#+\s+/m.test(ex) && !/Item\s*:/i.test(ex)) {
      fail(`${t.name}: affinity must not use # tree without Item:`);
    }
  }
  if (t.sub_type === 'fishbone') {
    if (!/^#+\s+/m.test(ex)) fail(`${t.name}: fishbone example must use # tree headers`);
  }
  if (t.sub_type === 'control') {
    if (!/\[series\]/i.test(ex)) fail(`${t.name}: control example should use [series] block`);
  }
}

// 3. Master present
if (!toolByName.get('render_iqs_native_master')) {
  fail('missing render_iqs_native_master');
} else {
  ok('native master present');
}

// 4. Spec file exists
const specPath = path.join(root, kinds.spec || 'docs/IQS_DSL_V1_SPEC.md');
if (!fs.existsSync(specPath)) fail(`spec missing: ${kinds.spec}`);
else ok(`spec present: ${kinds.spec}`);

// 5. Soft: relief tools should not claim SPC
for (const t of tools) {
  if (t.parent_type === 'vchart' && /控制图|Nelson|Western-Electric/i.test(t.description || '')) {
    warn(`${t.name}: relief tool description mentions SPC jargon`);
  }
}

// 6. Engineering assets
const requiredFiles = [
  'docs/IQS_DSL_V1_SPEC.md',
  'docs/IQS_DSL_V1_MANUAL.md',
  'dsl/kinds.json',
  'dsl/index.ts',
  'dsl/shell.ts',
  'dsl/registry.ts',
  'protocol/DSL_V1.md',
  'protocol/governance.md',
  'mcp-server/package.json'
];
for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing asset: ${rel}`);
  else ok(`asset ${rel}`);
}

// Manual must be substantial (granularity gate)
const manualPath = path.join(root, 'docs/IQS_DSL_V1_MANUAL.md');
if (fs.existsSync(manualPath)) {
  const manual = fs.readFileSync(manualPath, 'utf8');
  const minChars = 25000;
  if (manual.length < minChars) {
    fail(`IQS_DSL_V1_MANUAL.md too short (${manual.length} < ${minChars}); expand granularity`);
  } else {
    ok(`manual size ${manual.length} chars`);
  }
  for (const kind of kinds.coreKinds.map((k) => k.id)) {
    if (!manual.includes('`' + kind + '`') && !manual.includes(`### 8.`) && !new RegExp(kind, 'i').test(manual)) {
      warn(`manual may miss kind section: ${kind}`);
    }
  }
  // require each core kind named in a heading-ish context
  for (const kind of kinds.coreKinds.map((k) => k.id)) {
    if (!manual.includes(kind)) fail(`manual missing kind id: ${kind}`);
  }
  ok('manual covers all core kind ids');
}

// 7. tier field on tools
const missingTier = tools.filter((t) => !t.tier && t.sub_type !== 'master');
if (missingTier.length) {
  warn(`${missingTier.length} tools missing tier field (non-fatal)`);
} else {
  ok('all non-master tools have tier');
}

console.log('---');
if (errors === 0) {
  console.log(`PASS (${warnings} warnings)`);
  process.exit(0);
} else {
  console.error(`FAIL: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
}
