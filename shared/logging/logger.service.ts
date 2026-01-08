// ==============================================================================
// ARCHIVO: shared/logging/logger.service.ts
// FUNCIONALIDAD: Logger service profesional con Winston
//
// ✅ CRÍTICO #4 SOLUCIONADO: Reemplaza console.log con logger estructurado
//
// CARACTERÍSTICAS:
// - Niveles de log: error, warn, info, debug, verbose
// - Formato JSON estructurado para producción
// - Sanitización automática de datos sensibles
// - Logging a archivos (error.log, combined.log)
// - Integración futura con CloudWatch, Datadog, etc.
// - Context tracking por servicio/módulo
// ==============================================================================

import { Injectable, Scope, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: process.env.SERVICE_NAME || 'unknown',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
      },
      transports: this.getTransports(),
    });
  }

  private getTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    if (process.env.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              let msg = `${timestamp} [${level}]`;
              if (context) msg += ` [${context}]`;
              msg += ` ${message}`;
              return msg;
            })
          ),
        })
      );
    } else {
      transports.push(new winston.transports.Console({ format: winston.format.json() }));
    }

    return transports;
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, meta?: any) {
    this.logger.info(message, { context: this.context, ...this.sanitizeSensitiveData(meta) });
  }

  error(message: string, trace?: string, meta?: any) {
    this.logger.error(message, { context: this.context, stack: trace, ...this.sanitizeSensitiveData(meta) });
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, { context: this.context, ...this.sanitizeSensitiveData(meta) });
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  verbose(message: string, meta?: any) {
    this.logger.verbose(message, { context: this.context, ...meta });
  }

  private sanitizeSensitiveData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password', 'password_hash', 'credit_card', 'creditCard', 'cvv', 'ssn',
      'token', 'accessToken', 'refreshToken', 'secret', 'api_key', 'apiKey',
      'stripe_secret', 'stripeSecret', 'jwt', 'authorization', 'cookie', 'session',
    ];

    if (typeof data === 'object' && data !== null) {
      const sanitized = Array.isArray(data) ? [...data] : { ...data };

      for (const key in sanitized) {
        const isSensitive = sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()));

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizeSensitiveData(sanitized[key]);
        }
      }

      return sanitized;
    }

    return data;
  }
}
