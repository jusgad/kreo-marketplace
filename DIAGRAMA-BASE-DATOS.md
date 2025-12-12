# DIAGRAMA DE BASE DE DATOS - KREO MARKETPLACE

## 📊 VISTA GENERAL: 21 TABLAS

```
┌─────────────────────────────────────────────────────────────────────┐
│                     KREO MARKETPLACE DATABASE                       │
│                         21 Tablas Total                             │
└─────────────────────────────────────────────────────────────────────┘

 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │ AUTENTICACIÓN│  │  VENDEDORES  │  │  PRODUCTOS   │  │   ÓRDENES    │
 │              │  │              │  │              │  │              │
 │ • users      │  │ • vendors    │  │ • categories │  │ • orders     │
 │ • oauth_     │  │ • addresses  │  │ • products   │  │ • sub_orders │
 │   connections│  │              │  │ • variants   │  │ • order_items│
 │              │  │              │  │ • reviews    │  │              │
 └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘

 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │    PAGOS     │  │   ENVÍOS     │  │  DESCUENTOS  │  │   SISTEMA    │
 │              │  │              │  │              │  │              │
 │ • vendor_    │  │ • shipping_  │  │ • discount_  │  │ • notifications
 │   payouts    │  │   zones      │  │   codes      │  │ • activity_  │
 │              │  │ • shipping_  │  │              │  │   logs       │
 │              │  │   rates      │  │              │  │              │
 └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🔗 DIAGRAMA DE RELACIONES DETALLADO

### NIVEL 1: USUARIOS Y AUTENTICACIÓN

```
                    ┌─────────────────────────┐
                    │       USERS             │
                    │ ======================= │
                    │ PK  id (UUID)           │
                    │     email (UNIQUE)      │
                    │     password_hash       │
                    │     role                │◄──────────┐
                    │     first_name          │           │
                    │     last_name           │           │
                    │     phone               │           │
                    │     email_verified      │           │
                    │     two_factor_enabled  │           │
                    └──────────┬──────────────┘           │
                               │                          │
                               │ 1:N                      │
                               ▼                          │
                    ┌─────────────────────────┐           │
                    │  OAUTH_CONNECTIONS      │           │
                    │ ======================= │           │
                    │ PK  id                  │           │
                    │ FK  user_id ────────────┘           │
                    │     provider (google,fb)│           │
                    │     provider_user_id    │           │
                    │     access_token        │           │
                    │     refresh_token       │           │
                    └─────────────────────────┘           │
                                                          │
                                                          │ 1:1
                                                          │
```

### NIVEL 2: VENDEDORES

```
                    ┌─────────────────────────┐
                    │       VENDORS           │
                    │ ======================= │
                    │ PK  id (UUID)           │
                    │ FK  user_id (UNIQUE)────┼──► users.id
                    │     shop_name           │
                    │     shop_slug (UNIQUE)  │
                    │     shop_description    │
                    │     stripe_account_id   │
                    │     commission_rate     │
                    │     is_verified         │
                    │     total_sales_count   │
                    │     average_rating      │
                    └──────┬──────────────────┘
                           │
                           │ 1:N
                           ▼
                    ┌─────────────────────────┐
                    │      ADDRESSES          │
                    │ ======================= │
                    │ PK  id                  │
                    │ FK  user_id ────────────┼──► users.id
                    │ FK  vendor_id ──────────┼──► vendors.id
                    │     address_type        │    (solo uno puede tener valor)
                    │     address_line1       │
                    │     city, state         │
                    │     postal_code         │
                    │     country_code        │
                    │     is_default          │
                    └─────────────────────────┘

