import React, { useRef, useImperativeHandle, forwardRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
    AffinityItem,
    AffinityChartStyles,
    DEFAULT_AFFINITY_STYLES,
    BaseDiagramRef
} from '../types';

export interface AffinityDiagramRef extends BaseDiagramRef {
    resetView: () => void;
}

interface AffinityDiagramProps {
    data: AffinityItem[];
    styles?: AffinityChartStyles;
    className?: string;
}

const MIN_PLATE_WIDTH = 120;
const MIN_PLATE_HEIGHT = 44;
const PLATE_SIDE_PADDING = 24;
const HEADER_HEIGHT = 42;

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const AffinityDiagram = forwardRef<AffinityDiagramRef, AffinityDiagramProps>(
    ({ data, styles, className }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
        const [scale, setScale] = useState(1);
        const [offset, setOffset] = useState({ x: 0, y: 0 });
        const [isDragging, setIsDragging] = useState(false);
        const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

        const finalStyles = useMemo(() => ({
            ...DEFAULT_AFFINITY_STYLES,
            ...styles
        }), [styles]);

        const handleResetView = useCallback(() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
        }, []);

        useImperativeHandle(ref, () => ({
            getDataURL: async (options) => {
                const pixelRatio = options?.pixelRatio || 3;
                const backgroundColor = options?.backgroundColor || '#FFFFFF';
                const transparent = backgroundColor === 'transparent';
                
                const contentSize = calculateContentSize(data, finalStyles);
                const exportWidth = options?.width || contentSize.width;
                const exportHeight = options?.height || contentSize.height;
                
                const exportCanvas = document.createElement('canvas');
                
                // 考虑导出倍率
                exportCanvas.width = exportWidth * pixelRatio;
                exportCanvas.height = exportHeight * pixelRatio;
                
                const ctx = exportCanvas.getContext('2d')!;
                ctx.scale(pixelRatio, pixelRatio);

                ctx.clearRect(0, 0, exportWidth, exportHeight);

                if (!transparent) {
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(0, 0, exportWidth, exportHeight);
                }
                
                if (finalStyles.type === 'Label') {
                    renderLabelStyle(ctx, data, finalStyles, { width: exportWidth, height: exportHeight });
                } else {
                    renderPlateStyle(ctx, data, finalStyles, { width: exportWidth, height: exportHeight });
                }
                
                return exportCanvas.toDataURL('image/png');
            },
            tidyLayout: handleResetView,
            resetView: handleResetView,
            exportPNG(transparent = false, scale = 3) {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const contentSize = calculateContentSize(data, finalStyles);
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = contentSize.width * scale;
                exportCanvas.height = contentSize.height * scale;
                const ctx = exportCanvas.getContext('2d')!;
                ctx.scale(scale, scale);

                // Clear first
                ctx.clearRect(0, 0, contentSize.width, contentSize.height);

                if (!transparent) {
                    ctx.fillStyle = finalStyles.background || '#FFFFFF';
                    ctx.fillRect(0, 0, contentSize.width, contentSize.height);
                }
                if (finalStyles.type === 'Label') {
                    renderLabelStyle(ctx, data, finalStyles, { width: contentSize.width, height: contentSize.height });
                } else {
                    renderPlateStyle(ctx, data, finalStyles, { width: contentSize.width, height: contentSize.height });
                }
                const link = document.createElement('a');
                link.download = `亲和图_${Date.now()}.png`;
                link.href = exportCanvas.toDataURL('image/png');
                link.click();
            },
        }));

        const handleWheel = useCallback((e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
        }, []);

        const handleMouseDown = useCallback((e: React.MouseEvent) => {
            setIsDragging(true);
            setLastMouse({ x: e.clientX, y: e.clientY });
        }, []);

        const handleMouseMove = useCallback((e: React.MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - lastMouse.x;
            const dy = e.clientY - lastMouse.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMouse({ x: e.clientX, y: e.clientY });
        }, [isDragging, lastMouse]);

        const handleMouseUp = useCallback(() => setIsDragging(false), []);

        useEffect(() => {
            if (!containerRef.current) return;
            const resizeObserver = new ResizeObserver((entries) => {
                const { width, height } = entries[0].contentRect;
                if (width > 0 && height > 0) setDimensions({ width, height });
            });
            resizeObserver.observe(containerRef.current);
            return () => resizeObserver.disconnect();
        }, []);

        useEffect(() => {
            const container = containerRef.current;
            if (!container) return;
            container.addEventListener('wheel', handleWheel, { passive: false });
            return () => container.removeEventListener('wheel', handleWheel);
        }, [handleWheel]);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas || !data || data.length === 0) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const dpr = window.devicePixelRatio || 1;
            canvas.width = dimensions.width * dpr;
            canvas.height = dimensions.height * dpr;
            canvas.style.width = `${dimensions.width}px`;
            canvas.style.height = `${dimensions.height}px`;
            ctx.scale(dpr, dpr);

            // --- AUTO-SCALING LOGIC ---
            // Root Item is Virtual
            // If data is array of items (which it is), we wrap them in a virtual root just for calculation?
            // The legacy code assumed data was children of root.
            const rootItem: AffinityItem = { id: 'root', label: finalStyles.title, children: data };

            const contentSize = finalStyles.type === 'Card'
                ? measurePlate(ctx, rootItem, finalStyles, 0)
                : measureTree(ctx, rootItem, finalStyles, 0);

            // Padding
            const viewportPadding = 60;
            const availW = dimensions.width - viewportPadding;
            const availH = dimensions.height - viewportPadding;

            let autoScale = 1;
            if (contentSize.width > availW || contentSize.height > availH) {
                autoScale = Math.min(availW / contentSize.width, availH / contentSize.height);
                autoScale = Math.min(1, autoScale);
            }

            const currentScale = scale * autoScale;

            ctx.clearRect(0, 0, dimensions.width, dimensions.height); // Transparent background

            ctx.save();
            ctx.translate(dimensions.width / 2 + offset.x, dimensions.height / 2 + offset.y);
            ctx.scale(currentScale, currentScale);
            ctx.translate(-dimensions.width / 2, -dimensions.height / 2);

            if (finalStyles.type === 'Label') {
                renderLabelStyle(ctx, data, finalStyles, dimensions);
            } else {
                renderPlateStyle(ctx, data, finalStyles, dimensions);
            }

            ctx.restore();
        }, [data, finalStyles, dimensions, scale, offset]);

        return (
            <div
                ref={containerRef}
                className={className}
                style={{
                    width: '100%', height: '100%', minHeight: '400px',
                    borderRadius: '8px',
                    overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab',
                    // Background is handled by parent or canvas clear
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
            </div>
        );
    }
);

