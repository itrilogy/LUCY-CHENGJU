/**
 * 卡片脚手架：从现有三源自动抽取，生成 <kind>.card.ts 骨架
 *
 * 源：
 *   A `mcp-server/mcp_tools.json` —— meta / description / expertise / expert_logic / syntax_rules / official_example
 *   B（不直接使用，mcp 的 B\A 已通过 audit 记录；脚手架只取 A 以避免把漂移带进真源）
 *   D `constants.tsx` 的 INITIAL_*_DSL —— starter
 *   `dsl/kinds.json` —— colorSlots / typeDirective / body / qcTool
 *
 * 产出：`dsl/cards/<kind>.card.ts`（若已存在则跳过），并在结尾打印需人工处理的 TODO 清单。
 *
 * 运行：node --experimental-strip-types scripts/scaffold_cards.ts [--force] [--only=a,b,c]
 *
 * 设计取舍：脚手架只做「无损搬运 + 结构化」，**不做语义修正**。
 * 语义修正（R20 的 # 注释、示例不一致、值域补全、unsupported 标注）在人工审阅阶段完成，
 * 脚本会把可疑点以 `// TODO(scaffold):` 注释写在卡片对应位置。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CARDS_DIR = path.join(ROOT, 'dsl/cards');

const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const ONLY = (argv.find((a) => a.startsWith('--only='))?.split('=')[1] ?? '').split(',').filter(Boolean);

const tools: any[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'mcp-server/mcp_tools.json'), 'utf8'));
const kinds = JSON.parse(fs.readFileSync(path.join(ROOT, 'dsl/kinds.json'), 'utf8'));
const constantsSrc = fs.readFileSync(path.join(ROOT, 'constants.tsx'), 'utf8');

// ── D 源：INITIAL_*_DSL ────────────────────────────────────────────
const starterMap = new Map<string, string>();
for (const m of constantsSrc.matchAll(/export const INITIAL_([A-Z_0-9]+)_DSL\s*=\s*`([\s\S]*?)`;/g)) {
  starterMap.set(m[1], m[2].trimEnd());
}
/** mcp sub_type → constants 常量后缀 */
const SUB_TO_CONST: Record<string, string> = {
  fishbone: 'FISHBONE', histogram: 'HISTOGRAM', pareto: 'PARETO', control: 'CONTROL',
  scatter: 'SCATTER', affinity: 'AFFINITY', relation: 'RELATION', matrix: 'MATRIX',
  matrixPlot: 'MATRIX_PLOT', pdpc: 'PDPC', arrow: 'ARROW', basic: 'BASIC',
  radar: 'RADAR', flow: 'FLOW', vchart: 'VCHART', mermaid: 'MERMAID',
};

// ── Markdown → soul blocks ─────────────────────────────────────────
type Block =
  | { kind: 'h'; level: 3 | 4; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'callout'; type: 'IMPORTANT' | 'TIP' | 'NOTE'; text: string };

