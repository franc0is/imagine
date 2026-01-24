#!/bin/bash
set -e

# Imagine Deployment Script
# Deploys to imagine.exe.xyz

REMOTE_HOST="imagine.exe.xyz"
REMOTE_DIR="/home/exedev/imagine"
SERVICE_NAME="imagine"

cd "$(dirname "$0")"

echo "==> Building frontend..."
cd ..
npm run build
cd backend

echo "==> Building for Linux x86_64..."
GOOS=linux GOARCH=amd64 go build -o imagine-linux-amd64

echo "==> Creating remote directories..."
ssh "${REMOTE_HOST}" "mkdir -p ${REMOTE_DIR}/bin ${REMOTE_DIR}/out"

echo "==> Copying binary to ${REMOTE_HOST}..."
scp imagine-linux-amd64 "${REMOTE_HOST}:${REMOTE_DIR}/bin/imagine.new"

echo "==> Copying service file..."
scp imagine.service "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "==> Copying static files..."
rsync -av --delete ../out/ "${REMOTE_HOST}:${REMOTE_DIR}/out/"

echo "==> Copying .env file..."
scp ../.env "${REMOTE_HOST}:${REMOTE_DIR}/.env"

echo "==> Deploying on remote host..."
ssh "${REMOTE_HOST}" bash -s << 'EOF'
set -e
cd /home/exedev/imagine

# Swap binaries
mv bin/imagine.new bin/imagine
chmod +x bin/imagine

# Update service file and restart
sudo ln -sf ~/imagine/imagine.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart imagine

# Wait and check status
sleep 2
if sudo systemctl is-active --quiet imagine; then
    echo "==> Service restarted successfully"
    curl -s http://localhost:8080/health && echo " - Health check passed"
else
    echo "==> Service failed to start!"
    sudo systemctl status imagine
    exit 1
fi
EOF

echo ""
echo "==> Deployment complete!"
echo "==> Visit https://imagine.exe.xyz"

# Cleanup local binary
rm -f imagine-linux-amd64
