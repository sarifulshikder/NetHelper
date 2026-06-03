// @ts-nocheck
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorporateAccount } from './entities/corporate-account.entity';
import { CorporateBranch } from './entities/corporate-branch.entity';
import { CorporateSlaProfile } from './entities/corporate-sla-profile.entity';
import { EnterpriseService } from './enterprise.service';
import { EnterpriseController } from './enterprise.controller';
import { BillingModule } from '../billing/billing.module';
import { TicketsModule } from '../tickets/tickets.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CorporateAccount,
      CorporateBranch,
      CorporateSlaProfile,
    ]),
    BillingModule,
    TicketsModule,
    NotificationsModule,
  ],
  providers: [EnterpriseService],
  controllers: [EnterpriseController],
  exports: [EnterpriseService],
})
export class EnterpriseModule {}
