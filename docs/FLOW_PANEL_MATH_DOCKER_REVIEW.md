# IQS-Flow：Editor / 属性标注 / 数学引擎 / Docker —— 分析结论与改进方案

> **文档状态**: 分析结论 + 改进方案（供评审，默认不改代码）
> **日期**: 2026-09-02
> **基线**: 本地 `ca9dac4`（方案主线已落地；相对 `origin/main` 未 push）
> **过程记录**: `docs/FLOW_NEXT_PHASE_PLAN_NOTES.md` 本节对应追加
> **密钥**: DeepSeek 实测已做；**密钥不入库、不写入本文**

---

## 0. 结论先行

当前 Flow **能画、能校验、能 MCP 出图**，短板不在「有没有引擎」，而在 **作者面（Editor/知识库/属性）与部署面（Docker 可运行性）仍薄于规范承诺**；数学上 T2 已接上，但距离 FRAMEWORK 分层表里「就近走廊 / 可证单边最优」还有明确的下一台阶。

| 议题 | 现状一句话 | 建议 |
|:---|:---|:---|
| DeepSeek | Key 可用；**薄提示会发明假 DSL**；注入 `render_flow` 协议后可解析通过 | Editor AI 必须走现有 `generateLogicDSL`（已注入协议）；知识库/MCP 编译卡继续加厚 |
| 帮助知识库 | 10 行速查表，缺六属性、Attr、分支文法、校验、正反例 | 内嵌 `protocol/segments/flow.md` + `flow.agent.md` 的人读版，分「速查 / 全量 / 反例」 |
| 节点属性面板 | 只暴露 SOP/Role；**不跟 `Attr active` 动态显隐**；无 Lv/Time/KPI/M | 六键按 Attr active 生成输入行；未激活也可折叠「全部属性」 |
| 右下角标注 | `flowToSVG` **只画 Role** | 按 `attrPanel.active` 顺序，只显示该节点**有值**的项，多行右下对齐 |
| 其它功能 | Color 不回写 DSL；无 Attr 开关；网关出口不能在手动页改；AI 失败无 parser 回炉 | 见 §6 |
| 数学 | T2 已上、Φ 不增有断言；无 J\* 合并、无 Dijkstra、无 overlap 项；初扫射线仍无守护 | 见 §7 分层，不承诺一般图全局最优 |
| Docker | Compose 骨架在，但 **生产用 vite preview、镜像可能带密钥、Chromium/无头基址有坑** | 见 §8 部署设计 |

**不要做的**：把用户提供的 API Key 写进 `public/config.js` / `.env` 并提交。仓库里 `public/config.js` **已经硬编码了另一把 Key**，属安全债，应改为空占位。

---

## 1. DeepSeek 实测（不记录密钥）

配置：`public/config.json` → `deepseek_public` → `https://api.deepseek.com/v1/chat/completions` / `deepseek-chat`。本次用用户指定 Key 直连，HTTP 200，网关实际模型名返回 `deepseek-v4-flash`。

### 1.1 薄提示（失败）

只告诉模型「Dict 先于 Lane、禁止 Mermaid」时，产出的是**自造语言**：

```
Project "两部门采购审批" { Lane "采购部" { Start "申请采购" -> Decision ... } }
```

这不是 IQS-Flow，解析器无法消费。说明：**list_tools 一行薄描述不够让模型写对**，必须 read 编译卡或把 protocol 打进 system prompt。

### 1.2 注入 `mcp_tools.json` 的 render_flow 协议（成功）

使用现有 `expert_logic + syntax_rules + official_example` + Flow 红线后，产出可解析 DSL（`parseFlowDSL` **0 error / 0 warning**）：Dict / 双泳道 / `Type[?]` + `End` / Location / Role 均合法。语义上「经理审批 → 直接执行」略怪，但是语法正确——这是业务质量问题，不是解析问题。

### 1.3 对 Editor AI 的含义

