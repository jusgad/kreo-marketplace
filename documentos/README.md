# 📚 Documentación de Kreo Marketplace

Bienvenido a la documentación completa del proyecto **Kreo Marketplace**. Aquí encontrarás toda la información necesaria para desarrollar, desplegar y mantener la aplicación de forma segura.

---

## 🗂️ Estructura de la Documentación

```
documentos/
├── README.md                                   ← Estás aquí (Índice principal)
├── CONEXION-BASE-DATOS-DESPLIEGUE.md          ← Guía de conexión a BD
├── manuales/                                   ← Manuales de usuario
│   ├── MANUAL-USUARIO-CLIENTE.md             ← Para clientes/compradores
│   ├── MANUAL-VENDEDOR.md                    ← Para vendedores
│   └── MANUAL-ADMINISTRADOR.md               ← Para administradores
├── tecnica/                                    ← Documentación técnica
│   ├── GUIA-INSTALACION.md                   ← Instalación completa
│   ├── ARQUITECTURA-SISTEMA.md               ← Arquitectura y diseño
│   └── BASE-DATOS.md                         ← Esquema de base de datos
├── api/                                        ← Documentación de API
│   └── GUIA-API-COMPLETA.md                  ← Referencia completa de API
└── parches-seguridad/                          ← Seguridad de la aplicación
    ├── README-PARCHES-SEGURIDAD.md            ← Documentación completa
    ├── INSTALACION-RAPIDA.md                  ← Guía de 15 minutos
    ├── EJEMPLO-APLICAR-PARCHE-1.md            ← SQL Injection
    ├── EJEMPLO-APLICAR-PARCHE-2.md            ← IDOR / Roles
    ├── EJEMPLO-APLICAR-PARCHE-3.md            ← XSS
    ├── EJEMPLO-APLICAR-PARCHE-4.md            ← Precios
    ├── EJEMPLO-APLICAR-PARCHE-5.md            ← Autenticación
    └── verificar-parches.sh                   ← Script de verificación
```

---

## 🚀 Inicio Rápido

### 1. Configuración Inicial

```bash
# 1. Clonar el repositorio
git clone [tu-repositorio]
cd kreo-marketplace

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Iniciar base de datos con Docker
docker-compose up -d

# 5. Ejecutar migraciones
npm run migration:run

# 6. Iniciar aplicación
npm run start:dev
```

### 2. Aplicar Parches de Seguridad

```bash
# Los parches YA están aplicados en el código.
# Solo necesitas:

# 1. Instalar dependencias de seguridad
cd services/auth-service
npm install

# 2. Generar secrets seguros
openssl rand -base64 32  # Para JWT_ACCESS_SECRET
openssl rand -base64 32  # Para JWT_REFRESH_SECRET
openssl rand -base64 32  # Para SESSION_SECRET

# 3. Actualizar .env con los secrets generados

# 4. Verificar que todo funciona
cd ../..
./documentos/parches-seguridad/verificar-parches.sh
```

---

## 📖 Guías Principales

### 👥 Manuales de Usuario

#### **[📄 Manual de Usuario - Cliente](./manuales/MANUAL-USUARIO-CLIENTE.md)**
Guía completa para clientes/compradores:
- ✅ Registro y configuración de cuenta
- ✅ Búsqueda avanzada de productos
- ✅ Carrito y proceso de compra
- ✅ Seguimiento de pedidos
- ✅ Gestión de reseñas
- ✅ Seguridad y 2FA

#### **[📄 Manual de Vendedor](./manuales/MANUAL-VENDEDOR.md)**
Guía completa para vendedores:
- ✅ Registro y verificación KYC
- ✅ Gestión de productos y inventario
- ✅ Procesamiento de pedidos
- ✅ Pagos y comisiones
- ✅ Análisis de ventas
- ✅ Atención al cliente

#### **[📄 Manual de Administrador](./manuales/MANUAL-ADMINISTRADOR.md)**
Guía completa para administradores:
- ✅ Gestión de usuarios y vendedores
- ✅ Moderación de contenido
- ✅ Configuración de comisiones
- ✅ Reportes y análisis
- ✅ Seguridad del sistema
- ✅ Mantenimiento de la plataforma

