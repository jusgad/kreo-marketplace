# 🗄️ Guía de Conexión a Base de Datos para Despliegue

## 📋 Tabla de Contenidos

1. [Configuración Local (Desarrollo)](#1-configuración-local-desarrollo)
2. [Configuración para Producción](#2-configuración-para-producción)
3. [Despliegue en Railway](#3-despliegue-en-railway)
4. [Despliegue en Render](#4-despliegue-en-render)
5. [Despliegue en AWS RDS](#5-despliegue-en-aws-rds)
6. [Despliegue en DigitalOcean](#6-despliegue-en-digitalocean)
7. [Migraciones y Seeders](#7-migraciones-y-seeders)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Configuración Local (Desarrollo)

### Opción A: PostgreSQL con Docker (Recomendado)

#### Paso 1: Instalar Docker

**Windows/Mac:**
- Descargar Docker Desktop: https://www.docker.com/products/docker-desktop

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

#### Paso 2: Crear archivo docker-compose.yml

Crea el archivo en la raíz del proyecto:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: kreo-postgres
    restart: always
    environment:
      POSTGRES_USER: kreo
      POSTGRES_PASSWORD: kreo_dev_password
      POSTGRES_DB: kreo_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kreo"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis (para Rate Limiting y Caché)
  redis:
    image: redis:7-alpine
    container_name: kreo-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Elasticsearch (para búsqueda de productos)
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: kreo-elasticsearch
    restart: always
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
```

#### Paso 3: Iniciar los servicios

```bash
# Iniciar todos los servicios
docker-compose up -d

# Verificar que están corriendo
docker-compose ps

# Ver logs
docker-compose logs -f postgres
```

#### Paso 4: Configurar variables de entorno

Crea o edita tu archivo `.env`:

```env
# Base de Datos PostgreSQL (Docker)
DATABASE_URL=postgresql://kreo:kreo_dev_password@localhost:5432/kreo_db
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kreo
DB_PASSWORD=kreo_dev_password
DB_NAME=kreo_db

# Redis (Docker)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Elasticsearch (Docker)
ELASTICSEARCH_URL=http://localhost:9200
```

#### Paso 5: Verificar conexión

```bash
# Conectarse a PostgreSQL
docker exec -it kreo-postgres psql -U kreo -d kreo_db

# Dentro de psql:
\l                    # Listar bases de datos
\dt                   # Listar tablas
\q                    # Salir

# Verificar Redis
docker exec -it kreo-redis redis-cli ping
# Debe devolver: PONG

# Verificar Elasticsearch
curl http://localhost:9200
```

---

### Opción B: PostgreSQL Instalado Localmente

#### Paso 1: Instalar PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows:**
- Descargar instalador: https://www.postgresql.org/download/windows/

#### Paso 2: Crear base de datos y usuario

```bash
# Conectarse como usuario postgres
sudo -u postgres psql

# Dentro de psql, ejecutar:
CREATE USER kreo WITH PASSWORD 'kreo_dev_password';
CREATE DATABASE kreo_db OWNER kreo;
GRANT ALL PRIVILEGES ON DATABASE kreo_db TO kreo;
\q
```

#### Paso 3: Configurar .env

```env
DATABASE_URL=postgresql://kreo:kreo_dev_password@localhost:5432/kreo_db
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kreo
DB_PASSWORD=kreo_dev_password
DB_NAME=kreo_db
```

---

## 2. Configuración para Producción

### Principios de Seguridad

✅ **SIEMPRE usar:**
- SSL/TLS para conexiones a base de datos
- Passwords fuertes y únicos
- Variables de entorno (nunca hardcodear credenciales)
- Usuarios con permisos mínimos necesarios
- IP whitelist cuando sea posible
- Connection pooling para mejor rendimiento

❌ **NUNCA hacer:**
- Commitear credenciales al repositorio
- Usar passwords débiles o por defecto
- Permitir conexiones públicas sin SSL
- Dar permisos de superusuario a la aplicación

---

## 3. Despliegue en Railway

### Paso 1: Crear cuenta en Railway

1. Ve a https://railway.app
2. Regístrate con GitHub
3. Crea un nuevo proyecto

### Paso 2: Agregar PostgreSQL

```bash
# En el dashboard de Railway:
1. Click en "+ New"
2. Selecciona "Database"
3. Selecciona "PostgreSQL"
4. Railway creará automáticamente la base de datos
```

### Paso 3: Obtener credenciales

```bash
# En el dashboard de PostgreSQL:
1. Click en "Variables"
2. Copia las variables:
   - DATABASE_URL
   - PGHOST
   - PGPORT
   - PGUSER
   - PGPASSWORD
   - PGDATABASE
```

### Paso 4: Configurar en tu aplicación

**Opción A: Usar DATABASE_URL directamente**

```typescript
// services/auth-service/src/app.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL, // Railway proporciona esto
      ssl: {
        rejectUnauthorized: false, // Railway usa SSL
      },
      synchronize: false, // ⚠️ Usar migraciones en producción
      logging: process.env.NODE_ENV === 'development',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
    }),
  ],
})
export class AppModule {}
```

**Opción B: Usar variables individuales**

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST || process.env.PGHOST,
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
  username: process.env.DB_USERNAME || process.env.PGUSER,
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
  database: process.env.DB_NAME || process.env.PGDATABASE,
  ssl: {
    rejectUnauthorized: false,
  },
  synchronize: false,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
})
```

### Paso 5: Desplegar tu aplicación

```bash
# En el dashboard de Railway:
1. Click en "+ New"
2. Selecciona "GitHub Repo"
3. Conecta tu repositorio
4. Railway detectará automáticamente NestJS
5. Agrega variables de entorno manualmente si es necesario
```

### Paso 6: Ejecutar migraciones

```bash
# Opción A: Desde Railway CLI
railway run npm run migration:run

# Opción B: Conectarse directamente
psql $DATABASE_URL
```

---

## 4. Despliegue en Render

### Paso 1: Crear PostgreSQL en Render

1. Ve a https://render.com
2. Dashboard → "New +" → "PostgreSQL"
3. Configura:
   - Name: `kreo-marketplace-db`
   - Region: Selecciona el más cercano
   - PostgreSQL Version: 15
   - Plan: Free (para desarrollo) o Starter (producción)

### Paso 2: Obtener credenciales

Render proporciona:
- **Internal Database URL**: Para servicios dentro de Render
- **External Database URL**: Para conexiones externas

```
postgresql://usuario:password@host:5432/database
```

### Paso 3: Configurar conexión SSL

Render requiere SSL. Actualiza tu configuración:

```typescript
// app.module.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
  // ... resto de configuración
})
```

### Paso 4: Variables de entorno en Render

```bash
# En el dashboard de tu servicio:
Environment → Add Environment Variable

DATABASE_URL=postgresql://...
NODE_ENV=production
JWT_ACCESS_SECRET=tu-secret-aqui
JWT_REFRESH_SECRET=tu-otro-secret
REDIS_URL=redis://...
```

---

## 5. Despliegue en AWS RDS

### Paso 1: Crear instancia RDS

```bash
# Desde AWS Console:
1. Ve a RDS → Create database
2. Selecciona PostgreSQL
3. Configuración:
   - Engine version: PostgreSQL 15.x
   - Templates: Free tier (desarrollo) o Production
   - DB instance identifier: kreo-marketplace-db
   - Master username: kreo_admin
   - Master password: [GENERA PASSWORD FUERTE]
   - DB instance class: db.t3.micro (free tier)
   - Storage: 20 GB SSD
   - Public access: Yes (temporalmente para setup)
   - VPC security group: Crear nuevo
```

### Paso 2: Configurar Security Group

```bash
1. Ve a EC2 → Security Groups
2. Selecciona el SG de tu RDS
3. Inbound rules → Edit
4. Agregar regla:
   - Type: PostgreSQL
   - Port: 5432
   - Source: Tu IP / 0.0.0.0/0 (solo para desarrollo)
   - Description: PostgreSQL access
```

### Paso 3: Conectarse y crear base de datos

```bash
# Instalar cliente PostgreSQL
sudo apt install postgresql-client

# Conectarse
psql -h kreo-marketplace-db.xxxxxxxxx.us-east-1.rds.amazonaws.com \
     -U kreo_admin \
     -d postgres

# Crear base de datos de aplicación
CREATE DATABASE kreo_db;

# Crear usuario de aplicación (con permisos limitados)
CREATE USER kreo_app WITH PASSWORD 'password-seguro-aqui';
GRANT CONNECT ON DATABASE kreo_db TO kreo_app;
\c kreo_db
GRANT USAGE ON SCHEMA public TO kreo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kreo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kreo_app;
```

### Paso 4: Configurar en tu aplicación

```env
# .env (producción)
DATABASE_URL=postgresql://kreo_app:password-seguro@kreo-marketplace-db.xxxxxxxxx.us-east-1.rds.amazonaws.com:5432/kreo_db
DB_HOST=kreo-marketplace-db.xxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USERNAME=kreo_app
DB_PASSWORD=password-seguro-aqui
DB_NAME=kreo_db
```

### Paso 5: Habilitar SSL

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true,
    // Descargar certificado de: https://truststore.pki.rds.amazonaws.com/
    ca: fs.readFileSync('/path/to/rds-ca-bundle.pem').toString(),
  },
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
})
```

---

## 6. Despliegue en DigitalOcean

### Opción A: Managed Database (Recomendado)

```bash
# Desde el panel de DigitalOcean:
1. Databases → Create Database Cluster
2. Selecciona PostgreSQL 15
3. Datacenter: Selecciona región
4. Plan: Basic ($15/mes para empezar)
5. Nombre: kreo-marketplace-db
```

**Obtener Connection String:**
```
postgresql://usuario:password@db-postgresql-nyc1-xxxxx.ondigitalocean.com:25060/defaultdb?sslmode=require
```

**Configurar:**
```env
DATABASE_URL=postgresql://doadmin:password@db-postgresql-nyc1-xxxxx.ondigitalocean.com:25060/kreo_db?sslmode=require
```

---

### Opción B: Droplet con PostgreSQL

```bash
# 1. Crear Droplet Ubuntu 22.04
# 2. Conectarse por SSH
ssh root@tu-droplet-ip