// --- RENDERERS ---

function calculateContentSize(data: AffinityItem[], styles: Required<AffinityChartStyles>): { width: number; height: number } {
    const dummyCtx = document.createElement('canvas').getContext('2d')!;
    const rootItem: AffinityItem = { id: 'root', label: styles.title, children: data };
    if (styles.type === 'Card') {
        const size = measurePlate(dummyCtx, rootItem, styles, 0);
        return { width: size.width + 200, height: size.height + 200 };
    } else {
        const size = measureTree(dummyCtx, rootItem, styles, 0);
        return { width: size.width + 200, height: size.height + 200 };
    }
}

function measurePlate(ctx: CanvasRenderingContext2D, item: AffinityItem, styles: Required<AffinityChartStyles>, depth: number, widthConstraint: number = 0): { width: number; height: number } {
    const fs = depth === 0 ? styles.titleFontSize : (depth === 1 ? styles.groupHeaderFontSize : styles.itemFontSize);
    ctx.font = `bold ${fs}px "Microsoft YaHei", sans-serif`;
    const labelW = ctx.measureText(item.label).width + 40;

    let frameW = widthConstraint;
    if (depth === 0 && frameW === 0) {
        frameW = 1200;
    }
    const titleW = Math.max(labelW, frameW - 2 * PLATE_SIDE_PADDING);

    if (!item.children || item.children.length === 0) {
        return { width: frameW, height: MIN_PLATE_HEIGHT };
    }

    let childWidthConstraint = 0;
    if (depth === 0) {
        const gapTotal = (item.children.length - 1) * styles.itemGap;
        childWidthConstraint = (titleW - gapTotal) / item.children.length;
        childWidthConstraint = Math.max(childWidthConstraint, MIN_PLATE_WIDTH);
    } else {
        childWidthConstraint = titleW;
    }

    const childSizes = item.children.map(c => measurePlate(ctx, c, styles, depth + 1, childWidthConstraint));

    if (depth === 0) {
        const maxChildH = Math.max(...childSizes.map(s => s.height));
        const actualContentW = childSizes.reduce((s, c) => s + c.width, 0) + (item.children.length - 1) * styles.itemGap;
        const actualFrameW = Math.max(frameW, actualContentW + 2 * PLATE_SIDE_PADDING);

        const firstChildIsCard = item.children[0].children && item.children[0].children.length > 0;
        const rootPaddingTop = 21 + styles.itemGap + (firstChildIsCard ? 21 : 0);

        return {
            width: actualFrameW,
            height: rootPaddingTop + maxChildH + 40
        };
    } else {
        let totalContentH = 0;
        item.children.forEach((child, i) => {
            const size = childSizes[i];
            const isCard = child.children && child.children.length > 0;
            if (i === 0) {
                const padding = 21 + styles.itemGap + (isCard ? 21 : 0);
                totalContentH += padding + size.height;
            } else {
                const gap = styles.itemGap + (isCard ? 21 : 0);
                totalContentH += gap + size.height;
            }
        });

        return {
            width: frameW,
            height: totalContentH + styles.itemGap
        };
    }
}

