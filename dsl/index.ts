/**
 * IQS-DSL v1 — public entry
 *
 * Parsers remain in components/* for UI coupling; this module provides
 * registry, shell helpers, and a facade for tooling / future migration.
 */

export * from './types';
export * from './shell';
export {
  DSL_SPEC_VERSION,
  DSL_SPEC_PATH,
  listCoreKinds,
  listReliefFamilies,
  getKind,
  requireKind,
  QC_TOOL_TO_KIND,
  RENDER_TYPE_TO_KIND,
  isCoreKind,
  expectedNativeMcpNames
} from './registry';

import { extractShell, stripLlmFences } from './shell';
import { getKind, QC_TOOL_TO_KIND } from './registry';
import type { ParseWarning, ShellExtract } from './types';

export interface LintResult {
  kind: string;
  ok: boolean;
  shell: ShellExtract;
  warnings: ParseWarning[];
  errors: string[];
}

/**
 * Lint DSL text against kind registry (does not replace kind parsers).
 */
export function lintDsl(kindId: string, content: string): LintResult {
  const cleaned = stripLlmFences(content);
  const kind = getKind(kindId);
  const errors: string[] = [];
  if (!kind) {
    return {
      kind: kindId,
      ok: false,
      shell: extractShell(cleaned),
      warnings: [],
      errors: [`Unknown kind: ${kindId}`]
    };
  }

  const shell = extractShell(cleaned, {
    hashIsStructure: kind.body === 'Tree',
    knownColorSlots: kind.colorSlots
  });

  if (!shell.title && !cleaned.match(/^Title\s*:/im)) {
    // title may only live in bodyLines if extract kept it — check raw
    if (!/^Title\s*:/im.test(cleaned)) {
      errors.push('Missing Title: (recommended as first line)');
    }
  }

  if (kind.typeDirective) {
    const t = shell.directives['Type'] || shell.directives['type'];
    if (t) {
      const allowed = kind.typeDirective.values.map((v) => v.toLowerCase());
      const ok = allowed.some(
        (a) => t.toLowerCase() === a || t.toLowerCase().startsWith(a.toLowerCase())
      );
      if (!ok) {
        errors.push(
          `Type: "${t}" is not valid for kind ${kindId} (${kind.typeDirective.meaning}); allowed: ${kind.typeDirective.values.join(', ')}`
        );
      }
    }
  }

  // Affinity must not rely on markdown tree
  if (kindId === 'affinity' && /^#+\s+/m.test(cleaned) && !/Item\s*:/i.test(cleaned)) {
    errors.push(
      'affinity uses ItemTree (Item: id, label, parentId), not #/## headers (those are fishbone-only)'
    );
  }

  return {
    kind: kindId,
    ok: errors.length === 0,
    shell,
    warnings: shell.warnings,
    errors
  };
}

export function kindFromQcTool(tool: string): string | undefined {
  return QC_TOOL_TO_KIND[tool];
}
