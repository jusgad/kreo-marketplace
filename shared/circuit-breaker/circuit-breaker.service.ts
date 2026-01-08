// ==============================================================================
// ARCHIVO: shared/circuit-breaker/circuit-breaker.service.ts
// FUNCIONALIDAD: Servicio de Circuit Breaker para prevenir cascading failures
// - Wraps HTTP calls con circuit breaker pattern
// - Fallback automático a cache si está habilitado
// - Métricas de health y performance
// - Event logging para monitoring
// ==============================================================================

import CircuitBreaker from 'opossum';
import { CircuitBreakerConfig, ServiceCircuitBreakerConfigs } from './circuit-breaker.config';
import { LoggerService } from '../logging';

/**
 * Servicio de Circuit Breaker
 *
 * USO:
 * const breaker = CircuitBreakerService.createBreaker('product-service');
 * const result = await breaker.fire(async () => {
 *   return await httpService.get('/products/123');
 * });
 */
export class CircuitBreakerService {
  private static breakers: Map<string, CircuitBreaker> = new Map();
  private static metrics: Map<string, any> = new Map();
  private static logger = new LoggerService('CircuitBreaker');

  /**
   * Crear o obtener un circuit breaker existente
   */
  static createBreaker<T extends (...args: any[]) => Promise<any>>(
    serviceName: string,
    customConfig?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker<any[], any> {
    // Si ya existe, retornar el existente
    if (this.breakers.has(serviceName)) {
      return this.breakers.get(serviceName)!;
    }

    // Obtener configuración predefinida o usar default
    const config = {
      ...(ServiceCircuitBreakerConfigs[serviceName] || ServiceCircuitBreakerConfigs['order-service']),
      ...customConfig,
    };

    // Crear el circuit breaker con una función dummy (se reemplaza en fire())
    const breaker = new CircuitBreaker(
      async () => {
        throw new Error('Circuit breaker not properly configured');
      },
      {
        timeout: config.timeout,
        errorThresholdPercentage: config.errorThresholdPercentage,
        resetTimeout: config.resetTimeout,
        rollingCountTimeout: config.rollingCountTimeout,
        rollingCountBuckets: config.rollingCountBuckets,
        name: config.name,
      }
    );

    // Configurar event listeners para métricas y logging
    this.setupEventListeners(breaker, serviceName);

    // Guardar en el mapa
    this.breakers.set(serviceName, breaker);

    this.logger.info(`Circuit breaker created for ${serviceName}`, {
      serviceName,
      timeout: config.timeout,
      errorThreshold: config.errorThresholdPercentage,
      resetTimeout: config.resetTimeout,
    });

    return breaker;
  }

  /**
   * Ejecutar una función con circuit breaker
   */
  static async execute<T>(
    serviceName: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const breaker = this.createBreaker(serviceName);

    try {
      return await breaker.fire(fn);
    } catch (error: any) {
      // Si el circuito está abierto y hay fallback, usarlo
      if (error.message === 'Breaker is open' && fallback) {
        this.logger.warn(`Circuit breaker OPEN for ${serviceName}, using fallback`, { serviceName });
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Configurar event listeners para monitoreo
   */
  private static setupEventListeners(breaker: CircuitBreaker, serviceName: string) {
    // Inicializar métricas
    this.metrics.set(serviceName, {
      success: 0,
      failure: 0,
      timeout: 0,
      open: 0,
      halfOpen: 0,
      close: 0,
      fallback: 0,
      lastError: null,
      lastErrorTime: null,
    });

    const metrics = this.metrics.get(serviceName)!;

    // Success
    breaker.on('success', (result) => {
      metrics.success++;
    });

    // Failure
    breaker.on('failure', (error) => {
      metrics.failure++;
      metrics.lastError = error.message;
      metrics.lastErrorTime = new Date();
      this.logger.error(`Circuit breaker failure`, error, { serviceName });
    });

    // Timeout
    breaker.on('timeout', () => {
      metrics.timeout++;
      this.logger.warn(`Circuit breaker timeout`, { serviceName });
    });

    // Circuit opened (demasiados errores)
    breaker.on('open', () => {
      metrics.open++;
      this.logger.error(`Circuit breaker OPENED - service is down!`, undefined, { serviceName });
    });

    // Circuit half-open (intentando recuperarse)
    breaker.on('halfOpen', () => {
      metrics.halfOpen++;
      this.logger.warn(`Circuit breaker HALF-OPEN - testing recovery`, { serviceName });
    });

    // Circuit closed (servicio recuperado)
    breaker.on('close', () => {
      metrics.close++;
      this.logger.info(`Circuit breaker CLOSED - service recovered`, { serviceName });
    });

    // Fallback ejecutado
    breaker.on('fallback', (result) => {
      metrics.fallback++;
      this.logger.warn(`Circuit breaker fallback executed`, { serviceName });
    });
  }

  /**
   * Obtener métricas de un circuit breaker
   */
  static getMetrics(serviceName: string) {
    const breaker = this.breakers.get(serviceName);
    const metrics = this.metrics.get(serviceName);

    if (!breaker || !metrics) {
      return null;
    }

    const stats = breaker.stats;

    return {
      serviceName,
      state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED',
      stats: {
        fires: stats.fires,
        successes: stats.successes,
        failures: stats.failures,
        timeouts: stats.timeouts,
        fallbacks: stats.fallbacks,
        rejects: stats.rejects,
        latencyMean: stats.latencies?.mean || 0,
        latency95th: stats.latencies?.p95 || 0,
        latency99th: stats.latencies?.p99 || 0,
      },
      counts: {
        success: metrics.success,
        failure: metrics.failure,
        timeout: metrics.timeout,
        open: metrics.open,
        halfOpen: metrics.halfOpen,
        close: metrics.close,
        fallback: metrics.fallback,
      },
      lastError: metrics.lastError,
      lastErrorTime: metrics.lastErrorTime,
      healthScore: this.calculateHealthScore(stats),
    };
  }

  /**
   * Calcular health score (0-100)
   */
  private static calculateHealthScore(stats: any): number {
    const total = stats.fires || 1;
    const success = stats.successes || 0;
    const failures = stats.failures || 0;
    const timeouts = stats.timeouts || 0;

    const successRate = (success / total) * 100;
    const failureRate = (failures / total) * 100;
    const timeoutRate = (timeouts / total) * 100;

    // Health score ponderado
    const healthScore = successRate - (failureRate * 1.5) - (timeoutRate * 2);

    return Math.max(0, Math.min(100, healthScore));
  }

  /**
   * Obtener métricas de todos los circuit breakers
   */
  static getAllMetrics() {
    const allMetrics: any[] = [];

    for (const serviceName of this.breakers.keys()) {
      const metrics = this.getMetrics(serviceName);
      if (metrics) {
        allMetrics.push(metrics);
      }
    }

    return allMetrics;
  }

  /**
   * Reset de un circuit breaker específico
   */
  static reset(serviceName: string) {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.close();
      this.logger.info(`Circuit breaker reset to CLOSED state`, { serviceName });
    }
  }

  /**
   * Reset de todos los circuit breakers
   */
  static resetAll() {
    for (const [serviceName, breaker] of this.breakers.entries()) {
      breaker.close();
      this.logger.info(`Circuit breaker reset to CLOSED state`, { serviceName });
    }
  }

  /**
   * Health check de todos los circuit breakers
   */
  static healthCheck() {
    const allMetrics = this.getAllMetrics();
    const unhealthy = allMetrics.filter(m => m.state === 'OPEN' || m.healthScore < 50);

    return {
      healthy: unhealthy.length === 0,
      totalBreakers: allMetrics.length,
      openBreakers: allMetrics.filter(m => m.state === 'OPEN').length,
      halfOpenBreakers: allMetrics.filter(m => m.state === 'HALF-OPEN').length,
      unhealthyServices: unhealthy.map(m => m.serviceName),
      metrics: allMetrics,
    };
  }
}