# 3. Instalar PostgreSQL
apt update
apt install postgresql postgresql-contrib

# 4. Configurar PostgreSQL para aceptar conexiones remotas
nano /etc/postgresql/15/main/postgresql.conf
# Cambiar: listen_addresses = '*'

nano /etc/postgresql/15/main/pg_hba.conf
# Agregar: host all all 0.0.0.0/0 md5

# 5. Reiniciar PostgreSQL
systemctl restart postgresql

# 6. Configurar firewall
ufw allow 5432/tcp

# 7. Crear base de datos
sudo -u postgres psql
CREATE DATABASE kreo_db;
CREATE USER kreo WITH PASSWORD 'password-seguro';
GRANT ALL PRIVILEGES ON DATABASE kreo_db TO kreo;
```

---

## 7. Migraciones y Seeders

### Configurar TypeORM Migrations

#### Paso 1: Configurar ormconfig.ts

```typescript
// ormconfig.ts en la raíz del proyecto
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  entities: ['services/**/src/**/*.entity{.ts,.js}'],
  migrations: ['migrations/*.ts'],
  synchronize: false,
});
```

#### Paso 2: Crear migración

```bash
# Generar migración automática
npm run typeorm migration:generate -- -n InitialMigration

# O crear migración vacía
npm run typeorm migration:create -- -n AddUserRoles
```

#### Paso 3: Scripts en package.json

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:generate": "npm run typeorm -- migration:generate",
    "migration:create": "npm run typeorm -- migration:create",
    "migration:run": "npm run typeorm -- migration:run",
    "migration:revert": "npm run typeorm -- migration:revert"
  }
}
```

