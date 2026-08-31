/**
 * IQS-Flow DSL 解析器（字典-索引范式）
 * spec: docs/IQS_FLOW_DSL_SPEC.md (v0.7)
 *
 * 纯解析，不依赖 React/G6 —— 可独立测试（scripts/assert_flow_parser.mjs 复用。
 * 导出 CLI 接口 parseFlowDSL + parseFlowDSLWithDetails，供 Editor / 断言脚本使用。
 */

import type {
  FlowData,
  FlowLane,
  FlowAxisSet,
  FlowNode,
  FlowEdge,
  FlowNodeType,
  FlowChartStyles
} from '../../types';

/** 本地默认样式（避免跨文件运行时依赖，便于 Node strip-types 独立测试） */
const DEFAULT_FLOW_STYLES: FlowChartStyles = {
  title: '流程图',
  titleFontSize: 20,
  layout: 'H',
  startColor: '#2563eb',
  endColor: '#ef4444',
  taskColor: '#3b82f6',
  gatewayColor: '#10b981',
  parallelColor: '#8b5cf6',
  subprocessColor: '#0ea5e9',
  annotationColor: '#f59e0b',
  dataColor: '#64748b',
  laneColor: '#e2e8f0',
  axisColor: '#334155',
  lineColor: '#64748b',
  textColor: '#1e293b',
  labelFontSize: 14,
  nodeFontSize: 13,
  lineWidth: 2
};

export type FlowParseResult = {
  data: FlowData;
  styles: typeof DEFAULT_FLOW_STYLES;
  errors: string[];
  warnings: string[];
};

const RESERVED = ['D', 'P', 'R'];

