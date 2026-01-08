# INFORME DE FUNCIONALIDAD DEL PROYECTO KREO MARKETPLACE

## Descripción General del Proyecto

**Kreo Marketplace** es una plataforma de comercio electrónico multi-vendor B2C (Business-to-Consumer) que permite a múltiples vendedores listar sus productos y a los clientes comprarlos en una sola transacción. El sistema se divide automáticamente los pagos entre vendedores, aplicando comisiones de plataforma.

**Arquitectura:** Microservicios con NestJS (backend) y React (frontend)
**Base de Datos:** PostgreSQL con TypeORM
**Caché/Sesiones:** Redis
**Búsqueda:** Elasticsearch
**Pagos:** Stripe Connect
**Containerización:** Docker y Docker Compose

---

## 📁 ESTRUCTURA DE CARPETAS Y ARCHIVOS

### 1. ARCHIVOS DE CONFIGURACIÓN RAÍZ

#### 📄 `/package.json`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/package.json`

**Funcionalidad:**
- Configuración principal del monorepo usando npm workspaces
- Define scripts para desarrollo, compilación y testing de todos los servicios
- Scripts de Docker para levantar/bajar contenedores
- Scripts de base de datos (migraciones, seeds)
- Permite ejecutar todos los microservicios en paralelo con `concurrently`

**Scripts principales:**
- `npm run dev` - Inicia todos los servicios en modo desarrollo
- `npm run docker:up` - Levanta todos los contenedores Docker
- `npm run build` - Compila todos los workspaces
- `npm run test` - Ejecuta tests de todos los módulos

---

#### 📄 `/docker-compose.yml`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/docker-compose.yml`

**Funcionalidad:**
- Orquestación de contenedores para el entorno de desarrollo
- Define 3 servicios de infraestructura:
  - **PostgreSQL 15** - Base de datos principal (puerto 5432)
  - **Redis 7** - Caché y gestión de sesiones (puerto 6379)
  - **Elasticsearch 8** - Motor de búsqueda (puertos 9200, 9300)
- Define 8 microservicios backend:
  - Auth Service (puerto 3001)
  - User Service (puerto 3002)
  - Vendor Service (puerto 3003)
  - Product Service (puerto 3004)
  - Order Service (puerto 3005)
  - Payment Service (puerto 3006)
  - Shipping Service (puerto 3007)
  - Notification Service (puerto 3008)
- Define API Gateway (puerto 3000)
- Define 2 aplicaciones frontend:
  - Customer App (puerto 5173)
  - Vendor Portal (puerto 5174)
- Configura health checks y dependencias entre servicios
- Volumenes persistentes para datos de PostgreSQL, Redis y Elasticsearch
- Red interna `kreo-network` para comunicación entre contenedores

---

#### 📄 `/.env.example`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/.env.example`

**Funcionalidad:**
- Plantilla de variables de entorno para configuración del proyecto
- URLs de bases de datos y servicios
- Configuración de JWT (access y refresh tokens)
- Claves de APIs externas:
  - Stripe (pagos)
  - AWS S3 (almacenamiento de imágenes)
  - SendGrid (emails)
  - Twilio (SMS)
  - Shippo (envíos)
- Configuración de seguridad:
  - Rate limiting
  - CORS allowed origins
  - Session secrets
  - IP blocking

**Importante:** Incluye instrucciones para generar secrets seguros con OpenSSL

---

### 2. API GATEWAY

#### 📄 `/api-gateway/src/index.ts`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/api-gateway/src/index.ts`

**Funcionalidad:**
- **Punto único de entrada** para todas las peticiones del cliente
- Enruta peticiones a los microservicios correspondientes usando http-proxy-middleware
- Implementa CORS para permitir peticiones desde frontends autorizados
- Implementa rate limiting global (1000 requests/minuto por IP)
- Endpoints proxy:
  - `/api/auth` → Auth Service
  - `/api/users` → User Service
  - `/api/vendors` → Vendor Service
  - `/api/products` → Product Service
  - `/api/orders` → Order Service
  - `/api/cart` → Order Service
  - `/api/payments` → Payment Service
  - `/api/shipping` → Shipping Service
