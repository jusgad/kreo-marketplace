// ==============================================================================
// ARCHIVO: shared/database/typeorm.config.ts
// FUNCIONALIDAD: Configuración optimizada de TypeORM y connection pooling
//
// OPTIMIZACIONES APLICADAS:
// - Connection pooling con configuración óptima
// - Query caching habilitado
// - Logging optimizado para producción
// - SSL para conexiones seguras
// - Timeouts apropiados
// - Retry logic para conexiones
// ==============================================================================

import { DataSource, DataSourceOptions } from 'typeorm';

export interface DatabaseConfig {
  url: string;
  entities: string[];
  migrations?: string[];
  synchronize?: boolean;
  logging?: boolean | ('query' | 'error' | 'schema' | 'warn' | 'info' | 'log')[];
}

export const getTypeORMConfig = (config: DatabaseConfig): DataSourceOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    type: 'postgres',
    url: config.url,

    // Entities y migrations
    entities: config.entities,
    migrations: config.migrations,

    // NUNCA sincronizar en producción
    synchronize: config.synchronize ?? !isProduction,

    // ==============================================================================
    // CONNECTION POOLING OPTIMIZADO
    // ==============================================================================

    // Número máximo de conexiones en el pool
    // Fórmula recomendada: ((core_count * 2) + effective_spindle_count)
    // Para contenedores pequeños: 10-20
    // Para servidores grandes: 50-100
    extra: {
      // Connection pool configuration
      max: parseInt(process.env.DB_POOL_MAX || '20'), // Max connections
      min: parseInt(process.env.DB_POOL_MIN || '5'),  // Min connections

      // Connection lifecycle
      idleTimeoutMillis: 30000,  // Close idle connections after 30s
      connectionTimeoutMillis: 10000, // Wait 10s for connection

      // Keep-alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,

      // Statement timeout (prevent long-running queries)
      statement_timeout: 30000, // 30 seconds

      // SSL configuration for production
      ssl: isProduction ? {
        rejectUnauthorized: false, // Set to true in production with proper certs
      } : false,

      // Application name for monitoring
      application_name: `kreo_${process.env.SERVICE_NAME || 'service'}`,
    },

    // ==============================================================================
    // QUERY CACHING
    // ==============================================================================

    // Enable query result caching
    cache: {
      type: 'redis',
      options: {
        host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
        port: parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'),
        duration: 30000, // Cache for 30 seconds by default
      },
      // Alternatively, use database caching
      // type: 'database',
      // tableName: 'query_result_cache',
    },

    // ==============================================================================
    // LOGGING CONFIGURATION
    // ==============================================================================

    // Logging optimizado por ambiente
    logging: config.logging ?? (isProduction
      ? ['error', 'warn'] // Solo errores y warnings en producción
      : ['query', 'error', 'schema', 'warn'] // Más verbose en desarrollo
    ),

    // Log solo queries lentas en producción (> 1s)
    maxQueryExecutionTime: isProduction ? 1000 : undefined,

    // Logger personalizado
    logger: 'advanced-console',

    // ==============================================================================
    // PERFORMANCE OPTIMIZATIONS
    // ==============================================================================

    // Deshabilitar FK checks en desarrollo para mayor velocidad (cuidado!)
    dropSchema: false,

    // Habilitar modo debug en desarrollo
    debug: !isProduction,

    // ==============================================================================
    // NAMING STRATEGY
    // ==============================================================================

    // Usar snake_case para nombres de tablas y columnas (PostgreSQL convention)
    namingStrategy: {
      tableName: (className: string) => {
        return className.replace(/([A-Z])/g, '_$1').toLowerCase().slice(1) + 's';
      },
      columnName: (propertyName: string) => {
        return propertyName.replace(/([A-Z])/g, '_$1').toLowerCase();
      },
    } as any,
  };
};

/**
 * Create optimized DataSource with retry logic
 */
export const createOptimizedDataSource = async (
  config: DatabaseConfig
): Promise<DataSource> => {
  const options = getTypeORMConfig(config);
  const dataSource = new DataSource(options);

  // Retry logic for initial connection
  let retries = 5;
  let lastError: Error | undefined;

  while (retries > 0) {
    try {
      await dataSource.initialize();
      console.log('✅ Database connected successfully');

      // Log connection pool stats
      if (dataSource.driver.master) {
        console.log(`📊 Connection pool initialized:`, {
          max: options.extra?.max,
          min: options.extra?.min,
        });
      }

      return dataSource;
    } catch (error) {
      lastError = error as Error;
      retries--;
      console.error(`❌ Database connection failed, retries left: ${retries}`, error);

      if (retries > 0) {
        // Exponential backoff
        const delay = (6 - retries) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to connect to database after 5 retries: ${lastError?.message}`);
};

/**
 * Health check for database connection
 */
export const checkDatabaseHealth = async (dataSource: DataSource): Promise<boolean> => {
  try {
    await dataSource.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

/**
 * Get connection pool statistics
 */
export const getPoolStats = (dataSource: DataSource): any => {
  // TypeORM doesn't expose pool stats directly, but we can query pg_stat_activity
  return dataSource.query(`
    SELECT
      count(*) as total_connections,
      count(*) FILTER (WHERE state = 'active') as active_connections,
      count(*) FILTER (WHERE state = 'idle') as idle_connections,
      count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND application_name LIKE 'kreo_%'
  `);
};

/**
 * Close all connections gracefully
 */
export const closeDataSource = async (dataSource: DataSource): Promise<void> => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
    console.log('✅ Database connections closed');
  }
};
