/**
 * IQS-Flow 配色方案 + 连线/面板反差色
 * 交叉时线序更大的整条连线用 contrastStroke(line, panel)（连线色×底色公共差异色）。
 */
import type { FlowChartStyles } from '../../types';

export const COLOR_SLOT_MAP: { styleKey: keyof FlowChartStyles; slot: string }[] = [
  { styleKey: 'startColor', slot: 'Start' },
  { styleKey: 'endColor', slot: 'End' },
  { styleKey: 'taskColor', slot: 'Task' },
  { styleKey: 'gatewayColor', slot: 'Gateway' },
  { styleKey: 'parallelColor', slot: 'Parallel' },
  { styleKey: 'subprocessColor', slot: 'Subprocess' },
  { styleKey: 'annotationColor', slot: 'Annotation' },
  { styleKey: 'dataColor', slot: 'Data' },
  { styleKey: 'laneColor', slot: 'Lane' },
  { styleKey: 'axisColor', slot: 'Axis' },
  { styleKey: 'lineColor', slot: 'Line' },
  { styleKey: 'textColor', slot: 'Text' },
  { styleKey: 'panelColor', slot: 'Panel' },
];

function hexToRgb(h: string): [number, number, number] {
  let s = (h || '#64748b').replace('#', '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [100, 116, 139];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function lum(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function dist2(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/** 连线色相对面板色的反差色：沿 line−panel 再推远，保证既异于连线也异于面板 */
export function contrastStroke(line: string, panel: string): string {
  const L = hexToRgb(line);
  const P = hexToRgb(panel);
  const push = L.map((c, i) => {
    const sign = c >= P[i] ? 1 : -1;
    return Math.max(0, Math.min(255, c + sign * 72));
  }) as [number, number, number];
  let out = push;
  if (dist2(out, L) < 40 * 40) {
    const inv = P.map((c) => 255 - c) as [number, number, number];
    out = out.map((c, i) => Math.round(c * 0.3 + inv[i] * 0.7)) as [number, number, number];
  }
  const fallback = lum(P[0], P[1], P[2]) > 0.5 ? '#1A2428' : '#F5F7FA';
  if (Math.abs(lum(out[0], out[1], out[2]) - lum(P[0], P[1], P[2])) < 0.28) return fallback;
  if (dist2(out, L) < 24 * 24) return fallback;
  return rgbToHex(out[0], out[1], out[2]);
}

export interface FlowPalette {
  id: string;
  name: string;
  colors: Partial<FlowChartStyles>;
}

export const FLOW_PALETTES: FlowPalette[] = [
  {
    id: 'default',
    name: '鹿溪（默认）',
    colors: {
      // LUXI Design System v1.0 范式色（工坊·一法）
      startColor: '#0D5E42', endColor: '#E74C3C', taskColor: '#0A4A33',
      gatewayColor: '#00D2FF', parallelColor: '#3498DB', subprocessColor: '#14805C',
      annotationColor: '#F1C40F', dataColor: '#64748B', laneColor: 'rgba(13,94,66,0.10)',
      axisColor: '#42525C', lineColor: '#64748B', textColor: '#1A2428', panelColor: '#F5F7FA',
    },
  },
  {
    id: 'contrast',
    name: '高反差',
    colors: {
      startColor: '#0A4A33', endColor: '#A92C20', taskColor: '#083B29',
      gatewayColor: '#008099', parallelColor: '#3498DB', subprocessColor: '#0369a1',
      annotationColor: '#A67F08', dataColor: '#42525C', laneColor: 'rgba(13,94,66,0.18)',
      axisColor: '#1A2428', lineColor: '#1A2428', textColor: '#1A2428', panelColor: '#FFFFFF',
    },
  },
  {
    id: 'print',
    name: '打印灰',
    colors: {
      startColor: '#1A2428', endColor: '#1A2428', taskColor: '#42525C',
      gatewayColor: '#64748B', parallelColor: '#64748B', subprocessColor: '#64748B',
      annotationColor: '#94A3B8', dataColor: '#64748B', laneColor: '#e5e7eb',
      axisColor: '#1A2428', lineColor: '#1A2428', textColor: '#1A2428', panelColor: '#FFFFFF',
    },
  },
  {
    id: 'teal',
    name: '青绿',
    colors: {
      startColor: '#0f766e', endColor: '#A67F08', taskColor: '#0d9488',
      gatewayColor: '#00A8CC', parallelColor: '#3498DB', subprocessColor: '#0891b2',
      annotationColor: '#D0A50A', dataColor: '#57534e', laneColor: '#ccfbf1',
      axisColor: '#134e4a', lineColor: '#0f766e', textColor: '#134e4a', panelColor: '#f0fdfa',
    },
  },
  {
    id: 'warm',
    name: '暖沙',
    colors: {
      startColor: '#c2410c', endColor: '#991b1b', taskColor: '#ea580c',
      gatewayColor: '#A67F08', parallelColor: '#a21caf', subprocessColor: '#D0A50A',
      annotationColor: '#D0A50A', dataColor: '#78716c', laneColor: '#ffedd5',
      axisColor: '#7c2d12', lineColor: '#9a3412', textColor: '#7c2d12', panelColor: '#fff7ed',
    },
  },
];

export function applyPalette(base: FlowChartStyles, palette: FlowPalette): FlowChartStyles {
  return { ...base, ...palette.colors };
}

export function paletteOf(styles: FlowChartStyles): string | null {
  for (const p of FLOW_PALETTES) {
    const keys = Object.keys(p.colors) as (keyof FlowChartStyles)[];
    if (keys.every((k) => String(styles[k] || '').toLowerCase() === String(p.colors[k] || '').toLowerCase())) {
      return p.id;
    }
  }
  return null;
}
