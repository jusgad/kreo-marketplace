// ==============================================================================
// ARCHIVO: shared/logging/logging.interceptor.ts
// FUNCIONALIDAD: Interceptor de NestJS para logging automático de requests
// - Log de todas las requests HTTP entrantes
// - Log de todas las responses con duración
// - Log de errores con stack trace
// - Agrega requestId automáticamente
// ==============================================================================

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggerService } from './logger.service';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger: LoggerService;

  constructor(serviceName: string) {
    this.logger = new LoggerService(serviceName);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Solo aplicar a HTTP requests
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // Generar requestId único si no existe
    if (!request.id && !request.headers['x-request-id']) {
      request.id = randomUUID();
      request.headers['x-request-id'] = request.id;
    } else {
      request.id = request.id || request.headers['x-request-id'];
    }

    // Agregar requestId al response header
    response.setHeader('X-Request-ID', request.id);

    // Log de request entrante
    this.logger.logRequest(request);

    const startTime = Date.now();

    return next.handle().pipe(
      // Log de response exitoso
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.logResponse(request, response, duration);
      }),

      // Log de errores
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Si es HttpException, extraer info
        if (error instanceof HttpException) {
          const status = error.getStatus();
          response.statusCode = status;
          this.logger.logResponse(request, response, duration);

          // Log adicional del error
          this.logger.error(
            `HTTP ${status} error: ${error.message}`,
            error,
            {
              requestId: request.id,
              method: request.method,
              url: request.url,
              statusCode: status,
            }
          );
        } else {
          // Error no HTTP (500)
          response.statusCode = 500;
          this.logger.logResponse(request, response, duration);

          this.logger.error(
            'Unhandled error in request',
            error,
            {
              requestId: request.id,
              method: request.method,
              url: request.url,
            }
          );
        }

        return throwError(() => error);
      })
    );
  }
}
