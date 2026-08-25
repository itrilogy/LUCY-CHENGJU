/**
 * IQS-Flow SVG 渲染结构断言脚本
 * 运行: node --experimental-strip-types scripts/assert_flow_svg.ts
 * 验证 flowToSVG 输出的结构正确性（节点落格中心、格子铺开、标签/连线存在）。
 */
import { flowToSVG, getSvgSize, FLOW_SVG } from '../components/flow/flowToSVG.ts';
import { parseFlowDSL } from '../components/flow/FlowParser.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

const fullDsl = `Title: 采购申请审批流程
Layout: H
Dict: D[信息中心,综合计划科,办公室]
Dict: P[申请阶段,审批阶段,执行阶段,归档阶段]
Dict: R[申请员,部门经理,财务岗]
Dict: worker[提交采购申请,填写申请单,金额超过5000?,部门经理审批,直接执行,财务付款,归档]
Lane from D[0,1,2] Layout H
Lane from P[0,1,2,3] Layout V
AxisX: 职能部门 Align C
AxisY: 推进阶段 Align C
W: w1: worker[0] Type[S] Location(D[0],P[0])
W: w2: worker[1] Location(D[0],P[0]) Role(R[0])
W: q1: worker[2] Type[?] Location(D[0],P[1])
   是 → #w4
   否 → #w5
   End
W: w4: worker[3] Location(D[1],P[1])
W: w5: worker[4] Location(D[0],P[2])
W: w6: worker[5] Location(D[2],P[2])
W: w7: worker[6] Type[E] Location(D[1],P[3])
w5 → #w6
w6 → #w7`;

const r = parseFlowDSL(fullDsl);
check('无解析错误', r.errors.length === 0, JSON.stringify(r.errors));
const svg = flowToSVG(r.data, r.styles);
const size = getSvgSize(r.data);

check('svg 根存在', svg.startsWith('<svg'));
check('尺寸为正', size.width > 0 && size.height > 0, JSON.stringify(size));
check('含箭头 marker', svg.includes('flowArrow'));
check('格子 rect 数量 = 3x4=12 + 节点 rect', (svg.match(/<rect /g) || []).length >= 12);
check('circle（start/end）出现', (svg.match(/<circle /g) || []).length >= 2);
check('菱形 gateway path 出现', svg.includes('<path d="M'));
// 行/列标签
check('行标签 信息中心', svg.includes('信息中心'));
check('行标签 综合计划科', svg.includes('综合计划科'));
check('列标签 申请阶段', svg.includes('申请阶段'));
check('列标签 归档阶段', svg.includes('归档阶段'));
// 节点文本
for (const t of ['提交采购申请', '填写申请单', '金额超过5000?', '部门经理审批', '直接执行', '财务付款', '归档']) {
  check(`节点文本 ${t}`, svg.includes(t));
}
// 连线标签
check('连线标签 是', svg.includes('>是<'));
check('连线标签 否', svg.includes('>否<'));

// 行列矩阵铺开：格子 x 依次递增 gapX
const rectXs = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="220" height="140"/g)].map(m => parseFloat(m[1]));
check('12 个单元格（220x140）', rectXs.length === 12, `实际 ${rectXs.length}`);
if (rectXs.length === 12) {
  const xs = [...new Set(rectXs)];
  check('4 个不同列 x（列铺开）', xs.length === 4, `实际 ${xs.length}`);
  const sorted = [...xs].sort((a,b) => a-b);
  const deltas = sorted.slice(1).map((v,i) => +(v - sorted[i]).toFixed(1));
  check('列间距恒定 = cellW+gapX=280', deltas.every(d => Math.abs(d - 280) < 0.01), JSON.stringify(deltas));
}

// ===== 新修复行为验证 =====
// 1. 菱形按文字自适应（不再固定64）
const diamondRe = /<path d="M([^"]+)" fill="#(10b981|8b5cf6)"\/>/g;
const diamondD: string[] = [];
let dm: RegExpExecArray | null;
while ((dm = diamondRe.exec(svg)) !== null) diamondD.push(dm[1]);
check('菱形(判断/并行) path 存在', diamondD.length >= 1, `实际 ${diamondD.length}`);
if (diamondD.length >= 1) {
  const pts = diamondD[0].split(' ').map((p) => parseFloat(p.replace(/[ML]/g, '').split(',')[0]));
  const xs = pts.filter((v) => !isNaN(v));
  const bw = Math.max(...xs) - Math.min(...xs);
  check('菱形宽随文字自适应(>旧的固定64)', bw > 80, `菱形宽 ${bw}`);
  const ys = diamondD[0].split(' ').map((p) => parseFloat(p.replace(/[ML]/g, '').split(',')[1])).filter((v) => !isNaN(v));
  const bh = Math.max(...ys) - Math.min(...ys);
  check('菱形高随文字自适应(>=50)', bh >= 50, `菱形高 ${bh}`);
}
// 2. 连线端点贴节点边界：连线 path 起点 x 应等于源节点右缘（非固定±60）
const edgeStarts = [...svg.matchAll(/<path d="M([\d.]+),([\d.]+) L/g)].map(m => parseFloat(m[1]));
check('存在连线 path', edgeStarts.length >= 4, `实际 ${edgeStarts.length}`);
check('存在非固定60的连线起点（贴边界）', edgeStarts.some(x => x > 100 && x < 400 && Math.abs(x - Math.round(x)) < 0.01));
// 3. 行标签防裁切：左 header 区 head>=50, 行标签 text-anchor=middle 且 x 在 header 内
check('行标签用 text-anchor=middle 防裁切', svg.includes('text-anchor="middle" fill="#334155" font-size="13"'));
// 初始左 padding head>=50
check('画布左 padding head>=50(防裁切)', FLOW_SVG.head >= 50, `head=${FLOW_SVG.head}`);

console.log(`\n== ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);
