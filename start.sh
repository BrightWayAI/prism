#!/bin/sh
set -e

# Run Drizzle migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  node node_modules/drizzle-kit/bin.cjs push --config=packages/db/drizzle.config.ts
  echo "Migrations complete."
  
  echo "Seeding vendor data..."
  node packages/db/dist/seed/index.js || echo "Seed script not found or failed, continuing..."
  echo "Seeding complete."
fi

# Start the application
exec node apps/web/server.js
