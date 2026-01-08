# ESQUEMA COMPLETO DE BASES DE DATOS - KREO MARKETPLACE

## 📊 INFORMACIÓN GENERAL

**Proyecto:** Kreo Marketplace - Plataforma Multi-Vendor B2C
**Motor de BD:** PostgreSQL 15
**ORM:** TypeORM
**Fecha:** 2025-12-28
**Total de Tablas:** 21 tablas principales

---

## 🎯 IDEA DE NEGOCIO

**Kreo Marketplace** es una plataforma de comercio electrónico multi-vendor que permite:

1. **Para Clientes:**
   - Comprar productos de múltiples vendedores en una sola transacción
   - Buscar productos con Elasticsearch (búsqueda avanzada)
   - Pagar de forma segura con Stripe
   - Seguimiento de órdenes en tiempo real
   - Sistema de reviews y ratings

2. **Para Vendedores:**
   - Vender sus productos sin crear su propia infraestructura
   - Recibir pagos automáticos (90% del subtotal, 10% comisión para la plataforma)
   - Panel de análisis y estadísticas
   - Gestión de inventario
   - Integración con envíos (Shippo)

3. **Para la Plataforma (Kreo):**
   - Comisión del 10% en cada venta
   - Control de calidad de productos
   - Gestión de vendedores (KYC con Stripe Connect)
   - Moderación de contenido

**Modelo de Ingresos:**
- Comisión del 10% en cada transacción
- Tarifas opcionales por promociones destacadas
- Comisiones por servicios premium para vendedores

---

## 📐 ESTRUCTURA COMPLETA DE 21 TABLAS

### CATEGORÍA 1: AUTENTICACIÓN Y USUARIOS (2 tablas)

#### 1. **users** - Tabla principal de usuarios
```sql
CREATE TABLE users (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- CREDENCIALES Y AUTENTICACIÓN
    email VARCHAR(255) UNIQUE NOT NULL,           -- Email único para login
    password_hash VARCHAR(255),                   -- Hash bcrypt de la contraseña (12 rounds)
    role VARCHAR(20) NOT NULL,                    -- 'customer', 'vendor', 'admin'

    -- INFORMACIÓN PERSONAL
    first_name VARCHAR(100),                      -- Nombre
    last_name VARCHAR(100),                       -- Apellido
    phone VARCHAR(20),                            -- Teléfono con código de país
    avatar_url TEXT,                              -- URL de foto de perfil (S3)

    -- VERIFICACIÓN DE EMAIL
    email_verified BOOLEAN DEFAULT FALSE,         -- Si el email está verificado
    email_verified_at TIMESTAMP,                  -- Fecha de verificación

    -- AUTENTICACIÓN DE DOS FACTORES (2FA)
    two_factor_enabled BOOLEAN DEFAULT FALSE,     -- Si 2FA está activado
    two_factor_secret VARCHAR(255),               -- Secret TOTP para 2FA (base32)

    -- AUDITORÍA DE ACCESOS
    last_login_at TIMESTAMP,                      -- Último login exitoso
    last_login_ip INET,                           -- IP del último login

    -- TIMESTAMPS AUTOMÁTICOS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP                          -- Soft delete
);

-- ÍNDICES PARA RENDIMIENTO
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created ON users(created_at DESC);
```

**Descripción:**
- **Propósito:** Almacena información de todos los usuarios del sistema (clientes, vendedores, admins)
- **Seguridad:**
  - Contraseñas hasheadas con bcrypt (12 rounds)
  - 2FA opcional con TOTP (Google Authenticator compatible)
  - Registro de IPs para detección de fraude
- **Relaciones:**
  - Un usuario puede tener muchas órdenes
  - Un usuario puede tener muchas reviews
  - Un usuario (vendor) tiene una tienda

---

#### 2. **oauth_connections** - Conexiones OAuth (Google, Facebook)
```sql
CREATE TABLE oauth_connections (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIÓN CON USUARIO
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- PROVEEDOR OAUTH
    provider VARCHAR(50) NOT NULL,                -- 'google', 'facebook', 'github'
    provider_user_id VARCHAR(255) NOT NULL,       -- ID del usuario en el proveedor

    -- TOKENS DE ACCESO (CIFRADOS)
    access_token TEXT,                            -- Token de acceso OAuth
    refresh_token TEXT,                           -- Token para renovar acceso
    token_expires_at TIMESTAMP,                   -- Expiración del access token

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINT ÚNICO: Un usuario no puede conectar dos veces el mismo proveedor
    UNIQUE(user_id, provider)
);

-- ÍNDICES
CREATE INDEX idx_oauth_user ON oauth_connections(user_id);
CREATE INDEX idx_oauth_provider ON oauth_connections(provider, provider_user_id);
```

