/**
 * IQS-Flow 配色方案 + 连线/面板反差色
 * 交叉点用 contrastStroke(line, panel) 标出，避免正交交点难以辨认。
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
  const fallback = lum(P[0], P[1], P[2]) > 0.5 ? '#1e293b' : '#f8fafc';
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
    name: '默认蓝',
    colors: {
      startColor: '#2563eb', endColor: '#ef4444', taskColor: '#3b82f6',
      gatewayColor: '#10b981', parallelColor: '#8b5cf6', subprocessColor: '#0ea5e9',
      annotationColor: '#f59e0b', dataColor: '#64748b', laneColor: '#e2e8f0',
      axisColor: '#334155', lineColor: '#64748b', textColor: '#1e293b', panelColor: '#f8fafc',
    },
  },
  {
    id: 'contrast',
    name: '高反差',
    colors: {
      startColor: '#1d4ed8', endColor: '#b91c1c', taskColor: '#1e40af',
      gatewayColor: '#047857', parallelColor: '#6d28d9', subprocessColor: '#0369a1',
      annotationColor: '#b45309', dataColor: '#334155', laneColor: '#cbd5e1',
      axisColor: '#0f172a', lineColor: '#0f172a', textColor: '#0f172a', panelColor: '#ffffff',
    },
  },
  {
    id: 'print',
    name: '打印灰',
    colors: {
      startColor: '#111827', endColor: '#111827', taskColor: '#374151',
      gatewayColor: '#4b5563', parallelColor: '#4b5563', subprocessColor: '#6b7280',
      annotationColor: '#9ca3af', dataColor: '#6b7280', laneColor: '#e5e7eb',
      axisColor: '#111827', lineColor: '#111827', textColor: '#111827', panelColor: '#ffffff',
    },
  },
  {
    id: 'teal',
    name: '青绿',
    colors: {
      startColor: '#0f766e', endColor: '#b45309', taskColor: '#0d9488',
      gatewayColor: '#059669', parallelColor: '#7c3aed', subprocessColor: '#0891b2',
      annotationColor: '#ca8a04', dataColor: '#57534e', laneColor: '#ccfbf1',
      axisColor: '#134e4a', lineColor: '#0f766e', textColor: '#134e4a', panelColor: '#f0fdfa',
    },
  },
  {
    id: 'warm',
    name: '暖沙',
    colors: {
      startColor: '#c2410c', endColor: '#991b1b', taskColor: '#ea580c',
      gatewayColor: '#b45309', parallelColor: '#a21caf', subprocessColor: '#d97706',
      annotationColor: '#ca8a04', dataColor: '#78716c', laneColor: '#ffedd5',
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
