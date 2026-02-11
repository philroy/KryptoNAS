# KryptoNAS Cache Dashboard

A real-time monitoring dashboard for NAS cache across multiple self-hosted web applications.

## Features

- Live dashboard with WebSocket updates every 3 seconds
- Cache statistics for 8 self-hosted apps (Plex, Nextcloud, Jellyfin, Home Assistant, Gitea, Vaultwarden, Immich, Nginx Proxy Manager)
- Per-app hit rate, response time, cache utilization, and entry counts
- Detailed app view with hit rate history sparklines
- Filterable app grid (All, Media, Files, Security)
- Responsive dark theme

## Quick Start (Development)

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

## Arch Linux Deployment

### 1. Run the install script

```bash
sudo ./install.sh
```

This installs Node.js deps, creates a `kryptonas` system user, and sets up a systemd service. It does **not** touch your nginx config.

### 2. Add the nginx server block

Copy the contents of `deploy/nginx/kryptonas.conf` into the `http {}` block of your `/etc/nginx/nginx.conf`:

```bash
cat deploy/nginx/kryptonas.conf  # review it first
```

The key parts are the `map`, `upstream`, and `server` blocks. If you already have a `map $http_upgrade $connection_upgrade` in your config, skip the duplicate.

Then test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. DNS

Point `cache.philroy.au` to your NAS IP (A record or local DNS).

The dashboard is then live at `http://cache.philroy.au`.

### Managing the Service

```bash
sudo systemctl status kryptonas        # Check status
sudo journalctl -u kryptonas -f        # Follow logs
sudo systemctl restart kryptonas       # Restart
sudo systemctl stop kryptonas          # Stop
```

### Uninstall

```bash
sudo ./uninstall.sh
```

Then remove the KryptoNAS server block from your `/etc/nginx/nginx.conf` manually.

## Architecture

```
cache.philroy.au ---> nginx (:80) ---> Node.js/Express (:3000)
                      your config       localhost only
```

Node.js binds to `127.0.0.1:3000` only. All external traffic goes through your existing nginx.

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
| `HOST` | 127.0.0.1 | Bind address (localhost behind nginx) |
| `UPDATE_INTERVAL` | 3000 | WebSocket broadcast interval (ms) |
