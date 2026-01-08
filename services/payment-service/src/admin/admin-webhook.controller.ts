// ==============================================================================
// ARCHIVO: services/payment-service/src/admin/admin-webhook.controller.ts
// FUNCIONALIDAD: Controller administrativo para gestión de webhooks fallidos
// - Listar webhooks fallidos con paginación y filtros
// - Ver detalles de webhook específico
// - Retry manual de webhooks
// - Retry masivo por tipo de evento
// - Abandonar webhooks que no se pueden recuperar
// ==============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { RolesGuard, AdminOnly } from '../../../../shared/security/guards/roles.guard';
import { AdminWebhookService } from './admin-webhook.service';
import { InputValidator } from '../../../../shared/security/sql-injection-prevention';

/**
 * Controller de administración de webhooks
 * ✅ SOLO ACCESIBLE POR ADMINS
 */
@ApiTags('admin-webhooks')
@ApiBearerAuth('JWT-auth')
@ApiSecurity('JWT-auth')
@ApiResponse({ status: 401, description: 'No autenticado - Token JWT requerido' })
@ApiResponse({ status: 403, description: 'Acceso denegado - Solo administradores' })
@Controller('admin/webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
export class AdminWebhookController {
  constructor(private adminWebhookService: AdminWebhookService) {}

  /**
   * Listar webhooks fallidos con paginación y filtros
   */
  @Get('failures')
  @ApiOperation({
    summary: 'Listar webhooks fallidos',
    description: `
      Obtiene una lista paginada de webhooks que han fallado durante su procesamiento.
      Permite filtrar por estado, tipo de evento y rango de fechas.
    `,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items por página (default: 20, max: 100)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filtrar por estado: failed | retry_pending | retry_success | abandoned' })
  @ApiQuery({ name: 'event_type', required: false, type: String, description: 'Filtrar por tipo de evento (ej: payment_intent.succeeded)' })
  @ApiQuery({ name: 'from_date', required: false, type: String, description: 'Fecha desde (ISO 8601)' })
  @ApiQuery({ name: 'to_date', required: false, type: String, description: 'Fecha hasta (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Lista de webhooks fallidos obtenida exitosamente' })
  async listFailures(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('event_type') eventType?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ) {
    // Validar paginación
    const validLimit = Math.min(Math.max(1, limit), 100);
    const validPage = Math.max(1, page);

    return this.adminWebhookService.listFailures({
      page: validPage,
      limit: validLimit,
      status,
      eventType,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  /**
   * Obtener detalles de un webhook fallido específico
   */
  @Get('failures/:failureId')
  @ApiOperation({
    summary: 'Obtener detalles de webhook fallido',
    description: 'Retorna todos los detalles de un webhook fallido específico, incluyendo payload, errores y metadata.',
  })
  @ApiParam({ name: 'failureId', type: String, description: 'UUID del webhook fallido' })
  @ApiResponse({ status: 200, description: 'Detalles del webhook obtenidos exitosamente' })
  @ApiResponse({ status: 404, description: 'Webhook no encontrado' })
  async getFailureDetails(@Param('failureId') failureId: string) {
    InputValidator.isValidUUID(failureId, 'failureId');
    return this.adminWebhookService.getFailureDetails(failureId);
  }

  /**
   * Retry manual de un webhook fallido
   */
  @Post('failures/:failureId/retry')
  @ApiOperation({
    summary: 'Reintentar webhook fallido',
    description: `
      Reintenta procesar un webhook que falló previamente.
      Utiliza el payload original almacenado en la base de datos.
      Incrementa el contador de reintentos.
    `,
  })
  @ApiParam({ name: 'failureId', type: String, description: 'UUID del webhook a reintentar' })
  @ApiResponse({ status: 200, description: 'Webhook reprocesado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al reprocesar - webhook abandonado o límite de reintentos excedido' })
  @ApiResponse({ status: 404, description: 'Webhook no encontrado' })
  async retryFailure(@Param('failureId') failureId: string) {
    InputValidator.isValidUUID(failureId, 'failureId');
    return this.adminWebhookService.retryFailure(failureId);
  }

  /**
   * Retry masivo de webhooks fallidos
   */
  @Post('failures/retry-batch')
  @ApiOperation({
    summary: 'Reintentar múltiples webhooks en lote',
    description: `
      Reintentar todos los webhooks que cumplan con los criterios especificados.
      Útil cuando se resuelve un problema que afectó a múltiples webhooks.
      Límite máximo: 100 webhooks por solicitud.
    `,
  })
  @ApiBody({
    description: 'Criterios de filtrado para seleccionar webhooks a reintentar',
    schema: {
      type: 'object',
      properties: {
        event_type: { type: 'string', description: 'Tipo de evento (ej: payment_intent.succeeded)', example: 'payment_intent.succeeded' },
        max_retries: { type: 'number', description: 'Solo reintentar webhooks con menos de X intentos', example: 3 },
        from_date: { type: 'string', format: 'date-time', description: 'Fecha desde (ISO 8601)' },
        to_date: { type: 'string', format: 'date-time', description: 'Fecha hasta (ISO 8601)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Proceso de retry en lote completado - retorna estadísticas de éxito/fallo' })
  async retryBatch(
    @Body() criteria: {
      event_type?: string;
      max_retries?: number;
      from_date?: string;
      to_date?: string;
    }
  ) {
    return this.adminWebhookService.retryBatch({
      eventType: criteria.event_type,
      maxRetries: criteria.max_retries,
      fromDate: criteria.from_date ? new Date(criteria.from_date) : undefined,
      toDate: criteria.to_date ? new Date(criteria.to_date) : undefined,
    });
  }

  /**
   * Marcar webhook como abandonado
   */
  @Patch('failures/:failureId/abandon')
  @ApiOperation({
    summary: 'Abandonar webhook',
    description: `
      Marca un webhook como abandonado cuando no se puede recuperar después de múltiples intentos.
      Los webhooks abandonados no serán reintentados automáticamente.
    `,
  })
  @ApiParam({ name: 'failureId', type: String, description: 'UUID del webhook a abandonar' })
  @ApiBody({
    description: 'Razón opcional del abandono',
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Razón por la cual se abandona', example: 'Error irrecuperable en lógica de negocio' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Webhook marcado como abandonado exitosamente' })
  @ApiResponse({ status: 404, description: 'Webhook no encontrado' })
  async abandonFailure(
    @Param('failureId') failureId: string,
    @Body('reason') reason?: string,
  ) {
    InputValidator.isValidUUID(failureId, 'failureId');
    return this.adminWebhookService.abandonFailure(failureId, reason);
  }

  /**
   * Obtener estadísticas de webhooks fallidos
   */
  @Get('failures/stats/summary')
  @ApiOperation({
    summary: 'Estadísticas de webhooks fallidos',
    description: `
      Retorna métricas agregadas sobre webhooks fallidos:
      - Total de fallos por tipo de evento
      - Distribución por estado
      - Tasa de éxito en retries
      - Eventos más problemáticos
    `,
  })
  @ApiQuery({ name: 'from_date', required: false, type: String, description: 'Fecha desde (ISO 8601)' })
  @ApiQuery({ name: 'to_date', required: false, type: String, description: 'Fecha hasta (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  async getFailureStats(
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ) {
    return this.adminWebhookService.getFailureStats({
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  /**
   * Limpiar webhooks antiguos exitosos
   */
  @Post('failures/cleanup')
  @ApiOperation({
    summary: 'Limpiar webhooks antiguos exitosos',
    description: `
      Elimina registros de webhooks que fueron exitosamente reprocesados
      y tienen más de X días de antigüedad.
      Ayuda a mantener limpia la base de datos.
    `,
  })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Días de antigüedad para eliminar (default: 30, min: 7)' })
  @ApiResponse({ status: 200, description: 'Limpieza completada - retorna número de registros eliminados' })
  @ApiResponse({ status: 400, description: 'Días mínimos: 7' })
  async cleanupOldSuccesses(@Query('days') days: number = 30) {
    if (days < 7) {
      throw new BadRequestException('Minimum cleanup age is 7 days');
    }

    return this.adminWebhookService.cleanupOldSuccesses(days);
  }

  /**
   * Obtener payload original de un webhook
   */
  @Get('failures/:failureId/payload')
  @ApiOperation({
    summary: 'Obtener payload original del webhook',
    description: `
      Retorna el payload completo original del webhook tal como fue recibido de Stripe.
      Útil para debugging y análisis manual de problemas.
    `,
  })
  @ApiParam({ name: 'failureId', type: String, description: 'UUID del webhook' })
  @ApiResponse({ status: 200, description: 'Payload obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Webhook no encontrado' })
  async getOriginalPayload(@Param('failureId') failureId: string) {
    InputValidator.isValidUUID(failureId, 'failureId');
    return this.adminWebhookService.getOriginalPayload(failureId);
  }
}
