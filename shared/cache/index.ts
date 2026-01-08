// ==============================================================================
// ARCHIVO: shared/cache/index.ts
// FUNCIONALIDAD: Exports centralizados para el módulo de cache
// ==============================================================================

export { CacheService } from './cache.service';
export {
  getRedisConfig,
  CacheTTL,
  CacheKeys,
  CacheInvalidationPatterns
} from './redis.config';
