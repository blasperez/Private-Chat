# Chat Privado Temporal - Dockerfile
# Multi-stage build para optimizar el tamaño de la imagen

# Etapa 1: Build del frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copiar archivos de configuración del frontend
COPY apps/web/package*.json ./apps/web/
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente del frontend
COPY apps/web/ ./apps/web/

# Construir el frontend
WORKDIR /app/apps/web
RUN npm run build

# Etapa 2: Build del backend
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copiar archivos de configuración del backend
COPY apps/server/package*.json ./apps/server/
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente del backend
COPY apps/server/ ./apps/server/

# Construir el backend
WORKDIR /app/apps/server
RUN npm run build

# Etapa 3: Imagen final
FROM node:20-alpine AS production

# Instalar dependencias del sistema
RUN apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar builds
COPY --from=frontend-builder /app/apps/web/dist ./apps/web/dist
COPY --from=backend-builder /app/apps/server/build ./apps/server/build

# Copiar archivos necesarios
COPY apps/server/db/migrations ./apps/server/db/migrations
COPY apps/server/src/supabase.ts ./apps/server/src/supabase.ts

# Crear directorios necesarios
RUN mkdir -p logs uploads apps/server/logs apps/server/uploads && \
    chown -R nodejs:nodejs /app

# Cambiar al usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3001

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/server/build/index.js"]