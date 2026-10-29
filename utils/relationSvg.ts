/**
 * 关联图（Relation Diagram）纯函数 SVG 字符串渲染器
 *
 * 消费 `computeRelationGeometry` 的几何清单（Geometry Spec SSOT），
 * 零 DOM / 零 G6 依赖，直接生成确定性 SVG 字符串，供前端与 MCP Tier-1 直出共用。
 */
import type { RelationNode, RelationLink, RelationChartStyles } from '../types.ts';
import {
    computeRelationGeometry,
    type RelationGeometrySpec,
    type RelationGeometryEdge,
} from './relationGraph.ts';

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
 * 计算有向边末端实心三角箭头的多边形顶点及缩退后的线段终点
 */
export function computeEdgeArrowGeometry(edge: RelationGeometryEdge): {
    lineEndX: number;
    lineEndY: number;
    arrowPoints: string;
} {
    const fromX = edge.controlPoint ? edge.controlPoint.cx : edge.x1;
    const fromY = edge.controlPoint ? edge.controlPoint.cy : edge.y1;
    const dx = edge.x2 - fromX;
    const dy = edge.y2 - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    const arrowLen = Math.max(9, edge.lineWidth * 4.5);
    const arrowHalfW = arrowLen * 0.52;

    const baseX = edge.x2 - ux * arrowLen;
    const baseY = edge.y2 - uy * arrowLen;
    const px = -uy * arrowHalfW;
    const py = ux * arrowHalfW;

    const p1 = `${edge.x2.toFixed(2)},${edge.y2.toFixed(2)}`;
    const p2 = `${(baseX + px).toFixed(2)},${(baseY + py).toFixed(2)}`;
    const p3 = `${(baseX - px).toFixed(2)},${(baseY - py).toFixed(2)}`;

    return {
        lineEndX: Number(baseX.toFixed(2)),
        lineEndY: Number(baseY.toFixed(2)),
        arrowPoints: `${p1} ${p2} ${p3}`,
    };
}

/**
 * 由 `RelationGeometrySpec` 生成完整 `<svg>` 字符串与推荐像素宽高
 */
export function renderRelationGeometryToSVG(
    spec: RelationGeometrySpec,
    backgroundColor = '#ffffff',
): { svg: string; width: number; height: number; viewBox: string } {
    const { bbox, nodes, edges, title } = spec;
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

    // 1. 绘制因果有向边与实心三角箭头
    for (const edge of edges) {
        const { lineEndX, lineEndY, arrowPoints } = computeEdgeArrowGeometry(edge);
        if (edge.controlPoint) {
            const d = `M ${edge.x1} ${edge.y1} Q ${edge.controlPoint.cx} ${edge.controlPoint.cy} ${lineEndX} ${lineEndY}`;
            parts.push(
                `<path d="${d}" fill="none" stroke="${esc(edge.stroke)}" stroke-width="${edge.lineWidth}" stroke-linecap="round"/>`
            );
        } else {
            parts.push(
                `<line x1="${edge.x1}" y1="${edge.y1}" x2="${lineEndX}" y2="${lineEndY}" stroke="${esc(edge.stroke)}" stroke-width="${edge.lineWidth}" stroke-linecap="round"/>`
            );
        }
        parts.push(`<polygon points="${arrowPoints}" fill="${esc(edge.stroke)}"/>`);
    }

    // 2. 绘制节点（椭圆 / 圆角矩形）与居中文本
    for (const nd of nodes) {
        if (nd.shape === 'rect') {
            parts.push(
                `<rect x="${nd.x - nd.width / 2}" y="${nd.y - nd.height / 2}" width="${nd.width}" height="${nd.height}" rx="${nd.rx}" fill="${esc(nd.fill)}" stroke="${esc(nd.stroke)}" stroke-width="1.5"/>`
            );
        } else {
            parts.push(
                `<ellipse cx="${nd.x}" cy="${nd.y}" rx="${nd.width / 2}" ry="${nd.height / 2}" fill="${esc(nd.fill)}" stroke="${esc(nd.stroke)}" stroke-width="1.5"/>`
            );
        }
        parts.push(
            `<text x="${nd.x}" y="${nd.y}" text-anchor="middle" dominant-baseline="central" font-size="${nd.fontSize}" font-weight="${nd.fontWeight}" fill="${esc(nd.textColor)}" font-family="sans-serif">${esc(nd.label)}</text>`
        );
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="${viewBox}">${parts.join('')}</svg>`;
    return { svg, width: vw, height: vh, viewBox };
}

/**
 * 关联图纯函数 SVG 渲染入口
 */
export function renderRelationSVG(
    nodes: readonly RelationNode[],
    links: readonly RelationLink[],
    styles?: Partial<RelationChartStyles>,
    width = 1200,
    height = 800,
): { svg: string; width: number; height: number; spec: RelationGeometrySpec } {
    const spec = computeRelationGeometry(nodes, links, styles, width, height);
    const rendered = renderRelationGeometryToSVG(spec, '#ffffff');
    return {
        svg: rendered.svg,
        width: rendered.width,
        height: rendered.height,
        spec,
    };
}
