import { faker } from '@faker-js/faker';

export class OrderFactory {
  static createOrder(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      order_number: `ORD-${Date.now()}-${faker.string.alphanumeric(6).toUpperCase()}`,
      user_id: faker.string.uuid(),
      email: faker.internet.email(),
      shipping_address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zip: faker.location.zipCode(),
        country: 'US',
      },
      billing_address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zip: faker.location.zipCode(),
        country: 'US',
      },
      subtotal: parseFloat(faker.commerce.price()),
      shipping_total: 10.00,
      grand_total: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
      payment_status: 'pending',
      stripe_payment_intent_id: null,
      paid_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  static createSubOrder(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      order_id: faker.string.uuid(),
      vendor_id: faker.string.uuid(),
      suborder_number: `ORD-${Date.now()}-1`,
      subtotal: parseFloat(faker.commerce.price()),
      shipping_cost: 10.00,
      total: parseFloat(faker.commerce.price()),
      commission_rate: 10.0,
      commission_amount: 5.00,
      vendor_payout: 45.00,
      status: 'pending',
      created_at: new Date(),
      ...overrides,
    };
  }

  static createOrderItem(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      sub_order_id: faker.string.uuid(),
      product_id: faker.string.uuid(),
      variant_id: null,
      product_title: faker.commerce.productName(),
      quantity: faker.number.int({ min: 1, max: 5 }),
      unit_price: parseFloat(faker.commerce.price()),
      total_price: parseFloat(faker.commerce.price()),
      ...overrides,
    };
  }
}

export class CartFactory {
  static createCart(overrides: any = {}) {
    const items = Array.from({ length: 3 }, () => this.createCartItem());
    const subtotal = items.reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0);

    return {
      user_id: faker.string.uuid(),
      items,
      total_items: items.length,
      subtotal,
      grouped_by_vendor: this.groupByVendor(items),
      ...overrides,
    };
  }

  static createCartItem(overrides: any = {}) {
    const quantity = faker.number.int({ min: 1, max: 3 });
    const price = parseFloat(faker.commerce.price());

    return {
      id: faker.string.uuid(),
      user_id: faker.string.uuid(),
      product_id: faker.string.uuid(),
      vendor_id: faker.string.uuid(),
      variant_id: null,
      quantity,
      price_snapshot: price,
      created_at: new Date(),
      ...overrides,
    };
  }

  static groupByVendor(items: any[]) {
    const grouped: any = {};
    items.forEach((item) => {
      if (!grouped[item.vendor_id]) {
        grouped[item.vendor_id] = {
          items: [],
          subtotal: 0,
          shipping_cost: 10.00,
        };
      }
      grouped[item.vendor_id].items.push(item);
      grouped[item.vendor_id].subtotal += item.price_snapshot * item.quantity;
    });
    return grouped;
  }
}
