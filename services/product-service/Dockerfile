# ==============================================================================
# Multi-stage Dockerfile for Product Service
# Optimizado para producción con capas cacheables y tamaño reducido
# ==============================================================================

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:18-alpine AS dependencies

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci --quiet

# ============================================
# Stage 2: Builder
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build
RUN npm prune --production

# ============================================
# Stage 3: Production
# ============================================
FROM node:18-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

USER nodejs

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3004/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/main.js"]

# ============================================
# Stage 4: Development
# ============================================
FROM node:18-alpine AS development

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3004 9229

CMD ["npm", "run", "start:dev"]
