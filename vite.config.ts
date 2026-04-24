import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['shadownet.redriverlab.me', 'redriverlab.me'],
    host: true,
    hmr: {
      protocol: 'wss',
      host: 'shadownet.redriverlab.me',
      clientPort: 443
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false, // Local dev environment
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        }
      }
    }
  },
  build: {
    target: 'esnext'
  },
  worker: {
    format: 'es'
  }
})
