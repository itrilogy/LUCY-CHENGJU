# IQS-Flow 审计发现台账（增量）

> **用途**：逐轮记录 FLOW 组件的审计发现，**只追加、不覆盖**。每条有稳定编号，供修复时逐条对账。
> **审计对象**：DSL 范式（生成/解析）、MCP 解释与加工、布局与布线数学、BPMN 交换层。
> **状态图例**：
> - `已确认` — 有可复现命令或代码定位，结论成立
> - `部分确认` — 现象成立但影响面/严重度待定
> - `未复现` — 探针未能复现，机制推断保留为风险
> - `已排除` — 审计后确认非缺陷
> **级别**：`P0` 产出错误结果且无诊断 / 阻塞核心承诺 ｜ `P1` 语义或合规错误 ｜ `P2` 完备性缺口 ｜ `P3` 文档·命名·一致性
> **复现环境**：Node v26.5.0，`node --experimental-strip-types`；探针置于 `/tmp/flowreview/`（不入库）
> **基线**：`npm run test:flow` = 184 pass / 0 fail（parser 66 + svg 85 + bpmn 17 + mainline 8 + cell_order 8）

---

## 轮次索引

| 轮次 | 日期 | 主题 | 新增条目 | 区间 |
|:---:|:---|:---|:---:|:---|
| R1 | 2026-09-12 | DSL 范式生成/解析 + MCP 解释加工 逻辑完备性 | 26 | 001–026 |
| R2 | 2026-09-12 | 布局·布线数学细节完备性 + 四维工程目标 | 30 | 027–056 |
| R3 | 2026-09-12 | 运行期实证（T2/A4/L2/键序/尺度）+ 需求文档对照 + 断言覆盖度 | 10 | 059–068 |
| R4 | 2026-09-12 | 门禁体系 + 生成侧（AI/默认样例）+ 往返一致性 + 浮点判据 | 6 | 069–074 |
| R5 | 2026-09-12 | 编辑器回写路径 + headless 桥 + 算法状态文档 + 已证伪/未证数学命题 | 7 | 075–081 |
| R6 | 2026-09-12 | **V-09 量化 L2 gap**（网格精确最优基线对照，32 条边） | 3 | 083–085 |
| R7 | 2026-09-12 | **目标重估**：对齐优先（Visio 式标准化）视角下的实测缺陷 + 既有方案结合路线 | 5 | 086–090 |
| R8 | 2026-09-12 | **方案 B 布局内核原型实证** + R7 两处先验判断勘误 | 2 | 091–092 |
| R9 | 2026-09-12 | **依赖层评估**（实测 npm 三包）+ L4 布线层决策修正为路径 B | 2 | 093–094 |
| R10 | 2026-09-12 | 路径 B 布线内核实现与四方对比验证（v1 失败 → v2 "成功"） | 3 | 095–097 |
| R11 | 2026-09-12 | **R10 勘误**：`prev` 前驱链 bug 致 v2 指标虚假；修正后 v2 反劣化 → 定位正确路线（两阶段分离） | 3 | 098–100 |
| R12 | 2026-09-12 | 路径 B v3（纯搜索 + nudging 后处理）：nudging 未生效/有害；**内核路线定案** | 2 | 101–102 |
| R13 | 2026-09-12 | 数学方向 D1/D2/D3/D6 验证 → **折弯瓶颈定位为端口分配** | 1 | 103 |
| R14 | 2026-09-12 | **D3 落地验证**：端口坐标下降（带 A1）达成方案 B Σ折弯 35→22（−37%） | 2 | 104–105 |
| R15 | 2026-09-12 | **D2 × D3 叠加**：方案 B 布局下「免费改善」（折弯不变、吸附 +48pp、回折 −4） | 1 | 106 |
| R16 | 2026-09-12 | **W7**：4 方向状态消除回折 + 吸附缺口归因与口径建议 | 1 | 107 |
| R17 | 2026-09-12 | **W8/W9 通用性验证与混合内核**：9 类图 × 2 布局（143 边）零回退，Σ折弯 −45% | 2 | 108–109 |
| R18 | 2026-09-12 | **W10 转生产落地完成**：2 个新模块 + `flowToSVG` 13 行改动，184 断言零回归，Σ折弯 −45% | 1 | 110 |
| R19 | 2026-09-12 | **W11 完整执行下一批**：停 T2 / 删射线松弛 / 判据补符号 / 对齐不变量 CI / 文档迁移 | 5 | 111–115 |
| R20 | 2026-09-12 | **AI 推理卡专项审计**（14 kind 全部供给 LLM 的范式材料 + MCP 分发设计）：三源漂移量化 · 7 条卡-实现冲突 · 22 条发现 | 22 | 116–137 |

---

## R1 · DSL 范式与 MCP 逻辑完备性

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-001 | P0 | 解析·默认流 | 分支扇出处默认顺序流误连：spec §8.1 正例 A 解析出多余的 `w4 → w5`（"是"分支目标 →"否"分支目标），两条互斥分支被串成串行 | `probe1`；`FlowParser.ts:266-291` `suppressDefaultIn` 为死代码（命中目标 b 的默认入边源恒为网关 src，而网关作源恒被 `:316-317` 跳过） | 已确认 |
| FLOW-AUD-002 | P0 | 样例·官方正例 | spec §8.1 / `flow.agent.md` 正例 A / `mcp_tools.json#official_example` 三处同源样例自身断链：`w4` 无出边 | `probe1` edges 集合 | 已确认 |
| FLOW-AUD-003 | P1 | 解析·分支 | 分支目标省略（`是 →` 不写 `#id`）被静默丢弃：`parseBranchLine` 返回 `null` 后 `continue`，无 error 无 warn | `probe2 C5`；`FlowParser.ts:628`／`:280` | 已确认 |
| FLOW-AUD-004 | P1 | 解析·块闭合 | 缺 `End` 不报错：分支块未闭合零错误；子流程块未闭合导致后续顶层节点被吞入子流程 | `probe2 C1/C2`；`FlowParser.ts:222-227` 只处理多余 End，不查栈残留 | 已确认 |
| FLOW-AUD-005 | P1 | 解析·坐标 | `Location` 键序敏感：`Location(P[1],D[0])` 静默失配并回退自动落格 | `ExcelLayout.ts:79-87` `cellKeyOf` 取 `Object.keys[0]/[1]` 拼 key | 已确认 |
| FLOW-AUD-006 | P1 | 解析·坐标 | 无 `Lane from` 时 `Location` 被全部清空为 `null` 且**零告警**（spec §5.3 承诺 warn） | `probe2 C6`；`FlowParser.ts:338-341` | 已确认 |
| FLOW-AUD-007 | P2 | 布局·N/DATA | DOC 虚拟列对齐失效：attach 目标无显式 `cell` 时 DOC 节点固定落 `ri=0` | `ExcelLayout.ts:226` `attachRowOf` 的 `!t.cell → -1` | 已确认 |
| FLOW-AUD-008 | P1 | 解析·边 | 显式边标签未实现：`w2 → #w3 [超时]` 报"目标 `w3 [超时]` 未定义"（标签被吞进 id） | `probe2 C4`；spec §7.2 与 BNF `edge := id "→" "#" id [label]` 声明支持 | 已确认 |
| FLOW-AUD-009 | P2 | canonical·Attr | `Attr active` 六类聚合提取**全部未实现**：`attrPanel` 仅产出 `{active}`，无 role/sop/lv/time 聚合 | `probe1`；`FlowParser.ts:518`；`types.ts:900` 预留 `sections?` 无人写入 | 已确认 |
| FLOW-AUD-010 | P2 | 渲染·图例 | 岗位图例栏未实现（spec §5.4/§11.6 要求按 Role 出现次数定字重） | `grep 图例 components/flow/` 仅命中"属性图例" | 已确认 |
| FLOW-AUD-011 | P1 | 校验·Attr | §10#17 检查项错位：规则是"指令至多一条"，实现检查"键不得重复"；写两条 `Attr active` 零报错、后者静默覆盖 | `probe2 C3`；`FlowParser.ts:382` | 已确认 |
| FLOW-AUD-012 | P1 | 校验·拓扑 | §10#9 孤立节点判据写反："仅缺入边"或"仅缺出边"永不进入分支，`else if` 那行 warning 为不可达死代码 | `probe2 C5`（`w2` 无入边完全静默）；`FlowParser.ts:454-466` | 已确认 |
| FLOW-AUD-013 | P2 | 校验·引用 | §10#2 被 §10#16 屏蔽：`Location(Q[0])` 只报"维度未在 Lane from 定义"，不报"字典 Q 未定义"，文案误导 | `probe2 C9`；`FlowParser.ts:433-438` 因 `!n.cell` 跳过 | 已确认 |
| FLOW-AUD-014 | P1 | 校验·引用 | §10#2 不覆盖属性值引用：`SOP(标准[0])` 引用未定义字典零报错，图上原样显示 `标准[0]`（违反 §11.4 索引展开）；`Role(R[k])` 校验被 `if(dicts['R'])` 门控 | `probe2 C7/C8`；`FlowParser.ts:386-398` | 已确认 |
| FLOW-AUD-015 | P3 | 校验·分支 | `否则 → #a, #b` 多目标生成 2 条 default 边，触发"每节点至多一条"误报（§7.3 允许分支多目标） | `FlowParser.ts:401-405` | 已确认 |
| FLOW-AUD-016 | P3 | 代码卫生 | 死代码：`autoIdSeq.push(len+1)` 数组当计数器；`ExcelLayout.ts:213` `artifacts` 从不填充致 ALIGN-3 整段（`:591-615`）不可达 | 直读 | 已确认 |
| FLOW-AUD-017 | P1 | 文档·canonical | §9.1 canonical 示例不可复现：缺实现必然产出的 `w2→q1` 默认边；却含 §8.1 DSL 中不存在的 `q2`；还带实现不产出的 `attrPanel` 聚合结构 | `probe1` 对比 spec §9.1 | 已确认 |
| FLOW-AUD-018 | P2 | canonical·契约 | canonical 顶层契约未实现：§9.1 要求 `{"kind":"flow","version":"0.7.0"}`，`FlowData` 无 `kind`/`version` 字段 | `types.ts:905` | 已确认 |
| FLOW-AUD-019 | P3 | 版本 | `FlowParser.ts:3` 标注 `spec (v0.7)`，spec 实为 `0.7.1` | 直读 | 已确认 |
| FLOW-AUD-020 | P2 | 文档·口径 | 三方口径不一：spec §7.2/§7.3 支持显式边标签与分支目标省略；`flow.agent.md` BNF 两者不提；实现两者都不支持 | 三文件对比 | 已确认 |
| FLOW-AUD-021 | P1 | MCP·校验门槛 | `render_flow` 的 lint 门槛过松：所有 001–015 级问题都不阻断，返回 `error: false` + 错图 | `mcp-server/index.js:447-477` | 已确认 |
| FLOW-AUD-022 | P3 | MCP·死参数 | `isJsonLike` 分支引用 `args.sub_type`，但 `inputSchema` 只暴露 `dsl/width/height`，该参数模型无法传入 | `index.js:428` vs `:390-401` | 已确认 |
| FLOW-AUD-023 | P1 | MCP·降级 | lint 失败静默降级：`spawnSync` 超时/启动失败 → `lintFlowDsl` 返回 `null` → 跳过全部校验直接渲染，且不告知模型"未校验" | `index.js:229-245` | 已确认 |
| FLOW-AUD-024 | P3 | MCP·死代码 | 渲染错误分支再次拼接 `flowLint.errors`（`index.js:494-496`）不可达——errors 非空时已在 `:450` 提前返回 | 直读 | 已确认 |
| FLOW-AUD-025 | — | 正面项 | MCP lint 与前端共用同一 `FlowParser`（单一真相源）；`lint_flow.ts` 的 Mermaid 冒充检测落实 governance 红线 7；双通道（stdio base64 / SSE url）与 `parser_errors + hint` 编译卡回执方向正确 | `scripts/lint_flow.ts`、`index.js:201-227` | 已确认 |
| FLOW-AUD-026 | — | 正面项 | 字典-索引范式自洽，索引越界校验（§10#3）实现完整；Tarjan SCC 真环检测取代近似判定（§10#13）正确 | `FlowParser.ts:416-427`、`scc.ts` | 已确认 |

---

## R2 · 布局·布线数学细节完备性

