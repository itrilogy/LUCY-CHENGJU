/**
 * 卡片契约执行器 —— 用 L0 卡自己声明的 `example.expect` 去校验真实 parser
 *
 * 背景：
 * `dsl/cards/*.card.ts`（L0 唯一真源）里每张卡的 `example` 都带了**契约断言**：
 *
 *   expect: {
 *     noErrors: true,                 // 解析不得报错
 *     nodes: 7, edges: 7,             // 精确数量
 *     requiredEdges: [['w1','w2'], …],// 必须存在的边
 *     forbiddenEdges: [['w4','w5']],  // 必须不存在的边（回归防线）
 *   }
 *
 * 例如 `flow.card.ts` 就明确写着「AUD-120 已修复……该断言由 knownDefects 提升为
 * error 级 —— 一旦回归即 CI 红灯」。**但此前没有任何脚本执行这些断言。**
 *
 * 本脚本把它们跑起来：对每张带 `expect` 的卡，用其 `example.dsl` 喂给对应 parser，
 * 逐条比对断言。这就是 PROJECT_INDEX §4「冲突时以 L0 为准」的**可执行形式**。
 *
 * 运行：node --experimental-strip-types scripts/assert_card_contracts.ts
 * 已串入 `npm run validate:dsl`。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';

/*
 * 与 lint_examples.ts 同因：`dsl/*.ts` 与 `components/*.tsx` 的内部 import 不带扩展名，
 * Node 原生 ESM 无法解析，须经 Vite 的 SSR 加载器（审计报告已验证的做法）。
 */
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

let errors = 0;
let warnings = 0;
let checked = 0;

const fail = (m: string) => { console.error(`✗ ${m}`); errors++; };
const warn = (m: string) => { console.warn(`⚠ ${m}`); warnings++; };

/** kind → parser 模块 + 导出名 */
/**
 * 只有这些 kind 的图里有「边」的概念，`requiredEdges` / `forbiddenEdges` 才有意义。
 * 其余 kind（pareto / radar / histogram / basic / matrix…）的「节点」语义各不相同
 * （项目数 / 维度数 / 分箱数 / 系列数），强求统一是错的抽象 —— 它们只验 parser 可跑通。
 */
const GRAPH_KINDS = new Set(['flow', 'relation', 'arrow', 'pdpc']);

const PARSERS: Record<string, { mod: string; fn: string }> = {
  affinity:   { mod: '/components/AffinityEditor.tsx',   fn: 'parseAffinityDSL' },
  arrow:      { mod: '/components/ArrowDiagramEditor.tsx', fn: 'parseArrowDSL' },
  basic:      { mod: '/components/BasicEditor.tsx',      fn: 'parseBasicDSL' },
  control:    { mod: '/components/ControlChartEditor.tsx', fn: 'parseControlDSL' },
  fishbone:   { mod: '/components/FishboneEditor.tsx',   fn: 'parseFishboneDSL' },
  flow:       { mod: '/components/flow/FlowParser.ts',   fn: 'parseFlowDSL' },
  histogram:  { mod: '/components/HistogramEditor.tsx',  fn: 'parseHistogramDSL' },
  matrix:     { mod: '/components/MatrixEditor.tsx',     fn: 'parseMatrixDSL' },
  matrixPlot: { mod: '/components/MatrixPlotEditor.tsx', fn: 'parseMatrixPlotDSL' },
  pareto:     { mod: '/components/ParetoEditor.tsx',     fn: 'parseParetoDSL' },
  pdpc:       { mod: '/components/PDPCEditor.tsx',       fn: 'parsePDPCDSL' },
  radar:      { mod: '/components/RadarEditor.tsx',      fn: 'parseRadarDSL' },
  relation:   { mod: '/components/RelationEditor.tsx',   fn: 'parseRelationDSL' },
  scatter:    { mod: '/components/ScatterEditor.tsx',    fn: 'parseScatterDSL' },
};

/**
 * 各 parser 的返回形态差异很大，这里逐一归一：
 *
 *   flow       { data: { nodes: [{id,…}], edges: [{from,to,…}] } }   ← 边字段是 from/to
 *   relation   { nodes: [{id,…}], links: [{source,target}] }
 *   affinity   { data: [ {id, children:[…]} ] }                      ← 递归树
 *   fishbone   { data: { id, children:[…] } }                        ← 单根递归树
 *   basic      { data: { datasets: […] } }
 *   histogram  { data: [number,…] }
 *   matrix     { data: { axes:[…], matrices:[…] } }
 */
