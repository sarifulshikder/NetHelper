// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Ticket } from '../../tickets/ticket.entity';
import { User } from '../../users/user.entity';

export enum TechnicianTaskStatus {
  ASSIGNED = 'ASSIGNED',
  EN_ROUTE = 'EN_ROUTE',
  ARRIVED = 'ARRIVED',
  WORK_IN_PROGRESS = 'WORK_IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity({ name: 'technician_tasks' })
export class TechnicianTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticket_id: string;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ type: 'uuid' })
  technician_staff_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'technician_staff_id' })
  technician: User;

  @Column({
    type: 'enum',
    enum: TechnicianTaskStatus,
    default: TechnicianTaskStatus.ASSIGNED,
  })
  status: TechnicianTaskStatus;

  @Column({ type: 'timestamp', nullable: true })
  scheduled_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string;

  @Column({ type: 'uuid', nullable: true })
  consumed_asset_instance_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
