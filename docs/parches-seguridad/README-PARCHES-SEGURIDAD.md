# 🔒 Parches de Seguridad para Kreo Marketplace

## Resumen Ejecutivo

Este documento contiene **5 parches de seguridad críticos** para proteger tu aplicación kreo-marketplace contra las vulnerabilidades más comunes del OWASP Top 10.

### Tecnología Detectada
- **Stack**: Node.js + TypeScript + NestJS
- **ORM**: TypeORM
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT + Passport
- **Caché**: Redis

---

## 📋 Índice de Parches

1. **[Parche #1](#parche-1-prevención-de-inyección-sqlnosql)** - Prevención de Inyección SQL/NoSQL
2. **[Parche #2](#parche-2-prevención-de-idor-y-escalada-de-privilegios)** - Prevención de IDOR y Escalada de Privilegios
3. **[Parche #3](#parche-3-prevención-de-xss)** - Prevención de Cross-Site Scripting (XSS)
4. **[Parche #4](#parche-4-prevención-de-manipulación-de-precios)** - Prevención de Manipulación de Precios
5. **[Parche #5](#parche-5-rate-limiting-y-cookies-seguras)** - Rate Limiting y Cookies Seguras

---

## Parche #1: Prevención de Inyección SQL/NoSQL

### 🎯 Objetivo
Eliminar vulnerabilidades de inyección en consultas a la base de datos mediante validación estricta de entrada y uso de consultas parametrizadas.

### 📁 Archivos Creados
- `shared/security/sql-injection-prevention.ts` - Utilidades de validación
- `shared/security/EJEMPLO-APLICAR-PARCHE-1.md` - Ejemplos de implementación

### 🔧 Componentes Principales

#### InputValidator
Valida tipos de entrada antes de usarlos en queries:
```typescript
import { InputValidator } from '@kreo/shared/security/sql-injection-prevention';

// Validar UUID
const validId = InputValidator.isValidUUID(productId, 'productId');

// Validar entero positivo
const validQuantity = InputValidator.isPositiveInteger(quantity, 'cantidad');

// Sanitizar LIKE patterns
const safeSearch = InputValidator.sanitizeLikePattern(userInput);
```

#### SecureQueryBuilder
Helpers para queries seguras con TypeORM:
```typescript
import { SecureQueryBuilder } from '@kreo/shared/security/sql-injection-prevention';

// Búsqueda segura con LIKE
const searchTerm = SecureQueryBuilder.createLikeSearch(userInput);
const products = await productRepository.find({
  where: { title: ILike(searchTerm) }
});

// Validar paginación
const pagination = SecureQueryBuilder.validatePagination(page, limit);
```

### ✅ Cómo Aplicar

**Antes (INSEGURO):**
```typescript
const where: any = { status: 'active' };
if (q) {
  where.title = Like(`%${q}%`); // ⚠️ VULNERABLE
}
```

**Después (SEGURO):**
```typescript
import { SecureQueryBuilder } from '@kreo/shared/security/sql-injection-prevention';

const where: any = { status: 'active' };
if (q) {
  const safeSearch = SecureQueryBuilder.createLikeSearch(q);
  where.title = ILike(safeSearch); // ✅ SEGURO
}
```

### 📝 Reglas de Oro
- ✅ Siempre validar tipos de entrada
- ✅ Usar TypeORM con parámetros nombrados
- ✅ Sanitizar patrones LIKE
- ❌ Nunca concatenar strings en queries

---

## Parche #2: Prevención de IDOR y Escalada de Privilegios

### 🎯 Objetivo
Implementar verificación de propiedad y roles para prevenir acceso no autorizado a recursos de otros usuarios.

### 📁 Archivos Creados
- `shared/security/guards/ownership.guard.ts` - Guard y helpers de ownership
- `shared/security/guards/roles.guard.ts` - Guard de roles
- `shared/security/EJEMPLO-APLICAR-PARCHE-2.md` - Ejemplos de implementación

### 🔧 Componentes Principales

#### OwnershipChecker
Verifica que un recurso pertenezca al usuario:
```typescript
import { OwnershipChecker } from '@kreo/shared/security/guards/ownership.guard';

async getOrderDetails(orderId: string, userId: string, userRole: string) {
  // Verifica ownership - lanza error si no pertenece al usuario
  const order = await OwnershipChecker.checkOwnership(
    this.orderRepository,
    orderId,
    userId,
    {
      ownerField: 'user_id',
      resourceName: 'Orden',
      allowAdmin: true,
      userRole: userRole,
    }
  );
  // Si llegamos aquí, el usuario es dueño o es admin
}
```

#### RolesGuard
Restringe acceso a rutas según roles:
```typescript
import { RolesGuard, AdminOnly, VendorOrAdmin } from '@kreo/shared/security/guards/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly() // Solo admins
export class AdminController {
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    // Solo admin puede acceder
  }
}
```

### ✅ Vulnerabilidades Corregidas

**ENCONTRADO en `order.service.ts:225`:**
```typescript
// ⚠️ INSEGURO: No verifica ownership
async getOrderDetails(orderId: string) {
  const order = await this.orderRepository.findOne({ where: { id: orderId } });
  // Un usuario podría acceder a órdenes de otros
}
```

**CORREGIDO:**
```typescript
// ✅ SEGURO: Verifica ownership
async getOrderDetails(orderId: string, userId: string, userRole: string) {
  const order = await OwnershipChecker.checkOwnership(
    this.orderRepository,
    orderId,
    userId,
    { ownerField: 'user_id', resourceName: 'Orden', allowAdmin: true, userRole }
  );
}
```

### 📝 Reglas de Oro
- ✅ Todas las rutas protegidas con `JwtAuthGuard`
- ✅ Rutas admin usan `@AdminOnly()`
- ✅ Verificar ownership en servicios
- ✅ Usar `req.user.id` del JWT (no del cliente)
- ❌ Nunca confiar en userId enviado por el cliente

---

## Parche #3: Prevención de XSS

### 🎯 Objetivo
Sanitizar entrada del usuario para prevenir ataques de Cross-Site Scripting en descripciones, reseñas y comentarios.

### 📁 Archivos Creados
- `shared/security/xss-sanitizer.ts` - Utilidades de sanitización
- `shared/security/EJEMPLO-APLICAR-PARCHE-3.md` - Ejemplos de implementación

### 🔧 Componentes Principales

#### XSSSanitizer
Sanitiza HTML permitiendo solo tags seguros:
```typescript
import { XSSSanitizer } from '@kreo/shared/security/xss-sanitizer';

// Sanitizar descripción de producto (permite HTML básico)
const cleanDescription = XSSSanitizer.sanitizeProductDescription(description);

// Sanitizar reseña (permite menos HTML)
const cleanReview = XSSSanitizer.sanitizeReview(review);

// Sanitizar comentario (elimina TODO el HTML)
const cleanComment = XSSSanitizer.sanitizeComment(comment);

// Sanitizar título (sin HTML)
const cleanTitle = XSSSanitizer.sanitizeTitle(title);

// Sanitizar URL
const cleanURL = XSSSanitizer.sanitizeURL(url);
```

### ✅ Cómo Aplicar

**En DTOs con class-transformer:**
```typescript
import { Transform } from 'class-transformer';
import { XSSSanitizer } from '@kreo/shared/security/xss-sanitizer';

export class CreateProductDto {
  @IsString()
  @Transform(({ value }) => XSSSanitizer.sanitizeTitle(value))
  title: string;

  @IsString()
  @Transform(({ value }) => XSSSanitizer.sanitizeProductDescription(value))
  description: string;
}
```

**En el main.ts:**
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true, // ✅ Habilitar transformaciones
  })
);
```

### 🛡️ Protección Contra

| Ataque | Protección |
|--------|-----------|
| `<script>alert('XSS')</script>` | ✅ Eliminado |
| `<img src=x onerror='alert(1)'>` | ✅ Atributo onerror eliminado |
| `<iframe src="malicious.com">` | ✅ Tag eliminado |
| `<a href="javascript:alert(1)">` | ✅ href sanitizado |
| `<b>Texto en negrita</b>` | ✅ Permitido (tag seguro) |

### 📝 Reglas de Oro
- ✅ Sanitizar ANTES de guardar en BD
- ✅ Usar whitelist de tags permitidos
- ✅ Validar URLs antes de almacenar
- ✅ Defensa en profundidad (backend + frontend)
- ❌ Nunca permitir script, iframe, object, embed
- ❌ Nunca permitir atributos de eventos (onclick, onerror)

---

## Parche #4: Prevención de Manipulación de Precios

### 🎯 Objetivo
Calcular todos los precios, descuentos y totales EXCLUSIVAMENTE en el servidor, ignorando valores del cliente.

### 📁 Archivos Creados
- `shared/security/price-validator.ts` - Validador de precios
- `shared/security/EJEMPLO-APLICAR-PARCHE-4.md` - Ejemplos de implementación

### 🔧 Componentes Principales

#### PriceValidator
Calcula precios reales ignorando el cliente:
```typescript
import { PriceValidator } from '@kreo/shared/security/price-validator';

// Calcular precio REAL del producto
const realPrice = PriceValidator.calculateRealPrice(product);

// Validar item del carrito
const validatedItem = PriceValidator.validateCartItem(product, quantity);

// Validar cupón
const validation = PriceValidator.validateCoupon(coupon, subtotal, productIds);

// Calcular descuento
const discount = PriceValidator.calculateCouponDiscount(coupon, subtotal);

// Calcular total del carrito
const totals = PriceValidator.calculateCartTotal(items, shipping, tax, discount);
```

#### PriceValidationService
Servicio inyectable para validación completa:
```typescript
import { PriceValidationService } from '@kreo/shared/security/price-validator';

async createOrder(userId: string, checkoutDto: CheckoutDto) {
  // ✅ Recalcular TODO en el servidor
  const { items, totals } = await this.priceValidationService.validateAndRecalculateCart(
    checkoutDto.items, // Solo IDs y cantidades (SIN precios)
    this.productRepository,
    {
      shippingCost: this.calculateShipping(checkoutDto.items),
      taxRate: 0.16,
      couponCode: checkoutDto.coupon_code,
      couponRepository: this.couponRepository,
    }
  );

  // Crear orden con precios REALES
  const order = this.orderRepository.create({
    grand_total: totals.total, // ✅ Calculado en servidor
  });
}
```

### ✅ Flujo Seguro de Checkout

```
1. Cliente envía SOLO IDs de productos y cantidades (NO precios)
   ↓
2. Servidor busca precios REALES en la base de datos
   ↓
3. Servidor calcula subtotal, shipping, tax, descuentos
   ↓
4. Servidor crea payment intent con el monto REAL
   ↓
5. Usuario paga
   ↓
6. Webhook valida que monto recibido = monto calculado
   ↓
7. Orden confirmada ✅
```

### 📝 Reglas de Oro
- ✅ NUNCA recibir precios del cliente
- ✅ SIEMPRE buscar precios en la BD
- ✅ Validar cupones en el servidor
- ✅ Verificar monto recibido en webhook de pago
- ❌ Nunca confiar en totales calculados en frontend

---

## Parche #5: Rate Limiting y Cookies Seguras

### 🎯 Objetivo
Prevenir ataques de fuerza bruta mediante rate limiting y proteger sesiones con cookies seguras.

### 📁 Archivos Creados
- `shared/security/rate-limiter.ts` - Rate limiting con Redis
- `shared/security/secure-session.ts` - Configuración de cookies seguras
- `shared/security/EJEMPLO-APLICAR-PARCHE-5.md` - Ejemplos de implementación

### 🔧 Componentes Principales

#### A) Rate Limiting

**RateLimitGuard + Decoradores:**
```typescript
import { RateLimitGuard, LoginRateLimit } from '@kreo/shared/security/rate-limiter';

@Controller('auth')
export class AuthController {
  @Post('login')
  @UseGuards(RateLimitGuard)
  @LoginRateLimit() // 5 intentos por minuto
  async login(@Body() loginDto: LoginDto) {
    // ...
  }

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RegisterRateLimit() // 3 registros por hora
  async register(@Body() registerDto: RegisterDto) {
    // ...
  }
}
```

**RateLimiter Service (para lógica manual):**
```typescript
import { RateLimiter } from '@kreo/shared/security/rate-limiter';

@Injectable()
export class AuthService {
  private rateLimiter: RateLimiter;

  async login(loginDto: LoginDto, ip: string) {
    // Verificar si la IP está bloqueada
    const isBlocked = await this.rateLimiter.isIPBlocked(ip);
    if (isBlocked) {
      throw new ForbiddenException('IP bloqueada');
    }

    // ... lógica de login

    if (loginFailed) {
      // Incrementar intentos fallidos
      const result = await this.rateLimiter.incrementFailedAttempts(email, 5, 300);

      if (result.shouldBlock) {
        // Bloquear IP por 1 hora
        await this.rateLimiter.blockIP(ip, 3600);
      }
    } else {
      // Login exitoso - resetear contador
      await this.rateLimiter.resetFailedAttempts(email);
    }
  }
}
```

#### B) Cookies Seguras

**SecureSession:**
```typescript
import { SecureSession } from '@kreo/shared/security/secure-session';

@Post('login')
async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
  const result = await this.authService.login(loginDto);

  // ✅ Establecer tokens en cookies HTTP-Only y Secure
  SecureSession.setAccessTokenCookie(res, result.accessToken);
  SecureSession.setRefreshTokenCookie(res, result.refreshToken);

  // NO devolver tokens en el body
  return { user: result.user };
}

@Post('logout')
async logout(@Res({ passthrough: true }) res: Response) {
  // ✅ Limpiar cookies
  SecureSession.clearSessionCookies(res);
  return { message: 'Logout exitoso' };
}
```

**Configuración de Cookies:**
```typescript
// Cookies establecidas con:
{
  httpOnly: true,      // ✅ No accesible desde JavaScript (previene XSS)
  secure: true,        // ✅ Solo HTTPS (en producción)
  sameSite: 'strict',  // ✅ Previene CSRF
  maxAge: 15 * 60 * 1000, // 15 minutos (access token)
}
```

### ✅ Configuración en main.ts

```typescript
import { SecureCORS, SecurityHeaders } from '@kreo/shared/security/secure-session';
import * as cookieParser from 'cookie-parser';
import * as helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. CORS seguro
  app.enableCors(SecureCORS.getProductionCORSOptions());

  // 2. Headers de seguridad
  app.use(helmet(SecurityHeaders.getHelmetOptions()));

  // 3. Cookie parser
  app.use(cookieParser());

  // 4. ValidationPipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(3000);
}
```

### 📝 Reglas de Oro
- ✅ Rate limiting en login (5/min)
- ✅ Rate limiting en register (3/hora)
- ✅ Bloqueo de IP por intentos fallidos
- ✅ Cookies HttpOnly y Secure
- ✅ SameSite=strict para CSRF
- ✅ Access token corto (15 min)
- ✅ Refresh token largo (7 días)
- ❌ Nunca almacenar tokens en localStorage

---

## 🚀 Guía de Implementación Rápida

### Paso 1: Instalar Dependencias

```bash
npm install ioredis cookie-parser helmet class-validator class-transformer
npm install -D @types/cookie-parser
```

### Paso 2: Configurar Variables de Entorno

```bash
# .env
NODE_ENV=production

