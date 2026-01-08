/**
 * PARCHE DE SEGURIDAD #4: Prevención de Manipulación de Precios
 *
 * Este módulo asegura que todos los cálculos de precios, descuentos y totales
 * se realicen EXCLUSIVAMENTE en el servidor, ignorando cualquier valor enviado
 * por el cliente.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

/**
 * Información de producto para cálculo de precio
 */
export interface ProductPriceInfo {
  id: string;
  base_price: number;
  sale_price?: number;
  is_on_sale?: boolean;
}

/**
 * Información de cupón
 */
export interface CouponInfo {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  valid_from: Date;
  valid_until: Date;
  usage_limit?: number;
  used_count: number;
  applicable_to?: 'all' | 'specific_products' | 'specific_categories';
  product_ids?: string[];
  category_ids?: string[];
}

/**
 * Item del carrito para validación
 */
export interface CartItemValidation {
  product_id: string;
  variant_id?: string;
  quantity: number;
  // ⚠️ NO incluir price del cliente - se ignorará
}

/**
 * Resultado de validación de precio
 */
export interface PriceValidationResult {
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number; // Precio unitario REAL del servidor
  total_price: number; // Precio total calculado en servidor
  original_price?: number; // Precio original si hay descuento
  discount_amount?: number;
}

/**
 * Clase principal para validación de precios
 */
export class PriceValidator {

  /**
   * Calcula el precio REAL de un producto ignorando el precio del cliente
   *
   * ✅ REGLA DE ORO: NUNCA confiar en precios enviados por el cliente
   */
  static calculateRealPrice(product: ProductPriceInfo): number {
    // Si el producto está en oferta, usar el precio de oferta
    if (product.is_on_sale && product.sale_price) {
      return parseFloat(product.sale_price.toString());
    }

    // Sino, usar el precio base
    return parseFloat(product.base_price.toString());
  }

  /**
   * Valida y calcula el precio total de un item del carrito
   */
  static validateCartItem(
    product: ProductPriceInfo,
    quantity: number
  ): PriceValidationResult {
    // Validar cantidad
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      throw new BadRequestException('Cantidad inválida');
    }

    if (quantity > 1000) {
      throw new BadRequestException('Cantidad máxima excedida (1000 unidades por producto)');
    }

    // Obtener el precio REAL del servidor
    const realPrice = this.calculateRealPrice(product);

    // Calcular total
    const totalPrice = this.roundPrice(realPrice * quantity);

    return {
      product_id: product.id,
      quantity,
      unit_price: realPrice,
      total_price: totalPrice,
    };
  }

  /**
   * Valida un cupón de descuento
   */
  static validateCoupon(
    coupon: CouponInfo,
    subtotal: number,
    productIds: string[]
  ): { isValid: boolean; reason?: string } {
    const now = new Date();

    // Verificar fechas de validez
    if (now < coupon.valid_from) {
      return { isValid: false, reason: 'El cupón aún no es válido' };
    }

    if (now > coupon.valid_until) {
      return { isValid: false, reason: 'El cupón ha expirado' };
    }

    // Verificar límite de uso
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return { isValid: false, reason: 'El cupón ha alcanzado su límite de uso' };
    }

    // Verificar monto mínimo de compra
    if (coupon.min_purchase_amount && subtotal < coupon.min_purchase_amount) {
      return {
        isValid: false,
        reason: `El monto mínimo de compra es $${coupon.min_purchase_amount}`
      };
    }

    // Verificar aplicabilidad a productos
    if (coupon.applicable_to === 'specific_products' && coupon.product_ids) {
      const hasApplicableProduct = productIds.some(id =>
        coupon.product_ids!.includes(id)
      );

      if (!hasApplicableProduct) {
        return { isValid: false, reason: 'El cupón no es aplicable a estos productos' };
      }
    }

    return { isValid: true };
  }

  /**
   * Calcula el descuento de un cupón
   */
  static calculateCouponDiscount(
    coupon: CouponInfo,
    subtotal: number
  ): number {
    let discount = 0;

    if (coupon.discount_type === 'percentage') {
      // Descuento porcentual
      discount = (subtotal * coupon.discount_value) / 100;
    } else if (coupon.discount_type === 'fixed') {
      // Descuento fijo
      discount = coupon.discount_value;
    }

    // Aplicar descuento máximo si existe
    if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
      discount = coupon.max_discount_amount;
    }

    // El descuento no puede ser mayor al subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }

    return this.roundPrice(discount);
  }

  /**
   * Calcula el total del carrito de forma segura
   */
  static calculateCartTotal(
    items: PriceValidationResult[],
    shippingCost: number = 0,
    taxRate: number = 0,
    discountAmount: number = 0
  ): {
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
  } {
    // Calcular subtotal sumando los precios REALES
    const subtotal = this.roundPrice(
      items.reduce((sum, item) => sum + item.total_price, 0)
    );

    // Aplicar descuento (no puede ser mayor al subtotal)
    const validDiscount = Math.min(discountAmount, subtotal);
    const discountedSubtotal = subtotal - validDiscount;

    // Calcular impuestos sobre el subtotal con descuento
    const tax = this.roundPrice(discountedSubtotal * taxRate);

    // Calcular total
    const total = this.roundPrice(discountedSubtotal + shippingCost + tax);

    return {
      subtotal,
      shipping: this.roundPrice(shippingCost),
      tax,
      discount: this.roundPrice(validDiscount),
      total,
    };
  }

  /**
   * Redondea un precio a 2 decimales
   */
  static roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  /**
   * Verifica que un precio sea válido (positivo y con máximo 2 decimales)
   */
  static isValidPrice(price: number): boolean {
    if (price < 0) return false;
    if (!Number.isFinite(price)) return false;

    // Verificar que no tenga más de 2 decimales
    const decimals = (price.toString().split('.')[1] || '').length;
    return decimals <= 2;
  }
}

