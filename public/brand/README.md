# IQS 品牌资产

> 与 **鹿溪联合创新实验室** 官方主标对齐。  
> 实验室主 LOGO 源文件：  
> `Obsidian/departments/lab/鹿溪联合实验室/LUXI LAB.svg`

## 色板（产品 IQS + 实验室）

| 名称 | 色值 | 用途 |
|:---|:---|:---|
| 鹿溪绿 | `#0D5E42` | IQS 产品标底、部分 UI |
| 源启白 | `#F5F7FA` | IQS 面板反白 |
| 进化蓝 | `#00D2FF` | IQS 溪流 / 源启星 |

实验室主标本身为写实鹿标矢量（官方稿），含白底画板。

## 文件层级

| 文件 | 角色 |
|:---|:---|
| **`luxi-lab.svg`** | **★ 实验室主 LOGO（权威）** — 自 `LUXI LAB.svg` 同步，已做网页 `preserveAspectRatio` / 渐变 id 去冲突 |
| `LUXI LAB.svg` | 官方文件名副本（未改内容） |
| `luxi-lab-v2.svg` | Version 2 归档 |
| `luxi-lab-mark.svg` | **同主 LOGO**（兼容旧路径，指向官方主标） |
| `luxi-lab-mark-geometric.svg` | 旧几何 Y+L 实验稿（听默资产库，**非**主标） |
| `luxi-lab-lockup.svg` | 几何标+字锁实验稿（备用，非主标） |
| `luxi-lab-original.svg` | 听默工程内写实稿快照（历史） |
| `iqs-mark.svg` / `../favicon.svg` | **IQS 产品**方标（控制图语义） |
| `iqs-logo.svg` | IQS 横版字锁 |

## UI 引用约定

```text
实验室主标  →  /brand/luxi-lab.svg
产品方标    →  /brand/iqs-mark.svg
favicon     →  /favicon.svg
```

## Obsidian 平行归档（与见鹿 / 听默同级）

完整范式与源稿副本：

`/Users/kwangwah/Obsidian/departments/lab/智控-IQS/`

- 产品标：`brand/favicon.svg` · `brand/iqs-mark.svg` · `brand/IQS-产品标识.svg`
- 实验室主标：`brand/luxi-lab/LUXI LAB.svg`（权威同源）
- 说明：`智控-IQS/README.md`

## 同步官方主标

```bash
# 1) 官方源 → Obsidian 产品归档
cp "/Users/kwangwah/Obsidian/departments/lab/鹿溪联合实验室/LUXI LAB.svg" \
   "/Users/kwangwah/Obsidian/departments/lab/智控-IQS/brand/luxi-lab/LUXI LAB.svg"

# 2) 官方源 → 本工程
cp "/Users/kwangwah/Obsidian/departments/lab/鹿溪联合实验室/LUXI LAB.svg" public/brand/"LUXI LAB.svg"
# 再生成网页优化 luxi-lab.svg（preserveAspectRatio / 渐变 id）
```

修改标识时：**先改 Obsidian 官方 / 产品归档源稿，再同步进 `public/brand/`**。