---

### 💻 Documentación Técnica

#### **[📄 Guía de Instalación](./tecnica/GUIA-INSTALACION.md)** ⭐ EMPEZAR AQUÍ
Instalación completa paso a paso:
- ✅ Requisitos del sistema
- ✅ Instalación rápida (10 min)
- ✅ Instalación detallada
- ✅ Configuración de servicios
- ✅ Variables de entorno
- ✅ Servicios externos (Stripe, AWS, etc.)
- ✅ Ejecución en desarrollo
- ✅ Despliegue en producción
- ✅ Solución de problemas

#### **[📄 Arquitectura del Sistema](./tecnica/ARQUITECTURA-SISTEMA.md)**
Documentación técnica completa:
- ✅ Arquitectura de microservicios
- ✅ Stack tecnológico
- ✅ Componentes del sistema
- ✅ Flujos de datos
- ✅ Seguridad implementada
- ✅ Estrategias de escalabilidad
- ✅ Decisiones arquitectónicas

#### **[📄 Base de Datos](./tecnica/BASE-DATOS.md)**
Esquema y gestión de base de datos:
- ✅ Diagrama ER completo
- ✅ Descripción de tablas
- ✅ Índices y optimizaciones
- ✅ Triggers y funciones
- ✅ Queries comunes
- ✅ Migraciones
- ✅ Backup y restauración

---

### 🔌 Documentación de API

#### **[📄 Guía Completa de API](./api/GUIA-API-COMPLETA.md)**
Referencia completa de endpoints:
- ✅ Autenticación con JWT
- ✅ Endpoints de Auth
- ✅ Endpoints de Productos
- ✅ Endpoints de Carrito y Órdenes
- ✅ Endpoints de Pagos
- ✅ Endpoints de Vendedores
- ✅ Códigos de error
- ✅ Rate limiting
- ✅ Ejemplos con cURL

---

### 🗄️ Base de Datos

**[📄 CONEXION-BASE-DATOS-DESPLIEGUE.md](./CONEXION-BASE-DATOS-DESPLIEGUE.md)**

Guía completa de conexión a base de datos para:
- ✅ Desarrollo local (Docker y nativo)
- ✅ Railway
- ✅ Render
- ✅ AWS RDS
- ✅ DigitalOcean
- ✅ Migraciones y seeders
- ✅ Troubleshooting

**Contenido destacado:**
- Docker Compose completo para desarrollo
- Configuración SSL para producción
- Scripts de migraciones
- Solución de problemas comunes

---

### 🔒 Seguridad

**[📄 parches-seguridad/README-PARCHES-SEGURIDAD.md](./parches-seguridad/README-PARCHES-SEGURIDAD.md)**

Documentación completa de los parches de seguridad aplicados:

| Parche | Vulnerabilidad | Estado |
|--------|----------------|--------|
| #1 | Inyección SQL/NoSQL | ✅ APLICADO |
| #2 | IDOR / Escalada de Privilegios | ✅ APLICADO |
| #3 | Cross-Site Scripting (XSS) | ✅ APLICADO |
| #4 | Manipulación de Precios | ✅ APLICADO |
| #5 | Rate Limiting y Cookies | ✅ APLICADO |

**Guías de implementación:**
- [INSTALACION-RAPIDA.md](./parches-seguridad/INSTALACION-RAPIDA.md) - Configuración en 15 minutos
- [EJEMPLO-APLICAR-PARCHE-1.md](./parches-seguridad/EJEMPLO-APLICAR-PARCHE-1.md) - Prevención de SQL Injection
- [EJEMPLO-APLICAR-PARCHE-2.md](./parches-seguridad/EJEMPLO-APLICAR-PARCHE-2.md) - Prevención de IDOR
- [EJEMPLO-APLICAR-PARCHE-3.md](./parches-seguridad/EJEMPLO-APLICAR-PARCHE-3.md) - Prevención de XSS
- [EJEMPLO-APLICAR-PARCHE-4.md](./parches-seguridad/EJEMPLO-APLICAR-PARCHE-4.md) - Validación de Precios
- [EJEMPLO-APLICAR-PARCHE-5.md](./parches-seguridad/EJEMPLO-APLICAR-PARCHE-5.md) - Autenticación Segura

