// ==============================================================================
// SHIPPING SERVICE - Main Entry Point
// Puerto: 3007
// Funcionalidad: Cálculo de costos de envío, tracking, integraciones
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

  const port = process.env.PORT || 3007;
  await app.listen(port);

  console.log(`🚀 Shipping Service running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
}

bootstrap();
