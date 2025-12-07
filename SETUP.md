# Kreo Marketplace - Setup & Installation Guide

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js >= 18.0.0
- Docker & Docker Compose
- Git
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)
- Elasticsearch 8+ (or use Docker)

### 1. Clone and Setup Environment

```bash
cd kreo-marketplace

# Copy environment variables
cp .env.example .env

# Edit .env with your actual values:
# - Stripe keys (https://dashboard.stripe.com/apikeys)
# - AWS credentials (for S3)
# - SendGrid API key
# - etc.
nano .env
```

### 2. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, and Elasticsearch
docker-compose up -d postgres redis elasticsearch

# Wait for services to be healthy (~30 seconds)
docker-compose ps
```

### 3. Initialize Database

```bash
# The init.sql script runs automatically on first startup
# Verify database is ready
docker exec -it kreo-postgres psql -U kreo -d kreo_db -c "SELECT COUNT(*) FROM users;"
```

### 4. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all service dependencies (monorepo)
npm install --workspaces
```

### 5. Build Shared Libraries

```bash
cd shared/types
npm install
npm run build
cd ../..
```

### 6. Start All Services (Development)

**Option A: All services at once**
```bash
npm run dev
```

**Option B: Individual services (recommended for debugging)**

Terminal 1 - Auth Service:
```bash
cd services/auth-service
npm install
npm run start:dev
```

Terminal 2 - Payment Service:
```bash
cd services/payment-service
npm install
npm run start:dev
```

Terminal 3 - Order Service:
```bash
cd services/order-service
npm install
npm run start:dev
```

Terminal 4 - Product Service:
```bash
cd services/product-service
npm install
npm run start:dev
```

Terminal 5 - API Gateway:
```bash
cd api-gateway
npm install
npm run dev
```

Terminal 6 - Customer App:
```bash
cd frontend/customer-app
npm install
npm run dev
```

Terminal 7 - Vendor Portal:
```bash
cd frontend/vendor-portal
npm install
npm run dev
```

### 7. Access Applications

- **Customer App:** http://localhost:5173
- **Vendor Portal:** http://localhost:5174
- **API Gateway:** http://localhost:3000
- **API Health Check:** http://localhost:3000/health

---

## 🐳 Docker Development (Recommended)

```bash
# Start everything with Docker Compose
docker-compose up --build

# Or in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database)
docker-compose down -v
```

---

## 🧪 Testing Split Payment Flow

### 1. Register as Vendor

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor1@example.com",
    "password": "password123",
    "role": "vendor",
    "first_name": "John",
    "last_name": "Vendor"
  }'
```

### 2. Create Vendor Profile & Connect Stripe

```bash
# Get access token from login response
TOKEN="your_jwt_token_here"

# Create vendor profile
curl -X POST http://localhost:3000/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shop_name": "Johns Shop",
    "shop_slug": "johns-shop",
    "shop_description": "Quality products"
  }'

# Create Stripe Connect account
curl -X POST http://localhost:3000/api/payments/connect/create-account \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor1@example.com",
    "country": "US"
  }'

# Get onboarding link (visit this URL to complete Stripe onboarding)
curl -X POST http://localhost:3000/api/payments/connect/account-link \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "acct_xxxxx",
    "refresh_url": "http://localhost:5174/onboarding",
    "return_url": "http://localhost:5174/dashboard"
  }'
```

### 3. Create Products

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Product",
    "description": "This is a test product",
    "base_price": 99.99,
    "inventory_quantity": 100,
    "status": "active"
  }'
```

### 4. Test Checkout as Customer

```bash
# Register as customer
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123",
    "role": "customer"
  }'

# Add to cart
CUSTOMER_TOKEN="customer_jwt_token"
curl -X POST http://localhost:3000/api/cart/add \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "product_uuid_here",
    "quantity": 2
  }'

# Create order
curl -X POST http://localhost:3000/api/orders/checkout \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "shipping_address": {
      "first_name": "Jane",
      "last_name": "Customer",
      "address_line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country_code": "US"
    },
    "billing_address": { ... },
    "payment_method_id": "pm_card_visa"
  }'
```

