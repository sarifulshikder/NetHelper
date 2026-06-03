// @ts-nocheck
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { BillingService } from './billing.service';
import { InvoiceService } from './invoice.service';
import { BillingController } from './billing.controller';
import { TenantService } from '../tenants/tenant.service';
import { RadiusService } from '../radius/radius.service';
import { MikrotikService } from '../network/mikrotik.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem]),
    ScheduleModule.forRoot(),
  ],
  providers: [
    BillingService,
    InvoiceService,
    TenantService,
    RadiusService,
    MikrotikService,
  ],
  controllers: [BillingController],
  exports: [BillingService, InvoiceService],
})
export class BillingModule {}