`services/aiService.ts` 的 `generateLogicDSL(..., FLOW, 'flow')` **已经走这条成功路径**（constraint 5 已改、max_tokens=4000）。只要运行时 `window.APP_CONFIG.API_KEY` 或 `process.env.API_KEY` 有效，面板「AI 推理」即可用。

缺口：

1. 生成后**没有**用 `parseFlowDSL` 做第二轮纠错（方案 C §8.6 写过，未做）。
2. 开发态 `public/config.js` 与 Docker `dist/config.js` 注入路径不一致；本地 `npm run dev` 是否读到 Key 取决于 Vite define + `config.js` 是否被 index.html 加载。
3. 切勿把本次 Key 提交进 git。

---

## 2. Editor 面板：设计评估与优化

### 2.1 已经对齐的部分

- LUXI LAB 深色侧栏：Header / 三 Tab / teal 选中 / 重置 / 知识库。
- DSL 单一数据源：手动页改动 patch DSL 再 parse。
- 手动页已有：Title、Layout、Dict 芯片、泳道索引多选、节点 Type/Location/vh、SOP/Role、Color 色板（仅 styles，不写回 DSL）。

### 2.2 仍与「其它组件 + 规范」不一致的点

| 点 | 其它组件 / 规范 | Flow 现状 |
|:---|:---|:---|
| 帮助 | 鱼骨：表格式知识库 + 双 Tab 长文 | 10 行语法表，无校验 18 条、无六属性全表、无正反例 |
| 属性 | SPEC 六键 + `Attr active` | 面板写死 SOP+Role 两格 |
| Attr 开关 | DSL `Attr active [Role,SOP,…]` | 手动页**没有**多选；只能改 DSL |
| Color | DSL `Color[Slot]:` | 色板改 styles，**flowToDsl 不序列化 Color**，切 DSL Tab 会丢 |
| 网关出口 | 规范核心 | 手动页不能增删「是/否 → #id」 |
| 轴标题 | AxisX/Y/Axis Align | 手动页无 |
| 错误 | 其它编辑器内容区红条 | DSL 页有；手动页改坏 DSL 只靠底栏 |
| 节点列表 | — | 一节点一块已较挤；缺折叠、缺删除节点 |

### 2.3 建议的面板信息架构（下一档，不发明第四种壳）

保持现骨架，手动页改为 **「结构摘要 + 按需展开」**：

1. **课题**：Title、Layout（已有）。
2. **数据层 Dict**：已有芯片；补「保留字 D/P/R 锁定改名」。
3. **Attr active**：六键开关芯片，顺序即可编辑（上移/下移或拖拽）。**这是右下角标注与属性输入的单一开关。**
4. **泳道**：已有索引多选；补 AxisX/Y 文本。
5. **节点卡片（折叠）**：默认一行（类型色点 + 标签 + id）；展开后：
   - Type / Location / vh（已有）
   - **动态属性行** = `Attr active` 中的键；另提供「显示全部六键」
   - 网关：分支表（标签、目标、否则）
   - N/DATA：Attach
   - 删除节点
6. **颜色**：改 styles 的同时 upsert `Color[Slot]:` 行，避免 DSL 往返丢失。

原则不变：所有控件只改 DSL 字符串，不直接改 `data` 双源。

---

## 3. 流程图知识库（帮助按钮）

### 3.1 缺口

当前帮助是硬编码 10 行，相对权威源严重缩水：

- 人读全量：`docs/IQS_FLOW_DSL_SPEC.md`、`protocol/segments/flow.md`
- 模型编译卡：`protocol/segments/flow.agent.md`（BNF、8 红线、2 正例、3 反例）

缺失块：六属性值域、`Attr active`、默认顺序流断点、校验 18 条、子流程块、并行 `+`、`否则`、Color 槽、禁止 Mermaid。

### 3.2 方案

帮助改为 **三 Tab**，内容从协议文件生成，禁止再手写一份会漂的 HELP 字符串：

