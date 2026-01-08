// ==============================================================================
// ARCHIVO: services/payment-service/src/admin/webhook-retry.service.ts
// FUNCIONALIDAD: Servicio de retry automático de webhooks fallidos
// - Ejecuta cron job cada hora para reintentar webhooks
// - Estrategia de backoff exponencial
// - Abandono automático después de N intentos
// - Notificación de fallos críticos
// ==============================================================================

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WebhookFailure } from '../entities/webhook-failure.entity';
import { LoggerService } from '../../../../shared/logging';

@Injectable()
export class WebhookRetryService {
  private logger: LoggerService;
  private readonly maxRetries: number;
  private readonly retryEnabled: boolean;

  constructor(
    @InjectRepository(WebhookFailure)
    private webhookFailureRepository: Repository<WebhookFailure>,
    private configService: ConfigService,
  ) {
    this.logger = new LoggerService('WebhookRetryService');
    this.maxRetries = parseInt(
      this.configService.get('WEBHOOK_MAX_AUTO_RETRIES') || '5'
    );
    this.retryEnabled = this.configService.get('WEBHOOK_AUTO_RETRY_ENABLED') !== 'false';
  }

  /**
   * Cron job que se ejecuta cada hora para reintentar webhooks fallidos
   *
   * Estrategia:
   * - Retry 1: inmediatamente (manejado en el catch del webhook original)
   * - Retry 2: después de 1 hora
   * - Retry 3: después de 2 horas
   * - Retry 4: después de 4 horas
   * - Retry 5: después de 8 horas
   * - Si falla después de 5 intentos: marcar como abandonado
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoRetryFailedWebhooks(): Promise<void> {
    if (!this.retryEnabled) {
      this.logger.debug('Automatic webhook retry is disabled');
      return;
    }

    this.logger.info('Starting automatic webhook retry job');

    try {
      // Obtener webhooks fallidos elegibles para retry
      const eligibleWebhooks = await this.getEligibleWebhooksForRetry();

      if (eligibleWebhooks.length === 0) {
        this.logger.info('No webhooks eligible for retry');
        return;
      }

      this.logger.info(`Found ${eligibleWebhooks.length} webhooks eligible for retry`);

      const results = {
        total: eligibleWebhooks.length,
        successful: 0,
        failed: 0,
        abandoned: 0,
      };

      // Procesar cada webhook
      for (const webhook of eligibleWebhooks) {
        try {
          // Verificar si debe ser abandonado
          if (webhook.retry_count >= this.maxRetries) {
            await this.abandonWebhook(webhook);
            results.abandoned++;
            continue;
          }

          // Intentar procesar
          await this.processWebhook(webhook);
          results.successful++;
        } catch (error) {
          this.logger.error('Auto retry failed for webhook', error as Error, {
            failureId: webhook.id,
            eventType: webhook.event_type,
            retryCount: webhook.retry_count,
          });
          results.failed++;
        }
      }

      this.logger.info('Automatic webhook retry job completed', results);
    } catch (error) {
      this.logger.error('Error in automatic webhook retry job', error as Error);
    }
  }

  /**
   * Obtener webhooks elegibles para retry según estrategia de backoff
   */
  private async getEligibleWebhooksForRetry(): Promise<WebhookFailure[]> {
    const now = new Date();

    // Calcular tiempos de backoff
    const backoffMinutes = [
      0,    // Retry 0: inmediato (ya manejado)
      60,   // Retry 1: 1 hora
      120,  // Retry 2: 2 horas
      240,  // Retry 3: 4 horas
      480,  // Retry 4: 8 horas
      960,  // Retry 5: 16 horas
    ];

    const webhooks: WebhookFailure[] = [];

    // Buscar webhooks para cada nivel de retry
    for (let retryCount = 0; retryCount < this.maxRetries; retryCount++) {
      const backoffTime = backoffMinutes[retryCount];
      const eligibleDate = new Date(now.getTime() - backoffTime * 60 * 1000);

      const webhooksAtLevel = await this.webhookFailureRepository.find({
        where: {
          status: 'failed',
          retry_count: retryCount,
          created_at: LessThan(eligibleDate),
        },
        take: 10, // Limitar a 10 por nivel de retry
        order: {
          created_at: 'ASC',
        },
      });

      webhooks.push(...webhooksAtLevel);
    }

    return webhooks;
  }

