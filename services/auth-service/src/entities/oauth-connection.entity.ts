import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('oauth_connections')
export class OAuthConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  provider: string;

  @Column()
  provider_user_id: string;

  @Column({ type: 'text', nullable: true })
  access_token: string;

  @Column({ type: 'text', nullable: true })
  refresh_token: string;

  @CreateDateColumn()
  created_at: Date;
}
