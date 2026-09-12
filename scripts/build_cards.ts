/**
 * 卡片生成器（S0 试点）
 *
 * 从 dsl/cards/*.card.ts（唯一真源）生成全部下游形态。
 *
 * **当前为 S1**：默认**直接写入生产**（`mcp-server/mcp_tools.json`、`protocol/segments`、
 * `protocol/intents.md`、`protocol/prompts`、`constants.tsx`），写入前会把原文件备份到
 * `build/cards/_backup/`；同时把全部产物落到 `build/cards/` 供差异审查。
 *
 * 传 `--dry-run` 可只落 `build/cards/`、不碰生产。
 * 一致性门禁见 `npm run check:cards-fresh`（重生成后要求 `git diff --exit-code` 为空）。
 *
 * 运行：node --experimental-strip-types scripts/build_cards.ts [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CardSpec, SoulBlock, SyntaxEntry } from '../dsl/cards/_types.ts';
import { counterexamplesFor, outputControlsFor } from '../dsl/cards/_shared.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'build/cards');

// ── 渲染器 ─────────────────────────────────────────────────────────

function renderBlock(b: SoulBlock): string {
  switch (b.kind) {
    case 'h':
      return `${'#'.repeat(b.level)} ${b.text}`;
    case 'p':
      return b.text;
    case 'ul':
      return b.items.map((i) => `- ${i}`).join('\n');
    case 'callout':
      return `> [!${b.type}]\n> ${b.text}`;
  }
}

/** 专家灵魂 → Markdown（重建 mcp_tools.json 的 expert_logic） */
function renderExpertLogic(card: CardSpec): string {
  return card.soul.blocks.map(renderBlock).join('\n\n');
}

/** 语法条目 → Markdown（重建 mcp_tools.json 的 syntax_rules） */
function renderSyntaxRules(card: CardSpec): string {
  const lines: string[] = [];
  lines.push(`### IQS-DSL v1 — ${card.meta.id} (${card.meta.body})`);
  lines.push('');
  lines.push('| 语法 | 说明 | 示例 |');
  lines.push('| :--- | :--- | :--- |');
  for (const s of card.syntax) {
    // 指令名：带槽位的写成 `Color[TitleBg|TitleText]`，其余写 `Title:`
    const name = s.slot ? `\`${s.name}[${s.slot.join(' | ')}]\`` : `\`${s.name}:\``;
    let meaning = s.meaning;
    if (s.argShape) meaning += ` 形如 \`${s.argShape.replace(/\|/g, '\\|')}\``;
    if (s.values?.length) meaning += `（${s.values.join(' / ')}）`;
    if (s.required) meaning += ' **必填**';
    if (s.status === 'unsupported') meaning += ' ❌**不支持**';
    else if (s.status === 'partial') meaning += ' ⚠️部分支持';
    const example = s.example.replace(/\n/g, '\\n').replace(/\|/g, '\\|');
    lines.push(`| ${name} | ${meaning} | \`${example}\` |`);
  }
  lines.push('');
  const notes = card.syntax.filter((s) => s.notes);
  if (notes.length) {
    lines.push('### 边界说明');
    lines.push('');
    for (const s of notes) lines.push(`- **\`${s.name}\`**：${s.notes}`);
  }
  return lines.join('\n');
}

/** 人读协议切片（重建 protocol/segments/<kind>.md） */
function renderSegment(card: CardSpec): string {
  const m = card.meta;
  const L: string[] = [];
  L.push(`# ${m.id} (${m.displayName.replace(/^IQS\s*/, '')}) 协议切片`);
  L.push('');
  L.push('## 1. 专家灵魂 (The Soul)');
  L.push('');
  L.push(renderExpertLogic(card));
  L.push('');
  L.push('---');
  L.push('');
  L.push('## 2. 语法血肉 (The Flesh)');
  L.push('');
  L.push(renderSyntaxRules(card));
  L.push('');
  if (counterexamplesFor(card.counterexamples).length) {
    L.push('### 反例（错 → 对）');
    L.push('');
    for (const c of counterexamplesFor(card.counterexamples)) {
      L.push(`- 错：\`${c.bad.replace(/\n/g, '\\n')}\``);
      L.push(`  对：\`${c.good.replace(/\n/g, '\\n')}\``);
      L.push(`  因：${c.reason}`);
    }
    L.push('');
  }
  L.push('---');
  L.push('');
  L.push('## 3. 官方示例 (The Seed)');
  L.push('');
  L.push(`### 场景：${card.example.title}`);
  L.push('');
  L.push('```dsl');
  L.push(card.example.dsl.trimEnd());
  L.push('```');
  if (card.example.notes) {
    L.push('');
    L.push(`> ${card.example.notes}`);
  }
  L.push('');
  L.push('---');
  L.push('');
  L.push(
    `**权威性声明**：本切片由 \`dsl/cards/${m.id}.card.ts\` 生成（卡片版本 ${m.version}），` +
      '请勿手工编辑；改动请修改真源后重跑 `node --experimental-strip-types scripts/build_cards.ts`。'
  );
  return L.join('\n');
}

