# ============================================================
# Stage 1: Builder — 全量门禁校验 + 前端分包构建 + Tier-1 核心打包
# ============================================================
FROM node:22-slim AS builder

ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

# 优先拷贝依赖清单以最大化利用 Docker 层缓存
COPY package*.json ./
COPY mcp-server/package*.json ./mcp-server/

RUN npm ci

# 拷贝工程源码并执行完整构建门禁（validate:dsl + math asserts + build:mcp-lint + vite build）
COPY . .
RUN npm run build

# ============================================================
# Stage 2: Production — 精简非 root 单进程双端口生产镜像 (R33 / AUD-195..199)
# ============================================================
FROM node:22-slim AS production

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    IQS_CHROMIUM_NO_SANDBOX=true \
    SERVE_WEB=true \
    WEB_PORT=12000 \
    PORT=12001 \
    IQS_BASE_URL=http://localhost:12000 \
    IQS_DATA_DIR=/app/data \
    IQS_RENDER_TTL_HOURS=24 \
    IQS_RENDER_MAX_FILES=500

# 安装 tini (PID 1 僵尸进程回收与信号转发)、无头 Chromium 及中日英开源矢量字体（含 Noto CJK）
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    chromium \
    ca-certificates \
    fonts-noto-cjk \
    fonts-wqy-zenhei \
    fonts-ipafont-gothic \
    fonts-freefont-ttf \
    libxss1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 appuser \
    && useradd --system --uid 10001 --gid appuser --create-home --home-dir /home/appuser appuser

WORKDIR /app

# 仅安装后端 MCP + Express 生产运行期依赖（无需安装前端构建树与 vite preview，镜像瘦身 ~500MB）
COPY mcp-server/package*.json ./mcp-server/
RUN cd /app/mcp-server \
    && npm ci --omit=dev \
    && npm cache clean --force

# 拷贝构建产物与最小运行期文件集
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/mcp-server/lib ./mcp-server/lib
COPY mcp-server/index.js mcp-server/api.js mcp-server/linters.js mcp-server/mcp_tools.json ./mcp-server/
COPY protocol ./protocol
COPY public/config.json ./public/config.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# 预创建命名卷挂载目录并赋权给非 root 运行账户（确保 Docker 首次挂载卷自动继承 10001 写权限）
RUN mkdir -p /app/mcp-server/renders /app/data /home/appuser/.cache \
    && chmod +x /app/docker-entrypoint.sh \
    && chown -R appuser:appuser /app/dist /app/mcp-server/renders /app/data /home/appuser

USER appuser

# 12000 — Web 工作台静态资源 + /api/* 服务端代理
# 12001 — MCP Server (/sse, /messages, /renders)
EXPOSE 12000 12001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "Promise.all([fetch('http://127.0.0.1:'+(process.env.WEB_PORT||12000)+'/healthz'),fetch('http://127.0.0.1:'+(process.env.PORT||12001)+'/healthz')]).then(rs=>process.exit(rs.every(r=>r.ok)?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "./docker-entrypoint.sh"]
