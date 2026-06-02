import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { Voucher, VoucherStatus } from './voucher.entity';
import { WalletService } from './wallet.service';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class VoucherService {
  private readonly logger = new Logger(VoucherService.name);

  constructor(
    @InjectRepository(Voucher)
    private voucherRepository: Repository<Voucher>,
    private readonly walletService: WalletService,
  ) {}

  async generateVoucher(
    schemaName: string,
    amount: number,
    expiresAt: Date,
    code?: string,
  ): Promise<Voucher> {
    const connection = await getTenantConnection(schemaName);

    try {
      // Generate random code if not provided
      const voucherCode = code || this.generateRandomVoucherCode();

      // Check if code already exists
      const existingVoucher = await connection.manager.findOne(Voucher, {
        where: { code: voucherCode },
      });

      if (existingVoucher) {
        throw new BadRequestException('Voucher code already exists');
      }

      const voucher = connection.manager.create(Voucher, {
        code: voucherCode,
        amount,
        status: VoucherStatus.UNUSED,
        expires_at: expiresAt,
      });

      return await connection.manager.save(Voucher, voucher);
    } catch (error) {
      this.logger.error(`Failed to generate voucher: ${error.message}`);
      throw error;
    }
  }

  async bulkGenerateVouchers(
    schemaName: string,
    count: number,
    amount: number,
    expiresAt: Date,
  ): Promise<Voucher[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      const vouchers = [];

      for (let i = 0; i < count; i++) {
        const voucher = await this.generateVoucher(
          schemaName,
          amount,
          expiresAt,
        );
        vouchers.push(voucher);
      }

      return vouchers;
    } catch (error) {
      this.logger.error(`Failed to bulk generate vouchers: ${error.message}`);
      throw error;
    }
  }

  async redeemVoucher(
    schemaName: string,
    customerId: string,
    code: string,
  ): Promise<{ success: boolean; message: string; voucher?: Voucher; transaction?: any }> {
    const connection = await getTenantConnection(schemaName);

    try {
      // Check if voucher exists
      const voucher = await connection.manager.findOne(Voucher, {
        where: { code },
        lock: { mode: 'pessimistic_write' },
      });

      if (!voucher) {
        return { success: false, message: 'Invalid voucher code' };
      }

      // Check voucher status
      if (voucher.status !== VoucherStatus.UNUSED) {
        return { success: false, message: 'Voucher already used or expired' };
      }

      // Check expiration
      if (new Date() > voucher.expires_at) {
        voucher.status = VoucherStatus.EXPIRED;
        await connection.manager.save(Voucher, voucher);
        return { success: false, message: 'Voucher has expired' };
      }

      // Mark voucher as used
      voucher.status = VoucherStatus.USED;
      voucher.used_by_customer_id = customerId;
      voucher.used_at = new Date();

      await connection.manager.save(Voucher, voucher);

      // Credit wallet
      const transaction = await this.walletService.creditWallet(
        schemaName,
        customerId,
        voucher.amount,
        `Voucher redemption: ${code}`,
        voucher.id,
        'voucher',
      );

      return {
        success: true,
        message: 'Voucher redeemed successfully',
        voucher,
        transaction,
      };
    } catch (error) {
      this.logger.error(`Failed to redeem voucher: ${error.message}`);
      throw error;
    }
  }

  async getVoucherByCode(schemaName: string, code: string): Promise<Voucher> {
    const connection = await getTenantConnection(schemaName);

    try {
      const voucher = await connection.manager.findOne(Voucher, {
        where: { code },
      });

      if (!voucher) {
        throw new NotFoundException('Voucher not found');
      }

      return voucher;
    } catch (error) {
      this.logger.error(`Failed to get voucher: ${error.message}`);
      throw error;
    }
  }

  async getAllVouchers(schemaName: string): Promise<Voucher[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Voucher, {
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get all vouchers: ${error.message}`);
      throw error;
    }
  }

  async getVouchersByStatus(
    schemaName: string,
    status: VoucherStatus,
  ): Promise<Voucher[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Voucher, {
        where: { status },
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get vouchers by status: ${error.message}`);
      throw error;
    }
  }

  async expireVouchers(schemaName: string): Promise<number> {
    const connection = await getTenantConnection(schemaName);

    try {
      const now = new Date();

      const result = await connection.manager
        .createQueryBuilder()
        .update(Voucher)
        .set({ status: VoucherStatus.EXPIRED })
        .where('status = :status', { status: VoucherStatus.UNUSED })
        .andWhere('expires_at < :now', { now })
        .execute();

      return result.affected || 0;
    } catch (error) {
      this.logger.error(`Failed to expire vouchers: ${error.message}`);
      throw error;
    }
  }

  private generateRandomVoucherCode(length: number = 12): string {
    const chars = 
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }
}
