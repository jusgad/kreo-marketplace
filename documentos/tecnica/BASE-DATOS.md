# Documentación de Base de Datos
## Kreo Marketplace - Esquema PostgreSQL

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Diagrama ER](#diagrama-er)
3. [Tablas Principales](#tablas-principales)
4. [Índices y Optimizaciones](#índices-y-optimizaciones)
5. [Triggers y Funciones](#triggers-y-funciones)
6. [Queries Comunes](#queries-comunes)
7. [Migraciones](#migraciones)
8. [Backup y Restauración](#backup-y-restauración)

---

## Visión General

**Motor**: PostgreSQL 15
**Extensiones Utilizadas**:
- `uuid-ossp`: Generación de UUIDs
- `pgcrypto`: Funciones criptográficas

**Características**:
- Transacciones ACID
- Integridad referencial
- Soft deletes (deleted_at)
- Timestamps automáticos
- Validaciones a nivel de BD

---

## Diagrama ER

```
┌──────────────┐
│    users     │
└───────┬──────┘
        │
        ├──────────────────┬────────────────────┐
        │                  │                    │
┌───────▼──────┐   ┌───────▼──────┐   ┌────────▼───────┐
│   vendors    │   │   addresses  │   │oauth_connections│
└───────┬──────┘   └──────────────┘   └────────────────┘
        │
        ├──────────────┬───────────────────┐
        │              │                   │
┌───────▼──────┐  ┌───▼────────┐  ┌───────▼────────┐
│   products   │  │sub_orders  │  │shipping_zones  │
└───────┬──────┘  └───┬────────┘  └────────────────┘
        │             │
        ├─────────────┼──────────────┐
        │             │              │
┌───────▼──────┐  ┌──▼──────────┐  ┌▼──────────────┐
│product_      │  │order_items  │  │vendor_payouts │
│variants      │  └─────────────┘  └───────────────┘
└──────────────┘
        │
┌───────▼──────┐
│   reviews    │
└──────────────┘

┌──────────────┐
│    orders    │
└───────┬──────┘
        │
┌───────▼──────┐
│  sub_orders  │
└───────┬──────┘
        │
┌───────▼──────┐
│ order_items  │
└──────────────┘
```

---

## Tablas Principales

### users

Tabla central para todos los usuarios de la plataforma.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'vendor', 'admin')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    last_login_at TIMESTAMP,
    last_login_ip INET,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

**Columnas Clave**:
- `role`: Define el tipo de usuario (cliente, vendedor, admin)
- `email_verified`: Indica si el email ha sido verificado
- `two_factor_secret`: Secret para TOTP (2FA)
- `deleted_at`: Soft delete (NULL = activo)

**Índices**:
```sql
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
```

**Ejemplo de Datos**:
```sql
INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
VALUES
  ('admin@kreo.com', '$2b$12$...', 'admin', 'Admin', 'User', TRUE),
  ('vendor@example.com', '$2b$12$...', 'vendor', 'John', 'Seller', TRUE),
  ('customer@example.com', '$2b$12$...', 'customer', 'Jane', 'Buyer', TRUE);
```

---

### vendors

Información extendida para usuarios vendedores.

```sql
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL,
    shop_slug VARCHAR(255) UNIQUE NOT NULL,
    shop_description TEXT,
    shop_logo_url VARCHAR(500),
    shop_banner_url VARCHAR(500),
    stripe_account_id VARCHAR(255) UNIQUE,
    stripe_onboarding_completed BOOLEAN DEFAULT FALSE,
    business_type VARCHAR(50),
    tax_id VARCHAR(100),
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    kyc_status VARCHAR(20) DEFAULT 'pending',
    total_sales_count INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    return_policy TEXT,
    shipping_policy TEXT,
    processing_time_days INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columnas Clave**:
- `user_id`: Relación 1:1 con users
- `shop_slug`: URL amigable (ej: kreo.com/shop/amazing-store)
- `stripe_account_id`: ID de cuenta Stripe Connect
- `commission_rate`: Porcentaje de comisión (personalizable por vendedor)
- `kyc_status`: Estado de verificación (pending, approved, rejected)

**Índices**:
```sql
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_vendors_slug ON vendors(shop_slug);
CREATE INDEX idx_vendors_verified ON vendors(is_verified);
```

---

### products

Catálogo de productos de todos los vendedores.

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2),
    cost_per_item DECIMAL(10,2),
    sku VARCHAR(100),
    barcode VARCHAR(100),
    track_inventory BOOLEAN DEFAULT TRUE,
    inventory_quantity INTEGER DEFAULT 0,
    allow_backorder BOOLEAN DEFAULT FALSE,
    weight_value DECIMAL(10,2),
    length_value DECIMAL(10,2),
    width_value DECIMAL(10,2),
    height_value DECIMAL(10,2),
    tags TEXT[],
    images JSONB,
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMP,
    meta_title VARCHAR(255),
    meta_description TEXT,
    view_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

**Columnas Clave**:
- `base_price`: Precio del producto
- `compare_at_price`: Precio "antes de descuento" (opcional)
- `tags`: Array de etiquetas para búsqueda
- `images`: JSON con URLs de imágenes
- `status`: draft, active, archived
- `deleted_at`: Soft delete

**Estructura de images (JSONB)**:
```json
[
  {
    "url": "https://s3.amazonaws.com/kreo/product1.jpg",
    "alt": "Producto vista frontal",
    "position": 0
  },
  {
    "url": "https://s3.amazonaws.com/kreo/product2.jpg",
    "alt": "Producto vista lateral",
    "position": 1
  }
]
```

**Índices**:
```sql
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_created ON products(created_at DESC);
```

---

### orders

Órdenes maestras (una por checkout del cliente).

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_total DECIMAL(10,2) NOT NULL,
    tax_total DECIMAL(10,2) DEFAULT 0.00,
    discount_total DECIMAL(10,2) DEFAULT 0.00,
    grand_total DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    paid_at TIMESTAMP,
    fulfillment_status VARCHAR(20) DEFAULT 'unfulfilled',
    notes TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP,
    cancel_reason TEXT
);
```

**Columnas Clave**:
- `order_number`: Número único de pedido (ej: ORD-20231215-A8F3D2)
- `payment_status`: pending, paid, failed, refunded
- `fulfillment_status`: unfulfilled, partial, fulfilled
- `shipping_address`: JSON con dirección completa

**Estructura de shipping_address (JSONB)**:
```json
{
  "first_name": "María",
  "last_name": "González",
  "address_line1": "Calle Principal 123",
  "address_line2": "Apt 4B",
  "city": "Madrid",
  "state": "Madrid",
  "postal_code": "28001",
  "country_code": "ES",
  "phone": "+34123456789"
}
```

**Índices**:
```sql
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
```

---

### sub_orders

Sub-órdenes por vendedor (una orden puede tener múltiples sub-órdenes).

```sql
CREATE TABLE sub_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    suborder_number VARCHAR(50) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    vendor_payout DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    tracking_company VARCHAR(100),
    tracking_number VARCHAR(255),
    tracking_url VARCHAR(500),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    vendor_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(order_id, vendor_id)
);
```

**Cálculo de Comisiones**:
```sql
-- Ejemplo:
subtotal = $95.00
shipping_cost = $5.00
total = $100.00
commission_rate = 10%
commission_amount = $10.00
vendor_payout = $90.00  -- Lo que recibe el vendedor
```

**Estados**:
- `pending`: Esperando confirmación del vendedor
- `processing`: Vendedor está preparando
- `shipped`: Enviado al cliente
- `delivered`: Entregado
- `cancelled`: Cancelado

**Índices**:
```sql
CREATE INDEX idx_suborders_order ON sub_orders(order_id);
CREATE INDEX idx_suborders_vendor ON sub_orders(vendor_id);
CREATE INDEX idx_suborders_status ON sub_orders(status);
```

---

### order_items

Items individuales en cada sub-orden.

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    product_title VARCHAR(500) NOT NULL,
    variant_title VARCHAR(255),
    sku VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    weight_value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Nota Importante**: Guardamos copia del título y precio en el momento de la compra para mantener historial preciso, incluso si el producto se elimina o cambia de precio después.

**Índices**:
```sql
CREATE INDEX idx_order_items_suborder ON order_items(sub_order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

---

### reviews

Reseñas de productos por clientes.

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    comment TEXT,
    images JSONB,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    helpful_count INTEGER DEFAULT 0,
    vendor_response TEXT,
    vendor_responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);
```

**Restricciones**:
- Un usuario solo puede dejar una reseña por producto
- Rating debe estar entre 1 y 5
- `is_verified_purchase`: TRUE si la reseña es de un comprador real

**Índices**:
```sql
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
```

---

## Índices y Optimizaciones

### Índices de Rendimiento

**Índices B-Tree** (por defecto):
```sql
-- Para búsquedas de igualdad y rangos
CREATE INDEX idx_products_price ON products(base_price);
CREATE INDEX idx_orders_total ON orders(grand_total);
```

**Índices GIN** (para JSONB y arrays):
```sql
-- Para búsqueda en arrays
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- Para búsqueda en JSONB
CREATE INDEX idx_products_images ON products USING GIN(images);
```

**Índices Parciales** (solo filas específicas):
```sql
-- Solo productos activos (más eficiente)
CREATE INDEX idx_products_active ON products(vendor_id, created_at DESC)
WHERE status = 'active' AND deleted_at IS NULL;

-- Solo órdenes pagadas
CREATE INDEX idx_orders_paid ON orders(created_at DESC)
WHERE payment_status = 'paid';
```

**Índices Compuestos**:
```sql
-- Para queries complejas frecuentes
CREATE INDEX idx_products_vendor_category ON products(vendor_id, category_id, status);
CREATE INDEX idx_orders_user_status ON orders(user_id, payment_status, created_at DESC);
```

### Análisis de Performance

```sql
-- Ver índices de una tabla
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'products';

-- Ver uso de índices
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Identificar índices no usados
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY schemaname, tablename, indexname;
```

---

## Triggers y Funciones

### Trigger: updated_at automático

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ... (similar para otras tablas)
```

### Función: Calcular Rating Promedio

```sql
CREATE OR REPLACE FUNCTION calculate_product_rating(p_product_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    avg_rating DECIMAL(3,2);
BEGIN
    SELECT AVG(rating)::DECIMAL(3,2)
    INTO avg_rating
    FROM reviews
    WHERE product_id = p_product_id
      AND is_approved = TRUE;

    RETURN COALESCE(avg_rating, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Uso:
SELECT calculate_product_rating('550e8400-e29b-41d4-a716-446655440000');
```

### Función: Actualizar Estadísticas de Vendedor

```sql
CREATE OR REPLACE FUNCTION update_vendor_stats(p_vendor_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE vendors
    SET
        total_sales_count = (
            SELECT COUNT(*)
            FROM sub_orders
            WHERE vendor_id = p_vendor_id
              AND status = 'delivered'
        ),
        total_revenue = (
            SELECT COALESCE(SUM(vendor_payout), 0)
            FROM sub_orders
            WHERE vendor_id = p_vendor_id
              AND status = 'delivered'
        ),
        average_rating = (
            SELECT COALESCE(AVG(r.rating)::DECIMAL(3,2), 0.00)
            FROM reviews r
            INNER JOIN products p ON p.id = r.product_id
            WHERE p.vendor_id = p_vendor_id
              AND r.is_approved = TRUE
        )
    WHERE id = p_vendor_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Queries Comunes

### 1. Buscar Productos con Filtros

```sql
-- Búsqueda básica
SELECT
    p.id,
    p.title,
    p.base_price,
    p.images,
    v.shop_name,
    v.average_rating
FROM products p
INNER JOIN vendors v ON v.id = p.vendor_id
WHERE
    p.status = 'active'
    AND p.deleted_at IS NULL
    AND p.base_price BETWEEN 50 AND 200
    AND 'electronics' = ANY(p.tags)
ORDER BY p.created_at DESC
LIMIT 20;
```

### 2. Órdenes de un Usuario

```sql
SELECT
    o.id,
    o.order_number,
    o.grand_total,
    o.payment_status,
    o.created_at,
    COUNT(DISTINCT so.vendor_id) as vendor_count,
    COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN sub_orders so ON so.order_id = o.id
LEFT JOIN order_items oi ON oi.sub_order_id = so.id
WHERE o.user_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY o.id
ORDER BY o.created_at DESC;
```

### 3. Productos Más Vendidos

```sql
SELECT
    p.id,
    p.title,
    COUNT(oi.id) as times_sold,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.total_price) as total_revenue
FROM products p
INNER JOIN order_items oi ON oi.product_id = p.id
INNER JOIN sub_orders so ON so.id = oi.sub_order_id
WHERE
    so.status = 'delivered'
    AND so.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id
ORDER BY times_sold DESC
LIMIT 10;
```

### 4. Vendedores Top por Ingresos

```sql
SELECT
    v.id,
    v.shop_name,
    v.average_rating,
    COUNT(DISTINCT so.id) as total_orders,
    SUM(so.vendor_payout) as total_earnings
FROM vendors v
INNER JOIN sub_orders so ON so.vendor_id = v.id
WHERE
    so.status = 'delivered'
    AND so.delivered_at >= NOW() - INTERVAL '30 days'
GROUP BY v.id
ORDER BY total_earnings DESC
LIMIT 10;
```

### 5. Reporte de Comisiones

```sql
SELECT
    DATE(so.created_at) as date,
    COUNT(so.id) as orders,
    SUM(so.total) as gross_sales,
    SUM(so.commission_amount) as total_commission,
    SUM(so.vendor_payout) as vendor_payouts
FROM sub_orders so
WHERE
    so.status = 'delivered'
    AND so.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(so.created_at)
ORDER BY date DESC;
```

---

## Migraciones

### Crear Nueva Migración

```bash
# Con TypeORM
npm run migration:create -- -n AddProductVariants
```

Esto crea: `src/migrations/1234567890-AddProductVariants.ts`

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductVariants1234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE product_variants (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                product_id UUID REFERENCES products(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                sku VARCHAR(100) UNIQUE,
                price DECIMAL(10,2),
                inventory_quantity INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE product_variants`);
    }
}
```

### Ejecutar Migraciones

```bash
# Ejecutar todas las migraciones pendientes
npm run migration:run

# Revertir última migración
npm run migration:revert

# Ver estado de migraciones
npm run migration:show
```

---

## Backup y Restauración

### Backup Manual

```bash
# Backup completo
docker exec kreo-marketplace-postgres-1 pg_dump -U kreo kreo_db > backup_$(date +%Y%m%d).sql

# Solo esquema
docker exec kreo-marketplace-postgres-1 pg_dump -U kreo --schema-only kreo_db > schema.sql

# Solo datos
docker exec kreo-marketplace-postgres-1 pg_dump -U kreo --data-only kreo_db > data.sql

# Backup de una tabla específica
docker exec kreo-marketplace-postgres-1 pg_dump -U kreo -t products kreo_db > products_backup.sql
```

### Restauración

```bash
# Restaurar backup completo
docker exec -i kreo-marketplace-postgres-1 psql -U kreo -d kreo_db < backup_20231215.sql

# Restaurar desde archivo comprimido
gunzip -c backup.sql.gz | docker exec -i kreo-marketplace-postgres-1 psql -U kreo -d kreo_db
```

### Backup Automatizado

```bash
#!/bin/bash
# Script: backup-db.sh

BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="kreo_db_$DATE.sql.gz"

# Crear backup comprimido
docker exec kreo-marketplace-postgres-1 pg_dump -U kreo kreo_db | gzip > "$BACKUP_DIR/$FILENAME"

# Eliminar backups antiguos (más de 30 días)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completado: $FILENAME"
```

**Configurar en crontab**:
```bash
# Backup diario a las 2 AM
0 2 * * * /path/to/backup-db.sh
```

---

## Mantenimiento

### Vacuum y Analyze

```sql
-- Vacuum para recuperar espacio
VACUUM FULL products;

-- Analyze para actualizar estadísticas
ANALYZE products;

-- Vacuum analyze (recomendado)
VACUUM ANALYZE;
```

### Verificar Tamaño de Tablas

```sql
SELECT
    schemaname AS schema,
    tablename AS table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Limpieza de Datos Antiguos

```sql
-- Eliminar logs de auditoría antiguos (más de 1 año)
DELETE FROM activity_logs
WHERE created_at < NOW() - INTERVAL '1 year';

-- Limpiar notificaciones viejas
DELETE FROM notifications
WHERE status = 'sent'
  AND created_at < NOW() - INTERVAL '90 days';
```

---

**Documentación de Base de Datos Completa**

Para modificaciones al esquema, siempre crear migraciones y documentarlas aquí.

---

*Última actualización: Diciembre 2024*
*Versión: 1.0.0*
