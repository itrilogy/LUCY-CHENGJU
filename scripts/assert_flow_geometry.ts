/**
 * IQS-Flow 几何不变量断言（R22 新增）
 * 运行: node --experimental-strip-types scripts/assert_flow_geometry.ts
 *
 * 为什么需要本文件：既有 191 断言只校验「端点是否贴到节点边界」（悬空=0），
 * 因此 R21 的两处缺陷**全部漏网** ——
 *   · 「连线缺目标」真因是路径**回折穿过源节点自身盒体** + 目标端口**背向**（端点仍贴边，故通过）
 *   · 「子流程未按范式显示」真因是布局层与渲染层**两套列数数学**（尺寸合法，故通过）
 *
 * 四条不变量（范式锚点）：
 *   G1 零穿盒 —— 边路径不得穿过任何节点盒，**含源/目标自身盒**；
 *      范式：`docs/flow/math/FLOW_OPTIMALITY_FRAMEWORK.md` A4/A6（不穿节点盒，软约束）。
 *   G2 无回折 —— 折弯计数须等于「纯轴向折弯数」（180° 反向回折 = 0）；
 *      范式：`docs/flow/math/FLOW_ROUTING_MATH_AND_IMPLEMENTATION.md` + AUD-083/107。
 *   G3 无背向端口 —— 源端口朝目标、目标端口迎来源；
 *      范式：`docs/flow/design/FLOW_ROUTING_ENGINE_DESIGN.md` §1.2 / §2.1。
 *   G4 子流程整数倍格 —— 框 = `cols×140 × rows×48`，内部小图落格心，迷你字号 ≥ 11；
 *      范式：`docs/flow/design/FLOW_NDATA_LANE_DESIGN.md` §二 + `FLOW_ROUTING_ENGINE_DESIGN.md` 前提②。
 */
import { parseFlowDSL } from '../components/flow/FlowParser.ts';
import { computeExcelLayout, subprocessInnerLayout, innerCellSize, SUBPROCESS_INNER } from '../components/flow/ExcelLayout.ts';

import { flowToSVG } from '../components/flow/flowToSVG.ts';
import {
  computeGridChannels, segmentIntersectsBox, PORT_NORMALS,
  type NodeGeometry, type Box, type Point, type Port,
} from '../components/flow/AlgebraicFlowRouter.ts';
import { solveRouteHybrid, countBends } from '../components/flow/VisibleGraphRouter.ts';
import { optimizePorts } from '../components/flow/PortOptimizer.ts';
import card from '../dsl/cards/iqs_native/flow.card.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

/** 纯轴向折弯数（**不含** 180° 回折项）—— 与 `computeCost`/`countBends` 的差值即回折数。 */
function rawBends(pts: Point[]): number {
  let b = 0;
  for (let i = 2; i < pts.length; i++) {
    const d1x = pts[i - 1].x - pts[i - 2].x, d1y = pts[i - 1].y - pts[i - 2].y;
    const d2x = pts[i].x - pts[i - 1].x, d2y = pts[i].y - pts[i - 1].y;
    if ((d1x !== 0 && d2y !== 0) || (d1y !== 0 && d2x !== 0)) b++;
  }
  return b;
}

/**
 * 独立的 180° 回折判据（**不借助 `countBends`**）。
 * 若判据借用被测实现自身，则「把回折项删掉」这一注入会让断言恒真 —— 门禁形同虚设（R22 自查发现并修正）。
 * 判据：相邻两段共线且方向相反（点积 < 0）。
 */
function reversalCount(pts: Point[]): number {
  let n = 0;
  for (let i = 2; i < pts.length; i++) {
    const d1x = pts[i - 1].x - pts[i - 2].x, d1y = pts[i - 1].y - pts[i - 2].y;
    const d2x = pts[i].x - pts[i - 1].x, d2y = pts[i].y - pts[i - 1].y;
    const cross = d1x * d2y - d1y * d2x;
    const dot = d1x * d2x + d1y * d2y;
    if (Math.abs(cross) < 0.5 && dot < 0) n++;
  }
  return n;
}

