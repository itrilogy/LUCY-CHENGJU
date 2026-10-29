#!/bin/sh
# Generate config.js from environment variables in the dist folder for production injection
echo "Generating dist/config.js with runtime environment variables..."
cat <<EOF > /app/dist/config.js
window.APP_CONFIG = {
  API_KEY: "${API_KEY:-}",
  AI_ACTIVE_PROFILE: "${AI_ACTIVE_PROFILE:-deepseek_public}",
  IQS_ADMIN_PASSWORD: "${IQS_ADMIN_PASSWORD:-luxi2026}"
};
EOF

WEB_PORT="${WEB_PORT:-12000}"
MCP_PORT="${PORT:-12001}"
export PORT="$MCP_PORT"
export IQS_BASE_URL="${IQS_BASE_URL:-http://localhost:${WEB_PORT}}"
export IQS_SERVER_PUBLIC_URL="${IQS_SERVER_PUBLIC_URL:-}"
export IQS_TRUST_PROXY="${IQS_TRUST_PROXY:-}"

# Start the Frontend (Vite preview for production build)
echo "Starting Frontend on port ${WEB_PORT}..."
npx vite preview --port "$WEB_PORT" --host 0.0.0.0 --strictPort &
WEB_PID=$!

# Wait for Frontend HTTP endpoint to be ready (max 15s)
echo "Waiting for Frontend to initialize on http://127.0.0.1:${WEB_PORT}..."
READY=0
for i in $(seq 1 30); do
  if node -e "fetch('http://127.0.0.1:${WEB_PORT}').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" 2>/dev/null; then
    READY=1
    break
  fi
  sleep 0.5
done

if [ "$READY" -eq 1 ]; then
  echo "Frontend is ready."
else
  echo "Warning: Frontend readiness probe timed out after 15s, continuing..."
fi

# Start the MCP Server in SSE mode
echo "Starting MCP Server (SSE) on port ${MCP_PORT}..."
cd mcp-server
exec npm run start:sse
