/**
 * 帮助弹窗数据 · 由 dsl/cards/*.card.ts 生成，**请勿手工编辑**。
 * 重新生成：npm run build:cards
 */
import type { CardDocEntry } from '../../components/CardDocModal.tsx';

export const CARD_DOCS: Record<string, CardDocEntry> = {
  "affinity": {
    "meta": {
      "id": "affinity",
      "tier": "core",
      "family": "iqs_native",
      "body": "ItemTree",
      "mcpName": "render_affinity",
      "qcTool": "AFFINITY",
      "version": "2.2",
      "parentType": "iqs_native",
      "subType": "affinity",
      "displayName": "IQS 核心归类/亲和图",
      "intents": [
        "亲和图",
        "KJ法",
        "系统图",
        "affinity diagram",
        "卡片分组",
        "语言资料归纳"
      ],
      "expertise": [
        "KJ 法 (Affinity)",
        "语言资料归纳",
        "多级脑图梳理"
      ],
      "colorSlots": [
        "TitleBg",
        "TitleText",
        "GroupHeaderBg",
        "GroupHeaderText",
        "ItemBg",
        "ItemText",
        "Line",
        "Border"
      ],
      "typeDirective": {
        "name": "Type",
        "values": [
          "Card",
          "Label"
        ],
        "meaning": "renderMode"
      },
      "renderType": "affinity",
      "inferenceKey": "affinity",
      "renderEngine": "g6",
      "migrated": true
    },
    "soul": {
      "title": "KJ 法 (Affinity Diagram)",
      "summary": "把杂乱的语言信息按「相互亲和性」归纳成层级，使问题条理化。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "KJ 法 (Affinity Diagram)"
        },
        {
          "kind": "p",
          "text": "亲和图法，又称 KJ 法，由川喜田二郎发明。它是将收集到的事实、意见、想法等语言信息，按其相互亲和性（相近性）归纳整理，使问题条理化的方法。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "核心步骤"
        },
        {
          "kind": "ul",
          "items": [
            "**发散 (Divergence)**：收集尽可能多的原始想法、反馈或观测值。",
            "**收敛 (Convergence)**：寻找想法间的内在亲和逻辑，形成分组并提炼标题。",
            "**层级化**：建立多级归纳，从具体到抽象，理清思路。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "逻辑构建"
        },
        {
          "kind": "p",
          "text": "通过层级化的定义，亲和图可以帮助团队从混乱的信息中理出头绪。一个好的亲和图应具有清晰的因果或从属逻辑——上级是下级共同性质的提炼，而不是简单的时间顺序。"
        },
        {
          "kind": "callout",
          "type": "IMPORTANT",
          "text": "当多个想法无法归入现有分组时，**不要强行塞入**。这可能意味着存在一个新的观察维度，或者是未被识别的根本问题。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表主标题",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 市场调研整理",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "Type:",
        "meaning": "渲染模式",
        "values": [
          "Card",
          "Label"
        ],
        "argShape": "",
        "example": "Type: Card",
        "status": "supported",
        "required": false,
        "notes": "Card = 卡片形态；Label = 纯文字标签形态。缺省 Card。"
      },
      {
        "name": "Layout:",
        "meaning": "布局方向",
        "values": [
          "Horizontal",
          "Vertical"
        ],
        "argShape": "",
        "example": "Layout: Horizontal",
        "status": "supported",
        "required": false,
        "notes": "注意与 flow 的 `Layout: H|V` 写法不同（此处为全称）。"
      },
      {
        "name": "Color[TitleBg | TitleText]",
        "meaning": "#HEX 标题背景与文字色",
        "values": [],
        "argShape": "",
        "example": "Color[TitleBg]: #4f46e5",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[GroupHeaderBg | GroupHeaderText]",
        "meaning": "#HEX 分组（一级节点）样式",
        "values": [],
        "argShape": "",
        "example": "Color[GroupHeaderBg]: #e0e7ff",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[ItemBg | ItemText]",
        "meaning": "#HEX 常规条目（卡片）样式",
        "values": [],
        "argShape": "",
        "example": "Color[ItemBg]: #ffffff",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[Line]",
        "meaning": "#HEX 连线颜色",
        "values": [],
        "argShape": "",
        "example": "Color[Line]: #64748b",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[Border]",
        "meaning": "#HEX 边框颜色",
        "values": [],
        "argShape": "",
        "example": "Color[Border]: rgba(13,94,66,0.18)",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Font[Title | GroupHeader | Item]",
        "meaning": "px 数字字号",
        "values": [],
        "argShape": "",
        "example": "Font[Title]: 24",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Item:",
        "meaning": "数据项（ItemTree 唯一录入方式）",
        "values": [],
        "argShape": "[ID], [Label], [ParentID]",
        "example": "Item: g1, 空间布局, root",
        "status": "supported",
        "required": true,
        "notes": "① `ID` 唯一，供 `ParentID` 引用；② `Label` 为显示文字，**内容中若需冒号请用全角「：」**，因为分隔符是半角逗号；③ `ParentID` 写上级 ID（一级节点写 `root` 或 `null`）；④ **被解析器作为虚拟根吸收**：`Item: root, …` 这一行本身不出现在图上，其 children 即为顶层——这是 affinity 独有行为，与 `#` 树无关。"
      }
    ],
    "example": {
      "title": "改善办公环境的想法整理（KJ 法）",
      "dsl": "Title: 办公环境改善方案（KJ 法）\nType: Card\nLayout: Horizontal\n\n// 样式\nColor[TitleBg]: #4f46e5\nColor[TitleText]: #ffffff\nColor[GroupHeaderBg]: #e0e7ff\nColor[GroupHeaderText]: #1A2428\nColor[ItemBg]: #ffffff\nColor[ItemText]: #1A2428\nFont[Title]: 24\nFont[GroupHeader]: 16\nFont[Item]: 14\nColor[Line]: #64748b\nColor[Border]: rgba(13,94,66,0.18)\n\n// 核心主题（parentId 写 null 或不写；写 root 时该节点会被解析器作为虚拟根吸收，图上不显示）\nItem: root, 核心目标: 提升员工幸福感, null\n\n// 一级分组\nItem: g1, 空间布局, root\nItem: g2, 行政服务, root\nItem: g3, 数字化工具, root\n\n// 二级条目\nItem: sub1, 增加绿植覆盖, g1\nItem: sub2, 设立静默专注区, g1\nItem: sub3, 升级人体工学椅, g1\nItem: sub4, 现磨咖啡无限供应, g2\nItem: sub5, 每周五下午茶, g2\nItem: sub6, 引入智能看板系统, g3\nItem: sub7, 简化报销流程, g3\n",
      "notes": "一级分组 + 二级条目两层；`root` 作虚拟根不显示。"
    },
    "counterexamples": [
      {
        "bad": "# 一级分类\n## 二级原因",
        "good": "Item: g1, 一级分类, root\nItem: i1, 二级原因, g1",
        "reason": "亲和图是 ItemTree，不是 Tree；`#` 层级仅鱼骨图可用。"
      },
      {
        "bad": "Item: root, 公司目标, null\nItem: a, 降本, root\nItem: b, 增效, a\nItem: c, 提效, root",
        "good": "每个条目只写一次，层级由 ParentID 单一指定",
        "reason": "同一 ID 重复出现或层级自相矛盾会导致树结构不确定。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，**禁止** Markdown 代码围栏与解释性前后缀。",
      "行注释用 `//`；**禁止**在亲和图中使用 `#` 建层级。",
      "禁止把 `dsl` 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先做关键词抽取（把用户描述拆成 5–15 条原子想法），再做亲和分组，最后为每组提炼一句「上位概念」作为组标签。",
      "组的数量控制在 3–7 个；每组条目 2–8 条。",
      "不要臆造数据：用户没提到的原因不要补。"
    ]
  },
  "arrow": {
    "meta": {
      "id": "arrow",
      "tier": "core",
      "family": "iqs_native",
      "body": "Network",
      "mcpName": "render_arrow",
      "qcTool": "ARROW",
      "version": "1.1",
      "parentType": "iqs_native",
      "subType": "arrow",
      "displayName": "IQS 进度控制/双代号网络图",
      "intents": [
        "矢线图",
        "双代号网络图",
        "关键路径",
        "arrow diagram",
        "网络计划",
        "CPM"
      ],
      "expertise": [
        "项目进度管理",
        "关键路径 (CPM)",
        "ADM 网络图"
      ],
      "colorSlots": [
        "Node",
        "Line",
        "Critical",
        "Shortest"
      ],
      "renderEngine": "g6",
      "inferenceKey": "arrow",
      "migrated": true
    },
    "soul": {
      "title": "双代号网络图 (Arrow Diagram Method)",
      "summary": "用节点表示事件、用箭条表示工作，展示任务先后顺序与时间关联，并自动求解关键路径。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "双代号网络图 (Arrow Diagram Method)"
        },
        {
          "kind": "p",
          "text": "矢线图，又称双代号网络图 (ADM)，是计划管理的重要工具。它通过节点（事件）和箭条（工作）展示各项任务间的先后顺序与时间关联。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "核心计算逻辑 (CPM)"
        },
        {
          "kind": "ul",
          "items": [
            "**关键路径 (Critical Path)**：项目中耗时最长的路径。任何延迟都会导致整个项目的延期。",
            "**宽裕时间 (Float)**：通过 ES/LS 计算每个节点的时差。",
            "**虚任务 (Dummy Task)**：仅表示任务间逻辑依赖关系的虚线，**工期恒为 0**。"
          ]
        },
        {
          "kind": "callout",
          "type": "TIP",
          "text": "**资源优化**：识别非关键路径上的时差 (Float)，平衡峰值期间的人力或设备资源。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "项目名称（图标题）",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 新生产线建设",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "ShowCritical:",
        "meaning": "是否高亮关键路径",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowCritical: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ShowShortest:",
        "meaning": "是否高亮最短路径",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowShortest: false",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[Node | Line | Critical | Shortest]",
        "meaning": "#HEX 颜色：节点 / 连线 / 关键路径高亮 / 最短路径高亮",
        "values": [],
        "argShape": "",
        "example": "Color[Critical]: #E74C3C",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Event:",
        "meaning": "节点（事件）定义；ID 为**整数**，供任务行引用",
        "values": [],
        "argShape": "<ID>, <标签>",
        "example": "Event: 1, 立项完成",
        "status": "supported",
        "required": true,
        "notes": "ID 建议用连续整数；每个 ID 只能定义一次。"
      },
      {
        "name": "实任务:",
        "meaning": "带工期的实际工作（用 `->`）",
        "values": [],
        "argShape": "<SrcID> -> <TgtID>: <工期>, <名称>",
        "example": "1 -> 2: 3, 需求分析",
        "status": "supported",
        "required": true,
        "notes": "工期为**正数**（单位自定，通常为天）；名称可省略。`->` 与 `..>` 不可混用。"
      },
      {
        "name": "虚任务:",
        "meaning": "仅表达逻辑依赖的虚线（用 `..>`），**工期固定 0**",
        "values": [],
        "argShape": "<SrcID> ..> <TgtID>: 0, <名称>",
        "example": "5 ..> 4: 0, 依赖同步",
        "status": "supported",
        "required": false,
        "notes": "用于表达「同一对节点间需要多条并行逻辑」或修正跨层级依赖；工期写非 0 不报错但语义无效。"
      }
    ],
    "example": {
      "title": "办公软件 V1.0 开发计划",
      "dsl": "Title: 办公软件 V1.0 开发计划\nShowCritical: true\nShowShortest: false\n\nColor[Critical]: #E74C3C\nColor[Line]: #00D2FF\n\n// 节点（事件）\nEvent: 1, 立项完成\nEvent: 2, 需求评审\nEvent: 3, 架构设计\nEvent: 4, 模块 A 开发\nEvent: 5, 模块 B 开发\nEvent: 6, 集成测试\nEvent: 7, 交付\n\n// 实任务：Src -> Tgt: 工期, 名称\n1 -> 2: 3, 需求分析\n2 -> 3: 2, 架构方案\n3 -> 4: 10, A逻辑实现\n3 -> 5: 8, B逻辑实现\n4 -> 6: 5, 系统集成\n6 -> 7: 2, 验收发布\n\n// 虚任务：仅表达逻辑依赖，工期恒为 0\n5 ..> 4: 0, 依赖同步\n",
      "notes": "7 个事件 + 6 条实任务 + 1 条虚任务；关键路径由引擎按 CPM 自动求解并高亮。"
    },
    "counterexamples": [
      {
        "bad": "1 -> 2: 0, 依赖同步",
        "good": "1 ..> 2: 0, 依赖同步",
        "reason": "零工期的逻辑依赖应写成虚任务 `..>`；用 `->` 会被当作实任务参与关键路径计算。"
      },
      {
        "bad": "1 -> 2: 3天, 需求分析",
        "good": "1 -> 2: 3, 需求分析",
        "reason": "工期须为纯数值；单位写在标签里或图标题中，不要混进数值字段。"
      },
      {
        "bad": "2 -> 3: 2, 架构方案   （而未定义 Event: 2）",
        "good": "Event: 2, 需求评审\n2 -> 3: 2, 架构方案",
        "reason": "任务两端的事件 ID 必须先由 `Event:` 定义。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "节点用 `Event:` 定义；工作用 `<Src> -> <Tgt>: 工期, 名称`；虚任务用 `..>` 且工期为 0。",
      "工期为纯数字，不要在数值字段内混入单位或文字说明。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先把用户描述拆成「里程碑/事件」与「工作包」两类；事件进 `Event:` 行，工作进 `Src -> Tgt:` 行。",
      "只有存在跨层级逻辑依赖（无法靠节点合并表达）时才引入虚任务 `..>`。",
      "事件数控制在 5–20 个；过多时考虑拆分为子网络。",
      "不要手工标注关键路径 —— 引擎按 CPM 自动计算；用 `ShowCritical: true` 控制是否高亮。"
    ]
  },
  "basic": {
    "meta": {
      "id": "basic",
      "tier": "core",
      "family": "iqs_native",
      "body": "Dataset",
      "mcpName": "render_basic",
      "qcTool": "BASIC",
      "version": "1.2",
      "parentType": "iqs_native",
      "subType": "basic",
      "displayName": "IQS 基础统计图 (DSL)",
      "intents": [
        "基础图表",
        "饼图",
        "折线图",
        "柱状图",
        "占比图",
        "趋势对冲",
        "环形图",
        "bar",
        "line",
        "pie"
      ],
      "expertise": [
        "通用数据可视化",
        "趋势分析",
        "占比分析",
        "多轴对冲分析"
      ],
      "colorSlots": [
        "Title",
        "Bg"
      ],
      "typeDirective": {
        "name": "Type",
        "values": [
          "bar",
          "line",
          "pie"
        ],
        "meaning": "basicChartType"
      },
      "renderEngine": "echarts",
      "inferenceKey": "basic",
      "migrated": true
    },
    "soul": {
      "title": "基础图表分析（Bar / Line / Pie）",
      "summary": "比较、趋势、占比三大维度的通用工具；支持副轴对冲与多层同心圆环。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "基础图表分析 (Bar / Line / Pie)"
        },
        {
          "kind": "ul",
          "items": [
            "**柱状图 (Bar)**：强调个体之间的横向比较，适合分类数据的离散分析。",
            "**折线图 (Line)**：专注于随时间或连续维度的趋势演变；`Smooth: true` 提升视觉连续性。",
            "**饼图 (Pie)**：表达组成部分与整体的比例分配；多层用 `Y`/`Y2`/`Y3` 做同心圆环。",
            "**混合多轴 (Multi-Axis)**：通过 `Y2` / `Y3` 绑定副轴，可在同一画布对比量级差异巨大的数据（如产量 vs 百分比）。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "核心规则"
        },
        {
          "kind": "ul",
          "items": [
            "**分类标签必填**：无论何种图型，都必须有一个含 `X` 轴匹配的 `Dataset:` 作为分类维，否则数值失去语义。",
            "**混合渲染**：重复声明 `Type:` 会切换**其后** `Dataset` 的渲染类型 —— 这是 bar/line 混排的唯一方式。",
            "**叠层顺序**：`Y` 为最内层，`Y2` 中层，`Y3` 最外层。"
          ]
        },
        {
          "kind": "callout",
          "type": "IMPORTANT",
          "text": "**分类限制**：单一图表避免超过 7 个分类。分类过多时应合并为「其他」项，或改用水平柱状图（`View: h`）。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表标题",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 2024年产线效能",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "Type:",
        "meaning": "渲染模式；**重复声明可切换其后 Dataset 的类型**（混合渲染）",
        "values": [
          "bar",
          "line",
          "pie"
        ],
        "argShape": "",
        "example": "Type: bar",
        "status": "supported",
        "required": false,
        "notes": "取值**小写**；`Type: Bar` 不生效。"
      },
      {
        "name": "View:",
        "meaning": "布局方向",
        "values": [
          "v",
          "h"
        ],
        "argShape": "",
        "example": "View: v",
        "status": "supported",
        "required": false,
        "notes": "`v` 垂直（缺省）、`h` 水平。"
      },
      {
        "name": "Stacked:",
        "meaning": "启用堆叠（分量与总量的累计分析）",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "Stacked: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Smooth:",
        "meaning": "平滑折线（仅 line 有效）",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "Smooth: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ShowLegend:",
        "meaning": "是否显示图例",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowLegend: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ShowValues:",
        "meaning": "是否显示数值标签",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowValues: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Grid:",
        "meaning": "是否显示网格线（**开关**，非线型）",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "Grid: true",
        "status": "supported",
        "required": false,
        "notes": "⚠️ 与 flow 的 `Grid:` 同名异义 —— flow 的取值为 `dashed` / `solid`（线型）。"
      },
      {
        "name": "Decimals:",
        "meaning": "小数位精度",
        "values": [],
        "argShape": "<整数>",
        "example": "Decimals: 1",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[Title | Bg]",
        "meaning": "#HEX 标题色 / 背景色",
        "values": [],
        "argShape": "",
        "example": "Color[Title]: #1A2428",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Font[Title | Base]",
        "meaning": "px 字号（标题 / 正文）",
        "values": [],
        "argShape": "",
        "example": "Font[Title]: 20",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Dataset:",
        "meaning": "数据序列定义（本 kind 的唯一数据录入方式）",
        "values": [],
        "argShape": "<名称>, [<值列表>], <颜色或 null>, <轴匹配>",
        "example": "Dataset: 入库合格量, [12000, 14500, 13800], #0D5E42, Y",
        "status": "supported",
        "required": true,
        "notes": "① 轴匹配取值 `X`（分类标签，**必须恰好一个**）/ `Y`（主轴）/ `Y2` `Y3`（副轴或同心环层）；② 颜色写 `null` 时使用内置色板；③ 值列表用**半角逗号**分隔，元素个数应与 X 轴分类数一致。"
      }
    ],
    "example": {
      "title": "2024年三季度产线效能对冲分析",
      "dsl": "Title: 2024年三季度产线效能对冲分析\nType: bar\nShowLegend: true\nGrid: true\n\n// 1. 分类标签（必填：必须有一个 X 轴 Dataset）\nDataset: 月份, [7月, 8月, 9月], null, X\n\n// 2. 主轴产量（柱状）\nDataset: 入库合格量, [12000, 14500, 13800], #0D5E42, Y\n\n// 3. 副轴稼动率：重新声明 Type 切换后续 Dataset 的渲染类型为折线\nType: line\nSmooth: true\nDataset: 设备稼动率(%), [88.5, 92.1, 91.4], #E74C3C, Y2\n",
      "notes": "X 轴分类 + 主轴柱状 + 副轴折线（通过重复声明 `Type: line` 切换）的典型双轴对冲。"
    },
    "counterexamples": [
      {
        "bad": "Dataset: 月份, [7月, 8月], #0D5E42, Y",
        "good": "Dataset: 月份, [7月, 8月], null, X",
        "reason": "缺少 `X` 轴分类定义时数值将失去语义标签；必须**恰好有一个** Dataset 用 `X`。"
      },
      {
        "bad": "Type: Bar",
        "good": "Type: bar",
        "reason": "`Type` 取值小写，大写不生效。"
      },
      {
        "bad": "Dataset: 产量, [{x:1,y:2}], null, Y",
        "good": "Dataset: 产量, [12, 15, 9], null, Y",
        "reason": "`Dataset` 的值是**纯数组文本**，不是 JSON 对象数组。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "`Dataset:` 的四个字段固定为「名称, [值列表], 颜色或 null, 轴匹配」，用**半角逗号**分隔。",
      "必须有一个 `X` 轴 Dataset 作分类维；副轴用 `Y2` / `Y3`。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先确定图型（比较→bar / 趋势→line / 占比→pie），再决定是否需要副轴对冲（量级差异 ≥ 10 倍时用 Y2）。",
      "先写 X 轴分类 Dataset，再写各数据序列；序列顺序决定图例与堆叠顺序。",
      "分类数 ≤ 7；超过则合并「其他」项或改用 `View: h`。",
      "多层同心圆环：`Y` 最内层、`Y2` 中层、`Y3` 最外层，每层都要有自己的 X 轴标签 Dataset。"
    ]
  },
  "control": {
    "meta": {
      "id": "control",
      "tier": "core",
      "family": "iqs_native",
      "body": "Series",
      "mcpName": "render_control",
      "qcTool": "CONTROL",
      "version": "1.1",
      "parentType": "iqs_native",
      "subType": "control",
      "displayName": "IQS SPC 过程控制图",
      "intents": [
        "控制图",
        "SPC",
        "稳定性分析",
        "control chart",
        "判异",
        "过程受控"
      ],
      "expertise": [
        "统计过程控制 (SPC)",
        "判异规则 (Nelson / Western Electric)"
      ],
      "colorSlots": [
        "Line",
        "Point",
        "UCL",
        "CL",
        "LCL"
      ],
      "typeDirective": {
        "name": "Type",
        "values": [
          "I-MR",
          "X-bar-R",
          "X-bar-S",
          "P",
          "NP",
          "C",
          "U"
        ],
        "meaning": "spcChartType"
      },
      "renderEngine": "echarts",
      "inferenceKey": "control",
      "migrated": true
    },
    "soul": {
      "title": "SPC 统计过程控制",
      "summary": "用控制限区分过程的偶然波动与异常波动；按数据类型选图种，按判异规则报警。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "SPC 统计过程控制原理"
        },
        {
          "kind": "p",
          "text": "控制图（Control Chart）是用于区分过程中的**偶然波动**与**异常波动**的重要工具。计算遵循 ISO 7870 与 GB/T 4091 标准。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "控制图选型指南"
        },
        {
          "kind": "ul",
          "items": [
            "**计量型（子组 n=1）**：I-MR（单值—移动极差）",
            "**计量型（2 ≤ n ≤ 10）**：X-bar-R（均值—极差）",
            "**计量型（n > 10）**：X-bar-S（均值—标准差）",
            "**计件型（不合格品数 / 率）**：NP / P",
            "**计点型（缺陷数 / 单位缺陷数）**：C / U"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "判异规则 (Rules)"
        },
        {
          "kind": "p",
          "text": "支持 `Basic`（3σ 越界）、`Western-Electric`、`Nelson` 三套规则，可**逗号并列多套**。常见异常："
        },
        {
          "kind": "ul",
          "items": [
            "1 个点落在 3σ 控制限外。",
            "连续 9 点落在中心线同一侧。",
            "连续 6 点持续上升或下降。"
          ]
        },
        {
          "kind": "callout",
          "type": "TIP",
          "text": "控制图必须先有**足够的数据量**（一般 ≥ 20–25 个子组）再解读控制限；数据太少时控制限本身不可靠。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表主标题",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 关键尺寸控制图",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "Type:",
        "meaning": "控制图类型（SPC 图种）",
        "values": [
          "I-MR",
          "X-bar-R",
          "X-bar-S",
          "P",
          "NP",
          "C",
          "U"
        ],
        "argShape": "",
        "example": "Type: X-bar-R",
        "status": "supported",
        "required": true,
        "notes": "取值**区分大小写**，须与上表完全一致（如 `X-bar-R` 不能写 `XbarR`）。"
      },
      {
        "name": "Size:",
        "meaning": "子组样本容量 n（计量型专用）",
        "values": [],
        "argShape": "<整数>",
        "example": "Size: 5",
        "status": "supported",
        "required": false,
        "notes": "必须与实际每行数据个数一致，否则均值与极差计算错位。"
      },
      {
        "name": "Rules:",
        "meaning": "判异规则；可**逗号并列多套**",
        "values": [
          "Basic",
          "Western-Electric",
          "Nelson"
        ],
        "argShape": "",
        "example": "Rules: Nelson",
        "status": "supported",
        "required": false,
        "notes": "多套并列写法：`Rules: Western-Electric,Nelson`。"
      },
      {
        "name": "Decimals:",
        "meaning": "数值显示精度",
        "values": [],
        "argShape": "<整数>",
        "example": "Decimals: 3",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[Line | Point | UCL | CL | LCL]",
        "meaning": "#HEX 颜色：折线 / 数据点 / 上控制限 / 中心线 / 下控制限",
        "values": [],
        "argShape": "",
        "example": "Color[UCL]: #E74C3C",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "[series]:",
        "meaning": "数据块**开始**（本 kind 唯一的数据录入方式）；`[series]: <标题>` 可带块标题",
        "values": [],
        "argShape": "[series]: <可选标题>",
        "example": "[series]: 孔径测量值 (mm)",
        "status": "supported",
        "required": true,
        "notes": "必须与 `[/series]` 成对出现。"
      },
      {
        "name": "[/series]:",
        "meaning": "数据块**结束**",
        "values": [],
        "argShape": "[/series]",
        "example": "[/series]",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "数据行:",
        "meaning": "块内每行一组观测值，**半角逗号**分隔；计量型每行个数应等于 `Size`",
        "values": [],
        "argShape": "<数值>, <数值>, …",
        "example": "12.01, 12.02, 11.99, 12.00, 12.01",
        "status": "supported",
        "required": true,
        "notes": ""
      }
    ],
    "example": {
      "title": "缸盖螺栓孔径 X-bar-R 控制图",
      "dsl": "Title: 缸盖螺栓孔径 X-bar-R 控制图\nType: X-bar-R\nSize: 5\nRules: Nelson\nDecimals: 3\nColor[Line]: #0D5E42\nColor[Point]: #0A4A33\nColor[UCL]: #E74C3C\n\n[series]: 孔径测量值 (mm)\n12.01, 12.02, 11.99, 12.00, 12.01\n12.03, 11.98, 12.01, 12.02, 11.99\n12.00, 12.01, 12.04, 11.97, 12.02\n12.01, 11.99, 12.00, 12.03, 12.01\n11.98, 12.02, 12.01, 11.99, 12.00\n[/series]\n",
      "notes": "5 个子组 × 每组 5 个观测值（`Size: 5`）；控制限由引擎按 GB/T 4091 计算。"
    },
    "counterexamples": [
      {
        "bad": "12.01, 12.02, 11.99\n12.03, 11.98, 12.01",
        "good": "[series]: 孔径测量值\n12.01, 12.02, 11.99\n[/series]",
        "reason": "数据必须包在 `[series]` … `[/series]` 块内；裸数据行不会被采集。"
      },
      {
        "bad": "Type: X-bar-R\nSize: 3\n12.01, 12.02, 11.99, 12.00, 12.01",
        "good": "Type: X-bar-R\nSize: 5\n12.01, 12.02, 11.99, 12.00, 12.01",
        "reason": "`Size` 必须等于每行观测值个数，否则子组均值/极差错位。"
      },
      {
        "bad": "Type: XbarR",
        "good": "Type: X-bar-R",
        "reason": "图种取值区分大小写且含连字符，须与值域完全一致。"
      },
      {
        "bad": "Type: X-bar-R   （用于计件数据「不合格品率」）",
        "good": "Type: P",
        "reason": "计量型与计件/计点型不可混用；不合格品率应选 `P`。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "数据必须包在 `[series]:` … `[/series]` 块内；每行一组，**半角逗号**分隔。",
      "`Type`（图种）与 `Size`（子组容量）必须与数据的实际结构一致。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先判数据类型：连续测量值 → 计量型（n=1 用 I-MR；2≤n≤10 用 X-bar-R；n>10 用 X-bar-S）；计数不合格品 → P/NP；计数缺陷 → C/U。",
      "按 `Size` 把原始观测值**分组**：每行恰好 n 个值，子组数建议 ≥ 20。",
      "判异规则缺省 `Basic`；需要更敏感时并列 `Western-Electric,Nelson`。",
      "不要自行计算控制限 —— 引擎按标准公式求解；用户给了 USL/LSL 时也不要写进本 kind（那是直方图的规格限）。"
    ]
  },
  "fishbone": {
    "meta": {
      "id": "fishbone",
      "tier": "core",
      "family": "iqs_native",
      "body": "Tree",
      "mcpName": "render_fishbone",
      "qcTool": "FISHBONE",
      "version": "1.1",
      "parentType": "iqs_native",
      "subType": "fishbone",
      "displayName": "IQS 因果分析/鱼骨图",
      "intents": [
        "鱼骨图",
        "因果图",
        "石川图",
        "fishbone",
        "根因分析",
        "ishikawa",
        "5M1E",
        "4P",
        "5Why"
      ],
      "expertise": [
        "根因分析 (RCA)",
        "5M1E / 4P 因果模型",
        "工业质量改进"
      ],
      "colorSlots": [
        "Root",
        "RootText",
        "Main",
        "MainText",
        "Bone",
        "Line",
        "Text",
        "End"
      ],
      "renderEngine": "canvas",
      "inferenceKey": "fishbone",
      "migrated": true
    },
    "soul": {
      "title": "石川图 (Ishikawa) 因果分析",
      "summary": "用「鱼头—大骨—中骨—小骨」层级整理问题与原因，配合 5 Whys 下钻到根因。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "石川图 (Ishikawa) 因果分析原理"
        },
        {
          "kind": "p",
          "text": "鱼骨图，又称因果图，是整理**问题与原因**之间关系的一种极佳工具。鱼头是待分析的问题（写进 `Title:`），大骨是原因分类，中骨/小骨是逐级下钻的原因。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "1. 5M1E 模型（制造业）"
        },
        {
          "kind": "ul",
          "items": [
            "**人 (Man)**：操作员、技能、意识。",
            "**机 (Machine)**：设备稳定性、精度、润滑。",
            "**料 (Material)**：原材料、品质、规格。",
            "**法 (Method)**：工艺标准、操作流程。",
            "**环 (Environment)**：温湿度、照明、噪音。",
            "**测 (Measurement)**：测量工具、抽样方法。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "2. 4P 模型（服务业 / 管理）"
        },
        {
          "kind": "ul",
          "items": [
            "**策略 (Policies)**：规章制度、管理流程。",
            "**程序 (Procedures)**：具体作业步骤。",
            "**人员 (People)**：能力、态度、协作。",
            "**场所 (Plant)**：办公环境、系统工具。"
          ]
        },
        {
          "kind": "callout",
          "type": "TIP",
          "text": "鱼骨图的深度决定了解决问题的深度。推导出某个原因后，连续追问「为什么」(5 Whys)，直到找到可措施化的根因节点。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "问题陈述（渲染为**鱼头**）",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 售后投诉根因分析",
        "status": "supported",
        "required": true,
        "notes": "写\"问题\"而非\"原因\"；一个图只分析一个问题。"
      },
      {
        "name": "Color[Root | RootText | Main | MainText | Bone | Line | Text | End]",
        "meaning": "#HEX 颜色：鱼头底 / 鱼头字 / 大骨底 / 大骨字 / 主脊椎线 / 子因连接线 / 原因文字 / 末端骨",
        "values": [],
        "argShape": "",
        "example": "Color[Root]: #E74C3C",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "#:",
        "meaning": "一级分类（**大骨**）—— 本 kind 中 `#` 是**结构**而非注释",
        "values": [],
        "argShape": "# <分类名>",
        "example": "# 人 (Man)",
        "status": "supported",
        "required": true,
        "notes": "⚠️ **本 kind 是唯一把 `#` 用作层级结构的 kind**（body = Tree）。其余 kind 中 `#` 仅作历史兼容注释，不可用 `#` 建层级。"
      },
      {
        "name": "##:",
        "meaning": "二级原因（**中骨**）",
        "values": [],
        "argShape": "## <原因>",
        "example": "## 调机参数设置不当",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "###:",
        "meaning": "三级原因（**小骨**）",
        "values": [],
        "argShape": "### <原因>",
        "example": "### 保压压力过低",
        "status": "supported",
        "required": false,
        "notes": "可继续用 `####` 等更深层级（引擎支持多级嵌套），但超过四级会显著压缩可读性。"
      }
    ],
    "example": {
      "title": "注塑件表面缩水故障分析",
      "dsl": "Title: 注塑件表面缩水故障分析\nColor[Root]: #E74C3C\nColor[RootText]: #ffffff\nColor[Main]: #0D5E42\nColor[MainText]: #ffffff\nColor[Bone]: #475569\nColor[Line]: rgba(13,94,66,0.18)\nColor[Text]: #1A2428\n\n# 人 (Man)\n## 调机参数设置不当\n### 保压压力过低\n### 保压时间不足\n## 巡检意识淡薄\n\n# 机 (Machine)\n## 料筒加热温度偏移\n## 模具冷却水道阻塞\n### 冷却水流量不足\n\n# 料 (Material)\n## 材料缩水率不均匀\n## 回料比例过高\n\n# 法 (Method)\n## 工艺标准不完善\n## 注射速度过快\n",
      "notes": "5M1E 中取 4 个大骨（人/机/料/法），大小骨共 12 个原因节点。"
    },
    "counterexamples": [
      {
        "bad": "- 人 (Man)\n  - 调机参数设置不当",
        "good": "# 人 (Man)\n## 调机参数设置不当",
        "reason": "鱼骨图的层级必须用 `#` / `##` / `###` 表达；`-` 列表不会被解析为骨。"
      },
      {
        "bad": "Item: g1, 人 (Man), root",
        "good": "# 人 (Man)",
        "reason": "`Item:` 是**亲和图**（ItemTree）的录入方式；鱼骨图用 `#` 树。两者不可混用。"
      },
      {
        "bad": "# 调机参数设置不当   （把原因写成大骨，而问题无处安放）",
        "good": "Title: 注塑件表面缩水故障分析\n# 人 (Man)\n## 调机参数设置不当",
        "reason": "`Title:` 承载\"问题\"（鱼头），`#` 只能承载原因分类；不要把原因提到大骨层。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "本 kind 用 `#` / `##` / `###` 表达层级（**唯一例外**）；问题写进 `Title:`。",
      "禁止用 `-` 列表或 `Item:` 建鱼骨层级（那是 basic / 亲和图的写法）。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先确认问题（写进 `Title:`），再选模型：制造业用 5M1E（人机料法环测），服务/管理用 4P。",
      "大骨取 4–6 个；每个大骨下用 5 Whys 追问到**可措施化**的根因，中骨 2–8 个。",
      "原因要具体且可验证（\"保压压力过低\"优于\"操作不当\"）。",
      "不要臆造原因：用户未提及的类别可以省略大骨，不要为了凑齐 5M1E 而编造。"
    ]
  },
  "flow": {
    "meta": {
      "id": "flow",
      "tier": "core",
      "family": "iqs_native",
      "body": "FlowGraph",
      "mcpName": "render_flow",
      "qcTool": "FLOW",
      "version": "0.8",
      "parentType": "iqs_native",
      "subType": "flow",
      "displayName": "IQS 企业流程图/泳道图",
      "intents": [
        "流程图",
        "泳道图",
        "流程",
        "程序文件",
        "跨部门流程",
        "BPMN",
        "flow",
        "swimlane",
        "审批流程"
      ],
      "expertise": [
        "泳道流程图 (Swimlane)",
        "BPMN 子集",
        "程序文件",
        "字典-索引",
        "岗位图例",
        "流程建模"
      ],
      "colorSlots": [
        "Start",
        "StartText",
        "End",
        "EndText",
        "Task",
        "TaskText",
        "Gateway",
        "Parallel",
        "Subprocess",
        "Annotation",
        "Data",
        "Lane",
        "Axis",
        "Line",
        "Text",
        "Panel"
      ],
      "renderType": "flow",
      "inferenceKey": "flow",
      "renderEngine": "svg",
      "migrated": true
    },
    "soul": {
      "title": "企业流程图（Flow / BPMN 子集）",
      "summary": "定义「谁（泳道）× 做什么（活动）× 什么条件下走哪条路（网关）」，用于程序文件（CX）建模。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "企业流程图（Flow / BPMN 子集）"
        },
        {
          "kind": "p",
          "text": "流程图定义「**谁（泳道）× 做什么（活动）× 什么条件下走哪条路（网关）**」，面向企业体系文件中的程序文件（CX）建模。语义定界为 **BPMN 2.0 子集**：保留开始/结束/任务/子流程/排他与并行网关/标注/数据对象，裁掉边界事件、补偿、多实例等体系文件中不用的元素。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "字典-索引范式（核心）"
        },
        {
          "kind": "ul",
          "items": [
            "**数据层（Dict）**：所有可变内容（部门/阶段/岗位/动作/属性值）集中成数组；`D`（部门）`P`（阶段）`R`（岗位）为**保留字**，其余自定义。",
            "**结构层**：只写**索引引用**（`D[0]`、`worker[2]`），渲染时展开为字典值（图上显示「信息中心」而非 `D[0]`）。一处定义、多处引用、修改全局生效。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "专家建议"
        },
        {
          "kind": "ul",
          "items": [
            "**默认顺序流**：可流转节点（S/T/SUB）按声明顺序自动连；判断/并行节点不出自动序，其出口必须显式分支行声明并以 `End` 闭合。结束节点与 N/DATA 不作默认流出源。",
            "**禁止 Mermaid 冒充**：体系文件/部门泳道/BPMN 子集终稿必须用本 kind（MCP `render_flow`），禁止 `flowchart TD` / `graph LR`。",
            "**岗位图例**：从节点实际 `Role` 属性值去重提取，按出现次数定字体粗细（非渲染 `R` 数组本身）。",
            "**属性边栏**：`Attr active` 激活后从全部节点提取聚合视图（Role/SOP 计数、Lv 区间评分、Time 最小时长、KPI 清单、M 色卡）。"
          ]
        },
        {
          "kind": "callout",
          "type": "IMPORTANT",
          "text": "网格**只按 `Lane from` 的定义产生**；节点坐标的多余维度**自动清洗**；图上必须显示字典展开值。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表标题",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 采购审批流程",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "Layout:",
        "meaning": "整体方向",
        "values": [
          "H",
          "V"
        ],
        "argShape": "",
        "example": "Layout: H",
        "status": "supported",
        "required": false,
        "notes": "注意与 affinity/pdpc/relation 的 `Layout: Horizontal` 全称写法不同。"
      },
      {
        "name": "Color[Slot]",
        "meaning": "#HEX 颜色；Slot 取 meta.colorSlots 中的键（Start/End/Task/Gateway/Parallel/Subprocess/Annotation/Data/Lane/Axis/Line/Text/Panel）",
        "values": [],
        "argShape": "",
        "example": "Color[Start]: #0D5E42",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Grid:",
        "meaning": "泳道网格线型（**线型**，非开关）",
        "values": [
          "dashed",
          "solid"
        ],
        "argShape": "",
        "example": "Grid: dashed",
        "status": "supported",
        "required": false,
        "notes": "缺省 `dashed`。⚠️ 与 basic 的 `Grid: true`（开关）语义不同。"
      },
      {
        "name": "Dict:",
        "meaning": "字典定义（数据层，必须**先于**一切引用出现）",
        "values": [],
        "argShape": "<名>[<值>,<值>,…]",
        "example": "Dict: D[信息中心,综合计划科,办公室]",
        "status": "supported",
        "required": true,
        "notes": "`D` / `P` / `R` 为保留字（部门/阶段/岗位）；其余自定义（如 `worker`）。值之间用**半角逗号**；值内部若需逗号请用全角「，」。同名 `Dict` 重复定义会报错。"
      },
      {
        "name": "Lane:",
        "meaning": "批量画泳道（结构层，网格只由此产生）",
        "values": [],
        "argShape": "Lane from <字典>[<索引>,…] Layout H|V",
        "example": "Lane from D[0,1,2] Layout H",
        "status": "supported",
        "required": true,
        "notes": "`H` = 行（横向泳道），`V` = 列（纵向泳道）。索引支持 `D[0]` / `D[0,1,3]` / `D[*]`（全部）。**行/列顺序 = 索引列表顺序，与字典声明顺序无关**。无 `Lane from` 则无网格（`Location` 会失效）。"
      },
      {
        "name": "AxisX:",
        "meaning": "横轴标题",
        "values": [],
        "argShape": "<标题> Align L|R|C",
        "example": "AxisX: 职能部门 Align C",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "AxisY:",
        "meaning": "纵轴坐标标题（文字保持水平；真正旋转 -90° 的是各 Y 泳道标题）",
        "values": [],
        "argShape": "<标题> Align L|R|C",
        "example": "AxisY: 推进阶段 Align C",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Axis:",
        "meaning": "整图标题（挂在所选轴的最外围）",
        "values": [],
        "argShape": "<整图标题> AxisX|AxisY [Align L|R|C]",
        "example": "Axis: 采购审批 AxisX",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Attr:",
        "meaning": "属性边栏提取开关",
        "values": [],
        "argShape": "Attr active [<键>,…]",
        "example": "Attr active [Role,SOP,Lv,Time]",
        "status": "supported",
        "required": false,
        "notes": "缺省（不写）= 只标 Role。写入后，节点**右下角**按此顺序渲染该节点**有值**的项，多行右对齐，**至多 4 行**；空键不占行。可提取的键即六属性：`Role` `SOP` `Lv` `Time` `KPI` `M`。"
      },
      {
        "name": "W:",
        "meaning": "节点定义",
        "values": [],
        "argShape": "[<id>:] <标签> [Type[…]] [Location(…)] [属性(…)]* [Attach(#id)] [V|H|D]",
        "example": "W: w1: worker[0] Type[S] Location(D[0],P[0])",
        "status": "supported",
        "required": true,
        "notes": "① `id` 可省略（自动 `w1,w2,…`），用于 `#引用`；② `标签` 为字典引用（`worker[0]`）或字面量（`提交申请`），二选一；③ 行尾 `V`/`H`/`D` 指定**格内相对上一节点**的方位：下 / 右 / 对角右下。"
      },
      {
        "name": "Type:",
        "meaning": "节点类型",
        "values": [
          "S",
          "E",
          "T",
          "?",
          "+",
          "SUB",
          "N",
          "DATA"
        ],
        "argShape": "",
        "example": "W: q1: worker[2] Type[?] Location(D[0],P[1])",
        "status": "supported",
        "required": false,
        "notes": "`S`开始 `E`结束 `T`任务（缺省）`?`排他网关 `+`并行网关 `SUB`子流程 `N`标注 `DATA`数据对象。⚠️ 实测未声明的 `Type[XX]` 会**静默降级为 T**，不报错——请只用上表取值（AUD-005/C7）。"
      },
      {
        "name": "Location:",
        "meaning": "节点落格坐标",
        "values": [],
        "argShape": "Location(<字典名>[索引], …)",
        "example": "Location(D[0],P[1])",
        "status": "supported",
        "required": false,
        "notes": "**参数按字典名索引，与 `Layout H/V` 无关**：`Location(D[0],P[1])` 恒表示「D 字典第 0 项」×「P 字典第 1 项」；哪个是行、哪个是列由对应的 `Lane from … Layout` 决定。实测 canonical 输出为 `cell:{D:0,P:1}`。坐标维度必须已由某条 `Lane from` 定义；**多余维度自动清洗**（不报错）；缺省 `Location` = 按声明顺序自动落格。"
      },
      {
        "name": "→:",
        "meaning": "显式边（源在左、目标在右，目标必须已定义）",
        "values": [],
        "argShape": "<源id> → #<目标id>",
        "example": "w5 → #w6",
        "status": "partial",
        "required": false,
        "notes": "✅ 无标签形式可用。❌ **标签形式不可用**：spec §7.2 曾文档化 `w1 → #w5 [超时]`，实测报错「显式边目标 w5 [超时] 未定义」（AUD-117）——**不要在显式边上写标签**；需要连线文字时改用分支行（分支行的标签是支持的）。⚠️ 箭头为**全角 `→`**；目标必须带 `#`；目标需先于该行定义。"
      },
      {
        "name": "分支行:",
        "meaning": "网关出口声明（Type[?]/Type[+] 必须写）",
        "values": [],
        "argShape": "<标签> [(<出口名>)] [<条件>] → #<目标>[, #<目标>]*",
        "example": "   合格 (pass) → #w2",
        "status": "partial",
        "required": true,
        "notes": "✅ `标签`（连线文字）、`(出口名)`（稳定 id，缺省自动 `{节点id}-Y`/`-N`）、`[条件]`（BPMN conditionExpression）、多目标 `→ #a, #b`（自动拆并行边）、`否则 → #w5`（默认出口，渲染为带斜杠实线）。⚠️ 多目标拆分时会因标签重名产生 warning「分支出口标签「是」重复（应唯一）」——多目标时请给**不同标签**或省略标签（AUD-121）。❌ **目标不可省略**：spec §7.3 曾写「可省略 = 接声明顺序下一节点」，实测 `是 →` 被**静默丢弃**、不产生任何边（AUD-118）——必须写 `#目标`。"
      },
      {
        "name": "End:",
        "meaning": "显式闭合分支块 / 子流程块",
        "values": [],
        "argShape": "End",
        "example": "   End",
        "status": "supported",
        "required": true,
        "notes": "缩进仅为视觉辅助，不参与解析；但**每个分支块与子流程块都必须以 `End` 闭合**。"
      },
      {
        "name": "SUB:",
        "meaning": "子流程块（内嵌子图）",
        "values": [],
        "argShape": "W: <id>: <标签> Type[SUB] …\\n   W: <内嵌节点>…\\n   End",
        "example": "W: q2: worker[5] Type[SUB] Location(D[0])\\n   W: s1: worker[6] Type[S]\\n   W: s2: worker[7] Type[E]\\n   End",
        "status": "partial",
        "required": false,
        "notes": "⚠️ **子流程内嵌的 `W` 行会打断默认顺序流**：实测 SUB 节点**不会**自动连到其后的节点（AUD-119 同源机制）——**必须显式写 `SUBid → #下一节点`**，否则后续节点会报「孤立」。（这正是旧版正例 B 的失败原因，AUD-122，已修正。）"
      },
      {
        "name": "Attach:",
        "meaning": "N/DATA 依附目标节点（仅修饰类可用）",
        "values": [],
        "argShape": "Attach(#id) | Attach(id)",
        "example": "W: n1: 评审记录 Type[N] Attach(#w10)",
        "status": "partial",
        "required": false,
        "notes": "① N/DATA **不占交叉格**，渲染在网格最右侧的 `DOC` 虚拟列，与 `Attach` 目标同行；② 连线用虚线（`condition=__doc__`）；③ 目标必须存在且非 N/DATA；④ ❌ **已知缺陷（AUD-119）**：若把 N/DATA 直接排在主流节点的**相邻声明位置**，默认顺序流会产出 `w1 → n1` 这样的违规边，进而报错「连线目标 n1 为修饰类节点」。**规避写法：把 `Type[N]`/`Type[DATA]` 的 `W` 行写在所有主流节点之后**，不要插入主流声明序列中间。"
      },
      {
        "name": "SOP:",
        "meaning": "标准编号（如体系文件号）",
        "values": [],
        "argShape": "SOP(<值>)",
        "example": "SOP(XX-CX-04)",
        "status": "supported",
        "required": false,
        "notes": "值可为字面量或字典引用。"
      },
      {
        "name": "Role:",
        "meaning": "岗位（**不占格**，用于节点右下角标注与岗位图例）",
        "values": [],
        "argShape": "Role(<R[i]> | <字典引用> | <字面量>)",
        "example": "Role(R[0])",
        "status": "supported",
        "required": false,
        "notes": "三种写法等价：`Role(R[1])` / `Role(岗位[2])` / `Role(部门经理)`。**不强制绑定 `R` 数组**。"
      },
      {
        "name": "Lv:",
        "meaning": "重要度",
        "values": [
          "重大",
          "重要",
          "一般",
          "1",
          "2",
          "3"
        ],
        "argShape": "",
        "example": "Lv(重要)",
        "status": "supported",
        "required": false,
        "notes": "文字与数字两种写法均可（1=重大 3=一般）。"
      },
      {
        "name": "Time:",
        "meaning": "时限",
        "values": [],
        "argShape": "Time(24h)",
        "example": "Time(24h)",
        "status": "supported",
        "required": false,
        "notes": "体系文件常用时长写法，如 `24h` / `3d`。"
      },
      {
        "name": "KPI:",
        "meaning": "考核指标",
        "values": [],
        "argShape": "KPI(<文本>)",
        "example": "KPI(及时率≥98%)",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "M:",
        "meaning": "成熟度/等级",
        "values": [
          "BPM",
          "1",
          "2",
          "3",
          "4"
        ],
        "argShape": "",
        "example": "M(BPM)",
        "status": "supported",
        "required": false,
        "notes": "`BPM` 表示已纳入流程管理，数字表示等级。"
      }
    ],
    "example": {
      "title": "采购申请审批（二维矩阵泳道）",
      "dsl": "Title: 卷烟生产批次质量追溯与放行流程\nLayout: H\nGrid: dashed\nDict: D[制丝车间,卷包车间,质检中心,技术中心,档案室]\nDict: P[批次创建,参数采集,并行检测,异常处置,放行归档]\nDict: R[操作员,质检员,技术员,档案员]\nDict: worker[创建生产批次,录入工艺参数,质量指标是否合规?,物理/化学并行检测,物理指标检测,化学指标检测,偏差分析与处置,技术中心复核,编制批次报告,质量放行,资料归档,复核评审记录,检测数据集]\nLane from D[0,1,2,3,4] Layout H\nLane from P[0,1,2,3,4] Layout V\nAxisX: 责任部门 Align C\nAxisY: 流程阶段 Align C\nAxis: 卷烟批次质量追溯 AxisY\nAttr active [Role,SOP,Lv,Time,KPI,M]\nW: w1: worker[0] Type[S] Location(D[0],P[0]) Role(R[0]) SOP(ZZ-PC-01) Lv(一般) Time(0.5h)\nW: w2: worker[1] Location(D[0],P[1]) Role(R[0]) SOP(ZZ-PC-02) Time(1h)\nW: g1: worker[2] Type[?] Location(D[2],P[1]) Role(R[1]) KPI(一次合格率)\n   合规 → #p1\n   不合规 → #w5\n   End\nW: p1: worker[3] Type[+] Location(D[1],P[1]) Role(R[1]) SOP(ZD-JC-05)\n   物理检测 → #w3\n   化学检测 → #w4\n   End\nW: w3: worker[4] Location(D[1],P[2]) Role(R[1]) Time(2h) Lv(重要)\nW: w4: worker[5] Location(D[2],P[2]) Role(R[1]) Time(3h) Lv(重要)\nW: sub1: worker[7] Type[SUB] Location(D[3],P[2]) Role(R[2]) Time(4h)\n   W: s1: 受理复核 Type[S] Role(R[2]) SOP(JS-FH-01)\n   W: s2: 出具意见 Type[E] Role(R[2]) SOP(JS-FH-02)\n   End\nW: w5: worker[6] Location(D[3],P[2]) Role(R[2]) SOP(JS-YC-11) Lv(关键) M(强制项)\nW: w8: worker[8] Location(D[2],P[3]) Role(R[1]) SOP(ZD-BG-08) Time(1h)\nW: w9: worker[9] Location(D[1],P[4]) Role(R[1]) Lv(关键) KPI(放行及时率)\nW: w10: worker[10] Type[E] Location(D[4],P[4]) Role(R[3]) Time(0.5h)\nW: n1: worker[11] Type[N] Attach(#w8)\nW: d1: worker[12] Type[DATA] Attach(#p1)\nw2 → #g1\nw3 → #w8\nw4 → #w8\nw5 → #sub1\nsub1 → #w8\nw8 → #w9\nw9 → #w10\n",
      "notes": "2 条 `Lane from` 构成行×列网格；`q1` 为排他网关，两个出口显式声明；`w4` 与 `w5` 为并列分支目标，各自显式连到 `w6`（**已修正旧版 w4 断链**）。"
    },
    "counterexamples": [
      {
        "bad": "flowchart TD\n  A[提交申请] --> B{经理审批}",
        "good": "Title: 采购申请审批流程\nLayout: H\nDict: D[…]…\nLane from D[0,1] Layout H\nW: w1: 提交申请 Type[S] Location(D[0])",
        "reason": "体系文件/部门泳道/BPMN 子集终稿必须用 IQS-Flow DSL（`render_flow`），禁止 Mermaid `flowchart`/`graph` 冒充。"
      },
      {
        "bad": "Lane from D[0,1] Layout H\nDict: D[部门A,部门B]",
        "good": "Dict: D[部门A,部门B]\nLane from D[0,1] Layout H",
        "reason": "`Dict` 必须先于一切引用（Lane / W / Location / Role）出现。"
      },
      {
        "bad": "W: q1: 超限? Type[?] Location(D[0],P[0])\nW: w2: 处理",
        "good": "W: q1: 超限? Type[?] Location(D[0],P[0])\n   是 → #w2\n   否则 → #w3\n   End",
        "reason": "排他/并行网关**禁止依赖自动出边**，必须写分支行并以 `End` 闭合。"
      },
      {
        "bad": "W: w1: 开始 Type[S] Location(D[0],P[0])\nW: n1: 备注 Type[N] Attach(#w1)\nW: w2: 处理 Location(D[1],P[1])",
        "good": "W: w1: 开始 Type[S] Location(D[0],P[0])\nW: w2: 处理 Location(D[1],P[1])\nW: n1: 备注 Type[N] Attach(#w1)",
        "reason": "N/DATA 插在主流声明序列中间会被默认顺序流串入主流并报错（AUD-119）；应把所有修饰类节点写在主流之后。"
      },
      {
        "bad": "w1 → #w5 [超时]",
        "good": "（显式边写标签不被支持）改用分支行：`超时 → #w5`",
        "reason": "spec §7.2 曾承诺显式边标签，实测报错「显式边目标 w5 [超时] 未定义」（AUD-117）。连线文字请走分支行。"
      },
      {
        "bad": "  是 →\n  否 → #w3",
        "good": "  是 → #w2\n  否 → #w3",
        "reason": "分支目标不可省略——省略会被静默丢弃、不产生任何边（AUD-118）。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL；**禁止** Markdown 代码围栏、禁止 JSON、禁止 `flowchart TD` / `graph LR`。",
      "行注释用 `//`；`#` **只用于节点引用**（`#w1`），不作注释、不作标题层级。",
      "结构分隔用**半角逗号**；标签内部若需标点请用**中文全角**（，、；：）。",
      "`Dict` 必须先定义再被引用；分支块与子流程块必须 `End` 闭合。",
      "开始与结束节点至少各 1 个（子流程内部的 start/end 不计入顶层）。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先抽取参与方（部门）→ 阶段 → 动作，分别填进 `Dict: D/P/worker`；再决定 `Lane from` 的行列与顺序；最后按声明顺序排 `W` 节点。",
      "判断节点（`Type[?]`）必须是**真的分叉**（至少两条出口）；没有分叉就用普通任务节点。",
      "一条流程的动作节点控制在 6–20 个；超过 20 个时考虑拆成主流程 + 子流程（`Type[SUB]`）。",
      "二维矩阵建议 `height` 900–1200；单维泳道用 600–800。",
      "若返回 `parser_errors`，按提示改，最多两轮。"
    ]
  },
  "histogram": {
    "meta": {
      "id": "histogram",
      "tier": "core",
      "family": "iqs_native",
      "body": "ScalarList",
      "mcpName": "render_histogram",
      "qcTool": "HISTOGRAM",
      "version": "1.1",
      "parentType": "iqs_native",
      "subType": "histogram",
      "displayName": "IQS 分布分析/直方图",
      "intents": [
        "直方图",
        "分布分析",
        "Cp",
        "Cpk",
        "histogram",
        "正态性",
        "工序能力"
      ],
      "expertise": [
        "正态分布分析",
        "工序能力评估 (Cp/Cpk)"
      ],
      "colorSlots": [
        "Bar",
        "Curve",
        "USL",
        "LSL",
        "Target"
      ],
      "renderEngine": "echarts",
      "inferenceKey": "histogram",
      "migrated": true
    },
    "soul": {
      "title": "正态分布分析与工序能力",
      "summary": "用直方图观察分布形态；给定规格限时自动评估 Cp / Cpk。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "正态分布分析 (Normal Distribution)"
        },
        {
          "kind": "p",
          "text": "直方图通过对大量随机样本的观察，识别生产过程是否受控。稳定的生产过程通常呈现对称的「钟形」曲线。"
        },
        {
          "kind": "ul",
          "items": [
            "**均值 (μ)**：反映加工的中心位置。",
            "**标准差 (σ)**：反映加工的散差大小。",
            "**形态**：双峰说明数据可能来自两个班次/设备/供应商；偏斜说明中心偏移或单边截尾。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "工序能力指标 (Process Capability)"
        },
        {
          "kind": "p",
          "text": "当定义了规格限（`USL` / `LSL`）时，引擎自动评估工序能力："
        },
        {
          "kind": "ul",
          "items": [
            "**Cp**：仅看散布宽度与规格宽度的比值，假设中心对齐。",
            "**Cpk**：同时考虑散布与中心偏移 —— **实际决策应看 Cpk**。",
            "**1.33**：工业级「合格」门槛；**1.67**：优秀。"
          ]
        },
        {
          "kind": "callout",
          "type": "TIP",
          "text": "样本量建议 ≥ 50（QC 惯例 100 以上）再解读 Cp/Cpk；样本太少时直方图形状与控制限都不可靠。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表标题",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 钢管直径分布",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "USL:",
        "meaning": "规格上限 (Upper Specification Limit)",
        "values": [],
        "argShape": "<数值>",
        "example": "USL: 10.5",
        "status": "supported",
        "required": false,
        "notes": "与 `LSL` 同时给出才会计算 Cp / Cpk；只给一个时只能评估单侧能力。"
      },
      {
        "name": "LSL:",
        "meaning": "规格下限 (Lower Specification Limit)",
        "values": [],
        "argShape": "<数值>",
        "example": "LSL: 9.5",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Target:",
        "meaning": "目标值（渲染为规格区内的目标线）",
        "values": [],
        "argShape": "<数值>",
        "example": "Target: 10.0",
        "status": "supported",
        "required": false,
        "notes": "目标值用于观察中心偏移方向，不参与 Cp/Cpk 计算。"
      },
      {
        "name": "Bins:",
        "meaning": "分组数（直方柱个数）",
        "values": [
          "auto"
        ],
        "argShape": "",
        "example": "Bins: auto",
        "status": "supported",
        "required": false,
        "notes": "可写整数（如 `Bins: 20`）或 `auto`（按样本量自动，缺省）。"
      },
      {
        "name": "ShowCurve:",
        "meaning": "是否叠加正态拟合曲线",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowCurve: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ShowValues:",
        "meaning": "是否显示柱顶数值",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowValues: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[Bar | Curve | USL | LSL | Target]",
        "meaning": "#HEX 颜色：柱体 / 拟合曲线 / 规格上限线 / 规格下限线 / 目标线",
        "values": [],
        "argShape": "",
        "example": "Color[USL]: #E74C3C",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Font[Title | Base]",
        "meaning": "px 字号（标题 / 正文）",
        "values": [],
        "argShape": "",
        "example": "Font[Title]: 18",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "数据行:",
        "meaning": "原始测量数据，**一行一个数值**（本 kind 唯一的数据录入方式）",
        "values": [],
        "argShape": "- <数值>",
        "example": "- 9.8",
        "status": "supported",
        "required": true,
        "notes": "必须是**逐条原始观测值**，不要预先把数据分箱或写成 `频数: 值`。"
      }
    ],
    "example": {
      "title": "产品直径分布分析",
      "dsl": "Title: 产品直径分布分析\nUSL: 10.5\nLSL: 9.5\nTarget: 10.0\nColor[Bar]: #0D5E42\nColor[Curve]: #F1C40F\nColor[USL]: #E74C3C\nColor[LSL]: #E74C3C\nColor[Target]: #22c55e\nFont[Title]: 18\nFont[Base]: 12\nBins: auto\nShowCurve: true\n\n// 原始测量数据（一行一个数值）\n- 9.8\n- 10.2\n- 10.1\n- 9.9\n- 10.0\n- 10.3\n- 9.7\n- 10.1\n- 9.9\n- 10.0\n- 10.2\n- 9.8\n- 10.4\n- 9.6\n- 10.1\n- 9.9\n- 10.0\n- 10.2\n- 9.8\n- 10.1\n- 10.5\n- 9.5\n- 10.0\n- 10.3\n- 9.7\n- 10.1\n- 9.9\n- 10.2\n- 10.0\n- 9.8\n",
      "notes": "30 个原始测量值；USL/LSL 齐全，引擎据此计算 Cp / Cpk 并叠加正态曲线。"
    },
    "counterexamples": [
      {
        "bad": "- 9.8: 5   （把频数写进数据行）",
        "good": "- 9.8\n- 9.8\n- 9.8\n- 9.8\n- 9.8",
        "reason": "本 kind 录入的是**原始观测值**（一行一个），不是「值: 频数」的预统计表。"
      },
      {
        "bad": "Bins: 3   （用于 30 个样本）",
        "good": "Bins: auto",
        "reason": "分组数过少会掩盖分布形态；样本量 30 时建议 6–8 组，或直接用 `auto`。"
      },
      {
        "bad": "LSL: 10.5\nUSL: 9.5",
        "good": "LSL: 9.5\nUSL: 10.5",
        "reason": "下限必须小于上限，否则工序能力指标无意义。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "数据用 `- <数值>` 逐行录入，必须是原始观测值。",
      "`LSL` 必须小于 `USL`；两者齐全才会计算 Cp / Cpk。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "把用户给的数据整理成**逐条原始值**（一行一个），不要预先分箱或写成频数表。",
      "样本量建议 ≥ 50；若用户数据不足，如实说明并仍生成（引擎会给出结果，但解读需谨慎）。",
      "规格限要么都写、要么都不写；只给一个时提醒用户单侧评估的局限。",
      "不要臆造 USL/LSL —— 用户没给就不写，让图只呈现分布形态。"
    ]
  },
  "iqs_native": {
    "meta": {
      "id": "iqs_native_master",
      "tier": "core",
      "family": "iqs_native",
      "body": "Family",
      "mcpName": "render_iqs_native_master",
      "qcTool": "IQS_NATIVE",
      "version": "1.2",
      "parentType": "iqs_native",
      "subType": "master",
      "displayName": "IQS 原生组件总纲",
      "intents": [
        "IQS 原生",
        "CORE",
        "QC 核心图",
        "质量工具"
      ],
      "expertise": [
        "质量工具标准化",
        "逻辑模型统一化"
      ],
      "colorSlots": [],
      "renderEngine": "native",
      "migrated": true
    },
    "soul": {
      "title": "IQS-DSL v1 核心总纲（CORE 层）",
      "summary": "14 个 QC 原生图表共用的外壳、注释与 Type 消歧规则；能映射标准 QC 工具时一律用本层。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "分层与选用"
        },
        {
          "kind": "ul",
          "items": [
            "**CORE（本层）**：`iqs_native` 的 14 个 kind —— 成果报告、专业 QC 图、可审计，**严格语言**。",
            "**RELIEF**：Mermaid / VChart —— 仅作类型外制图，**不得冒充** SPC / 排列图等终稿。",
            "**选用红线**：能映射标准 QC 工具 → 必须 CORE；仅当类型表外 → 才用 RELIEF。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "共同外壳"
        },
        {
          "kind": "ul",
          "items": [
            "**首行 `Title:`**（推荐必写）：承载图表主标题或待分析的问题。",
            "**样式指令**：`Color[Slot]: #RRGGBB` / `Font[Slot]: <px>` / `Show*: true|false` / `Decimals: <整数>`。",
            "槽位名（`Slot`）因 kind 而异，取值见各 kind 卡片——**不要跨 kind 混用**。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "注释与 `#` 规则（最易误用）"
        },
        {
          "kind": "ul",
          "items": [
            "**行注释统一用 `//`**。",
            "**`#` / `##` / `###` 仅鱼骨图（fishbone，body = Tree）可用**，作层级结构。其余 13 个 kind 中 `#` 行只是历史兼容注释，**不要模仿**。",
            "**亲和图必须用 `Item:`** 建树，禁止用 `#`。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "`Type:` 消歧（**同名不同义**）"
        },
        {
          "kind": "ul",
          "items": [
            "`control`：SPC 图种（`I-MR` / `X-bar-R` / …）。",
            "`matrix`：矩阵几何（`L` / `T` / `Y` / `X` / `C`）。",
            "`affinity`：渲染模式（`Card` / `Label`）。",
            "`basic`：图表类型（`bar` / `line` / `pie`）。",
            "**禁止跨 kind 混用取值**（引擎不校验时会静默降级）。"
          ]
        },
        {
          "kind": "callout",
          "type": "IMPORTANT",
          "text": "**代码块禁令**：严禁 Markdown 围栏与解释性前后缀，只输出纯文本 DSL；`dsl` 参数不得写成 JSON 对象。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "首行标题（推荐必写）",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 售后投诉根因分析",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "Color[Slot]",
        "meaning": "#HEX 颜色；Slot 名因 kind 而异，取值见对应卡片",
        "values": [],
        "argShape": "",
        "example": "Color[Bar]: #0D5E42",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Font[Slot]",
        "meaning": "px 字号；Slot 名因 kind 而异",
        "values": [],
        "argShape": "",
        "example": "Font[Title]: 20",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Show*:",
        "meaning": "显示开关族（`ShowValues` / `ShowLegend` / `ShowCurve` / `ShowScores` / `ShowCritical` …）",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowValues: true",
        "status": "supported",
        "required": false,
        "notes": "具体有哪些开关因 kind 而异；取值为小写布尔。"
      },
      {
        "name": "Decimals:",
        "meaning": "数值显示精度（小数位）",
        "values": [],
        "argShape": "<整数>",
        "example": "Decimals: 2",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "注释:",
        "meaning": "行注释，**统一用 `//`**",
        "values": [],
        "argShape": "// <注释>",
        "example": "// 主轴产量",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "正文结构:",
        "meaning": "各 kind 的正文形态（Body）不同，必须严格匹配对应卡片的范式",
        "values": [
          "Tree",
          "ItemTree",
          "Pairs",
          "ScalarList",
          "Series",
          "TupleList",
          "Dataset",
          "AxisSeries",
          "Graph",
          "Network",
          "Matrix",
          "Table",
          "ProcessGraph",
          "FlowGraph"
        ],
        "argShape": "",
        "example": "// 见示例中的逐 kind 结构对照",
        "status": "supported",
        "required": false,
        "notes": "**不要混用**：如 `Item:` 属 ItemTree（affinity）与 ProcessGraph（pdpc）但第三参语义不同；`- ` 列表属 Pairs / ScalarList / TupleList，但取值形态不同。"
      }
    ],
    "example": {
      "title": "共同外壳 + 14 个 kind 的正文结构对照",
      "dsl": "Title: 2024年三季度产线效能\nColor[Title]: #1A2428\nFont[Title]: 20\nDecimals: 2\n\n// 以下为各 kind 的正文结构示意（实际只写一种）\n// Tree      → # 一级  /  ## 二级            （fishbone）\n// ItemTree  → Item: id, label, parentId      （affinity）\n// Pairs     → - 名称: 数值                    （pareto）\n// ScalarList→ - 数值                          （histogram）\n// Series    → [series]: 标题 … [/series]      （control）\n// TupleList → - x, y [, z]                    （scatter）\n// Dataset   → Dataset: 名称, [值], 色, 轴      （basic）\n// AxisSeries→ Axis: 名, 最大 … / Series: 名, [值]（radar）\n// Graph     → Node: id, 标签 / Rel: a -> b    （relation）\n// Network   → Event: id, 名 / a -> b: 工期, 名 （arrow）\n// Matrix    → Axis: A, 名 / Matrix: A x B     （matrix）\n// Table     → Data: / Styles:                 （matrixPlot）\n// ProcessGraph → Group: … EndGroup / a--b [NG]（pdpc）\n// FlowGraph → Dict: / Lane from / W:          （flow）\n",
      "notes": "仅作外层与结构的对照示意；实际生成时**只写一种** kind 的正文，并遵循其卡片。"
    },
    "counterexamples": [
      {
        "bad": "用 `# 人 (Man)` 在亲和图里建层级",
        "good": "Item: g1, 人员因素, root",
        "reason": "`#` 层级仅鱼骨图可用；亲和图是 ItemTree，必须用 `Item:`。"
      },
      {
        "bad": "Type: X-bar-R   （写在 matrix 图里）",
        "good": "Type: L        （matrix 的 Type 取 L/T/Y/X/C）",
        "reason": "`Type:` 同名不同义 —— 跨 kind 混用取值不会被接受（或静默降级）。"
      },
      {
        "bad": "```dsl\\nTitle: xxx\\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 围栏。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "首行写 `Title:`；样式用 `Color[Slot]:` / `Font[Slot]:` / `Show*:` / `Decimals:`。",
      "行注释统一 `//`；`#` 层级仅鱼骨图可用。",
      "`Type:` 按 kind 解释，禁止跨 kind 混用取值。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "**先选 kind**（14 个 CORE 之一），再读该 kind 的卡片获取其语法与示例 —— 本卡只给外壳。",
      "能映射标准 QC 工具就用 CORE；不要用 Mermaid/VChart 替代。",
      "正文结构必须匹配所选 kind 的 Body；跨 kind 的「同名指令」语义不同，不要照搬。",
      "输出纯文本，首行 `Title:`，不要围栏、不要 JSON。"
    ]
  },
  "matrix": {
    "meta": {
      "id": "matrix",
      "tier": "core",
      "family": "iqs_native",
      "body": "Matrix",
      "mcpName": "render_matrix",
      "qcTool": "MATRIX",
      "version": "1.1",
      "parentType": "iqs_native",
      "subType": "matrix",
      "displayName": "IQS 相关性识别/矩阵图",
      "intents": [
        "矩阵图",
        "L型矩阵",
        "T型矩阵",
        "Y型矩阵",
        "matrix diagram",
        "相关矩阵",
        "决策矩阵"
      ],
      "expertise": [
        "多维度交叉分析",
        "评分系统",
        "决策矩阵"
      ],
      "colorSlots": [
        "Title"
      ],
      "typeDirective": {
        "name": "Type",
        "values": [
          "L",
          "T",
          "Y",
          "X",
          "C"
        ],
        "meaning": "matrixGeometry"
      },
      "renderEngine": "canvas",
      "inferenceKey": "matrix",
      "migrated": true
    },
    "soul": {
      "title": "矩阵图分析 (Matrix Diagram)",
      "summary": "用行与列的交点表达两组（或多组）因素之间的相关强弱，并通过加权评分定位核心影响因子。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "矩阵图分析 (Matrix Diagram)"
        },
        {
          "kind": "p",
          "text": "矩阵图是从多维度的交叉点寻找解决问题线索的方法。它通过行与列的交点，展现各因素间的相关程度（强 / 中 / 弱）。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "常见矩阵选型"
        },
        {
          "kind": "ul",
          "items": [
            "**L 型**：两个维度 (A × B)，最常用。",
            "**T 型**：三个维度 (A × B, A × C)，A 为关联中心。",
            "**Y 型**：三个维度 (A × B, B × C, C × A)，形成闭环关联。",
            "**X 型**：四个维度两两交叉；**C 型**：立方体（三维）。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "符号与评分系统"
        },
        {
          "kind": "ul",
          "items": [
            "**S (Strong)**：强相关，默认权重 **9**。",
            "**M (Medium)**：中等相关，默认权重 **3**。",
            "**W (Weak)**：弱相关，默认权重 **1**。",
            "符号写在关系行里（`a1: b1:S`），权重可用 `Weight[...]` 覆盖。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "两条渲染规则（重要）"
        },
        {
          "kind": "ul",
          "items": [
            "**绘图区净化**：为最大化画布利用率，绘图区内部**不绘制标题**。`Title:` 仅作元数据、导出文件名与导出 PNG/PDF 时的外部标注。",
            "**Y 型视角标准化**：Y 型矩阵固定采用 Top-Down（俯视）透视，不支持旋转 —— 保证指标标签始终正向且向上放射。"
          ]
        },
        {
          "kind": "callout",
          "type": "TIP",
          "text": "矩阵图不仅用于展示现状，更在于通过「评分模式」发现薄弱环节。启用 `ShowScores: true` 可识别核心影响因子。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表标题（**仅作元数据与导出标注，不在绘图区渲染**）",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 零部件与故障模式矩阵",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "Type:",
        "meaning": "矩阵类型（几何形态）",
        "values": [
          "L",
          "T",
          "Y",
          "X",
          "C"
        ],
        "argShape": "",
        "example": "Type: L",
        "status": "supported",
        "required": true,
        "notes": "大写字母；缺省为 `L`。选定后应给出与之匹配的轴数量（L=2 轴，T=3 轴，Y=3 轴闭环）。"
      },
      {
        "name": "ShowScores:",
        "meaning": "是否显示加权得分统计",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowScores: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "CellSize:",
        "meaning": "单元格像素边长",
        "values": [],
        "argShape": "<整数>",
        "example": "CellSize: 40",
        "status": "supported",
        "required": false,
        "notes": "缺省按画布自适应；格子很多时应显式调小。"
      },
      {
        "name": "Weight[Strong | Medium | Weak]",
        "meaning": "符号权重（默认 9 / 3 / 1）",
        "values": [],
        "argShape": "",
        "example": "Weight[Strong]: 9",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[Title]",
        "meaning": "#HEX 颜色（标题等）",
        "values": [],
        "argShape": "",
        "example": "Color[Title]: #1A2428",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Font[Title | Base]",
        "meaning": "px 字号（标题 / 正文）",
        "values": [],
        "argShape": "",
        "example": "Font[Base]: 10",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Axis:",
        "meaning": "定义一条轴（维度）",
        "values": [],
        "argShape": "<AxisID>, <轴标题>",
        "example": "Axis: A, 零部件",
        "status": "supported",
        "required": true,
        "notes": "AxisID 用单字母（A/B/C…），供 `Matrix:` 与关系行引用。"
      },
      {
        "name": "轴项行:",
        "meaning": "轴下的条目（紧跟所属 `Axis:` 之后）",
        "values": [],
        "argShape": "- <项ID>, <标签> [, <权重>]",
        "example": "- a1, 活塞销, 0.8",
        "status": "supported",
        "required": true,
        "notes": "第三个字段为**可选的项权重**（用于加权得分），不是相关符号。"
      },
      {
        "name": "Matrix:",
        "meaning": "声明要渲染哪两条轴的交叉矩阵",
        "values": [],
        "argShape": "<RowAxisID> x <ColAxisID>",
        "example": "Matrix: A x B",
        "status": "supported",
        "required": true,
        "notes": "`x` 为半角小写字母 x，两侧留空格。"
      },
      {
        "name": "关系行:",
        "meaning": "声明某行项与各列项的相关关系",
        "values": [],
        "argShape": "<行项ID>: <列项ID>:<符号>[, …]",
        "example": "a1: b1:S, b2:M",
        "status": "supported",
        "required": false,
        "notes": "符号取 `S` / `M` / `W`（也可写中文 ◎ / ○ / △）；一行可写多组，用**半角逗号**分隔。"
      }
    ],
    "example": {
      "title": "零部件与故障模式关联分析",
      "dsl": "Title: 零部件与故障模式关联分析\nType: L\nShowScores: true\nCellSize: 40\nWeight[Strong]: 9\nWeight[Medium]: 3\nWeight[Weak]: 1\n\n// A 轴（行）：零部件，第三列为该行权重\nAxis: A, 零部件\n- a1, 活塞销, 0.8\n- a2, 连杆, 0.9\n- a3, 轴瓦, 1.0\n\n// B 轴（列）：故障模式\nAxis: B, 故障模式\n- b1, 磨损\n- b2, 裂纹\n- b3, 泄漏\n- b4, 异响\n\n// 关系定义：<行项ID>: <列项ID>:<符号>\nMatrix: A x B\na1: b1:S, b2:M\na2: b2:S, b4:W\na3: b1:M, b3:S, b4:S\n",
      "notes": "L 型矩阵：A 轴 3 行 × B 轴 4 列，权重用 `Weight[...]` 覆盖默认 9/3/1。"
    },
    "counterexamples": [
      {
        "bad": "a1: b1, b2:S",
        "good": "a1: b1:S, b2:S",
        "reason": "每个列项都要带符号（`S`/`M`/`W`）；漏写符号的关系不会被渲染。"
      },
      {
        "bad": "Matrix: A x C   （但未定义 Axis: C）",
        "good": "Axis: C, 环境因素\nMatrix: A x C",
        "reason": "`Matrix:` 引用的两条轴都必须先由 `Axis:` 定义。"
      },
      {
        "bad": "Type: T   （但只定义了 2 条轴）",
        "good": "Type: L   （两条轴）或补第三条轴",
        "reason": "矩阵类型与轴数量必须匹配：L/K = 2 轴，T/Y = 3 轴，X = 4 轴。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "先 `Axis:` 定义轴与其条目，再 `Matrix:` 声明交叉，最后写关系行。",
      "关系行格式为 `<行项>: <列项>:<符号>`，多组用**半角逗号**分隔；符号取 `S`/`M`/`W`。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先判矩阵类型：只有两组因素 → L 型；三组中有一组为共同中心 → T 型；三组两两交叉 → Y 型。",
      "轴项数建议 ≤ 10（行 × 列 ≤ 100 格），过多时先归并次要项。",
      "关系强度符号只在**确有工程依据**时给 `S`；不要为了「好看」全部标 `S`。",
      "若用户提供了权重/评分，用 `- <项ID>, <标签>, <权重>` 与 `Weight[...]` 表达，不要写进 `Title:`。"
    ]
  },
  "matrix_plot": {
    "meta": {
      "id": "matrixPlot",
      "tier": "core",
      "family": "iqs_native",
      "body": "Table",
      "mcpName": "render_matrix_plot",
      "qcTool": "MATRIX_PLOT",
      "version": "1.1",
      "parentType": "iqs_native",
      "subType": "matrixPlot",
      "displayName": "IQS 多维交互/矩阵散点图",
      "intents": [
        "矩阵散点图",
        "散点图矩阵",
        "多变量关联",
        "matrix plot",
        "pairs plot",
        "相关矩阵图"
      ],
      "expertise": [
        "多元统计分析",
        "多变量两两交互",
        "局部非线性趋势捕捉 (Lowess)"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "matrixPlot",
      "migrated": true
    },
    "soul": {
      "title": "矩阵散点图分析价值 (Multi-variable Correlation)",
      "summary": "用 N×N 的散点网格一次看遍所有变量的两两关系，对角线的分布图揭示各变量自身形态。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "矩阵散点图分析价值 (Multi-variable Correlation)"
        },
        {
          "kind": "p",
          "text": "图矩阵是多元统计分析中的核心工具，用于在单一视野内展示多变量间的两两交互关系。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "核心逻辑与策略"
        },
        {
          "kind": "ul",
          "items": [
            "**Lowess 平滑**：局部加权散点平滑，对离群点鲁棒，能捕捉局部非线性趋势。",
            "**对角线分布**：用直方图确认各变量自身形态（是否正态、有无双峰）—— 判定采样偏置的关键。",
            "**Group 分层识别**：用颜色/形状区分群组（班次、机台、批次）。群体分离往往标志着找到了问题的根本层级。",
            "**降维定位**：在 N×N 的交互网格中快速锁定那 20% 具有强相关的关键驱动因素。"
          ]
        },
        {
          "kind": "callout",
          "type": "TIP",
          "text": "重点看**对角线上的直方图**：若某变量呈双峰，先怀疑采样偏置或数据混入了两个总体，再谈相关性。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表主标题",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 制程参数关联分析",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "Mode:",
        "meaning": "布局模式",
        "values": [
          "Matrix",
          "YvsX"
        ],
        "argShape": "",
        "example": "Mode: Matrix",
        "status": "supported",
        "required": false,
        "notes": "`Matrix` = 全矩阵（N×N 网格）；`YvsX` = 单组交叉（仅 1 个 Y 对多个 X）。"
      },
      {
        "name": "Dimensions:",
        "meaning": "参与分析的变量维度列表（`Mode: Matrix` 时使用）",
        "values": [],
        "argShape": "[<变量1>, <变量2>, …]",
        "example": "Dimensions: [温度, 压力, 良率]",
        "status": "supported",
        "required": true,
        "notes": "维度名必须与 `Data:` 中每条记录的字段名**逐字一致**。建议 3–6 个维度（N×N 网格增长很快）。"
      },
      {
        "name": "Group:",
        "meaning": "分层变量名（用颜色/形状区分群组）",
        "values": [],
        "argShape": "<字段名>",
        "example": "Group: 批次",
        "status": "supported",
        "required": false,
        "notes": "该字段应同时出现在 `Data:` 的每条记录里。"
      },
      {
        "name": "Smoother:",
        "meaning": "平滑算法",
        "values": [
          "Lowess",
          "MovingAverage",
          "false"
        ],
        "argShape": "",
        "example": "Smoother: Lowess",
        "status": "supported",
        "required": false,
        "notes": "写 `false` 或省略即不叠趋势线。"
      },
      {
        "name": "Data:",
        "meaning": "数据块**开始**；块内每条记录为一行 YAML-lite 对象",
        "values": [],
        "argShape": "Data:\n- { <字段>: <值>, … }",
        "example": "Data:\n- { 压力: 102, 温度: 185, 晶圆批次: \"W-01\" }",
        "status": "supported",
        "required": true,
        "notes": "字段名可不加引号；字符串值（如批次号）建议加引号以免被解析为数值。**至少 10 条记录**才有统计意义。"
      },
      {
        "name": "Styles:",
        "meaning": "样式块**开始**；块内为 `- <键>: <值>` 列表",
        "values": [],
        "argShape": "Styles:\n- <键>: <值>",
        "example": "Styles:\n- DisplayMode: Lower",
        "status": "supported",
        "required": false,
        "notes": "键包括 `DisplayMode` / `Diagonal` / `ColorPalette` / `PointSize` / `PointOpacity`。"
      },
      {
        "name": "DisplayMode:",
        "meaning": "（`Styles` 内）显示哪些三角区域",
        "values": [
          "Full",
          "Lower",
          "Upper"
        ],
        "argShape": "",
        "example": "- DisplayMode: Lower",
        "status": "supported",
        "required": false,
        "notes": "`Full` 全显（N×N）；`Lower` 只显左下三角（**最常用，避免重复信息**）；`Upper` 只显右上三角。"
      },
      {
        "name": "Diagonal:",
        "meaning": "（`Styles` 内）对角线单元格的呈现方式",
        "values": [
          "Histogram",
          "Boxplot",
          "Label",
          "None"
        ],
        "argShape": "",
        "example": "- Diagonal: Histogram",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ColorPalette:",
        "meaning": "（`Styles` 内）配色方案",
        "values": [
          "Industrial"
        ],
        "argShape": "",
        "example": "- ColorPalette: Industrial",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "封装工艺参数相关性研究",
      "dsl": "Title: 封装工艺参数相关性研究\nMode: Matrix\nDimensions: [压力, 温度, 固化时间, 剥离强度]\nGroup: 晶圆批次\nSmoother: Lowess\n\nData:\n- { 压力: 102, 温度: 185, 固化时间: 45, 剥离强度: 8.2, 晶圆批次: \"W-01\" }\n- { 压力: 105, 温度: 188, 固化时间: 46, 剥离强度: 7.9, 晶圆批次: \"W-01\" }\n- { 压力: 100, 温度: 186, 固化时间: 44, 剥离强度: 8.0, 晶圆批次: \"W-01\" }\n- { 压力: 98, 温度: 192, 固化时间: 42, 剥离强度: 9.1, 晶圆批次: \"W-02\" }\n- { 压力: 96, 温度: 194, 固化时间: 41, 剥离强度: 9.4, 晶圆批次: \"W-02\" }\n- { 压力: 99, 温度: 191, 固化时间: 43, 剥离强度: 9.0, 晶圆批次: \"W-02\" }\n- { 压力: 110, 温度: 180, 固化时间: 48, 剥离强度: 7.2, 晶圆批次: \"W-03\" }\n- { 压力: 112, 温度: 178, 固化时间: 49, 剥离强度: 7.0, 晶圆批次: \"W-03\" }\n- { 压力: 108, 温度: 182, 固化时间: 47, 剥离强度: 7.4, 晶圆批次: \"W-03\" }\n- { 压力: 104, 温度: 187, 固化时间: 45, 剥离强度: 8.1, 晶圆批次: \"W-01\" }\n\nStyles:\n- DisplayMode: Lower\n- Diagonal: Histogram\n- ColorPalette: Industrial\n",
      "notes": "4 个维度 × 10 条记录，按晶圆批次分 3 组；`DisplayMode: Lower` 只画左下三角。"
    },
    "counterexamples": [
      {
        "bad": "Dimensions: [压力, 温度]\nData:\n- { 压强: 102, 温度: 185 }",
        "good": "Dimensions: [压力, 温度]\nData:\n- { 压力: 102, 温度: 185 }",
        "reason": "`Dimensions` 里的维度名必须与 `Data:` 记录的字段名逐字一致，否则该维度全为空。"
      },
      {
        "bad": "Data:\n- { 压力: 102, 温度: 185 }   （仅 1–2 条记录）",
        "good": "至少 10 条记录",
        "reason": "两两散点图在极少样本下无法读出分布与相关性，甚至会误导。"
      },
      {
        "bad": "Dimensions: [温度, 压力, 时间, 强度, 硬度, 湿度, 速度, 重量]   （8 维）",
        "good": "选出 3–6 个关键维度",
        "reason": "N 维会生成 N×N 网格；8 维即 64 格，远超一屏可读范围。先做维度筛选。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "`Data:` 与 `Styles:` 都是块式语法：块名独占一行，块内条目以 `- ` 开头。",
      "`Dimensions` 的维度名必须与 `Data:` 记录字段名逐字一致。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先选维度（3–6 个）——矩阵散点图的成本随维度平方增长。",
      "把用户数据整理成 `- { 字段: 值, … }` 的记录列表，字段名用简短中文并保持一致。",
      "有分组信息时务必用 `Group:` 表达（颜色分层往往比总体相关系数更有信息量）。",
      "缺省用 `DisplayMode: Lower` 只画左下三角；需要对照上下三角时才用 `Full`。",
      "不要臆造数据行 —— 用户给的样本量不足时如实说明。"
    ]
  },
  "pareto": {
    "meta": {
      "id": "pareto",
      "tier": "core",
      "family": "iqs_native",
      "body": "Pairs",
      "mcpName": "render_pareto",
      "qcTool": "PARETO",
      "version": "1.1",
      "parentType": "iqs_native",
      "subType": "pareto",
      "displayName": "IQS 关键性分析/排列图",
      "intents": [
        "排列图",
        "帕累托图",
        "pareto chart",
        "二八定律",
        "80/20",
        "ABC分析",
        "关键少数"
      ],
      "expertise": [
        "二八定律 (Pareto)",
        "关键因素识别",
        "ABC 分类法"
      ],
      "colorSlots": [
        "Title",
        "Bar",
        "Line",
        "MarkLine"
      ],
      "renderEngine": "echarts",
      "inferenceKey": "pareto",
      "migrated": true
    },
    "soul": {
      "title": "ABC 分类法 (Pareto Principle)",
      "summary": "把质量问题的频数降序排列并叠加累计百分比，用 80% 线切出「关键少数」。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "ABC 分类法 (Pareto Principle)"
        },
        {
          "kind": "p",
          "text": "排列图基于「二八定律」，用于从众多质量问题中找出影响质量的「关键少数」。柱为各因素频数（降序），线为累计百分比。"
        },
        {
          "kind": "ul",
          "items": [
            "**A 类因素 (0–80%)**：主要影响因素，必须重点解决。",
            "**B 类因素 (80–90%)**：次要影响因素。",
            "**C 类因素 (90–100%)**：一般影响因素。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "引擎内置算法"
        },
        {
          "kind": "ul",
          "items": [
            "**自动降序**：Value[i] ≥ Value[i+1] —— 无需用户自行排序。",
            "**累计百分比**：P[i] = (Σ V[0…i]) / Σ V[all]。",
            "**80% 标识线**：自动定位 P[i] ≈ 80% 的临界坐标并绘制标线。"
          ]
        },
        {
          "kind": "callout",
          "type": "TIP",
          "text": "解决排列图中最左侧的两三个因素，通常就能消除 80% 的质量成本 —— 这正是排列图的决策价值。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表主标题",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 售后数据分析",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "Decimals:",
        "meaning": "数值 / 百分比显示精度（小数位）",
        "values": [],
        "argShape": "<整数>",
        "example": "Decimals: 2",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ShowValues:",
        "meaning": "是否显示柱顶数据标记",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowValues: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[Title | Bar | Line | MarkLine]",
        "meaning": "#HEX 颜色：标题 / 柱形（默认 #0D5E42）/ 累计折线（默认 #F1C40F）/ 80% 标线（默认 #E74C3C）",
        "values": [],
        "argShape": "",
        "example": "Color[Bar]: #0D5E42",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Font[Title | Base | Bar | Line]",
        "meaning": "px 字号：标题 / 正文 / 柱标签 / 折线标签",
        "values": [],
        "argShape": "",
        "example": "Font[Bar]: 12",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "数据行:",
        "meaning": "一个质量因素及其频数（或成本）——本 kind 唯一的数据录入方式",
        "values": [],
        "argShape": "- <项目名称>: <频数>",
        "example": "- 物流破损: 420",
        "status": "supported",
        "required": true,
        "notes": "① 频数须为正数（计数或金额均可，但**同一张图内单位必须统一**）；② **不需要用户自行降序** —— 引擎自动降序；③ 项目名称内如需冒号请用全角「：」。"
      }
    ],
    "example": {
      "title": "售后质量问题分布分析",
      "dsl": "Title: 售后质量问题分布分析\nColor[Title]: #1A2428\nColor[Bar]: #0D5E42\nColor[Line]: #F1C40F\nColor[MarkLine]: #E74C3C\nDecimals: 1\nShowValues: true\nFont[Title]: 20\nFont[Base]: 12\nFont[Bar]: 12\nFont[Line]: 12\n\n// 数据项：<项目名称>: <频数或成本>\n- 物流破损: 420\n- 零件缺失: 215\n- 包装老化: 89\n- 标签错误: 56\n- 其他细项: 23\n",
      "notes": "5 个项目，频数已按降序书写（引擎仍会自动校验排序）；MarkLine 为 80% 累计标线。"
    },
    "counterexamples": [
      {
        "bad": "- 物流破损: 420 元\n- 零件缺失: 215 次",
        "good": "- 物流破损: 420\n- 零件缺失: 215",
        "reason": "频数须为纯数值；同一张图的单位必须统一（都是次数或都是金额），单位写进 `Title:`。"
      },
      {
        "bad": "- 物流破损: 0\n- 零件缺失: 215",
        "good": "（删除该零频项）",
        "reason": "零或负频数会破坏累计百分比的分母意义。"
      },
      {
        "bad": "- 物流破损: 420\n- 其他: 383   （用「其他」混入大量分散小项）",
        "good": "把「其他」拆到确实次要的粒度，或如实保留但不过度解读其排序",
        "reason": "「其他」项会因归类方式而人为抬高排序，解读 A 类时应予以说明。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "数据用 `- <项目名称>: <频数>` 逐行录入，频数为纯正数且**单位统一**。",
      "不要自行排序 —— 引擎自动降序；不要手工计算累计百分比。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "把用户给的问题清单整理成「项目 + 频数」的成对数据；频数为空的项直接省略。",
      "单位必须在整张图内统一（次数 / 金额 / 工时选其一），并在 `Title:` 里点明。",
      "项目数建议 5–10 个；过少（<4）体现不出 80/20，过多（>15）时先归并长尾。",
      "不要臆造频数 —— 用户只给排序时，如实说明无法生成排列图并请其补充数值。"
    ]
  },
  "pdpc": {
    "meta": {
      "id": "pdpc",
      "tier": "core",
      "family": "iqs_native",
      "body": "ProcessGraph",
      "mcpName": "render_pdpc",
      "qcTool": "PDPC",
      "version": "1.1",
      "parentType": "iqs_native",
      "subType": "pdpc",
      "displayName": "IQS 风险预研/PDPC图",
      "intents": [
        "PDPC",
        "过程决策",
        "风险对策",
        "应急预案",
        "风险预演"
      ],
      "expertise": [
        "过程决策程序图 (PDPC)",
        "风险防范",
        "应急预案预演"
      ],
      "colorSlots": [
        "Start",
        "StartText",
        "Step",
        "StepText",
        "Countermeasure",
        "CountermeasureText",
        "End",
        "EndText",
        "Line"
      ],
      "renderEngine": "g6",
      "inferenceKey": "pdpc",
      "migrated": true
    },
    "soul": {
      "title": "过程决策程序图 (Process Decision Program Chart)",
      "summary": "在制定计划阶段就预先设计好各环节的失败对策，把「出事再说」变成「事前演练」。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "过程决策程序图 (Process Decision Program Chart)"
        },
        {
          "kind": "p",
          "text": "PDPC 法是在制定计划阶段，对预期可能出现的问题预先设计好各种对策的方法。它把每条「正常路径」与「异常路径」都画出来，从而在纸面上完成风险演练。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "核心逻辑"
        },
        {
          "kind": "ul",
          "items": [
            "**目标设定**：明确计划的起点与理想终点。",
            "**路径推演**：识别所需的各个步骤 (Step)。",
            "**风险识别**：预测可能导致中断的异常情况，用 `[NG]` 标记。",
            "**对策制定**：针对每个 `NG` 预设补救措施 (Countermeasure)，并连回主线。"
          ]
        },
        {
          "kind": "callout",
          "type": "IMPORTANT",
          "text": "PDPC 的价值在于「思维的深度」而非图的厚度。重点标注那些**可能导致毁灭性失败**的关键环节，并为其配置 `[NG]` 与对策。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表标题",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 应急预案",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "Layout:",
        "meaning": "布局方向",
        "values": [
          "Directional",
          "Standard"
        ],
        "argShape": "",
        "example": "Layout: Directional",
        "status": "supported",
        "required": false,
        "notes": "注意是**全称**（`Directional` / `Standard`），与 flow 的 `H` / `V` 写法不同。"
      },
      {
        "name": "Color[Start | Step | Countermeasure | End | Line]",
        "meaning": "#HEX 颜色：起点 / 步骤 / 对策 / 终点 / 连线",
        "values": [],
        "argShape": "",
        "example": "Color[Countermeasure]: #ECFDF5",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[StartText | StepText | CountermeasureText | EndText]",
        "meaning": "#HEX 各类型节点的**文字**颜色",
        "values": [],
        "argShape": "",
        "example": "Color[StepText]: #1D4ED8",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Line[Width]",
        "meaning": "连线像素粗细",
        "values": [],
        "argShape": "",
        "example": "Line[Width]: 2",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Group:",
        "meaning": "分组（阶段）定义",
        "values": [],
        "argShape": "<ID>, <标签>[, <父组ID>]",
        "example": "Group: g1, 异常发现",
        "status": "supported",
        "required": false,
        "notes": "与 `EndGroup` 成对；组内 `Item:` 建议缩进两格（仅视觉，不参与解析）。"
      },
      {
        "name": "EndGroup:",
        "meaning": "分组结束",
        "values": [],
        "argShape": "EndGroup",
        "example": "EndGroup",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Item:",
        "meaning": "数据项（步骤/对策/起终点）",
        "values": [],
        "argShape": "<ID>, <标签>[, [<类型>]]",
        "example": "Item: n5, 灭火系统失效, [countermeasure]",
        "status": "supported",
        "required": true,
        "notes": "① 类型取值 `start` / `step`（缺省）/ `countermeasure` / `end`，写在**方括号**内；② ⚠️ 与**亲和图**的 `Item:` 同名异义 —— 亲和图的第三参是 `ParentID`（树父节点），此处是节点类型；③ 贴在组外也可以（如全局终点）。"
      },
      {
        "name": "逻辑链条:",
        "meaning": "用 `--` 连接两个节点 ID",
        "values": [],
        "argShape": "<id1>--<id2> [OK|NG]",
        "example": "n4--n5 [NG]",
        "status": "supported",
        "required": true,
        "notes": "三种形态：① 普通 `a--b`；② 带标记 `a--b [OK]` 或 `a--b [NG]`；③ **链式直写** `a--b--c--d [OK]`（一次声明整条链，标记作用于全链）。`[NG]` 表示该环节出现异常，应连向对策节点；`[OK]` 表示顺利通过。"
      }
    ],
    "example": {
      "title": "实验室火灾应急 PDPC 演练",
      "dsl": "Title: 实验室火灾应急 PDPC 演练\nLayout: Directional\n\nColor[Start]: #DBEAFE\nColor[Step]: #EFF6FF\nColor[Countermeasure]: #ECFDF5\nColor[End]: #FEF2F2\nColor[StartText]: #1E40AF\nColor[StepText]: #1D4ED8\nColor[CountermeasureText]: #047857\nColor[EndText]: #B91C1C\nColor[Line]: #64748B\nLine[Width]: 2\n\n// 阶段 1：发现\nGroup: g1, 异常发现\n  Item: n1, 烟雾报警器触发, [start]\n  Item: n2, 确认火情真实性\nEndGroup\n\n// 阶段 2：处置\nGroup: g2, 应急处置\n  Item: n3, 拨打 119 报警\n  Item: n4, 启动自动灭火系统\n  Item: n5, 灭火系统失效, [countermeasure]\n  Item: n6, 使用手持灭火器补救, [countermeasure]\nEndGroup\n\n// 阶段 3：疏散\nGroup: g3, 人员疏散\n  Item: n7, 全员依序撤离\n  Item: n8, 清点人数, [end]\nEndGroup\n\n// 逻辑链条：id1--id2 [OK|NG]\nn1--n2\nn2--n3 [OK]\nn2--n4 [OK]\nn4--n7 [OK]\nn4--n5 [NG]\nn5--n6\nn6--n7 [OK]\nn7--n8\n",
      "notes": "3 个阶段组，8 个节点；`n4--n5 [NG]` 引出「灭火系统失效」对策链后回到主线。"
    },
    "counterexamples": [
      {
        "bad": "Group: g1, 异常发现\n  Item: n1, 烟雾报警器触发, start",
        "good": "Group: g1, 异常发现\n  Item: n1, 烟雾报警器触发, [start]",
        "reason": "节点类型**必须写在方括号内**（`[start]`）；裸写 `start` 会被当作标签的一部分。"
      },
      {
        "bad": "Group: g1, 异常发现\n  Item: n1, 报警\n  （缺 EndGroup）",
        "good": "Group: g1, 异常发现\n  Item: n1, 报警\nEndGroup",
        "reason": "每个 `Group:` 都必须由 `EndGroup` 闭合，否则后续 `Item:` 的归属不确定。"
      },
      {
        "bad": "Item: g1, 异常发现, root   （把 Group 写成 Item 并用 parentId 关联）",
        "good": "Group: g1, 异常发现\n  Item: n1, 报警, [start]",
        "reason": "PDPC 用 `Group:` / `EndGroup` 表达阶段；`Item:` 的第三参是**节点类型**（方括号），不是父节点 ID（那是亲和图）。"
      },
      {
        "bad": "a--b [NG]   （但 b 是普通 step，无对策承接）",
        "good": "a--b [NG]\nb--c [OK]      （c 为 countermeasure）",
        "reason": "`[NG]` 必须引出对策或明确的异常处置路径，否则只标记了风险而没给答案。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "分组用 `Group:` … `EndGroup` 成对；节点用 `Item: <ID>, <标签>[, [<类型>]]`，类型在方括号内。",
      "连线用 `--`：`a--b` / `a--b [OK]` / `a--b [NG]` / 链式 `a--b--c`。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先画主线（起点 → 各步骤 → 终点），再把每条主线上「可能失败」的环节用 `[NG]` 引出对策支线，最后让对策连回主线。",
      "`[NG]` 只标**真正会中断流程**的风险，不要把每个步骤都标异常（否则失去重点）。",
      "对策节点用 `[countermeasure]` 类型；每个 `[NG]` 至少配 1 个对策。",
      "组（阶段）控制在 2–5 个；每组 2–6 个节点。"
    ]
  },
  "radar": {
    "meta": {
      "id": "radar",
      "tier": "core",
      "family": "iqs_native",
      "body": "AxisSeries",
      "mcpName": "render_radar",
      "qcTool": "RADAR",
      "version": "1.1",
      "parentType": "iqs_native",
      "subType": "radar",
      "displayName": "IQS 多维评价/雷达图",
      "intents": [
        "雷达图",
        "多维对比",
        "radar",
        "综合评分",
        "蜘蛛图",
        "能力评估"
      ],
      "expertise": [
        "多维对比",
        "综合评分",
        "效果检查"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "radar",
      "migrated": true
    },
    "soul": {
      "title": "雷达图综合评价",
      "summary": "把多维度得分画成多边形：尖角暴露短板，面积与圆润度反映均衡与综合实力。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "雷达图综合评价"
        },
        {
          "kind": "p",
          "text": "雷达图把对象在多个维度上的得分画成闭合多边形。**尖角**暴露短板，**面积大且圆润**表示均衡且综合实力强。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "三个分析算子"
        },
        {
          "kind": "ul",
          "items": [
            "**Standardize（标准化）**：消除量纲后比较形态。当各轴量纲不一致（一个是百分比、一个是金额）时必须开启。",
            "**ShowAreaScore（面积得分）**：多边形面积反映综合实力，比平均分更能体现「短板效应」。",
            "**ShowSimilarity（相似度）**：计算各系列与**首个系列**的形态相似度，用于对标。"
          ]
        },
        {
          "kind": "callout",
          "type": "TIP",
          "text": "看雷达图先看**形状**再看面积：极度不规则说明资源分配失衡，可能存在局部优势掩盖系统性缺陷。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表标题",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 产品竞品对比分析",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "Standardize:",
        "meaning": "按各轴最大值归一后比较（**量纲不一致时必须开启**）",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "Standardize: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ShowAreaScore:",
        "meaning": "显示多边形面积综合得分",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowAreaScore: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ShowSimilarity:",
        "meaning": "显示各系列与**首个系列**的形态相似度",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowSimilarity: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ShowValues:",
        "meaning": "在数据点旁显示原始数值",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowValues: false",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "StartAngle:",
        "meaning": "首个轴的起始角度（`-90` = 12 点钟方向）",
        "values": [],
        "argShape": "<角度>",
        "example": "StartAngle: -90",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Clockwise:",
        "meaning": "轴排列方向是否为顺时针",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "Clockwise: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Closed:",
        "meaning": "网格样式：`true` 多边形，`false` 圆形",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "Closed: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Axis:",
        "meaning": "定义一条维度轴",
        "values": [],
        "argShape": "<名称>, <最大值>[, <最小值>]",
        "example": "Axis: 质量, 100, 0",
        "status": "supported",
        "required": true,
        "notes": "最小值可省略（默认 0）。轴的**声明顺序**即雷达图的轴顺序。"
      },
      {
        "name": "Series:",
        "meaning": "定义一个对比系列",
        "values": [],
        "argShape": "<名称>, [<值列表>][, <颜色>[, <透明度>]]",
        "example": "Series: 方案A, [85, 70, 90, 80, 75], #0D5E42, 0.4",
        "status": "supported",
        "required": true,
        "notes": "① 值列表元素个数必须**等于轴数量**，且与轴顺序一一对应；② 颜色可省略（用内置色板）或写 `null`；③ 透明度取 0–1，多系列重叠时建议 ≤ 0.4。"
      }
    ],
    "example": {
      "title": "方案多维效果对比",
      "dsl": "Title: 方案多维效果对比\nStandardize: true\nShowAreaScore: true\nShowSimilarity: true\nShowValues: false\nStartAngle: -90\nClockwise: true\nClosed: true\n\n// 轴定义：Axis: <名称>, <最大值>[, <最小值>]\nAxis: 质量, 100, 0\nAxis: 成本, 100, 0\nAxis: 交期, 100, 0\nAxis: 安全, 100, 0\nAxis: 可维护性, 100, 0\n\n// 系列：Series: <名称>, [<值列表>][, <颜色>[, <透明度>]]\nSeries: 方案A, [85, 70, 90, 80, 75], #0D5E42, 0.4\nSeries: 方案B, [70, 85, 75, 88, 80], #E74C3C, 0.3\n",
      "notes": "5 条轴 × 2 个系列；开启标准化、面积得分与相似度。"
    },
    "counterexamples": [
      {
        "bad": "Axis: 质量, 100\nAxis: 成本, 100\nSeries: 方案A, [85]",
        "good": "Axis: 质量, 100\nAxis: 成本, 100\nSeries: 方案A, [85, 70]",
        "reason": "每个系列的值个数必须**等于轴数量**，否则无法闭合多边形。"
      },
      {
        "bad": "Standardize: true   （但所有轴量纲相同，都是评分）",
        "good": "Standardize: false（同量纲时无需归一）",
        "reason": "同量纲时归一反而会扭曲真实差距；标准化应当只在量纲不一致时开启。"
      },
      {
        "bad": "Axis: 年化回报(%), 25\nAxis: 夏普比率, 3.0\nSeries: A, [12, 1.8]   （未开 Standardize）",
        "good": "同上，但加 `Standardize: true`",
        "reason": "各轴量纲差异巨大（% 与比率）却不归一，小量纲的轴会被压成一条直线，看不出形态。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "先写全部 `Axis:`，再写 `Series:`；每个系列的值个数须等于轴数量。",
      "轴量纲不一致时**必须**开启 `Standardize: true`。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先确定评价维度（4–8 条轴），再为每个对象生成一组等长的得分。",
      "各轴量纲不一致时开 `Standardize: true`；全部同量纲（如都是 0–100 评分）时不要开。",
      "系列数控制在 2–4 个（超过 4 个多边形会互相遮挡）；重叠时把透明度降到 0.3 以下。",
      "不要臆造得分 —— 用户未给维度的就少画几条轴，不要为了「好看」补满。"
    ]
  },
  "relation": {
    "meta": {
      "id": "relation",
      "tier": "core",
      "family": "iqs_native",
      "body": "Graph",
      "mcpName": "render_relation",
      "qcTool": "RELATION",
      "version": "1.1",
      "parentType": "iqs_native",
      "subType": "relation",
      "displayName": "IQS 交叉分析/关联图",
      "intents": [
        "关联图",
        "交叉因果",
        "relationship diagram",
        "网状因果",
        "多症结"
      ],
      "expertise": [
        "复杂矛盾关联",
        "出入度分析",
        "根源寻找"
      ],
      "colorSlots": [
        "Root",
        "RootText",
        "Middle",
        "MiddleText",
        "End",
        "EndText",
        "Line"
      ],
      "renderEngine": "g6",
      "inferenceKey": "relation",
      "migrated": true
    },
    "soul": {
      "title": "关联图 (Relationship Diagram)",
      "summary": "用箭头连接交织的因素，以出入度识别「谁能被解决」与「什么在拖后腿」。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "关联图 (Relationship Diagram)"
        },
        {
          "kind": "p",
          "text": "关联图把问题及其各种因素之间的复杂因果关系用箭头连成网状。适用于因素交织、互为因果的场景 —— 这正是鱼骨图的层级结构无法表达的部分。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "核心推演逻辑"
        },
        {
          "kind": "ul",
          "items": [
            "**多症结支持**：识别系统中并列或递进的多个问题症结 (Sink)，它们作为最终的**结果点**呈现在图中。",
            "**禁止自引用**：严禁 `Rel: A -> A`。",
            "**交叉网状**：鼓励跨分支连接 —— 因素间的交叉影响正是关联图相对鱼骨图的价值所在。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "角色识别（由引擎按出入度自动推断，无需显式标注）"
        },
        {
          "kind": "ul",
          "items": [
            "**主要症结 (Root/Sink)**：只有入边、没有出边 → 渲染为**矩形**。",
            "**末端根因 (End/Source)**：只有出边、没有入边 → 渲染为**椭圆**。",
            "**中间因素 (Middle)**：既有入边也有出边 → 渲染为**椭圆**。"
          ]
        },
        {
          "kind": "callout",
          "type": "IMPORTANT",
          "text": "**出入度分析**：入度极高 = 核心矛盾的汇聚点；出度极高 = 问题的根源所在。先解决高**出度**的末端根因，通常能同时松动多个症结。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表主标题",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 2024年三季度质量波动分析",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "Layout:",
        "meaning": "布局模式",
        "values": [
          "Directional",
          "Centralized",
          "Free"
        ],
        "argShape": "",
        "example": "Layout: Free",
        "status": "supported",
        "required": false,
        "notes": "`Directional` = 有向分层（因果方向感最强）；`Centralized` = 中心辐射（围绕单一核心症结）；`Free` = 自由力导向（因素多、交叉多时最易读）。注意是**全称**，与 flow 的 `H`/`V` 不同。"
      },
      {
        "name": "Color[Root | RootText | Middle | MiddleText | End | EndText | Line]",
        "meaning": "#HEX 颜色：症结底 / 症结字 / 中间因素底 / 中间因素字 / 末端根因底 / 末端根因字 / 连线",
        "values": [],
        "argShape": "",
        "example": "Color[Root]: #CF3A2B",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Node:",
        "meaning": "节点定义（ID, 标签）",
        "values": [],
        "argShape": "<ID>, <标签>",
        "example": "Node: m1, 需求频繁变更",
        "status": "supported",
        "required": true,
        "notes": "**节点类型不需显式标注** —— 引擎按拓扑（出入度）自动推断 Root / Middle / End 并赋予对应形状与颜色。标签内如需冒号请用全角「：」。"
      },
      {
        "name": "Rel:",
        "meaning": "关系（有向边）定义",
        "values": [],
        "argShape": "<源ID> -> <目标ID>",
        "example": "Rel: m1 -> root1",
        "status": "supported",
        "required": true,
        "notes": "① 箭头为**半角** `->`（与 flow 的全角 `→` 不同）；② 两端 ID **必须**已由 `Node:` 定义，否则产生悬空边；③ 源与目标不得相同；④ 同一对节点可有多条不同方向的边（互为因果），但不鼓励。"
      }
    ],
    "example": {
      "title": "多症结系统问题关联分析",
      "dsl": "Title: 多症结系统问题关联分析\nLayout: Free\n\nColor[Root]: #CF3A2B\nColor[RootText]: #ffffff\nColor[Middle]: #F1C40F\nColor[MiddleText]: #ffffff\nColor[End]: #fbbf24\nColor[EndText]: #92400e\nColor[Line]: #a1a1aa\n\n// 节点定义（ID, 标签）——所有被 Rel 引用的 ID 都必须在此定义\nNode: root1, 症结A：项目交付延期\nNode: root2, 症结B：团队士气低落\nNode: root3, 症结C：客户投诉增加\nNode: m1, 需求频繁变更\nNode: m2, 跨部门沟通不畅\nNode: m3, 核心人员流失\nNode: m4, 技术债务累积\nNode: m5, 质量监控缺失\nNode: e1, 客户决策链过长\nNode: e2, 缺乏统一协作平台\nNode: e3, 薪酬竞争力不足\nNode: e4, 代码评审流程形同虚设\nNode: e5, 自动化测试覆盖率低\nNode: e6, 市场竞品压力传导\nNode: e7, 历史遗留系统架构\nNode: e8, 培训体系不完善\n\n// 关系定义：源 -> 目标（类型由引擎按拓扑自动推断）\nRel: m1 -> root1\nRel: m2 -> root1\nRel: m4 -> root1\nRel: m3 -> root2\nRel: m2 -> root2\nRel: m5 -> root3\nRel: m1 -> root3\nRel: root1 -> root2\nRel: root1 -> root3\nRel: e1 -> m1\nRel: e6 -> m1\nRel: e2 -> m2\nRel: e8 -> m2\nRel: e3 -> m3\nRel: e7 -> m4\nRel: e4 -> m5\nRel: e5 -> m5\nRel: e8 -> m3\n",
      "notes": "16 个节点 / 18 条关系；3 个症结（root1–3）、5 个中间因素、8 个末端根因。"
    },
    "counterexamples": [
      {
        "bad": "Rel: m1 -> root\n（而未定义 Node: root）",
        "good": "Node: root1, 症结A：交付延期\nRel: m1 -> root1",
        "reason": "`Rel:` 引用的 ID 必须先由 `Node:` 定义。**注意**：`protocol/segments/relation.md` 旧示例恰好犯了这个错误（引用未定义的 `root`，产生悬空边）—— 本卡的真源示例已修正。"
      },
      {
        "bad": "Rel: m1 -> m1",
        "good": "（删除该自环，或改为两个不同节点）",
        "reason": "禁止自引用；自环不表达任何因果关系。"
      },
      {
        "bad": "Node: root1, 症结A   （并期望它渲染成矩形）",
        "good": "让 root1 只有入边、没有出边 —— 引擎会自动把它识别为 Sink 并渲染为矩形",
        "reason": "节点角色由**拓扑**决定，不能通过命名或声明指定；若 root1 也有出边，它会被判为 Middle（椭圆）。"
      },
      {
        "bad": "Rel: a -> b   （全角箭头 →）",
        "good": "Rel: a -> b   （半角 ->）",
        "reason": "relation 的箭头是半角 `->`；全角 `→` 是 flow 的显式边写法。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "先 `Node:` 定义全部节点，再 `Rel: <源> -> <目标>` 声明关系；箭头为**半角** `->`。",
      "不要标注节点类型 —— 引擎按出入度自动推断 Root / Middle / End。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先找「结果」（用户最关心的 1–3 个问题）作为症结，再向下追原因，形成从原因指向结果的箭头。",
      "识别并产出**多条**并列症结 —— 这是关联图区别于鱼骨图的关键（鱼骨图只有一个问题）。",
      "鼓励跨分支连接：若某原因同时影响多个症结，就画多条箭头（这正是「关联」的意义）。",
      "节点数控制在 8–25 个；每个 Rel 的两端都必须已在 `Node:` 中出现。",
      "不要制造自环，也不要为了连线美观添加无因果依据的边。"
    ]
  },
  "scatter": {
    "meta": {
      "id": "scatter",
      "tier": "core",
      "family": "iqs_native",
      "body": "TupleList",
      "mcpName": "render_scatter",
      "qcTool": "SCATTER",
      "version": "1.1",
      "parentType": "iqs_native",
      "subType": "scatter",
      "displayName": "IQS 相关分析/散点图",
      "intents": [
        "散点图",
        "相关分析",
        "回归",
        "scatter",
        "相关性",
        "X-Y确认"
      ],
      "expertise": [
        "相关分析",
        "回归分析",
        "原因确认"
      ],
      "colorSlots": [
        "Point",
        "Trend"
      ],
      "renderEngine": "echarts",
      "inferenceKey": "scatter",
      "migrated": true
    },
    "soul": {
      "title": "相关与回归",
      "summary": "验证 X 与 Y 是否存在相关关系，并用最小二乘趋势线量化其方向与强度。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "相关与回归"
        },
        {
          "kind": "p",
          "text": "散点图用于验证 X 与 Y 是否存在线性/非线性相关，是「确认原因」阶段的核心工具。"
        },
        {
          "kind": "ul",
          "items": [
            "**相关 ≠ 因果**：观察到相关后仍需排除第三变量，或在专业上给出机理解释。",
            "**离群点优先追查**：偏离主群的少数点往往对应特殊原因（特定机台、班次、批次）。",
            "**趋势线**：开启 `ShowTrend` 后由引擎做最小二乘拟合。",
            "**分组对比**：若疑似存在两个总体（如两台设备），它们会在图上呈现为两团 —— 这是最有价值的信息。"
          ]
        },
        {
          "kind": "callout",
          "type": "TIP",
          "text": "点太少（< 20）时不要解读趋势线的斜率，容易过拟合；样本点越密集，趋势线越可信。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表标题",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 注塑工艺参数相关分析",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "XAxis:",
        "meaning": "X 轴标签（**含单位**，如 `模具温度(℃)`）",
        "values": [],
        "argShape": "<文本>",
        "example": "XAxis: 模具温度(℃)",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "YAxis:",
        "meaning": "Y 轴标签（含单位）",
        "values": [],
        "argShape": "<文本>",
        "example": "YAxis: 注射压力(MPa)",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ZAxis:",
        "meaning": "Z 轴标签（仅在三维模式 / 气泡图时有意义）",
        "values": [],
        "argShape": "<文本>",
        "example": "ZAxis: 收缩率%",
        "status": "supported",
        "required": false,
        "notes": "二维模式下数据行的第三个数仅作气泡尺寸，不产生 Z 轴。"
      },
      {
        "name": "ShowTrend:",
        "meaning": "显示最小二乘趋势线",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowTrend: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Show3D:",
        "meaning": "启用三维散点视图（兼容别名 `3D` 效果相同）",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "Show3D: false",
        "status": "supported",
        "required": false,
        "notes": "开启后数据行需带第三个数（Z 值）。"
      },
      {
        "name": "ShowValues:",
        "meaning": "在点旁显示数值标签",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowValues: false",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Color[Point | Trend]",
        "meaning": "#HEX 颜色：数据点 / 趋势线",
        "values": [],
        "argShape": "",
        "example": "Color[Point]: #0D5E42",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Size[Base]",
        "meaning": "数据点基准像素大小（气泡模式下作为尺寸下限）",
        "values": [],
        "argShape": "<数值>",
        "example": "Size[Base]: 8",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Opacity:",
        "meaning": "数据点透明度（点密集时降低可缓解叠色）",
        "values": [],
        "argShape": "0–1 之间的数值",
        "example": "Opacity: 0.6",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "数据行:",
        "meaning": "一个观测点 —— 本 kind 唯一的数据录入方式",
        "values": [],
        "argShape": "- <X>, <Y>[, <Z>]",
        "example": "- 195.5, 85.2, 2.4",
        "status": "supported",
        "required": true,
        "notes": "用**半角逗号**分隔；同一张图内所有行的字段数必须一致（要么都 2 个、要么都 3 个）。"
      }
    ],
    "example": {
      "title": "注塑工艺参数相关分析",
      "dsl": "Title: 注塑工艺参数相关分析\nXAxis: 模具温度(℃)\nYAxis: 注射压力(MPa)\nZAxis: 收缩率%\nColor[Point]: #0D5E42\nColor[Trend]: #F1C40F\nShowTrend: true\nShow3D: false\nShowValues: false\n\n// 数据点：- <X>, <Y> [, <Z>]\n- 195.5, 85.2, 2.4\n- 192.0, 82.5, 2.5\n- 198.5, 88.0, 2.2\n- 215.0, 105.0, 0.6\n- 218.5, 108.2, 0.55\n- 212.0, 102.5, 0.7\n",
      "notes": "6 个三变量观测点；温度—压力呈正相关，但收缩率在高温高压组骤降（可据此发现工艺窗口）。"
    },
    "counterexamples": [
      {
        "bad": "- 195.5, 85.2\n- 192.0, 82.5, 2.5",
        "good": "- 195.5, 85.2, 2.4\n- 192.0, 82.5, 2.5",
        "reason": "同一张图内每行的字段数必须一致；混用二维与三维会让部分点无法定位。"
      },
      {
        "bad": "Show3D: true\n- 195.5, 85.2",
        "good": "Show3D: true\n- 195.5, 85.2, 2.4",
        "reason": "开启三维后每行都需要第三个数值（Z）。"
      },
      {
        "bad": "XAxis: 模具温度   （无单位）",
        "good": "XAxis: 模具温度(℃)",
        "reason": "轴标签应带单位，否则趋势线的斜率无法解读。"
      },
      {
        "bad": "（只有 6 个点）ShowTrend: true 并据此断言强相关",
        "good": "样本量 ≥ 20 再解读趋势线与相关性",
        "reason": "极少样本下趋势线极不稳定，容易得出误导性结论。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "数据用 `- <X>, <Y>[, <Z>]` 逐行录入；**半角逗号**分隔，字段数全图一致。",
      "轴标签请带单位（如 `模具温度(℃)`）。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "能映射标准 QC 工具时**必须**用 CORE；仅当类型表外才考虑 RELIEF（Mermaid / VChart）。",
      "存在 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿。"
    ],
    "promptNotes": [
      "先确认分析目标：是「验证 X 影响 Y」还是「看数据是否存在分组」；前者开 `ShowTrend`，后者强调点的分布。",
      "把用户给的成对（或三元）数据整理成 `- x, y[, z]` 行；字段数保持一致。",
      "轴标签务必带单位 —— 散点图的解读高度依赖量纲。",
      "样本量 < 20 时不要解读相关性强度；点很多（> 200）时把 `Opacity` 降到 0.5 以下避免叠色成块。",
      "不要臆造数据点；也不要对明显非线性的数据强行用线性趋势线下结论。"
    ]
  },
  "mermaid": {
    "meta": {
      "id": "mermaid_master",
      "tier": "relief",
      "family": "mermaid",
      "body": "Foreign",
      "mcpName": "render_mermaid_master",
      "qcTool": "MERMAID",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "master",
      "displayName": "Mermaid 渲染引擎总纲",
      "intents": [
        "Mermaid",
        "救济层",
        "类型外制图",
        "文本建模",
        "流程/时序/结构"
      ],
      "expertise": [
        "Mermaid 文本建模",
        "类型外制图",
        "语法纠偏"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "migrated": true
    },
    "soul": {
      "title": "Mermaid 引擎（RELIEF 救济层）",
      "summary": "基于文本的通用建模工具；**仅用于 CORE 类型表以外的图**，不得替代 QC 统计终稿。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "救济层定位（最重要的前提）"
        },
        {
          "kind": "p",
          "text": "Mermaid 覆盖「逻辑流转 / 时序交互 / 结构建模 / 计划追踪 / 多维认知」五类。它**只能用于标准 QC 工具无法表达的场景** —— 凡是能映射到 CORE（控制图、排列图、直方图、鱼骨图、关联图、矢线图、矩阵图、PDPC、亲和图、基础统计图、散点图、雷达图、图矩阵、流程图）的，**必须**用 CORE。"
        },
        {
          "kind": "callout",
          "type": "IMPORTANT",
          "text": "体系文件 / 部门泳道 / BPMN 子集终稿**必须**用 `render_flow`（IQS-Flow DSL），禁止用 Mermaid 的 `flowchart` / `graph` 冒充。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "五类用途"
        },
        {
          "kind": "ul",
          "items": [
            "**逻辑流转类**：业务流转、决策树、闭环逻辑（flowchart、stateDiagram-v2）。",
            "**时序交互类**：组件协作、调用链、消息传递（sequenceDiagram）。",
            "**结构建模类**：系统架构、数据模型、组织关系（erDiagram、classDiagram、architecture、block-beta）。",
            "**计划与追踪类**：时间维度、进度管理、任务分配（gantt、kanban、timeline）。",
            "**多维认知类**：发散思维、体验感知、比例展示（mindmap、journey、pie、quadrantChart、xychart-beta、packet-beta、requirementDiagram、sankey-beta、gitGraph）。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "公共输出规则（全 sub_type 适用）"
        },
        {
          "kind": "ul",
          "items": [
            "**纯净 DSL**：直接输出 Mermaid 原生指令，**不要** `Spec:` 外壳，**不要**包在 `{}` 里，**不要** Markdown 围栏。",
            "**符号冲突防御**：中文描述里必须用**中文全角标点**（，、；：）。**禁止**在未加引号的文本中出现的半角逗号 `,` 或分号 `;` —— 它们会被解析器当作语法分隔符。",
            "**复杂内容包裹**：含空格、特殊符号或多行的节点文字，必须用 `[\"内容\"]`（矩形）、`(\"内容\")`（圆角）等显式包裹。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "初始化指令:",
        "meaning": "渲染前的主题/外观配置（可选，置于首行）",
        "values": [],
        "argShape": "%%{init: {…}}%%",
        "example": "%%{init: {\"theme\": \"neutral\", \"look\": \"handDrawn\"}}%%",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "图类型声明:",
        "meaning": "每个 sub_type 的第一行关键字",
        "values": [
          "graph",
          "flowchart",
          "sequenceDiagram",
          "classDiagram",
          "stateDiagram-v2",
          "erDiagram",
          "journey",
          "gantt",
          "pie",
          "quadrantChart",
          "requirementDiagram",
          "gitGraph",
          "mindmap",
          "timeline",
          "kanban",
          "block-beta",
          "packet-beta",
          "architecture-beta",
          "sankey-beta",
          "xychart-beta"
        ],
        "argShape": "",
        "example": "graph TD",
        "status": "supported",
        "required": true,
        "notes": "完整的 sub_type 列表；每个的细节见同目录的 `<slug>.card.ts`。"
      },
      {
        "name": "节点包裹:",
        "meaning": "含空格 / 特殊符号 / 多行 的节点文字必须显式包裹",
        "values": [],
        "argShape": "A[\"内容\"] / A(\"内容\") / A{\"内容\"}",
        "example": "A[\"提交申请（含附件）\"]",
        "status": "supported",
        "required": false,
        "notes": "矩形 `[]`、圆角 `()`、菱形 `{}`、圆 `(())`。不包裹时含半角标点的文字会被截断。"
      },
      {
        "name": "注释:",
        "meaning": "Mermaid 自身用 `%%` 作行注释",
        "values": [],
        "argShape": "%% <注释>",
        "example": "%% 审批主路径",
        "status": "supported",
        "required": false,
        "notes": "⚠️ 与 IQS-DSL 的 `//` 不同 —— 本族使用 Mermaid 原生注释语法。"
      }
    ],
    "example": {
      "title": "graph TD（逻辑流转类代表）",
      "dsl": "%%{init: {\"theme\": \"neutral\", \"look\": \"handDrawn\"}}%%\ngraph TD\n    A[提交申请] --> B{经理审批}\n    B -- \"通过\" --> C[财务放款]\n    B -- \"驳回\" --> D[退回修改]\n    D --> A\n    C --> E[流程结束]\n",
      "notes": "仅作本族的语法形态示意；具体 sub_type 请读对应卡片。禁止用本 sub_type 冒充体系文件泳道图。"
    },
    "counterexamples": [
      {
        "bad": "（用 flowchart TD 画部门审批泳道图作为体系文件终稿）",
        "good": "Title: 采购申请审批流程\\nLayout: H\\nDict: D[…\\nLane from D[0,1] Layout H\\nW: w1: 提交申请 Type[S] Location(D[0])",
        "reason": "体系文件 / 部门泳道 / BPMN 子集终稿必须用 IQS-Flow（`render_flow`）。"
      },
      {
        "bad": "A[提交申请, 含附件]",
        "good": "A[\"提交申请（含附件）\"]",
        "reason": "未包裹的半角逗号会被当作节点语法分隔符；中文内容请用全角标点并显式包裹。"
      },
      {
        "bad": "Title: xxx\\ngraph TD\\nA --> B",
        "good": "graph TD\\nA --> B",
        "reason": "Mermaid 不使用 `Title:` 外壳 —— 直接输出原生指令。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "直接输出 Mermaid 原生指令：不要 `Spec:` 外壳、不要 `{}` 包裹、不要 Markdown 围栏。",
      "中文文本用全角标点并显式包裹（`[\"…\"]`）；禁止裸的半角逗号与分号。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "先按五类用途定位 sub_type（逻辑流转 / 时序交互 / 结构建模 / 计划追踪 / 多维认知），再读该 sub_type 的卡片。",
      "**先自问：能否用 CORE 表达？** 能则一律改 CORE —— 尤其是流程图（用 flow）、统计图（用 basic/control/pareto/histogram）。",
      "节点文字里的中文标点一律全角，并在含特殊符号时显式包裹。",
      "首行可加 `%%{init: …}%%` 统一主题；不加也能渲染。"
    ]
  },
  "mermaid_architecture": {
    "meta": {
      "id": "architecture",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_architecture",
      "qcTool": "ARCHITECTURE",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "architecture",
      "displayName": "IQS 架构拓扑/Architecture",
      "intents": [
        "架构图",
        "拓扑图",
        "系统架构",
        "architecture"
      ],
      "expertise": [
        "系统架构设计",
        "服务拓扑分析",
        "云原生架构建模"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "architecture",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 结构建模类图表。用于刻画现代云原生或微服务架构的逻辑层级与物理拓扑。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "分类图表注意事项 (Diagram-Specific Precautions)"
        },
        {
          "kind": "ul",
          "items": [
            "**拓扑语法 (Critical)**: 连线方向必须遵循 `源节点:方向 --> 方向:目标节点`（例如 `gateway:R --> L:auth`）。",
            "**命名建议**: Label 建议优先使用英文以确保持续兼容性。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "architecture-beta:",
        "meaning": "定义架构图起始。",
        "values": [],
        "argShape": "",
        "example": "architecture-beta: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "group [ID](图标)[Label]:",
        "meaning": "定义逻辑层级组。",
        "values": [],
        "argShape": "",
        "example": "group [ID](图标)[Label]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "service [ID](图标)[Label]:",
        "meaning": "定义具体服务节点。",
        "values": [],
        "argShape": "",
        "example": "service [ID](图标)[Label]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "architecture-beta",
      "dsl": "architecture-beta\n    group api(cloud)[API Layer]\n    group services(server)[Service Layer]\n    group db(database)[Database Layer]\n\n    service gateway(internet)[API Gateway] in api\n    service auth(server)[Auth Service] in services\n    service user(server)[User Service] in services\n    service mysql(database)[MySQL] in db\n\n    gateway:R --> L:auth\n    gateway:B --> T:user\n    auth:R --> L:mysql\n    user:R --> L:mysql",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 结构建模类图表。用于刻画现代云原生或微服务架构的逻辑层级与物理拓扑。",
      "拓扑语法 (Critical): 连线方向必须遵循 `源节点:方向 --> 方向:目标节点`（例如 `gateway:R --> L:auth`）。",
      "命名建议: Label 建议优先使用英文以确保持续兼容性。"
    ]
  },
  "mermaid_block": {
    "meta": {
      "id": "block-beta",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_block",
      "qcTool": "BLOCK-BETA",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "block-beta",
      "displayName": "IQS 分层块图/Block",
      "intents": [
        "块图",
        "分层组件图",
        "block diagram"
      ],
      "expertise": [
        "层级架构展示",
        "组件化建模",
        "网格化布局分析"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "block-beta",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 结构建模类图表。用于将复杂的系统拆解为可视化的逻辑矩形块（Block）与容器。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "分类图表注意事项 (Diagram-Specific Precautions)"
        },
        {
          "kind": "ul",
          "items": [
            "**引号强制**: 在 `block-beta` 中，**所有中文标签必须用双引号 \"\" 包裹**。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "block-beta:",
        "meaning": "定义块图起始。",
        "values": [],
        "argShape": "",
        "example": "block-beta: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "columns[N]",
        "meaning": "设置每行显示的网格列数。",
        "values": [],
        "argShape": "",
        "example": "columns [N][N]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "block:[ID]:",
        "meaning": "定义容器块。",
        "values": [],
        "argShape": "",
        "example": "block:[ID]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "\"Label\":",
        "meaning": "定义具体内容块。",
        "values": [],
        "argShape": "",
        "example": "\"Label\": <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "block-beta",
      "dsl": "block-beta\n    columns 3\n    \"服务1\" \"服务2\" \"服务3\"\n    block:group1\n        columns 1\n        \"子项A\" \"子项B\"\n    end",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 结构建模类图表。用于将复杂的系统拆解为可视化的逻辑矩形块（Block）与容器。",
      "引号强制: 在 `block-beta` 中，所有中文标签必须用双引号 \"\" 包裹。"
    ]
  },
  "mermaid_class": {
    "meta": {
      "id": "classDiagram",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_class",
      "qcTool": "CLASSDIAGRAM",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "classDiagram",
      "displayName": "IQS 系统结构/类图",
      "intents": [
        "类图",
        "UML类图",
        "系统结构图",
        "class diagram"
      ],
      "expertise": [
        "面向对象设计",
        "系统架构结构",
        "类关系建模"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "classDiagram",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 结构建模类图表。专注于软件工程中的静态结构，表现类、接口及其依赖路径。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "classDiagram:",
        "meaning": "定义类图起始。",
        "values": [],
        "argShape": "",
        "example": "classDiagram: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "%%{init: {\"theme\": \"neutral\"}}%%",
      "dsl": "%%{init: {\"theme\": \"neutral\"}}%%\nclassDiagram\n    class Vehicle {\n        +move()\n    }\n    class Car {\n        -engine: String\n        +drive()\n    }\n    Vehicle <|-- Car",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 结构建模类图表。专注于软件工程中的静态结构，表现类、接口及其依赖路径。"
    ]
  },
  "mermaid_er": {
    "meta": {
      "id": "erDiagram",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_er",
      "qcTool": "ERDIAGRAM",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "erDiagram",
      "displayName": "IQS 数据建模/ER图",
      "intents": [
        "ER图",
        "实体关系图",
        "数据库模型",
        "er diagram"
      ],
      "expertise": [
        "数据库设计",
        "数据模型建模",
        "实体关系分析"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "erDiagram",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 结构建模类图表。用于定义数据实体（Entities）及其相互关联（Relationships）。",
            "**逻辑准则**: 刻画父子、依赖及引用关系。强调基数（Cardinality）的准确性，如 `||--o{` 代表一对多。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "erDiagram:",
        "meaning": "定义 ER 图起始。",
        "values": [],
        "argShape": "",
        "example": "erDiagram: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "||--o{:",
        "meaning": "定义基数关系。",
        "values": [],
        "argShape": "",
        "example": "||--o{: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "||--|{:",
        "meaning": "定义基数关系。",
        "values": [],
        "argShape": "",
        "example": "||--|{: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "}|--|{:",
        "meaning": "定义基数关系。",
        "values": [],
        "argShape": "",
        "example": "}|--|{: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ENTITY { int id }:",
        "meaning": "定义属性列表。",
        "values": [],
        "argShape": "",
        "example": "ENTITY { int id }: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "%%{init: {\"theme\": \"forest\"}}%%",
      "dsl": "%%{init: {\"theme\": \"forest\"}}%%\nerDiagram\n    USER ||--o{ ORDER : \"下单\"\n    ORDER ||--|{ PRODUCT : \"包含\"\n    USER {\n        int id\n        string name\n    }",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 结构建模类图表。用于定义数据实体（Entities）及其相互关联（Relationships）。",
      "逻辑准则: 刻画父子、依赖及引用关系。强调基数（Cardinality）的准确性，如 `||--o{` 代表一对多。"
    ]
  },
  "mermaid_flowchart": {
    "meta": {
      "id": "flowchart",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_flowchart",
      "qcTool": "FLOWCHART",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "flowchart",
      "displayName": "IQS 业务流程/流程图",
      "intents": [
        "流程图",
        "flowchart",
        "业务流",
        "决策图"
      ],
      "expertise": [
        "业务流程建模",
        "逻辑决策树",
        "拓扑闭环分析"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "flowchart",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "1. 纯净 DSL 范式: AI 必须生成纯文本 DSL 指令。严禁将代码块包裹在 JSON 结构中或附加冗余解释。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 逻辑流转类图表。专注于描述业务流转、决策分支及逻辑闭环。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "公共事项及说明 (Common Instructions)"
        },
        {
          "kind": "p",
          "text": "1. **纯净 DSL 范式**: AI 必须生成纯文本 DSL 指令。严禁将代码块包裹在 JSON 结构中或附加冗余解释。"
        },
        {
          "kind": "p",
          "text": "2. **符号冲突防御**: 在中文描述文字中，必须优先使用中文全角标点（如 ，、；、：）。严禁使用半角逗号或分号，防止解析误认。"
        },
        {
          "kind": "p",
          "text": "3. **复杂内容包裹**: 包含特殊符号或多行的节点，必须使用 [\"内容\"]（矩形）、(\"内容\")（圆角）等显式包裹。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "graph:",
        "meaning": "定义流程图起始。",
        "values": [],
        "argShape": "",
        "example": "graph: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "flowchart:",
        "meaning": "定义流程图起始。",
        "values": [],
        "argShape": "",
        "example": "flowchart: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "%%{init: {\"theme\": \"neutral\", \"look\": \"handDrawn\"}}%%",
      "dsl": "%%{init: {\"theme\": \"neutral\", \"look\": \"handDrawn\"}}%%\ngraph TD\n    A[提交申请] --> B{经理审批}\n    B -- \"通过\" --> C[财务放款]\n    B -- \"驳回\" --> D[退回修改]\n    D --> A\n    C --> E[流程结束]",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 逻辑流转类图表。专注于描述业务流转、决策分支及逻辑闭环。"
    ]
  },
  "mermaid_gantt": {
    "meta": {
      "id": "gantt",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_gantt",
      "qcTool": "GANTT",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "gantt",
      "displayName": "IQS 进度计划/甘特图",
      "intents": [
        "甘特图",
        "进度计划",
        "项目排期",
        "gantt"
      ],
      "expertise": [
        "项目计划管理",
        "时间进度追踪",
        "任务计划排期"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "gantt",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 计划与追踪类图表。关注任务在时间轴上的分布、依赖及完成状态。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "分类图表注意事项 (Diagram-Specific Precautions)"
        },
        {
          "kind": "ul",
          "items": [
            "**缩放防御 (Critical)**: 若当前日期不在项目周期内，必须强制设置 `todayMarker off`，否则时间轴会被无限拉伸导致图例不可见。",
            "**日期格式**: 必须通过 `dateFormat YYYY-MM-DD` 显式声明日期解析方式，以确保跨平台渲染一致性。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "gantt:",
        "meaning": "定义甘特图起始。",
        "values": [],
        "argShape": "",
        "example": "gantt: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "section:",
        "meaning": "定义阶段。",
        "values": [],
        "argShape": "",
        "example": "section: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "任务 :a1, 2024-03-01, 5d:",
        "meaning": "任务定义语法。",
        "values": [],
        "argShape": "",
        "example": "任务 :a1, 2024-03-01, 5d: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "after a1:",
        "meaning": "任务依赖语法。",
        "values": [],
        "argShape": "",
        "example": "after a1: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "%%{init: {\"theme\": \"base\", \"gantt\": {\"barHeight\": 35, \"fontSize\": 16}}}%%",
      "dsl": "%%{init: {\"theme\": \"base\", \"gantt\": {\"barHeight\": 35, \"fontSize\": 16}}}%%\ngantt\n    title 项目开发进度\n    dateFormat YYYY-MM-DD\n    todayMarker off\n    section 核心开发\n    架构设计 :a1, 2024-03-01, 5d\n    功能开发 :after a1, 10d\n    section 质量验证\n    集成测试 :2024-03-15, 7d",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 计划与追踪类图表。关注任务在时间轴上的分布、依赖及完成状态。",
      "缩放防御 (Critical): 若当前日期不在项目周期内，必须强制设置 `todayMarker off`，否则时间轴会被无限拉伸导致图例不可见。",
      "日期格式: 必须通过 `dateFormat YYYY-MM-DD` 显式声明日期解析方式，以确保跨平台渲染一致性。"
    ]
  },
  "mermaid_gitgraph": {
    "meta": {
      "id": "gitGraph",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_gitgraph",
      "qcTool": "GITGRAPH",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "gitGraph",
      "displayName": "IQS Git 分支/GitGraph",
      "intents": [
        "git图",
        "分支图",
        "代码提交记录",
        "gitgraph"
      ],
      "expertise": [
        "版本控制可视化",
        "Git 工作流分析",
        "代码提交记录建模"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "gitGraph",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 逻辑流转类图表。专注于展示代码版本控制中的分支演进及合并逻辑。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "gitGraph:",
        "meaning": "定义 Git 图起始。",
        "values": [],
        "argShape": "",
        "example": "gitGraph: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "commit id: \"ID\":",
        "meaning": "提交记录。",
        "values": [],
        "argShape": "",
        "example": "commit id: \"ID\": <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "branch[Name]",
        "meaning": "创建分支。",
        "values": [],
        "argShape": "",
        "example": "branch [Name][Name]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "checkout[Name]",
        "meaning": "切换分支。",
        "values": [],
        "argShape": "",
        "example": "checkout [Name][Name]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "merge[Name]",
        "meaning": "合并分支。",
        "values": [],
        "argShape": "",
        "example": "merge [Name][Name]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "gitGraph",
      "dsl": "gitGraph\n    commit id: \"Initial\"\n    branch develop\n    checkout develop\n    commit id: \"Feature-A\"\n    checkout main\n    merge develop\n    commit id: \"Release-1.0\"",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 逻辑流转类图表。专注于展示代码版本控制中的分支演进及合并逻辑。"
    ]
  },
  "mermaid_journey": {
    "meta": {
      "id": "journey",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_journey",
      "qcTool": "JOURNEY",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "journey",
      "displayName": "IQS 体验路径/旅程图",
      "intents": [
        "旅程图",
        "用户旅程",
        "体验路径",
        "journey board"
      ],
      "expertise": [
        "用户体验映射",
        "客户旅程分析",
        "服务感知可视化"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "journey",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 多维认知类图表。通过时间序列展示用户在交互过程中的情感曲线与参与点。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "journey:",
        "meaning": "定义旅程图起始。",
        "values": [],
        "argShape": "",
        "example": "journey: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "title:",
        "meaning": "设置旅程名称。",
        "values": [],
        "argShape": "",
        "example": "title: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "section:",
        "meaning": "设置阶段（如 搜索、决策）。",
        "values": [],
        "argShape": "",
        "example": "section: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "动作: 5: 角色:",
        "meaning": "分别代表 动作名, 评分 (0-5), 角色名。",
        "values": [],
        "argShape": "",
        "example": "动作: 5: 角色: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "%%{init: {\"theme\": \"base\"}}%%",
      "dsl": "%%{init: {\"theme\": \"base\"}}%%\njourney\n    title 线上购物旅程\n    section 搜索\n      点击商品: 5: 用户\n      查看详情: 4: 用户\n    section 决策\n      加购物车: 5: 用户\n      下单支付: 3: 用户",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 多维认知类图表。通过时间序列展示用户在交互过程中的情感曲线与参与点。"
    ]
  },
  "mermaid_kanban": {
    "meta": {
      "id": "kanban",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_kanban",
      "qcTool": "KANBAN",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "kanban",
      "displayName": "IQS 任务看板/Kanban",
      "intents": [
        "看板",
        "kanban",
        "任务流"
      ],
      "expertise": [
        "敏捷开发管理",
        "任务看板展现",
        "工作流追踪"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "kanban",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 计划与追踪类图表。用于模拟敏捷看板，展示任务在不同状态列（Todo, InProgress, Done）间的分布。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "kanban:",
        "meaning": "定义看板起始。",
        "values": [],
        "argShape": "",
        "example": "kanban: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "[列名]:",
        "meaning": "顶格书写定义列。",
        "values": [],
        "argShape": "",
        "example": "[列名]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "[事项]:",
        "meaning": "缩进定义任务项。",
        "values": [],
        "argShape": "",
        "example": "[事项]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "@{ assigned: \"人\" }:",
        "meaning": "分配责任人语法。",
        "values": [],
        "argShape": "",
        "example": "@{ assigned: \"人\" }: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "%%{init: {\"theme\": \"neutral\"}}%%",
      "dsl": "%%{init: {\"theme\": \"neutral\"}}%%\nkanban\n  Todo\n    需求评审\n    架构设计\n  InProgress\n    API开发\n  Done\n    环境搭建",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 计划与追踪类图表。用于模拟敏捷看板，展示任务在不同状态列（Todo, InProgress, Done）间的分布。"
    ]
  },
  "mermaid_mindmap": {
    "meta": {
      "id": "mindmap",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_mindmap",
      "qcTool": "MINDMAP",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "mindmap",
      "displayName": "IQS 知识脑图/思维导图",
      "intents": [
        "脑图",
        "思维导图",
        "mindmap"
      ],
      "expertise": [
        "思维导图",
        "逻辑结构梳理",
        "知识分类建模"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "mindmap",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 多维认知类图表。用于非线性的思维发散与归纳。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "mindmap:",
        "meaning": "定义脑图起始。",
        "values": [],
        "argShape": "",
        "example": "mindmap: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "root((\"中心\")):",
        "meaning": "双括号代表圆角容器。",
        "values": [],
        "argShape": "",
        "example": "root((\"中心\")): <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "(分支):",
        "meaning": "节点边界语法。",
        "values": [],
        "argShape": "",
        "example": "(分支): <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "{{ 六角 }}:",
        "meaning": "节点边界语法。",
        "values": [],
        "argShape": "",
        "example": "{{ 六角 }}: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "[矩形]:",
        "meaning": "节点边界语法。",
        "values": [],
        "argShape": "",
        "example": "[矩形]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "%%{init: {\"theme\": \"neutral\"}}%%",
      "dsl": "%%{init: {\"theme\": \"neutral\"}}%%\nmindmap\n  root((\"质量管理\"))\n    控制方法\n      (SPC 统计)\n      (异常拦截)\n    标准体系\n      (ISO 9001)\n      (行业标准)",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 多维认知类图表。用于非线性的思维发散与归纳。"
    ]
  },
  "mermaid_packet": {
    "meta": {
      "id": "packet-beta",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_packet",
      "qcTool": "PACKET-BETA",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "packet-beta",
      "displayName": "IQS 报文解析/Packet",
      "intents": [
        "报文图",
        "协议解析",
        "packet structure"
      ],
      "expertise": [
        "报文协议分析",
        "比特位映射",
        "协议栈建模"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "packet-beta",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 报文协议解析类。专注于底层通信数据结构的精确位图展示。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "packet-beta:",
        "meaning": "定义报文图起始。",
        "values": [],
        "argShape": "",
        "example": "packet-beta: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "[Start]-[End]: \"Label\":",
        "meaning": "定义位偏移量及字段名称（例：0-7: \"Type\"）。",
        "values": [],
        "argShape": "",
        "example": "[Start]-[End]: \"Label\": 0-7: \"Type\"",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "packet-beta",
      "dsl": "packet-beta\n    0-7: \"版本号\"\n    8-15: \"类型\"\n    16-31: \"校验和\"\n    32-63: \"偏移量\"",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 报文协议解析类。专注于底层通信数据结构的精确位图展示。"
    ]
  },
  "mermaid_pie": {
    "meta": {
      "id": "pie",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_pie",
      "qcTool": "PIE",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "pie",
      "displayName": "IQS 极简饼图 (Mermaid)",
      "intents": [
        "极简饼图",
        "Mermaid 饼图",
        "mermaid pie"
      ],
      "expertise": [
        "极简占比分析",
        "快速逻辑展示"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "pie",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "1. 标题策略: 必须在 `pie` 关键字后显式跟随 `title [标题]`。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 辅助类图表。仅当用户明确要求使用 Mermaid 或“极简”风格时使用。**常规占比分析首选 render_vchart_pie**。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "公共事项及说明 (Common Instructions)"
        },
        {
          "kind": "p",
          "text": "1. **标题策略**: 必须在 `pie` 关键字后显式跟随 `title [标题]`。"
        },
        {
          "kind": "p",
          "text": "2. **数值约束**: 建议项数不超过 8 个。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "pie:",
        "meaning": "定义饼图起始。",
        "values": [],
        "argShape": "",
        "example": "pie: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "title[标题内容]",
        "meaning": "设置标题。",
        "values": [],
        "argShape": "",
        "example": "title [标题内容][标题内容]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "\"项名\" : 数值:",
        "meaning": "数据项定义语法 (项名必须用双引号包裹)。",
        "values": [],
        "argShape": "",
        "example": "\"项名\" : 数值: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "%%{init: {\"theme\": \"neutral\"}}%%",
      "dsl": "%%{init: {\"theme\": \"neutral\"}}%%\npie title 缺陷原因分布\n    \"物流损坏\" : 45\n    \"品质瑕疵\" : 30\n    \"包装问题\" : 15\n    \"其他\" : 10",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 辅助类图表。仅当用户明确要求使用 Mermaid 或“极简”风格时使用。常规占比分析首选 render_vchart_pie。"
    ]
  },
  "mermaid_quadrant": {
    "meta": {
      "id": "quadrantChart",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_quadrant",
      "qcTool": "QUADRANTCHART",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "quadrantChart",
      "displayName": "IQS 四象限分析/象限图",
      "intents": [
        "象限图",
        "四象限",
        "优先级分析",
        "quadrant chart"
      ],
      "expertise": [
        "优先级评估",
        "战略分析",
        "四象限法则"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "quadrantChart",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 多维认知类图表。用于将事物按照两种维度的强弱划分为四个象限，辅助决策。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "分类图表注意事项 (Diagram-Specific Precautions)"
        },
        {
          "kind": "ul",
          "items": [
            "**引号强制**: 在 `quadrantChart` 中，**所有中文标签必须用双引号 \"\" 包裹**，否则会导致解析引擎挂起。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "quadrantChart:",
        "meaning": "定义象限图起始。",
        "values": [],
        "argShape": "",
        "example": "quadrantChart: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "x-axis \"Min\" --> \"Max\":",
        "meaning": "X 轴标签定义。",
        "values": [],
        "argShape": "",
        "example": "x-axis \"Min\" --> \"Max\": <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "quadrant-1 \"Label\":",
        "meaning": "象限区域标注。",
        "values": [],
        "argShape": "",
        "example": "quadrant-1 \"Label\": <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "\"Item\": [x, y]:",
        "meaning": "数据点定位语法。",
        "values": [],
        "argShape": "",
        "example": "\"Item\": [x, y]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "quadrantChart",
      "dsl": "quadrantChart\n    title \"研发任务优先级\"\n    x-axis \"低价值\" --> \"高价值\"\n    y-axis \"难实现\" --> \"易实现\"\n    quadrant-1 \"重点投入\"\n    quadrant-2 \"长期规划\"\n    \"任务A\": [0.8, 0.9]\n    \"任务B\": [0.2, 0.3]",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 多维认知类图表。用于将事物按照两种维度的强弱划分为四个象限，辅助决策。",
      "引号强制: 在 `quadrantChart` 中，所有中文标签必须用双引号 \"\" 包裹，否则会导致解析引擎挂起。"
    ]
  },
  "mermaid_requirement": {
    "meta": {
      "id": "requirementDiagram",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_requirement",
      "qcTool": "REQUIREMENTDIAGRAM",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "requirementDiagram",
      "displayName": "IQS 需求建模/需求图",
      "intents": [
        "需求图",
        "requirement diagram",
        "规格限制"
      ],
      "expertise": [
        "需求工程",
        "系统规格定义",
        "追溯分析"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "requirementDiagram",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 系统需求建模类图表。专注于需求条目的结构化定义及其在物理系统中的闭环验证。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "分类图表注意事项 (Diagram-Specific Precautions)"
        },
        {
          "kind": "ul",
          "items": [
            "**关系严谨**: 关系连接必须带箭头（如 `- satisfies ->`）。",
            "**验证闭环**: 验证方法建议必须使用官方关键字 `verifyMethod`。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "requirementDiagram:",
        "meaning": "定义需求图起始。",
        "values": [],
        "argShape": "",
        "example": "requirementDiagram: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "requirement [Name] { id: text, risk: level }:",
        "meaning": "需求定义块。",
        "values": [],
        "argShape": "",
        "example": "requirement [Name] { id: text, risk: level }: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "element [Name] { type: \"Type\" }:",
        "meaning": "系统元素定义块。",
        "values": [],
        "argShape": "",
        "example": "element [Name] { type: \"Type\" }: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "element - satisfies -> requirement:",
        "meaning": "关联关系定义。",
        "values": [],
        "argShape": "",
        "example": "element - satisfies -> requirement: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "requirementDiagram",
      "dsl": "requirementDiagram\n    requirement req_lock {\n        id: 1.1\n        text: \"当速度超过20km/h时自动锁定车门\"\n        risk: medium\n        verifyMethod: test\n    }\n    element actuator {\n        type: \"Actuator\"\n    }\n    actuator - satisfies -> req_lock",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 系统需求建模类图表。专注于需求条目的结构化定义及其在物理系统中的闭环验证。",
      "关系严谨: 关系连接必须带箭头（如 `- satisfies ->`）。",
      "验证闭环: 验证方法建议必须使用官方关键字 `verifyMethod`。"
    ]
  },
  "mermaid_sankey": {
    "meta": {
      "id": "sankey-beta",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_sankey",
      "qcTool": "SANKEY-BETA",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "sankey-beta",
      "displayName": "IQS 能量流向/桑基图",
      "intents": [
        "桑基图",
        "sankey",
        "流向图",
        "分配图"
      ],
      "expertise": [
        "能量平衡分析",
        "价值流映射 (VSM)",
        "资源分配可视化"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "sankey-beta",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 能量/价值流向类图表。用于展示流动量在不同节点间的分配关系。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "分类图表注意事项 (Diagram-Specific Precautions)"
        },
        {
          "kind": "ul",
          "items": [
            "**语言退避 (Critical)**: 当前版本 `sankey-beta` 解析器对非 ASCII 字符极其敏感。**强烈建议强制使用英文标注**以确保渲染成功，否则可能导致节点崩解。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "sankey-beta:",
        "meaning": "定义桑基图起始。",
        "values": [],
        "argShape": "",
        "example": "sankey-beta: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Source,Sink,Value:",
        "meaning": "数据行定义语法。",
        "values": [],
        "argShape": "",
        "example": "Source,Sink,Value: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "sankey-beta",
      "dsl": "sankey-beta\n    Agricultural,Fertilizer,150\n    Agricultural,Irrigation,100\n    Fertilizer,Crop,120\n    Irrigation,Crop,80",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 能量/价值流向类图表。用于展示流动量在不同节点间的分配关系。",
      "语言退避 (Critical): 当前版本 `sankey-beta` 解析器对非 ASCII 字符极其敏感。强烈建议强制使用英文标注以确保渲染成功，否则可能导致节点崩解。"
    ]
  },
  "mermaid_sequence": {
    "meta": {
      "id": "sequenceDiagram",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_sequence",
      "qcTool": "SEQUENCEDIAGRAM",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "sequenceDiagram",
      "displayName": "IQS 系统协作/时序图",
      "intents": [
        "时序图",
        "顺序图",
        "调用链",
        "sequence diagram"
      ],
      "expertise": [
        "系统架构协作",
        "接口调用时序",
        "消息传递分析"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "sequenceDiagram",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "1. 纯净 DSL 范式: AI 必须生成纯文本 DSL 指令。严禁将代码块包裹在 JSON 结构中或附加冗余解释。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 时序交互类图表。专注于刻画参与者（Participants）之间的消息传递顺序与调用逻辑。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "公共事项及说明 (Common Instructions)"
        },
        {
          "kind": "p",
          "text": "1. **纯净 DSL 范式**: AI 必须生成纯文本 DSL 指令。严禁将代码块包裹在 JSON 结构中或附加冗余解释。"
        },
        {
          "kind": "p",
          "text": "2. **符号冲突防御**: 中文描述必须优先使用全角标点，或用引号包裹。例：`Alice ->> Bob: \"处理中，请稍候\"`。"
        },
        {
          "kind": "p",
          "text": "3. **角色定义**: 使用 `actor` 定义人工角色，`participant` 定义系统组件。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "sequenceDiagram:",
        "meaning": "定义时序图起始。",
        "values": [],
        "argShape": "",
        "example": "sequenceDiagram: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "activate:",
        "meaning": "开启/关闭生命线。",
        "values": [],
        "argShape": "",
        "example": "activate: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "deactivate:",
        "meaning": "开启/关闭生命线。",
        "values": [],
        "argShape": "",
        "example": "deactivate: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "loop:",
        "meaning": "控制流结构。",
        "values": [],
        "argShape": "",
        "example": "loop: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "alt:",
        "meaning": "控制流结构。",
        "values": [],
        "argShape": "",
        "example": "alt: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "opt:",
        "meaning": "控制流结构。",
        "values": [],
        "argShape": "",
        "example": "opt: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "%%{init: {\"theme\": \"forest\"}}%%",
      "dsl": "%%{init: {\"theme\": \"forest\"}}%%\nsequenceDiagram\n    actor 用户\n    participant Web as Web端\n    participant Srv as 服务端\n    \n    用户 ->> Web: 点击登录\n    Web ->> Srv: 发送鉴权请求\n    Srv -->> Web: 返回 Token\n    Web -->> 用户: 显示主界面",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 时序交互类图表。专注于刻画参与者（Participants）之间的消息传递顺序与调用逻辑。"
    ]
  },
  "mermaid_state": {
    "meta": {
      "id": "stateDiagram-v2",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_state",
      "qcTool": "STATEDIAGRAM-V2",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "stateDiagram-v2",
      "displayName": "IQS 状态迁移/状态图",
      "intents": [
        "状态图",
        "状态迁移图",
        "生命周期图",
        "state diagram"
      ],
      "expertise": [
        "系统状态建模",
        "生命周期分析",
        "业务状态流转"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "stateDiagram-v2",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 逻辑流转类图表。专注于描述对象在不同触发条件下如何从一个状态转移到另一个状态。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "分类图表注意事项 (Diagram-Specific Precautions)"
        },
        {
          "kind": "ul",
          "items": [
            "**语义固化**: 必须采用 `state \"描述文本\" as 别名` 语法。严禁直接在转移连线上书写过于复杂的逻辑描述，以防渲染混乱。",
            "**闭环思维**: 必须包含起始状态 `[*]`。建议显式标注每一个终结状态 `[*]`。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "stateDiagram-v2:",
        "meaning": "定义状态图起始。",
        "values": [],
        "argShape": "",
        "example": "stateDiagram-v2: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "-->:",
        "meaning": "定义状态转移。",
        "values": [],
        "argShape": "",
        "example": "-->: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "[*]:",
        "meaning": "定义起始/结束点。",
        "values": [],
        "argShape": "",
        "example": "[*]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "%%{init: {\"theme\": \"neutral\"}}%%",
      "dsl": "%%{init: {\"theme\": \"neutral\"}}%%\nstateDiagram-v2\n    state \"待支付\" as s1\n    state \"已支付\" as s2\n    state \"待发货\" as s3\n    [*] --> s1\n    s1 --> s2: 支付成功\n    s2 --> s3\n    s3 --> [*]",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 逻辑流转类图表。专注于描述对象在不同触发条件下如何从一个状态转移到另一个状态。",
      "语义固化: 必须采用 `state \"描述文本\" as 别名` 语法。严禁直接在转移连线上书写过于复杂的逻辑描述，以防渲染混乱。",
      "闭环思维: 必须包含起始状态 `[*]`。建议显式标注每一个终结状态 `[*]`。"
    ]
  },
  "mermaid_timeline": {
    "meta": {
      "id": "timeline",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_timeline",
      "qcTool": "TIMELINE",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "timeline",
      "displayName": "IQS 历史年表/时间线",
      "intents": [
        "时间线",
        "年表",
        "迭代记录",
        "timeline"
      ],
      "expertise": [
        "历史路径分析",
        "迭代周期展现",
        "时间线建模"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "timeline",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 计划与追踪类图表。专注于以非刻度化的方式展示重要事件的先后顺序环境。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "timeline:",
        "meaning": "定义时间线起始。",
        "values": [],
        "argShape": "",
        "example": "timeline: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "title:",
        "meaning": "设置标题。",
        "values": [],
        "argShape": "",
        "example": "title: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "2024 : [事件1] : [事件2]:",
        "meaning": "时间段与事件定义语法。",
        "values": [],
        "argShape": "",
        "example": "2024 : [事件1] : [事件2]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "%%{init: {\"theme\": \"forest\"}}%%",
      "dsl": "%%{init: {\"theme\": \"forest\"}}%%\ntimeline\n    title IQS 产品历史\n    2023 : 1.0 版本\n    2024 : 2.0 版本\n    2025 : 3.0 版本",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 计划与追踪类图表。专注于以非刻度化的方式展示重要事件的先后顺序环境。"
    ]
  },
  "mermaid_xychart": {
    "meta": {
      "id": "xychart-beta",
      "tier": "relief",
      "family": "mermaid",
      "body": "Unknown",
      "mcpName": "render_mermaid_xychart",
      "qcTool": "XYCHART-BETA",
      "version": "1.0",
      "parentType": "mermaid",
      "subType": "xychart-beta",
      "displayName": "IQS 通用双轴图/XYChart",
      "intents": [
        "xy图",
        "组合图",
        "双轴图",
        "xychart"
      ],
      "expertise": [
        "混合趋势分析",
        "双变量呈现",
        "通用统计绘图"
      ],
      "colorSlots": [],
      "renderEngine": "mermaid",
      "inferenceKey": "xychart-beta",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**核心分类**: 通过 XY 坐标系展示混合趋势。相比 VChart 混合图，XYChart 更强调在文档流中的快速直观输出。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "分类图表注意事项 (Diagram-Specific Precautions)"
        },
        {
          "kind": "ul",
          "items": [
            "**引号强制**: 在 `xychart-beta` 中，**所有中文标签必须用双引号 \"\" 包裹**。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "xychart-beta:",
        "meaning": "定义图表起始。",
        "values": [],
        "argShape": "",
        "example": "xychart-beta: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "x-axis [\"L1\", \"L2\"]:",
        "meaning": "X 轴离散标签。",
        "values": [],
        "argShape": "",
        "example": "x-axis [\"L1\", \"L2\"]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "bar[v1, v2]",
        "meaning": "系列定义语法。",
        "values": [],
        "argShape": "",
        "example": "bar [v1, v2][v1, v2]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "line[v1, v2]",
        "meaning": "系列定义语法。",
        "values": [],
        "argShape": "",
        "example": "line [v1, v2][v1, v2]: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "xychart-beta",
      "dsl": "xychart-beta\n    title \"季度产量趋势\"\n    x-axis [\"Q1\", \"Q2\", \"Q3\", \"Q4\"]\n    y-axis \"产量(Ton)\" 0 --> 500\n    bar [320, 410, 390, 450]\n    line [300, 380, 420, 440]",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "核心分类: 通过 XY 坐标系展示混合趋势。相比 VChart 混合图，XYChart 更强调在文档流中的快速直观输出。",
      "引号强制: 在 `xychart-beta` 中，所有中文标签必须用双引号 \"\" 包裹。"
    ]
  },
  "vchart": {
    "meta": {
      "id": "vchart_master",
      "tier": "relief",
      "family": "vchart",
      "body": "Foreign",
      "mcpName": "render_vchart_master",
      "qcTool": "VCHART",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "master",
      "displayName": "VChart 渲染引擎总纲",
      "intents": [
        "VChart",
        "救济层",
        "类型外可视化",
        "VisActor"
      ],
      "expertise": [
        "VisActor VChart 配置",
        "类型外复杂可视化",
        "静态 Spec 约束"
      ],
      "colorSlots": [],
      "renderEngine": "vchart",
      "migrated": true
    },
    "soul": {
      "title": "VChart 引擎（RELIEF 救济层）",
      "summary": "基于 VisActor JSON Spec 的复杂可视化；**有 Native 等价时必须改走 CORE**。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "救济层定位"
        },
        {
          "kind": "p",
          "text": "VChart 用于 CORE 类型表无法表达的可视化。**凡有 Native 等价的，一律用 CORE** —— VChart 只能作为最后手段。"
        },
        {
          "kind": "callout",
          "type": "IMPORTANT",
          "text": "**有 Native 等价时，禁止用 `render_vchart_scatter` / `render_vchart_radar` 充当 QC 终稿** —— 散点与雷达都有 Native CORE 工具（`render_scatter` / `render_radar`）。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "两种语法模式（先选模式，再写内容）"
        },
        {
          "kind": "ul",
          "items": [
            "**Spec 模式（JSON 外壳）**：适用于 bar、line、area、pie、funnel、gauge、heatmap、rose、sankey、sunburst、treemap、waterfall、wordCloud、boxPlot、circularProgress、common。内容必须包在 `Spec: { … }` 内。",
            "**Custom DSL 模式（K-V 键值）**：**仅**适用于 vchart 族的 `radar` / `scatter` —— 采用关键字驱动，无需 JSON。"
          ]
        },
        {
          "kind": "h",
          "level": 4,
          "text": "三条硬约束"
        },
        {
          "kind": "ul",
          "items": [
            "**外壳必需**：必须以 `Title:` 开头，后跟 `Spec: { … }`。**严禁**把整个结果作为纯 JSON 对象输出（那样连 `Title:` 都没有）。",
            "**100% 静态**：`Spec` 内**严禁**出现任何 JavaScript 函数、注释或表达式 —— 只能是静态 JSON。",
            "**数据容器规范**：`Spec.data` 必须是数组 `[{ values: [...] }]`，元素为对象数组。"
          ]
        },
        {
          "kind": "callout",
          "type": "TIP",
          "text": "把用户给的「时间:数值」表格转成 `{ \"values\": [{ \"x\": \"A\", \"y\": 10 }, …] }`，再由 `xField` / `yField` 指向字段名 —— 这是最常见的转换。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表标题文字（**必需**，外壳首行）",
        "values": [],
        "argShape": "<文本>",
        "example": "Title: 核心指标分析",
        "status": "supported",
        "required": true,
        "notes": ""
      },
      {
        "name": "ColorPalette:",
        "meaning": "配色主题",
        "values": [
          "light",
          "tech",
          "vibrant",
          "industrial",
          "ocean",
          "forest"
        ],
        "argShape": "",
        "example": "ColorPalette: tech",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ShowTitle:",
        "meaning": "是否显示标题",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowTitle: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ShowLabel:",
        "meaning": "是否显示数据标签",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "ShowLabel: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Animation:",
        "meaning": "是否播放动画（导出静态图时建议 false）",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "Animation: false",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Spec:",
        "meaning": "核心 JSON 配置（Spec 模式的**必填**内核）",
        "values": [],
        "argShape": "Spec: { \"type\": \"<图表类型>\", … }",
        "example": "Spec: { \"type\": \"bar\", \"data\": [{ \"values\": […] }] }",
        "status": "supported",
        "required": true,
        "notes": "① `Spec` 内是 **100% 静态 JSON** —— 严禁函数、注释、表达式；② 外层 `{ }` 必须成对，且整个 `Spec:` 是**文本**（不是把整个 DSL 变成 JSON 对象）；③ `data` 必须是 `[{ values: [...] }]` 形式。"
      },
      {
        "name": "数据字段:",
        "meaning": "（`Spec` 内）字段名映射",
        "values": [],
        "argShape": "\"xField\": \"<字段>\", \"yField\": \"<字段>\"",
        "example": "\"xField\": \"month\", \"yField\": \"v\"",
        "status": "supported",
        "required": false,
        "notes": "`xField` / `yField` / `seriesField` / `categoryField` 各自指向 `values` 里的键名。"
      },
      {
        "name": "轴线映射:",
        "meaning": "（`Spec` 内）轴的朝向与服务序列",
        "values": [],
        "argShape": "{ \"orient\": \"left|bottom|right|top\", \"seriesIndex\": [<序号>] }",
        "example": "{ \"orient\": \"left\", \"label\": { \"visible\": true } }",
        "status": "supported",
        "required": false,
        "notes": "组合图（`common`）中**必须**用 `seriesIndex` 或 `seriesId` 显式绑定轴；且整体必须包含 `bottom` 轴。"
      }
    ],
    "example": {
      "title": "bar（Spec 模式代表）",
      "dsl": "Title: 月度设备综合效率 (OEE)\nColorPalette: tech\nShowTitle: true\n\nSpec: {\n  \"type\": \"bar\",\n  \"data\": [{ \"values\": [\n    { \"month\": \"1月\", \"v\": 0.85 }, { \"month\": \"2月\", \"v\": 0.88 }\n  ]}],\n  \"xField\": \"month\", \"yField\": \"v\",\n  \"label\": { \"visible\": true },\n  \"axes\": [\n    { \"orient\": \"bottom\", \"label\": { \"visible\": true } },\n    { \"orient\": \"left\", \"label\": { \"visible\": true } }\n  ]\n}\n",
      "notes": "仅作本族的语法形态示意（外壳 + 静态 Spec + data.values 容器）；具体 sub_type 请读对应卡片。"
    },
    "counterexamples": [
      {
        "bad": "{ \"type\": \"bar\", \"data\": [{ \"values\": [] }] }",
        "good": "Title: 月度 OEE\\nSpec: { \"type\": \"bar\", \"data\": [{ \"values\": [] }] }",
        "reason": "`dsl` 字段必须是**文本**且以 `Title:` 开头；直接把整个结果写成 JSON 对象会被 MCP 判为格式错误。"
      },
      {
        "bad": "Spec: { \"type\": \"bar\", \"tooltip\": { \"formatter\": (v) => v + \"%\" } }",
        "good": "Spec: { \"type\": \"bar\", \"tooltip\": { \"visible\": true } }",
        "reason": "Spec 必须 100% 静态 —— 任何 JavaScript 函数都不被接受。"
      },
      {
        "bad": "Spec: { \"data\": [{ \"month\": \"1月\", \"v\": 0.85 }] }",
        "good": "Spec: { \"data\": [{ \"values\": [{ \"month\": \"1月\", \"v\": 0.85 }] }] }",
        "reason": "`data` 必须是 `[{ values: [...] }]` 容器，而不是裸的对象数组。"
      },
      {
        "bad": "（用 render_vchart_scatter 画 QC 相关分析终稿）",
        "good": "Title: 注塑工艺参数相关分析\\nXAxis: 模具温度(℃)\\n- 195.5, 85.2",
        "reason": "散点有 Native CORE 工具 `render_scatter`；QC 终稿禁止用 vchart 救济版冒充。"
      },
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "必须 `Title:` 开头 + `Spec: { … }` 外壳；`Spec` 内为 **100% 静态 JSON**。",
      "`data` 用 `[{ values: [...] }]` 容器；严禁函数、注释与表达式。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "**先自问：能否用 CORE？** 能则一律改 CORE（尤其 scatter / radar 有 Native 等价）。",
      "再选模式：本节列举的 Spec 类表型用 JSON 外壳；vchart 的 radar / scatter 用 K-V 模式。",
      "把用户数据转成 `{\"values\": [{\"x\": …, \"y\": …}]}`，再用 `xField`/`yField` 映射字段名。",
      "组合图（`common`）务必为每个系列绑定轴（`seriesIndex`/`seriesId`）并补 `bottom` 轴。",
      "导出静态图时设 `Animation: false`。"
    ]
  },
  "vchart_area": {
    "meta": {
      "id": "area",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_area",
      "qcTool": "AREA",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "area",
      "displayName": "VChart 资源面积图",
      "intents": [
        "面积图",
        "堆叠面积图",
        "area chart"
      ],
      "expertise": [
        "资源分布结构",
        "累积效应分析",
        "面积占比可视化"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "area",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**笛卡尔闭环 (Critical)**: 必须配置 `bottom` 与 `left` 轴。",
            "**层级堆叠**: 推荐开启 `\"stack\": true` 以展示总量及各分量的贡献配比。",
            "**显示标注**: 必须配置 `\"label\": { \"visible\": true }`。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "外壳要求:",
        "meaning": "必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。",
        "values": [],
        "argShape": "",
        "example": "外壳要求: Title: [标题内容]",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "分类标记:",
        "meaning": "使用 seriesField 区分不同的资源类别（如 电、气、水）。",
        "values": [],
        "argShape": "",
        "example": "分类标记: seriesField",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "填充样式:",
        "meaning": "默认包含透明度梯度，以确多个序列层叠时的可读性。",
        "values": [],
        "argShape": "",
        "example": "填充样式: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "能源消耗结构分析",
      "dsl": "Title: 能源消耗结构分析\nColorPalette: forest\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"area\",\n  \"data\": [{ \"values\": [\n    {\"x\":\"周一\",\"y\":50,\"c\":\"电\"}, {\"x\":\"周一\",\"y\":30,\"c\":\"气\"}, {\"x\":\"周一\",\"y\":10,\"c\":\"水\"},\n    {\"x\":\"周二\",\"y\":55,\"c\":\"电\"}, {\"x\":\"周2\",\"y\":35,\"c\":\"气\"}, {\"x\":\"周二\",\"y\":12,\"c\":\"水\"}\n  ]}],\n  \"xField\": \"x\", \"yField\": \"y\", \"seriesField\": \"c\", \"stack\": true,\n  \"label\": { \"visible\": true },\n  \"axes\": [\n    { \"orient\": \"bottom\", \"label\": { \"visible\": true } },\n    { \"orient\": \"left\", \"label\": { \"visible\": true } }\n  ],\n  \"legends\": [{ \"visible\": true, \"orient\": \"bottom\" }]\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "笛卡尔闭环 (Critical): 必须配置 `bottom` 与 `left` 轴。",
      "层级堆叠: 推荐开启 `\"stack\": true` 以展示总量及各分量的贡献配比。",
      "显示标注: 必须配置 `\"label\": { \"visible\": true }`。"
    ]
  },
  "vchart_bar": {
    "meta": {
      "id": "bar",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_bar",
      "qcTool": "BAR",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "bar",
      "displayName": "VChart 基础柱状图",
      "intents": [
        "柱状图",
        "条形图",
        "bar chart",
        "堆叠柱状图"
      ],
      "expertise": [
        "横向对比分析",
        "频数统计呈现",
        "工业数据可视化"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "bar",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**笛卡尔闭环 (Critical)**: 作为笛卡尔坐标系图表，**必须**显式包含 `bottom` 和 `left` 两个轴配置，否则会导致渲染异常。",
            "**显示标注**: 为了保证工业读数精度，必须在 series 中配置 `\"label\": { \"visible\": true }`。",
            "**静态约束**: 严禁在 Spec 块内出现 JavaScript 函数或 formatMethod 逻辑。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "外壳要求:",
        "meaning": "必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。",
        "values": [],
        "argShape": "",
        "example": "外壳要求: Title: [标题内容]",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "数据容器:",
        "meaning": "所有的 Spec.data 必须是数组格式 data: [{ values: [...] }]。",
        "values": [],
        "argShape": "",
        "example": "数据容器: Spec.data",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "字段绑定:",
        "meaning": "xField 绑定类别，yField 绑定数值。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: xField",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "生产单元故障堆叠分析",
      "dsl": "Title: 生产单元故障堆叠分析\nColorPalette: ocean\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"bar\",\n  \"data\": [{ \"values\": [\n    {\"unit\":\"单元A\",\"type\":\"机械\",\"v\":10}, {\"unit\":\"单元A\",\"type\":\"电气\",\"v\":20}, {\"unit\":\"单元A\",\"type\":\"人为\",\"v\":5},\n    {\"unit\":\"单元B\",\"type\":\"机械\",\"v\":15}, {\"unit\":\"单元B\",\"type\":\"电气\",\"v\":5}, {\"unit\":\"单元B\",\"type\":\"人为\",\"v\":8}\n  ]}],\n  \"xField\": \"unit\", \"yField\": \"v\", \"seriesField\": \"type\", \"stack\": true,\n  \"label\": { \"visible\": true },\n  \"axes\": [\n    { \"orient\": \"bottom\", \"label\": { \"visible\": true } },\n    { \"orient\": \"left\", \"label\": { \"visible\": true } }\n  ],\n  \"legends\": [{ \"visible\": true, \"orient\": \"bottom\" }]\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "笛卡尔闭环 (Critical): 作为笛卡尔坐标系图表，必须显式包含 `bottom` 和 `left` 两个轴配置，否则会导致渲染异常。",
      "显示标注: 为了保证工业读数精度，必须在 series 中配置 `\"label\": { \"visible\": true }`。",
      "静态约束: 严禁在 Spec 块内出现 JavaScript 函数或 formatMethod 逻辑。"
    ]
  },
  "vchart_boxplot": {
    "meta": {
      "id": "boxPlot",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_boxplot",
      "qcTool": "BOXPLOT",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "boxPlot",
      "displayName": "VChart 质量审计/箱线图",
      "intents": [
        "箱线图",
        "分位数图",
        "boxplot",
        "离散度分析"
      ],
      "expertise": [
        "离散度分析",
        "质量审计建模",
        "异常值识别"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "boxPlot",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**预计算统计量 (Critical)**: VChart BoxPlot **不负责**原始行数据的统计，必须传递已计算好的 `min`, `q1`, `median`, `q3`, `max` 值。",
            "**笛卡尔闭环**: 作为笛卡尔系图表，必须包含 `bottom` 和 `left` 坐标轴。",
            "**静态约束**: 所有计算值必须为字面量数字。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "字段绑定:",
        "meaning": "显式映射 minField, q1Field, medianField, q3Field, maxField。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: minField",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "样式:",
        "meaning": "boxPlot 关键字采用驼峰命名。",
        "values": [],
        "argShape": "",
        "example": "样式: boxPlot",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "加工尺寸分布审计 (箱线图)",
      "dsl": "Title: 加工尺寸分布审计 (箱线图)\nColorPalette: tech\nShowTitle: true\nShowLabel: false\nAnimation: false\n\nSpec: {\n  \"type\": \"boxPlot\",\n  \"data\": [ {\n      \"values\": [\n        { \"batch\": \"批次A\", \"min\": 10.1, \"q1\": 10.2, \"median\": 10.3, \"q3\": 10.4, \"max\": 10.5 },\n        { \"batch\": \"批次B\", \"min\": 10.6, \"q1\": 10.7, \"median\": 10.75, \"q3\": 10.85, \"max\": 11.0 }\n      ]\n    } ],\n  \"xField\": \"batch\", \"minField\": \"min\", \"q1Field\": \"q1\", \"medianField\": \"median\", \"q3Field\": \"q3\", \"maxField\": \"max\",\n  \"axes\": [\n    { \"orient\": \"bottom\", \"label\": { \"visible\": true } },\n    { \"orient\": \"left\", \"label\": { \"visible\": true } }\n  ]\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "预计算统计量 (Critical): VChart BoxPlot 不负责原始行数据的统计，必须传递已计算好的 `min`, `q1`, `median`, `q3`, `max` 值。",
      "笛卡尔闭环: 作为笛卡尔系图表，必须包含 `bottom` 和 `left` 坐标轴。",
      "静态约束: 所有计算值必须为字面量数字。"
    ]
  },
  "vchart_circular_progress": {
    "meta": {
      "id": "circularProgress",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_circular_progress",
      "qcTool": "CIRCULARPROGRESS",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "circularProgress",
      "displayName": "VChart 进度追踪环",
      "intents": [
        "进度环",
        "环形进度",
        "circular progress",
        "达成追踪"
      ],
      "expertise": [
        "多指标进度对比",
        "达成率追踪分析",
        "环形进度建模"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "circularProgress",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**多条追踪**: 支持在一个圆环内展示多条进度轨道（seriesField 分组）。",
            "**严禁跨系挂载**: 极坐标系下的专用进度组件，禁制挂载笛卡尔轴。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "字段绑定:",
        "meaning": "valueField (0-1 的进度值)，categoryField 进度名，seriesField 锚定轨道分组。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: valueField",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "核心指标达成进度",
      "dsl": "Title: 核心指标达成进度\nColorPalette: tech\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"circularProgress\",\n  \"data\": [{ \"values\": [\n    { \"name\": \"产量达成\", \"value\": 0.88 },\n    { \"name\": \"直通率\", \"value\": 0.95 }\n  ]}],\n  \"valueField\": \"value\", \"categoryField\": \"name\", \"seriesField\": \"name\",\n  \"radius\": 0.8, \"innerRadius\": 0.2,\n  \"label\": { \"visible\": true, \"position\": \"bottom\" }\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "多条追踪: 支持在一个圆环内展示多条进度轨道（seriesField 分组）。",
      "严禁跨系挂载: 极坐标系下的专用进度组件，禁制挂载笛卡尔轴。"
    ]
  },
  "vchart_common": {
    "meta": {
      "id": "common",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_common",
      "qcTool": "COMMON",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "common",
      "displayName": "VChart 组合分析图",
      "intents": [
        "组合图",
        "双轴图",
        "混合图",
        "common chart"
      ],
      "expertise": [
        "多指标关联分析",
        "双轴对比呈现",
        "复杂数据建模"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "common",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**多轴绑定 (Critical)**: 在组合图中，必须通过 `seriesIndex` 或 `seriesId` 显式绑定轴向（如 `orient: left` 绑定 series 0）。",
            "**笛卡尔闭环**: 整体必须包含 `bottom` 轴，且每个垂直轴向均需显式配置。",
            "**数据解耦**: 每类序列建议使用独立的 `data` 块或通过 `series` 内置数据定义。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "系列定义:",
        "meaning": "使用 series 数组，每个对象需声明 type (bar/line/area)。",
        "values": [],
        "argShape": "",
        "example": "系列定义: series",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "轴线映射:",
        "meaning": "axes 数组中通过 seriesIndex: [idx] 指定该轴服务的序列。",
        "values": [],
        "argShape": "",
        "example": "轴线映射: axes",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "生产效能双轴组合图",
      "dsl": "Title: 生产效能双轴组合图\nColorPalette: tech\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"common\",\n  \"series\": [\n    { \"id\": \"cost\", \"type\": \"bar\", \"data\": {\"values\": [{\"x\":\"Q1\",\"y\":120},{\"x\":\"Q2\",\"y\":150}]}, \"xField\": \"x\", \"yField\": \"y\", \"label\": { \"visible\": true } },\n    { \"id\": \"yield\", \"type\": \"line\", \"data\": {\"values\": [{\"x\":\"Q1\",\"y\":98},{\"x\":\"Q2\",\"y\":96}]}, \"xField\": \"x\", \"yField\": \"y\", \"label\": { \"visible\": true } }\n  ],\n  \"axes\": [\n    { \"orient\": \"left\", \"seriesIndex\": [0], \"title\": {\"visible\": true, \"text\": \"成本 (K)\"} },\n    { \"orient\": \"right\", \"seriesIndex\": [1], \"title\": {\"visible\": true, \"text\": \"良率 (%)\"} },\n    { \"orient\": \"bottom\", \"label\": { \"visible\": true } }\n  ],\n  \"legends\": [{ \"visible\": true, \"orient\": \"bottom\" }]\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "多轴绑定 (Critical): 在组合图中，必须通过 `seriesIndex` 或 `seriesId` 显式绑定轴向（如 `orient: left` 绑定 series 0）。",
      "笛卡尔闭环: 整体必须包含 `bottom` 轴，且每个垂直轴向均需显式配置。",
      "数据解耦: 每类序列建议使用独立的 `data` 块或通过 `series` 内置数据定义。"
    ]
  },
  "vchart_correlation_heat": {
    "meta": {
      "id": "heatmap",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_correlation_heat",
      "qcTool": "HEATMAP",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "heatmap",
      "displayName": "VChart 相关矩阵图",
      "intents": [
        "相关性矩阵",
        "矩阵热力图",
        "correlation heatmap",
        "替换韦恩图"
      ],
      "expertise": [
        "多因果相关性分析",
        "质量指标矩阵建模",
        "相关强度可视化"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "heatmap",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**Venn 替代策略**: 由于 VChart 暂不支持 `venn` 类型，**必须**引导用户或 AI 使用 `heatmap` 构建相关性矩阵进行等效表达。",
            "**笛卡尔闭环**: 必须包含 `bottom` 和 `left` 两个类别轴。",
            "**显示标注**: 必须在 series 中配置 `\"label\": { \"visible\": true }` 以展示相关系数数值。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "数据构建:",
        "meaning": "建立对称的 X-Y 坐标数据对，valueField 存储相关系数值（通常为 -1 到 1）。",
        "values": [],
        "argShape": "",
        "example": "数据构建: valueField",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "品质指标相关性矩阵",
      "dsl": "Title: 品质指标相关性矩阵\nColorPalette: deep\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"heatmap\",\n  \"data\": [{ \"values\": [\n    {\"x\":\"温度\",\"y\":\"压力\",\"v\":0.92}, {\"x\":\"温度\",\"y\":\"转速\",\"v\":0.45},\n    {\"x\":\"压力\",\"y\":\"温度\",\"v\":0.92}, {\"x\":\"压力\",\"y\":\"转速\",\"v\":0.31}\n  ]}],\n  \"xField\": \"x\", \"yField\": \"y\", \"valueField\": \"v\",\n  \"label\": { \"visible\": true },\n  \"axes\": [\n    { \"orient\": \"bottom\", \"label\": { \"visible\": true } },\n    { \"orient\": \"left\", \"label\": { \"visible\": true } }\n  ]\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "Venn 替代策略: 由于 VChart 暂不支持 `venn` 类型，必须引导用户或 AI 使用 `heatmap` 构建相关性矩阵进行等效表达。",
      "笛卡尔闭环: 必须包含 `bottom` 和 `left` 两个类别轴。",
      "显示标注: 必须在 series 中配置 `\"label\": { \"visible\": true }` 以展示相关系数数值。"
    ]
  },
  "vchart_funnel": {
    "meta": {
      "id": "funnel",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_funnel",
      "qcTool": "FUNNEL",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "funnel",
      "displayName": "VChart 过程转化/漏斗图",
      "intents": [
        "漏斗图",
        "转化图",
        "funnel chart",
        "流失率分析"
      ],
      "expertise": [
        "转化率分析",
        "业务流转建模",
        "衰减过程可视化"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "funnel",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**数组结构**: VChart Funnel 必须接受数组格式的数据容器。",
            "**排序准则**: 默认按数值降序排列以符合“漏斗”语义，建议通过 `categoryField` 对齐逻辑阶段。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "外壳要求:",
        "meaning": "必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。",
        "values": [],
        "argShape": "",
        "example": "外壳要求: Title: [标题内容]",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "字段绑定:",
        "meaning": "categoryField 定义阶段名称，valueField 定义各阶段余留量。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: categoryField",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "业务转化漏斗",
      "dsl": "Title: 业务转化漏斗\nColorPalette: vibrant\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"funnel\",\n  \"data\": [{ \"values\": [\n    {\"step\":\"访问\",\"v\":1000}, {\"step\":\"注册\",\"v\":600}, {\"step\":\"试用\",\"v\":300}\n  ]}],\n  \"categoryField\": \"step\", \"valueField\": \"v\",\n  \"label\": { \"visible\": true }\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "数组结构: VChart Funnel 必须接受数组格式的数据容器。",
      "排序准则: 默认按数值降序排列以符合“漏斗”语义，建议通过 `categoryField` 对齐逻辑阶段。"
    ]
  },
  "vchart_gauge": {
    "meta": {
      "id": "gauge",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_gauge",
      "qcTool": "GAUGE",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "gauge",
      "displayName": "VChart 实时性能/仪表盘",
      "intents": [
        "仪表盘",
        "刻度盘",
        "gauge chart",
        "达成率监控"
      ],
      "expertise": [
        "实时监控展示",
        "KPI 达成呈现",
        "水位仪表建模"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "gauge",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**角度控制**: 应显式定义 `startAngle` (如 -225) 和 `endAngle` (如 45) 以形成工业标准的扫掠范围。",
            "**严禁跨系挂载**: 禁止配置 Cartesian 坐标轴。",
            "**量程定义**: 通过半径 `outerRadius` 与 `innerRadius` 控制环厚。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "数据限制:",
        "meaning": "建议单系列数据展示。使用 valueField 绑定当前测得数值。",
        "values": [],
        "argShape": "",
        "example": "数据限制: valueField",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "产线实时直通率仪表盘",
      "dsl": "Title: 产线实时直通率仪表盘\nColorPalette: tech\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"gauge\",\n  \"data\": [{ \"values\": [{\"v\": 0.88}] }],\n  \"valueField\": \"v\",\n  \"categoryField\": \"v\",\n  \"outerRadius\": 0.8, \"innerRadius\": 0.5,\n  \"startAngle\": -225, \"endAngle\": 45,\n  \"label\": { \"visible\": true }\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "角度控制: 应显式定义 `startAngle` (如 -225) 和 `endAngle` (如 45) 以形成工业标准的扫掠范围。",
      "严禁跨系挂载: 禁止配置 Cartesian 坐标轴。",
      "量程定义: 通过半径 `outerRadius` 与 `innerRadius` 控制环厚。"
    ]
  },
  "vchart_heatmap": {
    "meta": {
      "id": "heatmap",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_heatmap",
      "qcTool": "HEATMAP",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "heatmap",
      "displayName": "VChart 空间负荷/热力图",
      "intents": [
        "热力图",
        "颜色映射图",
        "heatmap",
        "矩阵分析"
      ],
      "expertise": [
        "热力分布分析",
        "相关性矩阵展现",
        "负荷密度可视化"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "heatmap",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**Venn 替代**: VChart 不支持 Venn 图，处理逻辑关联集合时，推荐使用 Heatmap 或 Scatter 作为替代方案。",
            "**笛卡尔闭环**: 必须包含 `bottom` 和 `left` 轴。",
            "**颜色策略**: 必须配置 `visualMap` 或色带，以保证数值与色彩的直观映射感。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "字段绑定:",
        "meaning": "xField 对应时间维或 X 维度，yField 对应分类维度，valueField 对应热力强度。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: xField",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "产线负荷热力分布",
      "dsl": "Title: 产线负荷热力分布\nColorPalette: sunset\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"heatmap\",\n  \"data\": [{ \"values\": [\n    {\"hour\":\"08:00\",\"line\":\"Line1\",\"v\":90}, {\"hour\":\"09:00\",\"line\":\"Line1\",\"v\":95},\n    {\"hour\":\"08:00\",\"line\":\"Line2\",\"v\":40}, {\"hour\":\"09:00\",\"line\":\"Line2\",\"v\":50}\n  ]}],\n  \"xField\": \"hour\", \"yField\": \"line\", \"valueField\": \"v\",\n  \"label\": { \"visible\": true },\n  \"axes\": [\n    { \"orient\": \"bottom\", \"label\": { \"visible\": true } },\n    { \"orient\": \"left\", \"label\": { \"visible\": true } }\n  ]\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "Venn 替代: VChart 不支持 Venn 图，处理逻辑关联集合时，推荐使用 Heatmap 或 Scatter 作为替代方案。",
      "笛卡尔闭环: 必须包含 `bottom` 和 `left` 轴。",
      "颜色策略: 必须配置 `visualMap` 或色带，以保证数值与色彩的直观映射感。"
    ]
  },
  "vchart_line": {
    "meta": {
      "id": "line",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_line",
      "qcTool": "LINE",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "line",
      "displayName": "VChart 趋势折线图",
      "intents": [
        "折线图",
        "趋势图",
        "line chart",
        "良率趋势"
      ],
      "expertise": [
        "趋势追踪分析",
        "过程波动监控",
        "时间序列可视化"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "line",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**笛卡尔闭环 (Critical)**: 必须显式定义 `bottom` (时间/类别轴) 与 `left` (数值轴) 对齐。",
            "**显示标注**: series 中必须配置 `\"label\": { \"visible\": true }` 以确保关键拐点数值可见。",
            "**数据平滑**: 可选配置 `\"smooth\": true` 以美化非精度敏感的趋势描述。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "外壳要求:",
        "meaning": "必须使用 Title: [标题内容] 起始，紧跟 Spec: { ... } 块。",
        "values": [],
        "argShape": "",
        "example": "外壳要求: Title: [标题内容]",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "字段绑定:",
        "meaning": "xField 对应时间维，yField 对应监控指标。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: xField",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "数据点:",
        "meaning": "设置 \"point\": { \"visible\": true } 增强交互触达。",
        "values": [],
        "argShape": "",
        "example": "数据点: \"point\": { \"visible\": true }",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "月度良率趋势分析",
      "dsl": "Title: 月度良率趋势分析\nColorPalette: ocean\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"line\",\n  \"data\": [{ \"values\": [\n    {\"month\":\"1月\",\"v\":95}, {\"month\":\"2月\",\"v\":96}, {\"month\":\"3月\",\"v\":94},\n    {\"month\":\"4月\",\"v\":97}, {\"month\":\"5月\",\"v\":98}, {\"month\":\"6月\",\"v\":95}\n  ]}],\n  \"xField\": \"month\", \"yField\": \"v\",\n  \"label\": { \"visible\": true },\n  \"point\": { \"visible\": true },\n  \"axes\": [\n    { \"orient\": \"bottom\", \"label\": { \"visible\": true } },\n    { \"orient\": \"left\", \"label\": { \"visible\": true } }\n  ]\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "笛卡尔闭环 (Critical): 必须显式定义 `bottom` (时间/类别轴) 与 `left` (数值轴) 对齐。",
      "显示标注: series 中必须配置 `\"label\": { \"visible\": true }` 以确保关键拐点数值可见。",
      "数据平滑: 可选配置 `\"smooth\": true` 以美化非精度敏感的趋势描述。"
    ]
  },
  "vchart_pie": {
    "meta": {
      "id": "pie",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_pie",
      "qcTool": "PIE",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "pie",
      "displayName": "IQS 工业级占比图 (VChart)",
      "intents": [
        "工业级饼图",
        "高精占比图",
        "VChart 饼图",
        "complex pie"
      ],
      "expertise": [
        "工业级占比分析",
        "构成比例可视化",
        "高精度饼图"
      ],
      "colorSlots": [],
      "renderEngine": "vchart",
      "inferenceKey": "pie",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**严禁坐标轴**: 饼图工作在极坐标系，**绝对禁止**出现 `axes` 或 `orient: left/bottom` 配置。",
            "**数据容器**: `Spec.data` 顶层必须为数组格式 `[{ values: [...] }]`。",
            "**形态策略**: 默认为实心饼图 (`innerRadius: 0`)。当用户提到“环形”或“Donut”时，才设置 `innerRadius: 0.5`。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "外壳要求:",
        "meaning": "必须使用 Title: [标题] 起始。",
        "values": [],
        "argShape": "",
        "example": "外壳要求: Title: [标题]",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "字段绑定:",
        "meaning": "categoryField 对应分类名称，valueField 对应数值。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: categoryField",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "显示控制:",
        "meaning": "\"label\": { \"visible\": true }。",
        "values": [],
        "argShape": "",
        "example": "显示控制: \"label\": { \"visible\": true }",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "质量成本构成明细",
      "dsl": "Title: 质量成本构成明细\nColorPalette: vibrant\n\nSpec: {\n  \"type\": \"pie\",\n  \"data\": [{ \"values\": [\n    {\"name\":\"预防成本\",\"v\":400},\n    {\"name\":\"鉴定成本\",\"v\":200}\n  ]}],\n  \"categoryField\": \"name\", \"valueField\": \"v\",\n  \"outerRadius\": 0.8, \"innerRadius\": 0,\n  \"label\": { \"visible\": true }\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "严禁坐标轴: 饼图工作在极坐标系，绝对禁止出现 `axes` 或 `orient: left/bottom` 配置。",
      "数据容器: `Spec.data` 顶层必须为数组格式 `[{ values: [...] }]`。",
      "形态策略: 默认为实心饼图 (`innerRadius: 0`)。当用户提到“环形”或“Donut”时，才设置 `innerRadius: 0.5`。"
    ]
  },
  "vchart_radar": {
    "meta": {
      "id": "radar",
      "tier": "relief",
      "family": "vchart",
      "body": "AxisSeries",
      "mcpName": "render_vchart_radar",
      "qcTool": "RADAR",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "radar",
      "displayName": "IQS 指标评估/雷达图",
      "intents": [
        "雷达图",
        "能力雷达",
        "绩效分析",
        "radar chart"
      ],
      "expertise": [
        "多维绩效评估",
        "核心竞争力分析",
        "指标均衡性观察"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "radar",
      "migrated": true
    },
    "soul": {
      "title": "雷达图多维分析 (Radar Chart)",
      "summary": "雷达图是通过多轴展现对象在不同维度上得分，以评估整体平衡性与优劣势的工具。",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "雷达图多维分析 (Radar Chart)"
        },
        {
          "kind": "p",
          "text": "雷达图是通过多轴展现对象在不同维度上得分，以评估整体平衡性与优劣势的工具。"
        },
        {
          "kind": "h",
          "level": 4,
          "text": "核心分析算子："
        },
        {
          "kind": "ul",
          "items": [
            "**面积综合得分 (Area Score)**: 评估综合实力，体现“短板效应”。",
            "**相似度分析 (Similarity Analysis)**: 用于识别竞争对手或特征对标。",
            "**数据标准化 (Standardize)**: 自动映射量纲不一致的指标至 0-1 范围。"
          ]
        },
        {
          "kind": "callout",
          "type": "TIP",
          "text": "**多维平衡性**: 观察多边形的均匀度。极度不规则意味着资源分配极度不均，可能存在局部优势掩盖系统性缺陷。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表标题",
        "values": [],
        "argShape": "",
        "example": "Title: 竞品对比",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "Standardize:",
        "meaning": "是否自动标准化数据",
        "values": [
          "true",
          "false"
        ],
        "argShape": "",
        "example": "Standardize: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ShowAreaScore:",
        "meaning": "显示多边形面积综合得分",
        "values": [],
        "argShape": "",
        "example": "ShowAreaScore: true",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "轴定义:",
        "meaning": "Axis: [Name], [Max], [Min]",
        "values": [],
        "argShape": "",
        "example": "轴定义: Axis: [Name], [Max], [Min]",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "系列定义:",
        "meaning": "Series: [Name], [ValueList], [Color], [Opacity]",
        "values": [],
        "argShape": "",
        "example": "系列定义: Series: [Name], [ValueList], [Color], [Opacity]",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "手机硬件参数对比",
      "dsl": "Title: 手机硬件参数对比\nStandardize: true\nShowAreaScore: true\n\n// 轴定义\nAxis: 续航, 100, 0\nAxis: 性能, 100, 0\nAxis: 拍照, 100, 0\n\n// 数据系列\nSeries: A手机, [85, 92, 78], #0D5E42, 0.4",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "面积综合得分 (Area Score): 评估综合实力，体现“短板效应”。",
      "相似度分析 (Similarity Analysis): 用于识别竞争对手或特征对标。",
      "数据标准化 (Standardize): 自动映射量纲不一致的指标至 0-1 范围。",
      "多维平衡性: 观察多边形的均匀度。极度不规则意味着资源分配极度不均，可能存在局部优势掩盖系统性缺陷。"
    ]
  },
  "vchart_rose": {
    "meta": {
      "id": "rose",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_rose",
      "qcTool": "ROSE",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "rose",
      "displayName": "VChart 南丁格尔玫瑰图",
      "intents": [
        "玫瑰图",
        "南丁格尔图",
        "rose chart"
      ],
      "expertise": [
        "多维占比对比",
        "极坐标可视化",
        "视觉冲击力呈现"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "rose",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**严禁跨系挂载 (Warning)**: 严禁配置 `orient` 笛卡尔轴。玫瑰图工作在极坐标系下。",
            "**数据容器**: 严格遵循 Top-level 数组结构。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "类型声明:",
        "meaning": "\"type\": \"rose\"。",
        "values": [],
        "argShape": "",
        "example": "类型声明: \"type\": \"rose\"",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "字段绑定:",
        "meaning": "categoryField 与 valueField。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: categoryField",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "视觉标注:",
        "meaning": "必须开启 \"label\": { \"visible\": true }。",
        "values": [],
        "argShape": "",
        "example": "视觉标注: \"label\": { \"visible\": true }",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "供应商异常反馈分布 (玫瑰图)",
      "dsl": "Title: 供应商异常反馈分布 (玫瑰图)\nColorPalette: vibrant\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"rose\",\n  \"data\": [{ \"values\": [\n    {\"type\":\"物流\",\"v\":400}, {\"type\":\"包装\",\"v\":200}, {\"type\":\"性能\",\"v\":300}, {\"type\":\"外观\",\"v\":150}\n  ]}],\n  \"categoryField\": \"type\", \"valueField\": \"v\",\n  \"outerRadius\": 0.8, \"innerRadius\": 0.2,\n  \"label\": { \"visible\": true }\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "严禁跨系挂载 (Warning): 严禁配置 `orient` 笛卡尔轴。玫瑰图工作在极坐标系下。",
      "数据容器: 严格遵循 Top-level 数组结构。"
    ]
  },
  "vchart_sankey": {
    "meta": {
      "id": "sankey",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_sankey",
      "qcTool": "SANKEY",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "sankey",
      "displayName": "VChart 能量传递/桑基图",
      "intents": [
        "桑基图",
        "能量流图",
        "sankey graph",
        "流转分析"
      ],
      "expertise": [
        "资源流转分析",
        "报文路径建模",
        "流量传递可视化"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "sankey",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**分线图架构 (Node/Children)**: 推荐使用带有 `children` 的层级结构来定义流量，这比扁平的 from/to 在大规模工业拓扑中更具表达力。",
            "**严禁跨系挂载**: 作为关系型图表，**严禁**挂载任何 `orient` 轴，否则渲染崩溃。",
            "**显示标注**: series 中必须配置 `\"label\": { \"visible\": true }`。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "字段绑定:",
        "meaning": "categoryField 对应节点 ID，valueField 对应节点权重/流量大小。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: categoryField",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "生产资源流转路径分析",
      "dsl": "Title: 生产资源流转路径分析\nColorPalette: industrial\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"sankey\",\n  \"data\": [\n    {\n      \"values\": [\n        {\n          \"nodes\": [\n            { \n              \"name\": \"总投入\", \n              \"children\": [\n                { \"name\": \"原料A\", \"value\": 160, \"children\": [{ \"name\": \"工序1\", \"value\": 160 }] },\n                { \"name\": \"原料B\", \"value\": 120, \"children\": [{ \"name\": \"工序1\", \"value\": 120 }] },\n                { \"name\": \"原料C\", \"value\": 140, \"children\": [{ \"name\": \"工序2\", \"value\": 140 }] }\n              ]\n            },\n            {\n              \"name\": \"工序1\",\n              \"children\": [\n                { \"name\": \"工序2\", \"value\": 210 },\n                { \"name\": \"废料\", \"value\": 70 }\n              ]\n            },\n            {\n              \"name\": \"工序2\",\n              \"children\": [\n                { \"name\": \"工序3\", \"value\": 290 },\n                { \"name\": \"废料\", \"value\": 60 }\n              ]\n            },\n            {\n              \"name\": \"工序3\",\n              \"children\": [\n                { \"name\": \"产品X\", \"value\": 190 },\n                { \"name\": \"产品Y\", \"value\": 100 }\n              ]\n            }\n          ]\n        }\n      ]\n    }\n  ],\n  \"nodeKey\": \"name\",\n  \"categoryField\": \"name\",\n  \"valueField\": \"value\",\n  \"label\": { \"visible\": true }\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "分线图架构 (Node/Children): 推荐使用带有 `children` 的层级结构来定义流量，这比扁平的 from/to 在大规模工业拓扑中更具表达力。",
      "严禁跨系挂载: 作为关系型图表，严禁挂载任何 `orient` 轴，否则渲染崩溃。",
      "显示标注: series 中必须配置 `\"label\": { \"visible\": true }`。"
    ]
  },
  "vchart_scatter": {
    "meta": {
      "id": "scatter",
      "tier": "relief",
      "family": "vchart",
      "body": "TupleList",
      "mcpName": "render_vchart_scatter",
      "qcTool": "SCATTER",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "scatter",
      "displayName": "IQS 相关性分析/散点图",
      "intents": [
        "散点图",
        "相关性分析",
        "回归分析",
        "scatter"
      ],
      "expertise": [
        "双变量相关性",
        "回归趋势分析",
        "3D 气泡分析"
      ],
      "colorSlots": [
        "Point",
        "Trend"
      ],
      "renderEngine": "echarts",
      "inferenceKey": "scatter",
      "migrated": true
    },
    "soul": {
      "title": "相关性分析 (Correlation)",
      "summary": "散点图是判断两个（或三个）变量之间是否存在相关关系的数学工具。通过观察点集的分布形态，可以得出结论：",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "相关性分析 (Correlation)"
        },
        {
          "kind": "p",
          "text": "散点图是判断两个（或三个）变量之间是否存在相关关系的数学工具。通过观察点集的分布形态，可以得出结论："
        },
        {
          "kind": "ul",
          "items": [
            "**正相关**: X 增加，Y 也随之增加。",
            "**负相关**: X 增加，Y 随之减少。",
            "**不相关**: 点集呈杂乱分布。"
          ]
        },
        {
          "kind": "h",
          "level": 3,
          "text": "回归分析 (Regression)"
        },
        {
          "kind": "p",
          "text": "系统自动计算线性回归线，作为预测模型的基础。通过趋势线，我们可以对未知的 X 值预测其对应的 Y 值位置。"
        },
        {
          "kind": "callout",
          "type": "IMPORTANT",
          "text": "相关性并不等同于因果关系。两个变量表现出强相关，可能是因为它们共同受第三个隐藏变量的影响。"
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "Title:",
        "meaning": "图表标题",
        "values": [],
        "argShape": "",
        "example": "Title: 工艺参数分析",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "XAxis:",
        "meaning": "X 轴标签",
        "values": [],
        "argShape": "",
        "example": "XAxis: 温度(℃)",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "YAxis:",
        "meaning": "Y 轴标签",
        "values": [],
        "argShape": "",
        "example": "YAxis: 压力(MPa)",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "ZAxis:",
        "meaning": "Z 轴标签",
        "values": [],
        "argShape": "",
        "example": "ZAxis: 收缩率%",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "注塑工艺参数三维分析 (温度/压力/收缩率)",
      "dsl": "Title: 注塑工艺参数三维分析 (温度/压力/收缩率)\nXAxis: 模具温度(℃)\nYAxis: 注射压力(MPa)\nZAxis: 收缩率%\nColor[Point]: #0D5E42\nColor[Trend]: #F1C40F\nShowTrend: true\n3D: false\n\n- 195.5, 85.2, 2.4\n- 192.0, 82.5, 2.5\n- 198.5, 88.0, 2.2",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "正相关: X 增加，Y 也随之增加。",
      "负相关: X 增加，Y 随之减少。",
      "不相关: 点集呈杂乱分布。",
      "相关性并不等同于因果关系。两个变量表现出强相关，可能是因为它们共同受第三个隐藏变量的影响。"
    ]
  },
  "vchart_sunburst": {
    "meta": {
      "id": "sunburst",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_sunburst",
      "qcTool": "SUNBURST",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "sunburst",
      "displayName": "VChart 层级穿透/旭日图",
      "intents": [
        "旭日图",
        "多层饼图",
        "sunburst chart",
        "层级穿透"
      ],
      "expertise": [
        "层级穿透分析",
        "组织结构建模",
        "成本纵深可视化"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "sunburst",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**层级数据结构**: 数据必须采用 `children` 嵌套的树形 JSON 格式，包裹在顶层数组内。",
            "**严禁跨系挂载**: 禁制挂载笛卡尔坐标轴。",
            "**中心对齐**: 自动计算圆心，支持从内向外的占比逻辑解析。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "字段绑定:",
        "meaning": "categoryField 锚定名称，valueField 锚定叶子节点数值及枝干聚合权值。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: categoryField",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "产品成本层级拆解 (旭日图)",
      "dsl": "Title: 产品成本层级拆解 (旭日图)\nColorPalette: vibrant\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"sunburst\",\n  \"data\": [ {\n      \"values\": [ {\n          \"name\": \"总成本\",\n          \"children\": [\n            { \"name\": \"材料\", \"value\": 500, \"children\": [{ \"name\": \"铝材\", \"value\": 300 }] },\n            { \"name\": \"人工\", \"value\": 400 }\n          ]\n        } ]\n    } ],\n  \"categoryField\": \"name\", \"valueField\": \"value\",\n  \"label\": { \"visible\": true }\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "层级数据结构: 数据必须采用 `children` 嵌套的树形 JSON 格式，包裹在顶层数组内。",
      "严禁跨系挂载: 禁制挂载笛卡尔坐标轴。",
      "中心对齐: 自动计算圆心，支持从内向外的占比逻辑解析。"
    ]
  },
  "vchart_treemap": {
    "meta": {
      "id": "treemap",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_treemap",
      "qcTool": "TREEMAP",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "treemap",
      "displayName": "VChart 资产矩形/树图",
      "intents": [
        "树图",
        "矩形树图",
        "treemap",
        "空间比例"
      ],
      "expertise": [
        "空间占比映射",
        "资产分布呈现",
        "矩形树图可视化"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "treemap",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**递归深度**: 支持深层嵌套结构解析。父节点的面积等于所有子节点面积之和。",
            "**无轴约束**: 禁止配置坐标轴。利用几何空间的矩形分割展示比例关系。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "字段绑定:",
        "meaning": "categoryField 用于节点标注，valueField 用于计算矩形权重。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: categoryField",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "固定资产分布比例图",
      "dsl": "Title: 固定资产分布比例图\nColorPalette: deep\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"treemap\",\n  \"data\": [ {\n      \"values\": [ {\n          \"name\": \"总资产\",\n          \"children\": [\n            { \"name\": \"生产设备\", \"value\": 500 }, { \"name\": \"IT设备\", \"value\": 150 }\n          ]\n        } ]\n    } ],\n  \"categoryField\": \"name\", \"valueField\": \"value\",\n  \"label\": { \"visible\": true }\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "递归深度: 支持深层嵌套结构解析。父节点的面积等于所有子节点面积之和。",
      "无轴约束: 禁止配置坐标轴。利用几何空间的矩形分割展示比例关系。"
    ]
  },
  "vchart_waterfall": {
    "meta": {
      "id": "waterfall",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_waterfall",
      "qcTool": "WATERFALL",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "waterfall",
      "displayName": "VChart 变动归因/瀑布图",
      "intents": [
        "瀑布图",
        "变动归因图",
        "waterfall chart",
        "成本拆解"
      ],
      "expertise": [
        "价值流分析",
        "变动归因建模",
        "成本拆解可视化"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "waterfall",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**终值标记**: 必须在最后一个数据点中使用标记字段（如 `isTotal: true`），并在 Spec 中通过 `total` 字段绑定，以确立总计柱的悬空基准。",
            "**笛卡尔闭环**: 必须显式包含 `bottom` 和 `left` 轴。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "关键字定义:",
        "meaning": "\"total\": { \"tagField\": \"isTotal\" } 用于识别总计项。",
        "values": [],
        "argShape": "",
        "example": "关键字定义: \"total\": { \"tagField\": \"isTotal\" }",
        "status": "supported",
        "required": false,
        "notes": ""
      },
      {
        "name": "配色语义:",
        "meaning": "自动识别数值正负并分配上升/下降色系。",
        "values": [],
        "argShape": "",
        "example": "配色语义: <值>",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "质量成本变动归因分析",
      "dsl": "Title: 质量成本变动归因分析\nColorPalette: vibrant\nShowTitle: true\nShowLabel: true\nAnimation: false\n\nSpec: {\n  \"type\": \"waterfall\",\n  \"data\": [ {\n      \"values\": [\n        { \"x\": \"起始成本\", \"y\": 1000 },\n        { \"x\": \"材料波动\", \"y\": 200 },\n        { \"x\": \"工艺改进\", \"y\": -150 },\n        { \"x\": \"最终成本\", \"y\": 1050, \"isTotal\": true }\n      ]\n    } ],\n  \"xField\": \"x\", \"yField\": \"y\",\n  \"total\": { \"tagField\": \"isTotal\" },\n  \"label\": { \"visible\": true },\n  \"axes\": [\n    { \"orient\": \"bottom\", \"label\": { \"visible\": true } },\n    { \"orient\": \"left\", \"label\": { \"visible\": true } }\n  ]\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "终值标记: 必须在最后一个数据点中使用标记字段（如 `isTotal: true`），并在 Spec 中通过 `total` 字段绑定，以确立总计柱的悬空基准。",
      "笛卡尔闭环: 必须显式包含 `bottom` 和 `left` 轴。"
    ]
  },
  "vchart_wordcloud": {
    "meta": {
      "id": "wordCloud",
      "tier": "relief",
      "family": "vchart",
      "body": "Unknown",
      "mcpName": "render_vchart_wordcloud",
      "qcTool": "WORDCLOUD",
      "version": "1.0",
      "parentType": "vchart",
      "subType": "wordCloud",
      "displayName": "VChart 异常字符/词云图",
      "intents": [
        "词云",
        "字符图",
        "wordcloud",
        "关键词热力"
      ],
      "expertise": [
        "舆向画像分析",
        "文本挖掘呈现",
        "关键词热度可视化"
      ],
      "colorSlots": [],
      "renderEngine": "echarts",
      "inferenceKey": "wordCloud",
      "migrated": true
    },
    "soul": {
      "title": "专家灵魂 (The Soul)",
      "summary": "",
      "blocks": [
        {
          "kind": "h",
          "level": 3,
          "text": "专家灵魂 (The Soul)"
        },
        {
          "kind": "ul",
          "items": [
            "**驼峰命名**: 必须使用 `wordCloud` (非小写) 作为 type 声明。",
            "**无轴约束**: 禁止配置坐标轴。所有信息通过节点的空间排布与文字大小表示。",
            "**显示标注**: 应配合 `valueField` 通过字号大小直观表达权重。"
          ]
        }
      ]
    },
    "syntaxRows": [
      {
        "name": "字段绑定:",
        "meaning": "nameField 定义文本内容，valueField 定义权重频率。",
        "values": [],
        "argShape": "",
        "example": "字段绑定: nameField",
        "status": "supported",
        "required": false,
        "notes": ""
      }
    ],
    "example": {
      "title": "巡检异常关键词画像",
      "dsl": "Title: 巡检异常关键词画像\nColorPalette: forest\nShowTitle: true\nShowLabel: false\nAnimation: false\n\nSpec: {\n  \"type\": \"wordCloud\",\n  \"data\": [{ \"values\": [\n    {\"name\":\"故障\",\"value\":100}, {\"name\":\"波动\",\"value\":80}, {\"name\":\"纠偏\",\"value\":40}\n  ]}],\n  \"nameField\": \"name\", \"valueField\": \"value\"\n}",
      "notes": ""
    },
    "counterexamples": [
      {
        "bad": "```dsl\nTitle: xxx\n```",
        "good": "Title: xxx",
        "reason": "禁止 Markdown 代码围栏 —— 只输出纯文本 DSL。"
      },
      {
        "bad": "{\"Title\": \"xxx\"}",
        "good": "Title: xxx",
        "reason": "`dsl` 必须是纯文本字符串，不是 JSON 对象。"
      },
      {
        "bad": "这是根据您的需求生成的图表：\nTitle: xxx",
        "good": "Title: xxx",
        "reason": "禁止解释性前后缀。"
      }
    ],
    "outputControls": [
      "纯文本 DSL，禁止 Markdown 围栏与解释性前后缀。",
      "禁止把 dsl 参数写成 JSON 对象。",
      "只输出**纯文本 DSL**：禁止 Markdown 代码围栏（```）、禁止解释性前后缀、禁止把 `dsl` 写成 JSON 对象。",
      "行注释统一用 `//`；`#` 仅在 body=Tree 的 kind（鱼骨图）中作**层级结构**，其余 kind 的 `#` 行一律视为历史兼容注释、不要模仿。",
      "结构分隔符用**半角**（逗号 `,`、斜杠 `/`）；标签/说明文字内部如需标点请用**中文全角**（，、；：）。",
      "本 kind 属 RELIEF 救济层：**不得**用于 QC 成果书的统计终稿（SPC / 排列图 / 直方图等）。",
      "VChart 必须使用 `Title:` + `Spec:` 的文本外壳，Spec 内为 100% 静态 JSON，禁止函数与注释。"
    ],
    "promptNotes": [
      "驼峰命名: 必须使用 `wordCloud` (非小写) 作为 type 声明。",
      "无轴约束: 禁止配置坐标轴。所有信息通过节点的空间排布与文字大小表示。",
      "显示标注: 应配合 `valueField` 通过字号大小直观表达权重。"
    ]
  },
};

export function getCardDoc(kind: string): CardDocEntry | undefined {
  return CARD_DOCS[kind];
}
