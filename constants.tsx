import React from 'react';
import { Zap, BarChart3, LineChart, PieChart, ScatterChart, Activity, Workflow, Network, Boxes, Grid3X3, GitBranch, BarChart2, Table, GitFork, Radar } from 'lucide-react';
import { QCToolType, FishboneNode, RadarData, FlowData, FlowChartStyles } from './types';
import { parseFlowDSL } from './components/flow/FlowParser';

export const TOOL_CONFIGS = [
  {
    type: QCToolType.FISHBONE,
    name: '鱼骨图',
    enName: 'Fishbone Diagram',
    desc: '用于分析问题与其潜在原因之间的关系，支持思维导图式交互。',
    icon: <GitBranch size={32} />,
    color: 'text-blue-500',
    bg: 'bg-blue-50/50',
    accent: '#0D5E42'
  },
  {
    type: QCToolType.PARETO,
    name: '排列图',
    enName: 'Pareto Chart',
    desc: '自动计算累计频率，识别造成这一结果的主要原因（二八法则）。',
    icon: <BarChart3 size={32} />,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50/50',
    accent: '#00D2FF'
  },
  {
    type: QCToolType.HISTOGRAM,
    name: '直方图',
    enName: 'Histogram',
    desc: '显示数据的分布情况，判断工序是否处于稳定状态。',
    icon: <BarChart2 size={32} />,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50/50',
    accent: '#00D2FF'
  },
  {
    type: QCToolType.SCATTER,
    name: '散点图',
    enName: 'Scatter Plot',
    desc: '分析两个变量之间的相关性，支持多维度气泡展示与趋势回归。',
    icon: <ScatterChart size={32} />,
    color: 'text-amber-500',
    bg: 'bg-amber-50/50',
    accent: '#F1C40F'
  },
  {
    type: QCToolType.AFFINITY,
    name: '系统/亲和图',
    enName: 'System / Affinity Diagram',
    desc: '集成 KJ 法与系统图功能，支持卡片分组归类与树状层级布局，适用于头脑风暴与系统架构分析。',
    icon: <Boxes size={32} />,
    color: 'text-orange-500',
    bg: 'bg-orange-50/50',
    accent: '#F1C40F'
  },
  {
    type: QCToolType.CONTROL,
    name: '控制图',
    enName: 'Control Chart',
    desc: '工业级 SPC 统计工具，自动计算 UCL/LCL，识别异常点并应用 Western-Electric 等判异规则。支持单/多维数据。',
    icon: <Activity size={32} />,
    color: 'text-rose-500',
    bg: 'bg-rose-50/50',
    accent: '#E74C3C'
  },
  {
    type: QCToolType.RELATION,
    name: '关联图',
    enName: 'Relation Diagram',
    desc: '分析复杂因素之间的因果关系，自动梳理末端因素、中间因素与核心问题。',
    icon: <Workflow size={32} />,
    color: 'text-purple-500',
    bg: 'bg-purple-50/50',
    accent: '#3498DB'
  },
  {
    type: QCToolType.MATRIX,
    name: '矩阵图',
    enName: 'Matrix Diagram',
    desc: 'L/T/Y/X 型矩阵分析工具，支持多维度因素关联分析与加权评分计算。',
    icon: <Table size={32} />,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50/50',
    accent: '#00D2FF'
  },
  {
    type: QCToolType.MATRIX_PLOT,
    name: '图矩阵',
    enName: 'Matrix Plot',
    desc: '多变量散点图矩阵，支持 Minitab 风格的全变量分析及 Y 对 X 分析。',
    icon: <Grid3X3 size={32} />, // Keeping Grid3X3 for Matrix Plot
    color: 'text-blue-600',
    bg: 'bg-blue-50/50',
    accent: '#0D5E42'
  },
  {
    type: QCToolType.PDPC,
    name: 'PDPC',
    enName: 'PDPC Chart',
    desc: '过程决策程序图，用于识别实现目标过程中的障碍并制定对策，确保计划顺利完成。',
    icon: <GitFork size={32} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50/50',
    accent: '#00A8CC'
  },
  {
    type: QCToolType.ARROW,
    name: '矢线图',
    enName: 'Arrow Diagram',
    desc: '又称网络计划技术 (PERT/CPM)，用于安排工程进度并识别关键路径。',
    icon: <Network size={32} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50/50',
    accent: '#4f46e5'
  },
  {
    type: QCToolType.BASIC,
    name: '基础图表',
    enName: 'Basic Charts',
    desc: '集成柱状图、折线图与饼图，支持双轴、堆叠及多层饼图分析。',
    icon: <BarChart3 size={32} />,
    color: 'text-blue-500',
    bg: 'bg-blue-50/50',
    accent: '#0D5E42'
  },
  {
    type: QCToolType.RADAR,
    name: '雷达图',
    enName: 'Radar Chart',
    desc: '多维性能评估分析工具，支持极坐标系自定义、多指标对比分析。',
    icon: <Radar size={32} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50/50',
    accent: '#D0A50A'
  },
  {
    type: QCToolType.MERMAID,
    name: 'Mermaid 绘图',
    enName: 'Mermaid Diagram',
    desc: '基于 Mermaid 语法的全能绘图工具，支持流程图、序列图、甘特图等多种图表生成。',
    icon: <Workflow size={32} />, // Using Workflow as a placeholder, or maybe something else? Workflow is already used. Let's use GitFork or GitBranch. GitBranch is Fishbone. Network is Arrow. GitFork is PDPC. Let's use Share2 or something similar if available. Wait, Workflow is Relation. Let's check available icons. Workflow is icon 2. Share2 is not imported. GitMerge or Layers? Let's use Activity or similar. Actually, let's use Workflow but I'll check icons again.
    color: 'text-blue-500',
    bg: 'bg-blue-50/50',
    accent: '#0D5E42'
  },
  {
    type: QCToolType.VCHART,
    name: 'VChart',
    enName: 'VChart Diagram',
    desc: '基于 VisActor VChart 的全能图表引擎，支持 JSON Spec 定义高度自定义的图表。',
    icon: <BarChart3 size={32} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50/50',
    accent: '#4f46e5'
  },
  {
    type: QCToolType.FLOW,
    name: '流程图',
    enName: 'Flow / Swimlane',
    desc: '企业体系文件流程图引擎，字典-索引范式定义泳道矩阵、BPMN 子集元素、岗位图例与属性边栏，适配程序文件（CX）编制。',
    icon: <Workflow size={32} />,
    color: 'text-teal-600',
    bg: 'bg-teal-50/50',
    accent: '#0d9488'
  }
];


