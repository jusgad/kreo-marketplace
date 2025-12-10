# Ejemplo: Cómo Aplicar el Parche #4 - Prevención de Manipulación de Precios

## Problema: Confiar en Precios Enviados por el Cliente

### ❌ CÓDIGO INSEGURO:
```typescript
// Recibir datos del checkout desde el frontend
@Post('checkout')
async checkout(@Body() checkoutData: {
  items: Array<{
    product_id: string;
    quantity: number;
    price: number; // ⚠️ NUNCA confiar en esto
  }>;
  total: number; // ⚠️ NUNCA confiar en esto
  discount: number; // ⚠️ NUNCA confiar en esto
}) {
  // ⚠️ VULNERABILIDAD: El cliente podría enviar price: 0.01
  const order = await this.createOrder(checkoutData);
}
```

Un atacante podría manipular el precio en el frontend:
```javascript
// En el navegador del atacante
fetch('/api/checkout', {
  method: 'POST',
  body: JSON.stringify({
    items: [{
      product_id: 'abc-123',
      quantity: 100,
      price: 0.01  // ¡Producto de $100 por $0.01!
    }],
    total: 1.00,
    discount: 9999.00
  })
});
```

## ✅ SOLUCIÓN: Calcular TODO en el Servidor

### Paso 1: Modificar el DTO para NO recibir precios

```typescript
// checkout.dto.ts
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class CheckoutItemDto {
  @IsString()
  product_id: string;

  @IsOptional()
  @IsString()
  variant_id?: string;

  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity: number;

  // ⚠️ NO incluir price - se calculará en el servidor
}

export class CheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  coupon_code?: string;

  // ⚠️ NO incluir total, discount, etc. - se calcularán en el servidor

  shipping_address: any;
  billing_address: any;
  payment_method_id: string;
}
```

### Paso 2: Implementar el Servicio de Checkout Seguro

```typescript
// order.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceValidator, PriceValidationService } from '@kreo/shared/security/price-validator';
import { Order } from './entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { Coupon } from './entities/coupon.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    private priceValidationService: PriceValidationService,
  ) {}

  /**
   * Crear orden calculando TODO en el servidor
   */
  async createOrder(userId: string, checkoutDto: CheckoutDto) {
    // 1. Validar y recalcular precios IGNORANDO cualquier precio del cliente
    const { items, totals } = await this.priceValidationService.validateAndRecalculateCart(
      checkoutDto.items,
      this.productRepository,
      {
        shippingCost: this.calculateShipping(checkoutDto.items),
        taxRate: 0.16, // 16% IVA (ejemplo para México)
        couponCode: checkoutDto.coupon_code,
        couponRepository: this.couponRepository,
      }
    );

    console.log('✅ Precios calculados en servidor:', totals);
    // {
    //   subtotal: 299.98,
    //   shipping: 50.00,
    //   tax: 47.99,
    //   discount: 30.00,
    //   total: 367.97
    // }

    // 2. Verificar inventario
    await this.verifyInventory(items);

    // 3. Crear la orden con los precios REALES
    const order = this.orderRepository.create({
      user_id: userId,
      email: checkoutDto.email,
      shipping_address: checkoutDto.shipping_address,
      billing_address: checkoutDto.billing_address,
      subtotal: totals.subtotal,
      shipping_total: totals.shipping,
      tax_total: totals.tax,
      discount_total: totals.discount,
      grand_total: totals.total, // ✅ Precio REAL calculado en servidor
      payment_status: 'pending',
    });

    await this.orderRepository.save(order);

    // 4. Crear items de la orden con precios validados
    for (const item of items) {
      await this.orderItemRepository.save({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price, // ✅ Precio REAL del servidor
        total_price: item.total_price, // ✅ Total REAL calculado
      });
    }

    // 5. Si hay cupón, marcar como usado
    if (checkoutDto.coupon_code) {
      await this.markCouponAsUsed(checkoutDto.coupon_code, userId);
    }

    // 6. Crear payment intent con el monto REAL
    const paymentIntent = await this.createPaymentIntent(order.id, totals.total);

    return {
      order,
      payment_client_secret: paymentIntent.client_secret,
      totals, // Devolver los totales calculados para que el frontend los muestre
    };
  }

  /**
   * Calcular costo de envío basado en los productos
   */
  private calculateShipping(items: any[]): number {
    // Implementar lógica de cálculo de envío
    // Ejemplo: envío gratis sobre $500, sino $50
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    if (itemCount === 0) return 0;
    if (itemCount > 10) return 100; // Envío más caro para muchos items
    return 50; // Envío estándar
  }

  /**
   * Verificar que haya inventario suficiente
   */
  private async verifyInventory(items: any[]): Promise<void> {
    for (const item of items) {
      const product = await this.productRepository.findOne({
        where: { id: item.product_id },
      });

      if (!product) {
        throw new BadRequestException(`Producto ${item.product_id} no encontrado`);
      }

      if (product.stock_quantity < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${product.title}. Disponible: ${product.stock_quantity}`
        );
      }
    }
  }

  /**
   * Marcar cupón como usado
   */
  private async markCouponAsUsed(couponCode: string, userId: string): Promise<void> {
    const coupon = await this.couponRepository.findOne({
      where: { code: couponCode },
    });

    if (coupon) {
      coupon.used_count += 1;
      await this.couponRepository.save(coupon);

      // Registrar uso del cupón
      await this.couponUsageRepository.save({
        coupon_id: coupon.id,
        user_id: userId,
        used_at: new Date(),
      });
    }
  }
}
```

### Paso 3: Validar el Pago Recibido

```typescript
// payment.service.ts
import { PriceValidationService } from '@kreo/shared/security/price-validator';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private priceValidationService: PriceValidationService,
  ) {}

  /**
   * Webhook de Stripe para confirmar pago
   */
  async handleStripeWebhook(event: any) {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.order_id;
      const amountReceived = paymentIntent.amount_received / 100; // Stripe usa centavos

      // ✅ Validar que el monto recibido coincida con el total de la orden
      const isValid = await this.priceValidationService.validatePaymentAmount(
        orderId,
        amountReceived,
        this.orderRepository
      );

      if (!isValid) {
        // ⚠️ Alerta: Posible intento de manipulación de precio
        console.error(`SECURITY ALERT: Payment amount mismatch for order ${orderId}`);
        // Enviar notificación al equipo de seguridad
        return;
      }

      // Marcar orden como pagada
      await this.orderRepository.update(
        { id: orderId },
        {
          payment_status: 'paid',
          paid_at: new Date(),
        }
      );

      // Reducir inventario
      await this.reduceInventory(orderId);
    }
  }
}
```

## Ejemplo: Endpoint de Vista Previa del Carrito

Proporcionar un endpoint para que el frontend pueda mostrar el total correcto:

```typescript
// cart.controller.ts
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  /**
   * Calcular total del carrito (para mostrar en frontend)
   */
  @Post('calculate-total')
  async calculateTotal(
    @Request() req,
    @Body() calculateDto: {
      items: Array<{ product_id: string; quantity: number }>;
      coupon_code?: string;
    }
  ) {
    // Calcular en el servidor y devolver al frontend
    const result = await this.cartService.calculateCartTotals(
      calculateDto.items,
      calculateDto.coupon_code
    );

    return result;
    // Frontend recibe:
    // {
    //   items: [{ product_id: '...', quantity: 2, unit_price: 99.99, total_price: 199.98 }],
    //   totals: { subtotal: 199.98, shipping: 50, tax: 31.99, discount: 0, total: 281.97 }
    // }
  }
}
```

En el frontend (React):
```typescript
// Antes de hacer checkout, calcular el total en el servidor
const calculateTotal = async () => {
  const response = await fetch('/api/cart/calculate-total', {
    method: 'POST',
    body: JSON.stringify({
      items: cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity
        // ⚠️ NO enviar price
      })),
      coupon_code: couponCode
    })
  });

  const { totals } = await response.json();
  setTotal(totals.total); // Mostrar el total calculado por el servidor
};
```

## Ejemplo: Validar Cupón de Descuento

```typescript
// coupon.controller.ts
@Controller('coupons')
export class CouponController {

