/**
 * IQS-Flow SVG 渲染结构断言脚本
 * 运行: node --experimental-strip-types scripts/assert_flow_svg.ts
 * 验证 flowToSVG 输出的结构正确性（节点落格中心、格子铺开、标签/连线存在）。
 */
import { flowToSVG, getSvgSize, FLOW_SVG, computeExcelLayout } from '../components/flow/flowToSVG.ts';
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
// 节点文本（折行按字宽、数字不拆：允许整串或「金额超过」+「5000?」）
for (const t of ['提交采购申请', '填写申请单', '部门经理审批', '直接执行', '财务付款', '归档']) {
  check(`节点文本 ${t}`, svg.includes(t));
}
check('网关全文或按词折行 金额超过5000?', svg.includes('金额超过5000?') || (svg.includes('金额超过') && svg.includes('5000?')));
check('折行不切断数字 5000', !svg.includes('金额超过50</') && !svg.includes('>00?'));
// 连线标签
check('连线标签 是', svg.includes('>是<'));
check('连线标签 否', svg.includes('>否<'));
check('岗位字典展开为 申请员', svg.includes('申请员'));

// 泳道带范式：只画有节点的绘制格（不填充连线区色）
// 绘制格分布：每个交叉格（含空格）画真实列宽/行高矩形（fill=none stroke=#94a3b8）
const gridRects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*fill="none" stroke="#94a3b8"/g)].map(m => ({ w: parseFloat(m[3]), h: parseFloat(m[4]) }));
check('交叉格矩形按真实分布绘制', gridRects.length >= 12, `实际 ${gridRects.length}`);
// 自适应列宽：交叉格宽不唯一（长列宽、短列窄）
const rectWs = [...new Set(gridRects.map((r) => Math.round(r.w)))];
check('列宽自适应（不唯一）', rectWs.length > 1, `列宽集 ${rectWs.join(',')}`);
// 行/列标题表头栏（格子化 + 默认居中）
check('行/列标题默认居中表头栏', svg.includes('text-anchor="middle"'));
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
// V 链两节点四周连线区高度不同（垂直堆叠使 y 不同）—— 检查节点 text y 不同
const ySet = new Set([...vhSvg.matchAll(/<text x="[\d.]+" y="([\d.]+)"[^>]*>节点[AB]<\/text>/g)].map((m) => m[1]));
check('V链两节点垂直堆叠（y 不同）', ySet.size >= 2, `y集 ${[...ySet].join(',')}`);

// ===== 连线验证：折线从节点右连线区中线出发 → 中段 → 目标左连线区中线进入 =====
const allPaths = [...svg.matchAll(/<path d="(M[^"]*)" fill="none" stroke="#64748b"/g)].map((m) => m[1]);
check('连线折线存在', allPaths.length >= 4, `实际 ${allPaths.length}`);
// 正交折线最短：存在水平直达（1段 同行）或先横后纵（2-3段 异行）
const orthoCount = allPaths.filter((p) => {
  const segs = (p.match(/L/g) || []).length;
  return segs >= 1 && segs <= 3;
}).length;
check('存在正交最短折线', orthoCount >= 4, `实际 ${orthoCount}`);

// ===== ALIGN：单维按最大链长扩格、子流程内部不进主网格 =====
{
  const single = parseFlowDSL(`Title: t
Dict: D[甲,乙,丙]
Lane from D[0,2] Layout H
W: w1: 开始 Type[S] Location(D[0])
W: w2: 中 Type[T] Location(D[2])
W: w3: 结束 Type[E] Location(D[2])`);
  const Ls = getSvgSize(single.data, single.styles);
  const lay = computeExcelLayout(single.data, single.styles);
  check('单维列数=最大链长(2) 而非节点数(3)', lay.cols.length === 2, `cols=${lay.cols.length}`);
  const pos = [...lay.nodePos.values()];
  check('单维节点 y 均有限（无 NaN）', pos.every((p) => Number.isFinite(p.y)));
  check('单维画布尺寸为正', Ls.width > 0 && Ls.height > 0);
}
{
  const sub = parseFlowDSL(`Title: 来料
Layout: V
Dict: D[质检科,采购科,生产车间]
Dict: worker[来料检验,检验结果?,合格入库,不合格评审,复检,可接收?,记录归档]
Lane from D[0,1,2] Layout V
W: w1: worker[0] Location(D[0])
W: q1: worker[1] Type[?] Location(D[0])
   合格 → #w2
   不合格 → #q2
   End
W: w2: worker[2] Type[E] Location(D[1])
W: q2: worker[3] Type[SUB] Location(D[0])
   W: s1: worker[4] Type[S]
   W: s2: worker[5] Type[?]
      可接收 → #s3
      不可接收 → #s4
      End
   W: s3: worker[2]
   W: s4: worker[6] Type[E]
   End
W: w3: worker[6] Type[E] Location(D[2])
q2 → #w3`);
  const lay = computeExcelLayout(sub.data, sub.styles);
  const inner = [...lay.nodePos.keys()].filter((id) => ['s1', 's2', 's3', 's4'].includes(id));
  check('子流程内部节点不进主网格', inner.length === 0, `意外 ${inner.join(',')}`);
  const maxRi = Math.max(...[...lay.nodePos.values()].map((p) => p.ri));
  check('子流程不额外增行（max ri < 内部 3..6）', maxRi <= 2, `maxRi=${maxRi} rows=${lay.rows.length}`);
  const subSvg = flowToSVG(sub.data, sub.styles);
  check('子流程绘 BPMN 展开＋盒', subSvg.includes('width="10" height="10"'));
}

console.log(`\n== ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);
