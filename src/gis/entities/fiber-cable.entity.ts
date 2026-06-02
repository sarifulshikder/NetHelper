import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PopDevice } from './pop-device.entity';
import { FiberJointBox } from './fiber-joint-box.entity';

export enum FiberCableStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DAMAGED = 'DAMAGED',
  MAINTENANCE = 'MAINTENANCE',
}

export enum FiberCableSourceType {
  POP = 'POP',
  JOINT_BOX = 'JOINT_BOX',
}

export enum FiberCableDestinationType {
  POP = 'POP',
  JOINT_BOX = 'JOINT_BOX',
  CUSTOMER = 'CUSTOMER',
}

@Entity({ name: 'fiber_cables' })
export class FiberCable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: FiberCableSourceType,
  })
  source_type: FiberCableSourceType;

  @Column({ type: 'uuid' })
  source_id: string;

  @ManyToOne(() => PopDevice)
  @JoinColumn({ name: 'source_id' })
  sourcePop: PopDevice;

  @ManyToOne(() => FiberJointBox)
  @JoinColumn({ name: 'source_id' })
  sourceJointBox: FiberJointBox;

  @Column({
    type: 'enum',
    enum: FiberCableDestinationType,
  })
  destination_type: FiberCableDestinationType;

  @Column({ type: 'uuid' })
  destination_id: string;

  @ManyToOne(() => PopDevice)
  @JoinColumn({ name: 'destination_id' })
  destinationPop: PopDevice;

  @ManyToOne(() => FiberJointBox)
  @JoinColumn({ name: 'destination_id' })
  destinationJointBox: FiberJointBox;

  @Column({ type: 'integer', default: 0 })
  total_cores: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color_code: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  length_meters: number;

  @Column({
    type: 'enum',
    enum: FiberCableStatus,
    default: FiberCableStatus.ACTIVE,
  })
  status: FiberCableStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
