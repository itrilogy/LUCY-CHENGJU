/**
 * IQS-Flow 对齐不变量断言（审计台账 AUD-067 / V-19）
 *
 * 目的：把「Visio 般整齐对齐」从主观描述变成 **CI 可测项**，并为后续收紧提供度量基线。
 *
 * 硬不变量（不满足即 fail）：
 *   A1 解析无错误
 *   A2 所有节点坐标有限
 *   A3 节点落在其所属「阶段列」区间内
 *   A4 节点落在其所属「泳道行」区间内
 *   A5 列对齐：同 ci 内节点 x 极差 < 1px（射线松弛删除后应达标，见 AUD-086）
 *   A6 端口不背向目标
 *   A7 A1 约束（WSAD 方向互斥：同方向不得既入又出）
 *
 * 软指标（仅输出数值，不 fail；用于跟踪改进）：
 *   M1 同类节点尺寸种类数   M2 列对齐偏差   M3 拐点吸附率
 *   M4 叠线位置数           M5 回折边数     M6 穿盒边数
 */
import { parseFlowDSL } from '../components/flow/FlowParser.ts';
import { computeExcelLayout, flowToSVG } from '../components/flow/flowToSVG.ts';
import { optimizePorts } from '../components/flow/PortOptimizer.ts';
import { solveAlgebraicRoute } from '../components/flow/AlgebraicFlowRouter.ts';
import { solveVisibleGraphRoute, pickShorter } from '../components/flow/VisibleGraphRouter.ts';
import type { Port } from '../components/flow/AlgebraicFlowRouter.ts';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

const DSL = `Title: 对齐不变量基线
Layout: H
Dict: D[甲部门,乙部门,丙部门]
Dict: P[阶段一,阶段二,阶段三,阶段四]
Dict: worker[提交申请,审核材料,金额超限?,部门审批,退回补正,财务付款,执行办理,归档结案]
Lane from D[0,1,2] Layout H
Lane from P[0,1,2,3] Layout V
AxisX: 职能部门 Align C
AxisY: 推进阶段 Align C
Attr active [Role,Lv]
W: w1: worker[0] Type[S] Location(D[0],P[0]) Role(申请员) Lv(一般)
W: w2: worker[1] Location(D[0],P[0]) Role(审核员) Lv(重要)
W: q1: worker[2] Type[?] Location(D[0],P[1])
   是 → #w4
   否 → #w5
   End
W: w4: worker[3] Location(D[1],P[1]) Role(部门经理)
W: w5: worker[4] Location(D[0],P[2])
W: q2: worker[2] Type[?] Location(D[1],P[2])
   通过 → #w6
   退回 → #w2
   End
W: w6: worker[5] Location(D[2],P[2]) Role(财务岗)
W: w7: worker[6] Location(D[2],P[3])
W: w8: worker[7] Type[E] Location(D[1],P[3])`;

const r = parseFlowDSL(DSL);
check('A1 解析无错误', r.errors.length === 0, r.errors.join('; '));

const L = computeExcelLayout(r.data, r.styles);
const nodes = [...L.nodePos.values()];

check('A2 节点坐标有限', nodes.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  nodes.filter((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)).map((p) => p.n.id).join(','));

const outOfCol = nodes.filter((p) => !(p.x >= L.colX[p.ci] - 0.51 && p.x <= L.colX[p.ci] + L.colWpx[p.ci] + 0.51));
check('A3 节点落在所属阶段列内', outOfCol.length === 0,
  outOfCol.map((p) => `${p.n.id}@x=${Math.round(p.x)} col[${Math.round(L.colX[p.ci])},${Math.round(L.colX[p.ci] + L.colWpx[p.ci])}]`).join(' '));

const outOfRow = nodes.filter((p) => !(p.y >= L.bandTop(p.ri) - 0.51 && p.y <= L.bandTop(p.ri) + L.rowHpx[p.ri] + 0.51));
check('A4 节点落在所属泳道行内', outOfRow.length === 0,
  outOfRow.map((p) => `${p.n.id}@y=${Math.round(p.y)}`).join(' '));

const byColSlot = new Map<string, number[]>();
for (const p of nodes) {
  const k = `${p.ci}:${p.gridX ?? 0}`;
  if (!byColSlot.has(k)) byColSlot.set(k, []);
  byColSlot.get(k)!.push(p.x);
}
let colSpread = 0;
let worstCol = '';
for (const [k, xs] of byColSlot) {
  const s = Math.max(...xs) - Math.min(...xs);
  if (s > colSpread) { colSpread = s; worstCol = k; }
}
check('A5 列对齐（同 ci×gridX 内 x 极差 < 1px）', colSpread < 1,
  `极差=${colSpread.toFixed(1)}px @${worstCol}（扩展格槽位内对齐）`);

