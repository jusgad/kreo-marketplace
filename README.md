# Kreo Marketplace

<div align="center">

**Plataforma de Marketplace B2C Multi-Vendor con Sistema de Pagos Divididos**

[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-blue.svg)](LICENSE)
[![Versión Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)

[Características](#-características) • [Inicio Rápido](#-inicio-rápido) • [Arquitectura](#-arquitectura) • [Documentación](#-documentación) • [API](#-referencia-de-api) • [Contribuir](#-contribuir)

</div>

---

## Descripción General

Kreo es una plataforma de marketplace escalable de nivel empresarial que permite a múltiples vendedores vender productos a través de una tienda unificada. Construida con arquitectura moderna de microservicios, cuenta con pagos divididos automatizados, búsqueda de productos en tiempo real y herramientas completas de gestión para vendedores.

### Características Destacadas

- **Pagos Divididos Multi-Vendor**: Cálculo y distribución automatizada de comisiones vía Stripe Connect
- **Búsqueda en Tiempo Real**: Descubrimiento de productos potenciado por Elasticsearch con filtros facetados
- **Arquitectura de Microservicios**: Servicios escalables independientemente con NestJS
- **Stack Tecnológico Moderno**: React 18, TypeScript, Redux Toolkit, TailwindCSS
- **Listo para Producción**: Deployment con Docker/Kubernetes, monitoreo y observabilidad
- **Seguro por Diseño**: Autenticación JWT, 2FA, rate limiting, pagos conformes a PCI-DSS

---

## Características

### Para Clientes

- **Búsqueda Avanzada de Productos**: Búsqueda de texto completo con filtros (categoría, rango de precio, vendedor)
- **Carrito de Compras Inteligente**: Carrito multi-vendor con agrupación automática por vendedor
- **Checkout Seguro**: Procesamiento de pagos conforme a PCI con Stripe
- **Seguimiento de Órdenes**: Actualizaciones de estado en tiempo real y seguimiento de envíos
- **Cuentas de Usuario**: Gestión de perfil con soporte para 2FA

### Para Vendedores

- **Panel de Control**: Análisis completos y estadísticas de ventas
- **Gestión de Productos**: Operaciones CRUD con carga masiva por CSV
- **Control de Inventario**: Seguimiento de stock en tiempo real y alertas de stock bajo
- **Pagos Automatizados**: Transferencias bancarias directas vía Stripe Connect
- **Integración de Envíos**: Comparación de tarifas multi-carrier con Shippo

### Para Operadores de la Plataforma

- **Gestión de Comisiones**: Tasas de comisión configurables por vendedor
- **Onboarding de Vendedores**: Proceso KYC simplificado vía Stripe
- **Análisis y Reportes**: Seguimiento de ingresos, métricas de rendimiento de vendedores
- **Moderación de Contenido**: Flujos de aprobación de productos
- **API Gateway**: Rate limiting centralizado y enrutamiento de peticiones

---

## Inicio Rápido

### Prerequisitos

Antes de comenzar, asegúrate de tener:

- **Node.js** >= 18.0.0
- **Docker** & Docker Compose
- **Git**
- **Cuenta de Stripe** (para pagos)
- **Cuenta de AWS** (para almacenamiento de imágenes S3, opcional)

### 1. Clonar y Configurar

```bash
# Clonar el repositorio
git clone https://github.com/yourusername/kreo-marketplace.git
cd kreo-marketplace

# Copiar variables de entorno
cp .env.example .env

# Editar .env con tus claves de API
nano .env
```

### 2. Iniciar Infraestructura

```bash
# Iniciar PostgreSQL, Redis y Elasticsearch
docker-compose up -d postgres redis elasticsearch

# Verificar que los servicios estén saludables
docker-compose ps
```

### 3. Instalar Dependencias

```bash
# Instalar todas las dependencias del workspace
npm install
```

### 4. Iniciar Desarrollo

```bash
# Iniciar todos los servicios concurrentemente
npm run dev

# O iniciar servicios individuales
npm run dev:gateway    # API Gateway (puerto 3000)
npm run dev:auth       # Servicio de Auth (puerto 3001)
npm run dev:product    # Servicio de Productos (puerto 3004)
npm run dev:order      # Servicio de Órdenes (puerto 3005)
npm run dev:payment    # Servicio de Pagos (puerto 3006)
npm run dev:customer   # App de Cliente (puerto 5173)
npm run dev:vendor-portal  # Portal de Vendedor (puerto 5174)
```

### 5. Acceder a las Aplicaciones

- **App de Cliente**: http://localhost:5173
- **Portal de Vendedor**: http://localhost:5174
- **API Gateway**: http://localhost:3000
- **Estado de API**: http://localhost:3000/health

Para instrucciones detalladas de instalación, ver [SETUP.md](./SETUP.md).

---

## Arquitectura

### Descripción General del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway :3000                         │
│           (Rate Limiting, Enrutamiento, CORS)                │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼────────┐ ┌─────▼──────┐
│ Servicio Auth  │ │  Productos  │ │  Órdenes   │
│  Puerto: 3001  │ │ Puerto: 3004│ │ Puerto:3005│
│ • JWT/2FA      │ │ • Búsqueda  │ │ • Carrito  │
│ • OAuth2       │ │ • Inventario│ │ • Checkout │
└────────────────┘ └─────────────┘ └────────────┘

┌────────────────┐ ┌─────────────┐ ┌─────────────┐
│Servicio Pagos  │ │  Vendedores │ │   Envíos    │
│  Puerto: 3006  │ │ Puerto: 3003│ │ Puerto: 3007│
│ • Stripe       │ │ • Analytics │ │ • Shippo    │
│ • Pago Dividido│ │ • KYC       │ │ • Tracking  │
└────────────────┘ └─────────────┘ └─────────────┘

┌─────────────────────────────────────────────────┐
│              Capa de Infraestructura             │
│  PostgreSQL | Redis | Elasticsearch | AWS S3    │
└─────────────────────────────────────────────────┘
```

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Redux Toolkit, TailwindCSS |
| **API Gateway** | Express.js, http-proxy-middleware, express-rate-limit |
| **Microservicios** | NestJS, TypeORM, Passport.js |
| **Base de Datos** | PostgreSQL 15 |
| **Motor de Búsqueda** | Elasticsearch 8 |
| **Caché** | Redis 7 (Sesiones, Carrito) |
| **Cola** | BullMQ + Redis |
| **Pagos** | Stripe Connect SDK |
| **Almacenamiento** | AWS S3 |
| **Envíos** | Shippo API |
| **Notificaciones** | SendGrid, Twilio |
| **Contenedores** | Docker, Docker Compose |
| **Orquestación** | Kubernetes (EKS/GKE) |

Para documentación detallada de arquitectura, ver [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Servicios

| Servicio | Puerto | Descripción | Características Clave |
|---------|------|-------------|--------------|
| **API Gateway** | 3000 | Punto de entrada principal | Rate limiting, enrutamiento proxy, CORS |
| **Servicio Auth** | 3001 | Autenticación y Autorización | JWT, 2FA (TOTP), OAuth2, Refresh tokens |
| **Servicio Usuarios** | 3002 | Gestión de usuarios | CRUD de perfil, preferencias |
| **Servicio Vendedores** | 3003 | Onboarding de vendedores | KYC, Stripe Connect, analytics |
| **Servicio Productos** | 3004 | Catálogo de productos | CRUD, indexación Elasticsearch, carga masiva |
| **Servicio Órdenes** | 3005 | Procesamiento de órdenes | Carrito multi-vendor, checkout, seguimiento |
| **Servicio Pagos** | 3006 | Procesamiento de pagos | Pagos divididos, webhooks Stripe, payouts |
| **Servicio Envíos** | 3007 | Gestión de envíos | Tarifas multi-carrier, generación de etiquetas |
| **Servicio Notificaciones** | 3008 | Comunicación | Email (SendGrid), SMS (Twilio) |

---

## Referencia de API

### Autenticación

```bash
# Registrar nuevo usuario
POST /api/auth/register
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "ContraseñaSegura123",
  "role": "customer",
  "first_name": "Juan",
  "last_name": "Pérez"
}

# Iniciar sesión
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "ContraseñaSegura123"
}

