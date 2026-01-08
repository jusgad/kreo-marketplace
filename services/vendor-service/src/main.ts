// ==============================================================================
// VENDOR SERVICE - Main Entry Point
// Puerto: 3003
// Funcionalidad: Onboarding de vendedores, KYC, gestión de tiendas
// ==============================================================================

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env.PORT || 3003;
  await app.listen(port);

  console.log(`🚀 Vendor Service running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
}

bootstrap();
