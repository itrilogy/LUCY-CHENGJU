/**
 * IQS-DSL 纯函数解析器总汇（R33 / AUD-200）
 *
 * 设计目的：
 * 1. 将 16 类图表的纯文本 DSL 解析器与 UI 编辑器组件 (`*Editor.tsx`) 彻底解耦，
 *    使 `App.tsx` 首屏无需静态加载全量编辑器与图表引擎即可完成默认示例及 Headless URL 初始化；
 * 2. 遵循 AUD-193 约束：零 React 依赖、零运行时 Enum 导入，可安全在浏览器与 SSR/CLI 脚本中同构运行。
 */
import {
    DEFAULT_AFFINITY_STYLES,
    DEFAULT_ARROW_STYLES,
    DEFAULT_BASIC_STYLES,
    DEFAULT_FISHBONE_STYLES,
    DEFAULT_HISTOGRAM_STYLES,
    DEFAULT_MATRIX_PLOT_STYLES,
    DEFAULT_MATRIX_STYLES,
    DEFAULT_PARETO_STYLES,
    DEFAULT_RADAR_STYLES,
    DEFAULT_SCATTER_STYLES,
    DEFAULT_VCHART_STYLES,
    type AffinityChartStyles,
    type AffinityItem,
    type ArrowChartStyles,
    type ArrowData,
    type ArrowLink,
    type ArrowNode,
    type BasicChartDataset,
    type BasicChartStyles,
    type ControlChartStyles,
    type ControlChartType,
    type ControlRule,
    type ControlSeries,
    type FishboneChartStyles,
    type FishboneNode,
    type HistogramChartStyles,
    type MatrixAxis,
    type MatrixChartStyles,
    type MatrixData,
    type MatrixPlotData,
    type MatrixPlotStyles,
    type MatrixSymbolType,
    type ParetoChartStyles,
    type ParetoItem,
    type RadarChartStyles,
    type ScatterChartStyles,
    type ScatterPoint,
    type VChartAnimationMode,
    type VChartChartStyles,
} from '../types';
import { genId } from '../utils/id';

export { parseRelationDSL } from '../utils/relationGraph';
export { parsePDPCDSL } from '../utils/pdpcGraph';
export { parseFlowDSL, parseFlowDSLWithDetails } from '../components/flow/FlowParser';

/* ────────────────────── 1. 鱼骨图 (Fishbone) ────────────────────── */

export const parseFishboneDSL = (
    content: string,
    baseStyles: FishboneChartStyles = DEFAULT_FISHBONE_STYLES
) => {
    const lines = content.split('\n');
    const newStyles: FishboneChartStyles = { ...baseStyles };
    let title = '鱼骨图分析';
    const nodes: FishboneNode[] = [];
    const stack: { node: FishboneNode; level: number }[] = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        const colorMatch = trimmed.match(
            /Color\[(Root|RootText|Main|MainText|Bone|Line|Text|End)\]:\s*(#[0-9a-fA-F]+)/i
        );
        if (colorMatch) {
            let key = colorMatch[1].toLowerCase();
            if (key === 'root') key = 'rootColor';
            if (key === 'roottext') key = 'rootTextColor';
            if (key === 'main') key = 'mainColor';
            if (key === 'maintext') key = 'mainTextColor';
            if (key === 'bone') key = 'boneLine';
            if (key === 'line') key = 'caseLine';
            if (key === 'text') key = 'caseColor';
            (newStyles as any)[key] = colorMatch[2];
            return;
        }

        if (trimmed.startsWith('Title:')) {
            title = trimmed.replace('Title:', '').trim();
            return;
        }

        const headerMatch = trimmed.match(/^(#+)\s+(.+)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const label = headerMatch[2].trim();
            const newNode: FishboneNode = {
                id: genId('node'),
                label,
                type: level === 1 ? 'main' : 'sub',
                children: [],
            };

            if (level === 1) {
                nodes.push(newNode);
                stack.length = 0;
                stack.push({ node: newNode, level });
            } else {
                while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                    stack.pop();
                }
                if (stack.length > 0) {
                    const parent = stack[stack.length - 1].node;
                    if (!parent.children) parent.children = [];
                    parent.children.push(newNode);
                    stack.push({ node: newNode, level });
                }
            }
        }
    });

    const root: FishboneNode = { id: 'root', label: title, type: 'root', children: nodes };
    return { data: root, styles: newStyles };
};

/* ────────────────────── 2. 排列图 (Pareto) ────────────────────── */

export const parseParetoDSL = (
    content: string,
    baseStyles: ParetoChartStyles = DEFAULT_PARETO_STYLES
) => {
    const lines = content.split('\n');
    const newItems: ParetoItem[] = [];
    const newStyles: ParetoChartStyles = { ...baseStyles };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        const titleMatch = trimmed.match(/^Title:\s*(.+)/);
        if (titleMatch) {
            newStyles.title = titleMatch[1];
            return;
        }

        const decimalMatch = trimmed.match(/^Decimals:\s*(\d+)/);
        if (decimalMatch) {
            newStyles.decimals = parseInt(decimalMatch[1]);
            return;
        }

        const showValuesMatch = trimmed.match(/^ShowValues:\s*(true|false)/i);
        if (showValuesMatch) {
            newStyles.showValues = showValuesMatch[1].toLowerCase() === 'true';
            return;
        }

        const colorMatch = trimmed.match(/Color\[(Bar|Line|MarkLine|Title)\]:\s*(#[0-9a-fA-F]+)/);
        if (colorMatch) {
            const key = colorMatch[1].charAt(0).toLowerCase() + colorMatch[1].slice(1) + 'Color';
            (newStyles as any)[key] = colorMatch[2];
            return;
        }

        const fontMatch = trimmed.match(/Font\[(Title|Base|Bar|Line)\]:\s*(\d+)/);
        if (fontMatch) {
            const key = fontMatch[1].charAt(0).toLowerCase() + fontMatch[1].slice(1) + 'FontSize';
            (newStyles as any)[key] = parseInt(fontMatch[2]);
            return;
        }

        const itemMatch = trimmed.match(/^-\s*(.+):\s*([\d.]+)/);
        if (itemMatch) {
            const val = parseFloat(itemMatch[2]);
            if (!isNaN(val)) {
                newItems.push({ id: genId('item'), name: itemMatch[1].trim(), value: val });
            }
        }
    });

    return { items: newItems, styles: newStyles };
};

