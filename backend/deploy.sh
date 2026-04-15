#!/bin/bash
set -euo pipefail

# Deploys imagine to moulinsart (https://imagine.baldassari.me).
# Builds the Next.js static export, syncs it to /opt/app/public/, then
# atomically swaps the linux/amd64 binary via `moulinsart deploy`.
#
# One-time bootstrap (already done; here for reference):
#   ssh moulinsart-prod 'moulinsart new imagine'
#   ssh imagine.baldassari.me 'cat > /opt/app/.env' < .env  # GOOGLE_AI_API_KEY, PORT=8000, STATIC_DIR=/opt/app/public

cd "$(dirname "$0")"

NAME=imagine
HOST=imagine.baldassari.me
JUMP=moulinsart-prod

echo "==> Building frontend..."
(cd .. && npm run build)

echo "==> Building linux/amd64..."
GOOS=linux GOARCH=amd64 go build -o /tmp/imagine .

echo "==> Syncing static files to ${HOST}:/opt/app/public/..."
rsync -azP --delete ../out/ "${HOST}:/opt/app/public/"

echo "==> Deploying binary via ${JUMP}..."
scp /tmp/imagine "${JUMP}:/tmp/imagine"
ssh "${JUMP}" "moulinsart deploy ${NAME} /tmp/imagine && rm /tmp/imagine"

rm -f /tmp/imagine

echo "==> Health check..."
curl -fsS "https://${HOST}/health" && echo " - OK"

echo "==> Live at https://${HOST}"
