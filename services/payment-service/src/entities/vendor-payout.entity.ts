import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

// ==============================================================================
// PERFORMANCE OPTIMIZATIONS APPLIED:
// - Added composite index on (vendor_id, status) for vendor dashboard queries
// - Added index on sub_order_id for order-to-payout lookups
// - Added unique index on stripe_transfer_id for idempotency
// - Added index on status for filtering pending/failed payouts
// - Added index on created_at for date range queries and reporting
// ==============================================================================

@Entity('vendor_payouts')
@Index(['vendor_id', 'status']) // Composite for vendor payout dashboard
@Index(['vendor_id', 'created_at']) // For vendor payout history
@Index(['sub_order_id']) // For order-to-payout lookup
@Index(['stripe_transfer_id'], { unique: true }) // Idempotency check
@Index(['status']) // For filtering by status
@Index(['created_at']) // For date sorting and reporting
export class VendorPayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  vendor_id: string;

  @Column({ type: 'uuid', nullable: true })
  sub_order_id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  gross_amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  commission_amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  net_amount: number;

  @Column({ nullable: true, unique: true, length: 255 })
  stripe_transfer_id: string;

  @Column({ nullable: true, length: 255 })
  stripe_payout_id: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  failure_reason: string;

  @Column({ nullable: true })
  paid_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
