# IQS-Flow 主干序排序键 + 编辑器导出契约 实施记录

> **文档状态**: 实施记录 / 已验证（过程留痕）
> **基线**: `main @ c2d6acd`（上一轮对角算子 + 死代码清理 + 最优性框架）
> **本次**: 主干序排序键部件 + flowToDsl vh 回写（P1/P2 落地，接入 autoSeq 待评估）
> **框架文档**: `FLOW_OPTIMALITY_FRAMEWORK.md` §2 A6 / §6 P1-P6

---

## 0. 背景与决策（多轮讨论收敛）

围绕"关键路径优先摆放"的讨论，最终共识（在「编辑器外壳」前提下）：

1. **编辑器导出契约（采纳）**：`flowToDsl` 应写全位置事实（`Location` + 同格 `vh`），使 DSL 可精确往返（round-trip）。编辑器产出的 DSL **位置完备**，无需解析器兜底猜位置。
2. **主线定义（采纳建议）**：**复用现有 `default` 边**作为业务主干，**不新增 `Main` 语法**——理由：主线是"边序列"而非"节点集合"，节点级 `Main=true` 无法表达"网关走哪条出口"；且现有 `default` 已表达出口优先级。新增语法违背"最小可行 + 零新语法"原则。
3. **C3（显式 Main）→ 移除**：判定冗余 + 落点语义错误（应落边非节点）。
4. **`autoSeq` 改主干序推进（C2）**：算法部件已落地（本文件 §2），**接入 autoSeq 属行为变更，按守护流程单独评估**（§4）。

## 1. 改动清单

| # | 文件 | 性质 | 验证 |
|:---|:---|:---|:---|
| P1 | `components/flow/FlowEditor.tsx` | `flowToDsl.emitNode` 回写格内 `vh` 标注（`V/H/D`，行尾、在 `Attach` 之后，与 parser 解析顺序兼容）；编辑器导出契约 | tsc 0 errors + 全量断言零回归 |
| P2a | `components/flow/MainlineOrder.ts`（**新建**） | `computeMainlineOrder(nodes, edges, opts?)` 纯函数：SCC 去环 → DAG → `(default bonus, 节点数)` 最长路 DP → 还原主线 → 输出主干优先拓扑序 | 单测 8 项 |
| P2b | `scripts/assert_mainline.ts`（**新建**） | 4 组单测：直线链序 / default 优先 / 环去环不卡死 / parent 过滤 | 8 pass |
| P2c | `package.json` | `test:flow` 接入 `assert_mainline.ts` | 全量回归 |

## 2. 主干序算法要点（MainlineOrder.ts）

- **输入**：顶层 `nodes`/`edges`（`parent` 子流程内部不参与）。
- **步骤**：① 邻接表 → ② Tarjan SCC 缩点去环（有环图上"节点数最多路径"非良定义，须先去环）→ ③ 建 DAG 并去重边、计入度 → ④ Kahn 拓扑序 → ⑤ 逆拓扑 `(bonus, count)` 元组最长路 DP（`default` 边 `bonus=+10`，使业务主干优先；同分取节点数多者）→ ⑥ 起点 = 入度 0 且含 `start`（退化取第一个）→ ⑦ 沿 `best.next` 还原主线串（防环兜底 `guard`）→ ⑧ 输出主线节点先、其余按拓扑序、遗漏兜底。
- **数学性质**：纯函数、确定性、无副作用；SCC 缩点保证任意含环图不卡死（`guard` 护）。

## 3. 验证记录（实证）

```
npm run test:flow  → parser 60 / svg 61 / bpmn 17 / mainline 8 = 146 pass，0 fail（既有 138 零回归 + 新增 8）
npx tsc --noEmit   → 0 errors
```
期间修正 1 处单测用例：`node('x')` 初始未设 `parent='sub'`，x 被当作孤立顶层节点（算法兜底正确地保留了无 parent 的孤立节点，非算法 bug）；补 `parent` 后 `parent: 内部节点 x 不参与` 通过。

## 4. autoSeq 接入影响评估（未接入，待下一步）

**现状**：二维 `autoSeq` 用「行优先扫描第一个空位」（`flowToSVG.ts` L472-483），无 `Location` 节点按声明序填充。

**接入方案**：将二维 `autoSeq` 的填充顺序改为 `computeMainlineOrder` 结果，使无 `Location` 节点沿主干优先落格（替代行优先扫描）。

**影响面预判**：
- 现有 `test:flow` 大量无 `Location` 样例集中在**单维 / 无泳道**语义测试（子流程、回边、校验），走单维分支（L452-470）或 1×1 ROOT 格，**不受二维改动影响**。
- 真正走二维 `autoSeq` 的是**二维泳道 + 无 `Location`** 样例——需实测确认数量与行为。
- 属**行为变更**，须：独立 commit + 全量断言回跑 + 逐条核对受影响断言语义是否合理（而非盲目改断言）+ Φ 统计（绕外侧边数/Σbends/Σlen 不降即回滚）。

**结论**：算法部件已落地锁定（可单测），接入 autoSeq 作为下一步独立守护流程，**本轮不接入**（避免在无可视化基线对照下贸然改动布局行为）。

## 5. 验收指南

```bash
npm run test:flow     # 预期 60/61/17/8 全绿（146）
npx tsc --noEmit      # 预期 0 errors
```
`computeMainlineOrder` 可直接 import 单测（`assert_mainline.ts` 已锁定 4 类行为）。

## 6. 遗留（下一步，依序）

1. **接入 autoSeq**：二维无 `Location` 节点落格序改为主干序（守护流程实测断言影响）。
2. **同格组内顺序**改为主干序（`group` 内 vh 链序）。
3. 编辑器导出契约完整化（`vh` 已回写；`Location` 原已回写）。
4. （可选的 P3 下一档：水平射线松弛覆盖主干流等，见 `FLOW_OPTIMALITY_FRAMEWORK.md` §6）。

*记录人: 智能体辅助实施（基线 c2d6acd，全程命令级留痕）*