# Obtener usuario actual
GET /api/auth/me
Authorization: Bearer {token}
```

### Productos

```bash
# Buscar productos
GET /api/products/search?q=laptop&min_price=500&max_price=2000&category=electronics&sort=price_asc&page=1&limit=20

# Obtener detalles del producto
GET /api/products/:id

# Crear producto (solo vendedor)
POST /api/products
Authorization: Bearer {vendor_token}
Content-Type: application/json

{
  "title": "MacBook Pro 14",
  "description": "Chip M3 Pro, 18GB RAM",
  "base_price": 1999.99,
  "inventory_quantity": 50,
  "category_id": "electronics-uuid",
  "tags": ["laptop", "apple", "macbook"],
  "status": "active"
}

# Carga masiva
POST /api/products/bulk-upload
Authorization: Bearer {vendor_token}
Content-Type: multipart/form-data

file: productos.csv
```

### Carrito y Órdenes

```bash
# Agregar al carrito
POST /api/cart/add
Authorization: Bearer {token}
Content-Type: application/json

{
  "product_id": "product-uuid",
  "quantity": 2
}

# Obtener carrito
GET /api/cart
Authorization: Bearer {token}

# Checkout
POST /api/orders/checkout
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "cliente@example.com",
  "shipping_address": {
    "first_name": "María",
    "last_name": "González",
    "address_line1": "Calle Principal 123",
    "city": "Madrid",
    "state": "Madrid",
    "postal_code": "28001",
    "country_code": "ES"
  },
  "billing_address": { ... },
  "shipping_methods": {
    "vendor-uuid-1": "standard",
    "vendor-uuid-2": "express"
  }
}

