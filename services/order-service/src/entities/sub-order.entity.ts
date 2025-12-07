import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('sub_orders')
export class SubOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  order_id: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column()
  vendor_id: string;

  @Column()
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

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  tracking_number: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
