import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password_hash: string;

  @Column({ type: 'varchar', length: 20 })
  role: 'customer' | 'vendor' | 'admin';

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ default: false })
  email_verified: boolean;

  @Column({ nullable: true })
  email_verified_at: Date;

  @Column({ default: false })
  two_factor_enabled: boolean;

  @Column({ nullable: true })
  two_factor_secret: string;

  @Column({ nullable: true })
  last_login_at: Date;

  @Column({ type: 'inet', nullable: true })
  last_login_ip: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
