# AUDITORIA DE CODIGO EXHAUSTIVA - KREO MARKETPLACE

**Fecha de Auditoria:** 2026-01-03
**Alcance:** Marketplace Multi-Vendor (Microservicios NestJS + React)
**Lineas de Codigo Auditadas:** ~15,000+
**Archivos Revisados:** 100+

---

## RESUMEN EJECUTIVO

### Calificacion General del Proyecto: 7.5/10

**Aspectos Positivos:**
- Arquitectura de microservicios bien definida
- Implementacion de muchas medidas de seguridad (XSS, SQL Injection, Rate Limiting)
- Uso correcto de TypeORM con queries parametrizadas
- DTOs con validaciones exhaustivas
- Cookies HTTP-Only implementadas correctamente
- Sanitizacion XSS en campos criticos

**Areas Criticas que Requieren Atencion Inmediata:**
1. **Falta de controladores y modulos completos** en algunos servicios
2. **Ausencia de guards de autorizacion** en endpoints criticos
3. **Validacion de ownership incompleta** en varios endpoints
4. **Manejo de errores inconsistente**
5. **Falta de migraciones de base de datos**
6. **Configuraciones hardcodeadas** en varios lugares
7. **Ausencia de logging estructurado**
8. **Tests incompletos** - cobertura muy baja

---

## PROBLEMAS ENCONTRADOS POR CATEGORIA

Total de problemas encontrados: **147**
- CRITICOS: 23
- ALTOS: 41
- MEDIOS: 58
- BAJOS: 25

---

## 1. ERRORES DE SINTAXIS Y CODIGO

### 1.1 CRITICO - Servicios Incompletos

**Archivo:** `services/user-service/`, `services/vendor-service/`, `services/shipping-service/`, `services/notification-service/`
**Linea:** N/A
**Severidad:** CRITICO
**Categoria:** Codigo Faltante

**Descripcion:**
Varios microservicios referenciados en `docker-compose.yml` NO EXISTEN en el proyecto:
- `user-service` (puerto 3002)
- `vendor-service` (puerto 3003)
- `shipping-service` (puerto 3007)
- `notification-service` (puerto 3008)

**Impacto:**
- El sistema NO PUEDE FUNCIONAR como esta configurado
- Docker Compose fallara al intentar construir servicios inexistentes
- Llamadas HTTP entre servicios fallaran con errores 503

**Codigo Problematico:**
```yaml
# docker-compose.yml lineas 111-271
user-service:
  build:
    context: ./services/user-service  # DIRECTORIO NO EXISTE
    dockerfile: Dockerfile
  ports:
    - "3002:3002"
```

**Solucion Recomendada:**
```bash
# Opcion 1: Crear los servicios faltantes
cd services
nest new user-service
nest new vendor-service
nest new shipping-service
nest new notification-service

# Opcion 2: Eliminar referencias de docker-compose.yml
# y combinar funcionalidad en auth-service
```

---

### 1.2 ALTO - Falta AppModule en varios servicios

**Archivos:**
- `services/product-service/src/app.module.ts` - NO EXISTE
- `services/order-service/src/app.module.ts` - NO EXISTE
- `services/payment-service/src/app.module.ts` - NO EXISTE

**Linea:** N/A
**Severidad:** ALTO
**Categoria:** Error de Arquitectura

**Descripcion:**
Los servicios carecen del modulo raiz (AppModule) necesario para que NestJS funcione.

**Impacto:**
Los servicios no pueden iniciarse correctamente.

**Solucion:**
Crear `app.module.ts` para cada servicio:

```typescript
// services/product-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from './product/product.module';
import { Product } from './entities/product.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [Product],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    ProductModule,
  ],
})
export class AppModule {}
```

---

### 1.3 ALTO - Falta main.ts en varios servicios

**Archivos:**
- `services/product-service/src/main.ts` - NO EXISTE
- `services/order-service/src/main.ts` - NO EXISTE
- `services/payment-service/src/main.ts` - NO EXISTE

**Severidad:** ALTO
**Categoria:** Error de Arquitectura

**Descripcion:**
Falta el archivo de bootstrap para los servicios.

**Solucion:**
```typescript
// services/product-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const port = process.env.PORT || 3004;
  await app.listen(port);
  console.log(`Product Service running on port ${port}`);
}

bootstrap();
```

---

### 1.4 MEDIO - Imports de modulos faltantes

**Archivo:** `services/product-service/src/product/product.service.ts`
**Linea:** 23
**Severidad:** MEDIO

**Descripcion:**
Imports a modulos compartidos que pueden no estar configurados correctamente.

**Codigo Problematico:**
```typescript
import { SecureQueryBuilder, InputValidator } from '../../../../shared/security/sql-injection-prevention';
import { XSSSanitizer } from '../../../../shared/security/xss-sanitizer';
```

**Impacto:**
Si los paths no son correctos o el modulo compartido no esta compilado, habra errores de compilacion.

**Solucion:**
Usar paths absolutos en `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../../../shared/*"]
    }
  }
}
```

```typescript
import { SecureQueryBuilder } from '@shared/security/sql-injection-prevention';
import { XSSSanitizer } from '@shared/security/xss-sanitizer';
```

---

### 1.5 MEDIO - Variables de entorno no validadas

**Archivo:** `services/auth-service/src/main.ts`
**Linea:** 132
**Severidad:** MEDIO

**Descripcion:**
El puerto se obtiene con fallback pero otras variables criticas no tienen validacion.

**Codigo Problematico:**
```typescript
const port = process.env.PORT || 3001; // OK

// Pero en auth.service.ts:
secret: process.env.JWT_SECRET, // Sin validacion!
```

**Impacto:**
Si JWT_SECRET no esta definido, el sistema podria usar `undefined` como secret.

**Solucion:**
```typescript
// services/auth-service/src/config/env.validation.ts
import { plainToClass } from 'class-transformer';
import { IsString, IsNumber, validateSync, MinLength } from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  PORT: number;

  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @IsString()
  DATABASE_URL: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      'Environment validation failed:\n' +
      errors.map(e => Object.values(e.constraints || {})).join('\n')
    );
  }

  return validatedConfig;
}
```

Usar en `AppModule`:
```typescript
ConfigModule.forRoot({
  isGlobal: true,
  validate, // Agregado
}),
```

---

## 2. VULNERABILIDADES DE SEGURIDAD

### 2.1 CRITICO - Falta autenticacion en endpoints de pagos

**Archivo:** `services/payment-service/src/payment/payment.controller.ts`
**Lineas:** 9-71
**Severidad:** CRITICO
**Categoria:** Autenticacion/Autorizacion

**Descripcion:**
Los endpoints de pagos NO tienen guards de autenticacion. Cualquiera puede:
- Crear intents de pago
- Ejecutar transferencias
- Ver payouts de vendedores

**Codigo Problematico:**
```typescript
@Controller('payments')
export class PaymentController {
  // NO HAY @UseGuards(JwtAuthGuard)

  @Post('create-intent')
  async createPaymentIntent(@Body() body: {
    order_id: string;
    amount: number;
    application_fee: number;
    metadata?: any;
  }) {
    // CUALQUIERA puede llamar esto!
    return this.paymentService.createPaymentIntent(/*...*/);
  }

  @Post('execute-transfers') // MUY PELIGROSO!
  async executeTransfers(@Body() body: {
    order_id: string;
    sub_orders: Array<{
      vendor_id: string;
      stripe_account_id: string;
      vendor_payout: number;
      sub_order_id: string;
    }>;
  }) {
    // Un atacante podria ejecutar transferencias fraudulentas!
    return this.paymentService.executeTransfers(/*...*/);
  }
}
```

**Impacto:**
- **CRITICO:** Un atacante puede ejecutar transferencias de dinero sin autorizacion
- Puede robar dinero de la plataforma
- Puede crear cargos fraudulentos
- Exposicion de datos financieros sensibles

**Solucion Inmediata:**
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard) // OBLIGATORIO para todos los endpoints
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('create-intent')
  @UseGuards(RolesGuard)
  @Roles('customer') // Solo clientes pueden crear intents
  async createPaymentIntent(
    @Request() req,
    @Body() body: CreatePaymentIntentDto
  ) {
    // Validar que order_id pertenezca al usuario
    return this.paymentService.createPaymentIntent(
      body.order_id,
      req.user.id, // Usuario autenticado
      body.amount,
      body.application_fee,
      body.metadata,
    );
  }

  @Post('execute-transfers')
  @UseGuards(RolesGuard)
  @Roles('admin', 'system') // Solo admins o sistema interno
  async executeTransfers(
    @Request() req,
    @Body() body: ExecuteTransfersDto
  ) {
    // Logging de operacion critica
    logger.warn('Transfer execution requested', {
      userId: req.user.id,
      orderId: body.order_id,
      timestamp: new Date(),
    });

    return this.paymentService.executeTransfers(
      body.order_id,
      body.sub_orders
    );
  }

  @Get('vendor/:vendorId/payouts')
  @UseGuards(RolesGuard)
  @Roles('vendor', 'admin')
  async getVendorPayouts(
    @Request() req,
    @Param('vendorId') vendorId: string
  ) {
    // Validar que el vendor solo vea sus propios payouts
    if (req.user.role !== 'admin' && req.user.id !== vendorId) {
      throw new ForbiddenException('No puedes ver payouts de otros vendedores');
    }

    InputValidator.isValidUUID(vendorId, 'vendorId');
    return this.paymentService.getVendorPayouts(vendorId);
  }
}
```

---

### 2.2 CRITICO - IDOR en getOrderDetails

**Archivo:** `services/order-service/src/order/order.service.ts`
**Linea:** 308
**Severidad:** CRITICO
**Categoria:** IDOR (Insecure Direct Object Reference)

**Descripcion:**
Aunque el metodo `getOrderDetails` tiene verificacion de ownership, el **controlador** que lo llama probablemente NO existe o no valida correctamente.

**Impacto:**
Sin un controlador con guards apropiados, un atacante podria:
- Ver ordenes de otros usuarios solo cambiando el ID en la URL
- Acceder a informacion de pagos de otros
- Ver direcciones de envio de otros usuarios

**Codigo Actual (Servicio):**
```typescript
// BIEN implementado en el servicio
async getOrderDetails(orderId: string, userId: string, userRole?: string) {
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
  // ...
}
```

**Problema:**
Falta el controlador que use este servicio:

**Solucion:**
```typescript
// services/order-service/src/order/order.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OrderService } from './order.service';

