const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all routes
app.use(cors());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy API requests to avoid CORS issues
app.use('/api/switchly', createProxyMiddleware({
  target: 'http://64.23.228.195:1317',
  changeOrigin: true,
  pathRewrite: {
    '^/api/switchly': '/switchly', // Remove /api prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request:', req.method, req.url, '-> http://64.23.228.195:1317' + req.url.replace('/api/switchly', '/switchly'));
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}));

app.use('/api/midgard', createProxyMiddleware({
  target: 'http://64.23.228.195:8080',
  changeOrigin: true,
  pathRewrite: {
    '^/api/midgard': '', // Remove /api/midgard prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request:', req.method, req.url, '-> http://64.23.228.195:8080' + req.url.replace('/api/midgard', ''));
  }
}));

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Proxying /api/switchly/* to http://64.23.228.195:1317/switchly/*`);
  console.log(`Proxying /api/midgard/* to http://64.23.228.195:8080/*`);
});
