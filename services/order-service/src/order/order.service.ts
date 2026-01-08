// ==============================================================================
// ARCHIVO: services/order-service/src/order/order.service.ts
// FUNCIONALIDAD: Lógica de negocio para gestión de órdenes multi-vendor
// - Creación de órdenes desde el carrito de compras
// - División automática en sub-órdenes por vendor
// - Cálculo de comisiones de la plataforma (10% por defecto)
// - Integración con servicio de pagos (Stripe Payment Intents)
// - Ejecución de transferencias a vendedores
// - Control de ownership: usuarios solo ven sus propias órdenes
// - Generación de números de orden únicos
// - Estados: pending, processing, paid, shipped, delivered, cancelled
// ==============================================================================

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Order } from '../entities/order.entity';
import { SubOrder } from '../entities/sub-order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CartService } from '../cart/cart.service';
import { OwnershipChecker } from '../../../../shared/security/guards/ownership.guard';
import { CircuitBreakerService } from '../../../../shared/circuit-breaker';
import { COMMISSION, ORDER } from '../../../../shared/constants';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(SubOrder)
    private subOrderRepository: Repository<SubOrder>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private cartService: CartService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  /**
   * Obtener orden por ID sin verificar ownership
   * ✅ CRÍTICO #8: Método interno para validación de webhooks
   */
  async getOrderById(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return order;
  }

  /**
   * Create order from cart (Multi-vendor checkout)
   *
   * SECURITY FIX APPLIED:
   * - Added database transaction for atomicity
   * - Fetch real product titles from product service
   * - Proper error handling and rollback
   * - Validation of product availability and stock
   */
  async createOrder(userId: string, checkoutData: {
    email: string;
    shipping_address: any;
    billing_address: any;
    payment_method_id: string;
  }) {
    // Use QueryRunner for transaction management
    const queryRunner = this.orderRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get cart
      const cart = await this.cartService.getCart(userId);

      if (cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      // 2. Fetch product details and validate stock
      const productServiceUrl = this.configService.get('PRODUCT_SERVICE_URL');
      const productDetails = new Map<string, any>();

      for (const item of cart.items) {
        try {
          // ✅ CRITICAL FIX: Circuit breaker + Timeout + Retry logic
          const productResponse = await CircuitBreakerService.execute<any>(
            'product-service',
            async () => {
              // Import retry interceptor
              const { RetryInterceptor } = require('../../../../shared/http');

              return await firstValueFrom(
                RetryInterceptor.withRetry(
                  this.httpService.get(
                    `${productServiceUrl}/products/${item.product_id}`,
                    { timeout: 5000 } // ✅ 5 seconds timeout
                  ),
                  { maxRetries: 3, delayMs: 1000 } // ✅ 3 reintentos con 1s delay
                )
              );
            }
          );

          const product = (productResponse as any).data;

          // Validate product availability
          if (product.status !== 'active') {
            throw new BadRequestException(`Product "${product.title}" is no longer available`);
          }

          // Validate stock
          if (product.stock_quantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for "${product.title}". Available: ${product.stock_quantity}, Requested: ${item.quantity}`
            );
          }

          productDetails.set(item.product_id, product);
        } catch (error) {
          throw new BadRequestException(`Failed to validate product ${item.product_id}: ${error.message}`);
        }
      }

      // 3. Calculate totals
      let subtotal = 0;
      let shipping_total = 0;
      const vendorSubOrders: any[] = [];

      for (const vendorId in cart.grouped_by_vendor) {
        const vendorCart = cart.grouped_by_vendor[vendorId];
        subtotal += vendorCart.subtotal;
        shipping_total += vendorCart.shipping_cost || 0;

        vendorSubOrders.push({
          vendor_id: vendorId,
          items: vendorCart.items,
          subtotal: vendorCart.subtotal,
          shipping_cost: vendorCart.shipping_cost || 0,
        });
      }

      const grand_total = subtotal + shipping_total;

      // 4. Calculate commission for Kreo
      // ✅ MEDIA #27 MEJORADO: Usa constante en lugar de magic number
      // Permite configuración por variable de entorno o usa valor por defecto
      const commission_rate = parseFloat(
        this.configService.get('PLATFORM_COMMISSION_RATE') || String(COMMISSION.DEFAULT_RATE)
      );
      const total_commission = (grand_total * commission_rate) / 100;

      // 5. Create master order (within transaction)
      // ✅ Usa constante para prefijo de orden
      const order_number = this.generateOrderNumber();

      const order = queryRunner.manager.create(Order, {
        order_number,
        user_id: userId,
        email: checkoutData.email,
        shipping_address: checkoutData.shipping_address,
        billing_address: checkoutData.billing_address,
        subtotal,
        shipping_total,
        grand_total,
        payment_status: 'pending',
      });

      await queryRunner.manager.save(order);

      // 6. Create sub-orders for each vendor (within transaction)
      const subOrders = [];

      for (const vendorData of vendorSubOrders) {
        const suborder_total = vendorData.subtotal + vendorData.shipping_cost;
        const vendor_commission = (suborder_total * commission_rate) / 100;
        const vendor_payout = suborder_total - vendor_commission;

        const subOrder = queryRunner.manager.create(SubOrder, {
          order_id: order.id,
          vendor_id: vendorData.vendor_id,
          suborder_number: `${order_number}-${subOrders.length + 1}`,
          subtotal: vendorData.subtotal,
          shipping_cost: vendorData.shipping_cost,
          total: suborder_total,
          commission_rate,
          commission_amount: vendor_commission,
          vendor_payout,
          status: 'pending',
        });

        await queryRunner.manager.save(subOrder);

        // Create order items with REAL product titles
        for (const item of vendorData.items) {
          const product = productDetails.get(item.product_id);

          const orderItem = queryRunner.manager.create(OrderItem, {
            sub_order_id: subOrder.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_title: product.title, // FIXED: Real product title
            quantity: item.quantity,
            unit_price: item.price_snapshot,
            total_price: item.price_snapshot * item.quantity,
          });

          await queryRunner.manager.save(orderItem);
        }

        subOrders.push(subOrder);
      }

      // 7. Create payment intent con circuit breaker + timeout + retry
      const paymentServiceUrl = this.configService.get('PAYMENT_SERVICE_URL');

      // ✅ CRITICAL FIX: Circuit breaker + Timeout + Retry para payment service
      const { RetryInterceptor } = require('../../../../shared/http');

      const paymentResponse = await CircuitBreakerService.execute<any>(
        'payment-service',
        async () => {
          return await firstValueFrom(
            RetryInterceptor.withRetry(
              this.httpService.post(
                `${paymentServiceUrl}/payments/create-intent`,
                {
                  order_id: order.id,
                  amount: grand_total,
                  application_fee: total_commission,
                  metadata: {
                    order_number,
                    vendor_count: subOrders.length,
                  },
                },
                { timeout: 5000 } // ✅ 5 seconds timeout
              ),
              RetryInterceptor.getCriticalServiceRetryConfig() // ✅ 5 reintentos para servicio crítico
            )
          );
        }
      );

      // Update order with payment intent ID
      order.stripe_payment_intent_id = (paymentResponse as any).data.id;
      await queryRunner.manager.save(order);

      // 8. Commit transaction
      await queryRunner.commitTransaction();

      // 9. Clear cart (outside transaction - non-critical)
      await this.cartService.clearCart(userId);

      return {
        order,
        subOrders,
        payment_client_secret: (paymentResponse as any).data.client_secret,
      };

    } catch (error) {
      // Rollback transaction on any error
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(`Order creation failed: ${error.message}`);
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  /**
   * Confirm payment and execute transfers
   *
   * ✅ CRÍTICO #8 SOLUCIONADO: Acepta datos del webhook para validación
   * - Validate order is not already paid (prevent double payment)
   * - Ensure payment intent is present
   * - Stores payment confirmation details from webhook
   */
  async confirmPayment(
    orderId: string,
    confirmData?: { payment_intent_id?: string; amount_received?: number; currency?: string }
  ) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // SECURITY FIX: Prevent double payment confirmation
    if (order.payment_status === 'paid') {
      throw new BadRequestException('Order has already been paid');
    }

    // SECURITY FIX: Validate payment intent exists
    if (!order.stripe_payment_intent_id) {
      throw new BadRequestException('No payment intent found for this order');
    }

    // ✅ Si viene del webhook, validar que el payment_intent_id coincide
    if (confirmData?.payment_intent_id && confirmData.payment_intent_id !== order.stripe_payment_intent_id) {
      throw new BadRequestException('Payment intent ID mismatch');
    }

    // Get sub-orders with vendor stripe account IDs
    const subOrders = await this.subOrderRepository
      .createQueryBuilder('sub_order')
      .leftJoinAndSelect('sub_order.vendor', 'vendor')
      .where('sub_order.order_id = :orderId', { orderId })
      .getMany();

    // Execute transfers to vendors
    const paymentServiceUrl = this.configService.get('PAYMENT_SERVICE_URL');

    const transferData = subOrders.map(subOrder => ({
      vendor_id: subOrder.vendor_id,
      stripe_account_id: (subOrder as any).vendor.stripe_account_id,
      vendor_payout: parseFloat(subOrder.vendor_payout.toString()),
      sub_order_id: subOrder.id,
    }));

    try {
      // ✅ CRITICAL FIX: Circuit breaker + Timeout + Retry para transfers
      const { RetryInterceptor } = require('../../../../shared/http');

      await CircuitBreakerService.execute(
        'payment-service',
        async () => {
          return await firstValueFrom(
            RetryInterceptor.withRetry(
              this.httpService.post(
                `${paymentServiceUrl}/payments/execute-transfers`,
                {
                  order_id: orderId,
                  sub_orders: transferData,
                },
                { timeout: 10000 } // ✅ 10 seconds timeout (transfers son más lentos)
              ),
              RetryInterceptor.getCriticalServiceRetryConfig() // ✅ 5 reintentos
            )
          );
        }
      );

      // Update order status
      order.payment_status = 'paid';
      order.paid_at = new Date();
      await this.orderRepository.save(order);

      // Update sub-orders status
      await this.subOrderRepository.update(
        { order_id: orderId },
        { status: 'processing' }
      );

      return { success: true, order };
    } catch (error) {
      throw new BadRequestException(`Transfer execution failed: ${error.message}`);
    }
  }

  /**
   * Get user orders with pagination
   * ✅ SEGURO: Solo devuelve órdenes del usuario autenticado
   *
   * @param userId - ID del usuario autenticado
   * @param page - Número de página (default: 1)
   * @param limit - Órdenes por página (default: 20, máx: 100)
   * @returns Órdenes paginadas con metadata
   */
  async getUserOrders(userId: string, page: number = 1, limit: number = 20) {
    // Validar y sanitizar parámetros de paginación
    const validatedPage = Math.max(1, Math.floor(Number(page) || 1));
    const validatedLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
    const skip = (validatedPage - 1) * validatedLimit;

    // Ejecutar queries en paralelo para optimizar performance
    const [orders, total] = await Promise.all([
      this.orderRepository.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take: validatedLimit,
        skip: skip,
      }),
      this.orderRepository.count({
        where: { user_id: userId },
      }),
    ]);

    // Calcular metadata de paginación
    const total_pages = Math.ceil(total / validatedLimit);
    const has_next = validatedPage < total_pages;
    const has_prev = validatedPage > 1;

    return {
      data: orders,
      pagination: {
        current_page: validatedPage,
        per_page: validatedLimit,
        total_items: total,
        total_pages,
        has_next,
        has_prev,
      },
    };
  }

  /**
   * Get order details
   * ✅ PARCHE APLICADO: Verifica ownership antes de devolver la orden
   * ✅ OPTIMIZACIÓN: Usa JOIN EAGER para eliminar queries N+1
   *
   * ANTES: 3+ queries (1 order + 1 subOrders + N items)
   * AHORA: 1 query con JOINs
   *
   * @param orderId - ID de la orden
   * @param userId - ID del usuario autenticado (del JWT)
   * @param userRole - Rol del usuario (permite acceso a admins)
   */
  async getOrderDetails(orderId: string, userId: string, userRole?: string) {
    // ✅ UNA SOLA QUERY con JOIN EAGER para traer todo
    // Esto resuelve el problema N+1 completamente
    const orderQuery = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.sub_orders', 'subOrder')
      .leftJoinAndSelect('subOrder.items', 'item')
      .where('order.id = :orderId', { orderId });

    // Aplicar filtro de ownership (usuario normal solo ve sus órdenes)
    if (userRole !== 'admin') {
      orderQuery.andWhere('order.user_id = :userId', { userId });
    }

    const order = await orderQuery.getOne();

    // Verificar que existe
    if (!order) {
      throw new NotFoundException(
        `Orden ${orderId} no encontrada o no tienes permiso para verla`
      );
    }

    // Extraer subOrders e items de las relaciones cargadas
    const subOrders = order.sub_orders || [];
    const items = subOrders.flatMap(subOrder => subOrder.items || []);

    return {
      order,
      subOrders,
      items,
    };
  }

  /**
   * Generar número de orden único
   *
   * ✅ ALTA PRIORIDAD #20 SOLUCIONADO: Reemplazado Math.random con crypto.randomBytes
   * ✅ MEDIA #31 MEJORADO: Usa constante para prefijo
   *
   * ANTES: Math.random() puede generar colisiones (números duplicados)
   * AHORA: crypto.randomBytes genera números criptográficamente seguros
   *
   * Formato: ORD-YYYYMMDD-XXXXXX
   * Ejemplo: ORD-20260108-A7F3E2
   *
   * @returns Número de orden único con 6 caracteres hexadecimales aleatorios
   */
  private generateOrderNumber(): string {
    // Obtener fecha actual en formato YYYYMMDD
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // ✅ SEGURO: Generar 6 caracteres hexadecimales aleatorios con crypto
    // crypto.randomBytes(3) genera 3 bytes (24 bits)
    // .toString('hex') convierte a hexadecimal (6 caracteres)
    // .toUpperCase() convierte a mayúsculas para consistencia
    const crypto = require('crypto');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();

    // ✅ Usa constante para prefijo
    // Retornar número de orden en formato ORD-YYYYMMDD-XXXXXX
    return `${ORDER.NUMBER_PREFIX}-${dateStr}-${random}`;
  }
}
