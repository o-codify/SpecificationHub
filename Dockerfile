# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Install workspace deps using only manifests first for better layer caching.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/hls-core/package.json packages/hls-core/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# Copy sources and build frontend + backend.
COPY . .
RUN npm run build:web && npm run build:api

# Drop dev dependencies (keeps the pg driver + drizzle-orm runtime).
RUN npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# GitHub is the source of truth: the repo is cloned into /data at boot, so no
# docs seed is baked into the image. (For local mode without GitHub, mount a
# seed dir and set HLS_DOCS_SEED to it.)
ENV NODE_ENV=production \
    PORT=8080 \
    HLS_DATA_DIR=/data \
    HLS_WEB_DIST=/app/apps/web/dist

# Git identity / safety for commits & worktrees created at runtime.
RUN git config --global user.email "hub@hls.local" \
  && git config --global user.name "HLS Hub" \
  && git config --global init.defaultBranch main \
  && git config --global --add safe.directory '*'

COPY --from=builder /app/node_modules ./node_modules
# npm workspaces may install some prod deps (e.g. drizzle-orm) under the package
# rather than hoisting to the root, so copy the workspace's node_modules too.
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
# Drizzle migrations are read at runtime (apps/api/drizzle, resolved relative to dist).
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /app/apps/web/dist ./apps/web/dist

VOLUME ["/data"]
EXPOSE 8080
CMD ["node", "apps/api/dist/index.js"]
