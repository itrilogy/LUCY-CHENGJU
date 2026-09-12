/**
 * IQS-DSL 卡片真源 · 类型契约（Single Source of Truth）
 *
 * 设计依据：docs/IQS_DSL_CARD_SSOT_DESIGN.md（D1 = TS 模块形态）
 *
 * 一份 <kind>.card.ts 是**唯一真源**，由 scripts/build_cards.mjs 生成：
 *   - mcp-server/mcp_tools.json 的 expert_logic / syntax_rules / official_example / description
 *   - protocol/segments/<kind>.md（人读切片）
 *   - docs/IQS_DSL_V1_MANUAL.md 的 kind 章节
 *   - src/generated/cardDocs.ts（帮助弹窗数据，替代 14×2 段硬编码 JSX）
 *   - protocol://intents（意图目录）与 protocol://prompts/<kind>（提示词）
 *
 * 关键约束：syntax 必须是**结构化条目**（而非 Markdown 字符串），
 * 否则「语法全量」「跨 kind 对照」无法机器校验。
 */

/** 一条语法指令。此结构是「语法全量」与「跨 kind 对照」的最小可校验单元。 */
export interface SyntaxEntry {
  /** 指令名，如 'Title' | 'Color' | 'W' | 'Item' | 'Rel'。跨 kind 对照以此为键。 */
  name: string;
  /** 方括号槽位，如 Color 的 ['TitleBg','TitleText']。渲染为 `Color[TitleBg|TitleText]:`。 */
  slot?: string[];
  /** 中文说明（一句话）。 */
  meaning: string;
  /** 值域枚举（若有）。空数组表示自由文本/数值。 */
  values?: string[];
  /** 参数形态描述，如 '<标题>' | '[ID], [Label], [ParentID]'。 */
  argShape?: string;
  /** 该指令的独立小示例（必须能被 parser 接受的最小片段）。 */
  example: string;
  /** 是否必填。 */
  required?: boolean;
  /** 引入版本。 */
  since?: string;
  /** 边界说明 / 常见误用。 */
  notes?: string;
  /** 实测状态：supported=已实现并验证；unsupported=文档曾承诺但实测不支持；partial=部分。 */
  status?: 'supported' | 'partial' | 'unsupported';
}

/** 反例：错 → 对。 */
export interface Counterexample {
  bad: string;
  good: string;
  reason: string;
}

/** 富文本块：用于把 `soul` 渲染成 Markdown（重建 expert_logic）。 */
export type SoulBlock =
  | { kind: 'h'; level: 3 | 4; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'callout'; type: 'IMPORTANT' | 'TIP' | 'NOTE'; text: string };

/** 示例的可验证语义断言（由 validate_cards.mjs 用真实 parser 复核）。 */
export interface ExampleExpectation {
  /** parser 返回的 errors 必须为空。 */
  noErrors: true;
  /** 期望的节点/边/泳道数量（可选；缺省则不校验该项）。 */
  nodes?: number;
  edges?: number;
  lanes?: number;
  series?: number;
  items?: number;
  /** 期望**不存在**的边（防止默认序流误连），如 [['w4','w5']]。违反 = CI error。 */
  forbiddenEdges?: [string, string][];
  /** 期望**存在**的边。缺失 = CI error。 */
  requiredEdges?: [string, string][];
  /** 已立案的引擎缺陷：此处违反仅报 warning，并附审计编号，避免门禁长期红灯。 */
  knownDefects?: KnownDefect[];
  /** 说明该断言的意图。 */
  note?: string;
}

/**
 * 已立案的引擎缺陷。
 *
 * 用途：把「卡本身正确、但引擎当前行为不符」的情况固化进 CI ——
 * 既不掩盖问题（每次门禁都会打印审计编号），也不让门禁长期红灯。
 * 引擎修复后，应把该项从 knownDefects 提升为 forbiddenEdges/requiredEdges。
 */
export interface KnownDefect {
  /** 审计台账编号，如 'AUD-120'。 */
  auditId: string;
  /** 这些边「不应存在，但当前存在」。 */
  unexpectedEdges?: [string, string][];
  /** 这些边「应当存在，但当前缺失」。 */
  missingEdges?: [string, string][];
  /** 一句说明，含复现要点。 */
  note: string;
}

/** 卡片真源。 */
export interface CardSpec {
  meta: {
    /** 与 dsl/kinds.json 的 id 对齐。 */
    id: string;
    tier: 'core' | 'relief';
    family: 'iqs_native' | 'mermaid' | 'vchart';
    /** Body 族：Tree / ItemTree / Pairs / ScalarList / Series / TupleList / AxisSeries / Graph / Network / ProcessGraph / Matrix / Table / Dataset / FlowGraph。 */
    body: string;
    /** MCP 工具名。 */
    mcpName: string;
    qcTool: string;
    /** 卡片版本，用于帮助弹窗显示（替代硬编码的 "Affinity Logic Base V2.1"）。 */
    version: string;
    /** MCP 资源 URI 的两段。 */
    parentType: string;
    subType: string;
    /** MCP 的 display_name。 */
    displayName: string;
    /** 意图路由关键词（protocol://intents 的数据来源）。 */
    intents: string[];
    /** 专家角色（用于提示词首行 "You are an expert …"）。 */
    expertise: string[];
    colorSlots: string[];
    typeDirective?: { name: string; values: string[]; meaning: string };
    renderType?: string;
    inferenceKey?: string;
    renderEngine?: string;
    /** 是否已纳入真源（未纳入的 kind 由生成器跳过并告警）。 */
    migrated?: boolean;
  };

  /** MCP thin description（瘦描述，建议 ≤ 120 字符）。 */
  description: string;

  /** 专家灵魂：为什么用、怎么选型、分析逻辑。 */
  soul: {
    title: string;
    /** 一句话摘要（用于 protocol://intents 与弹窗标题下方）。 */
    summary: string;
    blocks: SoulBlock[];
  };

  /** 语法全量（结构化）。 */
  syntax: SyntaxEntry[];

  /** 官方示例（唯一一份，**给 LLM 的范式**；前端帮助弹窗展示同一份）。 */
  example: {
    title: string;
    dsl: string;
    notes?: string;
    /** 语义断言，供 CI 用真实 parser 复核。 */
    expect?: ExampleExpectation;
  };

  /**
   * 组件初始画布示例。**缺省 = example**（全项目只保留一份示例，消除「组件看到的」与
   * 「发给 LLM 的」不一致 —— AUD-124）。仅当确有必要展示更丰富特性时才单独声明。
   * 生成到 constants.tsx 的 `INITIAL_<KIND>_DSL`。
   */
  starter?: {
    title: string;
    dsl: string;
    expect?: ExampleExpectation;
  };

  counterexamples?: Counterexample[];

  /** 输出红线（替代散落的 "输出控制" 段落，跨 kind 公共项见 _shared.ts）。 */
  outputControls: string[];

  /** 给 LLM 的额外「具体提示词」要点（protocol://prompts/<kind> 的数据来源）。 */
  promptNotes?: string[];
}

/** 生成器产物清单（供 build_cards.mjs 与 validate_cards.mjs 共用的元数据）。 */
export interface BuildTarget {
  id: string;
  /** 输出去向 */
  outputs: (
    | 'mcp_tools'
    | 'segment'
    | 'manual'
    | 'cardDocs'
    | 'intents'
    | 'prompts'
  )[];
}
