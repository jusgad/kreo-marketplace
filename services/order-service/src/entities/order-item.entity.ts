import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sub_order_id: string;

  @Column({ nullable: true })
  product_id: string;

  @Column({ nullable: true })
  variant_id: string;

  @Column()
  product_title: string;

  @Column({ nullable: true })
  variant_title: string;

  @Column()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unit_price: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total_price: number;

  @CreateDateColumn()
  created_at: Date;
}
