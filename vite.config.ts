import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createIqsApiMiddleware } from './mcp-server/api.js';

function iqsBackendApiPlugin(env: Record<string, string>): Plugin {
  const apiMiddleware = createIqsApiMiddleware({
    rootDir: __dirname,
    env,
  });
  return {
    name: 'iqs-backend-api-middleware',
    configureServer(server) {
      server.middlewares.use(apiMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 12000,
      host: '0.0.0.0',
      strictPort: true,
    },
    preview: {
      port: 12000,
      host: '0.0.0.0',
      strictPort: true,
    },
    plugins: [react(), iqsBackendApiPlugin(env)],
    // R33 / AUD-197: 严禁将 API_KEY / GEMINI_API_KEY / IQS_ADMIN_PASSWORD 注入客户端 bundle
    define: {
      'process.env.AI_ACTIVE_PROFILE': JSON.stringify(env.AI_ACTIVE_PROFILE || 'deepseek_public'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // R34: Mermaid / VChart 经 React.lazy 动态导入，逃出启动期依赖扫描，
    // 运行期补发现会触发依赖优化器反复重跑并以 504 返回。此处按源码中的
    // 原始请求路径显式纳入启动期预构建，使其进入首次提交的元数据。
    // 仅作用于开发态优化器，不改变下方 manualChunks 的生产分包。
    optimizeDeps: {
      include: [
        'mermaid',
        'html-to-image',
        'jspdf',
        '@visactor/vchart/esm/vchart-all',
        '@visactor/vchart/esm/theme/builtin',
      ],
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('echarts-gl')) return 'vendor-echarts-gl';
            if (id.includes('echarts') || id.includes('zrender')) return 'vendor-echarts';
            if (id.includes('@visactor')) return 'vendor-vchart';
            if (id.includes('mermaid') || id.includes('cytoscape') || id.includes('katex') || id.includes('d3-')) {
              return 'vendor-mermaid';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'vendor-react';
            }
            return undefined;
          },
        },
      },
    },
  };
});