NOTA: Una dirección puede pertenecer a un USER o un VENDOR, pero no a ambos
```

### NIVEL 3: PRODUCTOS

```
       ┌─────────────────────────┐
       │     CATEGORIES          │
       │ ======================= │
       │ PK  id                  │
       │ FK  parent_id ──────────┼──► categories.id (auto-referencia)
       │     name                │    (categorías jerárquicas)
       │     slug (UNIQUE)       │
       │     description         │
       │     is_active           │
       └──────────┬──────────────┘
                  │
                  │ 1:N
                  ▼
       ┌─────────────────────────┐
       │      PRODUCTS           │
       │ ======================= │
       │ PK  id (UUID)           │
       │ FK  vendor_id ──────────┼──► vendors.id
       │ FK  category_id ────────┼──► categories.id
       │     title               │
       │     slug (UNIQUE)       │
       │     description         │
       │     base_price          │
       │     sku                 │
       │     inventory_quantity  │
       │     tags (array)        │
       │     images (JSONB)      │
       │     status              │
       │     view_count          │
       │     sales_count         │
       └──────┬──────────────┬───┘
              │              │
              │ 1:N          │ 1:N
              ▼              ▼
   ┌────────────────┐  ┌────────────────┐
   │PRODUCT_VARIANTS│  │    REVIEWS     │
   │ ============== │  │ ============== │
   │PK  id          │  │PK  id          │
   │FK  product_id ─┤  │FK  product_id ─┤
   │    title       │  │FK  user_id ────┼──► users.id
   │    sku (UNIQUE)│  │FK  order_item_id
   │    price       │  │    rating (1-5)│
   │    option1     │  │    title       │
   │    option2     │  │    comment     │
   │    option3     │  │    is_verified │
   │    inventory   │  │    helpful_count
   │    image_url   │  └────────────────┘
   └────────────────┘
```

### NIVEL 4: ÓRDENES (MULTI-VENDOR)

```
┌────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE ÓRDENES                           │
└────────────────────────────────────────────────────────────────────┘

   ┌─────────────────────────┐
   │       ORDERS            │ ◄─── ORDEN MAESTRA DEL CLIENTE
   │ ======================= │
   │ PK  id (UUID)           │
   │ FK  user_id ────────────┼──► users.id
   │     order_number (UNIQUE)
   │     email               │
   │     shipping_address    │      (JSONB)
   │     billing_address     │      (JSONB)
   │     subtotal            │      $150
   │     shipping_total      │      $10
   │     grand_total         │      $160
   │     payment_status      │
   │     stripe_payment_     │
   │       intent_id         │
   └──────────┬──────────────┘
              │
              │ 1:N (una orden puede tener múltiples sub-órdenes)
              ▼
   ┌─────────────────────────┐
   │      SUB_ORDERS         │ ◄─── UNA SUB-ORDEN POR VENDOR
   │ ======================= │
   │ PK  id (UUID)           │
   │ FK  order_id ───────────┼──► orders.id
   │ FK  vendor_id ──────────┼──► vendors.id
   │     suborder_number     │      ORD-123-1
   │     subtotal            │      $80
   │     shipping_cost       │      $5
   │     total               │      $85
   │     commission_rate     │      10.00%
   │     commission_amount   │      $8.50
   │     vendor_payout       │      $76.50
   │     status              │      'shipped'
   │     tracking_number     │
   └──────────┬──────────────┘
              │
              │ 1:N
              ▼
   ┌─────────────────────────┐
   │     ORDER_ITEMS         │ ◄─── ITEMS DE UNA SUB-ORDEN
   │ ======================= │
   │ PK  id                  │
   │ FK  sub_order_id ───────┼──► sub_orders.id
   │ FK  product_id ─────────┼──► products.id
   │ FK  variant_id ─────────┼──► product_variants.id
   │     product_title       │      (snapshot)
   │     quantity            │      2
   │     unit_price          │      $25
   │     total_price         │      $50
   └─────────────────────────┘

EJEMPLO DE ORDEN MULTI-VENDOR:

Cliente hace una orden de $160:
  ├─ Sub-Orden 1 (Vendor A): $85
  │   ├─ Producto A1: 2 × $25 = $50
  │   ├─ Producto A2: 1 × $30 = $30
  │   ├─ Envío: $5
  │   └─ Vendor recibe: $76.50 (después de comisión 10%)
  │
  └─ Sub-Orden 2 (Vendor B): $75
      ├─ Producto B1: 1 × $70 = $70
      ├─ Envío: $5
      └─ Vendor recibe: $67.50 (después de comisión 10%)
```

### NIVEL 5: PAGOS A VENDEDORES

```
   ┌─────────────────────────┐
   │    VENDOR_PAYOUTS       │
   │ ======================= │
   │ PK  id                  │
   │ FK  vendor_id ──────────┼──► vendors.id
   │ FK  sub_order_id ───────┼──► sub_orders.id
   │     gross_amount        │      $85.00
   │     commission_amount   │      $8.50
   │     net_amount          │      $76.50
   │     stripe_transfer_id  │
   │     stripe_payout_id    │
   │     status              │      'paid'
   │     paid_at             │
   └─────────────────────────┘

