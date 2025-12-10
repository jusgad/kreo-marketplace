# Ejemplo: Cómo Aplicar el Parche #3 - Prevención de XSS

## Problema: Entrada de Usuario Sin Sanitizar

### ❌ CÓDIGO INSEGURO:
```typescript
// product.service.ts
async createProduct(vendorId: string, productData: any) {
  const product = this.productRepository.create({
    ...productData, // ⚠️ VULNERABILIDAD: description podría contener <script> tags
    vendor_id: vendorId,
  });

  await this.productRepository.save(product);
  return product;
}
```

Si un vendor malicioso envía:
```json
{
  "title": "Producto Test",
  "description": "<img src=x onerror='alert(document.cookie)'>Descripción maliciosa"
}
```

Este código XSS se guardará en la base de datos y se ejecutará cuando otros usuarios vean el producto.

## ✅ SOLUCIÓN 1: Sanitizar en el Servicio

```typescript
import { XSSSanitizer } from '@kreo/shared/security/xss-sanitizer';
import { InputValidator } from '@kreo/shared/security/sql-injection-prevention';

async createProduct(vendorId: string, productData: any) {
  // Sanitizar campos de texto antes de guardar
  const sanitizedData = {
    title: XSSSanitizer.sanitizeTitle(productData.title),
    description: XSSSanitizer.sanitizeProductDescription(productData.description),
    vendor_id: vendorId,
    base_price: InputValidator.isPositiveDecimal(productData.base_price, 'precio'),
    // ... otros campos
  };

  const product = this.productRepository.create(sanitizedData);
  await this.productRepository.save(product);

  return product;
}
```

## ✅ SOLUCIÓN 2: Sanitizar en el DTO con class-validator

```typescript
// create-product.dto.ts
import { IsString, IsNumber, IsOptional, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { XSSSanitizer } from '@kreo/shared/security/xss-sanitizer';

export class CreateProductDto {

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }) => XSSSanitizer.sanitizeTitle(value))
  title: string;

  @IsString()
  @MaxLength(5000)
  @Transform(({ value }) => XSSSanitizer.sanitizeProductDescription(value))
  description: string;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  base_price: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => XSSSanitizer.sanitizeText(value, 100))
  sku?: string;

  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map(tag => XSSSanitizer.sanitizeText(tag, 50));
    }
    return [];
  })
  tags?: string[];
}
```

Luego en el controlador:
```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@VendorOrAdmin()
async createProduct(
  @Request() req,
  @Body() createProductDto: CreateProductDto // Los datos ya vienen sanitizados
) {
  return this.productService.createProduct(req.user.id, createProductDto);
}
```

## Ejemplo: Sanitizar Reseñas de Productos

```typescript
// review.dto.ts
import { IsString, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { XSSSanitizer } from '@kreo/shared/security/xss-sanitizer';

export class CreateReviewDto {

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => XSSSanitizer.sanitizeReview(value))
  comment: string;

  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => XSSSanitizer.sanitizeTitle(value))
  title: string;
}

// review.service.ts
async createReview(userId: string, productId: string, reviewDto: CreateReviewDto) {
  // Verificación adicional (defensa en profundidad)
  if (XSSSanitizer.containsDangerousHTML(reviewDto.comment)) {
    throw new BadRequestException('Contenido no permitido detectado');
  }

  const review = this.reviewRepository.create({
    user_id: userId,
    product_id: productId,
    rating: reviewDto.rating,
    title: reviewDto.title,
    comment: reviewDto.comment, // Ya sanitizado por el DTO
  });

  return this.reviewRepository.save(review);
}
```

## Ejemplo: Sanitizar Comentarios (Sin HTML)

```typescript
// comment.dto.ts
import { IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { XSSSanitizer } from '@kreo/shared/security/xss-sanitizer';

export class CreateCommentDto {

  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => XSSSanitizer.sanitizeComment(value)) // Elimina TODO el HTML
  content: string;
}
```