/** MANUAL 的 kind 章节 */
function renderManualSection(card: CardSpec): string {
  const m = card.meta;
  const L: string[] = [];
  L.push(`### ${m.id} — ${m.displayName.replace(/^IQS\s*/, '')}`);
  L.push('');
  L.push(`**身份卡**：\`tier: ${m.tier}\` · \`body: ${m.body}\` · \`mcpName: ${m.mcpName}\` · \`qcTool: ${m.qcTool}\``);
  L.push('');
  L.push(card.soul.summary);
  L.push('');
  L.push(renderSyntaxRules(card));
  L.push('');
  if (counterexamplesFor(card.counterexamples).length) {
    L.push('#### 反例（Avoid）');
    L.push('');
    for (const c of counterexamplesFor(card.counterexamples)) L.push(`- ${c.reason}`);
    L.push('');
  }
  return L.join('\n');
}

/** 帮助弹窗数据（重建 14×2 段硬编码 JSX 的数据部分）—— 返回对象，供 JSON 产物与 cardDocs.ts 共用 */
function cardDocObject(card: CardSpec) {
  const syntaxRows = card.syntax.map((s: SyntaxEntry) => ({
    name: s.slot ? `${s.name}[${s.slot.join(' | ')}]` : `${s.name}:`,
    meaning: s.meaning,
    values: s.values ?? [],
    argShape: s.argShape ?? '',
    example: s.example,
    status: s.status ?? 'supported',
    required: !!s.required,
    notes: s.notes ?? '',
  }));
  return {
    meta: card.meta,
    soul: { title: card.soul.title, summary: card.soul.summary, blocks: card.soul.blocks },
    syntaxRows,
    example: { title: card.example.title, dsl: card.example.dsl, notes: card.example.notes ?? '' },
    counterexamples: counterexamplesFor(card.counterexamples),
    outputControls: outputControlsFor(card.meta.family, card.meta.tier, card.outputControls),
    promptNotes: card.promptNotes ?? [],
  };
}

function renderCardDocs(card: CardSpec): string {
  return JSON.stringify(cardDocObject(card), null, 2);
}

