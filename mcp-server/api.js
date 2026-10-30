import crypto from "crypto";
import fs from "fs";
import path from "path";

const CLIENT_COOKIE_PROFILE_ID = "client_cookie";
const ADMIN_SESSION_COOKIE = "iqs_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_JSON_BODY_BYTES = 512 * 1024; // 512 KiB
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;

const BUILTIN_CLIENT_PROFILE = {
  id: CLIENT_COOKIE_PROFILE_ID,
  name: "本地客户端模型 (Browser Cookie)",
  protocol: "openai",
  endpoint: "http://127.0.0.1:1234/v1/chat/completions",
  model: "client-cookie-model",
  models: [],
  max_tokens: 8192,
};

/**
 * 掩码化展示 API Key（仅保留前 3 位与后 4 位，绝不向客户端暴露完整密钥）
 */
function maskApiKey(rawKey) {
  const k = String(rawKey || "").trim();
  if (!k) return "";
  if (k.length <= 8) return "****";
  return `${k.slice(0, 3)}****${k.slice(-4)}`;
}

/**
 * 常量时间字符串比对（经 SHA-256 定长摘要消除长度侧信道）
 */
function safeEqualString(a, b) {
  const ha = crypto.createHash("sha256").update(String(a ?? ""), "utf8").digest();
  const hb = crypto.createHash("sha256").update(String(b ?? ""), "utf8").digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * 根据协议类型推导对话端点与模型列表端点（与前端 resolveProtocolEndpoints 保持一致）
 */
export function resolveProtocolEndpoints(rawEndpoint, protocol = "openai", model = "") {
  const trimmed = String(rawEndpoint || "").trim().replace(/\/+$/, "");
  if (!trimmed) {
    return { chatUrl: "", modelsUrl: "" };
  }

  if (protocol === "anthropic") {
    const base = trimmed.replace(/\/v1\/messages$/i, "").replace(/\/messages$/i, "");
    const withV1 = base.endsWith("/v1") ? base : `${base}/v1`;
    return {
      chatUrl: trimmed.endsWith("/messages") ? trimmed : `${withV1}/messages`,
      modelsUrl: `${withV1}/models`,
    };
  }

  if (protocol === "gemini") {
    if (trimmed.includes("/chat/completions")) {
      return {
        chatUrl: trimmed,
        modelsUrl: trimmed.replace(/\/chat\/completions$/i, "/models"),
      };
    }
    const base = trimmed.replace(/\/models\/.*$/i, "").replace(/\/models$/i, "");
    const v1beta = base.includes("/v1") ? base : `${base}/v1beta`;
    return {
      chatUrl: `${v1beta}/models/${encodeURIComponent(model || "gemini-2.0-flash")}:generateContent`,
      modelsUrl: `${v1beta}/models`,
    };
  }

  if (protocol === "custom") {
    const modelsUrl = trimmed.includes("/chat/completions")
      ? trimmed.replace(/\/chat\/completions$/i, "/models")
      : `${trimmed.replace(/\/v1$/i, "")}/v1/models`;
    return {
      chatUrl: trimmed,
      modelsUrl,
    };
  }

  if (trimmed.endsWith("/chat/completions")) {
    return {
      chatUrl: trimmed,
      modelsUrl: trimmed.replace(/\/chat\/completions$/i, "/models"),
    };
  }
  if (trimmed.endsWith("/v1")) {
    return {
      chatUrl: `${trimmed}/chat/completions`,
      modelsUrl: `${trimmed}/models`,
    };
  }
  return {
    chatUrl: `${trimmed}/v1/chat/completions`,
    modelsUrl: `${trimmed}/v1/models`,
  };
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of String(cookieHeader).split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function readJsonBody(req, maxBytes = MAX_JSON_BODY_BYTES) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let aborted = false;
    req.on("data", (chunk) => {
      if (aborted) return;
      total += chunk.length;
      if (total > maxBytes) {
        aborted = true;
        reject(Object.assign(new Error("请求体超出大小限制"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (aborted) return;
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("无效的 JSON 请求体"), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  res.end(body);
}

/**
 * 创建同构 IQS 服务端 API 中间件（兼容 Express 5 与 Vite Dev/Preview Connect 中间件）
 *
 * 职责（R33 / AUD-196..198）：
 * 1. 管理员会话鉴权（HMAC HttpOnly Cookie + 常量时间密码比对 + 防暴力限流）
 * 2. 管理端全局模型配置持久化（data/ai_config.json）与 API Key 脱敏下发
 * 3. 管理端模型对话与模型拉取服务端代理（杜绝向浏览器暴露 API_KEY，消除跨域限制与 SSRF）
 * 4. 容器编排健康探针（GET /healthz）
 */
export function createIqsApiMiddleware(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const dataDir = options.dataDir || process.env.IQS_DATA_DIR || path.join(rootDir, "data");
  const defaultConfigPath = options.defaultConfigPath || path.join(rootDir, "public/config.json");
  const persistedConfigPath = path.join(dataDir, "ai_config.json");
  const getEnv = (key) => {
    if (options.env && options.env[key] !== undefined && options.env[key] !== "") {
      return options.env[key];
    }
    return process.env[key];
  };

  const sessionSecret = crypto.randomBytes(32);
  const loginFailures = new Map(); // ip -> { count, resetAt }

  const adminPwdStartup = String(getEnv("IQS_ADMIN_PASSWORD") || getEnv("ADMIN_PASSWORD") || "").trim();
  if (!adminPwdStartup && process.env.NODE_ENV === "production") {
    console.warn(
      "[IQS Security] 未显式设置环境变量 IQS_ADMIN_PASSWORD，当前回退使用默认管理口令，生产环境强烈建议修改！"
    );
  }

  function getAdminPassword() {
    const candidates = [getEnv("IQS_ADMIN_PASSWORD"), getEnv("ADMIN_PASSWORD")];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 0) return c.trim();
    }
    return "luxi2026";
  }

  function getGlobalEnvApiKey() {
    const k = getEnv("API_KEY") || getEnv("GEMINI_API_KEY") || "";
    return String(k).trim();
  }

  function signSessionToken() {
    const payload = Buffer.from(
      JSON.stringify({
        exp: Date.now() + SESSION_TTL_MS,
        nonce: crypto.randomBytes(12).toString("hex"),
      }),
      "utf8"
    ).toString("base64url");
    const sig = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
    return `${payload}.${sig}`;
  }

  function verifySessionToken(token) {
    if (!token || typeof token !== "string" || !token.includes(".")) return false;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;
    const expected = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
    if (!safeEqualString(sig, expected)) return false;
    try {
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      return typeof decoded?.exp === "number" && decoded.exp > Date.now();
    } catch {
      return false;
    }
  }

  function isAuthenticated(req) {
    const cookies = parseCookies(req.headers?.cookie);
    if (verifySessionToken(cookies[ADMIN_SESSION_COOKIE])) return true;
    const authHeader = String(req.headers?.authorization || "");
    if (authHeader.startsWith("Bearer ")) {
      return verifySessionToken(authHeader.slice(7).trim());
    }
    return false;
  }

  function loadDefaultSpec() {
    try {
      if (fs.existsSync(defaultConfigPath)) {
        const parsed = JSON.parse(fs.readFileSync(defaultConfigPath, "utf8"));
        return {
          version: parsed.version || "3.6.2-ildr",
          ai_config: parsed.ai_config || { active_profile: "deepseek_public", profiles: {} },
        };
      }
    } catch (err) {
      console.error("[IQS API] Failed to read public/config.json:", err.message);
    }
    return {
      version: "3.6.2-ildr",
      ai_config: {
        active_profile: "deepseek_public",
        profiles: {
          deepseek_public: {
            name: "DeepSeek 官方推理",
            protocol: "openai",
            endpoint: "https://api.deepseek.com/v1/chat/completions",
            model: "deepseek-chat",
            models: ["deepseek-chat", "deepseek-reasoner"],
            max_tokens: 8192,
          },
          [CLIENT_COOKIE_PROFILE_ID]: { ...BUILTIN_CLIENT_PROFILE },
        },
      },
    };
  }

  function loadRawServerAIConfig() {
    const spec = loadDefaultSpec();
    const envActive = String(getEnv("AI_ACTIVE_PROFILE") || "").trim();

    const baseProfiles = {};
    for (const [k, v] of Object.entries(spec.ai_config.profiles || {})) {
      baseProfiles[k] = {
        protocol: "openai",
        max_tokens: 8192,
        ...v,
        id: k,
      };
    }
    if (!baseProfiles[CLIENT_COOKIE_PROFILE_ID]) {
      baseProfiles[CLIENT_COOKIE_PROFILE_ID] = { ...BUILTIN_CLIENT_PROFILE };
    }

    try {
      if (fs.existsSync(persistedConfigPath)) {
        const stored = JSON.parse(fs.readFileSync(persistedConfigPath, "utf8"));
        if (stored && typeof stored === "object" && stored.profiles && typeof stored.profiles === "object") {
          const merged = {};
          for (const [k, v] of Object.entries(stored.profiles)) {
            if (!v || typeof v !== "object") continue;
            merged[k] = {
              protocol: "openai",
              max_tokens: 8192,
              ...v,
              id: k,
            };
          }
          if (!merged[CLIENT_COOKIE_PROFILE_ID]) {
            merged[CLIENT_COOKIE_PROFILE_ID] = { ...BUILTIN_CLIENT_PROFILE };
          }
          const activeKey =
            stored.active_profile && merged[stored.active_profile]
              ? stored.active_profile
              : Object.keys(merged)[0] || spec.ai_config.active_profile;
          return {
            active_profile: activeKey,
            profiles: merged,
          };
        }
      }
    } catch (err) {
      console.error("[IQS API] Failed to read persisted ai_config.json:", err.message);
    }

    const defaultActive =
      envActive && baseProfiles[envActive] ? envActive : spec.ai_config.active_profile;
    return {
      active_profile: defaultActive,
      profiles: baseProfiles,
    };
  }

  function sanitizeConfigForClient(rawState) {
    const hasEnvApiKey = Boolean(getGlobalEnvApiKey());
    const safeProfiles = {};
    for (const [k, v] of Object.entries(rawState.profiles || {})) {
      const ownKey = String(v?.apiKey || "").trim();
      safeProfiles[k] = {
        id: k,
        name: String(v?.name || k),
        protocol: v?.protocol || "openai",
        endpoint: String(v?.endpoint || ""),
        model: String(v?.model || ""),
        models: Array.isArray(v?.models) ? v.models : [],
        max_tokens: Number(v?.max_tokens) || 8192,
        apiKey: "",
        hasApiKey: Boolean(ownKey),
        maskedKey: ownKey ? maskApiKey(ownKey) : "",
      };
    }
    return {
      active_profile: rawState.active_profile,
      hasEnvApiKey,
      profiles: safeProfiles,
    };
  }

  function saveRawServerAIConfig(nextState) {
    fs.mkdirSync(dataDir, { recursive: true });
    const tmpPath = `${persistedConfigPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(nextState, null, 2), "utf8");
    fs.renameSync(tmpPath, persistedConfigPath);
  }

  function resolveServerApiKey(profile) {
    const own = String(profile?.apiKey || "").trim();
    if (own) return own;
    return getGlobalEnvApiKey();
  }

  return async function iqsApiMiddleware(req, res, next) {
    const rawUrl = req.originalUrl || req.url || "";
    const pathname = rawUrl.split("?")[0];

    if (pathname === "/healthz") {
      const spec = loadDefaultSpec();
      return sendJson(res, 200, {
        status: "ok",
        version: spec.version,
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    }

    if (!pathname.startsWith("/api/")) {
      return next();
    }

    const method = String(req.method || "GET").toUpperCase();

    try {
      // 1. 查询当前管理员解锁状态
      if (method === "GET" && pathname === "/api/admin/session") {
        return sendJson(res, 200, {
          unlocked: isAuthenticated(req),
          hasEnvApiKey: Boolean(getGlobalEnvApiKey()),
        });
      }

      // 2. 管理员密码校验登录
      if (method === "POST" && pathname === "/api/admin/login") {
        const ip = String(req.ip || req.socket?.remoteAddress || "unknown");
        const now = Date.now();
        const record = loginFailures.get(ip);
        if (record && record.resetAt > now && record.count >= LOGIN_MAX_FAILURES) {
          return sendJson(res, 429, {
            ok: false,
            error: "密码尝试次数过多，请 5 分钟后再试。",
          });
        }

        const body = await readJsonBody(req);
        const inputPwd = String(body?.password ?? "").trim();
        if (!safeEqualString(inputPwd, getAdminPassword())) {
          const prev = record && record.resetAt > now ? record.count : 0;
          loginFailures.set(ip, { count: prev + 1, resetAt: now + LOGIN_WINDOW_MS });
          return sendJson(res, 401, {
            ok: false,
            error: "管理密码校验未通过，请核对服务端环境变量 IQS_ADMIN_PASSWORD 配置。",
          });
        }

        loginFailures.delete(ip);
        const token = signSessionToken();
        const isSecure = req.protocol === "https" || req.headers?.["x-forwarded-proto"] === "https";
        const cookieAttrs = [
          `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
          "Path=/",
          `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
          "HttpOnly",
          "SameSite=Lax",
          isSecure ? "Secure" : "",
        ]
          .filter(Boolean)
          .join("; ");

        return sendJson(
          res,
          200,
          { ok: true, unlocked: true },
          { "Set-Cookie": cookieAttrs }
        );
      }

      // 3. 管理员锁定退出
      if (method === "POST" && pathname === "/api/admin/logout") {
        return sendJson(
          res,
          200,
          { ok: true, unlocked: false },
          {
            "Set-Cookie": `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
          }
        );
      }

      // 4. 公开读取脱敏后的全局模型配置
      if (method === "GET" && pathname === "/api/ai/config") {
        const state = loadRawServerAIConfig();
        return sendJson(res, 200, sanitizeConfigForClient(state));
      }

      // 5. 管理员保存全局模型配置（脱敏合并，未填新 apiKey 时自动保留既有服务端密钥）
      if (method === "PUT" && pathname === "/api/admin/ai-config") {
        if (!isAuthenticated(req)) {
          return sendJson(res, 401, { error: "管理员会话未解锁或已过期，请重新验证密码。" });
        }
        const body = await readJsonBody(req);
        if (!body || typeof body !== "object" || !body.profiles || typeof body.profiles !== "object") {
          return sendJson(res, 400, { error: "无效的模型配置格式。" });
        }

        const current = loadRawServerAIConfig();
        // 支持提供商重命名时继承原 ID 的专属密钥（previousId 字段）
        const nextProfiles = {};
        for (const [rawId, incoming] of Object.entries(body.profiles)) {
          const id = String(rawId || "").trim();
          if (!id || !/^[a-zA-Z0-9_-]{2,40}$/.test(id)) {
            return sendJson(res, 400, { error: `非法的提供商标识 ID: ${id}` });
          }
          if (!incoming || typeof incoming !== "object") continue;

          const prevSourceId =
            typeof incoming.previousId === "string" && current.profiles[incoming.previousId]
              ? incoming.previousId
              : id;
          const existingProfile = current.profiles[prevSourceId];

          let finalApiKey = String(existingProfile?.apiKey || "").trim();
          if (incoming.clearApiKey === true) {
            finalApiKey = "";
          } else if (typeof incoming.apiKey === "string" && incoming.apiKey.trim().length > 0) {
            finalApiKey = incoming.apiKey.trim();
          }

          const allowedProtocols = ["openai", "anthropic", "gemini", "custom"];
          const protocol = allowedProtocols.includes(incoming.protocol) ? incoming.protocol : "openai";

          nextProfiles[id] = {
            id,
            name: String(incoming.name || id).trim().slice(0, 80),
            protocol,
            endpoint: String(incoming.endpoint || "").trim().slice(0, 500),
            apiKey: finalApiKey,
            model: String(incoming.model || "").trim().slice(0, 120),
            models: Array.isArray(incoming.models)
              ? incoming.models.map((m) => String(m || "").trim()).filter(Boolean).slice(0, 500)
              : [],
            max_tokens: Math.min(Math.max(Number(incoming.max_tokens) || 8192, 256), 131072),
          };
        }

        if (!nextProfiles[CLIENT_COOKIE_PROFILE_ID]) {
          nextProfiles[CLIENT_COOKIE_PROFILE_ID] = { ...BUILTIN_CLIENT_PROFILE };
        }

        const requestedActive = String(body.active_profile || "").trim();
        const activeProfile =
          requestedActive && nextProfiles[requestedActive]
            ? requestedActive
            : Object.keys(nextProfiles)[0] || CLIENT_COOKIE_PROFILE_ID;

        const toPersist = {
          active_profile: activeProfile,
          profiles: nextProfiles,
        };
        saveRawServerAIConfig(toPersist);
        return sendJson(res, 200, sanitizeConfigForClient(toPersist));
      }

      // 6. 管理员重置模型配置为 public/config.json 默认状态
      if (method === "POST" && pathname === "/api/admin/ai-config/reset") {
        if (!isAuthenticated(req)) {
          return sendJson(res, 401, { error: "管理员会话未解锁或已过期，请重新验证密码。" });
        }
        if (fs.existsSync(persistedConfigPath)) {
          fs.unlinkSync(persistedConfigPath);
        }
        const fresh = loadRawServerAIConfig();
        return sendJson(res, 200, sanitizeConfigForClient(fresh));
      }

      // 7. 管理员在服务端拉取远端可用模型列表（仅管理员可调用，杜绝未授权 SSRF）
      if (method === "POST" && pathname === "/api/ai/models") {
        if (!isAuthenticated(req)) {
          return sendJson(res, 401, { error: "管理员会话未解锁或已过期，请重新验证密码。" });
        }
        const body = await readJsonBody(req);
        const state = loadRawServerAIConfig();
        const profileId = String(body?.profileId || "").trim();
        const storedProfile = profileId ? state.profiles[profileId] : null;

        const protocol = body?.protocol || storedProfile?.protocol || "openai";
        const endpoint = String(body?.endpoint ?? storedProfile?.endpoint ?? "").trim();
        const model = String(body?.model ?? storedProfile?.model ?? "").trim();
        const explicitKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
        const apiKey = explicitKey || resolveServerApiKey(storedProfile);

        const { modelsUrl } = resolveProtocolEndpoints(endpoint, protocol, model);
        if (!modelsUrl) {
          return sendJson(res, 400, { error: "请先填写有效的接入地址 (Endpoint)" });
        }

        const headers = { Accept: "application/json" };
        let targetUrl = modelsUrl;
        if (protocol === "anthropic") {
          if (apiKey) headers["x-api-key"] = apiKey;
          headers["anthropic-version"] = "2023-06-01";
        } else if (protocol === "gemini" && !modelsUrl.includes("/v1/models")) {
          if (apiKey) {
            targetUrl = `${modelsUrl}${modelsUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`;
          }
        } else if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const upstream = await fetch(targetUrl, {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(20000),
        });

        if (!upstream.ok) {
          const errText = await upstream.text().catch(() => "");
          return sendJson(res, upstream.status, {
            error: `拉取模型失败 (HTTP ${upstream.status}): ${errText.slice(0, 160) || upstream.statusText}`,
          });
        }

        const data = await upstream.json();
        const list = [];
        if (Array.isArray(data?.data)) {
          for (const item of data.data) {
            const id = item?.id || item?.name;
            if (typeof id === "string" && id.trim()) list.push(id.trim());
          }
        } else if (Array.isArray(data?.models)) {
          for (const item of data.models) {
            const rawName = typeof item === "string" ? item : item?.id || item?.name;
            if (typeof rawName === "string" && rawName.trim()) {
              list.push(rawName.trim().replace(/^models\//, ""));
            }
          }
        } else if (Array.isArray(data)) {
          for (const item of data) {
            const id = typeof item === "string" ? item : item?.id || item?.name;
            if (typeof id === "string" && id.trim()) list.push(id.trim());
          }
        }

        const unique = Array.from(new Set(list));
        if (unique.length === 0) {
          return sendJson(res, 422, {
            error: "接口返回成功，但未解析到任何模型 ID，请检查端点或手动输入模型名",
          });
        }
        return sendJson(res, 200, { models: unique });
      }

      // 8. 服务端代理模型对话推理（严格按服务端已登记的 profileId 查找端点，零 SSRF 风险）
      if (method === "POST" && pathname === "/api/ai/chat") {
        const body = await readJsonBody(req);
        const systemPrompt = String(body?.systemPrompt ?? "");
        const userPrompt = String(body?.userPrompt ?? "");
        if (!userPrompt.trim()) {
          return sendJson(res, 400, { error: "userPrompt 不能为空。" });
        }

        const state = loadRawServerAIConfig();
        const targetId = String(body?.profileId || state.active_profile || "").trim();
        if (targetId === CLIENT_COOKIE_PROFILE_ID) {
          return sendJson(res, 400, {
            error: "当前系统已设置为「使用本地客户端模型」，请在浏览器端配置个人模型 Cookie。",
          });
        }

        const profile = state.profiles[targetId];
        if (!profile) {
          return sendJson(res, 404, { error: `未找到激活的大模型配置方案: ${targetId}` });
        }

        const protocol = profile.protocol || "openai";
        const apiKey = resolveServerApiKey(profile);
        const { chatUrl } = resolveProtocolEndpoints(profile.endpoint, protocol, profile.model);
        if (!chatUrl) {
          return sendJson(res, 400, { error: `提供商「${profile.name}」尚未配置有效的 Endpoint。` });
        }

        const requestedMax = Number(body?.maxTokens);
        const cap =
          Number(profile.max_tokens) ||
          (Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : 8192);

        if (protocol === "anthropic") {
          const headers = {
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          };
          if (apiKey) headers["x-api-key"] = apiKey;

          const upstream = await fetch(chatUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: profile.model,
              system: systemPrompt,
              messages: [{ role: "user", content: userPrompt }],
              max_tokens: cap,
              temperature: 0.1,
            }),
            signal: AbortSignal.timeout(90000),
          });
          if (!upstream.ok) {
            const err = await upstream.text().catch(() => "");
            return sendJson(res, upstream.status, {
              error: `Anthropic API Error: ${upstream.status} - ${err.slice(0, 300)}`,
            });
          }
          const data = await upstream.json();
          const text = Array.isArray(data?.content)
            ? data.content.map((c) => c?.text || "").join("")
            : String(data?.completion || "");
          return sendJson(res, 200, {
            text,
            finishReason: data?.stop_reason ?? null,
            chars: text.length,
            usage: data?.usage,
          });
        }

        if (protocol === "gemini" && !chatUrl.includes("/chat/completions")) {
          const urlWithKey = apiKey
            ? `${chatUrl}${chatUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`
            : chatUrl;
          const upstream = await fetch(urlWithKey, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: cap,
              },
            }),
            signal: AbortSignal.timeout(90000),
          });
          if (!upstream.ok) {
            const err = await upstream.text().catch(() => "");
            return sendJson(res, upstream.status, {
              error: `Gemini API Error: ${upstream.status} - ${err.slice(0, 300)}`,
            });
          }
          const data = await upstream.json();
          const parts = data?.candidates?.[0]?.content?.parts || [];
          const text = parts.map((p) => p?.text || "").join("");
          return sendJson(res, 200, {
            text,
            finishReason: data?.candidates?.[0]?.finishReason ?? null,
            chars: text.length,
          });
        }

        const payload = {
          model: profile.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
        };
        if (typeof cap === "number" && cap > 0) payload.max_tokens = cap;

        const headers = { "Content-Type": "application/json" };
        if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

        const upstream = await fetch(chatUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(90000),
        });
        if (!upstream.ok) {
          const err = await upstream.text().catch(() => "");
          return sendJson(res, upstream.status, {
            error: `AI API Error: ${upstream.status} - ${err.slice(0, 300)}`,
          });
        }
        const data = await upstream.json();
        const choice = data?.choices?.[0];
        const msg = choice?.message || {};
        const text = String(msg.content || msg.reasoning_content || "");
        return sendJson(res, 200, {
          text,
          finishReason: choice?.finish_reason ?? data?.finish_reason ?? null,
          chars: text.length,
          usage: data?.usage,
        });
      }

      return sendJson(res, 404, { error: `未知 API 路径: ${method} ${pathname}` });
    } catch (err) {
      const code = Number(err?.statusCode) || 500;
      console.error(`[IQS API] ${method} ${pathname} error:`, err?.message || err);
      return sendJson(res, code, { error: err?.message || "服务端内部错误" });
    }
  };
}
