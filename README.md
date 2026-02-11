# KryptoNAS Cache Dashboard

A real-time monitoring dashboard for NAS cache across multiple self-hosted web applications.

## Features

- Live dashboard with WebSocket updates every 3 seconds
- Cache statistics for 8 self-hosted apps (Plex, Nextcloud, Jellyfin, Home Assistant, Gitea, Vaultwarden, Immich, Nginx Proxy Manager)
- Per-app hit rate, response time, cache utilization, and entry counts
- Detailed app view with hit rate history sparklines
- Filterable app grid (All, Media, Files, Security)
- Responsive dark theme

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

## Docker

```bash
docker compose up -d
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/overview` | Dashboard summary |
| `GET /api/apps` | All app cache data |
| `GET /api/apps/:id` | Single app detail with history |
| `GET /api/health` | Health check |

## Configuration

Edit `data/cache-config.json` to add or modify cached applications. Environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | 3000 | Server port |
| `HOST` | 0.0.0.0 | Bind address |
| `UPDATE_INTERVAL` | 3000 | WebSocket broadcast interval (ms) |
