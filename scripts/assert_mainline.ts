/**
 * IQS-Flow 主干序（Mainline Order）断言脚本
 * 运行: node --experimental-strip-types scripts/assert_mainline.ts
 * 验证 computeMainlineOrder 的链序 / default 优先 / 环去环 / parent 过滤。
 */
import { computeMainlineOrder } from '../components/flow/MainlineOrder.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

// 便捷构造（单测用宽松 any，主函数签名约束真实类型）
const node = (id: string, type = 'task', parent: string | null = null): any => ({ id, type, label: id, cell: null, vh: undefined, parent, attrs: {} });
const edge = (from: string, to: string, def = false): any => ({ id: `e_${from}_${to}`, from, to, type: 'sequence', condition: null, default: def });

// 1. 直线链：主干序 = 声明流方向
{
  const order = computeMainlineOrder(
    [node('s', 'start'), node('a'), node('b'), node('e', 'end')],
    [edge('s', 'a'), edge('a', 'b'), edge('b', 'e')],
  );
  check('chain: 首为 start', order[0] === 's', order.join(','));
  check('chain: 尾为 end', order[order.length - 1] === 'e', order.join(','));
  check('chain: 全序正确', order.join(',') === 's,a,b,e', order.join(','));
}

// 2. default 优先分支：default 出口所在支路先于非 default 支路
{
  const order = computeMainlineOrder(
    [node('s', 'start'), node('q'), node('a'), node('b'), node('e', 'end')],
    [edge('s', 'q'), edge('q', 'a', true), edge('q', 'b'), edge('a', 'e'), edge('b', 'e')],
  );
  const ia = order.indexOf('a'), ib = order.indexOf('b');
  check('default: a 在 b 前（default 优先）', ia >= 0 && ib >= 0 && ia < ib, `order=${order.join(',')}`);
}

// 3. 环去环不卡死（回边 b→a）：不丢节点、首 start 尾 end
{
  const order = computeMainlineOrder(
    [node('s', 'start'), node('a'), node('b'), node('e', 'end')],
    [edge('s', 'a'), edge('a', 'b'), edge('b', 'a'), edge('b', 'e')],
  );
  check('cycle: 4 节点不丢', order.length === 4 && new Set(order).size === 4, order.join(','));
  check('cycle: 首 start 尾 end（不卡死）', order[0] === 's' && order[order.length - 1] === 'e', order.join(','));
}

// 4. parent 过滤：子流程内部节点不参与顶层主干序
{
  const order = computeMainlineOrder(
    [node('s', 'start'), node('a'), node('sub'), node('x', 'task', 'sub'), node('e', 'end')],
    [edge('s', 'a'), edge('a', 'sub'), edge('sub', 'e')],
  );
  check('parent: 内部节点 x 不参与', order.indexOf('x') < 0, order.join(','));
  check('parent: 顶层节点都在', ['s', 'a', 'sub', 'e'].every((id) => order.includes(id)), order.join(','));
}

console.log(`\n== ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);
