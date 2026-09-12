import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import { MatrixData, MatrixChartStyles, MatrixSymbolType, BaseDiagramRef } from '../types';
import { svgToDataURL } from '../utils/exportUtils';

interface MatrixDiagramProps {
    data: MatrixData;
    styles: MatrixChartStyles;
    onCellClick?: (rowId: string, colId: string, currentSymbol: MatrixSymbolType, rowAxisId?: string, colAxisId?: string) => void;
    orientation?: 'top-down' | 'bottom-up';
}

export interface MatrixDiagramRef extends BaseDiagramRef { }

export const MatrixDiagram = forwardRef<MatrixDiagramRef, MatrixDiagramProps>(({ data, styles, onCellClick, orientation = 'top-down' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [transform, setTransform] = React.useState({ x: 0, y: 0, k: 1 });
    const [isDragging, setIsDragging] = React.useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const cellSize = styles.cellSize || 50;
    const headerSize = 120;
    const SYMBOL_VALUES: Record<string, number> = { 'Strong': 9, 'Medium': 3, 'Weak': 1, 'None': 0 };

    // Symbol Renderer
    const renderSymbol = (x: number, y: number, type: string) => {
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;
        const r = cellSize * 0.3;

        if (type === 'Strong') {
            return (
                <g>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke={styles.symbolColorStrong} strokeWidth={2} />
                    <circle cx={cx} cy={cy} r={r * 0.6} fill="none" stroke={styles.symbolColorStrong} strokeWidth={2} />
                </g>
            );
        }
        if (type === 'Medium') {
            return <circle cx={cx} cy={cy} r={r} fill="none" stroke={styles.symbolColorMedium} strokeWidth={2} />;
        }
        if (type === 'Weak') {
            // Triangle
            const points = `${cx},${cy - r} ${cx - r * 0.866},${cy + r * 0.5} ${cx + r * 0.866},${cy + r * 0.5}`;
            return <polygon points={points} fill="none" stroke={styles.symbolColorWeak} strokeWidth={2} />;
        }
        return null; // None
    };

    // --- L-TYPE RENDERER ---
    const renderLType = () => {
        const matrixDef = data.matrices[0];
        if (!matrixDef) return null;

        const rowAxis = data.axes.find(a => a.id === matrixDef.rowAxisId);
        const colAxis = data.axes.find(a => a.id === matrixDef.colAxisId);
        const rowItems = rowAxis?.items || [];
        const colItems = colAxis?.items || [];

        const hasScores = (styles.showScores ?? true) && rowItems.some(r => r.weight !== undefined);
        const colScores = colItems.map(col => {
            let score = 0;
            const cells = matrixDef.cells.filter(c => c.colId === col.id) || [];
            cells.forEach(cell => {
                const row = rowItems.find(r => r.id === cell.rowId);
                if (row) {
                    const weight = row.weight ?? 1;
                    const value = SYMBOL_VALUES[cell.symbol] || 0;
                    score += weight * value;
                }
            });
            return score;
        });

        // Render Bounds Calculation
        const maxLenRow = Math.max(...rowItems.map(i => i.label.length), 0);
        const maxLenCol = Math.max(...colItems.map(i => i.label.length), 0);

        const startX = (maxLenRow * styles.fontSize * 0.8) + 20;
        const startY = (maxLenCol * styles.fontSize * 0.7) + 60; // For -45 deg labels

        const totalW = startX + colItems.length * cellSize + 40;
        const totalH = startY + rowItems.length * cellSize + (hasScores ? cellSize : 0) + 40;

        return {
            width: totalW, height: totalH,
            content: (
                <g transform={`translate(${startX}, ${startY})`}>
                    {/* Y-Axis (Row labels) */}
                    <g transform={`translate(0, 0)`}>
                        {rowItems.map((item, i) => (
                            <text key={item.id} x={-10} y={i * cellSize + cellSize / 2 + 4} textAnchor="end" fontSize={styles.fontSize} fill={styles.axisColor} fontWeight="bold">{item.label}</text>
                        ))}
                        {rowAxis && (
                            <text x={-startX + 10} y={rowItems.length * cellSize / 2} transform={`rotate(-90, ${-startX + 10}, ${rowItems.length * cellSize / 2})`} textAnchor="middle" fontWeight="bold" fontSize={styles.fontSize + 2} fill={styles.axisColor}>{rowAxis.label}</text>
                        )}
                    </g>
                    {/* X-Axis (Col labels) */}
                    <g transform={`translate(0, 0)`}>
                        {colItems.map((item, i) => (
                            <text key={item.id} x={i * cellSize + cellSize / 2} y={-10} transform={`rotate(-45, ${i * cellSize + cellSize / 2}, -10)`} textAnchor="start" fontSize={styles.fontSize} fill={styles.axisColor} fontWeight="bold">
                                {item.label}
                            </text>
                        ))}
                        {colAxis && (
                            <text x={colItems.length * cellSize / 2} y={-startY + 20} textAnchor="middle" fontWeight="bold" fontSize={styles.fontSize + 2} fill={styles.axisColor}>{colAxis.label}</text>
                        )}
                    </g>

                    {/* Grid & Cells */}
                    <g>
                        {Array.from({ length: colItems.length + 1 }).map((_, i) => (
                            <line key={`v${i}`} x1={i * cellSize} y1={0} x2={i * cellSize} y2={rowItems.length * cellSize + (hasScores ? cellSize : 0)} stroke={styles.gridColor} strokeWidth={1} />
                        ))}
                        {Array.from({ length: rowItems.length + 1 }).map((_, i) => (
                            <line key={`h${i}`} x1={0} y1={i * cellSize} x2={colItems.length * cellSize} y2={i * cellSize} stroke={styles.gridColor} strokeWidth={1} />
                        ))}
                        {hasScores && <line x1={0} y1={rowItems.length * cellSize + cellSize} x2={colItems.length * cellSize} y2={rowItems.length * cellSize + cellSize} stroke={styles.gridColor} strokeWidth={1} />}

                        {matrixDef.cells.map((cell, i) => {
                            const rowIndex = rowItems.findIndex(r => r.id === cell.rowId);
                            const colIndex = colItems.findIndex(c => c.id === cell.colId);
                            if (rowIndex === -1 || colIndex === -1) return null;
                            return (
                                <g key={i}>
                                    {renderSymbol(colIndex * cellSize, rowIndex * cellSize, cell.symbol)}
                                    <rect x={colIndex * cellSize} y={rowIndex * cellSize} width={cellSize} height={cellSize} fill="transparent" className="cursor-pointer hover:bg-black/5 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); if (onCellClick) onCellClick(cell.rowId, cell.colId, cell.symbol, matrixDef.rowAxisId, matrixDef.colAxisId); }} />
                                </g>
                            );
                        })}
                        {rowItems.map((row, rIndex) => (
                            colItems.map((col, cIndex) => {
                                if ((matrixDef?.cells || []).some(c => c.rowId === row.id && c.colId === col.id)) return null;
                                return (
                                    <rect key={`e-${rIndex}-${cIndex}`} x={cIndex * cellSize} y={rIndex * cellSize} width={cellSize} height={cellSize} fill="transparent" className="cursor-pointer hover:fill-black/5"
                                        onClick={(e) => { e.stopPropagation(); if (onCellClick) onCellClick(row.id, col.id, 'None', matrixDef.rowAxisId, matrixDef.colAxisId); }} />
                                );
                            })
                        ))}
                        {hasScores && colScores.map((score, i) => (
                            <text key={`s-${i}`} x={i * cellSize + cellSize / 2} y={rowItems.length * cellSize + cellSize / 2 + 5} textAnchor="middle" fontSize={styles.fontSize} fontWeight="bold" fill={styles.axisColor}>{score}</text>
                        ))}
                        {hasScores && <text x={-10} y={rowItems.length * cellSize + cellSize / 2 + 4} textAnchor="end" fontSize={styles.fontSize} fontWeight="bold" fill={styles.axisColor}>得 分</text>}
                    </g>
                </g>
            )
        };
    };


    const renderTType = () => {
        // Find Center Axis (A)
        // Usually the first defined or inferred. Let's assume A, B, C convention from parser.
        // Or find the axis that is shared (present in both matrices).
        const axisCounts: Record<string, number> = {};
        data.matrices.forEach(m => {
            axisCounts[m.rowAxisId] = (axisCounts[m.rowAxisId] || 0) + 1;
            axisCounts[m.colAxisId] = (axisCounts[m.colAxisId] || 0) + 1;
        });

        // The shared axis has count > 1 (or we follow convention)
        let centerAxisId = Object.keys(axisCounts).find(id => axisCounts[id] > 1);
        if (!centerAxisId && data.axes.length > 0) centerAxisId = data.axes[0].id; // Fallback

        const centerAxis = data.axes.find(a => a.id === centerAxisId);
        if (!centerAxis) return null;
        const centerItems = centerAxis.items;

        // Find Left Matrix (BxA) and Right Matrix (AxC or CxA)
        const involvedMatrices = data.matrices.filter(m => m.rowAxisId === centerAxisId || m.colAxisId === centerAxisId);
        let leftMatrix = involvedMatrices[0];
        let rightMatrix = involvedMatrices[1];

        // Resolve Left/Right Axis
        const leftAxisId = leftMatrix ? (leftMatrix.rowAxisId === centerAxisId ? leftMatrix.colAxisId : leftMatrix.rowAxisId) : null;
        const rightAxisId = rightMatrix ? (rightMatrix.rowAxisId === centerAxisId ? rightMatrix.colAxisId : rightMatrix.rowAxisId) : null;

        const leftAxis = data.axes.find(a => a.id === leftAxisId);
        const rightAxis = data.axes.find(a => a.id === rightAxisId);

        const leftItems = leftAxis?.items || [];
        const rightItems = rightAxis?.items || [];

        // Dimensions
        const centerWidth = 100;
        const leftWidth = leftItems.length * cellSize;
        const rightWidth = rightItems.length * cellSize;
        const mainHeight = centerItems.length * cellSize;
        const scoreAreaSize = 40;

        // Scoring Logic
        const hasCenterWeights = centerItems.some(item => item.weight !== undefined);

        const leftScores = leftItems.map(col => {
            let score = 0;
            const cells = leftMatrix?.cells.filter(c => c.rowId === col.id || c.colId === col.id) || [];
            cells.forEach(cell => {
                const centerItem = centerItems.find(r => r.id === cell.rowId || r.id === cell.colId);
                if (centerItem) {
                    const weight = centerItem.weight ?? 1;
                    const value = SYMBOL_VALUES[cell.symbol] || 0;
                    score += weight * value;
                }
            });
            return score;
        });

        const rightScores = rightItems.map(col => {
            let score = 0;
            const cells = rightMatrix?.cells.filter(c => c.rowId === col.id || c.colId === col.id) || [];
            cells.forEach(cell => {
                const centerItem = centerItems.find(r => r.id === cell.rowId || r.id === cell.colId);
                if (centerItem) {
                    const weight = centerItem.weight ?? 1;
                    const value = SYMBOL_VALUES[cell.symbol] || 0;
                    score += weight * value;
                }
            });
            return score;
        });

        const centerScores = centerItems.map(centerItem => {
            let score = 0;
            const leftCells = leftMatrix?.cells.filter(c => c.rowId === centerItem.id || c.colId === centerItem.id) || [];
            leftCells.forEach(cell => {
                const otherAxisItem = leftItems.find(item => item.id === cell.rowId || item.id === cell.colId);
                const otherWeight = otherAxisItem?.weight ?? 1;
                score += otherWeight * (SYMBOL_VALUES[cell.symbol] || 0);
            });
            const rightCells = rightMatrix?.cells.filter(c => c.rowId === centerItem.id || c.colId === centerItem.id) || [];
            rightCells.forEach(cell => {
                const otherAxisItem = rightItems.find(item => item.id === cell.rowId || item.id === cell.colId);
                const otherWeight = otherAxisItem?.weight ?? 1;
                score += otherWeight * (SYMBOL_VALUES[cell.symbol] || 0);
            });
            return score;
        });

        const hasAnyWeights = (styles.showScores ?? true) && (hasCenterWeights || leftItems.some(i => i.weight !== undefined) || rightItems.some(i => i.weight !== undefined));

        // Render Bounds Calculation
        const maxLenL = Math.max(...leftItems.map(i => i.label.length), 0);
        const maxLenR = Math.max(...rightItems.map(i => i.label.length), 0);
        const maxLenC = Math.max(...centerItems.map(i => i.label.length), 0);

        // Reach factors for -45 degree rotation
        const labelReachLX = (maxLenL * styles.fontSize * 0.7) + 20;
        const labelReachLY = (maxLenL * styles.fontSize * 0.7) + 40;
        const labelReachRX = (maxLenR * styles.fontSize * 0.7) + 20;
        const labelReachRY = (maxLenR * styles.fontSize * 0.7) + 40;
        const labelReachCY = 40; 

        const centerLabelW = centerAxis.label.length * styles.fontSize * 0.8;
        const leftLabelW = leftAxis?.label.length * styles.fontSize * 0.8 || 0;
        const rightLabelW = rightAxis?.label.length * styles.fontSize * 0.8 || 0;
        const centerItemLabelW = maxLenC * styles.fontSize * 0.8;

        const allX = [
            0,
            -leftWidth,
            centerWidth,
            centerWidth + rightWidth,
            -leftWidth + (leftItems.length > 0 ? -labelReachLX : 0),
            centerWidth + rightWidth + (rightItems.length > 0 ? labelReachRX : 0),
            centerWidth / 2 - centerLabelW / 2,
            centerWidth / 2 + centerLabelW / 2,
            centerWidth / 2 - centerItemLabelW / 2,
            centerWidth / 2 + centerItemLabelW / 2,
            leftAxis ? -leftWidth + leftWidth / 2 - leftLabelW / 2 : 0,
            leftAxis ? -leftWidth + leftWidth / 2 + leftLabelW / 2 : 0,
            rightAxis ? centerWidth + rightWidth / 2 - rightLabelW / 2 : centerWidth,
            rightAxis ? centerWidth + rightWidth / 2 + rightLabelW / 2 : centerWidth
        ];

        const allY = [
            0,
            mainHeight + scoreAreaSize,
            -labelReachLY - 20,
            -labelReachRY - 20,
            -80 // Title position
        ];

        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);

        const totalW = (maxX - minX) + 20;
        const totalH = (maxY - minY) + 20;
        const cx = -minX + 10;
        const cy = -minY + 10;

        // Grid Origin relative to translated group
        const startX = 0; 
        const startY = 0;

        return {
            width: totalW, height: totalH,
            content: (
                <g transform={`translate(${cx}, ${cy})`}>
                    {/* Center Axis (A) */}
                    <g transform={`translate(${startX}, ${startY})`}>
                        <text x={centerWidth / 2} y={-40} textAnchor="middle" fontWeight="bold" fontSize={styles.fontSize + 2} fill={styles.axisColor}>{centerAxis.label}</text>
                        {centerItems.map((item, i) => (
                            <text key={item.id} x={centerWidth / 2} y={i * cellSize + cellSize / 2 + 4} textAnchor="middle" fontWeight="bold" fontSize={styles.fontSize} fill={styles.axisColor}>
                                {item.label} {item.weight !== undefined && <tspan fontSize={styles.fontSize * 0.8} fontWeight="normal" fill="#999">({item.weight})</tspan>}
                            </text>
                        ))}
                        <line x1={0} y1={0} x2={0} y2={mainHeight} stroke={styles.gridColor} strokeWidth={2} />
                        <line x1={centerWidth} y1={0} x2={centerWidth} y2={mainHeight} stroke={styles.gridColor} strokeWidth={2} />
                        {hasAnyWeights && centerScores.map((score, i) => (
                            <text key={`cs-${i}`} x={centerWidth / 2} y={i * cellSize + cellSize / 2 + 20} textAnchor="middle" fontSize={styles.fontSize * 0.7} fill="#666" fontWeight="bold">S: {score}</text>
                        ))}
                    </g>
                    {/* Left Matrix (BxA) */}
                    {leftAxis && leftMatrix && (
                        <g transform={`translate(${startX - leftWidth}, ${startY})`}>
                            <text x={leftWidth / 2} y={-80} textAnchor="middle" fontWeight="bold" fontSize={styles.fontSize + 2} fill={styles.axisColor}>{leftAxis.label}</text>
                            {leftItems.map((item, i) => (
                                <text key={item.id} x={i * cellSize + cellSize / 2} y={-10} transform={`rotate(-45, ${i * cellSize + cellSize / 2}, -10)`} textAnchor="start" fontSize={styles.fontSize * 0.9} fontWeight="bold" fill={styles.axisColor}>
                                    {item.label} {item.weight !== undefined && <tspan fontSize={styles.fontSize * 0.8} fontWeight="normal" fill="#999">[{item.weight}]</tspan>}
                                </text>
                            ))}
                            {Array.from({ length: leftItems.length + 1 }).map((_, i) => (
                                <line key={`lv${i}`} x1={i * cellSize} y1={0} x2={i * cellSize} y2={mainHeight + scoreAreaSize} stroke={styles.gridColor} strokeWidth={1} />
                            ))}
                            {Array.from({ length: centerItems.length + 1 }).map((_, i) => (
                                <line key={`lh${i}`} x1={0} y1={i * cellSize} x2={leftWidth} y2={i * cellSize} stroke={styles.gridColor} strokeWidth={1} />
                            ))}
                            <line x1={0} y1={mainHeight + scoreAreaSize} x2={leftWidth} y2={mainHeight + scoreAreaSize} stroke={styles.gridColor} strokeWidth={1} />
                            {centerItems.map((rItem, rIndex) => (
                                leftItems.map((cItem, cIndex) => {
                                    const cell = (leftMatrix?.cells || []).find(c => (c.rowId === rItem.id && c.colId === cItem.id) || (c.rowId === cItem.id && c.colId === rItem.id));
                                    return (
                                        <g key={`l-${rIndex}-${cIndex}`}>
                                            {cell && renderSymbol(cIndex * cellSize, rIndex * cellSize, cell.symbol)}
                                            <rect x={cIndex * cellSize} y={rIndex * cellSize} width={cellSize} height={cellSize} fill="transparent" className="cursor-pointer hover:bg-black/5"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (leftMatrix) {
                                                        const isRowCenter = leftMatrix.rowAxisId === centerAxisId;
                                                        if (onCellClick) onCellClick(isRowCenter ? rItem.id : cItem.id, isRowCenter ? cItem.id : rItem.id, cell?.symbol || 'None', leftMatrix.rowAxisId, leftMatrix.colAxisId);
                                                    }
                                                }} />
                                        </g>
                                    );
                                })
                            ))}
                            {hasAnyWeights && leftScores.map((score, i) => (
                                <text key={`ls-${i}`} x={i * cellSize + cellSize / 2} y={mainHeight + scoreAreaSize / 2 + 5} textAnchor="middle" fontSize={styles.fontSize} fontWeight="bold" fill={styles.axisColor}>{score}</text>
                            ))}
                        </g>
                    )}
                    {/* Right Matrix (AxC) */}
                    {rightAxis && rightMatrix && (
                        <g transform={`translate(${startX + centerWidth}, ${startY})`}>
                            <text x={rightWidth / 2} y={-80} textAnchor="middle" fontWeight="bold" fontSize={styles.fontSize + 2} fill={styles.axisColor}>{rightAxis.label}</text>
                            {rightItems.map((item, i) => (
                                <text key={item.id} x={i * cellSize + cellSize / 2} y={-10} transform={`rotate(-45, ${i * cellSize + cellSize / 2}, -10)`} textAnchor="start" fontSize={styles.fontSize * 0.9} fontWeight="bold" fill={styles.axisColor}>
                                    {item.label} {item.weight !== undefined && <tspan fontSize={styles.fontSize * 0.8} fontWeight="normal" fill="#999">[{item.weight}]</tspan>}
                                </text>
                            ))}
                            {Array.from({ length: rightItems.length + 1 }).map((_, i) => (
                                <line key={`rv${i}`} x1={i * cellSize} y1={0} x2={i * cellSize} y2={mainHeight + scoreAreaSize} stroke={styles.gridColor} strokeWidth={1} />
                            ))}
                            {Array.from({ length: centerItems.length + 1 }).map((_, i) => (
                                <line key={`rh${i}`} x1={0} y1={i * cellSize} x2={rightWidth} y2={i * cellSize} stroke={styles.gridColor} strokeWidth={1} />
                            ))}
                            <line x1={0} y1={mainHeight + scoreAreaSize} x2={rightWidth} y2={mainHeight + scoreAreaSize} stroke={styles.gridColor} strokeWidth={1} />
                            {centerItems.map((rItem, rIndex) => (
                                rightItems.map((cItem, cIndex) => {
                                    const cell = (rightMatrix?.cells || []).find(c => (c.rowId === rItem.id && c.colId === cItem.id) || (c.rowId === cItem.id && c.colId === rItem.id));
                                    return (
                                        <g key={`r-${rIndex}-${cIndex}`}>
                                            {cell && renderSymbol(cIndex * cellSize, rIndex * cellSize, cell.symbol)}
                                            <rect x={cIndex * cellSize} y={rIndex * cellSize} width={cellSize} height={cellSize} fill="transparent" className="cursor-pointer hover:bg-black/5"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (rightMatrix) {
                                                        const isRowCenter = rightMatrix.rowAxisId === centerAxisId;
                                                        if (onCellClick) onCellClick(isRowCenter ? rItem.id : cItem.id, isRowCenter ? cItem.id : rItem.id, cell?.symbol || 'None', rightMatrix.rowAxisId, rightMatrix.colAxisId);
                                                    }
                                                }} />
                                        </g>
                                    );
                                })
                            ))}
                            {hasAnyWeights && rightScores.map((score, i) => (
                                <text key={`rs-${i}`} x={i * cellSize + cellSize / 2} y={mainHeight + scoreAreaSize / 2 + 5} textAnchor="middle" fontSize={styles.fontSize} fontWeight="bold" fill={styles.axisColor}>{score}</text>
                            ))}
                        </g>
                    )}
                </g>
            )
        };
    };

    // --- Y-TYPE RENDERER (ISOMETRIC CUBE) ---
    const renderYType = () => {
        // Find Axes: A, B, C
        // Heuristic:
        // Top Face (A x B)
        // Left Face (B x C)
        // Right Face (C x A) (or A x C)

        // We need 3 axes.
        if (data.axes.length < 3) return null;
        // Assign based on matrices or order
        // Convention from DSL example:
        // A: Top-Right (u vector)
        // B: Top-Left (v vector)
        // C: Bottom (w vector)
        const axisA = data.axes[0]; // Top-Right
        const axisB = data.axes[1]; // Top-Left
        const axisC = data.axes[2]; // Bottom
        if (!axisA || !axisB || !axisC) return null;

        const itemsA = axisA.items;
        const itemsB = axisB.items;
        const itemsC = axisC.items;

        const matrixAB = data.matrices.find(m => (m.rowAxisId === axisA.id && m.colAxisId === axisB.id) || (m.rowAxisId === axisB.id && m.colAxisId === axisA.id));
        const matrixBC = data.matrices.find(m => (m.rowAxisId === axisB.id && m.colAxisId === axisC.id) || (m.rowAxisId === axisC.id && m.colAxisId === axisB.id));
        const matrixCA = data.matrices.find(m => (m.rowAxisId === axisC.id && m.colAxisId === axisA.id) || (m.rowAxisId === axisA.id && m.colAxisId === axisC.id));

        // Scoring Logic for Y-Type (Transmission)
        const calculateYScore = (itemsRow: any[], itemsCol: any[], matrix: any) => {
            return itemsCol.map(col => {
                let score = 0;
                const cells = (matrix?.cells || []).filter((c: any) => c.rowId === col.id || c.colId === col.id);
                cells.forEach((cell: any) => {
                    const rowItem = itemsRow.find(r => r.id === cell.rowId || r.id === cell.colId);
                    const weight = rowItem?.weight ?? 1;
                    score += weight * (SYMBOL_VALUES[cell.symbol] || 0);
                });
                return score;
            });
        };

        const scoresAB = calculateYScore(itemsA, itemsB, matrixAB);
        const scoresBC = calculateYScore(itemsB, itemsC, matrixBC);
        const scoresCA = calculateYScore(itemsC, itemsA, matrixCA);

        const hasAnyYWeights = (styles.showScores ?? true) && (itemsA.some(i => i.weight !== undefined) || itemsB.some(i => i.weight !== undefined) || itemsC.some(i => i.weight !== undefined));

        // Isometric Math
        const isoSize = cellSize; // Use standard size
        const isoWidth = isoSize * Math.cos(Math.PI / 6);
        const isoHeight = isoSize * Math.sin(Math.PI / 6);

        // Vector Definitions based on Orientation
        // Top-Down (Standard): A(UR), B(UL), C(Down) -> A(x,-y), B(-x,-y), C(0, s)
        const isBottomUp = false;

        const vecA = {
            x: isoWidth,
            y: -isoHeight
        };

        const vecB = {
            x: -isoWidth,
            y: -isoHeight
        };

        const vecC = {
            x: 0,
            y: isoSize
        };

        // Rotation angles for labels
        const rotA = -30;
        const rotB = 30;
        const rotC = 90;

        // Helpers to Draw Cells
        // Top/Bottom Face: p = center + a*vecA + b*vecB
        const drawTopCell = (r: number, c: number, symbol: string, rowId: string, colId: string, matrix: any) => {
            // Grid point
            const x = r * vecA.x + c * vecB.x;
            const y = r * vecA.y + c * vecB.y;

            // Vertices of the rhombus
            const p1 = { x: x, y: y }; // 0,0
            const p2 = { x: x + vecA.x, y: y + vecA.y }; // 1,0
            const p3 = { x: x + vecA.x + vecB.x, y: y + vecA.y + vecB.y }; // 1,1
            const p4 = { x: x + vecB.x, y: y + vecB.y }; // 0,1

            const points = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
            const centerX = (p1.x + p3.x) / 2;
            const centerY = (p1.y + p3.y) / 2;

            return (
                <g key={`top-${r}-${c}`}>
                    <polygon points={points} fill="white" stroke={styles.gridColor} strokeWidth={1} />
                    {renderSymbol(centerX - isoSize / 2, centerY - isoSize / 2, symbol)}
                    <polygon points={points} fill="transparent" className="cursor-pointer hover:fill-black/5"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onCellClick && matrix) onCellClick(rowId, colId, symbol as any, matrix.rowAxisId, matrix.colAxisId);
                        }}
                    />
                </g>
            );
        };

        const drawLeftCell = (r: number, c: number, symbol: string, rowId: string, colId: string, matrix: any) => {
            // B x C (B along v, C along w)
            // r index for B, c index for C
            const x = r * vecB.x + c * vecC.x;
            const y = r * vecB.y + c * vecC.y;

            const p1 = { x: x, y: y };
            const p2 = { x: x + vecB.x, y: y + vecB.y };
            const p3 = { x: x + vecB.x + vecC.x, y: y + vecB.y + vecC.y };
            const p4 = { x: x + vecC.x, y: y + vecC.y };

            const points = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
            // Use Matrix Transform for Symbol? Or just simple center?
            // Simple center is skewed. Ideally we transform the symbol group.
            // For now, simple center.
            const centerX = (p1.x + p3.x) / 2;
            const centerY = (p1.y + p3.y) / 2;

            return (
                <g key={`left-${r}-${c}`}>
                    <polygon points={points} fill="white" stroke={styles.gridColor} strokeWidth={1} />
                    {renderSymbol(centerX - isoSize / 2, centerY - isoSize / 2, symbol)}
                    <polygon points={points} fill="transparent" className="cursor-pointer hover:fill-black/5"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onCellClick && matrix) onCellClick(rowId, colId, symbol as any, matrix.rowAxisId, matrix.colAxisId);
                        }}
                    />
                </g>
            );
        };

        const drawRightCell = (r: number, c: number, symbol: string, rowId: string, colId: string, matrix: any) => {
            // C x A (C along w, A along u)
            // r index for A, c index for C (to match visual connection with others)
            // Actually, usually A is 'u'. So r along u?
            // Let's iterate A (vecA) and C (vecC).
            const x = r * vecA.x + c * vecC.x;
            const y = r * vecA.y + c * vecC.y;

            const p1 = { x: x, y: y };
            const p2 = { x: x + vecA.x, y: y + vecA.y };
            const p3 = { x: x + vecA.x + vecC.x, y: y + vecA.y + vecC.y };
            const p4 = { x: x + vecC.x, y: y + vecC.y };

            const points = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
            const centerX = (p1.x + p3.x) / 2;
            const centerY = (p1.y + p3.y) / 2;

            return (
                <g key={`right-${r}-${c}`}>
                    <polygon points={points} fill="white" stroke={styles.gridColor} strokeWidth={1} />
                    {renderSymbol(centerX - isoSize / 2, centerY - isoSize / 2, symbol)}
                    <polygon points={points} fill="transparent" className="cursor-pointer hover:fill-black/5"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onCellClick && matrix) onCellClick(rowId, colId, symbol as any, matrix.rowAxisId, matrix.colAxisId);
                        }}
                    />
                </g>
            );
        };

        // Render Bounds Calculation
        const maxLenA = Math.max(...itemsA.map(a => a.label.length), 0);
        const maxLenB = Math.max(...itemsB.map(b => b.label.length), 0);
        const titleOffsetA = (maxLenA * styles.fontSize * 0.4) + 20;
        const titleOffsetB = (maxLenB * styles.fontSize * 0.4) + 20;
        const labelReachAX = (maxLenA * styles.fontSize * 0.9) + 40;
        const labelReachAY = (maxLenA * styles.fontSize * 0.5) + 30;
        const labelReachBX = (maxLenB * styles.fontSize * 0.9) + 40;
        const labelReachBY = (maxLenB * styles.fontSize * 0.5) + 30;

        const allX = [
            0,
            itemsA.length * vecA.x,
            itemsB.length * vecB.x,
            itemsC.length * vecC.x,
            itemsA.length * vecA.x + itemsB.length * vecB.x,
            itemsB.length * vecB.x + itemsC.length * vecC.x,
            itemsA.length * vecA.x + itemsC.length * vecC.x,
            // Absolute Bottom Corner (A + B + C)
            itemsA.length * vecA.x + itemsB.length * vecB.x + itemsC.length * vecC.x,
            // Adjust reach points for labels (Left/Right extremities)
            itemsB.length * vecB.x - labelReachAX,
            itemsA.length * vecA.x + labelReachBX,
            // Title positions
            (itemsA.length / 2) * vecA.x + (itemsB.length + 2.0) * vecB.x,
            (itemsA.length + 2.0) * vecA.x + (itemsB.length / 2) * vecB.x,
            // Title reach
            (itemsA.length / 2) * vecA.x + (itemsB.length + 2.0) * vecB.x - titleOffsetA,
            (itemsA.length + 2.0) * vecA.x + (itemsB.length / 2) * vecB.x + titleOffsetB
        ];

        const allY = [
            0,
            itemsA.length * vecA.y,
            itemsB.length * vecB.y,
            itemsC.length * vecC.y,
            itemsA.length * vecA.y + itemsB.length * vecB.y,
            itemsB.length * vecB.y + itemsC.length * vecC.y,
            itemsA.length * vecA.y + itemsC.length * vecC.y,
            // Absolute Bottom Corner (A + B + C)
            itemsA.length * vecA.y + itemsB.length * vecB.y + itemsC.length * vecC.y,
            // Account for tilted labels and titles
            itemsA.length * vecA.y + itemsB.length * vecB.y - (Math.max(labelReachAY, labelReachBY, titleOffsetA, titleOffsetB) + 10),
            itemsC.length * vecC.y + 40 // C labels bottom
        ];

        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY_c = Math.min(...allY);
        const maxY_c = Math.max(...allY);

        const totalW = (maxX - minX) + 10;
        const totalH = (maxY_c - minY_c) + 10;

        const cx = -minX + 5;
        const cy = -minY_c + 5;

        return {
            width: totalW, height: totalH,
            content: (
                <g transform={`translate(${cx}, ${cy})`}>
                    {/* Top/Bottom Face (A x B) */}
                    {itemsA.map((a, ia) => (
                        itemsB.map((b, ib) => {
                            // Find cell in matrixAB
                            // row=a, col=b OR row=b, col=a
                            const cell = (matrixAB?.cells || []).find(cell => (cell.rowId === a.id && cell.colId === b.id) || (cell.colId === a.id && cell.rowId === b.id));
                            const symbol = cell?.symbol || 'None';

                            // Determine click IDs (Assume Matrix definition order or lexicographical?)
                            // If matrix is defined as a x b: row=a, col=b.
                            const mRowId = matrixAB?.rowAxisId === axisA.id ? a.id : b.id;
                            const mColId = matrixAB?.rowAxisId === axisA.id ? b.id : a.id;

                            // We pass normalized current symbol, but correct IDs for patching
                            return drawTopCell(ia, ib, symbol, mRowId, mColId, matrixAB);
                        })
                    ))}

                    {/* --- OUTER PERIMETER LABELS --- */}

                    {/* Top-Right Edge (Axis A) */}
                    {(() => {
                        const isLong = itemsA.some(a => a.label.length > 4);
                        const labelRot = isLong ? 30 : rotA;
                        const labelAnchor = isLong ? "end" : "middle";
                        const edgeOffset = isLong ? 0.8 : 0.5;

                        return (
                            <>
                                {itemsA.map((a, i) => {
                                    const x = (i + 0.5) * vecA.x + (itemsB.length + edgeOffset) * vecB.x;
                                    const y = (i + 0.5) * vecA.y + (itemsB.length + edgeOffset) * vecB.y;
                                    return (
                                        <g key={`la-outer-${i}`} transform={`translate(${x}, ${y}) rotate(${labelRot})`}>
                                            <text textAnchor={labelAnchor} fontSize={styles.fontSize * 0.8} fontWeight="bold" fill={styles.axisColor} dominantBaseline="middle">
                                                {a.label} {a.weight !== undefined && <tspan fontSize={styles.fontSize * 0.6} fontWeight="normal" fill="#999" dx={2}>({a.weight})</tspan>}
                                            </text>
                                            {hasAnyYWeights && <text y={-15} textAnchor={labelAnchor} fontSize={styles.fontSize * 0.7} fill="#666" fontWeight="bold">S: {scoresCA[i]}</text>}
                                        </g>
                                    );
                                })}
                                {itemsA.length > 0 && (
                                    <text
                                        x={(itemsA.length / 2) * vecA.x + (itemsB.length + 2.0) * vecB.x}
                                        y={(itemsA.length / 2) * vecA.y + (itemsB.length + 2.0) * vecB.y - titleOffsetA}
                                        transform={`rotate(${rotA}, ${(itemsA.length / 2) * vecA.x + (itemsB.length + 2.0) * vecB.x}, ${(itemsA.length / 2) * vecA.y + (itemsB.length + 2.0) * vecB.y - titleOffsetA})`}
                                        textAnchor="middle" fontSize={styles.fontSize * 0.9} fontWeight="bold" fill={styles.axisColor} pointerEvents="none"
                                    >
                                        {axisA.label}
                                    </text>
                                )}
                            </>
                        );
                    })()}

                    {/* Top-Left Edge (Axis B) */}
                    {(() => {
                        const isLong = itemsB.some(b => b.label.length > 4);
                        const labelRot = isLong ? -30 : rotB;
                        const labelAnchor = isLong ? "start" : "middle";
                        const edgeOffset = isLong ? 0.8 : 0.5;

                        return (
                            <>
                                {itemsB.map((b, i) => {
                                    const x = (itemsA.length + edgeOffset) * vecA.x + (i + 0.5) * vecB.x;
                                    const y = (itemsA.length + edgeOffset) * vecA.y + (i + 0.5) * vecB.y;
                                    return (
                                        <g key={`lb-outer-${i}`} transform={`translate(${x}, ${y}) rotate(${labelRot})`}>
                                            <text textAnchor={labelAnchor} fontSize={styles.fontSize * 0.8} fontWeight="bold" fill={styles.axisColor} dominantBaseline="middle">
                                                {b.label} {b.weight !== undefined && <tspan fontSize={styles.fontSize * 0.6} fontWeight="normal" fill="#999" dx={2}>({b.weight})</tspan>}
                                            </text>
                                            {hasAnyYWeights && <text y={-15} textAnchor={labelAnchor} fontSize={styles.fontSize * 0.7} fill="#666" fontWeight="bold">S: {scoresAB[i]}</text>}
                                        </g>
                                    );
                                })}
                                {itemsB.length > 0 && (
                                    <text
                                        x={(itemsA.length + 2.0) * vecA.x + (itemsB.length / 2) * vecB.x}
                                        y={(itemsA.length + 2.0) * vecA.y + (itemsB.length / 2) * vecB.y - titleOffsetB}
                                        transform={`rotate(${rotB}, ${(itemsA.length + 2.0) * vecA.x + (itemsB.length / 2) * vecB.x}, ${(itemsA.length + 2.0) * vecA.y + (itemsB.length / 2) * vecB.y - titleOffsetB})`}
                                        textAnchor="middle" fontSize={styles.fontSize * 0.9} fontWeight="bold" fill={styles.axisColor} pointerEvents="none"
                                    >
                                        {axisB.label}
                                    </text>
                                )}
                            </>
                        );
                    })()}


                    {/* Left Vertical Edge (Axis C for Left Face) */}
                    {itemsC.map((c, i) => (
                        <text key={`lc-left-outer-${i}`}
                            x={(itemsB.length + 0.4) * vecB.x} y={itemsB.length * vecB.y + (i + 0.5) * vecC.y + 2}
                            textAnchor="end" fontSize={styles.fontSize * 0.8} fontWeight="bold" fill={styles.axisColor}
                        >
                            {c.label} {c.weight !== undefined && <tspan fontSize={styles.fontSize * 0.6} fontWeight="normal" fill="#999" dx={2}>({c.weight})</tspan>}
                            {hasAnyYWeights && <tspan x={(itemsB.length + 0.4) * vecB.x} dy={15} fontSize={styles.fontSize * 0.7} fill="#666" fontWeight="bold">S: {scoresBC[i]}</tspan>}
                        </text>
                    ))}


                    {/* Left Face (B x C) */}
                    {/* B items along v (vecB), C items along w (vecC) */}
                    {itemsB.map((b, ib) => (
                        itemsC.map((c, ic) => {
                            const cell = (matrixBC?.cells || []).find(cell => (cell.rowId === b.id && cell.colId === c.id) || (cell.colId === b.id && cell.rowId === c.id));
                            const symbol = cell?.symbol || 'None';
                            const mRowId = matrixBC?.rowAxisId === axisB.id ? b.id : c.id;
                            const mColId = matrixBC?.rowAxisId === axisB.id ? c.id : b.id;

                            return drawLeftCell(ib, ic, symbol, mRowId, mColId, matrixBC);
                        })
                    ))}

                    {/* Right Face (C x A) */}
                    {/* A items along u (vecA), C items along w (vecC) */}
                    {itemsA.map((a, ia) => (
                        itemsC.map((c, ic) => {
                            const cell = (matrixCA?.cells || []).find(cell => (cell.rowId === a.id && cell.colId === c.id) || (cell.colId === a.id && cell.rowId === c.id));
                            const symbol = cell?.symbol || 'None';
                            const mRowId = matrixCA?.rowAxisId === axisA.id ? a.id : c.id;
                            const mColId = matrixCA?.rowAxisId === axisA.id ? c.id : a.id;

                            return drawRightCell(ia, ic, symbol, mRowId, mColId, matrixCA);
                        })
                    ))}
                    {/* Right Vertical Edge (Axis C for Right Face) */}
                    {itemsC.map((c, i) => (
                        <text key={`lc-right-outer-${i}`}
                            x={(itemsA.length + 0.4) * vecA.x} y={itemsA.length * vecA.y + (i + 0.5) * vecC.y + 2}
                            textAnchor="start" fontSize={styles.fontSize * 0.8} fontWeight="bold" fill={styles.axisColor}
                        >
                            {c.label} {c.weight !== undefined && <tspan fontSize={styles.fontSize * 0.6} fontWeight="normal" fill="#999" dx={2}>({c.weight})</tspan>}
                            {hasAnyYWeights && <tspan x={(itemsA.length + 0.4) * vecA.x} dy={15} fontSize={styles.fontSize * 0.7} fill="#666" fontWeight="bold">S: {scoresBC[i]}</tspan>}
                        </text>
                    ))}
                    {itemsC.length > 0 && <text
                        x={(itemsA.length + 2.0) * vecA.x} y={itemsA.length * vecA.y + (itemsC.length / 2) * vecC.y}
                        transform={`rotate(${rotC}, ${(itemsA.length + 2.0) * vecA.x}, ${itemsA.length * vecA.y + (itemsC.length / 2) * vecC.y})`}
                        textAnchor="middle" fontSize={styles.fontSize * 0.9} fontWeight="bold" fill={styles.axisColor} pointerEvents="none">{axisC.label}</text>}

                </g>
            )
        };
    };

    // --- X-TYPE RENDERER ---
    const renderXType = () => {
        const axisN = data.axes[0];
        const axisE = data.axes[1];
        const axisS = data.axes[2];
        const axisW = data.axes[3];

        if (!axisN || !axisE || !axisS || !axisW) return null;

        const itemsN = axisN.items;
        const itemsE = axisE.items;
        const itemsS = axisS.items;
        const itemsW = axisW.items;

        const getMatrix = (rAxis: any, cAxis: any) => data.matrices.find(m =>
            (m.rowAxisId === rAxis.id && m.colAxisId === cAxis.id) ||
            (m.rowAxisId === cAxis.id && m.colAxisId === rAxis.id)
        );

        const matrixNW = getMatrix(axisW, axisN);
        const matrixNE = getMatrix(axisE, axisN);
        const matrixSE = getMatrix(axisE, axisS);
        const matrixSW = getMatrix(axisW, axisS);

        // Scoring Logic for X-Type
        const calculateXScore = (rowItems: any[], colItems: any[], matrix: any) => {
            return colItems.map(col => {
                let score = 0;
                const cells = (matrix?.cells || []).filter((c: any) => c.rowId === col.id || c.colId === col.id);
                cells.forEach((cell: any) => {
                    const rowItem = rowItems.find(r => r.id === cell.rowId || r.id === cell.colId);
                    const weight = rowItem?.weight ?? 1;
                    score += weight * (SYMBOL_VALUES[cell.symbol] || 0);
                });
                return score;
            });
        };

        const scoresNW = calculateXScore(itemsW, itemsN, matrixNW);
        const scoresNE = calculateXScore(itemsE, itemsN, matrixNE);
        const scoresSE = calculateXScore(itemsE, itemsS, matrixSE);
        const scoresSW = calculateXScore(itemsW, itemsS, matrixSW);

        const hasAnyXWeights = (styles.showScores ?? true) && [itemsN, itemsE, itemsS, itemsW].flat().some(i => i.weight !== undefined);

        const size = cellSize;
        const axisWidth = 120; // Width of the axis items area (center arms)
        const centerGap = 20;  // Spacing in the exact center

        const drawGridX = (mx: any, rowItems: any[], colItems: any[], originX: number, originY: number, dirX: number, dirY: number, scores?: number[]) => {
            if (!mx) return null;
            return (
                <g>
                    {rowItems.map((r, ir) =>
                        colItems.map((c, ic) => {
                            const x = originX + (ic * size * dirX);
                            const y = originY + (ir * size * dirY);
                            const drawX = dirX < 0 ? x - size : x;
                            const drawY = dirY < 0 ? y - size : y;
                            const cell = (mx?.cells || []).find((cel: any) => (cel.rowId === r.id && cel.colId === c.id) || (cel.colId === r.id && cel.rowId === c.id));
                            const symbol = cell?.symbol || 'None';
                            return (
                                <g key={`${r.id}-${c.id}`}>
                                    <rect x={drawX} y={drawY} width={size} height={size} fill="white" stroke={styles.gridColor} strokeWidth={1} />
                                    {renderSymbol(drawX, drawY, symbol)}
                                    <rect x={drawX} y={drawY} width={size} height={size} fill="transparent" className="cursor-pointer hover:bg-black/5"
                                        onClick={(e) => { e.stopPropagation(); if (onCellClick) onCellClick(r.id, c.id, symbol as any, mx.rowAxisId, mx.colAxisId); }} />
                                </g>
                            );
                        })
                    )}
                    {/* Scores on the edge of the quadrant */}
                    {hasAnyXWeights && scores && colItems.map((c, ic) => {
                        const x = originX + (ic * size * dirX) + (size / 2 * dirX);
                        const y = originY + (rowItems.length * size * dirY) + (10 * dirY);
                        return <text key={`xs-${c.id}`} x={x} y={y} textAnchor="middle" fontSize={styles.fontSize * 0.8} fontWeight="bold" fill="#666">{scores[ic]}</text>;
                    })}
                </g>
            );
        };

        const maxArmLen = Math.max(itemsN.length, itemsE.length, itemsS.length, itemsW.length);
        
        const maxLenN = Math.max(...itemsN.map(i => i.label.length), 0);
        const maxLenS = Math.max(...itemsS.map(i => i.label.length), 0);
        const maxLenW = Math.max(...itemsW.map(i => i.label.length), 0);
        const maxLenE = Math.max(...itemsE.map(i => i.label.length), 0);

        const reachN = (maxLenN * styles.fontSize * 0.5) + (hasAnyXWeights ? 20 : 0);
        const reachS = (maxLenS * styles.fontSize * 0.5) + (hasAnyXWeights ? 20 : 0);
        const reachW = (maxLenW * styles.fontSize * 0.6);
        const reachE = (maxLenE * styles.fontSize * 0.6);

        const gridReach = maxArmLen * size + centerGap;
        
        const allX = [
            -gridReach, 
            gridReach,
            -gridReach - reachW,
            gridReach + reachE
        ];
        const allY = [
            -gridReach,
            gridReach,
            -gridReach - reachN,
            gridReach + reachS
        ];

        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);

        const totalW = (maxX - minX) + 40;
        const totalH = (maxY - minY) + 40;
        const cx = (totalW / 2) - ((maxX + minX) / 2);
        const cy = (totalH / 2) - ((maxY + minY) / 2);

        return {
            width: totalW, height: totalH,
            content: (
                <g transform={`translate(${cx}, ${cy})`}>
                    {/* North Axis (Up) */}
                    {itemsN.map((item, i) => (
                        <g key={item.id} transform={`translate(0, ${-centerGap - i * size - size / 2})`}>
                            <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={styles.fontSize} fontWeight="bold" fill={styles.axisColor}>{item.label}</text>
                        </g>
                    ))}

                    {/* South Axis (Down) */}
                    {itemsS.map((item, i) => (
                        <g key={item.id} transform={`translate(0, ${centerGap + i * size + size / 2})`}>
                            <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={styles.fontSize} fontWeight="bold" fill={styles.axisColor}>{item.label}</text>
                        </g>
                    ))}

                    {/* West Axis (Left) */}
                    {itemsW.map((item, i) => (
                        <g key={item.id} transform={`translate(${-centerGap - i * size - size / 2}, 0)`}>
                            <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={styles.fontSize} fontWeight="bold" fill={styles.axisColor}>{item.label}</text>
                        </g>
                    ))}

                    {/* East Axis (Right) */}
                    {itemsE.map((item, i) => (
                        <g key={item.id} transform={`translate(${centerGap + i * size + size / 2}, 0)`}>
                            <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={styles.fontSize} fontWeight="bold" fill={styles.axisColor}>{item.label}</text>
                        </g>
                    ))}

                    {/* Quadrant Grids */}
                    {drawGridX(matrixNW, itemsW, itemsN, -centerGap, -centerGap, -1, -1, scoresNW)}
                    {drawGridX(matrixNE, itemsE, itemsN, centerGap, -centerGap, 1, -1, scoresNE)}
                    {drawGridX(matrixSE, itemsE, itemsS, centerGap, centerGap, 1, 1, scoresSE)}
                    {drawGridX(matrixSW, itemsW, itemsS, -centerGap, centerGap, -1, 1, scoresSW)}
                </g>
            )
        };
    };

    // --- C-TYPE RENDERER (Roof / Correlation) ---
    const renderCType = () => {
        const axis = data.axes[0];
        if (!axis) return null;
        const items = axis.items;
        const n = items.length;
        const size = cellSize;
        const matrix = data.matrices[0];

        // Diagonal Grid logic:
        // Items are aligned along the bottom edge (horizontal).
        // Each correlation (i, j) is a diamond centered at:
        // x = (i + j) * size / 2
        // y = (j - i) * size / 2 (negative for going up)

        // Scoring Logic for C-Type (Self-Correlation / Conflict)
        const cScores = items.map(item => {
            let score = 0;
            const weight = item.weight ?? 1;
            const cells = (matrix?.cells || []).filter(c => c.rowId === item.id || c.colId === item.id);
            cells.forEach(cell => {
                score += weight * (SYMBOL_VALUES[cell.symbol] || 0);
            });
            return score;
        });

        const hasAnyCWeights = (styles.showScores ?? true) && items.some(i => i.weight !== undefined);

        // Render Bounds Calculation
        const maxLen = Math.max(...items.map(i => i.label.length), 0);
        const labelReachY = (maxLen * styles.fontSize * 0.8) + (hasAnyCWeights ? 30 : 10);
        const gridH = (n / 2) * size;

        const totalW = n * size + 40;
        const totalH = gridH + labelReachY + 40;

        const cx = 20 + size / 2;
        const cy = totalH - labelReachY - 10;

        return {
            width: totalW, height: totalH,
            content: (
                <g transform={`translate(${cx}, ${cy})`}>
                    {/* Items label along the base */}
                    {items.map((item, i) => (
                        <g key={item.id} transform={`translate(${i * size}, 0)`}>
                            <text x={0} y={20} textAnchor="middle" fontSize={styles.fontSize} fontWeight="bold" fill={styles.axisColor}>{item.label}</text>
                            {hasAnyCWeights && <text x={0} y={35} textAnchor="middle" fontSize={styles.fontSize * 0.8} fill="#666" fontWeight="bold">S: {cScores[i]}</text>}
                        </g>
                    ))}

                    {/* Triangular Grid */}
                    {items.map((itemI, i) => (
                        items.slice(i + 1).map((itemJ, idx) => {
                            const j = i + 1 + idx;
                            const cell = (matrix?.cells || []).find(c => (c.rowId === itemI.id && c.colId === itemJ.id) || (c.colId === itemI.id && c.rowId === itemJ.id));
                            const symbol = cell?.symbol || 'None';
                            const cx = (i + j) * size / 2;
                            const cy = -(j - i) * size / 2;
                            const s2 = size / 2;
                            const points = `${cx},${cy - s2} ${cx + s2},${cy} ${cx},${cy + s2} ${cx - s2},${cy}`;
                            return (
                                <g key={`${itemI.id}-${itemJ.id}`}>
                                    <polygon points={points} fill="white" stroke={styles.gridColor} strokeWidth={1} />
                                    {renderSymbol(cx - s2, cy - s2, symbol)}
                                    <polygon points={points} fill="transparent" className="cursor-pointer hover:fill-black/5"
                                        onClick={(e) => { e.stopPropagation(); if (onCellClick) onCellClick(itemI.id, itemJ.id, symbol as any, axis.id, axis.id); }} />
                                </g>
                            );
                        })
                    ))}
                </g>
            )
        };
    };

    // --- MAIN RENDER LOGIC ---
    let layout = null;
    const typeStr = data.type.toUpperCase();

    if (typeStr === 'T' || typeStr === 'T-TYPE') {
        layout = renderTType();
    } else if (typeStr === 'Y' || typeStr === 'Y-TYPE') {
        layout = renderYType();
    } else if (typeStr === 'X' || typeStr === 'X-TYPE') {
        layout = renderXType();
    } else if (typeStr === 'C' || typeStr === 'C-TYPE') {
        layout = renderCType();
    } else {
        layout = renderLType();
    }

    const { width = 800, height = 600, content = null } = layout || {};

    // Auto-Fit Effect (Shared)
    React.useEffect(() => {
        if (containerRef.current && layout) {
            const { clientWidth, clientHeight } = containerRef.current;
            if (clientWidth === 0 || clientHeight === 0) return;

            const padding = 4;
            const titleHeight = 0;
            const renderW = width;
            const renderH = height;

            const scaleX = (clientWidth - padding) / renderW;
            const scaleY = (clientHeight - padding) / renderH;
            const fitScale = Math.min(scaleX, scaleY, 3);
            const x = (clientWidth - renderW * fitScale) / 2;
            const y = (clientHeight - renderH * fitScale) / 2;

            setTransform({ x, y, k: fitScale });
        }
    }, [width, height, data.title, !!layout]);

    // Imperative Handle (Shared)
    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            if (!svgRef.current) return '';
            return await svgToDataURL(svgRef.current, {
                pixelRatio: options?.pixelRatio || 3,
                backgroundColor: options?.backgroundColor || '#FFFFFF',
                width: options?.width,
                height: options?.height
            });
        },
        exportPNG: (transparent = false, scale = 3) => {
            if (!svgRef.current || !layout) return;

            const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
            svgClone.setAttribute('width', width.toString());
            svgClone.setAttribute('height', height.toString());
            svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

            const svgData = new XMLSerializer().serializeToString(svgClone);
            const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                // Scale according to the parameter
                canvas.width = width * scale;
                canvas.height = height * scale;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.scale(scale, scale);
                    if (!transparent) {
                        ctx.fillStyle = "#FFFFFF";
                        ctx.fillRect(0, 0, width, height);
                    }
                    ctx.drawImage(img, 0, 0);
                    const link = document.createElement("a");
                    link.download = `matrix-chart-${Date.now()}.png`;
                    link.href = canvas.toDataURL("image/png");
                    link.click();
                    URL.revokeObjectURL(url);
                }
            };
            img.src = url;
        },
        exportPDF: (transparent = false) => {
            if (!svgRef.current || !layout) return;

            const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
            svgClone.setAttribute('width', width.toString());
            svgClone.setAttribute('height', height.toString());
            svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

            const svgData = new XMLSerializer().serializeToString(svgClone);
            const canvas = document.createElement("canvas");
            // 2x scale for high resolution
            canvas.width = width * 2;
            canvas.height = height * 2;
            const ctx = canvas.getContext("2d");
            const img = new Image();
            const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                if (ctx) {
                    ctx.scale(2, 2);
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0);
                    const imgData = canvas.toDataURL("image/png");

                    const win = window.open('', '_blank');
                    if (win) {
                        win.document.write(`
                            <html>
                            <head><title>Export PDF - 澄矩 · ChengJu</title></head>
                            <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#F5F7FA; font-family: -apple-system, sans-serif;">
                                <div style="padding: 40px; background: #fff; box-shadow: 0 40px 100px rgba(0,0,0,0.05); border-radius: 20px; text-align: center;">
                                <img src="${imgData}" style="max-width:100%; height:auto;" />
                                <div style="margin-top: 20px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                                    Matrix Chart Report | 澄矩 · ChengJu
                                </div>
                                </div>
                                <script>
                                window.onload = () => {
                                    setTimeout(() => {
                                    window.print();
                                    window.close();
                                    }, 800);
                                }
                                </script>
                            </body>
                            </html>
                        `);
                        win.document.close();
                    }
                    URL.revokeObjectURL(url);
                }
            };
            img.src = url;
        },
        tidyLayout: () => {
            if (containerRef.current && layout) {
                const { clientWidth, clientHeight } = containerRef.current;
                const fitScale = Math.min((clientWidth - 4) / width, (clientHeight - 4) / height, 10);
                setTransform({ x: (clientWidth - width * fitScale) / 2, y: (clientHeight - height * fitScale) / 2, k: fitScale });
            }
        }
    }));

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault(); e.stopPropagation();
        const scaleAmount = -e.deltaY * 0.0015;
        setTransform(prev => ({ ...prev, k: Math.max(0.1, Math.min(5, prev.k * (1 + scaleAmount))) }));
    };
    const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); lastPos.current = { x: e.clientX, y: e.clientY }; };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => setIsDragging(false);

    if (!layout) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-white text-[var(--sidebar-text)]">
                <div className="text-center space-y-2">
                    <div className="text-lg font-medium">等待矩阵数据定义...</div>
                    <div className="text-sm">请在左侧编辑器中定义维度轴和项目</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-hidden bg-white flex items-center justify-center cursor-move"
            onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white">
                <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`, transformOrigin: '0 0', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }} className="absolute top-0 left-0">
                    <div className="inline-block px-4 py-2 border border-transparent">
                        <svg ref={svgRef} width={width} height={height}>
                            {content}
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
});
