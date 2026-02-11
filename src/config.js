const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  // How often to broadcast cache updates via WebSocket (ms)
  updateInterval: process.env.UPDATE_INTERVAL || 3000,
  // Path to cache configuration
  cacheConfigPath: path.join(__dirname, '..', 'data', 'cache-config.json'),
};
