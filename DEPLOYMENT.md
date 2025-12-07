# Kreo Marketplace - Guía de Deployment a Producción

Esta guía cubre el despliegue de Kreo Marketplace en entornos de producción.

## Tabla de Contenidos

- [Opciones de Deployment](#opciones-de-deployment)
- [Prerequisitos](#prerequisitos)
- [Configuración de Entorno](#configuración-de-entorno)
- [Deployment con Docker](#deployment-con-docker)
- [Deployment con Kubernetes](#deployment-con-kubernetes)
- [Deployment en AWS](#deployment-en-aws)
- [Deployment en Google Cloud](#deployment-en-google-cloud)
- [Pipeline CI/CD](#pipeline-cicd)
- [Monitoreo y Observabilidad](#monitoreo-y-observabilidad)
- [Hardening de Seguridad](#hardening-de-seguridad)
- [Escalado y Rendimiento](#escalado-y-rendimiento)
- [Backup y Recuperación](#backup-y-recuperación)
- [Troubleshooting](#troubleshooting)

---

## Opciones de Deployment

### Arquitecturas de Producción Recomendadas

1. **Kubernetes en AWS EKS** (Recomendado)
   - Mejor para: Alto tráfico, necesidades de auto-escalado
   - Costo: $$$ (Costos de infraestructura AWS)
   - Complejidad: Alta
   - Escalabilidad: Excelente

2. **Kubernetes en Google Cloud GKE**
   - Mejor para: Usuarios del ecosistema Google Cloud
   - Costo: $$$ (Costos de infraestructura GCP)
   - Complejidad: Alta
   - Escalabilidad: Excelente

3. **Docker Compose en VPS**
   - Mejor para: Deployments pequeños a medianos
   - Costo: $ (VPS único)
   - Complejidad: Baja
   - Escalabilidad: Limitada

4. **Servicios Gestionados (DigitalOcean Kubernetes)**
   - Mejor para: Kubernetes simplificado
   - Costo: $$
   - Complejidad: Media
   - Escalabilidad: Buena

---

## Prerequisitos

### Cuentas y Servicios Requeridos

- [ ] Cuenta AWS (o GCP/Azure)
- [ ] Cuenta Stripe (claves de producción)
- [ ] Nombre de dominio registrado
- [ ] Certificado SSL (Let's Encrypt o AWS ACM)
- [ ] Cuenta SendGrid (email)
- [ ] Cuenta Twilio (SMS)
- [ ] Cuenta Shippo (envíos)
- [ ] Bucket AWS S3 (o equivalente)

### Herramientas Requeridas

```bash
# CLI de Kubernetes
brew install kubectl

# CLI de AWS
brew install awscli

# Terraform (opcional, para IaC)
brew install terraform

# Helm (gestor de paquetes Kubernetes)
brew install helm

# Docker
brew install docker
```

---

## Configuración de Entorno

### Variables de Entorno de Producción

Crear un archivo `.env.production`:

```bash
# Entorno
NODE_ENV=production

# Base de Datos (PostgreSQL gestionado recomendado)
DATABASE_URL=postgresql://kreo_prod:CONTRASEÑA_FUERTE@prod-db.rds.amazonaws.com:5432/kreo_production
DATABASE_SSL=true
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50

# Redis (Redis gestionado recomendado)
REDIS_URL=redis://:CONTRASEÑA_REDIS@prod-redis.cache.amazonaws.com:6379
REDIS_TLS=true

# Elasticsearch (ES gestionado recomendado)
ELASTICSEARCH_URL=https://prod-es.us-east-1.es.amazonaws.com
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=CONTRASEÑA_FUERTE

# Secretos JWT (generar strings aleatorios fuertes de 256 bits)
JWT_SECRET=CAMBIAR_ESTO_A_STRING_ALEATORIO_256_BITS
JWT_REFRESH_SECRET=CAMBIAR_ESTO_A_DIFERENTE_STRING_ALEATORIO_256_BITS
JWT_ALGORITHM=RS256
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Claves de Stripe Producción
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_API_VERSION=2023-10-16

# AWS S3 Producción
AWS_REGION=us-east-1
AWS_S3_BUCKET=kreo-marketplace-produccion
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_CLOUDFRONT_DOMAIN=d123456abcdef8.cloudfront.net

# Email (SendGrid Producción)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@kreo.com
EMAIL_FROM_NAME=Kreo Marketplace

# SMS (Twilio Producción)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+34612345678

# Envíos (Shippo Producción)
SHIPPO_API_KEY=shippo_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# URLs Frontend
CUSTOMER_APP_URL=https://www.kreo.com
VENDOR_PORTAL_URL=https://vendors.kreo.com
API_GATEWAY_URL=https://api.kreo.com

# Orígenes CORS (separados por comas)
CORS_ORIGINS=https://www.kreo.com,https://vendors.kreo.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Monitoreo
SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxxxx
NEW_RELIC_LICENSE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DATADOG_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Feature Flags
ENABLE_2FA=true
ENABLE_OAUTH=true
MAINTENANCE_MODE=false
```

### Gestión de Secretos

**AWS Secrets Manager (Recomendado):**

```bash
# Almacenar secretos
aws secretsmanager create-secret \
  --name kreo-marketplace/production \
  --secret-string file://secrets.json

# Obtener secretos
aws secretsmanager get-secret-value \
  --secret-id kreo-marketplace/production \
  --query SecretString \
  --output text
```

**Kubernetes Secrets:**

```bash
# Crear desde archivo
kubectl create secret generic kreo-secrets \
  --from-env-file=.env.production \
  -n kreo-marketplace

# Crear secretos individuales
kubectl create secret generic stripe-keys \
  --from-literal=secret-key=sk_live_xxx \
  --from-literal=webhook-secret=whsec_xxx \
  -n kreo-marketplace
```

---

## Deployment con Docker

### Construir Imágenes de Producción

```bash
# Construir todos los servicios
docker-compose -f docker-compose.prod.yml build

# Etiquetar imágenes
docker tag kreo/auth-service:latest tu-registro/kreo/auth-service:v1.0.0
docker tag kreo/product-service:latest tu-registro/kreo/product-service:v1.0.0
# ... repetir para todos los servicios

# Push al registro
docker push tu-registro/kreo/auth-service:v1.0.0
docker push tu-registro/kreo/product-service:v1.0.0
```

### Deployment con Docker Compose en Producción

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api-gateway:
    image: tu-registro/kreo/api-gateway:v1.0.0
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    depends_on:
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  auth-service:
    image: tu-registro/kreo/auth-service:v1.0.0
    restart: always
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  # ... otros servicios

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api-gateway
```

### Configuración NGINX

```nginx
# nginx/nginx.conf
upstream api_gateway {
    least_conn;
    server api-gateway-1:3000;
    server api-gateway-2:3000;
    server api-gateway-3:3000;
}

server {
    listen 80;
    server_name api.kreo.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.kreo.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req zone=api_limit burst=200 nodelay;

    location / {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Deployment con Kubernetes

### Configuración de AWS EKS

```bash
# Instalar eksctl
brew install eksctl

# Crear cluster EKS
eksctl create cluster \
  --name kreo-marketplace-prod \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed

# Configurar kubectl
aws eks update-kubeconfig --region us-east-1 --name kreo-marketplace-prod

# Verificar conexión
kubectl get nodes
```

### Manifiestos de Kubernetes

**Namespace:**

```yaml
# infrastructure/kubernetes/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kreo-marketplace
```

**ConfigMap:**

```yaml
# infrastructure/kubernetes/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kreo-config
  namespace: kreo-marketplace
data:
  NODE_ENV: "production"
  API_GATEWAY_URL: "https://api.kreo.com"
  CUSTOMER_APP_URL: "https://www.kreo.com"
  VENDOR_PORTAL_URL: "https://vendors.kreo.com"
```

**Deployment de Servicio Auth:**

```yaml
# infrastructure/kubernetes/auth-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: kreo-marketplace
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: tu-registro/kreo/auth-service:v1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: kreo-config
              key: NODE_ENV
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: kreo-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: kreo-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: kreo-marketplace
spec:
  selector:
    app: auth-service
  ports:
  - protocol: TCP
    port: 3001
    targetPort: 3001
  type: ClusterIP
```

**Autoscaler Horizontal de Pods:**

```yaml
# infrastructure/kubernetes/auth-service-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
  namespace: kreo-marketplace
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**Ingress (Controlador NGINX Ingress):**

```yaml
# infrastructure/kubernetes/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kreo-ingress
  namespace: kreo-marketplace
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.kreo.com
    secretName: kreo-tls-secret
  rules:
  - host: api.kreo.com
    http:
      paths:
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 3001
      - path: /api/products
        pathType: Prefix
        backend:
          service:
            name: product-service
            port:
              number: 3004
      - path: /api/orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 3005
      - path: /api/payments
        pathType: Prefix
        backend:
          service:
            name: payment-service
            port:
              number: 3006
```

### Deploy a Kubernetes

```bash
# Aplicar todos los manifiestos
kubectl apply -f infrastructure/kubernetes/

# Verificar deployments
kubectl get deployments -n kreo-marketplace
kubectl get pods -n kreo-marketplace
kubectl get services -n kreo-marketplace

# Revisar logs
kubectl logs -f deployment/auth-service -n kreo-marketplace

# Escalar deployment
kubectl scale deployment auth-service --replicas=5 -n kreo-marketplace
```

---

## Deployment en AWS

### Componentes de Infraestructura

**Servicios AWS Requeridos:**

1. **EKS** - Cluster Kubernetes
2. **RDS PostgreSQL** - Base de datos
3. **ElastiCache Redis** - Caché
4. **Elasticsearch Service** - Búsqueda
5. **S3** - Almacenamiento de archivos
6. **CloudFront** - CDN
7. **Route53** - DNS
8. **ACM** - Certificados SSL
9. **ECR** - Registro Docker
10. **CloudWatch** - Monitoreo
11. **ALB** - Balanceador de carga

### Configuración con Terraform

```hcl
# infrastructure/terraform/main.tf
provider "aws" {
  region = "us-east-1"
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "kreo-marketplace-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_dns_hostnames = true
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier        = "kreo-marketplace-db"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.t3.medium"
  allocated_storage = 100
  storage_encrypted = true

  db_name  = "kreo_production"
  username = "kreo_admin"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  skip_final_snapshot    = false
  final_snapshot_identifier = "kreo-final-snapshot"

  tags = {
    Environment = "production"
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "kreo-redis"
  engine               = "redis"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  tags = {
    Environment = "production"
  }
}

# Bucket S3
resource "aws_s3_bucket" "products" {
  bucket = "kreo-marketplace-produccion"

  tags = {
    Environment = "production"
  }
}

resource "aws_s3_bucket_versioning" "products" {
  bucket = aws_s3_bucket.products.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

### Desplegar Infraestructura

```bash
cd infrastructure/terraform

# Inicializar Terraform
terraform init

# Planear cambios
terraform plan

# Aplicar infraestructura
terraform apply

# Obtener outputs
terraform output
```

---

## Pipeline CI/CD

### Workflow GitHub Actions

```yaml
# .github/workflows/deploy-production.yml
name: Deploy a Producción

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  EKS_CLUSTER: kreo-marketplace-prod
  ECR_REGISTRY: 123456789.dkr.ecr.us-east-1.amazonaws.com

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configurar Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Instalar dependencias
        run: npm ci

      - name: Ejecutar linter
        run: npm run lint

      - name: Ejecutar tests
        run: npm test

      - name: Ejecutar tests E2E
        run: npm run test:e2e

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [auth-service, product-service, order-service, payment-service]

    steps:
      - uses: actions/checkout@v3

      - name: Configurar credenciales AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login a Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build y push imagen Docker
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/kreo/${{ matrix.service }}:$IMAGE_TAG \
            -f services/${{ matrix.service }}/Dockerfile \
            services/${{ matrix.service }}
          docker push $ECR_REGISTRY/kreo/${{ matrix.service }}:$IMAGE_TAG
          docker tag $ECR_REGISTRY/kreo/${{ matrix.service }}:$IMAGE_TAG \
            $ECR_REGISTRY/kreo/${{ matrix.service }}:latest
          docker push $ECR_REGISTRY/kreo/${{ matrix.service }}:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v3

      - name: Configurar credenciales AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Actualizar kubeconfig
        run: |
          aws eks update-kubeconfig --region ${{ env.AWS_REGION }} \
            --name ${{ env.EKS_CLUSTER }}

      - name: Deploy a Kubernetes
        run: |
          kubectl apply -f infrastructure/kubernetes/
          kubectl rollout status deployment/auth-service -n kreo-marketplace
          kubectl rollout status deployment/product-service -n kreo-marketplace
          kubectl rollout status deployment/order-service -n kreo-marketplace
          kubectl rollout status deployment/payment-service -n kreo-marketplace

      - name: Verificar deployment
        run: |
          kubectl get pods -n kreo-marketplace
          kubectl get services -n kreo-marketplace
```

---

## Monitoreo y Observabilidad

### Prometheus y Grafana

```bash
# Instalar Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Acceder a Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

### Logging de Aplicación

```typescript
// Usar Winston para logging estructurado
import * as winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'auth-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Log con contexto
logger.info('Usuario inició sesión', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
});
```

---

## Hardening de Seguridad

### Mejores Prácticas

- Habilitar SSL/TLS en todos los servicios
- Usar secretos de Kubernetes para información sensible
- Implementar Network Policies
- Habilitar RBAC en Kubernetes
- Usar Security Context en pods
- Escaneo regular de vulnerabilidades con Snyk
- Actualizar dependencias regularmente
- Implementar WAF (Web Application Firewall)

---

## Escalado y Rendimiento

### Horizontal Pod Autoscaling

Configurado basado en uso de CPU y memoria (70-80% de utilización).

### Database Scaling

- Usar read replicas para consultas
- Implementar connection pooling con PgBouncer
- Particionamiento para tablas grandes (orders, payouts)

### Caching Strategy

- Redis para almacenamiento de sesiones
- Caché a nivel de aplicación (carrito, productos)
- CDN para activos estáticos (CloudFront)

---

## Backup y Recuperación

### Backup de Base de Datos

```bash
# Backup automático con AWS RDS
# Configurado para retención de 7 días

# Backup manual
aws rds create-db-snapshot \
  --db-instance-identifier kreo-marketplace-db \
  --db-snapshot-identifier kreo-manual-backup-$(date +%Y%m%d)
```

### Plan de Recuperación de Desastres

- RPO (Recovery Point Objective): < 1 hora
- RTO (Recovery Time Objective): < 4 horas
- Backups automáticos diarios
- Snapshots de volúmenes EBS
- Replicación multi-región para datos críticos

---

## Troubleshooting

### Problemas Comunes

**Pod no inicia:**
```bash
kubectl describe pod <pod-name> -n kreo-marketplace
kubectl logs <pod-name> -n kreo-marketplace
```

**Problemas de conexión a base de datos:**
```bash
# Verificar security groups
# Verificar configuración de VPC
# Revisar secretos de Kubernetes
```

**Alto uso de memoria:**
```bash
kubectl top pods -n kreo-marketplace
# Ajustar límites de recursos en deployments
```

---

Esta guía de deployment proporciona una base completa para despliegue a producción. Ajusta las configuraciones según tus requisitos específicos y escala.

Para preguntas, contacta: devops@kreo.com
