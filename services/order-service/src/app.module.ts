import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { OrderModule } from './order/order.module';
import { CartModule } from './cart/cart.module';
import { validateOrderServiceEnv } from '../../../shared/config/env.validation';

/**
 * App Module para Order Service
 *
 * SEGURIDAD: Incluye validación de variables de entorno
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateOrderServiceEnv, // ✅ VALIDACIÓN AGREGADA
      envFilePath: process.env.NODE_ENV === 'production'
        ? '.env.production'
        : process.env.NODE_ENV === 'staging'
        ? '.env.staging'
        : '.env.development',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL') || configService.get('ORDER_DB_URL'),
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT') || 5432,
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE') || 'kreo_orders',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
        extra: {
          max: parseInt(process.env.DB_POOL_MAX || '10'),
          min: parseInt(process.env.DB_POOL_MIN || '2'),
        },
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),

    // HTTP Module para llamadas a otros servicios
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),

    OrderModule,
    CartModule,
  ],
})
export class AppModule {}