# Obtener órdenes del usuario
GET /api/orders/user/:userId
Authorization: Bearer {token}
```

### Pagos

```bash
# Crear intención de pago
POST /api/payments/create-intent
Content-Type: application/json

{
  "order_id": "order-uuid",
  "amount": 31500,  // centavos
  "currency": "usd"
}

# Endpoint webhook de Stripe
POST /api/payments/webhooks
Stripe-Signature: {signature}

# Obtener pagos del vendedor
GET /api/payments/vendor/:vendorId/payouts
Authorization: Bearer {vendor_token}
```

Para documentación completa de la API, ver [API.md](./API.md).

---

## Desarrollo

### Estructura del Proyecto

```
kreo-marketplace/
├── api-gateway/              # API Gateway Express
├── services/                 # Microservicios
│   ├── auth-service/         # Autenticación
│   ├── product-service/      # Catálogo de productos
│   ├── order-service/        # Procesamiento de órdenes
│   ├── payment-service/      # Manejo de pagos
│   ├── vendor-service/       # Gestión de vendedores
│   ├── shipping-service/     # Integración de envíos
│   └── notification-service/ # Email/SMS
├── frontend/
│   ├── customer-app/         # App React para clientes
│   └── vendor-portal/        # Panel de vendedores
├── shared/
│   ├── types/                # Tipos TypeScript compartidos
│   └── database/             # Migraciones y seeds de BD
├── infrastructure/
│   └── kubernetes/           # Manifiestos K8s
├── docker-compose.yml        # Desarrollo local
├── .env.example              # Plantilla de variables de entorno
└── README.md                 # Este archivo
```

### Scripts Disponibles

```bash
# Desarrollo
npm run dev                   # Iniciar todos los servicios
npm run dev:auth              # Iniciar solo servicio auth
npm run dev:gateway           # Iniciar solo API gateway
npm run dev:customer          # Iniciar app de cliente
npm run dev:vendor-portal     # Iniciar portal de vendedor

# Build
npm run build                 # Build de todos los workspaces

# Testing
npm test                      # Ejecutar todas las pruebas
npm run test:watch            # Modo watch
npm run test:cov              # Reporte de cobertura

# Base de Datos
npm run db:migrate            # Ejecutar migraciones
npm run db:seed               # Poblar base de datos

# Docker
npm run docker:up             # Iniciar todo con Docker
npm run docker:down           # Detener servicios Docker
```

### Variables de Entorno

Variables de entorno clave (ver `.env.example` para lista completa):

```bash
# Base de Datos
DATABASE_URL=postgresql://kreo:password@localhost:5432/kreo_db

# Redis y Elasticsearch
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# Secretos JWT
JWT_SECRET=tu_secreto_jwt_aqui
JWT_REFRESH_SECRET=tu_secreto_refresh_aqui

# Stripe (requerido para pagos)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# AWS S3 (para imágenes de productos)
AWS_REGION=us-east-1
AWS_S3_BUCKET=kreo-marketplace-products
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Email y SMS
SENDGRID_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Envíos
SHIPPO_API_KEY=...
```

---

## Testing

### Pruebas Unitarias

```bash
# Ejecutar pruebas para todos los servicios
npm test

# Probar servicio específico
cd services/auth-service
npm test

# Reporte de cobertura
npm run test:cov
```

### Pruebas de Integración

```bash
# Iniciar entorno de pruebas
docker-compose -f docker-compose.test.yml up -d

# Ejecutar pruebas de integración
npm run test:e2e
```

### Pruebas de Carga

```bash
# Instalar k6
brew install k6

# Ejecutar prueba de carga
k6 run tests/load/checkout-flow.js
```

---

## Deployment

### Deployment con Docker

```bash
# Build de imágenes de producción
docker-compose -f docker-compose.prod.yml build

# Iniciar stack de producción
docker-compose -f docker-compose.prod.yml up -d
```

### Deployment con Kubernetes

```bash
# Aplicar manifiestos de Kubernetes
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/

