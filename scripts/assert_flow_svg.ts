/**
 * IQS-Flow SVG 渲染结构断言脚本
 * 运行: node --experimental-strip-types scripts/assert_flow_svg.ts
 * 验证 flowToSVG 输出的结构正确性（节点落格中心、格子铺开、标签/连线存在）。
 */
import { flowToSVG, getSvgSize, FLOW_SVG, computeExcelLayout } from '../components/flow/flowToSVG.ts';
import { parseFlowDSL } from '../components/flow/FlowParser.ts';
import { solveAlgebraicPorts } from '../components/flow/AlgebraicFlowRouter.ts';
import { computeMainlineOrder } from '../components/flow/MainlineOrder.ts';

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

// ===== 对角扩展格 D（A6 算子，FLOW_OPTIMALITY_FRAMEWORK）：同格 a→D→b→V→c =====
// b 应相对 a 右下偏移（gx+1 且 gy+1），c 相对 b 正下（V 不增 gx）；ny=3 推动整行统一扩展。
{
  const diagR = parseFlowDSL(`Title: t
Dict: D[甲,乙]
Dict: P[一]
Lane from D[0,1] Layout H
Lane from P[0] Layout V
W: a: 节点A Location(D[0],P[0])
W: b: 节点B Location(D[0],P[0]) D
W: c: 节点C Location(D[0],P[0]) V
W: s: 开始 Type[S] Location(D[1],P[0])
W: e: 结束 Type[E] Location(D[1],P[0]) V`);
  check('diag: 无解析错误', diagR.errors.length === 0, JSON.stringify(diagR.errors));
  const diagL = computeExcelLayout(diagR.data, diagR.styles);
  const pa = diagL.nodePos.get('a'), pb = diagL.nodePos.get('b'), pc = diagL.nodePos.get('c');
  if (pa && pb && pc) {
    check('diag: B 相对 A 对角右下（x、y 均增）', pb.x > pa.x + 1 && pb.y > pa.y + 1,
      `dx=${(pb.x - pa.x).toFixed(1)} dy=${(pb.y - pa.y).toFixed(1)}`);
    check('diag: C 相对 B 正下（同槽 x、y 增）', Math.abs(pc.x - pb.x) < 1 && pc.y > pb.y + 1,
      `dx=${Math.abs(pc.x - pb.x).toFixed(1)} dy=${(pc.y - pb.y).toFixed(1)}`);
    check('diag: 行高被对角扩展推动（ny≥3）', diagL.rowHpx[0] > 300,
      `rowHpx[0]=${diagL.rowHpx[0].toFixed(1)}`);
  } else {
    check('diag: 三节点均落格', false);
  }
}

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

// ===== 阶段三：Axis 整图标题 Align L/R/C + Color[Panel] 配色 =====
{
  // Align L：整图标题左对齐（text-anchor=start）
  const a = parseFlowDSL(`Title: 左对齐
Axis: 整图标题左对齐 AxisX Align L
W: w1: 开始 Type[S]
W: w2: 结束 Type[E]`);
  const aSvg = flowToSVG(a.data, a.styles);
  check('align-L: 整图标题 text-anchor=start', aSvg.includes('text-anchor="start"') && aSvg.includes('左对齐'), a.errors.join());
  check('align-L: 无错误', a.errors.length === 0, a.errors.join());

  // Align R：整图标题右对齐（text-anchor=end）
  const b = parseFlowDSL(`Title: t
Axis: 整图标题右对齐 AxisX Align R
W: w1: 开始 Type[S]
W: w2: 结束 Type[E]`);
  const bSvg = flowToSVG(b.data, b.styles);
  check('align-R: 整图标题 text-anchor=end', bSvg.includes('text-anchor="end"') && bSvg.includes('整图标题右对齐'), b.errors.join());

  // Color[Panel]：图例边栏背景色可定制
  const c = parseFlowDSL(`Title: t
Attr active [Role]
Color[Panel]: #ff0000
W: w1: 开始 Type[S]
W: w2: 处理 Role(R[0])
W: w3: 结束 Type[E]`);
  const cSvg = flowToSVG(c.data, c.styles);
  check('color-panel: 面板背景用 Color[Panel]', cSvg.includes('#ff0000'));
}

// ===== 阶段三：子流程框内嵌套小图 =====
{
  const d = parseFlowDSL(`Title: q
Layout: V
Dict: D[质检科,采购科]
Dict: worker[a1,判断,合格,评审,可接收,末项]
Lane from D[0,1] Layout V
W: w1: worker[0] Location(D[0])
W: q2: worker[2] Type[SUB] Location(D[0])
   W: s1: worker[3] Type[S]
   W: s2: worker[4] Type[?]
      可接收 → #s3
      End
   W: s3: worker[1]
   End
W: w3: worker[5] Type[E] Location(D[1])
q2 → #w3
w1 → #q2`);
  check('sub-mini: 无解析错误', d.errors.length === 0, d.errors.join());
  const dSvg = flowToSVG(d.data, d.styles);
  check('sub-mini: 无错误', d.errors.length === 0);
  check('sub-mini: 内部迷你节点文字渲染', dSvg.includes('评审') && dSvg.includes('可接收') && dSvg.includes('合格'));
  check('sub-mini: 迷你开始圆', dSvg.includes('fill="#2563eb"'));
  check('sub-mini: 迷你网关棱', dSvg.includes('fill="#10b981"'));
  check('sub-mini: 子流程展开＋盒保留', dSvg.includes('width="10" height="10"'));
}

