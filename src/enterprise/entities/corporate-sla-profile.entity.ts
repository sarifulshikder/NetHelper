import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CorporateAccount } from './corporate-account.entity';
import { CorporateBranch } from './corporate-branch.entity';

export enum CorporateSlaPriority {
  CORPORATE_STANDARD = 'CORPORATE_STANDARD',
  CORPORATE_PREMIUM = 'CORPORATE_PREMIUM',
  CORPORATE_PLATINUM = 'CORPORATE_PLATINUM',
}

@Entity({ name: 'corporate_sla_profiles' })
export class CorporateSlaProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  corporate_account_id: string;

  @ManyToOne(() => CorporateAccount)
  @JoinColumn({ name: 'corporate_account_id' })
  corporateAccount: CorporateAccount;

  @Column({ type: 'uuid', nullable: true })
  corporate_branch_id: string;

  @ManyToOne(() => CorporateBranch)
  @JoinColumn({ name: 'corporate_branch_id' })
  corporateBranch: CorporateBranch;

  @Column({
    type: 'enum',
    enum: CorporateSlaPriority,
    default: CorporateSlaPriority.CORPORATE_STANDARD,
  })
  priority_level: CorporateSlaPriority;

  @Column({ type: 'integer', comment: 'Mean Time to Repair in hours' })
  mttr_hours: number;

  @Column({ type: 'integer', comment: 'Response time in minutes' })
  response_time_minutes: number;

  @Column({ type: 'boolean', default: false })
  dedicated_support_agent: boolean;

  @Column({ type: 'boolean', default: false })
  proactive_monitoring: boolean;

  @Column({ type: 'text', nullable: true })
  custom_terms: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
