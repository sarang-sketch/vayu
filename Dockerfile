# ── Stage 1: build the TypeScript workspace ──────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/functions/package.json apps/functions/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/functions apps/functions
RUN npm run build -w @vayusense/shared \
 && npm run build -w @vayusense/functions

# ── Stage 2: minimal runtime (Cloud Run) ─────────────────────────────────────
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/functions/package.json apps/functions/
RUN npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force

COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/functions/dist apps/functions/dist

USER app
EXPOSE 8080
ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

CMD ["node", "apps/functions/dist/server.js"]
