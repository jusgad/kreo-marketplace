// ==============================================================================
// ARCHIVO: shared/circuit-breaker/circuit-breaker.config.ts
// FUNCIONALIDAD: Configuración de Circuit Breakers para prevenir cascading failures
// - Configuración por servicio con fallbacks
// - Timeouts configurables
// - Thresholds de error personalizables
// - Métricas de rendimiento
// ==============================================================================

export interface CircuitBreakerConfig {
  // Timeout en ms para cada request (default: 3000ms)
  timeout: number;

  // Número de errores antes de abrir el circuito (default: 50%)
  errorThresholdPercentage: number;

  // Tiempo en ms que el circuito permanece abierto antes de intentar nuevamente (default: 30s)
  resetTimeout: number;

  // Tamaño de ventana para calcular el threshold (default: 10 requests)
  rollingCountTimeout: number;

  // Número mínimo de requests antes de evaluar threshold (default: 5)
  rollingCountBuckets: number;

  // Nombre del circuit breaker para logging
  name: string;

  // Habilitar fallback cache (si existe)
  enableFallbackCache?: boolean;

  // Habilitar métricas detalladas
  enableMetrics?: boolean;
}

/**
 * Configuraciones predefinidas por tipo de servicio
 */
export const CircuitBreakerPresets = {
  /**
   * CRÍTICO: Para servicios críticos que no pueden fallar
   * - Timeout corto (2s)
   * - Threshold bajo (30% errores)
   * - Reset rápido (15s)
   */
  CRITICAL: {
    timeout: 2000,
    errorThresholdPercentage: 30,
    resetTimeout: 15000,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 5,
    enableMetrics: true,
  },

  /**
   * NORMAL: Para servicios normales
   * - Timeout medio (3s)
   * - Threshold medio (50% errores)
   * - Reset normal (30s)
   */
  NORMAL: {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10,
    enableMetrics: true,
  },

  /**
   * TOLERANTE: Para servicios que pueden fallar ocasionalmente
   * - Timeout largo (5s)
   * - Threshold alto (70% errores)
   * - Reset lento (60s)
   */
  TOLERANT: {
    timeout: 5000,
    errorThresholdPercentage: 70,
    resetTimeout: 60000,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10,
    enableMetrics: true,
  },

  /**
   * EXTERNAL: Para servicios externos (Stripe, S3, etc.)
   * - Timeout muy largo (10s)
   * - Threshold muy alto (80% errores)
   * - Reset muy lento (120s)
   */
  EXTERNAL: {
    timeout: 10000,
    errorThresholdPercentage: 80,
    resetTimeout: 120000,
    rollingCountTimeout: 20000,
    rollingCountBuckets: 10,
    enableMetrics: true,
  },
};

/**
 * Configuraciones específicas por servicio
 */
export const ServiceCircuitBreakerConfigs = {
  // Product Service - Crítico para checkout
  'product-service': {
    ...CircuitBreakerPresets.CRITICAL,
    name: 'product-service',
    enableFallbackCache: true,
  },

  // Payment Service - Crítico para transacciones
  'payment-service': {
    ...CircuitBreakerPresets.CRITICAL,
    name: 'payment-service',
    timeout: 5000, // Stripe puede ser lento
  },

  // Order Service - Normal
  'order-service': {
    ...CircuitBreakerPresets.NORMAL,
    name: 'order-service',
  },

  // Auth Service - Crítico para seguridad
  'auth-service': {
    ...CircuitBreakerPresets.CRITICAL,
    name: 'auth-service',
    enableFallbackCache: true,
  },

  // Stripe API - Servicio externo
  stripe: {
    ...CircuitBreakerPresets.EXTERNAL,
    name: 'stripe-api',
  },

  // Elasticsearch - Tolerante (fallback a DB)
  elasticsearch: {
    ...CircuitBreakerPresets.TOLERANT,
    name: 'elasticsearch',
    timeout: 2000, // Búsquedas deben ser rápidas
  },
};