export const INITIAL_FISHBONE_DSL = `Title: 注塑件表面缩水故障分析
Color[Root]: #E74C3C
Color[RootText]: #ffffff
Color[Main]: #0D5E42
Color[MainText]: #ffffff
Color[Bone]: #475569
Color[Line]: rgba(13,94,66,0.18)
Color[Text]: #1A2428

# 人 (Man)
## 调机参数设置不当
### 保压压力过低
### 保压时间不足
## 巡检意识淡薄

# 机 (Machine)
## 料筒加热温度偏移
## 模具冷却水道阻塞
### 冷却水流量不足

# 料 (Material)
## 材料缩水率不均匀
## 回料比例过高

# 法 (Method)
## 工艺标准不完善
## 注射速度过快`;

export const INITIAL_HISTOGRAM_DATA = [
  9.8, 10.2, 10.1, 9.9, 10.0, 10.3, 9.7, 10.1, 9.9, 10.0,
  10.2, 9.8, 10.4, 9.6, 10.1, 9.9, 10.0, 10.2, 9.8, 10.1,
  10.5, 9.5, 10.0, 10.3, 9.7, 10.1, 9.9, 10.2, 10.0, 9.8
];

export const INITIAL_HISTOGRAM_DSL = `Title: 产品直径分布分析
USL: 10.5
LSL: 9.5
Target: 10.0
Color[Bar]: #0D5E42
Color[Curve]: #F1C40F
Color[USL]: #E74C3C
Color[LSL]: #E74C3C
Color[Target]: #22c55e
Font[Title]: 18
Font[Base]: 12
Bins: auto
ShowCurve: true

// 原始测量数据（一行一个数值）
- 9.8
- 10.2
- 10.1
- 9.9
- 10.0
- 10.3
- 9.7
- 10.1
- 9.9
- 10.0
- 10.2
- 9.8
- 10.4
- 9.6
- 10.1
- 9.9
- 10.0
- 10.2
- 9.8
- 10.1
- 10.5
- 9.5
- 10.0
- 10.3
- 9.7
- 10.1
- 9.9
- 10.2
- 10.0
- 9.8`;

export const INITIAL_FISHBONE_DATA: FishboneNode = {
  id: 'root',
  label: '生产线停产原因分析',
  type: 'root',
  children: [
    {
      id: 'm1',
      label: '人员 (Man)',
      type: 'main',
      children: [
        {
          id: 's1-1',
          label: '调机参数设置不当',
          type: 'sub',
          children: [
            { id: 'd1-1-1', label: '保压压力过低', type: 'detail' }
          ]
        },
        { id: 's1-2', label: '巡检不及时', type: 'sub' }
      ]
    },
    {
      id: 'm2',
      label: '机械 (Machine)',
      type: 'main',
      children: [
        { id: 's2-1', label: '料筒加热温度偏移', type: 'sub' },
        { id: 's2-2', label: '模具冷却水道阻塞', type: 'sub' }
      ]
    }
  ]
};

