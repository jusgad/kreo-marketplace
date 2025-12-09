# Ejemplo: Cómo Aplicar el Parche #2 - Prevención de IDOR y Escalada de Privilegios

## Problema Identificado en `order.service.ts:225`

### ❌ CÓDIGO INSEGURO (ACTUAL):
```typescript
// order.service.ts
async getOrderDetails(orderId: string) {
  const order = await this.orderRepository.findOne({ where: { id: orderId } });
  // ⚠️ VULNERABILIDAD IDOR: No verifica que el usuario sea dueño de la orden
  // Un usuario podría acceder a órdenes de otros usuarios probando diferentes IDs

  const subOrders = await this.subOrderRepository.find({
    where: { order_id: orderId },
  });
  // ...
}
```

### ✅ SOLUCIÓN 1: Verificación en el Servicio (Más Simple)

```typescript
import { OwnershipChecker } from '@kreo/shared/security/guards/ownership.guard';

async getOrderDetails(orderId: string, userId: string, userRole?: string) {
  // Verificar ownership - lanza NotFoundException si no existe o no pertenece al usuario
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
  const subOrders = await this.subOrderRepository.find({
    where: { order_id: orderId },
  });

  const items = await this.orderItemRepository
    .createQueryBuilder('item')
    .where('item.sub_order_id IN (:...subOrderIds)', {
      subOrderIds: subOrders.map(so => so.id),
    })
    .getMany();

  return {
    order,
    subOrders,
    items,
  };
}
```

### ✅ SOLUCIÓN 2: Verificación en el Controlador con Guard

```typescript
// order.controller.ts
import { RolesGuard, Roles } from '@kreo/shared/security/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard) // Primero autenticar
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Get(':orderId')
  async getOrderDetails(
    @Param('orderId') orderId: string,
    @Request() req
  ) {
    // Pasar el userId del usuario autenticado
    return this.orderService.getOrderDetails(orderId, req.user.id, req.user.role);
  }
}
```

## Ejemplo: Prevenir Escalada de Privilegios en Rutas Admin

### ❌ CÓDIGO INSEGURO:
```typescript
// admin.controller.ts
@Controller('admin')
export class AdminController {

  @Get('users')
  async getAllUsers() {
    // ⚠️ VULNERABILIDAD: Cualquier usuario autenticado puede acceder
    return this.userService.getAllUsers();
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    // ⚠️ VULNERABILIDAD: Cualquier usuario podría eliminar otros usuarios
    return this.userService.deleteUser(id);
  }
}
```

### ✅ CÓDIGO SEGURO (CON GUARDS):
```typescript
import { RolesGuard, AdminOnly, Roles } from '@kreo/shared/security/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // Aplicar guards a nivel de controlador
@AdminOnly() // Solo admins pueden acceder a todas las rutas de este controlador
export class AdminController {
  constructor(private userService: UserService) {}

  @Get('users')
  async getAllUsers() {
    // Solo admin puede acceder ✅
    return this.userService.getAllUsers();
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    // Solo admin puede acceder ✅
    return this.userService.deleteUser(id);
  }
}
```

## Ejemplo: Rutas con Múltiples Roles Permitidos

### ✅ Vendor o Admin pueden acceder:
```typescript
import { RolesGuard, VendorOrAdmin } from '@kreo/shared/security/guards/roles.guard';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {

  @Post()
  @VendorOrAdmin() // Vendor o admin pueden crear productos
  async createProduct(@Request() req, @Body() productData: any) {
    return this.productService.createProduct(req.user.id, productData);
  }

  @Put(':productId')
  @VendorOrAdmin()
  async updateProduct(
    @Param('productId') productId: string,
    @Request() req,
    @Body() updateData: any
  ) {
    // Verificar que el vendor sea dueño del producto
    // (los admins pueden editar cualquier producto)
    return this.productService.updateProduct(productId, req.user.id, updateData);
  }
}
```

## Ejemplo: Verificación en Servicio con RoleChecker

### ✅ Verificar roles en la lógica de negocio:
```typescript
import { RoleChecker, UserRole } from '@kreo/shared/security/guards/roles.guard';

async updateProduct(productId: string, userId: string, updateData: any, user: any) {
  // Si no es admin, verificar que sea dueño del producto
  if (!RoleChecker.isAdmin(user)) {
    const product = await OwnershipChecker.checkOwnership(
      this.productRepository,
      productId,
      userId,
      {
        ownerField: 'vendor_id',
        resourceName: 'Producto',
        allowAdmin: false, // Ya verificamos admin arriba
      }
    );
  }

  // Admin puede editar cualquier producto, vendor solo los suyos
  const product = await this.productRepository.findOne({
    where: { id: productId },
  });

  Object.assign(product, updateData);
  return this.productRepository.save(product);
}
```

## Ejemplo: Proteger la Ruta de Payout de Vendors

### ✅ Solo el vendor dueño o admin puede ver sus pagos:
```typescript
// vendor-payout.controller.ts
@Controller('vendor/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorPayoutController {

  @Get()
  @VendorOrAdmin()
  async getMyPayouts(@Request() req) {
    // Vendor solo ve sus propios payouts, admin puede ver todos
    if (RoleChecker.isAdmin(req.user)) {
      return this.payoutService.getAllPayouts();
    } else {
      return this.payoutService.getVendorPayouts(req.user.id);
    }
  }

  @Get(':payoutId')
  @VendorOrAdmin()
  async getPayoutDetails(
    @Param('payoutId') payoutId: string,
    @Request() req
  ) {
    // Verificar que el payout pertenezca al vendor
    return this.payoutService.getPayoutDetails(payoutId, req.user.id, req.user.role);
  }
}

// vendor-payout.service.ts
async getPayoutDetails(payoutId: string, vendorId: string, userRole: string) {
  const payout = await OwnershipChecker.checkOwnership(
    this.payoutRepository,
    payoutId,
    vendorId,
    {
      ownerField: 'vendor_id',
      resourceName: 'Pago',
      allowAdmin: true,
      userRole: userRole,
    }
  );

  return payout;
}
```

## Checklist de Seguridad para Prevenir IDOR

- ✅ **Todas las rutas están protegidas con `JwtAuthGuard`** (requieren autenticación)
- ✅ **Las rutas admin usan `@AdminOnly()` o `@Roles('admin')`**
- ✅ **Los servicios verifican ownership antes de devolver datos**
- ✅ **Nunca confiar en el `userId` del cliente** - siempre usar `req.user.id` del JWT
- ✅ **No revelar si un recurso existe** cuando el usuario no tiene permiso (usar el mismo error)
- ✅ **Los IDs de recursos se validan** con `InputValidator.isValidUUID()`

## Regla de Oro

### ❌ NUNCA:
```typescript
// Confiar en el userId del cliente
async getOrder(orderId: string, userId: string) {
  // ⚠️ El cliente podría pasar cualquier userId
}
```

### ✅ SIEMPRE:
```typescript
// Obtener userId del token JWT autenticado
@UseGuards(JwtAuthGuard)
async getOrder(@Param('orderId') orderId: string, @Request() req) {
  const userId = req.user.id; // Del token JWT ✅
  // Verificar ownership...
}
```