**Descripción:**
- **Propósito:** Permite login con Google, Facebook, GitHub, etc.
- **Seguridad:** Los tokens deben cifrarse en reposo (AES-256)
- **Uso:** Un usuario puede tener múltiples conexiones OAuth (Google + Facebook)

---

### CATEGORÍA 2: VENDEDORES Y DIRECCIONES (2 tablas)

#### 3. **vendors** - Tiendas de vendedores
```sql
CREATE TABLE vendors (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIÓN CON USUARIO
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- INFORMACIÓN DE LA TIENDA
    shop_name VARCHAR(255) NOT NULL,              -- Nombre de la tienda
    shop_slug VARCHAR(255) UNIQUE NOT NULL,       -- URL amigable (kreo.com/shop/vendor-slug)
    shop_description TEXT,                        -- Descripción de la tienda
    shop_logo_url TEXT,                           -- Logo de la tienda (S3)
    shop_banner_url TEXT,                         -- Banner de portada (S3)

    -- STRIPE CONNECT (PAGOS)
    stripe_account_id VARCHAR(255) UNIQUE,        -- ID de cuenta Stripe Connect
    stripe_onboarding_completed BOOLEAN DEFAULT FALSE,

    -- COMISIONES
    commission_rate DECIMAL(5,2) DEFAULT 10.00,   -- % de comisión (default 10%)

    -- ESTADO Y VERIFICACIÓN
    is_verified BOOLEAN DEFAULT FALSE,            -- Verificado por admin
    is_active BOOLEAN DEFAULT TRUE,               -- Tienda activa

    -- ESTADÍSTICAS
    total_sales_count INTEGER DEFAULT 0,          -- Total de ventas
    total_revenue DECIMAL(12,2) DEFAULT 0,        -- Ingresos totales
    average_rating DECIMAL(3,2) DEFAULT 0,        -- Rating promedio (calculado de reviews)

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ÍNDICES
CREATE INDEX idx_vendors_slug ON vendors(shop_slug);
CREATE INDEX idx_vendors_user ON vendors(user_id);
CREATE INDEX idx_vendors_stripe ON vendors(stripe_account_id);
```

**Descripción:**
- **Propósito:** Tienda de un vendedor
- **Relación 1:1 con users:** Un usuario solo puede tener una tienda
- **Stripe Connect:** Permite recibir pagos automáticos
- **Comisiones variables:** Cada vendor puede tener comisión diferente (negociable)

---

#### 4. **addresses** - Direcciones de envío/facturación
```sql
CREATE TABLE addresses (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- DUEÑO DE LA DIRECCIÓN (SOLO UNO PUEDE TENER VALOR)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,        -- Cliente
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,    -- Vendedor (bodega)

    -- TIPO DE DIRECCIÓN
    address_type VARCHAR(20) NOT NULL,            -- 'shipping', 'billing', 'warehouse'

    -- INFORMACIÓN DE DIRECCIÓN
    first_name VARCHAR(100),                      -- Nombre del destinatario
    last_name VARCHAR(100),                       -- Apellido del destinatario
    company VARCHAR(255),                         -- Empresa (opcional)
    address_line1 VARCHAR(255) NOT NULL,          -- Calle y número
    address_line2 VARCHAR(255),                   -- Piso, depto (opcional)
    city VARCHAR(100) NOT NULL,                   -- Ciudad
    state VARCHAR(100),                           -- Estado/Provincia
    postal_code VARCHAR(20) NOT NULL,             -- Código postal
    country_code CHAR(2) NOT NULL,                -- Código ISO (US, MX, ES, etc.)

    -- CONFIGURACIÓN
    is_default BOOLEAN DEFAULT FALSE,             -- Dirección por defecto

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINT: La dirección pertenece a user O vendor, no a ambos
    CHECK ((user_id IS NOT NULL AND vendor_id IS NULL) OR
           (user_id IS NULL AND vendor_id IS NOT NULL))
);

-- ÍNDICES
CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_addresses_vendor ON addresses(vendor_id);
CREATE INDEX idx_addresses_default ON addresses(is_default) WHERE is_default = TRUE;
```

