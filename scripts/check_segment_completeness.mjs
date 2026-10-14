import fs from 'fs';
import path from 'path';

const mcpTools = JSON.parse(fs.readFileSync('mcp-server/mcp_tools.json', 'utf-8'));
const segmentsDir = 'protocol/segments';
const promptsDir = 'protocol/prompts';

console.log(`=== 检查全部 ${mcpTools.length} 个 MCP 工具与协议资源对应情况 ===\n`);

let missingSegments = [];
let missingPrompts = [];
let missingExamples = [];

for (const tool of mcpTools) {
  const name = tool.name;
  const parent = tool.parent_type;
  const sub = tool.sub_type;
  const slug = name.replace(/^render_/, '');

  // 1. 检查物理 segment 文件
  // 可能的文件名：sub.md 或 parent_sub.md 或 parent.md
  let segmentFile = null;
  const candidates = [
    `${sub}.md`,
    `${slug}.md`,
    `${parent}_${sub}.md`,
    `${parent}.md`
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(segmentsDir, c))) {
      segmentFile = c;
      break;
    }
  }

  // 2. 检查 prompt 文件
  const promptFile = `${slug}.md`;
  const hasPrompt = fs.existsSync(path.join(promptsDir, promptFile));

  // 3. 检查 official_example
  const hasExample = !!tool.official_example;

  if (!segmentFile) {
    missingSegments.push({ name, candidates });
  }
  if (!hasPrompt && sub !== 'master') {
    missingPrompts.push({ name, promptFile });
  }
  if (!hasExample) {
    missingExamples.push(name);
  }

  console.log(`[${tool.display_name}] (${name}):`);
  console.log(`   - parent: ${parent}, sub: ${sub}`);
  console.log(`   - 切片文件: ${segmentFile ? '✅ ' + segmentFile : '❌ 缺失 (' + candidates.join(', ') + ')'}`);
  console.log(`   - 提示词: ${hasPrompt ? '✅ ' + promptFile : (sub === 'master' ? '⚪ master无需prompt' : '❌ 缺失 ' + promptFile)}`);
  console.log(`   - 语法示例: ${hasExample ? '✅ 有 (' + tool.official_example.length + ' 字符)' : '❌ 缺失'}`);
}

console.log('\n=== 汇总 ===');
console.log(`总工具数: ${mcpTools.length}`);
console.log(`缺失切片文件数: ${missingSegments.length}`);
if (missingSegments.length) console.log('缺失切片:', missingSegments);
console.log(`缺失提示词数: ${missingPrompts.length}`);
if (missingPrompts.length) console.log('缺失提示词:', missingPrompts);
console.log(`缺失语法示例数: ${missingExamples.length}`);
