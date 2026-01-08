// ==============================================================================
// ARCHIVO: shared/database/migration.config.ts
// FUNCIONALIDAD: Configuración de TypeORM para migraciones
// - DataSource para CLI de migraciones
// - Configuración por servicio
// - Paths a entities y migrations
// ==============================================================================

import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

/**
 * Configuración base para migraciones
 */
const getBaseConfig = (serviceName: string): DataSourceOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || `kreo_${serviceName}`,

    // Sincronización automática DESHABILITADA (usar migraciones)
    synchronize: false,

    // Logging de queries (solo en desarrollo)
    logging: !isProduction,

    // Entities path
    entities: [
      path.join(__dirname, `../../services/${serviceName}/src/entities/**/*.entity{.ts,.js}`)
    ],

    // Migrations path
    migrations: [
      path.join(__dirname, './migrations/**/*{.ts,.js}')
    ],

    // Subscribers path (opcional)
    subscribers: [],

    // CLI configuration
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: isProduction, // Auto-run en producción
  };
};

/**
 * DataSource para auth-service
 */
export const AuthServiceDataSource = new DataSource({
  ...getBaseConfig('auth-service'),
  database: process.env.AUTH_DB_NAME || 'kreo_auth',
});

/**
 * DataSource para product-service
 */
export const ProductServiceDataSource = new DataSource({
  ...getBaseConfig('product-service'),
  database: process.env.PRODUCT_DB_NAME || 'kreo_products',
});

/**
 * DataSource para order-service
 */
export const OrderServiceDataSource = new DataSource({
  ...getBaseConfig('order-service'),
  database: process.env.ORDER_DB_NAME || 'kreo_orders',
});

/**
 * DataSource para payment-service
 */
export const PaymentServiceDataSource = new DataSource({
  ...getBaseConfig('payment-service'),
  database: process.env.PAYMENT_DB_NAME || 'kreo_payments',
});

// Export default para uso con CLI
export default AuthServiceDataSource;
