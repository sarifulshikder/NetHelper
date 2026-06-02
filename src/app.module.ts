import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenants/tenant.module';
import { NetworkModule } from './network/network.module';
import { CrmModule } from './crm/crm.module';
import { KYCModule } from './kyc/kyc.module';
import { BillingModule } from './billing/billing.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentsModule } from './payments/payments.module';
import { HardwareModule } from './hardware/hardware.module';
import { TicketsModule } from './tickets/tickets.module';
import { GisModule } from './gis/gis.module';
import { InventoryModule } from './inventory/inventory.module';
import { TechnicianModule } from './technician/technician.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PortalModule } from './portal/portal.module';
import { EnterpriseModule } from './enterprise/enterprise.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { User } from './users/user.entity';
import { Tenant } from './tenants/tenant.entity';
import { TenantMiddleware } from './tenants/tenant.middleware';
import { RadiusUser } from './radius/radius-user.entity';
import { RadiusReply } from './radius/radius-reply.entity';
import { RadiusAcct } from './radius/radius-acct.entity';
import { Lead } from './crm/lead.entity';
import { Quotation } from './crm/quotation.entity';
import { Customer } from './crm/customer.entity';
import { CustomerChurnPrediction } from './ai/entities/customer-churn-prediction.entity';
import { TelemetryAnomaly } from './ai/entities/telemetry-anomaly.entity';
import { KYCProfile } from './kyc/kyc.entity';
import { Invoice } from './billing/invoice.entity';
import { InvoiceItem } from './billing/invoice-item.entity';
import { Wallet } from './wallet/wallet.entity';
import { WalletTransaction } from './wallet/wallet-transaction.entity';
import { Voucher } from './wallet/voucher.entity';
import { PaymentAttempt } from './payments/payment-attempt.entity';
import { OltDevice } from './hardware/olt-device.entity';
import { OnuDevice } from './hardware/onu-device.entity';
import { Ticket } from './tickets/ticket.entity';
import { TicketHistory } from './tickets/ticket-history.entity';
import { MaintenanceSchedule } from './tickets/maintenance-schedule.entity';
import { PopDevice } from './gis/entities/pop-device.entity';
import { Zone } from './gis/entities/zone.entity';
import { FiberJointBox } from './gis/entities/fiber-joint-box.entity';
import { FiberCable } from './gis/entities/fiber-cable.entity';
import { Supplier } from './inventory/entities/supplier.entity';
import { InventoryItem } from './inventory/entities/inventory-item.entity';
import { AssetInstance } from './inventory/entities/asset-instance.entity';
import { StockTransaction } from './inventory/entities/stock-transaction.entity';
import { TechnicianTask } from './technician/entities/technician-task.entity';
import { TechnicianLocationLog } from './technician/entities/technician-location-log.entity';
import { NotificationTemplate } from './notifications/entities/notification-template.entity';
import { NotificationLog } from './notifications/entities/notification-log.entity';
import { CorporateAccount } from './enterprise/entities/corporate-account.entity';
import { CorporateBranch } from './enterprise/entities/corporate-branch.entity';
import { CorporateSlaProfile } from './enterprise/entities/corporate-sla-profile.entity';
import { CustomReportTemplate } from './bi-reporting/custom-report-template.entity';
import { ReportJob } from './bi-reporting/report-job.entity';
import { BiReportingModule } from './bi-reporting/bi-reporting.module';
import { TenantSecurityProfile } from './security/tenant-security-profile.entity';
import { SecurityAuditEvent } from './security/security-audit-event.entity';
import { SecurityModule } from './security/security.module';
import { SystemModule } from './system/system.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'postgres',
      port: parseInt(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USER || 'nethadmin',
      password: process.env.DATABASE_PASSWORD || 'nethpass',
      database: process.env.DATABASE_NAME || 'nethdb',
      entities: [
        User,
        Tenant,
        RadiusUser,
        RadiusReply,
        RadiusAcct,
        Lead,
        Quotation,
        Customer,
        KYCProfile,
        Invoice,
        InvoiceItem,
        Wallet,
        WalletTransaction,
        CustomerChurnPrediction,
        TelemetryAnomaly,
        Voucher,
        PaymentAttempt,
        OltDevice,
        OnuDevice,
        Ticket,
        TicketHistory,
        MaintenanceSchedule,
        PopDevice,
        Zone,
        FiberJointBox,
        FiberCable,
        Supplier,
        InventoryItem,
        AssetInstance,
        StockTransaction,
        TechnicianTask,
        TechnicianLocationLog,
        NotificationTemplate,
        NotificationLog,
        CorporateAccount,
        CorporateBranch,
        CorporateSlaProfile,
        CustomReportTemplate,
        ReportJob,
        TenantSecurityProfile,
        SecurityAuditEvent,
      ],
      synchronize: true,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    TenantModule,
    NetworkModule,
    CrmModule,
    KYCModule,
    BillingModule,
    WalletModule,
    PaymentsModule,
    HardwareModule,
    TicketsModule,
    GisModule,
    InventoryModule,
    TechnicianModule,
    NotificationsModule,
    PortalModule,
    EnterpriseModule,
    AnalyticsModule,
    AiModule,
    BiReportingModule,
    SecurityModule,
    SystemModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
