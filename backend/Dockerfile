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
COPY src/ ./src/

RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS production

WORKDIR /app

# Install native build dependencies for bcrypt (needed for npm ci with native modules)
RUN apk add --no-cache python3 make g++

# Copy package files and install production-only dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && \
    apk del python3 make g++ && \
    rm -rf /root/.npm /tmp/*

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy migration/seed scripts and SQL files (needed at runtime)
COPY run-migrations.js seed-database.js ./
COPY drizzle/ ./drizzle/

# Copy entrypoint script and ensure Linux line endings
COPY docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Create uploads directory
RUN mkdir -p uploads/pdfs uploads/rosters

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