### 数学体系四层（公理 / 引理 / 定理 / 排序键）

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-027 | P0 | 公理 A4 | A4"无碰撞"实为软惩罚：所有候选都碰撞时返回**穿盒路径**（5000 仅参与排序），与公理表述矛盾 | `AlgebraicFlowRouter.ts:456-468`；commit `3614665` "M-Fix A4 穿盒兜底" | 已确认（R3 V-02 实证：4/4 端口组合穿墙）|
| FLOW-AUD-028 | P0 | 公理 A5 / 引理 L1 | L1 正则化引理前提不真：stub 拐点 `s1/t1` 距节点边界 `half`（34px），**不在通道网格上**；且 `computeGridChannels` 用的是**列边界**而非理论 §6 的"列走廊中线"，也不含 `x_u,x_v` | `AlgebraicFlowRouter.ts:320-321`、`:88-98` vs `FLOW_ROUTING_ALGEBRAIC_THEORY.md` §6 | 已确认 |
| FLOW-AUD-029 | P0 | 引理 L2 / 定理 T1 | L2 同伦类枚举不完备：候选集只有 直连 / L / Z(1 通道) / 双通道（`for xm { for ym }`），即**至多 2 次通道穿越**；绕 3+ 并排障碍的同伦类不在候选内 → "单边全局精确最优"实为"2 通道子空间内最优" | `AlgebraicFlowRouter.ts:350-418` | 已确认（R3 V-03 实证反例）|
| FLOW-AUD-030 | P1 | 定理 T2 | T2 优化的目标函数**不是**公布的 Φ：实际为 `Φ' = Φ + 150·shifts + 200·tier1`，其中 `T2_TIER1_PENALTY=200` 在 `FRAMEWORK` §2/§4 中**完全未定义** → "位移邻域一阶局部最优"是对 Φ′ 而非 Φ | `GuardedShift.ts:19`、`:301-302` | 已确认 |
| FLOW-AUD-031 | P1 | 定理 T2 | 门槛与理论成本表不自洽：实现要求净路由改善 ≥300（`dPhi ≤ -150` 且已含 +150），故 **3 弯→2 弯（改善 200）被拒绝**；§3.2"B≥3 全图收敛到 B≤2"在实现中不成立 | `GuardedShift.ts:302` vs `FRAMEWORK` §3.1/§3.2 | 已确认（R3 V-01b 实证：3 次尝试全被拒）|
| FLOW-AUD-032 | P0 | 定理 T2·盲区 | DOC 虚边不在受害集/目标函数内：`topEdges` 不含 `flowToSVG.ts:375-379` 追加的 `doc_${id}` 依附虚边 → T2 可能接受让 DOC 虚线 0 弯恶化到 4 弯的位移而 ΔΦ 无感 | `GuardedShift.ts:96`、`:183-188` | 已确认 |
| FLOW-AUD-033 | P1 | 证明·终止性 | 终止性论证对象错位：`PROOF` §1.1 证的是**像素** `(x,y)` 单调不减，而算子作用于**槽位**；像素因整列/整行统一扩展（`colWPx = nx_max·(cellW+2half)`）而**非单调**（同列其他节点像素 x 反而变小） | `PROOF` §1.1 vs `ExcelLayout.ts:540-568` | 已确认 |
| FLOW-AUD-034 | P2 | 证明·终止性 | 实际终止靠 `maxIter = max(8, 2E)` 硬上限兜底，**良基性从未被用作论证，也未被断言锁定**；`T2_GRID_BOUND=64` 只是 `propose` 的前置拒绝条件，非形式化上界不变式 | `GuardedShift.ts:284`、`:241/:253/:264` | 已确认 |
| FLOW-AUD-035 | P1 | 排序·CellOrder | 缺省 vh 的 **H/D 推导分支不可达**（死代码）：无 `seedDir` 时 `prevGx` 恒 0 → `upX>0` 永假 → 恒走 V。文档 `FLOW_CELL_ORDER_DESIGN` §1/§5 与 `CellOrder.ts` 注释所述的"上游方位智能推导（y大→V、x大→H、双大→D）"实际只有 V 生效 | `probe3 P1`；`CellOrder.ts:86-98` | 已确认 |
| FLOW-AUD-036 | P2 | 排序·CellOrder | `seedDir = nodes.find(x => x.vh)` 取**声明序**首个显式 vh，而决策 `dec-bdfe7b9c74803f50` 定义为"**首节点**（拓扑序首）vh 作种子"；二者在"声明序 ≠ 拓扑序"时结果不同（实测 b 非首节点却成种子） | `probe3 P1`；`CellOrder.ts:72-73` | 已确认 |
| FLOW-AUD-037 | P3 | 排序·Mainline | comp 间边按 `to` 去重保留**第一条**的 `def` 标记（应取 OR），default 加成可能丢失 → 污染"主干"判定 → 污染 `isTier1` → 污染 T2 的 200 惩罚 | `MainlineOrder.ts:53-60` | 部分确认（探针未复现影响） |
| FLOW-AUD-038 | P2 | 排序·CellOrder | 注释与实现语义不符：注释称"上游在左上对角(prevGx>0 且 prevGy>0)→本节点 D"，但 `prevGx/prevGy` 是**格内累计槽位**，不是上游节点方位 | `CellOrder.ts:88-97` | 已确认 |

### 有序嵌套

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-039 | P0 | 校验·嵌套 | §10#11 检查是**死代码**：`subProcesses.push({id, nodes: []})` 在 `:243`，校验遍历 `sp.nodes` 在 `:448`，而 `sp.nodes` 填充在 `:504` → 循环体永不执行 | `grep` 行号确认 | 已确认 |
| FLOW-AUD-040 | P0 | 校验·嵌套 | `R6` 条件写错：判的是"父节点自身也在子流程内"（孙节点），**不覆盖"子流程里再放子流程"**。实测深度 2 嵌套零相关报错，仅报两条误导性"孤立"错误 → **嵌套深度 ≤1 的 error 级规则实际完全失效** | `probe3 P6`；`FlowParser.ts:496-500` | 已确认 |
| FLOW-AUD-041 | P2 | 渲染·嵌套 | 子流程几何与承诺不符：`renderSubprocessInner` 用 `ceil(√n)` 方阵 + `iw = min(72,…)` **硬上限**居中堆放，大框小图大量留白，**不是**文档承诺的"标准交叉格整数倍、与相邻泳道无缝对齐" | `flowToSVG.ts:163-174` vs `ExcelLayout.ts:355-371` | 已确认 |
| FLOW-AUD-042 | P2 | 渲染·嵌套 | 第 2 层嵌套静默降级为普通迷你任务块；子流程内迷你连线用中心直角折线，不做避障 | `flowToSVG.ts:176-184` | 已确认 |

### BPMN 交换层

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-043 | P0 | 交换·结构 | `FlowEdge.parent` **从不赋值**（`addEdge` 不传，全仓无赋值点）→ `FlowBpmn.ts:43` 的 `if (e.parent) continue` 恒不触发 → **子流程内部 sequenceFlow 被导出进顶层 process**，形成指向 subProcess 作用域外元素的悬空引用（BPMN 规范下不可导入）。SVG 侧因 `nodePos` 不含内部节点而无害，故 linter 抓不到 | `grep` + `FlowParser.ts:274-276` | 已确认 |
| FLOW-AUD-044 | P0 | 交换·泳道 | 泳道导出错误：`hLanes.map(l => …)` 遍历 **Lane 声明**而非 `l.indices` → `Lane from D[0,1,2]` 只生成 **1 个 lane**，`name` 恒取 `dicts[l.dict][0]`（永远第一项），`flowNodeRef` 收集所有节点。与 spec 附录 B 逐索引 lane 完全不符 | `FlowBpmn.ts:50-60` | 已确认 |
| FLOW-AUD-045 | P0 | 交换·属性 | 六属性全部丢失：spec 附录 B 要求 `attrs → <bpmn:documentation>` 供机器回读，实现**无任何 documentation 输出** | `FlowBpmn.ts` 全文 | 已确认 |
| FLOW-AUD-046 | P1 | 交换·合规 | `isDefault` 放在**错误元素**上：BPMN 2.0 默认流是**网关上**的 `default="<flowId>"`，sequenceFlow 无该属性；实现写在 flow 上，与自家 spec 附录 B"于网关"**相反**。且 `assert_flow_bpmn.ts` 的 `check('默认出口 isDefault')` 把错误行为锁定为回归基线 | `FlowBpmn.ts:45`；`mcp`/`scripts/assert_flow_bpmn.ts` | 已确认 |
| FLOW-AUD-047 | P2 | 交换·DI | BPMN DI 的 `waypoint` 只取源/目标中心（无折线），与 SVG 正交折线不一致，spec §0.3"三层机器输出一致"断裂 | `FlowBpmn.ts:79-82` | 已确认 |
| FLOW-AUD-048 | P2 | 交换·修饰 | N/DATA 缺 `<bpmn:association>`（spec 附录 B 要求） | `FlowBpmn.ts` 全文 | 已确认 |

### 规划范式统一

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-049 | P0 | 架构·范式 | 六套并存表示（字典索引 / 交叉格槽位 / 像素通道 / comp DAG / 迷你图坐标 / BPMN DI），其中 **`ExcelLayout` 与 `GuardedShift.materialize()` 是逐行复制的两套几何重建**（公式目前同步，靠人工纪律维持）→ 一处调整即让 T2 在**错误几何**上评估 Φ 且**不报错** | `ExcelLayout.ts:540-568` ≈ `GuardedShift.ts:148-175` | 已确认 |
| FLOW-AUD-050 | P0 | 架构·量纲 | 决策变量混入像素量：`dx < -40` 用像素判回边；T2 位移成本 150 与 Φ 的 bends 权重 100 不同量纲直接相加；良基性证明论证像素而算子作用槽位 → 建议整体收敛到 $\mathcal S=(ri,ci,gx,gy,\text{port})$，像素仅作只读投影 | 综合 | 已确认（根因条目） |
| FLOW-AUD-051 | P2 | 布局·落点 | 排序键与落点策略错配：`autoSeq` 已按主干序**排序**，但落点仍是"行优先扫描第一个空位" → 效果是"主干优先占编号靠前的格子"，而非文档 §4 承诺的"**替代**行优先扫描、沿流向推进"；且缺"由 `Lane from` + 拓扑推出 `(ri,ci)`"的分配语义 | `ExcelLayout.ts:288-291` vs `:313-324`；`FLOW_MAINLINE_ORDER_NOTES` §4 | 已确认 |
| FLOW-AUD-052 | — | 正面项 | 确定性链条完整：Kahn 稳定序 + 显式全序排序 + Tarjan 按声明序 + `tsc` 可锁定 | 综合 | 已确认 |

### 连线绘制

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-053 | P0 | 绘制·建模 | `BACK_EDGE_LABELS` 收录 `'否'`（`:11`）：把"分支的否定出口"与"回流"混为一谈。后果①端口分配把"否"分支降到 `200+10·dist`（倒数第二档），不得占用主干直通端口；后果②`GuardedShift.ts:290` 直接 `return false` → **标签"否"的边永远不参与 T2 优化**（哪怕 B≥3）。中文审批流程"是/否"为最常见分支对，误判命中率极高 | `AlgebraicFlowRouter.ts:11`、`GuardedShift.ts:290`；`THEORY` §5 公式含"带否定标签"（文档与实现一致，但**建模本身错**） | 已确认（R3 V-01/V-01b 实证，影响远超预估）|
| FLOW-AUD-054 | P2 | 绘制·泛函 | Φ 实为**强字典序**而非加权和：`bends*100 + len*0.01`，`len` 需 10000px 差异才压过 1 个折弯；`FRAMEWORK` §1 写成加权和且未披露实际权重；`w_X·overlap` 在 `routePhi` 中**根本没算**（交叉只在渲染期做视觉补偿） | `AlgebraicFlowRouter.ts:347`、`GuardedShift.ts:217` | 已确认 |
| FLOW-AUD-055 | P2 | 绘制·视觉 | "交叉反差过桥"名不副实：`crossingOverIds` 把"线序更大的**整条**边"改色，非在线段局部打断+跳跃弧 | `flowToSVG.ts:261-270`、`:429-439` | 已确认 |
| FLOW-AUD-056 | P2 | 绘制·策略 | T2 第三分支（异行异列）取 L 角格**第一个不相关节点**右移+下移，**不验证该节点是否真在通路上**——以全量重算试错替代几何推理；配合 `O(E³·C²)` 复杂度（`maxIter·E·routePhi`，E=40 → 最多 80 次全量布线/迭代），是主要性能与质量风险 | `GuardedShift.ts:261-266`、`:284-312` | 已确认 |

### 未复现 / 已排除

| ID | 级别 | 类别 | 事项 | 探测结果 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-057 | P2 | 稳定性 | 尺度不变性：`getEdgePriority` 用绝对像素阈值 `dx < -40` 判逆流，而像素由字体决定 → 改字号可能使边优先级不连续跳变 | `probe3 P5`：`nodeFontSize ∈ {13,20,28}` 端口分配**一致**（`q1→w3:RL q1→w4:BL w1→q1:RL w3→w4:BT`）；机制真实但中小样例未显现 | **已排除**（R3 V-04 实证）|
| FLOW-AUD-058 | P3 | 观测性 | T2 的 `T2Stats`（`accepted/rejected/phiRoute0/phiRoute1`）既未进 `FlowData`，也未出现在 MCP `diag` → **Φ 在外部接口上不可观测**，`FRAMEWORK` §6"Φ 统计报告"验收项无法执行 | `types.ts:905`（`FlowData` 无 `t2` 字段）；`XyLayout.t2` 仅在布局对象内 | 已确认 |

---

## R3 · 运行期实证与需求文档对照

### 运行期实证（把 R2 的推演升级为实测）

| ID | 级别 | 类别 | 问题 | 实证 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-059 | P1 | 绘制·判据 | **同格回边使几何判据失效**：`getEdgePriority` 的 `isPhysicalBack = isExplicitBack \|\| (dx < -40)`，而同一交叉格内的回边 `dx = 0` → 几何判据完全不命中 → 该边的端口优先级**100% 由中文词表 `BACK_EDGE_LABELS` 决定** | V-04 实测 `dx=[193,0,0]`（同格边恒为 0）；V-01b 实测改标签即改变 Φ | 已确认 |
| FLOW-AUD-060 | P0 | 定理 T2 | **T2 在真实复杂图上零工作**：APQP 样例（20 节点 / 13 顶层边 / 4 个网关）`T2Stats = {accepted:0, rejected:0, phiRoute0:1047.40, phiRoute1:1047.40}` —— 连一次 `propose` 都未发生（B≥3 的边恰好全是词表回边，被 `GuardedShift.ts:290` 全部过滤）。把 `驳回/不达标/整改` 换成中性词后变为 `{accepted:0, rejected:3}`（3 次尝试**全部被拒**）→ **T2 净收益为零**，且 `Φ` 因标签变动从 1047.40 跳到 1851.05（**+77%**） | V-01 / V-01b | 已确认 |
| FLOW-AUD-066 | P1 | 解析·坐标 | **`Location` 键序写反 → 节点静默落到错误格子**：`Location(D[0],P[1])` → 落 `(ri=0, ci=1)`（正确）；`Location(P[1],D[0])` → `cellKeyOf` 拼出 `"P1D0"` ≠ `"D0P1"` → 兜底自动落格 → 落 `(ri=0, ci=0)`（**错误**）。无 error、无 warn（D/P 均在 `Lane from` 内，不触发维度清洗告警） | V-05 | 已确认 |
| FLOW-AUD-068 | P1 | 绘制·质量 | **兜底路径出现逆向回折**：V-03 返回路径 `(50,100) → (360,100) → (340,100) → (350,100)` —— 先冲过目标 `x=360`（`to` 在 `x=370`）再折回，视觉畸形。根因：`outerOps` 模板的 `outerX1 = maxGridX + half` 未考虑目标节点处于网格最右端的情形 | V-03 | 已确认 |

