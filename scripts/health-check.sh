#!/bin/bash

# ==============================================================================
# Health Check Script - Verificar salud del sistema
# ==============================================================================

set -e

echo "======================================================================"
echo "  KREO MARKETPLACE - HEALTH CHECK"
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

# Contadores
TOTAL=0
PASSED=0
FAILED=0

# Health check genérico
check_service() {
    local name=$1
    local url=$2

    TOTAL=$((TOTAL + 1))

    if curl -f -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        print_success "$name está saludable"
        PASSED=$((PASSED + 1))
        return 0
    else
        print_error "$name no responde o no está saludable"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Verificar contenedores Docker
check_containers() {
    print_info "Verificando contenedores Docker..."
    echo ""

    CONTAINERS=(
        "kreo-postgres"
        "kreo-redis"
        "kreo-elasticsearch"
        "kreo-auth-service"
        "kreo-product-service"
        "kreo-order-service"
        "kreo-payment-service"
        "kreo-api-gateway"
    )

    for container in "${CONTAINERS[@]}"; do
        TOTAL=$((TOTAL + 1))
        if docker ps | grep -q "$container"; then
            # Verificar que está healthy (si tiene healthcheck)
            STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "running")
            if [ "$STATUS" == "healthy" ] || [ "$STATUS" == "running" ]; then
                print_success "$container está corriendo"
                PASSED=$((PASSED + 1))
            else
                print_warning "$container está corriendo pero no healthy (status: $STATUS)"
                PASSED=$((PASSED + 1))
            fi
        else
            print_error "$container no está corriendo"
            FAILED=$((FAILED + 1))
        fi
    done

    echo ""
}

# Verificar servicios HTTP
check_http_services() {
    print_info "Verificando servicios HTTP..."
    echo ""

    # API Gateway
    check_service "API Gateway" "http://localhost:3000/health"

    # Auth Service
    check_service "Auth Service" "http://localhost:3001/health"

    # Product Service
    check_service "Product Service" "http://localhost:3004/health"

    # Order Service
    check_service "Order Service" "http://localhost:3005/health"

    # Payment Service
    check_service "Payment Service" "http://localhost:3006/health"

    echo ""
}

# Verificar bases de datos
check_databases() {
    print_info "Verificando bases de datos..."
    echo ""

    # PostgreSQL
    TOTAL=$((TOTAL + 1))
    if docker exec kreo-postgres pg_isready -U kreo > /dev/null 2>&1; then
        print_success "PostgreSQL está listo"
        PASSED=$((PASSED + 1))
    else
        print_error "PostgreSQL no está listo"
        FAILED=$((FAILED + 1))
    fi

    # Redis
    TOTAL=$((TOTAL + 1))
    if docker exec kreo-redis redis-cli ping | grep -q "PONG"; then
        print_success "Redis está listo"
        PASSED=$((PASSED + 1))
    else
        print_error "Redis no está listo"
        FAILED=$((FAILED + 1))
    fi

    # Elasticsearch
    TOTAL=$((TOTAL + 1))
    if curl -f -s "http://localhost:9200/_cluster/health" > /dev/null; then
        print_success "Elasticsearch está listo"
        PASSED=$((PASSED + 1))
    else
        print_error "Elasticsearch no está listo"
        FAILED=$((FAILED + 1))
    fi

    echo ""
}

# Mostrar resumen
show_summary() {
    echo "======================================================================"
    echo "  RESUMEN"
    echo "======================================================================"
    echo "Total de verificaciones: $TOTAL"
    echo -e "${GREEN}Pasadas: $PASSED${NC}"
    echo -e "${RED}Fallidas: $FAILED${NC}"
    echo ""

    if [ $FAILED -eq 0 ]; then
        print_success "Todos los servicios están saludables"
        exit 0
    else
        print_error "Algunos servicios tienen problemas"
        exit 1
    fi
}

# Main
main() {
    cd "$(dirname "$0")/.."

    check_containers
    check_databases
    check_http_services
    show_summary
}

main "$@"
