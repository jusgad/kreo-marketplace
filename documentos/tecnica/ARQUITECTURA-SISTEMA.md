# Arquitectura del Sistema
## Kreo Marketplace - Documentación Técnica

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura de Microservicios](#arquitectura-de-microservicios)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Componentes del Sistema](#componentes-del-sistema)
5. [Flujos de Datos](#flujos-de-datos)
6. [Seguridad](#seguridad)
7. [Escalabilidad](#escalabilidad)
8. [Monitoreo y Observabilidad](#monitoreo-y-observabilidad)
9. [Decisiones de Arquitectura](#decisiones-de-arquitectura)

---

## Visión General

Kreo Marketplace es una plataforma de comercio electrónico multi-vendedor construida con una arquitectura de microservicios moderna, diseñada para ser escalable, mantenible y resiliente.

### Principios de Diseño

1. **Separación de Responsabilidades**: Cada microservicio tiene una responsabilidad única y bien definida
2. **Desacoplamiento**: Los servicios se comunican a través de APIs RESTful bien definidas
3. **Escalabilidad Horizontal**: Los servicios pueden escalarse independientemente según demanda
4. **Tolerancia a Fallos**: El sistema continúa funcionando incluso si un servicio falla
5. **Seguridad por Defecto**: Autenticación, autorización y validación en cada capa

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CAPA DE CLIENTE                              │
├─────────────────────────────────────────────────────────────────────┤
│  Customer App (React)          │    Vendor Portal (React)           │
│  Puerto: 5173                  │    Puerto: 5174                    │
│  - Búsqueda de productos       │    - Gestión de productos          │
│  - Carrito de compras          │    - Gestión de pedidos            │
│  - Checkout                    │    - Análisis y reportes           │
└─────────────┬──────────────────┴────────────┬───────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────────────┐
│                         API GATEWAY                                   │
│                         Puerto: 3000                                  │
│  - Rate Limiting                - Enrutamiento                        │
│  - CORS                         - Proxy a Microservicios              │
│  - Compresión                   - Health Checks                       │
└─────────────┬─────────────────────────────────────────────────────────┘
              │
    ┌─────────┼─────────┬──────────┬──────────┬──────────┐
    │         │         │          │          │          │
┌───▼───┐ ┌──▼──┐  ┌───▼────┐ ┌───▼────┐ ┌──▼────┐ ┌───▼────┐
│ Auth  │ │User │  │Vendor  │ │Product │ │ Order │ │Payment │
│Service│ │Svc  │  │Service │ │Service │ │Service│ │Service │
│:3001  │ │:3002│  │:3003   │ │:3004   │ │:3005  │ │:3006   │
└───┬───┘ └──┬──┘  └───┬────┘ └───┬────┘ └───┬───┘ └───┬────┘
    │        │         │          │          │         │
┌───▼────────▼─────────▼──────────▼──────────▼─────────▼──────────────┐
│                    CAPA DE INFRAESTRUCTURA                           │
├──────────────────────────────────────────────────────────────────────┤
│  PostgreSQL 15    │   Redis 7      │  Elasticsearch 8  │  AWS S3    │
│  - Base de datos  │   - Cache      │  - Búsqueda       │  - Imágenes│
│  - Transacciones  │   - Sesiones   │  - Análisis       │  - Assets  │
│                   │   - Colas      │                   │            │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    SERVICIOS EXTERNOS                                │
├──────────────────────────────────────────────────────────────────────┤
│  Stripe Connect   │   SendGrid     │   Twilio          │   Shippo   │
│  - Pagos          │   - Emails     │   - SMS           │   - Envíos │
│  - Transferencias │   - Notifs     │   - 2FA           │   - Labels │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Arquitectura de Microservicios

### ¿Por qué Microservicios?

**Ventajas**:
- ✅ Escalabilidad independiente por servicio
- ✅ Desarrollo y despliegue independiente
- ✅ Tecnologías heterogéneas (si es necesario)
- ✅ Tolerancia a fallos mejorada
- ✅ Equipos especializados por servicio

**Desventajas** (y cómo las mitigamos):
- ❌ Complejidad operacional → Docker/Kubernetes
- ❌ Comunicación entre servicios → REST APIs + Event Bus futuro
- ❌ Transacciones distribuidas → Saga Pattern
- ❌ Debugging complejo → Logging centralizado + Tracing

### Patrón de Comunicación

Actualmente: **REST HTTP Síncrono**

```
┌──────────────┐     HTTP/REST    ┌──────────────┐
│              │ ───────────────> │              │
│ Order Service│                  │Product Service│
│              │ <─────────────── │              │
└──────────────┘    JSON Response └──────────────┘
```

**Futuro**: Event-Driven con Message Queue

```
┌──────────────┐     Event        ┌──────────────┐
│              │ ──────────┐      │              │
│ Order Service│           ▼      │Product Service│
│              │       ┌────────┐ │              │
└──────────────┘       │ Queue  │ └──────────────┘
                       │(RabbitMQ)
                       │or Kafka│
                       └────────┘
```

---

## Stack Tecnológico

### Backend

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| **Node.js** | 18+ | Runtime de JavaScript |
| **NestJS** | 10+ | Framework de microservicios |
| **TypeScript** | 5.0 | Tipado estático |
| **TypeORM** | 0.3+ | ORM para PostgreSQL |
| **Express** | 4.18 | API Gateway |
| **Passport.js** | 0.6+ | Autenticación |
| **class-validator** | 0.14+ | Validación de DTOs |

### Frontend

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| **React** | 18 | UI Library |
| **TypeScript** | 5.0 | Tipado estático |
| **Vite** | 4+ | Build tool |
| **Redux Toolkit** | 1.9+ | State management |
| **TailwindCSS** | 3+ | Styling |
| **React Router** | 6+ | Routing |

### Base de Datos y Cache

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| **PostgreSQL** | 15 | Base de datos principal |
| **Redis** | 7 | Cache y sesiones |
| **Elasticsearch** | 8 | Búsqueda y análisis |

### Servicios Externos

| Servicio | Uso |
|---------|-----|
| **Stripe Connect** | Pagos y transferencias |
| **AWS S3** | Almacenamiento de imágenes |
| **SendGrid** | Envío de emails |
| **Twilio** | SMS y 2FA |
| **Shippo** | Gestión de envíos |

### DevOps

| Tecnología | Uso |
|-----------|-----|
| **Docker** | Contenedorización |
| **Docker Compose** | Orquestación local |
| **Kubernetes** | Orquestación en producción |
| **GitHub Actions** | CI/CD |

---

## Componentes del Sistema

### API Gateway

**Ubicación**: `api-gateway/`
**Puerto**: 3000
**Tecnología**: Express.js

**Responsabilidades**:
```javascript
✓ Punto de entrada único para todas las peticiones
✓ Rate limiting global (1000 req/min por IP)
✓ CORS configuration
✓ Enrutamiento a microservicios
✓ Compresión gzip
✓ Health checks
```

**Rutas**:
```
/api/auth/*          → Auth Service (3001)
/api/users/*         → User Service (3002)
/api/vendors/*       → Vendor Service (3003)
/api/products/*      → Product Service (3004)
/api/orders/*        → Order Service (3005)
/api/payments/*      → Payment Service (3006)
```

**Código Clave**:
```javascript
// api-gateway/src/index.ts
const gateway = express();

// Rate limiting
gateway.use(rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 1000, // 1000 requests
}));

// Proxy a microservicios
gateway.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
}));
```

### Auth Service

**Ubicación**: `services/auth-service/`
**Puerto**: 3001
**Tecnología**: NestJS

**Responsabilidades**:
```javascript
✓ Registro de usuarios (clientes, vendedores)
✓ Login con JWT (access + refresh tokens)
✓ Autenticación de dos factores (2FA)
✓ Recuperación de contraseña
✓ OAuth2 (Google, Facebook)
✓ Gestión de sesiones
```

**Endpoints**:
```
POST   /auth/register          # Registro
POST   /auth/login             # Login
POST   /auth/refresh           # Refresh token
POST   /auth/logout            # Logout
GET    /auth/me                # Usuario actual
POST   /auth/2fa/enable        # Activar 2FA
POST   /auth/2fa/verify        # Verificar código 2FA
```

**Seguridad Implementada**:
- ✅ Contraseñas hasheadas con bcrypt (12 salt rounds)
- ✅ JWT con RS256 (algoritmo asimétrico)
- ✅ Access token: 15 minutos
- ✅ Refresh token: 7 días
- ✅ Tokens en HTTP-Only cookies
- ✅ Rate limiting: 5 intentos de login/min
- ✅ 2FA con TOTP (Speakeasy)
- ✅ Protección contra timing attacks

### Product Service

**Ubicación**: `services/product-service/`
**Puerto**: 3004
**Tecnología**: NestJS + Elasticsearch

**Responsabilidades**:
```javascript
✓ CRUD de productos
✓ Búsqueda avanzada con Elasticsearch
✓ Gestión de variantes
✓ Categorización
✓ Carga masiva (CSV)
✓ Sanitización XSS
```

**Endpoints**:
```
POST   /products                    # Crear producto
GET    /products/:id                # Obtener producto
PUT    /products/:id                # Actualizar producto
DELETE /products/:id                # Eliminar producto
GET    /products/search             # Búsqueda avanzada
POST   /products/bulk-upload        # Carga masiva
```

**Búsqueda con Elasticsearch**:
```javascript
// Búsqueda multi-campo con fuzzy matching
const result = await esClient.search({
  index: 'products',
  body: {
    query: {
      multi_match: {
        query: searchTerm,
        fields: ['title^3', 'description', 'tags^2'],
        fuzziness: 'AUTO',
      },
    },
    aggs: {
      categories: { terms: { field: 'category_id' } },
      price_ranges: {
        range: {
          field: 'base_price',
          ranges: [
            { to: 25 },
            { from: 25, to: 50 },
            { from: 50, to: 100 },
            { from: 100 },
          ],
        },
      },
    },
  },
});
```

### Order Service

**Ubicación**: `services/order-service/`
**Puerto**: 3005
**Tecnología**: NestJS

**Responsabilidades**:
```javascript
✓ Gestión de carrito (Redis)
✓ Checkout multi-vendedor
✓ Creación de órdenes
✓ Gestión de sub-órdenes (por vendedor)
✓ Cálculo de comisiones
✓ Estados de pedido
```

**Flujo de Checkout**:
```
1. Cliente agrega productos al carrito
   ↓
2. Carrito se agrupa por vendedor automáticamente
   ↓
3. Cliente procede a checkout
   ↓
4. Se crea 1 orden maestra + N sub-órdenes (una por vendedor)
   ↓
5. Se calcula comisión por sub-orden (10% default)
   ↓
6. Se crea payment intent en Stripe
   ↓
7. Cliente completa pago
   ↓
8. Se ejecutan transferencias a vendedores (neto de comisión)
```

**Modelo de Datos**:
```typescript
Order {
  id: UUID
  order_number: string
  user_id: UUID
  grand_total: decimal
  payment_status: enum
  shipping_address: JSON
}

SubOrder {
  id: UUID
  order_id: UUID (FK)
  vendor_id: UUID (FK)
  suborder_number: string
  total: decimal
  commission_rate: decimal
  commission_amount: decimal
  vendor_payout: decimal
  status: enum
}

OrderItem {
  id: UUID
  sub_order_id: UUID (FK)
  product_id: UUID (FK)
  quantity: int
  unit_price: decimal
  total_price: decimal
}
```

### Payment Service

**Ubicación**: `services/payment-service/`
**Puerto**: 3006
**Tecnología**: NestJS + Stripe SDK

**Responsabilidades**:
```javascript
✓ Crear Payment Intents (Stripe)
✓ Procesar pagos
✓ Ejecutar transferencias a vendedores
✓ Webhook de Stripe
✓ Gestión de reembolsos
✓ Historial de transacciones
```

**Flujo de Pago Multi-Vendedor**:
```typescript
// 1. Crear Payment Intent con Application Fee
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000, // $100.00
  currency: 'usd',
  application_fee_amount: 1000, // 10% comisión
  transfer_data: {
    destination: vendorStripeAccountId,
  },
});

// 2. Cliente completa pago en frontend

// 3. Webhook confirma pago exitoso
// POST /payments/webhooks

// 4. Ejecutar transferencias a cada vendedor
for (const subOrder of subOrders) {
  await stripe.transfers.create({
    amount: subOrder.vendor_payout * 100, // convertir a centavos
    currency: 'usd',
    destination: subOrder.vendor.stripe_account_id,
    transfer_group: order.id,
  });
}
```

**Seguridad de Pagos**:
- ✅ Cumplimiento PCI-DSS (delegado a Stripe)
- ✅ Validación de webhooks con signature
- ✅ Validación de montos antes de transferir
- ✅ Prevención de inyección en cálculos
- ✅ Logs de auditoría de todas las transacciones

### Vendor Service

**Ubicación**: `services/vendor-service/`
**Puerto**: 3003
**Tecnología**: NestJS

**Responsabilidades**:
```javascript
✓ Registro de vendedores
✓ Verificación KYC
✓ Integración con Stripe Connect
✓ Gestión de tienda (nombre, logo, políticas)
✓ Análisis de ventas
✓ Configuración de envío
```

---

## Flujos de Datos

### Flujo de Registro de Usuario

```
┌────────┐                         ┌─────────────┐
│Frontend│                         │Auth Service │
└───┬────┘                         └──────┬──────┘
    │                                     │
    │ POST /auth/register                 │
    │ {email, password, role}             │
    ├────────────────────────────────────>│
    │                                     │
    │                                     │ 1. Validar datos
    │                                     │ 2. Hashear password
    │                                     │ 3. Crear usuario en DB
    │                                     │ 4. Enviar email verificación
    │                                     │
    │ {user, accessToken}                 │
    │<────────────────────────────────────┤
    │                                     │
    │ Set HTTP-Only Cookies:              │
    │ - access_token                      │
    │ - refresh_token                     │
    │<────────────────────────────────────┤
```

### Flujo de Búsqueda de Productos

```
┌────────┐    ┌──────────────┐    ┌─────────────────┐
│Frontend│    │Product Service│    │  Elasticsearch  │
└───┬────┘    └──────┬───────┘    └────────┬────────┘
    │                │                      │
    │ GET /products/search?q=laptop         │
    ├───────────────>│                      │
    │                │                      │
    │                │ Search query         │
    │                ├─────────────────────>│
    │                │                      │
    │                │                      │ 1. Parse query
    │                │                      │ 2. Apply filters
    │                │                      │ 3. Score results
    │                │                      │ 4. Aggregate facets
    │                │                      │
    │                │ Results + Facets     │
    │                │<─────────────────────┤
    │                │                      │
    │ {products, facets, total}             │
    │<───────────────┤                      │
```

### Flujo de Checkout Multi-Vendedor

```
┌────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│Frontend│  │Order Service│  │Payment Service│  │    Stripe    │
└───┬────┘  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘
    │              │                │                 │
    │ POST /orders/checkout         │                 │
    │ {shipping_address, ...}       │                 │
    ├─────────────>│                │                 │
    │              │                │                 │
    │              │ 1. Get cart (Redis)              │
    │              │ 2. Group by vendor               │
    │              │ 3. Calculate totals              │
    │              │ 4. Create Order + SubOrders      │
    │              │                │                 │
    │              │ POST /payments/create-intent     │
    │              ├───────────────>│                 │
    │              │                │                 │
    │              │                │ stripe.paymentIntents.create
    │              │                ├────────────────>│
    │              │                │                 │
    │              │                │ {client_secret} │
    │              │                │<────────────────┤
    │              │                │                 │
    │              │ {client_secret}│                 │
    │              │<───────────────┤                 │
    │              │                │                 │
    │ {order, client_secret}        │                 │
    │<─────────────┤                │                 │
    │              │                │                 │
    │ Frontend: stripe.confirmCardPayment             │
    ├─────────────────────────────────────────────────>│
    │              │                │                 │
    │              │                │  Webhook        │
    │              │                │  payment_intent.succeeded
    │              │                │<────────────────┤
    │              │                │                 │
    │              │ POST /payments/confirm           │
    │              ├───────────────>│                 │
    │              │                │                 │
    │              │                │ Execute Transfers
    │              │                │ to vendors      │
    │              │                ├────────────────>│
    │              │                │                 │
    │              │ Update order status              │
    │              │<───────────────┤                 │
```

---

## Seguridad

### Autenticación y Autorización

**JWT con Refresh Tokens**:
```typescript
// Access Token (vida corta: 15 min)
const accessToken = jwt.sign(
  { sub: user.id, email: user.email, role: user.role },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: '15m', algorithm: 'RS256' }
);

// Refresh Token (vida larga: 7 días)
const refreshToken = jwt.sign(
  { sub: user.id, type: 'refresh' },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d', algorithm: 'RS256' }
);
```

**Guards de NestJS**:
```typescript
// JWT Guard - Protege rutas
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) {
  return req.user;
}

// Role Guard - Valida roles
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin')
adminOnly() {
  return 'Admin content';
}
```

### Protección contra Vulnerabilidades

**1. SQL Injection**:
```typescript
// ✅ CORRECTO: Queries parametrizadas de TypeORM
const user = await userRepository.findOne({
  where: { email: userInput }  // Escapado automáticamente
});

// ❌ INCORRECTO: Query string directo
const user = await queryRunner.query(
  `SELECT * FROM users WHERE email = '${userInput}'`
);
```

**2. XSS (Cross-Site Scripting)**:
```typescript
import { XSSSanitizer } from '@/shared/security/xss-sanitizer';

// Sanitizar inputs
const sanitizedTitle = XSSSanitizer.sanitizeTitle(userInput);
const sanitizedDescription = XSSSanitizer.sanitizeProductDescription(desc);
```

**3. CSRF (Cross-Site Request Forgery)**:
```typescript
// Protección vía SameSite cookies
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});
```

**4. Rate Limiting**:
```typescript
// Global (API Gateway)
rateLimit({ windowMs: 60000, max: 1000 })

// Por endpoint (Auth Service)
@LoginRateLimit()  // 5 intentos/min
@Post('login')
login() {}

@RegisterRateLimit()  // 3 registros/hora
@Post('register')
register() {}
```

### Headers de Seguridad

```typescript
// Helmet.js configurado en API Gateway
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

---

## Escalabilidad

### Escalado Horizontal

Todos los servicios son stateless (excepto sesiones en Redis), permitiendo escalar horizontalmente:

```bash
# Kubernetes: Escalar Order Service a 5 réplicas
kubectl scale deployment order-service --replicas=5 -n kreo-marketplace
```

### Caching Strategy

**Niveles de Cache**:

1. **Browser Cache**: Headers HTTP (Cache-Control)
2. **CDN Cache**: CloudFront para assets estáticos
3. **Application Cache**: Redis para:
   - Sesiones de usuario
   - Carrito de compras
   - Productos destacados (15 min TTL)
   - Resultados de búsqueda frecuentes (5 min TTL)

```typescript
// Ejemplo: Cache de productos en Redis
async getProduct(id: string) {
  // 1. Check cache
  const cached = await redis.get(`product:${id}`);
  if (cached) return JSON.parse(cached);

  // 2. Query database
  const product = await productRepository.findOne(id);

  // 3. Set cache (15 min)
  await redis.setex(`product:${id}`, 900, JSON.stringify(product));

  return product;
}
```

### Database Optimization

**Índices Estratégicos**:
```sql
-- Búsquedas frecuentes
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Full-text search (fallback si Elasticsearch falla)
CREATE INDEX idx_products_title_trgm ON products USING gin(title gin_trgm_ops);
```

**Connection Pooling**:
```typescript
// TypeORM connection pool
database: {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  poolSize: 20,  // Max 20 conexiones
}
```

### Load Balancing

```
                    ┌──────────────┐
                    │Load Balancer │
                    │  (NGINX)     │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
     │ Gateway │      │ Gateway │      │ Gateway │
     │Instance1│      │Instance2│      │Instance3│
     └─────────┘      └─────────┘      └─────────┘
```

---

## Monitoreo y Observabilidad

### Métricas (Prometheus)

```typescript
// Métricas personalizadas
import { Counter, Histogram } from 'prom-client';

// Contador de peticiones
const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total de peticiones HTTP',
  labelNames: ['method', 'route', 'status'],
});

// Histograma de latencia
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de peticiones HTTP',
  labelNames: ['method', 'route'],
});
```

### Logging Centralizado

```typescript
// Winston logger con formato estructurado
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log estructurado
logger.info('Order created', {
  orderId: order.id,
  userId: user.id,
  total: order.grand_total,
});
```

### Health Checks

```typescript
// API Gateway health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      auth: 'healthy',
      products: 'healthy',
      orders: 'healthy',
      payments: 'healthy',
    },
  });
});
```

---

## Decisiones de Arquitectura

### ADR 1: Microservicios vs Monolito

**Decisión**: Microservicios

**Contexto**: Necesitamos escalar componentes independientemente y permitir desarrollo paralelo de equipos.

**Consecuencias**:
- ✅ Escalabilidad independiente
- ✅ Desarrollo paralelo
- ✅ Tecnologías específicas por servicio
- ❌ Mayor complejidad operacional
- ❌ Latencia de red entre servicios

### ADR 2: REST vs GraphQL

**Decisión**: REST

**Contexto**: El equipo tiene más experiencia con REST y la mayoría de casos de uso son CRUD.

**Consecuencias**:
- ✅ Más simple y familiar
- ✅ Caching más directo
- ✅ Tooling maduro
- ❌ Overfetching/underfetching
- ❌ Múltiples requests para datos relacionados

### ADR 3: PostgreSQL vs MongoDB

**Decisión**: PostgreSQL

**Contexto**: Necesitamos transacciones ACID, especialmente para órdenes y pagos.

**Consecuencias**:
- ✅ Transacciones ACID
- ✅ Relaciones complejas
- ✅ Integridad referencial
- ❌ Menos flexible para datos no estructurados
- ❌ Escalado horizontal más complejo

### ADR 4: JWT vs Session-Based Auth

**Decisión**: JWT (con Refresh Tokens)

**Contexto**: Arquitectura de microservicios distribuida.

**Consecuencias**:
- ✅ Stateless (escalable)
- ✅ No requiere shared session store
- ✅ Puede incluir claims
- ❌ No se puede invalidar fácilmente
- ❌ Tokens más largos (mayor overhead)

**Mitigación**: Refresh tokens permiten invalidación y access tokens de vida corta.

---

**Documentación Completa de Arquitectura**

Para más detalles técnicos, consulta:
- **Base de Datos**: `BASE-DATOS.md`
- **API**: `../api/GUIA-API-COMPLETA.md`
- **Seguridad**: `documentos/parches-seguridad/`

---

*Última actualización: Diciembre 2024*
*Versión: 1.0.0*
