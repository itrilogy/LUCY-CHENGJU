# ============================================================
# Stage 1: Build — compile the frontend with all dev dependencies
# ============================================================
FROM node:22-slim AS builder

WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package*.json ./
COPY mcp-server/package*.json ./mcp-server/

# Install ALL dependencies (including devDeps for building)
RUN npm install

# Copy all source files
COPY . .

# Build the frontend (Vite)
RUN npm run build

# ============================================================
# Stage 2: Production — minimal runtime image
# ============================================================
FROM node:22-slim AS production

# Install Chromium for Puppeteer (headless rendering)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY mcp-server/package*.json ./mcp-server/

# Install production dependencies for root project
# (vite is needed at runtime for `vite preview` to serve the built frontend)
RUN npm install

# Install production-only dependencies for MCP Server
RUN cd mcp-server && npm install --omit=dev

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy runtime source files
COPY mcp-server/index.js ./mcp-server/
COPY mcp-server/mcp_tools.json ./mcp-server/
COPY protocol ./protocol
COPY public ./public
COPY docker-entrypoint.sh .

# Expose ports:
#   12000 — Frontend (Vite preview)
#   12001 — MCP Server (SSE)
EXPOSE 12000 12001

# Runtime environment
ENV NODE_ENV=production
ENV IQS_BASE_URL=http://localhost:12000
ENV WEB_PORT=12000
ENV PORT=12001

RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
