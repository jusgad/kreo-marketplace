# ANÁLISIS DE SERVICIOS FALTANTES - KREO MARKETPLACE

**Fecha**: 2026-01-03
**Problema**: docker-compose.yml referencia 4 servicios que NO EXISTEN en el proyecto

---

## SERVICIOS FALTANTES

### 1. **user-service** (Puerto 3002)
**Estado**: ❌ NO EXISTE
**Referencias**: docker-compose.yml línea 111-130

**Funcionalidad esperada**:
- Gestión de perfiles de usuarios
- CRUD de información personal
- Actualización de preferencias
- Gestión de avatares/fotos
- Direcciones guardadas

**Dependencias**:
- PostgreSQL
- Posiblemente S3 para avatares

**Solución propuesta**:
```
OPCIÓN A (Recomendada): Combinar con auth-service
- Agregar módulo UserModule a auth-service
- auth-service ya tiene la entidad User
- No requiere servicio separado para MVP

OPCIÓN B: Crear servicio independiente
- Solo si se requiere escalabilidad específica de perfiles
- Estimado: 8-12 horas de desarrollo
```

---

### 2. **vendor-service** (Puerto 3003)
**Estado**: ❌ NO EXISTE
**Referencias**: docker-compose.yml línea 132-151

**Funcionalidad esperada**:
- Gestión de perfiles de vendors
- Onboarding de nuevos vendedores
- Verificación de documentos (KYC)
- Estadísticas y dashboard
- Integración con Stripe Connect

**Dependencias**:
- PostgreSQL
- Stripe (para connected accounts)
- Posiblemente servicios de verificación de identidad

**Solución propuesta**:
```
OPCIÓN A (Recomendada): Combinar con auth-service o user-service
- Vendors son users con rol='vendor'
- La lógica de Stripe Connect ya está en payment-service
- Crear VendorModule dentro de auth-service

OPCIÓN B: Crear servicio independiente
- Si se requiere lógica compleja de onboarding
- Si se planea escalar vendors independientemente
- Estimado: 16-24 horas de desarrollo
```

---

### 3. **shipping-service** (Puerto 3007)
**Estado**: ❌ NO EXISTE
**Referencias**:
- docker-compose.yml línea 226-245
- order-service/order.service.ts línea 192 (SHIPPING_SERVICE_URL)

**Funcionalidad esperada**:
- Cálculo de costos de envío
- Generación de etiquetas de envío
- Tracking de paquetes
- Integración con carriers (Shippo, ShipEngine)
- Gestión de zonas y tarifas

**Dependencias**:
- PostgreSQL
- Shippo API o similar
- order-service (consumidor principal)

**Impacto actual**:
- order-service tiene `SHIPPING_SERVICE_URL` hardcodeado
- Las llamadas al shipping-service fallarán con error 503

**Solución propuesta**:
```
OPCIÓN A (MVP): Usar costos fijos temporalmente
- Hardcodear costos de envío estándar (ej: $5.99)
- Eliminar dependencia del shipping-service
- Implementar servicio real más adelante

OPCIÓN B (Producción): Crear shipping-service completo
- Implementar integración con Shippo o ShipEngine
- Cálculo dinámico basado en peso/dimensiones
- Estimado: 24-32 horas de desarrollo

OPCIÓN C (Intermedia): Módulo shipping dentro de order-service
- Crear ShippingModule en order-service
- Lógica básica de cálculo de costos
- Estimado: 8-12 horas
```

---

### 4. **notification-service** (Puerto 3008)
**Estado**: ❌ NO EXISTE
**Referencias**: docker-compose.yml línea 247-271

**Funcionalidad esperada**:
- Envío de emails (confirmación, tracking, etc.)
- Envío de SMS (alertas críticas)
- Push notifications (aplicaciones móviles futuras)
- Templates de mensajes
- Cola de envíos (retry logic)

**Dependencias**:
- PostgreSQL (logs de notificaciones)
- Redis (cola de mensajes)
- SendGrid (email)
- Twilio (SMS)

**Impacto actual**:
- No hay forma de notificar a usuarios sobre:
  - Órdenes creadas
  - Pagos confirmados
  - Envíos realizados
  - Cuenta creada, etc.