/**
 * Servicio inyectable para validación de precios en NestJS
 */
@Injectable()
export class PriceValidationService {

  /**
   * Valida y recalcula los precios del carrito
   * ⚠️ IMPORTANTE: Este método IGNORA los precios enviados por el cliente
   */
  async validateAndRecalculateCart<T>(
    cartItems: CartItemValidation[],
    productRepository: Repository<T>,
    options: {
      shippingCost?: number;
      taxRate?: number;
      couponCode?: string;
      couponRepository?: Repository<any>;
    } = {}
  ): Promise<{
    items: PriceValidationResult[];
    totals: ReturnType<typeof PriceValidator.calculateCartTotal>;
  }> {
    const validatedItems: PriceValidationResult[] = [];

    // 1. Para cada item, buscar el precio REAL en la base de datos
    for (const item of cartItems) {
      const product = await productRepository.findOne({
        where: { id: item.product_id } as any,
      });

      if (!product) {
        throw new BadRequestException(`Producto ${item.product_id} no encontrado`);
      }

      // Calcular precio REAL (ignorando cualquier precio del cliente)
      const validatedItem = PriceValidator.validateCartItem(
        product as any,
        item.quantity
      );

      validatedItems.push(validatedItem);
    }

    // 2. Calcular subtotal
    const subtotal = validatedItems.reduce((sum, item) => sum + item.total_price, 0);

    // 3. Validar y aplicar cupón si existe
    let discountAmount = 0;

    if (options.couponCode && options.couponRepository) {
      const coupon = await options.couponRepository.findOne({
        where: { code: options.couponCode } as any,
      });

      if (coupon) {
        const productIds = validatedItems.map(item => item.product_id);
        const validation = PriceValidator.validateCoupon(coupon, subtotal, productIds);

        if (!validation.isValid) {
          throw new BadRequestException(validation.reason);
        }

        discountAmount = PriceValidator.calculateCouponDiscount(coupon, subtotal);
      } else {
        throw new BadRequestException('Cupón inválido');
      }
    }

    // 4. Calcular totales
    const totals = PriceValidator.calculateCartTotal(
      validatedItems,
      options.shippingCost || 0,
      options.taxRate || 0,
      discountAmount
    );

    return {
      items: validatedItems,
      totals,
    };
  }

  /**
   * Valida que un pago recibido coincida con el total calculado
   */
  async validatePaymentAmount(
    orderId: string,
    receivedAmount: number,
    orderRepository: Repository<any>
  ): Promise<boolean> {
    const order = await orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Orden no encontrada');
    }

    // Recalcular el total esperado
    const expectedTotal = PriceValidator.roundPrice(order.grand_total);
    const received = PriceValidator.roundPrice(receivedAmount);

    // Verificar que coincidan (con tolerancia de 1 centavo por redondeos)
    const difference = Math.abs(expectedTotal - received);

    if (difference > 0.01) {
      throw new BadRequestException(
        `Monto de pago incorrecto. Esperado: $${expectedTotal}, Recibido: $${received}`
      );
    }

    return true;
  }
}