- Endpoint `/health` para monitoreo del estado del gateway
- Manejo de errores centralizado (404, 500)
- Reescritura de rutas automática

---

### 3. SERVICIOS BACKEND (Microservicios)

#### 📂 `/services/auth-service/`

##### 📄 `src/main.ts`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/services/auth-service/src/main.ts`

**Funcionalidad:**
- Bootstrap del servicio de autenticación con NestJS
- Configuración de seguridad global:
  - **Helmet** - Headers de seguridad (CSP, HSTS, X-Frame-Options, etc.)
  - **Cookie Parser** - Lectura de cookies HTTP-Only
  - **CORS** - Configuración diferenciada por entorno (producción/desarrollo)
  - **ValidationPipe** - Sanitización automática de DTOs
- Deshabilita header `X-Powered-By` para ocultar tecnología
- Escucha en puerto 3001

---

##### 📄 `src/auth/auth.controller.ts`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/services/auth-service/src/auth/auth.controller.ts`

**Funcionalidad:**
- **Endpoints de autenticación y autorización:**

1. **POST /auth/register**
   - Registro de nuevos usuarios
   - Rate limited: 3 registros por hora por IP
   - Sanitiza datos con RegisterDto

2. **POST /auth/login**
   - Autenticación de usuarios
   - Rate limited: 5 intentos por minuto por IP
   - Almacena JWT en cookies HTTP-Only (NO en localStorage)
   - Emite access token (15 min) y refresh token (7 días)
   - Devuelve solo info del usuario (tokens en cookies)

3. **POST /auth/refresh**
   - Renueva access token usando refresh token
   - Lee refresh token desde cookie HTTP-Only

4. **POST /auth/logout**
   - Cierra sesión del usuario
   - Limpia cookies de sesión
   - Requiere autenticación (JwtAuthGuard)

5. **GET /auth/me**
   - Obtiene perfil del usuario autenticado
   - Requiere autenticación

6. **POST /auth/2fa/enable**
   - Habilita autenticación de dos factores

7. **POST /auth/2fa/verify**
   - Verifica código 2FA

8. **POST /auth/verify-token**
   - Verifica validez de un token JWT

**Seguridad implementada:**
- Rate limiting por endpoint
- Cookies HTTP-Only y Secure
- Protección contra fuerza bruta
- Guards de autenticación y autorización

---

#### 📂 `/services/product-service/`

##### 📄 `src/product/product.service.ts`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/services/product-service/src/product/product.service.ts`

**Funcionalidad:**
- **Gestión completa de productos:**

1. **createProduct(vendorId, productData)**
   - Crea nuevo producto
   - Sanitiza título y descripción con XSSSanitizer
   - Genera slug SEO-friendly automáticamente
   - Indexa en Elasticsearch si está activo

2. **updateProduct(productId, vendorId, updateData)**
   - Actualiza producto existente
   - Verifica ownership (solo el vendor puede actualizar)
   - Re-sanitiza campos modificados
   - Actualiza índice en Elasticsearch

3. **deleteProduct(productId, vendorId)**
   - Soft delete del producto
   - Elimina del índice de Elasticsearch

4. **searchProducts(query)**
   - Búsqueda full-text con Elasticsearch
   - Filtros: categoría, rango de precio, vendor, tags
   - Ordenamiento: relevancia, precio, fecha
   - Agregaciones (facets): categorías, rangos de precio
   - Fallback a PostgreSQL si Elasticsearch falla
   - Paginación segura

5. **bulkUpload(vendorId, products)**
   - Carga masiva de productos
   - Manejo de errores individual por producto

**Características:**
- Integración dual: PostgreSQL + Elasticsearch
- Sanitización XSS automática
- Prevención de SQL injection con TypeORM
- Generación automática de slugs
- Conteo de vistas (analytics)

---

