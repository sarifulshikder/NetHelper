import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { FiberJointBox } from './fiber-joint-box.entity';
import { Zone } from './zone.entity';

export enum PopStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity({ name: 'pop_devices' })
export class PopDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: false })
  location_lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: false })
  location_long: number;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'integer', default: 0 })
  total_capacity_cores: number;

  @Column({
    type: 'enum',
    enum: PopStatus,
    default: PopStatus.ACTIVE,
  })
  status: PopStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => FiberJointBox, (jointBox) => jointBox.pop)
  jointBoxes: FiberJointBox[];

  @OneToMany(() => Zone, (zone) => zone.pop)
  zones: Zone[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
