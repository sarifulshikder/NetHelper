// @ts-nocheck
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { Customer } from '../crm/customer.entity';
import { Invoice } from '../billing/invoice.entity';
import { InvoiceItem } from '../billing/invoice-item.entity';
import { Wallet } from '../wallet/wallet.entity';
import { WalletTransaction } from '../wallet/wallet-transaction.entity';
import { Ticket } from '../tickets/ticket.entity';
import { TicketHistory } from '../tickets/ticket-history.entity';
import { BillingModule } from '../billing/billing.module';
import { WalletModule } from '../wallet/wallet.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Invoice,
      InvoiceItem,
      Wallet,
      WalletTransaction,
      Ticket,
      TicketHistory,
    ]),
    BillingModule,
    WalletModule,
    TicketsModule,
    PaymentsModule,
    NotificationsModule,
  ],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
