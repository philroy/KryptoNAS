const express = require('express');

function createRouter(cacheManager) {
  const router = express.Router();

  // GET /api/overview - Dashboard summary data
  router.get('/overview', (req, res) => {
    res.json(cacheManager.getOverview());
  });

  // GET /api/apps - All app cache data
  router.get('/apps', (req, res) => {
    res.json(cacheManager.getApps());
  });

  // GET /api/apps/:id - Single app detail with history
  router.get('/apps/:id', (req, res) => {
    const app = cacheManager.getApp(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    res.json(app);
  });

  // GET /api/health - Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  return router;
}

module.exports = createRouter;