---

## 🏗️ Arquitectura del Proyecto

```
kreo-marketplace/
├── services/                     # Microservicios
│   ├── auth-service/            # Autenticación y usuarios
│   ├── product-service/         # Gestión de productos
│   ├── order-service/           # Órdenes y checkout
│   └── payment-service/         # Pagos con Stripe
├── api-gateway/                 # Gateway de API
├── frontend/                    # Aplicaciones frontend
│   ├── customer-app/           # App de clientes
│   └── vendor-portal/          # Portal de vendedores
├── shared/                      # Código compartido
│   ├── types/                  # Tipos TypeScript
│   └── security/               # Utilidades de seguridad
└── documentos/                  # Documentación (estás aquí)
```

---

## 🔐 Características de Seguridad Implementadas

### ✅ Parches Aplicados

1. **Prevención de Inyección SQL**
   - Validación estricta de entrada
   - Consultas parametrizadas con TypeORM
   - Sanitización de búsquedas LIKE

2. **Control de Acceso**
   - Verificación de ownership en recursos
   - Guards de roles (Admin, Vendor, Customer)
   - Prevención de IDOR

3. **Prevención de XSS**
   - Sanitización de HTML en backend
   - Whitelist de tags permitidos
   - Validación de URLs

4. **Integridad Financiera**
   - Cálculo de precios en servidor
   - Validación de cupones
   - Verificación de pagos

5. **Autenticación Robusta**
   - Rate limiting (5 intentos/minuto)
   - Cookies HttpOnly y Secure
   - Tokens JWT con vida corta (15 min)
   - Refresh tokens (7 días)

---

## 🚢 Despliegue

### Checklist Pre-Despliegue

Antes de desplegar a producción:

#### Base de Datos
- [ ] PostgreSQL configurado con SSL
- [ ] Usuario de aplicación con permisos mínimos
- [ ] Backups automáticos configurados
- [ ] Connection pooling optimizado
- [ ] Migraciones ejecutadas y verificadas

#### Seguridad
- [ ] Secrets generados con `openssl rand -base64 32`
- [ ] Variables de entorno en plataforma de hosting
- [ ] `NODE_ENV=production` configurado
- [ ] CORS con origins específicos
- [ ] Rate limiting habilitado
- [ ] SSL/TLS en todas las conexiones

#### Servicios
- [ ] Redis configurado para rate limiting
- [ ] Elasticsearch para búsqueda (opcional)
- [ ] Stripe configurado con webhooks
- [ ] Email service configurado
- [ ] Logs y monitoreo activos

#### Código
- [ ] `synchronize: false` en TypeORM (usar migraciones)
- [ ] Scripts de build ejecutados sin errores
- [ ] Tests pasando
- [ ] Archivo `.env` NO commiteado

---

## 📊 Monitoreo y Logs

### Logs de Aplicación

```bash
# Ver logs en desarrollo
npm run start:dev

# Ver logs en producción (PM2)
pm2 logs

# Ver logs de un servicio específico
pm2 logs auth-service
```

### Logs de Base de Datos

```bash
# PostgreSQL en Docker
docker-compose logs -f postgres

# PostgreSQL nativo
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Logs de Seguridad

Los intentos de ataque se registran automáticamente:

```typescript
// Los parches registran:
- Intentos de SQL injection bloqueados
- Intentos de acceso no autorizado (IDOR)
- Ataques XSS bloqueados
- Rate limiting aplicado
- IPs bloqueadas
```

---

## 🧪 Testing

### Tests Unitarios

```bash
# Ejecutar todos los tests
npm run test

# Tests con coverage
npm run test:cov

# Tests en modo watch
npm run test:watch
```

### Tests de Seguridad

```bash
# Verificar parches aplicados
./documentos/parches-seguridad/verificar-parches.sh

# Test de rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Debe bloquear después del 5to intento

