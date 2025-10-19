import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',  // Root-relative paths for Vercel/Netlify deploys
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    sourcemap: mode === 'production' ? false : 'inline',  // Disable in prod for smaller files
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],  // Bundle React deps separately for caching
        },
      },
    },
  },
  css: {
    devSourcemap: mode === 'development',  // Tailwind sourcemaps only in dev
  },
}));