# Kreo Marketplace - Documentación de API

Referencia completa de la API para los microservicios de Kreo Marketplace.

**URL Base**: `http://localhost:3000/api` (Desarrollo)
**Producción**: `https://api.kreo.com`

**Versión de API**: v1
**Formato**: JSON
**Autenticación**: Token Bearer JWT

---

## Tabla de Contenidos

- [Autenticación](#autenticación)
- [Usuarios](#usuarios)
- [Productos](#productos)
- [Carrito](#carrito)
- [Órdenes](#órdenes)
- [Pagos](#pagos)
- [Vendedores](#vendedores)
- [Envíos](#envíos)
- [Manejo de Errores](#manejo-de-errores)
- [Rate Limiting](#rate-limiting)

---

## Autenticación

### Registrar Usuario

Crear una nueva cuenta de usuario.

```http
POST /api/auth/register
```

**Cuerpo de la Petición:**

```json
{
  "email": "usuario@example.com",
  "password": "ContraseñaSegura123!",
  "role": "customer",
  "first_name": "Juan",
  "last_name": "Pérez",
  "phone": "+34612345678"
}
```

**Respuesta:** `201 Created`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@example.com",
    "role": "customer",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email_verified": false,
    "created_at": "2025-01-15T10:30:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Iniciar Sesión

Autenticar y recibir tokens JWT.

```http
POST /api/auth/login
```

**Cuerpo de la Petición:**

```json
{
  "email": "usuario@example.com",
  "password": "ContraseñaSegura123!"
}
```

**Respuesta:** `200 OK`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@example.com",
    "role": "customer",
    "first_name": "Juan",
    "last_name": "Pérez"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 604800
}
```

---

### Renovar Token

Obtener un nuevo access token usando el refresh token.

```http
POST /api/auth/refresh
```

**Cuerpo de la Petición:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 604800
}
```

---

### Obtener Usuario Actual

Obtener el perfil del usuario autenticado.

```http
GET /api/auth/me
Authorization: Bearer {access_token}
```

**Respuesta:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "usuario@example.com",
  "role": "customer",
  "first_name": "Juan",
  "last_name": "Pérez",
  "phone": "+34612345678",
  "avatar_url": "https://cdn.kreo.com/avatars/user123.jpg",
  "email_verified": true,
  "two_factor_enabled": false,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

---

### Habilitar 2FA

Habilitar Autenticación de Dos Factores.

```http
POST /api/auth/2fa/enable
Authorization: Bearer {access_token}
```

**Respuesta:** `200 OK`

```json
{
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "secret": "JBSWY3DPEHPK3PXP",
  "backup_codes": [
    "12345678",
    "87654321",
    "11223344"
  ]
}
```

---

### Verificar Token 2FA

Verificar token TOTP durante el inicio de sesión.

```http
POST /api/auth/2fa/verify
```

**Cuerpo de la Petición:**

```json
{
  "email": "usuario@example.com",
  "token": "123456"
}
```

**Respuesta:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Usuarios

### Actualizar Perfil

Actualizar información del perfil del usuario.

```http
PUT /api/users/profile
Authorization: Bearer {access_token}
```

**Cuerpo de la Petición:**

```json
{
  "first_name": "María",
  "last_name": "García",
  "phone": "+34698765432",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**Respuesta:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "usuario@example.com",
  "first_name": "María",
  "last_name": "García",
  "phone": "+34698765432",
  "avatar_url": "https://example.com/avatar.jpg",
  "updated_at": "2025-01-16T14:20:00Z"
}
```

---

## Productos

### Buscar Productos

Buscar productos con filtros, paginación y ordenamiento.

```http
GET /api/products/search
```

**Parámetros de Consulta:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|----------|-------------|
| `q` | string | No | Consulta de búsqueda (título, descripción, etiquetas) |
| `category` | string | No | ID o slug de categoría |
| `min_price` | number | No | Filtro de precio mínimo |
| `max_price` | number | No | Filtro de precio máximo |
| `vendor_id` | string | No | Filtrar por UUID de vendedor |
| `tags` | string | No | Etiquetas separadas por comas |
| `sort` | string | No | `price_asc`, `price_desc`, `newest`, `relevance` (predeterminado) |
| `page` | number | No | Número de página (predeterminado: 1) |
| `limit` | number | No | Ítems por página (predeterminado: 20, máx: 100) |

**Ejemplo:**

```http
GET /api/products/search?q=laptop&min_price=500&max_price=2000&category=electronics&sort=price_asc&page=1&limit=20
```

**Respuesta:** `200 OK`

```json
{
  "products": [
    {
      "id": "prod-123",
      "title": "MacBook Pro 14 pulgadas",
      "description": "Chip M3 Pro, 18GB RAM, 512GB SSD",
      "base_price": 1999.99,
      "category": {
        "id": "cat-456",
        "name": "Electrónica",
        "slug": "electronica"
      },
      "vendor": {
        "id": "vendor-789",
        "shop_name": "Apple Store",
        "shop_slug": "apple-store"
      },
      "images": [
        "https://cdn.kreo.com/products/macbook-pro-1.jpg"
      ],
      "tags": ["laptop", "apple", "macbook"],
      "inventory_quantity": 50,
      "rating": 4.8,
      "review_count": 234,
      "status": "active",
      "created_at": "2025-01-10T08:00:00Z"
    }
  ],
  "facets": {
    "categories": [
      { "id": "cat-456", "name": "Electrónica", "count": 145 },
      { "id": "cat-789", "name": "Computadoras", "count": 89 }
    ],
    "price_ranges": [
      { "min": 0, "max": 500, "count": 23 },
      { "min": 500, "max": 1000, "count": 45 },
      { "min": 1000, "max": 2000, "count": 67 },
      { "min": 2000, "max": null, "count": 34 }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 169,
    "total_pages": 9
  }
}
```

---

### Obtener Detalles del Producto

Obtener información detallada sobre un producto específico.

```http
GET /api/products/:id
```

**Respuesta:** `200 OK`

```json
{
  "id": "prod-123",
  "title": "MacBook Pro 14 pulgadas",
  "description": "Chip Apple M3 Pro con CPU de 11 núcleos y GPU de 14 núcleos, 18GB de memoria unificada, almacenamiento SSD de 512GB",
  "base_price": 1999.99,
  "category": {
    "id": "cat-456",
    "name": "Electrónica",
    "slug": "electronica"
  },
  "vendor": {
    "id": "vendor-789",
    "shop_name": "Apple Store",
    "shop_slug": "apple-store",
    "rating": 4.9,
    "total_sales": 5234
  },
  "images": [
    "https://cdn.kreo.com/products/macbook-pro-1.jpg",
    "https://cdn.kreo.com/products/macbook-pro-2.jpg"
  ],
  "variants": [
    {
      "id": "var-001",
      "name": "Gris Espacial",
      "price_modifier": 0,
      "inventory": 30
    },
    {
      "id": "var-002",
      "name": "Plata",
      "price_modifier": 0,
      "inventory": 20
    }
  ],
  "tags": ["laptop", "apple", "macbook", "m3"],
  "specifications": {
    "Procesador": "Apple M3 Pro",
    "RAM": "18GB",
    "Almacenamiento": "512GB SSD",
    "Pantalla": "14.2 pulgadas Liquid Retina XDR"
  },
  "inventory_quantity": 50,
  "rating": 4.8,
  "review_count": 234,
  "view_count": 5678,
  "status": "active",
  "created_at": "2025-01-10T08:00:00Z",
  "updated_at": "2025-01-15T12:30:00Z"
}
```

---

### Crear Producto (Solo Vendedor)

Crear un nuevo producto. Requiere autenticación de vendedor.

```http
POST /api/products
Authorization: Bearer {vendor_token}
Content-Type: application/json
```

**Cuerpo de la Petición:**

```json
{
  "title": "Ratón Gaming Inalámbrico",
  "description": "Ratón gaming inalámbrico de alta precisión con iluminación RGB",
  "base_price": 79.99,
  "category_id": "cat-gaming",
  "tags": ["gaming", "ratón", "inalámbrico"],
  "inventory_quantity": 100,
  "images": [
    "https://example.com/raton-1.jpg",
    "https://example.com/raton-2.jpg"
  ],
  "specifications": {
    "DPI": "16000",
    "Botones": "8",
    "Duración Batería": "70 horas"
  },
  "status": "active"
}
```

**Respuesta:** `201 Created`

```json
{
  "id": "prod-new-123",
  "title": "Ratón Gaming Inalámbrico",
  "slug": "raton-gaming-inalambrico",
  "vendor_id": "vendor-789",
  "base_price": 79.99,
  "status": "active",
  "created_at": "2025-01-16T15:45:00Z"
}
```

---

### Actualizar Producto

Actualizar un producto existente.

```http
PUT /api/products/:id
Authorization: Bearer {vendor_token}
```

**Cuerpo de la Petición:**

```json
{
  "base_price": 69.99,
  "inventory_quantity": 150,
  "status": "active"
}
```

**Respuesta:** `200 OK`

---

### Eliminar Producto

Eliminación suave de un producto.

```http
DELETE /api/products/:id
Authorization: Bearer {vendor_token}
```

**Respuesta:** `204 No Content`

---

### Carga Masiva de Productos (CSV)

Subir múltiples productos vía archivo CSV.

```http
POST /api/products/bulk-upload
Authorization: Bearer {vendor_token}
Content-Type: multipart/form-data
```

**Cuerpo de la Petición:**

```
file: productos.csv
```

**Formato CSV:**

```csv
title,description,base_price,category_id,tags,inventory_quantity,status
"Producto 1","Descripción 1",29.99,cat-123,"etiqueta1,etiqueta2",100,active
"Producto 2","Descripción 2",49.99,cat-456,"etiqueta3,etiqueta4",50,active
```

**Respuesta:** `200 OK`

```json
{
  "success": true,
  "imported": 45,
  "failed": 2,
  "errors": [
    { "row": 12, "error": "category_id inválido" },
    { "row": 34, "error": "Falta campo requerido: base_price" }
  ]
}
```

---

## Carrito

### Agregar al Carrito

Agregar un producto al carrito de compras.

```http
POST /api/cart/add
Authorization: Bearer {access_token}
```

**Cuerpo de la Petición:**

```json
{
  "product_id": "prod-123",
  "quantity": 2,
  "variant_id": "var-001"
}
```

**Respuesta:** `200 OK`

```json
{
  "cart": {
    "user_id": "user-456",
    "items": [
      {
        "product_id": "prod-123",
        "vendor_id": "vendor-789",
        "title": "MacBook Pro 14 pulgadas",
        "variant_id": "var-001",
        "quantity": 2,
        "price_snapshot": 1999.99,
        "subtotal": 3999.98
      }
    ],
    "grouped_by_vendor": {
      "vendor-789": {
        "shop_name": "Apple Store",
        "items": [...],
        "subtotal": 3999.98,
        "shipping_cost": 0,
        "total": 3999.98
      }
    },
    "total": 3999.98
  }
}
```

---

### Obtener Carrito

Recuperar el carrito del usuario actual.

```http
GET /api/cart
Authorization: Bearer {access_token}
```

**Respuesta:** `200 OK`

```json
{
  "user_id": "user-456",
  "items": [
    {
      "product_id": "prod-123",
      "vendor_id": "vendor-789",
      "title": "MacBook Pro 14 pulgadas",
      "variant_id": "var-001",
      "quantity": 2,
      "price_snapshot": 1999.99,
      "subtotal": 3999.98,
      "image": "https://cdn.kreo.com/products/macbook-pro-1.jpg"
    }
  ],
  "grouped_by_vendor": {
    "vendor-789": {
      "shop_name": "Apple Store",
      "items": [...],
      "subtotal": 3999.98,
      "shipping_method": null,
      "shipping_cost": 0,
      "total": 3999.98
    }
  },
  "grand_total": 3999.98,
  "item_count": 2
}
```

---

### Actualizar Ítem del Carrito

Actualizar la cantidad de un ítem del carrito.

```http
PUT /api/cart/update
Authorization: Bearer {access_token}
```

**Cuerpo de la Petición:**

```json
{
  "product_id": "prod-123",
  "quantity": 3
}
```

**Respuesta:** `200 OK`

---

### Eliminar del Carrito

Eliminar un ítem del carrito.

```http
DELETE /api/cart/remove/:product_id
Authorization: Bearer {access_token}
```

**Respuesta:** `200 OK`

---

### Vaciar Carrito

Eliminar todos los ítems del carrito.

```http
DELETE /api/cart
Authorization: Bearer {access_token}
```

**Respuesta:** `204 No Content`

---

## Órdenes

### Checkout

Crear una orden desde el carrito.

```http
POST /api/orders/checkout
Authorization: Bearer {access_token}
```

**Cuerpo de la Petición:**

```json
{
  "email": "cliente@example.com",
  "shipping_address": {
    "first_name": "María",
    "last_name": "González",
    "address_line1": "Calle Mayor 123",
    "address_line2": "Piso 4B",
    "city": "Madrid",
    "state": "Madrid",
    "postal_code": "28001",
    "country_code": "ES",
    "phone": "+34612345678"
  },
  "billing_address": {
    "first_name": "María",
    "last_name": "González",
    "address_line1": "Calle Mayor 123",
    "city": "Madrid",
    "state": "Madrid",
    "postal_code": "28001",
    "country_code": "ES"
  },
  "shipping_methods": {
    "vendor-789": "standard",
    "vendor-456": "express"
  }
}
```

**Respuesta:** `201 Created`

```json
{
  "order": {
    "id": "order-uuid-123",
    "order_number": "ORD-20250116-ABC123",
    "user_id": "user-456",
    "email": "cliente@example.com",
    "subtotal": 3999.98,
    "shipping_total": 15.00,
    "tax_total": 320.00,
    "grand_total": 4334.98,
    "payment_status": "pending",
    "fulfillment_status": "unfulfilled",
    "created_at": "2025-01-16T16:30:00Z"
  },
  "sub_orders": [
    {
      "id": "sub-order-123",
      "vendor_id": "vendor-789",
      "suborder_number": "SUB-20250116-001",
      "total": 3999.98,
      "commission_amount": 399.99,
      "vendor_payout": 3599.99,
      "status": "pending"
    }
  ],
  "client_secret": "pi_xxx_secret_yyy"
}
```

---

### Obtener Detalles de Orden

Obtener detalles de una orden específica.

```http
GET /api/orders/:id
Authorization: Bearer {access_token}
```

**Respuesta:** `200 OK`

```json
{
  "id": "order-uuid-123",
  "order_number": "ORD-20250116-ABC123",
  "user_id": "user-456",
  "email": "cliente@example.com",
  "shipping_address": { ... },
  "billing_address": { ... },
  "subtotal": 3999.98,
  "shipping_total": 15.00,
  "tax_total": 320.00,
  "grand_total": 4334.98,
  "payment_status": "paid",
  "stripe_payment_intent_id": "pi_xxx",
  "paid_at": "2025-01-16T16:35:00Z",
  "fulfillment_status": "processing",
  "sub_orders": [
    {
      "id": "sub-order-123",
      "vendor": {
        "id": "vendor-789",
        "shop_name": "Apple Store"
      },
      "items": [
        {
          "product_id": "prod-123",
          "product_title": "MacBook Pro 14 pulgadas",
          "quantity": 2,
          "unit_price": 1999.99,
          "total_price": 3999.98
        }
      ],
      "subtotal": 3999.98,
      "shipping_cost": 15.00,
      "total": 4014.98,
      "status": "processing",
      "tracking_number": "1Z999AA10123456784"
    }
  ],
  "created_at": "2025-01-16T16:30:00Z",
  "updated_at": "2025-01-16T16:35:00Z"
}
```

---

### Obtener Órdenes del Usuario

Obtener todas las órdenes del usuario autenticado.

```http
GET /api/orders/user/:userId
Authorization: Bearer {access_token}
```

**Parámetros de Consulta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | Filtrar por payment_status: `pending`, `paid` |
| `page` | number | Número de página (predeterminado: 1) |
| `limit` | number | Ítems por página (predeterminado: 10) |

**Respuesta:** `200 OK`

```json
{
  "orders": [
    {
      "id": "order-123",
      "order_number": "ORD-20250116-ABC123",
      "grand_total": 4334.98,
      "payment_status": "paid",
      "fulfillment_status": "shipped",
      "item_count": 2,
      "created_at": "2025-01-16T16:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 23,
    "total_pages": 3
  }
}
```

---

## Pagos

### Crear Intención de Pago

Crear una intención de pago de Stripe para una orden.

```http
POST /api/payments/create-intent
```

**Cuerpo de la Petición:**

```json
{
  "order_id": "order-uuid-123",
  "amount": 433498,
  "currency": "eur"
}
```

**Respuesta:** `200 OK`

```json
{
  "client_secret": "pi_xxx_secret_yyy",
  "payment_intent_id": "pi_xxx",
  "amount": 433498,
  "currency": "eur",
  "application_fee_amount": 39999
}
```

---

### Ejecutar Transferencias (Pago Dividido)

Ejecutar pagos a vendedores después de un pago exitoso.

```http
POST /api/payments/execute-transfers
```

**Cuerpo de la Petición:**

```json
{
  "order_id": "order-uuid-123",
  "payment_intent_id": "pi_xxx"
}
```

**Respuesta:** `200 OK`

```json
{
  "transfers": [
    {
      "vendor_id": "vendor-789",
      "transfer_id": "tr_xxx",
      "amount": 359999,
      "status": "succeeded"
    }
  ],
  "total_transferred": 359999,
  "total_commission": 39999
}
```

---

### Webhooks de Stripe

Endpoint para eventos webhook de Stripe.

```http
POST /api/payments/webhooks
Stripe-Signature: {signature_header}
```

**Eventos Manejados:**

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `transfer.created`
- `transfer.failed`
- `account.updated`

---

### Obtener Pagos del Vendedor

Obtener historial de pagos de un vendedor.

```http
GET /api/payments/vendor/:vendorId/payouts
Authorization: Bearer {vendor_token}
```

**Parámetros de Consulta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | Filtrar por estado: `processing`, `paid`, `failed` |
| `from_date` | string | Fecha ISO (ej., 2025-01-01) |
| `to_date` | string | Fecha ISO |
| `page` | number | Número de página |
| `limit` | number | Ítems por página |

**Respuesta:** `200 OK`

```json
{
  "payouts": [
    {
      "id": "payout-123",
      "sub_order_id": "sub-order-456",
      "order_number": "ORD-20250116-ABC123",
      "gross_amount": 3999.98,
      "commission_amount": 399.99,
      "net_amount": 3599.99,
      "stripe_transfer_id": "tr_xxx",
      "status": "paid",
      "created_at": "2025-01-16T16:40:00Z",
      "paid_at": "2025-01-16T16:45:00Z"
    }
  ],
  "summary": {
    "total_gross": 45678.90,
    "total_commission": 4567.89,
    "total_net": 41111.01,
    "pending_amount": 1234.56
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156
  }
}
```

---

## Vendedores

### Crear Perfil de Vendedor

Crear un perfil de vendedor para el usuario autenticado.

```http
POST /api/vendors
Authorization: Bearer {access_token}
```

**Cuerpo de la Petición:**

```json
{
  "shop_name": "Tienda Tech Gadgets",
  "shop_slug": "tienda-tech-gadgets",
  "shop_description": "Tu tienda para los últimos gadgets tecnológicos",
  "business_email": "negocio@techgadgets.com",
  "business_phone": "+34612345678",
  "business_address": {
    "address_line1": "Calle Comercio 456",
    "city": "Barcelona",
    "state": "Barcelona",
    "postal_code": "08001",
    "country_code": "ES"
  }
}
```

**Respuesta:** `201 Created`

```json
{
  "id": "vendor-new-123",
  "user_id": "user-456",
  "shop_name": "Tienda Tech Gadgets",
  "shop_slug": "tienda-tech-gadgets",
  "status": "pending",
  "created_at": "2025-01-16T17:00:00Z"
}
```

---

### Crear Cuenta Stripe Connect

Crear una cuenta Stripe Connect Express para el vendedor.

```http
POST /api/payments/connect/create-account
```

**Cuerpo de la Petición:**

```json
{
  "email": "vendedor@example.com",
  "country": "ES"
}
```

**Respuesta:** `200 OK`

```json
{
  "account_id": "acct_xxx",
  "email": "vendedor@example.com",
  "country": "ES",
  "charges_enabled": false,
  "payouts_enabled": false
}
```

---

### Generar Link de Onboarding de Stripe

Generar enlace de onboarding de cuenta para verificación KYC.

```http
POST /api/payments/connect/account-link
```

**Cuerpo de la Petición:**

```json
{
  "account_id": "acct_xxx",
  "refresh_url": "http://localhost:5174/onboarding",
  "return_url": "http://localhost:5174/dashboard"
}
```

**Respuesta:** `200 OK`

```json
{
  "url": "https://connect.stripe.com/setup/s/xxx/yyy"
}
```

---

### Obtener Analytics del Panel de Vendedor

Obtener datos analíticos para el panel del vendedor.

```http
GET /api/vendors/:vendorId/analytics
Authorization: Bearer {vendor_token}
```

**Parámetros de Consulta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `from_date` | string | Fecha ISO |
| `to_date` | string | Fecha ISO |

**Respuesta:** `200 OK`

```json
{
  "revenue": {
    "total": 125678.90,
    "this_month": 12345.67,
    "last_month": 10234.56,
    "growth": 20.6
  },
  "orders": {
    "total": 456,
    "pending": 12,
    "processing": 34,
    "shipped": 389,
    "delivered": 345
  },
  "products": {
    "total": 89,
    "active": 78,
    "draft": 8,
    "archived": 3
  },
  "top_products": [
    {
      "id": "prod-123",
      "title": "MacBook Pro 14 pulgadas",
      "total_sales": 45,
      "revenue": 89999.55
    }
  ],
  "sales_chart": [
    { "date": "2025-01-01", "revenue": 1234.56, "orders": 12 },
    { "date": "2025-01-02", "revenue": 2345.67, "orders": 23 }
  ]
}
```

---

## Envíos

### Obtener Tarifas de Envío

Obtener tarifas de envío para ítems del carrito.

```http
POST /api/shipping/rates
Authorization: Bearer {access_token}
```

**Cuerpo de la Petición:**

```json
{
  "items": [
    {
      "vendor_id": "vendor-789",
      "weight": 2.5,
      "length": 12,
      "width": 8,
      "height": 4
    }
  ],
  "to_address": {
    "street1": "Calle Mayor 123",
    "city": "Madrid",
    "state": "Madrid",
    "zip": "28001",
    "country": "ES"
  }
}
```

**Respuesta:** `200 OK`

```json
{
  "rates": {
    "vendor-789": [
      {
        "service": "standard",
        "name": "Correos Ordinario",
        "price": 8.50,
        "estimated_days": 3,
        "carrier": "Correos"
      },
      {
        "service": "express",
        "name": "SEUR Express",
        "price": 15.00,
        "estimated_days": 1,
        "carrier": "SEUR"
      }
    ]
  }
}
```

---

## Manejo de Errores

Todos los errores de la API siguen este formato:

```json
{
  "statusCode": 400,
  "message": "Error de validación",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "el email debe ser un email válido"
    }
  ]
}
```

### Códigos de Estado HTTP

| Código | Descripción |
|------|-------------|
| 200 | Éxito |
| 201 | Creado |
| 204 | Sin Contenido |
| 400 | Petición Incorrecta (error de validación) |
| 401 | No Autorizado (token faltante o inválido) |
| 403 | Prohibido (permisos insuficientes) |
| 404 | No Encontrado |
| 409 | Conflicto (recurso duplicado) |
| 429 | Demasiadas Peticiones (límite de tasa excedido) |
| 500 | Error Interno del Servidor |
| 503 | Servicio No Disponible |

---

## Rate Limiting

El API Gateway implementa limitación de tasa:

- **Límite**: 1000 peticiones por minuto por IP
- **Headers**:
  - `X-RateLimit-Limit`: Máximo de peticiones permitidas
  - `X-RateLimit-Remaining`: Peticiones restantes
  - `X-RateLimit-Reset`: Timestamp cuando se reinicia el límite

**Respuesta Límite de Tasa Excedido:**

```json
{
  "statusCode": 429,
  "message": "Demasiadas peticiones desde esta IP, por favor intente más tarde"
}
```

---

## Headers de Autenticación

Todos los endpoints autenticados requieren:

```http
Authorization: Bearer {access_token}
```

**Expiración de Token:**

- Access Token: 7 días
- Refresh Token: 30 días

---

## Paginación

Los endpoints de listado soportan paginación con parámetros de consulta:

- `page`: Número de página (comienza en 1)
- `limit`: Ítems por página (predeterminado: 20, máx: 100)

**La respuesta incluye metadata de paginación:**

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

---

## Webhooks

Kreo Marketplace puede enviar webhooks para ciertos eventos. Contactar a soporte para configurar endpoints de webhook.

**Eventos Disponibles:**

- `order.created` - Orden creada
- `order.paid` - Orden pagada
- `order.shipped` - Orden enviada
- `order.delivered` - Orden entregada
- `product.created` - Producto creado
- `product.updated` - Producto actualizado
- `payout.succeeded` - Pago exitoso
- `payout.failed` - Pago fallido

**Ejemplo de Payload de Webhook:**

```json
{
  "event": "order.paid",
  "timestamp": "2025-01-16T18:00:00Z",
  "data": {
    "order_id": "order-123",
    "order_number": "ORD-20250116-ABC123",
    "total": 4334.98
  }
}
```

---

Para más información, visita [https://docs.kreo.com](https://docs.kreo.com)
