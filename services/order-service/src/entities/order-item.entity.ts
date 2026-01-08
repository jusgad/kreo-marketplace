import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { SubOrder } from './sub-order.entity';

// ==============================================================================
// PERFORMANCE OPTIMIZATIONS APPLIED:
// - Added index on sub_order_id for efficient joins
// - Added index on product_id for product analytics
// - Optimized column types and sizes
// - Added lazy loading relationship
// ==============================================================================

@Entity('order_items')
@Index(['sub_order_id']) // For joining with sub_orders
@Index(['product_id']) // For product sales analytics
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sub_order_id: string;

  @ManyToOne(() => SubOrder, subOrder => subOrder.items, { lazy: true })
  @JoinColumn({ name: 'sub_order_id' })
  sub_order: SubOrder;

  @Column({ nullable: true, type: 'uuid' })
  product_id: string;

  @Column({ nullable: true, type: 'uuid' })
  variant_id: string;

  @Column({ length: 255 })
  product_title: string;

  @Column({ nullable: true, length: 255 })
  variant_title: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unit_price: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total_price: number;

  @CreateDateColumn()
  created_at: Date;
}
