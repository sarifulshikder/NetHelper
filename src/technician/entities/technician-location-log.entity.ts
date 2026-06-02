import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';
import { TechnicianTask } from './technician-task.entity';

export enum TechnicianLocationActivityType {
  PING = 'PING',
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
}

@Entity({ name: 'technician_location_logs' })
export class TechnicianLocationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  technician_staff_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'technician_staff_id' })
  technician: User;

  @Column({ type: 'uuid', nullable: true })
  task_id: string;

  @ManyToOne(() => TechnicianTask)
  @JoinColumn({ name: 'task_id' })
  task: TechnicianTask;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: false })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: false })
  longitude: number;

  @Column({
    type: 'enum',
    enum: TechnicianLocationActivityType,
    default: TechnicianLocationActivityType.PING,
  })
  activity_type: TechnicianLocationActivityType;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  captured_at: Date;
}