/* ────────────────────── 3. 直方图 (Histogram) ────────────────────── */

export const parseHistogramDSL = (
    content: string,
    baseStyles: HistogramChartStyles = DEFAULT_HISTOGRAM_STYLES
) => {
    const lines = content.split('\n');
    const newData: number[] = [];
    const newStyles: HistogramChartStyles = { ...baseStyles };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        const titleMatch = trimmed.match(/^Title:\s*(.+)/);
        if (titleMatch) {
            newStyles.title = titleMatch[1].trim();
            return;
        }

        const colorMatch = trimmed.match(/Color\[(Bar|Curve|USL|LSL|Target)\]:\s*(#[0-9a-fA-F]+)/i);
        if (colorMatch) {
            const key = colorMatch[1].toLowerCase() + 'Color';
            (newStyles as any)[key] = colorMatch[2];
            return;
        }

        const uslMatch = trimmed.match(/^USL:\s*([\d.-]+)/);
        if (uslMatch) {
            newStyles.usl = parseFloat(uslMatch[1]);
            return;
        }
        const lslMatch = trimmed.match(/^LSL:\s*([\d.-]+)/);
        if (lslMatch) {
            newStyles.lsl = parseFloat(lslMatch[1]);
            return;
        }
        const targetMatch = trimmed.match(/^Target:\s*([\d.-]+)/);
        if (targetMatch) {
            newStyles.target = parseFloat(targetMatch[1]);
            return;
        }

        const binsMatch = trimmed.match(/^Bins:\s*(auto|\d+)/i);
        if (binsMatch) {
            newStyles.bins = binsMatch[1].toLowerCase() === 'auto' ? 'auto' : parseInt(binsMatch[1]);
            return;
        }

        const curveMatch = trimmed.match(/^ShowCurve:\s*(true|false)/i);
        if (curveMatch) {
            newStyles.showCurve = curveMatch[1].toLowerCase() === 'true';
            return;
        }

        const showValuesMatch = trimmed.match(/^ShowValues:\s*(true|false)/i);
        if (showValuesMatch) {
            newStyles.showValues = showValuesMatch[1].toLowerCase() === 'true';
            return;
        }

        const dataMatch = trimmed.match(/^-\s*([\d.-]+)/);
        if (dataMatch) {
            const v = parseFloat(dataMatch[1]);
            if (!isNaN(v)) newData.push(v);
        }
    });

    return { data: newData, styles: newStyles };
};

/* ────────────────────── 4. 散点图 (Scatter) ────────────────────── */

export const parseScatterDSL = (
    content: string,
    baseStyles: ScatterChartStyles = DEFAULT_SCATTER_STYLES
) => {
    const lines = content.split('\n');
    const newStyles: ScatterChartStyles = { ...baseStyles };
    const newPoints: ScatterPoint[] = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (trimmed.includes(':') && !trimmed.startsWith('-')) {
            const [key, ...vals] = trimmed.split(':');
            const val = vals.join(':').trim();

            switch (key.trim()) {
                case 'Title':
                    newStyles.title = val;
                    break;
                case 'XAxis':
                    newStyles.xAxisLabel = val;
                    break;
                case 'YAxis':
                    newStyles.yAxisLabel = val;
                    break;
                case 'ZAxis':
                    newStyles.zAxisLabel = val;
                    break;
                case 'Color[Point]':
                    newStyles.pointColor = val;
                    break;
                case 'Color[Trend]':
                    newStyles.trendColor = val;
                    break;
                case 'ShowTrend':
                    newStyles.showTrend = val.toLowerCase() === 'true';
                    break;
                case '3D':
                case 'Show3D':
                    newStyles.is3D = val.toLowerCase() === 'true';
                    break;
                case 'Size[Base]':
                    newStyles.baseSize = parseFloat(val);
                    break;
                case 'Opacity':
                    newStyles.opacity = parseFloat(val);
                    break;
                case 'ShowValues':
                    newStyles.showValues = val.toLowerCase() === 'true';
                    break;
            }
            return;
        }

        if (trimmed.startsWith('-')) {
            const parts = trimmed
                .substring(1)
                .split(',')
                .map(s => parseFloat(s.trim()));
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                newPoints.push({
                    id: genId('pt'),
                    x: parts[0],
                    y: parts[1],
                    z: parts[2],
                });
            }
        }
    });

    return { data: newPoints, styles: newStyles };
};

/* ────────────────────── 5. 亲和图 (Affinity) ────────────────────── */

export const parseAffinityDSL = (
    content: string,
    baseStyles: AffinityChartStyles = DEFAULT_AFFINITY_STYLES
) => {
    const lines = content.split('\n');
    const newStyles: any = { ...baseStyles };
    const items: AffinityItem[] = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (trimmed.startsWith('Title:')) {
            newStyles.title = trimmed.replace('Title:', '').trim();
            return;
        }
        if (trimmed.startsWith('Type:')) {
            newStyles.type = trimmed.replace('Type:', '').trim();
            return;
        }
        if (trimmed.startsWith('Layout:')) {
            newStyles.layout = trimmed.replace('Layout:', '').trim();
            return;
        }

        const colorMatch = trimmed.match(
            /Color\[(TitleBg|TitleText|GroupHeaderBg|GroupHeaderText|ItemBg|ItemText|Line|Border)\]:\s*(#[0-9a-fA-F]+)/i
        );
        if (colorMatch) {
            const keyMap: any = {
                TitleBg: 'titleBackgroundColor',
                TitleText: 'titleTextColor',
                GroupHeaderBg: 'groupHeaderBackgroundColor',
                GroupHeaderText: 'groupHeaderTextColor',
                ItemBg: 'itemBackgroundColor',
                ItemText: 'itemTextColor',
                Line: 'lineColor',
                Border: 'borderColor',
            };
            newStyles[keyMap[colorMatch[1]]] = colorMatch[2];
            return;
        }

        const fontMatch = trimmed.match(/Font\[(Title|GroupHeader|Item)\]:\s*(\d+)/i);
        if (fontMatch) {
            const keyMap: any = {
                Title: 'titleFontSize',
                GroupHeader: 'groupHeaderFontSize',
                Item: 'itemFontSize',
            };
            newStyles[keyMap[fontMatch[1]]] = parseInt(fontMatch[2]);
            return;
        }

        if (trimmed.startsWith('Item:')) {
            const parts = trimmed
                .replace('Item:', '')
                .split(',')
                .map(s => s.trim());
            if (parts.length >= 2) {
                items.push({
                    id: parts[0],
                    label: parts[1],
                    parentId: parts[2] || undefined,
                    children: [],
                });
            }
        }
    });

    const rootItems: AffinityItem[] = [];
    const itemMap = new Map<string, AffinityItem>();
    items.forEach(i => itemMap.set(i.id, i));

    items.forEach(item => {
        if (item.parentId && itemMap.has(item.parentId)) {
            const parent = itemMap.get(item.parentId)!;
            parent.children = parent.children || [];
            parent.children.push(item);
        } else {
            rootItems.push(item);
        }
    });

    const realRootNode = items.find(i => i.id === 'root');
    const finalData =
        realRootNode && realRootNode.children
            ? realRootNode.children
            : rootItems.filter(i => i.id !== 'root');

    return { data: finalData, styles: newStyles };
};

