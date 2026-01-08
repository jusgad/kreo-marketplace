import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { validatePaymentServiceEnv } from '../../../shared/config/env.validation';

/**
 * App Module para Payment Service
 *
 * SEGURIDAD CRÍTICA: Valida que STRIPE_SECRET_KEY y otras variables críticas estén configuradas
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validatePaymentServiceEnv, // ✅ VALIDACIÓN AGREGADA - CRÍTICO PARA PAGOS
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
        url: configService.get('DATABASE_URL') || configService.get('PAYMENT_DB_URL'),
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT') || 5432,
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE') || 'kreo_payments',
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

    // Habilitar cron jobs para retry automático de webhooks
    ScheduleModule.forRoot(),

    PaymentModule,
    AdminModule,
  ],
})
export class AppModule {}