### 需求文档对照（设计承诺 vs 实现）

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-061 | P1 | 需求·端口 | 文档两处要求"**两趟**端口分配（先入口后出口）"，实现为**一趟**贪心（单循环内同时定 `sp`/`tp`，仅按边优先级排序） | `FLOW_CONNECTION_REQUIREMENTS_ALGO.md` M4 + §0 伪码、`FLOW_LAYOUT_ENGINE_DESIGN.md` §5 vs `AlgebraicFlowRouter.ts:223-276` | 已确认 |
| FLOW-AUD-062 | P1 | 需求·腾挪 | 文档要求"**整列/整行**腾挪"（`{(r,c)\ | c=b, r≥r*}` 整列下移），实现为**单节点位移**（`ids: [b.n.id]`）→ `PROOF` §1.1 良基性证明所用的算子与实现不同（与 AUD-033 叠加） | `REQUIREMENTS` M5 + §1 伪码、`PROOF` §1.1 vs `GuardedShift.ts:241/254/265` | 已确认 |
| FLOW-AUD-063 | P3 | 需求·代价 | M2 代价权重文档为 `bends*3 + dist*0.1`（≈ 30:1），实现为 `bends*100 + len*0.01`（= 10000:1），**相差 333 倍**；文档未说明实际权重 | `REQUIREMENTS` §0/M2 vs `AlgebraicFlowRouter.ts:347` | 已确认 |
| FLOW-AUD-065 | P3 | 文档·自相矛盾 | `FLOW_LAYOUT_ENGINE_DESIGN.md` 同文件内矛盾：§6 写"**未实施**：T2 守护位移"，§100 断言清单又列出 T2 `GuardedShift.ts`；§1 写 stub"距节点图形边缘 `half/2`"，§6 与实现均为 `half` | 同文件 §1 / §6 / §100 | 已确认 |

### 测试与断言体系

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-064 | P2 | 测试·保真 | `stress_test_complex_flow.ts` 三重不保真：① `gridTop: 40` 与渲染的 `FLOW_SVG.titleH = 44` 不一致（通道网格偏移，实测外侧走廊 6 vs 10）；② 碰撞判定用 bbox **严格内部**重叠（比实现的 Liang-Barsky + padding 4 更宽松，会漏报擦边）；③ 正文仅 `console.error` + 计数，**无失败退出码**且不在 `test:flow` 内 → 其"零冲突""全量回测顺利通过"结论**不可作为证据** | V-06；脚本 `:127-139`、`:174`、`:186` | 已确认 |
| FLOW-AUD-067 | P1 | 测试·结构 | **断言集结构性偏差**：184 条以"存在性/形态/体量"断言为主，缺"正确性/质量"断言 → ① 无任何"路径不穿盒"断言（AUD-027 无保护）；② `t2: 统计存在` + `t2: 路由 Φ 不增` 被"0 接受 0 拒绝"**平凡满足**（AUD-060 无保护）；③ `outer-corridor: 回边外绕触发(≥1边触及外侧走廊)` 把 L2 不完备的**症状锁定为期望行为**；④ `mainline-autoseq: 无 Location 节点按主干序填空格` 把 AUD-051 的半成品锁定；⑤ 黄金快照只锁"节点格位 / svg 体量"，不锁连线质量（折弯数 / 穿盒 / 交叉数）——`FRAMEWORK` §6 要求的"Φ 统计报告"验收项无对应断言 | `scripts/assert_flow_svg.ts`（82 条断言名全表）、`mcp-server/../package.json#test:flow` | 已确认 |

### R3 结论

R2 中对 T2 / A4 / L2 的三项"代码推演"判断**全部证实**，且比推演更严重：

1. **T2 在当前实现下对真实工业图（APQP）零作用**（AUD-060）——不是"效果不佳"，是"从未启动"。三个独立原因叠加：词表过滤候选（AUD-053）、门槛过严（AUD-031）、Tier-1 惩罚未文档化（AUD-030）。
2. **A4 与 L2 的完备性缺口可构造复现**（AUD-027 / AUD-029 / AUD-068），且兜底路径本身违反正交美学（逆向回折）。
3. **Φ 不是几何量而是"标签敏感量"**（AUD-059）：同一几何、仅改 3 个中文标签，总 Φ 变化 +77%。这意味着"数学完备性"的度量基准本身被一个硬编码词表污染。

---

## R4 · 门禁体系 · 生成侧 · 往返一致性

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-069 | P1 | 门禁·样例 | **`validate_dsl.mjs` 未集成 flow 样例解析校验**：脚本 "2. Example quality" 只对 `affinity`/`fishbone`/`control` 有专门分支，flow 仅检查"非空 / 含 `Title:` / 无围栏"。spec §12 落地路径第 5 条明写"`npm run validate:dsl` 集成（§10 规则表）"，**未实现**。实测 `npm run validate:dsl` → `PASS (0 warnings)`，而它验证的 `render_flow.official_example`（采购审批正例）本身带着 AUD-001（多出 `w4→w5`）与 AUD-002（`w4` 断链） | `scripts/validate_dsl.mjs:62-90`；实跑输出；`docs/flow/spec/IQS_FLOW_DSL_SPEC.md` §12.5 | 已确认 |
| FLOW-AUD-070 | P1 | 生成侧·AI | **AI 生成侧约束单薄且无回执**：`aiService.ts:132` 对 flow 只有一行约束（"必须 Dict → Lane from → W；Type[?]/[+] 必须分支行并以 End 闭合；严禁 flowchart TD / graph LR / JSON / Markdown 围栏。标签优先字典引用。"），而 MCP 侧 `flow.agent.md` 编译卡有 132 行（BNF + 7 条非协商红线 + 2 正例 + 3 反例）。且 AI 路径**不走 `lintFlowDsl`**，故 AUD-003/004/005/006 这类静默失败在前端 AI 场景下**没有任何 `parser_errors` 回执**（用户只能看到渲染结果），危害大于 MCP 路径 | `services/aiService.ts:132` vs `protocol/segments/flow.agent.md`；`mcp-server/index.js:229-245`（仅 MCP 有 lint） | 已确认 |
| FLOW-AUD-071 | P2 | 生成侧·默认样例 | **首屏默认样例正是缺陷图**：`constants.tsx:969` 的 `INITIAL_FLOW_DSL` 与 `scripts/stress_test_complex_flow.ts` 的 APQP 为同源图——即 AUD-060 实测"T2 零工作（Φ 1047.40）"、且含 AUD-059 典型同格回边（`驳回 → #w1`、`整改 → #w6`）的那张图。用户首次打开 FLOW 编辑器即以此认知系统能力；另 `INITIAL_FLOW_DATA = parseFlowDSL(INITIAL_FLOW_DSL).data` 在**模块加载期**即执行解析 | `constants.tsx:969-1026` | 已确认 |
| FLOW-AUD-073 | P2 | 往返·固化缺陷 | **`flowToDsl` 往返不保守，且把 AUD-001 固化**：① 分支行 `const tag = e.label \|\| e.condition \|\| ''`（`FlowEditor.tsx:169`）丢失 `(exitName)` 与 `[cond]` 的语法形式；② 当 `label` 为空而 `condition` 存在时，回写的是裸文本 → 重新解析会当作 **`label`**（语义从 condition 漂移为 label）；③ 显式边 label 完全丢弃（`lines.push(\`${e.from} → #${e.to}\`)`）；④ `isAutoSeq` 判定把 AUD-001 产生的**错误默认边**（`w4→w5`）识别为"自动顺序边"而跳过回写 → DSL↔canonical 往返**幂等**，错误被静默保留。**这是 184 条断言 + 往返测试都没能发现 AUD-001 的机制原因** | `components/flow/FlowEditor.tsx:150-200`（`flowToDsl`/`emitNode`/`isAutoSeq`） | 已确认（代码级；`.tsx` 无法在 strip-types 下加载，未运行期复现） |
| FLOW-AUD-072 | P3 | 数值·复核 | 浮点判据复核（V-11/V-12）：`cleanOrthogonalPath` 的 `\|cross\| < 0.5` 与 `findOrthogonalCrossings` 的 0.5px 量化去重键**未复现实质问题**（通道网格间距 ≥ `half`=34，远大于阈值；探针中 0.4px 偏移的 cross 实为 8，不触发合并；y=10 与 10.4 的两个交点均被正确计入）。**但复核证实**：`dot < 0` 时清理函数**有意保留**反向回折 → AUD-068 的逆向回折根因在 `outerOps` 模板本身，而非清理函数 | V-11 / V-12；`AlgebraicFlowRouter.ts:282-302`、`flowToSVG.ts:234-240` | 未复现（并已定位 AUD-068 根因） |
| FLOW-AUD-074 | P3 | 视觉·对比度 | `contrastStroke` 无 WCAG 对比度保证：判据为**线性 RGB 欧氏距离** + **亮度绝对差 0.28**，在暗部失效。推演：打印灰配色下 `lineColor=#111827`、`panelColor=#ffffff` → `push` 得 `#000000`，两个判据均通过（`\|Δlum\|=1.0`、`dist²=2386`），返回纯黑；而 `#000000` 与 `#111827` 亮度差仅 0.0926，**交叉反差在深色配色下可能不可见** | `FlowThemes.ts:45-61`；`FLOW_PALETTES` print 档（`:91-99`） | 分析推断（未目视核对 PNG）|

### R4 结论

本轮把 R1–R3 的"缺陷为何能长期存在"补齐为**门禁链断裂**：

1. **样例无门禁**（AUD-069）：`validate:dsl` 不解析 flow 样例 → 官方正例的缺陷（AUD-001/002）在 spec / agent 卡 / mcp_tools / 默认样例四处流通。
2. **往返无门禁**（AUD-073）：`flowToDsl` 的 `isAutoSeq` 把错误默认边当"自动序"跳过 → 往返幂等 → 缺陷被"验证通过"。
3. **断言无门禁**（AUD-067）：断言集以存在性/体量为主，无穿盒/质量断言。
4. **生成侧无回执**（AUD-070）：AI 路径只有 1 行约束且不跑 lint。
5. **首屏即缺陷图**（AUD-071）：默认样例是最能暴露缺陷的那张图。

> 五者叠加，形成一个自洽的"全绿闭环"：**错误样例 → 无样例校验 → 生成单薄 → 往返幂等 → 断言只看存在性**，任何单点都不产生红灯。这是本次审计最重要的**系统性结论**。

---

## R5 · 编辑器回写 · headless 桥 · 算法状态文档

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-076 | P1 | 编辑器·回写 | **表单编辑对"无显式 id"的节点静默失效**：`replaceWLine` 用 `new RegExp('^( *)W:\\s*' + n.id + ':', 'm')` 定位，而未写 id 的节点（依赖解析器自动编号 `w1,w2,...`）在 DSL 原文中形如 `W: 标签 ...`，**无 `w2:` 前缀** → `re.test(src)` 为假 → `return src`（静默返回原字符串，不报错）。`replaceLaneLine` 同理用 `src.includes('Lane from D[0,1] Layout H')` **精确字符串匹配**，DSL 中若有空格差异（如 `D[0, 1]`）即失配并静默返回。→ **AI 生成/用户导入的 DSL（不带显式 id）在侧栏表单里改不动** | `components/flow/FlowEditor.tsx:54-65`；调用点 `:512/520/530/548/565/581/587/595` | 已确认 |
| FLOW-AUD-080 | P2 | 渲染·错误吞没 | **App 层完全忽略解析错误 + 双重无效防御**：① `App.tsx:534/538` 为 `try { return parseFlowDSL(dsl).data; } catch { return parseInitialFlow().data; }`，而 `parseFlowDSL` **从不抛异常**（错误收集在 `errors` 数组）→ `catch` 是死代码；② 同文件 `parseInitialFlow`（`:373-379`）内部又是同样的无效 `try/catch`；③ `App.tsx` 三处调用**只取 `.data`/`.styles`，从不读 `errors`/`warnings`**（对比 `FlowEditor.tsx:231` 是读的）。后果：直接访问 `?mode=headless&type=flow&dsl=...`（绕过 MCP）时，**任何解析错误都不产生反馈**，照常渲染半成品图；叠加 AUD-023（MCP lint 降级）即为**双重静默** | `App.tsx:373-379`、`:533-539` vs `components/flow/FlowEditor.tsx:231` | 已确认 |
| FLOW-AUD-075 | P2 | 数学·未证命题 | **文档中存在一个"自称严格成立但未证、未实现、很可能为假"的定理**：`FLOW_ROUTING_MATH_AND_IMPLEMENTATION.md` §1.3 给出合并点目标 $J^* = \arg\min(L_1 + 35.0\cdot\text{Bends})$ 并断言"**单调性定理：合并后总线段测度严格小于独立之和，且不增加系统总折弯数**"。但同文件 §2.2.3 勘误自认该逻辑"**代码中未实现**（`components/flow` 全量检索零命中）"，`FRAMEWORK` §5 才把"M8 合并需先证引理「合并不增 bend/len/箭头」"列为**待证**。且该命题作为无条件陈述**很可能为假**：两条同目标同 IN 端口的独立边若各自 0 弯，合并后支路须横移并入公共主干，必然引入折弯 | `FLOW_ROUTING_MATH_AND_IMPLEMENTATION.md` §1.3 + §2.2.3；`FLOW_OPTIMALITY_FRAMEWORK.md` §5 | 已确认 |
| FLOW-AUD-079 | P2 | 文档·口径矛盾 | **"两趟端口分配"在两份权威文档中顺序相反**：`FLOW_LAYOUT_ENGINE_DESIGN.md` §5 为"第一趟（**入口**）…第二趟（**出口**）"；`FLOW_ROUTING_ALGO_STATE.md` §0b 为"阶段 1 …确定**出**端口，阶段 2 …分配…**入**端口"。而实现是**一趟**（`AlgebraicFlowRouter.ts:223-276` 单循环内同时决定 `sp`/`tp`）。三方（两份文档 + 实现）互不一致，且实现有 `alignment` 软惩罚（`−35·alignment`）而无"朝向强制"机制——`FLOW_ROUTING_ALGO_STATE.md` §2.3 记录的"长横线绕 Y 轴"根因之一正是"`sourceCandidates` 选了**背向/侧向源端口**" | 两份文档 + `AlgebraicFlowRouter.ts:223-276`、`:263`；并入 AUD-061 | 已确认 |
| FLOW-AUD-078 | P3 | 文档·版本漂移 | 三份文档记录**三个不同的断言总数**：`FLOW_ROUTING_MATH_AND_IMPLEMENTATION.md` §3 = parser 57 / svg 57 / bpmn 17（合计 131），`FLOW_CELL_ORDER_DESIGN.md` §6.4 = 154，`FLOW_LAYOUT_ENGINE_DESIGN.md` §100 = 184（当前实测值）。历史快照未标注版本，易被误当现状引用 | 三文件交叉 | 已确认 |
| FLOW-AUD-081 | P3 | 导出·字体 | `buildPNG` 的 SVG→Blob→`Image`→canvas 路径**不携带页面字体**：`flowToSVG` 生成的 `<text>` 只设 `font-size`/`font-weight`，**无 `font-family`**，依赖 `index.css` 的 body 字体；而 SVG 作为独立 Image 渲染时不应用页面 CSS → 导出 PNG 的字体可能与预览不一致（影响中文折行宽度估算 `textW` 的准确性） | `components/flow/FlowDiagram.tsx:29-54`、`flowToSVG.ts:35-43` | 分析推断（未目视核对 PNG）|
| FLOW-AUD-077 | — | — | ~~flow 的 headless 初始化未处理 `headlessDsl`~~ → **已排除**：`App.tsx:533-539` 正确实现 `(isHeadless && headlessType === QCToolType.FLOW && headlessDsl) ? headlessDsl : INITIAL_FLOW_DSL`，且 `TYPE_MAP.flow = QCToolType.FLOW`（`:417`）→ MCP `render_flow` 的 `?mode=headless&type=flow&dsl=…` 链路可用 | `App.tsx:402-420`、`:533-539` | **已排除** |
| FLOW-AUD-082 | P3 | 桥·就绪信号 | `window.IQS_READY` 是**固定 500ms 延时**而非渲染完成状态：`setTimeout(() => { IQS_READY = true }, 500)`，**不检查 `diagramRef.current` 是否可用、也不检查图是否真正绘制完成**；而 MCP 端以 `waitForFunction(IQS_READY)` 作为唯一就绪判据。注释自承"Give charts some time to finish initial animations"——即**时序假设而非状态保证**。当前 flow 为同步纯函数渲染，风险低；但混合 kind（ECharts/G6 异步动画）下存在竞态 | `App.tsx:643-647`；`mcp-server/index.js:125` | 已确认（风险项）|

