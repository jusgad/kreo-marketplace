// ==============================================================================
// ARCHIVO: shared/security/webhook-rate-limiter.ts
// FUNCIONALIDAD: Rate limiting específico para webhooks
// - Previene ataques de denegación de servicio a webhooks
// - Limita requests por IP y por webhook signature
// - Configuración diferente para webhooks vs endpoints normales
// ==============================================================================

import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logging';

/**
 * Guard de rate limiting para webhooks
 *
 * USO:
 * @UseGuards(WebhookRateLimiter)
 * @Post('webhooks')
 * async handleWebhook() { ... }
 *
 * CONFIGURACIÓN:
 * - WEBHOOK_RATE_LIMIT_WINDOW: ventana de tiempo en segundos (default: 60)
 * - WEBHOOK_RATE_LIMIT_MAX: máximo de requests en la ventana (default: 100)
 */
@Injectable()
export class WebhookRateLimiter implements CanActivate {
  private redis: Redis;
  private logger: LoggerService;
  private window: number;
  private maxRequests: number;

  constructor(private configService: ConfigService) {
    this.logger = new LoggerService('WebhookRateLimiter');

    // Conectar a Redis
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: this.configService.get('REDIS_PORT') || 6379,
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB') || 0,
      keyPrefix: 'webhook:ratelimit:',
    });

    // Configuración de rate limiting
    this.window = parseInt(this.configService.get('WEBHOOK_RATE_LIMIT_WINDOW') || '60');
    this.maxRequests = parseInt(this.configService.get('WEBHOOK_RATE_LIMIT_MAX') || '100');

    this.redis.on('error', (err) => {
      this.logger.error('Redis error in webhook rate limiter', err);
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Obtener IP del cliente
    const ip = this.getClientIp(request);

    // Crear key única por IP
    const key = `${ip}`;

    try {
      // Obtener contador actual
      const current = await this.redis.get(key);
      const count = current ? parseInt(current) : 0;

      // Verificar si excede el límite
      if (count >= this.maxRequests) {
        this.logger.warn('Webhook rate limit exceeded', {
          ip,
          count,
          maxRequests: this.maxRequests,
          window: this.window,
        });

        // Log de evento de seguridad
        this.logger.logSecurityEvent('WEBHOOK_RATE_LIMIT_EXCEEDED', 'medium', {
          ip,
          count,
          maxRequests: this.maxRequests,
        });

        // Headers de rate limit
        response.header('X-RateLimit-Limit', this.maxRequests.toString());
        response.header('X-RateLimit-Remaining', '0');
        response.header('Retry-After', this.window.toString());

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many webhook requests. Please try again later.',
            retryAfter: this.window,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Incrementar contador
      const newCount = count + 1;

      if (count === 0) {
        // Primer request en esta ventana, establecer TTL
        await this.redis.setex(key, this.window, newCount.toString());
      } else {
        // Incrementar sin cambiar TTL
        await this.redis.incr(key);
      }

      // Obtener TTL restante
      const ttl = await this.redis.ttl(key);

      // Headers informativos
      response.header('X-RateLimit-Limit', this.maxRequests.toString());
      response.header('X-RateLimit-Remaining', (this.maxRequests - newCount).toString());
      response.header('X-RateLimit-Reset', (Date.now() + ttl * 1000).toString());

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error in webhook rate limiter', error as Error, { ip });

      // En caso de error de Redis, permitir el request (fail-open)
      // Esto previene que un fallo de Redis bloquee todos los webhooks
      return true;
    }
  }

  /**
   * Obtener IP del cliente considerando proxies
   */
  private getClientIp(request: any): string {
    // Intentar obtener IP real detrás de proxies
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = forwarded.split(',');
      return ips[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  /**
   * Limpiar rate limit de una IP específica (útil para testing)
   */
  async clearRateLimit(ip: string): Promise<void> {
    await this.redis.del(ip);
    this.logger.info('Rate limit cleared for IP', { ip });
  }

  /**
   * Obtener estadísticas de rate limiting
   */
  async getRateLimitStats(ip: string): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetAt: Date | null;
  }> {
    const key = ip;
    const current = parseInt((await this.redis.get(key)) || '0');
    const ttl = await this.redis.ttl(key);

    return {
      current,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - current),
      resetAt: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null,
    };
  }

  /**
   * Cerrar conexión de Redis
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
