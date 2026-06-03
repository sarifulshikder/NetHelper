// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CorporateAccount } from './corporate-account.entity';
import { OltDevice } from '../../hardware/olt-device.entity';

export enum CorporateBranchStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity({ name: 'corporate_branches' })
export class CorporateBranch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  corporate_account_id: string;

  @ManyToOne(() => CorporateAccount, (account) => account.branches)
  @JoinColumn({ name: 'corporate_account_id' })
  corporateAccount: CorporateAccount;

  @Column({ type: 'varchar', length: 100 })
  branch_name: string;

  @Column({ type: 'text' })
  installation_address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  location_lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  location_long: number;

  @Column({ type: 'uuid', nullable: true })
  olt_device_id: string;

  @ManyToOne(() => OltDevice)
  @JoinColumn({ name: 'olt_device_id' })
  oltDevice: OltDevice;

  @Column({ type: 'varchar', length: 100, nullable: true })
  package_or_custom_profile: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthly_price: number;

  @Column({ type: 'boolean', default: false })
  is_dedicated_line: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  dedicated_bandwidth: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  burst_speed: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  assigned_ip_pool: string;

  @Column({
    type: 'enum',
    enum: CorporateBranchStatus,
    default: CorporateBranchStatus.ACTIVE,
  })
  status: CorporateBranchStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
