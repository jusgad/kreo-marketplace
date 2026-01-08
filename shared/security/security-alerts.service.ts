// ==============================================================================
// ARCHIVO: shared/security/security-alerts.service.ts
// FUNCIONALIDAD: Servicio de alertas de seguridad
// - Envía notificaciones cuando ocurren eventos de seguridad críticos
// - Integración con Slack, Email, PagerDuty, etc.
// - Rate limiting de alertas para evitar spam
// - Agregación de eventos similares
// ==============================================================================

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { LoggerService } from '../logging';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityAlert {
  severity: AlertSeverity;
  event: string;
  description: string;
  data?: any;
  timestamp: Date;
  service: string;
}

@Injectable()
export class SecurityAlertsService {
  private redis: Redis;
  private logger: LoggerService;
  private slackWebhookUrl: string | undefined;
  private alertEmail: string | undefined;
  private enableAlerts: boolean;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.logger = new LoggerService('SecurityAlerts');

    // Configuración
    this.slackWebhookUrl = this.configService.get('SLACK_WEBHOOK_URL');
    this.alertEmail = this.configService.get('SECURITY_ALERT_EMAIL');
    this.enableAlerts = this.configService.get('ENABLE_SECURITY_ALERTS') !== 'false';

    // Redis para rate limiting de alertas
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: this.configService.get('REDIS_PORT') || 6379,
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB') || 0,
      keyPrefix: 'security:alerts:',
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis error in security alerts', err);
    });
  }

  /**
   * Enviar alerta de seguridad
   *
   * ✅ SEGURIDAD: Rate limiting para evitar spam de alertas
   */
  async sendAlert(alert: SecurityAlert): Promise<void> {
    if (!this.enableAlerts) {
      this.logger.debug('Security alerts disabled, skipping', { event: alert.event });
      return;
    }

    try {
      // Rate limiting: no enviar la misma alerta más de una vez por hora
      const rateLimitKey = `${alert.event}:${alert.severity}`;
      const alreadySent = await this.redis.get(rateLimitKey);

      if (alreadySent) {
        this.logger.debug('Alert rate limited', {
          event: alert.event,
          severity: alert.severity,
        });

        // Incrementar contador de alertas suprimidas
        await this.redis.incr(`suppressed:${rateLimitKey}`);
        return;
      }

      // Marcar como enviada (TTL: 1 hora)
      await this.redis.setex(rateLimitKey, 3600, '1');

      // Enviar a todos los canales configurados
      await Promise.allSettled([
        this.sendToSlack(alert),
        this.sendToEmail(alert),
        this.sendToLog(alert),
      ]);

      this.logger.info('Security alert sent', {
        event: alert.event,
        severity: alert.severity,
      });
    } catch (error) {
      this.logger.error('Failed to send security alert', error as Error, {
        event: alert.event,
      });
    }
  }

  /**
   * Enviar alerta a Slack
   */
  private async sendToSlack(alert: SecurityAlert): Promise<void> {
    if (!this.slackWebhookUrl) {
      return;
    }

    try {
      const color = this.getSeverityColor(alert.severity);
      const emoji = this.getSeverityEmoji(alert.severity);

      const payload = {
        username: 'Security Alert Bot',
        icon_emoji: ':shield:',
        attachments: [
          {
            color,
            title: `${emoji} Security Alert: ${alert.event}`,
            text: alert.description,
            fields: [
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Service',
                value: alert.service,
                short: true,
              },
              {
                title: 'Timestamp',
                value: alert.timestamp.toISOString(),
                short: false,
              },
            ],
            footer: 'Kreo Marketplace Security',
            ts: Math.floor(alert.timestamp.getTime() / 1000),
          },
        ],
      };

      // Agregar datos adicionales si existen
      if (alert.data) {
        payload.attachments[0].fields.push({
          title: 'Details',
          value: '```' + JSON.stringify(alert.data, null, 2) + '```',
          short: false,
        });
      }

      await firstValueFrom(
        this.httpService.post(this.slackWebhookUrl, payload, {
          timeout: 5000,
        })
      );

      this.logger.debug('Alert sent to Slack', { event: alert.event });
    } catch (error) {
      this.logger.error('Failed to send alert to Slack', error as Error);
    }
  }

  /**
   * Enviar alerta por email (placeholder)
   */
  private async sendToEmail(alert: SecurityAlert): Promise<void> {
    if (!this.alertEmail) {
      return;
    }

    // TODO: Implementar envío de email con servicio de email (SendGrid, SES, etc.)
    this.logger.debug('Email alerts not yet implemented', {
      recipient: this.alertEmail,
      event: alert.event,
    });
  }

  /**
   * Registrar alerta en logs
   */
  private async sendToLog(alert: SecurityAlert): Promise<void> {
    this.logger.logSecurityEvent(
      alert.event,
      alert.severity,
      {
        description: alert.description,
        service: alert.service,
        ...alert.data,
      }
    );
  }

  /**
   * Obtener color según severidad (para Slack)
   */
  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return '#ff0000'; // Rojo
      case 'high':
        return '#ff6600'; // Naranja
      case 'medium':
        return '#ffcc00'; // Amarillo
      case 'low':
        return '#3366ff'; // Azul
      default:
        return '#808080'; // Gris
    }
  }

  /**
   * Obtener emoji según severidad
   */
  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '📌';
    }
  }

  /**
   * Alertas predefinidas para eventos comunes
   */

  async alertBruteForce(data: { ip: string; attempts: number; userId?: string }): Promise<void> {
    await this.sendAlert({
      severity: 'high',
      event: 'BRUTE_FORCE_DETECTED',
      description: `Possible brute force attack detected from IP ${data.ip}`,
      data,
      timestamp: new Date(),
      service: 'auth-service',
    });
  }

  async alertSQLInjection(data: { ip: string; payload: string; endpoint: string }): Promise<void> {
    await this.sendAlert({
      severity: 'critical',
      event: 'SQL_INJECTION_ATTEMPT',
      description: `SQL injection attempt detected on ${data.endpoint}`,
      data,
      timestamp: new Date(),
      service: 'api-gateway',
    });
  }

  async alertPaymentMismatch(data: { orderId: string; expectedAmount: number; receivedAmount: number }): Promise<void> {
    await this.sendAlert({
      severity: 'critical',
      event: 'PAYMENT_AMOUNT_MISMATCH',
      description: `Payment amount mismatch detected for order ${data.orderId}`,
      data,
      timestamp: new Date(),
      service: 'payment-service',
    });
  }

  async alertUnauthorizedAccess(data: { userId?: string; ip: string; resource: string }): Promise<void> {
    await this.sendAlert({
      severity: 'high',
      event: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      description: `Unauthorized access attempt to ${data.resource}`,
      data,
      timestamp: new Date(),
      service: 'api-gateway',
    });
  }

  async alertRevokedTokenUse(data: { userId: string; tokenType: string }): Promise<void> {
    await this.sendAlert({
      severity: 'medium',
      event: 'REVOKED_TOKEN_USE',
      description: `Attempt to use revoked ${data.tokenType} token`,
      data,
      timestamp: new Date(),
      service: 'auth-service',
    });
  }

  async alertWebhookFailure(data: { eventType: string; failureReason: string; retryCount: number }): Promise<void> {
    await this.sendAlert({
      severity: data.retryCount > 3 ? 'high' : 'medium',
      event: 'WEBHOOK_PROCESSING_FAILURE',
      description: `Webhook ${data.eventType} failed after ${data.retryCount} retries`,
      data,
      timestamp: new Date(),
      service: 'payment-service',
    });
  }

  /**
   * Obtener resumen de alertas suprimidas
   */
  async getSuppressedAlertsSummary(): Promise<Record<string, number>> {
    const keys = await this.redis.keys('suppressed:*');
    const summary: Record<string, number> = {};

    for (const key of keys) {
      const count = parseInt((await this.redis.get(key)) || '0');
      const eventKey = key.replace('suppressed:', '');
      summary[eventKey] = count;
    }

    return summary;
  }

  /**
   * Cerrar conexión de Redis
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