### R5 结论

本轮补上两类此前未覆盖的缺陷面：

1. **写入路径**（AUD-076）：编辑器采用"DSL 源驱动 + 正则/字符串替换"回写，对**书写形式**敏感 —— 无显式 id、空格差异均导致**静默失败**。这与 AUD-073（`flowToDsl` 往返不保守）构成同一根因的两端：**DSL 文本层被当作可无损编辑的真相源，但没有形式规范化（canonical formatting）步骤**。
   > 建议：编辑前先 `parse → flowToDsl` 规范化为统一形式（含显式 id + 标准空格），再做字段级替换；或在 `replaceWLine` 失配时**向上抛错**而非静默返回。

2. **读取路径**（AUD-080）：App 层吞掉全部解析错误，且防御性 `try/catch` 对"不抛异常的解析器"完全无效。这让"解析器收集错误"的设计（`FlowParseResult.errors`）在**非编辑器路径上形同虚设**。

3. **文档含未证命题**（AUD-075 / AUD-079）：继 R2 发现"公理 A4/A5 与实现不符"之后，本轮发现**定理层**也有一个自称"严格成立"、实为未证未实现且很可能为假的命题。这提示文档的"严格/定理"措辞需要一次系统性重新标定。

**已排除 1 项**（AUD-077）：flow 的 headless 初始化正确。

---

## R6 · V-09 量化 L2 同伦类 gap（精确最优基线对照）

### 方法

实现"**网格可见图 + 状态 Dijkstra**"基线（`/tmp/flowreview/l2_baseline.mjs`）：

- 状态空间 = 格点 × 方向（`(x, y, dir)`，`dir ∈ {H, V}`）；
- 移动 = 沿 dir 到通道网格中相邻格点（逐格推进，每步用**实现同一套** `segmentIntersectsBox` + padding 4 检查碰撞）；
- 转向 = 同格点换 dir，代价 `BEND = 100`；长度项 `0.01/px` —— **与 `computeCost` 完全一致**；
- stub 段 `p0→s1`、`t1→pk` 固定（与实现相同），端点折弯按端口法向计入；
- 拐点限定在 `xChannels ∪ {s1.x, t1.x}` × `yChannels ∪ {s1.y, t1.y}` → 结果是**网格约束下的精确最优**，即真最优的**上界**。

因此：若实现结果 **差于**该基线，则实现**必然不是**真最优 —— L2 的不完备由此从"构造反例"升级为**统计量**。

### 结果（3 张图 / 32 条顶层边）

| 图 | 边数 | 实现 Σ折弯 | 基线 Σ折弯 | **gap** | 折弯劣于基线 | 含 180° 回折 | 实现穿盒 |
|:--|--:|--:|--:|--:|--:|--:|--:|
| spec §8.1 采购申请审批 | 7 | 7 | 5 | +2 | 1/7 | **6/7** | 1 |
| spec §8.2 来料检验（单维+子流程） | 9 | 9 | 3 | **+6** | 3/9 | 4/9 | 0 |
| APQP/PPAP 真实工业图 | 16 | 22 | 10 | **+12** | 6/16 | **10/16** | 1 |
| **合计** | **32** | **38** | **18** | **+20（+111.1%）** | **10/32（31%）** | **20/32（62.5%）** | 2/32 |

典型行（APQP）：

| 边 | 端口 | 实现折弯 | 基线折弯 | Δ | 实现cost | 基线cost | 实现回折 |
|:--|:--:|--:|--:|--:|--:|--:|:--:|
| w3→w4 | BL | 3 | 1 | **+2** | 311.3 | 105.7 | 0 |
| w5→q2 | RT | 3 | 1 | **+2** | 312.7 | 102.7 | 1 |
| w6→w7 | BR | 3 | 1 | **+2** | 306.9 | 104.1 | 0 |
| w4→w5 | TB | 0 | 0 | 0 | 9.4 | 2.7 | **2** |
| w1→w2 | BT | 0 | 0 | 0 | 5.6 | 1.0 | **2** |
| q2→w6 | RL | — | 基线不可达 | — | — | — | — |

### 新增条目

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-083 | **P0** | 代价函数·判据缺失 | **`pathBends`/`computeCost` 漏计 180° 反向回折，导致畸形路径因"廉价"而在候选排序中胜出**。判据 `(d1x !== 0 && d2y !== 0) \|\| (d1y !== 0 && d2x !== 0)` 只识别 90° 转向；对共线反向（`cross = 0, dot < 0`）**不计折弯**。而 `cleanOrthogonalPath` 的 `dot >= 0` 条件又**有意保留**回折。两者叠加 → "绕到画布外侧再折回"的路径代价被严重低估。**实测 20/32 条边（62.5%）含此回折**；单条 edge 实例（spec §8.1 `q1→w4`）返回 `(392,173.8) → (392,207.8) → (392,-24) → (392,403.6)`，在 `s1` 处出现 180° 反向，cost 仅 6.9（看似很低）而基线同端口只需 2.3 | `AlgebraicFlowRouter.ts:337-348`（`computeCost`）、`:282-302`（`cleanOrthogonalPath`）；同源 `GuardedShift.ts:48-56`（`pathBends`）；`/tmp/flowreview/run_l2_gap.mjs` 输出 | 已确认 |
| FLOW-AUD-084 | **P0** | 完备性·量化 | **L2 不完备的量化结论**：与"网格约束下精确最优"相比，实现 Σ折弯 **38 vs 18（+111.1%）**，**10/32 条边（31%）折弯数严格劣于精确最优**，单图最差达 +200%（spec §8.2：9 vs 3）。此前 R2 仅有构造性论证、R3 仅有单点反例，现已给出统计量 → L2 的"同伦类枚举完备性"**可判定为不成立**；§0 表中"单条边全局精确最优"随之作废 | 同上；基线定义与代价函数一致性见 R6 §方法 | 已确认 |
| FLOW-AUD-085 | P3 | 基线·可达性差异 | 基线在 1 条边（APQP `q2→w6`）上**不可达**，而实现返回了路径 —— 说明两者对"可达"的语义不同：实现有兜底穿盒（AUD-027）能"强行"返回，基线严格拒绝。该差异本身即为 A4 软约束的旁证。另 `w2→q1`（APQP）与 `w2→q1`（spec §8.1）2 条边实现穿盒 | `/tmp/flowreview/run_l2_gap.mjs` | 已确认 |

### 修复方向（AUD-083，成本极低、收益最大）

```ts
// AlgebraicFlowRouter.ts computeCost + GuardedShift.ts pathBends（两处同源，须同步）
if ((d1x !== 0 && d2y !== 0) || (d1y !== 0 && d2x !== 0)) bends++;   // 90° 转向
else if (d1x * d2x + d1y * d2y < 0) bends += 2;                      // 180° 回折 ≈ 两次转弯
```

预期效果：回折路径 cost 由 6.9 → 约 400+，不再胜出于正常路径；`Φ` 恢复为可用的优化目标。同时建议在 `GuardedShift` 的 T2 守卫中同步（否则 T2 的 ΔΦ 仍对回折不敏感）。

---

## R7 · 目标重估：对齐优先（Visio 式标准化）视角

### 0. 评判框架的修正（重要）

R1–R6 用"通用图正交布线的折弯/长度最优性"作标尺。经用户澄清，FLOW 的**真实目标函数**是：

> **节点整齐对齐 + 落点位置对齐 → 产出匹配企业标准化体系的 Visio 式流程图；人读有统一美感，同一份 DSL 又能被机器解释。**

这改变了结论的方向：

| 维度 | 在"最优布线"框架下 | 在"对齐优先"框架下 |
|:--|:--|:--|
| 网格 + 格内槽位 + 整列/整行统一扩展 | 表格化实现，不算算法创新 | **正是实现该目标的正解**（ELK/libavoid 都**不保证**表格对齐） |
| 节点严格居中于绘制格 | 无关紧要 | **必须保持** |
| 折弯数最优 | 核心指标 | **降为次要目标**（Visio 图不追求最少折弯） |
| T2 守护位移 / 射线松弛 | 改善折弯的手段 | ⚠️ **与本目标冲突**（为布线牺牲对齐） |

→ **FLOW 的强项（表格化对齐）被它自己的布线优化机制破坏**。以下为实测。

### 实测缺陷（APQP 20 节点图）

| ID | 级别 | 类别 | 问题 | 实证 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-086 | **P0** | 对齐·破坏 | **垂直射线松弛把节点推出列对齐**：`ExcelLayout.ts:486-497`（"垂直射线视线松弛 …自动将阻挡节点右移至扩展格 `gridX → gridX + 1`"）为打通一条边的垂直直通走廊，会把**同格/同列节点整体右移一个绘制格** → 该节点与同列其他节点**不再垂直对齐**。实测：列 2 `w5@x=567` 与 `q2@x=769` **偏差 202.2px**（= 一个绘制格宽）；列 3 `q3@x=972` 与 `w6@x=1174` 同样偏差 202.2px → **2/6 列不对齐**（另 4 列 ✓） | `/tmp/flowreview/aesthetics.mjs` A3；`ExcelLayout.ts:486-497`、`:578-587`（`gx = colX[ci] + it.gridX * pw`） | 已确认 |
| FLOW-AUD-087 | P1 | 观感·尺寸 | **同类节点尺寸不统一**（Visio 式应为"一类型一模板尺寸"）：实测 APQP 中 `task` **2 种**（120×44 / 120×50）、`exclusiveGateway` **2 种**（134×54 / 134×71）、`annotation` **2 种**（120×46 / 120×36）、且 **`start` 94×44 与 `end` 107×46 直径不同**（同为基础圆形元素）。根因：`nodeMetrics`（`ExcelLayout.ts:38-67`）的 `halfW: Math.max(NODE_BASE.task.w/2, maxLineW/2 + 14)` —— 尺寸**随文字长度浮动**，仅设下限 | `/tmp/flowreview/aesthetics.mjs` A1 | 已确认 |
| FLOW-AUD-088 | P1 | 观感·叠线 | **多条边完全重合在同一坐标，未等距错开**：实测 APQP 的垂直长段共 8 个不同 x，其中 **3 处被多条边共用同一 x**（`x=177` 3 条、`x=972` 2 条、`x=1174` 2 条）→ 视觉上"叠线"。Visio/libavoid 的做法是 **nudging**：同通道内各边按序号**等距错开**（libavoid 的 `idealNudgingDistance`、`nudgeOrthogonalSegmentsConnectedToShapes`；Mermaid Swimlane 引擎明确采用 "Wybrow-style shared-track nudging"） | `/tmp/flowreview/aesthetics.mjs` A5 | 已确认 |
| FLOW-AUD-089 | P1 | 观感·吸附 | **拐点未吸附通道网格**（AUD-028 的量化）：实测 10 个中间拐点仅 **4 个（40%）** 落在 `xChannels ∪ yChannels` 上，6 个游离。`FRAMEWORK` §2 A5 声称"拐点吸附通道网格 \| **已实现**" | `/tmp/flowreview/aesthetics.mjs` A4 | 已确认 |
| FLOW-AUD-090 | P2 | 定位·冲突 | **T2 守护位移与"对齐优先"目标存在产品级冲突**：T2 的接受判据只优化 `Φ`（折弯+长度），**没有任何"对齐保持"约束项**（`GuardedShift.ts:301-302`）。即：为减少 1 个折弯而把节点移出列对齐，是它的**正确行为**。在 Visio 式标准化目标下，该机制方向相反。叠加 AUD-086（射线松弛），二者共同构成"**为布线优美而牺牲对齐**"的系统性倾向 | `GuardedShift.ts:301-302`、`ExcelLayout.ts:486-497` | 已确认（定位结论） |

