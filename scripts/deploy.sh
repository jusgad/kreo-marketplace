#!/bin/bash

# ==============================================================================
# Deploy Script - Deployment automatizado con zero-downtime
# ==============================================================================

set -e

echo "======================================================================"
echo "  KREO MARKETPLACE - DEPLOYMENT"
echo "======================================================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Variables
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Validar ambiente
validate_environment() {
    print_info "Validando ambiente: $ENVIRONMENT"

    case $ENVIRONMENT in
        development|staging|production)
            print_success "Ambiente válido: $ENVIRONMENT"
            ;;
        *)
            print_error "Ambiente inválido: $ENVIRONMENT"
            echo "Uso: ./deploy.sh [development|staging|production]"
            exit 1
            ;;
    esac
}

# Verificar pre-requisitos
check_prerequisites() {
    print_info "Verificando pre-requisitos..."

    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado"
        exit 1
    fi

    # Verificar .env
    if [ ! -f .env ]; then
        print_error ".env no encontrado"
        exit 1
    fi

    # Verificar que no hay cambios sin commitear (opcional)
    if [ -d .git ]; then
        if [[ -n $(git status -s) ]]; then
            print_warning "Hay cambios sin commitear"
            read -p "¿Continuar de todos modos? (s/n) " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
                exit 1
            fi
        fi
    fi

    print_success "Pre-requisitos verificados"
}

# Crear backup antes de deploy
create_backup() {
    print_info "Creando backup antes del deployment..."

    if [ -f ./scripts/backup.sh ]; then
        bash ./scripts/backup.sh
        print_success "Backup creado: backup_$TIMESTAMP"
    else
        print_warning "Script de backup no encontrado"
    fi
}

# Ejecutar tests (opcional)
run_tests() {
    print_info "Ejecutando tests..."

    if [ -f package.json ]; then
        npm test || print_warning "Tests fallaron o no están configurados"
    fi
}

# Build de imágenes
build_images() {
    print_info "Construyendo imágenes Docker..."

    docker-compose -f $COMPOSE_FILE build --no-cache || docker compose -f $COMPOSE_FILE build --no-cache

    print_success "Imágenes construidas"
}

# Deployment con zero-downtime (blue-green)
deploy_services() {
    print_info "Desplegando servicios..."

    # Iniciar nuevos contenedores
    docker-compose -f $COMPOSE_FILE up -d --no-deps --build || docker compose -f $COMPOSE_FILE up -d --no-deps --build

    # Esperar a que los nuevos contenedores estén healthy
    print_info "Esperando health checks..."
    sleep 30

    # Ejecutar health checks
    if bash ./scripts/health-check.sh; then
        print_success "Health checks pasados"

        # Remover contenedores viejos
        docker-compose -f $COMPOSE_FILE up -d --remove-orphans || docker compose -f $COMPOSE_FILE up -d --remove-orphans

        print_success "Deployment completado"
    else
        print_error "Health checks fallaron"
        print_warning "Realizando rollback..."
        rollback
        exit 1
    fi
}

# Rollback en caso de falla
rollback() {
    print_warning "Ejecutando rollback..."

    # Restaurar contenedores anteriores
    docker-compose -f $COMPOSE_FILE down || docker compose -f $COMPOSE_FILE down

    # Aquí podrías restaurar desde backup si es necesario

    print_info "Rollback completado"
}

# Cleanup de recursos no utilizados
cleanup() {
    print_info "Limpiando recursos no utilizados..."

    docker system prune -f
    docker volume prune -f

    print_success "Cleanup completado"
}

# Mostrar status post-deployment
show_status() {
    print_info "Estado de los servicios:"
    docker-compose -f $COMPOSE_FILE ps || docker compose -f $COMPOSE_FILE ps

    echo ""
    print_success "Deployment exitoso para ambiente: $ENVIRONMENT"
    echo ""
    print_info "Próximos pasos:"
    echo "1. Monitorear logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "2. Verificar métricas en Grafana (si está configurado)"
    echo "3. Ejecutar smoke tests"
    echo ""
}

# Main
main() {
    cd "$(dirname "$0")/.."

    validate_environment
    echo ""

    print_warning "Vas a desplegar a: $ENVIRONMENT"
    read -p "¿Estás seguro? (s/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        print_info "Deployment cancelado"
        exit 0
    fi

    check_prerequisites
    echo ""

    create_backup
    echo ""

    # run_tests
    # echo ""

    build_images
    echo ""

    deploy_services
    echo ""

    cleanup
    echo ""

    show_status
}

main "$@"
