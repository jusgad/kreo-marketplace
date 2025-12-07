import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductService {
  private esClient: Client;

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private configService: ConfigService,
  ) {
    this.esClient = new Client({
      node: this.configService.get('ELASTICSEARCH_URL') || 'http://localhost:9200',
    });

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

  async createProduct(vendorId: string, productData: any) {
    const slug = this.generateSlug(productData.title);

    const product = this.productRepository.create({
      ...productData,
      vendor_id: vendorId,
      slug,
      status: productData.status || 'draft',
    });

    await this.productRepository.save(product);

    // Index in Elasticsearch
    if (product.status === 'active') {
      await this.indexProduct(product);
    }

    return product;
  }

  async updateProduct(productId: string, vendorId: string, updateData: any) {
    const product = await this.productRepository.findOne({
      where: { id: productId, vendor_id: vendorId },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    Object.assign(product, updateData);

    if (updateData.title) {
      product.slug = this.generateSlug(updateData.title);
    }

    await this.productRepository.save(product);

    // Update in Elasticsearch
    if (product.status === 'active') {
      await this.indexProduct(product);
    } else {
      await this.removeFromIndex(productId);
    }

    return product;
  }

  async deleteProduct(productId: string, vendorId: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId, vendor_id: vendorId },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    await this.productRepository.softRemove(product);
    await this.removeFromIndex(productId);

    return { success: true };
  }

  async getProduct(productId: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Increment view count
    product.view_count += 1;
    await this.productRepository.save(product);

    return product;
  }

  async getVendorProducts(vendorId: string, page: number = 1, limit: number = 20) {
    const [products, total] = await this.productRepository.findAndCount({
      where: { vendor_id: vendorId },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      products,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async searchProducts(query: {
    q?: string;
    category?: string;
    min_price?: number;
    max_price?: number;
    vendor_id?: string;
    tags?: string[];
    page?: number;
    limit?: number;
    sort?: string;
  }) {
    const { q, category, min_price, max_price, vendor_id, tags, page = 1, limit = 20, sort = 'relevance' } = query;

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

      return {
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
    } catch (error) {
      console.error('Elasticsearch error:', error);
      // Fallback to database search
      return this.fallbackSearch(query);
    }
  }

  private async fallbackSearch(query: any) {
    const { q, page = 1, limit = 20 } = query;

    const where: any = { status: 'active' };
    if (q) {
      where.title = Like(`%${q}%`);
    }

    const [products, total] = await this.productRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      products,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
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
      console.error('Failed to index product:', error);
    }
  }

  private async removeFromIndex(productId: string) {
    try {
      await this.esClient.delete({
        index: 'products',
        id: productId,
      });
    } catch (error) {
      console.error('Failed to remove from index:', error);
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

  async bulkUpload(vendorId: string, products: any[]) {
    const created = [];
    const errors = [];

    for (const productData of products) {
      try {
        const product = await this.createProduct(vendorId, productData);
        created.push(product);
      } catch (error) {
        errors.push({ data: productData, error: error.message });
      }
    }

    return {
      created: created.length,
      failed: errors.length,
      errors,
    };
  }
}