### 关于"格内多节点堆叠"的说明（非缺陷，但需决策）

实测同一泳道行内节点中心 y 极差最大 **291.6px**（行 0：`w1@147 w2@293 q1@439 w8@147`）。经核验，这**不是**行列错位：`w1/w2/q1` 三者**同属格 `(D[0],P[0])`**，按 V 方向合法堆叠（`gridY = 0,1,2`），而另一格的 `w8@147` 与 `w1` **精确对齐** ✓。

**但这是一个需要产品决策的取舍**：Visio 式泳道图通常在**一个格子只放一个流程节点**（多节点则分列/分格），而 FLOW 允许格内堆叠。若目标是"标准体系文件观感"，建议评估：

- 方案 A（保守）：保留格内堆叠，但**限制为 ≤2 个**并强制**居中对齐**；
- 方案 B（Visio 化）：节点不堆叠，超出时**自动向右/向下扩展格位**（这正是"连线驱动扩展格"前提 3 的正解，见 `FLOW_ROUTING_ALGO_STATE.md` §5 待办 3）。

### R7 结论

1. **FLOW 的表格化对齐骨架是对的**，且比 ELK/libavoid 更贴合"Visio 标准化"这一目标（后两者面向通用图，不保证行列对齐）。
2. **但它用两个机制自我破坏**：`ExcelLayout` 的垂直射线松弛（AUD-086）与 `GuardedShift` 的 T2 位移（AUD-090），都在"为布线牺牲对齐"。
3. **"统一美感"的三项硬指标全部不达标**：同类节点尺寸不统一（AUD-087）、连线叠线（AUD-088）、拐点仅 40% 吸附（AUD-089）。
4. 这三项**都不是算法最优性问题**，而是**纯观感问题**，且都有成熟的既有做法可直接借鉴（同尺寸模板、nudging 等距束线、拐点吸附通道）。

---

## R8 · 方案 B 布局内核原型实证

### 0. 执行说明

按用户指令"先按你的设想执行"，实现**方案 B 布局内核原型**（`/tmp/flowreview/layoutB.mjs`，162 行，**未触碰生产代码**）：

- **统一格尺寸**：`cellW = max(所有 stencil 宽) + gutter`、`cellH = max(...) + gutter`（**全局统一**，不随格内堆叠数变化）
- **一格一节点**：每个物理格位放 1 个节点，节点在格位内居中
- **溢出扩展**：同一逻辑格的第 2..n 个节点沿**流向右**寻找空物理格位（parking）
- **Visio 式 stencil**：一类型一尺寸（task 120×44、gateway 100×56、start/end 44、subprocess 140×48…），文字**不改变形状尺寸**
- **拓扑深度定列**：缺 `Location` 的节点用最长路径分层（借用 Sugiyama `layering`，**不用**其坐标分配）

### 1. 对比结果（同一份 APQP DSL）

| 指标 | 当前 `computeExcelLayout` | 方案 B `layoutB` |
|:--|:--|:--|
| R1 同类节点尺寸种类 | task **2**、gateway **2**、annotation **2** ⚠️ | 全部 **1** ✓ |
| R2 列对齐（同 `ci` 内 x 极差） | **202.2px**，异常列 2/6 ⚠️ | **0.0px**，异常列 0/6 ✓ |
| R3 行对齐（同 `ri` 内 y 极差） | 291.6px，异常行 3/4 | 0.0px ✓（**注：见 §2 勘误**） |
| 网格 / 画布 | 4×6 ｜ **1643×1245px** | 4×6 ｜ **1161×575px** |
| 布线 Σ折弯（同一实现求解器） | **10** | 24 |
| 布线 Σ折弯（同一可见图基线） | 10 | 28 |
| 拐点吸附率 | 40% | **78%** |
| 叠线位置数 | 3 | 6 |
| **扰动测试：新增 1 个节点后既有节点位置改变比例** | **93%（13/14）**，最大位移 146px | **0%（0/14）**，最大位移 0px |

### 2. 勘误：R7 的两处先验判断需要修正

| 原判断（R7） | 修正 | 依据 |
|:--|:--|:--|
| R3「行对齐 291.6px 极差」列为缺陷 | ⚠️ **误判**。该极差来自**格内合法堆叠**（`w1/w2/q1` 同属格 `(D[0],P[0])`，按 V 方向占 `gridY=0,1,2`），而**同层跨格是对齐的**（`w1@147` 与另一格的 `w8@147` 精确对齐）。当前方案的行内对齐**是正确的**，无需修改 | R8 复算 + `ExcelLayout.ts:578-587`（`ph = rowHPx[ri]/rowNyMax[ri]` 与堆叠数无关） |
| 方案 B 在"对齐"上优于当前 | ⚠️ **部分修正**。R2（列对齐）的真因是**射线松弛位移节点**（AUD-086），**与布局模型无关** —— 当前方案禁掉松弛即达标；R1 靠 stencil，也与布局模型正交。**方案 B 在"对齐"上并无独占优势** | R8 对比 |

**→ 结论：方案 B 的唯一独占优势是"布局局部性/稳定性"，见 §3。**

### 3. 方案 B 的先进性定位：布局局部性（layout stability）

扰动测试是决定性的：**在 `(D[0],P[0])` 格新增 1 个活动**

- **当前方案**：`ny_max[0]` 3→4 ⇒ `rowHPx[0]` 变化 ⇒ `bandTop(ri)` 是**累加量** ⇒ **行 1/2/3 全体下移** ⇒ **93% 的既有节点位置改变**（最大 146px）。用户需重新核对**整张图**。
- **方案 B**：新节点占用**后一个空闲物理格位** ⇒ 既有格位尺寸不变 ⇒ **0% 位置改变**。用户只需看**局部**。

这与两件事直接对齐：

1. **管理语义**：体系文件是**受控文档**，任何修订应**影响范围最小、可审计**（"改一个活动 → 全图重排"不可接受）；
2. **BPMN 布局研究的公认目标**：*mental map preservation* / *layout stability* —— 参见 Kitzmann et al. IEEE CEC'09 的 **Sketch-Driven Layout**、Mennens et al. CGF 2019 *A stable graph layout algorithm for processes*。

### 4. 新增条目

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-091 | P1 | 方案B·语义 | **简单 parking 式溢出会破坏阶段语义**：实测 4 个声明了 `Location` 的节点被推出其**声明的阶段列** —— `q1` 声明 `(D[0],P[0])` 实际落到 `(0,2)`（跑进"执行阶段"列）、`q2 (2,2)→(2,4)`、`q3 (2,3)→(2,5)`、`w2 (0,0)→(0,1)`。**修正方向**：物理列位须携带 `ownerCi`（延伸列位仍归属原阶段），列头按 `owner` 合并（等价于 Visio 中"阶段列变宽"） | `/tmp/flowreview/semanticB.mjs` | 已确认 |
| FLOW-AUD-092 | P2 | 方案B·代价 | **方案 B 的折弯数上升**（同一求解器下 24 vs 10）：布局更紧凑 + 溢出改变了节点的列相邻关系。这是"对齐/紧凑 vs 折弯"的**真实取舍**，需由更好的布线内核（阶段 2）补偿 | R8 §1 | **已修正（R13：真因是端口贪心，非几何紧凑）** |

### R8 结论

1. **方案 B 值得做，但理由要说准**：它的价值不是"对齐更好"（对齐靠禁松弛 + stencil 就能拿到），而是"**布局稳定性**"——把"改一个活动 = 全图重排"变成"改一个活动 = 局部变化"。对受控体系文件，这是**管理级需求**，而非美学偏好。
2. **必须先补"延伸列位归属原阶段"机制**（AUD-091），否则语义受损；否则方案 B 不能用。
3. **代价**：折弯数上升（AUD-092）+ 阶段列变宽。前者靠换布线内核解决，后者符合 Visio 惯例。
4. **若不做方案 B**：最小改造是「stencil 统一尺寸（AUD-087）+ 禁止射线松弛位移（AUD-086）+ 换布线内核」，可拿到 R1/R2/R4/R5/R7/R8 达标，但**保留全图重排**。

---

## R9 · 依赖层评估与布线层决策修正

### 1. 实测：三个候选依赖（`npm view`，非文档转述）

| 包 | 版本 | 许可 | 体积 | 依赖 | 备注 |
|:--|:--|:--|--:|:--|:--|
| `obstacle-router` | **0.1.2** | **LGPL-2.1** | 1.76 MB | **零**（`npm install` 输出 `added 1 package` 证实） | libavoid 完整 TS 重写（Wybrow Monash 原作） |
| `libavoid-js` | **0.5.0-beta.5** | LGPL-2.1-or-later | 813 KB | — | **beta** |
| `elkjs` | 0.12.0 | EPL-2.0 OR GPL-3.0-or-later | **8 MB** | — | 做布局，与本项目核心需求冲突 |

### 2. `obstacle-router` 能力清单（读 `dist/index.d.ts` 导出符号）—— 逐条命中未达标项

| 导出符号 | 命中 |
|:--|:--|
| `reverseDirectionPenalty` | **AUD-083**（180° 回折，实测 20/32 边） |
| `idealNudgingDistance`、`nudgeOrthogonalSegmentsConnectedToShapes`、`nudgeOrthogonalTouchingColinearSegments`、`performUnifyingNudgingPreprocessingStep` | **AUD-088**（叠线，应等距错开） |
| `portDirectionPenalty`、`ConnDirUp/Down/Left/Right`、`ShapeConnectionPin`（`setExclusive`） | **R6 端口朝向**（可硬约束，优于现有贪心） |
| `shapeBufferDistance` | **AUD-027**（无穿盒） |
| `generateStaticOrthogonalVisGraph`、`vertexVisibility` | **AUD-028/089**（拐点吸附可见图，现仅 40%） |
| `JunctionRef`、`HyperedgeRerouter`、`HyperedgeImprover`、`MinimumTerminalSpanningTree` | **AUD-075**（M8 合并，FLOW 零实现）—— 白白可得 |
| `segmentPenalty` / `anglePenalty` / `crossingPenalty` / `clusterCrossingPenalty` / `fixedSharedPathPenalty` | 现有 Φ 的同类参数，体系更完整 |
| `AStarPath`、`ShiftSegment`（scanline） | 路径搜索与 nudging 的具体算法部件 |

### 3. 架构边界结论（本轮最重要的产出）

| 层 | 依赖是否可引入 | 依据 |
|:--|:--|:--|
| **L4 布线层** | ✅ **可以** | libavoid 类库**只接受固定的 `ShapeRef` 几何 + 端口点**，**不移动节点** → 与 P1（节点位置权威）完全兼容 |
| **L2/L3 布局层** | ❌ **不可** | ELK 的 Sugiyama **坐标分配**会产生不对齐的 x/y → 直接违背"整齐对齐"核心需求 |

**→ 精确边界：布局自研（核心需求所在），布线可用依赖。**

### 4. 决策修正

| # | 原决策 | 修正 | 理由 |
|:--|:--|:--|:--|
| D2 | 自研可见图 + Dijkstra + nudging | **仍为自研，但明确以 `obstacle-router` 为参照实现**（学习其参数体系与算法部件，不引入运行时） | 见下 §5 |

### 5. 新增条目

| ID | 级别 | 类别 | 事项 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-093 | P3 | 依赖·成熟度 | **`obstacle-router` 0.1.2 工程成熟度不足**：`dist` 使用**无扩展名相对导入**（如 `from './core/constants'`），**原生 Node ESM 无法解析**（`ERR_MODULE_NOT_FOUND`）→ 只能在 bundler（Vite）下运行，**无法在 Node 测试脚本/CI 中直接使用**（除非先打包）。叠加版本号仅 0.1.2 + `libavoid-js` 为 beta，两库均非稳定版 | `/tmp/flowreview/deptest` 实测 `node t1.mjs` 报错 | 已确认 |
| FLOW-AUD-094 | P2 | 架构·分层 | **依赖层边界已确定**：布线层可引入依赖（库不碰节点几何），布局层不可（会破坏表格对齐）。本决策同时解释了为什么"引入依赖"与"整齐绘图"不冲突 | R9 §3 | 已确认（决策记录） |

### R9 结论

1. **用户提议的"引入运行时依赖"是可行的**，但正确形态是**只替换 L4 布线层**，而非整体引入图布局库。
2. **路径 B 选定**：自研布线内核（基座 = V-09 已验证的 200 行可见图 + 状态 Dijkstra），**参照 `obstacle-router` 的参数体系与算法部件**扩展至 ~400 行，补齐 nudging / 回折惩罚 / 端口硬约束 / A4 硬约束。理由：① V-09 已证明核心算法仅需 200 行即超越现实现 111%；② 无 LGPL/体积/0.1.2 beta 三重不确定性；③ **只有自研才能把"对齐优先"作为一阶约束注入代价函数**（库做不到）；④ 软著完全自主。
3. **`obstacle-router` 的定位**：**参照实现 + 质量对照基准**，不进运行时。

---

## R10 · 路径 B 布线内核实现与验证

### 1. 实现（`/tmp/flowreview/routerB.mjs`，约 220 行，未触碰生产代码）

| 版本 | 方案 | 结果 |
|:--|:--|:--|
| v1 | 可见图 Dijkstra **+ 事后段级偏移**（nudging） | ❌ **失败**（见 §2） |
| v2 | 可见图 Dijkstra **+ 轨道网格 + 占用代价**（把 nudging 前置为搜索空间设计） | ✅ 成功（条件性，见 §3） |

