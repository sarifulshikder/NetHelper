// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Lead } from './lead.entity';
import { Quotation } from './quotation.entity';
import { KYCProfile } from '../kyc/kyc.entity';
import { Invoice } from '../billing/invoice.entity';
import { Wallet } from '../wallet/wallet.entity';

@Entity({ name: 'customers' })
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  lead_id: string;

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  location_lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  location_long: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  connection_type: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  service_plan: string;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  activation_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  deactivation_date: Date;

  @OneToMany(() => Quotation, (quotation) => quotation.customer)
  quotations: Quotation[];

  @OneToMany(() => KYCProfile, (kyc) => kyc.customer)
  kycProfiles: KYCProfile[];

  @OneToMany(() => Invoice, (invoice) => invoice.customer)
  invoices: Invoice[];

  @OneToMany(() => Wallet, (wallet) => wallet.customer)
  wallets: Wallet[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
