import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config.ts';
// Tarayıcı içi test sürümü: tek JS + tek CSS dosyası, göreli yollar.
export default mergeConfig(base, defineConfig({
  base: './',
  build: { outDir: 'dist-offline', emptyOutDir: true, cssCodeSplit: false, rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app.[ext]' } } },
}));
