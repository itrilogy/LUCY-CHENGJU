/**
 * 卡片门禁（S0 试点）
 *
 * 五道校验：
 *   ① 结构完整性 —— 必填字段齐全、syntax 无重名冲突、描述长度、版本号格式
 *   ② 示例可解析 —— 用**真实 parser** 跑 example 与 starter，errors 必须为空
 *   ③ 示例语义断言 —— 节点/边/泳道计数 + forbiddenEdges/requiredEdges + knownDefects 降级为 warning
 *   ④ 跨 kind 对照 —— 同名指令在不同 kind 的语义差异表（自动产出，硬冲突才 fail）
 *   ⑤ 产物一致性 —— build/cards/ 与真源无漂移（须先跑 build_cards）
 *
 * 运行：node --experimental-strip-types scripts/validate_cards.ts
 *
 * 注：`.tsx` 内的 parser 无法被 node --experimental-strip-types 加载，
 *     故示例解析校验经 vite 的 ssrLoadModule 完成（与审计探针同一路径）。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CardSpec, ExampleExpectation } from '../dsl/cards/_types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CARDS_DIR = path.join(ROOT, 'dsl/cards');
const OUT = path.join(ROOT, 'build/cards');

let errors = 0;
let warnings = 0;
const fail = (m: string) => { console.error(`✗ ${m}`); errors++; };
const warn = (m: string) => { console.warn(`⚠ ${m}`); warnings++; };
const ok = (m: string) => console.log(`✓ ${m}`);

// kind → [模块路径, 导出名, 结果取数器]
type Probe = {
  file: string;
  fn: string;
  pick: (out: any) => { nodes?: number; edges?: number; lanes?: number; series?: number; items?: number; edgeList?: [string, string][] };
};

const PROBES: Record<string, Probe> = {
  flow: {
    file: '/components/flow/FlowParser.ts',
    fn: 'parseFlowDSL',
    pick: (o) => ({
      nodes: o.data?.nodes?.length,
      edges: o.data?.edges?.length,
      lanes: o.data?.lanes?.length,
      edgeList: (o.data?.edges ?? []).map((e: any) => [e.from, e.to] as [string, string]),
    }),
  },
  affinity: {
    file: '/components/AffinityEditor.tsx',
    fn: 'parseAffinityDSL',
    pick: (o) => ({ items: o.data?.length }),
  },
  arrow: { file: '/components/ArrowDiagramEditor.tsx', fn: 'parseArrowDSL', pick: (o) => ({ items: o.data?.nodes?.length }) },
  basic: { file: '/components/BasicEditor.tsx', fn: 'parseBasicDSL', pick: (o) => ({ items: o.data?.datasets?.length }) },
  control: { file: '/components/ControlChartEditor.tsx', fn: 'parseControlDSL', pick: (o) => ({ series: o.series?.length }) },
  fishbone: { file: '/components/FishboneEditor.tsx', fn: 'parseFishboneDSL', pick: (o) => ({ items: o.data?.children?.length }) },
  histogram: { file: '/components/HistogramEditor.tsx', fn: 'parseHistogramDSL', pick: (o) => ({ items: o.data?.length }) },
  matrix: { file: '/components/MatrixEditor.tsx', fn: 'parseMatrixDSL', pick: (o) => ({ items: o.data?.axes?.length }) },
  matrixPlot: { file: '/components/MatrixPlotEditor.tsx', fn: 'parseMatrixPlotDSL', pick: (o) => ({ items: o.data?.data?.length }) },
  pareto: { file: '/components/ParetoEditor.tsx', fn: 'parseParetoDSL', pick: (o) => ({ items: o.items?.length }) },
  pdpc: { file: '/components/PDPCEditor.tsx', fn: 'parsePDPCDSL', pick: (o) => ({ items: o.data?.nodes?.length }) },
  radar: { file: '/components/RadarEditor.tsx', fn: 'parseRadarDSL', pick: (o) => ({ series: o.data?.series?.length }) },
  relation: {
    file: '/components/RelationEditor.tsx',
    fn: 'parseRelationDSL',
    pick: (o) => ({ items: o.nodes?.length, edgeList: (o.links ?? []).map((l: any) => [l.source, l.target] as [string, string]) }),
  },
  scatter: { file: '/components/ScatterEditor.tsx', fn: 'parseScatterDSL', pick: (o) => ({ items: o.data?.length }) },
};

async function loadCards(): Promise<CardSpec[]> {
  const files = collectCardFiles();
  const cards: CardSpec[] = [];
  for (const f of files) {
    const mod = await import(f);
    cards.push((mod.default ?? mod) as CardSpec);
  }
  return cards;
}

/** 递归收集 dsl/cards/<family>/<slug>.card.ts（目录按 family 分层，详见 build_cards.ts 的说明） */
function collectCardFiles(): string[] {
  const out: string[] = [];
  for (const fam of fs.readdirSync(CARDS_DIR).sort()) {
    const p = path.join(CARDS_DIR, fam);
    if (!fs.statSync(p).isDirectory()) continue;
    for (const f of fs.readdirSync(p).sort()) {
      if (f.endsWith('.card.ts')) out.push(path.join(p, f));
    }
  }
  return out;
}

