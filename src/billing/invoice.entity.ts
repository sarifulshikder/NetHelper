// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { InvoiceItem } from './invoice-item.entity';

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

@Entity({ name: 'invoices' })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customer_id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  total_amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  tax_amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  net_amount: number;

  @Column()
  due_date: Date;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID
  })
  payment_status: PaymentStatus;

  @Column()
  billing_period_start: Date;

  @Column()
  billing_period_end: Date;

  @Column({ nullable: true })
  payment_date: Date;

  @Column({ nullable: true })
  payment_method: string;

  @Column({ nullable: true })
  transaction_reference: string;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => InvoiceItem, (item) => item.invoice)
  items: InvoiceItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
