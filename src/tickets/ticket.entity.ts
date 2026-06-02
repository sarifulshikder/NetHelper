import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TicketHistory } from './ticket-history.entity';

export enum TicketCategory {
  BILLING = 'billing',
  TECHNICAL = 'technical',
  HARDWARE = 'hardware',
  SPEED_ISSUE = 'speed_issue',
  GENERAL = 'general'
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

@Entity({ name: 'tickets' })
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  customer_id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: TicketCategory,
    default: TicketCategory.GENERAL
  })
  category: TicketCategory;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM
  })
  priority: TicketPriority;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN
  })
  status: TicketStatus;

  @Column({ nullable: true })
  assigned_staff_id: string;

  @Column()
  sla_due_at: Date;

  @Column({ default: false })
  is_sla_breached: boolean;

  @Column({ nullable: true })
  resolution_notes: string;

  @Column({ nullable: true })
  zone_or_pop: string;

  @OneToMany(() => TicketHistory, (history) => history.ticket)
  history: TicketHistory[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
