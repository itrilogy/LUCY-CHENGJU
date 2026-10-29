/**
 * 过程决策程序图（PDPC Diagram）纯函数 SVG 字符串渲染器
 *
 * 消费 `computePDPCGeometry` 的几何清单（PDPCGeometrySpec SSOT），
 * 零 DOM / 零 G6 依赖，支持：
 * - 阶段分组框（Group/Combo 虚线圆角泳带 + 顶部阶段徽章）
 * - 正交圆角走线（拐角 Q 二次贝塞尔平滑）+ 实心箭头 + `[OK]`/`[NG]` 胶囊标签
 * - 四类语义节点（`pill` 起点胶囊 / `rect` 步骤 / `hexagon` 六边形对策 / `double-rect` 双框终点）
 * - 图表主标题内嵌直出
 */
import type { PDPCData, PDPCChartStyles } from '../types.ts';
import {
    computePDPCGeometry,
    type PDPCGeometrySpec,
    type PDPCGeometryEdge,
    type PDPCGeometryNode,
} from './pdpcGraph.ts';

const MARGIN = 32;

function esc(s: string): string {
    return String(s ?? '').replace(/[&<>"]/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
    }[c]!));
}

/**
 * 将正交折线点列转换为带圆角（radius=6）的 SVG path `d` 字符串，并计算末端箭头多边形
 */
export function buildOrthogonalPathAndArrow(edge: PDPCGeometryEdge): {
    pathD: string;
    arrowPoints: string;
} {
    const pts = edge.pathPoints;
    if (pts.length < 2) {
        return { pathD: '', arrowPoints: '' };
    }

    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const segLen = Math.hypot(dx, dy) || 1;
    const ux = dx / segLen;
    const uy = dy / segLen;

    const arrowLen = Math.max(9, edge.lineWidth * 4.5);
    const arrowHalfW = arrowLen * 0.52;

    const baseX = last.x - ux * arrowLen;
    const baseY = last.y - uy * arrowLen;
    const px = -uy * arrowHalfW;
    const py = ux * arrowHalfW;

    const arrowPoints = `${last.x.toFixed(2)},${last.y.toFixed(2)} ${(baseX + px).toFixed(2)},${(baseY + py).toFixed(2)} ${(baseX - px).toFixed(2)},${(baseY - py).toFixed(2)}`;

    // 路径终点缩退到箭头底边中心，防止粗线条穿透箭头尖端
    const effPts = pts.map((p, i) => (i === pts.length - 1 ? { x: baseX, y: baseY } : p));

    if (effPts.length === 2) {
        return {
            pathD: `M ${effPts[0].x.toFixed(2)} ${effPts[0].y.toFixed(2)} L ${effPts[1].x.toFixed(2)} ${effPts[1].y.toFixed(2)}`,
            arrowPoints,
        };
    }

    const r = 6;
    const cmds: string[] = [`M ${effPts[0].x.toFixed(2)} ${effPts[0].y.toFixed(2)}`];
    for (let i = 1; i < effPts.length - 1; i++) {
        const p0 = effPts[i - 1];
        const p1 = effPts[i];
        const p2 = effPts[i + 1];
        const v1x = p1.x - p0.x, v1y = p1.y - p0.y;
        const v2x = p2.x - p1.x, v2y = p2.y - p1.y;
        const l1 = Math.hypot(v1x, v1y);
        const l2 = Math.hypot(v2x, v2y);
        const cr = Math.min(r, l1 / 2, l2 / 2);
        if (cr < 1) {
            cmds.push(`L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`);
        } else {
            const inX = p1.x - (v1x / l1) * cr;
            const inY = p1.y - (v1y / l1) * cr;
            const outX = p1.x + (v2x / l2) * cr;
            const outY = p1.y + (v2y / l2) * cr;
            cmds.push(`L ${inX.toFixed(2)} ${inY.toFixed(2)}`);
            cmds.push(`Q ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ${outX.toFixed(2)} ${outY.toFixed(2)}`);
        }
    }
    const endPt = effPts[effPts.length - 1];
    cmds.push(`L ${endPt.x.toFixed(2)} ${endPt.y.toFixed(2)}`);

    return {
        pathD: cmds.join(' '),
        arrowPoints,
    };
}

/**
 * 计算六边形（对策节点 `countermeasure`）顶点字符串
 */
export function getHexagonPoints(nd: PDPCGeometryNode): string {
    const x0 = nd.x - nd.width / 2;
    const x1 = nd.x + nd.width / 2;
    const y0 = nd.y - nd.height / 2;
    const y1 = nd.y + nd.height / 2;
    const cut = 14;
    return [
        `${x0 + cut},${y0}`,
        `${x1 - cut},${y0}`,
        `${x1},${nd.y}`,
        `${x1 - cut},${y1}`,
        `${x0 + cut},${y1}`,
        `${x0},${nd.y}`,
    ].join(' ');
}

/**
 * 由 `PDPCGeometrySpec` 生成完整 `<svg>` 字符串
 */
