#!/bin/sh
set -e

# Run Drizzle migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  node node_modules/drizzle-kit/bin.cjs push --config=packages/db/drizzle.config.ts
  echo "Migrations complete."
fi

# Start the application
exec node apps/web/server.js