/* ────────────────────── 6. 控制图 (Control Chart) ────────────────────── */

export function parseControlDSL(dsl: string): {
    series: ControlSeries[];
    styles: Partial<ControlChartStyles>;
} {
    const lines = dsl.split('\n').map(l => l.trimEnd());
    const styles: Partial<ControlChartStyles> = {};
    const series: ControlSeries[] = [];

    let currentSeries: ControlSeries | null = null;
    let isDataBlock = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || (trimmed.startsWith('//') && !isDataBlock)) continue;

        if (trimmed.startsWith('Title:')) {
            styles.title = trimmed.substring(6).trim();
            continue;
        }
        if (trimmed.startsWith('Type:')) {
            styles.type = trimmed.substring(5).trim() as ControlChartType;
            continue;
        }
        if (trimmed.startsWith('Size:')) {
            styles.subgroupSize = parseInt(trimmed.substring(5).trim());
            continue;
        }
        if (trimmed.startsWith('Rules:')) {
            styles.rules = trimmed
                .substring(6)
                .split(',')
                .map(r => r.trim() as ControlRule);
            continue;
        }
        if (trimmed.startsWith('UCL:')) {
            styles.ucl = parseFloat(trimmed.substring(4).trim());
            continue;
        }
        if (trimmed.startsWith('LCL:')) {
            styles.lcl = parseFloat(trimmed.substring(4).trim());
            continue;
        }
        if (trimmed.startsWith('CL:')) {
            styles.cl = parseFloat(trimmed.substring(3).trim());
            continue;
        }
        if (trimmed.startsWith('Decimals:')) {
            styles.decimals = parseInt(trimmed.substring(9).trim());
            continue;
        }
        if (trimmed.startsWith('ShowValues:')) {
            styles.showValues = trimmed.substring(11).trim().toLowerCase() === 'true';
            continue;
        }

        const colorMatch = trimmed.match(/^Color\[(\w+)\]:\s*(#[0-9A-Fa-f]{6})/);
        if (colorMatch) {
            const [, key, val] = colorMatch;
            if (key === 'Line') styles.lineColor = val;
            if (key === 'UCL') styles.uclColor = val;
            if (key === 'CL') styles.clColor = val;
            if (key === 'Point') styles.pointColor = val;
            continue;
        }

        if (trimmed.startsWith('[series]:')) {
            isDataBlock = true;
            currentSeries = {
                name: trimmed.substring(9).trim(),
                data: [],
            };
            continue;
        }
        if (trimmed === '[/series]') {
            if (currentSeries) series.push(currentSeries);
            currentSeries = null;
            isDataBlock = false;
            continue;
        }

        if (isDataBlock && currentSeries) {
            const values = trimmed.split(/[,;\s]+/).map(v => parseFloat(v));
            values.forEach(val => {
                if (!isNaN(val)) {
                    currentSeries!.data.push(val);
                }
            });
            continue;
        }
    }

    return { series, styles };
}

/* ────────────────────── 7. 矩阵图 (Matrix) ────────────────────── */

