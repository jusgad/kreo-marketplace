// ==============================================================================
// ARCHIVO: shared/http/retry.interceptor.ts
// FUNCIONALIDAD: Interceptor para retry automático con backoff exponencial
//
// ✅ CRÍTICO #2 SOLUCIONADO: Retry logic para HTTP requests
//
// CARACTERÍSTICAS:
// - Backoff exponencial (1s, 2s, 4s, 8s, ...)
// - Solo reintenta errores recuperables (5xx, timeout, network errors)
// - Logging de reintentos para debugging
// - Configurable por operación
// ==============================================================================

import { Observable, retry, timer, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AxiosError } from 'axios';
import { RetryConfig } from './http-client.config';

export class RetryInterceptor {
  /**
   * Wrapper para agregar retry logic a un Observable de Axios
   *
   * @param observable - Observable del HTTP request
   * @param config - Configuración de retry
   * @returns Observable con retry logic aplicado
   */
  static withRetry<T>(
    observable: Observable<T>,
    config: RetryConfig = { maxRetries: 3, delayMs: 1000, backoffMultiplier: 2 }
  ): Observable<T> {
    return observable.pipe(
      retry({
        count: config.maxRetries,
        delay: (error: AxiosError, retryCount: number) => {
          // Solo reintentar errores recuperables
          if (!this.isRetryableError(error)) {
            return throwError(() => error);
          }

          // Calcular delay con backoff exponencial
          const backoffMultiplier = config.backoffMultiplier || 2;
          const backoffDelay = config.delayMs * Math.pow(backoffMultiplier, retryCount - 1);

          console.warn(
            `[RetryInterceptor] Retry ${retryCount}/${config.maxRetries} after ${backoffDelay}ms | Error: ${error.message}`
          );

          return timer(backoffDelay);
        },
      }),
      catchError((error: AxiosError) => {
        // Si todos los reintentos fallaron, loguear y propagar error
        console.error(
          `[RetryInterceptor] All retries exhausted (${config.maxRetries}) | Error: ${error.message}`
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Determinar si un error es recuperable y debe reintentar
   *
   * @param error - Error de Axios
   * @returns true si el error es recuperable
   */
  private static isRetryableError(error: AxiosError): boolean {
    // Sin respuesta = error de red o timeout (recuperable)
    if (!error.response) {
      return true;
    }

    // Status codes recuperables:
    // - 408: Request Timeout
    // - 429: Too Many Requests (rate limit)
    // - 500: Internal Server Error
    // - 502: Bad Gateway
    // - 503: Service Unavailable
    // - 504: Gateway Timeout
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];

    return retryableStatusCodes.includes(error.response.status);
  }

  /**
   * Configuración de retry estándar (3 reintentos)
   */
  static getStandardRetryConfig(): RetryConfig {
    return {
      maxRetries: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
    };
  }

  /**
   * Configuración de retry para servicios críticos (5 reintentos)
   */
  static getCriticalServiceRetryConfig(): RetryConfig {
    return {
      maxRetries: 5,
      delayMs: 500,
      backoffMultiplier: 2,
    };
  }

  /**
   * Configuración de retry para operaciones idempotentes (7 reintentos)
   */
  static getIdempotentRetryConfig(): RetryConfig {
    return {
      maxRetries: 7,
      delayMs: 1000,
      backoffMultiplier: 1.5,
    };
  }
}
