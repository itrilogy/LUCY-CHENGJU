/**
 * 鱼骨图 SVG 直出。输入是 computeDeterministicFishboneLayout 的 nodes/edges，
 * 文字坐标直接取节点 style，不再经过 G6 的 label placement。
 */
import { textBoxOfNode } from './fishboneGraph.ts';

interface Node { id: string; type?: string; style: any }
interface Edge { id: string; source: string; target: string; style?: any }

function esc(s: string): string {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export function renderFishboneSVG(nodes: Node[], edges: Edge[], width: number, height: number): string {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const parts: string[] = [];
    for (const e of edges) {
        const s = byId.get(e.source), t = byId.get(e.target);
        if (!s || !t) continue;
        const color = e.style?.stroke ?? '#334155';
        const w = e.style?.lineWidth ?? 1;
        parts.push(`<line x1="${s.style.x}" y1="${s.style.y}" x2="${t.style.x}" y2="${t.style.y}" stroke="${color}" stroke-width="${w}"/>`);
    }
    for (const n of nodes) {
        const st = n.style;
        if (n.type === 'rect' && Array.isArray(st.size)) {
            const [w, h] = st.size as [number, number];
            parts.push(`<rect x="${st.x - w / 2}" y="${st.y - h / 2}" width="${w}" height="${h}" rx="${st.radius ?? 0}" fill="${st.fill ?? 'none'}" stroke="${st.stroke ?? 'none'}"/>`);
        }
        const box = textBoxOfNode(st);
        if (box && st.labelText) {
            const text = String(st.labelText);
            const fs = st.labelFontSize ?? (n.type === 'rect' ? 14 : 12);
            const cx = (box.x1 + box.x2) / 2;
            const cy = (box.y1 + box.y2) / 2;
            const lines = text.split('\n');
            const lh = st.labelLineHeight ?? fs * 1.25;
            lines.forEach((line, i) => {
                const y = cy - ((lines.length - 1) * lh) / 2 + i * lh;
                parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" fill="${st.labelFill ?? '#1e293b'}">${esc(line)}</text>`);
            });
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
}