export const INITIAL_PARETO_DSL = `Title: 售后质量问题分布分析
Color[Title]: #1A2428
Color[Bar]: #0D5E42
Color[Line]: #F1C40F
Color[MarkLine]: #E74C3C
Decimals: 1
ShowValues: true
Font[Title]: 20
Font[Base]: 12
Font[Bar]: 12
Font[Line]: 12

// 数据项：<项目名称>: <频数或成本>
- 物流破损: 420
- 零件缺失: 215
- 包装老化: 89
- 标签错误: 56
- 其他细项: 23`;

export const INITIAL_PARETO_DATA = [
  { id: '1', name: '物流破损', value: 420 },
  { id: '2', name: '零件缺失', value: 215 },
  { id: '3', name: '包装老化', value: 89 },
  { id: '4', name: '标签错误', value: 56 },
  { id: '5', name: '其他细项', value: 23 }
];

export const INITIAL_CONTROL_DATA = {
  series: [{ name: '轴径', data: [12.01, 11.98, 12.05, 12.01, 11.97, 12.02, 11.99, 12.03, 12.01, 12.04, 11.98, 12.00, 12.02, 11.99, 12.01, 12.03, 11.97, 11.99, 12.01, 12.02] }]
};

export const INITIAL_CONTROL_DSL = `Title: 缸盖螺栓孔径 X-bar-R 控制图
Type: X-bar-R
Size: 5
Rules: Nelson
Decimals: 3
Color[Line]: #0D5E42
Color[Point]: #0A4A33
Color[UCL]: #E74C3C

[series]: 孔径测量值 (mm)
12.01, 12.02, 11.99, 12.00, 12.01
12.03, 11.98, 12.01, 12.02, 11.99
12.00, 12.01, 12.04, 11.97, 12.02
12.01, 11.99, 12.00, 12.03, 12.01
11.98, 12.02, 12.01, 11.99, 12.00
[/series]`;


export const INITIAL_SCATTER_DATA = [
  { id: '1', x: 210.5, y: 95.2, z: 1.2 },
  { id: '2', x: 215.0, y: 98.5, z: 1.1 },
  { id: '3', x: 208.2, y: 92.1, z: 1.4 },
  { id: '4', x: 220.5, y: 105.0, z: 0.9 },
  { id: '5', x: 205.0, y: 90.0, z: 1.6 },
  { id: '6', x: 212.8, y: 96.5, z: 1.15 },
  { id: '7', x: 218.0, y: 102.0, z: 0.95 },
  { id: '8', x: 202.0, y: 88.5, z: 1.8 },
  { id: '9', x: 214.5, y: 97.2, z: 1.12 },
  { id: '10', x: 209.0, y: 94.0, z: 1.35 },
  { id: '11', x: 219.5, y: 103.5, z: 0.92 },
  { id: '12', x: 206.5, y: 91.0, z: 1.55 }
];

export const INITIAL_SCATTER_DSL = `Title: 注塑工艺参数相关分析
XAxis: 模具温度(℃)
YAxis: 注射压力(MPa)
ZAxis: 收缩率%
Color[Point]: #0D5E42
Color[Trend]: #F1C40F
ShowTrend: true
Show3D: false
ShowValues: false

// 数据点：- <X>, <Y> [, <Z>]
- 195.5, 85.2, 2.4
- 192.0, 82.5, 2.5
- 198.5, 88.0, 2.2
- 215.0, 105.0, 0.6
- 218.5, 108.2, 0.55
- 212.0, 102.5, 0.7`;

export const INITIAL_AFFINITY_DSL = `Title: 办公环境改善方案（KJ 法）
Type: Card
Layout: Horizontal

// 样式
Color[TitleBg]: #4f46e5
Color[TitleText]: #ffffff
Color[GroupHeaderBg]: #e0e7ff
Color[GroupHeaderText]: #1A2428
Color[ItemBg]: #ffffff
Color[ItemText]: #1A2428
Font[Title]: 24
Font[GroupHeader]: 16
Font[Item]: 14
Color[Line]: #64748b
Color[Border]: rgba(13,94,66,0.18)

// 核心主题（parentId 写 null 或不写；写 root 时该节点会被解析器作为虚拟根吸收，图上不显示）
Item: root, 核心目标: 提升员工幸福感, null

// 一级分组
Item: g1, 空间布局, root
Item: g2, 行政服务, root
Item: g3, 数字化工具, root

// 二级条目
Item: sub1, 增加绿植覆盖, g1
Item: sub2, 设立静默专注区, g1
Item: sub3, 升级人体工学椅, g1
Item: sub4, 现磨咖啡无限供应, g2
Item: sub5, 每周五下午茶, g2
Item: sub6, 引入智能看板系统, g3
Item: sub7, 简化报销流程, g3`;