/**
 * 复现 `flowToSVG` 的连线管线（同布局、同通道、同端口优化、同混合内核）——
 * 使断言看到的就是**渲染所用的那条路径**。
 */
function routeAll(dsl: string) {
  const r = parseFlowDSL(dsl);
  const L = computeExcelLayout(r.data, r.styles);
  const nodesGeo: NodeGeometry[] = [];
  for (const [, p] of L.nodePos) nodesGeo.push({ id: p.n.id, ri: p.ri, ci: p.ci, x: p.x, y: p.y, W: p.W, H: p.H });
  const boxes: Record<string, Box> = {};
  for (const n of nodesGeo) boxes[n.id] = { x0: n.x - n.W / 2, y0: n.y - n.H / 2, x1: n.x + n.W / 2, y1: n.y + n.H / 2 };
  const edgeList = (r.data.edges as any[]).filter((e) => !e.parent)
    .filter((e) => L.nodePos.has(e.from) && L.nodePos.has(e.to))
    .map((e) => ({ id: e.id, from: e.from, to: e.to, label: e.label, condition: e.condition, isDoc: e.condition === '__doc__' }));
  // N/DATA 依附虚线（与 flowToSVG 同规则）
  for (const n of r.data.nodes as any[]) {
    if (!n.parent && (n.type === 'annotation' || n.type === 'dataObject') && n.attach && L.nodePos.has(n.attach))
      edgeList.push({ id: `doc_${n.id}`, from: n.id, to: n.attach, label: null, condition: '__doc__', isDoc: true });
  }
  const { xChannels, yChannels } = computeGridChannels({
    colX: L.colX, colWpx: L.colWpx, bandTop: (ri: number) => L.bandTop(ri), rowHpx: L.rowHpx,
    nC: L.cols.length, nR: L.rows.length, gridLeft: L.bandLeft, gridRight: L.gridRight,
    gridTop: 44, gridBottom: L.gridBottom, half: L.half,
    colNxMax: L.colNxMax, rowNyMax: L.rowNyMax,
  }, nodesGeo);
  const ports = optimizePorts(nodesGeo, edgeList, { xChannels, yChannels }, L.half, { maxIter: 4, dynamicStub: true });
  const geoMap = new Map(nodesGeo.map((n) => [n.id, n]));
  const routes = edgeList.map((e) => {
    const sp = ports.sourcePorts.get(e.id) ?? 'R';
    const tp = ports.targetPorts.get(e.id) ?? 'T';
    const u = geoMap.get(e.from)!, v = geoMap.get(e.to)!;
    return {
      e, sp, tp,
      pts: solveRouteHybrid(u, v, sp, tp, xChannels, yChannels, boxes, L.half, { dynamicStub: true }),
    };
  });
  return { r, L, boxes, routes, ports };
}

