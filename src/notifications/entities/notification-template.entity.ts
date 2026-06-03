// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum NotificationTriggerEvent {
  WELCOME_USER = 'WELCOME_USER',
  INVOICE_GENERATED = 'INVOICE_GENERATED',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  TICKET_UPDATED = 'TICKET_UPDATED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  MAINTENANCE_SCHEDULED = 'MAINTENANCE_SCHEDULED',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

@Entity({ name: 'notification_templates' })
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationTriggerEvent,
    unique: true,
  })
  trigger_event: NotificationTriggerEvent;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({ type: 'varchar', length: 100 })
  subject: string;

  @Column({ type: 'text' })
  template_body: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
