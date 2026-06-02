import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentAttempt } from './payment-attempt.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { BkashGateway } from './gateways/bkash.gateway';
import { StripeGateway } from './gateways/stripe.gateway';
import { WalletService } from '../wallet/wallet.service';
import { InvoiceService } from '../billing/invoice.service';
import { BillingService } from '../billing/billing.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentAttempt])],
  providers: [
    PaymentService,
    BkashGateway,
    StripeGateway,
    WalletService,
    InvoiceService,
    BillingService,
  ],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentsModule {}
