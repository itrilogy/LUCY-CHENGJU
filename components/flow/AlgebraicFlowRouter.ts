/**
 * 流程图几何代数连线与避障引擎 (Pure Algebraic Flow Routing Engine)
 * 基于正交流形、流形折弯势能极小化与无碰撞几何拓扑
 */

export type Port = 'T' | 'B' | 'L' | 'R';
export type Point = { x: number; y: number };
export type Box = { x0: number; y0: number; x1: number; y1: number };

/** 回边/驳回标签（中文业务词表）。未命中时仍可用几何 dx<-40 判定逆流。 */
export const BACK_EDGE_LABELS = new Set(['驳回', '不达标', '整改', '否', '不通过', '退回']);

export const PORT_NORMALS: Record<Port, Point> = {
  T: { x: 0, y: -1 },
  B: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 },
};

// 1. 点在节点边界上的几何中点
export function getPortMidpoint(pos: { x: number; y: number; W: number; H: number }, dir: Port): Point {
  const n = PORT_NORMALS[dir];
  return {
    x: pos.x + (pos.W / 2) * n.x,
    y: pos.y + (pos.H / 2) * n.y,
  };
}

// 2. 线段与矩形包围盒的代数碰撞检测（Liang-Barsky 算法）
export function segmentIntersectsBox(p1: Point, p2: Point, box: Box, padding = 4): boolean {
  const minX = box.x0 - padding, maxX = box.x1 + padding;
  const minY = box.y0 - padding, maxY = box.y1 + padding;

  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  let t0 = 0, t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [p1.x - minX, maxX - p1.x, p1.y - minY, maxY - p1.y];

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t0) t0 = r;
      } else {
        if (r < t1) t1 = r;
      }
    }
  }
  return t0 <= t1;
}

export interface NodeGeometry {
  id: string;
  ri: number;
  ci: number;
  x: number;
  y: number;
  W: number;
  H: number;
}

export interface GridDimensions {
  colX: number[];
  colWpx: number[];
  bandTop: (ri: number) => number;
  rowHpx: number[];
  nC: number;
  nR: number;
  gridLeft: number;
  gridRight: number;
  gridTop: number;
  gridBottom: number;
  half: number;
}

export function computeGridChannels(dim: GridDimensions, nodes: NodeGeometry[]): { xChannels: number[]; yChannels: number[] } {
  const xSet = new Set<number>();
  const ySet = new Set<number>();

  // 外侧四周走廊
  xSet.add(dim.gridLeft - dim.half);
  xSet.add(dim.gridRight + dim.half);
  ySet.add(dim.gridTop - dim.half);
  ySet.add(dim.gridBottom + dim.half);

  // 列间走廊
  for (let ci = 0; ci < dim.nC; ci++) {
    xSet.add(dim.colX[ci]);
    xSet.add(dim.colX[ci] + dim.colWpx[ci]);
  }

  // 行间走廊
  for (let ri = 0; ri < dim.nR; ri++) {
    ySet.add(dim.bandTop(ri));
    ySet.add(dim.bandTop(ri) + dim.rowHpx[ri]);
  }

  // 扩展格内部多节点间隙中线
  const colNodes = new Map<number, NodeGeometry[]>();
  for (const n of nodes) {
    const list = colNodes.get(n.ci) || [];
    list.push(n);
    colNodes.set(n.ci, list);
  }
  for (const [, list] of colNodes) {
    if (list.length > 1) {
      list.sort((a, b) => a.y - b.y);
      for (let i = 0; i < list.length - 1; i++) {
        ySet.add((list[i].y + list[i + 1].y) / 2);
      }
    }
  }

  return {
    xChannels: Array.from(xSet).sort((a, b) => a - b),
    yChannels: Array.from(ySet).sort((a, b) => a - b),
  };
}

export interface EdgeSpec {
  id: string;
  from: string;
  to: string;
  label?: string | null;
  condition?: string | null;
  isDoc?: boolean;
}

