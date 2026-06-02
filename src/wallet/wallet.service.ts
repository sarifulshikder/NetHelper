import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection, Transaction, IsolationLevel, EntityManager } from 'typeorm';
import { Wallet } from './wallet.entity';
import { WalletTransaction, TransactionType } from './wallet-transaction.entity';
import { InvoiceService } from '../billing/invoice.service';
import { RadiusService } from '../radius/radius.service';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private walletTransactionRepository: Repository<WalletTransaction>,
    private readonly invoiceService: InvoiceService,
    private readonly radiusService: RadiusService,
  ) {}

  async createWalletForCustomer(
    schemaName: string,
    customerId: string,
  ): Promise<Wallet> {
    const connection = await getTenantConnection(schemaName);

    try {
      // Check if wallet already exists
      const existingWallet = await connection.manager.findOne(Wallet, {
        where: { customer_id: customerId },
      });

      if (existingWallet) {
        throw new BadRequestException('Wallet already exists for this customer');
      }

      const wallet = connection.manager.create(Wallet, {
        customer_id: customerId,
        balance: 0,
        is_active: true,
      });

      return await connection.manager.save(Wallet, wallet);
    } catch (error) {
      this.logger.error(`Failed to create wallet: ${error.message}`);
      throw error;
    }
  }

  async getWalletByCustomerId(
    schemaName: string,
    customerId: string,
  ): Promise<Wallet> {
    const connection = await getTenantConnection(schemaName);

    try {
      const wallet = await connection.manager.findOne(Wallet, {
        where: { customer_id: customerId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      return wallet;
    } catch (error) {
      this.logger.error(`Failed to get wallet: ${error.message}`);
      throw error;
    }
  }

  async getWalletWithTransactions(
    schemaName: string,
    customerId: string,
    limit: number = 50,
  ): Promise<{ wallet: Wallet; transactions: WalletTransaction[] }> {
    const connection = await getTenantConnection(schemaName);

    try {
      const wallet = await this.getWalletByCustomerId(schemaName, customerId);

      const transactions = await connection.manager.find(WalletTransaction, {
        where: { wallet_id: wallet.id },
        order: { created_at: 'DESC' },
        take: limit,
      });

      return { wallet, transactions };
    } catch (error) {
      this.logger.error(`Failed to get wallet with transactions: ${error.message}`);
      throw error;
    }
  }

  @Transaction({ isolation: IsolationLevel.SERIALIZABLE })
  async creditWallet(
    schemaName: string,
    customerId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string,
    @TransactionManager() manager?: EntityManager,
  ): Promise<WalletTransaction> {
    const connection = manager ? manager.connection : await getTenantConnection(schemaName);
    const entityManager = manager || connection.manager;

    try {
      // Start transaction if not already in one
      if (!manager) {
        await connection.transaction(async (transactionalManager) => {
          return this.creditWallet(
            schemaName,
            customerId,
            amount,
            description,
            referenceId,
            referenceType,
            transactionalManager,
          );
        });
        return;
      }

      // Get wallet with lock
      const wallet = await entityManager.findOne(Wallet, {
        where: { customer_id: customerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (amount <= 0) {
        throw new BadRequestException('Amount must be positive');
      }

      // Update balance
      wallet.balance += amount;
      await entityManager.save(Wallet, wallet);

      // Create transaction record
      const transaction = entityManager.create(WalletTransaction, {
        wallet_id: wallet.id,
        amount,
        type: TransactionType.CREDIT,
        description,
        balance_after: wallet.balance,
        reference_id: referenceId,
        reference_type: referenceType,
      });

      const savedTransaction = await entityManager.save(
        WalletTransaction,
        transaction,
      );

      // Trigger auto-payment check
      await this.checkAndProcessAutoPayments(schemaName, customerId, entityManager);

      return savedTransaction;
    } catch (error) {
      this.logger.error(`Failed to credit wallet: ${error.message}`);
      throw error;
    }
  }

  @Transaction({ isolation: IsolationLevel.SERIALIZABLE })
  async debitWallet(
    schemaName: string,
    customerId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string,
    @TransactionManager() manager?: EntityManager,
  ): Promise<WalletTransaction> {
    const connection = manager ? manager.connection : await getTenantConnection(schemaName);
    const entityManager = manager || connection.manager;

    try {
      // Start transaction if not already in one
      if (!manager) {
        await connection.transaction(async (transactionalManager) => {
          return this.debitWallet(
            schemaName,
            customerId,
            amount,
            description,
            referenceId,
            referenceType,
            transactionalManager,
          );
        });
        return;
      }

      // Get wallet with lock
      const wallet = await entityManager.findOne(Wallet, {
        where: { customer_id: customerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (amount <= 0) {
        throw new BadRequestException('Amount must be positive');
      }

      if (wallet.balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Update balance
      wallet.balance -= amount;
      await entityManager.save(Wallet, wallet);

      // Create transaction record
      const transaction = entityManager.create(WalletTransaction, {
        wallet_id: wallet.id,
        amount,
        type: TransactionType.DEBIT,
        description,
        balance_after: wallet.balance,
        reference_id: referenceId,
        reference_type: referenceType,
      });

      return await entityManager.save(WalletTransaction, transaction);
    } catch (error) {
      this.logger.error(`Failed to debit wallet: ${error.message}`);
      throw error;
    }
  }

  async checkAndProcessAutoPayments(
    schemaName: string,
    customerId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const connection = manager ? manager.connection : await getTenantConnection(schemaName);
    const entityManager = manager || connection.manager;

    try {
      // Get wallet balance
      const wallet = await entityManager.findOne(Wallet, {
        where: { customer_id: customerId },
      });

      if (!wallet || wallet.balance <= 0) {
        return;
      }

      // Get unpaid invoices
      const unpaidInvoices = await entityManager
        .createQueryBuilder('invoice', 'i')
        .where('i.customer_id = :customerId', { customerId })
        .andWhere('i.payment_status = :status', { status: 'unpaid' })
        .orderBy('i.due_date', 'ASC')
        .getMany();

      for (const invoice of unpaidInvoices) {
        if (wallet.balance >= invoice.net_amount) {
          // Pay the invoice
          await entityManager.update(
            'invoice',
            { id: invoice.id },
            {
              payment_status: 'paid',
              payment_date: new Date(),
              payment_method: 'wallet',
              transaction_reference: `WALLET-${Date.now()}`,
            },
          );

          // Debit wallet
          await this.debitWallet(
            schemaName,
            customerId,
            invoice.net_amount,
            `Payment for invoice ${invoice.id}`,
            invoice.id,
            'invoice',
            entityManager,
          );

          // Reactivate customer if they were suspended
          await this.reactivateCustomerIfSuspended(
            schemaName,
            customerId,
            entityManager,
          );

          this.logger.log(
            `Auto-paid invoice ${invoice.id} for customer ${customerId} using wallet balance`,
          );

          // Update wallet balance after debit
          const updatedWallet = await entityManager.findOne(Wallet, {
            where: { customer_id: customerId },
          });

          wallet.balance = updatedWallet.balance;

          // Stop if wallet balance is insufficient for next invoice
          if (wallet.balance <= 0) {
            break;
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process auto-payments: ${error.message}`,
      );
      throw error;
    }
  }

  async reactivateCustomerIfSuspended(
    schemaName: string,
    customerId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const connection = manager ? manager.connection : await getTenantConnection(schemaName);
    const entityManager = manager || connection.manager;

    try {
      // Check if customer is suspended in RADIUS
      // In a real system, we would have a Customer entity with status
      // For now, we'll assume the customer is suspended if they have overdue invoices

      const overdueInvoices = await entityManager
        .createQueryBuilder('invoice', 'i')
        .where('i.customer_id = :customerId', { customerId })
        .andWhere('i.payment_status = :status', { status: 'overdue' })
        .getMany();

      if (overdueInvoices.length === 0) {
        // No overdue invoices, reactivate the customer
        await this.radiusService.updateUserStatus(
          schemaName,
          customerId,
          true, // Enable the user
        );

        this.logger.log(
          `Reactivated customer ${customerId} as all invoices are now paid`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to reactivate customer: ${error.message}`,
      );
      throw error;
    }
  }

  async getWalletBalance(schemaName: string, customerId: string): Promise<number> {
    const connection = await getTenantConnection(schemaName);

    try {
      const wallet = await connection.manager.findOne(Wallet, {
        where: { customer_id: customerId },
      });

      return wallet?.balance || 0;
    } catch (error) {
      this.logger.error(`Failed to get wallet balance: ${error.message}`);
      throw error;
    }
  }

  async getTransactionHistory(
    schemaName: string,
    customerId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<WalletTransaction[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      const wallet = await this.getWalletByCustomerId(schemaName, customerId);

      return await connection.manager.find(WalletTransaction, {
        where: { wallet_id: wallet.id },
        order: { created_at: 'DESC' },
        skip: offset,
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Failed to get transaction history: ${error.message}`);
      throw error;
    }
  }
}
