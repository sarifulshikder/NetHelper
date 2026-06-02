import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OltDevice } from './olt-device.entity';

export enum OnuStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  LOS = 'los', // Loss of Signal
  UNAUTHORIZED = 'unauthorized',
  MAINTENANCE = 'maintenance'
}

@Entity({ name: 'onu_devices' })
export class OnuDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customer_id: string;

  @Column()
  olt_id: string;

  @ManyToOne(() => OltDevice, (olt) => olt.id)
  @JoinColumn({ name: 'olt_id' })
  olt: OltDevice;

  @Column()
  pon_port: number;

  @Column()
  onu_index: number;

  @Column({ unique: true })
  onu_mac: string;

  @Column({ unique: true })
  onu_serial: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  rx_power_dbm: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  tx_power_dbm: number;

  @Column({
    type: 'enum',
    enum: OnuStatus,
    default: OnuStatus.UNAUTHORIZED
  })
  status: OnuStatus;

  @Column({ nullable: true })
  last_seen: Date;

  @Column({ nullable: true })
  authorized_at: Date;

  @Column({ nullable: true })
  profile_id: string;

  @Column({ nullable: true })
  distance_meters: number;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
