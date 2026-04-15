#!/bin/bash
set -e

# Imagine Deployment Script
# Deploys to https://imagine.baldassari.me via moulinsart.
#
# One-time setup on the VM (run by hand):
#   ssh moulinsart-prod 'moulinsart new imagine'
#   Then via `ssh -o 'ProxyCommand=ssh moulinsart-prod moulinsart tunnel imagine' dev@imagine`:
#     - write /opt/app/.env with GOOGLE_AI_API_KEY, PORT=8000, STATIC_DIR=/opt/app/public
#     - write /etc/systemd/system/app.service.d/override.conf with:
#         [Service]
#         EnvironmentFile=/opt/app/.env
#     - sudo systemctl daemon-reload && sudo systemctl restart app

SSH_HOST="moulinsart-prod"
APP_NAME="imagine"
VM_SSH=(ssh -o "ProxyCommand=ssh ${SSH_HOST} moulinsart tunnel ${APP_NAME}" "dev@${APP_NAME}")

cd "$(dirname "$0")"

echo "==> Building frontend..."
(cd .. && npm run build)

echo "==> Building backend for Linux x86_64..."
GOOS=linux GOARCH=amd64 go build -o imagine-linux-amd64

echo "==> Uploading static assets to /opt/app/public..."
rsync -azP --delete \
  -e "ssh -o ProxyCommand=\"ssh ${SSH_HOST} moulinsart tunnel ${APP_NAME}\"" \
  ../out/ "dev@${APP_NAME}:/opt/app/public/"

echo "==> Uploading binary to host tmp..."
scp imagine-linux-amd64 "${SSH_HOST}:/tmp/imagine"

echo "==> Deploying via moulinsart CLI..."
ssh "${SSH_HOST}" "moulinsart deploy ${APP_NAME} /tmp/imagine"

echo "==> Health check..."
curl -fsS "https://${APP_NAME}.baldassari.me/health" && echo " - OK"

rm -f imagine-linux-amd64
echo ""
echo "==> Deployment complete!"
echo "==> Visit https://${APP_NAME}.baldassari.me"
