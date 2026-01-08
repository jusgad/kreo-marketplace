# ==============================================================================
# Multi-stage Dockerfile for Auth Service
# Optimizado para producción con capas cacheables y tamaño reducido
# ==============================================================================

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:18-alpine AS dependencies

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Copiar solo package files para aprovechar cache de Docker
COPY package*.json ./

# Instalar todas las dependencias (incluye devDependencies para build)
RUN npm ci --quiet

# ============================================
# Stage 2: Builder
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar dependencias desde stage anterior
COPY --from=dependencies /app/node_modules ./node_modules

# Copiar código fuente
COPY . .

# Build de la aplicación
RUN npm run build

# Remover devDependencies
RUN npm prune --production

# ============================================
# Stage 3: Production
# ============================================
FROM node:18-alpine AS production

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copiar solo lo necesario para producción
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Comando de inicio
CMD ["node", "dist/main.js"]

# ============================================
# Stage 4: Development
# ============================================
FROM node:18-alpine AS development

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar todas las dependencias (incluye dev)
RUN npm ci

# Copiar código fuente
COPY . .

# Exponer puerto y debugger
EXPOSE 3001 9229

# Comando de desarrollo con hot reload
CMD ["npm", "run", "start:dev"]
