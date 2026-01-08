// ==============================================================================
// ARCHIVO: shared/health/health-check.service.ts
// FUNCIONALIDAD: Servicio de health checks para monitoreo y Kubernetes probes
// - Liveness probe: indica si el servicio debe ser reiniciado
// - Readiness probe: indica si el servicio puede recibir tráfico
// - Health check detallado de todas las dependencias
// - Métricas de performance y uptime
// ==============================================================================

import { DataSource } from 'typeorm';
import { CacheService } from '../cache';
import { CircuitBreakerService } from '../circuit-breaker';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  service: string;
  version: string;
  checks: {
    database?: {
      status: HealthStatus;
      responseTime: number;
      error?: string;
    };
    cache?: {
      status: HealthStatus;
      responseTime: number;
      error?: string;
    };
    circuitBreakers?: {
      status: HealthStatus;
      unhealthyServices: string[];
      totalBreakers: number;
      openBreakers: number;
    };
    memory?: {
      status: HealthStatus;
      usedMB: number;
      totalMB: number;
      usagePercent: number;
    };
    dependencies?: Record<string, {
      status: HealthStatus;
      responseTime: number;
      error?: string;
    }>;
  };
}

export class HealthCheckService {
  private startTime: number = Date.now();
  private serviceName: string;
  private version: string;

  constructor(serviceName: string, version: string = '1.0.0') {
    this.serviceName = serviceName;
    this.version = version;
  }

  /**
   * LIVENESS PROBE
   *
   * Indica si el proceso está vivo y respondiendo.
   * Si falla, Kubernetes reiniciará el pod.
   *
   * Verifica:
   * - Proceso está respondiendo
   * - No hay deadlocks evidentes
   */
  async liveness(): Promise<{ status: 'ok' | 'error'; uptime: number }> {
    try {
      return {
        status: 'ok',
        uptime: this.getUptime(),
      };
    } catch (error) {
      return {
        status: 'error',
        uptime: this.getUptime(),
      };
    }
  }

  /**
   * READINESS PROBE
   *
   * Indica si el servicio está listo para recibir tráfico.
   * Si falla, Kubernetes lo quita del load balancer.
   *
   * Verifica:
   * - Base de datos conectada
   * - Cache disponible (opcional)
   * - Dependencias críticas disponibles
   */
  async readiness(
    dataSource?: DataSource,
    cacheService?: CacheService,
    criticalDependencies?: Array<() => Promise<boolean>>
  ): Promise<{ status: 'ready' | 'not_ready'; reason?: string }> {
    try {
      // Check database
      if (dataSource) {
        if (!dataSource.isInitialized) {
          return {
            status: 'not_ready',
            reason: 'Database not initialized',
          };
        }

        try {
          await dataSource.query('SELECT 1');
        } catch (error) {
          return {
            status: 'not_ready',
            reason: 'Database not responding',
          };
        }
      }

      // Check cache (opcional, no crítico)
      if (cacheService) {
        const cacheHealthy = await cacheService.healthCheck();
        if (!cacheHealthy) {
          console.warn('⚠️  Cache not available, but service is ready');
        }
      }

      // Check critical dependencies
      if (criticalDependencies) {
        for (const check of criticalDependencies) {
          const result = await check();
          if (!result) {
            return {
              status: 'not_ready',
              reason: 'Critical dependency not available',
            };
          }
        }
      }

      return { status: 'ready' };
    } catch (error: any) {
      return {
        status: 'not_ready',
        reason: error.message,
      };
    }
  }

