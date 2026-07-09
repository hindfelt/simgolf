import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served under /simgolf/ when deployed alongside the blog; root in dev.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/simgolf/' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
}));
