# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: builder
# Compiles TypeScript and generates the Prisma client
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma client for the builder stage
RUN npx prisma generate

# Compile TypeScript
COPY tsconfig.json .
COPY src ./src/
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: runtime
# Lean production image — no devDependencies, no source files
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Non-root user for security
RUN addgroup -S omip && adduser -S omip -G omip

WORKDIR /app

# Production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Generate Prisma client for runtime (must match the engine in node_modules)
RUN npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Own all files by the non-root user
RUN chown -R omip:omip /app
USER omip

EXPOSE 4000

# Health check — pings the /health endpoint every 30 s
HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD wget -qO- http://localhost:4000/health | grep -q '"status":"ok"' || exit 1

# Default: run the API server
# Override CMD to run the worker: ["node", "dist/workers/index.js"]
CMD ["node", "dist/server.js"]