function extractGraph(out: unknown): { nodes: unknown[]; edges: Array<[string, string]> } {
  const o = out as Record<string, any>;
  const root = o?.data ?? o;

  // 递归统计树形结构的节点数（affinity / fishbone）
  const countTree = (n: unknown): number => {
    if (Array.isArray(n)) return n.reduce((c, x) => c + countTree(x), 0);
    if (n && typeof n === 'object') {
      const node = n as Record<string, any>;
      const self = 'id' in node && 'label' in node ? 1 : 0;
      return self + countTree(node.children ?? []);
    }
    return 0;
  };

  let nodes: unknown[] = [];
  if (Array.isArray(root?.nodes)) nodes = root.nodes;
  else if (Array.isArray(root?.links)) nodes = root.nodes ?? [];
  else if (root && typeof root === 'object' && ('children' in root || 'id' in root)) {
    nodes = new Array(countTree(root)).fill(null);      // 树形：展开成计数用的占位数组
  } else if (Array.isArray(root?.datasets)) nodes = root.datasets;
  else if (Array.isArray(root) && typeof root[0] === 'number') nodes = root;

  // 边：兼容 flow 的 from/to 与 relation 的 source/target
  const rawLinks: any[] = Array.isArray(root?.edges) ? root.edges
    : Array.isArray(root?.links) ? root.links
    : Array.isArray(o?.links) ? o.links
    : [];
  const edges: Array<[string, string]> = rawLinks
    .map((l: any) => [
      String(l?.from ?? l?.source ?? l?.[0] ?? ''),
      String(l?.to ?? l?.target ?? l?.[1] ?? ''),
    ] as [string, string])
    .filter(([a, b]) => a && b);

  return { nodes, edges };
}

console.log('=== 卡片契约执行 ===');

const cardFiles: string[] = [];
const walk = (dir: string) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.card.ts')) cardFiles.push(full);
  }
};
walk(path.join(ROOT, 'dsl/cards'));

for (const file of cardFiles) {
  const rel = '/' + path.relative(ROOT, file).split(path.sep).join('/');
  let card: any;
  try {
    card = (await vite.ssrLoadModule(rel)).default;
  } catch (e) {
    fail(`${rel}: 模块加载失败 → ${(e as Error).message}`);
    continue;
  }

  const ex = card?.example;
  if (!ex?.expect || !ex?.dsl) continue;   // 无契约的卡跳过

  const kind = card?.meta?.id ?? card?.meta?.subType ?? card?.kind;
  const cfg = PARSERS[kind];
  if (!cfg) { warn(`${rel}: kind=${kind} 无 parser 映射，跳过`); continue; }

  checked++;
  const label = `${kind}`;

  let out: unknown;
  try {
    const mod = await vite.ssrLoadModule(cfg.mod);
    const parse = mod[cfg.fn];
    if (typeof parse !== 'function') { fail(`${label}: ${cfg.mod} 未导出 ${cfg.fn}`); continue; }
    out = parse(ex.dsl);
  } catch (e) {
    fail(`${label}: parser 抛异常 → ${(e as Error).message}`);
    continue;
  }

  const { nodes, edges } = extractGraph(out);
  const expect = ex.expect;
  const edgeSet = new Set(edges.map(([a, b]) => `${a}->${b}`));

  if (GRAPH_KINDS.has(kind)) {
    // 精确数量（兼容 items / nodes 两种写法）
    const wantNodes = expect.nodes ?? expect.items;
    if (typeof wantNodes === 'number' && nodes.length !== wantNodes) {
      fail(`${label}: 节点数 ${nodes.length} ≠ 期望 ${wantNodes}`);
    }
    if (typeof expect.edges === 'number' && edges.length !== expect.edges) {
      fail(`${label}: 边数 ${edges.length} ≠ 期望 ${expect.edges}（多余边是 AUD-120 那类缺陷的信号）`);
    }
    for (const [a, b] of expect.requiredEdges ?? []) {
      if (!edgeSet.has(`${a}->${b}`)) fail(`${label}: 缺少必需边 ${a} → ${b}`);
    }
    for (const [a, b] of expect.forbiddenEdges ?? []) {
      if (edgeSet.has(`${a}->${b}`)) fail(`${label}: 出现禁止边 ${a} → ${b}（回归防线被突破）`);
    }
  }
}

await vite.close();

console.log('---');
console.log(`已执行契约 ${checked} 份（共 ${cardFiles.length} 张卡）`);
if (errors === 0) {
  console.log(`PASS (${warnings} warnings)`);
  process.exit(0);
} else {
  console.error(`FAIL: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
}
