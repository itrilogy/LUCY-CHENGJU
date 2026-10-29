/**
 * 鱼骨图 SVG 直出。输入是 computeDeterministicFishboneLayout 的 nodes/edges，
 * 文字坐标直接取节点 style，连线带几何定向三角箭头，与 FishboneDiagram.tsx 100% 像素级一致。
 */
import { textBoxOfNode } from './fishboneGraph.ts';

interface Node { id: string; type?: string; style: any }
interface Edge { id: string; source: string; target: string; style?: any }

const MARGIN = 24;

function esc(s: string): string {
    return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export function renderFishboneSVG(
    nodes: Node[],
    edges: Edge[],
    width = 1600,
    height = 1000,
    backgroundColor = '#ffffff'
): { svg: string; width: number; height: number; viewBox: string } {
    const byId = new Map(nodes.map(n => [n.id, n]));
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of nodes) {
        const b = textBoxOfNode(n.style);
        if (b) {
            x1 = Math.min(x1, b.x1); y1 = Math.min(y1, b.y1);
            x2 = Math.max(x2, b.x2); y2 = Math.max(y2, b.y2);
        }
        if (n.type === 'rect' && Array.isArray(n.style?.size)) {
            const [rw, rh] = n.style.size as [number, number];
            x1 = Math.min(x1, n.style.x - rw / 2); y1 = Math.min(y1, n.style.y - rh / 2);
            x2 = Math.max(x2, n.style.x + rw / 2); y2 = Math.max(y2, n.style.y + rh / 2);
        } else {
            x1 = Math.min(x1, n.style.x); y1 = Math.min(y1, n.style.y);
            x2 = Math.max(x2, n.style.x); y2 = Math.max(y2, n.style.y);
        }
    }
    if (!Number.isFinite(x1)) { x1 = 0; y1 = 0; x2 = width || 800; y2 = height || 600; }

    const vx = Math.floor(x1 - MARGIN);
    const vy = Math.floor(y1 - MARGIN);
    const vw = Math.max(200, Math.ceil(x2 - x1 + MARGIN * 2));
    const vh = Math.max(150, Math.ceil(y2 - y1 + MARGIN * 2));
    const viewBox = `${vx} ${vy} ${vw} ${vh}`;

    const parts: string[] = [];
    if (backgroundColor && backgroundColor !== 'transparent') {
        parts.push(`<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${esc(backgroundColor)}"/>`);
    }

    for (const e of edges) {
        const s = byId.get(e.source), t = byId.get(e.target);
        if (!s || !t) continue;
        const color = e.style?.stroke ?? '#334155';
        const w = e.style?.lineWidth ?? 1;
        const sx = s.style.x, sy = s.style.y, tx = t.style.x, ty = t.style.y;
        const len = Math.hypot(tx - sx, ty - sy) || 1;
        const ux = (tx - sx) / len, uy = (ty - sy) / len;
        const size = Math.max(6, w * 3);
        const ax = sx + ux * size, ay = sy + uy * size;
        const px = -uy * size * 0.55, py = ux * size * 0.55;
        parts.push(`<line x1="${ax}" y1="${ay}" x2="${tx}" y2="${ty}" stroke="${esc(color)}" stroke-width="${w}"/>`);
        parts.push(`<polygon points="${sx},${sy} ${ax + px},${ay + py} ${ax - px},${ay - py}" fill="${esc(color)}"/>`);
    }

    for (const n of nodes) {
        const st = n.style;
        const isRect = n.type === 'rect' && Array.isArray(st.size);
        if (isRect) {
            const [w, h] = st.size as [number, number];
            parts.push(
                `<rect x="${st.x - w / 2}" y="${st.y - h / 2}" width="${w}" height="${h}" rx="${st.radius ?? 0}" fill="${esc(st.fill ?? 'none')}" stroke="${esc(st.stroke ?? 'none')}" stroke-width="${st.lineWidth ?? 0}"/>`
            );
        }
        const box = textBoxOfNode(st);
        if (box && st.labelText) {
            const text = String(st.labelText);
            const fs = st.labelFontSize ?? (isRect ? 14 : 12);
            const fw = st.labelFontWeight ?? 'normal';
            const cx = (box.x1 + box.x2) / 2;
            const cy = (box.y1 + box.y2) / 2;
            const lines = text.split('\n');
            const lh = st.labelLineHeight ?? fs * 1.25;
            lines.forEach((line, i) => {
                const y = cy - ((lines.length - 1) * lh) / 2 + i * lh;
                parts.push(
                    `<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="${fw}" fill="${esc(st.labelFill ?? '#1e293b')}" font-family="sans-serif">${esc(line)}</text>`
                );
            });
        }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="${viewBox}">${parts.join('')}</svg>`;
    return { svg, width: vw, height: vh, viewBox };
}