export const parseMatrixDSL = (content: string): { data: MatrixData; styles: MatrixChartStyles } => {
    const lines = content.split('\n');
    const newStyles: MatrixChartStyles = { ...DEFAULT_MATRIX_STYLES };
    const axes: MatrixAxis[] = [];
    const matrices: any[] = [];
    let title = '矩阵图分析';

    const symbolMap: Record<string, MatrixSymbolType> = {
        S: 'Strong',
        '9': 'Strong',
        '◎': 'Strong',
        M: 'Medium',
        '3': 'Medium',
        '○': 'Medium',
        W: 'Weak',
        '1': 'Weak',
        '△': 'Weak',
    };

    let currentAxisId = '';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (trimmed.startsWith('Title:')) {
            title = trimmed.replace('Title:', '').trim();
            return;
        }

        if (trimmed.startsWith('Type:')) {
            const val = trimmed.replace('Type:', '').trim().toUpperCase();
            if (val.startsWith('L')) newStyles.type = 'L';
            else if (val.startsWith('T')) newStyles.type = 'T';
            else if (val.startsWith('Y')) newStyles.type = 'Y';
            else if (val.startsWith('X')) newStyles.type = 'X';
            else if (val.startsWith('C')) newStyles.type = 'C';
            return;
        }

        if (trimmed.startsWith('Color[')) {
            const match = trimmed.match(/Color\[(Axis|Grid|Strong|Medium|Weak)\]:\s*(#\w+)/i);
            if (match) {
                const key = match[1].toLowerCase();
                if (key === 'axis') newStyles.axisColor = match[2];
                else if (key === 'grid') newStyles.gridColor = match[2];
                else if (key === 'strong') newStyles.symbolColorStrong = match[2];
                else if (key === 'medium') newStyles.symbolColorMedium = match[2];
                else if (key === 'weak') newStyles.symbolColorWeak = match[2];
            }
            return;
        }

        if (trimmed.startsWith('Font[')) {
            const match = trimmed.match(/Font\[(Title|Base)\]:\s*(\d+)/i);
            if (match) {
                const key = match[1].toLowerCase();
                if (key === 'title') newStyles.titleFontSize = parseInt(match[2]);
                else if (key === 'base') newStyles.fontSize = parseInt(match[2]);
            }
            return;
        }

        if (trimmed.startsWith('CellSize:')) {
            const val = parseInt(trimmed.replace('CellSize:', '').trim());
            if (!isNaN(val)) newStyles.cellSize = val;
            return;
        }

        if (trimmed.startsWith('ShowScores:')) {
            const val = trimmed.replace('ShowScores:', '').trim().toLowerCase();
            newStyles.showScores = val === 'true';
            return;
        }

        if (trimmed.startsWith('Weight[')) {
            const match = trimmed.match(/Weight\[(Strong|Medium|Weak)\]:\s*(\d+)/i);
            if (match) {
                const key = match[1].toLowerCase();
                if (key === 'strong') newStyles.weightStrong = parseInt(match[2]);
                else if (key === 'medium') newStyles.weightMedium = parseInt(match[2]);
                else if (key === 'weak') newStyles.weightWeak = parseInt(match[2]);
            }
            return;
        }

        if (trimmed.startsWith('Relation:')) {
            const rules = trimmed.replace('Relation:', '').split(',');
            rules.forEach(rule => {
                const m = rule.match(/\((.*?)\)/);
                if (m) {
                    const parts = m[1].split(':');
                    if (parts.length >= 2) {
                        const shorthand = parts[0].trim();
                        const typeName = rule.split('(')[0].trim();
                        if (typeName.includes('Strong')) symbolMap[shorthand] = 'Strong';
                        else if (typeName.includes('Medium')) symbolMap[shorthand] = 'Medium';
                        else if (typeName.includes('Weak')) symbolMap[shorthand] = 'Weak';
                    }
                }
            });
            return;
        }

        if (trimmed.startsWith('Axis:')) {
            const parts = trimmed.replace('Axis:', '').split(',');
            if (parts.length >= 1) {
                currentAxisId = parts[0].trim();
                const label = parts[1] ? parts[1].trim() : currentAxisId;
                axes.push({ id: currentAxisId, label, items: [] });
            }
            return;
        }

        if (trimmed.startsWith('-') && currentAxisId) {
            const axis = axes.find(a => a.id === currentAxisId);
            if (axis) {
                const parts = trimmed.substring(1).split(',');
                const id = parts[0].trim();
                let label = parts[1] ? parts[1].trim() : id;
                let weight = parts[2] ? parseFloat(parts[2]) : undefined;

                if (weight === undefined) {
                    const weightMatch = label.match(/\[(\d+(?:\.\d+)?)\]/);
                    if (weightMatch) {
                        weight = parseFloat(weightMatch[1]);
                        label = label.replace(weightMatch[0], '').trim();
                    }
                }
                axis.items.push({ id, label, weight });
            }
            return;
        }

        if (trimmed.startsWith('Matrix:')) {
            const parts = trimmed.replace('Matrix:', '').split('x');
            if (parts.length >= 2) {
                matrices.push({
                    rowAxisId: parts[0].trim(),
                    colAxisId: parts[1].trim(),
                    cells: [],
                });
            }
            return;
        }

        if (
            trimmed.includes(':') &&
            !trimmed.startsWith('Title') &&
            !trimmed.startsWith('Type') &&
            !trimmed.startsWith('Axis') &&
            !trimmed.startsWith('Matrix')
        ) {
            const lastMatrix = matrices[matrices.length - 1];
            if (lastMatrix) {
                const [rowId, relations] = trimmed.split(/:(.+)/);
                if (rowId && relations) {
                    const relParts = relations.split(',');
                    relParts.forEach(rel => {
                        const [colId, symKey] = rel.split(':').map(s => s.trim());
                        if (colId && symKey) {
                            const symbol =
                                symbolMap[symKey] || symbolMap[symKey.toUpperCase()] || 'None';
                            lastMatrix.cells.push({
                                rowId: rowId.trim(),
                                colId: colId.trim(),
                                symbol,
                            });
                        }
                    });
                }
            }
        }
    });

    return {
        data: { title, type: newStyles.type, axes, matrices },
        styles: newStyles,
    };
};

export const generateMatrixDSL = (data: MatrixData, styles: MatrixChartStyles): string => {
    let dsl = `Title: ${data.title}\n`;
    dsl += `Type: ${styles.type}\n`;
    dsl += `CellSize: ${styles.cellSize}\n`;
    dsl += `ShowScores: ${styles.showScores}\n`;
    dsl += `Font[Title]: ${styles.titleFontSize}\n`;
    dsl += `Font[Base]: ${styles.fontSize}\n`;
    dsl += `Weight[Strong]: ${styles.weightStrong}\n`;
    dsl += `Weight[Medium]: ${styles.weightMedium}\n`;
    dsl += `Weight[Weak]: ${styles.weightWeak}\n`;
    dsl += `Color[Strong]: ${styles.symbolColorStrong}\n`;
    dsl += `Color[Medium]: ${styles.symbolColorMedium}\n`;
    dsl += `Color[Weak]: ${styles.symbolColorWeak}\n`;
    dsl += `Color[Axis]: ${styles.axisColor}\n`;
    dsl += `Color[Grid]: ${styles.gridColor}\n\n`;

    data.axes.forEach(axis => {
        dsl += `Axis: ${axis.id}, ${axis.label}\n`;
        axis.items.forEach(item => {
            dsl += `- ${item.id}, ${item.label}${item.weight !== undefined ? `, ${item.weight}` : ''}\n`;
        });
        dsl += `\n`;
    });

    data.matrices.forEach(matrix => {
        dsl += `Matrix: ${matrix.rowAxisId} x ${matrix.colAxisId}\n`;
        const rows: Record<string, { colId: string; char: string }[]> = {};
        (matrix.cells || []).forEach(cell => {
            if (cell.symbol === 'None') return;
            if (!rows[cell.rowId]) rows[cell.rowId] = [];
            let char = '◎';
            if (cell.symbol === 'Medium') char = '○';
            else if (cell.symbol === 'Weak') char = '△';
            rows[cell.rowId].push({ colId: cell.colId, char });
        });

        Object.entries(rows).forEach(([rowId, rels]) => {
            dsl += `${rowId}: ${rels.map(r => `${r.colId}:${r.char}`).join(', ')}\n`;
        });
        dsl += `\n`;
    });

    return dsl.trim();
};

export const clearMatrixRelations = (currentDSL: string): string => {
    const lines = currentDSL.split('\n');
    const newLines: string[] = [];
    let isSkipping = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('Matrix:')) {
            newLines.push(line);
            isSkipping = true;
            continue;
        }
        if (
            trimmed.startsWith('Title:') ||
            trimmed.startsWith('Type:') ||
            trimmed.startsWith('Relation:') ||
            trimmed.startsWith('Axis:') ||
            trimmed.startsWith('# ')
        ) {
            isSkipping = false;
        }
        if (!isSkipping) {
            newLines.push(line);
        }
    }

    return newLines.join('\n');
};

