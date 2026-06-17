import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// In dev, forward API paths to the NestJS process on :3100 (3000 is taken locally).
// All REST routes are under /api; /health is top-level. Everything else is the SPA.
const apiPaths = ['/api', '/health'];
const proxy = Object.fromEntries(apiPaths.map((p) => [p, 'http://localhost:3100']));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // @hisobotchi/shared ships a CommonJS dist with `export *` barrels. Vite's on-the-fly
  // CJS interop serves it raw and the browser's ESM loader can't see its named exports
  // (e.g. DEFAULT_METRICS). Force esbuild to pre-bundle it into a proper ESM module.
  optimizeDeps: {
    include: ['@hisobotchi/shared'],
  },
  server: {
    port: 5173,
    proxy,
  },
});
