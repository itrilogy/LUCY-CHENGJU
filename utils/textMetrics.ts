/**
 * SVG / Canvas 文本度量 · 单一真源
 *
 * 起因：箭头图与关联图各自写了一套「按字符数 * fontSize 估算宽度」，两处都
 * **未区分中英文字宽**：
 *
 * ```ts
 * // 关联图原实现
 * [Math.max(120, node.label.length * (fontSize - 2) + 40), 50]
 * ```
 * 汉字是全角（≈1em），拉丁字母/数字/半空格约为 0.55em。直接用 `length` 会把
 * **中文标签算窄（文字溢出容器）**、把**英文标签算宽（留白过大）**。
 *
 * 本模块用逐字符字宽表估算，供箭头图（连线标号自适应）、关联图（节点尺寸）、
 * 以及后续任何需要「按文本定尺寸」的渲染层共用。
 */

/** 单字符宽度（以 em 为单位） */
function charWidth(ch: string): number {
    const code = ch.codePointAt(0) ?? 0;
    // 中日韩统一表意文字 / 全角标点 / 假名 / 谚文 → 全角
    if (
        (code >= 0x1100 && code <= 0x115f) ||   // 谚文字母
        (code >= 0x2e80 && code <= 0xa4cf) ||   // 中日韩部首、假名、注音、汉字
        (code >= 0xac00 && code <= 0xd7a3) ||   // 谚文音节
        (code >= 0xf900 && code <= 0xfaff) ||   // 兼容汉字
        (code >= 0xfe30 && code <= 0xfe6f) ||   // 全角标点
        (code >= 0xff00 && code <= 0xff60) ||   // 全角字符
        (code >= 0xffe0 && code <= 0xffe6)
    ) return 1;
    if (ch === ' ') return 0.28;
    if (/[.,:;!|'"`]/.test(ch)) return 0.28;
    if (/[iljtIf]/.test(ch)) return 0.32;
    if (/[A-Z@%&WM]/.test(ch)) return 0.72;
    return 0.56;                                 // 其余拉丁字母 / 数字
}

/**
 * 估算一段文本在给定字号下的像素宽度。
 * @param text     文本（可含换行，取最长行）
 * @param fontSize 字号（px）
 */
export function estimateTextWidth(text: string, fontSize: number): number {
    if (!text) return 0;
    return text
        .split('\n')
        .reduce((max, line) => {
            let em = 0;
            for (const ch of line) em += charWidth(ch);
            return Math.max(max, em * fontSize);
        }, 0);
}

export interface FitTextResult {
    /** 实际使用的字号（未超限时等于传入值） */
    size: number;
    /** 文本实际估算宽度 */
    width: number;
    /** 建议的容器宽度（含左右留白） */
    boxWidth: number;
}

/**
 * 在**最大可用宽度**内放下文本：未超限则用原字号，超限则同比缩小字号
 * （下限 `minSize`），并给出建议容器宽度。
 *
 * @param text      文本
 * @param fontSize  期望字号
 * @param maxWidth  容器可用宽度上限
 * @param minSize   字号下限，默认 9（低于此值即便缩也读不清，改为撑宽容器）
 * @param padding   左右内边距合计，默认 14
 */
export function fitText(
    text: string,
    fontSize: number,
    maxWidth: number,
    minSize = 9,
    padding = 14,
): FitTextResult {
    const width = estimateTextWidth(text, fontSize);
    if (width <= maxWidth) {
        return { size: fontSize, width, boxWidth: Math.max(width + padding, padding * 2) };
    }
    const scaled = Math.max(minSize, (fontSize * maxWidth) / width);
    const scaledWidth = estimateTextWidth(text, scaled);
    // 缩到下限仍放不下 → 允许容器略微撑出（宁可占位，不可裁字）
    return {
        size: scaled,
        width: scaledWidth,
        boxWidth: Math.max(scaledWidth + padding, maxWidth),
    };
}
