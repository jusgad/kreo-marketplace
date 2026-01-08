// ==============================================================================
// ARCHIVO: shared/database/index.ts
// FUNCIONALIDAD: Exports centralizados para database utilities
// ==============================================================================

export {
  getTypeORMConfig,
  createOptimizedDataSource,
  checkDatabaseHealth,
  getPoolStats,
  closeDataSource,
  DatabaseConfig,
} from './typeorm.config';
