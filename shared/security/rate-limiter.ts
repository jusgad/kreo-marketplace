// ==============================================================================
// ARCHIVO: shared/security/rate-limiter.ts
// FUNCIONALIDAD: Rate Limiting para prevenir ataques de fuerza bruta
// - Implementa limitación de peticiones usando Redis como backend
// - Protege endpoints críticos (login, registro, reset password)
// - Configurable por ruta con decoradores (@LoginRateLimit, @RegisterRateLimit)
// - Bloqueo temporal de IPs después de múltiples intentos fallidos
// - Headers de rate limit en respuestas (X-RateLimit-*)
// ==============================================================================

/**
 * PARCHE DE SEGURIDAD #5A: Rate Limiting para Prevenir Fuerza Bruta
 *
 * Este módulo implementa rate limiting usando Redis para prevenir
 * ataques de fuerza bruta en rutas de autenticación.
 */

import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';

/**
 * Configuración de rate limiting
 */
export interface RateLimitConfig {
  /**
   * Número máximo de requests permitidos
   */
  max: number;

  /**
   * Ventana de tiempo en segundos
   */
  windowSeconds: number;

  /**
   * Mensaje de error personalizado
   */
  message?: string;

  /**
   * Identificador único (por IP, por usuario, etc.)
   */
  keyGenerator?: (context: ExecutionContext) => string;
}

/**
 * Metadata key para rate limiting
 */
export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Decorador para aplicar rate limiting a una ruta
 *
 * @example
 * @RateLimit({ max: 5, windowSeconds: 60 }) // 5 intentos por minuto
 * @Post('login')
 * async login(@Body() loginDto: LoginDto) {
 *   // ...
 * }
 */
export const RateLimit = (config: RateLimitConfig) =>
  Reflect.metadata(RATE_LIMIT_KEY, config);

/**
 * Guard de rate limiting
 */
@Injectable()
export class RateLimitGuard {
  private redis: Redis;

  constructor(
    private reflector: Reflector,
    redisClient?: Redis
  ) {
    // Usar cliente Redis existente o crear uno nuevo
    this.redis = redisClient || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!config) {
      return true; // No hay rate limiting configurado
    }

    const request = context.switchToHttp().getRequest();

    // Generar key única para el rate limit
    const key = config.keyGenerator
      ? config.keyGenerator(context)
      : this.getDefaultKey(request);

    const rateLimitKey = `rate_limit:${key}`;

    // Incrementar contador
    const current = await this.redis.incr(rateLimitKey);

    // Si es el primer request, establecer TTL
    if (current === 1) {
      await this.redis.expire(rateLimitKey, config.windowSeconds);
    }

    // Verificar si se excedió el límite
    if (current > config.max) {
      const ttl = await this.redis.ttl(rateLimitKey);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: config.message || 'Demasiados intentos. Por favor intenta más tarde.',
          retryAfter: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Agregar headers de rate limit
    const response = context.switchToHttp().getResponse();
    response.header('X-RateLimit-Limit', config.max.toString());
    response.header('X-RateLimit-Remaining', (config.max - current).toString());
    response.header('X-RateLimit-Reset', (Date.now() + (await this.redis.ttl(rateLimitKey)) * 1000).toString());

    return true;
  }

  private getDefaultKey(request: any): string {
    // Usar IP del cliente como key por defecto
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const route = request.route?.path || request.url;
    return `${ip}:${route}`;
  }
}

/**
 * Clase helper para rate limiting manual en servicios
 */
@Injectable()
export class RateLimiter {
  private redis: Redis;

  constructor(redisClient?: Redis) {
    this.redis = redisClient || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  /**
   * Verifica si se excedió el rate limit
   *
   * @returns { allowed: boolean, remaining: number, resetAt: number }
   */
  async checkLimit(
    key: string,
    max: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const rateLimitKey = `rate_limit:${key}`;

    const current = await this.redis.incr(rateLimitKey);

    if (current === 1) {
      await this.redis.expire(rateLimitKey, windowSeconds);
    }

    const ttl = await this.redis.ttl(rateLimitKey);
    const resetAt = Date.now() + ttl * 1000;

    return {
      allowed: current <= max,
      remaining: Math.max(0, max - current),
      resetAt,
    };
  }

  /**
   * Bloquea temporalmente una IP después de múltiples intentos fallidos
   */
  async blockIP(ip: string, durationSeconds: number = 3600): Promise<void> {
    const blockKey = `blocked_ip:${ip}`;
    await this.redis.setex(blockKey, durationSeconds, '1');
  }

  /**
   * Verifica si una IP está bloqueada
   */
  async isIPBlocked(ip: string): Promise<boolean> {
    const blockKey = `blocked_ip:${ip}`;
    const blocked = await this.redis.get(blockKey);
    return blocked === '1';
  }

  /**
   * Incrementa contador de intentos fallidos
   */
  async incrementFailedAttempts(
    identifier: string,
    maxAttempts: number = 5,
    windowSeconds: number = 300
  ): Promise<{
    attempts: number;
    shouldBlock: boolean;
  }> {
    const key = `failed_attempts:${identifier}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    return {
      attempts,
      shouldBlock: attempts >= maxAttempts,
    };
  }

  /**
   * Resetea contador de intentos fallidos
   */
  async resetFailedAttempts(identifier: string): Promise<void> {
    const key = `failed_attempts:${identifier}`;
    await this.redis.del(key);
  }
}

/**
 * Decoradores predefinidos para casos comunes
 */

/**
 * Rate limit estricto para login (5 intentos por minuto)
 */
export const LoginRateLimit = () => RateLimit({
  max: 5,
  windowSeconds: 60,
  message: 'Demasiados intentos de inicio de sesión. Por favor espera 1 minuto.',
  keyGenerator: (context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const email = request.body?.email || 'unknown';
    return `login:${ip}:${email}`;
  },
});

/**
 * Rate limit para registro (3 registros por hora por IP)
 */
export const RegisterRateLimit = () => RateLimit({
  max: 3,
  windowSeconds: 3600,
  message: 'Demasiados intentos de registro. Por favor intenta más tarde.',
});

/**
 * Rate limit para reset de password (3 intentos por hora)
 */
export const PasswordResetRateLimit = () => RateLimit({
  max: 3,
  windowSeconds: 3600,
  message: 'Demasiadas solicitudes de restablecimiento de contraseña.',
});

/**
 * Rate limit general para APIs (100 requests por minuto)
 */
export const APIRateLimit = () => RateLimit({
  max: 100,
  windowSeconds: 60,
  message: 'Demasiadas solicitudes. Por favor reduce la frecuencia.',
});