export const INITIAL_AFFINITY_DATA: any[] = [
  {
    id: 'g1',
    label: '市场机会',
    children: [
      { id: 'i1', label: '新能源需求增长' },
      { id: 'i2', label: '政策扶持力度大' }
    ]
  },
  {
    id: 'g2',
    label: '技术风险',
    children: [
      { id: 'i3', label: '电池技术迭代快' },
      { id: 'i4', label: '供应链不稳定' }
    ]
  },
  {
    id: 'g3',
    label: '运营挑战',
    children: [
      { id: 'i5', label: '人才缺口大' },
      { id: 'i6', label: '跨区域管理难' }
    ]
  }
];

export const INITIAL_RELATION_DSL = `Title: 多症结系统问题关联分析
Layout: Free

Color[Root]: #CF3A2B
Color[RootText]: #ffffff
Color[Middle]: #F1C40F
Color[MiddleText]: #ffffff
Color[End]: #fbbf24
Color[EndText]: #92400e
Color[Line]: #a1a1aa

// 节点定义（ID, 标签）——所有被 Rel 引用的 ID 都必须在此定义
Node: root1, 症结A：项目交付延期
Node: root2, 症结B：团队士气低落
Node: root3, 症结C：客户投诉增加
Node: m1, 需求频繁变更
Node: m2, 跨部门沟通不畅
Node: m3, 核心人员流失
Node: m4, 技术债务累积
Node: m5, 质量监控缺失
Node: e1, 客户决策链过长
Node: e2, 缺乏统一协作平台
Node: e3, 薪酬竞争力不足
Node: e4, 代码评审流程形同虚设
Node: e5, 自动化测试覆盖率低
Node: e6, 市场竞品压力传导
Node: e7, 历史遗留系统架构
Node: e8, 培训体系不完善

// 关系定义：源 -> 目标（类型由引擎按拓扑自动推断）
Rel: m1 -> root1
Rel: m2 -> root1
Rel: m4 -> root1
Rel: m3 -> root2
Rel: m2 -> root2
Rel: m5 -> root3
Rel: m1 -> root3
Rel: root1 -> root2
Rel: root1 -> root3
Rel: e1 -> m1
Rel: e6 -> m1
Rel: e2 -> m2
Rel: e8 -> m2
Rel: e3 -> m3
Rel: e7 -> m4
Rel: e4 -> m5
Rel: e5 -> m5
Rel: e8 -> m3`;

export const INITIAL_RELATION_DATA = {
  nodes: [
    { id: 'root1', label: '症结A：项目交付延期', type: 'root' },
    { id: 'root2', label: '症结B：团队士气低落', type: 'root' },
    { id: 'root3', label: '症结C：客户投诉增加', type: 'root' },
    { id: 'm1', label: '需求频繁变更', type: 'middle' },
    { id: 'm2', label: '跨部门沟通不畅', type: 'middle' },
    { id: 'm3', label: '核心人员流失', type: 'middle' },
    { id: 'm4', label: '技术债务累积', type: 'middle' },
    { id: 'm5', label: '质量监控缺失', type: 'middle' },
    { id: 'e1', label: '客户决策链过长', type: 'end' },
    { id: 'e2', label: '缺乏统一协作平台', type: 'end' },
    { id: 'e3', label: '薪酬竞争力不足', type: 'end' },
    { id: 'e4', label: '代码评审流程形同虚设', type: 'end' },
    { id: 'e5', label: '自动化测试覆盖率低', type: 'end' },
    { id: 'e6', label: '市场竞品压力传导', type: 'end' },
    { id: 'e7', label: '历史遗留系统架构', type: 'end' },
    { id: 'e8', label: '培训体系不完善', type: 'end' }
  ],
  links: [
    { source: 'm1', target: 'root1' },
    { source: 'm2', target: 'root1' },
    { source: 'm4', target: 'root1' },
    { source: 'm3', target: 'root2' },
    { source: 'm2', target: 'root2' },
    { source: 'm5', target: 'root3' },
    { source: 'm1', target: 'root3' },
    { source: 'root1', target: 'root2' },
    { source: 'root1', target: 'root3' },
    { source: 'e1', target: 'm1' },
    { source: 'e6', target: 'm1' },
    { source: 'e2', target: 'm2' },
    { source: 'e8', target: 'm2' },
    { source: 'e3', target: 'm3' },
    { source: 'e7', target: 'm4' },
    { source: 'e4', target: 'm5' },
    { source: 'e5', target: 'm5' },
    { source: 'e8', target: 'm3' }
  ]
};