function parseSoul(md: string): Block[] {
  const out: Block[] = [];
  const lines = md.split('\n');
  let bullets: string[] = [];
  const flushBullets = () => {
    if (bullets.length) { out.push({ kind: 'ul', items: bullets }); bullets = []; }
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    if (!t) { flushBullets(); continue; }

    const callout = t.match(/^>\s*\[!(IMPORTANT|TIP|NOTE|CAUTION)\]/i);
    if (callout) {
      flushBullets();
      const type = (callout[1].toUpperCase() === 'CAUTION' ? 'IMPORTANT' : callout[1].toUpperCase()) as any;
      const body: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const n = lines[j].trim();
        if (!n.startsWith('>')) break;
        body.push(n.replace(/^>\s?/, ''));
        i = j;
      }
      out.push({ kind: 'callout', type, text: body.join(' ').trim() });
      continue;
    }

    const h = t.match(/^(#{3,6})\s+(.*)$/);
    if (h) {
      flushBullets();
      out.push({ kind: 'h', level: h[1].length <= 3 ? 3 : 4, text: h[2] });
      continue;
    }
    const li = t.match(/^[-*]\s+(.*)$/);
    if (li) { bullets.push(li[1]); continue; }
    if (bullets.length) flushBullets();
    out.push({ kind: 'p', text: t });
  }
  flushBullets();
  return out;
}

/** 从 soul 的第一段/首个 h3 提取 summary */
function pickSummary(blocks: Block[]): { title: string; summary: string } {
  const h3 = blocks.find((b) => b.kind === 'h') as any;
  const p = blocks.find((b) => b.kind === 'p') as any;
  const title = h3?.text ?? 'Expert Logic';
  const summary = (p?.text ?? '').replace(/\*\*/g, '');
  return { title, summary: summary.length > 120 ? summary.slice(0, 118) + '…' : summary };
}

// ── Markdown → syntax[] ────────────────────────────────────────────
type Entry = {
  name: string; slot?: string[]; meaning: string; values?: string[]; argShape?: string;
  example: string; required?: boolean; notes?: string;
};

/** 从说明文字里抽值域：支持 (`a` / `b`) 与 (a/b/c) 与 (`a`,`b`) */
function extractValues(meaning: string): { values?: string[]; meaning: string } {
  // 形如：渲染模式 (`Card` / `Label`) 或 控制图类型 (X-bar-R, I-MR等)
  const m = meaning.match(/[（(]([^（）()]*?)[)）]\s*$/);
  if (!m) return { meaning };
  const body = m[1];
  if (!/[/,、]/.test(body)) return { meaning };
  const vals = body
    .replace(/等$/, '')
    .split(/[/,、]/)
    .map((s) => s.replace(/[`'"]/g, '').trim())
    .filter((s) => s && s.length <= 24 && !/[。；;]/.test(s));
  if (vals.length < 2) return { meaning };
  return { values: vals, meaning: meaning.slice(0, m.index).trim() };
}

/** 解析「语法」单元格：`Title:` / `Color[Bar]` / `Type:` / `W:` … */
function parseSyntaxCell(cell: string): { name: string; slot?: string[] } | null {
  const raw = cell.replace(/`/g, '').trim();
  if (!raw) return null;
  const slotM = raw.match(/^([A-Za-z][A-Za-z0-9_]*)\s*\[([^\]]+)\]\s*:?$/);
  if (slotM) {
    return {
      name: slotM[1],
      slot: slotM[2].split(/[|/]/).map((s) => s.trim()).filter(Boolean),
    };
  }
  const nameM = raw.match(/^([A-Za-z][A-Za-z0-9_]*)\s*(\([^)]*\))?\s*:?$/);
  if (nameM) return { name: nameM[1] + (nameM[2] ?? '') };
  return null;
}

/**
 * 一行多指令：`` `Standardize:` / `ShowAreaScore:` ``、`` `graph` / `flowchart` ``、
 * `` `XAxis:` / `YAxis:` / `ZAxis:` ``。返回全部解析出的指令。
 */
function parseSyntaxCellMulti(cell: string): { name: string; slot?: string[] }[] {
  const out: { name: string; slot?: string[] }[] = [];
  for (const seg of cell.split(/\s*(?:\/|、)\s*/)) {
    if (!seg.trim()) continue;
    const p = parseSyntaxCell(seg);
    if (p) out.push(p);
  }
  if (!out.length) {
    const p = parseSyntaxCell(cell);
    if (p) out.push(p);
  }
  return out;
}

/** 从 syntax_rules（Markdown）抽取结构化条目：支持表格行 + `- **x**:` + `- \`x\`:` */
function parseSyntaxRules(md: string): Entry[] {
  const out: Entry[] = [];
  const seen = new Set<string>();
  const push = (e: Entry) => {
    const key = `${e.name}[${(e.slot ?? []).join('|')}]`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(e);
  };

  for (const line of md.split('\n')) {
    const t = line.trim();
    if (!t) continue;

    // 表格行：| `Title:` | 图表标题 | `Title: xxx` |   或两列 | `Title:` | 标题 |
    if (t.startsWith('|')) {
      const cells = t.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length < 2) continue;
      if (/^:?-{2,}/.test(cells[0])) continue;      // 分隔行
      if (/^语法$/.test(cells[0].replace(/`/g, ''))) continue; // 表头
      const names = parseSyntaxCellMulti(cells[0]);
      if (!names.length) continue;
      const { values, meaning } = extractValues(cells[1]);
      for (const parsed of names) {
        push({
          name: parsed.name,
          ...(parsed.slot ? { slot: parsed.slot } : {}),
          meaning: meaning.replace(/\*\*/g, ''),
          ...(values ? { values } : {}),
          example: makeExample(parsed, cells[1], cells[2]),
        });
      }
      continue;
    }

    // 列表行：- **分组**: `Group: [ID]…`   或   - `Color[Root]`: #HEX 鱼头背景
    const li = t.match(/^[-*]\s+(.*)$/);
    if (!li) continue;
    const body = li[1];

    const bold = body.match(/^\*\*([^*]+)\*\*\s*[:：]\s*(.*)$/);
    if (bold) {
      const nm = bold[1].replace(/[（(].*?[)）]/g, '').trim();
      const { values } = extractValues(bold[2]);
      push({
        name: nm,
        meaning: bold[2].replace(/`/g, '').trim(),
        ...(values ? { values } : {}),
        example: makeExample({ name: nm }, bold[2]),
      });
      continue;
    }

    // 列表行，一条或多条指令：- `graph` / `flowchart`: 定义流程图起始。
    const code = body.match(/^((?:`[^`]+`(?:\s*[/、]\s*)?)+)\s*[:：]\s*(.*)$/);
    if (code) {
      const heads = [...code[1].matchAll(/`([^`]+)`/g)].map((mm) => mm[1].trim());
      const desc = code[2];
      const { values, meaning } = extractValues(desc);
      for (const h of heads) {
        const parsed = parseSyntaxCell(h);
        push({
          name: parsed ? parsed.name : h,
          ...(parsed?.slot ? { slot: parsed.slot } : {}),
          meaning: meaning.replace(/`/g, '').replace(/\*\*/g, ''),
          ...(values ? { values } : {}),
          example: makeExample({ name: h, ...(parsed?.slot ? { slot: parsed.slot } : {}) }, desc),
        });
      }
      continue;
    }
  }
  return out;
}

/** 表格行的示例单元格通常已是完整片段；列表行说明里往往只有「值」，需补回指令前缀 */
function makeExample(parsed: { name: string; slot?: string[] }, desc: string, completeCell?: string): string {
  const defaultEx = (): string => {
    const head = parsed.slot?.length ? `${parsed.name}[${parsed.slot.join('|')}]` : parsed.name;
    return `${head}: <值>`;
  };
  if (completeCell !== undefined) {
    return completeCell.replace(/`/g, '').trim() || defaultEx();
  }
  const val = firstBacktick(desc);
  const head = parsed.slot?.length ? `${parsed.name}[${parsed.slot.join('|')}]` : parsed.name;
  return val ? `${head}: ${val}` : defaultEx();
}

function firstBacktick(s: string): string {
  const m = s.match(/`([^`]+)`/);
  return m ? m[1].trim() : '';
}

/** 把「语法格式：`- [项目名称]: [频数]`」这类散落说明归入 notes */
function extractFormatNotes(md: string): string[] {
  const out: string[] = [];
  for (const line of md.split('\n')) {
    const t = line.trim();
    const m = t.match(/^(?:语法格式|格式)\s*[:：]\s*(.*)$/);
    if (m) out.push(m[1].replace(/`/g, '').trim());
  }
  return out;
}

// ── 生成卡片源码 ───────────────────────────────────────────────────
function tsStr(s: string): string {
  return JSON.stringify(s);
}
function tsTmpl(s: string): string {
  return '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
}

function renderSoulBlocks(blocks: Block[]): string {
  return blocks
    .map((b) => {
      if (b.kind === 'h') return `      { kind: 'h', level: ${b.level}, text: ${tsStr(b.text)} },`;
      if (b.kind === 'p') return `      { kind: 'p', text: ${tsStr(b.text)} },`;
      if (b.kind === 'ul') return `      { kind: 'ul', items: [${b.items.map(tsStr).join(', ')}] },`;
      return `      { kind: 'callout', type: '${b.type}', text: ${tsStr(b.text)} },`;
    })
    .join('\n');
}

function renderEntry(e: Entry): string {
  const parts = [`name: ${tsStr(e.name)}`];
  if (e.slot?.length) parts.push(`slot: [${e.slot.map(tsStr).join(', ')}]`);
  parts.push(`meaning: ${tsStr(e.meaning)}`);
  if (e.values?.length) parts.push(`values: [${e.values.map(tsStr).join(', ')}]`);
  if (e.argShape) parts.push(`argShape: ${tsStr(e.argShape)}`);
  parts.push(`example: ${tsStr(e.example)}`);
  if (e.required) parts.push('required: true');
  parts.push("status: 'supported'");
  if (e.notes) parts.push(`notes: ${tsStr(e.notes)}`);
  return `    { ${parts.join(', ')} },`;
}

function main() {
  const kById = new Map<string, any>(kinds.coreKinds.map((k: any) => [k.id, k]));
  const targets = tools.filter(
    (t) => t.sub_type !== 'master' && (!ONLY.length || ONLY.includes(t.sub_type))
  );

  const written: string[] = [];
  const skipped: string[] = [];
  const todos: string[] = [];

  for (const t of targets) {
    const id: string = t.sub_type;
    /**
     * 文件名 = mcpName 去掉 `render_` 前缀 —— 保证全局唯一。
     * 原因：sub_type 会跨 family 重名（radar/scatter: core↔vchart；pie: mermaid↔vchart），
     * 同 family 内也可能重名（vchart 的 render_vchart_heatmap 与 render_vchart_correlation_heat
     * 的 sub_type 都是 heatmap —— 即 AUD-131 的资源 URI 冲突根因）。
     */
    const slug = String(t.name).replace(/^render_/, '');
    const dir = path.join(CARDS_DIR, t.parent_type);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${slug}.card.ts`);
    if (fs.existsSync(file) && !FORCE) { skipped.push(`${t.parent_type}/${slug}`); continue; }

    const k = kById.get(id);
    const soulBlocks = parseSoul(t.expert_logic || '');
    const { title: soulTitle, summary } = pickSummary(soulBlocks);
    const syntax = parseSyntaxRules(t.syntax_rules || '');
    const fmtNotes = extractFormatNotes(t.syntax_rules || '');

    /**
     * 注释风格归一（AUD-125）：
     * `#` 仅对 Tree body（fishbone）是**结构**，其余 kind 中的 `#` 只是历史遗留的兼容注释，
     * 而总协议红线要求"`#/##` 层级仅鱼骨图、行注释用 `//`"。此处机械转换，避免示例
     * 继续示范协议自标为不推荐的写法。
     */
    const isTreeBody = (k?.body ?? '') === 'Tree';
    const normalizeComments = (s: string): string =>
      isTreeBody ? s : s.split('\n').map((l) => l.replace(/^(\s*)#(?=\s|$)/, '$1//')).join('\n');

    const exRaw = (t.official_example || '').trim();
    const ex = normalizeComments(exRaw);
    const starterRaw = starterMap.get(SUB_TO_CONST[id] ?? '');
    const starter = starterRaw ? normalizeComments(starterRaw) : undefined;

    // ── TODO 采集 ──
    if (!t.expert_logic) todos.push(`${id}: expert_logic 为空 → soul 需手写`);
    if (!ex || ex === 'N/A') todos.push(`${id}: official_example 为空 → example 需手写`);
    if (!syntax.length) todos.push(`${id}: syntax_rules 无法结构化 → syntax 需手写`);
    if (!isTreeBody && /^\s*#/m.test(exRaw)) {
      todos.push(`${id}: 已自动把示例中的 \`#\` 注释改为 \`//\`（原 ${exRaw.split('\n').filter((l: string) => /^\s*#/.test(l)).length} 行，AUD-125）`);
    }
    if (/```/.test(ex)) todos.push(`${id}: 示例含 Markdown 围栏 (AUD-129)`);
    if (starter && starter !== ex) {
      const a = new Set(ex.split('\n').map((s: string) => s.trim()));
      const b = starter.split('\n').map((s: string) => s.trim()).filter(Boolean);
      const hit = b.filter((l: string) => a.has(l)).length;
      if (hit / Math.max(b.length, 1) < 0.9) {
        todos.push(`${id}: starter 与 example 不一致（重合 ${Math.round((hit / b.length) * 100)}%，AUD-124）`);
      }
    }
    if (!starter) todos.push(`${id}: 无 INITIAL_*_DSL（constants.tsx）`);

    const body = `/**
 * ${id} · ${t.display_name} — 卡片真源
 *
 * ⚠️ 本文件由 \`scripts/scaffold_cards.ts\` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = ${tsTmpl(ex)};
${starter ? `\nconst STARTER_DSL = ${tsTmpl(starter)};\n` : ''}
const ${slug.replace(/[^A-Za-z0-9]/g, '_')}: CardSpec = {
  meta: {
    id: ${tsStr(id)},
    tier: ${tsStr(t.tier ?? (t.parent_type === 'iqs_native' ? 'core' : 'relief'))},
    family: ${tsStr(t.parent_type)},
    body: ${tsStr(k?.body ?? 'Unknown')},
    mcpName: ${tsStr(t.name)},
    qcTool: ${tsStr(k?.qcTool ?? id.toUpperCase())},
    version: '1.0',
    parentType: ${tsStr(t.parent_type)},
    subType: ${tsStr(id)},
    displayName: ${tsStr(t.display_name)},
    intents: [${(t.intent_trigger ?? []).map(tsStr).join(', ')}],
    expertise: [${String(t.expertise ?? '').split(',').map((s: string) => tsStr(s.trim())).filter((s: string) => s !== '""').join(', ')}],
    colorSlots: [${(k?.colorSlots ?? []).map(tsStr).join(', ')}],
${k?.typeDirective ? `    typeDirective: { name: ${tsStr(k.typeDirective.name)}, values: [${k.typeDirective.values.map(tsStr).join(', ')}], meaning: ${tsStr(k.typeDirective.meaning)} },\n` : ''}${t.render_engine ? `    renderEngine: ${tsStr(t.render_engine)},\n` : ''}${t.inference_key ? `    inferenceKey: ${tsStr(t.inference_key)},\n` : ''}    migrated: true,
  },

  description: ${tsStr(t.description ?? '')},

  soul: {
    title: ${tsStr(soulTitle)},
    summary: ${tsStr(summary)},
    blocks: [
${renderSoulBlocks(soulBlocks)}
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
${syntax.map(renderEntry).join('\n')}
  ],

  example: {
    title: ${tsStr(ex.split('\n')[0]?.replace(/^Title:\s*/, '') ?? id)},
    dsl: EXAMPLE_DSL,
    // TODO(scaffold): 补 expect 语义断言（nodes/edges/requiredEdges/forbiddenEdges）
  },
${starter ? `
  starter: {
    title: ${tsStr(starter.split('\n')[0]?.replace(/^Title:\s*/, '') ?? id)},
    dsl: STARTER_DSL,
  },
` : ''}
  // TODO(scaffold): 补 counterexamples
${fmtNotes.length ? `  // 抽取到的散落格式说明（请归入对应 syntax 条目的 notes）：\n${fmtNotes.map((n) => `  //   · ${n}`).join('\n')}\n` : ''}
  outputControls: [
    '纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。',
    '禁止把 dsl 参数写成 JSON 对象。',
  ],

  // TODO(scaffold): 审阅 promptNotes —— 下面是由 soul 自动提炼的初稿（即 protocol://prompts/<kind> 的内容）
  promptNotes: [
${(soulBlocks.filter((b) => b.kind === 'ul' || b.kind === 'callout') as any[])
  .flatMap((b) => (b.kind === 'ul' ? b.items : [b.text]))
  .slice(0, 5)
  .map((s: string) => `    ${tsStr(String(s).replace(/\*\*/g, '').slice(0, 120))},`)
  .join('\n')}
  ],
};

export default ${slug.replace(/[^A-Za-z0-9]/g, '_')};
`;

    fs.writeFileSync(file, body);
    written.push(id);
  }

  console.log(`✓ 生成 ${written.length} 份卡片骨架：${written.join(', ') || '—'}`);
  if (skipped.length) console.log(`· 跳过已存在 ${skipped.length} 份：${skipped.join(', ')}`);
  if (todos.length) {
    console.log('\n需人工处理（TODO）：');
    for (const t of todos) console.log(`  - ${t}`);
  }
}

main();
