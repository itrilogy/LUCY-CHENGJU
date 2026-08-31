/**
 * IQS-Flow → BPMN 2.0 XML 导出（交换层，专业工具可导入）
 * 输入 FlowData，输出符合 BPMN 2.0 的 process + sequenceFlow + laneSet。
 * 作为独立里程碑接入：不参与主渲染，仅提供交换能力。
 */
import type { FlowData, FlowNode, FlowEdge, FlowChartStyles } from '../../types';
import { computeExcelLayout } from './flowToSVG.ts';

export function flowToBpmnXml(data: FlowData, styles?: FlowChartStyles): string {
  const procId = 'PROC_' + (sanitize(data.title || '') || 'flow');
  const nodes: string[] = [];
  const flows: string[] = [];
  const nodeTypeOf = (n: FlowNode): string =>
    n.type === 'start' ? 'startEvent'
    : n.type === 'end' ? 'endEvent'
    : n.type === 'exclusiveGateway' ? 'exclusiveGateway'
    : n.type === 'parallelGateway' ? 'parallelGateway'
    : n.type === 'annotation' ? 'textAnnotation'
    : n.type === 'dataObject' ? 'dataObjectReference'
    : n.type === 'subprocess' ? 'subProcess'
    : 'task';

  for (const n of data.nodes) {
    if (n.parent) {
      // 子流程内部：追加到其 subProcess 内（简化：本级 tooltip 不进嵌套结构）
      continue;
    }
    const name = (n.label || n.labelRef || n.id).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const attrs = `id="${idAttr(n.id)}"` + (name ? ` name="${name}"` : '');    if (n.type === 'subprocess') {
      const inner = data.nodes.filter((x) => x.parent === n.id);
      const innerXml = inner.map((k) => {
        const it = nodeTypeOf(k);
        const nm = (k.label || k.label || k.id).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `      <bpmn:${it} id="${k.id}" name="${nm}"/>`;
      }).join('\n');
      nodes.push(`    <bpmn:subProcess id="${n.id}" name="${name}">\n${innerXml}\n    </bpmn:subProcess>`);
    } else {
      nodes.push(`    <bpmn:${nodeTypeOf(n)} ${attrs}/>`);
    }
  }

  for (const e of data.edges) {
    if (e.parent) continue;
    const nm = (e.label || e.condition || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    flows.push(`    <bpmn:sequenceFlow id="${e.id}" sourceRef="${e.from}" targetRef="${e.to}"${nm ? ` name="${nm}"` : ''}${e.default ? ' isDefault="true"' : ''}/>`);
  }

  // 泳道：按横向泳道（部门）建 laneSet
  const laneSets: string[] = [];
  const hLanes = data.lanes.filter((l) => l.layout === 'H');
  if (hLanes.length) {
    const lanesXml = hLanes.map((l) => {
      const members = data.nodes
        .filter((n) => n.cell && n.cell[l.dict] !== undefined && !n.parent)
        .map((n) => `<bpmn:flowNodeRef>${n.id}</bpmn:flowNodeRef>`)
        .join('');
      return `        <bpmn:lane id="${l.dict}_${l.indices.join('_')}" name="${(data.dicts[l.dict] || [])[0] || l.dict}">\n          ${members}\n        </bpmn:lane>`;
    }).join('\n');
    laneSets.push(`    <bpmn:laneSet id="laneSet_H">\n${lanesXml}\n    </bpmn:laneSet>`);
  }

  // ===== BPMN DI（图形坐标）：复用布局引擎坐标，导出后可被专业工具按位置摆放 =====
  let diParts = '';
  try {
    const L = computeExcelLayout(data, styles ?? ({ nodeFontSize: 13 } as FlowChartStyles));
    const shapes: string[] = [];
    for (const [id, p] of L.nodePos) {
      if (p.n.parent) continue; // 子流程内部节点的 shape 不进顶层（由容器承载）
      shapes.push(`            <bpmndi:BPMNShape id="${'shape_' + id}" bpmnElement="${id}">
              <dc:Bounds x="${p.x - p.W / 2}" y="${p.y - p.H / 2}" width="${p.W}" height="${p.H}"/>
            </bpmndi:BPMNShape>`);
    }
    const edgesDi: string[] = [];
    for (const e of data.edges) {
      if (e.parent) continue;
      // 简化：以源/目标中心为 waypoint（无实际折线坐标的兜底）
      const s = L.nodePos.get(e.from), t = L.nodePos.get(e.to);
      if (!s || !t) continue;
      edgesDi.push(`            <bpmndi:BPMNEdge id="${'bpmnEdge_' + e.id}" bpmnElement="${e.id}">
              <di:waypoint x="${s.x}" y="${s.y}"/>
              <di:waypoint x="${t.x}" y="${t.y}"/>
            </bpmndi:BPMNEdge>`);
    }
    diParts = `  <bpmndi:BPMNDiagram id="diagram_${procId}" bpmnElement="${procId}">
    <bpmndi:BPMNPlane id="plane_${procId}" bpmnElement="${procId}">
${shapes.join('\n')}
${edgesDi.join('\n')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>`;
  } catch {
    // 布局引擎不可用时省略 DI（保持交换能力降级）
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="def_${procId}" targetNamespace="urn:iqs:flow">
  <bpmn:process id="${procId}" isExecutable="false">
${nodes.join('\n')}
${flows.join('\n')}
${laneSets.join('\n')}
  </bpmn:process>
  <bpmn:collaboration id="coll_${procId}">
    <bpmn:participant id="participant_flow" processRef="${procId}"/>
  </bpmn:collaboration>
${diParts}
</bpmn:definitions>
`;
}

function idAttr(id: string): string {
  return id.replace(/[^A-Za-z0-9_.-]/g, '_');
}
function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9]/g, '');
}