| Tab | 内容源 |
|:---|:---|
| 速查 | 现有 10 行表 + 类型/属性一行表 |
| 全量规范 | `protocol/segments/flow.md` 渲染为 Markdown（或按段拆成表格） |
| 反例与校验 | `flow.agent.md` §红线 + SPEC §10 18 条 |

实现上：`fetch('/protocol/...')` 在 Vite 未暴露 protocol 目录，故应 **构建期把 `flow.md` / `flow.agent.md` 拷到 `public/protocol/`**，或在组件内 `import raw from '...md?raw'`。推荐 `?raw` 导入，与仓库单一权威源同步。

---

## 4. 节点属性：DSL 有、面板不全、且非动态

### 4.1 规范

六键：`SOP / Role / Lv / Time / KPI / M`。`Attr active [Role,SOP,Lv,…]` 决定：

- 图例边栏聚合哪些键（已实现，但是**去重列表**，没有 SPEC §6.4 的计数/评分/关键路径时长公式）。
- **并未**规定右下角只显示 Role——那是实现简化。

### 4.2 面板

写死两个 input：SOP、Role。`Attr active` 不含 SOP 时，SOP 仍出现；含 Lv 时，Lv 不出现。这就是「并非动态」。

### 4.3 改进

```
visibleKeys = attrPanel.active?.length ? attrPanel.active : ['sop','role','lv','time','kpi','m']
```

每个节点展开区按 `visibleKeys` 顺序渲染输入。另：全局「Attr active」芯片与此同源。

Lv / M 用枚举下拉（重大|重要|一般、1–4 / BPM），Time/KPI 自由文本。

---

## 5. 节点右下角：按 Attr active 顺序显示有值项

### 5.1 现状

```396:398:components/flow/flowToSVG.ts
    const roleRaw = p.n.attrs?.role;
    const roleText = roleRaw ? expandRef(data, roleRaw) : undefined;
    parts.push(nodeShape(p.n, st, p.x, p.y, p.W, p.H, roleText));
```

`nodeShape` 只接收一个 `roleText`，画在右下角一行。

### 5.2 建议语义（与你的描述对齐）

对每个节点：

1. 取 `data.attrPanel.active`（无则默认 `[role]`，保持旧图观感）。
2. 按该顺序遍历；节点上该键有非空值则 `expandRef` 后纳入。
3. 右下角**多行**，右对齐，行高 10px，字号 8–9；最多 4 行，超出截断 + 图例边栏仍有全集。
4. 无任何有值项则不画，避免空标注撑高。

几何：标注占用节点盒下方，可能与连线走廊重叠。应用 **不计入碰撞盒**（仍只碰撞节点本体），或把第一行贴在 `cy + H/2 + 11` 起向下排。若与邻格文字打架，再把行高计入 `ny>1` 余量（那是布局行为，需独立断言）。

**建议先做「不改碰撞盒的多行文字」**，用黄金格位快照保证节点中心不动。

---

## 6. 其它影响功能完善的点

| # | 点 | 影响 | 优先级 |
|:--|:--|:--|:--:|
| 1 | `public/config.js` 硬编码 API Key | 密钥进 git / 进 Docker 镜像 | P0 安全 |
| 2 | Color 不进 `flowToDsl` | 手动改色后切 DSL 丢失 | P1 |
| 3 | 生成后无 parse 回炉 | DeepSeek 偶发缺 End / 假语法 | P1 |
| 4 | Attr 图例无 SPEC 公式 | 边栏只是去重清单，非「评分/关键路径」 | P2 |
| 5 | 网关分支不能在手动页编辑 | 核心语法只能 DSL | P1 |
| 6 | `getSvgSize` 与绘制已对齐 styles | 已修 | — |
| 7 | BPMN waypoint 仍是端点两点 | 交换层折线失真 | P2 |
| 8 | 帮助与 MCP 编译卡双源 | 人看帮助、模型看 agent 卡，易再漂 | P1（帮助改导入 md） |
| 9 | 语法指南 03–17 仍空 | 对外教程不完整 | P3 |
| 10 | Docker 无健康检查 / 用 vite preview 当生产 | 见 §8 | P1 |