async function main() {
  const cards = await loadCards();
  console.log('=== IQS 卡片门禁（S0 试点）===');
  console.log(`真源 ${cards.length} 份：${cards.map((c) => c.meta.id).join(', ')}`);
  console.log('');

  // ── ① 结构完整性 ────────────────────────────────────────────────
  console.log('— ① 结构完整性 —');
  for (const c of cards) {
    const m = c.meta;
    for (const k of ['id', 'tier', 'family', 'body', 'mcpName', 'qcTool', 'version', 'parentType', 'subType', 'displayName'] as const) {
      if (!(m as any)[k]) fail(`${m.id}: meta.${k} 缺失`);
    }
    if (!m.intents?.length) fail(`${m.id}: meta.intents 为空（意图路由需要）`);
    if (!m.expertise?.length) fail(`${m.id}: meta.expertise 为空（提示词角色需要）`);
    if (!c.description) fail(`${m.id}: description 缺失`);
    if (c.description.length > 160) warn(`${m.id}: description ${c.description.length} 字符（瘦描述建议 ≤160）`);
    if (!/^\d+\.\d+$/.test(m.version)) warn(`${m.id}: version "${m.version}" 建议形如 2.2`);
    if (!c.syntax.length) fail(`${m.id}: syntax 为空`);
    for (const s of c.syntax) {
      if (!s.name) fail(`${m.id}: syntax 条目缺 name`);
      if (!s.meaning) fail(`${m.id}: syntax "${s.name}" 缺 meaning`);
      if (!s.example && !s.argShape) fail(`${m.id}: syntax "${s.name}" 缺 example/argShape`);
      if (!s.status) warn(`${m.id}: syntax "${s.name}" 未标注 status（supported/partial/unsupported）`);
    }
    if (!c.example?.dsl) fail(`${m.id}: example.dsl 缺失`);
    if (!c.example?.expect?.noErrors) warn(`${m.id}: example 未提供 expect 断言（门禁将只验「可解析」）`);
    if (!c.outputControls?.length) fail(`${m.id}: outputControls 为空`);
    if (!c.promptNotes?.length) warn(`${m.id}: promptNotes 为空（protocol://prompts 内容将很薄）`);

    // 示例禁止含 Markdown 围栏（AUD-129 的根因）
    if (/```/.test(c.example.dsl)) fail(`${m.id}: example.dsl 含 Markdown 围栏（AUD-129）`);
    if (c.starter && /```/.test(c.starter.dsl)) fail(`${m.id}: starter.dsl 含 Markdown 围栏`);

    // 注释风格统一（AUD-125）
    const hashCmt = c.example.dsl.split('\n').filter((l) => /^\s*#/.test(l));
    if (hashCmt.length && m.body !== 'Tree') {
      warn(`${m.id}: example.dsl 含 ${hashCmt.length} 行 \`#\` 注释（非 Tree body，建议改 //，AUD-125）`);
    }

    // syntax 重名冲突（同 name 同 slot 出现两次）
    const seen = new Set<string>();
    for (const s of c.syntax) {
      const key = `${s.name}[${(s.slot ?? []).join('|')}]`;
      if (seen.has(key)) fail(`${m.id}: syntax 重复条目 ${key}`);
      seen.add(key);
    }
    ok(`${m.id}: ${c.syntax.length} 条语法 · ${c.example.dsl.trim().split('\n').length} 行示例 · ${c.counterexamples?.length ?? 0} 反例`);
  }
  console.log('');

  // ── ④ 跨 kind 对照表 ────────────────────────────────────────────
  console.log('— ④ 跨 kind 同名指令对照 —');
  const byName = new Map<string, { kind: string; meaning: string; values?: string[] }[]>();
  for (const c of cards) {
    for (const s of c.syntax) {
      const list = byName.get(s.name) ?? [];
      list.push({ kind: c.meta.id, meaning: s.meaning, values: s.values });
      byName.set(s.name, list);
    }
  }
  const conflicts: string[] = [];
  for (const [name, entries] of byName) {
    if (entries.length < 2) continue;
    const meanings = new Set(entries.map((e) => e.meaning));
    const valueSets = new Set(entries.map((e) => (e.values ?? []).join('/')));
    const isConflict = meanings.size > 1 || valueSets.size > 1;
    const tag = isConflict ? '⚠ 语义不同' : '同义';
    console.log(`  ${name.padEnd(10)} ${tag}`);
    for (const e of entries) {
      console.log(`      · ${e.kind.padEnd(10)} ${e.meaning}${e.values?.length ? ` [${e.values.join('/')}]` : ''}`);
    }
    if (isConflict) conflicts.push(name);
  }
  if (!byNameHits(byName)) console.log('  （试点仅 2 个 kind，重合项有限）');
  console.log(`  合计同名指令 ${[...byName].filter(([, v]) => v.length > 1).length} 项，其中语义不同 ${conflicts.length} 项：${conflicts.join(', ') || '—'}`);
  console.log('  → 完整对照表将随 S2 全量迁移后产出于 build/cards/COMMAND_MATRIX.md');
  console.log('');

  // ── ⑤ 产物一致性 ────────────────────────────────────────────────
  console.log('— ⑤ 产物一致性 —');
  if (!fs.existsSync(OUT)) {
    warn('build/cards/ 不存在 —— 请先运行 build_cards.ts');
  } else {
    const slugOf = (m: CardSpec['meta']) => m.mcpName.replace(/^render_/, '');
    for (const c of cards) {
      const seg = path.join(OUT, c.meta.family, 'segments', `${slugOf(c.meta)}.md`);
      const rel = `${c.meta.family}/segments/${slugOf(c.meta)}.md`;
      if (!fs.existsSync(seg)) fail(`${c.meta.id}: 缺产物 ${rel}`);
      else if (!fs.readFileSync(seg, 'utf8').includes(c.example.dsl.trim().split('\n')[0].trim())) {
        fail(`${c.meta.id}: 产物 ${rel} 未包含真源示例首行 —— 产物已过期，请重跑 build_cards.ts`);
      }
    }
    ok(`产物目录 ${cards.length} 份已核对（按 family 分层）`);
  }
  console.log('');

  // ── ②③ 示例可解析 + 语义断言（经 vite） ─────────────────────────
  console.log('— ②③ 示例可解析 + 语义断言（真实 parser）—');
  const { createServer } = await import(
    path.join(ROOT, 'node_modules/vite/dist/node/index.js')
  );
  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  const mods: Record<string, any> = {};
  const getMod = async (kind: string) => {
    if (!PROBES[kind]) return null;
    if (!mods[kind]) mods[kind] = await server.ssrLoadModule(PROBES[kind].file);
    return mods[kind];
  };

  /**
   * 解析结果快照：把「当前 parser 的实际产出」固化下来，作为**回归防护**。
   * 与 example.expect（人工声明的意图）互补：expect 管"应该是什么"，快照管"有没有意外变化"。
   * 更新：node --experimental-strip-types scripts/validate_cards.ts --update-snapshots
   */
  const UPDATE_SNAP = process.argv.includes('--update-snapshots');
  const SNAP_PATH = path.join(CARDS_DIR, '_snapshots.json');
  const oldSnap: Record<string, any> = fs.existsSync(SNAP_PATH)
    ? JSON.parse(fs.readFileSync(SNAP_PATH, 'utf8'))
    : {};
  const newSnap: Record<string, any> = {};

  const checkOne = async (kind: string, label: string, dsl: string, expect?: ExampleExpectation) => {
    const probe = PROBES[kind];
    if (!probe) { warn(`${kind}: 无 parser 探针（未迁移/未登记），跳过 ${label}`); return; }
    const mod = await getMod(kind);
    const fn = mod?.[probe.fn];
    if (typeof fn !== 'function') { fail(`${kind}: ${probe.fn} 导出缺失`); return; }
    let out: any;
    try {
      out = fn(dsl);
    } catch (e: any) {
      fail(`${kind}.${label}: parser 抛异常 — ${e?.message ?? e}`);
      return;
    }
    const got = probe.pick(out);
    const errs: string[] = (out?.errors ?? []).filter(Boolean);
    if (errs.length) { fail(`${kind}.${label}: parser errors — ${JSON.stringify(errs)}`); return; }

    // 快照记录 / 比对
    const snapKey = `${kind}.${label}`;
    newSnap[snapKey] = got;
    if (!UPDATE_SNAP) {
      const prev = oldSnap[snapKey];
      if (!prev) warn(`${snapKey}: 无快照（运行 --update-snapshots 建立）`);
      else if (JSON.stringify(prev) !== JSON.stringify(got)) {
        fail(`${snapKey}: 解析结果与快照不一致 —— ${JSON.stringify(prev)} → ${JSON.stringify(got)}`);
      }
    }

    const bits: string[] = [];
    for (const k of ['nodes', 'edges', 'lanes', 'series', 'items'] as const) {
      if (got[k] !== undefined) bits.push(`${k}=${got[k]}`);
    }
    ok(`${kind}.${label}: 解析通过（${bits.join(' ')}）`);

    if (!expect) return;
    for (const k of ['nodes', 'edges', 'lanes', 'series', 'items'] as const) {
      const want = expect[k];
      if (want !== undefined && got[k] !== want) fail(`${kind}.${label}: ${k} 期望 ${want} 实得 ${got[k]}`);
    }
    const edgeSet = new Set((got.edgeList ?? []).map(([a, b]) => `${a}→${b}`));
    for (const [a, b] of expect.requiredEdges ?? []) {
      if (!edgeSet.has(`${a}→${b}`)) fail(`${kind}.${label}: 缺少必需边 ${a}→${b}`);
    }
    for (const [a, b] of expect.forbiddenEdges ?? []) {
      if (edgeSet.has(`${a}→${b}`)) fail(`${kind}.${label}: 出现禁止边 ${a}→${b}`);
    }
    for (const d of expect.knownDefects ?? []) {
      let hit = false;
      for (const [a, b] of d.unexpectedEdges ?? []) if (edgeSet.has(`${a}→${b}`)) hit = true;
      for (const [a, b] of d.missingEdges ?? []) if (!edgeSet.has(`${a}→${b}`)) hit = true;
      if (hit) warn(`${kind}.${label}: 已立案缺陷复现 [${d.auditId}] ${d.note}`);
      else ok(`${kind}.${label}: 已立案缺陷 [${d.auditId}] **未见复现** —— 引擎可能已修，请把该项提升为 forbiddenEdges/requiredEdges`);
    }
  };

  for (const c of cards) {
    // relief（mermaid / vchart）没有独立 parser —— 其正确性由制图方言自身保证，
    // 且 sub_type 与 core 可能重名（radar / scatter / pie），故不参与 parser 探针。
    if (c.meta.family !== 'iqs_native') continue;
    await checkOne(c.meta.id, 'example', c.example.dsl, c.example.expect);
    if (c.starter) await checkOne(c.meta.id, 'starter', c.starter.dsl, c.starter.expect);
  }

  if (UPDATE_SNAP) {
    fs.writeFileSync(SNAP_PATH, JSON.stringify(newSnap, null, 2) + '\n');
    ok(`已写入 ${Object.keys(newSnap).length} 条解析快照 → dsl/cards/_snapshots.json`);
  }

  await server.close();
  console.log('');

  // ── 汇总 ────────────────────────────────────────────────────────
  console.log('---');
  if (errors === 0) console.log(`PASS (${warnings} warnings)`);
  else console.error(`FAIL: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(errors === 0 ? 0 : 1);
}

function byNameHits(m: Map<string, unknown[]>): boolean {
  for (const v of m.values()) if (v.length > 1) return true;
  return false;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