export const INITIAL_MATRIX_DSL = `Title: 零部件与故障模式关联分析
Type: L
ShowScores: true
CellSize: 40
Weight[Strong]: 9
Weight[Medium]: 3
Weight[Weak]: 1

// A 轴（行）：零部件，第三列为该行权重
Axis: A, 零部件
- a1, 活塞销, 0.8
- a2, 连杆, 0.9
- a3, 轴瓦, 1.0

// B 轴（列）：故障模式
Axis: B, 故障模式
- b1, 磨损
- b2, 裂纹
- b3, 泄漏
- b4, 异响

// 关系定义：<行项ID>: <列项ID>:<符号>
Matrix: A x B
a1: b1:S, b2:M
a2: b2:S, b4:W
a3: b1:M, b3:S, b4:S`;


export const MATRIX_SAMPLE_TEMPLATES = {
  L: INITIAL_MATRIX_DSL,
  T: `Title: 矩阵图分析 (T-Type)
Type: T
CellSize: 40
ShowScores: true
Font[Title]: 14
Font[Base]: 10

Axis: A, 维度轴 A
- a1, 指标 A1, 9
- a2, 指标 A2, 6
- a3, 指标 A3, 3
- a4, 指标 A4, 1

Axis: B, 维度轴 B
- b1, 特性 B1
- b2, 特性 B2
- b3, 特性 B3
- b4, 特性 B4

Axis: C, 维度轴 C
- c1, 属性 C1
- c2, 属性 C2
- c3, 属性 C3
- c4, 属性 C4

Matrix: A x B

Matrix: A x C
`,
  Y: `Title: 矩阵图分析 (Y-Type)
Type: Y
Orientation: Top
CellSize: 40
ShowScores: true
Font[Title]: 14
Font[Base]: 10

Axis: A, 维度轴 A
- a1, 指标 A1, 9
- a2, 指标 A2, 7
- a3, 指标 A3, 5
- a4, 指标 A4, 3

Axis: B, 维度轴 B
- b1, 特性 B1, 5
- b2, 特性 B2, 5
- b3, 特性 B3, 5
- b4, 特性 B4, 5

Axis: C, 维度轴 C
- c1, 属性 C1, 2
- c2, 属性 C2, 2
- c3, 属性 C3, 2
- c4, 属性 C4, 2

Matrix: A x B

Matrix: B x C

Matrix: C x A
`,
  X: `Title: 矩阵图分析 (X-Type)
Type: X
CellSize: 40
ShowScores: true
Font[Title]: 14
Font[Base]: 10

Axis: N, 北轴 (North)
- n1, 指标 N1, 8
- n2, 指标 N2, 6
- n3, 指标 N3, 4
- n4, 指标 N4, 2

Axis: E, 东轴 (East)
- e1, 特性 E1, 5
- e2, 特性 E2, 5
- e3, 特性 E3, 5
- e4, 特性 E4, 5

Axis: S, 南轴 (South)
- s1, 属性 S1, 3
- s2, 属性 S2, 3
- s3, 属性 S3, 3
- s4, 属性 S4, 3

Axis: W, 西轴 (West)
- w1, 目标 W1, 9
- w2, 目标 W2, 9
- w3, 目标 W3, 9
- w4, 目标 W4, 9

Matrix: W x N

Matrix: E x N

Matrix: E x S

Matrix: W x S
`,
  C: `Title: 矩阵图分析 (C-Type)
Type: C
CellSize: 40
ShowScores: true
Font[Title]: 14
Font[Base]: 10

Axis: T, 维度轴 T
- t1, 指标 T1, 9
- t2, 指标 T2, 7
- t3, 指标 T3, 5
- t4, 指标 T4, 3

Matrix: T x T
`
};

