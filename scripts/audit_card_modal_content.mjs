import fs from 'fs';
import path from 'path';

// 读取 dsl/generated/cardDocs.ts
import { CARD_DOCS } from '../dsl/generated/cardDocs.ts';

const editors = [
  { file: 'components/flow/FlowEditor.tsx', kind: 'flow', name: '企业流程图/泳道图' },
  { file: 'components/FishboneEditor.tsx', kind: 'fishbone', name: '因果分析/鱼骨图' },
  { file: 'components/ParetoEditor.tsx', kind: 'pareto', name: '关键性分析/排列图' },
  { file: 'components/ControlChartEditor.tsx', kind: 'control', name: 'SPC 过程控制图' },
  { file: 'components/HistogramEditor.tsx', kind: 'histogram', name: '分布分析/直方图' },
  { file: 'components/ScatterEditor.tsx', kind: 'scatter', name: '相关分析/散点图' },
  { file: 'components/AffinityEditor.tsx', kind: 'affinity', name: '核心归类/亲和图' },
  { file: 'components/RelationEditor.tsx', kind: 'relation', name: '交叉分析/关联图' },
  { file: 'components/PDPCEditor.tsx', kind: 'pdpc', name: '风险预研/PDPC图' },
  { file: 'components/ArrowDiagramEditor.tsx', kind: 'arrow', name: '进度控制/双代号网络图' },
  { file: 'components/MatrixEditor.tsx', kind: 'matrix', name: '相关性识别/矩阵图' },
  { file: 'components/MatrixPlotEditor.tsx', kind: 'matrix_plot', name: '多维交互/矩阵散点图' },
  { file: 'components/RadarEditor.tsx', kind: 'radar', name: '多维评价/雷达图' },
  { file: 'components/BasicEditor.tsx', kind: 'basic', name: '基础统计图' },
  { file: 'components/MermaidEditor.tsx', kind: 'mermaid', name: 'Mermaid 通用建模' },
  { file: 'components/VChartEditor.tsx', kind: 'vchart', name: 'VChart 可视化' },
];

console.log('================== 组件帮助按钮与知识卡数据审计 ==================\n');

for (const ed of editors) {
  const content = fs.readFileSync(ed.file, 'utf-8');
  
  // 检查帮助按钮触发代码
  const helpBtnRegex = /(<button[^>]*onClick=\{[^}]*(?:setShowDocs|setShowHelp)[^}]*\}[^>]*>[\s\S]*?<\/button>)/i;
  const btnMatch = content.match(helpBtnRegex);
  const btnSnippet = btnMatch ? btnMatch[1].replace(/\s+/g, ' ').substring(0, 120) : '未找到典型按钮';

  const doc = CARD_DOCS[ed.kind];
  if (!doc) {
    console.error(`❌ [${ed.name}] kind="${ed.kind}" 在 CARD_DOCS 中不存在！`);
    continue;
  }

  const syntaxCount = doc.syntaxRows?.length || 0;
  const counterCount = doc.counterexamples?.length || 0;
  const soulBlocks = doc.soul?.blocks?.length || 0;
  const hasExample = !!doc.example?.dsl;
  const requiredFields = (doc.syntaxRows || []).filter(r => r.required).map(r => r.name);

  console.log(`【${doc.meta.displayName || ed.name}】(kind: "${ed.kind}")`);
  console.log(`  - 组件文件: ${ed.file}`);
  console.log(`  - 触发按钮: ${btnSnippet}...`);
  console.log(`  - 语法条目数: ${syntaxCount} 条 (必填项: [${requiredFields.join(', ')}])`);
  console.log(`  - 官方范式示例: ${hasExample ? '✅ 已配置 (' + doc.example.title + ')' : '❌ 缺失'}`);
  console.log(`  - 分析逻辑指南: ${soulBlocks} 个段落块`);
  console.log(`  - 常见反例（错→对）: ${counterCount} 组`);
  console.log(`  - 输出红线数量: ${doc.outputControls?.length || 0} 条`);
  console.log('');
}
