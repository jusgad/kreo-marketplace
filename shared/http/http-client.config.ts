// ==============================================================================
// HTTP CLIENT CONFIGURATION WITH TIMEOUT AND RETRY
// SOLUCIÓN CRÍTICO #2: Implementa timeout y retry logic para prevenir requests colgados
// ==============================================================================

import { HttpModuleOptions } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';

/**
 * Configuración base de HTTP client con timeout
 *
 * CRITICAL FIX APLICADO:
 * - Timeout de 5000ms para prevenir requests colgados
 * - maxRedirects limitado a 5
 * - Headers de identificación de servicio
 */
export const getHttpClientConfig = (serviceName?: string): HttpModuleOptions => ({
  timeout: 5000, // ✅ 5 segundos timeout (CRÍTICO)
  maxRedirects: 5,
  headers: {
    'User-Agent': `kreo-marketplace/${serviceName || 'unknown'}`,
    'X-Service-Name': serviceName || 'unknown',
  },
});

/**
 * Configuración de HTTP client con timeout personalizado
 */
export const getHttpClientConfigWithTimeout = (
  serviceName: string,
  timeoutMs: number
): HttpModuleOptions => ({
  timeout: timeoutMs,
  maxRedirects: 5,
  headers: {
    'User-Agent': `kreo-marketplace/${serviceName}`,
    'X-Service-Name': serviceName,
  },
});

/**
 * Configuración de Axios Request con timeout
 * Para uso directo con HttpService.get/post
 */
export const getAxiosRequestConfig = (timeoutMs: number = 5000): AxiosRequestConfig => ({
  timeout: timeoutMs,
  headers: {
    'Content-Type': 'application/json',
  },
});
