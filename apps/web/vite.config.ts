import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// In dev, forward API paths to the NestJS process on :3000.
// All REST routes are under /api; /health is top-level. Everything else is the SPA.
const apiPaths = ['/api', '/health'];
const proxy = Object.fromEntries(apiPaths.map((p) => [p, 'http://localhost:3000']));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy,
  },
});