export const INITIAL_MATRIX_PLOT_DSL = `Title: 封装工艺参数相关性研究
Mode: Matrix
Dimensions: [压力, 温度, 固化时间, 剥离强度]
Group: 晶圆批次
Smoother: Lowess

Data:
- { 压力: 102, 温度: 185, 固化时间: 45, 剥离强度: 8.2, 晶圆批次: "W-01" }
- { 压力: 105, 温度: 188, 固化时间: 46, 剥离强度: 7.9, 晶圆批次: "W-01" }
- { 压力: 100, 温度: 186, 固化时间: 44, 剥离强度: 8.0, 晶圆批次: "W-01" }
- { 压力: 98, 温度: 192, 固化时间: 42, 剥离强度: 9.1, 晶圆批次: "W-02" }
- { 压力: 96, 温度: 194, 固化时间: 41, 剥离强度: 9.4, 晶圆批次: "W-02" }
- { 压力: 99, 温度: 191, 固化时间: 43, 剥离强度: 9.0, 晶圆批次: "W-02" }
- { 压力: 110, 温度: 180, 固化时间: 48, 剥离强度: 7.2, 晶圆批次: "W-03" }
- { 压力: 112, 温度: 178, 固化时间: 49, 剥离强度: 7.0, 晶圆批次: "W-03" }
- { 压力: 108, 温度: 182, 固化时间: 47, 剥离强度: 7.4, 晶圆批次: "W-03" }
- { 压力: 104, 温度: 187, 固化时间: 45, 剥离强度: 8.1, 晶圆批次: "W-01" }

Styles:
- DisplayMode: Lower
- Diagonal: Histogram
- ColorPalette: Industrial`;

export const INITIAL_PDPC_DSL = `Title: 实验室火灾应急 PDPC 演练
Layout: Directional

Color[Start]: #DBEAFE
Color[Step]: #EFF6FF
Color[Countermeasure]: #ECFDF5
Color[End]: #FEF2F2
Color[StartText]: #1E40AF
Color[StepText]: #1D4ED8
Color[CountermeasureText]: #047857
Color[EndText]: #B91C1C
Color[Line]: #64748B
Line[Width]: 2

// 阶段 1：发现
Group: g1, 异常发现
  Item: n1, 烟雾报警器触发, [start]
  Item: n2, 确认火情真实性
EndGroup

// 阶段 2：处置
Group: g2, 应急处置
  Item: n3, 拨打 119 报警
  Item: n4, 启动自动灭火系统
  Item: n5, 灭火系统失效, [countermeasure]
  Item: n6, 使用手持灭火器补救, [countermeasure]
EndGroup

// 阶段 3：疏散
Group: g3, 人员疏散
  Item: n7, 全员依序撤离
  Item: n8, 清点人数, [end]
EndGroup

// 逻辑链条：id1--id2 [OK|NG]
n1--n2
n2--n3 [OK]
n2--n4 [OK]
n4--n7 [OK]
n4--n5 [NG]
n5--n6
n6--n7 [OK]
n7--n8`;

export const INITIAL_PDPC_DATA = {
  title: '关键系统迁移 PDPC 风险分析',
  nodes: [
    { id: 'start', label: 'Start', type: 'start', groupId: 'p1' },
    { id: 'a1', label: '环境检查', type: 'step', groupId: 'p1' },
    { id: 'a2', label: '数据备份', type: 'step', groupId: 'p1' },
    { id: 'b1', label: '触发脚本', type: 'step', groupId: 'p2' },
    { id: 'b2', label: '校验完整性', type: 'step', groupId: 'p2' },
    { id: 'c1', label: '空间不足?', type: 'step', groupId: 'p3' },
    { id: 'c2', label: '清理日志', type: 'countermeasure', groupId: 'p3' },
    { id: 'c3', label: '扩容磁盘', type: 'countermeasure', groupId: 'p3' },
    { id: 'c4', label: '权限拒绝?', type: 'step', groupId: 'p3' },
    { id: 'c5', label: '提权重试', type: 'countermeasure', groupId: 'p3' },
    { id: 'end', label: 'Migration Success', type: 'end' }
  ],
  links: [
    { source: 'start', target: 'a1', marker: 'None' },
    { source: 'a1', target: 'a2', marker: 'None' },
    { source: 'a2', target: 'b1', marker: 'None' },
    { source: 'b1', target: 'b2', marker: 'OK' },
    { source: 'b2', target: 'end', marker: 'OK' },
    { source: 'b1', target: 'c1', marker: 'NG' },
    { source: 'c1', target: 'c2', marker: 'OK' },
    { source: 'c2', target: 'b1', marker: 'OK' },
    { source: 'c1', target: 'c3', marker: 'NG' },
    { source: 'c3', target: 'b1', marker: 'OK' },
    { source: 'b1', target: 'c4', marker: 'NG' },
    { source: 'c4', target: 'c5', marker: 'OK' },
    { source: 'c5', target: 'b1', marker: 'OK' }
  ],
  groups: [
    { id: 'p1', label: '前期准备' },
    { id: 'p2', label: '执行迁移' },
    { id: 'p3', label: '异常应对' }
  ]
};