export function renderPDPCGeometryToSVG(
    spec: PDPCGeometrySpec,
    backgroundColor = '#ffffff',
): { svg: string; width: number; height: number; viewBox: string } {
    const { bbox, groups, nodes, edges, title } = spec;
    const vx = bbox.x1 - MARGIN;
    const vy = bbox.y1 - MARGIN;
    const vw = Math.max(200, bbox.x2 - bbox.x1 + MARGIN * 2);
    const vh = Math.max(150, bbox.y2 - bbox.y1 + MARGIN * 2);
    const viewBox = `${vx} ${vy} ${vw} ${vh}`;

    const parts: string[] = [];

    if (backgroundColor && backgroundColor !== 'transparent') {
        parts.push(`<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${esc(backgroundColor)}"/>`);
    }

    if (title && title.text) {
        parts.push(
            `<text x="${title.x}" y="${title.y}" text-anchor="middle" dominant-baseline="middle" font-size="${title.fontSize}" font-weight="bold" fill="${esc(title.color)}" font-family="sans-serif">${esc(title.text)}</text>`
        );
    }

    // 1. 阶段分组框（Combos/Groups）
    for (const grp of groups) {
        parts.push(
            `<rect x="${grp.x}" y="${grp.y}" width="${grp.width}" height="${grp.height}" rx="10" fill="${esc(grp.fill)}" fill-opacity="0.7" stroke="${esc(grp.stroke)}" stroke-width="1.5" stroke-dasharray="6,4"/>`
        );
        parts.push(
            `<text x="${grp.x + grp.width / 2}" y="${grp.y + 18}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="bold" fill="${esc(grp.labelColor)}" font-family="sans-serif">${esc(grp.label)}</text>`
        );
    }

    // 2. 正交连线、箭头与 [OK]/[NG] 标签
    for (const edge of edges) {
        const { pathD, arrowPoints } = buildOrthogonalPathAndArrow(edge);
        if (!pathD) continue;
        const dashAttr = edge.dashed ? ` stroke-dasharray="6,4"` : '';
        parts.push(
            `<path d="${pathD}" fill="none" stroke="${esc(edge.stroke)}" stroke-width="${edge.lineWidth}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}/>`
        );
        parts.push(`<polygon points="${arrowPoints}" fill="${esc(edge.stroke)}"/>`);
        if (edge.label) {
            const lb = edge.label;
            parts.push(
                `<rect x="${lb.x - lb.width / 2}" y="${lb.y - lb.height / 2}" width="${lb.width}" height="${lb.height}" rx="4" fill="${esc(lb.bgColor)}" stroke="${esc(lb.borderColor)}" stroke-width="1"/>`
            );
            parts.push(
                `<text x="${lb.x}" y="${lb.y}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="bold" fill="${esc(lb.color)}" font-family="sans-serif">${esc(lb.text)}</text>`
            );
        }
    }

    // 3. 四类语义节点与居中文字
    for (const nd of nodes) {
        if (nd.shape === 'hexagon') {
            parts.push(
                `<polygon points="${getHexagonPoints(nd)}" fill="${esc(nd.fill)}" stroke="${esc(nd.stroke)}" stroke-width="1.5"/>`
            );
        } else if (nd.shape === 'double-rect') {
            parts.push(
                `<rect x="${nd.x - nd.width / 2}" y="${nd.y - nd.height / 2}" width="${nd.width}" height="${nd.height}" rx="${nd.rx}" fill="${esc(nd.fill)}" stroke="${esc(nd.stroke)}" stroke-width="2"/>`
            );
            parts.push(
                `<rect x="${nd.x - nd.width / 2 + 3.5}" y="${nd.y - nd.height / 2 + 3.5}" width="${nd.width - 7}" height="${nd.height - 7}" rx="${Math.max(4, nd.rx - 3)}" fill="none" stroke="${esc(nd.stroke)}" stroke-width="1"/>`
            );
        } else {
            parts.push(
                `<rect x="${nd.x - nd.width / 2}" y="${nd.y - nd.height / 2}" width="${nd.width}" height="${nd.height}" rx="${nd.rx}" fill="${esc(nd.fill)}" stroke="${esc(nd.stroke)}" stroke-width="1.5"/>`
            );
        }
        parts.push(
            `<text x="${nd.x}" y="${nd.y}" text-anchor="middle" dominant-baseline="central" font-size="${nd.fontSize}" font-weight="600" fill="${esc(nd.textColor)}" font-family="sans-serif">${esc(nd.label)}</text>`
        );
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="${viewBox}">${parts.join('')}</svg>`;
    return { svg, width: vw, height: vh, viewBox };
}

/**
 * PDPC 纯函数 SVG 渲染入口
 */
export function renderPDPCSVG(
    data: PDPCData,
    styles?: Partial<PDPCChartStyles>,
): { svg: string; width: number; height: number; spec: PDPCGeometrySpec } {
    const spec = computePDPCGeometry(data, styles);
    const rendered = renderPDPCGeometryToSVG(spec, '#ffffff');
    return {
        svg: rendered.svg,
        width: rendered.width,
        height: rendered.height,
        spec,
    };
}