export const updateMatrixDSL = (
    currentDSL: string,
    rowId: string,
    colId: string,
    currentSymbolName: any,
    targetRowAxisId?: string,
    targetColAxisId?: string
): string => {
    const lines = currentDSL.split('\n');

    const transition: Record<string, string> = {
        None: 'Strong',
        Strong: 'Medium',
        Medium: 'Weak',
        Weak: 'None',
    };
    const nextName = transition[currentSymbolName] || 'Strong';

    const symbolChar: Record<string, string> = {
        Strong: '◎',
        Medium: '○',
        Weak: '△',
    };

    let matrixStartIndex = -1;
    let matrixEndIndex = -1;
    let targetRowIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('Matrix:')) {
            let isMatch = true;
            if (targetRowAxisId && targetColAxisId) {
                const parts = line.replace('Matrix:', '').split('x');
                if (parts.length >= 2) {
                    const r = parts[0].trim();
                    const c = parts[1].trim();
                    if (r !== targetRowAxisId || c !== targetColAxisId) {
                        isMatch = false;
                    }
                }
            }

            if (isMatch) {
                matrixStartIndex = i;
                for (let j = i + 1; j < lines.length; j++) {
                    if (
                        lines[j].trim() === '' ||
                        lines[j].startsWith('Title:') ||
                        lines[j].startsWith('Axis:') ||
                        lines[j].startsWith('Matrix:')
                    ) {
                        matrixEndIndex = j;
                        break;
                    }
                }
                if (matrixEndIndex === -1) matrixEndIndex = lines.length;
                break;
            }
        }
    }

    if (matrixStartIndex === -1) {
        return currentDSL;
    }

    for (let i = matrixStartIndex + 1; i < matrixEndIndex; i++) {
        if (lines[i].trim().startsWith(`${rowId}:`)) {
            targetRowIndex = i;
            break;
        }
    }

    if (targetRowIndex !== -1) {
        const line = lines[targetRowIndex];
        let newLine = line;

        if (line.includes(`${colId}:`)) {
            if (nextName === 'None') {
                newLine = line
                    .replace(new RegExp(`${colId}:[^,\\s]+`), '')
                    .replace(/,\s*,/g, ',')
                    .replace(/:\s*,/g, ': ')
                    .replace(/,\s*$/, '')
                    .trim();
            } else {
                newLine = line.replace(
                    new RegExp(`${colId}:[^,\\s]+`),
                    `${colId}:${symbolChar[nextName]}`
                );
            }
        } else if (nextName !== 'None') {
            if (line.trim().endsWith(':')) {
                newLine = `${line} ${colId}:${symbolChar[nextName]}`;
            } else {
                newLine = `${line}, ${colId}:${symbolChar[nextName]}`;
            }
        }
        lines[targetRowIndex] = newLine;
    } else if (nextName !== 'None') {
        const newLine = `${rowId}: ${colId}:${symbolChar[nextName]}`;
        lines.splice(matrixEndIndex, 0, newLine);
    }

    return lines.join('\n');
};

/* ────────────────────── 8. 矩阵散点图 (Matrix Plot) ────────────────────── */

export const parseMatrixPlotDSL = (
    content: string
): { data: MatrixPlotData; styles: MatrixPlotStyles } => {
    const lines = content.split('\n');
    const newStyles: MatrixPlotStyles = { ...DEFAULT_MATRIX_PLOT_STYLES };
    const newData: MatrixPlotData = {
        title: '图矩阵相关性分析',
        mode: 'matrix',
        yDimensions: [],
        xDimensions: [],
        showSmoother: false,
        smootherMethod: 'Lowess',
        data: [],
    };

    let isDataBlock = false;
    let isStylesBlock = false;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        if (trimmed.startsWith('Data:')) {
            isDataBlock = true;
            isStylesBlock = false;
            return;
        }
        if (trimmed.startsWith('Styles:')) {
            isDataBlock = false;
            isStylesBlock = true;
            return;
        }

        if (isStylesBlock && trimmed.startsWith('-')) {
            const body = trimmed.substring(1).trim();
            const [key, ...valParts] = body.split(':').map(s => s.trim());
            const val = valParts.join(':').trim();
            if (key && val) {
                switch (key) {
                    case 'DisplayMode':
                        newStyles.displayMode = val as any;
                        break;
                    case 'Diagonal':
                        newStyles.diagonal = val as any;
                        break;
                    case 'PointSize':
                        newStyles.pointSize = parseFloat(val);
                        break;
                    case 'PointOpacity':
                        newStyles.pointOpacity = parseFloat(val);
                        break;
                    case 'ColorPalette':
                        newStyles.colorPalette = val as any;
                        break;
                }
            }
            return;
        }

        if (isDataBlock && trimmed.startsWith('-')) {
            const body = trimmed.substring(1).trim();
            if (body.startsWith('{')) {
                try {
                    const obj: any = {};
                    const pairs = body.replace(/[{}]/g, '').split(',');
                    pairs.forEach(p => {
                        const [k, v] = p.split(':').map(s => s.trim());
                        if (k && v) {
                            const num = parseFloat(v);
                            obj[k] = isNaN(num) ? v.replace(/['"]/g, '') : num;
                        }
                    });
                    newData.data.push(obj);
                } catch {
                    // ignore malformed line
                }
            } else {
                const vals = body.split(',').map(s => s.trim());
                const obj: any = {};
                const dims =
                    newData.mode === 'matrix'
                        ? newData.xDimensions
                        : [...newData.yDimensions, ...newData.xDimensions];
                vals.forEach((v, i) => {
                    if (dims[i]) {
                        const num = parseFloat(v);
                        obj[dims[i]] = isNaN(num) ? v : num;
                    }
                });
                if (Object.keys(obj).length > 0) newData.data.push(obj);
            }
            return;
        }

        if (trimmed.includes(':') && !trimmed.startsWith('-')) {
            const [keyPart, ...valParts] = trimmed.split(':');
            const key = keyPart.trim();
            const val = valParts.join(':').trim();

            switch (key) {
                case 'Title':
                    newData.title = val;
                    newStyles.title = val;
                    break;
                case 'Mode':
                    newData.mode = val.toLowerCase() === 'yvsx' ? 'yvsx' : 'matrix';
                    break;
                case 'Dimensions': {
                    const dims = val
                        .replace(/[\[\]]/g, '')
                        .split(',')
                        .map(s => s.trim());
                    newData.xDimensions = dims;
                    newData.yDimensions = dims;
                    break;
                }
                case 'X-Dimensions':
                    newData.xDimensions = val
                        .replace(/[\[\]]/g, '')
                        .split(',')
                        .map(s => s.trim());
                    break;
                case 'Y-Dimensions':
                    newData.yDimensions = val
                        .replace(/[\[\]]/g, '')
                        .split(',')
                        .map(s => s.trim());
                    break;
                case 'Group':
                    newData.groupVariable = val;
                    break;
                case 'Smoother': {
                    const sVal = val.toLowerCase();
                    if (sVal === 'true') {
                        newData.showSmoother = true;
                        newData.smootherMethod = 'Lowess';
                    } else if (sVal === 'false') {
                        newData.showSmoother = false;
                    } else if (sVal === 'lowess') {
                        newData.showSmoother = true;
                        newData.smootherMethod = 'Lowess';
                    } else if (sVal === 'movingaverage') {
                        newData.showSmoother = true;
                        newData.smootherMethod = 'MovingAverage';
                    }
                    break;
                }
            }
        }
    });

    return { data: newData, styles: newStyles };
};

