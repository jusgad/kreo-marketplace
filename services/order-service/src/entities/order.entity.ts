import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  order_number: string;

  @Column({ nullable: true })
  user_id: string;

  @Column()
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

  @Column({ default: 'pending' })
  payment_status: string;

  @Column({ nullable: true })
  stripe_payment_intent_id: string;

  @Column({ nullable: true })
  paid_at: Date;

  @Column({ default: 'unfulfilled' })
  fulfillment_status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