#### 📂 `/services/order-service/`

##### 📄 `src/order/order.service.ts`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/services/order-service/src/order/order.service.ts`

**Funcionalidad:**
- **Gestión de órdenes multi-vendor:**

1. **createOrder(userId, checkoutData)**
   - Crea orden desde el carrito
   - Divide automáticamente en sub-órdenes por vendor
   - Calcula comisiones de plataforma (10%)
   - Calcula payout para cada vendor
   - Crea Payment Intent en Stripe
   - Limpia el carrito tras orden exitosa
   - Rollback si falla el pago

2. **confirmPayment(orderId)**
   - Confirma pago recibido
   - Ejecuta transferencias a cuentas Stripe de vendedores
   - Actualiza estado de orden y sub-órdenes
   - Marca sub-órdenes como "processing"

3. **getUserOrders(userId)**
   - Lista órdenes del usuario
   - Solo devuelve órdenes del usuario autenticado (seguro)
   - Ordenadas por fecha descendente

4. **getOrderDetails(orderId, userId, userRole)**
   - Obtiene detalles completos de una orden
   - **Verificación de ownership:** solo el dueño o admin pueden ver
   - Incluye sub-órdenes e items

**Modelo de datos:**
- **Order** - Orden maestra del cliente
- **SubOrder** - Orden por vendor (con comisiones y payouts)
- **OrderItem** - Items individuales de productos

**Estados de orden:**
- pending → processing → paid → shipped → delivered
- cancelled (puede ocurrir en cualquier momento)

---

### 4. MÓDULOS DE SEGURIDAD COMPARTIDOS

#### 📂 `/shared/security/`

##### 📄 `rate-limiter.ts`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/shared/security/rate-limiter.ts`

**Funcionalidad:**
- **Rate limiting con Redis para prevenir ataques de fuerza bruta**

**Componentes:**

1. **RateLimitGuard**
   - Guard de NestJS que limita peticiones por endpoint
   - Usa Redis para contador distribuido
   - Configurable: max peticiones, ventana de tiempo
   - Agrega headers X-RateLimit-* en respuestas

2. **RateLimiter (clase helper)**
   - `checkLimit()` - Verifica si se excedió el límite
   - `blockIP()` - Bloquea IP temporalmente
   - `isIPBlocked()` - Verifica si IP está bloqueada
   - `incrementFailedAttempts()` - Contador de intentos fallidos
   - `resetFailedAttempts()` - Resetea contador tras login exitoso

3. **Decoradores predefinidos:**
   - `@LoginRateLimit()` - 5 intentos por minuto
   - `@RegisterRateLimit()` - 3 registros por hora
   - `@PasswordResetRateLimit()` - 3 intentos por hora
   - `@APIRateLimit()` - 100 requests por minuto

**Configuración:**
- Key por IP + ruta
- TTL automático en Redis
- Headers informativos para cliente

---

##### 📄 `xss-sanitizer.ts`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/shared/security/xss-sanitizer.ts`

**Funcionalidad:**
- **Sanitización de entrada para prevenir ataques XSS**

**Métodos principales:**

1. **sanitizeText(text, maxLength)**
   - Elimina TODO el HTML
   - Modo más seguro para texto plano

2. **sanitizeHTML(html, config)**
   - Permite HTML básico de formato
   - Whitelist de tags permitidos
   - Whitelist de atributos por tag
   - Elimina scripts, iframes, eventos inline
   - Elimina `javascript:`, `data:` de URLs

3. **Métodos específicos:**
   - `sanitizeProductDescription()` - Para descripciones (permite formato)
   - `sanitizeReview()` - Para reseñas de usuarios
   - `sanitizeComment()` - Para comentarios (sin HTML)
   - `sanitizeTitle()` - Para títulos y nombres
   - `sanitizeURL()` - Valida que URLs sean seguras

4. **Decorador @Sanitize**
   - Aplica sanitización automáticamente en DTOs
   - Uso: `@Sanitize() description: string;`