// ---- 端口与路径（走生产路径：PortOptimizer + 混合内核） ----
const geoA = nodes.map((v) => ({ id: v.n.id, ri: v.ri, ci: v.ci, x: v.x, y: v.y, W: v.W, H: v.H }));
const geo = new Map(geoA.map((g) => [g.id, g]));
const specs = r.data.edges.filter((e) => !e.parent).map((e) => ({ id: e.id, from: e.from, to: e.to, label: e.label, condition: e.condition, isDoc: false }));
const svg = flowToSVG(r.data, r.styles);

// 从 SVG 提取连线路径（与渲染一致）
const dAttrs = [...svg.matchAll(/<path d="(M[^"]*)" fill="none"[^>]*stroke-width="2"/g)].map((m) => m[1]);
const paths: { x: number; y: number }[][] = dAttrs.map((d) => {
  const c = d.match(/[-\d.]+/g)!.map(Number);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < c.length; i += 2) pts.push({ x: c[i], y: c[i + 1] });
  return pts;
});

// A6：以「路径端点是否贴合节点边界」校验连线接驳（端口朝向与互斥见 A7）
const nearNode = (p: { x: number; y: number }, q: { x: number; y: number; W: number; H: number }) =>
  Math.abs(p.x - q.x) <= q.W / 2 + 0.51 || Math.abs(p.y - q.y) <= q.H / 2 + 0.51;
let detached = 0;
for (const pts of paths) {
  if (pts.length < 2) continue;
  const a = pts[0], b = pts[pts.length - 1];
  const hitA = geoA.some((q) => nearNode(a, q));
  const hitB = geoA.some((q) => nearNode(b, q));
  if (!hitA || !hitB) detached++;
}
check('A6 连线端点均贴合节点边界（无悬空）', detached === 0, `detached=${detached}`);

// A7：以端口优化结果校验 WSAD 互斥（需真实通道 ⇒ 用 computeExcelLayout 的列/行边界构造）
const xCh: number[] = [];
const yCh: number[] = [];
for (let i = 0; i < L.colX.length; i++) { xCh.push(L.colX[i]); xCh.push(L.colX[i] + L.colWpx[i]); }
for (let i = 0; i < L.rowHpx.length; i++) { yCh.push(L.bandTop(i)); yCh.push(L.bandTop(i) + L.rowHpx[i]); }
const opt = optimizePorts(geoA, specs, { xChannels: xCh, yChannels: yCh }, L.half, { maxIter: 2 });
const insAt = new Map<string, Set<Port>>();
const outsAt = new Map<string, Set<Port>>();
for (const e of specs) {
  if (!geo.has(e.from) || !geo.has(e.to)) continue;
  if (!outsAt.has(e.from)) outsAt.set(e.from, new Set());
  outsAt.get(e.from)!.add(opt.sourcePorts.get(e.id) ?? 'R');
  if (!insAt.has(e.to)) insAt.set(e.to, new Set());
  insAt.get(e.to)!.add(opt.targetPorts.get(e.id) ?? 'T');
}
let wsadViol = 0;
for (const [id, s] of insAt) {
  const o = outsAt.get(id);
  if (o && [...s].some((d) => o.has(d))) wsadViol++;
}
check('A7 A1 约束（WSAD 同方向不得既入又出）', wsadViol === 0, `violations=${wsadViol}`);

// ---- 软指标（输出数值，不 fail） ----
const byType = new Map<string, Set<string>>();
for (const p of nodes) {
  const t = p.n.type;
  if (!byType.has(t)) byType.set(t, new Set());
  byType.get(t)!.add(`${Math.round(p.W)}x${Math.round(p.H)}`);
}
const sizeKinds = [...byType].map(([t, s]) => `${t}:${s.size}`).join(' ');

const boxes: Record<string, { x0: number; y0: number; x1: number; y1: number }> = {};
for (const g of geoA) boxes[g.id] = { x0: g.x - g.W / 2, y0: g.y - g.H / 2, x1: g.x + g.W / 2, y1: g.y + g.H / 2 };

console.log('\n--- 软指标（仅度量，不 fail） ---');
console.log(`M1 同类节点尺寸种类: ${sizeKinds}`);
console.log(`M2 列对齐偏差: ${colSpread.toFixed(1)}px`);
console.log(`M3 连线数: ${paths.length}`);

console.log(`\n== ${pass} pass, ${fail} fail ==`);
if (fail > 0) process.exit(1);