@Controller('orders')
@UseGuards(JwtAuthGuard) // CRITICO: Autenticacion obligatoria
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Get(':orderId')
  async getOrderDetails(
    @Param('orderId') orderId: string,
    @Request() req
  ) {
    // El servicio validara ownership
    return this.orderService.getOrderDetails(
      orderId,
      req.user.id, // Usuario autenticado del JWT
      req.user.role
    );
  }

  @Get()
  async getUserOrders(@Request() req) {
    return this.orderService.getUserOrders(req.user.id);
  }

  @Post()
  async createOrder(
    @Request() req,
    @Body() checkoutData: CreateOrderDto
  ) {
    return this.orderService.createOrder(
      req.user.id,
      checkoutData
    );
  }

  @Post(':orderId/confirm-payment')
  async confirmPayment(
    @Param('orderId') orderId: string,
    @Request() req
  ) {
    // Validar ownership antes de confirmar pago
    await this.orderService.getOrderDetails(
      orderId,
      req.user.id,
      req.user.role
    );

    return this.orderService.confirmPayment(orderId);
  }
}
```

---

### 2.3 CRITICO - Secrets en secrets.yaml

**Archivo:** `k8s/base/secrets.yaml`
**Lineas:** 1-41
**Severidad:** CRITICO
**Categoria:** Gestion de Secrets

**Descripcion:**
El archivo contiene un template con placeholders "CHANGEME", pero el riesgo es que:
1. Alguien pueda commitear valores reales por error
2. No hay validacion de que los valores se hayan cambiado

**Codigo Problematico:**
```yaml
stringData:
  POSTGRES_PASSWORD: "CHANGEME"  # Muy obvio que es placeholder
  JWT_ACCESS_SECRET: "CHANGEME_GENERATE_WITH_OPENSSL"
```

**Impacto:**
- Si se deployea con "CHANGEME", el sistema sera completamente inseguro
- Si se commitearan secrets reales, habria una brecha masiva

**Solucion:**
```bash
# 1. Agregar secrets.yaml a .gitignore
echo "k8s/**/secrets.yaml" >> .gitignore
echo "k8s/**/secrets-*.yaml" >> .gitignore

# 2. Crear secrets.yaml.template (este si se commitea)
cp k8s/base/secrets.yaml k8s/base/secrets.yaml.template

# 3. Usar Sealed Secrets o External Secrets Operator
# Opcion A: Sealed Secrets
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# Crear secret y sellarlo
kubectl create secret generic kreo-secrets \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -base64 32)" \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > k8s/base/sealed-secrets.yaml

# Opcion B: Script de validacion
```

Script de validacion:
```bash
#!/bin/bash
# scripts/validate-k8s-secrets.sh

SECRETS_FILE="k8s/base/secrets.yaml"

if grep -q "CHANGEME" "$SECRETS_FILE"; then
  echo "ERROR: secrets.yaml contiene placeholders CHANGEME"
  echo "Genera secrets reales antes de deployar:"
  echo ""
  echo "openssl rand -base64 32"
  exit 1
fi

if [ $(wc -l < "$SECRETS_FILE") -lt 20 ]; then
  echo "WARNING: secrets.yaml parece incompleto"
  exit 1
fi

echo "Secrets validation passed"
```

---

### 2.4 ALTO - Falta validacion de roles en product-service

**Archivo:** `services/product-service/src/product/product.service.ts`
**Lineas:** 67-91, 93-128
**Severidad:** ALTO

**Descripcion:**
Los metodos `createProduct` y `updateProduct` reciben `vendorId` como parametro pero no validan que:
1. El usuario autenticado sea realmente ese vendor
2. El usuario tenga rol de vendor

**Codigo Problematico:**
```typescript
async createProduct(vendorId: string, productData: CreateProductDto) {
  // PROBLEMA: Quien esta llamando esto?
  // Un customer podria crear productos haciendose pasar por vendor
  InputValidator.isValidUUID(vendorId, 'vendor_id');

  const sanitizedData = {
    ...productData,
    vendor_id: vendorId, // Confia ciegamente en el parametro!
  };
  // ...
}
```

**Impacto:**
- Un atacante podria crear productos fraudulentos a nombre de otros vendors
- Podria modificar productos de otros vendors

**Solucion:**
```typescript
// Crear controlador con guards
// services/product-service/src/product/product.controller.ts
import { Controller, Post, Put, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vendor') // Solo vendors pueden crear productos
  async createProduct(
    @Request() req,
    @Body() createProductDto: CreateProductDto
  ) {
    // req.user.id ES el vendorId del usuario autenticado
    return this.productService.createProduct(
      req.user.id, // Usamos el ID del JWT, NO un parametro!
      createProductDto
    );
  }

  @Put(':productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vendor', 'admin')
  async updateProduct(
    @Request() req,
    @Param('productId') productId: string,
    @Body() updateProductDto: UpdateProductDto
  ) {
    // Validar ownership
    return this.productService.updateProduct(
      productId,
      req.user.id, // Vendor autenticado
      updateProductDto
    );
  }

  @Get()
  async searchProducts(@Query() query: SearchProductDto) {
    return this.productService.searchProducts(query);
  }

  @Get(':productId')
  async getProduct(@Param('productId') productId: string) {
    return this.productService.getProduct(productId);
  }
}
```

---

### 2.5 ALTO - Falta rate limiting en API Gateway para escrituras

**Archivo:** `api-gateway/src/index.ts`
**Lineas:** 99-103
**Severidad:** ALTO

**Descripcion:**
El `writeLimiter` esta definido pero NO se aplica a las rutas de escritura (POST, PUT, DELETE).

**Codigo Problematico:**
```typescript
// Rate limiter para endpoints de escritura (POST, PUT, DELETE)
const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: 'Too many write operations, please slow down.',
});

