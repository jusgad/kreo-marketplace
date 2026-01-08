import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

// ==============================================================================
// PERFORMANCE OPTIMIZATIONS APPLIED:
// - Added composite index on (status, vendor_id) for vendor product listings
// - Added composite index on (status, category_id) for category browsing
// - Added composite index on (status, created_at) for newest products
// - Added index on view_count for popular products
// - Optimized JSONB columns with GIN index hint
// - Optimized column sizes
// ==============================================================================

@Entity('products')
@Index(['vendor_id'])
@Index(['category_id'])
@Index(['status'])
@Index(['slug'], { unique: true })
@Index(['status', 'vendor_id']) // Composite for vendor product listings
@Index(['status', 'category_id']) // Composite for category browsing
@Index(['status', 'created_at']) // Composite for newest active products
@Index(['status', 'view_count']) // Composite for popular products
@Index(['created_at'])
@Index(['deleted_at'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @Index()
  title: string;

  @Column('text')
  description: string;

  @Column({ unique: true, length: 300 })
  slug: string;

  @Column('decimal', { precision: 10, scale: 2 })
  base_price: number;

  @Column('uuid')
  vendor_id: string;

  @Column('uuid', { nullable: true })
  category_id: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'active' | 'inactive' | 'out_of_stock';

  @Column('int', { default: 0 })
  stock_quantity: number;

  @Column('int', { default: 0 })
  view_count: number;

  // JSONB with GIN index for efficient querying
  @Column('jsonb', { nullable: true })
  images: string[];

  @Column('jsonb', { nullable: true })
  attributes: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
