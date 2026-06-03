// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EntityType {
  REVENUE = 'REVENUE',
  TICKETS = 'TICKETS',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS'
}

@Entity({ name: 'custom_report_templates' })
export class CustomReportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: EntityType,
    default: EntityType.REVENUE
  })
  entity_type: EntityType;

  @Column({ type: 'jsonb', nullable: false })
  selected_fields: string[];

  @Column({ type: 'jsonb', nullable: true })
  filter_conditions: {
    where?: Record<string, any>;
    operators?: Record<string, string>;
    values?: Record<string, any>;
  };

  @Column({ type: 'uuid', nullable: false })
  created_by_user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
