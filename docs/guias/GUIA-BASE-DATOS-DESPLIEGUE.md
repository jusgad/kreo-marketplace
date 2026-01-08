# GUÍA COMPLETA DE BASE DE DATOS Y DESPLIEGUE
## Kreo Marketplace

---

## 📊 RESUMEN DE TABLAS NECESARIAS

### Total: **21 TABLAS** organizadas en 8 categorías

| # | Categoría | Tablas | Cantidad |
|---|-----------|--------|----------|
| 1 | **Usuarios y Autenticación** | users, oauth_connections | 2 |
| 2 | **Vendedores** | vendors, addresses | 2 |
| 3 | **Productos** | categories, products, product_variants | 3 |
| 4 | **Reseñas** | reviews | 1 |
| 5 | **Órdenes** | orders, sub_orders, order_items | 3 |
| 6 | **Pagos** | vendor_payouts | 1 |
| 7 | **Envíos** | shipping_zones, shipping_rates | 2 |
| 8 | **Descuentos y Sistema** | discount_codes, notifications, activity_logs | 3 |

---

## 🗂️ DETALLE DE CADA TABLA

### 1️⃣ USUARIOS Y AUTENTICACIÓN

#### **Tabla: `users`**
**Propósito:** Almacena todos los usuarios del sistema (clientes, vendedores, admins)

**Campos principales:**
- `id` (UUID) - Identificador único
- `email` (VARCHAR) - Email único para login
- `password_hash` (VARCHAR) - Contraseña encriptada con bcrypt
- `role` (VARCHAR) - Rol: 'customer', 'vendor', 'admin'
- `first_name`, `last_name` - Nombre del usuario
- `phone` - Teléfono de contacto
- `email_verified` - Si verificó su email
- `two_factor_enabled` - Si tiene 2FA activo
- `last_login_at`, `last_login_ip` - Tracking de sesiones
- `created_at`, `updated_at`, `deleted_at` - Timestamps

**Relaciones:**
- 1 usuario → 1 vendor (vendors.user_id)
- 1 usuario → N direcciones (addresses.user_id)
- 1 usuario → N órdenes (orders.user_id)
- 1 usuario → N reseñas (reviews.user_id)
- 1 usuario → N notificaciones (notifications.user_id)

---

#### **Tabla: `oauth_connections`**
**Propósito:** Almacena conexiones OAuth (Google, Facebook, etc.)

**Campos principales:**
- `id` (UUID)
- `user_id` (UUID) - FK a users
- `provider` (VARCHAR) - 'google', 'facebook', etc.
- `provider_user_id` - ID del usuario en el proveedor
- `access_token`, `refresh_token` - Tokens de OAuth

**Relación:**
- N oauth_connections → 1 user

---

### 2️⃣ VENDEDORES

#### **Tabla: `vendors`**
**Propósito:** Información de las tiendas de los vendedores

**Campos principales:**
- `id` (UUID)
- `user_id` (UUID) - FK a users (UNIQUE - 1 usuario = 1 vendor)
- `shop_name` - Nombre de la tienda
- `shop_slug` - URL amigable (UNIQUE)
- `shop_description` - Descripción de la tienda
- `shop_logo_url`, `shop_banner_url` - Imágenes
- `stripe_account_id` - ID de cuenta Stripe Connect
- `stripe_onboarding_completed` - Si completó onboarding
- `commission_rate` - % de comisión (default 10%)
- `is_verified` - Si el vendor está verificado
- `total_sales_count`, `total_revenue` - Estadísticas
- `average_rating` - Rating promedio
- `return_policy`, `shipping_policy` - Políticas
- `processing_time_days` - Días de procesamiento

**Relaciones:**
- 1 vendor → 1 user (users.id)
- 1 vendor → N products (products.vendor_id)
- 1 vendor → N sub_orders (sub_orders.vendor_id)
- 1 vendor → N direcciones (addresses.vendor_id)

---

#### **Tabla: `addresses`**
**Propósito:** Direcciones de envío/facturación de usuarios y vendors

**Campos principales:**
- `id` (UUID)
- `user_id` (UUID) - FK a users (puede ser NULL)
- `vendor_id` (UUID) - FK a vendors (puede ser NULL)
- `address_type` - 'shipping', 'billing', 'warehouse'
- `address_line1`, `address_line2`
- `city`, `state`, `postal_code`, `country_code`
- `phone`
- `is_default` - Si es la dirección por defecto

