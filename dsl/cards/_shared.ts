/**
 * 跨 kind 公共条款（Single Source of Truth · 公共部分）
 *
 * 各 <kind>.card.ts 只需写自身特有内容，公共红线与公共反例由此处注入，
 * 保证「范式统一」不靠人工重复抄写。
 */
import type { Counterexample } from './_types.ts';

/** 全 kind 通用的输出红线（协议层，与 kind 无关） */
export const SHARED_OUTPUT_CONTROLS: string[] = [
  '只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。',
  '行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。',
  '结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。',
];

/** CORE 层附加红线（iqs_native） */
export const CORE_OUTPUT_CONTROLS: string[] = [
  '能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。',
  '存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。',
];

/** RELIEF 层附加红线（mermaid / vchart） */
export const RELIEF_OUTPUT_CONTROLS: string[] = [
  '本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。',
  'VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。',
];

/** 全 kind 通用反例 */
export const SHARED_COUNTEREXAMPLES: Counterexample[] = [
  {
    bad: '```dsl\nTitle: xxx\n```',
    good: 'Title: xxx',
    reason: '禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。',
  },
  {
    bad: '{"Title": "xxx"}',
    good: 'Title: xxx',
    reason: '`dsl` 必须是纯文本字符串，不是 JSON 对象。',
  },
  {
    bad: '这是根据您的需求生成的图表：\nTitle: xxx',
    good: 'Title: xxx',
    reason: '禁止解释性前后缀。',
  },
];

/** 按 tier / family 组装某张卡片的完整输出红线 */
export function outputControlsFor(family: string, tier: string, own: string[]): string[] {
  const extra = family === 'iqs_native' || tier === 'core' ? CORE_OUTPUT_CONTROLS : RELIEF_OUTPUT_CONTROLS;
  return [...own, ...SHARED_OUTPUT_CONTROLS, ...extra];
}

/** 按 tier 组装某张卡片的完整反例集 */
export function counterexamplesFor(own: Counterexample[] | undefined): Counterexample[] {
  return [...(own ?? []), ...SHARED_COUNTEREXAMPLES];
}
