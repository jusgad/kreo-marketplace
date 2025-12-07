import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { VendorPayout } from '../entities/vendor-payout.entity';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(VendorPayout)
    private vendorPayoutRepository: Repository<VendorPayout>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create Stripe Connect account for vendor
   */
  async createConnectedAccount(email: string, country: string = 'US') {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      return {
        account_id: account.id,
        email: account.email,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create Stripe account: ${error.message}`);
    }
  }

  /**
   * Generate account onboarding link
   */
  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return {
        url: accountLink.url,
        expires_at: accountLink.expires_at,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create account link: ${error.message}`);
    }
  }

  /**
   * Create payment intent with application fee (Kreo commission)
   */
  async createPaymentIntent(orderId: string, amount: number, applicationFee: number, metadata: any = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payment_method_types: ['card'],
        application_fee_amount: Math.round(applicationFee * 100),
        metadata: {
          order_id: orderId,
          ...metadata,
        },
      });

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Execute split payment transfers to vendors
   */
  async executeTransfers(orderId: string, subOrders: Array<{
    vendor_id: string;
    stripe_account_id: string;
    vendor_payout: number;
    sub_order_id: string;
  }>) {
    const transfers = [];

    for (const subOrder of subOrders) {
      try {
        const transfer = await this.stripe.transfers.create({
          amount: Math.round(subOrder.vendor_payout * 100),
          currency: 'usd',
          destination: subOrder.stripe_account_id,
          transfer_group: `ORDER_${orderId}`,
          metadata: {
            order_id: orderId,
            sub_order_id: subOrder.sub_order_id,
            vendor_id: subOrder.vendor_id,
          },
        });

        // Record payout in database
        const payout = this.vendorPayoutRepository.create({
          vendor_id: subOrder.vendor_id,
          sub_order_id: subOrder.sub_order_id,
          gross_amount: subOrder.vendor_payout,
          commission_amount: 0, // Already deducted
          net_amount: subOrder.vendor_payout,
          stripe_transfer_id: transfer.id,
          status: 'processing',
        });

        await this.vendorPayoutRepository.save(payout);

        transfers.push({
          transfer_id: transfer.id,
          vendor_id: subOrder.vendor_id,
          amount: subOrder.vendor_payout,
          status: 'success',
        });
      } catch (error) {
        // Record failed transfer
        const payout = this.vendorPayoutRepository.create({
          vendor_id: subOrder.vendor_id,
          sub_order_id: subOrder.sub_order_id,
          gross_amount: subOrder.vendor_payout,
          net_amount: subOrder.vendor_payout,
          status: 'failed',
          failure_reason: error.message,
        });

        await this.vendorPayoutRepository.save(payout);

        transfers.push({
          vendor_id: subOrder.vendor_id,
          amount: subOrder.vendor_payout,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return transfers;
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;

        case 'transfer.created':
          await this.handleTransferCreated(event.data.object);
          break;

        case 'transfer.failed':
          await this.handleTransferFailed(event.data.object);
          break;

        case 'account.updated':
          await this.handleAccountUpdated(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: any) {
    console.log('✅ Payment succeeded:', paymentIntent.id);
    // Trigger order service to execute transfers
    // This would typically be done via event bus or API call
  }

  private async handleTransferCreated(transfer: any) {
    console.log('💸 Transfer created:', transfer.id);

    // Update payout status
    await this.vendorPayoutRepository.update(
      { stripe_transfer_id: transfer.id },
      { status: 'processing' },
    );
  }

  private async handleTransferFailed(transfer: any) {
    console.log('❌ Transfer failed:', transfer.id);

    await this.vendorPayoutRepository.update(
      { stripe_transfer_id: transfer.id },
      {
        status: 'failed',
        failure_reason: transfer.failure_message,
      },
    );
  }

  private async handleAccountUpdated(account: any) {
    console.log('🔄 Account updated:', account.id);
    // Update vendor stripe_onboarding_completed status
  }

  /**
   * Get vendor payout history
   */
  async getVendorPayouts(vendorId: string, limit: number = 50) {
    return this.vendorPayoutRepository.find({
      where: { vendor_id: vendorId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Calculate total earnings for vendor
   */
  async getVendorEarnings(vendorId: string) {
    const result = await this.vendorPayoutRepository
      .createQueryBuilder('payout')
      .select('SUM(payout.net_amount)', 'total_earnings')
      .addSelect('SUM(payout.commission_amount)', 'total_commission')
      .where('payout.vendor_id = :vendorId', { vendorId })
      .andWhere('payout.status = :status', { status: 'paid' })
      .getRawOne();

    return {
      total_earnings: parseFloat(result.total_earnings) || 0,
      total_commission: parseFloat(result.total_commission) || 0,
    };
  }
}
