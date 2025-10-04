import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
// import mkcert from 'vite-plugin-mkcert'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Environment variables for service URLs
  const SWITCHLY_HOST = env.VITE_SWITCHLY_HOST || '64.23.228.195';
  const SWITCHLY_API_PORT = env.VITE_SWITCHLY_API_PORT || '1317';
  const SWITCHLY_MIDGARD_PORT = env.VITE_SWITCHLY_MIDGARD_PORT || '8080';
  const DEV_SERVER_PORT = parseInt('8080');

  const SWITCHLY_API_TARGET = `http://${SWITCHLY_HOST}:${SWITCHLY_API_PORT}`;
  const SWITCHLY_MIDGARD_TARGET = `http://${SWITCHLY_HOST}:${SWITCHLY_MIDGARD_PORT}`;

  console.log('🔧 Vite Proxy Configuration:');
  console.log('  - Switchly API Target:', SWITCHLY_API_TARGET);
  console.log('  - Switchly Midgard Target:', SWITCHLY_MIDGARD_TARGET);
  console.log('  - Dev Server Port:', DEV_SERVER_PORT);

  return {
    plugins: [react(), 
      // mkcert()
    ],
    server: {
      host: '0.0.0.0',
      port: DEV_SERVER_PORT,
      proxy: {
        '/api/switchly': {
          target: SWITCHLY_API_TARGET,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/switchly/, '/switchly'),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              const url = req.url || '';
              console.log('🔄 Proxying request:', req.method, url, '->', SWITCHLY_API_TARGET + url.replace('/api/switchly', '/switchly'));
            });
          }
        },
        '/api/midgard': {
          target: SWITCHLY_MIDGARD_TARGET,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/midgard/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              const url = req.url || '';
              console.log('🔄 Proxying request:', req.method, url, '->', SWITCHLY_MIDGARD_TARGET + url.replace('/api/midgard', ''));
            });
          }
        }
      }
    }
  }
})