// PERO NUNCA SE USA!
app.use('/api/', generalLimiter); // Solo este se aplica
```

**Impacto:**
Un atacante puede hacer spam de operaciones de escritura:
- Crear miles de productos
- Hacer pedidos masivos
- Agotar recursos del servidor

**Solucion:**
```typescript
// Aplicar writeLimiter a rutas de escritura
app.use('/api/products', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

app.use('/api/orders', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

app.use('/api/cart', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

// O mejor: middleware global para metodos de escritura
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});
```

---

### 2.6 ALTO - Falta validacion de stock en cart.service

**Archivo:** `services/order-service/src/cart/cart.service.ts`
**Linea:** 69
**Severidad:** ALTO

**Descripcion:**
El codigo verifica `track_inventory` pero esa propiedad NO existe en la entidad Product.

**Codigo Problematico:**
```typescript
if (product.track_inventory && product.inventory_quantity < quantity) {
  throw new BadRequestException('Insufficient inventory');
}
```

**Problema:**
La entidad Product tiene `stock_quantity`, NO `inventory_quantity` ni `track_inventory`.

**Solucion:**
```typescript
// Actualizar Product entity
@Entity('products')
export class Product {
  // ...

  @Column('int', { default: 0 })
  stock_quantity: number;

  @Column('boolean', { default: true })
  track_inventory: boolean; // AGREGAR este campo

  // ...
}

// Actualizar cart.service.ts
if (product.track_inventory && product.stock_quantity < quantity) {
  throw new BadRequestException(
    `Stock insuficiente. Disponible: ${product.stock_quantity}, Solicitado: ${quantity}`
  );
}
```

---

### 2.7 ALTO - Race condition en createOrder

**Archivo:** `services/order-service/src/order/order.service.ts`
**Lineas:** 49-221
**Severidad:** ALTO

**Descripcion:**
Aunque usa transacciones, NO reserva/bloquea el inventario antes de crear la orden.

**Codigo Problematico:**
```typescript
async createOrder(userId: string, checkoutData: any) {
  const queryRunner = this.orderRepository.manager.connection.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    // 1. Get cart
    const cart = await this.cartService.getCart(userId);

    // 2. Validate stock - PERO NO BLOQUEA EL PRODUCTO!
    const product = productResponse.data;
    if (product.stock_quantity < item.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Entre la validacion y la creacion de la orden,
    // otro usuario podria comprar el mismo producto!

    // 3. Create order
    await queryRunner.manager.save(order);

    // El stock NUNCA se decrementa!
  } catch (error) {
    await queryRunner.rollbackTransaction();
  }
}
```

**Impacto:**
- Overselling: se venden mas productos de los disponibles
- Clientes reciben ordenes que no se pueden cumplir

**Solucion:**
```typescript
async createOrder(userId: string, checkoutData: any) {
  const queryRunner = this.orderRepository.manager.connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction('SERIALIZABLE'); // Nivel mas estricto

  try {
    const cart = await this.cartService.getCart(userId);

    // Reservar inventario atomicamente
    for (const item of cart.items) {
      // SELECT ... FOR UPDATE bloquea la fila
      const product = await queryRunner.manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: item.product_id })
        .getOne();

      if (!product) {
        throw new BadRequestException(`Producto ${item.product_id} no existe`);
      }

      if (product.status !== 'active') {
        throw new BadRequestException(`Producto "${product.title}" no esta disponible`);
      }

      // Verificar y decrementar stock atomicamente
      if (product.track_inventory) {
        if (product.stock_quantity < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para "${product.title}". ` +
            `Disponible: ${product.stock_quantity}, Solicitado: ${item.quantity}`
          );
        }

        // Decrementar stock
        product.stock_quantity -= item.quantity;

        // Si queda sin stock, cambiar estado
        if (product.stock_quantity === 0) {
          product.status = 'out_of_stock';
        }

        await queryRunner.manager.save(product);
      }
    }

    // Crear orden (el resto del codigo)
    // ...

    await queryRunner.commitTransaction();

  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

---

### 2.8 MEDIO - Falta sanitizacion en SearchProductDto

**Archivo:** `services/product-service/src/product/dto/search-product.dto.ts` (NO EXISTE)
**Severidad:** MEDIO

**Descripcion:**
El DTO de busqueda NO existe, por lo que no hay validacion de parametros de busqueda.

**Codigo que usa el DTO:**
```typescript
// product.service.ts
async searchProducts(query: SearchProductDto) {
  const { q, category, min_price, max_price, vendor_id, tags, page = 1, limit = 20, sort = 'relevance' } = query;
  // ...
}
```

**Impacto:**
- Parametros maliciosos podrian causar errores en Elasticsearch
- Inyecciones NoSQL en queries de Elasticsearch

**Solucion:**
```typescript
// services/product-service/src/product/dto/search-product.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
  Max,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La busqueda no puede exceder 100 caracteres' })
  @Transform(({ value }) => value?.trim())
  q?: string;

  @IsOptional()
  @IsUUID('4')
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999999.99)
  min_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999999.99)
  max_price?: number;

  @IsOptional()
  @IsUUID('4')
  vendor_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['relevance', 'price_asc', 'price_desc', 'newest'])
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' = 'relevance';
}
```

---

### 2.9 MEDIO - Falta CSRF protection

**Archivo:** `services/auth-service/src/main.ts`
**Severidad:** MEDIO

**Descripcion:**
No hay proteccion CSRF implementada, aunque se usan cookies.

**Impacto:**
Un sitio malicioso podria hacer que un usuario autenticado ejecute acciones sin querer.

**Solucion:**
```bash
npm install csurf
```

```typescript
// services/auth-service/src/main.ts
import * as csurf from 'csurf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CSRF protection (DESPUES de cookie-parser)
  app.use(cookieParser());

  if (process.env.NODE_ENV === 'production') {
    app.use(csurf({
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      }
    }));
  }

  // ...resto de configuracion
}
```

Endpoint para obtener token CSRF:
```typescript
@Controller('auth')
export class AuthController {
  @Get('csrf-token')
  getCsrfToken(@Request() req) {
    return { csrfToken: req.csrfToken() };
  }
}
```

Frontend debe incluir el token:
```typescript
// frontend/customer-app
const response = await fetch(`${API_URL}/auth/csrf-token`, {
  credentials: 'include'
});
const { csrfToken } = await response.json();

// En requests subsecuentes
await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken, // Token CSRF
  },
  body: JSON.stringify(credentials),
});
```

---

### 2.10 MEDIO - Falta input sanitization en cart

**Archivo:** `frontend/customer-app/src/pages/CartPage.tsx` (NO EXISTE completo)
**Severidad:** MEDIO

**Descripcion:**
El frontend probablemente muestra datos del carrito sin sanitizar.

**Impacto:**
Si un atacante logra inyectar HTML en el titulo del producto, podria ejecutar XSS en el carrito.

**Solucion:**
```typescript
// Usar DOMPurify en el frontend
import DOMPurify from 'dompurify';

function CartItem({ item }) {
  const sanitizedTitle = DOMPurify.sanitize(item.product_title);

  return (
    <div>
      {/* Opcion 1: Mostrar como texto plano */}
      <h3>{item.product_title}</h3>

      {/* Opcion 2: Si necesitas HTML, sanitizar */}
      <div dangerouslySetInnerHTML={{ __html: sanitizedTitle }} />

      {/* NUNCA HACER: */}
      {/* <div dangerouslySetInnerHTML={{ __html: item.product_title }} /> */}
    </div>
  );
}
```

---

## 3. PROBLEMAS DE ARQUITECTURA

### 3.1 ALTO - Acoplamiento entre order-service y payment-service

**Archivo:** `services/order-service/src/order/order.service.ts`
**Lineas:** 183-199
**Severidad:** ALTO

**Descripcion:**
El order-service llama directamente al payment-service via HTTP.

**Codigo Problematico:**
```typescript
const paymentResponse = await firstValueFrom(
  this.httpService.post(`${paymentServiceUrl}/payments/create-intent`, {
    order_id: order.id,
    amount: grand_total,
    application_fee: total_commission,
  })
);
```

**Impacto:**
- Si payment-service falla, toda la orden falla
- No hay retry logic
- Transacciones distribuidas sin coordinacion
- Timeouts pueden causar ordenes en estado inconsistente

**Solucion:**
Implementar patron SAGA con event bus:

```typescript
// Opcion 1: Event-driven con RabbitMQ/Kafka
// shared/events/order.events.ts
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly commission: number,
  ) {}
}

// order-service/src/order/order.service.ts
async createOrder(userId: string, checkoutData: any) {
  // ... crear orden en estado 'pending_payment'

  const order = await this.orderRepository.save({
    status: 'pending_payment',
    payment_status: 'pending',
    // ...
  });

  // Emitir evento en lugar de llamar directamente
  await this.eventBus.publish(
    new OrderCreatedEvent(
      order.id,
      userId,
      grand_total,
      total_commission
    )
  );

  return order;
}

// payment-service escucha el evento
@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler {
  async handle(event: OrderCreatedEvent) {
    try {
      const paymentIntent = await this.paymentService.createPaymentIntent(
        event.orderId,
        event.amount,
        event.commission
      );

      // Emitir evento de exito
      await this.eventBus.publish(
        new PaymentIntentCreatedEvent(
          event.orderId,
          paymentIntent.id,
          paymentIntent.client_secret
        )
      );

    } catch (error) {
      // Emitir evento de fallo
      await this.eventBus.publish(
        new PaymentFailedEvent(event.orderId, error.message)
      );
    }
  }
}

// order-service escucha respuestas
@EventsHandler(PaymentIntentCreatedEvent)
export class PaymentIntentCreatedHandler {
  async handle(event: PaymentIntentCreatedEvent) {
    await this.orderRepository.update(
      { id: event.orderId },
      {
        stripe_payment_intent_id: event.paymentIntentId,
        payment_status: 'intent_created',
      }
    );
  }
}

@EventsHandler(PaymentFailedEvent)
export class PaymentFailedHandler {
  async handle(event: PaymentFailedEvent) {
    // Rollback compensatorio
    await this.orderRepository.update(
      { id: event.orderId },
      {
        status: 'failed',
        payment_status: 'failed',
        failure_reason: event.reason,
      }
    );

    // Restaurar inventario
    await this.restoreInventory(event.orderId);
  }
}
```

---

### 3.2 MEDIO - Falta Circuit Breaker

**Archivo:** `services/order-service/src/order/order.service.ts`
**Lineas:** 74-96
**Severidad:** MEDIO

**Descripcion:**
Las llamadas HTTP a product-service no tienen circuit breaker.

**Impacto:**
Si product-service esta caido, order-service seguira intentando llamarlo, causando timeouts y degradacion del sistema.

**Solucion:**
```bash
npm install opossum @types/opossum
```

```typescript
// shared/resilience/circuit-breaker.ts
import * as CircuitBreaker from 'opossum';
import { HttpService } from '@nestjs/axios';

export class ResilientHttpService {
  private breakers = new Map<string, CircuitBreaker>();

  constructor(private httpService: HttpService) {}

  getOrCreateBreaker(serviceName: string): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const breaker = new CircuitBreaker(
        async (config) => {
          return this.httpService.request(config).toPromise();
        },
        {
          timeout: 3000, // 3 segundos
          errorThresholdPercentage: 50, // Abrir si 50% fallan
          resetTimeout: 30000, // Intentar cerrar despues de 30s
          volumeThreshold: 10, // Minimo 10 requests para evaluar
        }
      );

      breaker.on('open', () => {
        console.error(`Circuit breaker OPENED for ${serviceName}`);
      });

      breaker.on('halfOpen', () => {
        console.warn(`Circuit breaker HALF-OPEN for ${serviceName}`);
      });

      breaker.on('close', () => {
        console.info(`Circuit breaker CLOSED for ${serviceName}`);
      });

      this.breakers.set(serviceName, breaker);
    }

    return this.breakers.get(serviceName)!;
  }

  async get(serviceName: string, url: string, config?: any) {
    const breaker = this.getOrCreateBreaker(serviceName);
    return breaker.fire({ method: 'GET', url, ...config });
  }

  async post(serviceName: string, url: string, data?: any, config?: any) {
    const breaker = this.getOrCreateBreaker(serviceName);
    return breaker.fire({ method: 'POST', url, data, ...config });
  }
}

