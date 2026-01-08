import { faker } from '@faker-js/faker';

export class PaymentFactory {
  static createPaymentIntent(overrides: any = {}) {
    return {
      id: `pi_${faker.string.alphanumeric(24)}`,
      amount: faker.number.int({ min: 1000, max: 100000 }),
      currency: 'usd',
      status: 'succeeded',
      client_secret: `pi_${faker.string.alphanumeric(24)}_secret_${faker.string.alphanumeric(16)}`,
      metadata: {
        order_id: faker.string.uuid(),
      },
      ...overrides,
    };
  }

  static createTransfer(overrides: any = {}) {
    return {
      id: `tr_${faker.string.alphanumeric(24)}`,
      amount: faker.number.int({ min: 1000, max: 50000 }),
      currency: 'usd',
      destination: `acct_${faker.string.alphanumeric(16)}`,
      transfer_group: `ORDER_${faker.string.uuid()}`,
      ...overrides,
    };
  }

  static createVendorPayout(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      vendor_id: faker.string.uuid(),
      sub_order_id: faker.string.uuid(),
      gross_amount: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
      commission_amount: 5.00,
      net_amount: 45.00,
      stripe_transfer_id: `tr_${faker.string.alphanumeric(24)}`,
      status: 'processing',
      created_at: new Date(),
      ...overrides,
    };
  }

  static createStripeAccount(overrides: any = {}) {
    return {
      id: `acct_${faker.string.alphanumeric(16)}`,
      type: 'express',
      email: faker.internet.email(),
      charges_enabled: true,
      payouts_enabled: true,
      ...overrides,
    };
  }
}
