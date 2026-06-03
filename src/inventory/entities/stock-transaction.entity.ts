// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { User } from '../../users/user.entity';

export enum StockTransactionType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity({ name: 'stock_transactions' })
export class StockTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  inventory_item_id: string;

  @ManyToOne(() => InventoryItem, (item) => item.transactions)
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem: InventoryItem;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({
    type: 'enum',
    enum: StockTransactionType,
  })
  type: StockTransactionType;

  @Column({ type: 'text', nullable: true })
  reference_note: string;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
