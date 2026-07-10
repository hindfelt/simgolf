import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed at the dedicated subdomain simgolf.0x4d.in, root-relative in both dev and prod.
export default defineConfig(() => ({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
}));