**Descripción:**
- **Propósito:** Direcciones de envío de clientes y bodegas de vendedores
- **Polimórfico:** Puede pertenecer a user o vendor (pero no a ambos)
- **Validación:** El país debe ser un código ISO válido (integración con Shippo)

---

### CATEGORÍA 3: PRODUCTOS Y CATEGORÍAS (4 tablas)

#### 5. **categories** - Categorías de productos (jerárquicas)
```sql
CREATE TABLE categories (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- JERARQUÍA (CATEGORÍAS PADRE-HIJO)
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,

    -- INFORMACIÓN DE CATEGORÍA
    name VARCHAR(255) NOT NULL,                   -- Nombre visible
    slug VARCHAR(255) UNIQUE NOT NULL,            -- URL amigable (electronics)
    description TEXT,                             -- Descripción
    icon_name VARCHAR(50),                        -- Nombre del icono (Lucide React)
    image_url TEXT,                               -- Imagen de portada (S3)

    -- ESTADO
    is_active BOOLEAN DEFAULT TRUE,               -- Categoría activa

    -- ORDENAMIENTO
    sort_order INTEGER DEFAULT 0,                 -- Orden de visualización

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = TRUE;
```

**Descripción:**
- **Jerarquía:** Permite categorías anidadas (Electronics > Smartphones > iPhone)
- **Ejemplo:**
  ```
  Electronics (parent_id: NULL)
    └─ Smartphones (parent_id: electronics-uuid)
       ├─ iPhone (parent_id: smartphones-uuid)
       └─ Android (parent_id: smartphones-uuid)
  ```

---

#### 6. **products** - Catálogo de productos
```sql
CREATE TABLE products (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIONES
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

    -- INFORMACIÓN BÁSICA
    title VARCHAR(500) NOT NULL,                  -- Título del producto
    slug VARCHAR(600) UNIQUE NOT NULL,            -- URL amigable
    description TEXT,                             -- Descripción HTML (sanitizada)

    -- PRECIO E INVENTARIO
    base_price DECIMAL(12,2) NOT NULL,            -- Precio base (antes de variantes)
    sku VARCHAR(100) UNIQUE,                      -- SKU único del producto
    inventory_quantity INTEGER DEFAULT 0,         -- Stock disponible
    low_stock_threshold INTEGER DEFAULT 10,       -- Alerta de stock bajo

    -- METADATA
    tags TEXT[],                                  -- Array de tags para búsqueda
    images JSONB,                                 -- Array de URLs de imágenes
    -- Ejemplo: [{"url": "https://...", "alt": "...", "order": 1}]

    -- DIMENSIONES Y PESO (para envíos)
    weight DECIMAL(8,2),                          -- Peso en gramos
    length DECIMAL(8,2),                          -- Largo en cm
    width DECIMAL(8,2),                           -- Ancho en cm
    height DECIMAL(8,2),                          -- Alto en cm

    -- ESTADO
    status VARCHAR(20) DEFAULT 'draft',           -- 'draft', 'active', 'archived'

    -- ESTADÍSTICAS
    view_count INTEGER DEFAULT 0,                 -- Vistas del producto
    sales_count INTEGER DEFAULT 0,                -- Ventas totales

    -- SEO
    meta_title VARCHAR(255),                      -- Título para SEO
    meta_description TEXT,                        -- Descripción para SEO

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP                          -- Soft delete
);

-- ÍNDICES
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_price ON products(base_price);
CREATE INDEX idx_products_sales ON products(sales_count DESC);

-- ÍNDICE GIN PARA BÚSQUEDA DE TAGS
CREATE INDEX idx_products_tags ON products USING GIN(tags);
```

**Descripción:**
- **Propósito:** Catálogo principal de productos
- **Imágenes JSONB:** Permite múltiples imágenes con metadatos
- **Tags:** Mejoran la búsqueda (ej: ["laptop", "gaming", "rgb"])
- **Elasticsearch:** Los productos activos se indexan automáticamente

---

