import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Order } from '../entities/order.entity';
import { SubOrder } from '../entities/sub-order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CartService } from '../cart/cart.service';

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
   * Create order from cart (Multi-vendor checkout)
   */
  async createOrder(userId: string, checkoutData: {
    email: string;
    shipping_address: any;
    billing_address: any;
    payment_method_id: string;
  }) {
    // 1. Get cart
    const cart = await this.cartService.getCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 2. Validate inventory and calculate totals
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

    // 3. Calculate commission for Kreo (10% default)
    const commission_rate = 10.0;
    const total_commission = (grand_total * commission_rate) / 100;

    // 4. Create master order
    const order_number = this.generateOrderNumber();

    const order = this.orderRepository.create({
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

    await this.orderRepository.save(order);

    // 5. Create sub-orders for each vendor
    const subOrders = [];

    for (const vendorData of vendorSubOrders) {
      const suborder_total = vendorData.subtotal + vendorData.shipping_cost;
      const vendor_commission = (suborder_total * commission_rate) / 100;
      const vendor_payout = suborder_total - vendor_commission;

      const subOrder = this.subOrderRepository.create({
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

      await this.subOrderRepository.save(subOrder);

      // Create order items
      for (const item of vendorData.items) {
        const orderItem = this.orderItemRepository.create({
          sub_order_id: subOrder.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_title: 'Product Title', // Should fetch from product service
          quantity: item.quantity,
          unit_price: item.price_snapshot,
          total_price: item.price_snapshot * item.quantity,
        });

        await this.orderItemRepository.save(orderItem);
      }

      subOrders.push(subOrder);
    }

    // 6. Create payment intent
    const paymentServiceUrl = this.configService.get('PAYMENT_SERVICE_URL');

    try {
      const paymentResponse = await firstValueFrom(
        this.httpService.post(`${paymentServiceUrl}/payments/create-intent`, {
          order_id: order.id,
          amount: grand_total,
          application_fee: total_commission,
          metadata: {
            order_number,
            vendor_count: subOrders.length,
          },
        })
      );

      // Update order with payment intent ID
      order.stripe_payment_intent_id = paymentResponse.data.id;
      await this.orderRepository.save(order);

      // 7. Clear cart
      await this.cartService.clearCart(userId);

      return {
        order,
        subOrders,
        payment_client_secret: paymentResponse.data.client_secret,
      };
    } catch (error) {
      // Rollback order creation
      await this.orderRepository.remove(order);
      throw new BadRequestException(`Payment initialization failed: ${error.message}`);
    }
  }

  /**
   * Confirm payment and execute transfers
   */
  async confirmPayment(orderId: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new BadRequestException('Order not found');
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
      await firstValueFrom(
        this.httpService.post(`${paymentServiceUrl}/payments/execute-transfers`, {
          order_id: orderId,
          sub_orders: transferData,
        })
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
   * Get user orders
   */
  async getUserOrders(userId: string) {
    return this.orderRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

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

  private generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${dateStr}-${random}`;
  }
}