/* ────────────────────── 9. 矢线图 CPM 与布局 (Arrow Diagram) ────────────────────── */

export const calculateArrowCPM = (
    nodes: ArrowNode[],
    links: ArrowLink[]
): { nodes: ArrowNode[]; links: ArrowLink[]; duration: number } => {
    const nodeMap = new Map<string, ArrowNode>();
    nodes.forEach(n => {
        n.es = 0;
        n.ls = Infinity;
        nodeMap.set(n.id, n);
    });

    const adj = new Map<string, ArrowLink[]>();
    const reverseAdj = new Map<string, ArrowLink[]>();

    nodes.forEach(n => {
        adj.set(n.id, []);
        reverseAdj.set(n.id, []);
    });

    links.forEach(l => {
        if (adj.has(l.source)) adj.get(l.source)!.push(l);
        if (reverseAdj.has(l.target)) reverseAdj.get(l.target)!.push(l);
    });

    const inDegree = new Map<string, number>();
    nodes.forEach(n => inDegree.set(n.id, 0));
    links.forEach(l => inDegree.set(l.target, (inDegree.get(l.target) || 0) + 1));

    const queue: string[] = [];
    nodes.forEach(n => {
        if ((inDegree.get(n.id) || 0) === 0) queue.push(n.id);
    });

    const topoOrder: string[] = [];
    while (queue.length > 0) {
        const u = queue.shift()!;
        topoOrder.push(u);
        const neighbors = adj.get(u) || [];
        neighbors.forEach(l => {
            const v = l.target;
            inDegree.set(v, (inDegree.get(v) || 0) - 1);
            if (inDegree.get(v) === 0) queue.push(v);
        });
    }

    topoOrder.forEach(uId => {
        const u = nodeMap.get(uId)!;
        const outEdges = adj.get(uId) || [];
        outEdges.forEach(l => {
            l.ef = (u.es || 0) + l.duration;
            const v = nodeMap.get(l.target)!;
            if (l.ef > (v.es || 0)) {
                v.es = l.ef;
            }
        });
    });

    let projectDuration = 0;
    nodes.forEach(n => {
        if ((n.es || 0) > projectDuration) projectDuration = n.es || 0;
    });

    nodes.forEach(n => {
        n.ls = projectDuration;
    });

    for (let i = topoOrder.length - 1; i >= 0; i--) {
        const uId = topoOrder[i];
        const u = nodeMap.get(uId)!;
        const outEdges = adj.get(uId) || [];

        let minLS = Infinity;
        if (outEdges.length > 0) {
            outEdges.forEach(l => {
                const v = nodeMap.get(l.target)!;
                const linkLS = (v.ls || projectDuration) - l.duration;
                if (linkLS < minLS) minLS = linkLS;

                l.lf = v.ls;
                l.ef = (u.es || 0) + l.duration;
                l.tf = (v.ls || 0) - l.duration - (u.es || 0);
                if (Math.abs(l.tf!) < 0.0001) l.tf = 0;
                l.isCritical = l.tf === 0;
            });
            u.ls = minLS;
        }
    }

    const minDist = new Map<string, number>();
    const prevNode = new Map<string, string>();
    const prevLink = new Map<string, ArrowLink>();

    nodes.forEach(n => minDist.set(n.id, Infinity));
    topoOrder.forEach(uId => {
        const inDeg = (reverseAdj.get(uId) || []).length;
        if (inDeg === 0) minDist.set(uId, 0);
    });

    topoOrder.forEach(uId => {
        const dU = minDist.get(uId)!;
        if (dU === Infinity) return;
        const outEdges = adj.get(uId) || [];
        outEdges.forEach(l => {
            const vId = l.target;
            const newDist = dU + l.duration;
            if (newDist < minDist.get(vId)!) {
                minDist.set(vId, newDist);
                prevNode.set(vId, uId);
                prevLink.set(vId, l);
            }
        });
    });

    let minSinkId: string | null = null;
    let minSinkDist = Infinity;
    nodes.forEach(n => {
        const outDeg = (adj.get(n.id) || []).length;
        if (outDeg === 0) {
            const d = minDist.get(n.id)!;
            if (d < minSinkDist) {
                minSinkDist = d;
                minSinkId = n.id;
            }
        }
    });

    links.forEach(l => {
        l.isShortest = false;
    });
    if (minSinkId) {
        let curr = minSinkId;
        while (prevLink.has(curr)) {
            const l = prevLink.get(curr)!;
            l.isShortest = true;
            curr = prevNode.get(curr)!;
        }
    }

    return { nodes, links, duration: projectDuration };
};

