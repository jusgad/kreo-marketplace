#!/bin/bash

# ==============================================================================
# Migration Script - Ejecutar migraciones de base de datos
# ==============================================================================

set -e

echo "======================================================================"
echo "  KREO MARKETPLACE - DATABASE MIGRATIONS"
echo "======================================================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
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

# Variables
SERVICES=("auth-service" "product-service" "order-service" "payment-service")

# Verificar que PostgreSQL está corriendo
check_postgres() {
    print_info "Verificando PostgreSQL..."

    if ! docker ps | grep -q "kreo-postgres"; then
        print_error "PostgreSQL no está corriendo"
        print_info "Inicia los servicios con: ./scripts/start-dev.sh"
        exit 1
    fi

    print_success "PostgreSQL está corriendo"
}

# Esperar a que PostgreSQL esté listo
wait_for_postgres() {
    print_info "Esperando a que PostgreSQL esté listo..."

    for i in {1..30}; do
        if docker exec kreo-postgres pg_isready -U kreo > /dev/null 2>&1; then
            print_success "PostgreSQL está listo"
            return 0
        fi
        sleep 1
    done

    print_error "Timeout esperando a PostgreSQL"
    exit 1
}

# Ejecutar migraciones para cada servicio
run_migrations() {
    print_info "Ejecutando migraciones..."

    for service in "${SERVICES[@]}"; do
        print_info "Migraciones para $service..."

        CONTAINER="kreo-$service"

        if docker ps | grep -q "$CONTAINER"; then
            # Si el servicio usa TypeORM
            docker exec "$CONTAINER" npm run migration:run || print_warning "No hay migraciones para $service"

            print_success "Migraciones completadas para $service"
        else
            print_warning "Contenedor $CONTAINER no está corriendo, saltando..."
        fi
    done
}

# Ejecutar seeds (datos de prueba)
run_seeds() {
    if [ "$1" == "--seed" ]; then
        print_info "Ejecutando seeds..."

        for service in "${SERVICES[@]}"; do
            CONTAINER="kreo-$service"

            if docker ps | grep -q "$CONTAINER"; then
                docker exec "$CONTAINER" npm run seed || print_warning "No hay seeds para $service"
            fi
        done

        print_success "Seeds completados"
    fi
}

# Main
main() {
    cd "$(dirname "$0")/.."

    check_postgres
    wait_for_postgres
    echo ""

    run_migrations
    echo ""

    run_seeds "$@"
    echo ""

    print_success "Migraciones completadas exitosamente"
}

main "$@"