# Verificar deployment
kubectl get pods -n kreo-marketplace
kubectl get services -n kreo-marketplace

# Revisar logs
kubectl logs -f deployment/auth-service -n kreo-marketplace
```

### Pipeline CI/CD

El proyecto incluye workflows de GitHub Actions para:

- **Integración Continua**: Ejecutar pruebas, linting, escaneos de seguridad
- **Build & Push**: Construir imágenes Docker y push a ECR/GCR
- **Deploy a Staging**: Auto-deploy al hacer merge a `develop`
- **Deploy a Producción**: Requiere aprobación manual

Para instrucciones detalladas de deployment, ver [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Documentación

- [SETUP.md](./SETUP.md) - Guía detallada de instalación y configuración
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del sistema y decisiones de diseño
- [API.md](./API.md) - Documentación completa de la API
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guía de deployment a producción
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guías de contribución

---

## Seguridad

### Características de Seguridad

- **Autenticación**: JWT con RS256, refresh tokens (30 días de expiración)
- **Autenticación de Dos Factores**: 2FA basado en TOTP con Speakeasy
- **Seguridad de Contraseñas**: Hash con Bcrypt con 12 salt rounds
- **Rate Limiting**: 1000 peticiones/minuto por IP
- **Validación de Entrada**: class-validator con whitelisting
- **Prevención de SQL Injection**: Consultas parametrizadas de TypeORM
- **Protección XSS**: Headers de Content Security Policy
- **CORS**: Configuración CORS específica por entorno
- **Seguridad de Pagos**: Conforme a PCI-DSS Nivel 1 (delegado a Stripe)

### Mejores Prácticas de Seguridad

- Nunca hacer commit de archivos `.env`
- Rotar secretos JWT regularmente
- Usar contraseñas fuertes para base de datos y Redis
- Habilitar SSL/TLS en producción
- Actualizar dependencias regularmente (`npm audit`)
- Monitorear webhooks de Stripe por anomalías

### Reporte de Vulnerabilidades

Si descubres una vulnerabilidad de seguridad, envía un email a security@kreo.com. No abras un issue público.

---

## Rendimiento

### Benchmarks

- **Latencia de API**: P95 < 500ms
- **Latencia de Búsqueda**: P95 < 200ms
- **Throughput**: > 1000 peticiones/segundo
- **Conexiones de BD**: Connection pooling con PgBouncer
- **Ratio de Aciertos de Caché**: > 80% (Redis)

### Monitoreo

- **Métricas**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger para tracing distribuido
- **Alertas**: Integración con PagerDuty para issues críticos

---

## Contribuir

¡Damos la bienvenida a contribuciones! Por favor ver [CONTRIBUTING.md](./CONTRIBUTING.md) para:

- Código de Conducta
- Workflow de desarrollo
- Estándares de código
- Proceso de pull request
- Plantillas de issues

### Guía Rápida de Contribución

1. Hacer fork del repositorio
2. Crear una rama de feature (`git checkout -b feature/caracteristica-increible`)
3. Hacer commit de tus cambios (`git commit -m 'feat: agregar característica increíble'`)
4. Push a la rama (`git push origin feature/caracteristica-increible`)
5. Abrir un Pull Request

---

## Roadmap

### Q1 2025

- [ ] Soporte multi-idioma (i18n)
- [ ] Soporte Progressive Web App (PWA)
- [ ] Panel de analytics avanzado
- [ ] Niveles de suscripción para vendedores

### Q2 2025

- [ ] Apps móviles (React Native)
- [ ] Recomendaciones de productos con IA
- [ ] Soporte de chat en vivo
- [ ] Integración con redes sociales

### Q3 2025

- [ ] API de Marketplace para desarrolladores externos
- [ ] Detección avanzada de fraude
- [ ] Soporte multi-moneda
- [ ] Productos de suscripción

---

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## Soporte

- **Documentación**: https://docs.kreo.com
- **GitHub Issues**: https://github.com/yourusername/kreo-marketplace/issues
- **Email**: support@kreo.com
- **Discord**: https://discord.gg/kreo-marketplace

---

## Agradecimientos

- Construido con [NestJS](https://nestjs.com/)
- Potenciado por [Stripe Connect](https://stripe.com/connect)
- Búsqueda por [Elasticsearch](https://www.elastic.co/)
- Desplegado en [Kubernetes](https://kubernetes.io/)

---

<div align="center">

**Hecho con ❤️ por el Equipo de Kreo**

[Sitio Web](https://kreo.com) • [Twitter](https://twitter.com/kreo) • [LinkedIn](https://linkedin.com/company/kreo)

</div>
