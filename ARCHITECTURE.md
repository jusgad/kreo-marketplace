# Kreo Marketplace - Architecture Documentation

## 🏗️ System Overview

Kreo is a multi-vendor B2C marketplace built with a microservices architecture, designed for high scalability and maintainability.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Redux Toolkit + TailwindCSS + Framer Motion + Lucide React |
| API Gateway | Express.js with proxy middleware |
| Microservices | NestJS + Express |
| Database | PostgreSQL 15 |
| Search | Elasticsearch 8 |
| Cache | Redis 7 |
| Queue | BullMQ + Redis |
| Payments | Stripe Connect |
| Container | Docker |
| Orchestration | Kubernetes (EKS/GKE) |
| Cloud | AWS/GCP |

---

## 🎨 Frontend Architecture

### Customer App Design System

**Visual Design:**
- **Glassmorphism**: Translucent navbar with backdrop blur effects
- **Gradients**: Vibrant color gradients for CTAs and hero sections
- **Dark Mode**: Complete theme switching with localStorage persistence
- **Animations**: Framer Motion for smooth transitions and micro-interactions

**UI Components:**
- **Navbar**: Fixed navigation with search, cart badge, user menu
- **Product Cards**: Interactive cards with hover effects, badges, wishlist
- **Filter Sidebar**: Collapsible filters (categories, price range, rating)
- **Loading States**: Elegant skeleton screens for all async operations

**State Management:**
- Redux Toolkit for global state (auth, cart, products)
- Local state for UI interactions (modals, dropdowns)
- Redux Persist for cart persistence across sessions

**Performance Optimizations:**
- Lazy loading for route-based code splitting
- Memoization with React.memo for expensive renders
- Debounced search inputs
- Optimized animations using transform/opacity

**Accessibility:**
- WCAG 2.1 AA compliance
- ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Focus management

---

## 📐 Microservices Architecture

### Service Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway :3000                       │
│              (Rate Limiting, Routing, CORS)                  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
│ Auth Service   │   │ Product Service│   │ Order Service  │
│ Port: 3001     │   │ Port: 3004     │   │ Port: 3005     │
│ • JWT Auth     │   │ • CRUD         │   │ • Cart         │
│ • 2FA          │   │ • Search (ES)  │   │ • Checkout     │
│ • OAuth2       │   │ • Bulk Upload  │   │ • Multi-Vendor │
└────────────────┘   └────────────────┘   └────────────────┘

┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│Payment Service │   │Vendor Service  │   │Shipping Service│
│ Port: 3006     │   │ Port: 3003     │   │ Port: 3007     │
│ • Stripe       │   │ • Onboarding   │   │ • Shippo API   │
│ • Split Pay    │   │ • KYC          │   │ • Rate Shop    │
│ • Webhooks     │   │ • Analytics    │   │ • Tracking     │
└────────────────┘   └────────────────┘   └────────────────┘
```

---

## 💳 Split Payment Architecture

### Payment Flow Diagram

```
[Customer Checkout]
       │
       ▼
┌──────────────────────────────────────┐
│ 1. Order Service                     │
│    - Group cart by vendor            │
│    - Calculate totals per vendor     │
│    - Calculate commission (10%)      │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ 2. Payment Service                   │
│    POST /create-intent               │
│    {                                 │
│      amount: $350 (grand total)      │
│      application_fee: $35 (10%)      │
│    }                                 │
│    → Returns client_secret           │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ 3. Frontend (Stripe Elements)        │
│    stripe.confirmCardPayment()       │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ 4. Stripe Webhook                    │
│    payment_intent.succeeded          │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ 5. Payment Service                   │
│    Execute transfers:                │
│    • Vendor A: $94.50 (after 10%)    │
│    • Vendor B: $189.00 (after 10%)   │
│    • Kreo keeps: $35.00              │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ 6. Database Update                   │
│    - orders.payment_status = 'paid'  │
│    - vendor_payouts records created  │
└──────────────────────────────────────┘
```

### Commission Calculation

```typescript
// Example: Cart with 2 vendors
const cart = {
  vendor_A: {
    subtotal: $100,
    shipping: $5,
    total: $105
  },
  vendor_B: {
    subtotal: $200,
    shipping: $10,
    total: $210
  }
};

// Grand total
const grand_total = $315;

// Commission calculation per vendor
const commission_rate = 10%; // Configurable per vendor

vendor_A_commission = $105 * 0.10 = $10.50;
vendor_A_payout = $105 - $10.50 = $94.50;

vendor_B_commission = $210 * 0.10 = $21.00;
vendor_B_payout = $210 - $21.00 = $189.00;

