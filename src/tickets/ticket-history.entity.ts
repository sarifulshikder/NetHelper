// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity({ name: 'ticket_history' })
export class TicketHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticket_id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.history)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column()
  changed_by_user_id: string;

  @Column({ nullable: true })
  previous_status: string;

  @Column({ nullable: true })
  new_status: string;

  @Column({ nullable: true })
  comment: string;

  @Column({ nullable: true })
  action: string;

  @CreateDateColumn()
  created_at: Date;
}