FLUJO DE PAGO:
1. Cliente paga $160 con tarjeta (Stripe)
2. Kreo retiene el dinero completo
3. Cuando vendor envía, Kreo transfiere:
   - Vendor A: $76.50 (85 - 8.50)
   - Vendor B: $67.50 (75 - 7.50)
4. Kreo retiene: $16.00 (comisión total 10%)
```

### NIVEL 6: ENVÍOS

```
   ┌─────────────────────────┐
   │    SHIPPING_ZONES       │
   │ ======================= │
   │ PK  id                  │
   │ FK  vendor_id ──────────┼──► vendors.id
   │     name                │      "North America"
   │     countries (array)   │      ['US', 'CA', 'MX']
   └──────────┬──────────────┘
              │
              │ 1:N
              ▼
   ┌─────────────────────────┐
   │    SHIPPING_RATES       │
   │ ======================= │
   │ PK  id                  │
   │ FK  shipping_zone_id ───┼──► shipping_zones.id
   │     name                │      "Standard"
   │     price               │      $5.00
   │     min_order_value     │      $0
   │     max_order_value     │      null
   │     estimated_days_min  │      5
   │     estimated_days_max  │      7
   └─────────────────────────┘

EJEMPLO:
Vendor A configura:
  Zona "USA" (['US']):
    ├─ Standard: $5 (5-7 días)
    ├─ Express: $15 (2-3 días)
    └─ Free: $0 (pedidos > $50, 7-10 días)

  Zona "Canada" (['CA']):
    ├─ Standard: $10 (7-10 días)
    └─ Express: $25 (3-5 días)
```

### NIVEL 7: DESCUENTOS

```
   ┌─────────────────────────┐
   │    DISCOUNT_CODES       │
   │ ======================= │
   │ PK  id                  │
   │ FK  vendor_id ──────────┼──► vendors.id (NULL si es global)
   │     code (UNIQUE)       │      "SAVE20"
   │     discount_type       │      "percentage"
   │     discount_value      │      20.00
   │     applies_to          │      "order"
   │     min_purchase_amount │      $50
   │     usage_limit         │      100
   │     usage_count         │      23
   │     starts_at           │      2024-12-01
   │     ends_at             │      2024-12-31
   │     is_active           │      true
   └─────────────────────────┘

TIPOS DE DESCUENTO:
  • percentage: 20% de descuento
  • fixed_amount: $10 de descuento
  • free_shipping: Envío gratis
```

### NIVEL 8: SISTEMA

```
   ┌─────────────────────────┐
   │    NOTIFICATIONS        │
   │ ======================= │
   │ PK  id                  │
   │ FK  user_id ────────────┼──► users.id
   │     type                │      "order_shipped"
   │     channel             │      "email"
   │     subject             │
   │     content             │
   │     status              │      "sent"
   │     sent_at             │
   │     metadata (JSONB)    │
   └─────────────────────────┘

   ┌─────────────────────────┐
   │    ACTIVITY_LOGS        │
   │ ======================= │
   │ PK  id                  │
   │ FK  user_id ────────────┼──► users.id
   │     action              │      "product_created"
   │     entity_type         │      "product"
   │     entity_id           │      UUID
   │     ip_address          │
   │     user_agent          │
   │     changes (JSONB)     │
   │     created_at          │
   └─────────────────────────┘
