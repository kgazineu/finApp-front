import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Em desenvolvimento, /api vai para a API Go (sem CORS). Em produção, defina VITE_API_URL
// ou sirva o front e a API no mesmo domínio com /api apontando para ela.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // @finapp/shared é um link para ../front-shared, que não tem node_modules:
  // React sempre vem daqui (uma cópia só) e o Vite pode servir arquivos de lá
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    // libera acesso pelo Cloudflare Tunnel (cloudflared tunnel --url http://localhost:5173)
    allowedHosts: ['.trycloudflare.com'],
    fs: { allow: ['.', '../front-shared'] },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