/** 意图目录（protocol://intents 的数据） */
function renderIntents(cards: CardSpec[]): string {
  const L: string[] = [];
  L.push('# IQS 意图路由目录（intents）');
  L.push('');
  L.push('> 本文件由 `dsl/cards/*.card.ts` 的 `meta.intents` 生成。');
  L.push('> **用法**：先在此按用户意图定位 kind，再 `read` 对应的 `protocol://segments/<parent>/<sub>` 取语法，');
  L.push('> 最后 `read` `protocol://prompts/<kind>` 取生成提示词，然后调用 `render_<kind>`。');
  L.push('');
  L.push('## 输出红线（全局，适用于所有 kind）');
  L.push('');
  L.push('1. 纯文本 DSL；**禁止** Markdown 代码围栏、禁止把 `dsl` 写成 JSON 对象、禁止解释性前后缀。');
  L.push('2. 能映射标准 QC 工具时**必须**用 CORE（`render_control` / `render_pareto` 等）。');
  L.push('3. 仅当类型表外才用 RELIEF（Mermaid / VChart）。');
  L.push('4. **有 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。**');
  L.push('5. 体系文件 / 部门泳道 / BPMN 子集终稿**必须**用 `render_flow`，禁止 `render_mermaid_flowchart`。');
  L.push('');
  L.push('## 核心（CORE · iqs_native）');
  L.push('');
  L.push('| kind | 工具 | 意图关键词 | 语法资源 | 提示词资源 |');
  L.push('| :--- | :--- | :--- | :--- | :--- |');
  for (const c of cards.filter((x) => x.meta.tier === 'core')) {
    L.push(
      `| \`${c.meta.id}\` | \`${c.meta.mcpName}\` | ${c.meta.intents.join(' · ')} | ` +
        `\`protocol://segments/${c.meta.parentType}/${c.meta.subType}\` | \`protocol://prompts/${c.meta.id}\` |`
    );
  }
  L.push('');
  L.push('## 救济（RELIEF）');
  L.push('');
  L.push('| family | 入口 | sub_type 数 | 用途 |');
  L.push('| :--- | :--- | :---: | :--- |');
  for (const fam of [...new Set(cards.filter((c) => c.meta.tier === 'relief').map((c) => c.meta.family))].sort()) {
    const subCards = cards.filter((c) => c.meta.family === fam && c.meta.subType !== 'master');
    const masterCard = cards.find((c) => c.meta.family === fam && c.meta.subType === 'master');
    L.push(
      `| **${fam}** | \`${fam === 'mermaid' ? 'render_mermaid' : 'render_vchart'}_*\` | ${subCards.length} | ` +
        `${masterCard?.soul.summary ?? '类型外制图'} |`
    );
  }
  L.push('');
  L.push('### 救济层 sub_type 索引（按需 read 语法）');
  L.push('');
  for (const fam of [...new Set(cards.filter((c) => c.meta.tier === 'relief').map((c) => c.meta.family))].sort()) {
    L.push(`**${fam}**`);
    L.push('');
    for (const c of cards.filter((x) => x.meta.family === fam && x.meta.subType !== 'master')) {
      L.push(`- \`${c.meta.subType}\` → \`protocol://segments/${c.meta.parentType}/${c.meta.subType}\` · 意图：${c.meta.intents.join(' · ') || '—'}`);
    }
    L.push('');
  }
  L.push('> 全部 54 张卡片均已迁入真源；`protocol://segments/<parent>/<sub>` 覆盖所有 kind。');
  return L.join('\n');
}

/** 具体提示词（protocol://prompts/<kind> 的数据） */
function renderPrompt(card: CardSpec): string {
  const m = card.meta;
  const L: string[] = [];
  L.push(`# IQS 生成提示词 · ${m.id}`);
  L.push('');
  L.push(`你是${m.expertise.join(' / ')}专家。请为用户需求生成 **IQS-DSL v1 的 \`${m.id}\`**（body: \`${m.body}\`）。`);
  L.push('');
  L.push('## 目标');
  L.push('');
  L.push(card.soul.summary);
  L.push('');
  L.push('## 生成要点');
  L.push('');
  (card.promptNotes ?? ['遵循语法约束与范式示例。']).forEach((n, i) => L.push(`${i + 1}. ${n}`));
  L.push('');
  L.push('## 输出红线');
  L.push('');
  outputControlsFor(card.meta.family, card.meta.tier, card.outputControls).forEach((n, i) => L.push(`${i + 1}. ${n}`));
  L.push('');
  L.push('## 范式（照此结构，不要照抄内容）');
  L.push('');
  L.push('```dsl');
  L.push(card.example.dsl.trimEnd());
  L.push('```');
  L.push('');
  L.push('## 语法');
  L.push('');
  L.push(renderSyntaxRules(card));
  return L.join('\n');
}

/** 组件初始示例常量片段（重建 constants.tsx 的 INITIAL_*_DSL） */
function renderStarterFragment(card: CardSpec): string {
  const starter = card.starter ?? card.example;   // 缺省统一为 example（AUD-124）
  if (!starter) return '';
  // 常量名以 mcpName 去前缀的 slug 为准，与 constants.tsx 既有命名对齐
  // （如 render_matrix_plot → INITIAL_MATRIX_PLOT_DSL）
  const slug = card.meta.mcpName.replace(/^render_/, '');
  const constName = `INITIAL_${slug.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}_DSL`;
  const dsl = starter.dsl.trimEnd().replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return `export const ${constName} = \`${dsl}\`;\n`;
}

