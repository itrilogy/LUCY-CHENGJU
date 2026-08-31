/**
 * IQS-Flow DSL 解析断言脚本 (Node 22+ strip-types)
 * 运行: node --experimental-strip-types scripts/assert_flow_parser.ts
 * 独立验证 FlowParser 对多种 DSL 输入的解析正确性。
 */
import { parseFlowDSL } from '../components/flow/FlowParser.ts';

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

// ===== 1. 完整采购审批（spec §8.1） =====
const fullDsl = `Title: 采购申请审批流程
Layout: H
Dict: D[信息中心,综合计划科,办公室]
Dict: P[申请阶段,审批阶段,执行阶段,归档阶段]
Dict: R[申请员,部门经理,财务岗]
Dict: worker[提交采购申请,填写申请单,金额超过5000?,部门经理审批,直接执行,财务付款,归档,退回修改]
Lane from D[0,1,2] Layout H
Lane from P[0,1,2,3] Layout V
AxisX: 职能部门 Align C
AxisY: 推进阶段 Align C
Axis: 采购申请审批流程 AxisX
Attr active [Role,SOP,Lv,Time]
W: w1: worker[0] Type[S] Location(D[0],P[0])
W: w2: worker[1] Location(D[0],P[0]) SOP(XX-CX-04) Role(R[0]) Lv(重要)
W: q1: worker[2] Type[?] Location(D[0],P[1])
   是 → #w4
   否 → #w5
   End
W: w4: worker[3] Location(D[1],P[1]) Role(R[1]) Time(24h)
W: q2: 审批是否通过? Type[?] Location(D[1],P[1])
   通过 → #w6
   驳回 → #w2
   End
W: w5: worker[4] Location(D[0],P[2])
W: w6: worker[5] Location(D[2],P[2]) Role(R[2]) KPI(≤1‰)
W: w7: worker[6] Type[E] Location(D[1],P[3])
w5 → #w6
w6 → #w7`;

{
  const r = parseFlowDSL(fullDsl);
  check('full: 无 error', r.errors.length === 0, JSON.stringify(r.errors));
  check('full: title', r.data.title === '采购申请审批流程');
  check('full: dicts D 3 项', r.data.dicts.D?.length === 3);
  check('full: dicts worker 8 项', r.data.dicts.worker?.length === 8);
  check('full: lanes 2', r.data.lanes.length === 2);
  check('full: axes.x.title', r.data.axes.x.title === '职能部门');
  check('full: axes.page.place', r.data.axes.page.place === 'AxisX');
  check('full: attrPanel active', JSON.stringify(r.data.attrPanel?.active) === JSON.stringify(['role','sop','lv','time']));
  check('full: 节点数 8', r.data.nodes.length === 8, `实际 ${r.data.nodes.length}`);
  check('full: w1 类型 start', r.data.nodes.find(n => n.id === 'w1')?.type === 'start');
  check('full: w7 类型 end', r.data.nodes.find(n => n.id === 'w7')?.type === 'end');
  check('full: q1 类型 exclusiveGateway', r.data.nodes.find(n => n.id === 'q1')?.type === 'exclusiveGateway');
  check('full: w2 标签字典展开', r.data.nodes.find(n => n.id === 'w2')?.label === '填写申请单');
  check('full: w2 attrs.sop', r.data.nodes.find(n => n.id === 'w2')?.attrs?.sop === 'XX-CX-04');
  check('full: w2 attrs.role', r.data.nodes.find(n => n.id === 'w2')?.attrs?.role === 'R[0]');
  check('full: w4 attrs.time', r.data.nodes.find(n => n.id === 'w4')?.attrs?.time === '24h');
  check('full: w2 cell.D=0 P=0', JSON.stringify(r.data.nodes.find(n => n.id === 'w2')?.cell) === JSON.stringify({D:0,P:0}));
  const gateways = r.data.nodes.filter(n => n.type === 'exclusiveGateway');
  check('full: 网关 2 个', gateways.length === 2);
  const gwOut = r.data.edges.filter(e => e.from === 'q1').length;
  check('full: q1 分支出度 2', gwOut === 2, `实际 ${gwOut}`);
  const evIdx = (f: string, t: string) => r.data.edges.some(e => e.from === f && e.to === t);
  check('full: 是→w4', evIdx('q1','w4'));
  check('full: 否→w5', evIdx('q1','w5'));
  check('full: 通过→w6', evIdx('q2','w6'));
  check('full: 驳回→w2', evIdx('q2','w2'));
  check('full: 显式 w5→w6', evIdx('w5','w6'));
  check('full: 显式 w6→w7', evIdx('w6','w7'));
}

