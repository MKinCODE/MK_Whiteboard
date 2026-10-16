import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Essential for Electron local file loading
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  }
});
