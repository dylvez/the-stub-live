import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Custom middleware to proxy setlist.fm with correct Accept header
function setlistFmProxy(): Plugin {
  return {
    name: 'setlistfm-proxy',
    configureServer(server) {
      server.middlewares.use('/api/setlistfm', async (req, res) => {
        const targetUrl = 'https://api.setlist.fm' + req.url;
        try {
          const headers: Record<string, string> = {
            'Accept': 'application/json',
          };
          // Forward relevant headers from the original request
          if (req.headers['x-api-key']) {
            headers['x-api-key'] = req.headers['x-api-key'] as string;
          }
          const response = await fetch(targetUrl, { headers });
          res.writeHead(response.status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          const body = await response.text();
          res.end(body);
        } catch (err) {
          res.writeHead(502);
          res.end(JSON.stringify({ error: 'Proxy failed' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), setlistFmProxy()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/spotify-auth': {
        target: 'https://accounts.spotify.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/spotify-auth/, ''),
      },
      '/api/spotify': {
        target: 'https://api.spotify.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/spotify/, ''),
      },
      '/api/jambase': {
        target: 'https://www.jambase.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/jambase/, '/jb-api/v1'),
      },
    },
  },
})
