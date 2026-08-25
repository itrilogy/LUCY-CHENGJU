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

console.log(`\n== ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);
