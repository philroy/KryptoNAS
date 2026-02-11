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

### Automated Install

Run the install script as root to set up nginx, systemd, and all dependencies:

```bash
sudo ./install.sh
```

This will:
1. Install `nodejs`, `npm`, and `nginx` via pacman
2. Create a `kryptonas` system user
3. Install Node.js dependencies
4. Configure nginx as a reverse proxy (port 80 -> 3000)
5. Install and enable a systemd service for auto-start on boot
6. Start the dashboard

After installation, access the dashboard at `http://<your-server-ip>` from any device on your local network.

### Manual Install

#### Prerequisites

```bash
sudo pacman -S nodejs npm nginx
```

#### 1. Install dependencies

```bash
cd /home/user/KryptoNAS
npm ci --omit=dev
```

#### 2. Create system user

```bash
sudo useradd --system --no-create-home --shell /usr/bin/nologin kryptonas
sudo chown -R kryptonas:kryptonas /home/user/KryptoNAS
```

#### 3. Install systemd service

```bash
sudo cp deploy/systemd/kryptonas.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kryptonas.service
```

#### 4. Configure nginx

```bash
sudo mkdir -p /etc/nginx/conf.d
sudo cp deploy/nginx/kryptonas.conf /etc/nginx/conf.d/
```

Ensure `/etc/nginx/nginx.conf` includes `conf.d`:
- Add `include /etc/nginx/conf.d/*.conf;` inside the `http {}` block
- Comment out or remove the default `server {}` block listening on port 80

```bash
sudo nginx -t
sudo systemctl enable --now nginx
```

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

## Architecture

```
Browser (LAN) ---> nginx (:80) ---> Node.js/Express (:3000)
                   reverse proxy     HTTP + WebSocket
```

nginx handles port 80 and proxies all traffic (including WebSocket upgrades) to the Node.js backend on localhost:3000.

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
| `HOST` | 127.0.0.1 | Bind address (localhost when behind nginx) |
| `UPDATE_INTERVAL` | 3000 | WebSocket broadcast interval (ms) |