**Restricción:** Solo puede tener user_id O vendor_id, no ambos

**Relaciones:**
- N addresses → 1 user O 1 vendor

---

### 3️⃣ PRODUCTOS

#### **Tabla: `categories`**
**Propósito:** Categorías de productos (jerárquicas)

**Campos principales:**
- `id` (UUID)
- `parent_id` (UUID) - FK a categories (para subcategorías)
- `name` - Nombre de la categoría
- `slug` - URL amigable (UNIQUE)
- `description`
- `image_url`
- `sort_order` - Orden de visualización
- `is_active` - Si está activa

**Estructura jerárquica:**
```
Electronics (parent_id = NULL)
  ├── Laptops (parent_id = Electronics.id)
  ├── Phones (parent_id = Electronics.id)
  └── Accessories (parent_id = Electronics.id)
```

---

#### **Tabla: `products`**
**Propósito:** Catálogo de productos

**Campos principales:**
- `id` (UUID)
- `vendor_id` (UUID) - FK a vendors
- `category_id` (UUID) - FK a categories
- `title` - Nombre del producto
- `slug` - URL amigable (UNIQUE)
- `description` - Descripción completa
- `base_price` - Precio base
- `compare_at_price` - Precio de comparación (tachado)
- `cost_per_item` - Costo para el vendor
- `sku` - Stock Keeping Unit
- `barcode` - Código de barras
- `track_inventory` - Si se rastrea inventario
- `inventory_quantity` - Cantidad en stock
- `allow_backorder` - Permitir pedidos sin stock
- `weight_value`, `length_value`, `width_value`, `height_value` - Dimensiones
- `tags` - Array de etiquetas para búsqueda
- `images` - JSONB con URLs de imágenes
- `status` - 'draft', 'active', 'archived'
- `published_at` - Fecha de publicación
- `view_count`, `sales_count` - Métricas

**Relaciones:**
- N products → 1 vendor
- N products → 1 category
- 1 product → N variants (product_variants.product_id)
- 1 product → N reviews (reviews.product_id)

---

#### **Tabla: `product_variants`**
**Propósito:** Variantes de productos (tallas, colores, etc.)

**Campos principales:**
- `id` (UUID)
- `product_id` (UUID) - FK a products
- `title` - Nombre de la variante
- `sku` - SKU único (UNIQUE)
- `price` - Precio específico de esta variante
- `compare_at_price`
- `option1`, `option2`, `option3` - Valores de opciones
  - Ejemplo: option1="Rojo", option2="M", option3="Cotton"
- `inventory_quantity` - Stock específico
- `image_url` - Imagen específica de la variante

**Ejemplo de uso:**
```
Product: "Camiseta Básica"
  Variants:
    - Rojo / S   (option1=Rojo, option2=S)
    - Rojo / M   (option1=Rojo, option2=M)
    - Azul / S   (option1=Azul, option2=S)
    - Azul / M   (option1=Azul, option2=M)
```

---

### 4️⃣ RESEÑAS

#### **Tabla: `reviews`**
**Propósito:** Reseñas y calificaciones de productos

**Campos principales:**
- `id` (UUID)
- `product_id` (UUID) - FK a products
- `user_id` (UUID) - FK a users
- `order_item_id` (UUID) - FK a order_items (opcional)
- `rating` - Calificación de 1 a 5
- `title` - Título de la reseña
- `comment` - Comentario
- `images` - JSONB con imágenes de la reseña
- `is_verified_purchase` - Si compró el producto
- `is_approved` - Si fue aprobada por moderación
- `helpful_count` - Cuántos la marcaron como útil
- `vendor_response` - Respuesta del vendedor
- `vendor_responded_at`

**Restricción:** Un usuario solo puede reseñar un producto una vez (UNIQUE user_id, product_id)

---

### 5️⃣ ÓRDENES (MULTI-VENDOR)

#### **Tabla: `orders`**
**Propósito:** Orden maestra del cliente (puede contener productos de múltiples vendors)

