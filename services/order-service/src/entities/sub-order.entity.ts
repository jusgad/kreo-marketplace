import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';

// ==============================================================================
// PERFORMANCE OPTIMIZATIONS APPLIED:
// - Added composite index on (order_id, vendor_id) for order lookups
// - Added index on vendor_id for vendor dashboard queries
// - Added index on status for filtering
// - Added lazy loading relationships
// - Optimized column types
// ==============================================================================

@Entity('sub_orders')
@Index(['order_id', 'vendor_id']) // Composite index for order and vendor lookups
@Index(['vendor_id', 'status']) // For vendor dashboard filtering
@Index(['status']) // For status filtering
@Index(['created_at']) // For date sorting
export class SubOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @ManyToOne(() => Order, order => order.sub_orders, { lazy: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'uuid' })
  vendor_id: string;

  @Column({ length: 50 })
  suborder_number: string;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2 })
  shipping_cost: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column('decimal', { precision: 5, scale: 2 })
  commission_rate: number;

  @Column('decimal', { precision: 10, scale: 2 })
  commission_amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  vendor_payout: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ nullable: true, length: 100 })
  tracking_number: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Lazy loading relationship
  @OneToMany(() => OrderItem, orderItem => orderItem.sub_order)
  items: OrderItem[];
}
