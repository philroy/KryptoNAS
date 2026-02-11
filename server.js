const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const config = require('./src/config');
const CacheManager = require('./src/services/cacheManager');
const createApiRouter = require('./src/routes/api');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const cacheManager = new CacheManager();

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', createApiRouter(cacheManager));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket - broadcast live cache updates to all clients
wss.on('connection', (ws) => {
  // Send initial full state
  ws.send(JSON.stringify(cacheManager.getFullUpdate()));

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'get_app' && data.id) {
        ws.send(JSON.stringify({ type: 'app_detail', app: cacheManager.getApp(data.id) }));
      }
    } catch { /* ignore bad messages */ }
  });
});

// Tick cache simulation and broadcast updates
setInterval(() => {
  cacheManager.tick();
  const update = JSON.stringify(cacheManager.getFullUpdate());
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(update);
    }
  }
}, config.updateInterval);

server.listen(config.port, config.host, () => {
  console.log(`KryptoNAS Dashboard running at http://${config.host}:${config.port}`);
});
