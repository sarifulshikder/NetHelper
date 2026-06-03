// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Wallet } from './wallet.entity';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit'
}

@Entity({ name: 'wallet_transactions' })
@Index(['wallet_id', 'created_at'])
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  wallet_id: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.id)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  balance_after: number;

  @Column({ nullable: true })
  reference_id: string;

  @Column({ nullable: true })
  reference_type: string;

  @CreateDateColumn()
  created_at: Date;
}
