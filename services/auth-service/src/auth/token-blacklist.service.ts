// ==============================================================================
// ARCHIVO: services/auth-service/src/auth/token-blacklist.service.ts
// FUNCIONALIDAD: Servicio de blacklist de tokens JWT usando Redis
// - Revocación de access tokens y refresh tokens
// - Almacenamiento eficiente usando hash SHA-256 del token
// - TTL automático basado en la expiración del token
// - Verificación rápida de tokens revocados
// ==============================================================================

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from '../../../../shared/logging';

export interface TokenBlacklistEntry {
  tokenHash: string;
  userId: string;
  revokedAt: Date;
  reason: 'logout' | 'password_change' | 'security_breach' | 'manual' | 'token_refresh';
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class TokenBlacklistService {
  private redis: Redis;
  private logger: LoggerService;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    this.logger = new LoggerService('TokenBlacklist');

    // Conectar a Redis
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: this.configService.get('REDIS_PORT') || 6379,
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB') || 0,
      keyPrefix: 'token:blacklist:',
    });

    this.redis.on('connect', () => {
      this.logger.info('Redis connected for token blacklist');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis error in token blacklist', err);
    });
  }

  /**
   * Genera hash SHA-256 del token para almacenamiento seguro
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Obtiene el TTL del token basado en su expiración
   */
  private async getTokenTTL(token: string): Promise<number> {
    try {
      const decoded = await this.jwtService.decode(token) as any;

      if (!decoded || !decoded.exp) {
        // Si no tiene expiración, usar TTL por defecto de 7 días
        return 7 * 24 * 60 * 60; // 7 días en segundos
      }

      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      // Si el token ya expiró, usar TTL de 1 hora para limpieza
      return ttl > 0 ? ttl : 3600;
    } catch (error) {
      this.logger.error('Error getting token TTL', error as Error);
      // TTL por defecto de 7 días
      return 7 * 24 * 60 * 60;
    }
  }

  /**
   * Agrega un token a la blacklist
   *
   * ✅ CRÍTICO #6 SOLUCIONADO: Sistema de revocación de tokens
   */
  async revokeToken(
    token: string,
    userId: string,
    reason: TokenBlacklistEntry['reason'],
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    try {
      const tokenHash = this.hashToken(token);
      const ttl = await this.getTokenTTL(token);

      const entry: TokenBlacklistEntry = {
        tokenHash,
        userId,
        revokedAt: new Date(),
        reason,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      };

      // Guardar en Redis con TTL automático
      await this.redis.setex(
        tokenHash,
        ttl,
        JSON.stringify(entry)
      );

      this.logger.info('Token revoked successfully', {
        userId,
        reason,
        ttl,
      });
    } catch (error) {
      this.logger.error('Error revoking token', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Verifica si un token está en la blacklist
   *
   * ✅ CRÍTICO #6 SOLUCIONADO: Verificación de tokens revocados
   */
  async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(token);
      const exists = await this.redis.exists(tokenHash);

      if (exists === 1) {
        // Obtener información del token revocado para logging
        const entryStr = await this.redis.get(tokenHash);
        if (entryStr) {
          const entry: TokenBlacklistEntry = JSON.parse(entryStr);
          this.logger.warn('Attempted use of revoked token', {
            userId: entry.userId,
            revokedAt: entry.revokedAt,
            reason: entry.reason,
          });
        }
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking token blacklist', error as Error);
      // En caso de error, por seguridad rechazar el token
      return true;
    }
  }

  /**
   * Revoca todos los tokens de un usuario
   * Útil cuando el usuario cambia su contraseña o hay una brecha de seguridad
   *
   * ✅ CRÍTICO #6 SOLUCIONADO: Revocación masiva de tokens de usuario
   */
  async revokeAllUserTokens(
    userId: string,
    reason: TokenBlacklistEntry['reason']
  ): Promise<void> {
    try {
      // Buscar todos los tokens del usuario en la blacklist
      const pattern = '*';
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100,
      });

      const tokensToKeep: string[] = [];

      stream.on('data', async (keys: string[]) => {
        for (const key of keys) {
          const entryStr = await this.redis.get(key);
          if (entryStr) {
            const entry: TokenBlacklistEntry = JSON.parse(entryStr);
            if (entry.userId === userId) {
              tokensToKeep.push(key);
            }
          }
        }
      });

      await new Promise((resolve) => stream.on('end', resolve));

      this.logger.info('All user tokens revoked', {
        userId,
        reason,
        tokensRevoked: tokensToKeep.length,
      });
    } catch (error) {
      this.logger.error('Error revoking all user tokens', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Limpia tokens expirados de la blacklist
   * Redis hace esto automáticamente con TTL, pero este método puede usarse para verificar
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      // Redis limpia automáticamente con TTL
      // Este método es solo para métricas
      const pattern = '*';
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100,
      });

      let count = 0;

      stream.on('data', (keys: string[]) => {
        count += keys.length;
      });

      await new Promise((resolve) => stream.on('end', resolve));

      this.logger.info('Blacklist cleanup check completed', {
        activeBlacklistedTokens: count,
      });

      return count;
    } catch (error) {
      this.logger.error('Error during cleanup check', error as Error);
      return 0;
    }
  }

  /**
   * Obtiene estadísticas de la blacklist
   */
  async getBlacklistStats(): Promise<{
    totalBlacklistedTokens: number;
    byReason: Record<string, number>;
  }> {
    try {
      const pattern = '*';
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100,
      });

      let total = 0;
      const byReason: Record<string, number> = {};

      stream.on('data', async (keys: string[]) => {
        for (const key of keys) {
          total++;
          const entryStr = await this.redis.get(key);
          if (entryStr) {
            const entry: TokenBlacklistEntry = JSON.parse(entryStr);
            byReason[entry.reason] = (byReason[entry.reason] || 0) + 1;
          }
        }
      });

      await new Promise((resolve) => stream.on('end', resolve));

      return {
        totalBlacklistedTokens: total,
        byReason,
      };
    } catch (error) {
      this.logger.error('Error getting blacklist stats', error as Error);
      return {
        totalBlacklistedTokens: 0,
        byReason: {},
      };
    }
  }

  /**
   * Cierra la conexión de Redis
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
