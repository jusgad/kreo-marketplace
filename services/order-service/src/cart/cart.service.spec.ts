// ==============================================================================
// ARCHIVO: services/order-service/src/cart/cart.service.spec.ts
// FUNCIONALIDAD: Unit tests para CartService
//
// ✅ TESTING: Tests de funcionalidad de carrito
//
// TESTS INCLUIDOS:
// - Agregar items al carrito
// - Actualizar cantidades
// - Validación de límites
// - TTL de Redis
// - Renovación de TTL
// ==============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { Product } from '../entities/product.entity';
import { CART } from '../../../../shared/constants';

describe('CartService', () => {
  let service: CartService;
  let productRepository: any;
  let redis: any;

  const mockProductRepository = {
    findOne: jest.fn(),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('redis://localhost:6379'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    productRepository = module.get(getRepositoryToken(Product));

    // Mock Redis instance
    redis = mockRedis;
    (service as any).redis = redis;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToCart', () => {
    const userId = 'user-123';
    const productId = 'product-456';
    const quantity = 2;

    const mockProduct = {
      id: productId,
      title: 'Test Product',
      base_price: 99.99,
      status: 'active',
      track_inventory: true,
      inventory_quantity: 10,
      vendor_id: 'vendor-789',
    };

    beforeEach(() => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      redis.get.mockResolvedValue(null);
      redis.setex.mockResolvedValue('OK');
    });

    it('should add product to empty cart', async () => {
      const result = await service.addToCart(userId, productId, quantity);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        product_id: productId,
        vendor_id: mockProduct.vendor_id,
        quantity,
        price_snapshot: mockProduct.base_price,
      });
    });

    it('should validate product exists', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addToCart(userId, 'invalid-id', quantity)
      ).rejects.toThrow('Product not found');
    });

    it('should validate product is active', async () => {
      productRepository.findOne.mockResolvedValue({
        ...mockProduct,
        status: 'deleted',
      });

      await expect(
        service.addToCart(userId, productId, quantity)
      ).rejects.toThrow('Product is not available for purchase');
    });

    it('should validate quantity is positive integer', async () => {
      await expect(
        service.addToCart(userId, productId, 0)
      ).rejects.toThrow('Invalid quantity');

      await expect(
        service.addToCart(userId, productId, -5)
      ).rejects.toThrow('Invalid quantity');

      await expect(
        service.addToCart(userId, productId, 1.5)
      ).rejects.toThrow('Invalid quantity');
    });

    it('should enforce maximum quantity per item', async () => {
      await expect(
        service.addToCart(userId, productId, CART.MAX_QUANTITY_PER_ITEM + 1)
      ).rejects.toThrow(BadRequestException);
    });

    it('should check inventory if tracking is enabled', async () => {
      productRepository.findOne.mockResolvedValue({
        ...mockProduct,
        inventory_quantity: 1,
      });

      await expect(
        service.addToCart(userId, productId, 5)
      ).rejects.toThrow('Insufficient inventory');
    });

    it('should save cart with TTL', async () => {
      await service.addToCart(userId, productId, quantity);

      expect(redis.setex).toHaveBeenCalledWith(
        `cart:${userId}`,
        CART.TTL_SECONDS,
        expect.any(String)
      );
    });

    it('should increment quantity if product already in cart', async () => {
      const existingCart = {
        items: [
          {
            product_id: productId,
            vendor_id: mockProduct.vendor_id,
            quantity: 3,
            price_snapshot: mockProduct.base_price,
          },
        ],
        grouped_by_vendor: {},
        total: 0,
      };

      redis.get.mockResolvedValue(JSON.stringify(existingCart));

      const result = await service.addToCart(userId, productId, quantity);

      expect(result.items[0].quantity).toBe(5); // 3 + 2
    });

    it('should add timestamps to cart', async () => {
      const result = await service.addToCart(userId, productId, quantity);

      expect(redis.setex).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.stringContaining('created_at')
      );

      expect(redis.setex).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.stringContaining('last_updated')
      );
    });
  });

  describe('getCart', () => {
    const userId = 'user-123';

    it('should return empty cart for new user', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getCart(userId);

      expect(result).toMatchObject({
        user_id: userId,
        items: [],
        grouped_by_vendor: {},
        total: 0,
      });
    });

    it('should return existing cart', async () => {
      const mockCart = {
        user_id: userId,
        items: [{ product_id: 'prod-1', quantity: 2 }],
        grouped_by_vendor: {},
        total: 199.98,
      };

      redis.get.mockResolvedValue(JSON.stringify(mockCart));

      const result = await service.getCart(userId);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(199.98);
    });

    it('should renew TTL when cart is accessed', async () => {
      const mockCart = {
        items: [],
        created_at: '2026-01-01T00:00:00.000Z',
      };

      redis.get.mockResolvedValue(JSON.stringify(mockCart));

      await service.getCart(userId);

      expect(redis.expire).toHaveBeenCalledWith(
        `cart:${userId}`,
        CART.TTL_SECONDS
      );
    });

    it('should update last_updated timestamp', async () => {
      const mockCart = {
        items: [],
        created_at: '2026-01-01T00:00:00.000Z',
        last_updated: '2026-01-01T00:00:00.000Z',
      };

      redis.get.mockResolvedValue(JSON.stringify(mockCart));

      const result = await service.getCart(userId);

      expect(result.last_updated).not.toBe(mockCart.last_updated);
    });
  });

  describe('updateQuantity', () => {
    const userId = 'user-123';
    const productId = 'product-456';

    const mockProduct = {
      id: productId,
      status: 'active',
      track_inventory: true,
      inventory_quantity: 10,
    };

    const mockCart = {
      items: [
        {
          product_id: productId,
          vendor_id: 'vendor-1',
          quantity: 5,
          price_snapshot: 99.99,
        },
      ],
      grouped_by_vendor: {},
      total: 0,
    };

    beforeEach(() => {
      redis.get.mockResolvedValue(JSON.stringify(mockCart));
      productRepository.findOne.mockResolvedValue(mockProduct);
      redis.setex.mockResolvedValue('OK');
    });

    it('should update item quantity', async () => {
      const result = await service.updateQuantity(userId, productId, 8);

      expect(result.items[0].quantity).toBe(8);
    });

    it('should remove item if quantity is 0', async () => {
      redis.del.mockResolvedValue(1);

      const result = await service.updateQuantity(userId, productId, 0);

      // Debería llamar removeFromCart que usa del
      expect(result.items).toHaveLength(0);
    });

    it('should validate new quantity against inventory', async () => {
      productRepository.findOne.mockResolvedValue({
        ...mockProduct,
        inventory_quantity: 5,
      });

      await expect(
        service.updateQuantity(userId, productId, 10)
      ).rejects.toThrow('Insufficient inventory');
    });

    it('should validate product is still active', async () => {
      productRepository.findOne.mockResolvedValue({
        ...mockProduct,
        status: 'deleted',
      });

      await expect(
        service.updateQuantity(userId, productId, 3)
      ).rejects.toThrow('Product is no longer available');
    });

    it('should enforce maximum quantity limit', async () => {
      await expect(
        service.updateQuantity(userId, productId, CART.MAX_QUANTITY_PER_ITEM + 1)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('clearCart', () => {
    it('should delete cart from Redis', async () => {
      const userId = 'user-123';
      redis.del.mockResolvedValue(1);

      const result = await service.clearCart(userId);

      expect(redis.del).toHaveBeenCalledWith(`cart:${userId}`);
      expect(result).toEqual({ success: true });
    });
  });

  describe('TTL Management', () => {
    it('should use constant for TTL value', () => {
      expect(CART.TTL_SECONDS).toBe(7 * 24 * 60 * 60);
    });

    it('should set TTL when saving cart', async () => {
      const userId = 'user-123';
      const productId = 'product-456';

      productRepository.findOne.mockResolvedValue({
        id: productId,
        status: 'active',
        track_inventory: false,
        vendor_id: 'vendor-1',
        base_price: 99.99,
      });

      redis.get.mockResolvedValue(null);
      redis.setex.mockResolvedValue('OK');

      await service.addToCart(userId, productId, 2);

      const setexCall = redis.setex.mock.calls[0];
      expect(setexCall[1]).toBe(CART.TTL_SECONDS);
    });
  });
});
