#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting ChildCare API..."
exec node src/server.js