// ===== 2. 质检：单维纵泳道 + 子流程 + 多出口 =====
{
  const d = parseFlowDSL(`Title: 来料检验与处置
Layout: V
Dict: D[质检科,采购科,生产车间]
Dict: R[检验员,采购员,车间主任]
Dict: worker[来料检验,检验结果?,合格入库,退货处理,让步接收,不合格评审,复检,可接收?,记录归档]
Lane from D[0,1,2] Layout V
W: w1: worker[0] Location(D[0]) Role(R[0])
W: q1: worker[1] Type[?] Location(D[0])
   合格 (pass) → #w2
   不合格 → #q2
   否则 → #w2
   End
W: w2: worker[2] Type[E] Location(D[1])
W: q2: worker[5] Type[SUB] Location(D[0])
   W: s1: worker[6] Type[S]
   W: s2: worker[7] Type[?]
      可接收 → #s3
      不可接收 → #s4
      End
   W: s3: worker[3]
   W: s4: worker[8] Type[E]
   End
W: w3: worker[8] Type[E] Location(D[2])
q2 → #w3`);
  check('pd: 无 error', d.errors.length === 0, JSON.stringify(d.errors));
  check('pd: 子流程存在', d.data.subProcesses.length === 1);
  check('pd: SUB id=q2', d.data.subProcesses[0]?.id === 'q2');
  check('pd: subprocess 内部节点', d.data.subProcesses[0]?.nodes?.length >= 3, JSON.stringify(d.data.subProcesses[0]?.nodes));
  check('pd: w2 类型 end', d.data.nodes.find(n => n.id === 'w2')?.type === 'end');
  check('pd: pass 出口存在', d.data.edges.some(e => e.id === 'pass' && e.label === '合格'));
  const subInner = d.data.nodes.filter(n => n.parent === 'q2');
  check('pd: 子流程内部节点带 parent', subInner.length >= 3, `parent=q2 数 ${subInner.length}`);
  check('pd: s1 类型 start', d.data.nodes.find(n => n.id === 's1')?.type === 'start');
}

// ===== 3. 仅单维泳道 + 双维坐标自动清洗 =====
{
  const d = parseFlowDSL(`Title: 清洗测试
Dict: D[甲,乙]
Dict: P[一,二]
Lane from D[0,1] Layout H
W: w1: 开始 Type[S] Location(D[0],P[0])
W: w2: 结束 Type[E] Location(D[0],P[1])`);
  check('clean: 无 error(维度清洗为warn?)', d.errors.length === 0, JSON.stringify(d.errors));
  const hasCleanWarn = d.warnings.some(w => w.includes('清洗'));
  check('clean: 存在维度清洗 warn', hasCleanWarn, JSON.stringify(d.warnings));
  const w1cell = d.data.nodes.find(n => n.id === 'w1')?.cell;
  check('clean: w1 坐标已清洗(仅留 D)', w1cell && !('P' in w1cell) && 'D' in w1cell, JSON.stringify(w1cell));
}

// ===== 4. 字典引用越界校验 =====
{
  const d = parseFlowDSL(`Title: 越界
Dict: D[甲]
W: w1: 开始 Type[S]
W: w2: 结束 Type[E] Location(D[1])`);
  const hasErr = d.errors.some(e => e.includes('越界') || e.includes('未定义'));
  check('oob: 越界/缺失报错', hasErr, JSON.stringify(d.errors));
}

// ===== 5. 无泳道（纯流程图） =====
{
  const d = parseFlowDSL(`Title: 无泳道
W: w1: 开始 Type[S]
W: w2: 处理
W: w3: 结束 Type[E]`);
  check('nolane: 无 error', d.errors.length === 0, JSON.stringify(d.errors));
  check('nolane: 3 节点', d.data.nodes.length === 3);
  check('nolane: 默认顺序流 w1→w2→w3',
    d.data.edges.some(e => e.from === 'w1' && e.to === 'w2') &&
    d.data.edges.some(e => e.from === 'w2' && e.to === 'w3'));
}