// ── 主流程 ─────────────────────────────────────────────────────────

async function loadCards(): Promise<CardSpec[]> {
  const files = collectCardFiles();
  const cards: CardSpec[] = [];
  for (const f of files) {
    const mod = await import(f);
    const card = (mod.default ?? mod) as CardSpec;
    if (!card?.meta?.id) throw new Error(`${path.basename(f)}: 缺少 meta.id`);
    cards.push(card);
  }
  return cards;
}

/**
 * 递归收集 dsl/cards/<family>/<slug>.card.ts。
 *
 * 目录按 family 分层是**必需**的：sub_type 跨 family 会重名
 * （radar/scatter: iqs_native↔vchart；pie: mermaid↔vchart），同 family 内也可能重名
 * （vchart 的双 heatmap —— 即 AUD-131 资源 URI 冲突的根因），
 * 故文件名为 mcpName 去掉 `render_` 前缀。
 */
function collectCardFiles(): string[] {
  const base = path.join(ROOT, 'dsl/cards');
  const out: string[] = [];
  for (const fam of fs.readdirSync(base).sort()) {
    const p = path.join(base, fam);
    if (!fs.statSync(p).isDirectory()) continue;
    for (const f of fs.readdirSync(p).sort()) {
      if (f.endsWith('.card.ts')) out.push(path.join(p, f));
    }
  }
  return out;
}

