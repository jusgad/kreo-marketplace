// ==============================================================================
// ARCHIVO: services/product-service/src/health/health.controller.ts
// FUNCIONALIDAD: Health check endpoints para Kubernetes y monitoring
// - GET /health/liveness - Liveness probe (Kubernetes reinicia si falla)
// - GET /health/readiness - Readiness probe (Kubernetes quita del LB si falla)
// - GET /health - Health check detallado con todas las dependencias
// ==============================================================================

import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthCheckService } from '../../../../shared/health';
import { CacheService } from '../../../../shared/cache';

@Controller('health')
export class HealthController {
  private healthCheckService: HealthCheckService;
  private cacheService: CacheService;

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {
    this.healthCheckService = new HealthCheckService('product-service', '1.0.0');
    this.cacheService = new CacheService('product-service');
  }

  /**
   * LIVENESS PROBE
   *
   * Kubernetes lo usa para determinar si debe reiniciar el pod.
   * Solo falla si el proceso está completamente muerto/bloqueado.
   *
   * @example GET /health/liveness
   * @returns { status: 'ok', uptime: 3600 }
   */
  @Get('liveness')
  async liveness() {
    return await this.healthCheckService.liveness();
  }

  /**
   * READINESS PROBE
   *
   * Kubernetes lo usa para determinar si debe enviar tráfico al pod.
   * Falla si las dependencias críticas no están disponibles.
   *
   * @example GET /health/readiness
   * @returns { status: 'ready' }
   */
  @Get('readiness')
  async readiness() {
    return await this.healthCheckService.readiness(
      this.dataSource,
      this.cacheService
    );
  }

  /**
   * HEALTH CHECK DETALLADO
   *
   * Retorna el estado completo del servicio para monitoring.
   * Incluye estado de todas las dependencias y métricas.
   *
   * @example GET /health
   * @returns HealthCheckResult con detalles completos
   */
  @Get()
  async health() {
    return await this.healthCheckService.healthCheck(
      this.dataSource,
      this.cacheService
    );
  }
}