#### 7. **product_variants** - Variantes de productos (tallas, colores)
```sql
CREATE TABLE product_variants (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIÓN CON PRODUCTO
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- INFORMACIÓN DE VARIANTE
    title VARCHAR(255) NOT NULL,                  -- Ej: "Large / Red"
    sku VARCHAR(100) UNIQUE NOT NULL,             -- SKU único de la variante

    -- PRECIO MODIFICADO
    price DECIMAL(12,2) NOT NULL,                 -- Precio específico de la variante
    compare_at_price DECIMAL(12,2),               -- Precio original (para descuentos)

    -- OPCIONES (hasta 3 niveles)
    option1_name VARCHAR(50),                     -- Ej: "Size"
    option1_value VARCHAR(100),                   -- Ej: "Large"
    option2_name VARCHAR(50),                     -- Ej: "Color"
    option2_value VARCHAR(100),                   -- Ej: "Red"
    option3_name VARCHAR(50),                     -- Ej: "Material"
    option3_value VARCHAR(100),                   -- Ej: "Cotton"

    -- INVENTARIO
    inventory_quantity INTEGER DEFAULT 0,         -- Stock de esta variante

    -- IMAGEN ESPECÍFICA
    image_url TEXT,                               -- Imagen de la variante (opcional)

    -- ESTADO
    is_available BOOLEAN DEFAULT TRUE,            -- Disponible para venta

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
```

**Ejemplo:**
```
Producto: "T-Shirt Premium"
  Variante 1: Small / Red  → $19.99
  Variante 2: Small / Blue → $19.99
  Variante 3: Large / Red  → $21.99
  Variante 4: Large / Blue → $21.99
```

---

#### 8. **reviews** - Reseñas de productos
```sql
CREATE TABLE reviews (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIONES
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,

    -- CONTENIDO DE LA RESEÑA
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),                           -- Título de la reseña
    comment TEXT NOT NULL,                        -- Comentario del usuario

    -- VERIFICACIÓN
    is_verified BOOLEAN DEFAULT FALSE,            -- Review verificada (compra real)

    -- IMÁGENES DE RESEÑA
    images JSONB,                                 -- Fotos del producto subidas por usuario

    -- UTILIDAD
    helpful_count INTEGER DEFAULT 0,              -- Cuántos usuarios marcaron como útil

    -- RESPUESTA DEL VENDEDOR
    vendor_response TEXT,                         -- Respuesta del vendedor
    vendor_response_at TIMESTAMP,                 -- Fecha de respuesta

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINT: Solo un review por producto por usuario
    UNIQUE(product_id, user_id)
);

-- ÍNDICES
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_verified ON reviews(is_verified) WHERE is_verified = TRUE;
```

**Descripción:**
- **Propósito:** Sistema de reseñas y ratings
- **Verificación:** Solo se marcan como verificadas si hay compra real (order_item_id)
- **Rating promedio:** Se calcula y almacena en la tabla products

---

### CATEGORÍA 4: ÓRDENES Y PAGOS (4 tablas)

#### 9. **orders** - Órdenes maestras de clientes
```sql
CREATE TABLE orders (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIÓN CON USUARIO
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- NÚMERO DE ORDEN (VISIBLE AL CLIENTE)
    order_number VARCHAR(50) UNIQUE NOT NULL,     -- Ej: "ORD-2025-00123"

    -- INFORMACIÓN DE CONTACTO
    email VARCHAR(255) NOT NULL,                  -- Email de confirmación
    phone VARCHAR(20),                            -- Teléfono de contacto

    -- DIRECCIONES (ALMACENADAS EN JSONB)
    shipping_address JSONB NOT NULL,              -- Dirección de envío
    billing_address JSONB NOT NULL,               -- Dirección de facturación
    -- Estructura: {"first_name": "...", "address_line1": "...", etc.}

    -- TOTALES
    subtotal DECIMAL(12,2) NOT NULL,              -- Suma de items (sin envío)
    shipping_total DECIMAL(12,2) DEFAULT 0,       -- Costo total de envío
    tax_total DECIMAL(12,2) DEFAULT 0,            -- Impuestos
    discount_total DECIMAL(12,2) DEFAULT 0,       -- Descuentos aplicados
    grand_total DECIMAL(12,2) NOT NULL,           -- Total final a pagar

    -- ESTADO DEL PAGO
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    payment_method VARCHAR(50),                   -- 'stripe', 'paypal', etc.

    -- STRIPE
    stripe_payment_intent_id VARCHAR(255),        -- ID del Payment Intent
    stripe_charge_id VARCHAR(255),                -- ID del Charge

    -- NOTAS
    customer_notes TEXT,                          -- Notas del cliente

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP                             -- Fecha de pago exitoso
);

-- ÍNDICES
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_stripe ON orders(stripe_payment_intent_id);
```

