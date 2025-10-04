import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Environment variables for service URLs
const SWITCHLY_HOST = process.env.VITE_SWITCHLY_HOST || '64.23.228.195';
const SWITCHLY_API_PORT = process.env.VITE_SWITCHLY_API_PORT || '1317';
const SWITCHLY_MIDGARD_PORT = process.env.VITE_SWITCHLY_MIDGARD_PORT || '8080';

const SWITCHLY_API_TARGET = `http://${SWITCHLY_HOST}:${SWITCHLY_API_PORT}`;
const SWITCHLY_MIDGARD_TARGET = `http://${SWITCHLY_HOST}:${SWITCHLY_MIDGARD_PORT}`;

console.log('🔧 Proxy Configuration:');
console.log('  - Switchly API Target:', SWITCHLY_API_TARGET);
console.log('  - Switchly Midgard Target:', SWITCHLY_MIDGARD_TARGET);
console.log('  - Server Port:', PORT);

// Enable CORS for all routes
app.use(cors());

// Proxy API requests to avoid CORS issues (MUST come before static files)
app.use('/api/switchly', createProxyMiddleware({
  target: SWITCHLY_API_TARGET,
  changeOrigin: true,
  pathRewrite: {
    '^/api/switchly': '/switchly', // Remove /api prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request:', req.method, req.url, '->', SWITCHLY_API_TARGET + req.url.replace('/api/switchly', '/switchly'));
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}));

app.use('/api/midgard', createProxyMiddleware({
  target: SWITCHLY_MIDGARD_TARGET,
  changeOrigin: true,
  pathRewrite: {
    '^/api/midgard': '', // Remove /api/midgard prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request:', req.method, req.url, '->', SWITCHLY_MIDGARD_TARGET + req.url.replace('/api/midgard', ''));
  }
}));

// Serve static files from React build (AFTER API proxies)
app.use(express.static(path.join(__dirname, 'dist')));

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
  console.log(`📡 Proxying /api/switchly/* to ${SWITCHLY_API_TARGET}/switchly/*`);
  console.log(`📡 Proxying /api/midgard/* to ${SWITCHLY_MIDGARD_TARGET}/*`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🌐 CORS enabled for all origins`);
});
