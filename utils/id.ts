/**
 * 单调递增的本地 ID 生成器（全项目唯一真源）
 *
 * 原实现散落在 8 个文件里，各用 `Math.random().toString(36).substr(2, 9)`
 * 或 `Date.now().toString(36)`：
 *
 *  · `Date.now()` —— **同一毫秒内的连续调用会碰撞**。手工编辑器里连点「添加」
 *    完全可能落在同一毫秒，产生的重复 id 会让 React key 冲突、列表数据串行。
 *  · `Math.random().toString(36).substr(2, 9)` —— 概率极低但非零碰撞；
 *    且 `String.prototype.substr` 是**废弃 API**。
 *  · 各文件格式互不相同，序列化/反序列化时难以辨认来源。
 *
 * 这里用「时间戳 + 进程内自增序号」，保证同一毫秒内也严格唯一。
 */
let seq = 0;

/** 生成一个进程内唯一 id，如 `node-m1x2p3q-1a` */
export function genId(prefix = 'id'): string {
    seq = (seq + 1) % 0xffff;
    return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`;
}
