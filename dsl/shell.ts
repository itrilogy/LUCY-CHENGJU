/**
 * IQS-DSL v1 — Shell line classification & extraction
 * Canonical comment: //
 * # is structure only for Tree body (fishbone); elsewhere treated as legacy comment.
 */

import type { LineClass, ParseWarning, ShellExtract } from './types';

const TITLE_RE = /^Title\s*:\s*(.*)$/i;
const COLOR_RE = /^Color\[([^\]]+)\]\s*:\s*(.+)$/i;
const FONT_RE = /^Font\[([^\]]+)\]\s*:\s*(\d+)\s*$/i;
const SHOW_RE = /^Show([A-Za-z]+)\s*:\s*(true|false)\s*$/i;
const DECIMALS_RE = /^Decimals\s*:\s*(\d+)\s*$/i;
const GENERIC_KV_RE = /^([A-Za-z][A-Za-z0-9_-]*(?:\[[^\]]+\])?)\s*:\s*(.*)$/;

/** True if line is a canonical or legacy comment (when hashIsComment). */
export function isCommentLine(trimmed: string, opts?: { hashIsComment?: boolean }): boolean {
  if (!trimmed) return false;
  if (trimmed.startsWith('//')) return true;
  if (opts?.hashIsComment !== false && trimmed.startsWith('#')) return true;
  return false;
}

/**
 * Classify a single non-empty trimmed line (Shell level).
 * Body detection is kind-specific; callers pass remaining lines as body.
 */
export function classifyShellLine(
  trimmed: string,
  lineNo: number,
  opts?: { hashIsStructure?: boolean }
): LineClass {
  if (!trimmed) return { kind: 'empty', raw: trimmed };

  if (trimmed.startsWith('//')) {
    return { kind: 'comment', raw: trimmed };
  }

  // Tree structure (# headers) — not a comment when hashIsStructure
  if (trimmed.startsWith('#')) {
    if (opts?.hashIsStructure) {
      return { kind: 'body', raw: trimmed };
    }
    return { kind: 'comment', raw: trimmed };
  }

  let m = trimmed.match(TITLE_RE);
  if (m) return { kind: 'title', raw: trimmed, key: 'Title', value: m[1].trim() };

  m = trimmed.match(COLOR_RE);
  if (m) return { kind: 'color', raw: trimmed, key: 'Color', slot: m[1], value: m[2].trim() };

  m = trimmed.match(FONT_RE);
  if (m) return { kind: 'font', raw: trimmed, key: 'Font', slot: m[1], value: m[2] };

  m = trimmed.match(SHOW_RE);
  if (m) return { kind: 'show', raw: trimmed, key: `Show${m[1]}`, value: m[2].toLowerCase() };

  m = trimmed.match(DECIMALS_RE);
  if (m) return { kind: 'directive', raw: trimmed, key: 'Decimals', value: m[1] };

  // Legacy aliases normalized at shell layer
  if (/^Grid\s*:/i.test(trimmed)) {
    const val = trimmed.split(':').slice(1).join(':').trim().toLowerCase();
    return { kind: 'show', raw: trimmed, key: 'ShowGrid', value: val === 'true' ? 'true' : 'false' };
  }
  if (/^3D\s*:/i.test(trimmed)) {
    const val = trimmed.split(':').slice(1).join(':').trim().toLowerCase();
    return { kind: 'show', raw: trimmed, key: 'Show3D', value: val === 'true' ? 'true' : 'false' };
  }

  m = trimmed.match(GENERIC_KV_RE);
  if (m && !trimmed.startsWith('-') && !trimmed.startsWith('[')) {
    // Could still be body (Node:, Rel:, Item:, Axis:, etc.) — caller decides
    return {
      kind: 'directive',
      raw: trimmed,
      key: m[1],
      value: m[2]
    };
  }

  return { kind: 'body', raw: trimmed };
}

const BODY_PREFIXES = [
  'Node',
  'Rel',
  'Event',
  'Item',
  'Group',
  'EndGroup',
  'Axis',
  'Series',
  'Dataset',
  'Matrix',
  'Data',
  'Styles',
  'Weight',
  '[series]'
];

function isLikelyBodyDirective(key: string): boolean {
  const base = key.replace(/\[.*\]$/, '');
  return BODY_PREFIXES.some(
    (p) => base === p || key.toLowerCase() === p.toLowerCase() || key.startsWith('[series]')
  );
}

/**
 * Extract shell fields; remaining lines form bodyLines (including body-level directives).
 * For fishbone, pass hashIsStructure: true so # headers stay in body.
 */
export function extractShell(
  content: string,
  opts?: {
    hashIsStructure?: boolean;
    knownColorSlots?: string[];
    bodyDirectiveKeys?: string[];
  }
): ShellExtract {
  const warnings: ParseWarning[] = [];
  const colors: Record<string, string> = {};
  const fonts: Record<string, number> = {};
  const shows: Record<string, boolean> = {};
  const directives: Record<string, string> = {};
  const bodyLines: string[] = [];
  let title: string | undefined;
  let decimals: number | undefined;

  const bodyKeys = new Set(
    (opts?.bodyDirectiveKeys || BODY_PREFIXES).map((k) => k.toLowerCase())
  );

  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const trimmed = line.trim();
    if (!trimmed) {
      bodyLines.push(line);
      return;
    }

    const cls = classifyShellLine(trimmed, lineNo, {
      hashIsStructure: opts?.hashIsStructure
    });

    switch (cls.kind) {
      case 'comment':
        return;
      case 'title':
        title = cls.value;
        return;
      case 'color': {
        const slot = cls.slot || '';
        if (opts?.knownColorSlots && opts.knownColorSlots.length > 0) {
          const ok = opts.knownColorSlots.some((s) => s.toLowerCase() === slot.toLowerCase());
          if (!ok) {
            warnings.push({
              line: lineNo,
              code: 'E_COLOR_SLOT',
              message: `Unknown Color[${slot}] for this kind; ignored by linter (parser may still accept)`
            });
          }
        }
        colors[slot] = cls.value || '';
        bodyLines.push(line); // keep original for kind parsers
        return;
      }
      case 'font':
        fonts[cls.slot || ''] = parseInt(cls.value || '0', 10);
        bodyLines.push(line);
        return;
      case 'show':
        shows[cls.key || ''] = (cls.value || '').toLowerCase() === 'true';
        bodyLines.push(line);
        return;
      case 'directive': {
        const key = cls.key || '';
        if (key.toLowerCase() === 'decimals') {
          decimals = parseInt(cls.value || '0', 10);
          bodyLines.push(line);
          return;
        }
        // Body-level constructs stay in body stream for kind parsers
        if (isLikelyBodyDirective(key) || bodyKeys.has(key.toLowerCase())) {
          bodyLines.push(line);
          return;
        }
        // Domain directives (Type, Layout, USL...) — keep for kind parser AND index
        directives[key] = cls.value || '';
        bodyLines.push(line);
        return;
      }
      default:
        bodyLines.push(line);
    }
  });

  return { title, colors, fonts, shows, decimals, directives, bodyLines, warnings };
}

/** Strip fence artifacts often produced by LLMs */
export function stripLlmFences(text: string): string {
  return text
    .replace(/^```(?:dsl|text|markdown)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .replace(/```\w*\n?/g, '')
    .trim();
}
