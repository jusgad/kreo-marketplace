# Guía de Instalación y Configuración
## Kreo Marketplace

---

## Tabla de Contenidos

1. [Requisitos del Sistema](#requisitos-del-sistema)
2. [Instalación Rápida](#instalación-rápida)
3. [Instalación Detallada](#instalación-detallada)
4. [Configuración de Servicios](#configuración-de-servicios)
5. [Base de Datos](#base-de-datos)
6. [Variables de Entorno](#variables-de-entorno)
7. [Servicios Externos](#servicios-externos)
8. [Ejecución en Desarrollo](#ejecución-en-desarrollo)
9. [Despliegue en Producción](#despliegue-en-producción)
10. [Solución de Problemas](#solución-de-problemas)

---

## Requisitos del Sistema

### Hardware Mínimo (Desarrollo)

```
- CPU: 4 cores
- RAM: 8 GB
- Disco: 20 GB de espacio libre
- Sistema Operativo: Linux, macOS o Windows 10/11
```

### Hardware Recomendado (Producción)

```
- CPU: 8+ cores
- RAM: 16+ GB
- Disco: SSD con 100+ GB
- Sistema Operativo: Ubuntu 22.04 LTS o similar
```

### Software Requerido

**Esenciales**:
```
- Node.js >= 18.0.0
- npm >= 9.0.0 (o yarn >= 1.22)
- Docker >= 20.10
- Docker Compose >= 2.0
- Git
```

**Bases de Datos y Servicios**:
```
- PostgreSQL 15+
- Redis 7+
- Elasticsearch 8+
```

**Opcional (para desarrollo)**:
```
- pgAdmin (GUI para PostgreSQL)
- Redis Commander (GUI para Redis)
- Postman (para pruebas de API)
```

---

## Instalación Rápida

Para empezar rápidamente en entorno de desarrollo:

### 1. Clonar el Repositorio

```bash
git clone https://github.com/yourusername/kreo-marketplace.git
cd kreo-marketplace
```

### 2. Copiar Variables de Entorno

```bash
cp .env.example .env
```

### 3. Generar Secrets Seguros

```bash
# Genera JWT secrets
openssl rand -base64 32  # Copia y pega en JWT_ACCESS_SECRET
openssl rand -base64 32  # Copia y pega en JWT_REFRESH_SECRET
openssl rand -base64 32  # Copia y pega en SESSION_SECRET

# Abre .env y reemplaza los valores CAMBIAR-POR-*
nano .env
```

### 4. Iniciar Servicios con Docker

```bash
# Inicia PostgreSQL, Redis y Elasticsearch
docker-compose up -d postgres redis elasticsearch

# Verifica que estén corriendo
docker-compose ps
```

### 5. Instalar Dependencias

```bash
npm install
```

### 6. Configurar Base de Datos

```bash
# Aplicar esquema de base de datos
docker exec -i kreo-marketplace-postgres-1 psql -U kreo -d kreo_db < shared/database/init.sql

# Verificar que las tablas se crearon
docker exec -it kreo-marketplace-postgres-1 psql -U kreo -d kreo_db -c "\dt"
```

### 7. Iniciar la Aplicación

```bash
# Inicia todos los servicios en modo desarrollo
npm run dev
```

### 8. Verificar Instalación

Abre tu navegador y verifica:

```
✓ App de Cliente: http://localhost:5173
  - Interfaz moderna con Dark Mode
  - Animaciones fluidas con Framer Motion
  - Iconos con Lucide React
  - Diseño responsive (móvil, tablet, desktop)
✓ Portal de Vendedor: http://localhost:5174
✓ API Gateway: http://localhost:3000/health
```

Si ves las aplicaciones con el nuevo diseño moderno, ¡la instalación fue exitosa!

---

## Instalación Detallada

### Paso 1: Instalar Node.js

#### Linux (Ubuntu/Debian)

```bash
# Instalar NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Instalar Node.js
sudo apt-get install -y nodejs

# Verificar instalación
node --version  # Debe mostrar v18.x.x o superior
npm --version   # Debe mostrar 9.x.x o superior
```

#### macOS

```bash
# Usando Homebrew
brew install node@18

# Verificar instalación
node --version
npm --version
```

#### Windows

1. Descarga el instalador desde: https://nodejs.org/
2. Ejecuta el instalador
3. Verifica en CMD: `node --version`

### Paso 2: Instalar Docker

#### Linux (Ubuntu)

```bash
# Actualizar repositorios
sudo apt-get update

# Instalar dependencias
sudo apt-get install ca-certificates curl gnupg lsb-release

# Agregar clave GPG de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Configurar repositorio
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verificar instalación
docker --version
docker compose version

# Agregar usuario al grupo docker (para no usar sudo)
sudo usermod -aG docker $USER
newgrp docker
```

#### macOS

```bash
# Descargar e instalar Docker Desktop
# https://www.docker.com/products/docker-desktop/

# O usando Homebrew
brew install --cask docker

# Inicia Docker Desktop y verifica
docker --version
```

#### Windows

1. Descarga Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Instala y reinicia
3. Verifica en PowerShell: `docker --version`

### Paso 3: Clonar Proyecto

```bash
# Clona el repositorio
git clone https://github.com/yourusername/kreo-marketplace.git

# Entra al directorio
cd kreo-marketplace

# Verifica la estructura
tree -L 2 -I 'node_modules|dist'
```

### Paso 4: Configurar Variables de Entorno

```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Abre el archivo para editar
nano .env  # o usa tu editor preferido
```

**Variables críticas que DEBES configurar**:

```bash
# Base de datos (puedes dejar valores por defecto para desarrollo)
DATABASE_URL=postgresql://kreo:kreo_dev_password@localhost:5432/kreo_db

# JWT Secrets (GENERA NUEVOS VALORES)
JWT_ACCESS_SECRET=CAMBIAR-POR-SECRET-GENERADO
JWT_REFRESH_SECRET=CAMBIAR-POR-OTRO-SECRET-DIFERENTE
SESSION_SECRET=CAMBIAR-POR-SECRET-GENERADO

# Stripe (necesario para pagos)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Generar secrets seguros**:

```bash
# Ejecuta este comando 3 veces para generar 3 secrets diferentes
openssl rand -base64 32

# Copia cada output y pégalo en:
# - JWT_ACCESS_SECRET
# - JWT_REFRESH_SECRET
# - SESSION_SECRET
```

---

## Configuración de Servicios

### PostgreSQL

#### Opción 1: Docker (Recomendado para Desarrollo)

```bash
# Ya incluido en docker-compose.yml
docker-compose up -d postgres

# Verificar que esté corriendo
docker-compose ps postgres

# Conectar manualmente (opcional)
docker exec -it kreo-marketplace-postgres-1 psql -U kreo -d kreo_db
```

#### Opción 2: Instalación Local

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-15

# macOS
brew install postgresql@15

# Iniciar servicio
sudo systemctl start postgresql  # Linux
brew services start postgresql@15  # macOS

# Crear usuario y base de datos
sudo -u postgres psql
CREATE USER kreo WITH PASSWORD 'kreo_dev_password';
CREATE DATABASE kreo_db OWNER kreo;
GRANT ALL PRIVILEGES ON DATABASE kreo_db TO kreo;
\q
```

### Redis

#### Opción 1: Docker (Recomendado)

```bash
docker-compose up -d redis

# Verificar conexión
docker exec -it kreo-marketplace-redis-1 redis-cli ping
# Debe responder: PONG
```

#### Opción 2: Instalación Local

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Iniciar servicio
sudo systemctl start redis  # Linux
brew services start redis  # macOS

# Verificar
redis-cli ping  # Debe responder: PONG
```

### Elasticsearch

#### Opción 1: Docker (Recomendado)

```bash
docker-compose up -d elasticsearch

# Verificar
curl http://localhost:9200
# Debe responder con información del cluster
```

#### Opción 2: Instalación Local

```bash
# Descargar Elasticsearch 8.x
wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.10.0-linux-x86_64.tar.gz

# Extraer
tar -xzf elasticsearch-8.10.0-linux-x86_64.tar.gz
cd elasticsearch-8.10.0

# Iniciar
./bin/elasticsearch
```

---

## Base de Datos

### Aplicar Esquema

```bash
# Con Docker
docker exec -i kreo-marketplace-postgres-1 psql -U kreo -d kreo_db < shared/database/init.sql

# Con PostgreSQL local
psql -U kreo -d kreo_db -f shared/database/init.sql
```

### Verificar Tablas Creadas

```bash
# Con Docker
docker exec -it kreo-marketplace-postgres-1 psql -U kreo -d kreo_db

# Listar tablas
\dt

# Deberías ver:
# - users
# - vendors
# - products
# - orders
# - sub_orders
# - order_items
# - reviews
# - etc.

# Salir
\q
```

### Usuario Administrador por Defecto

El script `init.sql` crea un usuario administrador:

```
Email: admin@kreo.com
Password: admin123
```

**IMPORTANTE**: Cambia esta contraseña inmediatamente en producción.

### Migraciones (Opcional)

Si necesitas aplicar cambios al esquema:

```bash
# Las migraciones se gestionan con TypeORM
# Crear nueva migración
npm run migration:create -- -n NombreMigracion

# Ejecutar migraciones
npm run migration:run

# Revertir última migración
npm run migration:revert
```

---

## Variables de Entorno

### Archivo .env Completo

```bash
# =============================================================================
# BASE DE DATOS
# =============================================================================

DATABASE_URL=postgresql://kreo:kreo_dev_password@localhost:5432/kreo_db

# =============================================================================
# CACHE Y BÚSQUEDA
# =============================================================================

REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

ELASTICSEARCH_URL=http://localhost:9200

# =============================================================================
# SEGURIDAD - JWT Y SESIONES
# =============================================================================

# Access Token (vida corta: 15 minutos)
JWT_ACCESS_SECRET=tu_secret_generado_con_openssl_1
JWT_ACCESS_EXPIRES_IN=15m

# Refresh Token (vida larga: 7 días)
JWT_REFRESH_SECRET=tu_secret_generado_con_openssl_2
JWT_REFRESH_EXPIRES_IN=7d

# Session Secret (para express-session)
SESSION_SECRET=tu_secret_generado_con_openssl_3

# Compatibilidad con código antiguo (eliminar cuando migres)
JWT_SECRET=your_jwt_secret_here_change_in_production
JWT_EXPIRES_IN=7d

# =============================================================================
# ENTORNO
# =============================================================================

NODE_ENV=development  # development, production, test

# =============================================================================
# URLS DE FRONTEND
# =============================================================================

CUSTOMER_APP_URL=http://localhost:5173
VENDOR_PORTAL_URL=http://localhost:5174
API_GATEWAY_URL=http://localhost:3000

# =============================================================================
# CORS - URLs PERMITIDAS (producción)
# =============================================================================

ALLOWED_ORIGINS=https://tuapp.com,https://www.tuapp.com,https://vendor.tuapp.com

# =============================================================================
# STRIPE (PAGOS)
# =============================================================================

STRIPE_SECRET_KEY=sk_test_tu_clave_de_stripe
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica

# =============================================================================
# AWS S3 (ALMACENAMIENTO DE IMÁGENES)
# =============================================================================

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_S3_BUCKET=kreo-marketplace-products

# =============================================================================
# SENDGRID (EMAILS)
# =============================================================================

SENDGRID_API_KEY=tu_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@kreo.com

# =============================================================================
# TWILIO (SMS)
# =============================================================================

TWILIO_ACCOUNT_SID=tu_twilio_sid
TWILIO_AUTH_TOKEN=tu_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# =============================================================================
# SHIPPO (ENVÍOS)
# =============================================================================

SHIPPO_API_KEY=tu_shippo_api_key

# =============================================================================
# RATE LIMITING
# =============================================================================

ENABLE_RATE_LIMITING=true
LOGIN_RATE_LIMIT_MAX=5
LOGIN_RATE_LIMIT_WINDOW=60
REGISTER_RATE_LIMIT_MAX=3
REGISTER_RATE_LIMIT_WINDOW=3600

# Seguridad adicional
IP_BLOCK_DURATION=3600
MAX_FAILED_ATTEMPTS=10
```

### Variables por Servicio

Cada servicio puede tener su propio `.env` local. Ejemplo para `auth-service`:

```bash
# services/auth-service/.env

# Hereda del .env raíz
DATABASE_URL=postgresql://kreo:kreo_dev_password@localhost:5432/kreo_db
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
SESSION_SECRET=...

# Específicas del servicio
PORT=3001
SERVICE_NAME=auth-service
```

---

## Servicios Externos

### Stripe (Obligatorio para Pagos)

1. **Crear cuenta en Stripe**:
   - Ve a: https://stripe.com
   - Regístrate o inicia sesión

2. **Obtener API Keys**:
   - Dashboard → Developers → API Keys
   - Copia:
     - Publishable key (pk_test_...)
     - Secret key (sk_test_...)

3. **Configurar Webhook**:
   - Dashboard → Developers → Webhooks
   - Agrega endpoint: `https://tu-dominio.com/api/payments/webhooks`
   - Selecciona eventos:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `transfer.created`
   - Copia el **Webhook secret** (whsec_...)

4. **Agregar a .env**:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### AWS S3 (Opcional - para Imágenes)

1. **Crear cuenta AWS**:
   - https://aws.amazon.com

2. **Crear Bucket S3**:
   - S3 Console → Create bucket
   - Nombre: `kreo-marketplace-products`
   - Región: `us-east-1` (o tu preferida)
   - Desmarca "Block all public access" (para imágenes públicas)

3. **Crear Usuario IAM**:
   - IAM Console → Users → Add user
   - Nombre: `kreo-s3-user`
   - Permisos: `AmazonS3FullAccess` (o política personalizada)
   - Guarda Access Key ID y Secret Access Key

4. **Agregar a .env**:
   ```bash
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   AWS_S3_BUCKET=kreo-marketplace-products
   ```

### SendGrid (Opcional - para Emails)

1. **Crear cuenta**:
   - https://sendgrid.com

2. **Crear API Key**:
   - Settings → API Keys → Create API Key
   - Nombre: `kreo-marketplace`
   - Permisos: Full Access
   - Guarda la API Key

3. **Verificar dominio** (para producción):
   - Settings → Sender Authentication
   - Verifica tu dominio

4. **Agregar a .env**:
   ```bash
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@tudominio.com
   ```

### Twilio (Opcional - para SMS)

1. **Crear cuenta**:
   - https://www.twilio.com

2. **Obtener credenciales**:
   - Console → Account Info
   - Copia Account SID y Auth Token

3. **Comprar número**:
   - Phone Numbers → Buy a number
   - Selecciona un número con capacidad SMS

4. **Agregar a .env**:
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### Shippo (Opcional - para Envíos)

1. **Crear cuenta**:
   - https://goshippo.com

2. **Obtener API Key**:
   - Settings → API
   - Copia Test API Key (para desarrollo)

3. **Agregar a .env**:
   ```bash
   SHIPPO_API_KEY=shippo_test_xxxxxxxxxxxxxxxxxxxxxx
   ```

---

## Ejecución en Desarrollo

### Iniciar Todos los Servicios

```bash
npm run dev
```

Esto inicia concurrentemente:
- API Gateway (puerto 3000)
- Auth Service (puerto 3001)
- Product Service (puerto 3004)
- Order Service (puerto 3005)
- Payment Service (puerto 3006)
- Customer App (puerto 5173)
- Vendor Portal (puerto 5174)

### Iniciar Servicios Individuales

```bash
# Backend
npm run dev:gateway        # API Gateway
npm run dev:auth          # Servicio de autenticación
npm run dev:product       # Servicio de productos
npm run dev:order         # Servicio de pedidos
npm run dev:payment       # Servicio de pagos

# Frontend
npm run dev:customer      # App de cliente
npm run dev:vendor-portal # Portal de vendedor
```

### Modo Watch

Los servicios se reinician automáticamente al detectar cambios en el código.

### Logs

Cada servicio muestra logs en consola:

```
[Auth Service] Server started on port 3001
[Product Service] Connected to Elasticsearch
[Payment Service] Stripe webhook configured
```

---

## Despliegue en Producción

### Con Docker Compose

```bash
# Build de imágenes de producción
docker-compose -f docker-compose.prod.yml build

# Iniciar en modo producción
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Detener
docker-compose -f docker-compose.prod.yml down
```

### Con Kubernetes

```bash
# Crear namespace
kubectl apply -f infrastructure/kubernetes/namespace.yaml

# Aplicar todos los manifiestos
kubectl apply -f infrastructure/kubernetes/

# Verificar pods
kubectl get pods -n kreo-marketplace

# Ver logs de un pod
kubectl logs -f <pod-name> -n kreo-marketplace

# Ver servicios
kubectl get services -n kreo-marketplace
```

### Variables de Entorno en Producción

**NUNCA** committers el archivo `.env` a Git.

**Opciones seguras**:

1. **Kubernetes Secrets**:
   ```bash
   kubectl create secret generic kreo-secrets \
     --from-literal=database-url='postgresql://...' \
     --from-literal=jwt-secret='...' \
     -n kreo-marketplace
   ```

2. **AWS Secrets Manager**
3. **HashiCorp Vault**
4. **Variables de entorno del servidor**

---

## Solución de Problemas

### Error: "Cannot connect to PostgreSQL"

**Síntomas**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Soluciones**:
```bash
# 1. Verificar que PostgreSQL esté corriendo
docker-compose ps postgres

# 2. Verificar logs de PostgreSQL
docker-compose logs postgres

# 3. Reiniciar PostgreSQL
docker-compose restart postgres

# 4. Verificar DATABASE_URL en .env
echo $DATABASE_URL
```

### Error: "Redis connection refused"

**Síntomas**:
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Soluciones**:
```bash
# 1. Verificar que Redis esté corriendo
docker-compose ps redis

# 2. Probar conexión manual
docker exec -it kreo-marketplace-redis-1 redis-cli ping

# 3. Reiniciar Redis
docker-compose restart redis
```

### Error: "Elasticsearch not available"

**Síntomas**:
```
Error: Elasticsearch cluster is not available
```

**Soluciones**:
```bash
# 1. Verificar estado
curl http://localhost:9200

# 2. Ver logs
docker-compose logs elasticsearch

# 3. Aumentar memoria (si es necesario)
# Editar docker-compose.yml:
# environment:
#   - "ES_JAVA_OPTS=-Xms1g -Xmx1g"

# 4. Reiniciar
docker-compose restart elasticsearch
```

### Error: "Port already in use"

**Síntomas**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Soluciones**:
```bash
# 1. Encontrar proceso usando el puerto
lsof -i :3000  # Linux/macOS
netstat -ano | findstr :3000  # Windows

# 2. Matar el proceso
kill -9 <PID>  # Linux/macOS
taskkill /PID <PID> /F  # Windows

# 3. O cambiar el puerto en .env
# PORT=3001
```

### Error: "Module not found"

**Síntomas**:
```
Error: Cannot find module '@nestjs/core'
```

**Soluciones**:
```bash
# 1. Limpiar node_modules
rm -rf node_modules package-lock.json

# 2. Reinstalar dependencias
npm install

# 3. Si persiste, limpiar cache de npm
npm cache clean --force
npm install
```

### Error de Migración de Base de Datos

**Síntomas**:
```
Error: relation "users" already exists
```

**Soluciones**:
```bash
# 1. Eliminar base de datos y recrear
docker exec -it kreo-marketplace-postgres-1 psql -U kreo -d postgres
DROP DATABASE kreo_db;
CREATE DATABASE kreo_db OWNER kreo;
\q

# 2. Volver a aplicar esquema
docker exec -i kreo-marketplace-postgres-1 psql -U kreo -d kreo_db < shared/database/init.sql
```

### Problemas de Rendimiento

**Síntomas**:
- La aplicación es muy lenta
- Respuestas de API tardan mucho

**Soluciones**:
```bash
# 1. Verificar recursos de Docker
docker stats

# 2. Aumentar recursos asignados a Docker
# Docker Desktop → Settings → Resources
# Aumenta CPU y RAM

# 3. Verificar índices de base de datos
docker exec -it kreo-marketplace-postgres-1 psql -U kreo -d kreo_db
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';

# 4. Limpiar cache de Elasticsearch
curl -X POST "localhost:9200/_cache/clear"
```

---

## Comandos Útiles

### Docker

```bash
# Ver todos los contenedores
docker-compose ps

# Ver logs de un servicio
docker-compose logs -f <service-name>

# Reiniciar un servicio
docker-compose restart <service-name>

# Detener todos los servicios
docker-compose down

# Eliminar volúmenes (¡CUIDADO! Borra datos)
docker-compose down -v

# Rebuild de un servicio
docker-compose build <service-name>
```

### Base de Datos

```bash
# Conectar a PostgreSQL
docker exec -it kreo-marketplace-postgres-1 psql -U kreo -d kreo_db

# Backup de base de datos
docker exec kreo-marketplace-postgres-1 pg_dump -U kreo kreo_db > backup.sql

# Restaurar backup
docker exec -i kreo-marketplace-postgres-1 psql -U kreo -d kreo_db < backup.sql

# Ver tamaño de tablas
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### npm

```bash
# Instalar dependencias
npm install

# Build de producción
npm run build

# Ejecutar tests
npm test

# Ver dependencias desactualizadas
npm outdated

# Actualizar dependencias
npm update

# Audit de seguridad
npm audit
npm audit fix
```

---

## Checklist de Instalación

Antes de empezar a usar la aplicación, verifica:

- [ ] Node.js 18+ instalado
- [ ] Docker y Docker Compose instalados
- [ ] PostgreSQL corriendo (verificado con `docker-compose ps`)
- [ ] Redis corriendo (verificado con `redis-cli ping`)
- [ ] Elasticsearch corriendo (verificado con `curl localhost:9200`)
- [ ] Variables de entorno configuradas (.env creado)
- [ ] Secrets JWT generados con openssl
- [ ] Base de datos inicializada (tablas creadas)
- [ ] Dependencias instaladas (npm install ejecutado)
- [ ] API Gateway responde (http://localhost:3000/health)
- [ ] Customer App carga (http://localhost:5173)
- [ ] Vendor Portal carga (http://localhost:5174)
- [ ] Stripe configurado (si planeas probar pagos)

---

## Próximos Pasos

Una vez instalado:

1. **Explorar la aplicación**:
   - Registra una cuenta de cliente
   - Registra una cuenta de vendedor
   - Lista un producto
   - Realiza una compra de prueba

2. **Leer la documentación**:
   - Manual de Usuario: `documentos/manuales/MANUAL-USUARIO-CLIENTE.md`
   - Manual de Vendedor: `documentos/manuales/MANUAL-VENDEDOR.md`
   - Guía de API: `documentos/api/GUIA-API-COMPLETA.md`

3. **Configurar servicios externos**:
   - Stripe (para pagos reales)
   - AWS S3 (para almacenamiento de imágenes)
   - SendGrid (para envío de emails)

4. **Preparar para producción**:
   - Configurar dominio
   - Obtener certificado SSL
   - Configurar CI/CD
   - Establecer monitoreo

---

**¡Felicitaciones!** Has instalado exitosamente Kreo Marketplace.

Para soporte técnico: support@kreo.com

---

*Última actualización: Diciembre 2024*
*Versión: 1.0.0*