```

---

## 📋 RESUMEN DE RELACIONES

### 1. USERS es el centro del sistema:
```
users (1) ──► (1) vendors
users (1) ──► (N) oauth_connections
users (1) ──► (N) addresses
users (1) ──► (N) orders
users (1) ──► (N) reviews
users (1) ──► (N) notifications
users (1) ──► (N) activity_logs
```

### 2. VENDORS gestionan su negocio:
```
vendors (1) ──► (N) products
vendors (1) ──► (N) sub_orders
vendors (1) ──► (N) addresses
vendors (1) ──► (N) shipping_zones
vendors (1) ──► (N) discount_codes
vendors (1) ──► (N) vendor_payouts
```

### 3. PRODUCTS tienen múltiples relaciones:
```
products (1) ──► (N) product_variants
products (1) ──► (N) reviews
products (N) ──► (1) categories
products (N) ──► (1) vendors
```

### 4. ORDERS se dividen en SUB_ORDERS:
```
orders (1) ──► (N) sub_orders
sub_orders (1) ──► (N) order_items
sub_orders (N) ──► (1) vendors
sub_orders (1) ──► (1) vendor_payouts
```

### 5. SHIPPING es configurable por vendor:
```
vendors (1) ──► (N) shipping_zones
shipping_zones (1) ──► (N) shipping_rates
```

---

## 🔑 CLAVES FORÁNEAS (FOREIGN KEYS)

Total de FK: **~25 relaciones**

| Tabla | Campo | Referencia | Acción |
|-------|-------|------------|--------|
| oauth_connections | user_id | users.id | CASCADE |
| vendors | user_id | users.id | CASCADE |
| addresses | user_id | users.id | CASCADE |
| addresses | vendor_id | vendors.id | CASCADE |
| categories | parent_id | categories.id | CASCADE |
| products | vendor_id | vendors.id | CASCADE |
| products | category_id | categories.id | SET NULL |
| product_variants | product_id | products.id | CASCADE |
| reviews | product_id | products.id | CASCADE |
| reviews | user_id | users.id | CASCADE |
| reviews | order_item_id | order_items.id | SET NULL |
| orders | user_id | users.id | SET NULL |
| sub_orders | order_id | orders.id | CASCADE |
| sub_orders | vendor_id | vendors.id | SET NULL |
| order_items | sub_order_id | sub_orders.id | CASCADE |
| order_items | product_id | products.id | SET NULL |
| order_items | variant_id | product_variants.id | SET NULL |
| vendor_payouts | vendor_id | vendors.id | CASCADE |
| vendor_payouts | sub_order_id | sub_orders.id | SET NULL |
| shipping_zones | vendor_id | vendors.id | CASCADE |
| shipping_rates | shipping_zone_id | shipping_zones.id | CASCADE |
| discount_codes | vendor_id | vendors.id | CASCADE |
| notifications | user_id | users.id | CASCADE |
| activity_logs | user_id | users.id | SET NULL |

**Acciones:**
- `CASCADE`: Si se borra el padre, se borran los hijos
- `SET NULL`: Si se borra el padre, se pone NULL en los hijos
- `RESTRICT`: No permite borrar el padre si tiene hijos

---

## 📊 TIPOS DE DATOS IMPORTANTES

### UUIDs
Todas las PKs usan UUID v4 generado con `uuid_generate_v4()`

### JSONB
- `products.images`: Array de URLs
- `orders.shipping_address`: Dirección completa
- `orders.billing_address`: Dirección completa
- `notifications.metadata`: Datos extras
- `activity_logs.changes`: Cambios realizados

### Arrays
- `products.tags`: TEXT[]
- `shipping_zones.countries`: TEXT[]

### Enums simulados con CHECK
- `users.role`: 'customer', 'vendor', 'admin'
- `products.status`: 'draft', 'active', 'archived'
- `orders.payment_status`: 'pending', 'paid', 'failed', 'refunded'
- `sub_orders.status`: 'pending', 'processing', 'shipped', 'delivered', 'cancelled'

---

## 🎯 CASOS DE USO COMUNES

### 1. Obtener todos los productos de un vendor:
```sql
SELECT * FROM products WHERE vendor_id = 'vendor-uuid';
```

### 2. Obtener orden completa con sub-órdenes e items:
```sql
SELECT
  o.*,
  so.suborder_number,
  oi.product_title,
  oi.quantity,
  oi.unit_price
FROM orders o
JOIN sub_orders so ON o.id = so.order_id
JOIN order_items oi ON so.id = oi.sub_order_id
WHERE o.id = 'order-uuid';
```

### 3. Calcular total de ventas de un vendor:
```sql
SELECT
  SUM(vendor_payout) as total_earned
FROM sub_orders
WHERE vendor_id = 'vendor-uuid' AND status = 'delivered';
```

### 4. Productos más vendidos:
```sql
SELECT
  title,
  sales_count,
  view_count
FROM products
WHERE status = 'active'
ORDER BY sales_count DESC
LIMIT 10;
```

---

**Fecha de creación:** 2025-12-12
**Para más información:** Ver `GUIA-BASE-DATOS-DESPLIEGUE.md`