# Test de IDOR
curl -H "Authorization: Bearer <token-user-A>" \
  http://localhost:3003/orders/<order-id-user-B>
# Debe devolver 404 o 403
```

---

## 🛠️ Herramientas de Desarrollo

### Scripts Útiles

```bash
# Generar migración
npm run migration:generate -- -n NombreMigracion

# Ejecutar migraciones
npm run migration:run

# Revertir última migración
npm run migration:revert

# Formatear código
npm run format

# Lint
npm run lint
```

### Docker Commands

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver estado
docker-compose ps

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Limpiar volúmenes (⚠️ elimina datos)
docker-compose down -v
```

---

## 📞 Soporte y Contribución

### Reportar Problemas

Si encuentras un bug o vulnerabilidad de seguridad:

1. **NO lo publiques públicamente**
2. Reporta a: [email de seguridad]
3. Incluye:
   - Descripción del problema
   - Pasos para reproducir
   - Impacto potencial

### Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: añadir nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

---

## 📚 Recursos Adicionales

### Documentación Externa

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### Tutoriales

- [Guía de TypeORM Migrations](https://typeorm.io/migrations)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

## 📝 Notas de la Versión

### v1.0.0 - Documentación Completa (2024-12-10)

**✅ Implementado:**
- Sistema completo de parches de seguridad
- Prevención de IDOR en orders
- Rate limiting en autenticación
- Sanitización XSS en productos
- Validación de precios en servidor
- Cookies HttpOnly y Secure
- Guards de autorización
- **Documentación completa en español**

**🔧 Configuración Requerida:**
- Instalar: `cookie-parser`, `helmet`
- Generar secrets JWT con `openssl`
- Configurar Redis para rate limiting
- Actualizar `.env` con secrets

**📖 Documentación Nueva:**
- ✅ Manual de Usuario - Cliente
- ✅ Manual de Vendedor
- ✅ Manual de Administrador
- ✅ Guía de Instalación Completa
- ✅ Arquitectura del Sistema
- ✅ Documentación de Base de Datos
- ✅ Guía Completa de API
- ✅ Guía de conexión a base de datos
- ✅ 5 guías de parches de seguridad
- ✅ Script de verificación automática

---

## ⚠️ Avisos Importantes

### Seguridad

🔴 **CRÍTICO:**
- NUNCA commitear el archivo `.env`
- SIEMPRE usar secrets únicos en producción
- NUNCA usar `synchronize: true` en producción
- SIEMPRE habilitar SSL en producción

### Performance

⚡ **RECOMENDACIONES:**
- Usar connection pooling (max: 10-20 conexiones)
- Configurar índices en tablas grandes
- Habilitar caché con Redis
- Optimizar queries N+1

---

## 🎯 Roadmap

### Próximas Funcionalidades

- [ ] Tests E2E automatizados
- [ ] CI/CD con GitHub Actions
- [ ] Monitoreo con Prometheus/Grafana
- [ ] Documentación de API con Swagger
- [ ] Sistema de notificaciones
- [ ] Soporte multi-idioma

---

**📧 Contacto:** [Tu email]
**🌐 Website:** [Tu website]
**📦 Repositorio:** [Tu repositorio GitHub]

---

*Última actualización: 10 de Diciembre, 2024*
*Versión: 1.0.0*

---

## 🚀 Inicio Rápido por Rol

### Soy un Cliente/Comprador
👉 Lee: **[Manual de Usuario - Cliente](./manuales/MANUAL-USUARIO-CLIENTE.md)**

### Soy un Vendedor
👉 Lee: **[Manual de Vendedor](./manuales/MANUAL-VENDEDOR.md)**

### Soy un Administrador
👉 Lee: **[Manual de Administrador](./manuales/MANUAL-ADMINISTRADOR.md)**

### Soy un Desarrollador
👉 Lee: **[Guía de Instalación](./tecnica/GUIA-INSTALACION.md)** → **[Arquitectura](./tecnica/ARQUITECTURA-SISTEMA.md)**

### Quiero integrarme con la API
👉 Lee: **[Guía de API](./api/GUIA-API-COMPLETA.md)**

---

**¡Gracias por usar Kreo Marketplace!**
