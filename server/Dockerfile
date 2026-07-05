# Build context: monorepo root
# docker build -f server/Dockerfile -t aegis-arbiter-server .

# ── Stage 1: Compile ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /build

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY ui/package.json ./ui/
RUN npm ci

COPY server ./server
COPY ui ./ui
RUN npm run build:server

# ── Stage 2: Runtime ───────────────────────────────────────────
FROM node:20-alpine AS runtime

# better-sqlite3 requires native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install production deps from server/package.json directly —
# bypasses workspace symlinks that break ESM module resolution
COPY server/package.json ./package.json
RUN npm install --omit=dev --ignore-scripts=false

RUN apk del python3 make g++

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
