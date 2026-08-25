/**
 * IQS-DSL v1 — shared types (IDM-oriented)
 * See docs/IQS_DSL_V1_SPEC.md
 */

export type DslTier = 'core' | 'relief';

export type BodyAlgebra =
  | 'Tree'
  | 'ItemTree'
  | 'Pairs'
  | 'ScalarList'
  | 'TupleList'
  | 'Series'
  | 'AxisSeries'
  | 'Graph'
  | 'Network'
  | 'ProcessGraph'
  | 'Matrix'
  | 'Table'
  | 'Dataset'
  | 'FlowGraph'
  | 'Foreign';

export type CoreKindId =
  | 'fishbone'
  | 'affinity'
  | 'pareto'
  | 'histogram'
  | 'control'
  | 'scatter'
  | 'radar'
  | 'relation'
  | 'arrow'
  | 'pdpc'
  | 'matrix'
  | 'matrixPlot'
  | 'basic'
  | 'flow';

export interface KindDefinition {
  id: string;
  tier: DslTier;
  family: 'iqs_native' | 'mermaid' | 'vchart';
  body: BodyAlgebra;
  qcTool?: string;
  mcpName?: string;
  renderType?: string;
  intents?: string[];
  typeDirective?: {
    name: string;
    values: string[];
    meaning: string;
  } | null;
  colorSlots?: string[];
  note?: string;
}

export interface LineClass {
  kind:
    | 'empty'
    | 'comment'
    | 'title'
    | 'color'
    | 'font'
    | 'show'
    | 'directive'
    | 'body'
    | 'unknown';
  raw: string;
  key?: string;
  value?: string;
  slot?: string;
}

export interface ParseWarning {
  line: number;
  code: string;
  message: string;
}

export interface ShellExtract {
  title?: string;
  colors: Record<string, string>;
  fonts: Record<string, number>;
  shows: Record<string, boolean>;
  decimals?: number;
  directives: Record<string, string>;
  bodyLines: string[];
  warnings: ParseWarning[];
}