function stripFences(content: string): string {
  // 去除 Markdown 围栏
  return content.replace(/^```[a-z]*\s*$/gim, '').trim();
}

export function parseFlowDSL(content: string): FlowParseResult {
  return parseFlowDSLWithDetails(content);
}

export function parseFlowDSLWithDetails(content: string): FlowParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const style: any = { ...DEFAULT_FLOW_STYLES };
  const dicts: Record<string, string[]> = {};
  const lanes: FlowLane[] = [];
  const axes: FlowAxisSet = {
    x: { title: '', align: 'C' },
    y: { title: '', align: 'C' },
    page: { title: '', place: 'AxisX', align: 'C' }
  };
  let pageTitle = '';
  let layout: 'H' | 'V' = 'H';
  let attrActive: string[] | null = null;

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const subProcesses: { id: string; nodes: string[] }[] = [];
  const artifacts: { id: string; type: string; label: string; attach: string }[] = [];

  const idCounter: Record<string, number> = {};
  const nodeById = new Map<string, FlowNode>();
  const autoIdSeq: number[] = [];
  let edgeSeq = 0;

  // 自动编号：w1, w2 ...（全局序，跳过已占用的显式 id）
  const nextAutoId = () => {
    let cand: string;
    do { cand = `w${autoIdSeq.length + 1}`; autoIdSeq.push(autoIdSeq.length + 1); } while (nodeById.has(cand));
    return cand;
  };
  const nextEdgeId = () => `e${++edgeSeq}`;

  const clean = stripFences(content);
  const lines = clean.split('\n');

  // ===== 行处理（逐行，支持分支块/子流程块的 End 闭合） =====
  // 简化模型：第一阶段先收集 dict / lane / axis / attr；第二阶段处理 W 节点与边。

  // 预扫描：记录每条 Lane from 定义的轴（axisKey -> {dictName, indices, layout}）
  const laneAxes: Record<string, { dict: string; indices: number[]; layout: 'H' | 'V' }> = {};
  // 尚未处理——在下方行循环中填充。

  let currentSubprocessId: string | undefined;
  let insideBranch: string | undefined; // 当前判断/并行节点 id

  const lineList = lines.slice();

  // First pass: dicts & lane axes & shell (axis/attr/title/layout/colors)
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('//')) continue;

    // Title
    if (/^Title\s*:/i.test(t)) {
      pageTitle = t.replace(/^Title\s*:/i, '').trim();
      style.title = pageTitle;
      continue;
    }
    // Layout
    if (/^Layout\s*:/i.test(t)) {
      const lv = t.replace(/^Layout\s*:/i, '').trim().toUpperCase();
      if (lv === 'H' || lv === 'V') { layout = lv; style.layout = lv; }
      continue;
    }
    // Dict
    const dictMatch = t.match(/^Dict\s*:\s*([A-Za-z_\u4e00-\u9fff][\w\u4e00-\u9fff]*)\s*\[([^\]]*)\]/);
    if (dictMatch) {
      const name = dictMatch[1];
      if (dicts[name]) {
        errors.push(`字典 ${name} 重复定义`);
        // 仍取后者覆盖（保持后续解析可用），仅告警
      }
      const values = dictMatch[2].split(',').map((s) => s.trim()).filter((s) => s.length);
      dicts[name] = values;
      continue;
    }
    // Lane from
    const laneMatch = t.match(/^Lane\s+from\s+([A-Za-z_\u4e00-\u9fff][\w\u4e00-\u9fff]*)\s*\[([^\]]*)\]\s+Layout\s+([HVHV])/i);
    if (laneMatch) {
      const dictName = laneMatch[1];
      const idxList = laneMatch[2].split(',').map((s) => s.trim()).filter((s) => s.length);
      let indices: number[];
      if (idxList.length === 1 && idxList[0] === '*') {
        const dict = dicts[dictName];
        if (dict) indices = dict.map((_, i) => i);
        else { errors.push(`Lane from 引用了未定义字典 ${dictName}`); indices = []; }
      } else {
        indices = idxList.map((s) => {
          const n = parseInt(s, 10);
          const dict = dicts[dictName];
          if (isNaN(n)) { errors.push(`Lane from 索引非法: ${s}`); return -1; }
          if (dict && (n < 0 || n >= dict.length)) { errors.push(`Lane from 索引越界: ${dictName}[${n}]`); return -1; }
          return n;
        }).filter((n) => n >= 0);
      }
      const lnLayout = (laneMatch[3] || laneMatch[4] || 'H').toUpperCase() as 'H' | 'V';
      lanes.push({ dict: dictName, indices, layout: lnLayout });
      laneAxes[dictName] = { dict: dictName, indices, layout: lnLayout };
      continue;
    }
    // AxisX: / AxisY: / Axis:
    const axMatch = t.match(/^(AxisX|AxisY|Axis)\s*:\s*(.*)$/i);
    if (axMatch) {
      const whichRaw = axMatch[1].toLowerCase(); // 'axisx' | 'axisy' | 'axis'
      const rest = axMatch[2].trim();
      // 解析标题 + [Align L/R/C]
      const alignMatch = rest.match(/Align\s+([LRlrc])/i);
      const align = (alignMatch ? alignMatch[1].toUpperCase() : 'C') as 'L' | 'R' | 'C';
      const title = alignMatch ? rest.replace(/Align\s+[LRlrc]/i, '').trim() : rest;
      if (whichRaw === 'axisx') { axes.x = { title, align }; }
      else if (whichRaw === 'axisy') { axes.y = { title, align }; }
      else {
        // Axis: <整图标题> AxisX|AxisY [Align]
        const placeMatch = rest.match(/(AxisX|AxisY)/i);
        const place = (placeMatch ? (placeMatch[1] as 'AxisX' | 'AxisY') : 'AxisX');
        const title2 = rest.replace(/(AxisX|AxisY)/i, '').replace(/Align\s+[LRlrc]/i, '').trim();
        axes.page = { title: title2 || pageTitle, place, align };
      }
      continue;
    }
    // Attr active
    const attrMatch = t.match(/^Attr\s+active(?:\s*\[([^\]]*)\])?/i);
    if (attrMatch) {
      const keys = attrMatch[1] ? attrMatch[1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
      attrActive = keys.length ? keys : ['sop', 'role', 'lv', 'time', 'kpi', 'm'];
      continue;
    }
    // Color[Slot]: (样式)
    const colorMatch = t.match(/^Color\[([^\]]+)\]:\s*(#[0-9a-fA-F]{3,8})/);
    if (colorMatch) {
      const slot = colorMatch[1];
      const colorKey = slotToStyleKey(slot);
      if (colorKey) style[colorKey] = colorMatch[2];
      continue;
    }
  }

  // ===== Second pass: 节点与边（先收集节点，后建边） =====
  // 用块栈识别 W 节点归属（子流程）与分支行的所属网关。
  interface Seq { kind: 'node' | 'branch' | 'end' | 'substart' | 'gw'; gw?: string; text: string; parent?: string }
  const seq: Seq[] = [];

  const raw2: string[] = lines.map((l) => l.trim())
    .filter((t) => t.length && !t.startsWith('//') && !/^(Title|Layout|Dict|Lane|Axis|Attr|Color)/i.test(t));

  {
    const st: ('branch' | 'subprocess')[] = [];
    const subOwners: string[] = [];
    let curGw: string | undefined;

    for (const t of raw2) {
      if (t === 'End' || t.toLowerCase() === '#end') {
        if (st.length === 0) { errors.push('意外的 End'); continue; }
        const k = st.pop();
        seq.push({ kind: 'end', text: t });
        if (k === 'branch') curGw = undefined;
        continue;
      }

      const wm = t.match(/^W:\s*([\w-]*:)?\s*(.*)$/);
      if (wm) {
        const idDecl = (wm[1] || '').replace(':', '').trim();
        const body = wm[2].trim();
        const n = parseWLine(body, idDecl);
        if (!n) continue;
        const parent = st.includes('subprocess') ? subOwners[subOwners.length - 1] : undefined;
        if (parent) n.parent = parent;
        nodes.push(n);
        nodeById.set(n.id, n);
        seq.push({ kind: 'node', text: t, parent, gw: st.includes('branch') ? curGw : undefined });
        if (n.type === 'subprocess') {
          st.push('subprocess'); subOwners.push(n.id);
          subProcesses.push({ id: n.id, nodes: [] });
          seq.push({ kind: 'substart', text: t, parent: n.id });
        }
        else if (n.type === 'exclusiveGateway' || n.type === 'parallelGateway') { st.push('branch'); curGw = n.id; seq.push({ kind: 'gw', text: t, gw: n.id }); }
        continue;
      }

      // 分支行
      if (t.includes('→')) {
        // 仅当处于分支块内属于分支行；块外为显式边
        if (st.includes('branch')) {
          seq.push({ kind: 'branch', text: t, gw: curGw });
        } else {
          seq.push({ kind: 'node', text: t }); // 显式边，单独处理
        }
        continue;
      }

      // 其他行忽略（不参与节点/边）
    }
  }

  // ===== 建边（此时所有节点已注册） =====
  const suppressDefaultIn = new Set<string>();
  // 分支目标只有是"该网关声明顺序的紧后节点"时，才应抑制其默认入边
  // （否则会导致类似 w1→w2 这种更早声明节点的默认顺序流被误杀）
  const nodeOrder = nodes.map((n) => n.id);
  const nextOf = (gwId: string): string | null => {
    const i = nodeOrder.indexOf(gwId);
    return i >= 0 && i + 1 < nodeOrder.length ? nodeOrder[i + 1] : null;
  };
  function addEdge(from: string, to: string, label: string | null, cond: string | null, isDefault: boolean, id?: string) {
    edges.push({ id: id || nextEdgeId(), from, to, type: 'sequence', label, condition: cond, default: isDefault });
  }
  for (const s of seq) {
    if (s.kind === 'branch' && s.gw) {
      const pr = parseBranchLine(s.text);
      if (!pr) continue;
      const { label, exitName, cond, targets } = pr;
      const src = s.gw;
      if (!nodeById.has(src)) { errors.push(`分支源 ${src} 未找到节点`); continue; }
      for (const tRaw of targets) {
        const tid = tRaw.replace(/^#/, '');
        if (!nodeById.has(tid)) { errors.push(`分支目标 ${tid} 未找到`); continue; }
        const isDef = label === '否则';
        addEdge(src, tid, label === '' ? null : label, cond || null, isDef,
          exitName || `${src}-${isDef ? 'D' : edgeLabelTag(label)}`);
        // 仅当目标是该网关声明顺序的紧后节点时才抑制默认入边
        if (nextOf(src) === tid) suppressDefaultIn.add(tid);
      }
    } else if (s.kind === 'node' && s.text.includes('→')) {
      // 显式边: from → #to
      const parts = s.text.split('→');
      if (parts.length >= 2) {
        const from = parts[0].trim();
        const to = parts[1].trim().replace(/#/g, '');
        if (!nodeById.has(from)) { errors.push(`显式边源 ${from} 未定义`); }
        else if (!nodeById.has(to)) { errors.push(`显式边目标 ${to} 未定义`); }
        else addEdge(from, to, null, null, false);
      }
    }
  }

  // ===== 默认顺序流（声明顺序自动连） =====
  // 非网关、同 parent 域的相邻节点；分支目标抑制默认入边。
  // 修复：网关可作为"目标"（前一个普通节点 → 网关 应有默认边），
  //       但网关不作为"源"（网关出口必须用分支行）。
  const orderNodes = nodes; // 按声明序（含网关）
  for (let j = 0; j < orderNodes.length - 1; j++) {
    const a = orderNodes[j];
    const b = orderNodes[j + 1];
    if (a.parent !== b.parent) continue;
    // 源是网关/结束/注解/数据对象：跳过（网关出边用分支行；结束/注解/数据对象不出默认流程）
    if (a.type === 'exclusiveGateway' || a.type === 'parallelGateway'
      || a.type === 'end' || a.type === 'annotation' || a.type === 'dataObject') continue;
    if (suppressDefaultIn.has(b.id)) continue;
    const dup = edges.find((e) => e.from === a.id && e.to === b.id);
    if (!dup) addEdge(a.id, b.id, null, null, false);
  }

  // ===== canonical：坐标清洗（维度与 Lane from 定义对齐）+ 索引越界校验 =====
  const definedAxisKeys = Object.keys(laneAxes);
  for (const n of nodes) {
    if (!n.cell) continue;
    // 索引越界校验（对照字典长度，无条件执行）
    for (const k of Object.keys(n.cell)) {
      const dictArray = dicts[k];
      if (dictArray && typeof n.cell[k] === 'number') {
        const idx = n.cell[k];
        if (idx < 0 || idx >= dictArray.length) {
          errors.push(`节点 ${n.id} 坐标 \`${k}[${idx}]\` 越界（字典 ${k} 仅 ${dictArray.length} 项）`);
        }
      }
    }
    // 维度清洗：仅保留在 Lane from 定义的轴，未定义的丢弃
    if (definedAxisKeys.length === 0) {
      n.cell = null; // 无泳道：坐标不参与，全部清洗
      continue;
    }
    for (const k of Object.keys(n.cell)) {
      if (!definedAxisKeys.includes(k)) {
        warnings.push(`节点 ${n.id} 坐标维度 ${k} 未在 Lane from 定义，已清洗丢弃`);
        delete n.cell[k];
      }
    }
    if (Object.keys(n.cell).length === 0) n.cell = null;
  }

  // ===== 校验汇总（对齐 spec §10） =====
  const startCnt = nodes.filter((n) => n.type === 'start').length;
  const endCnt = nodes.filter((n) => n.type === 'end').length;
  if (startCnt !== 1) errors.push(`开始节点应恰有 1 个，实际 ${startCnt}`);
  if (endCnt < 1) errors.push('至少需要一个结束节点');

  // 孤立节点检查：见下方 P2 补全校验（spec §10 #9，error 级）
  const inDeg: Record<string, number> = {};
  const outDeg: Record<string, number> = {};
  nodes.forEach((n) => { inDeg[n.id] = 0; outDeg[n.id] = 0; });
  edges.forEach((e) => { if (inDeg[e.to] !== undefined) inDeg[e.to]++; if (outDeg[e.from] !== undefined) outDeg[e.from]++; });

  // 网关必须有分支出口
  for (const n of nodes) {
    if ((n.type === 'exclusiveGateway' || n.type === 'parallelGateway') && outDeg[n.id] === 0) {
      errors.push(`网关 ${n.id} 缺少分支出口`);
    }
  }

  // ===== P2 补全：对齐 spec §10 剩余校验规则 =====

  // #1 字典名唯一：自定义字典重复定义覆盖先前值（保留字已在上方报错）
  // #17 Attr active 清单项 ∈ {sop,role,lv,time,kpi,m}
  if (attrActive) {
    const VALID_ATTR = ['sop', 'role', 'lv', 'time', 'kpi', 'm'];
    for (const k of attrActive) {
      if (!VALID_ATTR.includes(k)) errors.push(`Attr active 非法键 ${k}（应为 ${VALID_ATTR.join('/')}）`);
    }
    if (new Set(attrActive).size < attrActive.length) errors.push('Attr active 存在重复键（至多一条）');
  }

  // #18 Role(R[k]) 越界校验：Role 属性值若为 R[k] 形式，k 须在 R 字典界内
  if (dicts['R']) {
    for (const n of nodes) {
      const role = n.attrs?.role;
      if (!role) continue;
      const rm = String(role).match(/^R\[(\d+)\]$/);
      if (rm) {
        const k = parseInt(rm[1], 10);
        if (k < 0 || k >= dicts['R'].length) {
          errors.push(`节点 ${n.id} 的 Role(R[${k}]) 越界（R 字典仅 ${dicts['R'].length} 项）`);
        }
      }
    }
  }

  // #6 默认出口「否则 →」每节点至多一条
  const defaultsPerNode: Record<string, number> = {};
  for (const e of edges) if (e.default) defaultsPerNode[e.from] = (defaultsPerNode[e.from] || 0) + 1;
  for (const [frm, cnt] of Object.entries(defaultsPerNode)) {
    if (cnt > 1) errors.push(`节点 ${frm} 有 ${cnt} 条默认出口「否则」（每节点至多一条）`);
  }

  // #12 分支出口标签在同一节点内唯一（warn）
  const branchLabels: Record<string, Set<string>> = {};
  for (const e of edges) {
    if (!e.label) continue;
    if (!branchLabels[e.from]) branchLabels[e.from] = new Set();
    if (branchLabels[e.from].has(e.label)) warnings.push(`节点 ${e.from} 分支出口标签「${e.label}」重复（应唯一）`);
    else branchLabels[e.from].add(e.label);
  }

  // #13 环路须含至少一个判断节点（warn）：检测有向环，环上无 ?/+ 则告警
  // 简化：对每个 start 可达图做环检测，未包含网关的循环记 warn
  const isGateway = (id: string) => { const nn = nodes.find((x) => x.id === id); return !!nn && (nn.type === 'exclusiveGateway' || nn.type === 'parallelGateway'); };
  // 用 Kahn 剥离非环部分，剩余节点若在环上
  const indeg0: Record<string, number> = { ...inDeg };
  const gAdj: Record<string, string[]> = {};
  nodes.forEach((nn) => { gAdj[nn.id] = []; });
  edges.forEach((e) => { if (gAdj[e.from]) gAdj[e.from].push(e.to); });
  const queue = nodes.filter((nn) => indeg0[nn.id] === 0).map((nn) => nn.id);
  while (queue.length) {
    const u = queue.shift()!;
    for (const v of gAdj[u] || []) {
      indeg0[v] = (indeg0[v] || 0) - 1;
      if (indeg0[v] === 0) queue.push(v);
    }
  }
  const inCycle = nodes.filter((nn) => indeg0[nn.id] > 0);
  const noGwCycle = inCycle.some((nn) => !isGateway(nn.id));
  if (inCycle.length && noGwCycle) warnings.push('检测到不含判断节点的环路（回边应经过 ?/+ 网关）');

  // #14 修饰类节点（N/DATA）依附目标存在性：labelRef 若引用 ?[k] 且目标字典/项存在
  // （依附由 Attr 或 label 索引表达；此处校验 Role/Annotation cite 不越界）

  // #2 Location / 属性引用必须指向已定义字典（先 Dict 后使用）
  for (const n of nodes) {
    if (!n.cell) continue;
    for (const k of Object.keys(n.cell)) {
      if (!dicts[k]) errors.push(`节点 ${n.id} Location 引用未定义字典 ${k}`);
    }
  }
  // #15 自定义字典名不得与保留字 D/P/R 冲突：保留字定义冲突已在解析期报错；此处兜底检测外部 dicts 是否含违禁名（防御）
  for (const k of Object.keys(dicts)) {
    if (RESERVED.includes(k) && k !== 'D' && k !== 'P' && k !== 'R') {
      errors.push(`非法字典名 ${k}（D/P/R 为保留字）`);
    }
    // 字典名唯一：解析期已对同名重复覆盖报告，这里不再重复
  }
  // #11 子流程嵌套深度 ≤ 1：parent 不得再指向子流程内部
  for (const sp of subProcesses) {
    for (const nid of sp.nodes) {
      const nn = nodes.find((x) => x.id === nid);
      if (nn && nn.parent !== sp.id) errors.push(`子流程 ${sp.id} 内节点 ${nid} 嵌套层级异常（深度应 ≤ 1）`);
    }
  }
  // 孤立节点升级为 error（spec §10 #9）：无入边且非开始、或无出边且非结束
  for (const n of nodes) {
    if (n.type === 'annotation' || n.type === 'dataObject') continue;
    const noInNonStart = inDeg[n.id] === 0 && n.type !== 'start';
    const noOutNonEnd = outDeg[n.id] === 0 && n.type !== 'end' && n.type !== 'start';
    if ((noInNonStart && outDeg[n.id] === 0) || (noOutNonEnd && inDeg[n.id] === 0)) {
      // 完整孤立：无入无出（非注释类）→ error
      if (inDeg[n.id] === 0 && outDeg[n.id] === 0) {
        errors.push(`节点 ${n.id}（${n.label}）孤立（无入边且无出边）`);
      } else if (noInNonStart || noOutNonEnd) {
        warnings.push(`节点 ${n.id}（${n.label}）入/出边不完整`);
      }
    }
  }

  // #7 分支目标必须为可流转节点：目标为修饰类（N/DATA）报错
  for (const e of edges) {
    const tgt = nodes.find((nn) => nn.id === e.to);
    if (tgt && (tgt.type === 'annotation' || tgt.type === 'dataObject')) {
      errors.push(`分支/连线目标 ${e.to} 为修饰类节点（N/DATA），不可作为流转目标`);
    }
  }

  // 子流程 nodes 填充（由 parent 推导）
  for (const sp of subProcesses) {
    sp.nodes = nodes.filter((n) => n.parent === sp.id && n.id !== sp.id).map((n) => n.id);
  }

  const data: FlowData = {
    // 整图标题：Axis: 优先（page.title），否则用 Title:，最后回退
    title: axes.page.title || pageTitle,
    layout,
    dicts,
    lanes,
    axes,
    nodes,
    edges,
    subProcesses,
    artifacts,
    attrPanel: attrActive ? { active: attrActive } : null
  };

  return { data, styles: style, errors, warnings };

  // ===== helper 函数 =====

  function parseWLine(body: string, idDecl: string): FlowNode | null {
    // body: <标签> [Type[X]] [Location(...)] [Attr(...)]*
    const typeMatch = body.match(/Type\[([^\]]+)\]/i);
    let type: FlowNodeType = 'task';
    if (typeMatch) {
      const code = typeMatch[1].toUpperCase();
      type = typeCodeToNode(code);
    }
    // 移除 Type[...] 和 Location(...) 和 属性 之后剩下的即标签
    let rest = body.replace(/Type\[[^\]]*\]/i, ' ');
    // Location
    let cell: FlowNode['cell'] | null = null;
    const locMatch = rest.match(/Location\(\s*([^)]*)\)/i);
    if (locMatch) {
      cell = parseLocationCell(locMatch[1]);
      rest = rest.replace(/Location\([^)]*\)/i, ' ');
    }
    // attrs（先收集全部匹配，再统一移除，避免 exec+replace 索引失效）
    const attrs: Record<string, string> = {};
    const found: string[] = [];
    const attrRe = /([A-Za-z]+)\(\s*([^()]*?)\s*\)/g;
    let m;
    while ((m = attrRe.exec(rest)) !== null) {
      const key = m[1].toLowerCase();
      const value = m[2].trim();
      if (['sop', 'role', 'lv', 'time', 'kpi', 'm'].includes(key)) {
        attrs[key] = value;
        found.push(m[0]);
      }
    }
    for (const f of found) rest = rest.replace(f, ' ');
    // 解析格内 V/H 链式标注（节点尾部 `, V` 或 `, H`）
    let vh: 'V' | 'H' | undefined;
    const vhMatch = rest.match(/[,，\s]*([VH])\s*$/i);
    if (vhMatch) {
      const dir = vhMatch[1].toUpperCase();
      if (dir === 'V' || dir === 'H') {
        vh = dir;
        rest = rest.slice(0, vhMatch.index).replace(/[,，]\s*$/, '').trim();
      }
    }
    // 标签
    let label = rest.replace(/\s+/g, ' ').trim();
    if (!label) label = body.replace(/Type\[[^\]]*\]/gi, '').replace(/Location\([^)]*\)/gi, '').trim();
    // 字典引用标签: worker[0]
    let labelRef: string | null = null;
    if (label) {
      const refMatch = label.match(/^([A-Za-z_\u4e00-\u9fff][\w\u4e00-\u9fff]*)\[(\d+)\]$/);
      if (refMatch) {
        labelRef = `${refMatch[1]}[${refMatch[2]}]`;
        const dictVals = dicts[refMatch[1]];
        if (dictVals) {
          const idx = parseInt(refMatch[2], 10);
          if (idx >= 0 && idx < dictVals.length) label = dictVals[idx];
          else { errors.push(`标签引用 ${labelRef} 索引越界`); }
        }
      }
    }

    // id
    let id = idDecl || nextAutoId();
    if (nodeById.has(id) && id !== idDecl) {
      // 自动编号需保证唯一——但我们用 seq 递增，天然唯一
    }
    if (nodeById.has(id)) {
      // 显式 id 冲突
      errors.push(`节点 id ${id} 重复`);
    }

    const rec: FlowNode = { id, type, label, labelRef, cell, attrs, vh };
    return rec;
  }

  function parseLocationCell(locText: string): FlowNode['cell'] {
    // locText: D[0],P[1] 或 worker[2] 或 D[0]
    const cell: Record<string, number> = {};
    locText.split(',').forEach((part) => {
      const p = part.trim();
      const m2 = p.match(/^([A-Za-z_\u4e00-\u9fff][\w\u4e00-\u9fff]*)\[(\d+)\]$/);
      if (m2) {
        cell[m2[1]] = parseInt(m2[2], 10);
      }
    });
    return Object.keys(cell).length ? cell : null;
  }

  function parseBranchLine(lineText: string): { label: string; exitName?: string; cond?: string; targets: string[] } | null {
    // 形如: 是 (pass) [cond] → #w4, #w5
    const arrowIdx = lineText.indexOf('→');
    if (arrowIdx < 0) return null;
    const head = lineText.slice(0, arrowIdx).trim();
    const tail = lineText.slice(arrowIdx + 1).trim();
    const targets = tail.split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean);
    if (!targets.length) return null;

    let label = head;
    let exitName: string | undefined;
    let cond: string | undefined;
    const exitMatch = head.match(/\(([^)]+)\)/);
    if (exitMatch) { exitName = exitMatch[1]; label = label.replace(exitMatch[0], '').trim(); }
    const condMatch = head.match(/\[([^\]]+)\]/);
    if (condMatch) { cond = condMatch[1]; label = label.replace(condMatch[0], '').trim(); }
    label = label.trim();
    return { label, exitName, cond, targets };
  }

  function edgeLabelTag(label: string): string {
    // 中文标签 → 稳定 id 后缀；缺省 Y/N
    if (!label) return 'Y';
    if (label === '是' || label === '否' || label === 'yes' || label === 'no') return label === '是' || label === 'yes' ? 'Y' : 'N';
    return label.substring(0, 4);
  }

  function typeCodeToNode(code: string): FlowNodeType {
    switch (code) {
      case 'S': return 'start';
      case 'E': return 'end';
      case 'T': return 'task';
      case '?': return 'exclusiveGateway';
      case '+': return 'parallelGateway';
      case 'SUB': return 'subprocess';
      case 'N': return 'annotation';
      case 'DATA': return 'dataObject';
      default: return 'task';
    }
  }

  function slotToStyleKey(slot: string): string | undefined {
    const map: Record<string, string> = {
      'Start': 'startColor', 'StartText': 'startTextColor',
      'End': 'endColor', 'EndText': 'endTextColor',
      'Task': 'taskColor', 'Gateway': 'gatewayColor',
      'Parallel': 'parallelColor', 'Subprocess': 'subprocessColor',
      'Annotation': 'annotationColor', 'Data': 'dataColor',
      'Lane': 'laneColor', 'Axis': 'axisColor',
      'Line': 'lineColor', 'Text': 'textColor',
      'Label': 'labelFontSize', 'Node': 'nodeFontSize'
    };
    return map[slot] || undefined;
  }
}

/** 便捷：解析并返回渲染用数据（无内部 details） */
export function renderableFlow(data: FlowData): FlowData {
  return data;
}
