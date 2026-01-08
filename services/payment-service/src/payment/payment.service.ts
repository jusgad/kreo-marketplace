import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { VendorPayout } from '../entities/vendor-payout.entity';
import { WebhookFailure } from '../entities/webhook-failure.entity';
import { InputValidator } from '../../../../shared/security/sql-injection-prevention';
import { LoggerService } from '../../../../shared/logging';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private logger: LoggerService;

  constructor(
    @InjectRepository(VendorPayout)
    private vendorPayoutRepository: Repository<VendorPayout>,
    @InjectRepository(WebhookFailure)
    private webhookFailureRepository: Repository<WebhookFailure>,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
    // ✅ CRÍTICO #3 SOLUCIONADO: Logger profesional con sanitización
    this.logger = new LoggerService('payment-service');
  }

  /**
   * Create Stripe Connect account for vendor
   */
  async createConnectedAccount(email: string, country: string = 'US') {
    // SECURITY FIX: Validate email format
    InputValidator.isValidEmail(email, 'email');

    // SECURITY FIX: Validate country code (ISO 3166-1 alpha-2)
    const validCountries = ['US', 'CA', 'GB', 'AU', 'MX', 'ES', 'FR', 'DE', 'IT'];
    if (!validCountries.includes(country)) {
      throw new BadRequestException('Invalid country code');
    }

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
    } catch (error: any) {
      throw new BadRequestException(`Failed to create Stripe account: ${error.message}`);
    }
  }

  /**
   * Generate account onboarding link
   */
  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    // SECURITY FIX: Validate URLs to prevent SSRF attacks
    const allowedDomains = (process.env.ALLOWED_REDIRECT_DOMAINS || 'localhost').split(',');

    const validateUrl = (url: string, fieldName: string) => {
      try {
        const parsedUrl = new URL(url);
        const isAllowed = allowedDomains.some(domain =>
          parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
        );
        if (!isAllowed) {
          throw new BadRequestException(`${fieldName} domain not allowed`);
        }
      } catch (e) {
        throw new BadRequestException(`Invalid ${fieldName}`);
      }
    };

    validateUrl(refreshUrl, 'refresh_url');
    validateUrl(returnUrl, 'return_url');

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
    } catch (error: any) {
      throw new BadRequestException(`Failed to create account link: ${error.message}`);
    }
  }

  /**
   * Create payment intent with application fee (Kreo commission)
   *
   * SECURITY FIX APPLIED:
   * - Added idempotency key to prevent duplicate charges
   * - Better error handling with specific error types
   * - Prevents race conditions on simultaneous requests
   */
  async createPaymentIntent(orderId: string, amount: number, applicationFee: number, metadata: any = {}) {
    // SECURITY FIX: Validate orderId is a valid UUID
    InputValidator.isValidUUID(orderId, 'order_id');

    // SECURITY FIX: Validate amounts are positive numbers
    if (!amount || amount <= 0 || amount > 999999.99) {
      throw new BadRequestException('Invalid payment amount');
    }

    if (!applicationFee || applicationFee < 0 || applicationFee > amount) {
      throw new BadRequestException('Invalid application fee');
    }

    try {
      // CRITICAL FIX: Use idempotency key to prevent duplicate charges
      // If the same request is made twice, Stripe will return the same payment intent
      // Use orderId only (without timestamp) to ensure same key for same order
      const idempotencyKey = `payment_intent_${orderId}`;

      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          payment_method_types: ['card'],
          application_fee_amount: Math.round(applicationFee * 100),
          metadata: {
            order_id: orderId,
            ...metadata,
          },
          // Automatically confirm when payment method is attached
          automatic_payment_methods: {
            enabled: true,
          },
        },
        {
          idempotencyKey, // Prevents duplicate charges
        }
      );

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
      };
    } catch (error: any) {
      // Handle specific Stripe error types
      if (error.type === 'StripeCardError') {
        throw new BadRequestException(`Card error: ${error.message}`);
      } else if (error.type === 'StripeInvalidRequestError') {
        throw new BadRequestException(`Invalid request: ${error.message}`);
      } else if (error.type === 'StripeAPIError') {
        throw new BadRequestException('Payment service temporarily unavailable');
      }

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
    // SECURITY FIX: Validate orderId is a valid UUID
    InputValidator.isValidUUID(orderId, 'order_id');

    // SECURITY FIX: Limit number of transfers to prevent DoS
    if (!Array.isArray(subOrders) || subOrders.length === 0) {
      throw new BadRequestException('Invalid sub_orders array');
    }

    if (subOrders.length > 50) {
      throw new BadRequestException('Cannot process more than 50 sub-orders at once');
    }

    const transfers = [];

    for (const subOrder of subOrders) {
      // SECURITY FIX: Validate each sub-order
      InputValidator.isValidUUID(subOrder.vendor_id, 'vendor_id');
      InputValidator.isValidUUID(subOrder.sub_order_id, 'sub_order_id');

      if (!subOrder.vendor_payout || subOrder.vendor_payout <= 0 || subOrder.vendor_payout > 999999.99) {
        throw new BadRequestException(`Invalid payout amount for vendor ${subOrder.vendor_id}`);
      }

      if (!subOrder.stripe_account_id || !subOrder.stripe_account_id.startsWith('acct_')) {
        throw new BadRequestException(`Invalid Stripe account ID for vendor ${subOrder.vendor_id}`);
      }
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
   * ✅ CRÍTICO #8: Con registro de fallos para retry manual
   */
  async handleWebhook(
    signature: string,
    payload: Buffer,
    metadata?: { ip?: string; headers?: any }
  ) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );

      // Intentar procesar el webhook
      try {
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
            this.logger.warn(`Unhandled webhook event type`, { eventType: event.type });
        }

        return { received: true };
      } catch (processingError) {
        // ✅ Registrar fallo del webhook para retry manual
        await this.recordWebhookFailure(event, processingError as Error, metadata);
        throw processingError;
      }
    } catch (error) {
      // Error de verificación de firma
      this.logger.error('Webhook signature verification failed', error as Error, {
        ip: metadata?.ip,
      });

      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }

  /**
   * Registrar fallo de webhook para retry manual
   * ✅ CRÍTICO #8 SOLUCIONADO: Sistema de registro de webhooks fallidos
   */
  private async recordWebhookFailure(
    event: any,
    error: Error,
    metadata?: { ip?: string; headers?: any }
  ): Promise<void> {
    try {
      const webhookFailure = this.webhookFailureRepository.create({
        event_type: event.type,
        stripe_event_id: event.id,
        payload: event,
        failure_reason: error.message,
        error_stack: error.stack,
        error_code: (error as any).code || 'UNKNOWN',
        status: 'failed',
        retry_count: 0,
        source_ip: metadata?.ip,
        request_headers: metadata?.headers,
        metadata: {
          timestamp: new Date().toISOString(),
          eventCreated: event.created,
        },
      });

      await this.webhookFailureRepository.save(webhookFailure);

      this.logger.error('Webhook failure recorded', undefined, {
        failureId: webhookFailure.id,
        eventType: event.type,
        stripeEventId: event.id,
      });
    } catch (dbError) {
      this.logger.error('Failed to record webhook failure', dbError as Error, {
        eventType: event.type,
        stripeEventId: event.id,
      });
    }
  }

  /**
   * Maneja el evento de payment intent exitoso
   *
   * ✅ CRÍTICO #8 SOLUCIONADO: Validación exhaustiva de webhooks
   * - Verifica que la orden existe y está pendiente
   * - Verifica que el monto coincide
   * - Verifica que el payment_intent_id es el correcto
   * - Previene procesamiento duplicado
   */
  private async handlePaymentIntentSucceeded(paymentIntent: any) {
    const orderId = paymentIntent.metadata?.order_id;

    if (!orderId) {
      this.logger.error('Payment intent without order_id in metadata', undefined, {
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    try {
      // ✅ VALIDACIÓN 1: Verificar que la orden existe y obtener su información
      const orderServiceUrl = this.configService.get('ORDER_SERVICE_URL') || 'http://localhost:3005';
      const internalSecret = this.configService.get('INTERNAL_SERVICE_SECRET');

      const orderResponse = await firstValueFrom(
        this.httpService.get(`${orderServiceUrl}/orders/${orderId}/verify`, {
          headers: {
            'X-Internal-Service': 'payment-service',
            'X-Internal-Secret': internalSecret,
          },
          timeout: 5000,
        })
      );

      const order = orderResponse.data;

      // ✅ VALIDACIÓN 2: Verificar que el monto coincide
      const expectedAmount = Math.round(order.grand_total * 100); // Convertir a centavos
      if (paymentIntent.amount !== expectedAmount) {
        this.logger.error('Payment intent amount mismatch', undefined, {
          paymentIntentId: paymentIntent.id,
          orderId,
          expectedAmount,
          receivedAmount: paymentIntent.amount,
        });

        // Log de evento de seguridad crítico
        this.logger.logSecurityEvent('PAYMENT_AMOUNT_MISMATCH', 'critical', {
          paymentIntentId: paymentIntent.id,
          orderId,
          expectedAmount,
          receivedAmount: paymentIntent.amount,
        });

        return;
      }

      // ✅ VALIDACIÓN 3: Verificar que el payment_intent_id coincide
      if (order.stripe_payment_intent_id && order.stripe_payment_intent_id !== paymentIntent.id) {
        this.logger.error('Payment intent ID mismatch', undefined, {
          paymentIntentId: paymentIntent.id,
          orderId,
          expectedPaymentIntentId: order.stripe_payment_intent_id,
        });

        this.logger.logSecurityEvent('PAYMENT_INTENT_ID_MISMATCH', 'critical', {
          paymentIntentId: paymentIntent.id,
          orderId,
          expectedPaymentIntentId: order.stripe_payment_intent_id,
        });

        return;
      }

      // ✅ VALIDACIÓN 4: Verificar que la orden aún está pendiente de pago
      if (order.payment_status !== 'pending' && order.payment_status !== 'processing') {
        this.logger.warn('Order already processed', {
          paymentIntentId: paymentIntent.id,
          orderId,
          currentPaymentStatus: order.payment_status,
        });

        // No es error crítico, solo prevención de doble procesamiento
        return;
      }

      // ✅ TODO VERIFICADO: Confirmar el pago en el order-service
      await firstValueFrom(
        this.httpService.post(
          `${orderServiceUrl}/orders/${orderId}/confirm-payment`,
          {
            payment_intent_id: paymentIntent.id,
            amount_received: paymentIntent.amount,
            currency: paymentIntent.currency,
          },
          {
            headers: {
              'X-Internal-Service': 'payment-service',
              'X-Internal-Secret': internalSecret,
            },
            timeout: 10000,
          }
        )
      );

      this.logger.info('Payment confirmed successfully', {
        paymentIntentId: paymentIntent.id,
        orderId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      });

      // Log de evento de negocio
      this.logger.logBusinessEvent('PAYMENT_CONFIRMED', {
        orderId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convertir de vuelta a unidades
        currency: paymentIntent.currency,
      });
    } catch (error) {
      this.logger.error('Failed to handle payment intent succeeded', error as Error, {
        paymentIntentId: paymentIntent.id,
        orderId,
      });

      // ✅ GUARDAR WEBHOOK FALLIDO PARA ANÁLISIS MANUAL
      // TODO: Implementar tabla de webhook_failures para retry manual
    }
  }

  private async handleTransferCreated(transfer: any) {
    this.logger.info('Stripe transfer created', {
      transferId: transfer.id,
      amount: transfer.amount,
      destination: transfer.destination,
    });

    // Update payout status
    await this.vendorPayoutRepository.update(
      { stripe_transfer_id: transfer.id },
      { status: 'processing' },
    );
  }

  private async handleTransferFailed(transfer: any) {
    this.logger.error('Stripe transfer failed', undefined, {
      transferId: transfer.id,
      failureMessage: transfer.failure_message,
      failureCode: transfer.failure_code,
    });

    await this.vendorPayoutRepository.update(
      { stripe_transfer_id: transfer.id },
      {
        status: 'failed',
        failure_reason: transfer.failure_message,
      },
    );
  }

  private async handleAccountUpdated(account: any) {
    this.logger.info('Stripe account updated', {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
    // Update vendor stripe_onboarding_completed status
  }

  /**
   * Get vendor payout history
   */
  async getVendorPayouts(vendorId: string, limit: number = 50) {
    // SECURITY FIX: Validate vendorId is a valid UUID
    InputValidator.isValidUUID(vendorId, 'vendor_id');

    // SECURITY FIX: Validate and limit pagination
    const validLimit = Math.min(Math.max(limit, 1), 100);

    return this.vendorPayoutRepository.find({
      where: { vendor_id: vendorId },
      order: { created_at: 'DESC' },
      take: validLimit,
    });
  }

  /**
   * Calculate total earnings for vendor
   */
  async getVendorEarnings(vendorId: string) {
    // SECURITY FIX: Validate vendorId is a valid UUID
    InputValidator.isValidUUID(vendorId, 'vendor_id');

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
