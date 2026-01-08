// ==============================================================================
// ARCHIVO: services/payment-service/src/entities/webhook-failure.entity.ts
// FUNCIONALIDAD: Entidad para registrar webhooks fallidos
// - Almacena webhooks que fallaron en procesamiento
// - Permite retry manual o automático
// - Útil para debugging y auditoría
// ==============================================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('webhook_failures')
@Index(['event_type', 'status'])
@Index(['created_at'])
export class WebhookFailure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tipo de evento del webhook (ej: 'payment_intent.succeeded')
   */
  @Column({ type: 'varchar', length: 100 })
  event_type: string;

  /**
   * ID del evento de Stripe
   */
  @Column({ type: 'varchar', length: 100 })
  @Index()
  stripe_event_id: string;

  /**
   * Payload completo del webhook
   */
  @Column({ type: 'jsonb' })
  payload: any;

  /**
   * Razón del fallo
   */
  @Column({ type: 'text', nullable: true })
  failure_reason: string;

  /**
   * Stack trace del error
   */
  @Column({ type: 'text', nullable: true })
  error_stack: string;

  /**
   * Código de error
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  error_code: string;

  /**
   * Estado del webhook: 'failed', 'retry_pending', 'retry_success', 'abandoned'
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'failed',
    enum: ['failed', 'retry_pending', 'retry_success', 'abandoned']
  })
  status: string;

  /**
   * Número de intentos de retry
   */
  @Column({ type: 'int', default: 0 })
  retry_count: number;

  /**
   * Timestamp del último intento de retry
   */
  @Column({ type: 'timestamp', nullable: true })
  last_retry_at: Date;

  /**
   * IP de origen del webhook
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  source_ip: string;

  /**
   * Headers del request (para debugging)
   */
  @Column({ type: 'jsonb', nullable: true })
  request_headers: any;

  /**
   * Datos adicionales para contexto
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  /**
   * Timestamp de creación
   */
  @CreateDateColumn()
  created_at: Date;

  /**
   * Timestamp de última actualización
   */
  @UpdateDateColumn()
  updated_at: Date;
}