**Patrones peligrosos eliminados:**
- `<script>`, `<iframe>`, `<object>`, `<embed>`
- `on*` eventos (onclick, onerror, etc.)
- `javascript:`, `data:text/html`
- `<style>` tags

---

##### 📄 `secure-session.ts`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/shared/security/secure-session.ts`

**Funcionalidad:**
- **Gestión segura de sesiones y cookies**

**Clases principales:**

1. **SecureSession**
   - `setAccessTokenCookie()` - Almacena access token en cookie HTTP-Only
   - `setRefreshTokenCookie()` - Almacena refresh token
   - `clearSessionCookies()` - Limpia cookies en logout
   - Configuración de cookies:
     - **httpOnly: true** - No accesible desde JavaScript (previene XSS)
     - **secure: true** - Solo HTTPS en producción
     - **sameSite: 'strict'** - Previene CSRF
   - JWT Config:
     - Access Token: 15 minutos de vida
     - Refresh Token: 7 días de vida

2. **SecureCORS**
   - `getProductionCORSOptions()` - CORS estricto para producción
   - `getDevelopmentCORSOptions()` - CORS permisivo para desarrollo
   - Whitelist de dominios permitidos

3. **SecurityHeaders**
   - `getHelmetOptions()` - Configuración de Helmet
   - Headers implementados:
     - Content Security Policy (CSP)
     - HTTP Strict Transport Security (HSTS)
     - X-Frame-Options (previene clickjacking)
     - X-Content-Type-Options (previene MIME sniffing)
     - X-XSS-Protection
     - Referrer-Policy

4. **TokenValidator**
   - `isTokenBlacklisted()` - Verifica si token está en lista negra
   - `blacklistToken()` - Agrega token a lista negra (logout)
   - `invalidateAllUserTokens()` - Invalida todos los tokens de un usuario
   - Usa Redis para almacenar blacklist

---

##### 📄 `sql-injection-prevention.ts`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/shared/security/sql-injection-prevention.ts`

**Funcionalidad:**
- **Prevención de inyecciones SQL/NoSQL**

**Clases principales:**

1. **InputValidator**
   - `isPositiveInteger()` - Valida enteros positivos (IDs, cantidades)
   - `isPositiveDecimal()` - Valida decimales positivos (precios)
   - `isValidUUID()` - Valida formato UUID
   - `isAlphanumericWithDashes()` - Para slugs, usernames
   - `isValidEmail()` - Valida formato de email
   - `sanitizeLikePattern()` - Escapa caracteres especiales de SQL LIKE
   - `isValidUUIDArray()` - Valida arrays de UUIDs
   - `limitArraySize()` - Previene DoS con arrays grandes

2. **SecureQueryBuilder**
   - `createLikeSearch()` - Crea búsqueda LIKE segura
   - `validatePagination()` - Valida page, limit, skip
   - `validateSortField()` - Valida campo de ordenamiento
   - `validateSortOrder()` - Valida dirección (ASC/DESC)

**Ejemplos de uso seguro:**
```typescript
// ❌ INSEGURO
const query = `SELECT * FROM products WHERE title LIKE '%${userInput}%'`;

// ✅ SEGURO
const products = await productRepository
  .createQueryBuilder('product')
  .where('product.title LIKE :search', {
    search: `%${InputValidator.sanitizeLikePattern(userInput)}%`
  })
  .getMany();
```

---

### 5. FRONTEND - CUSTOMER APP

#### 📂 `/frontend/customer-app/`

##### 📄 `src/App.tsx`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/frontend/customer-app/src/App.tsx`

**Funcionalidad:**
- Componente raíz de la aplicación de clientes
- Configuración del router con React Router DOM
- Layout global: Navbar + Main + Footer

**Rutas definidas:**
- `/` - Página de inicio (HomePage)
- `/products` - Catálogo de productos (ProductListPage)
- `/products/:id` - Detalle de producto (ProductDetailPage)
- `/cart` - Carrito de compras (CartPage)
- `/checkout` - Proceso de pago (CheckoutPage)
- `/login` - Inicio de sesión (LoginPage)
- `/register` - Registro de usuario (RegisterPage)
- `/orders` - Historial de pedidos (OrdersPage)