---

## 7. 数学层面：还能优化什么（诚实分层）

权威上限仍是 `FLOW_OPTIMALITY_FRAMEWORK.md` §0：**一般图不承诺解析全局最优**。已落地：A1–A6、CellOrder、MainlineOrder→二维 autoSeq、T2 守护位移（ΔΦ≤−150 才接受）。

### 7.1 已接上、但偏保守的 T2

- 接受条件等价于：**路由项至少改善 300**（约 3 个折弯）才换一次位移 150。两折弯改善会被拒绝——这是故意防止 2→4 恶化。
- 既有 **N/DATA 水平对齐、同列垂直射线** 仍是无 ΔΦ 的初扫；T2 只处理其后仍 B≥3 的边。采购样例黄金快照上 T2 `accepted=0`（该图无需再挪）。
- Φ 的 `w_X·overlap` **仍未实现**，重叠只靠候选过滤与走廊错位的偶然性。

### 7.2 值得做的下一数学台阶（按性价比）

| 阶 | 内容 | 意图 | 风险 |
|:--|:--|:--|:--:|
| **M1 同走廊通道分配** | 同侧多边显式 0.25/0.5/0.75 错位，而不是碰运气 | G1 可读、少叠线 | 中，可加断言 |
| **M2 Φ 加入 overlap** | 与已绘线段网格占用计数，进入 `computeCost` | 让 T2/选路看见交叉 | 中，需黄金快照 |
| **M3 初扫并入 T2** | 取消无守护垂直/水平射线，一律走 ΔΦ | 闭合「2→4」类初扫 | 高，可能改黄金格位 |
| **M4 J\* 合并** | 先证「合并不增 bend/len/箭头」再实现 | A3 从近似到算子 | 高，先写引理 |
| **M5 单边 Dijkstra（T1）** | 通道网格 × 4 方向最短路替换分级候选 | 可证单边最优 | 中，性能要测 |
| **M6 离线 ILP（T3）** | 不进在线；作黄金基线量化 gap | 回归与论文 | 低（可选依赖） |

**不建议**：再开第四套权重；无条件 B≥3 位移；宣传一般图全局最优。

### 7.3 与「画得整齐」直接相关的工程数学

用户观感问题多半不是 NP-hard，而是：

1. 长回边强制外侧（列差≥2）——短回边仍可能穿内部。
2. 回边词表中文绑死。
3. 同走廊重叠。
4. 右下角多行标注侵入走廊。

**M1 + 右下角多行（不改盒）+ 回边词表配置化** 对「看起来整齐」的边际大于立刻上 Dijkstra。

---

## 8. Docker 部署：设计、缺口、使用说明（方案）

### 8.1 现有设计

```
Dockerfile 多阶段：builder (npm run build) → production (node:22-slim + chromium)
compose：12000 Web（vite preview）+ 12001 MCP SSE
entrypoint：写 dist/config.js（API_KEY / AI_ACTIVE_PROFILE）→ preview & → mcp start:sse
```

同一容器内 MCP 无头访问 `IQS_BASE_URL=http://localhost:5173` **逻辑自洽**。Chromium 路径表已含 `/usr/bin/chromium`。中文字体装了 `fonts-wqy-zenhei`。

### 8.2 缺口（会影响「能部署、能用」）

