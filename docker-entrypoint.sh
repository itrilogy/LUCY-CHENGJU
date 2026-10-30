#!/bin/sh
set -eu

WEB_PORT="${WEB_PORT:-12000}"
MCP_PORT="${PORT:-12001}"
export WEB_PORT
export PORT="$MCP_PORT"
export SERVE_WEB="${SERVE_WEB:-true}"
export IQS_DATA_DIR="${IQS_DATA_DIR:-/app/data}"
export IQS_BASE_URL="${IQS_BASE_URL:-http://localhost:${WEB_PORT}}"
export IQS_SERVER_PUBLIC_URL="${IQS_SERVER_PUBLIC_URL:-}"
export IQS_TRUST_PROXY="${IQS_TRUST_PROXY:-}"

# R33 / AUD-197：仅注入非敏感公开元数据（API_KEY 与 IQS_ADMIN_PASSWORD 严禁写入前端静态目录）
if [ -d "/app/dist" ] && [ -w "/app/dist" ]; then
  cat <<EOF > /app/dist/config.js
window.APP_CONFIG = {
  AI_ACTIVE_PROFILE: "${AI_ACTIVE_PROFILE:-deepseek_public}"
};
EOF
fi

echo "[IQS Entrypoint] Starting unified single-process Web (:${WEB_PORT}) + MCP SSE (:${MCP_PORT}) server..."
exec node /app/mcp-server/index.js --transport=sse --serve-web
