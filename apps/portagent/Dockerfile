# Portagent Dockerfile
# Multi-stage build for minimal image size

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY pnpm-workspace.yaml ./

# Copy all packages (monorepo)
COPY packages ./packages
COPY apps/portagent ./apps/portagent

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build all packages and portagent
RUN pnpm build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS runner

# Install pnpm for running
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/apps/portagent/dist ./dist
COPY --from=builder /app/apps/portagent/bin ./bin
COPY --from=builder /app/apps/portagent/package.json ./

# Copy workspace packages (needed for runtime)
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json /app/pnpm-lock.yaml* /app/pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Environment
ENV NODE_ENV=production
ENV PORT=5200

# Expose port
EXPOSE 5200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5200/health || exit 1

# Run
CMD ["node", "dist/server/index.js"]
