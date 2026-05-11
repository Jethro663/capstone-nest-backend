# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app
ARG NEXT_PUBLIC_WS_URL=https://capstone-backend-v2-production.up.railway.app
ARG NEXT_PUBLIC_APP_ORIGIN
ARG NEXT_PUBLIC_SITE_URL
ARG BACKEND_INTERNAL_URL
ARG API_INTERNAL_URL

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prefer explicit build-time env vars so hosted deploys can bake the right origins.
# Fall back to .env.docker for local Docker builds.
RUN if [ -n "$NEXT_PUBLIC_API_URL" ] || [ -n "$BACKEND_INTERNAL_URL" ] || [ -n "$API_INTERNAL_URL" ] || [ -n "$NEXT_PUBLIC_WS_URL" ] || [ -n "$NEXT_PUBLIC_APP_ORIGIN" ] || [ -n "$NEXT_PUBLIC_SITE_URL" ]; then \
      : > .env.local; \
      if [ -n "$NEXT_PUBLIC_API_URL" ]; then echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL" >> .env.local; fi; \
      if [ -n "$BACKEND_INTERNAL_URL" ]; then echo "BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL" >> .env.local; fi; \
      if [ -n "$API_INTERNAL_URL" ]; then echo "API_INTERNAL_URL=$API_INTERNAL_URL" >> .env.local; fi; \
      if [ -n "$NEXT_PUBLIC_WS_URL" ]; then echo "NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL" >> .env.local; fi; \
      if [ -n "$NEXT_PUBLIC_APP_ORIGIN" ]; then echo "NEXT_PUBLIC_APP_ORIGIN=$NEXT_PUBLIC_APP_ORIGIN" >> .env.local; fi; \
      if [ -n "$NEXT_PUBLIC_SITE_URL" ]; then echo "NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL" >> .env.local; fi; \
    elif [ -f .env.docker ]; then cp .env.docker .env.local; else \
      echo "NEXT_PUBLIC_API_URL=http://backend:3000" > .env.local && \
      echo "NEXT_PUBLIC_WS_URL=http://localhost:3000" >> .env.local; \
    fi

RUN npm run build

# ---- Stage 3: Production runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output and keep runtime assets beside server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./.next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/standalone/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./.next/standalone/public
RUN test -f ./.next/standalone/public/NexoraHome.png && \
    test -f ./.next/standalone/public/taguigpic.png

USER nextjs

EXPOSE 3001

CMD ["node", ".next/standalone/server.js"]
