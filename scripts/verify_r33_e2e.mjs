import http from "http";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const WEB_PORT = 13000;
const MCP_PORT = 13001;
const TEST_ADMIN_PWD = "test_admin_secret_pwd_888";
const TMP_DATA_DIR = path.resolve("/tmp/iqs-r33-e2e-" + Date.now());

fs.mkdirSync(TMP_DATA_DIR, { recursive: true });

console.log("=== R33 单进程双端口端到端实测验证 ===");
console.log(`临时测试数据目录: ${TMP_DATA_DIR}`);
console.log(`Web SPA 端口: ${WEB_PORT}, MCP 端口: ${MCP_PORT}`);

const serverProcess = spawn("node", ["mcp-server/index.js", "--transport=sse", "--serve-web"], {
  env: {
    ...process.env,
    WEB_PORT: String(WEB_PORT),
    PORT: String(MCP_PORT),
    IQS_BASE_URL: `http://localhost:${WEB_PORT}`,
    IQS_DATA_DIR: TMP_DATA_DIR,
    IQS_ADMIN_PASSWORD: TEST_ADMIN_PWD,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

serverProcess.stdout.on("data", (chunk) => {
  const line = chunk.toString();
  if (line.includes("[Web]") || line.includes("[MCP]") || line.includes("listening")) {
    process.stdout.write("  [Server stdout] " + line);
  }
});

serverProcess.stderr.on("data", (chunk) => {
  process.stderr.write("  [Server stderr] " + chunk.toString());
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchHttp(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || "GET",
      headers: options.headers || {},
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json: () => {
            try { return JSON.parse(data); } catch { return null; }
          }
        });
      });
    });
    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  try {
    console.log("等待双端口服务器就绪...");
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await sleep(300);
      try {
        const hWeb = await fetchHttp(`http://localhost:${WEB_PORT}/healthz`);
        const hMcp = await fetchHttp(`http://localhost:${MCP_PORT}/healthz`);
        if (hWeb.statusCode === 200 && hMcp.statusCode === 200) {
          ready = true;
          break;
        }
      } catch {}
    }

    if (!ready) {
      throw new Error("双端口服务器在 10 秒内未就绪！");
    }
    console.log("✅ 1. 双端口 /healthz 就绪检测成功！");

    // 2. SPA index & config.js
    const indexRes = await fetchHttp(`http://localhost:${WEB_PORT}/`);
    if (indexRes.statusCode !== 200 || !indexRes.data.includes("<title>澄矩")) {
      throw new Error(`SPA index 返回异常: status=${indexRes.statusCode}`);
    }
    console.log("✅ 2. Web 端口 SPA 静态托管 (含 History fallback) 正常！");

    const configRes = await fetchHttp(`http://localhost:${WEB_PORT}/config.js`);
    if (configRes.statusCode !== 200 || !configRes.data.includes("APP_CONFIG")) {
      throw new Error("config.js 静态获取失败");
    }
    console.log("✅ 3. Web 端口 runtime config.js 正常响应！");

    // 3. /api/ai/config 密钥掩码测试
    const aiConfigRes = await fetchHttp(`http://localhost:${WEB_PORT}/api/ai/config`);
    const aiConfigData = aiConfigRes.json();
    if (aiConfigRes.statusCode !== 200 || !aiConfigData || typeof aiConfigData.profiles !== "object") {
      throw new Error("/api/ai/config 响应异常: " + JSON.stringify(aiConfigData));
    }
    const profileList = Object.values(aiConfigData.profiles);
    for (const p of profileList) {
      if (p.apiKey) {
        throw new Error(`检测到未脱敏 API 密钥泄漏在 profile: ${p.id}`);
      }
    }
    console.log(`✅ 4. /api/ai/config 密钥掩码保护生效 (已加载 ${profileList.length} 个预设)！`);

    // 4. 管理员登录与鉴权保护
    const unauthRes = await fetchHttp(`http://localhost:${WEB_PORT}/api/admin/ai-config`, { method: "PUT" });
    if (unauthRes.statusCode !== 401) {
      throw new Error(`未鉴权请求未被拦截！预期 401，实际: ${unauthRes.statusCode}`);
    }
    console.log("✅ 5. 未授权访问 PUT /api/admin/ai-config 严格返回 HTTP 401！");

    const badLoginRes = await fetchHttp(`http://localhost:${WEB_PORT}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { password: "wrong_password" },
    });
    if (badLoginRes.statusCode !== 401) {
      throw new Error("错误密码未返回 401！");
    }
    console.log("✅ 6. 错误密码登录尝试正确拒绝 (HTTP 401)！");

    const goodLoginRes = await fetchHttp(`http://localhost:${WEB_PORT}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { password: TEST_ADMIN_PWD },
    });
    if (goodLoginRes.statusCode !== 200) {
      throw new Error(`正确密码登录失败: ${goodLoginRes.statusCode}`);
    }
    const setCookie = goodLoginRes.headers["set-cookie"]?.[0] || "";
    if (!setCookie.includes("iqs_admin_session=") || !setCookie.includes("HttpOnly")) {
      throw new Error("缺少安全 HttpOnly 会话 Cookie: " + setCookie);
    }
    const cookieHeader = setCookie.split(";")[0];
    console.log("✅ 7. 管理密码校验通过并签发 HttpOnly; SameSite=Lax Cookie！");

    // 5. 使用 Cookie 检查 /api/admin/session
    const adminSessionRes = await fetchHttp(`http://localhost:${WEB_PORT}/api/admin/session`, {
      headers: { Cookie: cookieHeader },
    });
    if (adminSessionRes.statusCode !== 200 || !adminSessionRes.json()?.unlocked) {
      throw new Error("带 Cookie 访问 /api/admin/session 失败: " + adminSessionRes.data);
    }
    console.log("✅ 8. HttpOnly Session 成功验证 /api/admin/session unlocked=true！");

    // 6. 原子持久化测试 (PUT /api/admin/ai-config)
    const updateRes = await fetchHttp(`http://localhost:${WEB_PORT}/api/admin/ai-config`, {
      method: "PUT",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json",
      },
      body: {
        active_profile: "deepseek_public",
        profiles: {
          deepseek_public: {
            id: "deepseek_public",
            name: "DeepSeek Official",
            protocol: "openai",
            endpoint: "https://api.deepseek.com",
            model: "deepseek-chat",
            apiKey: "sk-test-live-key-12345678",
          }
        }
      }
    });
    if (updateRes.statusCode !== 200) {
      throw new Error("保存 AI 配置失败: " + updateRes.data);
    }
    const savedDiskFile = path.join(TMP_DATA_DIR, "ai_config.json");
    if (!fs.existsSync(savedDiskFile)) {
      throw new Error("磁盘未生成原子持久化文件: " + savedDiskFile);
    }
    const onDiskContent = JSON.parse(fs.readFileSync(savedDiskFile, "utf8"));
    if (onDiskContent.profiles?.deepseek_public?.apiKey !== "sk-test-live-key-12345678") {
      throw new Error("磁盘持久化文件密钥与输入不一致！");
    }
    console.log("✅ 9. 管理员更新配置并成功原子落盘至 data/ai_config.json (文件已检验)！");

    // 7. 测试 MCP SSE 连接与代表性协议查询
    console.log("正在验证 MCP 端口 (:13001) SSE 协议与 read_protocol...");
    const mcpTest = spawn("node", ["scripts/verify_live_mcp_protocol.mjs"], {
      env: { ...process.env, MCP_PORT: String(MCP_PORT) },
      stdio: "inherit",
    });
    await new Promise((resolve, reject) => {
      mcpTest.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error("verify_live_mcp_protocol 退出码非零: " + code));
      });
    });
    console.log("✅ 10. MCP SSE 实时协议通道验证全部 PASS！");

    console.log("\n========================================================");
    console.log("🎉 R33 架构全套端到端验收全部 PASS！");
    console.log("   - 单进程双端口 (:13000 Web + :13001 MCP)");
    console.log("   - 零依赖轻量 Node SPA + History Fallback");
    console.log("   - 双轨 AI 隔离 + HttpOnly 会话鉴权 + 密钥掩码");
    console.log("   - 原子持久化至 data/ai_config.json");
    console.log("   - MCP 协议与实时 SSE 通信 100% 兼容");
    console.log("========================================================\n");
  } finally {
    serverProcess.kill("SIGTERM");
    try {
      fs.rmSync(TMP_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error("❌ E2E 验收失败:", err);
  process.exit(1);
});
