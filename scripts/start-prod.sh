#!/bin/bash

# ==============================================================================
# Start Production - Iniciar proyecto en modo producción
# ==============================================================================

set -e

echo "======================================================================"
echo "  KREO MARKETPLACE - MODO PRODUCCIÓN"
echo "======================================================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Ir al directorio raíz
cd "$(dirname "$0")/.."

# Verificar que existe .env
if [ ! -f .env ]; then
    print_error ".env no encontrado"
    print_info "Por favor, crea .env basado en .env.production"
    exit 1
fi

# Verificar que NODE_ENV es production
if ! grep -q "NODE_ENV=production" .env; then
    print_warning "NODE_ENV no está configurado como 'production' en .env"
    read -p "¿Continuar de todos modos? (s/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        exit 1
    fi
fi

# Verificar que no hay valores placeholder
if grep -q "USE_SECRETS_MANAGER\|CAMBIAR_POR_\|COMPLETAR" .env; then
    print_error "Encontrados valores placeholder en .env"
    print_info "Por favor, completa todas las variables antes de continuar"
    exit 1
fi

# Hacer backup de la base de datos antes de iniciar
if [ -f ./scripts/backup.sh ]; then
    print_info "Creando backup de seguridad..."
    bash ./scripts/backup.sh
fi

# Pull de imágenes más recientes (si aplica)
print_info "Actualizando imágenes..."
docker-compose -f docker-compose.prod.yml pull || docker compose -f docker-compose.prod.yml pull || true

# Construir imágenes
print_info "Construyendo imágenes de producción..."
docker-compose -f docker-compose.prod.yml build --no-cache || docker compose -f docker-compose.prod.yml build --no-cache

# Detener servicios existentes
print_info "Deteniendo servicios existentes..."
docker-compose -f docker-compose.prod.yml down || docker compose -f docker-compose.prod.yml down || true

# Iniciar servicios en modo producción
print_info "Iniciando servicios en modo producción..."
docker-compose -f docker-compose.prod.yml up -d || docker compose -f docker-compose.prod.yml up -d

# Esperar a que los servicios estén listos
print_info "Esperando a que los servicios estén listos..."
sleep 30

# Ejecutar health checks
print_info "Ejecutando health checks..."
bash ./scripts/health-check.sh || print_warning "Health checks fallaron"

# Verificar estado de los servicios
print_info "Estado de los servicios:"
docker-compose -f docker-compose.prod.yml ps || docker compose -f docker-compose.prod.yml ps

echo ""
print_success "Servicios iniciados en modo producción"
echo ""
print_info "Verificar logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f [service-name]"
echo ""
print_warning "IMPORTANTE: Monitorea los logs durante los primeros minutos"
echo ""
