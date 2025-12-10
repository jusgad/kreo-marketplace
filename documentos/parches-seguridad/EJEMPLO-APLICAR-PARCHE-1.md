# Ejemplo: Cómo Aplicar el Parche #1 - Prevención de Inyección SQL

## Problema Identificado en `product.service.ts:252`

### ❌ CÓDIGO INSEGURO (ACTUAL):
```typescript
private async fallbackSearch(query: any) {
  const { q, page = 1, limit = 20 } = query;

  const where: any = { status: 'active' };
  if (q) {
    where.title = Like(`%${q}%`); // ⚠️ VULNERABILIDAD: Concatenación directa
  }
  // ...
}
```

### ✅ CÓDIGO SEGURO (CON PARCHE):
```typescript
import { InputValidator, SecureQueryBuilder } from '@kreo/shared/security/sql-injection-prevention';
import { ILike } from 'typeorm';

private async fallbackSearch(query: any) {
  const { q, page = 1, limit = 20 } = query;

  // Validar paginación
  const pagination = SecureQueryBuilder.validatePagination(page, limit);

  const where: any = { status: 'active' };

  if (q) {
    // Sanitizar el input antes de usarlo en LIKE
    const safeSearch = SecureQueryBuilder.createLikeSearch(q);
    where.title = ILike(safeSearch); // ILike usa parámetros preparados internamente
  }

  const [products, total] = await this.productRepository.findAndCount({
    where,
    skip: pagination.skip,
    take: pagination.limit,
  });

  return {
    products,
    total,
    page: pagination.page,
    limit: pagination.limit,
    total_pages: Math.ceil(total / pagination.limit),
    facets: {},
  };
}
```

## Ejemplo 2: Validación en DTOs

### ✅ Aplicar en `cart.service.ts` o `order.service.ts`:
```typescript
import { InputValidator } from '@kreo/shared/security/sql-injection-prevention';

async addToCart(userId: string, productId: string, quantity: number) {
  // Validar que los inputs sean del tipo correcto
  const validUserId = InputValidator.isValidUUID(userId, 'userId');
  const validProductId = InputValidator.isValidUUID(productId, 'productId');
  const validQuantity = InputValidator.isPositiveInteger(quantity, 'cantidad');

  // Validar que la cantidad sea razonable
  if (validQuantity > 1000) {
    throw new BadRequestException('La cantidad máxima por producto es 1000');
  }

  // Ahora puedes usar los valores validados de forma segura
  const product = await this.productRepository.findOne({
    where: { id: validProductId }, // TypeORM usa prepared statements automáticamente
  });

  // ... resto de la lógica
}
```

## Ejemplo 3: Búsqueda con múltiples filtros

### ✅ Búsqueda segura con QueryBuilder:
```typescript
async searchOrders(filters: {
  orderId?: string;
  userId?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
}) {
  const queryBuilder = this.orderRepository.createQueryBuilder('order');

  // Validar y aplicar filtros de forma segura
  if (filters.orderId) {
    const validOrderId = InputValidator.isValidUUID(filters.orderId, 'orderId');
    queryBuilder.andWhere('order.id = :orderId', { orderId: validOrderId });
  }

  if (filters.userId) {
    const validUserId = InputValidator.isValidUUID(filters.userId, 'userId');
    queryBuilder.andWhere('order.user_id = :userId', { userId: validUserId });
  }

  if (filters.status) {
    // Validar que el status sea uno de los valores permitidos
    const allowedStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(filters.status)) {
      throw new BadRequestException('Status inválido');
    }
    queryBuilder.andWhere('order.payment_status = :status', { status: filters.status });
  }

  if (filters.minAmount !== undefined) {
    const validMin = InputValidator.isPositiveDecimal(filters.minAmount, 'minAmount');
    queryBuilder.andWhere('order.grand_total >= :minAmount', { minAmount: validMin });
  }

  if (filters.maxAmount !== undefined) {
    const validMax = InputValidator.isPositiveDecimal(filters.maxAmount, 'maxAmount');
    queryBuilder.andWhere('order.grand_total <= :maxAmount', { maxAmount: validMax });
  }

  // TypeORM siempre usa prepared statements, por lo que esto es seguro
  return queryBuilder.getMany();
}
```

## Regla de Oro para Prevenir Inyección SQL

### ✅ SIEMPRE HACER:
1. **Usar TypeORM con objetos where** - TypeORM usa prepared statements automáticamente
2. **Usar QueryBuilder con parámetros nombrados** - `:paramName`
3. **Validar tipos de entrada** antes de cualquier query
4. **Sanitizar patrones LIKE** antes de usarlos

### ❌ NUNCA HACER:
1. **Concatenar strings directamente** - `WHERE user_id = '${userId}'`
2. **Usar `query()` raw sin parámetros** - `connection.query('SELECT * FROM users WHERE id = ' + id)`
3. **Confiar en la entrada del usuario** sin validar
4. **Permitir ordenamiento dinámico sin whitelist** - Validar siempre con `validateSortField()`
