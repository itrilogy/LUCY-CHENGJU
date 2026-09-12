/**
 * classDiagram · IQS 系统结构/类图 — 卡片真源
 *
 * ⚠️ 本文件由 `scripts/scaffold_cards.ts` 生成骨架，**尚未人工审阅**。
 *    审阅要点：soul 的领域知识、syntax 的值域补全、example 的注释风格与自洽性、
 *    counterexamples、outputControls、promptNotes，以及 status 的 supported/partial/unsupported 标注。
 */
import type { CardSpec } from '../_types.ts';

const EXAMPLE_DSL = `%%{init: {"theme": "neutral"}}%%
classDiagram
    class Vehicle {
        +move()
    }
    class Car {
        -engine: String
        +drive()
    }
    Vehicle <|-- Car`;

const mermaid_class: CardSpec = {
  meta: {
    id: "classDiagram",
    tier: "relief",
    family: "mermaid",
    body: "Unknown",
    mcpName: "render_mermaid_class",
    qcTool: "CLASSDIAGRAM",
    version: '1.0',
    parentType: "mermaid",
    subType: "classDiagram",
    displayName: "IQS 系统结构/类图",
    intents: ["类图", "UML类图", "系统结构图", "class diagram"],
    expertise: ["面向对象设计", "系统架构结构", "类关系建模"],
    colorSlots: [],
    renderEngine: "mermaid",
    inferenceKey: "classDiagram",
    migrated: true,
  },

  description: "基于 Mermaid 的类图建模工具。刻画系统组件间的继承、组合、关联关系。支持成员变量与方法标注。",

  soul: {
    title: "专家灵魂 (The Soul)",
    summary: "",
    blocks: [
      { kind: 'h', level: 3, text: "专家灵魂 (The Soul)" },
      { kind: 'ul', items: ["**核心分类**: 结构建模类图表。专注于软件工程中的静态结构，表现类、接口及其依赖路径。"] },
    ],
  },

  // TODO(scaffold): 审阅并补全值域 / required 标记 / notes / status
  syntax: [
    { name: "classDiagram", meaning: "定义类图起始。", example: "classDiagram: <值>", status: 'supported' },
  ],

  example: {
    title: "%%{init: {\"theme\": \"neutral\"}}%%",
    dsl: EXAMPLE_DSL,
    // TODO(scaffold): 补 expect 语义断言（nodes/edges/requiredEdges/forbiddenEdges）
  },

  // TODO(scaffold): 补 counterexamples

  outputControls: [
    '纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。',
    '禁止把 dsl 参数写成 JSON 对象。',
  ],

  // TODO(scaffold): 审阅 promptNotes —— 下面是由 soul 自动提炼的初稿（即 protocol://prompts/<kind> 的内容）
  promptNotes: [
    "核心分类: 结构建模类图表。专注于软件工程中的静态结构，表现类、接口及其依赖路径。",
  ],
};

export default mermaid_class;
