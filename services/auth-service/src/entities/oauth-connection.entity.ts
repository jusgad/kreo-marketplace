import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

// ==============================================================================
// PERFORMANCE OPTIMIZATIONS APPLIED:
// - Added index on user_id for user connection lookups
// - Added composite unique index on (provider, provider_user_id) for OAuth lookups
// - This prevents duplicate OAuth connections and speeds up login
// ==============================================================================

@Entity('oauth_connections')
@Index(['user_id']) // For finding all connections of a user
@Index(['provider', 'provider_user_id'], { unique: true }) // Prevent duplicate OAuth connections
export class OAuthConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 50 })
  provider: string;

  @Column({ length: 255 })
  provider_user_id: string;

  @Column({ type: 'text', nullable: true })
  access_token: string;

  @Column({ type: 'text', nullable: true })
  refresh_token: string;

  @CreateDateColumn()
  created_at: Date;
}
