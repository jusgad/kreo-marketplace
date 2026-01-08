// ==============================================================================
// RETRY INTERCEPTOR WITH EXPONENTIAL BACKOFF
// SOLUCIÓN CRÍTICO #2: Implementa retry logic para requests fallidos
// ==============================================================================

import { Observable, retry, timer, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';

/**
 * Configuración de retry logic
 */
export interface RetryConfig {
  maxRetries?: number;        // Máximo 3 reintentos por defecto
  delayMs?: number;           // Delay inicial de 1 segundo
  exponentialBackoff?: boolean; // Backoff exponencial activado por defecto
  retryableErrors?: number[]; // Códigos de error que se pueden reintentar
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  delayMs: 1000,
  exponentialBackoff: true,
  retryableErrors: [408, 429, 500, 502, 503, 504], // Timeout, Rate Limit, Server Errors
};

/**
 * Aplicar retry logic con exponential backoff a un Observable
 *
 * CRITICAL FIX APLICADO:
 * - Máximo 3 reintentos automáticos
 * - Exponential backoff: 1s, 2s, 4s
 * - Solo reintenta errores recuperables (5xx, 408, 429)
 * - Logging de cada reintento
 *
 * @example
 * const response = await firstValueFrom(
 *   RetryInterceptor.withRetry(
 *     this.httpService.get(url),
 *     { maxRetries: 3, delayMs: 1000 }
 *   )
 * );
 */
export class RetryInterceptor {
  /**
   * Aplicar retry logic a un Observable de Axios
   */
  static withRetry<T>(
    observable: Observable<AxiosResponse<T>>,
    config: RetryConfig = {}
  ): Observable<AxiosResponse<T>> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

    return observable.pipe(
      retry({
        count: finalConfig.maxRetries,
        delay: (error: AxiosError, retryCount) => {
          // Determinar si el error es reintentar
          const statusCode = error.response?.status;

          // Si no es un error reintentar, fallar inmediatamente
          if (statusCode && !finalConfig.retryableErrors.includes(statusCode)) {
            console.warn(
              `❌ Non-retryable error (${statusCode}), failing immediately`
            );
            return throwError(() => error);
          }

          // Calcular delay con exponential backoff
          const delayMs = finalConfig.exponentialBackoff
            ? finalConfig.delayMs * Math.pow(2, retryCount - 1)
            : finalConfig.delayMs;

          console.warn(
            `⚠️  Retry ${retryCount}/${finalConfig.maxRetries} after ${delayMs}ms ` +
            `(Status: ${statusCode || 'Network Error'}, ` +
            `URL: ${error.config?.url})`
          );

          return timer(delayMs);
        },
      })
    );
  }

  /**
   * Verificar si un error HTTP es reintentar
   */
  static isRetryableError(error: AxiosError): boolean {
    const statusCode = error.response?.status;
    return (
      !statusCode || // Network errors (sin status code)
      DEFAULT_RETRY_CONFIG.retryableErrors.includes(statusCode)
    );
  }

  /**
   * Configuración de retry específica para servicios críticos
   */
  static getCriticalServiceRetryConfig(): RetryConfig {
    return {
      maxRetries: 5, // Más reintentos para servicios críticos
      delayMs: 500,  // Delay más corto
      exponentialBackoff: true,
      retryableErrors: [408, 429, 500, 502, 503, 504],
    };
  }

  /**
   * Configuración de retry específica para servicios no críticos
   */
  static getNonCriticalServiceRetryConfig(): RetryConfig {
    return {
      maxRetries: 2, // Menos reintentos
      delayMs: 2000, // Delay más largo
      exponentialBackoff: true,
      retryableErrors: [503, 504], // Solo reintentar service unavailable
    };
  }
}

/**
 * EJEMPLOS DE USO:
 *
 * 1. Uso básico con configuración por defecto (3 reintentos, 1s delay):
 * ```typescript
 * const response = await firstValueFrom(
 *   RetryInterceptor.withRetry(
 *     this.httpService.get('http://product-service:3004/products/123')
 *   )
 * );
 * ```
 *
 * 2. Uso con configuración personalizada:
 * ```typescript
 * const response = await firstValueFrom(
 *   RetryInterceptor.withRetry(
 *     this.httpService.get('http://product-service:3004/products/123'),
 *     { maxRetries: 5, delayMs: 500 }
 *   )
 * );
 * ```
 *
 * 3. Servicio crítico (más reintentos):
 * ```typescript
 * const response = await firstValueFrom(
 *   RetryInterceptor.withRetry(
 *     this.httpService.get('http://payment-service:3006/payments/charge'),
 *     RetryInterceptor.getCriticalServiceRetryConfig()
 *   )
 * );
 * ```
 */
