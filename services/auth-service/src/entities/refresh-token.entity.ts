// ==============================================================================
// ENTITY: RefreshToken
// FUNCIONALIDAD: Almacenamiento de refresh tokens para revocación
//
// ✅ CRÍTICO #6 SOLUCIONADO: Sistema de revocación de refresh tokens
//
// CARACTERÍSTICAS:
// - Almacena hash SHA256 del token (no el token en texto plano)
// - Tracking de IP y User-Agent para auditoría
// - Campo de revocación para invalidar tokens comprometidos
// - Fecha de expiración para cleanup automático
// - Previene uso de tokens robados
// ==============================================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
@Index(['user_id']) // Para encontrar todos los tokens de un usuario
@Index(['token_hash'], { unique: true }) // Para verificar tokens
@Index(['expires_at']) // Para cleanup de tokens expirados
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Usuario dueño del token
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Hash SHA256 del refresh token (no almacenar token en texto plano)
  @Column({ unique: true, length: 64 })
  token_hash: string;

  // Fecha de expiración del token
  @Column({ type: 'timestamp' })
  expires_at: Date;

  // Estado de revocación
  @Column({ default: false })
  revoked: boolean;

  // Fecha de revocación (si fue revocado)
  @Column({ type: 'timestamp', nullable: true })
  revoked_at: Date;

  // Razón de revocación (logout, security, expired, etc.)
  @Column({ nullable: true, length: 100 })
  revoked_reason: string;

  // IP address del cliente que obtuvo el token
  @Column({ type: 'inet', nullable: true })
  ip_address: string;

  // User-Agent del navegador/app
  @Column({ nullable: true, length: 500 })
  user_agent: string;

  // Última vez que se usó el token
  @Column({ type: 'timestamp', nullable: true })
  last_used_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
