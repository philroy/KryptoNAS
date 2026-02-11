#!/usr/bin/env bash
#
# KryptoNAS Dashboard - Arch Linux Installation Script
# Installs and configures: Node.js, nginx reverse proxy, systemd service
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_USER="kryptonas"
SERVICE_NAME="kryptonas"
NGINX_CONF_DIR="/etc/nginx/conf.d"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# --- Preflight ---
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)"
fi

if ! command -v pacman &>/dev/null; then
    error "This script is designed for Arch Linux (pacman not found)"
fi

info "Starting KryptoNAS deployment from: ${APP_DIR}"

# --- Step 1: Install system packages ---
info "Installing system packages (nodejs, npm, nginx)..."
pacman -S --noconfirm --needed nodejs npm nginx

# --- Step 2: Create dedicated system user ---
if id "${APP_USER}" &>/dev/null; then
    info "System user '${APP_USER}' already exists"
else
    info "Creating system user '${APP_USER}'..."
    useradd --system --no-create-home --shell /usr/bin/nologin "${APP_USER}"
fi

# --- Step 3: Install Node.js dependencies ---
info "Installing Node.js dependencies..."
cd "${APP_DIR}"
npm ci --omit=dev

# --- Step 4: Set file ownership ---
info "Setting file ownership..."
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# --- Step 5: Install systemd service ---
info "Installing systemd service..."
cp "${APP_DIR}/deploy/systemd/kryptonas.service" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"

# --- Step 6: Configure nginx ---
info "Configuring nginx..."
mkdir -p "${NGINX_CONF_DIR}"

# Ensure nginx.conf includes conf.d (Arch default may not have this)
if ! grep -q 'include.*conf\.d' /etc/nginx/nginx.conf; then
    warn "Adding conf.d include to nginx.conf..."
    sed -i '/^http {/a \    include /etc/nginx/conf.d/*.conf;' /etc/nginx/nginx.conf
fi

# Comment out default server block on port 80 to avoid conflicts
if grep -q '^\s*listen\s.*80;' /etc/nginx/nginx.conf; then
    warn "Commenting out default server block on port 80 in nginx.conf..."
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
    sed -i '/^    server {/,/^    }/s/^/#/' /etc/nginx/nginx.conf
    info "Backup saved at /etc/nginx/nginx.conf.bak"
fi

cp "${APP_DIR}/deploy/nginx/kryptonas.conf" "${NGINX_CONF_DIR}/kryptonas.conf"

if nginx -t 2>/dev/null; then
    info "Nginx configuration test passed"
else
    error "Nginx configuration test FAILED. Check ${NGINX_CONF_DIR}/kryptonas.conf"
fi

systemctl enable nginx.service
systemctl restart nginx.service

# --- Step 7: Start the application ---
info "Starting KryptoNAS service..."
systemctl start "${SERVICE_NAME}.service"

sleep 2
if systemctl is-active --quiet "${SERVICE_NAME}.service"; then
    info "KryptoNAS service is running"
else
    warn "Service may not have started. Check: journalctl -u ${SERVICE_NAME} -e"
fi

# --- Done ---
info "============================================"
info "  KryptoNAS Dashboard deployed successfully!"
info "============================================"
info ""
info "Access the dashboard at:"
for ip in $(hostname -I); do
    info "  http://${ip}"
done
info "  http://$(hostname)"
info ""
info "Useful commands:"
info "  sudo systemctl status ${SERVICE_NAME}       # Check status"
info "  sudo journalctl -u ${SERVICE_NAME} -f       # Follow logs"
info "  sudo systemctl restart ${SERVICE_NAME}       # Restart app"
info "  sudo systemctl restart nginx                 # Restart nginx"
