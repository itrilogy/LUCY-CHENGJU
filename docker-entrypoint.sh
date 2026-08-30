#!/bin/sh
# Generate config.js from environment variables in the dist folder for production injection
echo "Generating dist/config.js with runtime environment variables..."
cat <<EOF > /app/dist/config.js
window.APP_CONFIG = {
  API_KEY: "${API_KEY:-}",
  AI_ACTIVE_PROFILE: "${AI_ACTIVE_PROFILE:-deepseek_public}"
};
EOF

# Start the Frontend (Vite preview for production build)
# Using --host 0.0.0.0 to allow access from outside the container
echo "Starting Frontend on port 5173..."
npm run preview -- --port 5173 --host 0.0.0.0 &

# Wait for Frontend to be ready
echo "Waiting for Frontend to initialize..."
sleep 5

# Start the MCP Server in SSE mode
echo "Starting MCP Server (SSE) on port 3000..."
cd mcp-server
npm run start:sse