**Campos principales:**
- `id` (UUID)
- `order_number` - Número único (ej: ORD-20241212-ABC123)
- `user_id` (UUID) - FK a users
- `email` - Email del cliente
- `phone`
- `shipping_address` - JSONB con dirección completa
- `billing_address` - JSONB con dirección de facturación
- `subtotal` - Suma de todos los sub-orders
- `shipping_total` - Costo total de envío
- `tax_total` - Impuestos
- `discount_total` - Descuentos aplicados
- `grand_total` - Total final
- `payment_status` - 'pending', 'paid', 'failed', 'refunded'
- `payment_method` - 'card', 'paypal', etc.
- `stripe_payment_intent_id` - ID de Stripe
- `paid_at` - Timestamp del pago
- `fulfillment_status` - 'unfulfilled', 'partial', 'fulfilled'
- `ip_address`, `user_agent` - Tracking

**Relaciones:**
- N orders → 1 user
- 1 order → N sub_orders

---

#### **Tabla: `sub_orders`**
**Propósito:** Orden individual por vendor (parte de una orden maestra)

**Campos principales:**
- `id` (UUID)
- `order_id` (UUID) - FK a orders
- `vendor_id` (UUID) - FK a vendors
- `suborder_number` - Ej: ORD-20241212-ABC123-1
- `subtotal` - Total de productos
- `shipping_cost` - Costo de envío del vendor
- `tax_amount` - Impuestos
- `total` - Total de esta sub-orden
- `commission_rate` - % de comisión (ej: 10.00)
- `commission_amount` - Monto de comisión (total * commission_rate / 100)
- `vendor_payout` - Monto que recibe el vendor (total - commission_amount)
- `status` - 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
- `tracking_company`, `tracking_number`, `tracking_url`
- `shipped_at`, `delivered_at`
- `vendor_notes`

**Restricción:** Una orden puede tener solo una sub-orden por vendor (UNIQUE order_id, vendor_id)

**Ejemplo:**
```
Order #123 ($150 total):
  SubOrder #123-1 (Vendor A): $80 → comisión $8 → vendor recibe $72
  SubOrder #123-2 (Vendor B): $70 → comisión $7 → vendor recibe $63
```

---

#### **Tabla: `order_items`**
**Propósito:** Items individuales dentro de una sub-orden

**Campos principales:**
- `id` (UUID)
- `sub_order_id` (UUID) - FK a sub_orders
- `product_id` (UUID) - FK a products
- `variant_id` (UUID) - FK a product_variants (opcional)
- `product_title` - Título (snapshot al momento de compra)
- `variant_title` - Título de variante
- `sku`
- `quantity` - Cantidad comprada
- `unit_price` - Precio por unidad
- `total_price` - quantity * unit_price
- `weight_value` - Para calcular envío

**Relaciones:**
- N order_items → 1 sub_order
- N order_items → 1 product (referencia, puede ser NULL si se borra el producto)

---

### 6️⃣ PAGOS

#### **Tabla: `vendor_payouts`**
**Propósito:** Registro de pagos/transferencias a vendedores

**Campos principales:**
- `id` (UUID)
- `vendor_id` (UUID) - FK a vendors
- `sub_order_id` (UUID) - FK a sub_orders
- `gross_amount` - Monto bruto de la venta
- `commission_amount` - Comisión retenida por la plataforma
- `net_amount` - Monto neto transferido al vendor
- `stripe_transfer_id` - ID de transferencia en Stripe
- `stripe_payout_id` - ID de payout en Stripe
- `status` - 'pending', 'processing', 'paid', 'failed'
- `failure_reason` - Motivo si falló
- `paid_at` - Timestamp del pago

**Relaciones:**
- N vendor_payouts → 1 vendor
- N vendor_payouts → 1 sub_order

---

### 7️⃣ ENVÍOS

#### **Tabla: `shipping_zones`**
**Propósito:** Zonas geográficas de envío por vendor

**Campos principales:**
- `id` (UUID)
- `vendor_id` (UUID) - FK a vendors
- `name` - Nombre de la zona (ej: "USA", "Europe")
- `countries` - Array de códigos de país ['US', 'CA']

**Ejemplo:**
```
Vendor A tiene:
  - Zona "North America" → ['US', 'CA', 'MX']
  - Zona "Europe" → ['UK', 'FR', 'DE', 'ES']
```

---

#### **Tabla: `shipping_rates`**
**Propósito:** Tarifas de envío por zona