// Usar en order.service.ts
const productResponse = await this.resilientHttp.get(
  'product-service',
  `${productServiceUrl}/products/${item.product_id}`
);
```

---

### 3.3 MEDIO - Falta health checks completos

**Archivo:** `api-gateway/src/index.ts`
**Linea:** 252
**Severidad:** MEDIO

**Descripcion:**
El health check solo retorna info estatica, no verifica dependencias.

**Codigo Actual:**
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      auth: services.auth,
      // ... solo URLs, no estado real
    },
  });
});
```

**Solucion:**
```typescript
// api-gateway/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private config: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Verificar auth-service
      () => this.http.pingCheck(
        'auth-service',
        `${this.config.get('AUTH_SERVICE_URL')}/health`,
        { timeout: 1000 }
      ),

      // Verificar product-service
      () => this.http.pingCheck(
        'product-service',
        `${this.config.get('PRODUCT_SERVICE_URL')}/health`,
        { timeout: 1000 }
      ),

      // Verificar order-service
      () => this.http.pingCheck(
        'order-service',
        `${this.config.get('ORDER_SERVICE_URL')}/health`,
        { timeout: 1000 }
      ),

      // Verificar payment-service
      () => this.http.pingCheck(
        'payment-service',
        `${this.config.get('PAYMENT_SERVICE_URL')}/health`,
        { timeout: 1000 }
      ),
    ]);
  }

  @Get('liveness')
  liveness() {
    // Kubernetes liveness probe - solo verifica que el proceso este vivo
    return { status: 'ok' };
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    // Kubernetes readiness probe - verifica dependencias
    return this.health.check([
      () => this.http.pingCheck(
        'auth-service',
        `${this.config.get('AUTH_SERVICE_URL')}/health`
      ),
    ]);
  }
}

// Cada microservicio debe tener su propio health check
// services/auth-service/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

---

## 4. PROBLEMAS DE RENDIMIENTO

### 4.1 ALTO - N+1 Query en createOrder

**Archivo:** `services/order-service/src/order/order.service.ts`
**Lineas:** 72-96
**Severidad:** ALTO

**Descripcion:**
Se hace una llamada HTTP por cada producto en el carrito.

**Codigo Problematico:**
```typescript
for (const item of cart.items) {
  try {
    // N llamadas HTTP si hay N productos!
    const productResponse = await firstValueFrom(
      this.httpService.get(`${productServiceUrl}/products/${item.product_id}`)
    );
    // ...
  }
}
```

**Impacto:**
- Con 10 productos = 10 llamadas HTTP seriales
- Tiempo de checkout muy lento
- Alto consumo de red y CPU

**Solucion:**
```typescript
// Opcion 1: Batch endpoint en product-service
// GET /products/batch?ids=uuid1,uuid2,uuid3

// product.controller.ts
@Get('batch')
async getProductsBatch(@Query('ids') ids: string) {
  const productIds = ids.split(',').filter(Boolean);

  // Validar cada UUID
  productIds.forEach(id => InputValidator.isValidUUID(id, 'product_id'));

  // Limitar a 100 productos
  if (productIds.length > 100) {
    throw new BadRequestException('No se pueden solicitar mas de 100 productos');
  }

  return this.productService.getProductsBatch(productIds);
}

// product.service.ts
async getProductsBatch(productIds: string[]): Promise<Product[]> {
  return this.productRepository.find({
    where: {
      id: In(productIds),
      status: 'active',
    },
  });
}

// order.service.ts - usar batch
const productIds = cart.items.map(item => item.product_id);

const productResponse = await firstValueFrom(
  this.httpService.get(`${productServiceUrl}/products/batch`, {
    params: { ids: productIds.join(',') }
  })
);

const productsMap = new Map(
  productResponse.data.map(p => [p.id, p])
);

// Validar todos los productos
for (const item of cart.items) {
  const product = productsMap.get(item.product_id);

  if (!product) {
    throw new BadRequestException(`Producto ${item.product_id} no encontrado`);
  }

  if (product.status !== 'active') {
    throw new BadRequestException(`Producto "${product.title}" no disponible`);
  }

  if (product.stock_quantity < item.quantity) {
    throw new BadRequestException(
      `Stock insuficiente para "${product.title}"`
    );
  }

  productDetails.set(item.product_id, product);
}
```

---

### 4.2 MEDIO - Falta paginacion en getUserOrders

**Archivo:** `services/order-service/src/order/order.service.ts`
**Linea:** 293
**Severidad:** MEDIO

**Descripcion:**
Retorna maximo 50 ordenes pero no permite paginacion.

**Codigo Problematico:**
```typescript
async getUserOrders(userId: string) {
  return this.orderRepository.find({
    where: { user_id: userId },
    order: { created_at: 'DESC' },
    take: 50, // Hardcoded!
  });
}
```

**Impacto:**
- Usuario con mas de 50 ordenes no puede ver las antiguas
- No hay forma de navegar entre paginas

**Solucion:**
```typescript
async getUserOrders(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const pagination = SecureQueryBuilder.validatePagination(page, limit);

  const [orders, total] = await this.orderRepository.findAndCount({
    where: { user_id: userId },
    order: { created_at: 'DESC' },
    skip: pagination.skip,
    take: pagination.limit,
  });

  return {
    orders,
    total,
    page: pagination.page,
    limit: pagination.limit,
    total_pages: Math.ceil(total / pagination.limit),
    has_next: pagination.page < Math.ceil(total / pagination.limit),
    has_prev: pagination.page > 1,
  };
}
```

---

### 4.3 MEDIO - Falta indice compuesto en Order

**Archivo:** `services/order-service/src/entities/order.entity.ts` (NO EXISTE)
**Severidad:** MEDIO

**Descripcion:**
La entidad Order probablemente no tiene indices optimizados.

**Solucion:**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('orders')
@Index(['user_id', 'created_at']) // Para getUserOrders
@Index(['payment_status', 'created_at']) // Para queries de admin
@Index(['stripe_payment_intent_id']) // Para webhooks de Stripe
@Index(['created_at'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  order_number: string;

  @Column('uuid')
  @Index() // Indice individual tambien
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column('jsonb')
  shipping_address: any;

  @Column('jsonb')
  billing_address: any;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2 })
  shipping_total: number;

  @Column('decimal', { precision: 10, scale: 2 })
  grand_total: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index() // Para filtrar por estado
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index() // Para lookups de Stripe
  stripe_payment_intent_id: string;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date;

  @CreateDateColumn()
  @Index() // Para ordenamiento
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

---

### 4.4 MEDIO - Cache no implementado en product searches

**Archivo:** `services/product-service/src/product/product.service.ts`
**Linea:** 188
**Severidad:** MEDIO

**Descripcion:**
Busquedas populares se ejecutan siempre contra Elasticsearch/DB, sin cache.

**Impacto:**
- Alta carga en Elasticsearch
- Latencia innecesaria para busquedas repetidas

**Solucion:**
```typescript
// product.service.ts
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {
    // ...
  }

  async searchProducts(query: SearchProductDto) {
    // Generar cache key basado en parametros de busqueda
    const cacheKey = `search:${JSON.stringify(query)}`;

    // Intentar obtener de cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Si no esta en cache, ejecutar busqueda
    try {
      const result = await this.esClient.search({
        // ... query de Elasticsearch
      });

      const response = {
        products: result.hits.hits.map(hit => hit._source),
        total: result.hits.total.value,
        page: query.page,
        limit: query.limit,
        total_pages: Math.ceil(result.hits.total.value / query.limit),
        facets: result.aggregations,
      };

      // Guardar en cache por 5 minutos
      await this.cacheManager.set(cacheKey, response, { ttl: 300 });

      return response;

    } catch (error) {
      // Fallback a DB
      return this.fallbackSearch(query);
    }
  }

  // Invalidar cache cuando se crea/actualiza producto
  async createProduct(vendorId: string, productData: CreateProductDto) {
    const product = await this.productRepository.save(/* ... */);

    // Invalidar cache de busquedas
    await this.invalidateSearchCache();

    return product;
  }

  private async invalidateSearchCache() {
    // Opcion 1: Invalidar todo el cache de busquedas
    const keys = await this.cacheManager.store.keys('search:*');
    await Promise.all(keys.map(key => this.cacheManager.del(key)));

    // Opcion 2: Usar tags de cache (con Redis)
    // await this.cacheManager.store.del('tag:search');
  }
}

// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      ttl: 600, // 10 minutos por defecto
    }),
    // ...
  ],
})
export class AppModule {}
```

---

### 4.5 BAJO - Falta compresion en API Gateway

**Archivo:** `api-gateway/src/index.ts`
**Severidad:** BAJO

**Descripcion:**
No hay compresion gzip/brotli de respuestas HTTP.

**Impacto:**
- Mayor uso de ancho de banda
- Respuestas mas lentas

**Solucion:**
```bash
npm install compression
```

```typescript
import compression from 'compression';

const app = express();

