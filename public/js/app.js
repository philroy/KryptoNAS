// KryptoNAS Cache Dashboard - Frontend Application

(function () {
  'use strict';

  // --- State ---
  let ws = null;
  let currentFilter = 'all';
  let latestData = null;

  // --- DOM refs ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- Icon map (inline SVG paths for each app type) ---
  const icons = {
    film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>',
    'play-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    'git-branch': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 01-9 9"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
  };

  // --- Helpers ---
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatNumber(n) {
    return n.toLocaleString();
  }

  function hitRateClass(rate) {
    if (rate >= 90) return 'good';
    if (rate >= 75) return 'warn';
    return 'bad';
  }

  function utilColor(pct) {
    if (pct >= 90) return 'var(--danger)';
    if (pct >= 75) return 'var(--warning)';
    return 'var(--accent)';
  }

  // --- WebSocket ---
  function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}`);

    ws.onopen = () => {
      const dot = $('.status-dot');
      const text = $('.status-text');
      dot.classList.add('connected');
      dot.classList.remove('disconnected');
      text.textContent = 'Live';
    };

    ws.onclose = () => {
      const dot = $('.status-dot');
      const text = $('.status-text');
      dot.classList.remove('connected');
      dot.classList.add('disconnected');
      text.textContent = 'Reconnecting...';
      setTimeout(connect, 3000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
          latestData = data;
          renderOverview(data.overview);
          renderApps(data.apps);
        } else if (data.type === 'app_detail') {
          renderModal(data.app);
        }
      } catch { /* ignore */ }
    };
  }

  // --- Render Overview ---
  function renderOverview(overview) {
    $('#statActiveApps').textContent = overview.summary.activeApps;
    $('#statHitRate').textContent = overview.summary.avgHitRate + '%';
    $('#statCacheUsed').textContent = formatBytes(overview.summary.totalCacheUsed);
    $('#statResponseTime').textContent = overview.summary.avgResponseTime + ' ms';

    // Utilization bar
    const pct = overview.summary.cacheUtilization;
    const bar = $('#utilizationBar');
    bar.style.width = pct + '%';
    bar.style.background = `linear-gradient(90deg, var(--accent), ${utilColor(pct)})`;
    if (pct >= 85) bar.classList.add('high');
    else bar.classList.remove('high');

    $('#utilizationPercent').textContent = pct + '% utilized';
    $('#utilizationText').textContent =
      formatBytes(overview.summary.totalCacheUsed) + ' / ' + formatBytes(overview.summary.totalCacheMax);
    $('#totalEntries').textContent = formatNumber(overview.summary.totalEntries) + ' entries';

    // Uptime
    $('#uptime').textContent = 'Uptime: ' + overview.nas.uptimeFormatted;
  }

  // --- Render App Cards ---
  function renderApps(apps) {
    const grid = $('#appsGrid');
    const filtered = filterApps(apps, currentFilter);

    // Only rebuild DOM if app count changed
    if (grid.children.length !== filtered.length) {
      grid.innerHTML = '';
      filtered.forEach((app) => {
        grid.appendChild(createAppCard(app));
      });
    } else {
      // Update existing cards in place
      filtered.forEach((app, i) => {
        updateAppCard(grid.children[i], app);
      });
    }
  }

  function filterApps(apps, filter) {
    if (filter === 'all') return apps;
    return apps.filter((a) => a.tags && a.tags.includes(filter));
  }

  function createAppCard(app) {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.style.setProperty('--app-color', app.color);
    card.dataset.id = app.id;
    card.addEventListener('click', () => openModal(app.id));
    updateAppCard(card, app);
    return card;
  }

  function updateAppCard(card, app) {
    const utilPct = app.utilization;
    const icon = icons[app.icon] || icons.globe;

    card.innerHTML = `
      <div class="app-card-header">
        <div class="app-card-title">
          <div class="app-icon" style="background: ${app.color}20; color: ${app.color};">
            ${icon}
          </div>
          <div>
            <h3>${app.name}</h3>
            <p>${app.description}</p>
          </div>
        </div>
        <div class="app-status" title="${app.status}"></div>
      </div>
      <div class="app-stats">
        <div class="app-stat">
          <span class="app-stat-label">Hit Rate</span>
          <span class="app-stat-value ${hitRateClass(app.hitRate)}">${app.hitRate}%</span>
        </div>
        <div class="app-stat">
          <span class="app-stat-label">Avg Response</span>
          <span class="app-stat-value">${app.avgResponseTime} ms</span>
        </div>
        <div class="app-stat">
          <span class="app-stat-label">Cache Size</span>
          <span class="app-stat-value">${app.currentCacheSizeFormatted}</span>
        </div>
        <div class="app-stat">
          <span class="app-stat-label">Entries</span>
          <span class="app-stat-value">${formatNumber(app.cacheEntries)}</span>
        </div>
      </div>
      <div class="app-util-bar-container">
        <div class="app-util-bar" style="width: ${utilPct}%; background: linear-gradient(90deg, ${app.color}88, ${app.color});"></div>
      </div>
      <div class="app-util-meta">
        <span>${utilPct}% utilized</span>
        <span>${app.currentCacheSizeFormatted} / ${app.maxCacheSizeFormatted}</span>
      </div>
    `;
  }

  // --- Modal ---
  function openModal(appId) {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'get_app', id: appId }));
    }
    $('#modalOverlay').classList.add('active');
  }

  function closeModal() {
    $('#modalOverlay').classList.remove('active');
  }

  function renderModal(app) {
    if (!app) return;
    const icon = icons[app.icon] || icons.globe;

    $('#modalTitle').innerHTML = `
      <span style="color: ${app.color}; margin-right: 8px;">${icon.replace('viewBox', 'width="22" height="22" viewBox')}</span>
      ${app.name}
    `;

    let historyChart = '';
    if (app.history && app.history.length > 1) {
      historyChart = buildSparkline(app.history.map((h) => h.hitRate), app.color);
    }

    $('#modalBody').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <div class="label">Hit Rate</div>
          <div class="value ${hitRateClass(app.hitRate)}">${app.hitRate}%</div>
        </div>
        <div class="detail-item">
          <div class="label">Miss Rate</div>
          <div class="value warn">${app.missRate}%</div>
        </div>
        <div class="detail-item">
          <div class="label">Cache Size</div>
          <div class="value">${app.currentCacheSizeFormatted}</div>
        </div>
        <div class="detail-item">
          <div class="label">Max Cache</div>
          <div class="value">${app.maxCacheSizeFormatted}</div>
        </div>
        <div class="detail-item">
          <div class="label">Utilization</div>
          <div class="value" style="color: ${utilColor(app.utilization)}">${app.utilization}%</div>
        </div>
        <div class="detail-item">
          <div class="label">Avg Response</div>
          <div class="value">${app.avgResponseTime} ms</div>
        </div>
        <div class="detail-item">
          <div class="label">Cache Entries</div>
          <div class="value">${formatNumber(app.cacheEntries)}</div>
        </div>
        <div class="detail-item">
          <div class="label">Status</div>
          <div class="value good">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</div>
        </div>
      </div>
      ${historyChart ? `
      <div class="chart-container">
        <h3>Hit Rate History</h3>
        ${historyChart}
      </div>` : ''}
      <div class="tags">
        ${(app.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}
      </div>
    `;
  }

  function buildSparkline(values, color) {
    if (values.length < 2) return '';
    const w = 560;
    const h = 80;
    const padding = 4;
    const min = Math.min(...values) - 1;
    const max = Math.max(...values) + 1;
    const range = max - min || 1;

    const points = values.map((v, i) => {
      const x = padding + (i / (values.length - 1)) * (w - padding * 2);
      const y = h - padding - ((v - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    });

    const linePath = `M${points.join(' L')}`;
    const areaPath = `${linePath} L${w - padding},${h - padding} L${padding},${h - padding} Z`;

    return `
      <svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="sparkline-area" d="${areaPath}" fill="url(#sparkGradient)"/>
        <path class="sparkline-line" d="${linePath}" stroke="${color}"/>
      </svg>
    `;
  }

  // --- Filters ---
  function initFilters() {
    $$('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        if (latestData) renderApps(latestData.apps);
      });
    });
  }

  // --- Init ---
  function init() {
    initFilters();
    $('#modalClose').addEventListener('click', closeModal);
    $('#modalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
    connect();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
