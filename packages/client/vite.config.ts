import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@col/shared': path.resolve(__dirname, '../shared/src/index.ts') } },
  server: { port: 5173, host: true, proxy: { '/api': 'http://127.0.0.1:8080', '/ws': { target: 'ws://127.0.0.1:8080', ws: true } } },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1500 },
});