**Campos principales:**
- `id` (UUID)
- `shipping_zone_id` (UUID) - FK a shipping_zones
- `name` - Nombre de la tarifa (ej: "Standard", "Express")
- `description`
- `price` - Precio de envío
- `min_order_value`, `max_order_value` - Rango de valor de orden
- `min_weight`, `max_weight` - Rango de peso
- `estimated_days_min`, `estimated_days_max` - Tiempo de entrega

**Ejemplo:**
```
Zona "North America":
  - Standard Shipping: $5 (5-7 días)
  - Express Shipping: $15 (2-3 días)
  - Free Shipping: $0 (mín. $50 de compra)
```

---

### 8️⃣ DESCUENTOS Y SISTEMA

#### **Tabla: `discount_codes`**
**Propósito:** Códigos de descuento/cupones

**Campos principales:**
- `id` (UUID)
- `vendor_id` (UUID) - FK a vendors (NULL si es de la plataforma)
- `code` - Código del cupón (UNIQUE) ej: "SAVE20"
- `description`
- `discount_type` - 'percentage', 'fixed_amount', 'free_shipping'
- `discount_value` - Valor del descuento
- `applies_to` - 'order', 'product', 'category'
- `min_purchase_amount` - Compra mínima requerida
- `usage_limit` - Usos totales permitidos
- `usage_count` - Usos actuales
- `usage_limit_per_user` - Usos por usuario
- `starts_at`, `ends_at` - Periodo de validez
- `is_active` - Si está activo

---

#### **Tabla: `notifications`**
**Propósito:** Notificaciones enviadas a usuarios (email, SMS)

**Campos principales:**
- `id` (UUID)
- `user_id` (UUID) - FK a users
- `type` - Tipo de notificación (ej: 'order_shipped')
- `channel` - 'email', 'sms', 'push'
- `subject` - Asunto
- `content` - Contenido
- `status` - 'pending', 'sent', 'failed'
- `sent_at`
- `error_message`
- `metadata` - JSONB con datos extra

---

#### **Tabla: `activity_logs`**
**Propósito:** Registro de actividad para auditoría

**Campos principales:**
- `id` (UUID)
- `user_id` (UUID) - FK a users
- `action` - Acción realizada (ej: 'product_created')
- `entity_type` - Tipo de entidad (ej: 'product')
- `entity_id` - ID de la entidad
- `ip_address` - IP del usuario
- `user_agent` - Navegador
- `changes` - JSONB con cambios realizados
- `created_at`

---

## 🔗 DIAGRAMA DE RELACIONES

```
┌─────────────┐
│   USERS     │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  VENDORS    │   │  ADDRESSES  │
└──────┬──────┘   └─────────────┘
       │
       ├──────────────────────────┐
       │                          │
       ▼                          ▼
┌─────────────┐          ┌─────────────┐
│  PRODUCTS   │          │ SUB_ORDERS  │
└──────┬──────┘          └──────┬──────┘
       │                        │
       ├──────────┐            │
       │          │            │
       ▼          ▼            ▼
┌────────┐  ┌─────────┐  ┌────────────┐
│VARIANTS│  │ REVIEWS │  │ORDER_ITEMS │
└────────┘  └─────────┘  └──────┬─────┘
                                │
                                ▼
                         ┌─────────────┐
                         │   ORDERS    │
                         └─────────────┘
```

---

## 📋 ÍNDICES IMPORTANTES

El esquema incluye **32 índices** para optimizar consultas:

### Índices más críticos:
1. `idx_users_email` - Búsqueda rápida por email (login)
2. `idx_products_vendor` - Productos por vendor
3. `idx_products_category` - Productos por categoría
4. `idx_orders_user` - Órdenes por usuario
5. `idx_products_tags` - Búsqueda full-text por tags (GIN)
6. `idx_suborders_vendor` - Sub-órdenes por vendor

---

## 🚀 GUÍA DE DESPLIEGUE DE BASE DE DATOS

### OPCIÓN 1: Despliegue con Docker (Recomendado para desarrollo)

#### Paso 1: Iniciar PostgreSQL con Docker Compose

```bash
# Desde la raíz del proyecto
cd /home/vboxuser/Documents/kreo-marketplace

# Levantar solo PostgreSQL
docker-compose up -d postgres

# Verificar que esté corriendo
docker-compose ps
```

**¿Qué hace esto?**
- Crea contenedor de PostgreSQL 15
- Ejecuta automáticamente `shared/database/init.sql`
- Crea todas las 21 tablas
- Inserta datos de prueba (categorías y usuario admin)
- Expone puerto 5432

