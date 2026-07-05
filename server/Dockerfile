# Build context: monorepo root
# docker build -f server/Dockerfile -t aegis-arbiter-server .

# ── Stage 1: Compile ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /build

# better-sqlite3 needs build tools to compile native bindings
RUN apk add --no-cache python3 make g++

# Install all deps (workspace root lock file is authoritative)
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY ui/package.json ./ui/
RUN npm ci

# Compile TypeScript
COPY server ./server
COPY ui ./ui
RUN npm run build:server

# ── Stage 2: Runtime ───────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy compiled native modules from builder (already built for Alpine)
COPY --from=builder /build/node_modules ./node_modules

# Compiled output
COPY --from=builder /build/server/dist ./dist

# Schema — read at startup via findRepoRoot()
COPY --from=builder /build/ui/kernel/storage/schema.sql ./ui/kernel/storage/schema.sql

# Marker dirs so findRepoRoot() resolves to /app
RUN mkdir -p server data

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

CMD ["node", "dist/server/src/index.js"]
