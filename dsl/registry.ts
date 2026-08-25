/**
 * IQS-DSL v1 — Kind registry (runtime)
 */

import kindsJson from './kinds.json';
import type { CoreKindId, KindDefinition } from './types';

export const DSL_SPEC_VERSION = (kindsJson as any).version as string;
export const DSL_SPEC_PATH = (kindsJson as any).spec as string;

const coreKinds = (kindsJson as any).coreKinds as KindDefinition[];
const reliefFamilies = (kindsJson as any).reliefFamilies as KindDefinition[];

const byId = new Map<string, KindDefinition>();
coreKinds.forEach((k) => byId.set(k.id, k));
reliefFamilies.forEach((k) => byId.set(k.id, k));

export function listCoreKinds(): KindDefinition[] {
  return [...coreKinds];
}

export function listReliefFamilies(): KindDefinition[] {
  return [...reliefFamilies];
}

export function getKind(id: string): KindDefinition | undefined {
  return byId.get(id);
}

export function requireKind(id: CoreKindId | string): KindDefinition {
  const k = byId.get(id);
  if (!k) throw new Error(`Unknown IQS kind: ${id}`);
  return k;
}

/** Map frontend QCToolType string enum values to kind id */
export const QC_TOOL_TO_KIND: Record<string, CoreKindId> = {
  FISHBONE: 'fishbone',
  PARETO: 'pareto',
  HISTOGRAM: 'histogram',
  CONTROL: 'control',
  SCATTER: 'scatter',
  RADAR: 'radar',
  RELATION: 'relation',
  AFFINITY: 'affinity',
  MATRIX: 'matrix',
  MATRIX_PLOT: 'matrixPlot',
  ARROW: 'arrow',
  PDPC: 'pdpc',
  BASIC: 'basic',
  FLOW: 'flow'
};

/** Headless URL ?type= value → kind id */
export const RENDER_TYPE_TO_KIND: Record<string, string> = {
  fishbone: 'fishbone',
  pareto: 'pareto',
  histogram: 'histogram',
  control: 'control',
  spc: 'control',
  scatter: 'scatter',
  radar: 'radar',
  relation: 'relation',
  affinity: 'affinity',
  matrix: 'matrix',
  matrix_plot: 'matrixPlot',
  matrixplot: 'matrixPlot',
  arrow: 'arrow',
  pdpc: 'pdpc',
  basic: 'basic',
  flow: 'flow',
  mermaid: 'mermaid',
  vchart: 'vchart'
};

export function isCoreKind(id: string): boolean {
  const k = byId.get(id);
  return !!k && k.tier === 'core';
}

export function expectedNativeMcpNames(): string[] {
  return coreKinds.map((k) => k.mcpName!).filter(Boolean);
}