## Ejemplo: Validar URLs en Campos

```typescript
// vendor.dto.ts
import { IsString, IsUrl, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { XSSSanitizer } from '@kreo/shared/security/xss-sanitizer';

export class UpdateVendorProfileDto {

  @IsOptional()
  @IsString()
  @IsUrl()
  @Transform(({ value }) => {
    try {
      return XSSSanitizer.sanitizeURL(value);
    } catch (error) {
      throw new BadRequestException('URL inválida');
    }
  })
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => XSSSanitizer.sanitizeHTML(value, {
    allowedTags: ['b', 'i', 'u', 'br', 'p'],
    maxLength: 1000
  }))
  bio?: string;
}
```

## Integración con Pipe Global de Validación

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar ValidationPipe global con transformación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Eliminar propiedades no definidas en el DTO
      forbidNonWhitelisted: true, // Lanzar error si hay propiedades extra
      transform: true, // Habilitar transformaciones (@Transform decorators)
      transformOptions: {
        enableImplicitConversion: false, // Desactivar conversión implícita (más seguro)
      },
    })
  );

  await app.listen(3000);
}
bootstrap();
```

## Ejemplo: Sanitización en Actualización de Producto

```typescript
// update-product.dto.ts
import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { XSSSanitizer } from '@kreo/shared/security/xss-sanitizer';

export class UpdateProductDto {

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value ? XSSSanitizer.sanitizeTitle(value) : undefined)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(({ value }) => value ? XSSSanitizer.sanitizeProductDescription(value) : undefined)
  description?: string;

  @IsOptional()
  @IsNumber()
  base_price?: number;
}

// product.service.ts
async updateProduct(productId: string, vendorId: string, updateDto: UpdateProductDto) {
  const product = await OwnershipChecker.checkOwnership(
    this.productRepository,
    productId,
    vendorId,
    { ownerField: 'vendor_id', resourceName: 'Producto' }
  );

  // Los datos ya vienen sanitizados del DTO
  Object.assign(product, updateDto);

  if (updateDto.title) {
    product.slug = this.generateSlug(updateDto.title);
  }

  return this.productRepository.save(product);
}
```

## Ejemplo: Mostrar Contenido Sanitizado en el Frontend

Aunque sanitizamos en el backend, también debemos tener cuidado en el frontend:

```typescript
// En React/Vue, usar sanitización adicional al mostrar
import DOMPurify from 'dompurify';

function ProductDescription({ description }) {
  // Sanitizar antes de mostrar (defensa en profundidad)
  const clean = DOMPurify.sanitize(description);

  return (
    <div dangerouslySetInnerHTML={{ __html: clean }} />
  );
}
```

## Checklist de Seguridad XSS

- ✅ **Todos los campos de texto del usuario están sanitizados** (título, descripción, comentarios)
- ✅ **Los DTOs usan `@Transform` para sanitizar** automáticamente
- ✅ **ValidationPipe global está configurado** con `transform: true`
- ✅ **Las URLs se validan** con `sanitizeURL()`
- ✅ **El HTML permitido está limitado** a tags seguros (b, i, u, p, br)
- ✅ **Se eliminan todos los event handlers** (onclick, onerror, etc.)
- ✅ **Se eliminan tags peligrosos** (script, iframe, object, embed)
- ✅ **El frontend también sanitiza** antes de mostrar (defensa en profundidad)

## Regla de Oro

### ❌ NUNCA:
- Confiar en la entrada del usuario sin sanitizar
- Permitir tags script, iframe, object, embed
- Permitir atributos de eventos (onclick, onerror, etc.)
- Almacenar HTML sin sanitizar en la base de datos

### ✅ SIEMPRE:
- Sanitizar ANTES de guardar en la base de datos
- Usar whitelist de tags permitidos
- Validar URLs antes de almacenarlas
- Aplicar defensa en profundidad (backend + frontend)
