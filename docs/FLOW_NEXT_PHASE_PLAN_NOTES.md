# IQS-Flow 下一阶段综合方案 · 过程记录

> **文档状态**: 过程留痕（只追加、不覆盖历史）
> **对应方案**: `docs/FLOW_NEXT_PHASE_PLAN.md`
> **约定**: 后续凡修订 FLOW 代码 / 编辑器 / MCP 声明 / 本方案正文，必须在本文追加一节（基线 commit、文件表、验证、未做项）。见方案 §10。

---

## 2026-09-02 · 方案立项（审阅落盘，无代码行为变更）

### 0. 任务

用户要求：检视工程文档与 FLOW 组件；围绕文档数学方法与意图做设计/实现/文档审阅；给出功能完善建议；并完成三件独立事项的详细方案：

1. 代码改善和完善方案
2. FLOW 左侧 editor 与其它组件形式一致（美化与布局）
3. FLOW DSL 的 MCP 声明，使外部大模型能准确理解并在内部引擎绘制

同时：后续修订必须同步落盘过程记录。调研路径：`docs/` 中 FLOW 文档 + commit 历史。

### 1. 基线

- 分支: `main`（相对 `origin/main` ahead 10）
- HEAD: `6b805d9` `feat(flow): 交叉格内排序 computeCellOrder —— 格内拓扑序 + 缺省 vh 派生`
- 断言口径（文档/package.json）: parser 60 + svg 61 + bpmn 17 + mainline 8 + cell_order 8 = **154**
- 本轮 **未改** `components/flow/*`、未跑行为变更、未 push

### 2. 调研范围（实证）

| 面 | 对象 |
|:---|:---|
| 文档 | `docs/FLOW_*` 24 篇 + `IQS_FLOW_DSL_SPEC.md` + `USER_MANUAL_FLOW.md` + `FLOW_OPTIMALITY_FRAMEWORK.md` 等 |
| 协议 | `protocol/segments/flow.md`、`protocol/DSL_V1.md`、`dsl/kinds.json` |
| 语法指南 | `output/flow-syntax-guide/`（00/01/02 落地，03–17 空链） |
| 代码 | `components/flow/` 8 文件（Parser 690 / flowToSVG 1058 / Router 454 / Editor 311 / Diagram 178 / CellOrder 108 / Mainline 148 / Bpmn 114） |
| 断言 | `scripts/assert_flow_{parser,svg,bpmn}.ts` + `assert_mainline.ts` + `assert_cell_order.ts` |
| UI 对照 | 15 个 `*Editor.tsx` + `layout/Workspace.tsx`（420px 深色侧栏） |
| MCP | `mcp-server/index.js`（thin catalog + kind 资源拼接）+ `mcp_tools.json` `render_flow` + `services/aiService.ts` |
| 历史 | `git log` `components/flow/` ≈ 71 commits；从 v3 网格 → P0/ALIGN/三阶段/M0-M3 → 代数路由 → A6/CellOrder |

### 3. 关键发现（压缩）

**数学 / 意图**

- 权威上限应是 FRAMEWORK §0 分层表，不是 PROOF/ALGEBRAIC 的「全局最优」口号。
- 统一泛函 Φ 的 \(w_S\cdot shift=150\) 在代码中无处安放；T2 守护位移未实现。
- A1–A6 中 A6 已落地；A3 无 J\* 合并（已勘误）；A4 兜底 L 可穿盒。
- G2 完整走廊腾挪曾实施，实测绕行 2→4，commit `343bcd3` 回退。这是后续腾挪必须走 T2 的工程依据。
- 用户确认时序 a/b/c：落格 → CellOrder（vh 保持）→ 连线。MainlineOrder 可测未接 autoSeq。

**文档**

- 现行规范滞后：SPEC 标头仍 40+41；手册 §5 仍 111；DSL_V1 核心 kind 写 13、漏 flow；协议末行损坏 `Riverside,`。
- CELL_ORDER / NDATA 设计文头仍写「待实施」，代码已做。
- 语法指南 03–17 未写，不能当实现依据。
- 代价函数至少四套权重并存，方案已拍板冻结为代数 `100 / 0.01 / 150`。

**代码**

- 交付度高（评估约 90%），走线层与「就近走廊」仍有结构性差距（腾挪回退 + 无 T2）。
- `flowToSVG.ts` 文件头仍描述已删旧引擎。
- FlowEditor 是浅色 IDE 轨，与 LUXI LAB 深色侧栏撕裂；无手动 Tab / Header / 重置。

**MCP**

- `list_tools` 已瘦身（正确）；kind 资源拼的是 json 缩水 syntax，不是 `flow.md`。
- 与 `render_mermaid_flowchart` 抢「流程图」意图。
- CallTool 失败不回 parser errors；`generateLogicDSL` constraint 5 把 flow 当成 `# 分类`；`max_tokens: 2000` 偏紧。

### 4. 本轮落盘文件

| 文件 | 性质 | 验证 |
|:---|:---|:---|
| `docs/FLOW_NEXT_PHASE_PLAN.md` | **独立详细方案**（审阅 + A 代码 + B 编辑器 + C MCP + 里程碑 + 治理约定） | 人读评审；无代码 |
| `docs/FLOW_NEXT_PHASE_PLAN_NOTES.md` | 本过程记录（本节） | — |

方案拍板摘要（详见正文，此处只留索引）：

- 数学承诺上限 = FRAMEWORK 分层表；不承诺一般图全局最优
- 腾挪只允许 T2；Tier1 主干 `gridY=0` 加惩罚闭合「稀疏 vs 平齐」
- N/DATA 保留 DOC 虚拟列；端点 = 贴边中点 + stub 到走廊
- Editor 套 Fishbone 壳；默认手动 Tab
- MCP L0 路由卡 / L1 编译卡 / 调用回 parser 诊断；模型只写语义、不排像素
- 里程碑顺序：M-Doc → M-UI → M-MCP → M-Fix → M-Ord → M-T2（M-Man 可并行）

### 5. 验证

本轮无代码变更，未跑 `test:flow` / `build`（行为未动）。基线断言以 `package.json` 的 `test:flow` 五脚本与 CELL_ORDER §6.4 记录的 154 为准；执行首个代码里程碑前应先复跑一次作为对照。

### 6. 未做（留给里程碑，不是遗漏）

- 未改 SPEC/手册/协议正文（留给 M-Doc）
- 未改 FlowEditor（留给 M-UI）
- 未改 mcp-server / agent 卡（留给 M-MCP）
- 未实现 T2 / autoSeq 接线（留给 M-Ord / M-T2）
- 未补语法指南 03–17（M-Opt）

### 7. 下一步

方案完稿，待用户确认后从 **M-Doc**（文档勘误，零行为风险）起执行。每步追加本节之后的新章节，不改写本节。

---

*记录人: 智能体辅助审阅*
*状态: 立项记录完稿*