v2 的设计直接参照 `obstacle-router`/libavoid 的参数语义：`bendCost←anglePenalty`、`revPenalty←reverseDirectionPenalty`、`occPenalty←nudging 等价物`、A4 改为**碰撞即剪枝**（硬约束）。

### 2. v1 失败的根因（两个，均为结构性）

1. **stub 段被错误偏移**：`p0→s1` 在 `sp='T'|'B'` 时是长度 `half` 的垂直段，被当成可偏移段处理 ⇒ 端口脱离节点边中点。
2. **短相邻段被压成反向**：偏移量（`nd=12`）可能超过相邻水平段长度 ⇒ 段方向反转 ⇒ **引入回折**（实测回折边 0→6，Σ折弯 10→39）。

> 结论：**段级 nudging 是约束满足问题，不是事后微调** —— 这正是 libavoid 使用 `buildOrthogonalNudgingSegments` + vpsc 约束求解器（`libvpsc`）的原因。

### 3. v2 四方对比（`compareC.mjs`）

**方案 B 布局（`layoutB`）下 —— 关键场景**

| 求解器 | Σ折弯 | 回折边 | 穿盒边 | 拐点吸附 | 叠线位置 |
|:--|--:|--:|--:|--:|--:|
| 现实现 `solveAlgebraicRoute` | 24 | 3 | 1/16 | 78% | 6 |
| V-09 可见图基线（单通道） | 28 | 2 | 1/16 | 87% | 5 |
| 路径 B v1（段级偏移） | 13 | 0 | 5/16 | 69% | 2 |
| **路径 B v2（轨道网格）** | **7** | **0** | 5/16 | 69% | 4 |

**当前布局（`computeExcelLayout`）下 —— 同一求解器反而劣化**

| 求解器 | Σ折弯 | 回折边 | 穿盒边 | 拐点吸附 | 叠线位置 |
|:--|--:|--:|--:|--:|--:|
| 现实现 | 10 | 0 | 0/16 | 40% | 3 |
| V-09 基线 | 10 | 1 | 0/15 | 27% | 3 |
| 路径 B v2（轨道网格） | **39** | 4 | 1/14 | 26% | 4 |

### 4. 新增条目

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-095 | P1 | 布线·nudging | **段级 nudging（事后偏移）不可行**：会偏移 stub 端点使端口脱离节点边中点，并可能把短相邻段压成反向 ⇒ 引入回折（实测 Σ折弯 10→39、回折边 0→6）。必须改为"**轨道网格 + 占用代价**"的搜索空间设计，或引入约束求解器（libavoid 用 vpsc） | `/tmp/flowreview/routerB.mjs` v1 vs v2；`compareC.mjs` | 已确认 |
| FLOW-AUD-096 | P2 | 架构·耦合 | **轨道网格布线强耦合于布局规整性**：同一求解器在**方案 B 布局**下 Σ折弯 **7**，在**当前布局**下 **39**。根因：当前布局的 `yChannels` 含"同列节点间隙中线"（非均匀）＋格内堆叠 ⇒ 扩展出的轨道密集而不规整，Dijkstra 在其中频繁转向。**⇒ 方案 B 布局与路径 B 布线必须配套落地** | `compareC.mjs` §一 vs §二 | **已修正（R11 反转）** |
| FLOW-AUD-097 | P3 | 布线·参数 | **求解与检测的 padding 不一致**：路径 B v2 求解用 `segmentIntersectsBox(..., 2)`，而指标检测用 `padding 4` ⇒ 求解认为安全、检测判为穿盒（实测 5/16，而 V-09 同布局仅 1/16）。需统一 padding。**故 v2 的"Σ折弯 7"含参数宽松带来的收益，未经同参数复核前不可直接引用** | `routerB.mjs` dijkstraTrack `blocked(...,2)` vs `l2_baseline.mjs` `hits(...,4)` | 已确认；但复核在**错误路径**上进行，其"7 折弯成立"结论**作废（R11）** |

### R10 结论

1. **路径 B 方向验证通过**：可见图 + 状态 Dijkstra + 轨道网格，在配套布局下 Σ折弯 24→**7**、回折 3→**0**、叠线 6→**4**，全面优于现实现与单通道基线。
2. **但"事后 nudging"必须废弃**（AUD-095）；nudging 的本质是**搜索空间设计**，不是后处理。
3. **布局与布线必须配套**（AUD-096）：轨道网格需要规整网格；当前布局的非均匀通道 + 格内堆叠与之失配。这为"方案 B 布局"提供了**独立的第二条理由**（不再仅靠"修订稳定性"）。
4. **待调优**（AUD-097 + 吸附率未达 100%）：统一 padding、轨道间距 `nd` 与轨道数 `K` 标定、把 `s1/t1` 纳入吸附集合、`occPenalty` 权重。
5. **诚实标注**：v2 的 Σ折弯 7 尚未在"与现实现同 padding"条件下复核，不能作为最终指标引用。

---

## R11 · R10 结论勘误与正确路线定位

> **触发**：`/tmp/flowreview/diag_hit.mjs` 诊断穿盒时发现路径含**斜线段**（`(1086,322)→(978,136)`）与**连续重复点**，追查后确认实现缺陷。
> **结论**：**R10 中路径 B 的全部指标作废**，且"路径 B v2 成功"的判断**反转**。

### 1. 两个实现缺陷（原型代码缺陷，但直接导致 R10 误判）

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-098 | P1 | 原型·勘误 | **路径 B 原型的 Dijkstra 未设置前驱指针**：v1 的 `push()` 完全未设 `prev`；v2 写成 `prev.set(k, prev.get(k))`（**空操作**）⇒ 回溯链断裂 ⇒ 路径由"终点+起点"拼接 ⇒ **斜线 + 重复点**。**后果：R10 中 v2 的"Σ折弯 7"是错误路径产生的虚假优势** | `diag_hit.mjs` 输出；`routerB.mjs` 修复前 | **已修复**（`push(x,y,d,c,from)` + 6 处传 `cur.k` + `dedupe()`） |
| FLOW-AUD-099 | P2 | 原型·勘误 | **`layoutB` 的 N/DATA 放置晚于溢出分配** ⇒ 溢出节点抢占文档列格位 ⇒ 实测 `q3` 与 `n3` 在 `(2,5)` **完全重叠**，导致 `q3→w6` 的 stub 段穿盒 | `diag_hit.mjs` 修复前输出 | **已修复**（N/DATA 放置提前至溢出之前并写入 `physUsed`） |

**修复后实测**：穿盒 5/16 → **0/16** ✅；吸附（轨道网格口径）73% → **90%**；Σ折弯 v2 由虚假 7 → **真实 44**（方案 B 布局）。

### 2. 修正后的四方对比（修复 `prev` 链后）

| 布局 | 求解器 | Σ折弯 | 回折边 | 穿盒边 | 拐点吸附 | 叠线位置 |
|:--|:--|--:|--:|--:|--:|--:|
| 当前 `computeExcelLayout` | 现实现 `solveAlgebraicRoute` | **10** | 0 | 0/16 | 40% | 3 |
| 当前 | V-09 纯可见图基线 | **10** | 1 | 0/15 | 27% | 3 |
| 当前 | 路径 B v1（段级偏移） | 79 | 14 | 0/15 | 50% | 7 |
| 当前 | 路径 B v2（轨道+占用代价） | **66** | 15 | 0/14 | 32% | 11 |
| 方案 B `layoutB` | 现实现 | 28 | 0 | 0/16 | 61% | 6 |
| 方案 B | V-09 纯可见图基线 | **26** | 2 | 0/16 | 75% | 5 |
| 方案 B | 路径 B v1 | 38 | 0 | 0/16 | 70% | 3 |
| 方案 B | 路径 B v2 | **44** | 1 | 0/16 | 54% | 9 |

### 3. 新增条目

| ID | 级别 | 类别 | 结论 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-100 | P1 | 布线·方案 | **"轨道网格 + 搜索期占用代价"方案失效**：`occPenalty` 在**搜索期**惩罚"已占用轨道"，连带惩罚**合法的共享走廊**（多条边本应共走主干）⇒ 迫使路径绕行 ⇒ 折弯暴增（APQP 44/66 vs 纯基线 26/10）。**正确路线 = 两阶段分离**：① 路径搜索用**纯可见图 Dijkstra（无任何占用代价）**；② nudging 作为**独立后处理**，约束 = 保持正交 + 端点不动 + 拓扑不变（libavoid 即把 `improveOrthogonalRoutes` 置于路径求解**之后**并用 vpsc 求解） | `compareC.mjs` | 已确认（**取代 R10 的路线判断**） |

### 4. 对 R10 结论的逐条修正

| R10 原结论 | R11 修正 |
|:--|:--|
| "路径 B v2 成功：Σ折弯 24→7、回折 3→0" | ❌ **作废**。7 来自错误路径；修复后 v2 为 **44**，**劣于**现实现（28） |
| "AUD-095：段级 nudging 不可行，须改轨道网格" | ✅ **前半成立**（v1 仍失败，折弯 79）；**后半不成立** —— 轨道网格**同样不可行**。真因是"**在搜索期处理 nudging**"这一做法本身，与实现形式无关 |
| "AUD-096：轨道网格强耦合于布局规整性" | ❌ **反转**。同一求解器实测 **当前布局 10 ＜ 方案 B 布局 26** —— 当前布局的"膨胀"（列宽被 `nx` 撑大、走廊更宽）**反而降低折弯**（用空间换折弯）。真因是 `occPenalty`，与布局规整性无关 |
| "AUD-097：padding 不一致，7 折弯未经复核" | ⚠️ 复核**在错误路径上进行**，"7 折弯成立"结论作废。padding 一致性问题本身仍存在（次要） |

### 5. 本轮净收益（虽为负面结论，但收窄了方案空间）

1. **穿盒归零**（0/16）—— 两个 bug 修复后达成，实打实的进展；
2. **排除两条错误路线**（事后段级偏移、搜索期占用代价），**收窄到唯一正确路线**：纯可见图 Dijkstra（搜索）+ 独立约束求解的 nudging（后处理）；
3. **确认纯可见图路线本身成立**：当前布局 **10 = 10**、方案 B 布局 **26 ＜ 28**（对比现实现）—— 失效的是叠加其上的占用代价，不是可见图路线。

---

## R12 · 路径 B v3 验证与布线内核路线定案

> 详见工作记录 `FLOW_ROUTERB_WORKLOG.md` 的 **W2**。

### 新增条目

| ID | 级别 | 类别 | 问题 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-101 | P1 | 原型·勘误 | **路径 B 原型存在两份质量不同的可见图实现**：`routerB.dijkstraRoute` 产出含**近似重复点**与**绕行**的路径（APQP 当前布局 **57 折弯**），而 `l2_baseline.baselineRoute` 同一输入为 **10 折弯**。V-09 已独立验证后者正确 ⇒ **`dijkstraRoute` 废弃，L4 内核以 `baselineRoute` 为准** | `diag_nudge.mjs`（两条路径字符级对比） | 已确认（**已定案**：废弃 `dijkstraRoute`） |
| FLOW-AUD-102 | P1 | 布线·nudging | **简化 nudging（余量裁剪 + 等距分配）不满足需求**：方案 B 布局下**未生效**（v3 ≡ 纯基线 26/2/0/75%）、当前布局下**有害**（57 折弯 / 14 回折）。真因：nudging 是**全局约束满足问题**（平行段相互牵制），朴素局部偏移无法同时满足"错开 + 不引入新折弯 + 不破坏吸附"，需 vpsc 级求解器（libavoid 即如此）。**⇒ 叠线（AUD-088）降级为非阻塞项**，待单独攻关 | `compareC.mjs` routeC 列；`diag_nudge.mjs` | 已确认 |

### 布线内核路线定案（L4）

| 项 | 定案 |
|:--|:--|
| **内核** | **可见图 + 状态 Dijkstra（`baselineRoute` 实现）**，搜索期**无任何占用代价** |
| 理由 | 当前布局 **10 折弯**（持平现实现）；方案 B 布局 **26 折弯**（优于现实现 28） |
| 后处理 | nudging **暂缓**（需 vpsc 级约束求解），列为非阻塞项 |
| 已废弃 | ① 事后段级偏移（AUD-095）；② 轨道网格 + 搜索期占用代价（AUD-100）；③ `routerB.dijkstraRoute` 实现（AUD-101） |

> **净收敛**：三轮试错（v1/v2/v3）排除 3 条路线，**收窄到唯一可用的内核**，且该内核**不劣于现实现**。这为 L4 换代提供了可执行基线。

---

## R13 · 折弯瓶颈定位（D1/D2/D3/D6 验证）

> 详见工作记录 `FLOW_ROUTERB_WORKLOG.md` 的 **W4** 与方向文档 `FLOW_ROUTERB_MATH_DIRECTIONS.md`。

### 新增条目

| ID | 级别 | 类别 | 结论 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-103 | **P0** | 布线·瓶颈 | **L4 折弯瓶颈 = 端口分配（`solveAlgebraicPorts` 贪心启发式），而非几何空间**。三方验证：① D1 通道多轨道（解空间扩张）**无改善**（16→16 / 35→35）；② D6 通道加宽 300% 仅 **−1** 折弯；③ **D3 端口枚举可改善 20%~37%**（当前布局 15→**12**；方案 B 布局 **35→22**）。⇒ 前两轮在几何侧（轨道 / 通道宽度 / nudging）的尝试方向性错误 | `verifyD.mjs`、`verifyD6.mjs`、`verifyD3.mjs` | 已确认 |

### 对 AUD-092 的修正

**AUD-092 原判**："方案 B 的折弯上升是'对齐/紧凑 vs 折弯'的真实取舍"。
**R13 修正**：真因是**贪心端口在方案 B 布局下系统性选错** —— 量化贪心损失：当前布局 −3（15→12）、方案 B 布局 **−13（35→22）**。方案 B 改变了节点相对方位，使 `solveAlgebraicPorts` 的"象限 + 主导轴"启发式**假设失效**。

### 验证矩阵（Σ折弯，三图合计 / 两布局）