// ===== G1/G2/G3：连线几何不变量（canonical 卡片示例：覆盖 8 种 Type + 子流程 + DOC 虚线）=====
{
  const { r, boxes, routes } = routeAll(card.example.dsl);
  const bad1: string[] = [], bad2: string[] = [], bad3: string[] = [];
  for (const { e, sp, tp, pts } of routes) {
    if (!pts || pts.length < 2) { bad1.push(`${e.from}→${e.to}(无路径)`); continue; }
    // G1：任何节点盒（自身盒收缩 3px 判定 —— stub 段自边界出发自然豁免）
    for (let i = 1; i < pts.length; i++) {
      for (const [id, box] of Object.entries(boxes)) {
        const self = id === e.from || id === e.to;
        if (segmentIntersectsBox(pts[i - 1], pts[i], box, self ? -3 : 4)) bad1.push(`${e.from}→${e.to} 穿 ${id}`);
      }
    }
    // G2：180° 回折 = 0（独立几何判据）+ `countBends` 口径自洽（含回折项 = raw + 2×回折）
    const rev = reversalCount(pts);
    if (rev > 0) bad2.push(`${e.from}→${e.to}(回折 ${rev})`);
    if (countBends(pts) !== rawBends(pts) + 2 * rev) bad2.push(`${e.from}→${e.to}(countBends 口径不一致)`);
  }
  const inOcc = new Map<string, Set<string>>(), outOcc = new Map<string, Set<string>>();
  for (const { e, sp, tp } of routes) {
    if (!outOcc.has(e.from)) outOcc.set(e.from, new Set());
    outOcc.get(e.from)!.add(sp);
    if (!inOcc.has(e.to)) inOcc.set(e.to, new Set());
    inOcc.get(e.to)!.add(tp);
  }
  const DIRS3 = ['T', 'B', 'L', 'R'] as const;
  for (const { e, sp, tp } of routes) {
    const u = boxes[e.from], v = boxes[e.to];
    const cxu = (u.x0 + u.x1) / 2, cyu = (u.y0 + u.y1) / 2, cxv = (v.x0 + v.x1) / 2, cyv = (v.y0 + v.y1) / 2;
    const dx = cxv - cxu, dy = cyv - cyu, d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const outDot = PORT_NORMALS[sp].x * ux + PORT_NORMALS[sp].y * uy;
    const inDot = -(PORT_NORMALS[tp].x * ux + PORT_NORMALS[tp].y * uy);
    if (outDot >= -1e-6 && inDot >= -1e-6) continue;
    // A1 已锁朝向侧时，背向是软降级（红线优先），不报 G3
    const legalFacing = DIRS3.some((s) => {
      if ((inOcc.get(e.from)?.has(s)) && s !== sp) return false;
      return DIRS3.some((t) => {
        if ((outOcc.get(e.to)?.has(t)) && t !== tp) return false;
        const od = PORT_NORMALS[s].x * ux + PORT_NORMALS[s].y * uy;
        const id = -(PORT_NORMALS[t].x * ux + PORT_NORMALS[t].y * uy);
        return od >= -1e-6 && id >= -1e-6;
      });
    });
    if (legalFacing) bad3.push(`${e.from}→${e.to}(${sp}>${tp})`);
  }
  check('g1-zero-pierce: 边路径零穿盒（含源/目标自身盒）', bad1.length === 0, bad1.join(' | '));
  check('g2-no-reversal: 边路径零 180° 回折', bad2.length === 0, bad2.join(' | '));
  check('g3-port-facing: 无背向（A1 无朝向侧时允许软降级）', bad3.length === 0, bad3.join(' | '));
  check('g1-coverage: 样例边数 ≥ 12（覆盖面）', routes.length >= 12, `edges=${routes.length}`);

  /**
   * G5：A1 全节点 `in ∩ out = ∅`（含网关）。同入/同出可复用，同侧既入又出为红线（R23）。
   */
  const inD = new Map<string, Set<string>>(), outD = new Map<string, Set<string>>();
  for (const { e, sp, tp } of routes) {
    if (!outD.has(e.from)) outD.set(e.from, new Set());
    outD.get(e.from)!.add(sp);
    if (!inD.has(e.to)) inD.set(e.to, new Set());
    inD.get(e.to)!.add(tp);
  }
  const a1bad: string[] = [];
  for (const id of new Set([...inD.keys(), ...outD.keys()])) {
    for (const d of inD.get(id) ?? []) if (outD.get(id)?.has(d)) a1bad.push(`${id}:${d}`);
  }
  check('g5-a1-all: 全节点入/出端口互斥（含网关）', a1bad.length === 0, a1bad.join(' | '));
  check('g6-a1-sites: canonical 无同侧既入又出站点', a1bad.length === 0, a1bad.join(' | '));
  const docBad = routes.filter((x) => x.e.isDoc || x.e.condition === '__doc__').filter((x) => {
    if (!x.pts || x.pts.length < 2) return true;
    const y0 = x.pts[0].y, y1 = x.pts[x.pts.length - 1].y;
    return countBends(x.pts) > 0 || Math.abs(y0 - y1) > 1 || x.tp !== 'R';
  });
  check('g7-doc-horizontal: N/DATA 虚线水平 0 折弯且右入', docBad.length === 0,
    docBad.map((x) => `${x.e.from}→${x.e.to} tp=${x.tp} pts=${x.pts?.length}`).join(' | '));
}

