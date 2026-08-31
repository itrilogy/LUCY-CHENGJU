/**
 * IQS-Flow → BPMN 2.0 XML 导出断言脚本
 * 运行: node --experimental-strip-types scripts/assert_flow_bpmn.ts
 */
import { parseFlowDSL } from '../components/flow/FlowParser.ts';
import { flowToBpmnXml } from '../components/flow/FlowBpmn.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

const dsl = `Title: buyproc
Layout: H
Dict: D[信息中心,综合计划科,办公室]
Dict: P[申请阶段,审批阶段,执行阶段,归档阶段]
Dict: worker[提交采购申请,填写申请单,金额超过5000?,部门经理审批,直接执行,财务付款,归档]
Lane from D[0,1,2] Layout H
Lane from P[0,1,2,3] Layout V
W: w1: worker[0] Type[S] Location(D[0],P[0])
W: w2: worker[1] Location(D[0],P[0]) Role(R[0])
W: q1: worker[2] Type[?] Location(D[0],P[1])
   是 → #w4
   否则 → #w5
   End
W: w4: worker[3] Location(D[1],P[1])
W: w5: worker[4] Location(D[0],P[2])
W: w6: worker[5] Type[E] Location(D[2],P[3])
w5 → #w6`;

const r = parseFlowDSL(dsl);
check('无解析错误', r.errors.length === 0, r.errors.join());
const xml = flowToBpmnXml(r.data);

check('含 XML 声明', xml.startsWith('<?xml'));
check('含 definitions 根', xml.includes('<bpmn:definitions'));
check('含 process', xml.includes('<bpmn:process id="PROC_buyproc"'));
check('XML 结构元素成对', xml.includes('<bpmn:process') && xml.includes('</bpmn:process>') && xml.includes('</bpmn:definitions>'));
check('节点带 id', xml.includes('<bpmn:startEvent id="w1" name="提交采购申请"'));
check('网关带 id+name', xml.includes('<bpmn:exclusiveGateway id="q1" name="金额超过5000?"'));
check('分支 sequenceFlow', xml.includes('id="q1-Y" sourceRef="q1" targetRef="w4" name="是"'));
check('默认出口 isDefault', xml.includes('isDefault="true"'));
check('含 laneSet', xml.includes('<bpmn:laneSet'));
check('laneSet 含 flowNodeRef', xml.includes('<bpmn:flowNodeRef>'));
check('节点属性含 id= 前缀', /<bpmn:(startEvent|task|exclusiveGateway)\s+id="/.test(xml));

console.log(`\n== ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);