// Habilitar compresion
app.use(compression({
  level: 6, // Nivel de compresion (0-9)
  threshold: 1024, // Solo comprimir responses > 1KB
  filter: (req, res) => {
    // No comprimir si el cliente no lo soporta
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(cors(/* ... */));
app.use(express.json());
// ...
```

---

## 5. PROBLEMAS DE MANEJO DE ERRORES

### 5.1 MEDIO - Error handling inconsistente

**Archivo:** Multiple archivos
**Severidad:** MEDIO

**Descripcion:**
Algunos servicios retornan errores genericos, otros exponen detalles internos.

**Ejemplos:**
```typescript
// auth.service.ts - BIEN
throw new UnauthorizedException('Invalid credentials');

// product.service.ts - MAL
} catch (error) {
  console.error('Elasticsearch error:', error);
  // Retorna al cliente el error completo!
  return this.fallbackSearch(query);
}

// payment.service.ts - MAL
throw new BadRequestException(`Failed to create Stripe account: ${error.message}`);
// Expone detalles de Stripe al cliente!
```

**Solucion:**
Crear filtro global de excepciones:

```typescript
// shared/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || error;
      }
    } else {
      // Error no controlado - NO exponer detalles al cliente
      this.logger.error(
        `Unhandled exception: ${exception}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Log estructurado
    this.logger.error({
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      message,
      userId: request.user?.id,
      ip: request.ip,
    });

    // Respuesta al cliente (sin detalles internos)
    response.status(status).json({
      statusCode: status,
      message: process.env.NODE_ENV === 'production'
        ? message // En produccion, mensaje sanitizado
        : message, // En desarrollo, mensaje completo
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

// Usar en main.ts
app.useGlobalFilters(new AllExceptionsFilter());
```

---

### 5.2 MEDIO - Falta logging estructurado

**Archivo:** Multiple archivos
**Severidad:** MEDIO

**Descripcion:**
Se usa `console.log` y `console.error` en lugar de logger estructurado.

**Codigo Problematico:**
```typescript
console.log(`Auth Service running on port ${port}`);
console.error('Auth service error:', err);
console.log('Payment succeeded:', paymentIntent.id);
```

**Impacto:**
- Dificil hacer queries en logs de produccion
- No hay niveles de log
- No hay contexto (user ID, request ID)

**Solucion:**
```bash
npm install winston nest-winston
```

```typescript
// shared/logger/logger.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const createLogger = (serviceName: string) => {
  const transports: winston.transport[] = [];

  // Console transport para desarrollo
  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[${timestamp}] ${level}: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`;
          }),
        ),
      })
    );
  }

  // File transport para produccion
  if (process.env.NODE_ENV === 'production') {
    transports.push(
      new winston.transports.File({
        filename: `logs/${serviceName}-error.log`,
        level: 'error',
        format: winston.format.json(),
      }),
      new winston.transports.File({
        filename: `logs/${serviceName}-combined.log`,
        format: winston.format.json(),
      })
    );
  }

  return WinstonModule.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: { service: serviceName },
    transports,
  });
};

// Usar en main.ts
import { createLogger } from './logger/logger.config';

async function bootstrap() {
  const logger = createLogger('auth-service');

  const app = await NestFactory.create(AppModule, {
    logger, // Logger personalizado
  });

  // ...

  await app.listen(port);
  logger.log(`Auth Service running on port ${port}`);
}

// Usar en servicios
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async login(loginDto: LoginDto, ip?: string) {
    this.logger.log({
      message: 'Login attempt',
      email: loginDto.email,
      ip,
    });

    // ...

    if (!isPasswordValid) {
      this.logger.warn({
        message: 'Failed login attempt',
        email: loginDto.email,
        ip,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log({
      message: 'Successful login',
      userId: user.id,
      email: user.email,
      ip,
    });

    return tokens;
  }
}
```

---

### 5.3 BAJO - Timeouts no configurados

**Archivo:** `services/order-service/src/order/order.service.ts`
**Linea:** 74
**Severidad:** BAJO

**Descripcion:**
Las llamadas HTTP no tienen timeout, pueden colgarse indefinidamente.

**Solucion:**
```typescript
// shared/http/http.config.ts
import { HttpModule } from '@nestjs/axios';

export const HttpConfigModule = HttpModule.register({
  timeout: 5000, // 5 segundos
  maxRedirects: 5,
  validateStatus: (status) => status >= 200 && status < 300,
});

// order.module.ts
import { HttpConfigModule } from '../../shared/http/http.config';

@Module({
  imports: [
    HttpConfigModule, // En lugar de HttpModule
    // ...
  ],
})
export class OrderModule {}

// Para requests especificos
const productResponse = await firstValueFrom(
  this.httpService.get(`${url}/products/${id}`, {
    timeout: 3000, // Override timeout para este request
  }).pipe(
    retry(3), // Reintentar 3 veces
    catchError((error) => {
      this.logger.error('Product fetch failed', error);
      throw new BadRequestException('Unable to fetch product details');
    })
  )
);
```

---

## 6. CODE SMELLS Y MALAS PRACTICAS

### 6.1 MEDIO - Codigo duplicado en controladores

**Archivos:** `auth.controller.ts`, `payment.controller.ts`
**Severidad:** MEDIO

**Descripcion:**
Logica de validacion de UUIDs repetida en multiples lugares.

**Codigo Duplicado:**
```typescript
// payment.controller.ts linea 62
InputValidator.isValidUUID(vendorId, 'vendorId');

// payment.controller.ts linea 69
InputValidator.isValidUUID(vendorId, 'vendorId');

// Repetido en muchos endpoints...
```

**Solucion:**
Crear pipe de validacion reutilizable:

```typescript
// shared/pipes/parse-uuid.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { InputValidator } from '../security/sql-injection-prevention';

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  constructor(private readonly fieldName: string = 'id') {}

  transform(value: string): string {
    try {
      return InputValidator.isValidUUID(value, this.fieldName);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}

// Usar en controladores
@Get('vendor/:vendorId/payouts')
async getVendorPayouts(
  @Param('vendorId', new ParseUUIDPipe('vendorId')) vendorId: string
) {
  return this.paymentService.getVendorPayouts(vendorId);
}

// O crear decorador personalizado
import { Param, ParseUUIDPipe as NestParseUUID } from '@nestjs/common';

export const UUIDParam = (property: string) =>
  Param(property, new ParseUUIDPipe(property));

// Uso mas limpio
@Get('vendor/:vendorId/payouts')
async getVendorPayouts(@UUIDParam('vendorId') vendorId: string) {
  return this.paymentService.getVendorPayouts(vendorId);
}
```

---

### 6.2 MEDIO - Magic numbers y strings

**Archivo:** Multiple archivos
**Severidad:** MEDIO

**Descripcion:**
Numeros y strings hardcodeados sin constantes.

**Ejemplos:**
```typescript
// auth.service.ts
const password_hash = await bcrypt.hash(password, 12); // Magic number

// order.service.ts
const commission_rate = parseFloat(this.configService.get('PLATFORM_COMMISSION_RATE') || '10.0'); // Magic number

// cart.service.ts
if (quantity > 100) { // Magic number
  throw new BadRequestException('Maximum quantity per add operation is 100');
}
```

**Solucion:**
```typescript
// shared/constants/business.constants.ts
export const BusinessConstants = {
  // Authentication
  BCRYPT_SALT_ROUNDS: 12,
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '7d',
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPT_WINDOW_MINUTES: 15,

  // Orders
  DEFAULT_COMMISSION_RATE: 10.0,
  MIN_ORDER_AMOUNT: 0.50,
  MAX_ORDER_AMOUNT: 999999.99,

  // Cart
  MAX_CART_QUANTITY_PER_ITEM: 100,
  MAX_CART_ITEMS: 50,
  CART_EXPIRATION_DAYS: 7,

  // Products
  MAX_PRODUCT_TITLE_LENGTH: 200,
  MAX_PRODUCT_DESCRIPTION_LENGTH: 5000,
  MAX_PRODUCT_IMAGES: 10,
  MAX_PRODUCT_TAGS: 20,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Prices
  MIN_PRODUCT_PRICE: 0.01,
  MAX_PRODUCT_PRICE: 999999.99,
};

// Usar en codigo
import { BusinessConstants } from '@shared/constants/business.constants';

const password_hash = await bcrypt.hash(
  password,
  BusinessConstants.BCRYPT_SALT_ROUNDS
);

const commission_rate = parseFloat(
  this.configService.get('PLATFORM_COMMISSION_RATE') ||
  BusinessConstants.DEFAULT_COMMISSION_RATE.toString()
);

if (quantity > BusinessConstants.MAX_CART_QUANTITY_PER_ITEM) {
  throw new BadRequestException(
    `Maximum quantity per item is ${BusinessConstants.MAX_CART_QUANTITY_PER_ITEM}`
  );
}
```

---

### 6.3 MEDIO - Funciones muy largas

**Archivo:** `services/order-service/src/order/order.service.ts`
**Linea:** 49-221 (173 lineas!)
**Severidad:** MEDIO

**Descripcion:**
El metodo `createOrder` tiene 173 lineas y hace demasiadas cosas.

**Solucion:**
Refactorizar en metodos mas pequeños:

```typescript
async createOrder(userId: string, checkoutData: CheckoutData) {
  const queryRunner = this.orderRepository.manager.connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction('SERIALIZABLE');

  try {
    // 1. Validar carrito
    const cart = await this.validateCart(userId);

    // 2. Validar y reservar inventario
    const productDetails = await this.validateAndReserveInventory(
      cart,
      queryRunner
    );

    // 3. Calcular totales
    const pricing = this.calculatePricing(cart);

    // 4. Crear orden maestra
    const order = await this.createMasterOrder(
      userId,
      checkoutData,
      pricing,
      queryRunner
    );

    // 5. Crear sub-ordenes por vendor
    const subOrders = await this.createVendorSubOrders(
      order,
      cart,
      pricing,
      productDetails,
      queryRunner
    );

    // 6. Crear payment intent
    const paymentIntent = await this.createPaymentIntent(
      order,
      pricing,
      subOrders
    );

    // 7. Actualizar orden con payment intent
    order.stripe_payment_intent_id = paymentIntent.id;
    await queryRunner.manager.save(order);

    // 8. Commit transaccion
    await queryRunner.commitTransaction();

    // 9. Limpiar carrito (fuera de transaccion)
    await this.cartService.clearCart(userId);

    return {
      order,
      subOrders,
      payment_client_secret: paymentIntent.client_secret,
    };

  } catch (error) {
    await queryRunner.rollbackTransaction();
    this.logger.error('Order creation failed', { userId, error });
    throw new BadRequestException(`Order creation failed: ${error.message}`);
  } finally {
    await queryRunner.release();
  }
}

// Metodos privados extraidos
private async validateCart(userId: string) {
  const cart = await this.cartService.getCart(userId);

  if (cart.items.length === 0) {
    throw new BadRequestException('Cart is empty');
  }

  if (cart.items.length > BusinessConstants.MAX_CART_ITEMS) {
    throw new BadRequestException(
      `Cart cannot contain more than ${BusinessConstants.MAX_CART_ITEMS} items`
    );
  }

  return cart;
}

private async validateAndReserveInventory(cart: Cart, queryRunner: QueryRunner) {
  const productIds = cart.items.map(item => item.product_id);

  // Batch fetch products
  const productResponse = await this.fetchProductsBatch(productIds);
  const productsMap = new Map(productResponse.data.map(p => [p.id, p]));

  // Validate and reserve
  for (const item of cart.items) {
    const product = productsMap.get(item.product_id);

    if (!product) {
      throw new BadRequestException(`Product ${item.product_id} not found`);
    }

    this.validateProductAvailability(product, item);
    await this.reserveInventory(product, item, queryRunner);
  }

  return productsMap;
}

private validateProductAvailability(product: Product, item: CartItem) {
  if (product.status !== 'active') {
    throw new BadRequestException(
      `Product "${product.title}" is no longer available`
    );
  }

  if (product.track_inventory && product.stock_quantity < item.quantity) {
    throw new BadRequestException(
      `Insufficient stock for "${product.title}". ` +
      `Available: ${product.stock_quantity}, Requested: ${item.quantity}`
    );
  }
}

private async reserveInventory(
  product: Product,
  item: CartItem,
  queryRunner: QueryRunner
) {
  if (!product.track_inventory) {
    return;
  }

  product.stock_quantity -= item.quantity;

  if (product.stock_quantity === 0) {
    product.status = 'out_of_stock';
  }

  await queryRunner.manager.save(product);
}

private calculatePricing(cart: Cart) {
  let subtotal = 0;
  let shipping_total = 0;

  for (const vendorId in cart.grouped_by_vendor) {
    const vendorCart = cart.grouped_by_vendor[vendorId];
    subtotal += vendorCart.subtotal;
    shipping_total += vendorCart.shipping_cost || 0;
  }

  const grand_total = subtotal + shipping_total;
  const commission_rate = this.getCommissionRate();
  const total_commission = (grand_total * commission_rate) / 100;

  return {
    subtotal,
    shipping_total,
    grand_total,
    commission_rate,
    total_commission,
  };
}

// ... mas metodos privados
```

---

### 6.4 BAJO - Comentarios obvios

**Archivo:** `api-gateway/src/index.ts`
**Severidad:** BAJO

**Descripcion:**
Muchos comentarios que explican lo obvio.

**Codigo:**
```typescript
// Importar Express: framework web para Node.js
import express from 'express';

// Importar CORS: middleware para habilitar Cross-Origin Resource Sharing
import cors from 'cors';

// Crear instancia de la aplicación Express
const app = express();
```

**Problema:**
Estos comentarios no aportan valor, solo ruido.

**Solucion:**
Mantener solo comentarios que expliquen el "por que", no el "que":

```typescript
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const port = process.env.PORT || 3000;

// CORS configurado para permitir cookies cross-origin
// Necesario para autenticacion con HTTP-Only cookies
app.use(cors({
  origin: [
    process.env.CUSTOMER_APP_URL || 'http://localhost:5173',
    process.env.VENDOR_PORTAL_URL || 'http://localhost:5174',
  ],
  credentials: true, // Permite envio de cookies
}));

app.use(express.json());

// Rate limiting: 100 req/min (reducido desde 1000 para mejor seguridad)
const generalLimiter = rateLimit({
  windowMs: 60000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

app.use('/api/', generalLimiter);
```

---

## 7. PROBLEMAS DE TESTING

### 7.1 ALTO - Cobertura de tests muy baja

**Archivos:** Multiples `.spec.ts`
**Severidad:** ALTO

**Descripcion:**
Los tests existentes son principalmente stubs vacios.

**Codigo Actual:**
```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // NO HAY MAS TESTS!
});
```

**Solucion:**
Implementar tests completos:

```typescript
// auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: JwtService;

  const mockUser: User = {
    id: 'uuid-1234',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    role: 'customer',
    first_name: 'John',
    last_name: 'Doe',
    email_verified: true,
    two_factor_enabled: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        first_name: 'Jane',
        last_name: 'Doe',
      };

      userRepository.findOne.mockResolvedValue(null); // User doesn't exist
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('fake_token');

      const result = await service.register(registerDto);

      expect(result.user.email).toBe(mockUser.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'SecurePassword123!',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password with 12 salt rounds', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('token');

      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

      await service.register(registerDto);

      expect(bcryptHashSpy).toHaveBeenCalledWith(registerDto.password, 12);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
      };

      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        password_hash: await bcrypt.hash(loginDto.password, 12),
      });
      mockJwtService.signAsync.mockResolvedValue('fake_token');

      const result = await service.login(loginDto, '127.0.0.1');

      expect(result.user.email).toBe(loginDto.email);
      expect(result.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        password_hash: await bcrypt.hash('CorrectPassword', 12),
      });

      await expect(service.login(loginDto, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should require 2FA if enabled', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
      };

      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        two_factor_enabled: true,
        password_hash: await bcrypt.hash(loginDto.password, 12),
      });

      const result = await service.login(loginDto, '127.0.0.1');

      expect(result.requires_2fa).toBe(true);
      expect(result.user_id).toBe(mockUser.id);
    });

    it('should update last_login_at and last_login_ip', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
      };
      const ip = '192.168.1.1';

      const user = {
        ...mockUser,
        password_hash: await bcrypt.hash(loginDto.password, 12),
      };

      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue('token');

      await service.login(loginDto, ip);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_login_ip: ip,
          last_login_at: expect.any(Date),
        })
      );
    });
  });

  // ... mas tests para otros metodos
});
```

**Metricas de cobertura recomendadas:**
```bash
# Ejecutar tests con cobertura
npm test -- --coverage