#### Paso 4: Ejecutar migraciones en producción

```bash
# Opción A: Manualmente
npm run migration:run

# Opción B: Como parte del despliegue (package.json)
{
  "scripts": {
    "start:prod": "npm run migration:run && node dist/main"
  }
}

# Opción C: Script de despliegue
#!/bin/bash
# deploy.sh
echo "🔄 Ejecutando migraciones..."
npm run migration:run
echo "✅ Migraciones completadas"
echo "🚀 Iniciando aplicación..."
npm run start:prod
```

---

## 8. Troubleshooting

### Problema: "ECONNREFUSED" al conectar

**Causa:** La base de datos no está accesible

**Solución:**
```bash
# 1. Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# 2. Verificar firewall
sudo ufw status
sudo ufw allow 5432/tcp

# 3. Verificar pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Debe tener: host all all 0.0.0.0/0 md5

# 4. Verificar postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf
# Debe tener: listen_addresses = '*'

# 5. Reiniciar
sudo systemctl restart postgresql
```

---

### Problema: "password authentication failed"

**Causa:** Credenciales incorrectas

**Solución:**
```bash
# Resetear password
sudo -u postgres psql
ALTER USER kreo WITH PASSWORD 'nuevo-password';

# Verificar en .env
DB_PASSWORD=nuevo-password
```

