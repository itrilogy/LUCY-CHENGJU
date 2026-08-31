# IQS-Flow 最优性框架实施过程记录（A6 对角算子 + 死代码清理 + 文档纠偏）

> **文档状态**: 实施记录 / 已验证（过程留痕，供追溯与查证）
> **基线**: `main @ 2cda7aa`（工作区干净起点）
> **本次提交**: 基线的直接子提交（`feat(flow)` 对角算子 + 死代码清理 + 最优性框架落盘）
> **框架文档**: `FLOW_OPTIMALITY_FRAMEWORK.md`（公理 A1-A6 / 引理 L0-L2 / 定理 T1-T4 / 分层最优声明）

---

## 1. 改动清单（文件 × 性质 × 验证方式）

| # | 文件 | 性质 | 验证 |
|:---|:---|:---|:---|
| 1 | `types.ts` | `FlowNode.vh` 类型扩展 `'V' \| 'H'` → `'V' \| 'H' \| 'D'`（A6 对角标识） | tsc 0 错误 + parser 断言 |
| 2 | `components/flow/FlowParser.ts` | vh 解析正则 `([VH])` → `([VHD])` + 内部条件同步 + 注释更新；非法标识不误吞 | parser 断言 `diag: vh=D 解析` / `非法标识不误吞` |
| 3 | `components/flow/flowToSVG.ts`（cellXY） | 链式排布分支新增 `D` → `gx++ 且 gy++`（对角右下）；nx/ny 已有 max 语义自动吸收，**连线引擎零改动** | svg 断言 3 条几何关系 |
| 4 | `components/flow/flowToSVG.ts`（清理） | 删除旧引擎死代码：`nodeBoxes` / `getMidpointPort` / `getCorridorPort` / `segIntersectsBox` / `routeHits` / `isPortBlocked`（主路径早已由 `AlgebraicFlowRouter` 承接，grep 确认无调用链）；保留 `type Port/Box`（`allBoxes` 等仍用）；留清理注释 | tsc 0 错误 + 全量断言（行为不变证明） |
| 5 | `scripts/assert_flow_parser.ts` | 新增 3 条对角断言（D 解析 / V 保持 / Z 不误吞） | 运行通过 |
| 6 | `scripts/assert_flow_svg.ts` | 新增 4 条对角断言（无解析错误 / B 相对 A 对角右下 / C 相对 B 正下同槽 / 行高被 ny≥3 推动） | 运行通过 |
| 7 | `docs/FLOW_OPTIMALITY_FRAMEWORK.md` | 新建：最优性完备框架设计（§0 分层结论表 / §1 统一泛函 / §2 公理 A1-A6 / §3 引理 L0-L2 / §4 定理 T1-T4 / §5 文档修正 / §6 实施路线 P1-P6 / §7 验收） | 设计文档（评审对象） |
| 8 | `docs/FLOW_ROUTING_MATH_AND_IMPLEMENTATION.md` | **勘误**：§2.2.3「线路合并已接入」标注代码未实现（J\* 合并零命中，仅端口复用+箭头去重近似承接 A3） | grep `merge\|合并` components/flow 零命中（勘误依据） |
| 9 | `docs/FLOW_LAYOUT_ENGINE_DESIGN.md` | ② 交叉格排布表补 D 行 + 尾注断言数 40/41 → 60/61/17=138（消除过时失真） | 与实测一致 |
| 10 | `docs/IQS_FLOW_DSL_SPEC.md` | §11 渲染规格第 3 条「格子内排布」补 D 标识语义 | 与 parser 实现一致 |
| 11 | `docs/FLOW_OPTIMALITY_EXECUTION_NOTES.md` | 本文件（过程记录） | — |

## 2. 验证记录（全量实证）

- **环境**: `node`/`npm` 位于 `/opt/homebrew/bin`（已确认可用）。
- **断言**: `npm run test:flow` → **parser 60 pass / svg 61 pass / bpmn 17 pass，0 fail**（基线 57+57+17=131 → 138，新增 7 条全过，既有 131 条零回归）。
- **类型**: `npx tsc --noEmit` → **0 errors**。
- **未跑**: `npm run build`（vite 全链打包）——未改构建链路文件，断言+tsc 已覆盖本次改动面；验收时可自行补跑。

### 过程中的两次修正（如实留痕）

1. **对角 svg 样例初版失败**（`diag: 无解析错误 — 至少需要一个开始/结束节点`）：样例 DSL 缺 `Type[S]/Type[E]`，属**样例设计疏漏**而非引擎缺陷；修正为扩列 `Lane from D[0,1]` 并置 S/E 于第二列后通过。核心几何断言（对角右下/正下/行高扩展）首次运行即全过。
2. **tsc 重复标识符**（`Duplicate identifier 'Port'/'Box'` ×4）：死代码清理的 edit old_string 未包含原有 type 行，致插入块与原 type 并存；合并去重后 0 错误。教训已留注释于源码。

## 3. 验收指南（人工复核）

```bash
npm run test:flow     # 预期: 60 / 61 / 17 全绿
npx tsc --noEmit      # 预期: 0 errors
npm run build         # 可选全链
```

**对角功能验收样例**（同格三节点 a→D→b→V→c，b 应落在 a 的对角右下方，c 在 b 正下方，整行行高按 ny=3 统一扩展）：

```
Title: 对角扩展格验收
Dict: D[甲,乙]
Dict: P[一]
Lane from D[0,1] Layout H
Lane from P[0] Layout V
W: a: 节点A Location(D[0],P[0])
W: b: 节点B Location(D[0],P[0]) D
W: c: 节点C Location(D[0],P[0]) V
W: s: 开始 Type[S] Location(D[1],P[0])
W: e: 结束 Type[E] Location(D[1],P[0]) V
```

（该样例已被 `assert_flow_svg.ts` 锁定为回归断言，与人工目测互为印证。）

## 4. 遗留项（未实施，均已在 FRAMEWORK §6 排期）

| 项 | 未实施原因 |
|:---|:---|
| P3 水平射线松弛覆盖同行主干流（对齐 flowToSVG 注释与实现） | 改变现有布局行为，影响既有断言快照，须按守护流程（独立 commit + 全量断言 + Φ 统计）实施 |
| P4 T2 守护位移算子（受益/受害边集枚举 + ΔΦ 判定 + 回滚） | 同上；这是「腾挪 2→4 恶化」教训的数学化根治，是下一主项 |
| P5 T3 布线层 ILP 黄金基线（离线 CBC） | 需引入求解器依赖，先离线后评估 |
| P6 M8 合并算子 + T3' 受限类证明 | 先证引理再实现 |
| 共端口入线末端微错位 / 回边判定词表去硬编码（`isExplicitBack`） | 同属行为变更类，纳入 P4 后批次 |

*记录人: 智能体辅助实施（全程命令级留痕，基线 2cda7aa）*
