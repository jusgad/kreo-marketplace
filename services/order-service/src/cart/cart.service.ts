import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Product } from '../entities/product.entity';
import { CART } from '../../../../shared/constants';

// ✅ ALTA PRIORIDAD #12 SOLUCIONADO: Cart TTL configurado
// ✅ MEDIA #31 MEJORADO: Usa constantes en lugar de magic numbers
// Carritos expiran después de 7 días de inactividad
// TTL se renueva cada vez que se lee el carrito (mantiene carritos activos)

interface CartItem {
  product_id: string;
  vendor_id: string;
  quantity: number;
  variant_id?: string;
  price_snapshot: number;
}

interface VendorCart {
  vendor_id: string;
  items: CartItem[];
  subtotal: number;
  shipping_method?: string;
  shipping_cost: number;
}

@Injectable()
export class CartService {
  private redis: Redis;

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private configService: ConfigService,
  ) {
    this.redis = new Redis(this.configService.get('REDIS_URL'));
  }

  private getCartKey(userId: string): string {
    return `cart:${userId}`;
  }

  /**
   * Add item to cart
   *
   * SECURITY FIX APPLIED:
   * - Validate product status is active before adding
   * - Prevent adding disabled/deleted products to cart
   */
  async addToCart(userId: string, productId: string, quantity: number, variantId?: string) {
    // Validate product exists and has inventory
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // SECURITY FIX: Validate product is active
    if (product.status !== 'active') {
      throw new BadRequestException('Product is not available for purchase');
    }

    // SECURITY FIX: Validate quantity is positive integer
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Invalid quantity');
    }

    // SECURITY FIX: Limit maximum quantity per add operation
    // ✅ Usa constante para límite de cantidad
    if (quantity > CART.MAX_QUANTITY_PER_ITEM) {
      throw new BadRequestException(`Maximum quantity per add operation is ${CART.MAX_QUANTITY_PER_ITEM}`);
    }

    if (product.track_inventory && product.inventory_quantity < quantity) {
      throw new BadRequestException('Insufficient inventory');
    }

    const cart = await this.getCart(userId);

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product_id === productId && item.variant_id === variantId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product_id: productId,
        vendor_id: product.vendor_id,
        quantity,
        variant_id: variantId,
        price_snapshot: parseFloat(product.base_price.toString()),
      });
    }

    // Recalculate cart
    cart.grouped_by_vendor = this.groupByVendor(cart.items);
    cart.total = this.calculateTotal(cart.grouped_by_vendor);

    await this.saveCart(userId, cart);

    return cart;
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, productId: string, variantId?: string) {
    const cart = await this.getCart(userId);

    cart.items = cart.items.filter(
      item => !(item.product_id === productId && item.variant_id === variantId)
    );

    cart.grouped_by_vendor = this.groupByVendor(cart.items);
    cart.total = this.calculateTotal(cart.grouped_by_vendor);

    await this.saveCart(userId, cart);

    return cart;
  }

  /**
   * Update item quantity
   *
   * SECURITY FIX APPLIED:
   * - Validate quantity constraints
   * - Check product availability before update
   */
  async updateQuantity(userId: string, productId: string, quantity: number, variantId?: string) {
    if (quantity === 0) {
      return this.removeFromCart(userId, productId, variantId);
    }

    // SECURITY FIX: Validate quantity is positive integer
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Invalid quantity');
    }

    // SECURITY FIX: Limit maximum quantity
    // ✅ Usa constante para límite de cantidad
    if (quantity > CART.MAX_QUANTITY_PER_ITEM) {
      throw new BadRequestException(`Maximum quantity per item is ${CART.MAX_QUANTITY_PER_ITEM}`);
    }

    const cart = await this.getCart(userId);

    const item = cart.items.find(
      item => item.product_id === productId && item.variant_id === variantId
    );

    if (!item) {
      throw new BadRequestException('Item not in cart');
    }

    // Validate inventory and product availability
    const product = await this.productRepository.findOne({ where: { id: productId } });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // SECURITY FIX: Validate product is still active
    if (product.status !== 'active') {
      throw new BadRequestException('Product is no longer available');
    }

    if (product.track_inventory && product.inventory_quantity < quantity) {
      throw new BadRequestException('Insufficient inventory');
    }

    item.quantity = quantity;

    cart.grouped_by_vendor = this.groupByVendor(cart.items);
    cart.total = this.calculateTotal(cart.grouped_by_vendor);

    await this.saveCart(userId, cart);

    return cart;
  }

  /**
   * Get cart for user
   * ✅ OPTIMIZACIÓN: Renueva TTL cada vez que se lee el carrito
   * Esto mantiene los carritos activos y solo expira los abandonados
   */
  async getCart(userId: string) {
    const cartKey = this.getCartKey(userId);
    const cartData = await this.redis.get(cartKey);

    if (!cartData) {
      return {
        user_id: userId,
        items: [],
        grouped_by_vendor: {},
        total: 0,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      };
    }

    // ✅ RENOVAR TTL: Mantener carritos activos vivos
    // Si el usuario accede al carrito, extender el tiempo de expiración
    // ✅ Usa constante para TTL
    await this.redis.expire(cartKey, CART.TTL_SECONDS);

    const cart = JSON.parse(cartData);

    // Actualizar timestamp de última actualización
    cart.last_updated = new Date().toISOString();

    return cart;
  }

  /**
   * Clear cart
   */
  async clearCart(userId: string) {
    await this.redis.del(this.getCartKey(userId));
    return { success: true };
  }

  /**
   * Set shipping method for vendor
   */
  async setShippingMethod(userId: string, vendorId: string, shippingMethod: string, shippingCost: number) {
    const cart = await this.getCart(userId);

    if (cart.grouped_by_vendor[vendorId]) {
      cart.grouped_by_vendor[vendorId].shipping_method = shippingMethod;
      cart.grouped_by_vendor[vendorId].shipping_cost = shippingCost;

      cart.total = this.calculateTotal(cart.grouped_by_vendor);

      await this.saveCart(userId, cart);
    }

    return cart;
  }

  /**
   * Group cart items by vendor
   */
  private groupByVendor(items: CartItem[]): Record<string, VendorCart> {
    const grouped: Record<string, VendorCart> = {};

    for (const item of items) {
      if (!grouped[item.vendor_id]) {
        grouped[item.vendor_id] = {
          vendor_id: item.vendor_id,
          items: [],
          subtotal: 0,
          shipping_cost: 0,
        };
      }

      grouped[item.vendor_id].items.push(item);
      grouped[item.vendor_id].subtotal += item.price_snapshot * item.quantity;
    }

    return grouped;
  }

  /**
   * Calculate total including shipping
   */
  private calculateTotal(groupedCart: Record<string, VendorCart>): number {
    let total = 0;

    for (const vendorId in groupedCart) {
      const vendorCart = groupedCart[vendorId];
      total += vendorCart.subtotal + (vendorCart.shipping_cost || 0);
    }

    return total;
  }

  /**
   * Save cart to Redis with TTL
   * ✅ OPTIMIZACIÓN: TTL de 7 días para limpiar carritos abandonados
   */
  private async saveCart(userId: string, cart: any) {
    // Agregar metadata si no existe
    if (!cart.created_at) {
      cart.created_at = new Date().toISOString();
    }
    cart.last_updated = new Date().toISOString();

    // Guardar con TTL de 7 días
    // ✅ Usa constante para TTL
    await this.redis.set(
      this.getCartKey(userId),
      JSON.stringify(cart),
      'EX',
      CART.TTL_SECONDS
    );
  }
}