export const performArrowLayout = (
    nodes: ArrowNode[],
    links: ArrowLink[]
): { nodes: ArrowNode[]; pixelsPerTime: number } => {
    let maxRatio = 0;
    links.forEach(l => {
        if (l.duration > 0) {
            const labelLen = (l.label || '').length * 8 + 40;
            const ratio = labelLen / l.duration;
            if (ratio > maxRatio) maxRatio = ratio;
        }
    });

    let pixelsPerTime = Math.max(24, maxRatio);
    if (pixelsPerTime > 120) pixelsPerTime = 120;

    const padding = 100;
    const yStep = 180;

    nodes.forEach(n => {
        n.x = padding + (n.es || 0) * pixelsPerTime;
    });

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    nodes.forEach(n => {
        n.y = 0;
    });

    const starts = nodes.filter(n => n.es === 0);
    const assigned = new Set<string>();

    const assignY = (uId: string, currentY: number) => {
        if (assigned.has(uId)) return;
        const u = nodeMap.get(uId);
        if (!u) return;

        u.y = currentY;
        assigned.add(uId);

        const outLinks = links.filter(l => l.source === uId);
        if (outLinks.length === 0) return;

        outLinks.sort((a, b) => {
            if (a.isCritical && !b.isCritical) return -1;
            if (!a.isCritical && b.isCritical) return 1;
            return 0;
        });

        const unassignedChildren = outLinks
            .map(l => l.target)
            .filter(c => !assigned.has(c));
        if (unassignedChildren.length === 0) return;

        const totalH = (unassignedChildren.length - 1) * yStep;
        const startChildY = currentY - totalH / 2;

        unassignedChildren.forEach((childId, idx) => {
            assignY(childId, startChildY + idx * yStep);
        });
    };

    starts.forEach((n, i) => {
        assignY(n.id, 300 + i * yStep * 1.5);
    });

    nodes.forEach(n => {
        if (!assigned.has(n.id)) n.y = 300;
    });

    return { nodes, pixelsPerTime };
};

export const parseArrowDSL = (content: string): { data: ArrowData; styles: ArrowChartStyles } => {
    const lines = content.split('\n');
    const newStyles = { ...DEFAULT_ARROW_STYLES };
    const nodes: ArrowNode[] = [];
    const links: ArrowLink[] = [];
    let title = '矢线图';

    const nodeMap = new Map<string, ArrowNode>();
    const getOrCreateNode = (id: string, label?: string) => {
        if (!nodeMap.has(id)) {
            const newNode = { id, label: label || id };
            nodeMap.set(id, newNode);
            nodes.push(newNode);
        } else if (label) {
            nodeMap.get(id)!.label = label;
        }
        return nodeMap.get(id)!;
    };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (trimmed.startsWith('Title:')) {
            title = trimmed.substring(6).trim();
            return;
        }
        if (trimmed.startsWith('ShowCritical:')) {
            newStyles.showCriticalPath = trimmed.substring(13).trim() === 'true';
            return;
        }
        if (trimmed.startsWith('ShowShortest:')) {
            newStyles.showShortestPath = trimmed.substring(13).trim() === 'true';
            return;
        }
        if (trimmed.startsWith('Color[Node]:')) {
            newStyles.nodeColor = trimmed.substring(12).trim();
            return;
        }
        if (trimmed.startsWith('Color[Line]:')) {
            newStyles.lineColor = trimmed.substring(12).trim();
            return;
        }
        if (trimmed.startsWith('Color[Critical]:')) {
            newStyles.criticalLineColor = trimmed.substring(16).trim();
            return;
        }
        if (trimmed.startsWith('Color[Shortest]:')) {
            newStyles.shortestLineColor = trimmed.substring(16).trim();
            return;
        }

        if (trimmed.startsWith('Event:')) {
            const parts = trimmed
                .substring(6)
                .split(',')
                .map(s => s.trim());
            if (parts.length > 0) getOrCreateNode(parts[0], parts[1]);
            return;
        }

        const isDummy = trimmed.includes('..>');
        const separator = isDummy ? '..>' : '->';
        if (trimmed.includes(separator)) {
            const [relPart, metaPart] = trimmed.split(':').map(s => s.trim());
            const [srcId, tgtId] = relPart.split(separator).map(s => s.trim());
            let duration = 0;
            let label = '';
            if (metaPart) {
                const metaParts = metaPart.split(',').map(s => s.trim());
                duration = parseFloat(metaParts[0]) || 0;
                label = metaParts[1] || '';
            }
            if (srcId && tgtId) {
                getOrCreateNode(srcId);
                getOrCreateNode(tgtId);
                links.push({ source: srcId, target: tgtId, duration, label, isDummy });
            }
        }
    });

    const cpmResult = calculateArrowCPM(nodes, links);
    const layout = performArrowLayout(cpmResult.nodes, cpmResult.links);

    return {
        data: { title, nodes: layout.nodes, links: cpmResult.links },
        styles: newStyles,
    };
};

/* ────────────────────── 10. 基础图表 (Basic Chart) ────────────────────── */

export const parseBasicDSL = (
    content: string,
    baseStyles: BasicChartStyles = DEFAULT_BASIC_STYLES
) => {
    const lines = content.split('\n');
    const newStyles: BasicChartStyles = { ...baseStyles };
    const newDatasets: BasicChartDataset[] = [];
    let titleFromDSL = '';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (trimmed.includes(':')) {
            const [keyPart, ...valParts] = trimmed.split(':');
            const key = keyPart.trim();
            const val = valParts.join(':').trim();

            if (key === 'Title') {
                titleFromDSL = val;
                newStyles.title = val;
            } else if (key === 'Type') {
                newStyles.type = val.toLowerCase() as any;
            } else if (key === 'View') {
                newStyles.view = val.toLowerCase() as any;
            } else if (key === 'Stacked') {
                newStyles.stacked = val.toLowerCase() === 'true';
            } else if (key === 'Smooth') {
                newStyles.smooth = val.toLowerCase() === 'true';
            } else if (key === 'ShowValues') {
                newStyles.showValues = val.toLowerCase() === 'true';
            } else if (key === 'ShowLegend') {
                newStyles.showLegend = val.toLowerCase() !== 'false';
            } else if (key === 'Grid' || key === 'ShowGrid') {
                newStyles.grid = val.toLowerCase() !== 'false';
            } else if (key.startsWith('Color[')) {
                const subKey = key.match(/Color\[(.*?)\]/)?.[1];
                if (subKey === 'Title') newStyles.titleColor = val;
                if (subKey === 'Bg') newStyles.backgroundColor = val;
            } else if (key.startsWith('Font[')) {
                const subKey = key.match(/Font\[(.*?)\]/)?.[1];
                if (subKey === 'Title') newStyles.titleFontSize = parseInt(val);
                if (subKey === 'Base') newStyles.baseFontSize = parseInt(val);
            } else if (key === 'Dataset') {
                const parts = val.split(/,(?![^\[]*\])/).map(s => s.trim());
                if (parts.length >= 2) {
                    const name = parts[0];
                    const valuesStr = parts[1].replace(/[\[\]]/g, '');
                    const values = valuesStr.split(',').map(v => {
                        const num = parseFloat(v.trim());
                        return isNaN(num) ? v.trim() : num;
                    });
                    const color = parts[2] && parts[2] !== 'null' ? parts[2] : undefined;
                    const axisMatch = (parts[3] || 'Y').toUpperCase() as any;

                    newDatasets.push({ name, values, color, axisMatch });
                }
            }
        }
    });

    return {
        data: {
            title: titleFromDSL || baseStyles.title || '图表',
            type: newStyles.type || 'bar',
            datasets: newDatasets,
        },
        styles: newStyles,
    };
};

