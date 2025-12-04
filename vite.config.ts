import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Proxy para a API Brasil para contornar CORS
      '/api-brasil': {
        target: 'https://gateway.apibrasil.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-brasil/, ''),
        secure: true,
      },
    },
  },
})