// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_IP = 'UNAUTHORIZED_IP',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE'
}

@Entity({ name: 'security_audit_events' })
export class SecurityAuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @Column({
    type: 'enum',
    enum: SecurityEventType
  })
  event_type: SecurityEventType;

  @Column({ type: 'varchar', length: 45, nullable: false })
  ip_address: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  request_path: string;

  @Column({ type: 'text', nullable: true })
  payload_summary: string;

  @CreateDateColumn()
  created_at: Date;
}