export const INITIAL_ARROW_DSL = `Title: 办公软件 V1.0 开发计划
ShowCritical: true
ShowShortest: false

Color[Critical]: #E74C3C
Color[Line]: #00D2FF

// 节点（事件）
Event: 1, 立项完成
Event: 2, 需求评审
Event: 3, 架构设计
Event: 4, 模块 A 开发
Event: 5, 模块 B 开发
Event: 6, 集成测试
Event: 7, 交付

// 实任务：Src -> Tgt: 工期, 名称
1 -> 2: 3, 需求分析
2 -> 3: 2, 架构方案
3 -> 4: 10, A逻辑实现
3 -> 5: 8, B逻辑实现
4 -> 6: 5, 系统集成
6 -> 7: 2, 验收发布

// 虚任务：仅表达逻辑依赖，工期恒为 0
5 ..> 4: 0, 依赖同步`;
// --- Basic Chart (Bar/Line/Pie) Initial Data ---

export const INITIAL_BASIC_DATA: any = {
  title: '智慧工厂生产线综合效能分析 (KPI)',
  type: 'bar',
  datasets: [
    { name: '线体', values: ['线体-A', '线体-B', '线体-C', '线体-D', '线体-E'], axisMatch: 'X' },
    { name: '实时产量', values: [850, 920, 780, 1100, 890], color: '#0D5E42', axisMatch: 'Y' },
    { name: '能源消耗', values: [420, 450, 390, 520, 440], color: '#00D2FF', axisMatch: 'Y2' },
    { name: '一次合格率', values: [98.2, 97.5, 99.1, 96.8, 98.5], color: '#F1C40F', axisMatch: 'Y3' }
  ]
};

export const INITIAL_BASIC_DSL = `Title: 2024年三季度产线效能对冲分析
Type: bar
ShowLegend: true
Grid: true

// 1. 分类标签（必填：必须有一个 X 轴 Dataset）
Dataset: 月份, [7月, 8月, 9月], null, X

// 2. 主轴产量（柱状）
Dataset: 入库合格量, [12000, 14500, 13800], #0D5E42, Y

// 3. 副轴稼动率：重新声明 Type 切换后续 Dataset 的渲染类型为折线
Type: line
Smooth: true
Dataset: 设备稼动率(%), [88.5, 92.1, 91.4], #E74C3C, Y2`;

export const INITIAL_RADAR_DATA: RadarData = {
  title: '投资组合多维风险分析',
  axes: [
    { name: '年化回报(%)', max: 25, min: 0 },
    { name: '波动率(%)', max: 30, min: 0 },
    { name: '夏普比率', max: 3, min: 0 },
    { name: '最大回撤(%)', max: 50, min: 0 },
    { name: '资产规模(亿)', max: 100, min: 0 }
  ],
  series: [
    { name: '策略 A (稳健型)', values: [12, 15, 1.8, 12, 85], color: '#0D5E42', fillOpacity: 0.4 },
    { name: '策略 B (高收益型)', values: [22, 28, 1.2, 35, 40], color: '#E74C3C', fillOpacity: 0.3 }
  ]
};

// --- VChart Initial Data ---

export const INITIAL_VCHART_DSL = `Title: 月度设备综合效率 (OEE)
ColorPalette: tech
ShowTitle: true

Spec: {
  "type": "bar",
  "data": [{ "values": [
    { "month": "1月", "v": 0.85 }, { "month": "2月", "v": 0.88 }
  ]}],
  "xField": "month", "yField": "v",
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}`;