---

## 📊 Database Management

### Backup Database

```bash
docker exec kreo-postgres pg_dump -U kreo kreo_db > backup.sql
```

### Restore Database

```bash
docker exec -i kreo-postgres psql -U kreo -d kreo_db < backup.sql
```

### Access Database

```bash
docker exec -it kreo-postgres psql -U kreo -d kreo_db
```

### Useful Queries

```sql
-- Check vendor payouts
SELECT v.shop_name, vp.*
FROM vendor_payouts vp
JOIN vendors v ON vp.vendor_id = v.id
ORDER BY vp.created_at DESC;

-- Check orders with sub-orders
SELECT o.order_number, o.grand_total, o.payment_status,
       COUNT(so.id) as vendor_count
FROM orders o
LEFT JOIN sub_orders so ON o.id = so.order_id
GROUP BY o.id
ORDER BY o.created_at DESC;

-- Verify Elasticsearch sync
SELECT id, title, status FROM products WHERE status = 'active';
```

---

## 🏭 Production Deployment

### AWS Deployment with Kubernetes

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker tag kreo/auth-service:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/kreo/auth-service:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/kreo/auth-service:latest

# Deploy to Kubernetes
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/

# Check deployment status
kubectl get pods -n kreo-marketplace
kubectl get services -n kreo-marketplace
```

### Environment Variables (Production)

```bash
# Create Kubernetes secrets
kubectl create secret generic kreo-secrets \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=JWT_SECRET=... \
  --from-literal=STRIPE_SECRET_KEY=... \
  -n kreo-marketplace
```

---

## 🔧 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs auth-service
docker-compose logs payment-service

# Restart specific service
docker-compose restart auth-service

# Rebuild service
docker-compose up -d --build auth-service
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection
docker exec -it kreo-postgres psql -U kreo -d kreo_db -c "SELECT 1;"

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d postgres
```

### Elasticsearch Not Working

```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Recreate index
curl -X DELETE http://localhost:9200/products
# Restart product-service to recreate index
```

### Stripe Webhooks Not Received

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local
stripe listen --forward-to localhost:3006/payments/webhooks

# Get webhook secret and update .env
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 📚 API Documentation

### Authentication Endpoints

```
POST /api/auth/register      - Register new user
POST /api/auth/login         - Login
POST /api/auth/refresh       - Refresh token
GET  /api/auth/me            - Get current user
```

### Product Endpoints

```
GET    /api/products              - Search products
GET    /api/products/:id          - Get product details
POST   /api/products              - Create product (vendor only)
PUT    /api/products/:id          - Update product
DELETE /api/products/:id          - Delete product
POST   /api/products/bulk-upload - Bulk upload CSV
```

### Cart & Order Endpoints

```
POST /api/cart/add                 - Add to cart
GET  /api/cart                     - Get cart
POST /api/orders/checkout          - Create order
GET  /api/orders/:id               - Get order details
GET  /api/orders/user/:userId      - Get user orders
```

### Payment Endpoints

```
POST /api/payments/create-intent      - Create payment intent
POST /api/payments/execute-transfers  - Execute split payment
POST /api/payments/webhooks           - Stripe webhooks
GET  /api/payments/vendor/:id/payouts - Get vendor payouts
```

---

## 🎯 Next Steps

1. ✅ Complete Stripe Connect onboarding
2. ✅ Configure AWS S3 for product images
3. ✅ Set up SendGrid for email notifications
4. ✅ Configure Shippo for shipping
5. ✅ Set up monitoring (Datadog/New Relic)
6. ✅ Configure CI/CD pipeline
7. ✅ Load test with k6 or Artillery

---

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/kreo-marketplace/issues
- Documentation: https://docs.kreo.com
- Email: support@kreo.com
