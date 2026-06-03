// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { CorporateBranch } from './corporate-branch.entity';
import { User } from '../../users/user.entity';

export enum CorporateAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity({ name: 'corporate_accounts' })
export class CorporateAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  company_name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  trade_license_number: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  bin_number: string;

  @Column({ type: 'varchar', length: 100 })
  billing_contact_person: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 100 })
  email: string;

  @Column({ type: 'text', nullable: true })
  billing_address: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_account_manager_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_account_manager_id' })
  accountManager: User;

  @Column({
    type: 'enum',
    enum: CorporateAccountStatus,
    default: CorporateAccountStatus.ACTIVE,
  })
  status: CorporateAccountStatus;

  @Column({ type: 'boolean', default: false })
  consolidated_billing: boolean;

  @Column({ type: 'integer', default: 30 })
  billing_cycle_day: number;

  @OneToMany(() => CorporateBranch, (branch) => branch.corporateAccount)
  branches: CorporateBranch[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