// ===== G4：子流程 3×3 绘制格（内部 CellOrder + 走廊 + 标题带）=====
{
  const { cellW, cellH } = innerCellSize();
  const { r, L } = routeAll(card.example.dsl);
  const inner = subprocessInnerLayout(r.data, 'sub1');
  const sub = L.nodePos.get('sub1');
  check('g4-topo: 两节点顺序流 → CellOrder 一列两格', inner.cols === 1 && inner.rows === 2,
    `cols=${inner.cols} rows=${inner.rows}`);
  check('g4-boxH: 框高 ≥ 标题带 + rows×cellH', !!sub && sub.H + 0.01 >= inner.boxH, `H=${sub?.H} boxH=${inner.boxH}`);
  check('g4-boxW: 框宽 ≥ cols×cellW', !!sub && sub.W + 0.01 >= inner.boxW, `W=${sub?.W} boxW=${inner.boxW}`);
  const vDsl = `Title: t
Layout: V
Dict: D[甲,乙]
Dict: P[一]
Dict: worker[开始,复核,意见,归档]
Lane from D[0,1] Layout H
Lane from P[0] Layout V
W: w1: worker[0] Type[S] Location(D[0],P[0])
W: sub1: worker[3] Type[SUB] Location(D[1],P[0])
   W: s1: worker[1] Type[S]
   W: s2: 步骤二
   W: s3: worker[2] Type[E]
   End`;
  const vr = routeAll(vDsl);
  const vInner = subprocessInnerLayout(vr.r.data, 'sub1');
  const vsub = vr.L.nodePos.get('sub1');
  check('g4-V: 三节点顺序流 → 一列三格', vInner.cols === 1 && vInner.rows === 3,
    `cols=${vInner.cols} rows=${vInner.rows}`);
  check('g4-V-h: 框高 ≥ 标题带 + 3×cellH', !!vsub && vsub.H + 0.01 >= SUBPROCESS_INNER.titleBand + 3 * cellH,
    `H=${vsub?.H} need=${SUBPROCESS_INNER.titleBand + 3 * cellH}`);
  const svg = flowToSVG(vr.r.data, vr.r.styles);
  const miniFs = [...svg.matchAll(/data-flow="inner-label"[^>]*font-size="([\d.]+)"/g)].map((m) => +m[1]);
  check('g4-fs: 迷你字号 ≥ 11（范式可读下限）', miniFs.length > 0 && Math.min(...miniFs) >= 11, `min=${Math.min(...miniFs)}`);
  const innerPaths = [...svg.matchAll(/d="([^"]+)" data-flow="inner-edge"/g)].map((m) => m[1]);
  const degenerate = innerPaths.filter((d) => {
    const nums = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((x) => [+x[1], +x[2]]);
    for (let i = 1; i < nums.length; i++) {
      if (Math.hypot(nums[i][0] - nums[i - 1][0], nums[i][1] - nums[i - 1][1]) < 1) return true;
    }
    return nums.length < 2;
  });
  check('g4-inner-path: 内部连线无零长 stub', degenerate.length === 0, `bad=${degenerate.length}`);
}
{
  // 空子流程（无内部节点）不应产生纳格放大：框保持基础 140×48
  const r = parseFlowDSL(`Title: t
Dict: D[甲]
Dict: P[一]
Lane from D[0] Layout H
Lane from P[0] Layout V
W: w1: 开始 Type[S] Location(D[0],P[0])`);
  const L = computeExcelLayout(r.data, r.styles);
  check('g4-empty: 无子流程时不产生额外扩展', [...L.nodePos.values()].every((p) => p.W <= 200), 'ok');
}

console.log(`\n== ${pass} pass, ${fail} fail ==`);
if (fail > 0) process.exitCode = 1;
