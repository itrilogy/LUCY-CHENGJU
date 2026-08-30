import { parseFlowDSL } from '../components/flow/FlowParser.ts';
import { flowToSVG, getSvgSize, computeExcelLayout } from '../components/flow/flowToSVG.ts';

function section(t: string) { console.log('\n==== ' + t + ' ===='); }

const full = `Title: 采购申请审批流程
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

const r = parseFlowDSL(full);
const svg = flowToSVG(r.data, r.styles);
const size = getSvgSize(r.data, r.styles);
const m = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
section('AttrPanel vs getSvgSize');
console.log('getSvgSize', size);
console.log('svg attr', m && { w: m[1], h: m[2] });
console.log('has 属性图例', svg.includes('属性图例'));
console.log('panel values', { hasR0: svg.includes('R[0]'), hasApplicant: svg.includes('申请员'), hasSOP: svg.includes('XX-CX-04') });
console.log('attrPanel canonical', JSON.stringify(r.data.attrPanel));
console.log('has 岗位', svg.includes('岗位'));
console.log('role expanded 申请员', svg.includes('申请员'));

section('single-dim skip indices D[0,2]');
const d1 = parseFlowDSL(`Title: t
Dict: D[甲,乙,丙]
Lane from D[0,2] Layout H
W: w1: 开始 Type[S] Location(D[0])
W: w2: 中 Type[T] Location(D[2])
W: w3: 结束 Type[E] Location(D[2])`);
const L1 = computeExcelLayout(d1.data, d1.styles);
const pos: Record<string, unknown> = {};
for (const [id, p] of L1.nodePos) pos[id] = { ri: p.ri, ci: p.ci, x: p.x, y: p.y };
console.log('errors', d1.errors);
console.log('rows', L1.rows);
console.log('cols len', L1.cols.length);
console.log('pos', pos);
console.log('rowHpx', L1.rowHpx);
const ris = Object.values(pos).map((p: any) => p.ri);
console.log('nR vs max ri', L1.rows.length, Math.max(...ris));

section('subprocess inner placement');
const d2 = parseFlowDSL(`Title: 来料检验
Layout: V
Dict: D[质检科,采购科,生产车间]
Dict: worker[来料检验,检验结果?,合格入库,退货处理,让步接收,不合格评审,复检,可接收?,记录归档]
Lane from D[0,1,2] Layout V
W: w1: worker[0] Location(D[0])
W: q1: worker[1] Type[?] Location(D[0])
   合格 → #w2
   不合格 → #q2
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
const L2 = computeExcelLayout(d2.data, d2.styles);
const pos2: Record<string, unknown> = {};
for (const [id, p] of L2.nodePos) pos2[id] = { type: p.n.type, parent: p.n.parent, ri: p.ri, ci: p.ci, cell: p.n.cell };
console.log('errors', d2.errors);
console.log('nodes', d2.data.nodes.map((n) => ({ id: n.id, type: n.type, parent: n.parent, cell: n.cell })));
console.log('layout pos', pos2);

section('missing Location auto-fill 2D');
const d3 = parseFlowDSL(`Title: t
Dict: D[甲,乙]
Dict: P[一,二]
Lane from D[0,1] Layout H
Lane from P[0,1] Layout V
W: w1: 开始 Type[S]
W: w2: 处理
W: w3: 结束 Type[E]`);
console.log('cells', d3.data.nodes.map((n) => ({ id: n.id, cell: n.cell })));
const L3 = computeExcelLayout(d3.data, d3.styles);
const pos3: Record<string, unknown> = {};
for (const [id, p] of L3.nodePos) pos3[id] = { ri: p.ri, ci: p.ci };
console.log('pos', pos3);

section('default otherwise + parallel + annotation');
const d4 = parseFlowDSL(`Title: t
Dict: D[甲]
Lane from D[0] Layout H
W: w1: 开始 Type[S] Location(D[0])
W: q1: 判断 Type[?] Location(D[0])
   是 → #w2
   否则 → #w3
   End
W: w2: 任务 Location(D[0])
W: p1: 并行 Type[+] Location(D[0])
   a → #w3
   b → #w3
   End
W: n1: 备注 Type[N] Location(D[0])
W: d1: 单据 Type[DATA] Location(D[0])
W: w3: 结束 Type[E] Location(D[0])`);
console.log('errors', d4.errors);
console.log('edges', d4.data.edges.map((e) => ({ id: e.id, from: e.from, to: e.to, label: e.label, def: e.default })));
console.log('artifacts', d4.data.artifacts, 'node types', d4.data.nodes.map((n) => n.type));
const svg4 = flowToSVG(d4.data, d4.styles);
console.log('has polygon annotation', svg4.includes('<polygon'));
console.log('has plus for parallel', svg4.includes('>+</') || svg4.includes('>＋<'));
console.log('text-anchor start/end present', svg4.includes('text-anchor="start"') || svg4.includes('text-anchor="end"'));
const dash8 = svg4.split('stroke-dasharray="8').length - 1;
console.log('default-flow dash8 count', dash8);

section('dict duplicate custom + Attr invalid');
const d5 = parseFlowDSL(`Title: t
Dict: foo[a,b]
Dict: foo[c]
Attr active [Foo,Role]
W: w1: 开始 Type[S]
W: w2: 结束 Type[E]`);
console.log('errors', d5.errors, 'warns', d5.warnings, 'dicts', d5.data.dicts, 'attr', d5.data.attrPanel);

section('start count spec vs code');
const d6 = parseFlowDSL(`Title: t
W: w1: a Type[S]
W: w2: b Type[S]
W: w3: c Type[E]`);
console.log('two starts errors', d6.errors);

section('isolated node spec vs code');
const d7 = parseFlowDSL(`Title: t
W: w1: 开始 Type[S]
W: w2: 处理
W: w3: 结束 Type[E]
W: w4: 孤立任务`);
console.log('isolated errors', d7.errors, 'warns', d7.warnings);
console.log('edges', d7.data.edges);

section('gateway without End');
const d8 = parseFlowDSL(`Title: t
W: w1: 开始 Type[S]
W: q1: 判断 Type[?]
W: w2: 结束 Type[E]`);
console.log('no branch errors', d8.errors);
