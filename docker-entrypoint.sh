#!/bin/sh
# Generate config.js from environment variables in the dist folder for production injection
echo "Generating dist/config.js with runtime environment variables..."
cat <<EOF > /app/dist/config.js
window.APP_CONFIG = {
  API_KEY: "${API_KEY:-}",
  AI_ACTIVE_PROFILE: "${AI_ACTIVE_PROFILE:-deepseek_public}"
};
EOF

WEB_PORT="${WEB_PORT:-12000}"
MCP_PORT="${PORT:-12001}"
export PORT="$MCP_PORT"
export IQS_BASE_URL="${IQS_BASE_URL:-http://localhost:${WEB_PORT}}"

# Start the Frontend (Vite preview for production build)
echo "Starting Frontend on port ${WEB_PORT}..."
npx vite preview --port "$WEB_PORT" --host 0.0.0.0 --strictPort &

# Wait for Frontend to be ready
echo "Waiting for Frontend to initialize..."
sleep 5

# Start the MCP Server in SSE mode
echo "Starting MCP Server (SSE) on port ${MCP_PORT}..."
cd mcp-server
npm run start:sse
