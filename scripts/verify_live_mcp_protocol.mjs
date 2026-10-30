import http from "http";

const MCP_PORT = process.env.MCP_PORT || 12001;
const pendingRequests = new Map(); // id -> { resolve, reject, timer }

async function testMcpLive() {
  console.log(`正在连接 127.0.0.1:${MCP_PORT}/sse ...`);

  let sseBuffer = "";
  const req = http.request(`http://127.0.0.1:${MCP_PORT}/sse`, (res) => {
    let endpointUrl = "";

    res.on("data", async (chunk) => {
      sseBuffer += chunk.toString();

      // 处理 SSE 数据包 (以 \n\n 分隔)
      const parts = sseBuffer.split("\n\n");
      sseBuffer = parts.pop() || ""; // 保留未完整的片段

      for (const part of parts) {
        if (!part.trim()) continue;

        const endpointMatch = part.match(/event:\s*endpoint\ndata:\s*(.+)/);
        if (endpointMatch && !endpointUrl) {
          endpointUrl = endpointMatch[1].trim();
          console.log("收到 MCP Endpoint:", endpointUrl);
          runTests(endpointUrl).catch((err) => {
            console.error("测试异常:", err);
            process.exit(1);
          });
          continue;
        }

        const messageMatch = part.match(/event:\s*message\ndata:\s*(.+)/s);
        if (messageMatch) {
          try {
            const rpc = JSON.parse(messageMatch[1].trim());
            if (rpc.id && pendingRequests.has(rpc.id)) {
              const { resolve, timer } = pendingRequests.get(rpc.id);
              clearTimeout(timer);
              pendingRequests.delete(rpc.id);
              resolve(rpc);
            }
          } catch (e) {
            console.warn("解析 SSE 消息失败:", e.message);
          }
        }
      }
    });
  });

  req.on("error", (e) => {
    console.error("连接失败:", e.message);
    process.exit(1);
  });

  req.end();
}

async function sendRpc(postUrl, body) {
  const id = body.id;
  const data = JSON.stringify(body);
  const u = new URL(postUrl, `http://127.0.0.1:${MCP_PORT}`);

  const rpcPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`RPC id=${id} 请求超时 (10s)`));
    }, 10000);
    pendingRequests.set(id, { resolve, reject, timer });
  });

  const req = http.request({
    hostname: u.hostname,
    port: u.port,
    path: u.pathname + u.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  }, (res) => {
    res.resume(); // 消费响应流 (如 202 Accepted)
  });

  req.on("error", (err) => {
    if (pendingRequests.has(id)) {
      const { timer, reject } = pendingRequests.get(id);
      clearTimeout(timer);
      pendingRequests.delete(id);
      reject(err);
    }
  });

  req.write(data);
  req.end();

  return rpcPromise;
}

async function runTests(postUrl) {
  // 1. 初始化
  console.log("正在执行 MCP initialize...");
  const initResp = await sendRpc(postUrl, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    },
  });
  console.log("MCP 初始化成功:", initResp.result?.serverInfo?.name);

  // 2. 测试几个代表性图表的 read_protocol
  const testCases = ["fishbone", "flow", "vchart_bar", "pareto", "vchart_correlation_heat"];

  let id = 2;
  for (const name of testCases) {
    console.log(`\n----------------- 测试调用 read_protocol("${name}") -----------------`);
    const resp = await sendRpc(postUrl, {
      jsonrpc: "2.0",
      id: id++,
      method: "tools/call",
      params: {
        name: "read_protocol",
        arguments: { uri: name },
      },
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

  // 3. 测试图表渲染 (render_fishbone)
  console.log(`\n----------------- 测试调用 render_fishbone -----------------`);
  const fishboneDsl = `Title: 注塑件表面缩水故障分析
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

  const fishboneResp = await sendRpc(postUrl, {
    jsonrpc: "2.0",
    id: id++,
    method: "tools/call",
    params: {
      name: "render_fishbone",
      arguments: { dsl: fishboneDsl },
    },
  });
  const fishboneResult = fishboneResp?.result?.content?.[0]?.text || "";
  console.log(`render_fishbone 响应: ${fishboneResult.slice(0, 160)}...`);
  if (!fishboneResult.includes("已成功渲染") && !fishboneResult.includes("render_")) {
    console.error("❌ render_fishbone 返回异常！");
    process.exit(1);
  }

  console.log("\n========================================================");
  console.log("🎉 全部实测通过！运行中的 MCP 服务返回了完备的图表类型、协议切片、官方语法示例与提示词！");
  console.log("========================================================");
  process.exit(0);
}

testMcpLive();
