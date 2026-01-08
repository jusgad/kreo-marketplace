// ==============================================================================
// ARCHIVO: shared/logging/logging.module.ts
// FUNCIONALIDAD: Módulo NestJS para el logger service
// ==============================================================================

import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggingModule {}