---

### Problema: "SSL connection required"

**Causa:** El servidor requiere SSL pero no está configurado

**Solución:**
```typescript
// Agregar SSL en TypeORM config
{
  ssl: {
    rejectUnauthorized: false
  }
}

// O en DATABASE_URL
postgresql://user:pass@host:5432/db?sslmode=require
```

---

### Problema: "too many connections"

**Causa:** Connection pool demasiado grande o conexiones no cerradas

**Solución:**
```typescript
// Configurar connection pool
TypeOrmModule.forRoot({
  // ... otras opciones
  extra: {
    max: 10, // Máximo de conexiones
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
})
```

---

### Problema: Migraciones no se ejecutan

**Causa:** TypeORM no encuentra las migraciones

**Solución:**
```typescript
// Verificar ruta en ormconfig.ts
migrations: ['dist/migrations/*.js'], // En producción
migrations: ['migrations/*.ts'],      // En desarrollo

// Ejecutar con verbose
npm run typeorm migration:run -- -d ormconfig.ts
```

---

## 📚 Recursos Adicionales

- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [NestJS Database](https://docs.nestjs.com/techniques/database)
- [Railway Docs](https://docs.railway.app/)
- [Render PostgreSQL](https://render.com/docs/databases)

---

## ✅ Checklist de Despliegue

Antes de ir a producción, verifica:

- [ ] SSL habilitado en conexión a base de datos
- [ ] Credenciales en variables de entorno (no hardcodeadas)
- [ ] `synchronize: false` en producción (usar migraciones)
- [ ] Connection pooling configurado
- [ ] Backups automáticos configurados
- [ ] Monitoreo de base de datos activo
- [ ] Logs de errores de conexión configurados
- [ ] Security groups / Firewall configurado correctamente
- [ ] Usuario de aplicación con permisos mínimos
- [ ] Migraciones probadas en staging

---

**¿Problemas?** Consulta la sección de [Troubleshooting](#8-troubleshooting) o revisa los logs:

```bash
# Ver logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Ver logs de tu aplicación NestJS
pm2 logs

# Logs en Docker
docker-compose logs -f postgres
```
