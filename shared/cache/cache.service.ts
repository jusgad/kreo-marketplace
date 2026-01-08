// ==============================================================================
// ARCHIVO: shared/cache/cache.service.ts
// FUNCIONALIDAD: Servicio de caching genérico con Redis
// - Get/Set con TTL configurable
// - Cache invalidation patterns
// - Métricas de hit/miss ratio
// - Compression para valores grandes
// - Automatic serialization/deserialization
// ==============================================================================

import Redis from 'ioredis';
import { getRedisConfig, CacheTTL } from './redis.config';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { LoggerService } from '../logging';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class CacheService {
  private redis: Redis;
  private serviceName: string;
  private logger: LoggerService;
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  // Comprimir valores mayores a 1KB
  private readonly COMPRESSION_THRESHOLD = 1024;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = new LoggerService(`Cache:${serviceName}`);
    const config = getRedisConfig(serviceName);
    this.redis = new Redis(config);

    this.redis.on('connect', () => {
      this.logger.info(`Redis connected`, { serviceName });
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis error`, err, { serviceName });
    });
  }

  /**
   * Obtener valor del cache con deserialización automática
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);

      if (!value) {
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;

      // Verificar si está comprimido
      if (value.startsWith('GZIP:')) {
        const compressed = Buffer.from(value.slice(5), 'base64');
        const decompressed = await gunzip(compressed);
        return JSON.parse(decompressed.toString());
      }

      return JSON.parse(value);
    } catch (error) {
      this.logger.error(`Cache get error`, error as Error, { key });
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Guardar valor en cache con serialización y compresión automática
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = CacheTTL.MEDIUM
  ): Promise<boolean> {
    try {
      let serialized = JSON.stringify(value);

      // Comprimir si es muy grande
      if (serialized.length > this.COMPRESSION_THRESHOLD) {
        const compressed = await gzip(Buffer.from(serialized));
        serialized = 'GZIP:' + compressed.toString('base64');
      }

      await this.redis.setex(key, ttl, serialized);
      this.metrics.sets++;
      return true;
    } catch (error) {
      this.logger.error(`Cache set error`, error as Error, { key });
      return false;
    }
  }

  /**
   * Guardar múltiples valores en una operación pipeline
   */
  async setMany<T>(
    items: Array<{ key: string; value: T; ttl?: number }>,
    defaultTTL: number = CacheTTL.MEDIUM
  ): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();

      for (const item of items) {
        const serialized = JSON.stringify(item.value);
        const ttl = item.ttl || defaultTTL;
        pipeline.setex(item.key, ttl, serialized);
      }

      await pipeline.exec();
      this.metrics.sets += items.length;
      return true;
    } catch (error) {
      this.logger.error(`Cache setMany error`, error as Error);
      return false;
    }
  }

  /**
   * Obtener múltiples valores en una operación pipeline
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    try {
      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.get(key));

      const results = await pipeline.exec();
      const map = new Map<string, T>();

      results?.forEach((result, index) => {
        const [err, value] = result;
        if (!err && value) {
          try {
            map.set(keys[index], JSON.parse(value as string));
            this.metrics.hits++;
          } catch (e) {
            this.metrics.misses++;
          }
        } else {
          this.metrics.misses++;
        }
      });

      return map;
    } catch (error) {
      this.logger.error(`Cache getMany error`, error as Error);
      return new Map();
    }
  }

  /**
   * Eliminar una key del cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      this.metrics.deletes++;
      return true;
    } catch (error) {
      this.logger.error(`Cache delete error`, error as Error, { key });
      return false;
    }
  }

  /**
   * Eliminar múltiples keys que coincidan con un patrón
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      await this.redis.del(...keys);
      this.metrics.deletes += keys.length;
      return keys.length;
    } catch (error) {
      this.logger.error(`Cache deletePattern error`, error as Error, { pattern });
      return 0;
    }
  }

  /**
   * Verificar si una key existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error`, error as Error, { key });
      return false;
    }
  }

  /**
   * Incrementar un valor numérico (útil para contadores)
   */
  async increment(key: string, by: number = 1, ttl?: number): Promise<number> {
    try {
      const value = await this.redis.incrby(key, by);

      if (ttl && value === by) {
        // Si es la primera vez que se incrementa, establecer TTL
        await this.redis.expire(key, ttl);
      }

      return value;
    } catch (error) {
      this.logger.error(`Cache increment error`, error as Error, { key });
      return 0;
    }
  }

  /**
   * Decrementar un valor numérico
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.decrby(key, by);
    } catch (error) {
      this.logger.error(`Cache decrement error`, error as Error, { key });
      return 0;
    }
  }

  /**
   * Obtener tiempo restante de vida (TTL) de una key
   */
  async getTTL(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Cache getTTL error`, error as Error, { key });
      return -1;
    }
  }

  /**
   * Extender el TTL de una key existente
   */
  async extend(key: string, ttl: number): Promise<boolean> {
    try {
      await this.redis.expire(key, ttl);
      return true;
    } catch (error) {
      this.logger.error(`Cache extend error`, error as Error, { key });
      return false;
    }
  }

  /**
   * Cache-aside pattern: intentar obtener del cache, si no existe, ejecutar función y guardar
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CacheTTL.MEDIUM
  ): Promise<T> {
    // Intentar obtener del cache
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    // Si no existe, ejecutar fetcher
    const value = await fetcher();

    // Guardar en cache (fire and forget)
    this.set(key, value, ttl).catch(err =>
      this.logger.error(`Failed to cache key`, err as Error, { key })
    );

    return value;
  }

  /**
   * Obtener métricas de performance del cache
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: hitRate.toFixed(2) + '%',
      total,
    };
  }

  /**
   * Resetear métricas
   */
  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Flush todo el cache (usar con precaución)
   */
  async flush(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      this.logger.error('Cache flush error', error as Error);
      return false;
    }
  }

  /**
   * Cerrar conexión de Redis
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}
