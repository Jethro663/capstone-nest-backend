# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install native build dependencies for bcrypt
RUN apk add --no-cache python3 make g++

# Copy package files and install ALL dependencies (including devDependencies for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY scripts/ ./scripts/
COPY src/ ./src/
COPY drizzle/ ./drizzle/

RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS production

WORKDIR /app

# Install native build dependencies for bcrypt plus the tiny privilege-drop
# helper used by the entrypoint after mounted-volume ownership is reconciled.
RUN apk add --no-cache python3 make g++ su-exec

# Copy package files and install production-only dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && \
    apk del python3 make g++ && \
    rm -rf /root/.npm /tmp/*

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy migration/seed scripts and SQL files (needed at runtime)
COPY run-migrations.js migration-error-policy.js seed-database.js ./
COPY drizzle/ ./drizzle/

# Copy entrypoint script and ensure Linux line endings
COPY docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# The official Node image provides the unprivileged `node` account. The
# entrypoint starts as root only long enough to reconcile a mounted upload
# volume, then re-executes migrations and the server as `node`.
RUN mkdir -p uploads/pdfs uploads/rosters && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
