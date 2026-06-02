import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OnuDevice } from './onu-device.entity';

export enum HardwareType {
  EPON = 'epon',
  GPON = 'gpon',
  XGS_PON = 'xgs_pon'
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance'
}

@Entity({ name: 'olt_devices' })
export class OltDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  ip_address: string;

  @Column({
    type: 'enum',
    enum: HardwareType,
    default: HardwareType.GPON
  })
  hardware_type: HardwareType;

  @Column({ nullable: true })
  snmp_community: string;

  @Column({ default: 161 })
  snmp_port: number;

  @Column({ nullable: true })
  ssh_username: string;

  @Column({ nullable: true })
  ssh_password: string;

  @Column({ default: 22 })
  ssh_port: number;

  @Column({ default: 16 })
  total_pon_ports: number;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.OFFLINE
  })
  status: DeviceStatus;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => OnuDevice, (onu) => onu.olt)
  onus: OnuDevice[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
