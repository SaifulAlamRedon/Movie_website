import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ type: 'varchar', length: 80, nullable: true, name: 'subject_type' })
  subjectType: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'subject_id' })
  subjectId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'actor_user_id' })
  actorUserId: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true, name: 'actor_name' })
  actorName: string | null;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
