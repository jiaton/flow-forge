import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
      extensions: ['.ts', '.js', '.mjs', '.json'],
    },
    build: {
      lib: {
        entry: resolve('electron/main.js'),
      },
      rollupOptions: {
        output: {
          // Bundle dynamic imports inline so main process is a single file
          inlineDynamicImports: true,
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('electron/preload.js'),
        formats: ['cjs'],
      },
      rollupOptions: {
        output: {
          entryFileNames: 'preload.js',
        },
      },
    },
  },
  renderer: {
    root: '.',
    base: './',
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    resolve: {
      alias: {
        '@': resolve('src'),
        '@shared': resolve('src/shared'),
      },
    },
    build: {
      rollupOptions: {
        input: resolve('index.html'),
      },
    },
  },
});
