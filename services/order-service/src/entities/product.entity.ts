import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendor_id: string;

  @Column()
  title: string;

  @Column('decimal', { precision: 10, scale: 2 })
  base_price: number;

  @Column({ default: true })
  track_inventory: boolean;

  @Column({ default: 0 })
  inventory_quantity: number;

  @Column({ default: 'active' })
  status: string;
}
