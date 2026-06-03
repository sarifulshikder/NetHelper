// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'tenant_security_profiles' })
export class TenantSecurityProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @Column({ type: 'integer', default: 60 })
  max_requests_per_minute: number;

  @Column({ type: 'integer', default: 10 })
  max_concurrent_connections: number;

  @Column({ type: 'boolean', default: false })
  allow_public_signup: boolean;

  @Column({ type: 'jsonb', default: [] })
  webhook_ip_whitelist: string[];

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
