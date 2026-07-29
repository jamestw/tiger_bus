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

  echo "--- Building images..."
  docker compose -f docker-compose.prod.yml --env-file .env.prod --project-name tigerbus build

  echo "--- Running Prisma migrations..."
  docker compose -f docker-compose.prod.yml --env-file .env.prod --project-name tigerbus run --rm web npx prisma migrate deploy

  echo "--- Starting containers..."
  docker compose -f docker-compose.prod.yml --env-file .env.prod --project-name tigerbus up -d

  echo "--- Container status:"
  docker compose -f docker-compose.prod.yml --env-file .env.prod --project-name tigerbus ps
EOF

echo ""
echo "Deployed."
echo "  Web:     https://tigerbus.aerocars.cc"
echo "  pgAdmin: https://pgadmin-tigerbus.aerocars.cc"