// ===== 阶段三：P3 跨多格回边走外侧走廊 =====
{
  const e = parseFlowDSL(`Title: q
Layout: H
Dict: D[部1,部2,部3]
Dict: P[阶段1,阶段2,阶段3,阶段4]
Dict: worker[a任务,中转2,目标,起始,末,额]
Lane from D[0,1,2] Layout H
Lane from P[0,1,2,3] Layout V
W: w1: worker[3] Type[S] Location(D[0],P[0])
W: w2: worker[1] Location(D[0],P[1])
W: w3: worker[1] Location(D[0],P[2])
W: w6: worker[2] Type[E] Location(D[2],P[3])
w1 → #w2
w2 → #w3
w6 → #w1`);
  const layE = computeExcelLayout(e.data, e.styles);
  const svgE = flowToSVG(e.data, e.styles);
  const x0e = layE.bandLeft + layE.titleBandW;
  const pathsE = [...svgE.matchAll(/<path d="(M[^"]*)" fill="none"[^>]*stroke-width="2"/g)].map((m) => m[1]);
  let outerHits = 0;
  for (const d of pathsE) {
    const c = d.match(/[-\d.]+/g)!.map(Number);
    for (let i = 0; i < c.length; i += 2) {
      const x = +c[i], y = +c[i + 1];
      if (x <= layE.bandLeft + layE.half + 1 || y >= layE.gridBottom + 0.01 || y <= FLOW_SVG.titleH + 0.01) { outerHits++; break; }
    }
  }
  check('outer-corridor: 回边外绕触发(≥1边触及外侧走廊)', outerHits >= 1, `outerHits=${outerHits}`);
  check('outer-corridor: 无解析错误', e.errors.length === 0, e.errors.join());
}

// ===== 遗留规划 M1（R1）：同走廊多边走线错位（不叠同中线） =====
{
  const r1 = parseFlowDSL(`Title: r1
Layout: H
Dict: D[列0,列1]
Dict: P[行0,行1,行2]
Dict: worker[A,B,C]
Lane from D[0,1] Layout H
Lane from P[0,1,2] Layout V
W: s1: worker[0] Type[S] Location(D[0],P[0])
W: a1: worker[1] Location(D[0],P[0])
W: a2: worker[1] Location(D[0],P[1])
W: a3: worker[1] Location(D[0],P[2])
W: b3: worker[2] Location(D[1],P[2])
W: b2: worker[2] Location(D[1],P[1])
W: b1: worker[2] Location(D[1],P[0])
W: e1: worker[0] Type[E] Location(D[1],P[0])
s1 → #a1
a1 → #b3
a2 → #b2
a3 → #b1
b1 → #e1`);
  const r1svg = flowToSVG(r1.data, r1.styles);
  check('r1: 无解析错误', r1.errors.length === 0, r1.errors.join());
  const r1vx = new Set<number>();
  for (const mm of r1svg.matchAll(/L([\d.]+),([\d.]+) L\1,([\d.]+)/g)) r1vx.add(Math.round(parseFloat(mm[1]) * 10) / 10);
  // R1：同列多源均连到对侧时，竖段走廊应错开（≥2 个不同 x），不全部叠回同一中线
  check('r1: 同走廊多边竖段错位(≥2种x)', r1vx.size >= 2, `唯一竖段x=${[...r1vx].join(',')}`);
}

// ===== 复杂图例：扩展格(一列多节点纵向撑开) + 端点贴节点边界(连线不悬空) =====
{
  // 一列两节点纵向堆叠 + 跨泳道连线 + 分支
  const cx = parseFlowDSL(`Title: t
Layout: H
Dict: D[采购部,质量部,技术部]
Dict: P[初审,评审,执行]
Lane from D[0,1,2] Layout H
Lane from P[0,1,2] Layout V
W: w1: 受理申请 Type[S] Location(D[0],P[0])
W: w2: 资料初审 Location(D[0],P[0])
w1 → #w2
W: q1: 初审通过? Type[?] Location(D[1],P[0])
   是 → #w3
   否 → #w4
   End
W: w3: 技术评审 Location(D[1],P[1])
W: w4: 补齐材料 Location(D[0],P[1])`)
  const lay = computeExcelLayout(cx.data, cx.styles);
  // 首行：w1+w2 纵向 2 节点 → rowHpx[0] ≈ 2*(单节点高+2half)
  const row0 = lay.rowHpx[0];
  check('cx-ext: 首行扩展格(2节点纵向)行高≈单节点2倍', row0 > 200, `rowHpx[0]=${Math.round(row0)}`);
  // 端点贴边
  const svgC = flowToSVG(cx.data, cx.styles);
  const box = {}; for (const [id,p] of lay.nodePos) box[id]={x:p.x,y:p.y,W:p.W,H:p.H};
  const near=(id,pt,tol=20)=>{const b=box[id];return b&&(Math.abs(pt.x-(b.x-b.W/2))<=tol||Math.abs(pt.x-(b.x+b.W/2))<=tol||Math.abs(pt.y-(b.y-b.H/2))<=tol||Math.abs(pt.y-(b.y+b.H/2))<=tol);};
  const paths=[...svgC.matchAll(/<path d="(M[^"]*)" fill="none"[^>]*stroke-width="2"/g)].map(x=>x[1]);
  let loose=0; for(const d of paths){const n=d.match(/[-\d.]+/g).map(Number);const s={x:+n[0],y:+n[1]},t={x:+n[n.length-2],y:+n[n.length-1]};if(!Object.keys(box).some(id=>near(id,s))||!Object.keys(box).some(id=>near(id,t)))loose++;}
  check('cx-endpoint: 连线端点贴节点边界(0悬空)', loose===0, `loose=${loose}`);
}

