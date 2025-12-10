import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SecureCORS, SecurityHeaders } from '../../../shared/security/secure-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Configuración de seguridad global

  // 1. Headers de seguridad con Helmet
  app.use(helmet(SecurityHeaders.getHelmetOptions()));

  // 2. Cookie parser (necesario para cookies HttpOnly)
  app.use(cookieParser());

  // 3. CORS seguro
  const corsOptions = process.env.NODE_ENV === 'production'
    ? SecureCORS.getProductionCORSOptions()
    : {
        origin: process.env.CUSTOMER_APP_URL || 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      };

  app.enableCors(corsOptions);

  // 4. ValidationPipe con transformación (crítico para sanitización)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true, // ✅ Habilita transformaciones (@Transform en DTOs)
    transformOptions: {
      enableImplicitConversion: false, // Más seguro
    },
  }));

  // 5. Deshabilitar header X-Powered-By
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🔐 Auth Service running on port ${port}`);
  console.log(`✅ Security features enabled: Helmet, Rate Limiting, Secure Cookies`);
}

bootstrap();
