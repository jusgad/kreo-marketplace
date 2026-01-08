# GUÍA COMPLETA: CONEXIÓN A AWS RDS PARA KREO MARKETPLACE

## 📚 TABLA DE CONTENIDOS

1. [Introducción](#introducción)
2. [Prerequisitos](#prerequisitos)
3. [Parte 1: Crear Base de Datos en AWS RDS](#parte-1-crear-base-de-datos-en-aws-rds)
4. [Parte 2: Configurar Seguridad (Security Groups)](#parte-2-configurar-seguridad-security-groups)
5. [Parte 3: Conectar desde Aplicación Local](#parte-3-conectar-desde-aplicación-local)
6. [Parte 4: Migrar Esquema a RDS](#parte-4-migrar-esquema-a-rds)
7. [Parte 5: Conectar desde Docker](#parte-5-conectar-desde-docker)
8. [Parte 6: Conectar desde Kubernetes (EKS)](#parte-6-conectar-desde-kubernetes-eks)
9. [Parte 7: Backups y Recuperación](#parte-7-backups-y-recuperación)
10. [Parte 8: Monitoreo y Optimización](#parte-8-monitoreo-y-optimización)
11. [Troubleshooting](#troubleshooting)
12. [Mejores Prácticas](#mejores-prácticas)

---

## INTRODUCCIÓN

Esta guía te ayudará a migrar tu base de datos PostgreSQL local de Kreo Marketplace a **Amazon RDS** (Relational Database Service).

**Beneficios de usar RDS:**
- ✅ Backups automáticos diarios
- ✅ Alta disponibilidad con Multi-AZ
- ✅ Escalado vertical fácil (cambiar tamaño de instancia)
- ✅ Read replicas para mejor rendimiento
- ✅ Actualizaciones de seguridad automáticas
- ✅ Monitoreo con CloudWatch
- ✅ No necesitas administrar el servidor de BD

---

## PREREQUISITOS

Antes de empezar, asegúrate de tener:

1. **Cuenta de AWS** con permisos para:
   - Crear instancias RDS
   - Configurar Security Groups
   - Crear Subnets (opcional para VPC)

2. **AWS CLI instalado** (opcional pero recomendado):
   ```bash
   # macOS
   brew install awscli

   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install

   # Verificar instalación
   aws --version
   ```

3. **Configurar AWS CLI**:
   ```bash
   aws configure
   # Te pedirá:
   # - AWS Access Key ID
   # - AWS Secret Access Key
   # - Default region (ej: us-east-1)
   # - Output format (json)
   ```

4. **PostgreSQL Client instalado**:
   ```bash
   # macOS
   brew install postgresql

   # Ubuntu/Debian
   sudo apt-get install postgresql-client

   # Verificar
   psql --version
   ```

---

## PARTE 1: CREAR BASE DE DATOS EN AWS RDS

### Opción A: Crear RDS desde AWS Console (GUI)

#### Paso 1.1: Acceder a RDS
1. Inicia sesión en [AWS Console](https://console.aws.amazon.com/)
2. Busca "RDS" en la barra de búsqueda
3. Click en "Create database"

#### Paso 1.2: Configuración del Motor
```
Choose a database creation method:
  ○ Easy create
  ● Standard create

Engine options:
  ● PostgreSQL

Engine Version:
  ● PostgreSQL 15.5-R2 (o la más reciente)
```

#### Paso 1.3: Templates
```
Templates:
  ○ Production (Multi-AZ, alta disponibilidad)
  ● Dev/Test (más económico para empezar)
  ○ Free tier (solo para pruebas)
```

**Recomendación:**
- **Development:** Free tier (db.t3.micro)
- **Staging:** Dev/Test (db.t3.small)
- **Production:** Production (db.t3.medium o superior)

#### Paso 1.4: Settings
```
DB instance identifier: kreo-marketplace-db
Master username: kreo_admin
Master password: [Generar contraseña segura]

✅ Guardar credenciales en un gestor de contraseñas seguro
```

**Generar contraseña segura:**
```bash
# Linux/macOS
openssl rand -base64 32

# Ejemplo de output: K7xQm9pL2vN8jR4tY6uW3zX5cV1bN0mA==
```

#### Paso 1.5: DB Instance Configuration
```
DB instance class:
  ● Burstable classes (includes t classes)
     ● db.t3.micro (1 vCPU, 1 GB RAM) - Free tier
     ○ db.t3.small (2 vCPU, 2 GB RAM) - Desarrollo
     ○ db.t3.medium (2 vCPU, 4 GB RAM) - Staging
     ○ db.t3.large (2 vCPU, 8 GB RAM) - Producción pequeña

Storage type:
  ● General Purpose SSD (gp3)

Allocated storage:
  20 GB (suficiente para empezar)

Enable storage autoscaling:
  ✅ Checked
  Maximum storage threshold: 100 GB
```

#### Paso 1.6: Connectivity
```
Compute resource:
  ○ Connect to an EC2 compute resource (si tienes EC2)
  ● Don't connect to an EC2 compute resource

Network type:
  ● IPv4

Virtual private cloud (VPC):
  ● Default VPC (o crea una VPC nueva)

DB Subnet group:
  ● default

Public access:
  ● Yes (para conectar desde tu local)
  ⚠️ En producción, considera usar VPN o bastion host

VPC security group:
  ● Create new
  New VPC security group name: kreo-marketplace-sg

Availability Zone:
  ● No preference

Database port:
  5432 (default PostgreSQL)
```

**⚠️ IMPORTANTE: Public Access = Yes**
Solo para desarrollo. En producción:
- Usa `Public access = No`
- Conecta desde EC2 dentro de la misma VPC
- O usa VPN/Bastion Host

#### Paso 1.7: Database Authentication
```
Database authentication:
  ● Password authentication
  ○ Password and IAM database authentication
  ○ Password and Kerberos authentication
```

#### Paso 1.8: Monitoring
```
Turn on Performance Insights:
  ✅ Checked (Free tier: 7 días de retención)

Retention period:
  ● 7 days (Free)
```

#### Paso 1.9: Additional Configuration
```
Database options:
  Initial database name: kreo_db
  ✅ IMPORTANTE: Si no lo pones, tendrás que crear la BD manualmente

DB parameter group:
  ● default.postgres15

Option group:
  ● default:postgres-15

Backup:
  Enable automatic backups: ✅ Checked
  Backup retention period: 7 days
  Backup window: No preference

Encryption:
  Enable encryption: ✅ Checked
  AWS KMS key: (default) aws/rds

Maintenance:
  Enable auto minor version upgrade: ✅ Checked
  Maintenance window: No preference

Deletion protection:
  ✅ Enable deletion protection (IMPORTANTE en producción)
```

#### Paso 1.10: Estimar costos
Antes de crear, revisa el estimado de costos mensual en la parte derecha.

**Ejemplo de costos (us-east-1):**
- db.t3.micro (Free tier): $0/mes primer año
- db.t3.small: ~$25/mes
- db.t3.medium: ~$50/mes
- db.t3.large: ~$100/mes

#### Paso 1.11: Crear la instancia
1. Click en "Create database"
2. Espera 5-10 minutos mientras se aprovisiona

**Copiar el endpoint:**
Una vez creada, ve a la instancia y copia el **Endpoint**:
```
kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com
```

---

### Opción B: Crear RDS desde AWS CLI

```bash
# Crear Security Group
aws ec2 create-security-group \
  --group-name kreo-marketplace-sg \
  --description "Security group for Kreo Marketplace database" \
  --vpc-id vpc-xxxxxxxx

# Permitir acceso PostgreSQL desde tu IP
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr $(curl -s https://checkip.amazonaws.com)/32

# Crear instancia RDS
aws rds create-db-instance \
  --db-instance-identifier kreo-marketplace-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.5 \
  --master-username kreo_admin \
  --master-user-password "TU_CONTRASEÑA_SEGURA" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --publicly-accessible \
  --db-name kreo_db \
  --backup-retention-period 7 \
  --storage-encrypted \
  --deletion-protection

# Ver el estado
aws rds describe-db-instances \
  --db-instance-identifier kreo-marketplace-db \
  --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address]' \
  --output text
```

---

## PARTE 2: CONFIGURAR SEGURIDAD (SECURITY GROUPS)

### Paso 2.1: Obtener tu IP pública
```bash
curl https://checkip.amazonaws.com
# Ejemplo output: 203.0.113.45
```

### Paso 2.2: Configurar reglas de entrada

#### Desde AWS Console:
1. Ve a **EC2 > Security Groups**
2. Busca `kreo-marketplace-sg`
3. Click en "Inbound rules" > "Edit inbound rules"
4. Click "Add rule":
   ```
   Type: PostgreSQL
   Protocol: TCP
   Port: 5432
   Source:
     ● Custom
     203.0.113.45/32 (tu IP)
   Description: Mi IP de desarrollo
   ```
5. Click "Save rules"

#### Desde AWS CLI:
```bash
# Permitir tu IP
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr $(curl -s https://checkip.amazonaws.com)/32

# Permitir rango de IPs de tu oficina
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr 203.0.113.0/24
```

**⚠️ NUNCA PERMITIR 0.0.0.0/0 EN PRODUCCIÓN**
Esto permitiría acceso desde cualquier IP del mundo.

---

## PARTE 3: CONECTAR DESDE APLICACIÓN LOCAL

### Paso 3.1: Probar conexión con psql

```bash
# Sintaxis
psql -h <ENDPOINT> -U <USERNAME> -d <DATABASE>

# Ejemplo real
psql -h kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com \
  -U kreo_admin \
  -d kreo_db

# Te pedirá la contraseña
# Si conecta, verás:
kreo_db=>
```

**Probar que funciona:**
```sql
-- Ver versión de PostgreSQL
SELECT version();

-- Listar bases de datos
\l

-- Salir
\q
```

### Paso 3.2: Configurar variables de entorno

Edita tu archivo `.env` en la raíz del proyecto:

```bash
# ============================================================================
# AWS RDS CONFIGURATION
# ============================================================================

# Formato: postgresql://[usuario]:[contraseña]@[endpoint]:[puerto]/[database]
DATABASE_URL=postgresql://kreo_admin:TU_CONTRASEÑA@kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com:5432/kreo_db

# SSL (IMPORTANTE: RDS requiere SSL)
DATABASE_SSL_ENABLED=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false

# Connection Pool (para producción)
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Timeouts
DATABASE_CONNECTION_TIMEOUT=30000
DATABASE_IDLE_TIMEOUT=10000
```

**⚠️ NUNCA COMMITEAR .env AL REPOSITORIO**
```bash
# Asegúrate de que .env está en .gitignore
echo ".env" >> .gitignore
```

### Paso 3.3: Actualizar configuración de TypeORM

Edita `services/auth-service/src/app.module.ts` (y todos los servicios):

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,

      // ✅ IMPORTANTE: Habilitar SSL para RDS
      ssl: process.env.DATABASE_SSL_ENABLED === 'true' ? {
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
      } : false,

      // Entidades
      entities: [__dirname + '/**/*.entity{.ts,.js}'],

      // ⚠️ NUNCA usar synchronize: true en producción
      synchronize: process.env.NODE_ENV === 'development',

      // Logging
      logging: process.env.NODE_ENV === 'development',

      // Connection pool
      extra: {
        max: parseInt(process.env.DATABASE_POOL_MAX) || 10,
        min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
        connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 30000,
        idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 10000,
      },
    }),
    // ... otros módulos
  ],
})
export class AppModule {}
```

### Paso 3.4: Probar conexión desde la aplicación

```bash
# Iniciar auth-service
cd services/auth-service
npm run start:dev

# Deberías ver en los logs:
# [TypeORM] Connection to PostgreSQL established
# [NestApplication] Auth Service listening on port 3001
```

**Si hay error de conexión:**
```
TimeoutError: Connection timeout
```
Verifica:
1. ✅ Security Group permite tu IP
2. ✅ Endpoint es correcto
3. ✅ Contraseña es correcta
4. ✅ Database name existe

---

## PARTE 4: MIGRAR ESQUEMA A RDS

### Opción A: Usar TypeORM Synchronize (Solo Development)

```typescript
// app.module.ts
TypeOrmModule.forRoot({
  // ...
  synchronize: true,  // ⚠️ Solo en dev, NUNCA en producción
})
```

**Ventajas:**
- ✅ Automático
- ✅ Rápido

**Desventajas:**
- ❌ Puede borrar datos
- ❌ No tienes control sobre migraciones
- ❌ No funciona bien con cambios complejos

---

### Opción B: Usar Migraciones de TypeORM (Recomendado)

#### Paso 4B.1: Generar migración inicial

```bash
cd services/auth-service

# Generar migración basada en tus entidades
npm run typeorm migration:generate -- -n InitialSchema

# Esto crea un archivo en: src/migrations/1234567890-InitialSchema.ts
```

#### Paso 4B.2: Revisar la migración generada

```typescript
// src/migrations/1234567890-InitialSchema.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear extensión UUID
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Crear tabla users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying,
        "role" character varying(20) NOT NULL,
        "first_name" character varying,
        "last_name" character varying,
        "phone" character varying,
        "avatar_url" text,
        "email_verified" boolean NOT NULL DEFAULT false,
        "email_verified_at" TIMESTAMP,
        "two_factor_enabled" boolean NOT NULL DEFAULT false,
        "two_factor_secret" character varying,
        "last_login_at" TIMESTAMP,
        "last_login_ip" inet,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Crear índices
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_role" ON "users" ("role")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir cambios
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
```

#### Paso 4B.3: Ejecutar migraciones

```bash
# Ejecutar todas las migraciones pendientes
npm run typeorm migration:run

# Ver estado de migraciones
npm run typeorm migration:show

# Revertir última migración
npm run typeorm migration:revert
```

---

### Opción C: Importar SQL directamente

#### Paso 4C.1: Exportar esquema desde BD local

```bash
# Exportar solo el esquema (sin datos)
pg_dump -h localhost -U kreo -d kreo_db --schema-only > schema.sql

# Exportar esquema + datos
pg_dump -h localhost -U kreo -d kreo_db > full_backup.sql
```

#### Paso 4C.2: Importar a RDS

```bash
# Importar esquema
psql -h kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com \
  -U kreo_admin \
  -d kreo_db \
  -f schema.sql

# Importar datos
psql -h kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com \
  -U kreo_admin \
  -d kreo_db \
  -f full_backup.sql
```

---

### Opción D: Usar archivo init.sql (Rápido para desarrollo)

Si tienes el archivo `shared/database/init.sql`:

```bash
# Ejecutar init.sql en RDS
psql -h kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com \
  -U kreo_admin \
  -d kreo_db \
  -f shared/database/init.sql
```

---

## PARTE 5: CONECTAR DESDE DOCKER

### Paso 5.1: Actualizar docker-compose.yml

```yaml
version: '3.8'

services:
  # ============================================================================
  # COMENTAR POSTGRES LOCAL (ya no lo necesitamos)
  # ============================================================================
  # postgres:
  #   image: postgres:15-alpine
  #   ...

  # ============================================================================
  # SERVICIOS BACKEND (conectan a RDS)
  # ============================================================================
  auth-service:
    build: ./services/auth-service
    environment:
      - NODE_ENV=development
      - PORT=3001
      # ✅ Usar RDS en vez de postgres local
      - DATABASE_URL=postgresql://kreo_admin:TU_CONTRASEÑA@kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com:5432/kreo_db
      - DATABASE_SSL_ENABLED=true
      - DATABASE_SSL_REJECT_UNAUTHORIZED=false
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis  # Ya no depende de postgres local
```

### Paso 5.2: Crear archivo .env para Docker

```bash
# .env.docker
DATABASE_URL=postgresql://kreo_admin:CONTRASEÑA@kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com:5432/kreo_db
DATABASE_SSL_ENABLED=true
```

```yaml
# docker-compose.yml
services:
  auth-service:
    env_file: .env.docker
```

### Paso 5.3: Iniciar servicios

```bash
# Iniciar solo Redis y Elasticsearch (ya no necesitamos Postgres local)
docker-compose up -d redis elasticsearch

# Iniciar todos los servicios
docker-compose up -d
```

---

## PARTE 6: CONECTAR DESDE KUBERNETES (EKS)

### Paso 6.1: Crear Secret con credenciales

```bash
# Crear namespace
kubectl create namespace kreo-marketplace

# Crear Secret con DATABASE_URL
kubectl create secret generic database-secret \
  --from-literal=database-url=postgresql://kreo_admin:CONTRASEÑA@kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com:5432/kreo_db \
  --namespace=kreo-marketplace
```

### Paso 6.2: Configurar Deployment

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
        image: kreo/auth-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3001"
        # ✅ Leer DATABASE_URL desde Secret
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: database-url
        - name: DATABASE_SSL_ENABLED
          value: "true"
        - name: DATABASE_POOL_MAX
          value: "20"
        - name: DATABASE_POOL_MIN
          value: "5"

        # Health checks
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
          initialDelaySeconds: 10
          periodSeconds: 5

        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Paso 6.3: Aplicar configuración

```bash
# Aplicar namespace
kubectl apply -f infrastructure/kubernetes/namespace.yaml

# Aplicar deployment
kubectl apply -f infrastructure/kubernetes/auth-service-deployment.yaml

# Verificar pods
kubectl get pods -n kreo-marketplace

# Ver logs
kubectl logs -f deployment/auth-service -n kreo-marketplace
```

---

## PARTE 7: BACKUPS Y RECUPERACIÓN

### Automated Backups (incluidos en RDS)

RDS hace backups automáticos cada día:

```bash
# Listar snapshots automáticos
aws rds describe-db-snapshots \
  --db-instance-identifier kreo-marketplace-db \
  --snapshot-type automated

# Crear snapshot manual
aws rds create-db-snapshot \
  --db-instance-identifier kreo-marketplace-db \
  --db-snapshot-identifier kreo-marketplace-manual-backup-2025-12-28
```

### Restaurar desde Snapshot

#### Desde AWS Console:
1. Ve a RDS > Snapshots
2. Selecciona el snapshot
3. Click "Actions" > "Restore snapshot"
4. Configura nueva instancia
5. Click "Restore DB instance"

#### Desde AWS CLI:
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier kreo-marketplace-db-restored \
  --db-snapshot-identifier kreo-marketplace-manual-backup-2025-12-28
```

### Backups manuales con pg_dump

```bash
# Backup completo
pg_dump -h kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com \
  -U kreo_admin \
  -d kreo_db \
  -F c \
  -f backup-$(date +%Y%m%d-%H%M%S).dump

# Restaurar backup
pg_restore -h kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com \
  -U kreo_admin \
  -d kreo_db \
  -c \
  backup-20251228-120000.dump
```

### Automatizar backups con cron

```bash
# Crear script de backup
cat > /usr/local/bin/backup-rds.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/backups/rds"
DATE=$(date +%Y%m%d-%H%M%S)
ENDPOINT="kreo-marketplace-db.c9akzfhwkigy.us-east-1.rds.amazonaws.com"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Hacer backup
pg_dump -h $ENDPOINT \
  -U kreo_admin \
  -d kreo_db \
  -F c \
  -f "$BACKUP_DIR/backup-$DATE.dump"

# Subir a S3
aws s3 cp "$BACKUP_DIR/backup-$DATE.dump" s3://mi-bucket-backups/rds/

# Borrar backups locales de más de 7 días
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete

echo "Backup completado: backup-$DATE.dump"
EOF

chmod +x /usr/local/bin/backup-rds.sh

# Agregar a crontab (diario a las 2 AM)
crontab -e
# Agregar línea:
0 2 * * * /usr/local/bin/backup-rds.sh >> /var/log/backup-rds.log 2>&1
```

---

## PARTE 8: MONITOREO Y OPTIMIZACIÓN

### Habilitar Performance Insights

Ya lo habilitamos en el Paso 1.8. Para verlo:

1. Ve a RDS > tu instancia
2. Click en "Performance Insights"
3. Analiza:
   - Top SQL queries
   - CPU utilization
   - DB connections
   - Wait events

### CloudWatch Metrics

```bash
# Ver CPU usage (últimas 24 horas)
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=kreo-marketplace-db \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average

# Ver conexiones activas
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=kreo-marketplace-db \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Maximum
```

### Queries lentas

```sql
-- Habilitar pg_stat_statements (una sola vez)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Ver queries más lentas
SELECT
  calls,
  total_exec_time / 1000 as total_seconds,
  mean_exec_time / 1000 as avg_seconds,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Resetear estadísticas
SELECT pg_stat_statements_reset();
```

### Optimización de Índices

```sql
-- Ver índices faltantes (queries que harían full scan)
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;

-- Ver índices no utilizados
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_%'
ORDER BY relname;
```

---

## TROUBLESHOOTING

### Error: "Connection timeout"

**Causa:** Security Group no permite tu IP

**Solución:**
```bash
# Verificar tu IP actual
curl https://checkip.amazonaws.com

# Agregar tu IP al Security Group
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr $(curl -s https://checkip.amazonaws.com)/32
```

---

### Error: "SSL connection required"

**Causa:** RDS requiere SSL por defecto

**Solución:**
```typescript
// TypeORM config
ssl: {
  rejectUnauthorized: false
}
```

O en DATABASE_URL:
```
postgresql://user:pass@host:5432/db?ssl=true&sslmode=require
```

---

### Error: "Too many connections"

**Causa:** Llegaste al límite de conexiones

**Solución:**
```sql
-- Ver conexiones actuales
SELECT count(*) FROM pg_stat_activity;

-- Ver límite de conexiones
SHOW max_connections;

-- Matar conexiones idle
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < current_timestamp - INTERVAL '10 minutes';
```

Aumentar max_connections:
1. Ve a RDS > Parameter Groups
2. Edita el parameter group
3. Busca `max_connections`
4. Aumenta el valor (ej: de 100 a 200)
5. Reinicia la instancia

---

### Error: "Disk full"

**Solución:**
1. Aumenta el storage:
   ```bash
   aws rds modify-db-instance \
     --db-instance-identifier kreo-marketplace-db \
     --allocated-storage 50 \
     --apply-immediately
   ```

2. O habilita autoscaling (ya lo hicimos en Paso 1.5)

---

## MEJORES PRÁCTICAS

### 1. Seguridad

✅ **HACER:**
- Usar contraseñas fuertes (32+ caracteres)
- Habilitar SSL/TLS
- Rotar contraseñas cada 90 días
- Usar Security Groups restrictivos
- Habilitar deletion protection en producción
- Cifrar base de datos en reposo (encryption)
- Usar IAM database authentication en producción

❌ **NO HACER:**
- Public access en producción
- Contraseñas en código
- Security Group 0.0.0.0/0
- Deshabilitar SSL

---

### 2. Backups

✅ **HACER:**
- Retention de 7-30 días
- Snapshots manuales antes de cambios grandes
- Probar restauración mensualmente
- Exportar backups críticos a S3

---

### 3. Monitoreo

✅ **HACER:**
- Habilitar Performance Insights
- Configurar alarmas CloudWatch:
  - CPU > 80%
  - FreeStorageSpace < 10%
  - DatabaseConnections > 80% del máximo
- Revisar slow queries semanalmente

---

### 4. Connection Pooling

```typescript
// Configuración óptima según tamaño de instancia
const poolConfig = {
  // db.t3.micro: 2-5
  // db.t3.small: 5-10
  // db.t3.medium: 10-20
  // db.t3.large: 20-40
  min: 5,
  max: 20,

  // Timeouts
  connectionTimeoutMillis: 30000,  // 30 segundos
  idleTimeoutMillis: 10000,        // 10 segundos
  acquireTimeoutMillis: 30000,     // 30 segundos
};
```

---

### 5. Multi-AZ para Alta Disponibilidad

Para producción:

```bash
aws rds modify-db-instance \
  --db-instance-identifier kreo-marketplace-db \
  --multi-az \
  --apply-immediately
```

Esto crea una replica sincrónica en otra zona. Si la zona primaria falla, AWS hace failover automático (2-3 minutos).

---

### 6. Read Replicas para Escalado

Si tienes muchas lecturas:

```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier kreo-marketplace-read-replica \
  --source-db-instance-identifier kreo-marketplace-db \
  --db-instance-class db.t3.small
```

Luego en tu aplicación:
```typescript
// Escrituras → Primary
const primaryDataSource = {
  url: process.env.DATABASE_URL_PRIMARY,
};

// Lecturas → Read Replica
const replicaDataSource = {
  url: process.env.DATABASE_URL_REPLICA,
};
```

---

## CONCLUSIÓN

¡Felicidades! Ahora tienes tu base de datos Kreo Marketplace en AWS RDS con:

✅ Alta disponibilidad
✅ Backups automáticos
✅ Monitoreo con CloudWatch
✅ Seguridad con SSL y Security Groups
✅ Escalabilidad vertical y horizontal

**Próximos pasos recomendados:**
1. Configurar alarmas CloudWatch
2. Implementar Multi-AZ en producción
3. Crear Read Replicas si es necesario
4. Automatizar backups a S3
5. Configurar VPN para acceso seguro

---

**Generado el:** 2025-12-28
**Por:** Claude Code Assistant
**Versión:** 1.0
