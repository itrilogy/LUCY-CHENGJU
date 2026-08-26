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

// 泳道带范式：只画有节点的格子 + 贯穿泳道带
// 只画有节点的格子（虚线定位框，尺寸自适应）
const cellRects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*stroke-dasharray="4 3"/g)].map(m => ({ w: parseFloat(m[3]), h: parseFloat(m[4]) }));
const nR = 3, nC = 4; // 采购示例：3 行部门 × 4 列阶段
check('有节点的格子已画（<=12，只含有内容格）', cellRects.length > 0 && cellRects.length <= 12, `实际 ${cellRects.length}`);
// 自适应列宽：格子宽度不都一样（长列宽、短列窄）
const rectWs = [...new Set(cellRects.map((r) => Math.round(r.w)))];
check('列宽自适应（不唯一，长列宽短列窄）', rectWs.length > 1, `列宽集 ${rectWs.join(',')}`);
// 贯穿泳道带（浅灰底 0.16、宽 > 整列）
const bandRects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*fill-opacity="0.16"/g)].map(m => ({ w: parseFloat(m[3]) }));
check('贯穿泳道带存在（3 条）', bandRects.length === 3, `实际 ${bandRects.length}`);
if (bandRects.length) check('泳道带宽 > 单格', bandRects[0].w > 300, `带宽 ${bandRects[0].w}`);
// 行标题表头栏（text-anchor=end）
check('行标题用 text-anchor=end 表头栏', svg.includes('text-anchor="end"'));
// 无旧的固定 220x140 实心空格子框
const solidCellCount = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="220" height="140" rx="8" fill="[^"]*" fill-opacity="0.3"/g)].length;
check('无旧的实心空格子框（0）', solidCellCount === 0, `实际 ${solidCellCount}`);

// ===== 新修复行为验证 =====
// 1. 菱形按文字自适应（不再固定64）
const diamondRe = /<path d="M([^"]+)" fill="#(10b981|8b5cf6)"/g;
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
// 3. 画布左 padding head>=50(防裁切)
check('画布左 padding head>=50(防裁切)', FLOW_SVG.head >= 50, `head=${FLOW_SVG.head}`);

// ===== V/H 链式格内排布验证（独立 DSL：同格两个节点带 V） =====
const vhDsl = `Title: t
Dict: D[甲,乙]
Dict: P[一,二]
Lane from D[0,1] Layout H
Lane from P[0,1] Layout V
W: w1: 节点A, V Location(D[0],P[0])
W: w2: 节点B, V Location(D[0],P[0])`;
const vhR = parseFlowDSL(vhDsl);
const vhSvg = flowToSVG(vhR.data, vhR.styles);
// 找 D[0]P[0] 格子（含 w1,w2），检查其高度能容纳两个节点（V链）
const vhCellHeights = [...vhSvg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="[\d.]+" height="([\d.]+)"[^>]*stroke-dasharray="4 3"/g)].map((m) => parseFloat(m[1]));
check('V链格高能容纳多节点（>100）', vhCellHeights.some((h) => h > 100), `格高集 ${vhCellHeights.join(',')}`);
// V 链两节点 y 不同（垂直堆叠）
const ySet = new Set([...vhSvg.matchAll(/<text x="[\d.]+" y="([\d.]+)"[^>]*>节点[AB]<\/text>/g)].map((m) => m[1]));
check('V链两节点垂直堆叠（y 不同）', ySet.size >= 2, `y集 ${[...ySet].join(',')}`);

// ===== 连线路由分层验证（同泳道水平/同列垂直/跨带间隙折线） =====
const allPaths = [...svg.matchAll(/<path d="(M[^"]*)" fill="none" stroke="#64748b"/g)].map((m) => m[1]);
// 同泳道水平直连：段数=1 且 y 基本同（节点中心可能差几px，放宽到 <10）
const horizCount = allPaths.filter((p) => {
  const segs = (p.match(/L/g) || []).length;
  const ys = [...p.matchAll(/(?:M|L)([\d.]+),([\d.]+)/g)].map((m) => parseFloat(m[2]));
  return segs <= 1 && ys.length === 2 && Math.abs(ys[0] - ys[1]) < 10;
}).length;
check('存在同泳道水平直连', horizCount >= 1, `实际 ${horizCount}`);
// 同列垂直直连：段数=1 且 x 基本同
const vertCount = allPaths.filter((p) => {
  const segs = (p.match(/L/g) || []).length;
  const xs = [...p.matchAll(/(?:M|L)([\d.]+),([\d.]+)/g)].map((m) => parseFloat(m[1]));
  return segs <= 1 && xs.length === 2 && Math.abs(xs[0] - xs[1]) < 10;
}).length;
check('存在同列垂直直连', vertCount >= 1, `实际 ${vertCount}`);
// 跨带间隙折线：段数=3（源→通道→目标）
const hingeCount = allPaths.filter((p) => (p.match(/L/g) || []).length === 3).length;
check('存在跨带间隙折线（3段）', hingeCount >= 1, `实际 ${hingeCount}`);

console.log(`\n== ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);