| 方向 | 当前布局 | 方案 B 布局 | 判定 |
|:--|--:|--:|:--|
| 现实现 | 16 | 37 | 基线 |
| 内核（可见图 Dijkstra） | 16 | 35 | 持平 / 优 2 |
| D1 多轨道 ±2（无占用代价） | 16 | 35 | 中性（引理保证不劣） |
| D2 动态 stub | 19 | 35 | 吸附 75%→89%，折弯 +3 |
| D6 通道加宽（30→150px） | — | 27→26 | 无效 |
| **D3 端口枚举（潜力上界）** | **12** | **22** | ✅ **−20% / −37%** |

---

## R14 · D3 端口坐标下降落地验证

> 详见工作记录 `FLOW_ROUTERB_WORKLOG.md` 的 **W5**。

### 新增条目

| ID | 级别 | 类别 | 结论 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-104 | **P0** | 布线·收益 | **端口坐标下降（D3）实证有效**：方案 B 布局 Σ折弯 **35 → 22（−37%）**、当前布局 **15 → 13**；**A1（WSAD 互斥）全部满足**；迭代 2~3 轮收敛。**且方案 B 的 22 = 枚举上界 22** ⇒ 在 16 边规模下达到**端口维度全局最优**。⇒ 取代现行 `solveAlgebraicPorts` 的纯启发式贪心 | `verifyW5.mjs`、`routerD.mjs` | 已确认 |
| FLOW-AUD-105 | P1 | 布线·副作用 | **D3 引入两个副作用**：① **吸附率下降**（75%→41% / 89%→43% / 40%→0%）—— 归因于**口径**（折弯减少 ⇒ 拐点总数减少 ⇒ 不吸附的 stub 端点占比升高），应由 D2 修复；② **回折增加**（2→6 / 0→1 / 1→2 / 0→2）—— D3 为减折弯选了更"绕"的端口组合，需代价函数补回折项（与 AUD-083 同源） | `verifyW5.mjs` | 已确认 |

### 实施要点（供生产落地参考）

1. **算法**：按当前代价**降序**逐边重选端口；每边枚举候选取 `lexicographic(bends, length)` 最小者；受 A1 约束；重复至无改变（引理 §3.3 保证终止）。
2. **两处易错点**（原型实测踩坑）：
   - A1 检查方向：`sp` 查 `e.from` 的**入**集合、`tp` 查 `e.to` 的**出**集合（易写反）；
   - **「当前端口违规即强制重选」**：某边的端口会因他边改动而变为违规，若不加此条，它会保留违规值（实测残留违规）。
3. **代价**：16 边 / 3 轮 ≈ 320ms（可接受；边数增长时需按"代价降序 + 提前剪枝"控制）。

---

## R15 · D2 × D3 叠加与组合方案定案

> 详见工作记录 `FLOW_ROUTERB_WORKLOG.md` 的 **W6**。

### 新增条目

| ID | 级别 | 类别 | 结论 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-106 | **P0** | 布线·组合 | **方案 B 布局下 `D3 + D2` 构成「免费改善」**：Σ折弯**不变**（APQP 16 / A 6 = **22**），而**吸附 41%→89%、43%→86%（+48pp / +43pp）**、**回折 6→2（−4）**。⇒ **组合方案定案：方案 B 布局 + D3（端口坐标下降）+ D2（动态 stub）**。当前布局下同组合有代价（折弯 10→13）。**注**：回折的降低超出预期（原推断 D2 仅影响吸附），归因待 W7 复核 | `verifyW6.mjs` | 已确认 |

### 组合方案实测总表（方案 B 布局 + D3 + D2）

| 指标 | 实测 | 目标 | 差距 |
|:--|:--|:--|:--|
| Σ折弯（APQP + §8.1） | **22** | ≤ 20 | **−2** |
| 拐点吸附 | **89% / 86%** | 100% | **−11pp** |
| 无穿盒 | **0** ✅ | 0 | — |
| 列/行对齐（R2/R3） | **0px** ✅ | 0 | — |
| 布局稳定性 | **0~9%** ✅ | ≤ 10% | — |
| 同类尺寸统一 | ✅ | 1 种/类型 | — |
| A1（WSAD 互斥） | **0 违规** ✅ | 0 | — |

---

## R16 · 4 方向状态改造与吸附缺口归因

> 详见工作记录 `FLOW_ROUTERB_WORKLOG.md` 的 **W7**。

### 新增条目

| ID | 级别 | 类别 | 结论 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-107 | P1 | 布线·回折根因 | **180° 回折的根因是「终点只判轴、不判方向符号」**：原 2 方向状态版（`dir ∈ {H,V}`）在终点仅比较轴（H/V），若路径以"向左"到达 `t1` 而 `t1→pk` 需"向右"，则 180° 回折被误算作 90° 转向（代价 100 而非重罚）⇒ 退化解胜出。改用 4 方向状态（`{R,L,U,D}`）+ 反向重罚后：**回折 2→1、吸附 89%→96%、折弯不变**（无代价改善） | `verifyW7.mjs`、`baselineRoute4()` | 已确认（**对现实现 `solveAlgebraicRoute` 同样适用**：其 `getTheoreticalBends` 与 `computeCost` 亦仅按轴向计弯） |

### 关键补充（供生产落地）

1. **回折的检测必须带方向符号**，仅比较轴的实现会把 180° 回折算成 90°——这与 **AUD-083**（`pathBends` 漏计回折）是**同一类缺陷的两个层面**：AUD-083 是"不计入代价"，本条是"代价函数本身识别不出"。
2. **吸附指标口径须明确**：口径 A（拐点 ∈ `xChannels ∪ yChannels`，实测 **96%**，有区分度）vs 口径 B（拐点 ∈ 搜索网格 `Xs ∪ Ys`，构造性 100%，无区分度）。**建议采用口径 A**。
3. **吸附缺口的真因**：`nearestDist` 沿端口法向无候选通道时回退固定 `half` ⇒ `s1.x` 落在非通道坐标 ⇒ 该段拐点不吸附（实测 2 处）。

---

## R17 · 通用性验证与混合内核（W8/W9）

> 详见工作记录 `FLOW_ROUTERB_WORKLOG.md` 的 **W8 / W9**。

### 新增条目

| ID | 级别 | 类别 | 结论 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-108 | **P0** | 布线·通用性 | **D3 改善经 9 类图 × 2 布局（143 条边）验证为零回退**（劣化场景数 = 0）；但同时暴露：**单一可见图内核并非普遍占优** —— `branch` + 当前布局下贪心端口 30 / D3 22 **劣于**现实现 14 | `verifyW8.mjs`、`suite.mjs` | 已确认 |
| FLOW-AUD-109 | **P0** | 布线·混合内核 | **混合内核（逐边取「可见图 4 方向 + D2」与「现实现」中折弯更少者）达成零回退**：Σ折弯 **105 → 58（−45%）**，**劣于现实现的场景数 = 0**（9 类图 × 2 布局）。理论依据为**「并集不劣于任一」引理**（与方向文档 §3.1 同源），且**完全通用**（无任何图特征规则）。⇒ **L4 布线内核最终形态** | `hybrid.mjs`、`verifyW8.mjs` | 已确认（**已达合理最优**） |

### L4 布线内核最终形态（定案）

| 组成 | 内容 | 依据 |
|:--|:--|:--|
| ① 路径搜索 | 可见图 + 状态 Dijkstra，**4 方向状态**（`{R,L,U,D}`） | AUD-107 |
| ② stub | **动态长度**：`λ = dist(p0, 最近通道线)` | 方向文档 §3.2 |
| ③ 端口 | **坐标下降**（带 A1 互斥 + 违规强制重选） | AUD-104 |
| ④ 内核选择 | **混合**：逐边取 ① 与现实现中折弯更少者 | 「并集不劣于任一」引理 |

**实测（143 条边）**：Σ折弯 **105 → 58（−45%）**，零回退，零 A1 违规，零穿盒。

---

## R18 · 转生产落地完成

> 详见工作记录 `FLOW_ROUTERB_WORKLOG.md` 的 **W10**。

### 新增条目

| ID | 级别 | 类别 | 结论 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-110 | **P0** | 落地·完成 | **L4 布线内核已换代落地**：新增 `VisibleGraphRouter.ts` + `PortOptimizer.ts`，`flowToSVG.ts` 改动 **13 行**。实测：**184 断言 0 回归**、**Σ折弯 105 → 58（−45%）**、劣化场景 **0**、穿盒 0。**零回退为构造性**（旧实现完整保留并作为候选之一） | `npm run test:flow` 全绿；`verify_prod.mjs` 汇总 | **已修复（W10）** |

### 落地清单

| 文件 | 性质 | 说明 |
|:--|:--|:--|
| `components/flow/VisibleGraphRouter.ts` | 新增 | 可见图 + 4 方向状态 Dijkstra + 动态 stub + `pickShorter`（混合内核） |
| `components/flow/PortOptimizer.ts` | 新增 | 端口坐标下降（A1 互斥 + 违规强制重选 + 混合代价口径） |
| `components/flow/flowToSVG.ts` | 改造 | import 2 行 + 端口调用 2 行 + 路径调用 4 行（净 +13 −3） |
| `docs/flow/review/FLOW_AUDIT_FINDINGS.md` | 新增 | 审计台账 R1–R18 / 110 条 |
| `docs/flow/notes/FLOW_ROUTING_WORKLOG.md` | 新增 | 工作记录 W1–W10 |
| `docs/flow/math/FLOW_ROUTING_MATH_DIRECTIONS.md` | 新增 | 数学方向（6 方向 + 3 引理） |

---

## R19 · 完整执行「下一步」全部内容（W11）

### 新增条目（均为**修复完成**记录）

| ID | 级别 | 类别 | 内容 | 证据 | 状态 |
|:---|:---:|:---|:---|:---|:---|
| FLOW-AUD-111 | P0 | 修复·T2 | **停用 T2 守护位移**：`ExcelLayout` 不再调用 `applyGuardedShifts`（`import` 仅保留 `type T2Stats`） | `scripts/assert_flow_svg.ts` 的 `t2: 已停用（AUD-090）` 通过 | **已修复** |
| FLOW-AUD-112 | P0 | 修复·对齐 | **删除「垂直射线视线松弛」整段**（原 `ExcelLayout.ts:432-499`，会把同格节点右移一格、破坏列对齐并使列宽翻倍） | 新增断言 **A5 列对齐**：同 `ci` 内 `x` 极差 **0.0px** ✅ | **已修复** |
| FLOW-AUD-113 | P0 | 修复·判据 | **折弯判据补方向符号**（`computeCost` + `pathBends` 两处同源）：`else if (d1x*d2x + d1y*d2y < 0) bends += 2` —— 180° 回折 ≈ 两次转弯 | 判据同源一致性；配合 AUD-107 的 4 方向状态 | **已修复** |
| FLOW-AUD-114 | P1 | 门禁·新增 | **对齐不变量 CI 化**（V-19）：新增 `scripts/assert_flow_alignment.ts` —— 硬断言 A1–A7（解析/坐标/列内/行内/**列对齐 <1px**/端点贴合/A1 互斥）+ 软指标 M1–M3 | `npm run test:flow` 含 **alignment 7 pass** | **已完成** |
| FLOW-AUD-115 | P1 | 文档·整理 | **FLOW 文档目录迁移 + 重命名**：31 份 → `docs/flow/{spec,design,math,notes,review,manual}`；**81 处引用改写**；全仓零残留旧路径 | `find docs/flow -type f` = 31；`grep` 残留检查为空 | **已完成** |

### 断言集变化（190 项）

| 脚本 | 数量 |
|:--|--:|
| `assert_flow_parser.ts` | 66 |
| `assert_flow_svg.ts` | 84（原 85，两条 `t2` 断言合并为一条「已停用」验证） |
| `assert_flow_bpmn.ts` | 17 |
| `assert_mainline.ts` | 8 |
| `assert_cell_order.ts` | 8 |
| **`assert_flow_alignment.ts`**（新） | **7** |
| **合计** | **190 · 0 fail** |

### 对 AUD-067（断言集结构性偏差）的修正

原审计指出：断言集以"存在性/体量"为主，且 `outer-corridor: 回边外绕触发(≥1边触及外侧走廊)` 把 **L2 不完备的症状锁定为期望行为**。本轮：
1. **已废止**该断言，改判为「路径合法性」；
2. **新增**对齐不变量断言集，把"整齐美感"纳入 CI；
3. `t2: 统计存在` 这类"存在性"断言改为"**语义断言**"（验证停用这一事实）。

---

## R20 — AI 推理卡专项审计（2026-09-12）

> **主题**：检查全部 AI 推理卡（14 kind 的 DSL 范式材料 + MCP 服务器分发设计）——说明是否到位、语义是否清晰、能否有效指导大模型完成 DSL 生成。
> **完整报告**：`docs/flow/review/FLOW_AGENT_CARD_AUDIT.md`（含复现命令）。
> **方法**：`.tsx` parser 经 `vite` `ssrLoadModule` 加载后逐条喂入；三源指令集合差 + 示例行命中率；15 条能力边界用例。

### 结论摘要

| 问题 | 结论 |
|:--|:--|
| 说明是否到位 | ❌ 同一 kind 有 **3 套规范源**，LLM 默认只拿到最简的一套 |
| 语义是否清晰 | ⚠️ 核心机制正确，但规范把「约定」写成「定义」；跨 kind 同名指令无统一声明 |
| 能否有效指导生成 | ❌ 卡里的「正例 B」会被 MCP 自己的 lint 拒绝；2 条冲突**无法通过改写 DSL 规避** |
| MCP 服务器设计 | ⚠️ 方向正确，回执层 4 处自相矛盾；**12 个非 flow kind 无 lint 门禁** |

### 条目