**Descripción:**
- **Orden Maestra:** Contiene el total que pagó el cliente
- **Multi-vendor:** Una orden puede contener productos de múltiples vendedores
- **División:** La orden se divide en N sub-órdenes (una por vendor)

---

#### 10. **sub_orders** - Sub-órdenes por vendedor
```sql
CREATE TABLE sub_orders (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIONES
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,

    -- NÚMERO DE SUB-ORDEN
    suborder_number VARCHAR(50) NOT NULL,         -- Ej: "ORD-2025-00123-1"

    -- TOTALES DE ESTA SUB-ORDEN
    subtotal DECIMAL(12,2) NOT NULL,              -- Suma de items del vendor
    shipping_cost DECIMAL(12,2) DEFAULT 0,        -- Envío de este vendor
    tax DECIMAL(12,2) DEFAULT 0,                  -- Impuestos
    total DECIMAL(12,2) NOT NULL,                 -- Total de esta sub-orden

    -- COMISIONES Y PAYOUT
    commission_rate DECIMAL(5,2) NOT NULL,        -- % comisión (copiado del vendor)
    commission_amount DECIMAL(12,2) NOT NULL,     -- Monto de comisión
    vendor_payout DECIMAL(12,2) NOT NULL,         -- Lo que recibe el vendor

    -- ESTADO DE LA SUB-ORDEN
    status VARCHAR(20) DEFAULT 'pending',         -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled'

    -- ENVÍO
    tracking_number VARCHAR(255),                 -- Número de tracking
    carrier VARCHAR(100),                         -- Transportista (FedEx, UPS, etc.)
    shipped_at TIMESTAMP,                         -- Fecha de envío
    delivered_at TIMESTAMP,                       -- Fecha de entrega

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINT ÚNICO: No duplicar sub-órdenes
    UNIQUE(order_id, vendor_id)
);

-- ÍNDICES
CREATE INDEX idx_suborders_order ON sub_orders(order_id);
CREATE INDEX idx_suborders_vendor ON sub_orders(vendor_id);
CREATE INDEX idx_suborders_status ON sub_orders(status);
CREATE INDEX idx_suborders_number ON sub_orders(suborder_number);
```

**Ejemplo de Cálculo:**
```
Cliente compra:
  - Producto A (Vendor 1): $100
  - Producto B (Vendor 1): $50
  - Producto C (Vendor 2): $200

Sub-Orden 1 (Vendor 1):
  Subtotal: $150
  Envío: $10
  Total: $160
  Comisión (10%): $16
  Vendor recibe: $144

Sub-Orden 2 (Vendor 2):
  Subtotal: $200
  Envío: $15
  Total: $215
  Comisión (10%): $21.50
  Vendor recibe: $193.50

Orden Total: $375 ($160 + $215)
Kreo retiene: $37.50 ($16 + $21.50)
```

---