/* ────────────────────── 11. 雷达图 (Radar Chart) ────────────────────── */

export const parseRadarDSL = (
    content: string,
    baseStyles: RadarChartStyles = DEFAULT_RADAR_STYLES
) => {
    const lines = content.split('\n');
    const newStyles: RadarChartStyles = { ...baseStyles };
    const axes: any[] = [];
    const series: any[] = [];
    let title = baseStyles.title;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (trimmed.includes(':')) {
            const [keyPart, ...valParts] = trimmed.split(':');
            const key = keyPart.trim();
            const val = valParts.join(':').trim();

            if (key === 'Title') {
                title = val;
            } else if (key === 'StartAngle') {
                newStyles.startAngle = parseFloat(val);
            } else if (key === 'Clockwise') {
                newStyles.clockwise = val.toLowerCase() === 'true';
            } else if (key === 'Closed') {
                newStyles.isClosed = val.toLowerCase() === 'true';
            } else if (key === 'Standardize') {
                newStyles.standardize = val.toLowerCase() === 'true';
            } else if (key === 'ShowAreaScore') {
                newStyles.showAreaScore = val.toLowerCase() === 'true';
            } else if (key === 'ShowSimilarity') {
                newStyles.showSimilarity = val.toLowerCase() === 'true';
            } else if (key === 'ShowValues') {
                newStyles.showValues = val.toLowerCase() === 'true';
            } else if (key === 'Axis') {
                const parts = val.split(',').map(s => s.trim());
                if (parts.length >= 2) {
                    axes.push({
                        name: parts[0],
                        max: parseFloat(parts[1]),
                        min: parts[2] ? parseFloat(parts[2]) : 0,
                    });
                }
            } else if (key === 'Series') {
                const parts = val.split(/,(?![^\[]*\])/).map(s => s.trim());
                if (parts.length >= 2) {
                    const name = parts[0];
                    const valuesStr = parts[1].replace(/[\[\]]/g, '');
                    const values = valuesStr.split(',').map(v => parseFloat(v.trim()));
                    const color = parts[2] && parts[2] !== 'null' ? parts[2] : undefined;
                    const opacity = parts[3] ? parseFloat(parts[3]) : undefined;
                    series.push({ name, values, color, fillOpacity: opacity });
                }
            }
        }
    });

    return {
        data: { title, axes, series },
        styles: { ...newStyles, title },
    };
};

/* ────────────────────── 12. VChart 万能统计图表 ────────────────────── */

export const parseVChartDSL = (
    content: string,
    baseStyles: VChartChartStyles = DEFAULT_VCHART_STYLES
) => {
    const lines = content.split('\n');
    let title = baseStyles.title;
    let colorPalette = baseStyles.colorPalette;
    let titleFontSize = baseStyles.titleFontSize;
    let showTitle = baseStyles.showTitle;
    let showLabel = baseStyles.showLabel;
    let animation = baseStyles.animation;
    let animationMode = baseStyles.animationMode;
    let specStr = '';
    let inSpec = false;

    lines.forEach(line => {
        let trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        if (trimmed.startsWith('```')) {
            trimmed = trimmed.replace(/`{3,}(dsl|json|vchart)?/i, '').trim();
            if (!trimmed) return;
        }

        const upperTrimmed = trimmed.toUpperCase();
        const isNewTag = [
            'TITLE:',
            'COLORPALETTE:',
            'FONT[TITLE]:',
            'SHOWTITLE:',
            'SHOWLABEL:',
            'ANIMATION:',
            'ANIMATIONMODE:',
            'SPEC:',
        ].some(tag => upperTrimmed.startsWith(tag));
        if (isNewTag && upperTrimmed.indexOf('SPEC:') === -1) {
            inSpec = false;
        }

        if (upperTrimmed.startsWith('TITLE:')) {
            title = trimmed.substring(6).trim();
        } else if (upperTrimmed.startsWith('COLORPALETTE:')) {
            colorPalette = trimmed.substring(13).trim();
        } else if (upperTrimmed.startsWith('FONT[TITLE]:')) {
            titleFontSize = parseInt(trimmed.split(':')[1]) || titleFontSize;
        } else if (upperTrimmed.startsWith('SHOWTITLE:')) {
            showTitle = trimmed.substring(10).trim().toLowerCase() !== 'false';
        } else if (upperTrimmed.startsWith('SHOWLABEL:')) {
            showLabel = trimmed.substring(10).trim().toLowerCase() !== 'false';
        } else if (upperTrimmed.startsWith('ANIMATION:')) {
            animation = trimmed.substring(10).trim().toLowerCase() === 'true';
        } else if (upperTrimmed.startsWith('ANIMATIONMODE:')) {
            animationMode = trimmed.substring(14).trim() as VChartAnimationMode;
        } else if (upperTrimmed.startsWith('SPEC:')) {
            inSpec = true;
            const colonIndex = trimmed.indexOf(':');
            specStr = trimmed.substring(colonIndex + 1).trim();
        } else if (inSpec) {
            specStr += ' ' + trimmed;
        }
    });

    specStr = specStr.replace(/`{3,}.*$/g, '').trim();

    let spec = {};
    let parseError = '';
    try {
        if (specStr) {
            spec = JSON.parse(specStr.trim());
        }
    } catch (e: any) {
        parseError = e.message;
    }

    return {
        data: { title, spec, error: parseError },
        styles: {
            ...baseStyles,
            title,
            colorPalette,
            titleFontSize,
            showTitle,
            showLabel,
            animation,
            animationMode,
        },
    };
};
