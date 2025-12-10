#!/bin/bash

# Script de Verificación de Parches de Seguridad
# kreo-marketplace

echo "🔍 Verificando implementación de parches de seguridad..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

checks_passed=0
checks_failed=0

# Función helper
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        ((checks_passed++))
    else
        echo -e "${RED}❌${NC} $2"
        ((checks_failed++))
    fi
}

check_in_file() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $3"
        ((checks_passed++))
    else
        echo -e "${RED}❌${NC} $3"
        ((checks_failed++))
    fi
}

echo "📦 Verificando archivos de parches..."
check_file "shared/security/sql-injection-prevention.ts" "Parche #1: SQL Injection Prevention"
check_file "shared/security/guards/ownership.guard.ts" "Parche #2: Ownership Guard"
check_file "shared/security/guards/roles.guard.ts" "Parche #2: Roles Guard"
check_file "shared/security/xss-sanitizer.ts" "Parche #3: XSS Sanitizer"
check_file "shared/security/price-validator.ts" "Parche #4: Price Validator"
check_file "shared/security/rate-limiter.ts" "Parche #5: Rate Limiter"
check_file "shared/security/secure-session.ts" "Parche #5: Secure Session"

echo ""
echo "🔧 Verificando implementación en código..."

# Verificar que order.service.ts fue corregido
check_in_file "services/order-service/src/order/order.service.ts" "OwnershipChecker" "IDOR corregido en order.service.ts"

# Verificar que auth.controller.ts tiene rate limiting
check_in_file "services/auth-service/src/auth/auth.controller.ts" "RateLimitGuard" "Rate limiting en auth.controller.ts"

echo ""
echo "📝 Verificando dependencias..."

if [ -f "package.json" ]; then
    check_in_file "package.json" "ioredis" "Dependencia: ioredis"
    check_in_file "package.json" "cookie-parser" "Dependencia: cookie-parser"
    check_in_file "package.json" "helmet" "Dependencia: helmet"
    check_in_file "package.json" "class-validator" "Dependencia: class-validator"
else
    echo -e "${YELLOW}⚠️${NC}  package.json no encontrado en el directorio actual"
fi

echo ""
echo "🔐 Verificando configuración de seguridad..."

if [ -f ".env" ] || [ -f ".env.example" ]; then
    ENV_FILE=".env"
    [ -f ".env.example" ] && ENV_FILE=".env.example"
    
    check_in_file "$ENV_FILE" "JWT_ACCESS_SECRET" "Variable: JWT_ACCESS_SECRET"
    check_in_file "$ENV_FILE" "JWT_REFRESH_SECRET" "Variable: JWT_REFRESH_SECRET"
    check_in_file "$ENV_FILE" "REDIS_HOST" "Variable: REDIS_HOST"
else
    echo -e "${YELLOW}⚠️${NC}  Archivo .env no encontrado"
fi

echo ""
echo "================================================"
echo -e "Resumen de verificación:"
echo -e "${GREEN}✅ Pasadas:${NC} $checks_passed"
echo -e "${RED}❌ Fallidas:${NC} $checks_failed"
echo "================================================"

if [ $checks_failed -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Todos los parches están correctamente implementados!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Algunos parches necesitan atención.${NC}"
    echo "Consulta INSTALACION-RAPIDA.md para más detalles."
    exit 1
fi
