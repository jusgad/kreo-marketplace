#!/bin/bash

# ==============================================================================
# Setup Script - Instalación inicial completa del proyecto
# ==============================================================================

set -e

echo "======================================================================"
echo "  KREO MARKETPLACE - SETUP INICIAL"
echo "======================================================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funciones de utilidad
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Verificar que Docker está instalado
check_docker() {
    print_info "Verificando Docker..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado"
        echo "Por favor, instala Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_success "Docker instalado: $(docker --version)"
}

# Verificar que Docker Compose está instalado
check_docker_compose() {
    print_info "Verificando Docker Compose..."
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose no está instalado"
        echo "Por favor, instala Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    print_success "Docker Compose instalado"
}

# Verificar que Node.js está instalado (opcional, para desarrollo local)
check_node() {
    print_info "Verificando Node.js..."
    if ! command -v node &> /dev/null; then
        print_warning "Node.js no está instalado (opcional para desarrollo)"
        return
    fi
    print_success "Node.js instalado: $(node --version)"
}

# Crear archivo .env desde plantilla
setup_env_file() {
    print_info "Configurando archivo .env..."

    if [ -f .env ]; then
        print_warning ".env ya existe, creando backup..."
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi

    if [ ! -f .env ]; then
        print_info "Copiando .env.development a .env..."
        cp .env.development .env
        print_success "Archivo .env creado"
        print_warning "IMPORTANTE: Revisa y actualiza las variables en .env antes de continuar"
    fi
}

# Generar secrets seguros
generate_secrets() {
    print_info "Generando secrets seguros..."

    if command -v openssl &> /dev/null; then
        JWT_ACCESS_SECRET=$(openssl rand -base64 32)
        JWT_REFRESH_SECRET=$(openssl rand -base64 32)
        SESSION_SECRET=$(openssl rand -base64 32)

        echo ""
        print_success "Secrets generados (cópialos a tu .env):"
        echo "JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET"
        echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
        echo "SESSION_SECRET=$SESSION_SECRET"
        echo ""
    else
        print_warning "OpenSSL no está instalado, no se pueden generar secrets"
    fi
}

# Crear directorios necesarios
create_directories() {
    print_info "Creando directorios necesarios..."

    mkdir -p backups
    mkdir -p logs
    mkdir -p shared/database

    print_success "Directorios creados"
}

# Verificar puertos disponibles
check_ports() {
    print_info "Verificando puertos disponibles..."

    PORTS=(3000 3001 3004 3005 3006 5173 5174 5432 6379 9200)

    for port in "${PORTS[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            print_warning "Puerto $port está en uso"
        fi
    done

    print_success "Verificación de puertos completada"
}

# Construir imágenes Docker
build_images() {
    print_info "Construyendo imágenes Docker..."
    print_warning "Esto puede tomar varios minutos..."

    docker-compose build || docker compose build

    print_success "Imágenes construidas exitosamente"
}

# Iniciar servicios de infraestructura
start_infrastructure() {
    print_info "Iniciando servicios de infraestructura (PostgreSQL, Redis, Elasticsearch)..."

    docker-compose up -d postgres redis elasticsearch || docker compose up -d postgres redis elasticsearch

    print_info "Esperando a que los servicios estén listos (30 segundos)..."
    sleep 30

    print_success "Servicios de infraestructura iniciados"
}

# Ejecutar migraciones de base de datos
run_migrations() {
    print_info "Ejecutando migraciones de base de datos..."

    if [ -f ./scripts/migrate.sh ]; then
        bash ./scripts/migrate.sh
        print_success "Migraciones ejecutadas"
    else
        print_warning "Script de migraciones no encontrado, saltando..."
    fi
}

# Main
main() {
    echo "Iniciando setup..."
    echo ""

    # Ir al directorio raíz del proyecto
    cd "$(dirname "$0")/.."

    check_docker
    check_docker_compose
    check_node
    echo ""

    create_directories
    setup_env_file
    echo ""

    generate_secrets
    echo ""

    check_ports
    echo ""

    read -p "¿Deseas construir las imágenes Docker ahora? (s/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        build_images
        echo ""
    fi

    read -p "¿Deseas iniciar los servicios de infraestructura ahora? (s/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        start_infrastructure
        echo ""
    fi

    echo ""
    echo "======================================================================"
    print_success "SETUP COMPLETADO"
    echo "======================================================================"
    echo ""
    print_info "Próximos pasos:"
    echo "1. Revisa y actualiza el archivo .env con tus valores"
    echo "2. Ejecuta: ./scripts/start-dev.sh para iniciar en modo desarrollo"
    echo "3. Accede a:"
    echo "   - Customer App: http://localhost:5173"
    echo "   - Vendor Portal: http://localhost:5174"
    echo "   - API Gateway: http://localhost:3000"
    echo ""
    print_info "Para más información, consulta README.md y DEPLOYMENT.md"
    echo ""
}

main "$@"