// Kreo total commission
kreo_commission = $10.50 + $21.00 = $31.50;
```

---

## 🛒 Multi-Vendor Cart Logic

### Cart Structure in Redis

```json
{
  "user_id": "uuid-123",
  "items": [
    {
      "product_id": "prod-1",
      "vendor_id": "vendor-A",
      "quantity": 2,
      "price_snapshot": 50.00
    },
    {
      "product_id": "prod-2",
      "vendor_id": "vendor-B",
      "quantity": 1,
      "price_snapshot": 200.00
    }
  ],
  "grouped_by_vendor": {
    "vendor-A": {
      "items": [...],
      "subtotal": 100.00,
      "shipping_method": "standard",
      "shipping_cost": 5.00
    },
    "vendor-B": {
      "items": [...],
      "subtotal": 200.00,
      "shipping_method": "express",
      "shipping_cost": 15.00
    }
  },
  "total": 320.00
}
```

### Checkout Process

1. **Validate Inventory** - Check stock availability
2. **Calculate Shipping** - Get rates from Shipping Service
3. **Group by Vendor** - Create sub-orders
4. **Create Payment Intent** - With Kreo commission as application_fee
5. **Confirm Payment** - Frontend uses Stripe Elements
6. **Execute Transfers** - Split funds to vendors via Stripe Connect
7. **Update Order Status** - Mark as paid, notify vendors
8. **Clear Cart** - Remove items from Redis

---

## 🔍 Product Search (Elasticsearch)

### Index Mapping

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "standard" },
      "description": { "type": "text" },
      "base_price": { "type": "float" },
      "category_id": { "type": "keyword" },
      "vendor_id": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "rating": { "type": "float" },
      "created_at": { "type": "date" }
    }
  }
}
```

### Search Query Example

```typescript
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "laptop",
            "fields": ["title^3", "description", "tags^2"],
            "fuzziness": "AUTO"
          }
        },
        { "range": { "base_price": { "gte": 500, "lte": 2000 } } }
      ],
      "filter": [
        { "term": { "status": "active" } },
        { "terms": { "category_id": ["electronics"] } }
      ]
    }
  },
  "sort": [{ "base_price": "asc" }],
  "aggs": {
    "price_ranges": {
      "range": {
        "field": "base_price",
        "ranges": [
          { "to": 500 },
          { "from": 500, "to": 1000 },
          { "from": 1000 }
        ]
      }
    }
  }
}
```

---

## 🗄️ Database Schema Highlights

### Key Tables

**Orders Flow:**
```
orders (1) ──< (N) sub_orders ──< (N) order_items
   │                  │
   │                  └─> vendors
   │
   └─> users
```

**Payments Flow:**
```
sub_orders (1) ──< (1) vendor_payouts
      │
      └─> vendors.stripe_account_id
```

### Critical Indexes

```sql
-- Performance indexes
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_payouts_vendor ON vendor_payouts(vendor_id);
CREATE INDEX idx_payouts_status ON vendor_payouts(status);

-- Full-text search (fallback)
CREATE INDEX idx_products_tags ON products USING GIN(tags);
```

---

## 🔒 Security Measures

### Authentication

- JWT with RS256 algorithm
- Refresh tokens (30-day expiry)
- 2FA with TOTP (Speakeasy)
- Rate limiting (1000 req/min per IP)

### Authorization

- Role-based access control (RBAC)
- Scoped API tokens
- Row-level security on sensitive tables

### Payment Security

- PCI-DSS Level 1 compliance (delegated to Stripe)
- Webhook signature verification
- Idempotency keys for transfers
- No credit card data stored

### Data Protection

- Passwords hashed with bcrypt (12 rounds)
- Sensitive data encrypted at rest
- HTTPS everywhere
- CORS configured per environment

---

## 📊 Monitoring & Observability

### Metrics (Prometheus)

- Request latency (P50, P95, P99)
- Error rates per service
- Database connection pool usage
- Redis cache hit/miss ratio

### Logging (ELK Stack)

- Structured JSON logs
- Request ID tracing
- Error stack traces
- Audit logs for critical actions

### Distributed Tracing (Jaeger)

- End-to-end request tracing
- Service dependency mapping
- Performance bottleneck identification

---

## 🚀 Scalability Strategy

### Horizontal Scaling

- Stateless microservices (12-factor app)
- Kubernetes autoscaling (HPA)
- Load balancing with ALB/NLB

### Database Scaling

- Read replicas for queries
- Connection pooling (PgBouncer)
- Partitioning for large tables (orders, payouts)

### Caching Strategy

- Redis for session storage
- Application-level caching (cart, products)
- CDN for static assets (CloudFront)

### Performance Targets

- API latency: P95 < 500ms
- Search latency: P95 < 200ms
- Uptime: 99.9%
- Throughput: > 1000 req/s

---

## 📦 Deployment Pipeline

```
[Git Push] → [GitHub Actions]
                │
                ├─> Run Tests (Jest)
                ├─> Security Scan (Snyk)
                ├─> Build Docker Images
                ├─> Push to ECR
                └─> Deploy to K8s (ArgoCD)
                      │
                      ├─> Staging (auto)
                      └─> Production (manual approval)
```

---

## 🔄 Data Flow Examples

### Customer Makes Purchase

1. Customer adds products to cart (Order Service + Redis)
2. Selects shipping methods per vendor (Shipping Service)
3. Proceeds to checkout (Order Service)
4. Creates payment intent (Payment Service → Stripe)
5. Confirms payment (Frontend → Stripe)
6. Webhook triggers transfers (Payment Service)
7. Vendors receive payouts (Stripe → Bank accounts)
8. Email notifications sent (Notification Service)

### Vendor Uploads Products

1. CSV upload via Vendor Portal
2. Product Service validates data
3. Bulk insert into PostgreSQL
4. Index in Elasticsearch
5. Upload images to S3
6. Generate CDN URLs
7. Update inventory counts

---

This architecture supports:
- ✅ Millions of products
- ✅ Thousands of concurrent vendors
- ✅ Automated split payments
- ✅ Real-time search
- ✅ Horizontal scalability
- ✅ High availability (99.9%+)
