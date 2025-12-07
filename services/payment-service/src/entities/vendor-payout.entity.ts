import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('vendor_payouts')
export class VendorPayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendor_id: string;

  @Column({ nullable: true })
  sub_order_id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  gross_amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  commission_amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  net_amount: number;

  @Column({ nullable: true, unique: true })
  stripe_transfer_id: string;

  @Column({ nullable: true })
  stripe_payout_id: string;

  @Column({ default: 'pending' })
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
