// ==============================================================================
// ARCHIVO: services/payment-service/src/admin/admin-webhook.service.ts
// FUNCIONALIDAD: Servicio de administración de webhooks fallidos
// - Consultas y filtrado de webhooks
// - Retry manual y automático
// - Estadísticas y reportes
// - Limpieza de registros antiguos
// ==============================================================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { WebhookFailure } from '../entities/webhook-failure.entity';
import { LoggerService } from '../../../../shared/logging';

@Injectable()
export class AdminWebhookService {
  private stripe: Stripe;
  private logger: LoggerService;

  constructor(
    @InjectRepository(WebhookFailure)
    private webhookFailureRepository: Repository<WebhookFailure>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
    this.logger = new LoggerService('AdminWebhookService');
  }

  /**
   * Listar webhooks fallidos con paginación y filtros
   */
  async listFailures(filters: {
    page: number;
    limit: number;
    status?: string;
    eventType?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const { page, limit, status, eventType, fromDate, toDate } = filters;

    const queryBuilder = this.webhookFailureRepository
      .createQueryBuilder('webhook_failure')
      .select([
        'webhook_failure.id',
        'webhook_failure.event_type',
        'webhook_failure.stripe_event_id',
        'webhook_failure.failure_reason',
        'webhook_failure.status',
        'webhook_failure.retry_count',
        'webhook_failure.created_at',
        'webhook_failure.last_retry_at',
      ])
      .orderBy('webhook_failure.created_at', 'DESC');

    // Aplicar filtros
    if (status) {
      queryBuilder.andWhere('webhook_failure.status = :status', { status });
    }

    if (eventType) {
      queryBuilder.andWhere('webhook_failure.event_type = :eventType', { eventType });
    }

    if (fromDate || toDate) {
      if (fromDate && toDate) {
        queryBuilder.andWhere('webhook_failure.created_at BETWEEN :fromDate AND :toDate', {
          fromDate,
          toDate,
        });
      } else if (fromDate) {
        queryBuilder.andWhere('webhook_failure.created_at >= :fromDate', { fromDate });
      } else if (toDate) {
        queryBuilder.andWhere('webhook_failure.created_at <= :toDate', { toDate });
      }
    }

    // Paginación
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener detalles completos de un webhook fallido
   */
  async getFailureDetails(failureId: string) {
    const failure = await this.webhookFailureRepository.findOne({
      where: { id: failureId },
    });

    if (!failure) {
      throw new NotFoundException(`Webhook failure ${failureId} not found`);
    }

    return failure;
  }

  /**
   * Reintentar un webhook fallido específico
   */
  async retryFailure(failureId: string) {
    const failure = await this.webhookFailureRepository.findOne({
      where: { id: failureId },
    });

    if (!failure) {
      throw new NotFoundException(`Webhook failure ${failureId} not found`);
    }

    // Verificar que no esté abandonado
    if (failure.status === 'abandoned') {
      throw new BadRequestException('Cannot retry abandoned webhook');
    }

    // Verificar que no haya demasiados reintentos
    if (failure.retry_count >= 10) {
      throw new BadRequestException('Maximum retry attempts (10) exceeded');
    }

    try {
      // Intentar reprocesar el webhook
      await this.processWebhookEvent(failure.payload);

      // Actualizar estado a éxito
      failure.status = 'retry_success';
      failure.retry_count += 1;
      failure.last_retry_at = new Date();

      await this.webhookFailureRepository.save(failure);

      this.logger.info('Webhook retry successful', {
        failureId,
        eventType: failure.event_type,
        retryCount: failure.retry_count,
      });

      return {
        success: true,
        message: 'Webhook reprocessed successfully',
        failureId,
        retryCount: failure.retry_count,
      };
    } catch (error) {
      // Actualizar contador de reintentos
      failure.retry_count += 1;
      failure.last_retry_at = new Date();
      failure.failure_reason = error.message;
      failure.error_stack = error.stack;

      await this.webhookFailureRepository.save(failure);

      this.logger.error('Webhook retry failed', error as Error, {
        failureId,
        eventType: failure.event_type,
        retryCount: failure.retry_count,
      });

      throw new BadRequestException(`Retry failed: ${error.message}`);
    }
  }

  /**
   * Retry masivo de webhooks
   */
  async retryBatch(criteria: {
    eventType?: string;
    maxRetries?: number;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const queryBuilder = this.webhookFailureRepository
      .createQueryBuilder('webhook_failure')
      .where('webhook_failure.status = :status', { status: 'failed' });

    // Aplicar criterios
    if (criteria.eventType) {
      queryBuilder.andWhere('webhook_failure.event_type = :eventType', {
        eventType: criteria.eventType,
      });
    }

    if (criteria.maxRetries !== undefined) {
      queryBuilder.andWhere('webhook_failure.retry_count < :maxRetries', {
        maxRetries: criteria.maxRetries,
      });
    }

    if (criteria.fromDate || criteria.toDate) {
      if (criteria.fromDate && criteria.toDate) {
        queryBuilder.andWhere('webhook_failure.created_at BETWEEN :fromDate AND :toDate', {
          fromDate: criteria.fromDate,
          toDate: criteria.toDate,
        });
      } else if (criteria.fromDate) {
        queryBuilder.andWhere('webhook_failure.created_at >= :fromDate', {
          fromDate: criteria.fromDate,
        });
      } else if (criteria.toDate) {
        queryBuilder.andWhere('webhook_failure.created_at <= :toDate', {
          toDate: criteria.toDate,
        });
      }
    }

    // Limitar a 100 por seguridad
    queryBuilder.take(100);

    const failures = await queryBuilder.getMany();

    const results = {
      total: failures.length,
      successful: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Procesar cada webhook
    for (const failure of failures) {
      try {
        await this.processWebhookEvent(failure.payload);

        failure.status = 'retry_success';
        failure.retry_count += 1;
        failure.last_retry_at = new Date();
        await this.webhookFailureRepository.save(failure);

        results.successful++;
      } catch (error) {
        failure.retry_count += 1;
        failure.last_retry_at = new Date();
        failure.failure_reason = error.message;
        await this.webhookFailureRepository.save(failure);

        results.failed++;
        results.errors.push({
          failureId: failure.id,
          eventType: failure.event_type,
          error: error.message,
        });
      }
    }

    this.logger.info('Batch retry completed', results);

    return results;
  }

  /**
   * Marcar webhook como abandonado
   */
  async abandonFailure(failureId: string, reason?: string) {
    const failure = await this.webhookFailureRepository.findOne({
      where: { id: failureId },
    });

    if (!failure) {
      throw new NotFoundException(`Webhook failure ${failureId} not found`);
    }

    failure.status = 'abandoned';
    if (reason) {
      failure.metadata = {
        ...failure.metadata,
        abandonReason: reason,
        abandonedAt: new Date().toISOString(),
      };
    }

    await this.webhookFailureRepository.save(failure);

    this.logger.info('Webhook marked as abandoned', {
      failureId,
      eventType: failure.event_type,
      reason,
    });

    return {
      success: true,
      message: 'Webhook marked as abandoned',
      failureId,
    };
  }

  /**
   * Obtener estadísticas de webhooks fallidos
   */
  async getFailureStats(filters: { fromDate?: Date; toDate?: Date }) {
    const queryBuilder = this.webhookFailureRepository.createQueryBuilder('webhook_failure');

    if (filters.fromDate || filters.toDate) {
      if (filters.fromDate && filters.toDate) {
        queryBuilder.where('webhook_failure.created_at BETWEEN :fromDate AND :toDate', {
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        });
      } else if (filters.fromDate) {
        queryBuilder.where('webhook_failure.created_at >= :fromDate', {
          fromDate: filters.fromDate,
        });
      } else if (filters.toDate) {
        queryBuilder.where('webhook_failure.created_at <= :toDate', {
          toDate: filters.toDate,
        });
      }
    }

    // Totales por estado
    const byStatus = await queryBuilder
      .select('webhook_failure.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('webhook_failure.status')
      .getRawMany();

    // Totales por tipo de evento
    const byEventType = await queryBuilder
      .select('webhook_failure.event_type', 'event_type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('webhook_failure.event_type')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Tasa de éxito en retries
    const totalRetries = await this.webhookFailureRepository.count({
      where: { retry_count: Between(1, 999) },
    });

    const successfulRetries = await this.webhookFailureRepository.count({
      where: { status: 'retry_success' },
    });

    return {
      totalFailures: await queryBuilder.getCount(),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      byEventType: byEventType.map(item => ({
        eventType: item.event_type,
        count: parseInt(item.count),
      })),
      retryStats: {
        totalRetries,
        successfulRetries,
        successRate: totalRetries > 0 ? (successfulRetries / totalRetries) * 100 : 0,
      },
    };
  }

  /**
   * Limpiar webhooks antiguos exitosos
   */
  async cleanupOldSuccesses(days: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.webhookFailureRepository.delete({
      status: 'retry_success',
      updated_at: LessThan(cutoffDate),
    });

    this.logger.info('Cleaned up old successful webhooks', {
      deletedCount: result.affected,
      olderThanDays: days,
    });

    return {
      success: true,
      deletedCount: result.affected,
      olderThanDays: days,
    };
  }

  /**
   * Obtener payload original
   */
  async getOriginalPayload(failureId: string) {
    const failure = await this.webhookFailureRepository.findOne({
      where: { id: failureId },
      select: ['id', 'event_type', 'stripe_event_id', 'payload', 'created_at'],
    });

    if (!failure) {
      throw new NotFoundException(`Webhook failure ${failureId} not found`);
    }

    return {
      failureId: failure.id,
      eventType: failure.event_type,
      stripeEventId: failure.stripe_event_id,
      createdAt: failure.created_at,
      payload: failure.payload,
    };
  }

  /**
   * Procesar evento de webhook (lógica de negocio)
   * Este método debería llamar a los handlers apropiados según el tipo de evento
   */
  private async processWebhookEvent(event: any): Promise<void> {
    // TODO: Implementar lógica específica de procesamiento según event.type
    // Por ahora, validamos que el evento sea válido
    if (!event || !event.type || !event.data) {
      throw new Error('Invalid webhook event structure');
    }

    // Aquí se procesaría el evento según su tipo
    // Esta lógica debería ser la misma que en PaymentService.handleWebhook
    this.logger.debug('Processing webhook event', {
      eventType: event.type,
      eventId: event.id,
    });

    // Placeholder para procesamiento real
    // En producción, esto debería delegar al servicio apropiado
  }
}
