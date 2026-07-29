#!/usr/bin/env bash
# Deploy tiger_bus to VPS (156.67.220.68, ssh alias "vps156")
# Usage: bash deploy.sh
set -e

VPS_ALIAS="vps156"
REMOTE_DIR="/opt/tigerbus"

echo "==> Ensuring remote directory exists..."
ssh "$VPS_ALIAS" "mkdir -p $REMOTE_DIR"

echo "==> Syncing files to VPS..."
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='docs' \
    --exclude='.superpowers' \
    --exclude='.env.prod' \
    --exclude='coverage' \
    -czf - . | ssh "$VPS_ALIAS" "tar -xzf - -C $REMOTE_DIR"

echo "==> Building & deploying on VPS..."
ssh "$VPS_ALIAS" bash << EOF
  set -e
  cd $REMOTE_DIR

  echo "--- Starting postgres (if not already up)..."
  docker compose -f docker-compose.prod.yml --env-file .env.prod --project-name tigerbus up -d postgres

  echo "--- Building the full toolchain image (has the Prisma CLI, unlike the lean runtime image)..."
  docker build --target builder -t tigerbus_toolchain:latest .

  echo "--- Running Prisma migrations..."
  docker run --rm --network tigerbus_network --env-file .env.prod tigerbus_toolchain:latest \
    npx prisma migrate deploy

  echo "--- Building & starting the app stack..."
  docker compose -f docker-compose.prod.yml --env-file .env.prod --project-name tigerbus up -d --build

  echo "--- Container status:"
  docker compose -f docker-compose.prod.yml --env-file .env.prod --project-name tigerbus ps
EOF

echo ""
echo "Deployed."
echo "  Web:     https://tigerbus.aerocars.cc"
echo "  pgAdmin: https://pgadmin-tigerbus.aerocars.cc"
