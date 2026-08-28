import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api is proxied to whatever VITE_API_BASE names, so the browser
// makes same-origin requests and cookies behave the same way they do in
// production behind a single domain.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_BASE || '';
  return {
    plugins: [react()],
    server: target
      ? { proxy: { '/api': { target, changeOrigin: true, secure: true } } }
      : {},
  };
});