{
  // A1 WSAD：任意节点入端口集 ∩ 出端口集 = ∅
  const lay = computeExcelLayout(r.data, r.styles);
  const nodesGeo = [...lay.nodePos.entries()].map(([id, p]) => ({
    id, ri: p.ri, ci: p.ci, x: p.x, y: p.y, W: p.W, H: p.H,
  }));
  const specs = r.data.edges.map((e) => ({
    id: e.id, from: e.from, to: e.to, label: e.label, condition: e.condition, isDoc: e.condition === '__doc__',
  }));
  const { sourcePorts, targetPorts } = solveAlgebraicPorts(nodesGeo, specs);
  const inDirs = new Map<string, Set<string>>();
  const outDirs = new Map<string, Set<string>>();
  for (const n of nodesGeo) { inDirs.set(n.id, new Set()); outDirs.set(n.id, new Set()); }
  for (const e of specs) {
    const sp = sourcePorts.get(e.id); const tp = targetPorts.get(e.id);
    if (sp) outDirs.get(e.from)?.add(sp);
    if (tp) inDirs.get(e.to)?.add(tp);
  }
  let conflict = 0;
  for (const n of nodesGeo) {
    for (const d of inDirs.get(n.id) || []) if (outDirs.get(n.id)?.has(d)) conflict++;
  }
  check('a1-wsad: 入出端口互斥', conflict === 0, `conflicts=${conflict}`);
}

{
  // M-Ord：二维无 Location 时按主干序落格（声明序 w2 先写，主干仍是 start w1）
  const ord = parseFlowDSL(`Title: t
Layout: H
Dict: D[甲,乙]
Dict: P[一,二]
Lane from D[0,1] Layout H
Lane from P[0,1] Layout V
W: w1: 开始 Type[S] Location(D[0],P[0])
W: w3: 结束 Type[E]
W: w2: 处理
w1 → #w2
w2 → #w3`);
  check('mainline-autoseq: 无解析错误', ord.errors.length === 0, JSON.stringify(ord.errors));
  const layO = computeExcelLayout(ord.data, ord.styles);
  const autoIds = ord.data.nodes.filter((n) => !n.cell && !n.parent).map((n) => n.id);
  const ml = computeMainlineOrder(ord.data.nodes, ord.data.edges).filter((id) => autoIds.includes(id));
  const placed = [...autoIds].sort((a, b) => {
    const pa = layO.nodePos.get(a)!, pb = layO.nodePos.get(b)!;
    return pa.ri !== pb.ri ? pa.ri - pb.ri : pa.ci - pb.ci;
  });
  check('mainline-autoseq: 无 Location 节点按主干序填空格', ml.join('>') === placed.join('>'),
    `mainline=${ml.join('>')} placed=${placed.join('>')}`);
}

{
  const layT = computeExcelLayout(r.data, r.styles);
  const t2 = layT.t2;
  check('t2: 统计存在', !!t2);
  check('t2: 路由 Φ 不增', !!t2 && t2.phiRoute1 <= t2.phiRoute0 + 1e-6,
    t2 ? `phi0=${t2.phiRoute0.toFixed(2)} phi1=${t2.phiRoute1.toFixed(2)} acc=${t2.accepted} rej=${t2.rejected}` : '');
}

{
  // 黄金几何快照：采购样例节点格位（ri,ci,round x/y）锁定，防止 T2/布局无声漂移
  const GOLDEN_FP = 'q1:0,1,358,147|w1:0,0,170,147|w2:0,0,170,293|w4:1,1,358,426|w5:0,2,546,147|w6:2,2,546,546|w7:1,3,710,426';
  const layG = computeExcelLayout(r.data, r.styles);
  const fp = [...layG.nodePos.entries()]
    .map(([id, p]) => `${id}:${p.ri},${p.ci},${Math.round(p.x)},${Math.round(p.y)}`)
    .sort()
    .join('|');
  check('golden: 采购样例节点格位快照', fp === GOLDEN_FP, fp);
  check('golden: svg 体量稳定', svg.length >= 7000 && svg.length <= 12000, `len=${svg.length}`);
}

console.log(`\n== ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);
