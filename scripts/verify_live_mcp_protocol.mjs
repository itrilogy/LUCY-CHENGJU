import http from "http";

async function testMcpLive() {
  console.log("正在连接 127.0.0.1:12001/sse ...");
  
  const req = http.request("http://127.0.0.1:12001/sse", (res) => {
    let endpointUrl = "";
    
    res.on("data", async (chunk) => {
      const text = chunk.toString();
      const match = text.match(/event:\s*endpoint\ndata:\s*(.+)/);
      if (match && !endpointUrl) {
        endpointUrl = match[1].trim();
        console.log("收到 MCP Endpoint:", endpointUrl);
        await runTests(endpointUrl);
      }
    });
  });
  
  req.on("error", (e) => {
    console.error("连接失败:", e.message);
    process.exit(1);
  });
  
  req.end();
}

async function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url, "http://127.0.0.1:12001");
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    }, (res) => {
      let buf = "";
      res.on("data", (d) => buf += d);
      res.on("end", () => resolve(buf ? JSON.parse(buf) : {}));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function runTests(postUrl) {
  // 1. 初始化
  await postJson(postUrl, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" }
    }
  });

  // 2. 测试几个代表性图表的 read_protocol
  const testCases = ["fishbone", "flow", "vchart_bar", "pareto", "vchart_correlation_heat"];
  
  let id = 2;
  for (const name of testCases) {
    console.log(`\n----------------- 测试调用 read_protocol("${name}") -----------------`);
    const resp = await postJson(postUrl, {
      jsonrpc: "2.0",
      id: id++,
      method: "tools/call",
      params: {
        name: "read_protocol",
        arguments: { uri: name }
      }
    });
    
    const text = resp?.result?.content?.[0]?.text || "";
    console.log(`返回文本总长度: ${text.length} 字符`);
    
    // 检查核心要素
    const hasType = text.includes("图表类型");
    const hasSegment = text.includes("协议切片全文") || text.includes("语法规则");
    const hasExample = text.includes("官方范式示例");
    const hasPrompt = text.includes("AI 生成提示词") || text.includes("全局输出红线");
    
    console.log(`要素断言结果: 图表类型=${hasType}, 协议切片=${hasSegment}, 官方语法示例=${hasExample}, 提示词/红线=${hasPrompt}`);
    
    if (!hasType || !hasSegment || !hasExample || !hasPrompt) {
      console.error("❌ 要素缺失！");
      process.exit(1);
    }
  }

  console.log("\n========================================================");
  console.log("🎉 全部实测通过！运行中的 MCP 服务返回了完备的图表类型、协议切片、官方语法示例与提示词！");
  console.log("========================================================");
  process.exit(0);
}

testMcpLive();