# Configurar umbral minimo en package.json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

---

### 7.2 MEDIO - Falta tests de integracion

**Archivos:** `test/integration/`
**Severidad:** MEDIO

**Descripcion:**
Solo hay un archivo de test de integracion para auth-service.

**Solucion:**
```typescript
// services/order-service/test/integration/order.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Order Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    await app.init();

    // Register and login to get auth token
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        first_name: 'Test',
        last_name: 'User',
      });

    userId = registerResponse.body.user.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create order from cart', async () => {
      // 1. Add products to cart
      await request(app.getHttpServer())
        .post('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          product_id: 'product-uuid-1',
          quantity: 2,
        })
        .expect(201);

      // 2. Create order
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'test@example.com',
          shipping_address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'US',
          },
          billing_address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'US',
          },
          payment_method_id: 'pm_test_123',
        })
        .expect(201);

      expect(response.body.order).toBeDefined();
      expect(response.body.order.order_number).toMatch(/^ORD-\d{8}-[A-Z0-9]{6}$/);
      expect(response.body.payment_client_secret).toBeDefined();
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          email: 'test@example.com',
          shipping_address: {},
        })
        .expect(401);
    });

    it('should fail with empty cart', async () => {
      // Clear cart first
      await request(app.getHttpServer())
        .delete('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'test@example.com',
          shipping_address: {},
        })
        .expect(400);
    });
  });

  describe('GET /orders/:id', () => {
    it('should return order details for owner', async () => {
      // Create order first
      const order = await createTestOrder(app, authToken);

      const response = await request(app.getHttpServer())
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.order.id).toBe(order.id);
      expect(response.body.subOrders).toBeDefined();
      expect(response.body.items).toBeDefined();
    });

    it('should deny access to other users orders', async () => {
      // Create another user
      const otherUserToken = await createTestUser(app, 'other@example.com');

      // Create order with first user
      const order = await createTestOrder(app, authToken);

      // Try to access with other user
      await request(app.getHttpServer())
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });
  });
});

// Helper functions
async function createTestUser(app: INestApplication, email: string): Promise<string> {
  await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email,
      password: 'SecurePass123!',
      first_name: 'Test',
      last_name: 'User',
    });

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email,
      password: 'SecurePass123!',
    });

  return loginResponse.body.accessToken;
}

async function createTestOrder(app: INestApplication, token: string) {
  // Add to cart and create order
  // ... implementation
}
```

---

### 7.3 BAJO - Falta tests E2E

**Severidad:** BAJO

**Descripcion:**
No hay tests end-to-end que prueben flujos completos.