// 3. 计算两端口对在几何上的理论最小折弯数 (Theoretical Minimal Bends)
export function getTheoreticalBends(u: NodeGeometry, v: NodeGeometry, sp: Port, tp: Port): number {
  const p0 = getPortMidpoint(u, sp);
  const pk = getPortMidpoint(v, tp);
  const n0 = PORT_NORMALS[sp];
  const nk = PORT_NORMALS[tp];

  const horiz0 = (sp === 'L' || sp === 'R');
  const horizk = (tp === 'L' || tp === 'R');

  // 0 弯条件：同轴且法向对冲
  if (horiz0 && horizk && Math.abs(p0.y - pk.y) < 1 && (pk.x - p0.x) * n0.x > 0 && n0.x === -nk.x) {
    return 0;
  }
  if (!horiz0 && !horizk && Math.abs(p0.x - pk.x) < 1 && (pk.y - p0.y) * n0.y > 0 && n0.y === -nk.y) {
    return 0;
  }

  // 1 弯 L 型条件：垂直出发水平进入 或 水平出发垂直进入
  if (horiz0 !== horizk) {
    if (horiz0) {
      if ((pk.x - p0.x) * n0.x > 0 && (pk.y - p0.y) * nk.y < 0) return 1;
    } else {
      if ((pk.y - p0.y) * n0.y > 0 && (pk.x - p0.x) * nk.x < 0) return 1;
    }
  }

  // 2 弯 Z 型条件：同向或对向但在不同轴上
  return 2;
}

// 4. 全局代数端口分配器（Manifold Potential Minimization under WSAD Exclusivity）
export function solveAlgebraicPorts(
  nodes: NodeGeometry[],
  edges: EdgeSpec[]
): { sourcePorts: Map<string, Port>; targetPorts: Map<string, Port> } {
  const nodeMap = new Map<string, NodeGeometry>(nodes.map((n) => [n.id, n]));
  const boxes: Record<string, Box> = {};
  for (const n of nodes) {
    boxes[n.id] = { x0: n.x - n.W / 2, y0: n.y - n.H / 2, x1: n.x + n.W / 2, y1: n.y + n.H / 2 };
  }

  const nodeInDirs = new Map<string, Set<Port>>();
  const nodeOutDirs = new Map<string, Set<Port>>();
  for (const n of nodes) {
    nodeInDirs.set(n.id, new Set());
    nodeOutDirs.set(n.id, new Set());
  }

  const sourcePorts = new Map<string, Port>();
  const targetPorts = new Map<string, Port>();

  function isPortBlocked(nodeId: string, dir: Port): boolean {
    const n = nodeMap.get(nodeId);
    if (!n) return false;
    const p0 = getPortMidpoint(n, dir);
    const normal = PORT_NORMALS[dir];
    const p1 = { x: p0.x + normal.x * 60, y: p0.y + normal.y * 60 };
    for (const [id, bx] of Object.entries(boxes)) {
      if (id === nodeId) continue;
      if (segmentIntersectsBox(p0, p1, bx, 2)) return true;
    }
    return false;
  }

  // 边全序优先级：
  // 1. 纯同轴相邻正向流 (w1->w2, w2->q1, w5->q2, w6->w7) -> Priority 0 (绝对优先，0 弯直连直通锁定)
  // 2. 正向邻近推进流 (q1->w3, w3->w4, w4->w5, q3->w8) -> Priority 10~50
  // 3. 回退流 / 驳回流 / 逆向流 (q1->w1, q2->w3, q3->w6) -> Priority 200+ (后置规划，严禁抢占主干直通端口)
  // 4. 文档依附虚线 (n1->w3) -> Priority 1000
  function getEdgePriority(e: EdgeSpec): number {
    if (e.isDoc || e.condition === '__doc__') return 1000;
    const u = nodeMap.get(e.from), v = nodeMap.get(e.to);
    if (!u || !v) return 9999;

    const dx = v.x - u.x, dy = v.y - u.y;
    // 显式回退流：否定词表（可扩展）或大幅度向左逆流
    const isExplicitBack = !!(e.label && BACK_EDGE_LABELS.has(e.label));
    const isPhysicalBack = isExplicitBack || (dx < -40);
    
    // 纯同轴正向直连 (如同列垂直向上/向下直通，或同行水平直通)
    const isCoaxialForward = (!isPhysicalBack && Math.abs(dx) < 1 && Math.abs(dy) > 10) || (!isPhysicalBack && Math.abs(dy) < 1 && dx > 10);

    const dist = Math.abs(u.ri - v.ri) + Math.abs(u.ci - v.ci);
    if (isCoaxialForward) return 0;
    if (isPhysicalBack) return 200 + dist * 10;
    return 10 + dist * 5;
  }

  const sortedEdges = [...edges].sort((a, b) => getEdgePriority(a) - getEdgePriority(b));
  const allDirs: Port[] = ['T', 'B', 'L', 'R'];

  for (const e of sortedEdges) {
    const u = nodeMap.get(e.from), v = nodeMap.get(e.to);
    if (!u || !v) continue;
    const uOut = nodeOutDirs.get(e.from)!, uIn = nodeInDirs.get(e.from)!;
    const vOut = nodeOutDirs.get(e.to)!, vIn = nodeInDirs.get(e.to)!;

    if (e.isDoc || e.condition === '__doc__') {
      uOut.add('L');
      sourcePorts.set(e.id, 'L');
      const tp: Port = !vOut.has('R') ? 'R' : (!vOut.has('B') ? 'B' : 'T');
      vIn.add(tp);
      targetPorts.set(e.id, tp);
      continue;
    }

    // 寻找能量 E(sp, tp) 最小的端口对
    // E(sp, tp) = 100 * Bends + 50 * Blocked - 10 * Affinity
    let bestScore = Infinity;
    let bestPair: [Port, Port] = ['R', 'L'];

    for (const sp of allDirs) {
      if (uIn.has(sp)) continue; // 严禁占用源节点的入端口 (WSAD 互斥)
      for (const tp of allDirs) {
        if (vOut.has(tp)) continue; // 严禁占用目标节点的出端口 (WSAD 互斥)

        const bends = getTheoreticalBends(u, v, sp, tp);
        const blockSp = isPortBlocked(u.id, sp) ? 50 : 0;
        const blockTp = isPortBlocked(v.id, tp) ? 50 : 0;
        const reuseOut = uOut.has(sp) ? 20 : 0;
        const reuseIn = vIn.has(tp) ? 0 : 5; // 入端口复用优先

        // 代数方向对齐势能：发射法向与位移向量同向、接收法向与位移向量对冲
        const delta = { x: v.x - u.x, y: v.y - u.y };
        const dist = Math.hypot(delta.x, delta.y) || 1;
        const dx = delta.x / dist, dy = delta.y / dist;
        const n0 = PORT_NORMALS[sp], nk = PORT_NORMALS[tp];
        const alignOut = n0.x * dx + n0.y * dy; // >0 为顺向
        const alignIn = -nk.x * dx - nk.y * dy; // >0 为顺向迎入
        const alignment = alignOut + alignIn;

        const score = bends * 100 + blockSp + blockTp + reuseOut + reuseIn - alignment * 35;
        if (score < bestScore) {
          bestScore = score;
          bestPair = [sp, tp];
        }
      }
    }

    const [sp, tp] = bestPair;
    uOut.add(sp);
    vIn.add(tp);
    sourcePorts.set(e.id, sp);
    targetPorts.set(e.id, tp);
  }

  return { sourcePorts, targetPorts };
}