#### Paso 2: Verificar la conexión

```bash
# Conectar a PostgreSQL
docker exec -it kreo-postgres psql -U kreo -d kreo_db

# Ver todas las tablas
\dt

# Ver esquema de una tabla
\d users

# Salir
\q
```

#### Paso 3: Configurar variables de entorno en servicios

```bash
# En cada servicio, verificar .env o docker-compose.yml
DATABASE_URL=postgresql://kreo:kreo_dev_password@postgres:5432/kreo_db
```

---

### OPCIÓN 2: Despliegue Manual (PostgreSQL local)

#### Paso 1: Instalar PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql@15
brew services start postgresql@15
```

#### Paso 2: Crear base de datos y usuario

```bash
# Conectar como superusuario
sudo -u postgres psql

# Ejecutar en psql:
CREATE DATABASE kreo_db;
CREATE USER kreo WITH PASSWORD 'kreo_dev_password';
GRANT ALL PRIVILEGES ON DATABASE kreo_db TO kreo;
\q
```

#### Paso 3: Ejecutar script de inicialización

```bash
# Ejecutar init.sql
psql -U kreo -d kreo_db -f shared/database/init.sql

# Verificar tablas creadas
psql -U kreo -d kreo_db -c "\dt"
```

#### Paso 4: Configurar servicios

```bash
# Crear archivo .env en cada servicio
cd services/auth-service
cp .env.example .env

# Editar .env
DATABASE_URL=postgresql://kreo:kreo_dev_password@localhost:5432/kreo_db
```

---

### OPCIÓN 3: Despliegue en Producción (Cloud)

#### 3A. AWS RDS (PostgreSQL Managed)

```bash
# 1. Crear instancia RDS PostgreSQL 15 en AWS Console

# 2. Obtener endpoint
# Ejemplo: kreo-db.c9akfj92jfkd.us-east-1.rds.amazonaws.com

# 3. Conectar y ejecutar init.sql
psql -h kreo-db.c9akfj92jfkd.us-east-1.rds.amazonaws.com \
     -U kreo_admin \
     -d kreo_db \
     -f shared/database/init.sql

# 4. Configurar variable de entorno en servicios
DATABASE_URL=postgresql://kreo_admin:PASSWORD@kreo-db.c9akfj92jfkd.us-east-1.rds.amazonaws.com:5432/kreo_db
```

#### 3B. Heroku Postgres

```bash
# 1. Crear app en Heroku
heroku create kreo-marketplace

# 2. Agregar add-on de PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# 3. Obtener DATABASE_URL
heroku config:get DATABASE_URL

# 4. Ejecutar init.sql
heroku pg:psql < shared/database/init.sql
```

#### 3C. DigitalOcean Managed Database

```bash
# 1. Crear cluster PostgreSQL en DigitalOcean

# 2. Descargar certificado SSL
wget -O ca-certificate.crt https://your-db-cluster.db.ondigitalocean.com/ca-certificate.crt

# 3. Conectar con SSL
psql "postgresql://doadmin:PASSWORD@your-db-cluster.db.ondigitalocean.com:25060/kreo_db?sslmode=require" \
     -f shared/database/init.sql

# 4. Configurar servicios
DATABASE_URL=postgresql://doadmin:PASSWORD@your-db-cluster.db.ondigitalocean.com:25060/kreo_db?sslmode=require
```

---

## 🔐 CONFIGURACIÓN DE SEGURIDAD EN PRODUCCIÓN

### 1. Cambiar contraseñas

```sql
-- Conectar a la base de datos
psql -U postgres

-- Cambiar contraseña del usuario kreo
ALTER USER kreo WITH PASSWORD 'NUEVA_CONTRASEÑA_SEGURA_AQUÍ';

-- Cambiar contraseña del admin
UPDATE users
SET password_hash = crypt('NUEVA_CONTRASEÑA', gen_salt('bf'))
WHERE email = 'admin@kreo.com';
```

### 2. Configurar SSL/TLS

```bash
# En postgresql.conf
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### 3. Configurar pg_hba.conf

```bash
# Permitir solo conexiones SSL
hostssl all all 0.0.0.0/0 md5

# Bloquear conexiones no SSL
host all all 0.0.0.0/0 reject
```

### 4. Backups automáticos

