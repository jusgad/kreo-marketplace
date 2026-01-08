# Guía de Migraciones de Base de Datos - Kreo Marketplace

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Configuración](#configuración)
3. [Comandos de Migraciones](#comandos-de-migraciones)
4. [Crear una Migración](#crear-una-migración)
5. [Ejecutar Migraciones](#ejecutar-migraciones)
6. [Revertir Migraciones](#revertir-migraciones)
7. [Best Practices](#best-practices)

---

## Introducción

Este proyecto usa **TypeORM migrations** para manejar cambios en el esquema de base de datos.

**¿Por qué usar migraciones?**
- ✅ Versionado de esquema de base de datos
- ✅ Deployments reproducibles
- ✅ Rollback seguro de cambios
- ✅ Colaboración en equipo
- ✅ Auditoría de cambios

**⚠️ IMPORTANTE:** En producción, NUNCA usar `synchronize: true`. Siempre usar migraciones.

---

## Configuración

### Variables de Entorno

Cada servicio requiere estas variables:

```bash
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=kreo_auth  # kreo_products, kreo_orders, kreo_payments

NODE_ENV=development  # production en producción
```

### Archivos de Configuración

- `shared/database/migration.config.ts` - Configuración de DataSources
- `shared/database/typeorm.config.ts` - Configuración de runtime
- `shared/database/migrations/` - Directorio de migraciones

---

## Comandos de Migraciones

### Para Auth Service

```bash
# Generar migración automática (basada en cambios en entities)
npm run migration:generate:auth -- InitialSchema

# Crear migración vacía (para cambios manuales)
npm run migration:create:auth -- AddUserIndexes

# Ejecutar migraciones pendientes
npm run migration:run:auth

# Revertir última migración
npm run migration:revert:auth

# Mostrar migraciones ejecutadas y pendientes
npm run migration:show:auth
```

### Para Product Service

```bash
npm run migration:generate:product -- InitialSchema
npm run migration:run:product
npm run migration:revert:product
npm run migration:show:product
```

### Para Order Service

```bash
npm run migration:generate:order -- InitialSchema
npm run migration:run:order
npm run migration:revert:order
npm run migration:show:order
```

### Para Payment Service

```bash
npm run migration:generate:payment -- InitialSchema
npm run migration:run:payment
npm run migration:revert:payment
npm run migration:show:payment
```

---

## Crear una Migración

### Opción 1: Generar Automáticamente (Recomendado)

TypeORM detecta cambios entre entities y el esquema actual:

```bash
# 1. Modificar una entity
# services/auth-service/src/entities/user.entity.ts
@Entity('users')
export class User {
  // ... campos existentes ...

  @Column({ nullable: true })  // ← NUEVO CAMPO
  phone_verified: boolean;
}

# 2. Generar migración
npm run migration:generate:auth -- AddPhoneVerifiedField

# 3. Revisar migración generada en shared/database/migrations/
# Ejemplo: 1704297600000-AddPhoneVerifiedField.ts
```

**La migración generada se verá así:**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneVerifiedField1704297600000 implements MigrationInterface {
  name = 'AddPhoneVerifiedField1704297600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "phone_verified" boolean
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "phone_verified"
    `);
  }
}
```

### Opción 2: Crear Manualmente

Para cambios complejos (índices, constraints, data migrations):

```bash
npm run migration:create:auth -- AddUserIndexes
```

Editar el archivo generado:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIndexes1704297600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear índice compuesto
    await queryRunner.query(`
      CREATE INDEX "idx_users_email_verified"
      ON "users" ("email", "email_verified")
    `);

    // Crear constraint
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "chk_email_format"
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_users_email_verified"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "chk_email_format"`);
  }
}
```

---

## Ejecutar Migraciones

### En Desarrollo

```bash
# Ejecutar todas las migraciones pendientes
npm run migration:run:auth

# Output:
# query: SELECT * FROM "typeorm_migrations"
# query: BEGIN TRANSACTION
# query: ALTER TABLE "users" ADD "phone_verified" boolean
# query: INSERT INTO "typeorm_migrations"...
# query: COMMIT
# Migration AddPhoneVerifiedField1704297600000 has been executed successfully.
```

### En Producción

Las migraciones se ejecutan automáticamente al iniciar el servicio si `migrationsRun: true` está configurado.

**Alternativa (más seguro):**

```bash
# Ejecutar migraciones ANTES de deploy
npm run migration:run:auth

# Luego hacer deploy del nuevo código
```

### En CI/CD

```yaml
# .github/workflows/deploy.yml
steps:
  - name: Run migrations
    run: |
      npm run migration:run:auth
      npm run migration:run:product
      npm run migration:run:order
      npm run migration:run:payment

  - name: Deploy services
    run: docker-compose up -d
```

---

## Revertir Migraciones

### Revertir Última Migración

```bash
npm run migration:revert:auth

# Output:
# query: SELECT * FROM "typeorm_migrations"
# query: BEGIN TRANSACTION
# query: ALTER TABLE "users" DROP COLUMN "phone_verified"
# query: DELETE FROM "typeorm_migrations" WHERE timestamp = ...
# query: COMMIT
# Migration AddPhoneVerifiedField1704297600000 has been reverted successfully.
```

### Revertir Múltiples Migraciones

```bash
# Revertir 3 migraciones
npm run migration:revert:auth
npm run migration:revert:auth
npm run migration:revert:auth
```

---

## Best Practices

### ✅ DO

1. **Siempre revisar migraciones generadas** antes de ejecutarlas
2. **Probar en desarrollo** primero
3. **Hacer backup de producción** antes de ejecutar migraciones
4. **Usar transacciones** (TypeORM las usa por defecto)
5. **Escribir down() methods** para rollback
6. **Nombrar migraciones descriptivamente**: `AddUserPhoneField` no `Migration1234`
7. **Versionar migraciones** en Git
8. **Ejecutar migraciones ANTES de deploy** en producción

### ❌ DON'T

1. **NO editar migraciones ya ejecutadas** en producción
2. **NO usar `synchronize: true`** en producción
3. **NO hacer cambios destructivos** sin backup
4. **NO combinar múltiples cambios** en una migración
5. **NO ejecutar migraciones manualmente** en producción (usar CI/CD)

### Ejemplo de Workflow Completo

```bash
# 1. Desarrollador hace cambio en entity
vim services/auth-service/src/entities/user.entity.ts

# 2. Generar migración
npm run migration:generate:auth -- AddNewField

# 3. Revisar migración generada
cat shared/database/migrations/1704297600000-AddNewField.ts

# 4. Probar en local
npm run migration:run:auth

# 5. Commit
git add .
git commit -m "feat: add new field to user entity"
git push

# 6. CI/CD ejecuta migraciones automáticamente en staging

# 7. Aprobar deploy a producción
# CI/CD ejecuta migraciones en producción y hace deploy
```

---

## Troubleshooting

### Error: "No changes in database schema were found"

**Causa:** No hay diferencias entre entities y esquema actual.

**Solución:** Asegúrate de que:
- Las entities están guardadas
- El DataSource apunta a las entities correctas
- La base de datos tiene el esquema correcto

### Error: "Cannot find module './migrations/...'"

**Causa:** Path incorrecto en configuración.

**Solución:** Verificar paths en `migration.config.ts`

### Error: "ECONNREFUSED" al ejecutar migraciones

**Causa:** Base de datos no está corriendo.

**Solución:**
```bash
docker-compose up -d postgres
```

---

## Recursos

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Database Versioning Best Practices](https://www.liquibase.org/get-started/best-practices)
