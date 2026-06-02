import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

@Entity({ name: 'payment_attempts' })
@Index(['gateway_tx_id', 'gateway_name'])
export class PaymentAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customer_id: string;

  @Column({ nullable: true })
  invoice_id: string;

  @Column()
  gateway_name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ unique: true, nullable: true })
  gateway_tx_id: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  redirect_url: string;

  @Column({ nullable: true })
  callback_url: string;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @Column('jsonb', { nullable: true })
  gateway_response: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
