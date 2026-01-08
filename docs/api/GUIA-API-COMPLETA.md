# Guía Completa de API
## Kreo Marketplace - Documentación de Endpoints

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Endpoints de Auth](#endpoints-de-auth)
4. [Endpoints de Productos](#endpoints-de-productos)
5. [Endpoints de Carrito y Órdenes](#endpoints-de-carrito-y-órdenes)
6. [Endpoints de Pagos](#endpoints-de-pagos)
7. [Endpoints de Vendedores](#endpoints-de-vendedores)
8. [Códigos de Error](#códigos-de-error)
9. [Rate Limiting](#rate-limiting)
10. [Ejemplos con cURL](#ejemplos-con-curl)

---

## Introducción

**Base URL**: `http://localhost:3000` (desarrollo)
**Producción**: `https://api.kreo.com`

**Formato de Respuesta**: JSON
**Codificación**: UTF-8
**Versión**: v1

### Estructura de Respuesta

**Respuesta Exitosa**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operación exitosa"
}
```

**Respuesta con Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email ya está registrado",
    "details": { ... }
  }
}
```

---

## Autenticación

Kreo utiliza **JWT (JSON Web Tokens)** para autenticación.

### Flujo de Autenticación

```
1. Cliente envía credenciales
   ↓
2. Servidor valida y genera:
   - Access Token (15 min)
   - Refresh Token (7 días)
   ↓
3. Tokens se envían en HTTP-Only Cookies
   ↓
4. Cliente usa Access Token para requests autenticados
   ↓
5. Cuando Access Token expira, usa Refresh Token para obtener nuevo
```

### Headers Requeridos

**Requests Autenticados**:
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Nota**: Con cookies HTTP-Only, el browser envía automáticamente el token.

---

## Endpoints de Auth

### POST /api/auth/register

Registra un nuevo usuario.

**Body**:
```json
{
  "email": "usuario@example.com",
  "password": "ContraseñaSegura123",
  "role": "customer",
  "first_name": "Juan",
  "last_name": "Pérez"
}
```

**Validaciones**:
- Email: Formato válido, único
- Password: Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número
- Role: customer, vendor, admin

**Response (201)**:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@example.com",
    "role": "customer",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email_verified": false,
    "created_at": "2023-12-15T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores**:
- 400: Email ya registrado
- 400: Validación fallida
- 429: Demasiados intentos (3 por hora)

---

### POST /api/auth/login

Inicia sesión.

**Body**:
```json
{
  "email": "usuario@example.com",
  "password": "ContraseñaSegura123"
}
```

**Response (200)**:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@example.com",
    "role": "customer",
    "first_name": "Juan",
    "last_name": "Pérez"
  },
  "message": "Login exitoso"
}
```

**Notas**:
- Tokens se envían en HTTP-Only Cookies
- No se devuelven en el body por seguridad

**Errores**:
- 401: Credenciales inválidas
- 429: Demasiados intentos (5 por minuto)

---

### POST /api/auth/refresh

Renueva el access token.

**Headers**:
```http
Cookie: refresh_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200)**:
```json
{
  "message": "Token actualizado"
}
```

**Notas**:
- Nuevo access token se envía en cookie
- Refresh token se mantiene igual

**Errores**:
- 401: Refresh token inválido o expirado

---

### POST /api/auth/logout

Cierra sesión.

**Headers**: Requiere autenticación

**Response (200)**:
```json
{
  "message": "Logout exitoso"
}
```

**Notas**:
- Se limpian las cookies de sesión

---

### GET /api/auth/me

Obtiene información del usuario autenticado.

**Headers**: Requiere autenticación

**Response (200)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "usuario@example.com",
  "role": "customer",
  "first_name": "Juan",
  "last_name": "Pérez",
  "avatar_url": "https://...",
  "email_verified": true,
  "two_factor_enabled": false
}
```

---

### POST /api/auth/2fa/enable

Activa autenticación de dos factores (2FA).

**Headers**: Requiere autenticación

**Response (200)**:
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code_url": "otpauth://totp/Kreo:usuario@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Kreo"
}
```

**Instrucciones**:
1. Escanea el QR con Google Authenticator o similar
2. Verifica con POST /api/auth/2fa/verify

---

### POST /api/auth/2fa/verify

Verifica código 2FA.

**Headers**: Requiere autenticación

**Body**:
```json
{
  "token": "123456"
}
```

**Response (200)**:
```json
{
  "verified": true,
  "message": "2FA activado exitosamente"
}
```

**Errores**:
- 400: Código inválido

---

## Endpoints de Productos

### GET /api/products/search

Búsqueda avanzada de productos.

**Query Parameters**:
```
q:         Texto de búsqueda (ej: "laptop")
category:  ID de categoría
min_price: Precio mínimo (ej: 500)
max_price: Precio máximo (ej: 2000)
vendor_id: ID del vendedor
tags:      Array de etiquetas (ej: tags[]=nuevo&tags[]=oferta)
sort:      Ordenamiento (relevance, price_asc, price_desc, newest)
page:      Número de página (default: 1)
limit:     Items por página (default: 20, max: 100)
```

**Ejemplo**:
```
GET /api/products/search?q=laptop&min_price=500&max_price=2000&sort=price_asc&page=1&limit=20
```

**Response (200)**:
```json
{
  "products": [
    {
      "id": "...",
      "title": "Laptop HP 15.6 - Intel i5 10ma Gen",
      "base_price": 599.99,
      "compare_at_price": 799.99,
      "images": [
        {
          "url": "https://s3.amazonaws.com/...",
          "alt": "Laptop HP vista frontal"
        }
      ],
      "vendor": {
        "id": "...",
        "shop_name": "Tech Store",
        "average_rating": 4.5
      },
      "tags": ["laptop", "hp", "nuevo"],
      "inventory_quantity": 10,
      "status": "active"
    }
  ],
  "facets": {
    "categories": [
      { "id": "...", "name": "Electrónica", "count": 150 },
      { "id": "...", "name": "Computadoras", "count": 80 }
    ],
    "price_ranges": [
      { "from": 0, "to": 25, "count": 10 },
      { "from": 25, "to": 50, "count": 45 }
    ]
  },
  "total": 156,
  "page": 1,
  "limit": 20,
  "total_pages": 8
}
```

---

### GET /api/products/:id

Obtiene detalles de un producto.

**Response (200)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "vendor_id": "...",
  "title": "Laptop HP 15.6 - Intel i5 10ma Gen",
  "slug": "laptop-hp-15-6-intel-i5-10ma-gen",
  "description": "Laptop ideal para trabajo y estudio...",
  "base_price": 599.99,
  "compare_at_price": 799.99,
  "sku": "LAP-HP-001",
  "inventory_quantity": 10,
  "weight_value": 2.5,
  "length_value": 38,
  "width_value": 25,
  "height_value": 2,
  "tags": ["laptop", "hp", "computadora"],
  "images": [...],
  "status": "active",
  "vendor": {
    "shop_name": "Tech Store",
    "average_rating": 4.5,
    "return_policy": "30 días de devolución..."
  },
  "view_count": 1250,
  "sales_count": 45,
  "created_at": "2023-11-01T10:00:00Z"
}
```

**Errores**:
- 404: Producto no encontrado

---

### POST /api/products

Crea un nuevo producto (solo vendedores).

**Headers**: Requiere autenticación y role=vendor

**Body**:
```json
{
  "title": "Laptop HP 15.6 - Intel i5",
  "description": "Laptop ideal para trabajo y estudio...",
  "base_price": 599.99,
  "compare_at_price": 799.99,
  "category_id": "550e8400-e29b-41d4-a716-446655440000",
  "sku": "LAP-HP-001",
  "inventory_quantity": 10,
  "weight_value": 2.5,
  "tags": ["laptop", "hp"],
  "images": [
    {
      "url": "https://s3.amazonaws.com/...",
      "alt": "Vista frontal"
    }
  ],
  "status": "active"
}
```

**Response (201)**:
```json
{
  "id": "...",
  "title": "Laptop HP 15.6 - Intel i5",
  "slug": "laptop-hp-15-6-intel-i5",
  ...
}
```

**Errores**:
- 400: Validación fallida
- 401: No autenticado
- 403: No es vendedor

---

### PUT /api/products/:id

Actualiza un producto (solo el vendedor propietario).

**Headers**: Requiere autenticación

**Body**: Mismos campos que POST (todos opcionales)

**Response (200)**:
```json
{
  "id": "...",
  "title": "Laptop HP 15.6 - Intel i5 - ACTUALIZADO",
  ...
}
```

**Errores**:
- 403: No eres el propietario
- 404: Producto no encontrado

---

### DELETE /api/products/:id

Elimina un producto (soft delete).

**Headers**: Requiere autenticación

**Response (200)**:
```json
{
  "success": true
}
```

**Errores**:
- 403: No eres el propietario
- 404: Producto no encontrado

---

### POST /api/products/bulk-upload

Carga masiva de productos (CSV).

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (FormData)**:
```
file: products.csv
```

**Formato CSV**:
```csv
title,description,base_price,category_id,sku,inventory_quantity,weight,tags
"Laptop HP 15","Laptop con procesador i5",599.99,electronics-uuid,LAP-HP-001,10,2.5,"laptop,hp"
"Mouse Logitech","Mouse inalámbrico",29.99,electronics-uuid,MOU-LOG-001,50,0.2,"mouse,logitech"
```

**Response (200)**:
```json
{
  "created": 48,
  "failed": 2,
  "errors": [
    {
      "row": 15,
      "data": {...},
      "error": "SKU ya existe"
    }
  ]
}
```

---

## Endpoints de Carrito y Órdenes

### POST /api/cart/add

Agrega producto al carrito.

**Headers**: Requiere autenticación

**Body**:
```json
{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 2,
  "variant_id": "..." // opcional
}
```

**Response (200)**:
```json
{
  "cart": {
    "items": [
      {
        "product_id": "...",
        "title": "Laptop HP 15.6",
        "quantity": 2,
        "price_snapshot": 599.99,
        "subtotal": 1199.98
      }
    ],
    "subtotal": 1199.98,
    "total_items": 2
  }
}
```

---

### GET /api/cart

Obtiene el carrito actual.

**Headers**: Requiere autenticación

**Response (200)**:
```json
{
  "items": [...],
  "grouped_by_vendor": {
    "vendor-uuid-1": {
      "vendor_name": "Tech Store",
      "items": [...],
      "subtotal": 599.99,
      "shipping_cost": 10.00
    },
    "vendor-uuid-2": {
      "vendor_name": "Fashion Shop",
      "items": [...],
      "subtotal": 150.00,
      "shipping_cost": 5.00
    }
  },
  "subtotal": 749.99,
  "shipping_total": 15.00,
  "grand_total": 764.99,
  "total_items": 5
}
```

---

### POST /api/orders/checkout

Realiza el checkout y crea la orden.

**Headers**: Requiere autenticación

**Body**:
```json
{
  "email": "cliente@example.com",
  "shipping_address": {
    "first_name": "María",
    "last_name": "González",
    "address_line1": "Calle Principal 123",
    "address_line2": "Apt 4B",
    "city": "Madrid",
    "state": "Madrid",
    "postal_code": "28001",
    "country_code": "ES",
    "phone": "+34123456789"
  },
  "billing_address": {
    // Mismo formato o null para usar shipping_address
  },
  "shipping_methods": {
    "vendor-uuid-1": "standard",
    "vendor-uuid-2": "express"
  }
}
```

**Response (201)**:
```json
{
  "order": {
    "id": "...",
    "order_number": "ORD-20231215-A8F3D2",
    "grand_total": 764.99,
    "payment_status": "pending",
    "created_at": "2023-12-15T14:30:00Z"
  },
  "subOrders": [
    {
      "id": "...",
      "vendor_id": "...",
      "suborder_number": "ORD-20231215-A8F3D2-1",
      "total": 609.99
    }
  ],
  "payment_client_secret": "pi_3ABC123_secret_xyz"
}
```

**Siguiente paso**: Usar `payment_client_secret` en frontend con Stripe.js

---

### GET /api/orders/user/:userId

Obtiene órdenes del usuario.

**Headers**: Requiere autenticación

**Response (200)**:
```json
{
  "orders": [
    {
      "id": "...",
      "order_number": "ORD-20231215-A8F3D2",
      "grand_total": 764.99,
      "payment_status": "paid",
      "fulfillment_status": "partial",
      "created_at": "2023-12-15T14:30:00Z"
    }
  ]
}
```

---

### GET /api/orders/:id

Obtiene detalles de una orden.

**Headers**: Requiere autenticación

**Response (200)**:
```json
{
  "order": {
    "id": "...",
    "order_number": "ORD-20231215-A8F3D2",
    "email": "cliente@example.com",
    "shipping_address": {...},
    "billing_address": {...},
    "subtotal": 749.99,
    "shipping_total": 15.00,
    "grand_total": 764.99,
    "payment_status": "paid",
    "paid_at": "2023-12-15T14:32:00Z",
    "created_at": "2023-12-15T14:30:00Z"
  },
  "subOrders": [
    {
      "id": "...",
      "vendor_id": "...",
      "suborder_number": "ORD-20231215-A8F3D2-1",
      "subtotal": 599.99,
      "shipping_cost": 10.00,
      "total": 609.99,
      "commission_amount": 60.99,
      "vendor_payout": 549.00,
      "status": "shipped",
      "tracking_company": "FedEx",
      "tracking_number": "1234567890",
      "tracking_url": "https://fedex.com/track/...",
      "shipped_at": "2023-12-16T10:00:00Z"
    }
  ],
  "items": [
    {
      "product_title": "Laptop HP 15.6",
      "quantity": 1,
      "unit_price": 599.99,
      "total_price": 599.99
    }
  ]
}
```

**Errores**:
- 403: No eres el dueño de la orden
- 404: Orden no encontrada

---

## Endpoints de Pagos

### POST /api/payments/create-intent

Crea un Payment Intent de Stripe (uso interno).

**Headers**: Requiere autenticación

**Body**:
```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 76499,
  "application_fee": 7650,
  "metadata": {
    "order_number": "ORD-20231215-A8F3D2"
  }
}
```

**Response (200)**:
```json
{
  "id": "pi_3ABC123DEF456GHI",
  "client_secret": "pi_3ABC123_secret_xyz",
  "amount": 76499,
  "currency": "usd",
  "status": "requires_payment_method"
}
```

---

### POST /api/payments/webhooks

Webhook de Stripe (solo Stripe).

**Headers**:
```http
Stripe-Signature: t=1234567890,v1=abc123...
```

**Body**: Event de Stripe

**Eventos Manejados**:
- `payment_intent.succeeded`: Confirma pago y ejecuta transferencias
- `payment_intent.payment_failed`: Marca orden como fallida
- `transfer.created`: Registra transferencia a vendedor

**Response (200)**:
```json
{
  "received": true
}
```

---

### GET /api/payments/vendor/:vendorId/payouts

Obtiene historial de pagos del vendedor.

**Headers**: Requiere autenticación y ser el vendedor

**Response (200)**:
```json
{
  "payouts": [
    {
      "id": "...",
      "sub_order_id": "...",
      "gross_amount": 609.99,
      "commission_amount": 60.99,
      "net_amount": 549.00,
      "stripe_transfer_id": "tr_ABC123",
      "status": "paid",
      "paid_at": "2023-12-17T10:00:00Z",
      "created_at": "2023-12-15T14:32:00Z"
    }
  ]
}
```

---

## Endpoints de Vendedores

### POST /api/vendors/register

Registra un nuevo vendedor.

**Body**:
```json
{
  "user": {
    "email": "vendedor@example.com",
    "password": "ContraseñaSegura123",
    "first_name": "Juan",
    "last_name": "Vendedor"
  },
  "vendor": {
    "shop_name": "Mi Tienda Increíble",
    "shop_description": "Vendemos productos de calidad...",
    "business_type": "individual",
    "tax_id": "RFC123456"
  }
}
```

**Response (201)**:
```json
{
  "user": {...},
  "vendor": {
    "id": "...",
    "shop_name": "Mi Tienda Increíble",
    "shop_slug": "mi-tienda-increible",
    "kyc_status": "pending",
    "is_verified": false
  }
}
```

---

### GET /api/vendors/:id

Obtiene información pública del vendedor.

**Response (200)**:
```json
{
  "id": "...",
  "shop_name": "Tech Store",
  "shop_slug": "tech-store",
  "shop_description": "...",
  "shop_logo_url": "...",
  "shop_banner_url": "...",
  "average_rating": 4.5,
  "total_sales_count": 1250,
  "return_policy": "30 días...",
  "shipping_policy": "Envío en 24-48 horas...",
  "processing_time_days": 2,
  "created_at": "2023-01-01T00:00:00Z"
}
```

---

## Códigos de Error

### Códigos HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Éxito |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: email duplicado) |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Error del servidor |

### Códigos de Error Personalizados

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email ya está registrado",
    "field": "email"
  }
}
```

**Códigos Comunes**:
- `VALIDATION_ERROR`: Error de validación
- `AUTHENTICATION_ERROR`: Error de autenticación
- `AUTHORIZATION_ERROR`: Sin permisos
- `NOT_FOUND`: Recurso no encontrado
- `RATE_LIMIT_EXCEEDED`: Demasiadas peticiones
- `PAYMENT_ERROR`: Error en procesamiento de pago
- `INSUFFICIENT_STOCK`: Producto sin stock

---

## Rate Limiting

### Límites Globales

**API Gateway**:
- 1000 requests por minuto por IP
- Header de respuesta: `X-RateLimit-Remaining`

### Límites por Endpoint

**Auth Service**:
- `POST /auth/login`: 5 intentos/minuto
- `POST /auth/register`: 3 intentos/hora
- `POST /auth/password/reset`: 3 intentos/hora

**Respuesta cuando se excede**:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Demasiados intentos, intenta en 5 minutos",
    "retry_after": 300
  }
}
```

---

## Ejemplos con cURL

### Registro

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "role": "customer",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

### Búsqueda de Productos

```bash
curl -X GET "http://localhost:3000/api/products/search?q=laptop&min_price=500&max_price=2000" \
  -H "Content-Type: application/json"
```

### Agregar al Carrito

```bash
curl -X POST http://localhost:3000/api/cart/add \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 1
  }'
```

### Obtener Carrito

```bash
curl -X GET http://localhost:3000/api/cart \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Checkout

```bash
curl -X POST http://localhost:3000/api/orders/checkout \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "test@example.com",
    "shipping_address": {
      "first_name": "Test",
      "last_name": "User",
      "address_line1": "123 Main St",
      "city": "Madrid",
      "state": "Madrid",
      "postal_code": "28001",
      "country_code": "ES"
    }
  }'
```

---

## Colección de Postman

Importa nuestra colección de Postman para probar todos los endpoints:

**Descargar**: `Kreo_Marketplace_API.postman_collection.json`

**Variables de Entorno**:
```json
{
  "base_url": "http://localhost:3000",
  "access_token": "",
  "refresh_token": ""
}
```

---

**API Completa Documentada**

Para reportar problemas o sugerir mejoras en la API:
- Email: api-support@kreo.com
- GitHub Issues: https://github.com/yourusername/kreo-marketplace/issues

---

*Última actualización: Diciembre 2024*
*Versión: 1.0.0*