function drawPlate(ctx: CanvasRenderingContext2D, item: AffinityItem, x: number, y: number, width: number, height: number, styles: Required<AffinityChartStyles>, depth: number) {
    if (!item.children || item.children.length === 0) {
        ctx.fillStyle = styles.itemBackgroundColor;
        ctx.strokeStyle = styles.borderColor;
        ctx.lineWidth = 1;
        roundRect(ctx, x, y, width, height, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = `normal ${styles.itemFontSize}px "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = styles.itemTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, x + width / 2, y + height / 2);
        return;
    }

    const fs = depth === 0 ? styles.titleFontSize : (depth === 1 ? styles.groupHeaderFontSize : styles.itemFontSize);
    const textColor = depth === 0 ? styles.titleTextColor : (depth === 1 ? styles.groupHeaderTextColor : styles.itemTextColor);
    ctx.font = `bold ${fs}px "Microsoft YaHei", sans-serif`;

    const headerW = width - 2 * PLATE_SIDE_PADDING;
    const headerH = HEADER_HEIGHT;
    const headerRect = {
        x: x + (width - headerW) / 2,
        y: y - headerH / 2,
        w: headerW,
        h: headerH
    };

    const bgColor = depth === 0 ? styles.titleBackgroundColor : hexToRgba(styles.groupHeaderBackgroundColor, Math.min(0.6, depth * 0.15));
    const borderW = depth === 0 ? 3 : 1.5;

    ctx.strokeStyle = styles.borderColor;
    ctx.lineWidth = borderW;
    ctx.fillStyle = bgColor;
    roundRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = depth === 0 ? styles.titleBackgroundColor : styles.groupHeaderBackgroundColor;
    ctx.fillRect(headerRect.x, headerRect.y, headerRect.w, headerRect.h);

    ctx.strokeStyle = styles.borderColor;
    ctx.lineWidth = borderW;
    roundRect(ctx, headerRect.x, headerRect.y, headerRect.w, headerRect.h, 4);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.label, headerRect.x + headerRect.w / 2, headerRect.y + headerRect.h / 2);

    if (item.children && item.children.length > 0) {
        if (depth === 0) {
            const gapTotal = (item.children.length - 1) * styles.itemGap;
            const childSizes = item.children.map(child => {
                const childW = (headerW - gapTotal) / item.children!.length;
                return measurePlate(ctx, child, styles, depth + 1, childW);
            });
            const totalWidthUsed = childSizes.reduce((s, c) => s + c.width, 0) + gapTotal;
            const firstChildIsCard = item.children[0].children && item.children[0].children.length > 0;
            const rootPaddingTop = 21 + styles.itemGap + (firstChildIsCard ? 21 : 0);

            let curX = x + (width - totalWidthUsed) / 2;
            let curY = y + rootPaddingTop;

            item.children.forEach((child, i) => {
                drawPlate(ctx, child, curX, curY, childSizes[i].width, childSizes[i].height, styles, depth + 1);
                curX += childSizes[i].width + styles.itemGap;
            });
        } else {
            let curY = y;
            item.children.forEach((child, i) => {
                const isCard = child.children && child.children.length > 0;
                const childW = headerW;
                const measuredSize = measurePlate(ctx, child, styles, depth + 1, childW);
                const centeredX = x + (width - measuredSize.width) / 2;

                if (i === 0) {
                    const firstPadding = 21 + styles.itemGap + (isCard ? 21 : 0);
                    curY += firstPadding;
                } else {
                    const gap = styles.itemGap + (isCard ? 21 : 0);
                    curY += gap;
                }

                drawPlate(ctx, child, centeredX, curY, measuredSize.width, measuredSize.height, styles, depth + 1);
                curY += measuredSize.height;
            });
        }
    }
}

function renderPlateStyle(ctx: CanvasRenderingContext2D, data: AffinityItem[], styles: Required<AffinityChartStyles>, dimensions: { width: number; height: number }) {
    const rootItem: AffinityItem = { id: 'root', label: styles.title, children: data };
    const size = measurePlate(ctx, rootItem, styles, 0);
    const sx = (dimensions.width - size.width) / 2;
    const sy = (dimensions.height - size.height) / 2;
    drawPlate(ctx, rootItem, sx, sy, size.width, size.height, styles, 0);
}

function measureTree(ctx: CanvasRenderingContext2D, item: AffinityItem, styles: Required<AffinityChartStyles>, depth: number): { width: number; height: number } {
    const fs = depth === 0 ? styles.titleFontSize : (depth === 1 ? styles.groupHeaderFontSize : styles.itemFontSize); // Added group support in tree sizing
    ctx.font = `bold ${fs}px sans-serif`;
    const tw = ctx.measureText(item.label).width + 36;
    const th = 40;

    if (!item.children || item.children.length === 0) return { width: tw, height: th };

    if (styles.layout === 'Vertical') { // Should be Horizontal layout in standard terms? The legacy code says "Vertical" for the wide tree.
        const childSizes = item.children.map(c => measureTree(ctx, c, styles, depth + 1));
        const totalChildW = childSizes.reduce((sum, s) => sum + s.width, 0) + (childSizes.length - 1) * styles.itemGap;
        const maxChildH = Math.max(...childSizes.map(s => s.height));
        const levelGap = 2 * styles.itemGap;
        return {
            width: Math.max(tw, totalChildW),
            height: th + levelGap + maxChildH
        };
    } else {
        // Horizontal (Left-to-Right)
        const childSizes = item.children.map(c => measureTree(ctx, c, styles, depth + 1));
        const maxChildW = Math.max(...childSizes.map(s => s.width));
        const totalChildH = childSizes.reduce((sum, s) => sum + s.height, 0) + (childSizes.length - 1) * styles.itemGap;
        const levelGap = 2 * styles.itemGap;
        return {
            width: tw + levelGap + maxChildW,
            height: Math.max(th, totalChildH)
        };
    }
}

function drawTree(ctx: CanvasRenderingContext2D, item: AffinityItem, x: number, y: number, styles: Required<AffinityChartStyles>, depth: number) {
    const fs = depth === 0 ? styles.titleFontSize : (depth === 1 ? styles.groupHeaderFontSize : styles.itemFontSize);
    ctx.font = `bold ${fs}px sans-serif`;
    const tw = ctx.measureText(item.label).width + 36;
    const th = 38;

    const nodeX = x;
    const nodeY = y;

    ctx.fillStyle = depth === 0 ? styles.titleBackgroundColor : (depth === 1 ? styles.groupHeaderBackgroundColor : styles.itemBackgroundColor);
    ctx.strokeStyle = styles.borderColor;
    ctx.lineWidth = depth === 0 ? 2 : 1;
    roundRect(ctx, nodeX, nodeY - th / 2, tw, th, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = depth === 0 ? styles.titleTextColor : (depth === 1 ? styles.groupHeaderTextColor : styles.itemTextColor);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.label, nodeX + tw / 2, nodeY);

    if (item.children && item.children.length > 0) {
        if (styles.layout === 'Vertical') {
            const childSizes = item.children.map(c => measureTree(ctx, c, styles, depth + 1));
            const totalChildW = childSizes.reduce((sum, s) => sum + s.width, 0) + (item.children.length - 1) * styles.itemGap;
            let startChildX = nodeX - totalChildW / 2 + tw / 2;
            const levelGap = 2 * styles.itemGap;
            const midY = nodeY + th / 2 + levelGap / 2;
            const childY = nodeY + th / 2 + levelGap;

            ctx.beginPath();
            ctx.strokeStyle = styles.lineColor;
            ctx.lineWidth = 1.2;
            ctx.moveTo(nodeX + tw / 2, nodeY + th / 2);
            ctx.lineTo(nodeX + tw / 2, midY);
            ctx.stroke();

            if (item.children.length > 1) {
                const firstChildCenter = startChildX + childSizes[0].width / 2;
                const lastChildCenter = startChildX + totalChildW - childSizes[childSizes.length - 1].width / 2;
                ctx.beginPath();
                ctx.moveTo(firstChildCenter, midY);
                ctx.lineTo(lastChildCenter, midY);
                ctx.stroke();
            }

            item.children.forEach((child, i) => {
                const cs = childSizes[i];
                const cx = startChildX;
                const childCenterX = cx + cs.width / 2;
                ctx.beginPath();
                ctx.moveTo(childCenterX, midY);
                ctx.lineTo(childCenterX, childY);
                ctx.stroke();
                drawTree(ctx, child, cx + (cs.width - (ctx.measureText(child.label).width + 36)) / 2, childY + th / 2, styles, depth + 1);
                startChildX += cs.width + styles.itemGap;
            });
        } else {
            const levelGap = 2 * styles.itemGap;
            const childX = nodeX + tw + levelGap;
            const childSizes = item.children.map(c => measureTree(ctx, c, styles, depth + 1));
            const totalH = childSizes.reduce((sum, s) => sum + s.height, 0) + (item.children.length - 1) * styles.itemGap;
            let startChildY = nodeY - totalH / 2;
            const midX = nodeX + tw + levelGap / 2;

            if (item.children.length > 1) {
                ctx.beginPath();
                ctx.strokeStyle = styles.lineColor;
                ctx.lineWidth = 1.2;
                ctx.moveTo(midX, startChildY + childSizes[0].height / 2);
                ctx.lineTo(midX, startChildY + totalH - childSizes[childSizes.length - 1].height / 2);
                ctx.stroke();
            }

            item.children.forEach((child, i) => {
                const cs = childSizes[i];
                const cy = startChildY + cs.height / 2;
                ctx.beginPath();
                ctx.strokeStyle = styles.lineColor;
                ctx.moveTo(nodeX + tw, nodeY);
                ctx.lineTo(midX, nodeY);
                ctx.moveTo(midX, cy);
                ctx.lineTo(childX, cy);
                ctx.stroke();
                drawTree(ctx, child, childX, cy, styles, depth + 1);
                startChildY += cs.height + styles.itemGap;
            });
        }
    }
}

function renderLabelStyle(ctx: CanvasRenderingContext2D, data: AffinityItem[], styles: Required<AffinityChartStyles>, dimensions: { width: number; height: number }) {
    const rootItem: AffinityItem = { id: 'root', label: styles.title, children: data };
    const size = measureTree(ctx, rootItem, styles, 0);
    const sx = (dimensions.width - size.width) / 2;

    if (styles.layout === 'Vertical') { // Wide tree
        const fs = styles.titleFontSize;
        ctx.font = `bold ${fs}px sans-serif`;
        const rootTw = ctx.measureText(rootItem.label).width + 36;
        const rootTh = 40;
        const sy = (dimensions.height - size.height) / 2 + rootTh / 2;
        const rootX = sx + (size.width - rootTw) / 2;
        drawTree(ctx, rootItem, rootX, sy, styles, 0);
    } else { // Left to Right
        const sy = dimensions.height / 2;
        drawTree(ctx, rootItem, sx, sy, styles, 0);
    }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}
