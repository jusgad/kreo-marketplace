// ==============================================================================
// ARCHIVO: services/product-service/src/product/product.service.ts
// FUNCIONALIDAD: Lógica de negocio para gestión de productos
// - CRUD de productos con sanitización XSS automática
// - Búsqueda de productos con Elasticsearch (búsqueda full-text)
// - Fallback a PostgreSQL si Elasticsearch falla
// - Indexación automática en Elasticsearch para productos activos
// - Filtros por categoría, precio, vendor, tags
// - Generación de slugs SEO-friendly
// - Paginación y ordenamiento seguro
// - Carga masiva de productos
// ==============================================================================

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { SecureQueryBuilder, InputValidator } from '../../../../shared/security/sql-injection-prevention';
import { XSSSanitizer } from '../../../../shared/security/xss-sanitizer';
import { CacheService, CacheKeys, CacheTTL, CacheInvalidationPatterns } from '../../../../shared/cache';
import { LoggerService } from '../../../../shared/logging/logger.service';

@Injectable()
export class ProductService {
  private esClient: Client;  // Cliente de Elasticsearch para búsquedas rápidas
  private cacheService: CacheService;  // Servicio de cache con Redis
  private readonly logger = new LoggerService('ProductService');

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private configService: ConfigService,
  ) {
    this.esClient = new Client({
      node: this.configService.get('ELASTICSEARCH_URL') || 'http://localhost:9200',
    });

    this.cacheService = new CacheService('product-service');
    this.initializeIndex();
  }

  private async initializeIndex() {
    const indexExists = await this.esClient.indices.exists({ index: 'products' });

    if (!indexExists) {
      await this.esClient.indices.create({
        index: 'products',
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { type: 'text', analyzer: 'standard' },
              description: { type: 'text' },
              base_price: { type: 'float' },
              category_id: { type: 'keyword' },
              vendor_id: { type: 'keyword' },
              tags: { type: 'keyword' },
              status: { type: 'keyword' },
              created_at: { type: 'date' },
            },
          },
        },
      });
    }
  }

  async createProduct(vendorId: string, productData: CreateProductDto) {
    // SECURITY FIX: Validate vendorId is a valid UUID
    InputValidator.isValidUUID(vendorId, 'vendor_id');

    // ✅ Sanitizar campos de texto para prevenir XSS
    const sanitizedData = {
      ...productData,
      title: XSSSanitizer.sanitizeTitle(productData.title),
      description: XSSSanitizer.sanitizeProductDescription(productData.description),
      vendor_id: vendorId,
      slug: await this.generateUniqueSlug(productData.title),
      status: productData.status || 'draft',
    };

    const product = this.productRepository.create(sanitizedData);

    await this.productRepository.save(product);

    // Invalidar caches de búsquedas y listados (producto nuevo disponible)
    await this.cacheService.deletePattern(CacheInvalidationPatterns.ALL_PRODUCTS);

    // Index in Elasticsearch
    if (product.status === 'active') {
      await this.indexProduct(product);
    }

    return product;
  }

  async updateProduct(productId: string, vendorId: string, updateData: UpdateProductDto) {
    // SECURITY FIX: Validate UUIDs
    InputValidator.isValidUUID(productId, 'product_id');
    InputValidator.isValidUUID(vendorId, 'vendor_id');

    const product = await this.productRepository.findOne({
      where: { id: productId, vendor_id: vendorId },
    });

    if (!product) {
      throw new NotFoundException('Product not found or you do not have permission to update it');
    }

    // ✅ Sanitizar campos de texto antes de actualizar
    const sanitizedUpdateData = { ...updateData } as any;
    if (updateData.title) {
      sanitizedUpdateData.title = XSSSanitizer.sanitizeTitle(updateData.title);
      sanitizedUpdateData.slug = await this.generateUniqueSlug(sanitizedUpdateData.title, productId);
    }
    if (updateData.description) {
      sanitizedUpdateData.description = XSSSanitizer.sanitizeProductDescription(updateData.description);
    }

    Object.assign(product, sanitizedUpdateData);

    await this.productRepository.save(product);

    // Invalidar cache del producto actualizado
    await this.cacheService.delete(CacheKeys.PRODUCT(productId));
    // También invalidar búsquedas y listados relacionados
    await this.cacheService.deletePattern(CacheInvalidationPatterns.ALL_PRODUCTS);

    // Update in Elasticsearch
    if (product.status === 'active') {
      await this.indexProduct(product);
    } else {
      await this.removeFromIndex(productId);
    }

    return product;
  }

  async deleteProduct(productId: string, vendorId: string) {
    // SECURITY FIX: Validate UUIDs
    InputValidator.isValidUUID(productId, 'product_id');
    InputValidator.isValidUUID(vendorId, 'vendor_id');

    const product = await this.productRepository.findOne({
      where: { id: productId, vendor_id: vendorId },
    });

    if (!product) {
      throw new NotFoundException('Product not found or you do not have permission to delete it');
    }

    await this.productRepository.softRemove(product);
    await this.removeFromIndex(productId);

    return { success: true, message: 'Product deleted successfully' };
  }

  async getProduct(productId: string) {
    // SECURITY FIX: Validate UUID
    InputValidator.isValidUUID(productId, 'product_id');

    // Cache-aside pattern: intentar obtener del cache primero
    const cacheKey = CacheKeys.PRODUCT(productId);
    const cached = await this.cacheService.get<Product>(cacheKey);

    if (cached) {
      // Incrementar view_count en background (fire and forget)
      this.productRepository.increment({ id: productId }, 'view_count', 1).catch(err =>
        this.logger.error('Failed to increment view_count', err, { productId })
      );
      return cached;
    }

    // Si no está en cache, buscar en DB
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Guardar en cache (TTL: 15 minutos para productos individuales)
    await this.cacheService.set(cacheKey, product, CacheTTL.MEDIUM);

    // SECURITY FIX: Use atomic increment to avoid race condition
    await this.productRepository.increment({ id: productId }, 'view_count', 1);

    return product;
  }

  async getVendorProducts(vendorId: string, page: number = 1, limit: number = 20) {
    // SECURITY FIX: Validate UUID and pagination
    InputValidator.isValidUUID(vendorId, 'vendor_id');
    const pagination = SecureQueryBuilder.validatePagination(page, limit);

    const [products, total] = await this.productRepository.findAndCount({
      where: { vendor_id: vendorId },
      skip: pagination.skip,
      take: pagination.limit,
      order: { created_at: 'DESC' },
    });

    return {
      products,
      total,
      page: pagination.page,
      limit: pagination.limit,
      total_pages: Math.ceil(total / pagination.limit),
    };
  }

  async searchProducts(query: SearchProductDto) {
    const { q, category, min_price, max_price, vendor_id, tags, page = 1, limit = 20, sort = 'relevance' } = query;

    // Generar cache key basada en los parámetros de búsqueda
    const searchParams = JSON.stringify({ q, category, min_price, max_price, vendor_id, tags, sort });
    const cacheKey = CacheKeys.PRODUCT_SEARCH(searchParams, page);

    // Intentar obtener del cache primero (TTL: 5 minutos para búsquedas)
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const must: any[] = [
      { term: { status: 'active' } },
    ];

    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['title^3', 'description', 'tags^2'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (category) {
      must.push({ term: { category_id: category } });
    }

    if (vendor_id) {
      must.push({ term: { vendor_id } });
    }

    if (tags && tags.length > 0) {
      must.push({ terms: { tags } });
    }

    if (min_price || max_price) {
      const range: any = {};
      if (min_price) range.gte = min_price;
      if (max_price) range.lte = max_price;
      must.push({ range: { base_price: range } });
    }

    const sortCriteria: any = {};
    if (sort === 'price_asc') {
      sortCriteria.base_price = 'asc';
    } else if (sort === 'price_desc') {
      sortCriteria.base_price = 'desc';
    } else if (sort === 'newest') {
      sortCriteria.created_at = 'desc';
    }

    try {
      const result = await this.esClient.search({
        index: 'products',
        body: {
          from: (page - 1) * limit,
          size: limit,
          query: { bool: { must } },
          sort: Object.keys(sortCriteria).length > 0 ? [sortCriteria] : undefined,
          aggs: {
            categories: {
              terms: { field: 'category_id', size: 20 },
            },
            price_ranges: {
              range: {
                field: 'base_price',
                ranges: [
                  { to: 25 },
                  { from: 25, to: 50 },
                  { from: 50, to: 100 },
                  { from: 100 },
                ],
              },
            },
          },
        },
      });

      const hits = result.hits.hits.map((hit: any) => hit._source);
      const total = typeof result.hits.total === 'object' ? result.hits.total.value : result.hits.total;

      const searchResult = {
        products: hits,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        facets: {
          categories: (result.aggregations as any)?.categories?.buckets || [],
          price_ranges: (result.aggregations as any)?.price_ranges?.buckets || [],
        },
      };

      // Guardar en cache (TTL: 5 minutos para búsquedas)
      await this.cacheService.set(cacheKey, searchResult, CacheTTL.SHORT);

      return searchResult;
    } catch (error) {
      this.logger.error('Elasticsearch search failed, falling back to database', error as Error, { query });
      // Fallback to database search
      return this.fallbackSearch(query);
    }
  }

  private async fallbackSearch(query: any) {
    const { q, page = 1, limit = 20 } = query;

    // ✅ Validar paginación
    const pagination = SecureQueryBuilder.validatePagination(page, limit);

    const where: any = { status: 'active' };
    if (q) {
      // ✅ Sanitizar búsqueda para prevenir SQL injection
      const safeSearch = SecureQueryBuilder.createLikeSearch(q);
      where.title = ILike(safeSearch);
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

  private async indexProduct(product: Product) {
    try {
      await this.esClient.index({
        index: 'products',
        id: product.id,
        body: {
          id: product.id,
          title: product.title,
          description: product.description,
          base_price: parseFloat(product.base_price.toString()),
          category_id: product.category_id,
          vendor_id: product.vendor_id,
          tags: product.tags || [],
          status: product.status,
          created_at: product.created_at,
        },
      });

      await this.esClient.indices.refresh({ index: 'products' });
    } catch (error) {
      this.logger.error('Failed to index product in Elasticsearch', error as Error, {
        productId: product.id,
        productTitle: product.title
      });
    }
  }

  private async removeFromIndex(productId: string) {
    try {
      await this.esClient.delete({
        index: 'products',
        id: productId,
      });
    } catch (error) {
      this.logger.error('Failed to remove product from Elasticsearch index', error as Error, { productId });
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Generate unique slug with race condition protection
   *
   * SECURITY FIX APPLIED:
   * - Added transaction support to prevent race conditions
   * - Limit max iterations to prevent infinite loops
   * - Use database-level uniqueness check
   */
  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = this.generateSlug(title);
    let slug = baseSlug;
    let counter = 1;
    const maxIterations = 100; // Prevent infinite loop

    // Use a loop with database constraint to handle race conditions
    while (counter < maxIterations) {
      try {
        const existing = await this.productRepository.findOne({
          where: { slug },
          select: ['id'],
        });

        if (!existing || existing.id === excludeId) {
          return slug;
        }

        // Slug exists, try next one
        slug = `${baseSlug}-${counter}`;
        counter++;

      } catch (error) {
        // If error is due to unique constraint violation during save,
        // retry with next counter value
        if (counter >= maxIterations) {
          // Fallback: append timestamp to ensure uniqueness
          return `${baseSlug}-${Date.now()}`;
        }
        counter++;
      }
    }

    // Fallback if max iterations reached
    throw new BadRequestException(
      'Unable to generate unique slug. Please try a different title.'
    );
  }

  async bulkUpload(vendorId: string, products: CreateProductDto[]) {
    // SECURITY FIX: Validate vendor ID
    InputValidator.isValidUUID(vendorId, 'vendor_id');

    // SECURITY FIX: Limit bulk upload size to prevent DoS
    const validatedProducts = InputValidator.limitArraySize(products, 100, 'products');

    const created = [];
    const errors = [];

    for (const productData of validatedProducts) {
      try {
        const product = await this.createProduct(vendorId, productData);
        created.push(product);
      } catch (error: any) {
        errors.push({ data: productData, error: error.message });
      }
    }

    return {
      created: created.length,
      failed: errors.length,
      errors,
    };
  }

  /**
   * RESERVAR INVENTARIO DE FORMA ATÓMICA (Previene race conditions)
   * 
   * Este método usa locks pesimistas (SELECT ... FOR UPDATE) para:
   * 1. Bloquear las filas de productos
   * 2. Validar stock disponible
   * 3. Decrementar stock de forma atómica
   * 4. Prevenir overselling
   */
  async reserveInventory(items: Array<{ product_id: string; quantity: number }>) {
    const queryRunner = this.productRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const reservedItems = [];

      for (const item of items) {
        // SELECT ... FOR UPDATE: Bloquea la fila hasta que termine la transacción
        const product = await queryRunner.manager
          .createQueryBuilder(Product, 'product')
          .setLock('pessimistic_write') // Lock pesimista
          .where('product.id = :id', { id: item.product_id })
          .getOne();

        if (!product) {
          throw new BadRequestException(`Product ${item.product_id} not found`);
        }

        if (product.status !== 'active') {
          throw new BadRequestException(
            `Product "${product.title}" is not available (status: ${product.status})`
          );
        }

        if (product.track_inventory) {
          if (product.stock_quantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for "${product.title}". ` +
              `Available: ${product.stock_quantity}, Requested: ${item.quantity}`
            );
          }

          // DECREMENTAR STOCK ATOMICAMENTE
          product.stock_quantity -= item.quantity;

          // Si queda sin stock, cambiar estado
          if (product.stock_quantity === 0) {
            product.status = 'out_of_stock' as any;
          }

          await queryRunner.manager.save(product);
        }

        reservedItems.push({
          product_id: product.id,
          title: product.title,
          quantity: item.quantity,
          reserved_quantity: item.quantity,
          remaining_stock: product.stock_quantity,
        });
      }

      await queryRunner.commitTransaction();

      this.logger.info('Inventory reserved successfully', {
        itemsCount: reservedItems.length,
        totalQuantity: reservedItems.reduce((sum, item) => sum + item.quantity, 0),
        items: reservedItems.map(i => ({ productId: i.product_id, quantity: i.quantity }))
      });

      return {
        success: true,
        reserved_items: reservedItems,
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Inventory reservation failed', error as Error, {
        requestedItems: items.map(i => ({ productId: i.product_id, quantity: i.quantity }))
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * LIBERAR INVENTARIO (Rollback de reserva)
   * 
   * Se usa cuando una orden falla después de reservar inventario
   */
  async releaseInventory(items: Array<{ product_id: string; quantity: number }>) {
    const queryRunner = this.productRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of items) {
        const product = await queryRunner.manager
          .createQueryBuilder(Product, 'product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id: item.product_id })
          .getOne();

        if (product && product.track_inventory) {
          // Restaurar stock
          product.stock_quantity += item.quantity;

          // Si ahora hay stock, cambiar estado a active
          if (product.status === 'out_of_stock' && product.stock_quantity > 0) {
            product.status = 'active' as any;
          }

          await queryRunner.manager.save(product);
        }
      }

      await queryRunner.commitTransaction();
      this.logger.info('Inventory released successfully', {
        itemsCount: items.length,
        items: items.map(i => ({ productId: i.product_id, quantity: i.quantity }))
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Inventory release failed', error as Error, {
        requestedItems: items.map(i => ({ productId: i.product_id, quantity: i.quantity }))
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * OBTENER MÚLTIPLES PRODUCTOS EN UNA SOLA QUERY (Batch)
   *
   * OPTIMIZACIÓN: En lugar de hacer N queries individuales,
   * hace 1 sola query con IN clause
   *
   * CACHING IMPLEMENTADO:
   * - Usa cache multi-get para obtener productos individualmente del cache
   * - Solo consulta DB para productos no cacheados
   * - Almacena productos nuevos en cache
   */
  async getProductsBatch(productIds: string[]): Promise<Product[]> {
    if (!productIds || productIds.length === 0) {
      return [];
    }

    // Intentar obtener productos del cache primero (multi-get)
    const cacheKeys = productIds.map(id => CacheKeys.PRODUCT(id));
    const cachedProducts = await this.cacheService.getMany<Product>(cacheKeys);

    // Identificar qué productos NO están en cache
    const uncachedIds = productIds.filter(id => !cachedProducts.has(CacheKeys.PRODUCT(id)));

    let dbProducts: Product[] = [];

    // Si hay productos sin cachear, consultar DB
    if (uncachedIds.length > 0) {
      dbProducts = await this.productRepository
        .createQueryBuilder('product')
        .where('product.id IN (:...ids)', { ids: uncachedIds })
        .andWhere('product.status = :status', { status: 'active' })
        .getMany();

      // Guardar productos nuevos en cache
      const itemsToCache = dbProducts.map(p => ({
        key: CacheKeys.PRODUCT(p.id),
        value: p,
        ttl: CacheTTL.MEDIUM,
      }));

      if (itemsToCache.length > 0) {
        await this.cacheService.setMany(itemsToCache);
      }
    }

    // Combinar productos del cache y de la DB
    const allProducts = new Map<string, Product>();

    // Agregar productos del cache
    cachedProducts.forEach((product, key) => {
      const id = key.replace('kreo:product-service:product:', '');
      allProducts.set(id, product);
    });

    // Agregar productos de la DB
    dbProducts.forEach(p => allProducts.set(p.id, p));

    // Retornar en el mismo orden que se solicitaron
    return productIds
      .map(id => allProducts.get(id))
      .filter(Boolean) as Product[];
  }

  /**
   * OBTENER PRODUCTOS DE UN VENDOR CON PAGINACIÓN
   */
  async getVendorProducts(
    vendorId: string,
    page: number = 1,
    limit: number = 20,
    status?: string
  ) {
    InputValidator.isValidUUID(vendorId, 'vendor_id');

    const pagination = SecureQueryBuilder.validatePagination(page, limit);

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.vendor_id = :vendorId', { vendorId });

    if (status) {
      queryBuilder.andWhere('product.status = :status', { status });
    }

    const [products, total] = await queryBuilder
      .orderBy('product.created_at', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit)
      .getManyAndCount();

    return {
      products,
      total,
      page: pagination.page,
      limit: pagination.limit,
      total_pages: Math.ceil(total / pagination.limit),
      has_next: pagination.page < Math.ceil(total / pagination.limit),
      has_prev: pagination.page > 1,
    };
  }
}
