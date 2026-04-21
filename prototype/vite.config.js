import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Force a single React instance across the app + all pre-bundled deps.
    // Fixes "Invalid hook call" / "Cannot read properties of null (reading 'useState')"
    // that happens when Vite's dep optimizer pulls in a second copy.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      '@sentry/react',
    ],
  },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**'],
  },
  server: {
    // Bind to all interfaces so Windows Chrome can connect through WSL2 forwarding
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Explicit HMR config — WSL2's automatic WebSocket forwarding is flaky,
    // pin it to localhost:5173 over plain ws.
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws',
      clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
