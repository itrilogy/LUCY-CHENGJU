import fs from 'fs';
import path from 'path';

const mcpTools = JSON.parse(fs.readFileSync('mcp-server/mcp_tools.json', 'utf-8'));
const SEGMENTS_DIR = 'protocol/segments';
const PROTOCOL_DIR = 'protocol';

function getToolSegmentFile(tool) {
  const parent = tool.parent_type;
  const sub = tool.sub_type;
  const slug = tool.name.replace(/^render_/, '');
  const candidates = [
    `${slug}.md`,
    `${sub}.md`,
    `${parent}_${sub}.md`,
    `${parent}.md`
  ];
  for (const c of candidates) {
    const p = path.join(SEGMENTS_DIR, c);
    if (fs.existsSync(p)) return { file: c, content: fs.readFileSync(p, 'utf-8') };
  }
  return null;
}

function getToolPromptContent(tool) {
  const slug = tool.name.replace(/^render_/, '');
  const p = path.join(PROTOCOL_DIR, `prompts/${slug}.md`);
  if (fs.existsSync(p)) return { file: `${slug}.md`, content: fs.readFileSync(p, 'utf-8') };
  return null;
}

console.log("=== 验证 55 个工具的拼接要素提取 ===");
let successCount = 0;
for (const tool of mcpTools) {
  const seg = getToolSegmentFile(tool);
  const prompt = getToolPromptContent(tool);
  const example = tool.official_example;
  
  if (!seg) {
    console.error(`❌ ${tool.name}: 未匹配到 segment 文件`);
  } else if (!example) {
    console.error(`❌ ${tool.name}: 缺失 official_example`);
  } else {
    successCount++;
  }
}

console.log(`成功匹配: ${successCount} / ${mcpTools.length}`);
