import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ProductService } from './product.service';
import { Product } from '../entities/product.entity';
import { ProductFactory, ProductDtoFactory } from '../../test/utils/factories';
import { mockRepository, mockConfigService, mockElasticsearchClient } from '../../test/utils/mocks';

// Mock Elasticsearch Client
jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => mockElasticsearchClient),
}));

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository<Product>(),
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepository = module.get(getRepositoryToken(Product));

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const vendorId = 'vendor-123';
      const productDto = ProductDtoFactory.createProductDto();
      const createdProduct = ProductFactory.createProduct({ vendor_id: vendorId });

      productRepository.create.mockReturnValue(createdProduct);
      productRepository.save.mockResolvedValue(createdProduct);
      productRepository.findOne.mockResolvedValue(null); // No slug conflict

      const result = await service.createProduct(vendorId, productDto);

      expect(result).toHaveProperty('id');
      expect(result.vendor_id).toBe(vendorId);
      expect(productRepository.create).toHaveBeenCalled();
      expect(productRepository.save).toHaveBeenCalled();
    });

    it('should sanitize XSS in title and description', async () => {
      const vendorId = 'vendor-123';
      const maliciousDto = ProductDtoFactory.createProductDto({
        title: '<script>alert("XSS")</script>Product',
        description: '<img src=x onerror=alert("XSS")>Description',
      });

      productRepository.create.mockReturnValue({});
      productRepository.save.mockResolvedValue({});
      productRepository.findOne.mockResolvedValue(null);

      await service.createProduct(vendorId, maliciousDto);

      // Verify XSS sanitization was applied
      expect(productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor_id: vendorId,
        })
      );
    });

    it('should index product in Elasticsearch if status is active', async () => {
      const vendorId = 'vendor-123';
      const productDto = ProductDtoFactory.createProductDto({ status: 'active' });
      const createdProduct = ProductFactory.createProduct({ vendor_id: vendorId, status: 'active' });

      productRepository.create.mockReturnValue(createdProduct);
      productRepository.save.mockResolvedValue(createdProduct);
      productRepository.findOne.mockResolvedValue(null);

      await service.createProduct(vendorId, productDto);

      expect(mockElasticsearchClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'products',
          id: createdProduct.id,
        })
      );
    });

    it('should not index draft products in Elasticsearch', async () => {
      const vendorId = 'vendor-123';
      const productDto = ProductDtoFactory.createProductDto({ status: 'draft' });
      const createdProduct = ProductFactory.createDraft({ vendor_id: vendorId });

      productRepository.create.mockReturnValue(createdProduct);
      productRepository.save.mockResolvedValue(createdProduct);
      productRepository.findOne.mockResolvedValue(null);

      await service.createProduct(vendorId, productDto);

      expect(mockElasticsearchClient.index).not.toHaveBeenCalled();
    });

    it('should generate unique slug from title', async () => {
      const vendorId = 'vendor-123';
      const productDto = ProductDtoFactory.createProductDto({ title: 'Test Product Name' });

      productRepository.create.mockImplementation((data) => data);
      productRepository.save.mockImplementation((data) => data);
      productRepository.findOne.mockResolvedValue(null);

      await service.createProduct(vendorId, productDto);

      expect(productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: expect.stringMatching(/^test-product-name/),
        })
      );
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const productId = 'product-123';
      const vendorId = 'vendor-123';
      const updateDto = { title: 'Updated Title' };
      const existingProduct = ProductFactory.createProduct({ id: productId, vendor_id: vendorId });

      productRepository.findOne.mockResolvedValue(existingProduct);
      productRepository.save.mockResolvedValue({ ...existingProduct, ...updateDto });

      const result = await service.updateProduct(productId, vendorId, updateDto);

      expect(result).toBeDefined();
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: productId, vendor_id: vendorId },
      });
      expect(productRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      const productId = 'non-existent';
      const vendorId = 'vendor-123';
      const updateDto = { title: 'Updated Title' };

      productRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProduct(productId, vendorId, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if vendor does not own product', async () => {
      const productId = 'product-123';
      const vendorId = 'vendor-123';
      const wrongVendorId = 'vendor-456';
      const updateDto = { title: 'Updated Title' };
      const existingProduct = ProductFactory.createProduct({ id: productId, vendor_id: vendorId });

      productRepository.findOne.mockResolvedValue(null); // Product not found for wrong vendor

      await expect(service.updateProduct(productId, wrongVendorId, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should update Elasticsearch index when status changes to active', async () => {
      const productId = 'product-123';
      const vendorId = 'vendor-123';
      const updateDto = { status: 'active' };
      const existingProduct = ProductFactory.createProduct({ id: productId, vendor_id: vendorId, status: 'draft' });

      productRepository.findOne.mockResolvedValue(existingProduct);
      productRepository.save.mockResolvedValue({ ...existingProduct, status: 'active' });

      await service.updateProduct(productId, vendorId, updateDto);

      expect(mockElasticsearchClient.index).toHaveBeenCalled();
    });

    it('should remove from Elasticsearch when status changes to draft', async () => {
      const productId = 'product-123';
      const vendorId = 'vendor-123';
      const updateDto = { status: 'draft' };
      const existingProduct = ProductFactory.createProduct({ id: productId, vendor_id: vendorId, status: 'active' });

      productRepository.findOne.mockResolvedValue(existingProduct);
      productRepository.save.mockResolvedValue({ ...existingProduct, status: 'draft' });

      await service.updateProduct(productId, vendorId, updateDto);

      expect(mockElasticsearchClient.delete).toHaveBeenCalledWith({
        index: 'products',
        id: productId,
      });
    });
  });

  describe('deleteProduct', () => {
    it('should soft delete product successfully', async () => {
      const productId = 'product-123';
      const vendorId = 'vendor-123';
      const existingProduct = ProductFactory.createProduct({ id: productId, vendor_id: vendorId });

      productRepository.findOne.mockResolvedValue(existingProduct);
      productRepository.softRemove.mockResolvedValue(existingProduct);

      const result = await service.deleteProduct(productId, vendorId);

      expect(result).toHaveProperty('success', true);
      expect(productRepository.softRemove).toHaveBeenCalledWith(existingProduct);
      expect(mockElasticsearchClient.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteProduct('non-existent', 'vendor-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProduct', () => {
    it('should get product by id and increment view count', async () => {
      const productId = 'product-123';
      const product = ProductFactory.createProduct({ id: productId });

      productRepository.findOne.mockResolvedValue(product);
      productRepository.increment.mockResolvedValue({ affected: 1 });

      const result = await service.getProduct(productId);

      expect(result).toEqual(product);
      expect(productRepository.increment).toHaveBeenCalledWith(
        { id: productId },
        'view_count',
        1
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.getProduct('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchProducts', () => {
    it('should search products using Elasticsearch', async () => {
      const searchDto = ProductDtoFactory.createSearchDto({ q: 'laptop' });
      const products = ProductFactory.createMany(5);

      mockElasticsearchClient.search.mockResolvedValue({
        hits: {
          hits: products.map((p) => ({ _source: p })),
          total: { value: 5 },
        },
        aggregations: {
          categories: { buckets: [] },
          price_ranges: { buckets: [] },
        },
      });

      const result = await service.searchProducts(searchDto);

      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('total', 5);
      expect(result).toHaveProperty('facets');
      expect(mockElasticsearchClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'products',
        })
      );
    });

    it('should filter by category', async () => {
      const searchDto = ProductDtoFactory.createSearchDto({ category: 'electronics' });

      mockElasticsearchClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
        aggregations: {},
      });

      await service.searchProducts(searchDto);

      expect(mockElasticsearchClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                must: expect.arrayContaining([
                  expect.objectContaining({ term: { category_id: 'electronics' } }),
                ]),
              }),
            }),
          }),
        })
      );
    });

    it('should filter by price range', async () => {
      const searchDto = ProductDtoFactory.createSearchDto({ min_price: 10, max_price: 100 });

      mockElasticsearchClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
        aggregations: {},
      });

      await service.searchProducts(searchDto);

      expect(mockElasticsearchClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                must: expect.arrayContaining([
                  expect.objectContaining({
                    range: expect.objectContaining({
                      base_price: { gte: 10, lte: 100 },
                    }),
                  }),
                ]),
              }),
            }),
          }),
        })
      );
    });

    it('should fallback to database search if Elasticsearch fails', async () => {
      const searchDto = ProductDtoFactory.createSearchDto({ q: 'laptop' });
      const products = ProductFactory.createMany(3);

      mockElasticsearchClient.search.mockRejectedValue(new Error('ES connection failed'));
      productRepository.findAndCount.mockResolvedValue([products, 3]);

      const result = await service.searchProducts(searchDto);

      expect(result).toHaveProperty('products');
      expect(result.products).toHaveLength(3);
      expect(productRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('getVendorProducts', () => {
    it('should get all products for a vendor with pagination', async () => {
      const vendorId = 'vendor-123';
      const products = ProductFactory.createMany(10, { vendor_id: vendorId });

      productRepository.findAndCount.mockResolvedValue([products, 10]);

      const result = await service.getVendorProducts(vendorId, 1, 20);

      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('total', 10);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
      expect(productRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vendor_id: vendorId },
        })
      );
    });

    it('should validate pagination parameters', async () => {
      const vendorId = 'vendor-123';

      productRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getVendorProducts(vendorId, 1, 20);

      expect(productRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });
  });

  describe('bulkUpload', () => {
    it('should upload multiple products successfully', async () => {
      const vendorId = 'vendor-123';
      const products = [
        ProductDtoFactory.createProductDto(),
        ProductDtoFactory.createProductDto(),
      ];

      productRepository.create.mockImplementation((data) => data);
      productRepository.save.mockImplementation((data) => Promise.resolve(data));
      productRepository.findOne.mockResolvedValue(null);

      const result = await service.bulkUpload(vendorId, products);

      expect(result).toHaveProperty('created', 2);
      expect(result).toHaveProperty('failed', 0);
      expect(result.errors).toHaveLength(0);
    });

    it('should limit bulk upload to 100 products', async () => {
      const vendorId = 'vendor-123';
      const products = Array(150).fill(ProductDtoFactory.createProductDto());

      productRepository.create.mockImplementation((data) => data);
      productRepository.save.mockImplementation((data) => Promise.resolve(data));
      productRepository.findOne.mockResolvedValue(null);

      const result = await service.bulkUpload(vendorId, products);

      expect(result.created).toBeLessThanOrEqual(100);
    });

    it('should handle partial failures in bulk upload', async () => {
      const vendorId = 'vendor-123';
      const products = [
        ProductDtoFactory.createProductDto(),
        ProductDtoFactory.createProductDto(),
      ];

      productRepository.create.mockImplementation((data) => data);
      productRepository.save
        .mockResolvedValueOnce(products[0])
        .mockRejectedValueOnce(new Error('Database error'));
      productRepository.findOne.mockResolvedValue(null);

      const result = await service.bulkUpload(vendorId, products);

      expect(result.created).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });
});
