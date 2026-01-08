#!/bin/bash

# ==============================================================================
# Backup Script - Backup de base de datos PostgreSQL
# ==============================================================================

set -e

echo "======================================================================"
echo "  KREO MARKETPLACE - DATABASE BACKUP"
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
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
CONTAINER_NAME=${POSTGRES_CONTAINER:-kreo-postgres}
DB_NAME=${POSTGRES_DB:-kreo_db}
DB_USER=${POSTGRES_USER:-kreo}
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Crear directorio de backups
mkdir -p "$BACKUP_DIR"

# Verificar que el contenedor de PostgreSQL está corriendo
check_postgres() {
    print_info "Verificando contenedor de PostgreSQL..."

    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        print_error "Contenedor $CONTAINER_NAME no está corriendo"
        exit 1
    fi

    print_success "Contenedor encontrado: $CONTAINER_NAME"
}

# Crear backup
create_backup() {
    print_info "Creando backup de la base de datos..."

    docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

    if [ -f "$BACKUP_FILE" ]; then
        # Comprimir backup
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"

        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        print_success "Backup creado: $BACKUP_FILE ($BACKUP_SIZE)"
    else
        print_error "Error al crear backup"
        exit 1
    fi
}

# Limpiar backups antiguos
cleanup_old_backups() {
    print_info "Limpiando backups antiguos (más de $RETENTION_DAYS días)..."

    find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

    print_success "Backups antiguos eliminados"
}

# Subir a S3 (opcional)
upload_to_s3() {
    if [ -n "$BACKUP_S3_BUCKET" ] && command -v aws &> /dev/null; then
        print_info "Subiendo backup a S3..."

        aws s3 cp "$BACKUP_FILE" "s3://$BACKUP_S3_BUCKET/database-backups/" || print_warning "Error al subir a S3"

        print_success "Backup subido a S3"
    fi
}

# Listar backups disponibles
list_backups() {
    print_info "Backups disponibles:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz | awk '{print $9, "("$5")"}'
}

# Main
main() {
    cd "$(dirname "$0")/.."

    check_postgres
    echo ""

    create_backup
    echo ""

    cleanup_old_backups
    echo ""

    upload_to_s3
    echo ""

    list_backups
    echo ""

    print_success "Backup completado exitosamente"
}

main "$@"
