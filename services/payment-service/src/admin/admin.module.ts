import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminWebhookController } from './admin-webhook.controller';
import { AdminWebhookService } from './admin-webhook.service';
import { WebhookRetryService } from './webhook-retry.service';
import { WebhookFailure } from '../entities/webhook-failure.entity';

/**
 * Admin Module
 * ✅ Endpoints administrativos para gestión de webhooks fallidos
 * ✅ Servicio de retry automático con cron
 */
@Module({
  imports: [TypeOrmModule.forFeature([WebhookFailure])],
  controllers: [AdminWebhookController],
  providers: [AdminWebhookService, WebhookRetryService],
  exports: [AdminWebhookService, WebhookRetryService],
})
export class AdminModule {}
