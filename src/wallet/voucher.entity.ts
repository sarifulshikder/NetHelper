// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum VoucherStatus {
  UNUSED = 'unused',
  USED = 'used',
  EXPIRED = 'expired'
}

@Entity({ name: 'vouchers' })
@Index(['code'], { unique: true })
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: VoucherStatus,
    default: VoucherStatus.UNUSED
  })
  status: VoucherStatus;

  @Column({ nullable: true })
  used_by_customer_id: string;

  @Column({ nullable: true })
  used_at: Date;

  @Column()
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
