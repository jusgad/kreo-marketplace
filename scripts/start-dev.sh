#!/bin/bash

# ==============================================================================
# Start Development - Iniciar proyecto en modo desarrollo
# ==============================================================================

set -e

echo "======================================================================"
echo "  KREO MARKETPLACE - MODO DESARROLLO"
echo "======================================================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
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
    print_warning ".env no encontrado, usando .env.development"
    cp .env.development .env
fi

# Detener contenedores existentes
print_info "Deteniendo contenedores existentes..."
docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true

# Iniciar servicios en modo desarrollo
print_info "Iniciando servicios en modo desarrollo..."
docker-compose up -d || docker compose up -d

# Esperar a que los servicios estén listos
print_info "Esperando a que los servicios estén listos..."
sleep 10

# Verificar estado de los servicios
print_info "Estado de los servicios:"
docker-compose ps || docker compose ps

echo ""
print_success "Servicios iniciados en modo desarrollo"
echo ""
print_info "URLs disponibles:"
echo "  - Customer App: http://localhost:5173"
echo "  - Vendor Portal: http://localhost:5174"
echo "  - API Gateway: http://localhost:3000"
echo "  - Auth Service: http://localhost:3001"
echo "  - Product Service: http://localhost:3004"
echo "  - Order Service: http://localhost:3005"
echo "  - Payment Service: http://localhost:3006"
echo ""
print_info "Ver logs en tiempo real:"
echo "  docker-compose logs -f [service-name]"
echo ""
print_info "Detener servicios:"
echo "  docker-compose down"
echo ""
