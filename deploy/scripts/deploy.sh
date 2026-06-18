#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.production.example to .env and configure it."
  exit 1
fi

echo "Building and starting ChildCare stack..."
docker compose --env-file "$ENV_FILE" up -d --build

echo "Waiting for API health..."
for i in {1..30}; do
  API_PORT="$(grep -E '^CHILDCARE_API_PORT=' "$ENV_FILE" | cut -d= -f2- || echo 15000)"
  if curl -fsS "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    echo "API is healthy."
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "API did not become healthy in time. Check: docker compose logs api"
    exit 1
  fi
  sleep 2
done

echo "Done. Optional seed (first deploy only):"
echo "  docker compose --env-file $ENV_FILE exec api node prisma/seed.js"
