import { Controller, Post, Get, Body, Param, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('connect/create-account')
  async createAccount(@Body() body: { email: string; country?: string }) {
    return this.paymentService.createConnectedAccount(body.email, body.country);
  }

  @Post('connect/account-link')
  async createAccountLink(@Body() body: { account_id: string; refresh_url: string; return_url: string }) {
    return this.paymentService.createAccountLink(
      body.account_id,
      body.refresh_url,
      body.return_url,
    );
  }

  @Post('create-intent')
  async createPaymentIntent(@Body() body: {
    order_id: string;
    amount: number;
    application_fee: number;
    metadata?: any;
  }) {
    return this.paymentService.createPaymentIntent(
      body.order_id,
      body.amount,
      body.application_fee,
      body.metadata,
    );
  }

  @Post('execute-transfers')
  async executeTransfers(@Body() body: {
    order_id: string;
    sub_orders: Array<{
      vendor_id: string;
      stripe_account_id: string;
      vendor_payout: number;
      sub_order_id: string;
    }>;
  }) {
    return this.paymentService.executeTransfers(body.order_id, body.sub_orders);
  }

  @Post('webhooks')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentService.handleWebhook(signature, req.rawBody);
  }

  @Get('vendor/:vendorId/payouts')
  async getVendorPayouts(@Param('vendorId') vendorId: string) {
    return this.paymentService.getVendorPayouts(vendorId);
  }

  @Get('vendor/:vendorId/earnings')
  async getVendorEarnings(@Param('vendorId') vendorId: string) {
    return this.paymentService.getVendorEarnings(vendorId);
  }
}
