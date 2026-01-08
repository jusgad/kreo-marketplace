import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { User } from './entities/user.entity';
import { OAuthConnection } from './entities/oauth-connection.entity';
import { validateAuthServiceEnv } from '../../../shared/config/env.validation';

/**
 * App Module para Auth Service
 *
 * SEGURIDAD: Incluye validación de variables de entorno críticas
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateAuthServiceEnv, // ✅ VALIDACIÓN AGREGADA
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
        url: configService.get('DATABASE_URL'),
        entities: [User, OAuthConnection],
        synchronize: false, // Use migrations in production
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    AuthModule,
  ],
})
export class AppModule {}
