import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/api/asaas-prod': {
        target: 'https://api.asaas.com/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/asaas-prod/, ''),
        headers: {
          Origin: 'https://api.asaas.com'
        }
      },
      '/api/asaas-sandbox': {
        target: 'https://sandbox.asaas.com/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/asaas-sandbox/, ''),
        headers: {
          Origin: 'https://sandbox.asaas.com'
        }
      }
    }
  }
})