// 5. 正交折线清洗函数
export function cleanOrthogonalPath(pts: Point[]): Point[] {
  if (pts.length <= 1) return pts;
  const clean: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = clean[clean.length - 1], b = pts[i];
    if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5) continue;
    const prev = clean[clean.length - 2];
    if (prev) {
      const v1x = a.x - prev.x, v1y = a.y - prev.y;
      const v2x = b.x - a.x, v2y = b.y - a.y;
      const cross = v1x * v2y - v1y * v2x;
      const dot = v1x * v2x + v1y * v2y;
      if (Math.abs(cross) < 0.5 && dot >= 0) {
        clean[clean.length - 1] = b;
        continue;
      }
    }
    clean.push(b);
  }
  return clean;
}

// 6. 代数正交路径求解器（Orthogonal Potential Minimization Routing）
export function solveAlgebraicRoute(
  fromNode: NodeGeometry,
  toNode: NodeGeometry,
  sp: Port,
  tp: Port,
  xChannels: number[],
  yChannels: number[],
  allBoxes: Record<string, Box>,
  half: number
): Point[] {
  const p0 = getPortMidpoint(fromNode, sp);
  const pk = getPortMidpoint(toNode, tp);
  const n0 = PORT_NORMALS[sp];
  const nk = PORT_NORMALS[tp];

  const s1: Point = { x: p0.x + n0.x * half, y: p0.y + n0.y * half };
  const t1: Point = { x: pk.x + nk.x * half, y: pk.y + nk.y * half };

  const horiz0 = (sp === 'L' || sp === 'R');
  const horizk = (tp === 'L' || tp === 'R');

  function hitsObstacle(path: Point[]): boolean {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      for (const [id, box] of Object.entries(allBoxes)) {
        if (id === fromNode.id || id === toNode.id) continue;
        if (segmentIntersectsBox(a, b, box, 4)) return true;
      }
    }
    return false;
  }

  function computeCost(path: Point[]): number {
    let bends = 0, len = 0;
    for (let i = 1; i < path.length; i++) {
      len += Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y);
      if (i >= 2) {
        const d1x = path[i - 1].x - path[i - 2].x, d1y = path[i - 1].y - path[i - 2].y;
        const d2x = path[i].x - path[i - 1].x, d2y = path[i].y - path[i - 1].y;
        if ((d1x !== 0 && d2y !== 0) || (d1y !== 0 && d2x !== 0)) bends++;
        // AUD-083/107：折弯判据必须含方向符号 —— 180° 反向回折 ≈ 两次转弯
        // （原判据仅按轴向，会漏计回折，致「绕外侧再折回」的畸形路径代价被低估而胜出）
        else if (d1x * d2x + d1y * d2y < 0) bends += 2;
      }
    }
    return bends * 100 + len * 0.01;
  }

  // 1. 直连 (0 弯直接连通，理论最优，无碰撞立即返回)
  if (horiz0 && horizk && Math.abs(p0.y - pk.y) < 1 && (pk.x - p0.x) * n0.x > 0) {
    const p = cleanOrthogonalPath([p0, pk]);
    if (!hitsObstacle(p)) return p;
  } else if (!horiz0 && !horizk && Math.abs(p0.x - pk.x) < 1 && (pk.y - p0.y) * n0.y > 0) {
    const p = cleanOrthogonalPath([p0, pk]);
    if (!hitsObstacle(p)) return p;
  }

  // 2. L 型直角折线 (1 弯直接连通，无碰撞立即返回)
  if (horiz0 !== horizk) {
    if (horiz0) {
      if ((pk.x - p0.x) * n0.x > 0 && (pk.y - p0.y) * nk.y < 0) {
        const p = cleanOrthogonalPath([p0, { x: pk.x, y: p0.y }, pk]);
        if (!hitsObstacle(p)) return p;
      }
    } else {
      if ((pk.y - p0.y) * n0.y > 0 && (pk.x - p0.x) * nk.x < 0) {
        const p = cleanOrthogonalPath([p0, { x: p0.x, y: pk.y }, pk]);
        if (!hitsObstacle(p)) return p;
      }
    }
  }

  // 3. 正交通道 Z 型 (2 弯)
  const validPaths: { pts: Point[]; cost: number }[] = [];
  const minX = Math.min(s1.x, t1.x) - half * 2, maxX = Math.max(s1.x, t1.x) + half * 2;
  const minY = Math.min(s1.y, t1.y) - half * 2, maxY = Math.max(s1.y, t1.y) + half * 2;
  const localX = xChannels.filter((x) => x >= minX && x <= maxX);
  const localY = yChannels.filter((y) => y >= minY && y <= maxY);

  const searchX = localX.length > 0 ? localX : xChannels;
  const searchY = localY.length > 0 ? localY : yChannels;

  if (horiz0 && horizk) {
    for (const xm of searchX) {
      const p = cleanOrthogonalPath([p0, s1, { x: xm, y: s1.y }, { x: xm, y: t1.y }, t1, pk]);
      if (!hitsObstacle(p)) validPaths.push({ pts: p, cost: computeCost(p) });
    }
  } else if (!horiz0 && !horizk) {
    for (const ym of searchY) {
      const p = cleanOrthogonalPath([p0, s1, { x: s1.x, y: ym }, { x: t1.x, y: ym }, t1, pk]);
      if (!hitsObstacle(p)) validPaths.push({ pts: p, cost: computeCost(p) });
    }
  } else {
    for (const xm of searchX) {
      const p = cleanOrthogonalPath([p0, s1, { x: xm, y: s1.y }, { x: xm, y: t1.y }, t1, pk]);
      if (!hitsObstacle(p)) validPaths.push({ pts: p, cost: computeCost(p) });
    }
    for (const ym of searchY) {
      const p = cleanOrthogonalPath([p0, s1, { x: s1.x, y: ym }, { x: t1.x, y: ym }, t1, pk]);
      if (!hitsObstacle(p)) validPaths.push({ pts: p, cost: computeCost(p) });
    }
  }

  // 4. 多折弯通道回绕 (3~4 弯，先局部后全图)
  if (validPaths.length === 0) {
    for (const xm of xChannels) {
      for (const ym of yChannels) {
        const raw1 = [p0, s1, { x: xm, y: s1.y }, { x: xm, y: ym }, { x: t1.x, y: ym }, t1, pk];
        const p1 = cleanOrthogonalPath(raw1);
        if (!hitsObstacle(p1)) validPaths.push({ pts: p1, cost: computeCost(p1) });

        const raw2 = [p0, s1, { x: s1.x, y: ym }, { x: xm, y: ym }, { x: xm, y: t1.y }, t1, pk];
        const p2 = cleanOrthogonalPath(raw2);
        if (!hitsObstacle(p2)) validPaths.push({ pts: p2, cost: computeCost(p2) });
      }
    }
  }

  // 5. 跨多列逆向大回边（>=2 列）：优先走图外部走廊回路
  const isGlobalOuterBackEdge = (fromNode.ci - toNode.ci >= 2);
  const minGridX = Math.min(...xChannels), maxGridX = Math.max(...xChannels);
  const minGridY = Math.min(...yChannels), maxGridY = Math.max(...yChannels);
  const outerX0 = minGridX - half, outerX1 = maxGridX + half;
  const outerY0 = minGridY - half, outerY1 = maxGridY + half;

  const outerOps = [
    [p0, s1, { x: s1.x, y: outerY1 }, { x: t1.x, y: outerY1 }, t1, pk],
    [p0, s1, { x: s1.x, y: outerY0 }, { x: t1.x, y: outerY0 }, t1, pk],
    [p0, s1, { x: outerX0, y: s1.y }, { x: outerX0, y: t1.y }, t1, pk],
    [p0, s1, { x: outerX1, y: s1.y }, { x: outerX1, y: t1.y }, t1, pk],
    [p0, s1, { x: outerX0, y: s1.y }, { x: outerX0, y: outerY0 }, { x: t1.x, y: outerY0 }, t1, pk],
    [p0, s1, { x: s1.x, y: outerY1 }, { x: outerX0, y: outerY1 }, { x: outerX0, y: t1.y }, t1, pk],
  ];

  const outerCandidates: { pts: Point[]; cost: number }[] = [];
  for (const raw of outerOps) {
    const p = cleanOrthogonalPath(raw);
    if (!hitsObstacle(p)) {
      const c = isGlobalOuterBackEdge ? computeCost(p) - 500 : computeCost(p) + 200;
      outerCandidates.push({ pts: p, cost: c });
    }
  }

  if (isGlobalOuterBackEdge && outerCandidates.length > 0) {
    outerCandidates.sort((a, b) => a.cost - b.cost);
    return outerCandidates[0].pts;
  }

  const all = [...validPaths, ...outerCandidates];
  if (all.length > 0) {
    all.sort((a, b) => a.cost - b.cost);
    return all[0].pts;
  }

  // A4：无碰撞通道时的 L 兜底若穿盒，改走代价最低的外侧走廊（允许外侧未过 hits 过滤的候选）
  const fallback = cleanOrthogonalPath(horiz0 ? [p0, { x: pk.x, y: p0.y }, pk] : [p0, { x: p0.x, y: pk.y }, pk]);
  if (!hitsObstacle(fallback)) return fallback;
  const outerAny: { pts: Point[]; cost: number }[] = [];
  for (const raw of outerOps) {
    const p = cleanOrthogonalPath(raw);
    outerAny.push({ pts: p, cost: computeCost(p) + (hitsObstacle(p) ? 5000 : 0) });
  }
  if (outerAny.length > 0) {
    outerAny.sort((a, b) => a.cost - b.cost);
    return outerAny[0].pts;
  }
  return fallback;
}