**Características:**
- Soporte para modo oscuro (dark mode)
- Diseño responsive con Tailwind CSS
- Navegación fluida entre páginas

---

##### 📄 Páginas del Frontend

**1. HomePage.tsx**
- Sección hero con llamado a la acción
- Productos destacados
- Categorías populares
- Banner promocional

**2. ProductListPage.tsx**
- Listado de productos con paginación
- Filtros laterales (categoría, precio, rating)
- Ordenamiento (relevancia, precio, nuevo)
- Búsqueda por texto

**3. ProductDetailPage.tsx**
- Información detallada del producto
- Galería de imágenes
- Selector de variantes (talla, color)
- Botón "Agregar al carrito"
- Reseñas de usuarios

**4. CartPage.tsx**
- Lista de items en el carrito
- Actualización de cantidades
- Eliminación de items
- Resumen de precios
- Botón "Proceder al checkout"

**5. CheckoutPage.tsx**
- Formulario de dirección de envío
- Formulario de dirección de facturación
- Integración con Stripe Elements para pago
- Resumen de la orden
- Confirmación de compra

**6. LoginPage.tsx**
- Formulario de inicio de sesión
- Validación de credenciales
- Link a recuperación de contraseña

**7. RegisterPage.tsx**
- Formulario de registro de usuario
- Validación de campos
- Términos y condiciones

**8. OrdersPage.tsx**
- Historial de órdenes del usuario
- Estado de cada orden
- Detalles de orden al hacer clic

---

##### 📄 Componentes Reutilizables

**1. Navbar.tsx**
- Barra de navegación fija superior
- Logo de la plataforma
- Barra de búsqueda
- Links a páginas principales
- Icono de carrito con contador
- Menú de usuario (login/logout)

**2. Footer.tsx**
- Información de la empresa
- Links a políticas (privacidad, términos)
- Redes sociales
- Newsletter

**3. ProductCard.tsx**
- Tarjeta de producto con imagen
- Título y precio
- Rating de estrellas
- Botón "Ver más" o "Agregar al carrito"

**4. HeroSection.tsx**
- Sección principal de HomePage
- Imagen de fondo
- Título y subtítulo
- Call-to-action button

**5. FilterSidebar.tsx**
- Sidebar de filtros en ProductListPage
- Checkboxes de categorías
- Slider de rango de precio
- Filtro por rating

**6. LoadingSkeleton.tsx**
- Placeholders animados durante carga
- Mejora UX mientras se cargan datos

---

### 6. BASE DE DATOS

#### 📄 `/shared/database/init.sql`
**Ruta:** `/home/vboxuser/Documents/kreo-marketplace/shared/database/init.sql`

**Funcionalidad:**
- Script de inicialización de base de datos PostgreSQL
- Se ejecuta automáticamente al crear el contenedor
- Crea esquema base de datos
- Crea tablas principales:
  - users
  - vendors
  - products
  - product_variants
  - categories
  - orders
  - sub_orders
  - order_items
  - payments
  - reviews
  - cart
  - cart_items
- Define relaciones entre tablas
- Crea índices para optimizar consultas

---

### 7. INFRAESTRUCTURA

#### 📂 `/infrastructure/kubernetes/`

**Archivos de configuración Kubernetes:**

**1. namespace.yaml**
- Define namespace `kreo-marketplace` para aislar recursos

**2. postgres-deployment.yaml**
- Deployment de PostgreSQL en Kubernetes
- Service para exponer base de datos
- PersistentVolumeClaim para datos

**3. redis-deployment.yaml**
- Deployment de Redis en Kubernetes
- Service para exponer Redis
- PersistentVolumeClaim para datos

**Uso:** Para despliegue en producción con Kubernetes

---

### 8. DOCUMENTACIÓN

#### 📂 `/documentos/`