```bash
# Crear script de backup
#!/bin/bash
pg_dump -U kreo kreo_db > /backups/kreo_db_$(date +%Y%m%d_%H%M%S).sql

# Comprimir
gzip /backups/kreo_db_$(date +%Y%m%d_%H%M%S).sql

# Programar con cron (diario a las 2am)
0 2 * * * /path/to/backup_script.sh
```

---

## 🧪 VERIFICAR EL DESPLIEGUE

### Script de verificación

```bash
# Ejecutar en terminal
psql -U kreo -d kreo_db << EOF

-- Verificar tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Contar registros en cada tabla
SELECT
  schemaname,
  tablename,
  (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
  SELECT
    schemaname,
    tablename,
    query_to_xml(format('SELECT COUNT(*) as cnt FROM %I.%I', schemaname, tablename), false, true, '') as xml_count
  FROM pg_tables
  WHERE schemaname = 'public'
) t
ORDER BY tablename;

-- Verificar extensiones
SELECT * FROM pg_extension;

-- Verificar índices
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';

EOF
```

**Resultado esperado:**
```
✓ 21 tablas creadas
✓ 2 extensiones activas (uuid-ossp, pgcrypto)
✓ 32+ índices creados
✓ 6 categorías insertadas
✓ 1 usuario admin creado
```

---

## 📊 COMANDOS ÚTILES PARA GESTIÓN

### Ver tamaño de la base de datos

```sql
SELECT pg_size_pretty(pg_database_size('kreo_db'));
```

### Ver tamaño de cada tabla

```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Ver conexiones activas

```sql
SELECT
  datname,
  usename,
  application_name,
  client_addr,
  state
FROM pg_stat_activity
WHERE datname = 'kreo_db';
```

### Limpiar datos de prueba

```sql
-- CUIDADO: Esto borra TODOS los datos
TRUNCATE TABLE
  order_items, sub_orders, orders,
  reviews, product_variants, products,
  vendor_payouts, shipping_rates, shipping_zones,
  discount_codes, notifications, activity_logs,
  oauth_connections, addresses, vendors, users
CASCADE;

-- Reinsertar categorías y admin
-- (copiar del final de init.sql)
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "relation does not exist"

```bash
# Verificar que init.sql se ejecutó
psql -U kreo -d kreo_db -c "\dt"

# Si no hay tablas, ejecutar:
psql -U kreo -d kreo_db -f shared/database/init.sql
```

### Error: "password authentication failed"

```bash
# Verificar credenciales en .env
cat services/auth-service/.env | grep DATABASE_URL

# Verificar usuario en PostgreSQL
psql -U postgres -c "SELECT usename FROM pg_user WHERE usename = 'kreo';"
```

### Error: "could not connect to server"

```bash
# Verificar que PostgreSQL está corriendo
# Docker:
docker-compose ps postgres

# Local:
sudo systemctl status postgresql

# Verificar puerto
netstat -an | grep 5432
```

### Error: "permission denied for table"

```sql
-- Dar permisos al usuario kreo
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kreo;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kreo;
```

---

## 📚 RECURSOS ADICIONALES

### Documentación oficial
- PostgreSQL: https://www.postgresql.org/docs/15/
- TypeORM: https://typeorm.io/
- Docker Compose: https://docs.docker.com/compose/

### Herramientas recomendadas
- **pgAdmin**: GUI para gestionar PostgreSQL
- **DBeaver**: Cliente universal de bases de datos
- **Postico** (macOS): Cliente PostgreSQL nativo

---

## ✅ CHECKLIST DE DESPLIEGUE

```
□ PostgreSQL 15 instalado/configurado
□ Base de datos 'kreo_db' creada
□ Usuario 'kreo' creado con permisos
□ Script init.sql ejecutado exitosamente
□ 21 tablas verificadas
□ Extensiones uuid-ossp y pgcrypto activadas
□ Índices creados (32+)
□ Datos semilla insertados (categorías, admin)
□ Variables de entorno configuradas en servicios
□ Conexión verificada desde servicios
□ SSL/TLS configurado (producción)
□ Backups programados (producción)
□ Contraseñas seguras establecidas (producción)
```

---

**Fecha de creación:** 2025-12-12
**Versión:** 1.0.0
**Generado por:** Claude Code

Para más información, consulta `INFORME.md` y la documentación en `/documentos/`