#### 11. **order_items** - Items de una sub-orden
```sql
CREATE TABLE order_items (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIONES
    sub_order_id UUID NOT NULL REFERENCES sub_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,

    -- SNAPSHOT DE DATOS (por si el producto se modifica después)
    product_title VARCHAR(500) NOT NULL,          -- Título en momento de compra
    product_sku VARCHAR(100),                     -- SKU en momento de compra
    variant_title VARCHAR(255),                   -- Variante seleccionada
    product_image_url TEXT,                       -- Imagen para mostrar en orden

    -- CANTIDADES Y PRECIOS
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,            -- Precio unitario
    total_price DECIMAL(12,2) NOT NULL,           -- quantity * unit_price

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES
CREATE INDEX idx_order_items_suborder ON order_items(sub_order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

**Descripción:**
- **Snapshot:** Guarda título y precio del momento de compra
- **Inmutable:** Una vez creado, no debería modificarse
- **Propósito:** Si el vendor cambia el precio del producto, la orden histórica mantiene el precio original

---

#### 12. **vendor_payouts** - Pagos a vendedores
```sql
CREATE TABLE vendor_payouts (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIONES
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE SET NULL,

    -- MONTOS
    gross_amount DECIMAL(12,2) NOT NULL,          -- Monto bruto de la sub-orden
    commission_amount DECIMAL(12,2) NOT NULL,     -- Comisión de Kreo
    net_amount DECIMAL(12,2) NOT NULL,            -- Monto neto que recibe vendor

    -- STRIPE CONNECT
    stripe_transfer_id VARCHAR(255),              -- ID del transfer de Stripe
    stripe_payout_id VARCHAR(255),                -- ID del payout a cuenta bancaria

    -- ESTADO
    status VARCHAR(20) DEFAULT 'pending',         -- 'pending', 'processing', 'paid', 'failed'

    -- FECHAS
    paid_at TIMESTAMP,                            -- Fecha de pago exitoso
    failed_at TIMESTAMP,                          -- Fecha de fallo
    failure_reason TEXT,                          -- Razón de fallo

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES
CREATE INDEX idx_payouts_vendor ON vendor_payouts(vendor_id);
CREATE INDEX idx_payouts_suborder ON vendor_payouts(sub_order_id);
CREATE INDEX idx_payouts_status ON vendor_payouts(status);
CREATE INDEX idx_payouts_paid ON vendor_payouts(paid_at);
```

**Descripción:**
- **Propósito:** Registro de todos los pagos a vendedores
- **Flujo:**
  1. Cliente paga → Kreo retiene el dinero completo
  2. Vendor envía producto → se crea payout pending
  3. Cliente confirma recepción → payout se marca como processing
  4. Stripe transfiere fondos → payout se marca como paid

---

### CATEGORÍA 5: ENVÍOS (2 tablas)

#### 13. **shipping_zones** - Zonas de envío por vendedor
```sql
CREATE TABLE shipping_zones (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIÓN CON VENDOR
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

    -- INFORMACIÓN DE LA ZONA
    name VARCHAR(255) NOT NULL,                   -- Ej: "North America"
    description TEXT,                             -- Descripción

    -- PAÍSES INCLUIDOS (CÓDIGOS ISO)
    countries TEXT[] NOT NULL,                    -- Ej: ['US', 'CA', 'MX']

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES
CREATE INDEX idx_shipping_zones_vendor ON shipping_zones(vendor_id);
CREATE INDEX idx_shipping_zones_countries ON shipping_zones USING GIN(countries);
```

**Ejemplo:**
```
Vendor A configura:
  Zona 1: "USA" (['US'])
  Zona 2: "Canada" (['CA'])
  Zona 3: "Latin America" (['MX', 'AR', 'BR', 'CO'])
```

---

#### 14. **shipping_rates** - Tarifas de envío por zona
```sql
CREATE TABLE shipping_rates (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIÓN CON ZONA
    shipping_zone_id UUID NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,

    -- INFORMACIÓN DE LA TARIFA
    name VARCHAR(255) NOT NULL,                   -- Ej: "Standard", "Express", "Free"
    price DECIMAL(12,2) NOT NULL,                 -- Costo de envío

    -- CONDICIONES
    min_order_value DECIMAL(12,2) DEFAULT 0,      -- Pedido mínimo
    max_order_value DECIMAL(12,2),                -- Pedido máximo (NULL = sin límite)

    -- TIEMPOS DE ENTREGA
    estimated_days_min INTEGER,                   -- Días mínimos
    estimated_days_max INTEGER,                   -- Días máximos

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES
CREATE INDEX idx_shipping_rates_zone ON shipping_rates(shipping_zone_id);
```

**Ejemplo:**
```
Zona "USA":
  Tarifa 1: "Standard" → $5.00 (5-7 días)
  Tarifa 2: "Express" → $15.00 (2-3 días)
  Tarifa 3: "Free Shipping" → $0 (solo si pedido > $50, 7-10 días)
```

---

### CATEGORÍA 6: DESCUENTOS (1 tabla)

#### 15. **discount_codes** - Códigos de descuento
```sql
CREATE TABLE discount_codes (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- DUEÑO DEL CÓDIGO
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,  -- NULL = código global de Kreo

    -- CÓDIGO DE DESCUENTO
    code VARCHAR(50) UNIQUE NOT NULL,             -- Ej: "SAVE20", "SUMMER2025"

    -- TIPO Y VALOR
    discount_type VARCHAR(20) NOT NULL,           -- 'percentage', 'fixed_amount', 'free_shipping'
    discount_value DECIMAL(12,2) NOT NULL,        -- 20.00 (%) o 10.00 ($)

    -- APLICABILIDAD
    applies_to VARCHAR(20) DEFAULT 'order',       -- 'order', 'product', 'category'

    -- CONDICIONES
    min_purchase_amount DECIMAL(12,2) DEFAULT 0,  -- Compra mínima requerida
    max_discount_amount DECIMAL(12,2),            -- Descuento máximo (para porcentajes)

    -- LÍMITES DE USO
    usage_limit INTEGER,                          -- Usos máximos totales (NULL = ilimitado)
    usage_limit_per_user INTEGER,                 -- Usos por usuario
    usage_count INTEGER DEFAULT 0,                -- Usos hasta ahora

    -- VIGENCIA
    starts_at TIMESTAMP NOT NULL,                 -- Inicio de vigencia
    ends_at TIMESTAMP,                            -- Fin de vigencia (NULL = no expira)

    -- ESTADO
    is_active BOOLEAN DEFAULT TRUE,               -- Activo/Inactivo

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_vendor ON discount_codes(vendor_id);
CREATE INDEX idx_discount_codes_active ON discount_codes(is_active, starts_at, ends_at);
```

**Ejemplos:**
```sql
-- Descuento del 20% para todo el sitio (global)
INSERT INTO discount_codes (code, discount_type, discount_value, starts_at)
VALUES ('SAVE20', 'percentage', 20.00, '2025-01-01');

-- $10 de descuento (solo vendor específico)
INSERT INTO discount_codes (vendor_id, code, discount_type, discount_value)
VALUES ('vendor-uuid', 'TEN-OFF', 'fixed_amount', 10.00);

-- Envío gratis (solo si compra > $50)
INSERT INTO discount_codes (code, discount_type, min_purchase_amount)
VALUES ('FREESHIP', 'free_shipping', 50.00);
```

---

### CATEGORÍA 7: NOTIFICACIONES Y LOGS (2 tablas)

#### 16. **notifications** - Notificaciones a usuarios
```sql
CREATE TABLE notifications (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- DESTINATARIO
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- TIPO Y CANAL
    type VARCHAR(50) NOT NULL,                    -- 'order_shipped', 'payment_received', etc.
    channel VARCHAR(20) NOT NULL,                 -- 'email', 'sms', 'push', 'in_app'

    -- CONTENIDO
    subject VARCHAR(255),                         -- Asunto (para email)
    content TEXT NOT NULL,                        -- Cuerpo del mensaje

    -- ESTADO
    status VARCHAR(20) DEFAULT 'pending',         -- 'pending', 'sent', 'failed', 'bounced'

    -- FECHAS
    sent_at TIMESTAMP,                            -- Cuándo se envió
    read_at TIMESTAMP,                            -- Cuándo se leyó (in-app)

    -- METADATA (datos adicionales en JSON)
    metadata JSONB,                               -- Ej: {"order_id": "...", "tracking": "..."}

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

**Tipos de notificación:**
- `order_confirmed` - Orden confirmada
- `order_shipped` - Orden enviada
- `order_delivered` - Orden entregada
- `payment_received` - Pago recibido (vendor)
- `review_posted` - Nueva review en tu producto (vendor)
- `low_stock_alert` - Stock bajo (vendor)

---

#### 17. **activity_logs** - Registro de actividades
```sql
CREATE TABLE activity_logs (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- QUIÉN REALIZÓ LA ACCIÓN
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- QUÉ ACCIÓN SE REALIZÓ
    action VARCHAR(100) NOT NULL,                 -- 'product_created', 'order_placed', etc.

    -- SOBRE QUÉ ENTIDAD
    entity_type VARCHAR(50),                      -- 'product', 'order', 'user', etc.
    entity_id UUID,                               -- ID de la entidad afectada

    -- DETALLES DE LA ACCIÓN
    description TEXT,                             -- Descripción legible
    changes JSONB,                                -- Cambios realizados (antes/después)

    -- INFORMACIÓN DE CONTEXTO
    ip_address INET,                              -- IP desde donde se hizo la acción
    user_agent TEXT,                              -- Navegador/dispositivo

    -- TIMESTAMP
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
```

**Ejemplos de actividad:**
```json
{
  "action": "product_price_changed",
  "entity_type": "product",
  "entity_id": "product-uuid",
  "changes": {
    "before": {"base_price": 99.99},
    "after": {"base_price": 79.99}
  }
}
```

---

### CATEGORÍA 8: OTRAS TABLAS (4 tablas adicionales)

#### 18. **carts** - Carritos de compra (persistentes)
```sql
CREATE TABLE carts (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- DUEÑO DEL CARRITO
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,  -- NULL si es anónimo
    session_id VARCHAR(255),                      -- ID de sesión para usuarios no registrados

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP                          -- Expiración del carrito (30 días)
);

-- ÍNDICES
CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_session ON carts(session_id);
```

---

#### 19. **cart_items** - Items del carrito
```sql
CREATE TABLE cart_items (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIONES
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,

    -- CANTIDAD
    quantity INTEGER NOT NULL CHECK (quantity > 0),

    -- SNAPSHOT DE PRECIO (actualizado periódicamente)
    price_snapshot DECIMAL(12,2) NOT NULL,        -- Precio actual del producto

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINT: No duplicar items en el carrito
    UNIQUE(cart_id, product_id, variant_id)
);

-- ÍNDICES
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);
```

---

#### 20. **wishlists** - Lista de deseos
```sql
CREATE TABLE wishlists (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIONES
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINT: Un producto solo puede estar una vez en wishlist
    UNIQUE(user_id, product_id)
);

-- ÍNDICES
CREATE INDEX idx_wishlists_user ON wishlists(user_id);
CREATE INDEX idx_wishlists_product ON wishlists(product_id);
```

---

#### 21. **product_views** - Tracking de vistas de productos
```sql
CREATE TABLE product_views (
    -- CLAVE PRIMARIA
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELACIONES
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,   -- NULL si es anónimo

    -- INFORMACIÓN DE CONTEXTO
    ip_address INET,                              -- IP del visitante
    user_agent TEXT,                              -- Navegador/dispositivo
    referrer TEXT,                                -- De dónde vino (Google, Facebook, etc.)

    -- TIMESTAMP
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES
CREATE INDEX idx_product_views_product ON product_views(product_id);
CREATE INDEX idx_product_views_user ON product_views(user_id);
CREATE INDEX idx_product_views_date ON product_views(viewed_at DESC);
```

---

## 🔗 RESUMEN DE RELACIONES

### Relaciones 1:1 (Un usuario puede tener solo una tienda)
- users ↔ vendors

### Relaciones 1:N (Un usuario puede tener muchas órdenes)
- users → orders
- users → reviews
- users → addresses
- users → oauth_connections
- vendors → products
- products → product_variants
- products → reviews
- orders → sub_orders
- sub_orders → order_items
- vendors → shipping_zones
- shipping_zones → shipping_rates

### Relaciones N:M (Muchos a muchos)
- users ↔ products (via wishlists)
- users ↔ products (via product_views)

---

## 📊 ESTADÍSTICAS CALCULADAS

Algunos campos se calculan periódicamente con jobs:

```sql
-- Actualizar rating promedio de productos
UPDATE products p SET average_rating = (
  SELECT AVG(rating) FROM reviews WHERE product_id = p.id
);

-- Actualizar total de ventas de vendor
UPDATE vendors v SET
  total_sales_count = (SELECT COUNT(*) FROM sub_orders WHERE vendor_id = v.id),
  total_revenue = (SELECT SUM(vendor_payout) FROM vendor_payouts WHERE vendor_id = v.id AND status = 'paid');
```

---

## 🔐 SEGURIDAD

1. **Contraseñas:** Siempre hasheadas con bcrypt (12 rounds)
2. **Soft Delete:** Usar `deleted_at` en vez de DELETE
3. **Auditoría:** Todos los cambios críticos van a `activity_logs`
4. **Row-Level Security:** Usuarios solo pueden ver sus propios datos
5. **Prepared Statements:** TypeORM previene SQL injection
6. **Rate Limiting:** En Redis para prevenir abuso

---

**Generado el:** 2025-12-28
**Por:** Claude Code Assistant
