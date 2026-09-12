/**
 * IQS-Flow **连线路径诊断探针**（非 build 护栏）—— R22 落库版
 * 运行: node --experimental-strip-types scripts/_flow_probe_routes.ts [dslFile]
 *
 * 用途：打印**渲染实际使用的那条路径**——每条边的「源端口 → 目标端口」、路径点、折弯数、穿盒标记。
 * R22 的 `AUD-141`（回折穿自身盒）· `AUD-142`（回折未计入折弯）· `AUD-143`（目标端口背向）
 * 正是靠本探针的等价脚本定位的；正式断言见 `scripts/assert_flow_geometry.ts`。
 *
 * 输出样例（R22 修复后，canonical 卡片示例）：
 *   g1:T  ↑   p1:B   pts=2  bends=0  Hspan=0    [[391,520],[391,294]]
 *   d1:L  ←   p1:R   pts=2  bends=0  Hspan=807  [[1260,267],[453,267]]
 */
import { readFileSync } from 'node:fs';
import { parseFlowDSL } from '../components/flow/FlowParser.ts';
import { flowToSVG, computeExcelLayout } from '../components/flow/flowToSVG.ts';
import type { FlowData } from '../types.ts';
import card from '../dsl/cards/iqs_native/flow.card.ts';

/** 折弯数（含 180° 回折项，与 `countBends` 同口径） */
function bendsOf(pts: number[][]): number {
  let b = 0;
  for (let i = 2; i < pts.length; i++) {
    const d1x = pts[i - 1][0] - pts[i - 2][0], d1y = pts[i - 1][1] - pts[i - 2][1];
    const d2x = pts[i][0] - pts[i - 1][0], d2y = pts[i][1] - pts[i - 1][1];
    if ((d1x !== 0 && d2y !== 0) || (d1y !== 0 && d2x !== 0)) b++;
    else if (d1x * d2x + d1y * d2y < 0) b += 2;
  }
  return b;
}

const dsl = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : card.example.dsl;
const r = parseFlowDSL(dsl);
if (r.errors.length) console.error('解析错误：', JSON.stringify(r.errors, null, 1));
const L = computeExcelLayout(r.data, r.styles);
const svg = flowToSVG(r.data, r.styles);

const boxes = new Map<string, { x0: number; y0: number; x1: number; y1: number }>();
for (const [id, p] of L.nodePos) boxes.set(id, { x0: p.x - p.W / 2, y0: p.y - p.H / 2, x1: p.x + p.W / 2, y1: p.y + p.H / 2 });

/** 端点最近的节点与端口（端点在走廊上，故用「贴边」判断） */
function nearest(x: number, y: number): { id: string; port: string } {
  let best = '-', port = '?', bd = Infinity;
  for (const [id, b] of boxes) {
    const dx = Math.max(b.x0 - x, 0, x - b.x1);
    const dy = Math.max(b.y0 - y, 0, y - b.y1);
    const d = Math.hypot(dx, dy);
    if (d < bd) {
      bd = d; best = id;
      port = Math.abs(y - (b.y0 + b.y1) / 2) < 1 ? (x < (b.x0 + b.x1) / 2 ? 'L' : 'R')
        : (y < (b.y0 + b.y1) / 2 ? 'T' : 'B');
    }
  }
  return { id: best, port };
}

function pierces(pts: number[][]): string[] {
  const hits: string[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    for (const [id, b] of boxes) {
      // 与节点盒内部（收缩 3px）相交 ⇒ 判定穿盒（stub 段自边界出发不会命中）
      const minX = b.x0 + 3, maxX = b.x1 - 3, minY = b.y0 + 3, maxY = b.y1 - 3;
      if (maxX <= minX || maxY <= minY) continue;
      const dx = bx - ax, dy = by - ay;
      let t0 = 0, t1 = 1, ok = true;
      for (const [p, q] of [[-dx, ax - minX], [dx, maxX - ax], [-dy, ay - minY], [dy, maxY - ay]] as [number, number][]) {
        if (p === 0) { if (q < 0) { ok = false; break; } }
        else { const t = q / p; if (p < 0) { if (t > t0) t0 = t; } else if (t < t1) t1 = t; }
      }
      if (ok && t0 <= t1) hits.push(id);
    }
  }
  return hits;
}

const paths = [...svg.matchAll(/<path d="(M[^"]+)" data-edge="1" fill="none" stroke="([^"]+)" stroke-width="([\d.]+)"([^>]*)\/>/g)];
console.log(`边路径 ${paths.length} 条（${(r.data as FlowData).edges.length} 条解析边 + N/DATA 虚拟虚线）\n`);
for (const m of paths) {
  const pts = m[1].split(/[ML]/).filter(Boolean).map((s) => s.split(',').map(Number));
  const a = pts[0], b = pts[pts.length - 1];
  const s = nearest(a[0], a[1]), t = nearest(b[0], b[1]);
  const dir = pts.slice(1).map((p, i) => {
    const q = pts[i];
    return Math.abs(p[1] - q[1]) < 0.6 ? (p[0] > q[0] ? '→' : '←') : (p[1] > q[1] ? '↓' : '↑');
  }).join('');
  const span = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
  const pierce = pierces(pts);
  const flags = [
    pierce.length ? `穿盒[${pierce.join(',')}]` : '',
    bendsOf(pts) > pts.length - 2 ? '回折' : '',
    m[4].includes('cross-over') ? '交叉反差' : '',
    m[4].includes('stroke-dasharray') ? '虚线' : '',
  ].filter(Boolean).join(' ');
  console.log(
    `${`${s.id}:${s.port}`.padEnd(11)} ${dir.padEnd(6)} ${`${t.id}:${t.port}`.padEnd(11)} ` +
    `pts=${pts.length} bends=${bendsOf(pts)} Hspan=${span.toFixed(0).padStart(4)}  ${JSON.stringify(pts.map((p) => p.map(Math.round)))}` +
    (flags ? `   ⚠ ${flags}` : ''),
  );
}
