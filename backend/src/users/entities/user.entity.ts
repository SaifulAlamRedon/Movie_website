import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 40, default: 'viewer' })
  role: string;

  @Column({ type: 'varchar', length: 40, default: 'standard', name: 'subscription_plan' })
  subscriptionPlan: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_blocked' })
  isBlocked: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'password_hash', select: false })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'password_salt', select: false })
  passwordSalt: string | null;

  @Index('IDX_users_last_login_at')
  @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
