// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { Customer } from '../../crm/customer.entity';
import { User } from '../../users/user.entity';

export enum AssetStatus {
  IN_WAREHOUSE = 'IN_WAREHOUSE',
  DISPATCHED_TO_TECH = 'DISPATCHED_TO_TECH',
  ASSIGNED_TO_CUSTOMER = 'ASSIGNED_TO_CUSTOMER',
  DEFECTIVE = 'DEFECTIVE',
  RETURNED = 'RETURNED',
}

@Entity({ name: 'asset_instances' })
export class AssetInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  inventory_item_id: string;

  @ManyToOne(() => InventoryItem, (item) => item.assetInstances)
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem: InventoryItem;

  @Column({ type: 'varchar', length: 100, unique: true })
  serial_number_or_mac: string;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.IN_WAREHOUSE,
  })
  status: AssetStatus;

  @Column({ type: 'uuid', nullable: true })
  assigned_to_customer_id: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'assigned_to_customer_id' })
  assignedToCustomer: Customer;

  @Column({ type: 'uuid', nullable: true })
  assigned_to_staff_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to_staff_id' })
  assignedToStaff: User;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