  /**
   * HEALTH CHECK DETALLADO
   *
   * Retorna el estado completo del servicio con todas las dependencias.
   * Útil para monitoring y debugging.
   */
  async healthCheck(
    dataSource?: DataSource,
    cacheService?: CacheService
  ): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      service: this.serviceName,
      version: this.version,
      checks: {},
    };

    // Check database
    if (dataSource) {
      result.checks.database = await this.checkDatabase(dataSource);
      if (result.checks.database.status === HealthStatus.UNHEALTHY) {
        result.status = HealthStatus.UNHEALTHY;
      } else if (result.checks.database.status === HealthStatus.DEGRADED) {
        result.status = HealthStatus.DEGRADED;
      }
    }

    // Check cache
    if (cacheService) {
      result.checks.cache = await this.checkCache(cacheService);
      // Cache es opcional, solo degradar si falla
      if (result.checks.cache.status === HealthStatus.UNHEALTHY && result.status === HealthStatus.HEALTHY) {
        result.status = HealthStatus.DEGRADED;
      }
    }

    // Check circuit breakers
    result.checks.circuitBreakers = this.checkCircuitBreakers();
    if (result.checks.circuitBreakers.status === HealthStatus.DEGRADED && result.status === HealthStatus.HEALTHY) {
      result.status = HealthStatus.DEGRADED;
    }

    // Check memory
    result.checks.memory = this.checkMemory();
    if (result.checks.memory.status === HealthStatus.DEGRADED && result.status === HealthStatus.HEALTHY) {
      result.status = HealthStatus.DEGRADED;
    }

    return result;
  }

  /**
   * Check database health
   */
  private async checkDatabase(dataSource: DataSource): Promise<{
    status: HealthStatus;
    responseTime: number;
    error?: string;
  }> {
    const start = Date.now();

    try {
      if (!dataSource.isInitialized) {
        return {
          status: HealthStatus.UNHEALTHY,
          responseTime: Date.now() - start,
          error: 'Database not initialized',
        };
      }

      await dataSource.query('SELECT 1');
      const responseTime = Date.now() - start;

      // Si la query tarda más de 100ms, considerar degraded
      const status = responseTime > 100 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY;

      return {
        status,
        responseTime,
      };
    } catch (error: any) {
      return {
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - start,
        error: error.message,
      };
    }
  }

  /**
   * Check cache health
   */
  private async checkCache(cacheService: CacheService): Promise<{
    status: HealthStatus;
    responseTime: number;
    error?: string;
  }> {
    const start = Date.now();

    try {
      const healthy = await cacheService.healthCheck();
      const responseTime = Date.now() - start;

      if (!healthy) {
        return {
          status: HealthStatus.UNHEALTHY,
          responseTime,
          error: 'Cache ping failed',
        };
      }

      // Si el ping tarda más de 50ms, considerar degraded
      const status = responseTime > 50 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY;

      return {
        status,
        responseTime,
      };
    } catch (error: any) {
      return {
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - start,
        error: error.message,
      };
    }
  }

  /**
   * Check circuit breakers health
   */
  private checkCircuitBreakers(): {
    status: HealthStatus;
    unhealthyServices: string[];
    totalBreakers: number;
    openBreakers: number;
  } {
    const healthCheck = CircuitBreakerService.healthCheck();

    return {
      status: healthCheck.healthy ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
      unhealthyServices: healthCheck.unhealthyServices,
      totalBreakers: healthCheck.totalBreakers,
      openBreakers: healthCheck.openBreakers,
    };
  }

  /**
   * Check memory usage
   */
  private checkMemory(): {
    status: HealthStatus;
    usedMB: number;
    totalMB: number;
    usagePercent: number;
  } {
    const used = process.memoryUsage();
    const totalMB = (used.heapTotal / 1024 / 1024);
    const usedMB = (used.heapUsed / 1024 / 1024);
    const usagePercent = (usedMB / totalMB) * 100;

    let status = HealthStatus.HEALTHY;
    if (usagePercent > 90) {
      status = HealthStatus.UNHEALTHY;
    } else if (usagePercent > 70) {
      status = HealthStatus.DEGRADED;
    }

    return {
      status,
      usedMB: Math.round(usedMB * 100) / 100,
      totalMB: Math.round(totalMB * 100) / 100,
      usagePercent: Math.round(usagePercent * 100) / 100,
    };
  }

  /**
   * Get uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}
