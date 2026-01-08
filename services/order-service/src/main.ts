import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { LoggerService } from '../../../shared/logging';

async function bootstrap() {
  const logger = new Logger('OrderService');

  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'development'
      ? ['log', 'error', 'warn', 'debug', 'verbose']
      : ['error', 'warn'],
  });

  app.use(helmet());

  app.enableCors({
    origin: [
      process.env.CUSTOMER_APP_URL || 'http://localhost:5173',
      process.env.VENDOR_PORTAL_URL || 'http://localhost:5174',
      process.env.API_GATEWAY_URL || 'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    })
  );

  app.enableShutdownHooks();

  const port = process.env.PORT || 3005;

  await app.listen(port);

  logger.log(`🚀 Order Service running on port ${port}`);
  logger.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔗 Database: ${process.env.DATABASE_URL ? '✅ Connected' : '⚠️  Not configured'}`);
}

const bootstrapLogger = new LoggerService('order-service');
bootstrap().catch((error) => {
  bootstrapLogger.error('Failed to start Order Service', error);
  process.exit(1);
});
