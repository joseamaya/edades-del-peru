import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