  @Post('validate')
  async validateCoupon(
    @Body() validateDto: { code: string; cart_items: any[] }
  ) {
    const coupon = await this.couponRepository.findOne({
      where: { code: validateDto.code },
    });

    if (!coupon) {
      throw new BadRequestException('Cupón inválido');
    }

    // Calcular subtotal del carrito en el servidor
    const { totals } = await this.priceValidationService.validateAndRecalculateCart(
      validateDto.cart_items,
      this.productRepository
    );

    const productIds = validateDto.cart_items.map(item => item.product_id);

    // Validar cupón
    const validation = PriceValidator.validateCoupon(
      coupon,
      totals.subtotal,
      productIds
    );

    if (!validation.isValid) {
      throw new BadRequestException(validation.reason);
    }

    // Calcular descuento
    const discountAmount = PriceValidator.calculateCouponDiscount(
      coupon,
      totals.subtotal
    );

    return {
      valid: true,
      discount_amount: discountAmount,
      discount_type: coupon.discount_type,
      message: `Cupón aplicado: $${discountAmount} de descuento`,
    };
  }
}
```

## Checklist de Seguridad para Precios

- ✅ **NUNCA recibir precios del cliente** en el DTO de checkout
- ✅ **SIEMPRE buscar precios en la base de datos** antes de calcular totales
- ✅ **Validar cupones en el servidor** (fechas, límites, aplicabilidad)
- ✅ **Calcular shipping, tax y totales en el servidor**
- ✅ **Validar el monto recibido en el webhook de pago**
- ✅ **Verificar inventario antes de crear la orden**
- ✅ **Usar números decimales con precisión** (no floats directamente)
- ✅ **Registrar uso de cupones** para prevenir reutilización

## Regla de Oro

### ❌ NUNCA CONFIAR EN:
- Precios enviados por el cliente
- Totales calculados en el frontend
- Descuentos aplicados por el cliente
- Cantidades sin validar

### ✅ SIEMPRE HACER:
- Buscar precios en la base de datos
- Calcular totales en el servidor
- Validar cupones en el servidor
- Verificar el monto del pago recibido
- Registrar todas las transacciones

## Flujo Seguro de Checkout

```
1. Usuario agrega productos al carrito (solo IDs y cantidades)
   ↓
2. Frontend llama a /cart/calculate-total
   ↓
3. Servidor calcula precios REALES y devuelve totales
   ↓
4. Usuario aplica cupón (opcional)
   ↓
5. Servidor valida cupón y recalcula totales
   ↓
6. Usuario hace checkout
   ↓
7. Servidor recalcula TODO nuevamente (por si cambió algo)
   ↓
8. Servidor crea payment intent con el monto REAL
   ↓
9. Usuario paga
   ↓
10. Webhook valida que el monto recibido = monto calculado
   ↓
11. Orden confirmada ✅
```
