// @ts-nocheck
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { Voucher } from './voucher.entity';
import { WalletService } from './wallet.service';
import { VoucherService } from './voucher.service';
import { WalletController } from './wallet.controller';
import { BillingService } from '../billing/billing.service';
import { InvoiceService } from '../billing/invoice.service';
import { RadiusService } from '../radius/radius.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction, Voucher])],
  providers: [WalletService, VoucherService, BillingService, InvoiceService, RadiusService],
  controllers: [WalletController],
  exports: [WalletService, VoucherService],
})
export class WalletModule {}
