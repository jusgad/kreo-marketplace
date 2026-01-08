// ==============================================================================
// ARCHIVO: shared/guards/internal-service.guard.ts
// FUNCIONALIDAD: Guard para proteger endpoints internos entre microservicios
// - Valida que la petición viene de un servicio interno autorizado
// - Verifica el secret compartido en el header X-Internal-Secret
// - Identifica el servicio de origen en X-Internal-Service
// ==============================================================================

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logging';

/**
 * Guard para proteger endpoints que solo deben ser accesibles por servicios internos
 *
 * USO:
 * @UseGuards(InternalServiceGuard)
 * @Post('internal/endpoint')
 * async internalEndpoint() { ... }
 *
 * El servicio que llama debe incluir headers:
 * - X-Internal-Service: nombre del servicio (ej: 'payment-service')
 * - X-Internal-Secret: secret compartido configurado en INTERNAL_SERVICE_SECRET
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  private logger: LoggerService;

  constructor(private configService: ConfigService) {
    this.logger = new LoggerService('InternalServiceGuard');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Obtener headers de autenticación interna
    const internalService = request.headers['x-internal-service'];
    const internalSecret = request.headers['x-internal-secret'];

    // Obtener secret esperado de las variables de entorno
    const expectedSecret = this.configService.get('INTERNAL_SERVICE_SECRET');

    // Validar que los headers existen
    if (!internalService || !internalSecret) {
      this.logger.warn('Internal service authentication missing headers', {
        ip: request.ip,
        url: request.url,
        method: request.method,
        hasService: !!internalService,
        hasSecret: !!internalSecret,
      });

      throw new UnauthorizedException('Missing internal service credentials');
    }

    // Validar que el secret es correcto
    if (internalSecret !== expectedSecret) {
      // Log de evento de seguridad
      this.logger.logSecurityEvent('INVALID_INTERNAL_SERVICE_SECRET', 'high', {
        claimedService: internalService,
        ip: request.ip,
        url: request.url,
        method: request.method,
      });

      throw new UnauthorizedException('Invalid internal service credentials');
    }

    // Lista de servicios internos autorizados
    const authorizedServices = [
      'payment-service',
      'order-service',
      'product-service',
      'auth-service',
      'notification-service',
    ];

    if (!authorizedServices.includes(internalService)) {
      this.logger.warn('Unauthorized internal service', {
        claimedService: internalService,
        ip: request.ip,
      });

      throw new UnauthorizedException('Unauthorized internal service');
    }

    // Log exitoso para auditoría
    this.logger.debug('Internal service authenticated successfully', {
      service: internalService,
      url: request.url,
      method: request.method,
    });

    // Agregar información del servicio al request para uso posterior
    request.internalService = internalService;

    return true;
  }
}