// ===== 6. P2 校验补全：字典重复 / Attr非法键 / Role越界 / 否则重复 / 分支目标为修饰类 / 孤岛error =====
{
  // #17 Attr active 非法键
  const a = parseFlowDSL(`Title: t
Attr active [Foo,Role]
W: w1: 开始 Type[S]
W: w2: 结束 Type[E]`);
  check('p2-attr: 非法键 Foo 报错', a.errors.some(e => e.includes('非法键')), JSON.stringify(a.errors));

  // #1 自定义字典重复
  const b = parseFlowDSL(`Title: t
Dict: foo[a]
Dict: foo[b]
W: w1: 开始 Type[S]
W: w2: 结束 Type[E]`);
  check('p2-dict: 自定义字典重复报错', b.errors.some(e => e.includes('foo') && e.includes('重复')), JSON.stringify(b.errors));

  // #18 Role(R[k]) 越界
  const c = parseFlowDSL(`Title: t
Dict: R[申请员]
W: w1: 开始 Type[S]
W: w2: 处理 Role(R[5])
W: w3: 结束 Type[E]`);
  check('p2-role: Role(R[5]) 越界报错', c.errors.some(e => e.includes('Role') && e.includes('越界')), JSON.stringify(c.errors));

  // #6 默认出口「否则」每节点至多一条
  const dd = parseFlowDSL(`Title: t
W: w1: 开始 Type[S]
W: q1: 判断 Type[?]
   否则 → #w2
   否则 → #w3
   End
W: w2: 结束 Type[E]
W: w3: 处理`);
  check('p2-default: 否则重复报错', dd.errors.some(e => e.includes('默认出口')), JSON.stringify(dd.errors));

  // #7 分支目标为修饰类（标注 N）报错
  const ee = parseFlowDSL(`Title: t
W: w1: 开始 Type[S]
W: q1: 判断 Type[?]
   X → #n1
   End
W: n1: 备注 Type[N]`);
  check('p2-modifier: 分支目标为 N 报错', ee.errors.some(e => e.includes('修饰类')), JSON.stringify(ee.errors));

  // #9 孤立节点升级 error
  const f = parseFlowDSL(`Title: t
W: w1: 开始 Type[S]
W: w2: 处理
W: w3: 结束 Type[E]
W: w4: 孤岛任务`);
  const hasIsolated = f.errors.some(e => e.includes('孤立'));
  check('p2-isolated: 孤岛升级为 error', hasIsolated, JSON.stringify(f.errors));
}

// ===== 遗留规划 M3（R3+R6）：N/DATA attach 依附模型 + 子流程深度 =====
{
  // R3a: N/DATA 带 Attach → attach 字段 + artifacts 填充
  const a = parseFlowDSL(`Title: t
W: w1: 开始 Type[S]
W: w2: 处理
W: n1: 备注 Type[N] Attach(#w2)
W: d1: 单据 Type[DATA] Attach(w2)
W: w3: 结束 Type[E]`);
  const n1 = a.data.nodes.find((x) => x.id === 'n1');
  const d1 = a.data.nodes.find((x) => x.id === 'd1');
  check('m3-attach: 解析 Attach 字段', n1?.attach === 'w2' && d1?.attach === 'w2', `${n1?.attach}/${d1?.attach}`);
  check('m3-attach: label 不含 Attach 残留', n1?.label === '备注' && d1?.label === '单据', `${n1?.label}/${d1?.label}`);
  check('m3-attach: N/DATA 填充 artifacts', a.data.artifacts.length === 2 && a.data.artifacts.every((x) => x.attach === 'w2'), JSON.stringify(a.data.artifacts));

  // R3b: Attach 目标不存在 → error
  const b = parseFlowDSL(`Title: t
W: w1: 开始 Type[S]
W: n1: 备注 Type[N] Attach(#不存在)
W: w2: 结束 Type[E]`);
  check('m3-attach: 目标不存在报错', b.errors.some((e) => e.includes('不存在')), b.errors.join());

  // R3c: 目标是另一修饰 → error
  const c = parseFlowDSL(`Title: t
W: w1: 开始 Type[S]
W: n1: 备注 Type[N]
W: d1: 单据 Type[DATA] Attach(#n1)
W: w2: 结束 Type[E]`);
  check('m3-attach: 目标为修饰类报错', c.errors.some((e) => e.includes('另一修饰')), c.errors.join());

  // R3d: 非修饰节点 Attach → error
  const dd = parseFlowDSL(`Title: t
W: w1: 开始 Type[S]
W: w2: 处理 Attach(#w1)
W: w3: 结束 Type[E]`);
  check('m3-attach: 非修饰节点 Attach 报错', dd.errors.some((e) => e.includes('不应用')), dd.errors.join());

  // R6: 子流程嵌套深度 >1 → error
  const ee = parseFlowDSL(`Title: t
W: w1: 开始 Type[S]
W: s1: 外层 Type[SUB]
   W: s2: 内层 Type[SUB]
   End
W: w2: 结束 Type[E]`);
  check('m3-r6: 子流程深度>1 报错', ee.errors.some((e) => e.includes('嵌套深度')), ee.errors.join());
}

console.log(`\n== ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);