**Estructura de documentación:**

**1. /api/**
- `GUIA-API-COMPLETA.md` - Documentación completa de todos los endpoints

**2. /manuales/**
- `MANUAL-ADMINISTRADOR.md` - Guía para administradores
- `MANUAL-USUARIO-CLIENTE.md` - Guía para clientes
- `MANUAL-VENDEDOR.md` - Guía para vendedores

**3. /parches-seguridad/**
- `README-PARCHES-SEGURIDAD.md` - Información sobre parches aplicados
- `EJEMPLO-APLICAR-PARCHE-*.md` - Tutoriales de aplicación
- `INSTALACION-RAPIDA.md` - Guía rápida de instalación
- `verificar-parches.sh` - Script para verificar parches instalados

**4. /tecnica/**
- `ARQUITECTURA-SISTEMA.md` - Arquitectura del sistema
- `BASE-DATOS.md` - Esquema de base de datos
- `GUIA-INSTALACION.md` - Instalación paso a paso

---

## 🔒 CARACTERÍSTICAS DE SEGURIDAD IMPLEMENTADAS

### 1. Prevención de XSS (Cross-Site Scripting)
- ✅ Sanitización automática de entrada de usuarios
- ✅ Cookies HTTP-Only (tokens no accesibles desde JavaScript)
- ✅ Content Security Policy (CSP)
- ✅ Escapado de HTML en templates

### 2. Prevención de SQL Injection
- ✅ Uso de TypeORM con prepared statements
- ✅ Validación estricta de tipos de entrada
- ✅ Sanitización de patrones LIKE
- ✅ Whitelist de campos para ordenamiento

### 3. Prevención de CSRF (Cross-Site Request Forgery)
- ✅ Cookies con SameSite=strict
- ✅ Verificación de origin en CORS
- ✅ Tokens CSRF (si se implementa)

### 4. Rate Limiting
- ✅ Límite de intentos de login (5/minuto)
- ✅ Límite de registros (3/hora)
- ✅ Rate limiting global en API Gateway
- ✅ Bloqueo temporal de IPs sospechosas

### 5. Autenticación y Autorización
- ✅ JWT con refresh tokens
- ✅ Access tokens de corta duración (15 min)
- ✅ Refresh tokens de larga duración (7 días)
- ✅ Blacklist de tokens invalidados
- ✅ Verificación de ownership en recursos
- ✅ Guards de roles (admin, vendor, customer)
- ✅ 2FA opcional

### 6. Headers de Seguridad
- ✅ Helmet implementado en todos los servicios
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ X-Frame-Options (previene clickjacking)
- ✅ X-Content-Type-Options (previene MIME sniffing)
- ✅ Referrer-Policy

---

## 🚀 FLUJOS PRINCIPALES DEL SISTEMA

### Flujo de Compra Multi-Vendor

1. **Cliente navega productos**
   - Búsqueda con Elasticsearch
   - Filtros por categoría, precio
   - Ve productos de múltiples vendedores

2. **Agregar al carrito**
   - CartService agrupa items por vendor
   - Calcula subtotales por vendor
   - Estima costos de envío

3. **Checkout**
   - Cliente ingresa direcciones
   - OrderService crea:
     - 1 orden maestra
     - N sub-órdenes (una por vendor)
   - Calcula comisiones (10% default)
   - Calcula payout para cada vendor

4. **Pago**
   - PaymentService crea Payment Intent en Stripe
   - Cliente confirma pago (Stripe Elements)
   - Stripe retiene fondos

5. **Confirmación**
   - OrderService confirma pago
   - Ejecuta transferencias a vendors
   - Cada vendor recibe su payout (90% del subtotal)
   - Kreo retiene comisión (10%)

6. **Cumplimiento**
   - Cada vendor procesa su sub-orden
   - Actualiza estado: processing → shipped → delivered
   - NotificationService notifica al cliente

---

### Flujo de Autenticación

1. **Registro**
   - POST /auth/register
   - Rate limited: 3/hora
   - Valida email único
   - Hashea contraseña con bcrypt
   - Crea usuario en BD

2. **Login**
   - POST /auth/login
   - Rate limited: 5/minuto
   - Verifica credenciales
   - Genera access token (15 min)
   - Genera refresh token (7 días)
   - Almacena en cookies HTTP-Only

3. **Acceso a recursos protegidos**
   - Cliente envía cookies automáticamente
   - JwtAuthGuard valida access token
   - Si expiró, frontend usa refresh token
   - Si refresh token válido, emite nuevo access token

4. **Logout**
   - POST /auth/logout
   - Limpia cookies
   - Opcionalmente agrega token a blacklist

---

## 📊 MODELO DE DATOS PRINCIPAL

### Entidades Clave

**Users**
- id, email, password_hash, role (customer/vendor/admin)
- Relación: 1 usuario → N órdenes

**Vendors**
- id, user_id, business_name, stripe_account_id
- Relación: 1 vendor → N productos

**Products**
- id, vendor_id, title, description, base_price, status
- Relación: 1 producto → N variantes

**Orders**
- id, user_id, order_number, grand_total, payment_status
- Relación: 1 orden → N sub-órdenes

**SubOrders**
- id, order_id, vendor_id, total, commission_amount, vendor_payout
- Relación: 1 sub-orden → N items

**OrderItems**
- id, sub_order_id, product_id, quantity, unit_price, total_price

---

## 🛠️ TECNOLOGÍAS UTILIZADAS

### Backend
- **NestJS** - Framework Node.js para microservicios
- **TypeORM** - ORM para PostgreSQL
- **PostgreSQL** - Base de datos relacional
- **Redis** - Caché y sesiones
- **Elasticsearch** - Motor de búsqueda full-text
- **Stripe** - Procesamiento de pagos

### Frontend
- **React 18** - Biblioteca UI
- **React Router DOM** - Navegación
- **Tailwind CSS** - Estilos utility-first
- **Vite** - Build tool

### DevOps
- **Docker** - Containerización
- **Docker Compose** - Orquestación local
- **Kubernetes** - Orquestación en producción

### Seguridad
- **Helmet** - Headers de seguridad
- **bcrypt** - Hash de contraseñas
- **jsonwebtoken** - JWT
- **ioredis** - Cliente Redis para rate limiting

---

## 📈 ESCALABILIDAD Y RENDIMIENTO

### Estrategias Implementadas

1. **Caché con Redis**
   - Sesiones de usuario
   - Rate limiting
   - Token blacklist

2. **Búsqueda con Elasticsearch**
   - Búsqueda full-text rápida
   - Facets y agregaciones
   - Fallback a PostgreSQL

3. **Microservicios Independientes**
   - Cada servicio puede escalarse individualmente
   - Comunicación via HTTP (REST)
   - Event-driven architecture (futuro)

4. **Paginación**
   - Todos los listados con paginación
   - Límite máximo de resultados

5. **Índices en Base de Datos**
   - Índices en campos frecuentemente consultados
   - Índices compuestos para queries comunes

---

## 🔮 PRÓXIMAS MEJORAS SUGERIDAS

1. **WebSockets para notificaciones en tiempo real**
2. **Event-driven architecture con RabbitMQ/Kafka**
3. **GraphQL para frontend (Apollo)**
4. **Server-Side Rendering (Next.js)**
5. **CI/CD con GitHub Actions**
6. **Monitoreo con Prometheus + Grafana**
7. **Logs centralizados con ELK Stack**
8. **Tests automatizados (unit, integration, e2e)**
9. **CDN para imágenes de productos**
10. **Internacionalización (i18n)**

---

## 📞 CONTACTO Y SOPORTE

Para más información sobre este proyecto, consultar la documentación en la carpeta `/documentos/` o contactar al equipo de desarrollo.

---

**Fecha de generación del informe:** 2025-12-12
**Versión del proyecto:** 1.0.0
**Generado automáticamente por Claude Code**
