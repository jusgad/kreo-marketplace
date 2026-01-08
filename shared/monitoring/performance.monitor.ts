// ==============================================================================
// ARCHIVO: shared/monitoring/performance.monitor.ts
// FUNCIONALIDAD: Sistema de monitoreo de performance y APM
// - Tracking de métricas de performance
// - Response time monitoring
// - Throughput tracking
// - Error rate monitoring
// - Memory y CPU usage
// ==============================================================================

import { Request, Response, NextFunction } from 'express';

export interface PerformanceMetrics {
  // Request metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;

  // Response time metrics (ms)
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // Throughput
  requestsPerSecond: number;
  requestsPerMinute: number;

  // Error rate
  errorRate: number;

  // System metrics
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
}

export class PerformanceMonitor {
  private metrics: {
    requests: number;
    successful: number;
    failed: number;
    responseTimes: number[];
    startTime: number;
    lastMinuteRequests: Array<{ timestamp: number }>;
  };

  private readonly MAX_RESPONSE_TIMES = 1000; // Keep last 1000 response times

  constructor() {
    this.metrics = {
      requests: 0,
      successful: 0,
      failed: 0,
      responseTimes: [],
      startTime: Date.now(),
      lastMinuteRequests: [],
    };

    // Cleanup old metrics every minute
    setInterval(() => this.cleanupOldMetrics(), 60000);
  }

  /**
   * Express middleware para tracking de performance
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      // Track cuando la respuesta termina
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const isSuccess = res.statusCode < 400;

        this.recordRequest(responseTime, isSuccess);
      });

      next();
    };
  }

  /**
   * Registrar una request
   */
  private recordRequest(responseTime: number, isSuccess: boolean): void {
    this.metrics.requests++;

    if (isSuccess) {
      this.metrics.successful++;
    } else {
      this.metrics.failed++;
    }

    // Store response time
    this.metrics.responseTimes.push(responseTime);

    // Keep only last N response times
    if (this.metrics.responseTimes.length > this.MAX_RESPONSE_TIMES) {
      this.metrics.responseTimes.shift();
    }

    // Track for requests per minute
    this.metrics.lastMinuteRequests.push({ timestamp: Date.now() });
  }

  /**
   * Limpiar métricas antiguas
   */
  private cleanupOldMetrics(): void {
    const oneMinuteAgo = Date.now() - 60000;
    this.metrics.lastMinuteRequests = this.metrics.lastMinuteRequests.filter(
      req => req.timestamp > oneMinuteAgo
    );
  }

  /**
   * Calcular percentil
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Obtener todas las métricas
   */
  getMetrics(): PerformanceMetrics {
    const now = Date.now();
    const uptime = (now - this.metrics.startTime) / 1000; // seconds

    const responseTimes = this.metrics.responseTimes;
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const requestsPerMinute = this.metrics.lastMinuteRequests.length;
    const requestsPerSecond = requestsPerMinute / 60;

    const errorRate = this.metrics.requests > 0
      ? (this.metrics.failed / this.metrics.requests) * 100
      : 0;

    return {
      totalRequests: this.metrics.requests,
      successfulRequests: this.metrics.successful,
      failedRequests: this.metrics.failed,

      avgResponseTime: Math.round(avgResponseTime),
      minResponseTime: Math.min(...responseTimes) || 0,
      maxResponseTime: Math.max(...responseTimes) || 0,
      p50ResponseTime: Math.round(this.calculatePercentile(responseTimes, 50)),
      p95ResponseTime: Math.round(this.calculatePercentile(responseTimes, 95)),
      p99ResponseTime: Math.round(this.calculatePercentile(responseTimes, 99)),

      requestsPerSecond: parseFloat(requestsPerSecond.toFixed(2)),
      requestsPerMinute,

      errorRate: parseFloat(errorRate.toFixed(2)),

      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: Math.round(uptime),
    };
  }

  /**
   * Resetear métricas
   */
  reset(): void {
    this.metrics = {
      requests: 0,
      successful: 0,
      failed: 0,
      responseTimes: [],
      startTime: Date.now(),
      lastMinuteRequests: [],
    };
  }

  /**
   * Obtener health status basado en métricas
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
  } {
    const metrics = this.getMetrics();
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check error rate
    if (metrics.errorRate > 10) {
      issues.push(`High error rate: ${metrics.errorRate}%`);
      status = 'unhealthy';
    } else if (metrics.errorRate > 5) {
      issues.push(`Elevated error rate: ${metrics.errorRate}%`);
      status = status === 'healthy' ? 'degraded' : status;
    }

    // Check response time
    if (metrics.p95ResponseTime > 5000) {
      issues.push(`High response time: P95 ${metrics.p95ResponseTime}ms`);
      status = 'unhealthy';
    } else if (metrics.p95ResponseTime > 2000) {
      issues.push(`Elevated response time: P95 ${metrics.p95ResponseTime}ms`);
      status = status === 'healthy' ? 'degraded' : status;
    }

    // Check memory usage
    const memoryUsagePercent = (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      issues.push(`Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`);
      status = 'unhealthy';
    } else if (memoryUsagePercent > 75) {
      issues.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
      status = status === 'healthy' ? 'degraded' : status;
    }

    return { status, issues };
  }
}

/**
 * Singleton instance
 */
export const performanceMonitor = new PerformanceMonitor();