**Solución propuesta**:
```
OPCIÓN A (MVP): Sin notificaciones por ahora
- Enfocarse en funcionalidad core primero
- Agregar cuando el marketplace esté funcional

OPCIÓN B (Básico): Módulo simple de emails
- Crear NotificationModule en auth-service o API Gateway
- Solo emails usando SendGrid
- Sin retry logic avanzado
- Estimado: 8-16 horas

OPCIÓN C (Completo): Servicio independiente
- Con queue system (Bull + Redis)
- Múltiples canales (email, SMS, push)
- Templates avanzados
- Retry logic y dead letter queue
- Estimado: 32-40 horas de desarrollo
```

---

## RECOMENDACIONES INMEDIATAS

### PRIORIDAD 1 - ARREGLAR DOCKER COMPOSE (1 hora)
✅ **Comentar servicios faltantes** para que docker-compose funcione:
```yaml
# user-service: Comentar todo el bloque
# vendor-service: Comentar todo el bloque
# shipping-service: Comentar todo el bloque
# notification-service: Comentar todo el bloque
```

✅ **Actualizar api-gateway** para no depender de servicios inexistentes

### PRIORIDAD 2 - ELIMINAR DEPENDENCIAS (2-4 horas)
✅ Modificar `order-service` para no llamar a `shipping-service`:
```typescript
// En lugar de llamar HTTP a shipping-service
const shippingCost = 5.99; // Costo fijo temporal
```

### PRIORIDAD 3 - CONSOLIDAR FUNCIONALIDAD (8-16 horas)
✅ Agregar módulos a servicios existentes:

**En auth-service**:
- UserModule (gestión de perfiles)
- VendorModule (gestión de vendors)

**En order-service**:
- ShippingModule (cálculo básico de costos)

**En api-gateway**:
- NotificationModule básico (solo emails críticos)

---

## ARQUITECTURA RECOMENDADA (MVP)

```
┌─────────────────────────────────────────────────────────┐
│                     API GATEWAY                          │
│  - Routing                                               │
│  - Rate limiting                                         │
│  - Notificaciones básicas (emails)                      │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌──────▼──────┐ ┌───────▼────────┐
│  auth-service  │ │ product-    │ │ order-service  │
│                │ │ service     │ │                │
│ - Auth         │ │             │ │ - Orders       │
│ - Users        │ │ - Products  │ │ - Cart         │
│ - Vendors      │ │ - Search    │ │ - Shipping*    │
└────────────────┘ └─────────────┘ └────────────────┘
                          │
                  ┌───────▼────────┐
                  │ payment-       │
                  │ service        │
                  │                │
                  │ - Stripe       │
                  │ - Payouts      │
                  └────────────────┘

* Shipping = lógica básica, sin servicio separado
```

---

## ESTIMACIÓN DE TIEMPO

| Tarea | Tiempo | Prioridad |
|-------|--------|-----------|
| Comentar servicios en docker-compose | 0.5h | ⚡ CRÍTICA |
| Eliminar llamada a shipping-service | 1h | ⚡ CRÍTICA |
| Agregar UserModule a auth-service | 8h | 🔴 Alta |
| Agregar VendorModule a auth-service | 8h | 🔴 Alta |
| Agregar ShippingModule básico | 4h | 🟡 Media |
| Agregar NotificationModule básico | 8h | 🟡 Media |
| **TOTAL MÍNIMO VIABLE** | **29.5h** | **~4 días** |

---

## ROADMAP FUTURO

### FASE 1 - MVP (Actual + 4 días)
- Servicios existentes funcionando
- Funcionalidad consolidada
- Sin servicios faltantes

### FASE 2 - Escalabilidad (1-2 meses)
- Separar UserModule → user-service
- Separar VendorModule → vendor-service
- Implementar queue system (RabbitMQ/Kafka)

### FASE 3 - Avanzado (3-6 meses)
- shipping-service completo con Shippo
- notification-service con múltiples canales
- Microservicios completamente desacoplados
- Event-driven architecture

---

## CONCLUSIÓN

El proyecto tiene una **arquitectura ambiciosa** pero actualmente **NO ES FUNCIONAL** por servicios faltantes.

**Recomendación**: Simplificar consolidando funcionalidad en servicios existentes, luego escalar cuando sea necesario.
