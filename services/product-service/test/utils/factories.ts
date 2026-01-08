import { faker } from '@faker-js/faker';

export class ProductFactory {
  static createProduct(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      vendor_id: faker.string.uuid(),
      category_id: faker.string.uuid(),
      title: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      slug: faker.helpers.slugify(faker.commerce.productName()).toLowerCase(),
      base_price: parseFloat(faker.commerce.price()),
      stock_quantity: faker.number.int({ min: 0, max: 1000 }),
      status: 'active',
      tags: [faker.commerce.department(), faker.commerce.product()],
      images: [faker.image.url()],
      view_count: faker.number.int({ min: 0, max: 10000 }),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      ...overrides,
    };
  }

  static createMany(count: number, overrides: any = {}) {
    return Array.from({ length: count }, () => this.createProduct(overrides));
  }

  static createDraft(overrides: any = {}) {
    return this.createProduct({ status: 'draft', ...overrides });
  }

  static createOutOfStock(overrides: any = {}) {
    return this.createProduct({ stock_quantity: 0, ...overrides });
  }
}

export class ProductDtoFactory {
  static createProductDto(overrides: any = {}) {
    return {
      title: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      base_price: parseFloat(faker.commerce.price()),
      category_id: faker.string.uuid(),
      stock_quantity: faker.number.int({ min: 1, max: 100 }),
      tags: [faker.commerce.department()],
      status: 'active',
      ...overrides,
    };
  }

  static createSearchDto(overrides: any = {}) {
    return {
      q: faker.commerce.productName(),
      page: 1,
      limit: 20,
      sort: 'relevance',
      ...overrides,
    };
  }
}
