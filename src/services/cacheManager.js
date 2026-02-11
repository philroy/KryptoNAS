const fs = require('fs');
const config = require('../config');

class CacheManager {
  constructor() {
    this.data = null;
    this.startTime = Date.now();
    this.history = {}; // Per-app historical data points
    this.load();
  }

  load() {
    const raw = fs.readFileSync(config.cacheConfigPath, 'utf8');
    this.data = JSON.parse(raw);
    // Initialize history for each app
    for (const app of this.data.apps) {
      this.history[app.id] = [];
    }
  }

  // Simulate realistic cache fluctuations
  tick() {
    for (const app of this.data.apps) {
      // Slightly vary cache size (simulate writes/evictions)
      const sizeDelta = (Math.random() - 0.48) * app.maxCacheSize * 0.002;
      app.currentCacheSize = Math.max(
        app.maxCacheSize * 0.1,
        Math.min(app.maxCacheSize * 0.98, app.currentCacheSize + sizeDelta)
      );

      // Vary entries
      const entryDelta = Math.floor((Math.random() - 0.45) * app.cacheEntries * 0.005);
      app.cacheEntries = Math.max(100, app.cacheEntries + entryDelta);

      // Vary hit rate slightly
      const hitDelta = (Math.random() - 0.5) * 0.6;
      app.hitRate = Math.max(50, Math.min(99.9, app.hitRate + hitDelta));
      app.missRate = parseFloat((100 - app.hitRate).toFixed(1));
      app.hitRate = parseFloat(app.hitRate.toFixed(1));

      // Vary response time
      const rtDelta = (Math.random() - 0.5) * 0.4;
      app.avgResponseTime = Math.max(0.1, parseFloat((app.avgResponseTime + rtDelta).toFixed(1)));

      // Update last accessed
      app.lastAccessed = new Date().toISOString();

      // Record history point (keep last 60 points)
      this.history[app.id].push({
        timestamp: Date.now(),
        hitRate: app.hitRate,
        cacheSize: app.currentCacheSize,
        responseTime: app.avgResponseTime,
        entries: app.cacheEntries,
      });
      if (this.history[app.id].length > 60) {
        this.history[app.id].shift();
      }
    }
  }

  getOverview() {
    const apps = this.data.apps;
    const totalCacheUsed = apps.reduce((sum, a) => sum + a.currentCacheSize, 0);
    const totalCacheMax = apps.reduce((sum, a) => sum + a.maxCacheSize, 0);
    const avgHitRate = apps.reduce((sum, a) => sum + a.hitRate, 0) / apps.length;
    const totalEntries = apps.reduce((sum, a) => sum + a.cacheEntries, 0);
    const avgResponseTime = apps.reduce((sum, a) => sum + a.avgResponseTime, 0) / apps.length;
    const uptimeMs = Date.now() - this.startTime;

    return {
      nas: {
        ...this.data.nas,
        uptime: uptimeMs,
        uptimeFormatted: this.formatUptime(uptimeMs),
      },
      summary: {
        totalApps: apps.length,
        activeApps: apps.filter(a => a.status === 'active').length,
        totalCacheUsed,
        totalCacheMax,
        cacheUtilization: parseFloat(((totalCacheUsed / totalCacheMax) * 100).toFixed(1)),
        avgHitRate: parseFloat(avgHitRate.toFixed(1)),
        totalEntries,
        avgResponseTime: parseFloat(avgResponseTime.toFixed(1)),
      },
    };
  }

  getApps() {
    return this.data.apps.map(app => ({
      ...app,
      currentCacheSizeFormatted: this.formatBytes(app.currentCacheSize),
      maxCacheSizeFormatted: this.formatBytes(app.maxCacheSize),
      utilization: parseFloat(((app.currentCacheSize / app.maxCacheSize) * 100).toFixed(1)),
    }));
  }

  getApp(id) {
    const app = this.data.apps.find(a => a.id === id);
    if (!app) return null;
    return {
      ...app,
      currentCacheSizeFormatted: this.formatBytes(app.currentCacheSize),
      maxCacheSizeFormatted: this.formatBytes(app.maxCacheSize),
      utilization: parseFloat(((app.currentCacheSize / app.maxCacheSize) * 100).toFixed(1)),
      history: this.history[app.id] || [],
    };
  }

  getFullUpdate() {
    return {
      type: 'update',
      timestamp: Date.now(),
      overview: this.getOverview(),
      apps: this.getApps(),
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

module.exports = CacheManager;
