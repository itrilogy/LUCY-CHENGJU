import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.API_KEY),
      'process.env.AI_ACTIVE_PROFILE': JSON.stringify(env.AI_ACTIVE_PROFILE || 'deepseek_public')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
