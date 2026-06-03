// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { PopDevice } from './pop-device.entity';
import { FiberCable } from './fiber-cable.entity';

export enum FiberJointBoxStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity({ name: 'fiber_joint_boxes' })
export class FiberJointBox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  pop_id: string;

  @ManyToOne(() => PopDevice, (pop) => pop.jointBoxes)
  @JoinColumn({ name: 'pop_id' })
  pop: PopDevice;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: false })
  location_lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: false })
  location_long: number;

  @Column({ type: 'integer', default: 0 })
  total_ports: number;

  @Column({ type: 'integer', default: 0 })
  used_ports: number;

  @Column({
    type: 'enum',
    enum: FiberJointBoxStatus,
    default: FiberJointBoxStatus.ACTIVE,
  })
  status: FiberJointBoxStatus;

  @OneToMany(() => FiberCable, (cable) => cable.sourceJointBox)
  sourceCables: FiberCable[];

  @OneToMany(() => FiberCable, (cable) => cable.destinationJointBox)
  destinationCables: FiberCable[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
