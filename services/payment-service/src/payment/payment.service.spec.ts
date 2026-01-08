import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { VendorPayout } from '../entities/vendor-payout.entity';
import { PaymentFactory } from '../../test/utils/factories';
import { mockRepository, mockStripe, mockConfigService } from '../../test/utils/mocks';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

describe('PaymentService', () => {
  let service: PaymentService;
  let vendorPayoutRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(VendorPayout),
          useValue: mockRepository<VendorPayout>(),
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    vendorPayoutRepository = module.get(getRepositoryToken(VendorPayout));

    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      const orderId = 'order-123';
      const amount = 100.00;
      const applicationFee = 10.00;
      const paymentIntent = PaymentFactory.createPaymentIntent();

      mockStripe.paymentIntents.create.mockResolvedValue(paymentIntent);

      const result = await service.createPaymentIntent(orderId, amount, applicationFee);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('client_secret');
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // $100 in cents
          currency: 'usd',
          application_fee_amount: 1000, // $10 in cents
        }),
        expect.objectContaining({
          idempotencyKey: `payment_intent_${orderId}`,
        })
      );
    });

    it('should validate order ID is valid UUID', async () => {
      await expect(
        service.createPaymentIntent('invalid-id', 100, 10)
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate amount is positive', async () => {
      const orderId = 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f';

      await expect(
        service.createPaymentIntent(orderId, -100, 10)
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createPaymentIntent(orderId, 0, 10)
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate application fee is not greater than amount', async () => {
      const orderId = 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f';

      await expect(
        service.createPaymentIntent(orderId, 100, 150)
      ).rejects.toThrow(BadRequestException);
    });

    it('should use idempotency key to prevent duplicate charges', async () => {
      const orderId = 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f';
      const paymentIntent = PaymentFactory.createPaymentIntent();

      mockStripe.paymentIntents.create.mockResolvedValue(paymentIntent);

      await service.createPaymentIntent(orderId, 100, 10);
      await service.createPaymentIntent(orderId, 100, 10); // Same order

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledTimes(2);
      expect(mockStripe.paymentIntents.create).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ idempotencyKey: `payment_intent_${orderId}` })
      );
      expect(mockStripe.paymentIntents.create).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({ idempotencyKey: `payment_intent_${orderId}` })
      );
    });

    it('should handle Stripe errors gracefully', async () => {
      const orderId = 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f';

      mockStripe.paymentIntents.create.mockRejectedValue({
        type: 'StripeCardError',
        message: 'Card declined',
      });

      await expect(
        service.createPaymentIntent(orderId, 100, 10)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('executeTransfers', () => {
    it('should execute transfers to vendors successfully', async () => {
      const orderId = 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f';
      const subOrders = [
        {
          vendor_id: 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f',
          stripe_account_id: 'acct_123',
          vendor_payout: 45.00,
          sub_order_id: 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f',
        },
      ];

      const transfer = PaymentFactory.createTransfer();
      mockStripe.transfers.create.mockResolvedValue(transfer);
      vendorPayoutRepository.create.mockImplementation((data) => data);
      vendorPayoutRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.executeTransfers(orderId, subOrders);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('status', 'success');
      expect(mockStripe.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 4500, // $45 in cents
          currency: 'usd',
          destination: 'acct_123',
        })
      );
      expect(vendorPayoutRepository.save).toHaveBeenCalled();
    });

    it('should validate order ID and sub-order IDs', async () => {
      await expect(
        service.executeTransfers('invalid-id', [])
      ).rejects.toThrow(BadRequestException);
    });

    it('should limit number of sub-orders to 50', async () => {
      const orderId = 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f';
      const subOrders = Array(51).fill({
        vendor_id: 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f',
        stripe_account_id: 'acct_123',
        vendor_payout: 45.00,
        sub_order_id: 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f',
      });

      await expect(
        service.executeTransfers(orderId, subOrders)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle failed transfers and record them', async () => {
      const orderId = 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f';
      const subOrders = [
        {
          vendor_id: 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f',
          stripe_account_id: 'acct_123',
          vendor_payout: 45.00,
          sub_order_id: 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f',
        },
      ];

      mockStripe.transfers.create.mockRejectedValue(new Error('Transfer failed'));
      vendorPayoutRepository.create.mockImplementation((data) => data);
      vendorPayoutRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.executeTransfers(orderId, subOrders);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('status', 'failed');
      expect(vendorPayoutRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          failure_reason: 'Transfer failed',
        })
      );
    });
  });

  describe('createConnectedAccount', () => {
    it('should create Stripe Connect account successfully', async () => {
      const email = 'vendor@example.com';
      const account = PaymentFactory.createStripeAccount({ email });

      mockStripe.accounts.create.mockResolvedValue(account);

      const result = await service.createConnectedAccount(email);

      expect(result).toHaveProperty('account_id');
      expect(result).toHaveProperty('email', email);
      expect(mockStripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'express',
          email,
        })
      );
    });

    it('should validate email format', async () => {
      await expect(
        service.createConnectedAccount('invalid-email')
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate country code', async () => {
      await expect(
        service.createConnectedAccount('vendor@example.com', 'INVALID')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createAccountLink', () => {
    it('should create account onboarding link', async () => {
      const accountId = 'acct_123';
      const refreshUrl = 'http://localhost:3000/refresh';
      const returnUrl = 'http://localhost:3000/return';

      mockStripe.accountLinks.create.mockResolvedValue({
        url: 'https://connect.stripe.com/setup/...',
        expires_at: 1234567890,
      });

      const result = await service.createAccountLink(accountId, refreshUrl, returnUrl);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('expires_at');
    });

    it('should validate redirect URLs are from allowed domains', async () => {
      const accountId = 'acct_123';
      const maliciousUrl = 'http://evil.com/steal';
      const validUrl = 'http://localhost:3000/return';

      await expect(
        service.createAccountLink(accountId, maliciousUrl, validUrl)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getVendorPayouts', () => {
    it('should get vendor payout history', async () => {
      const vendorId = 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f';
      const payouts = [
        PaymentFactory.createVendorPayout({ vendor_id: vendorId }),
        PaymentFactory.createVendorPayout({ vendor_id: vendorId }),
      ];

      vendorPayoutRepository.find.mockResolvedValue(payouts);

      const result = await service.getVendorPayouts(vendorId);

      expect(result).toHaveLength(2);
      expect(vendorPayoutRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vendor_id: vendorId },
          order: { created_at: 'DESC' },
        })
      );
    });

    it('should limit pagination to 100 max', async () => {
      const vendorId = 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f';

      vendorPayoutRepository.find.mockResolvedValue([]);

      await service.getVendorPayouts(vendorId, 200);

      expect(vendorPayoutRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Should be capped
        })
      );
    });
  });

  describe('getVendorEarnings', () => {
    it('should calculate total earnings for vendor', async () => {
      const vendorId = 'f7b3c1e4-5a2d-4c8e-9f1a-3b7e6d2c4a8f';

      const mockQueryBuilder = vendorPayoutRepository.createQueryBuilder();
      mockQueryBuilder.getRawOne.mockResolvedValue({
        total_earnings: '500.00',
        total_commission: '50.00',
      });

      const result = await service.getVendorEarnings(vendorId);

      expect(result).toHaveProperty('total_earnings', 500);
      expect(result).toHaveProperty('total_commission', 50);
    });
  });
});
