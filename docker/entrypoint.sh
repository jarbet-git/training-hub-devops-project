#!/bin/sh
set -eu

cd /app/backend

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  alembic upgrade head
fi

if [ "${SEED_DEMO_DATA:-true}" = "true" ]; then
  echo "Seeding demo dictionaries and demo user..."
  python seed.py
  python seed_demo.py
fi

echo "Starting Training Hub API on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
