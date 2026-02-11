#!/usr/bin/env bash
#
# KryptoNAS Dashboard - Uninstall Script
# Removes systemd service, nginx config, and system user
#
set -euo pipefail

SERVICE_NAME="kryptonas"
APP_USER="kryptonas"

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (use sudo)" >&2
    exit 1
fi

echo "Stopping and disabling KryptoNAS service..."
systemctl stop "${SERVICE_NAME}.service" 2>/dev/null || true
systemctl disable "${SERVICE_NAME}.service" 2>/dev/null || true
rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload

echo "Removing nginx configuration..."
rm -f /etc/nginx/conf.d/kryptonas.conf
if nginx -t 2>/dev/null; then
    systemctl restart nginx
fi

echo "Removing system user..."
userdel "${APP_USER}" 2>/dev/null || true

echo "KryptoNAS deployment removed (application files preserved)"
