#!/usr/bin/env bash
#
# KryptoNAS Dashboard - Arch Linux Installation Script
# Installs Node.js deps, sets up systemd service, and prints nginx instructions.
# Does NOT modify your existing nginx.conf - you add the server block yourself.
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_USER="kryptonas"
SERVICE_NAME="kryptonas"

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
info "Installing system packages (nodejs, npm)..."
pacman -S --noconfirm --needed nodejs npm

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

# --- Step 6: Start the application ---
info "Starting KryptoNAS service..."
systemctl start "${SERVICE_NAME}.service"

sleep 2
if systemctl is-active --quiet "${SERVICE_NAME}.service"; then
    info "KryptoNAS service is running on 127.0.0.1:3000"
else
    warn "Service may not have started. Check: journalctl -u ${SERVICE_NAME} -e"
fi

# --- Step 7: Nginx instructions ---
info "============================================"
info "  KryptoNAS node service is up!"
info "============================================"
info ""
info "Now add the nginx server block to your existing /etc/nginx/nginx.conf."
info "The config is at: ${APP_DIR}/deploy/nginx/kryptonas.conf"
info ""
info "Copy the contents into the http {} block of your nginx.conf, then:"
info "  sudo nginx -t"
info "  sudo systemctl reload nginx"
info ""
info "Once done, the dashboard will be live at:"
info "  http://cache.philroy.au"
info ""
info "Useful commands:"
info "  sudo systemctl status ${SERVICE_NAME}       # Check status"
info "  sudo journalctl -u ${SERVICE_NAME} -f       # Follow logs"
info "  sudo systemctl restart ${SERVICE_NAME}       # Restart app"
