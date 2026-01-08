#!/bin/bash

# ==============================================================================
# SCRIPT DE VERIFICACIÓN DE BASE DE DATOS
# Kreo Marketplace
# ==============================================================================

echo "=================================================="
echo "🔍 VERIFICACIÓN DE BASE DE DATOS KREO MARKETPLACE"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir resultado
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

# Configuración de conexión
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-kreo_db}"
DB_USER="${DB_USER:-kreo}"
DB_PASSWORD="${DB_PASSWORD:-kreo_dev_password}"

# Exportar contraseña para evitar prompt
export PGPASSWORD=$DB_PASSWORD

echo -e "${BLUE}📊 Configuración:${NC}"
echo "   Host: $DB_HOST"
echo "   Puerto: $DB_PORT"
echo "   Base de datos: $DB_NAME"
echo "   Usuario: $DB_USER"
echo ""

# ==============================================================================
# 1. VERIFICAR CONEXIÓN
# ==============================================================================

echo -e "${YELLOW}1. Verificando conexión a PostgreSQL...${NC}"

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1
print_result $? "Conexión a base de datos establecida"

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: No se pudo conectar a la base de datos${NC}"
    echo "Verifica que PostgreSQL esté corriendo y las credenciales sean correctas"
    exit 1
fi

echo ""

# ==============================================================================
# 2. VERIFICAR EXTENSIONES
# ==============================================================================

echo -e "${YELLOW}2. Verificando extensiones...${NC}"

EXTENSIONS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');")

if [ "$EXTENSIONS" -eq 2 ]; then
    print_result 0 "Extensiones uuid-ossp y pgcrypto instaladas"
else
    print_result 1 "Faltan extensiones (esperadas: 2, encontradas: $EXTENSIONS)"
fi

echo ""

# ==============================================================================
# 3. VERIFICAR TABLAS
# ==============================================================================

echo -e "${YELLOW}3. Verificando tablas...${NC}"

# Lista de tablas esperadas
EXPECTED_TABLES=(
    "users"
    "oauth_connections"
    "vendors"
    "addresses"
    "categories"
    "products"
    "product_variants"
    "reviews"
    "orders"
    "sub_orders"
    "order_items"
    "vendor_payouts"
    "shipping_zones"
    "shipping_rates"
    "discount_codes"
    "notifications"
    "activity_logs"
)

TABLES_COUNT=0

for table in "${EXPECTED_TABLES[@]}"; do
    EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$table';")

    if [ "$EXISTS" -eq 1 ]; then
        ((TABLES_COUNT++))
        print_result 0 "Tabla '$table' existe"
    else
        print_result 1 "Tabla '$table' NO existe"
    fi
done

echo ""
echo "   Total: $TABLES_COUNT/${#EXPECTED_TABLES[@]} tablas encontradas"
echo ""

# ==============================================================================
# 4. VERIFICAR ÍNDICES
# ==============================================================================

echo -e "${YELLOW}4. Verificando índices...${NC}"

INDICES_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';")

echo "   Índices encontrados: $INDICES_COUNT"

if [ "$INDICES_COUNT" -gt 30 ]; then
    print_result 0 "Índices creados correctamente (esperados: 32+)"
else
    print_result 1 "Pocos índices encontrados (esperados: 32+, encontrados: $INDICES_COUNT)"
fi

echo ""

# ==============================================================================
# 5. VERIFICAR DATOS SEMILLA
# ==============================================================================

echo -e "${YELLOW}5. Verificando datos semilla...${NC}"

# Verificar categorías
CATEGORIES_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM categories;")

if [ "$CATEGORIES_COUNT" -ge 6 ]; then
    print_result 0 "Categorías iniciales cargadas ($CATEGORIES_COUNT categorías)"
else
    print_result 1 "Faltan categorías (esperadas: 6, encontradas: $CATEGORIES_COUNT)"
fi

# Verificar usuario admin
ADMIN_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE email='admin@kreo.com';")

if [ "$ADMIN_EXISTS" -eq 1 ]; then
    print_result 0 "Usuario admin creado"
else
    print_result 1 "Usuario admin NO existe"
fi

echo ""

# ==============================================================================
# 6. VERIFICAR TRIGGERS
# ==============================================================================

echo -e "${YELLOW}6. Verificando triggers...${NC}"

TRIGGERS_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%update%updated_at%';")

echo "   Triggers encontrados: $TRIGGERS_COUNT"

if [ "$TRIGGERS_COUNT" -ge 4 ]; then
    print_result 0 "Triggers de updated_at configurados"
else
    print_result 1 "Faltan triggers (esperados: 4+, encontrados: $TRIGGERS_COUNT)"
fi

echo ""

# ==============================================================================
# 7. ESTADÍSTICAS DE TABLAS
# ==============================================================================

echo -e "${YELLOW}7. Estadísticas de tablas...${NC}"
echo ""

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
  tablename AS tabla,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS tamaño
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
" | head -n 15

echo ""

# ==============================================================================
# 8. VERIFICAR FOREIGN KEYS
# ==============================================================================

echo -e "${YELLOW}8. Verificando claves foráneas...${NC}"

FK_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
SELECT COUNT(*)
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public';
")

echo "   Claves foráneas encontradas: $FK_COUNT"

if [ "$FK_COUNT" -gt 20 ]; then
    print_result 0 "Relaciones entre tablas configuradas"
else
    print_result 1 "Pocas foreign keys (esperadas: 20+, encontradas: $FK_COUNT)"
fi

echo ""

# ==============================================================================
# 9. TAMAÑO TOTAL DE LA BASE DE DATOS
# ==============================================================================

echo -e "${YELLOW}9. Tamaño de la base de datos...${NC}"

DB_SIZE=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")

echo "   Tamaño total: $DB_SIZE"
echo ""

# ==============================================================================
# 10. CONEXIONES ACTIVAS
# ==============================================================================

echo -e "${YELLOW}10. Conexiones activas...${NC}"

CONNECTIONS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
SELECT COUNT(*)
FROM pg_stat_activity
WHERE datname = '$DB_NAME';
")

echo "   Conexiones activas: $CONNECTIONS"
echo ""

# ==============================================================================
# RESUMEN FINAL
# ==============================================================================

echo "=================================================="
echo -e "${GREEN}✅ VERIFICACIÓN COMPLETADA${NC}"
echo "=================================================="
echo ""

# Verificar si todo está OK
if [ "$TABLES_COUNT" -eq "${#EXPECTED_TABLES[@]}" ] && [ "$EXTENSIONS" -eq 2 ]; then
    echo -e "${GREEN}🎉 Base de datos configurada correctamente${NC}"
    echo ""
    echo "Siguiente paso:"
    echo "  1. Configurar variables de entorno en los servicios"
    echo "  2. Ejecutar: docker-compose up -d"
    echo "  3. Los servicios se conectarán automáticamente a la BD"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Hay problemas en la configuración${NC}"
    echo ""
    echo "Acciones recomendadas:"
    echo "  1. Ejecutar: psql -U $DB_USER -d $DB_NAME -f shared/database/init.sql"
    echo "  2. Verificar logs de PostgreSQL"
    echo "  3. Ejecutar este script nuevamente"
    echo ""
    exit 1
fi
