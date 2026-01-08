#!/bin/bash

# ==============================================================================
# Restore Script - Restaurar base de datos desde backup
# ==============================================================================

set -e

echo "======================================================================"
echo "  KREO MARKETPLACE - DATABASE RESTORE"
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
BACKUP_DIR="./backups"
CONTAINER_NAME=${POSTGRES_CONTAINER:-kreo-postgres}
DB_NAME=${POSTGRES_DB:-kreo_db}
DB_USER=${POSTGRES_USER:-kreo}
BACKUP_FILE=$1

# Verificar argumentos
if [ -z "$BACKUP_FILE" ]; then
    print_error "Debes especificar el archivo de backup"
    echo "Uso: ./restore.sh <archivo_backup>"
    echo ""
    print_info "Backups disponibles:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | awk '{print $9, "("$5")"}' || echo "No hay backups disponibles"
    exit 1
fi

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    print_error "Archivo no encontrado: $BACKUP_FILE"
    exit 1
fi

# Verificar que el contenedor está corriendo
check_postgres() {
    print_info "Verificando contenedor de PostgreSQL..."

    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        print_error "Contenedor $CONTAINER_NAME no está corriendo"
        exit 1
    fi

    print_success "Contenedor encontrado: $CONTAINER_NAME"
}

# Crear backup de seguridad antes de restaurar
safety_backup() {
    print_warning "Creando backup de seguridad antes de restaurar..."

    bash ./scripts/backup.sh

    print_success "Backup de seguridad creado"
}

# Restaurar desde backup
restore_backup() {
    print_warning "ADVERTENCIA: Esto eliminará todos los datos actuales de la base de datos"
    read -p "¿Estás seguro de que deseas continuar? (escribe 'SI' para confirmar): " confirmation

    if [ "$confirmation" != "SI" ]; then
        print_info "Restauración cancelada"
        exit 0
    fi

    print_info "Restaurando base de datos desde: $BACKUP_FILE"

    # Descomprimir si es necesario
    if [[ $BACKUP_FILE == *.gz ]]; then
        TEMP_FILE="${BACKUP_FILE%.gz}"
        gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    else
        TEMP_FILE="$BACKUP_FILE"
    fi

    # Eliminar conexiones existentes
    docker exec -t "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid();" || true

    # Drop y recrear la base de datos
    docker exec -t "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    docker exec -t "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

    # Restaurar desde backup
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$TEMP_FILE"

    # Limpiar archivo temporal si se descomprimió
    if [[ $BACKUP_FILE == *.gz ]]; then
        rm "$TEMP_FILE"
    fi

    print_success "Base de datos restaurada exitosamente"
}

# Main
main() {
    cd "$(dirname "$0")/.."

    check_postgres
    echo ""

    safety_backup
    echo ""

    restore_backup
    echo ""

    print_success "Restauración completada"
}

main "$@"
