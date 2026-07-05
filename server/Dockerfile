# Build context: monorepo root
# docker build -f server/Dockerfile -t aegis-arbiter-server .

# ── Stage 1: Compile ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /build

# Install all deps (workspaces — root lock file is authoritative)
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci

# Source
COPY server ./server
COPY ui ./ui

RUN npm run build:server

# ── Stage 2: Runtime ───────────────────────────────────────────
FROM node:20-alpine AS runtime

# better-sqlite3 is a native module — needs build tools at install time
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Production deps for the server package
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# Remove build tools after install to keep the image lean
RUN apk del python3 make g++

# Compiled output
COPY --from=builder /build/server/dist ./dist

# Schema — read at startup via findRepoRoot()
COPY --from=builder /build/ui/kernel/storage/schema.sql ./ui/kernel/storage/schema.sql

# Marker directories so findRepoRoot() resolves to /app
# (it looks for a directory containing both ui/ and server/ subdirectories)
RUN mkdir -p server data

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

CMD ["node", "dist/server/src/index.js"]