| 缺口 | 后果 |
|:---|:---|
| 生产用 `vite preview` | 非静态服务器，无 gzip/缓存/安全头；build 已有 `dist/`，应用 nginx 更稳 |
| `COPY public` 进镜像 | 若 `public/config.js` 含 Key，**密钥打进镜像层** |
| `npm run build` 含 `test:flow` | 镜像构建变慢，但有利于质量；可 `ARG SKIP_TEST` |
| 无 HEALTHCHECK | compose 无法等 Web 就绪就起 MCP（现靠 `sleep 5`） |
| Puppeteer 自带 chrome vs 系统 chromium | 应 `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`、`PUPPETEER_SKIP_DOWNLOAD=true` |
| `--no-sandbox` 已有 | 容器内需要，保持 |
| 无反向代理说明 | 外网只应暴露 443，5173/3000 内网 |
| 文档未写「MCP 客户端怎么连」 | Cursor / Claude 配 SSE URL 示例缺失 |
| IQS_BASE_URL 写死 localhost | 若拆成两容器，MCP 必须改成 `http://web:5173` |

### 8.3 推荐目标形态

```
[用户浏览器] → nginx:80/443
                 ├ /            静态 dist/
                 └ /mcp        反代 MCP SSE :3000
[MCP 无头] → http://127.0.0.1:5173  或  http://web:5173
环境变量：API_KEY、AI_ACTIVE_PROFILE、IQS_BASE_URL、PUPPETEER_EXECUTABLE_PATH
密钥：只在运行时注入 dist/config.js 或 nginx 不托管的内存配置，永不 COPY 进构建上下文
```

短期（少改）：保留单容器 + vite preview，补：

1. `.dockerignore` 排除 `.env`、`public/config.js` 中的密钥（config.js 改为空 Key）。
2. env：`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`。
3. entrypoint 等 `wget -qO- http://127.0.0.1:5173` 就绪再启 MCP，替代 sleep 5。
4. HEALTHCHECK `curl -f http://127.0.0.1:5173`。

中期：nginx 静态 + 同镜像或 sidecar MCP。

### 8.4 使用说明（可直接贴进手册的草案）

**本机 Docker**

```bash
cp .env.example .env
# 编辑 .env：API_KEY=（DeepSeek Key，勿提交）
# AI_ACTIVE_PROFILE=deepseek_public

docker compose up -d --build
# Web  http://localhost:5173
# MCP  http://localhost:3000/sse
```

**MCP 客户端（SSE）**

```json
{
  "mcpServers": {
    "iqs": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

画流程图时选工具 `render_flow`，或先 `read protocol://segments/iqs_native/flow`。

**源码开发（对照）**

```bash
cp .env.example .env
npm install
npm run dev          # :5173
npm run mcp:sse      # :3000，需 IQS_BASE_URL=http://localhost:5173
```

**注意**

- 浏览器里的 AI 推理读的是运行时 `APP_CONFIG.API_KEY`，不是 `config.json` 里的 endpoint 以外的秘密。
- 更换 Key 只需改 `.env` 后 `docker compose up -d`（entrypoint 会重写 `dist/config.js`），不必重建镜像。
- 不要把 Key 放进 `public/config.js` 再 build。

---

## 9. 建议实施顺序（供你拍板）

不自动改代码。若继续执行，建议：

```
S0  安全：清空 public/config.js 的硬编码 Key；.gitignore 确认 .env
S1  右下角按 Attr active 有值项多行显示（节点中心不变，黄金快照锁定）
S2  面板：Attr active 芯片 + 六属性动态输入；Color 回写 DSL
S3  知识库三 Tab，?raw 导入 protocol md
S4  AI 生成后 parse 回炉 1 次
S5  Docker：Chromium env、健康检查、密钥不进镜像；补手册 §Docker 操作级
S6  数学 M1 同走廊错位 + Φ overlap（独立守护，碰黄金快照则回滚）
```

S1–S4 是作者体验；S5 是能交给别人部署；S6 才动「画得更整齐」的数学。与「核心还是布局/连线数学」并不冲突：**先把 Attr 标注和帮助做对，避免用数学去补产品语义债。**

---

*分析人: 智能体（对照实现 + DeepSeek 实测 + Docker 文件）*
*密钥未写入仓库*
