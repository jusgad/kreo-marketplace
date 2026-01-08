import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

// ==============================================================================
// PERFORMANCE OPTIMIZATIONS APPLIED:
// - Added composite index on (email, deleted_at) for fast login queries
// - Added index on role for role-based queries
// - Added index on email_verified for filtering unverified users
// - Added index on last_login_at for analytics
// - Optimized column types and sizes
// ==============================================================================

@Entity('users')
@Index(['email', 'deleted_at']) // Composite index for login (most common query)
@Index(['role']) // For role-based filtering
@Index(['email_verified']) // For filtering unverified users
@Index(['last_login_at']) // For analytics and cleanup
@Index(['created_at']) // For sorting and date range queries
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ nullable: true, select: false }) // Don't select by default for security
  password_hash: string;

  @Column({ type: 'varchar', length: 20 })
  role: 'customer' | 'vendor' | 'admin';

  @Column({ nullable: true, length: 100 })
  first_name: string;

  @Column({ nullable: true, length: 100 })
  last_name: string;

  @Column({ nullable: true, length: 20 })
  phone: string;

  @Column({ nullable: true, length: 500 })
  avatar_url: string;

  @Column({ default: false })
  email_verified: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  email_verified_at: Date;

  @Column({ default: false })
  two_factor_enabled: boolean;

  @Column({ nullable: true, select: false }) // Don't select by default for security
  two_factor_secret: string;

  @Column({ nullable: true, type: 'timestamp' })
  last_login_at: Date;

  @Column({ type: 'inet', nullable: true })
  last_login_ip: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
