# 澄矩 · ChengJu (IQS) 品牌资产

> 遵循 **LUXI Design System v1.0**（鹿溪设计范式，仓库 `LUCY-DESIGN`）。
> 产品定位：`工坊·一法` 矩阵 · accent `#0D5E42` 鹿溪绿 / `#00D2FF` 进化蓝 · theme `light` · density `compact`
> 参考实现：`LUCY-DESIGN/Sample/luxi-scenario-kit-final.html` §VI 视觉 VI

## 色板（范式 core 四色）

| 名称 | Token | 色值 | 用途 |
|:---|:---|:---|:---|
| 鹿溪绿 | `--luxi-green` | `#0D5E42` | 产品标底、Primary 按钮、描边基色 |
| 源启白 | `--origin-white` | `#F5F7FA` | 画布底、方标内图形 |
| 进化蓝 | `--luxi-cyan` | `#00D2FF` | 溪流、焦点环、数据高亮 |
| 标题金 | `--luxi-gold` | `#F1C40F` | 源启星、落点、命中热区 |

> 令牌定义见工程根 `index.css`（`--luxi-*` 为范式原语，不可覆写）。

## 产品方标范式（`.brick`）

**48×48 鹿溪绿圆角砖（圆角 12px，纯色）** + **24 视口单色业务图形（`stroke 1.7`）**
+ **底部水平溪流** + **右上角金色五角星**。

澄矩业务图形 glyph＝`控制限 + 正交走线`：

```svg
<path d="M4 10h16M10 4v16" fill="none" stroke="#F5F7FA" stroke-width="1.7"
      stroke-linecap="round" stroke-linejoin="round"/>
```

> ⚠️ 方标底砖为**纯色**（范式禁渐变底）；业务图形为**单色**（`currentColor` = 源启白）。

## 文件层级（现行）

| 文件 | 角色 |
|:---|:---|
| **`luxi-lab.svg`** | **★ 实验室主标（权威）** — ＝ LUXI Design System §VI `<symbol id="luxi-lab-mark">`（鹿溪绿主体 + 进化蓝溪流） |
| `luxi-lab-mark.svg` | 同主标（旧路径兼容） |
| **`iqs-mark.svg`** | **★ 产品方标** — `.brick` 范式（正交十字 glyph） |
| `../favicon.svg` | 站点图标 — **与产品方标同源** |
| `iqs-logo.svg` | 横版字锁（产品方标 + 中文优先字名 + 实验室署名） |
| `archive/` | **非规范稿归档**（写实稿 / 几何实验稿 / 历史快照）— 不得对外使用 |

## UI 引用约定

```text
实验室主标  →  /brand/luxi-lab.svg
产品方标    →  /brand/iqs-mark.svg
favicon     →  /favicon.svg
横版字锁    →  /brand/iqs-logo.svg
```

## 范式禁令（DESIGN.md §1.3）

- ❌ 不得重绘、修改实验室主标
- ❌ 不得用几何实验稿（旧 Y+L 稿）充当主标 → 已归档至 `archive/`
- ❌ 产品方标不得复用其他产品的业务图形；不得复刻实验室标
- ❌ 界面中产品标与实验室标**必须并排等大**（`64×64` 或 `48×48`），不得一大一小
- ❌ 色值必须来自令牌（禁止游离色）

## 关于归档目录

`archive/` 保留范式落地前的旧稿（`LUXI LAB.svg` 写实稿、`luxi-lab-v2.svg`、
`luxi-lab-mark-geometric.svg`、`luxi-lab-lockup.svg`、`luxi-lab-original.svg`、
`luxi-lab-mark-512.png`），**仅为追溯证据**，全库引用数为 0。
详见 `archive/README.md`。