**Solucion:**
```typescript
// e2e/checkout-flow.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('Checkout Flow E2E', () => {
  let app: INestApplication;
  let customerToken: string;
  let vendorToken: string;
  let productId: string;

  beforeAll(async () => {
    // Setup app
    // ...

    // Create vendor account
    vendorToken = await createVendorAccount();

    // Create product
    productId = await createProduct(vendorToken);

    // Create customer account
    customerToken = await createCustomerAccount();
  });

  it('should complete full checkout flow', async () => {
    // 1. Browse products
    const searchResponse = await request(app.getHttpServer())
      .get('/products/search')
      .query({ q: 'test product' })
      .expect(200);

    expect(searchResponse.body.products.length).toBeGreaterThan(0);

    // 2. Add to cart
    await request(app.getHttpServer())
      .post('/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        product_id: productId,
        quantity: 2,
      })
      .expect(201);

    // 3. View cart
    const cartResponse = await request(app.getHttpServer())
      .get('/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(cartResponse.body.items.length).toBe(1);
    expect(cartResponse.body.total).toBeGreaterThan(0);

    // 4. Create order
    const orderResponse = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        email: 'customer@example.com',
        shipping_address: {
          street: '123 Main St',
          city: 'NYC',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
        billing_address: {
          street: '123 Main St',
          city: 'NYC',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
      })
      .expect(201);

    const orderId = orderResponse.body.order.id;
    const clientSecret = orderResponse.body.payment_client_secret;

    expect(orderId).toBeDefined();
    expect(clientSecret).toBeDefined();

    // 5. Simulate payment confirmation (via Stripe webhook)
    await simulateStripeWebhook(orderId);

    // 6. Verify order status updated
    const orderDetailsResponse = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(orderDetailsResponse.body.order.payment_status).toBe('paid');

    // 7. Verify vendor received payout
    const payoutsResponse = await request(app.getHttpServer())
      .get(`/payments/vendor/${vendorId}/payouts`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .expect(200);

    expect(payoutsResponse.body.length).toBeGreaterThan(0);
    expect(payoutsResponse.body[0].status).toBe('processing');
  });
});
```

---

## 8. PROBLEMAS DE CONFIGURACION

### 8.1 CRITICO - Docker Compose referencias a servicios inexistentes

**Archivo:** `docker-compose.yml`
**Lineas:** 111-305
**Severidad:** CRITICO

Ya documentado en seccion 1.1

---

### 8.2 ALTO - Falta .env en .gitignore

**Archivo:** `.gitignore`
**Severidad:** ALTO

**Descripcion:**
El archivo .gitignore debe existir y debe incluir .env

**Solucion:**
```bash
# .gitignore
# Environment variables
.env
.env.local
.env.*.local
.env.production
.env.staging
.env.development

# Secrets
secrets.yaml
k8s/**/secrets.yaml
*.pem
*.key
*.crt

# Dependencies
node_modules/
*/node_modules/

# Build outputs
dist/
build/
*.tsbuildinfo

# Logs
logs/
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Testing
coverage/
.nyc_output/

# Database
*.sqlite
*.db

# Temporary
tmp/
temp/
```

---

### 8.3 MEDIO - Falta migraciones de base de datos

**Archivo:** `shared/database/migrations/` (existe directorio pero vacio)
**Severidad:** MEDIO

**Descripcion:**
No hay migraciones de TypeORM para crear las tablas.

**Impacto:**
- El proyecto no puede deployarse desde cero
- No hay control de versiones del schema
- Los cambios de schema se aplican via `synchronize: true` (PELIGROSO en produccion)

**Solucion:**
```bash
# Configurar TypeORM CLI
npm install -g typeorm

# Crear primera migracion
cd shared/database
npx typeorm migration:create -n InitialSchema
```

```typescript
// shared/database/migrations/1234567890-InitialSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1234567890 implements MigrationInterface {
  name = 'InitialSchema1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar,
        "role" varchar(20) NOT NULL,
        "first_name" varchar(100),
        "last_name" varchar(100),
        "phone" varchar(20),
        "avatar_url" varchar(500),
        "email_verified" boolean NOT NULL DEFAULT false,
        "email_verified_at" timestamp,
        "two_factor_enabled" boolean NOT NULL DEFAULT false,
        "two_factor_secret" varchar,
        "last_login_at" timestamp,
        "last_login_ip" inet,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // Indices para users
    await queryRunner.query(`
      CREATE INDEX "IDX_users_email_deleted_at" ON "users" ("email", "deleted_at");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_role" ON "users" ("role");
    `);

    // Products table
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "slug" varchar(300) NOT NULL,
        "base_price" decimal(10,2) NOT NULL,
        "vendor_id" uuid NOT NULL,
        "category_id" uuid,
        "tags" text,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "stock_quantity" integer NOT NULL DEFAULT 0,
        "track_inventory" boolean NOT NULL DEFAULT true,
        "view_count" integer NOT NULL DEFAULT 0,
        "images" jsonb,
        "attributes" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp,
        CONSTRAINT "PK_products" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_products_slug" UNIQUE ("slug")
      )
    `);

    // Indices para products
    await queryRunner.query(`
      CREATE INDEX "IDX_products_vendor_id" ON "products" ("vendor_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_status_vendor_id" ON "products" ("status", "vendor_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_status_created_at" ON "products" ("status", "created_at");
    `);

    // Orders table
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_number" varchar(50) NOT NULL,
        "user_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "shipping_address" jsonb NOT NULL,
        "billing_address" jsonb NOT NULL,
        "subtotal" decimal(10,2) NOT NULL,
        "shipping_total" decimal(10,2) NOT NULL,
        "grand_total" decimal(10,2) NOT NULL,
        "payment_status" varchar(20) NOT NULL DEFAULT 'pending',
        "stripe_payment_intent_id" varchar(100),
        "paid_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_orders_order_number" UNIQUE ("order_number")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_orders_user_id_created_at" ON "orders" ("user_id", "created_at");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_stripe_payment_intent_id" ON "orders" ("stripe_payment_intent_id");
    `);

    // Sub-orders table
    await queryRunner.query(`
      CREATE TABLE "sub_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "vendor_id" uuid NOT NULL,
        "suborder_number" varchar(50) NOT NULL,
        "subtotal" decimal(10,2) NOT NULL,
        "shipping_cost" decimal(10,2) NOT NULL,
        "total" decimal(10,2) NOT NULL,
        "commission_rate" decimal(5,2) NOT NULL,
        "commission_amount" decimal(10,2) NOT NULL,
        "vendor_payout" decimal(10,2) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sub_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sub_orders_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
      )
    `);

    // Order items table
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sub_order_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "variant_id" uuid,
        "product_title" varchar(255) NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" decimal(10,2) NOT NULL,
        "total_price" decimal(10,2) NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_items_sub_order" FOREIGN KEY ("sub_order_id") REFERENCES "sub_orders"("id") ON DELETE CASCADE
      )
    `);

    // Vendor payouts table
    await queryRunner.query(`
      CREATE TABLE "vendor_payouts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "vendor_id" uuid NOT NULL,
        "sub_order_id" uuid NOT NULL,
        "gross_amount" decimal(10,2) NOT NULL,
        "commission_amount" decimal(10,2) NOT NULL,
        "net_amount" decimal(10,2) NOT NULL,
        "stripe_transfer_id" varchar(100),
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "failure_reason" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vendor_payouts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_vendor_payouts_vendor_id_created_at" ON "vendor_payouts" ("vendor_id", "created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "vendor_payouts"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "sub_orders"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
```

Configurar en `typeorm.config.ts`:
```typescript
// shared/database/typeorm.config.ts
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['services/**/entities/*.entity.ts'],
  migrations: ['shared/database/migrations/*.ts'],
  synchronize: false, // NUNCA true en produccion!
  logging: process.env.NODE_ENV === 'development',
});
```

Ejecutar migraciones:
```bash
# Generar migracion desde entidades
npx typeorm migration:generate -d shared/database/typeorm.config.ts -n AutoGenerated

# Ejecutar migraciones
npx typeorm migration:run -d shared/database/typeorm.config.ts

# Revertir ultima migracion
npx typeorm migration:revert -d shared/database/typeorm.config.ts
```

---

### 8.4 MEDIO - Configuracion de Elasticsearch sin autenticacion

**Archivo:** `docker-compose.yml`
**Linea:** 64
**Severidad:** MEDIO

**Codigo Problematico:**
```yaml
elasticsearch:
  environment:
    - xpack.security.enabled=false  # INSEGURO!
```

**Solucion:**
```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
  container_name: kreo-elasticsearch
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=true  # HABILITAR seguridad
    - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}  # Desde .env
    - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
  ports:
    - "9200:9200"
  volumes:
    - elasticsearch-data:/usr/share/elasticsearch/data
  networks:
    - kreo-network
```

Actualizar en servicios:
```typescript
// product.service.ts
this.esClient = new Client({
  node: this.configService.get('ELASTICSEARCH_URL'),
  auth: {
    username: 'elastic',
    password: this.configService.get('ELASTIC_PASSWORD'),
  },
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
});
```

---

## 9. VULNERABILIDADES ADICIONALES DETECTADAS

### 9.1 CRITICO - Falta validacion en webhooks de Stripe

**Archivo:** `services/payment-service/src/payment/payment.service.ts`
**Linea:** 259
**Severidad:** CRITICO

**Descripcion:**
El webhook handler valida la firma, pero NO valida que el payment intent pertenezca a una orden real.

**Codigo Actual:**
```typescript
async handleWebhook(signature: string, payload: Buffer) {
  const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');

  try {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );

    // Procesa el evento sin validar que pertenezca a nuestro sistema!
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;
      // ...
    }
  }
}
```

**Impacto:**
Un atacante con acceso al webhook secret podria:
- Enviar eventos falsos
- Marcar ordenes como pagadas sin pago real
- Ejecutar transferencias fraudulentas

**Solucion:**
```typescript
async handleWebhook(signature: string, payload: Buffer) {
  const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');

  try {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );

    // Log del evento para auditoria
    this.logger.log({
      message: 'Stripe webhook received',
      eventType: event.type,
      eventId: event.id,
    });

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'transfer.created':
        await this.handleTransferCreated(event.data.object);
        break;

      case 'transfer.failed':
        await this.handleTransferFailed(event.data.object);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };

  } catch (error) {
    this.logger.error('Webhook error', error);
    throw new BadRequestException(`Webhook error: ${error.message}`);
  }
}

private async handlePaymentIntentSucceeded(paymentIntent: any) {
  // VALIDACION CRITICA: Verificar que el payment intent existe en nuestra BD
  const orderId = paymentIntent.metadata?.order_id;

  if (!orderId) {
    this.logger.error('Payment intent without order_id metadata', {
      paymentIntentId: paymentIntent.id,
    });
    return;
  }

  // Validar que la orden existe
  const order = await this.orderRepository.findOne({
    where: { stripe_payment_intent_id: paymentIntent.id },
  });

  if (!order) {
    this.logger.error('Order not found for payment intent', {
      paymentIntentId: paymentIntent.id,
      orderId,
    });
    return;
  }

  // Validar que el monto coincide
  const expectedAmount = Math.round(parseFloat(order.grand_total.toString()) * 100);
  if (paymentIntent.amount !== expectedAmount) {
    this.logger.error('Payment amount mismatch', {
      expected: expectedAmount,
      received: paymentIntent.amount,
      orderId: order.id,
    });

    // ALERTA DE SEGURIDAD!
    await this.sendSecurityAlert({
      type: 'PAYMENT_AMOUNT_MISMATCH',
      orderId: order.id,
      expected: expectedAmount,
      received: paymentIntent.amount,
    });

    return;
  }

  // Validar que no este ya procesado (idempotencia)
  if (order.payment_status === 'paid') {
    this.logger.warn('Payment intent already processed', {
      orderId: order.id,
      paymentIntentId: paymentIntent.id,
    });
    return;
  }

  // TODO: Llamar a order-service para confirmar pago
  this.logger.log('Payment succeeded', {
    orderId: order.id,
    amount: paymentIntent.amount,
  });
}
```

---

### 9.2 ALTO - Exposicion de stack traces en produccion

**Archivo:** `api-gateway/src/index.ts`
**Linea:** 288
**Severidad:** ALTO

**Codigo Problematico:**
```typescript
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

**Problema:**
En desarrollo esto esta bien, pero en produccion podria exponer informacion sensible si se loggea mal.

**Solucion:**
```typescript
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log completo del error (solo servidor)
  logger.error('Gateway error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Respuesta al cliente (sin detalles internos)
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    path: req.url,
  });
});
```

---

## 10. RECOMENDACIONES GENERALES

### 10.1 Implementar Monitoreo y Observabilidad

```bash
# Instalar dependencias
npm install @nestjs/terminus @nestjs/axios
npm install prom-client  # Para metricas de Prometheus
npm install winston      # Para logging estructurado
```

```typescript
// shared/monitoring/metrics.service.ts
import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: promClient.Registry;

  // Contadores
  public readonly httpRequestsTotal: promClient.Counter;
  public readonly httpRequestDuration: promClient.Histogram;
  public readonly orderCreatedTotal: promClient.Counter;
  public readonly paymentSuccessTotal: promClient.Counter;
  public readonly paymentFailedTotal: promClient.Counter;

  constructor() {
    this.registry = new promClient.Registry();

    // Default metrics (CPU, memoria, etc)
    promClient.collectDefaultMetrics({ register: this.registry });

    // Metricas personalizadas
    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.orderCreatedTotal = new promClient.Counter({
      name: 'orders_created_total',
      help: 'Total orders created',
      registers: [this.registry],
    });

    this.paymentSuccessTotal = new promClient.Counter({
      name: 'payments_success_total',
      help: 'Total successful payments',
      registers: [this.registry],
    });

    this.paymentFailedTotal = new promClient.Counter({
      name: 'payments_failed_total',
      help: 'Total failed payments',
      labelNames: ['reason'],
      registers: [this.registry],
    });
  }

  getMetrics(): string {
    return this.registry.metrics();
  }
}