export const VCHART_COLOR_PALETTES = [
    // VChart 2.x 原生内置主题 (无需注册，直接使用 id 传入 spec.theme)
    { id: 'light',      name: '系统亮色 (Light)',        colors: [] },
    { id: 'dark',       name: '系统暗色 (Dark)',          colors: [] },
    // 自定义注册主题 (通过 VChart.registerTheme 注入)
    { id: 'tech',       name: '科技蓝 (Tech Blue)',       colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'] },
    { id: 'vibrant',    name: '活力橙 (Vibrant)',         colors: ['#F1C40F', '#fbbf24', '#00D2FF', '#0D5E42', '#3498DB'] },
    { id: 'industrial', name: '工业灰 (Industrial)',      colors: ['#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6'] },
    { id: 'deep',       name: '深邃暗 (Deep Dark)',       colors: ['#1A2428', '#42525C', '#475569', '#64748b', '#94a3b8'] },
    { id: 'ocean',      name: '海洋蓝 (Ocean)',           colors: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#0369a1'] },
    { id: 'forest',     name: '森林绿 (Forest)',          colors: ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#052e16'] },
    { id: 'sunset',     name: '夕阳橙 (Sunset)',          colors: ['#ea580c', '#fb923c', '#fed7aa', '#fca5a5', '#7f1d1d'] },
];

export const INITIAL_MERMAID_DSL = `%%{init: {"theme": "neutral", "look": "handDrawn"}}%%
graph TD
    A[提交申请] --> B{经理审批}
    B -- "通过" --> C[财务放款]
    B -- "驳回" --> D[退回修改]
    D --> A
    C --> E[流程结束]`;

export const INITIAL_RADAR_DSL = `Title: 方案多维效果对比
Standardize: true
ShowAreaScore: true
ShowSimilarity: true
ShowValues: false
StartAngle: -90
Clockwise: true
Closed: true

// 轴定义：Axis: <名称>, <最大值>[, <最小值>]
Axis: 质量, 100, 0
Axis: 成本, 100, 0
Axis: 交期, 100, 0
Axis: 安全, 100, 0
Axis: 可维护性, 100, 0

// 系列：Series: <名称>, [<值列表>][, <颜色>[, <透明度>]]
Series: 方案A, [85, 70, 90, 80, 75], #0D5E42, 0.4
Series: 方案B, [70, 85, 75, 88, 80], #E74C3C, 0.3`;

// ===== Flow (流程图 / BPMN 子集) =====

export const INITIAL_FLOW_DSL = `Title: 卷烟生产批次质量追溯与放行流程
Layout: H
Grid: dashed
Dict: D[制丝车间,卷包车间,质检中心,技术中心,档案室]
Dict: P[批次创建,参数采集,并行检测,异常处置,放行归档]
Dict: R[操作员,质检员,技术员,档案员]
Dict: worker[创建生产批次,录入工艺参数,质量指标是否合规?,物理指标检测,化学指标检测,偏差分析与处置,技术中心复核,编制批次报告,质量放行,资料归档,复核评审记录,检测数据集]
Lane from D[0,1,2,3,4] Layout H
Lane from P[0,1,2,3,4] Layout V
AxisX: 责任部门 Align C
AxisY: 流程阶段 Align C
Axis: 卷烟批次质量追溯 AxisY
Attr active [Role,SOP,Lv,Time,KPI,M]
W: w1: worker[0] Type[S] Location(D[0],P[0]) Role(R[0]) SOP(ZZ-PC-01) Lv(一般) Time(0.5h)
W: w2: worker[1] Location(D[0],P[1]) Role(R[0]) SOP(ZZ-PC-02) Time(1h)
W: g1: worker[2] Type[?] Location(D[2],P[1]) Role(R[1]) KPI(一次合格率)
   合规 → #p1
   不合规 → #w5
   End
W: p1: worker[3] Type[+] Location(D[1],P[1]) Role(R[1]) SOP(ZD-JC-05)
   物理检测 → #w3
   化学检测 → #w4
   End
W: w3: worker[3] Location(D[1],P[2]) Role(R[1]) Time(2h) Lv(重要)
W: w4: worker[4] Location(D[2],P[2]) Role(R[1]) Time(3h) Lv(重要)
W: sub1: worker[6] Type[SUB] Location(D[3],P[2]) Role(R[2]) Time(4h)
   W: s1: 受理复核 Type[S] Role(R[2]) SOP(JS-FH-01)
   W: s2: 出具意见 Type[E] Role(R[2]) SOP(JS-FH-02)
   End
W: w5: worker[5] Location(D[3],P[2]) Role(R[2]) SOP(JS-YC-11) Lv(关键) M(强制项)
W: w8: worker[7] Location(D[2],P[3]) Role(R[1]) SOP(ZD-BG-08) Time(1h)
W: w9: worker[8] Location(D[1],P[4]) Role(R[1]) Lv(关键) KPI(放行及时率)
W: w10: worker[9] Type[E] Location(D[4],P[4]) Role(R[3]) Time(0.5h)
W: n1: worker[10] Type[N] Attach(#w8)
W: d1: worker[11] Type[DATA] Attach(#p1)
w2 → #g1
w3 → #w8
w4 → #w8
w5 → #sub1
sub1 → #w8
w8 → #w9
w9 → #w10`;

export const INITIAL_FLOW_DATA: FlowData = parseFlowDSL(INITIAL_FLOW_DSL).data;

