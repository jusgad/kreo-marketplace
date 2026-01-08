import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from './product/product.module';
import { validateProductServiceEnv } from '../../../shared/config/env.validation';

/**
 * App Module para Product Service
 *
 * Configuración:
 * - ConfigModule: Variables de entorno (CON VALIDACIÓN)
 * - TypeOrmModule: Conexión a PostgreSQL
 * - ProductModule: Funcionalidad principal
 */
@Module({
  imports: [
    // Variables de entorno
    ConfigModule.forRoot({
      isGlobal: true, // Disponible en todos los módulos
      validate: validateProductServiceEnv, // ✅ VALIDACIÓN AGREGADA
      envFilePath: process.env.NODE_ENV === 'production'
        ? '.env.production'
        : process.env.NODE_ENV === 'staging'
        ? '.env.staging'
        : '.env.development',
    }),

    // Conexión a base de datos
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL') || configService.get('PRODUCT_DB_URL'),
        // En producción, usar variables separadas para mayor seguridad
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT') || 5432,
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE') || 'kreo_products',

        // Entities
        entities: [__dirname + '/**/*.entity{.ts,.js}'],

        // IMPORTANTE: Nunca usar synchronize en producción
        synchronize: process.env.NODE_ENV === 'development',

        // Logging solo en desarrollo
        logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],

        // Pool de conexiones
        extra: {
          max: parseInt(process.env.DB_POOL_MAX || '10'),
          min: parseInt(process.env.DB_POOL_MIN || '2'),
        },

        // SSL en producción
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false,
      }),
    }),

    // Módulo principal de productos
    ProductModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
