// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../../crm/customer.entity';
import { OnuDevice } from '../../hardware/onu-device.entity';

export enum AnomalyType {
  SUDDEN_DROP = 'SUDDEN_DROP',
  UNCHARACTERISTIC_SPIKE = 'UNCHARACTERISTIC_SPIKE',
  CONSISTENT_LOW_USAGE = 'CONSISTENT_LOW_USAGE',
  SIGNAL_QUALITY_DEGRADATION = 'SIGNAL_QUALITY_DEGRADATION',
}

export enum AnomalyStatus {
  DETECTED = 'DETECTED',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
}

@Entity({ name: 'telemetry_anomalies' })
export class TelemetryAnomaly {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid', nullable: true })
  onu_device_id: string;

  @ManyToOne(() => OnuDevice)
  @JoinColumn({ name: 'onu_device_id' })
  onuDevice: OnuDevice;

  @Column({
    type: 'enum',
    enum: AnomalyType,
  })
  anomaly_type: AnomalyType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  baseline_data: any;

  @Column({ type: 'jsonb', nullable: true })
  observed_data: any;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  deviation_percentage: number;

  @Column({
    type: 'enum',
    enum: AnomalyStatus,
    default: AnomalyStatus.DETECTED,
  })
  status: AnomalyStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  detected_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date;
}
