// ==============================================================================
// ARCHIVO: shared/filters/global-exception.filter.ts
// FUNCIONALIDAD: Filtro global de excepciones para respuestas consistentes
// - Captura todas las excepciones no manejadas
// - Transforma a formato de respuesta consistente
// - Oculta información sensible en producción
// - Integra con sistema de logging
// - Maneja diferentes tipos de errores (validación, auth, etc.)
// ==============================================================================

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logging';

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error?: string;
  requestId?: string;
  validationErrors?: any[];
  stack?: string; // Solo en desarrollo
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private logger: LoggerService;

  constructor(serviceName: string) {
    this.logger = new LoggerService(serviceName);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProduction = process.env.NODE_ENV === 'production';
    const requestId = (request as any).id || request.headers['x-request-id'];

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';
    let validationErrors: any[] | undefined;

    // Determinar tipo de excepción y extraer información
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || exception.name;
        validationErrors = responseObj.validationErrors || responseObj.message;

        // Si validationErrors es array de strings, usar como array
        if (Array.isArray(validationErrors)) {
          // Mantener array
        } else if (typeof validationErrors === 'string') {
          message = validationErrors;
          validationErrors = undefined;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Crear respuesta de error consistente
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
      requestId: requestId as string,
    };

    // Agregar validation errors si existen
    if (validationErrors && Array.isArray(validationErrors)) {
      errorResponse.validationErrors = validationErrors;
    }

    // En desarrollo, incluir stack trace
    if (!isProduction && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // Log del error
    if (status >= 500) {
      this.logger.error(
        `Server error: ${message}`,
        exception instanceof Error ? exception : undefined,
        {
          requestId: requestId as string,
          method: request.method,
          url: request.url,
          statusCode: status,
          userId: (request as any).user?.id,
          ip: request.ip,
        }
      );
    } else if (status >= 400) {
      this.logger.warn(`Client error: ${message}`, {
        requestId: requestId as string,
        method: request.method,
        url: request.url,
        statusCode: status,
        userId: (request as any).user?.id,
      });
    }

    // Log de eventos de seguridad específicos
    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      this.logger.logSecurityEvent(
        status === HttpStatus.UNAUTHORIZED ? 'Unauthorized access attempt' : 'Forbidden access attempt',
        'medium',
        {
          path: request.url,
          method: request.method,
          userId: (request as any).user?.id,
        },
        {
          requestId: requestId as string,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        }
      );
    }

    // Enviar respuesta
    response.status(status).json(errorResponse);
  }
}
