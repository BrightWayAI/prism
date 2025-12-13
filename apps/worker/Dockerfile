FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# Install dependencies
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build --workspace=@prism/worker

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

# Copy built worker
COPY --from=builder --chown=worker:nodejs /app/apps/worker/dist ./dist

# Copy dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

USER worker

CMD ["node", "dist/index.js"]
