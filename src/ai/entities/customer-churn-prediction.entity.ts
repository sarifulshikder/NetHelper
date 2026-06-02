import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../../crm/customer.entity';

export enum ChurnRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Entity({ name: 'customer_churn_predictions' })
export class CustomerChurnPrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'integer' })
  health_score: number;

  @Column({
    type: 'enum',
    enum: ChurnRiskLevel,
  })
  risk_level: ChurnRiskLevel;

  @Column({ type: 'integer', default: 0 })
  overdue_payment_count: number;

  @Column({ type: 'integer', default: 0 })
  recent_ticket_count: number;

  @Column({ type: 'integer', default: 0 })
  signal_drop_count: number;

  @Column({ type: 'text', nullable: true })
  risk_factors: string;

  @Column({ type: 'text', nullable: true })
  recommendations: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
