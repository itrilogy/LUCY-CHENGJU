# 矩阵图高压测试用例 (High-Density Test Cases)

这些示例旨在测试大量数据下的渲染压力和自动缩放表现。

---

## 1. 复杂 L-Type (12 x 15)
测试大规模行列合并与计算。

```yaml
Title: 核心指标映射矩阵 (12x15 Dense)
Type: L
CellSize: 32
Font[Base]: 10

Axis: R, 需求项
- r01, 性能, 9
- r02, 功耗, 8
- r03, 延时, 9
- r04, 抖动, 7
- r05, 吞吐, 9
- r06, 存储, 6
- r07, 并发, 8
- r08, 安全, 9
- r09, 容错, 7
- r10, 恢复, 6
- r11, 扩展, 5
- r12, 成本, 4

Axis: T, 技术指标
- t01, CPU
- t02, RAM
- t03, IOPS
- t04, BW
- t05, LAT
- t06, CACHE
- t07, BUS
- t08, OS
- t09, DRV
- t10, API
- t11, DB
- t12, SEC
- t13, NET
- t14, APP
- t15, WEB

Matrix: R x T
r01: t01:S, t02:M, t06:S, t07:W
r02: t01:S, t04:M, t09:S
r03: t05:S, t07:M, t13:S
r04: t05:M, t13:W
r05: t03:S, t04:S, t13:S
r06: t02:M, t03:S, t11:S
r07: t01:M, t10:S, t11:S, t15:M
r08: t12:S, t10:M, t08:W
r09: t08:S, t09:M, t11:W
r10: t11:S, t14:M
r11: t10:M, t15:S
r12: t14:W, t15:W
```

---

## 2. 复杂 T-Type (中央 10 x 两翼 10)
测试三维投影的对称性。

```yaml
Title: 生产要素全关联 (Dense T)
Type: T
CellSize: 35

Axis: A, 核心工艺
- a01, C1, 10
- a02, C2, 8
- a03, C3, 9
- a04, C4, 7
- a05, C5, 6
- a06, C6, 5
- a07, C7, 4
- a08, C8, 3
- a09, C9, 2
- a10, C10, 1

Axis: B, 原料端
- b01, M1, 2
- b02, M2, 1
- b03, M3, 1
- b04, M4, 1
- b05, M5, 3
- b06, M6, 1
- b07, M7, 2
- b08, M8, 1
- b09, M9, 1
- b10, M10, 1

Axis: C, 设备端
- c01, E1, 1
- c02, E2, 3
- c03, E3, 1
- c04, E4, 2
- c05, E5, 1
- c06, E6, 1
- c07, E7, 1
- c08, E8, 1
- c09, E9, 1
- c10, E10, 1

Matrix: A x B
a01: b01:S, b02:M
a03: b03:S
a05: b05:W, b06:S
a07: b07:M
a09: b09:S, b10:W

Matrix: A x C
a02: c02:S, c03:M
a04: c04:S
a06: c06:W, c07:S
a08: c08:M
a10: c10:S, c01:W
```

---

## 3. 复杂 Y-Type (每轴 8 项)
测试环状关联的密集程度。

```yaml
Title: 闭环因素分析 (Dense Y)
Type: Y
Orientation: Top
CellSize: 35

Axis: A, 需求轴
- a1, R1, 9
- a2, R2, 3
- a3, R3, 1
- a4, R4, 9
- a5, R5, 3
- a6, R6, 1
- a7, R7, 9
- a8, R8, 3

Axis: B, 功能轴
- b1, F1, 5
- b2, F2, 5
- b3, F3, 5
- b4, F4, 5
- b5, F5, 5
- b6, F6, 5
- b7, F7, 5
- b8, F8, 5

Axis: C, 构建轴
- c1, B1, 2
- c2, B2, 2
- c3, B3, 2
- c4, B4, 2
- c5, B5, 2
- c6, B6, 2
- c7, B7, 2
- c8, B8, 2

Matrix: A x B
a1: b1:S, b2:M
a3: b3:S, b4:W
a5: b5:S
a7: b7:M, b8:S

Matrix: B x C
b2: c2:S
b4: c4:M, c1:W
b6: c6:S
b8: c8:S

Matrix: C x A
c1: a1:S
c3: a3:M, a5:W
c5: a5:S
c7: a7:S, a2:W
```

---

## 4. 复杂 X-Type (全方位 8 x 8)
四个象限全覆盖。

```yaml
Title: 供应链全景分析 (Dense X)
Type: X
CellSize: 35

Axis: N, 流程 (North)
- n1, P1, 10
- n2, P2, 8
- n3, P3, 6
- n4, P4, 4
- n5, P5, 2
- n6, P6, 1
- n7, P7, 1
- n8, P8, 1

Axis: E, 部门 (East)
- e1, D1, 5
- e2, D2, 5
- e3, D3, 5
- e4, D4, 5
- e5, D5, 5
- e6, D6, 5
- e7, D7, 5
- e8, D8, 5

Axis: S, 资源 (South)
- s1, R1, 3
- s2, R2, 3
- s3, R3, 3
- s4, R4, 3
- s5, R5, 3
- s6, R6, 3
- s7, R7, 3
- s8, R8, 3

Axis: W, 目标 (West)
- w1, G1, 9
- w2, G2, 9
- w3, G3, 9
- w4, G4, 9
- w5, G5, 9
- w6, G6, 9
- w7, G7, 9
- w8, G8, 9

Matrix: W x N
w1: n1:S, n2:M
w3: n3:S
w5: n5:W, n6:S
w7: n7:M

Matrix: E x N
e1: n1:M, n3:S
e3: n5:S
e5: n7:M, n8:S

Matrix: E x S
e2: s2:S
e4: s4:S, s1:W
e6: s6:M

Matrix: W x S
w2: s2:M
w4: s4:S
w6: s6:S, s8:W
```

---

## 5. 复杂 C-Type (12项超大屋顶)
测试三角矩阵的极值表现。

```yaml
Title: 核心架构冲突矩阵 (Large Roof)
Type: C
CellSize: 40

Axis: T, 架构分量
- t01, A1, 10
- t02, A2, 9
- t03, A3, 8
- t04, A4, 7
- t05, A5, 6
- t06, A6, 5
- t07, A7, 4
- t08, A8, 3
- t09, A9, 2
- t10, A10, 1
- t11, A11, 1
- t12, A12, 1

Matrix: T x T
t01: t02:S, t05:M, t09:W
t03: t04:S, t06:M
t07: t08:S, t10:W, t12:S
t02: t11:M
t05: t07:S
t09: t10:M
```
