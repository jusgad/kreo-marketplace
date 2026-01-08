// ==============================================================================
// ARCHIVO: shared/cache/redis.config.ts
// FUNCIONALIDAD: Configuración centralizada de Redis para caching
// - Connection pooling optimizado
// - Configuración de retry strategy
// - Health checks
// - Métricas de performance
// ==============================================================================

import { RedisOptions } from 'ioredis';

export interface RedisCacheConfig extends RedisOptions {
  // TTL por defecto en segundos
  defaultTTL: number;
  // Prefijo para todas las keys
  keyPrefix: string;
}

export const getRedisConfig = (serviceName: string): RedisCacheConfig => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  return {
    // Parsear URL de Redis
    host: new URL(redisUrl).hostname,
    port: parseInt(new URL(redisUrl).port || '6379'),

    // Connection pooling
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,

    // Retry strategy con backoff exponencial
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },

    // Reconnect on error
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },

    // Timeouts optimizados
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Keep alive
    keepAlive: 30000,

    // Lazy connect
    lazyConnect: false,

    // TTL por defecto: 5 minutos
    defaultTTL: 300,

    // Prefijo para evitar colisiones entre servicios
    keyPrefix: `kreo:${serviceName}:`,
  };
};

// Configuraciones específicas por tipo de cache
export const CacheTTL = {
  // Muy corto: 1 minuto
  VERY_SHORT: 60,

  // Corto: 5 minutos
  SHORT: 300,

  // Medio: 15 minutos
  MEDIUM: 900,

  // Largo: 1 hora
  LONG: 3600,

  // Muy largo: 24 horas
  VERY_LONG: 86400,

  // Semi-permanente: 7 días
  WEEK: 604800,
};

// Keys específicas para diferentes tipos de cache
export const CacheKeys = {
  // Productos
  PRODUCT: (id: string) => `product:${id}`,
  PRODUCT_LIST: (page: number, limit: number, filters: string) =>
    `products:list:${page}:${limit}:${filters}`,
  PRODUCT_SEARCH: (query: string, page: number) =>
    `products:search:${query}:${page}`,
  POPULAR_PRODUCTS: 'products:popular',
  CATEGORY_PRODUCTS: (categoryId: string, page: number) =>
    `products:category:${categoryId}:${page}`,

  // Usuario
  USER: (id: string) => `user:${id}`,
  USER_SESSION: (sessionId: string) => `session:${sessionId}`,
  USER_PERMISSIONS: (id: string) => `user:permissions:${id}`,

  // Carrito
  CART: (userId: string) => `cart:${userId}`,

  // Órdenes
  ORDER: (id: string) => `order:${id}`,
  USER_ORDERS: (userId: string, page: number) => `orders:user:${userId}:${page}`,

  // Configuraciones
  CONFIG: (key: string) => `config:${key}`,

  // Rate limiting
  RATE_LIMIT: (identifier: string, endpoint: string) =>
    `ratelimit:${identifier}:${endpoint}`,
};

// Patrones para invalidación de cache
export const CacheInvalidationPatterns = {
  ALL_PRODUCTS: 'products:*',
  PRODUCT: (id: string) => `product:${id}*`,
  USER: (id: string) => `user:${id}*`,
  ORDER: (id: string) => `order:${id}*`,
  CART: (userId: string) => `cart:${userId}*`,
};