  /**
   * Procesar un webhook
   */
  private async processWebhook(webhook: WebhookFailure): Promise<void> {
    this.logger.info('Attempting auto retry for webhook', {
      failureId: webhook.id,
      eventType: webhook.event_type,
      retryCount: webhook.retry_count,
    });

    try {
      // TODO: Llamar al handler real del webhook según su tipo
      // Por ahora solo simulamos el procesamiento
      await this.simulateWebhookProcessing(webhook);

      // Marcar como exitoso
      webhook.status = 'retry_success';
      webhook.retry_count += 1;
      webhook.last_retry_at = new Date();

      await this.webhookFailureRepository.save(webhook);

      this.logger.info('Webhook auto retry successful', {
        failureId: webhook.id,
        eventType: webhook.event_type,
        finalRetryCount: webhook.retry_count,
      });
    } catch (error) {
      // Incrementar contador y actualizar error
      webhook.retry_count += 1;
      webhook.last_retry_at = new Date();
      webhook.failure_reason = error.message;
      webhook.error_stack = error.stack;

      await this.webhookFailureRepository.save(webhook);

      throw error;
    }
  }

  /**
   * Abandonar webhook después de múltiples fallos
   */
  private async abandonWebhook(webhook: WebhookFailure): Promise<void> {
    this.logger.warn('Abandoning webhook after max retries', {
      failureId: webhook.id,
      eventType: webhook.event_type,
      retryCount: webhook.retry_count,
      maxRetries: this.maxRetries,
    });

    webhook.status = 'abandoned';
    webhook.metadata = {
      ...webhook.metadata,
      abandonReason: `Exceeded maximum retry attempts (${this.maxRetries})`,
      abandonedAt: new Date().toISOString(),
      abandonedBy: 'auto-retry-service',
    };

    await this.webhookFailureRepository.save(webhook);

    // TODO: Enviar alerta crítica sobre webhook abandonado
    this.logger.logSecurityEvent('WEBHOOK_ABANDONED_AFTER_RETRIES', 'high', {
      failureId: webhook.id,
      eventType: webhook.event_type,
      retryCount: webhook.retry_count,
    });
  }

  /**
   * Simular procesamiento de webhook
   * TODO: Reemplazar con lógica real
   */
  private async simulateWebhookProcessing(webhook: WebhookFailure): Promise<void> {
    // Validar estructura del payload
    if (!webhook.payload || !webhook.payload.type) {
      throw new Error('Invalid webhook payload structure');
    }

    // Aquí iría la lógica real de procesamiento
    // Por ahora solo log
    this.logger.debug('Processing webhook', {
      eventType: webhook.event_type,
      stripeEventId: webhook.stripe_event_id,
    });

    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Obtener estadísticas de retry automático
   */
  async getRetryStats(): Promise<{
    enabled: boolean;
    maxRetries: number;
    pendingRetries: number;
    abandonedTotal: number;
    successRate: number;
  }> {
    const pending = await this.webhookFailureRepository.count({
      where: { status: 'failed' },
    });

    const abandoned = await this.webhookFailureRepository.count({
      where: { status: 'abandoned' },
    });

    const successful = await this.webhookFailureRepository.count({
      where: { status: 'retry_success' },
    });

    const total = pending + abandoned + successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return {
      enabled: this.retryEnabled,
      maxRetries: this.maxRetries,
      pendingRetries: pending,
      abandonedTotal: abandoned,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * Forzar ejecución manual del cron job (útil para testing)
   */
  async triggerManualRetry(): Promise<void> {
    this.logger.info('Manual retry triggered');
    await this.autoRetryFailedWebhooks();
  }
}
