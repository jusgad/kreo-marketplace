import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { VendorPayout } from '../entities/vendor-payout.entity';
import { WebhookFailure } from '../entities/webhook-failure.entity';

/**
 * Payment Module
 *
 * ✅ CRÍTICO #8: Incluye HttpModule para validación de webhooks con order-service
 * ✅ Incluye WebhookFailure para registro de webhooks fallidos
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([VendorPayout, WebhookFailure]),
    HttpModule.register({
      timeout: 10000, // 10 segundos timeout
      maxRedirects: 5,
    }),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
