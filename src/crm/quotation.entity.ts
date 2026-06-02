import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './lead.entity';

export enum QuotationStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired'
}

@Entity({ name: 'quotations' })
export class Quotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  lead_id: string;

  @ManyToOne(() => Lead, (lead) => lead.id)
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column()
  service_plan_id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price_quoted: number;

  @Column()
  validity_days: number;

  @Column({ nullable: true })
  terms_conditions: string;

  @Column({
    type: 'enum',
    enum: QuotationStatus,
    default: QuotationStatus.DRAFT
  })
  status: QuotationStatus;

  @Column({ nullable: true })
  accepted_at: Date;

  @Column({ nullable: true })
  expired_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
