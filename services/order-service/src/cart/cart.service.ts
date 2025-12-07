import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Product } from '../entities/product.entity';

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
   */
  async addToCart(userId: string, productId: string, quantity: number, variantId?: string) {
    // Validate product exists and has inventory
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new BadRequestException('Product not found');
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
   */
  async updateQuantity(userId: string, productId: string, quantity: number, variantId?: string) {
    if (quantity === 0) {
      return this.removeFromCart(userId, productId, variantId);
    }

    const cart = await this.getCart(userId);

    const item = cart.items.find(
      item => item.product_id === productId && item.variant_id === variantId
    );

    if (!item) {
      throw new BadRequestException('Item not in cart');
    }

    // Validate inventory
    const product = await this.productRepository.findOne({ where: { id: productId } });
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
   */
  async getCart(userId: string) {
    const cartData = await this.redis.get(this.getCartKey(userId));

    if (!cartData) {
      return {
        user_id: userId,
        items: [],
        grouped_by_vendor: {},
        total: 0,
      };
    }

    return JSON.parse(cartData);
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
   * Save cart to Redis
   */
  private async saveCart(userId: string, cart: any) {
    await this.redis.set(
      this.getCartKey(userId),
      JSON.stringify(cart),
      'EX',
      60 * 60 * 24 * 7 // 7 days expiry
    );
  }
}