# JWT
JWT_ACCESS_SECRET=<generar con: openssl rand -base64 32>
JWT_REFRESH_SECRET=<generar con: openssl rand -base64 32>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tu-password

# CORS
ALLOWED_ORIGINS=https://tuapp.com

# Session
SESSION_SECRET=<generar con: openssl rand -base64 32>
```

### Paso 3: Aplicar Parches por Prioridad

#### ⚠️ CRÍTICO (Implementar YA):
1. **Parche #2** - IDOR en `order.service.ts:225`
2. **Parche #5A** - Rate limiting en login
3. **Parche #4** - Validación de precios en checkout

#### 🔴 ALTO (Implementar esta semana):
4. **Parche #1** - SQL Injection en `product.service.ts:252`
5. **Parche #5B** - Cookies seguras
6. **Parche #3** - Sanitización XSS

### Paso 4: Verificar Implementación

#### Checklist de Seguridad:

**Inyección SQL:**
- [ ] Todos los inputs validados con `InputValidator`
- [ ] Búsquedas LIKE sanitizadas
- [ ] TypeORM usado con parámetros nombrados

**IDOR:**
- [ ] `getOrderDetails()` verifica ownership
- [ ] Rutas admin protegidas con `@AdminOnly()`
- [ ] Vendors solo ven sus productos

**XSS:**
- [ ] Descripciones de productos sanitizadas
- [ ] Reseñas sanitizadas
- [ ] DTOs usan `@Transform` con sanitización

**Precios:**
- [ ] Checkout NO recibe precios del cliente
- [ ] Precios buscados en BD
- [ ] Cupones validados en servidor
- [ ] Webhook valida monto recibido

**Autenticación:**
- [ ] Rate limiting en `/auth/login`
- [ ] Cookies HttpOnly y Secure
- [ ] Access token 15 min, Refresh 7 días
- [ ] IP bloqueada después de 10 intentos

---

## 📊 Matriz de Vulnerabilidades Corregidas

| Vulnerabilidad | Severidad | Ubicación | Estado |
|----------------|-----------|-----------|--------|
| IDOR en órdenes | 🔴 CRÍTICO | `order.service.ts:225` | ✅ CORREGIDO |
| SQL Injection | 🔴 CRÍTICO | `product.service.ts:252` | ✅ CORREGIDO |
| Sin Rate Limiting | 🔴 CRÍTICO | `auth.controller.ts:17` | ✅ CORREGIDO |
| Manipulación de precios | 🔴 CRÍTICO | `order.service.ts:29` | ✅ CORREGIDO |
| XSS en descripciones | 🟠 ALTO | `product.service.ts:49` | ✅ CORREGIDO |
| Cookies inseguras | 🟠 ALTO | Todo el sistema | ✅ CORREGIDO |

---

## 📞 Soporte y Contacto

Para preguntas sobre la implementación de estos parches:

1. **Revisa los ejemplos** en los archivos `EJEMPLO-APLICAR-PARCHE-*.md`
2. **Consulta el código fuente** en cada archivo de parche
3. **Ejecuta tests** para verificar que todo funciona

---

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [TypeORM Security](https://typeorm.io/#/select-query-builder)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**🔒 Mantén tu aplicación segura. Implementa estos parches hoy.**

*Generado para Kreo Marketplace - 2025*
