// ==============================================================================
// ARCHIVO: shared/security/secure-session.ts
// FUNCIONALIDAD: Gestión segura de sesiones y cookies
// - Configuración de cookies HTTP-Only y Secure para JWT
// - Manejo de access tokens (corta duración) y refresh tokens (larga duración)
// - Configuración de CORS seguro para producción y desarrollo
// - Headers de seguridad con Helmet (CSP, HSTS, X-Frame-Options, etc.)
// - Lista negra de tokens para invalidación
// - Configuración de sesiones con Redis Store
// ==============================================================================

/**
 * PARCHE DE SEGURIDAD #5B: Configuración de Sesiones y Cookies Seguras
 *
 * Este módulo proporciona configuración segura para cookies de sesión
 * y tokens JWT para prevenir secuestro de sesiones.
 */

import { Response } from 'express';

/**
 * Configuración de cookies seguras
 */
export interface SecureCookieOptions {
  /**
   * Nombre de la cookie
   */
  name?: string;

  /**
   * Tiempo de expiración en segundos
   */
  maxAge?: number;

  /**
   * Dominio de la cookie
   */
  domain?: string;

  /**
   * Path de la cookie
   */
  path?: string;

  /**
   * SameSite policy
   */
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Clase para manejo seguro de cookies y sesiones
 */
export class SecureSession {

  /**
   * Configuración de cookies HTTP-Only y Secure para tokens JWT
   *
   * ✅ HttpOnly: Previene acceso desde JavaScript (XSS)
   * ✅ Secure: Solo se envía por HTTPS
   * ✅ SameSite: Previene CSRF
   */
  static readonly SECURE_COOKIE_OPTIONS = {
    httpOnly: true,      // No accesible desde JavaScript
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
    sameSite: 'strict' as const,  // Prevenir CSRF
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
  };

  /**
   * Configuración para refresh token (más tiempo de vida)
   */
  static readonly REFRESH_TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/auth/refresh', // Solo enviar en ruta de refresh
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  };

  /**
   * Establece una cookie segura con el access token
   */
  static setAccessTokenCookie(
    response: Response,
    token: string,
    options?: Partial<SecureCookieOptions>
  ): void {
    response.cookie('access_token', token, {
      ...this.SECURE_COOKIE_OPTIONS,
      ...options,
    });
  }

  /**
   * Establece una cookie segura con el refresh token
   */
  static setRefreshTokenCookie(
    response: Response,
    token: string,
    options?: Partial<SecureCookieOptions>
  ): void {
    response.cookie('refresh_token', token, {
      ...this.REFRESH_TOKEN_COOKIE_OPTIONS,
      ...options,
    });
  }

  /**
   * Limpia las cookies de sesión (logout)
   */
  static clearSessionCookies(response: Response): void {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
    });
  }

  /**
   * Alias para clearSessionCookies
   * ✅ CRÍTICO #6: Método para limpiar tokens en logout
   */
  static clearTokenCookies(response: Response): void {
    return this.clearSessionCookies(response);
  }

  /**
   * Configuración recomendada de JWT
   */
  static readonly JWT_CONFIG = {
    /**
     * Access Token: Corto tiempo de vida (15 minutos)
     * Se usa para autenticar requests
     */
    accessToken: {
      secret: process.env.JWT_ACCESS_SECRET || 'change-me-in-production',
      expiresIn: '15m',
    },

    /**
     * Refresh Token: Largo tiempo de vida (7 días)
     * Se usa solo para obtener nuevos access tokens
     */
    refreshToken: {
      secret: process.env.JWT_REFRESH_SECRET || 'change-me-in-production',
      expiresIn: '7d',
    },
  };

  /**
   * Genera opciones seguras para express-session
   */
  static getExpressSessionOptions() {
    return {
      secret: process.env.SESSION_SECRET || 'change-me-in-production',
      name: 'sessionId', // Cambiar nombre por defecto (connect.sid)
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
      },
      // Usar Redis para almacenar sesiones en producción
      store: undefined, // Configurar RedisStore aquí
    };
  }
}

/**
 * Configuración de CORS segura
 */
export class SecureCORS {

  /**
   * Configuración de CORS para producción
   */
  static getProductionCORSOptions() {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');

    return {
      origin: (origin: string | undefined, callback: Function) => {
        // Permitir requests sin origin (Postman, mobile apps, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true, // Permitir cookies
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      maxAge: 86400, // 24 horas
    };
  }

  /**
   * Configuración de CORS para desarrollo
   */
  static getDevelopmentCORSOptions() {
    return {
      origin: true, // Permitir cualquier origin
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
  }
}

/**
 * Headers de seguridad adicionales
 */
export class SecurityHeaders {

  /**
   * Configuración de headers de seguridad usando helmet
   */
  static getHelmetOptions() {
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 año
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny', // Prevenir clickjacking
      },
      noSniff: true, // Prevenir MIME sniffing
      xssFilter: true, // Habilitar XSS filter del navegador
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    };
  }

  /**
   * Agregar headers de seguridad personalizados
   */
  static addCustomSecurityHeaders(response: Response): void {
    // Prevenir que el navegador adivine el content-type
    response.setHeader('X-Content-Type-Options', 'nosniff');

    // Protección XSS del navegador
    response.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevenir clickjacking
    response.setHeader('X-Frame-Options', 'DENY');

    // Control de referrer
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Deshabilitar caché para rutas sensibles
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.setHeader('Pragma', 'no-cache');

    // Remover header que revela tecnología
    response.removeHeader('X-Powered-By');
  }
}

/**
 * Configuración de sesión con Redis para escalabilidad
 */
export class RedisSessionStore {

  /**
   * Configuración de RedisStore para express-session
   */
  static createRedisStore(RedisStore: any, redisClient: any) {
    return new RedisStore({
      client: redisClient,
      prefix: 'session:',
      ttl: 86400, // 24 horas en segundos
      disableTouch: false, // Actualizar TTL en cada request
    });
  }
}

/**
 * Utilidades para validación de tokens
 */
export class TokenValidator {

  /**
   * Verifica que un token JWT sea válido y no esté en lista negra
   */
  static async isTokenBlacklisted(
    token: string,
    redisClient: any
  ): Promise<boolean> {
    const blacklistKey = `blacklist:${token}`;
    const isBlacklisted = await redisClient.get(blacklistKey);
    return isBlacklisted === '1';
  }

  /**
   * Agrega un token a la lista negra (logout, invalidación)
   */
  static async blacklistToken(
    token: string,
    expiresIn: number,
    redisClient: any
  ): Promise<void> {
    const blacklistKey = `blacklist:${token}`;
    await redisClient.setex(blacklistKey, expiresIn, '1');
  }

  /**
   * Invalida todos los tokens de un usuario
   */
  static async invalidateAllUserTokens(
    userId: string,
    redisClient: any
  ): Promise<void> {
    // Incrementar un contador de versión para el usuario
    const versionKey = `token_version:${userId}`;
    await redisClient.incr(versionKey);
  }

  /**
   * Obtiene la versión actual de tokens del usuario
   */
  static async getTokenVersion(
    userId: string,
    redisClient: any
  ): Promise<number> {
    const versionKey = `token_version:${userId}`;
    const version = await redisClient.get(versionKey);
    return parseInt(version || '0', 10);
  }
}