async function main() {
  const cards = await loadCards();
  fs.rmSync(OUT, { recursive: true, force: true });

  const mcpTools = JSON.parse(fs.readFileSync(path.join(ROOT, 'mcp-server/mcp_tools.json'), 'utf8'));
  const diff: string[] = [];

  for (const card of cards) {
    const m = card.meta;
    /**
     * 产物路径按 family 分层（`build/cards/<family>/…`）：
     * sub_type 跨 family 会重名（radar/scatter/pie），同 family 内也可能重名（vchart 双 heatmap），
     * 故统一以 `mcpName` 去 `render_` 前缀作为 slug，保证产物不互相覆盖。
     */
    const slug = m.mcpName.replace(/^render_/, '');
    const famOut = path.join(OUT, m.family);
    for (const sub of ['segments', 'manual', 'cardDocs', 'prompts']) {
      fs.mkdirSync(path.join(famOut, sub), { recursive: true });
    }

    fs.writeFileSync(path.join(famOut, 'segments', `${slug}.md`), renderSegment(card));
    fs.writeFileSync(path.join(famOut, 'manual', `${slug}.md`), renderManualSection(card));
    fs.writeFileSync(path.join(famOut, 'cardDocs', `${slug}.json`), renderCardDocs(card));
    fs.writeFileSync(path.join(famOut, 'prompts', `${slug}.md`), renderPrompt(card));
    const frag = renderStarterFragment(card);
    if (frag) {
      const startersFile = path.join(OUT, 'starters.ts');
      fs.writeFileSync(startersFile, (fs.existsSync(startersFile) ? fs.readFileSync(startersFile, 'utf8') : '') + frag);
    }

    // MCP 条目（拟替换值）
    const existing = mcpTools.find((t: any) => t.name === m.mcpName);
    const rebuilt = {
      name: m.mcpName,
      parent_type: m.parentType,
      sub_type: m.subType,
      display_name: m.displayName,
      description: card.description,
      expertise: m.expertise.join(', '),
      expert_logic: renderExpertLogic(card),
      syntax_rules: renderSyntaxRules(card),
      official_example: card.example.dsl.trimEnd(),
      tier: m.tier,
      intent_trigger: m.intents,
      inference_key: m.inferenceKey,
      render_engine: m.renderEngine,
    };
    fs.writeFileSync(path.join(OUT, `mcp.${m.id}.json`), JSON.stringify(rebuilt, null, 2));

    // ── 差异报告 ──
    if (!existing) {
      diff.push(`- \`${m.mcpName}\`：**mcp_tools.json 中不存在**（新增）`);
    } else {
      const exOld = (existing.official_example || '').trim();
      const exNew = card.example.dsl.trimEnd();
      const oldLines = new Set(exOld.split('\n').map((s: string) => s.trim()).filter(Boolean));
      const newLines = exNew.split('\n').map((s: string) => s.trim()).filter(Boolean);
      const hit = newLines.filter((l: string) => oldLines.has(l)).length;
      diff.push(
        `- \`${m.mcpName}\` 示例：新 ${newLines.length} 行 / 旧 ${oldLines.size} 行，重合 ${hit} 行（${Math.round((hit / newLines.length) * 100)}%）`
      );
      diff.push(`  - 旧 official_example 首行：\`${exOld.split('\n')[0]}\``);
      diff.push(`  - 新 official_example 首行：\`${exNew.split('\n')[0]}\``);
      diff.push(
        `  - syntax_rules 长度：旧 ${(existing.syntax_rules || '').length} → 新 ${renderSyntaxRules(card).length}`
      );
    }
  }

  fs.writeFileSync(path.join(OUT, 'intents.md'), renderIntents(cards));

  // ── 写入生产（落点切换） ────────────────────────────────────────
  if (!process.argv.includes('--dry-run')) {
    const bak = path.join(OUT, '_backup');
    const backupFile = (rel: string) => {
      const src = path.join(ROOT, rel);
      if (!fs.existsSync(src)) return;
      const dst = path.join(bak, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.cpSync(src, dst, { recursive: true });
    };

    // (a) mcp_tools.json —— 只替换真源覆盖的字段，保留 name/input_schema 等未建模字段
    backupFile('mcp-server/mcp_tools.json');
    const mcpPath = path.join(ROOT, 'mcp-server/mcp_tools.json');
    const tools: any[] = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
    let nM = 0;
    for (const card of cards) {
      const t = tools.find((x) => x.name === card.meta.mcpName);
      if (!t) continue;
      t.description = card.description;
      t.expertise = card.meta.expertise.join(', ');
      t.expert_logic = renderExpertLogic(card);
      t.syntax_rules = renderSyntaxRules(card);
      t.official_example = card.example.dsl.trimEnd();
      t.intent_trigger = card.meta.intents;
      t.tier = card.meta.tier;
      if (card.meta.renderEngine) t.render_engine = card.meta.renderEngine;
      if (card.meta.inferenceKey) t.inference_key = card.meta.inferenceKey;
      nM++;
    }
    fs.writeFileSync(mcpPath, JSON.stringify(tools, null, 2) + '\n');

    // (b) protocol/segments/<name>.md（core 沿用既有文件名；relief 用 <slug>.md）
    backupFile('protocol/segments');
    let nS = 0;
    for (const card of cards) {
      const m = card.meta;
      /**
       * segment 文件名 = **slug**（mcpName 去 `render_` 前缀，master 再去 `_master`）。
       *
       * `protocol/segments/` 是**扁平目录**，用 sub_type 作文件名会互相覆盖，实测两类冲突：
       *   · 跨 family 重名：radar / scatter（core↔vchart）、pie（mermaid↔vchart）
       *   · 同 family 重名：render_vchart_heatmap 与 render_vchart_correlation_heat 的
       *     sub_type 都是 `heatmap`（即 AUD-131 的资源 URI 冲突根因）
       * slug 全局唯一，且与既有文件名一致（render_matrix_plot → matrix_plot.md）。
       */
      const fn = `${m.mcpName.replace(/^render_/, '').replace(/_master$/, '')}.md`;
      fs.writeFileSync(path.join(ROOT, 'protocol/segments', fn), renderSegment(card));
      nS++;
    }

    // (b2) protocol/intents.md + protocol/prompts/<slug>.md（MCP 的意图路由与提示词资源）
    backupFile('protocol/intents.md');
    backupFile('protocol/prompts');
    fs.writeFileSync(path.join(ROOT, 'protocol/intents.md'), renderIntents(cards));
    const promptsDir = path.join(ROOT, 'protocol/prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    let nP = 0;
    for (const card of cards) {
      const slug = card.meta.mcpName.replace(/^render_/, '').replace(/_master$/, '');
      fs.writeFileSync(path.join(promptsDir, `${slug}.md`), renderPrompt(card));
      nP++;
    }

    // (c) constants.tsx 的 INITIAL_*_DSL
    backupFile('constants.tsx');
    const cPath = path.join(ROOT, 'constants.tsx');
    let cs = fs.readFileSync(cPath, 'utf8');
    let nC = 0;
    const missing: string[] = [];
    for (const card of cards) {
      const slug = card.meta.mcpName.replace(/^render_/, '').replace(/_master$/, '');
      const constName = `INITIAL_${slug.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}_DSL`;
      const dsl = card.example.dsl
        .trimEnd()
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');
      const re = new RegExp(`export const ${constName} = \`[\\s\\S]*?\`;`);
      if (!re.test(cs)) { missing.push(constName); continue; }
      cs = cs.replace(re, `export const ${constName} = \`${dsl}\`;`);
      nC++;
    }
    fs.writeFileSync(cPath, cs);

    // (d) dsl/generated/cardDocs.ts（帮助弹窗数据）
    const genDir = path.join(ROOT, 'dsl/generated');
    fs.mkdirSync(genDir, { recursive: true });
    const entryLines = cards.map((c) => {
      const key = c.meta.mcpName.replace(/^render_/, '').replace(/_master$/, '');
      const obj = JSON.stringify(cardDocObject(c), null, 2).split('\n').map((l, i) => (i === 0 ? l : '  ' + l)).join('\n');
      return `  ${JSON.stringify(key)}: ${obj},`;
    });
    fs.writeFileSync(
      path.join(genDir, 'cardDocs.ts'),
      `/**\n * 帮助弹窗数据 · 由 dsl/cards/*.card.ts 生成，**请勿手工编辑**。\n * 重新生成：npm run build:cards\n */\n` +
        `import type { CardDocEntry } from '../../components/CardDocModal.tsx';\n\n` +
        `export const CARD_DOCS: Record<string, CardDocEntry> = {\n${entryLines.join('\n')}\n};\n\n` +
        `export function getCardDoc(kind: string): CardDocEntry | undefined {\n  return CARD_DOCS[kind];\n}\n`
    );

    console.log('');
    console.log(`✓ 已写入生产：mcp_tools.json ${nM} 条 · protocol/segments ${nS} 个 · protocol/intents.md + protocol/prompts ${nP} 个 · constants.tsx ${nC} 个常量 · dsl/generated/cardDocs.ts`);
    console.log(`  备份：build/cards/_backup/`);
    if (missing.length) console.warn(`  ⚠ constants.tsx 未找到的常量：${missing.join(', ')}`);
  } else {
    console.log('· --dry-run：跳过写入生产');
  }

  const report = [
    '# 卡片真源生成报告（S0 试点）',
    '',
    `- 真源文件：${cards.length} 份（${cards.map((c) => c.meta.id).join(', ')}）`,
    `- 产物目录：\`build/cards/\``,
    '- **S0 阶段不覆盖生产文件**；本报告用于切换前的差异审查。',
    '',
    '## 与现状的差异',
    '',
    ...diff,
    '',
    '## 产物清单',
    '',
    '| 产物 | 拟替换的生产文件 |',
    '| :--- | :--- |',
    '| `segments/<kind>.md` | `protocol/segments/<kind>.md` |',
    '| `manual/<kind>.md` | `docs/IQS_DSL_V1_MANUAL.md` 的对应章节 |',
    '| `cardDocs/<kind>.json` | `components/*Editor.tsx` 帮助弹窗内的硬编码表格 |',
    '| `prompts/<kind>.md` | **新增** `protocol://prompts/<kind>` |',
    '| `mcp.<kind>.json` | `mcp-server/mcp_tools.json` 的对应条目 |',
    '| `starters.ts` | `constants.tsx` 的 `INITIAL_*_DSL` |',
    '| `intents.md` | **新增** `protocol://intents` |',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'DIFF_REPORT.md'), report);

  console.log(`✓ 生成 ${cards.length} 份卡片 → build/cards/`);
  for (const c of cards) {
    console.log(
      `  · ${c.meta.id.padEnd(10)} syntax ${String(c.syntax.length).padStart(2)} 条 · ` +
        `示例 ${c.example.dsl.trim().split('\n').length} 行 · 反例 ${c.counterexamples?.length ?? 0} 条` +
        `${c.starter ? ' · 含 starter' : ''}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
