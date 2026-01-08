import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { LoggerService } from '../../../shared/logging';

async function bootstrap() {
  // ✅ CRÍTICO #3 SOLUCIONADO: Logger profesional con sanitización de datos sensibles
  const logger = new LoggerService('payment-service');

  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'development'
      ? ['log', 'error', 'warn', 'debug', 'verbose']
      : ['error', 'warn'],

    // IMPORTANTE: Para webhooks de Stripe necesitamos raw body
    rawBody: true,
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'stripe-signature'],
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

  // ✅ Configurar Swagger/OpenAPI Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Kreo Marketplace - Payment Service API')
      .setDescription(`
        API de gestión de pagos con Stripe Connect para split payments.

        **Características:**
        - Procesamiento de pagos con Stripe
        - Split payments automáticos a vendedores
        - Webhooks de eventos de pago
        - Gestión administrativa de webhooks fallidos
        - Retry automático con backoff exponencial

        **Autenticación:**
        - JWT Bearer token para endpoints protegidos
        - Admin-only endpoints requieren rol de administrador
        - Internal service endpoints usan X-Internal-Secret header
      `)
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido del auth-service',
        },
        'JWT-auth'
      )
      .addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: 'X-Internal-Secret',
          description: 'Secret compartido para autenticación entre servicios internos',
        },
        'internal-service'
      )
      .addTag('payments', 'Endpoints de procesamiento de pagos')
      .addTag('webhooks', 'Endpoints de webhooks de Stripe')
      .addTag('admin-webhooks', 'Gestión administrativa de webhooks fallidos (Admin only)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
      customSiteTitle: 'Payment Service API',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.info('Swagger documentation available at /api-docs');
  }

  const port = process.env.PORT || 3006;

  await app.listen(port);

  logger.info(`Payment Service started successfully on port ${port}`, {
    port,
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseConnected: !!process.env.DATABASE_URL,
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    // ✅ SEGURIDAD: NO se loguea el valor del secret, solo si existe
  });
}

bootstrap().catch((error) => {
  const logger = new LoggerService('payment-service');
  logger.error('Failed to start Payment Service', error);
  process.exit(1);
});
