import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { LoggerService } from '../../../shared/logging';

/**
 * Bootstrap del Product Service
 *
 * Configuración de seguridad y validación
 */
async function bootstrap() {
  const logger = new Logger('ProductService');

  const app = await NestFactory.create(AppModule, {
    // Habilitar logs en desarrollo
    logger: process.env.NODE_ENV === 'development'
      ? ['log', 'error', 'warn', 'debug', 'verbose']
      : ['error', 'warn'],
  });

  // ====================
  // SEGURIDAD
  // ====================

  // Helmet: Headers de seguridad HTTP
  app.use(helmet());

  // CORS: Permitir peticiones desde frontend
  app.enableCors({
    origin: [
      process.env.CUSTOMER_APP_URL || 'http://localhost:5173',
      process.env.VENDOR_PORTAL_URL || 'http://localhost:5174',
      process.env.API_GATEWAY_URL || 'http://localhost:3000',
    ],
    credentials: true, // Permitir cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Cookie Parser
  app.use(cookieParser());

  // ====================
  // VALIDACIÓN
  // ====================

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remover propiedades no definidas en DTO
      forbidNonWhitelisted: true, // Lanzar error si hay propiedades extra
      transform: true, // Transformar payloads a tipos definidos en DTO
      transformOptions: {
        enableImplicitConversion: true, // Convertir tipos automáticamente
      },
      // Mensajes de error detallados
      disableErrorMessages: process.env.NODE_ENV === 'production',
    })
  );

  // ====================
  // GLOBAL PREFIX
  // ====================

  // Prefijo global para todas las rutas (opcional)
  // app.setGlobalPrefix('api/v1');

  // ====================
  // SHUTDOWN HOOKS
  // ====================

  // Habilitar hooks de shutdown para cerrar conexiones correctamente
  app.enableShutdownHooks();

  // ====================
  // PUERTO
  // ====================

  const port = process.env.PORT || 3004;

  await app.listen(port);

  logger.log(`🚀 Product Service running on port ${port}`);
  logger.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔗 Database: ${process.env.DATABASE_URL ? '✅ Connected' : '⚠️  Not configured'}`);

  // Log de rutas disponibles (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    const server = app.getHttpServer();
    const router = server._events.request._router;
    logger.debug('Available routes:');
    // Aquí podrías listar las rutas si lo deseas
  }
}

const bootstrapLogger = new LoggerService('product-service');
bootstrap().catch((error) => {
  bootstrapLogger.error('Failed to start Product Service', error);
  process.exit(1);
});