| 编号 | 级别 | 状态 | 主题 | 结论 |
|:--|:--:|:--|:--|:--|
| **AUD-116** | P1 | 已确认 | 三源分发，LLM 默认拿到最简规范 | `ReadResource` 三条路径中 `segments/*.md` 全文仅 legacy URI 可达，而 thin description 只指向 kind-spliced 路径 ⇒ `Color[...]`/`Font[...]`/`ShowValues`/`Grid`/`Attach`/属性值域**对 LLM 默认不可见** |
| **AUD-117** | P1 | 已确认 | **C1 显式边带标签不实现** | spec §7.2 `w1 → #w5 [超时]` 与 `flow.md` 均文档化；实测 `w1 → #w2 [提交申请]` 与 `w1 → #w2 提交申请` **两种写法均报错**（方括号被并入目标 ID）。AUD-020 实测确证 |
| **AUD-118** | P1 | 已确认 | **C2 分支目标省略被静默丢弃** | spec §7.3 表格称「目标 … 可省略 = 接声明顺序下一节点」；实测 `是 →` 不产生任何边、无 err/warn。AUD-003 实测确证 |
| **AUD-119** | **P0** | 已确认 | **C3 N/DATA 被默认序流串入主流** | spec §5.5 与 `flow.agent.md` 红线 7 均称「N/DATA 不作默认流入目标」；实测 `W: n1: 备注 Type[N] Attach(#w1)` 紧邻主流时产生 `w1 → n1` 并报错。**引擎自身违约，LLM 无法通过改写 DSL 规避** |
| **AUD-120** | **P0** | 已确认 | **C4 官方正例 A 产出多余边 `w4 → w5`** | 三处同源（`flow.md` / `flow.agent.md` §4 / `mcp_tools.json` 的 flow 条目）共用同一份正例；实测 edges 含 `w4→w5`（w4/w5 为 q1 并列分支目标，不应相连）。**AUD-001 独立复现**；分支场景 T16 亦复现 `w2→w3` |
| **AUD-121** | P2 | 已确认 | 多目标出口标签唯一性约束未文档化 | `是 → #w2, #w3` 拆边成功但产生 warning「分支出口标签「是」重复（应唯一）」——卡中从未提及该约束 |
| **AUD-122** | **P0** | 已确认 | **C6 `flow.agent.md` 正例 B 不自洽** | §5 正例 B（来料检验）实测 lint 报错 `节点 w3（记录归档）孤立（无入边且无出边）`。⇒ **卡里的"正例"会被 MCP 自己的 `lintFlowDsl` 在渲染前拒绝**，错误信息无法从卡中推导修法 |
| **AUD-123** | P1 | 已确认 | `relation.md` 示例非法 | `Rel: m1 -> root` / `Rel: m2 -> root` 引用**从未定义**的 `root` 节点；parser 静默接受（8 节点 / 10 边含 2 条悬空边）⇒ 示例依赖未文档化的隐式 root |
| **AUD-124** | P1 | 已确认 | 三源示例漂移（量化） | 行命中率：9/14 kind = 100%；**basic 25% · pdpc 21% · radar 40% · relation 9% · scatter 80%** ⇒ 5 个 kind 的"官方示例"在 MCP 与协议切片里不是同一份 |
| **AUD-125** | P2 | 已确认 | `#` 注释污染示例 | 8/14 core 的 `official_example` 用 `#` 写注释（fishbone 15 行、affinity/pdpc 各 4、basic/matrix 各 3、arrow/relation 各 2、histogram 1），而 `DSL_V1.md` 红线 2 称「`#/##` 层级仅鱼骨图」⇒ 示例示范协议自标为不推荐的写法；`radar`/`scatter` 却用 `//` |
| **AUD-126** | P2 | 已确认 | 跨 kind 同名指令语义冲突无统一声明 | `Item:`（affinity=`id,label,parentId` vs pdpc=`id,label,[type]`）；`-` 列表项 4 种语义；`Grid:`（flow=线型 vs basic=开关）；`#`（fishbone=结构 vs 他处=注释）；边箭头（flow `→ #id` 全角 vs relation `Rel: a -> b` vs arrow `a -> b: d,l` vs pdpc `a--b [OK]`） |
| **AUD-127** | P1 | 已确认 | `Location` 维度顺序表述把约定写成定义 | 实现正确（`cell` 按**字典名**索引 `{"D":0,"P":1}`，与 Layout H/V 无关）；但 spec §5.3/§3.3 用「`Location(<D索引>, <P索引>)` = 行×列」表述，`Lane from D[..] Layout V` 时失效。**`flow.agent.md` 完全未说明此语义** |
| **AUD-128** | P1 | 已确认 | 六属性值域 / `Attr active` 在 agent.md 缺失 | `flow.agent.md` §3 只列属性名，值域（`Lv(重大\|重要\|一般\|1..3)`、`M(BPM\|1..4)`、`Time(24h)`）仅在 spec 附录 A 与 `flow.md`；`Attr active` 在 §1 BNF 出现但 §2–§7 正文无解释 |
| **AUD-129** | P1 | 已确认 | **示例被包进 ` ```dsl ` 围栏，与红线冲突** | `index.js:345` 与 `aiService.ts:119` 两处均包围栏，而全局红线为「禁止 Markdown 代码围栏」，且 `validate_dsl.mjs` 对含围栏的示例 `fail` ⇒ **门禁与分发自相矛盾**；示范围栏**诱导 LLM 输出围栏**。AUD-070 实测确证 |
| **AUD-130** | P1 | 已确认 | `render_flow` 在 `mcp_tools.json` 为死数据 | `index.js:326-331` 对 flow 特判走文件，其 `expert_logic`/`syntax_rules`/`official_example` 永不生效 ⇒ **三源漂移根因**（AUD-020/124/125 的共同来源） |
| **AUD-131** | P1 | 已确认 | `vchart/heatmap` 资源 URI 冲突 | `render_vchart_heatmap` 与 `render_vchart_correlation_heat` 的 `sub_type` **均为 `heatmap`**，`index.js:334` 的 `find` 只命中首个 ⇒ 第二工具资源不可达/内容错；`render_vchart_correlation_heat` 名称疑似截断 |
| **AUD-132** | P1 | 已确认 | JSON 纠错兜底示例对非 flow 工具失效 | `index.js:428` 判据 `t.parent_type === type`，而 `type="pareto"` 与 `parent_type="iqs_native"` **永不匹配** → 落到 `Title: 标题\nSpec: { ... }` ⇒ 非 flow 工具被纠正时收到**把 QC 工具导向 Spec JSON 的错误范式** |
| **AUD-133** | P1 | 已确认 | `lintFlowDsl` 静默失败 | `index.js:242-245` 异常时 `return null`，调用处 `if (flowLint && …)` 为假 ⇒ **静默跳过校验直接渲染**（超时 8s / spawn 失败 / 输出非 JSON 三种触发） |
| **AUD-134** | P1 | 已确认 | 非 flow kind 无 lint 门禁 | `dsl/index.ts` 的 `lintDsl()`（唯一跨 kind shell 校验）**无任何调用方**；`validate_dsl.mjs` 仅浅校验（`Title:` 存在 / 无围栏 / affinity 用 `Item:` / fishbone 用 `#`），**不跑真实解析器** ⇒ AUD-069 未闭环 |
| **AUD-135** | P2 | 已确认 | vchart 反红线未注入 thin description | `index.js:202-218` 只为 `render_flow` 与 `render_mermaid_flowchart` 特判；governance §2「存在 Native 散点/雷达时禁止默认走 `render_vchart_scatter`/`render_vchart_radar` 充当 QC 终稿」**在 `list_tools` 层不可见** |
| **AUD-136** | P2 | 已确认 | 资源索引重复列同一 kind 两个 URI | `index.js:304-320` 的 `protocol://segments` 同时列 File segments 与 Kind resources ⇒ LLM 可能两个都读，token 翻倍（与 ILDR 省 token 目标相悖） |
| **AUD-137** | P3 | 已确认 | 仓库残留交付物 | `mcp-server/mcp_tools.json.bak`（101 KB）与 `mcp-server/test_fishbone.png` |

### R20 的正面结论（未构成缺陷）

1. `mcp_tools.json` 的 **14 个 `official_example` 全部可解析**（14/14 ✅）且产出完整图。
2. `Location()` 的**实现语义正确**（按字典名索引），`Lane from` 与坐标解耦。
3. **`flow` 是唯一一个 LLM 能拿到完整规范的 kind**（`ReadResource` 特判读 `flow.agent.md` + `flow.md`）。
4. `mcp_tools.json` 的 `description` 长度 26–63 字符，**符合「瘦描述」原则**。
5. MCP 的 `tier` 分流（core 优先排序）、按需读资源、`lintFlowDsl` 回执机制**设计方向正确**，缺陷集中在实现细节与数据一致性。

### R20 修复优先级

| 优先级 | 动作 | 条目 |
|:--|:--|:--|
| **P0** | 修 `flow.agent.md`/`flow.md` 正例 B（加入边或改结构）使通过自家 lint | AUD-122 |
| **P0** | 修默认顺序流：分支目标之间不得自动连；N/DATA 不作默认流入目标 | AUD-119 / AUD-120 |
| **P0** | 决策显式边标签与分支目标省略——**实现之**或**从 spec/flow.md 移除** | AUD-117 / AUD-118 |
| **P1** | **单一真源**：`mcp_tools.json` 的 flow 条目删除或改为从 `flow.agent.md` 生成 | AUD-130 / AUD-124 |
| **P1** | 移除 `official_example` 的围栏（MCP + 前端两处） | AUD-129 |
| **P1** | 补齐 `flow.agent.md`：属性值域 / `Attr active` / `Grid` / `Color[Slot]` / `Location` 语义 / `Lane from` 对齐 | AUD-127 / AUD-128 / AUD-116 |
| **P1** | 新增「跨 kind 同名指令对照表」并入 `protocol/DSL_V1.md` | AUD-126 |
| **P1** | 修资源 URI 冲突 / 兜底示例 / lint 静默 / 门禁跑真解析器 | AUD-131 / AUD-132 / AUD-133 / AUD-134 |
| **P2** | 统一示例注释为 `//`；修 `relation.md` 示例 `root`；修 radar 场景标题；注入 vchart 反红线 | AUD-123 / AUD-125 / AUD-135 |
| **P3** | 清理 `.bak` / `.png` 残留 | AUD-137 |

---

## 待验证队列

| 编号 | 事项 | 状态 |
|:---|:---|:---|
| V-29 ~ V-45 | 内核定案 → D3/D2 → 通用性 → 混合内核 → **生产落地** | ✅ 完成（R11–R18） |
| **V-46** | `GuardedShift`（T2）处理决策 | ✅ **已决策并执行：停用**（AUD-111） |
| **V-19 / V-20** | 对齐不变量 CI 化 / 关掉射线松弛后重跑 | ✅ **完成**（AUD-112/114，列对齐 0.0px） |
| **V-47** | 安装 devDependencies 后跑 `tsc --noEmit` | ✅ **完成**（`TSC_EXIT=0`，零类型错误） |
| **V-48** | **新增**：`assert_flow_svg.ts` 的余下"存在性"断言逐条改为"语义断言"（延续 AUD-067 的修正） | 待做 |
| **V-49** | **新增**：把 R1（同类节点同尺寸）/ R4（拐点吸附）/ R5（叠线）从"软指标"逐步转硬 | 待做 |
| V-23 / V-24 | 方案 B 延伸列位归属（AUD-091）/ 溢出方向策略 | 待做 |
| V-22 | 格内堆叠 vs 溢出产品决策 | 待决策 |
| V-13 | 往返一致性运行期复现 | ⚠️ 受阻（`.tsx` 无法 load） |
| V-06 / V-07 | 文档 / 代码缺口 | 部分完成 |
| V-10 | M8 合并引理复核 | 待做 |
| V-14 ~ V-18 | 目视核对 / `buildPNG` / `upsertKv` / AUD-083 重跑 / 回折消解 | 待做 |

---

## 修复优先级建议（累计）

| 优先级 | 条目 | 动作 |
|:---|:---|:---|
| ✅ **已完成** | 110 / 109 / 108 / 104 / 107 | L4 布线内核换代落地（Σ折弯 −45%、190 断言零回归） |
| ✅ **已完成** | 111 / 112 / 113 / 114 / 115 | 停 T2 · 删射线松弛（列对齐 0.0px）· 判据补符号 · 对齐不变量 CI · 文档迁移 |
| **P0** | **083 / 107 余项** | 折弯与回折判据的**其余同源处**核查（`getTheoreticalBends` 等） |
| **P0** | 060, 031, 030 | T2 相关遗留代码清理（`GuardedShift.ts` 现无调用方） |
| **P0** | 053, 059 | `BACK_EDGE_LABELS` 去 `'否'`；回边判据改拓扑 |
| **P0** | 001, 002 | 修默认流分支扇出误连 + 修正官方正例（4 处同源） |
| **P0** | 039, 040 | 修 `#11` 填充顺序 + 重写 `R6` |
| **P0** | 043, 044, 045 | BPMN：`parent` 赋值、lane 逐索引、`documentation` |
| **P1** | 105, 101, 102, 027, 028, 029, 084, 088, 089 | 布线内核细节；叠线（088）暂缓 |
| **P1** | **087, 091** | stencil 统一尺寸 / 延伸列位归属原阶段 |
| **P1** | 069, 073, 067, 070, 080, 076 | 门禁链 + 读写路径（AUD-067 已部分修正，见 V-48） |
| **P1** | 003, 004, 005, 006, 011, 012, 014, 066 | 解析器静默失败与校验缺陷 |
| **P1** | 046, 061, 062 | BPMN `isDefault` 归位；两趟端口分配；腾挪改整列/整行 |
| **P2** | 009, 010, 017, 018, 041, 051, 054, 055, 064, 071, 075, 079, 092, 094, 099 | canonical 契约 / Attr 聚合 / 岗位图例 / 嵌套几何 / 落点语义 / 测试保真 / 未证命题 / 层边界 / 原型勘误 |
| **P3** | 015, 016, 019, 020, 022, 024, 037, 038, 042, 047, 048, 056, 058, 063, 065, 072, 074, 078, 081, 082, 085, 093, 097 | 死代码 / 文档漂移 / 命名通胀 / 导出保真 / 依赖成熟度 / 参数一致性 |

---

*台账维护：逐轮追加新条目，编号严格递增不回收；已修复条目改状态为 `已修复(commit)` 并保留原文。*