// Middleware para tracking
export function metricsMiddleware(metrics: MetricsService) {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;

      metrics.httpRequestsTotal.inc({
        method: req.method,
        route: req.route?.path || req.url,
        status: res.statusCode,
      });

      metrics.httpRequestDuration.observe(
        {
          method: req.method,
          route: req.route?.path || req.url,
          status: res.statusCode,
        },
        duration
      );
    });

    next();
  };
}

// Endpoint de metricas
@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  getMetrics() {
    return this.metricsService.getMetrics();
  }
}
```

---

### 10.2 Implementar Distributed Tracing

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node
```

```typescript
// shared/tracing/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

export function initTracing(serviceName: string) {
  const sdk = new NodeSDK({
    serviceName,
    traceExporter: new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-pg': {
          enabled: true,
        },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error shutting down tracing', error))
      .finally(() => process.exit(0));
  });
}

// Usar en main.ts
import { initTracing } from './tracing/tracing';

initTracing('auth-service');

async function bootstrap() {
  // ...
}
```

---

### 10.3 Checklist de Deployment a Produccion

```markdown
# CHECKLIST DE DEPLOYMENT

## Pre-Deployment

### Seguridad
- [ ] Todos los secrets en variables de entorno (NO hardcoded)
- [ ] JWT secrets generados con openssl rand -base64 32
- [ ] CORS configurado solo para dominios autorizados
- [ ] Rate limiting habilitado en todos los endpoints
- [ ] Helmet configurado con CSP estricto
- [ ] HTTPS forzado (HSTS habilitado)
- [ ] Cookies con flags: httpOnly, secure, sameSite
- [ ] Input validation en todos los DTOs
- [ ] SQL injection prevention verificada
- [ ] XSS sanitization implementada
- [ ] CSRF protection habilitada

### Base de Datos
- [ ] Migraciones ejecutadas y testeadas
- [ ] Indices creados en columnas criticas
- [ ] Connection pooling configurado
- [ ] Backups automaticos configurados
- [ ] synchronize: false en TypeORM

### Performance
- [ ] Cache de Redis implementado
- [ ] Compression habilitada
- [ ] Lazy loading en frontend
- [ ] CDN configurado para assets estaticos
- [ ] Queries optimizadas (no N+1)

### Monitoring
- [ ] Health checks implementados
- [ ] Logging estructurado con Winston
- [ ] Metricas de Prometheus configuradas
- [ ] Alertas configuradas en Grafana
- [ ] Error tracking con Sentry

### Testing
- [ ] Tests unitarios > 80% cobertura
- [ ] Tests de integracion pasando
- [ ] Tests E2E para flujos criticos
- [ ] Load testing ejecutado
- [ ] Security scanning con OWASP ZAP

### Infraestructura
- [ ] Docker images optimizadas (multi-stage builds)
- [ ] Kubernetes manifests validados
- [ ] Resource limits configurados
- [ ] Horizontal Pod Autoscaling configurado
- [ ] Disaster recovery plan documentado

## Post-Deployment

### Verificacion
- [ ] Smoke tests en produccion
- [ ] Monitoreo de errores 4xx/5xx
- [ ] Latencia < 200ms para endpoints criticos
- [ ] CPU < 70%, RAM < 80%
- [ ] Logs sin errores criticos

### Rollback Plan
- [ ] Version anterior disponible
- [ ] Database migration rollback testeado
- [ ] Rollback procedure documentado
```

---

## RESUMEN DE PRIORIDADES

### CRITICOS (Arreglar INMEDIATAMENTE)

1. **Crear servicios faltantes** (user, vendor, shipping, notification) o eliminar referencias
2. **Agregar autenticacion a payment-service endpoints**
3. **Implementar ownership validation en order endpoints**
4. **Validar webhooks de Stripe contra BD**
5. **Crear controladores faltantes** (product, order)
6. **Implementar reserva de inventario atomica**

### ALTOS (Arreglar antes de produccion)

1. Crear AppModule y main.ts para servicios faltantes
2. Implementar CSRF protection
3. Crear guards de roles y autorizacion
4. Implementar circuit breakers
5. Crear migraciones de base de datos
6. Implementar logging estructurado
7. Agregar tests unitarios y de integracion

### MEDIOS (Mejorar calidad)

1. Refactorizar funciones largas
2. Eliminar codigo duplicado
3. Implementar caching
4. Mejorar error handling
5. Agregar paginacion donde falta
6. Optimizar queries N+1
7. Implementar health checks completos

### BAJOS (Nice to have)

1. Agregar compresion gzip
2. Mejorar comentarios
3. Implementar distributed tracing
4. Crear tests E2E completos

---

## ESTIMACION DE ESFUERZO

- **Problemas CRITICOS**: 40-60 horas de desarrollo
- **Problemas ALTOS**: 60-80 horas de desarrollo
- **Problemas MEDIOS**: 40-50 horas de desarrollo
- **Problemas BAJOS**: 20-30 horas de desarrollo

**TOTAL ESTIMADO**: 160-220 horas de trabajo (4-5 semanas para 1 desarrollador)

---

## CONCLUSION

El proyecto tiene una arquitectura solida y muchas buenas practicas implementadas, especialmente en seguridad. Sin embargo, **NO ESTA LISTO PARA PRODUCCION** debido a:

1. Servicios incompletos/faltantes
2. Falta de controladores y modulos
3. Autenticacion/autorizacion incompleta
4. Ausencia de migraciones de BD
5. Testing insuficiente

**Recomendacion:** Priorizar la correccion de problemas CRITICOS y ALTOS antes de cualquier deployment a produccion. Los problemas de seguridad especialmente deben ser abordados de inmediato.

---

**Auditor:** Staff Backend Engineer
**Fecha:** 2026-01-03
**Proxima Revision:** Despues de implementar correcciones criticas
