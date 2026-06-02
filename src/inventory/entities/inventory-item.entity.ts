import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Supplier } from './supplier.entity';
import { StockTransaction } from './stock-transaction.entity';
import { AssetInstance } from './asset-instance.entity';

export enum InventoryItemType {
  CABLE = 'CABLE',
  ONU = 'ONU',
  ROUTER = 'ROUTER',
  SWITCH = 'SWITCH',
  SPLITTER = 'SPLITTER',
  OTHER = 'OTHER',
}

@Entity({ name: 'inventory_items' })
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string;

  @Column({
    type: 'enum',
    enum: InventoryItemType,
  })
  type: InventoryItemType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'integer', default: 0 })
  total_stock: number;

  @Column({ type: 'integer', default: 0 })
  available_stock: number;

  @Column({ type: 'integer', default: 5 })
  low_stock_threshold: number;

  @Column({ type: 'uuid', nullable: true })
  supplier_id: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @OneToMany(() => StockTransaction, (transaction) => transaction.inventoryItem)
  transactions: StockTransaction[];

  @OneToMany(() => AssetInstance, (asset) => asset.inventoryItem)
  assetInstances: AssetInstance[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
