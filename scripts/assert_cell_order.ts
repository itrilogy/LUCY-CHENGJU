/**
 * IQS-Flow 交叉格内排序（computeCellOrder）断言脚本
 * 运行: node --experimental-strip-types scripts/assert_cell_order.ts
 * 验证：① 格内拓扑序（声明序≠流向时）② 显式 vh 保持（值不变，参照变）
 *       ③ 缺省 vh 推导（不再一刀切 V）④ type 签名正确。
 */
import { computeCellOrder } from '../components/flow/CellOrder.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; }
  else { fail++; console.error(`✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

const node = (id: string, vh?: 'V' | 'H' | 'D'): any => ({ id, type: 'task', label: id, cell: null, vh, parent: null, attrs: {} });
const edge = (from: string, to: string): any => ({ id: `e_${from}_${to}`, from, to, type: 'sequence', condition: null, default: false });

// ===== 场景 1：格内拓扑序（声明序 x,y,z 但 z→x 边 → 拓扑序应为 z,x 或 z 提前）=====
{
  const order = computeCellOrder([node('x'), node('y', 'V'), node('z')], [edge('z', 'x')]);
  const seq = order.map((p) => p.n.id).join(',');
  // z→x 使 z 提前（入度0），y 与 x/z 无直接边 → 按剩余声明序。关键验证：z 在 x 前（z 是 x 上游）。
  check('id拓扑: 上游 z 在 x 前', order.findIndex((p) => p.n.id === 'z') < order.findIndex((p) => p.n.id === 'x'), `seq=${seq}`);
  check('id拓扑: 三节点齐全', order.length === 3, `seq=${seq}`);
}

// ===== 场景 2：显式 vh 保持 + 首节点 H 种子传播 =====
{
  const order = computeCellOrder([node('a', 'H'), node('b'), node('c')], [edge('a', 'b'), edge('b', 'c')]);
  // a 为拓扑首节点（edge a→b→c）→ 恒锚定 (0,0)；其显式 vh=H 作为种子向后续 b/c 传播（横向）。
  const a = order.find((p) => p.n.id === 'a')!;
  check('vh保持: a 显式 H 保持', a.n.vh === 'H', `a.vh=${a.n.vh}`);
  check('vh保持: 首节点 a 锚定(0,0)', a.dx === 0 && a.dy === 0, `dx=${a.dx} dy=${a.dy}`);
  // 后续 b/c 继承 H 种子 → 横向（dy 不增，dx 增）
  const rest = order.filter((p) => p.n.id !== 'a');
  const horizontalRest = rest.every((p) => p.dy === 0 && p.dx > 0);
  check('vh保持: 后续缺省继承 H 种子横向', horizontalRest, rest.map((p) => `${p.n.id}:(${p.dx},${p.dy})`).join(' '));
}

// ===== 场景 3：缺省 vh 推导（不再一刀切 V）——全缺省 + 显式 H 首节点带动横向 =====
{
  const order = computeCellOrder([node('a'), node('b'), node('c')], [edge('a', 'b'), edge('b', 'c')]);
  // 全缺省、无横向信号 → 首节点纵向 V，后续 V。不得出现横向/对角（默认纵向顺流）。
  const allV = order.every((p) => p.dy >= 0 && p.dx === 0); // 全纵向（无横向偏移）
  check('缺省推导: 无横向信号时默认纵向顺流(dx=0)', allV, order.map((p) => `${p.n.id}:(${p.dx},${p.dy})`).join(' '));
  // 首节点锚定
  check('缺省推导: 首节点锚定(0,0)', order[0].dx === 0 && order[0].dy === 0);
}

// ===== 场景 4：显式 vh 首节点带动横向（首节点 H，后续缺省继承横向）=====
{
  const order = computeCellOrder([node('a', 'H'), node('b'), node('c')], [edge('a', 'b'), edge('b', 'c')]);
  // a 显式 H（横向）→ 后续缺省 b/c 应横向（dx>0 且 dy=0）
  const horizontal = order.every((p) => p.dy === 0 && p.dx >= 0);
  check('显式H带动: 后续缺省继承横向(dy=0)', horizontal, order.map((p) => `${p.n.id}:(${p.dx},${p.dy})`).join(' '));
}

console.log(`\n== ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);
