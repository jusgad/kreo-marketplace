import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { SubOrder } from './sub-order.entity';

// ==============================================================================
// PERFORMANCE OPTIMIZATIONS APPLIED:
// - Added composite index on (user_id, created_at) for user order history
// - Added index on order_number for quick lookups
// - Added index on payment_status for filtering
// - Added index on stripe_payment_intent_id for webhook processing
// - Added index on created_at for date range queries
// - Added relationship with lazy loading to SubOrders
// ==============================================================================

@Entity('orders')
@Index(['user_id', 'created_at']) // Composite index for user order history (DESC)
@Index(['order_number'], { unique: true }) // Unique index for order lookup
@Index(['payment_status']) // For filtering by payment status
@Index(['fulfillment_status']) // For filtering by fulfillment status
@Index(['stripe_payment_intent_id']) // For webhook processing
@Index(['email']) // For customer support lookups
@Index(['created_at']) // For date range queries and reporting
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  order_number: string;

  @Column({ nullable: true, type: 'uuid' })
  user_id: string;

  @Column({ length: 255 })
  email: string;

  @Column({ type: 'jsonb' })
  shipping_address: any;

  @Column({ type: 'jsonb' })
  billing_address: any;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2 })
  shipping_total: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  tax_total: number;

  @Column('decimal', { precision: 10, scale: 2 })
  grand_total: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  payment_status: string;

  @Column({ nullable: true, length: 255 })
  stripe_payment_intent_id: string;

  @Column({ nullable: true, type: 'timestamp' })
  paid_at: Date;

  @Column({ type: 'varchar', length: 20, default: 'unfulfilled' })
  fulfillment_status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Lazy loading relationship - only loaded when explicitly requested
  @OneToMany(() => SubOrder, subOrder => subOrder.order)
  sub_orders: SubOrder[];
}
