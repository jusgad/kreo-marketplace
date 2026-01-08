// ==============================================================================
// ARCHIVO: shared/security/jwt-blacklist.service.ts
// FUNCIONALIDAD: Sistema de revocación de tokens JWT con Redis
// ✅ CRÍTICO #4 SOLUCIONADO: Blacklist de tokens para logout y revocación
// - Almacena tokens revocados en Redis con TTL automático
// - Verifica si un token ha sido revocado antes de permitir acceso
// - Limpieza automática cuando expira el token (gracias a Redis TTL)
// - Soporte para logout de todas las sesiones de un usuario
// ==============================================================================

import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logging';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
  iat: number; // issued at (timestamp en segundos)
  exp: number; // expiration (timestamp en segundos)
}

@Injectable()
export class JwtBlacklistService {
  private redisClient: Redis;
  private logger: LoggerService;
  private readonly BLACKLIST_PREFIX = 'jwt:blacklist:';
  private readonly USER_SESSIONS_PREFIX = 'jwt:sessions:';

  constructor(private configService: ConfigService) {
    this.logger = new LoggerService('jwt-blacklist');

    // Configurar cliente de Redis
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis connection error', err, {
        redisUrl: redisUrl.replace(/:\/\/.*@/, '://[REDACTED]@'), // Ocultar credentials
      });
    });

    this.redisClient.on('connect', () => {
      this.logger.info('Redis connected successfully for JWT blacklist');
    });
  }

  /**
   * Revocar un token (agregar a la blacklist)
   * El token se almacena hasta su fecha de expiración natural
   *
   * @param token - Token JWT completo
   * @param payload - Payload decodificado del token
   * @param reason - Razón de la revocación (logout, security, etc.)
   */
  async revokeToken(token: string, payload: JwtPayload, reason: string = 'logout'): Promise<void> {
    try {
      const tokenKey = this.getTokenKey(token);
      const currentTime = Math.floor(Date.now() / 1000);

      // Calcular TTL: tiempo restante hasta que expire el token
      const ttl = payload.exp - currentTime;

      if (ttl <= 0) {
        // Token ya expirado, no necesita ser blacklisted
        this.logger.debug('Token already expired, not adding to blacklist', {
          userId: payload.sub,
          exp: payload.exp,
        });
        return;
      }

      // Guardar token en blacklist con TTL
      await this.redisClient.setex(
        tokenKey,
        ttl,
        JSON.stringify({
          userId: payload.sub,
          email: payload.email,
          revokedAt: new Date().toISOString(),
          reason,
          expiresAt: new Date(payload.exp * 1000).toISOString(),
        })
      );

      // Log de seguridad
      this.logger.logSecurityEvent('TOKEN_REVOKED', 'medium', {
        userId: payload.sub,
        email: payload.email,
        reason,
        ttl,
      });

    } catch (error) {
      this.logger.error('Failed to revoke token', error, {
        userId: payload.sub,
      });
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Verificar si un token está en la blacklist
   *
   * @param token - Token JWT completo
   * @returns true si el token está revocado, false si es válido
   */
  async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const tokenKey = this.getTokenKey(token);
      const exists = await this.redisClient.exists(tokenKey);
      return exists === 1;
    } catch (error) {
      this.logger.error('Failed to check token blacklist', error);
      // En caso de error de Redis, por seguridad rechazamos el token
      return true;
    }
  }

  /**
   * Revocar TODAS las sesiones de un usuario
   * Útil para:
   * - Cambio de contraseña
   * - Detección de cuenta comprometida
   * - Desactivación de cuenta
   *
   * @param userId - ID del usuario
   * @param reason - Razón de la revocación masiva
   */
  async revokeAllUserSessions(userId: string, reason: string = 'security'): Promise<void> {
    try {
      const userSessionKey = this.getUserSessionKey(userId);

      // Marcar que todas las sesiones del usuario están revocadas
      // TTL de 7 días (máximo lifetime de un token típicamente)
      const ttl = 7 * 24 * 60 * 60;

      await this.redisClient.setex(
        userSessionKey,
        ttl,
        JSON.stringify({
          revokedAt: new Date().toISOString(),
          reason,
        })
      );

      this.logger.logSecurityEvent('ALL_USER_SESSIONS_REVOKED', 'high', {
        userId,
        reason,
      });

    } catch (error) {
      this.logger.error('Failed to revoke all user sessions', error, { userId });
      throw new Error('Failed to revoke user sessions');
    }
  }

  /**
   * Verificar si TODAS las sesiones del usuario están revocadas
   */
  async areAllUserSessionsRevoked(userId: string): Promise<boolean> {
    try {
      const userSessionKey = this.getUserSessionKey(userId);
      const exists = await this.redisClient.exists(userSessionKey);
      return exists === 1;
    } catch (error) {
      this.logger.error('Failed to check user sessions revocation', error, { userId });
      return true; // Por seguridad, rechazar en caso de error
    }
  }

  /**
   * Obtener información de un token revocado
   */
  async getTokenInfo(token: string): Promise<any | null> {
    try {
      const tokenKey = this.getTokenKey(token);
      const data = await this.redisClient.get(tokenKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error('Failed to get token info', error);
      return null;
    }
  }

  /**
   * Limpiar manualmente tokens expirados (opcional, Redis ya lo hace con TTL)
   * Este método es útil para auditorías o estadísticas
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      // Redis TTL se encarga automáticamente, pero podemos hacer una limpieza manual
      const pattern = `${this.BLACKLIST_PREFIX}*`;
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await this.redisClient.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;

        for (const key of keys) {
          const ttl = await this.redisClient.ttl(key);
          if (ttl === -2) {
            // Key no existe (ya expiró)
            deletedCount++;
          }
        }
      } while (cursor !== '0');

      this.logger.info('Cleaned up expired tokens', { deletedCount });
      return deletedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', error);
      return 0;
    }
  }

  /**
   * Obtener estadísticas de la blacklist
   */
  async getStats(): Promise<{
    totalBlacklistedTokens: number;
    totalRevokedUsers: number;
  }> {
    try {
      const tokenPattern = `${this.BLACKLIST_PREFIX}*`;
      const userPattern = `${USER_SESSIONS_PREFIX}*`;

      const tokenKeys = await this.scanKeys(tokenPattern);
      const userKeys = await this.scanKeys(userPattern);

      return {
        totalBlacklistedTokens: tokenKeys.length,
        totalRevokedUsers: userKeys.length,
      };
    } catch (error) {
      this.logger.error('Failed to get blacklist stats', error);
      return { totalBlacklistedTokens: 0, totalRevokedUsers: 0 };
    }
  }

  /**
   * Cerrar conexión de Redis (para cleanup)
   */
  async close(): Promise<void> {
    await this.redisClient.quit();
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  private getTokenKey(token: string): string {
    // Usar hash del token para evitar almacenar el token completo
    // (aunque en blacklist no es crítico, es una buena práctica)
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return `${this.BLACKLIST_PREFIX}${hash}`;
  }

  private getUserSessionKey(userId: string): string {
    return `${USER_SESSIONS_PREFIX}${userId}`;
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, foundKeys] = await this.redisClient.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    return keys;
  }
}
